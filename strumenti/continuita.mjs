/**
 * CONTINUITA' — gli stacchi si misurano, non si cercano a occhio.
 *
 * La regola 3 dice che non si deve percepire nessun taglio. Ma uno stacco
 * di un fotogramma solo, dentro uno scorrimento di sette schermate, a
 * occhio non si trova: passa troppo in fretta per accorgersene e troppo
 * lentamente per rivederlo.
 *
 * Quindi si percorre tutto lo scorrimento a passi minuscoli, si fotografa
 * ogni passo e si confronta con il precedente. Una trasformazione continua
 * produce differenze piccole e regolari; uno stacco produce un picco.
 *
 * LA SOGLIA NON E' ASSOLUTA, ed e' il punto che rende utile lo strumento.
 * Conta il RAPPORTO fra un passo e la mediana dei suoi vicini: una scena
 * che si muove in fretta cambia molto a ogni passo senza essere
 * discontinua, e una ferma che di colpo cambia poco lo e' eccome.
 *
 * E c'e' un'eccezione dichiarata: il taglio in occlusione DEVE produrre un
 * picco, e' il suo mestiere. Lo strumento lo sa e non lo conta.
 *
 *   node strumenti/continuita.mjs [passi]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:5174/'
const PASSI = Number(process.argv[2] || 220)
const USCITA = 'C:/Users/Giuseppe/Webingegno/velocity/docs/misure'
mkdirSync(USCITA, { recursive: true })

/** dove il picco e' voluto: il fotogramma si chiude apposta */
const ATTESO = [
  { da: 0.695, a: 0.725, nome: 'taglio in occlusione' },
  // L'AUTOTEST DEL QUADRO E' UN LAMPO VOLUTO. Una strumentazione vera,
  // all'accensione, manda le lancette a fondo scala e le riporta: e' una
  // discontinuita' dichiarata, non un difetto. Chi non la conoscesse la
  // segnalerebbe — ed e' giusto che lo strumento la conosca invece di
  // alzare la soglia, che nasconderebbe anche i difetti veri.
  { da: 0.770, a: 0.805, nome: 'autotest del quadro' },
]

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'],
})
const pagina = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 1 })
await pagina.goto(BASE, { waitUntil: 'load' })
await pagina.waitForFunction(() => !!window.esperienza, null, { timeout: 30000 })
// si aspetta che TUTTO sia arrivato: misurare mentre l'HDRI o le colonne
// stanno ancora caricando significa registrare come stacco un asset che
// compare, cioe' un difetto che l'utente non vedra' mai
await pagina.waitForFunction(
  () => window.esperienza.ambientePronto && window.esperienza.lastra.pronta
        && window.esperienza.autoPronta && window.esperienza.planciaPronta,
  null,
  { timeout: 90000 },
).catch(() => console.log('  (avviso: qualcosa non era pronto entro il tempo)'))
// via il pannello: cambia da solo e falsa ogni confronto
await pagina.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
await pagina.waitForTimeout(600)

const corsa = await pagina.evaluate(() => document.documentElement.scrollHeight - innerHeight)

async function firma() {
  const png = await pagina.screenshot({ type: 'png' })
  const { data } = await sharp(png).resize(96, 60, { fit: 'fill' }).grayscale().raw()
    .toBuffer({ resolveWithObject: true })
  return data
}

function differenza(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  return s / a.length
}

const letture = []
let prima = null
for (let i = 0; i <= PASSI; i++) {
  const q = i / PASSI
  await pagina.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q])
  // due fotogrammi di assestamento: la regia legge il progresso nel ciclo,
  // e fotografare subito significa fotografare lo stato precedente
  for (let k = 0; k < 6; k++) await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const f = await firma()
  const stato = await pagina.evaluate(() => ({
    beat: window.esperienza.regia.beat,
    l: +window.esperienza.regia.locale.toFixed(3),
  }))
  letture.push({ q: +q.toFixed(4), ...stato, delta: prima ? +differenza(prima, f).toFixed(2) : 0 })
  prima = f
}

const F = 9
const sospetti = []
for (let i = F; i < letture.length - F; i++) {
  const intorno = letture.slice(i - F, i + F + 1).map((l) => l.delta).sort((a, b) => a - b)
  const mediana = intorno[Math.floor(intorno.length / 2)] || 0.05
  const r = letture[i].delta / Math.max(mediana, 0.25)
  letture[i].rapporto = +r.toFixed(2)
  const voluto = ATTESO.some((x) => letture[i].q >= x.da && letture[i].q <= x.a)
  if (r > 4.5 && letture[i].delta > 1.0 && !voluto) sospetti.push(letture[i])
}

writeFileSync(`${USCITA}/continuita.json`, JSON.stringify(letture, null, 1))

const medio = letture.reduce((a, l) => a + l.delta, 0) / letture.length
console.log(`\npassi ${PASSI}   delta medio ${medio.toFixed(2)}`)
console.log('\nprofilo (un campione ogni 5%):')
let beatPrec = ''
for (const l of letture) {
  if (letture.indexOf(l) % Math.max(1, Math.round(PASSI / 20)) > 0) continue
  const nuovo = l.beat !== beatPrec ? ' <-- confine' : ''
  beatPrec = l.beat
  console.log(`  q=${l.q.toFixed(3)}  ${l.beat.padEnd(11)} delta ${String(l.delta).padStart(6)}  x${String(l.rapporto ?? '-').padStart(5)}${nuovo}`)
}

if (!sospetti.length) {
  console.log('\nNESSUNO STACCO sopra soglia.')
} else {
  console.log(`\nSTACCHI SOSPETTI (${sospetti.length}):`)
  for (const s of sospetti) {
    console.log(`  q=${s.q.toFixed(4)}  ${s.beat}@${s.l}  delta ${s.delta} = ${s.rapporto}x la mediana`)
  }
  // i fotogrammi prima e dopo, per capire COSA salta
  for (const s of sospetti.slice(0, 4)) {
    for (const d of [-1.5 / PASSI, 0, 1.5 / PASSI]) {
      const q = Math.min(1, Math.max(0, s.q + d))
      await pagina.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q])
      for (let k = 0; k < 6; k++) await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
      await pagina.screenshot({ path: `${USCITA}/stacco_${s.q.toFixed(4)}_${d > 0 ? 'dopo' : d < 0 ? 'prima' : 'su'}.jpeg`, type: 'jpeg', quality: 84 })
    }
  }
}

await browser.close()
