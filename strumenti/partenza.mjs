/**
 * IL SECONDO CANCELLO: la partenza si vede?
 *
 * COSA SI STA PROVANDO.
 *
 * Che il passaggio da fermo a in movimento, oltre il parabrezza, non
 * produca uno stacco. Nel piano era uno scambio fra un'immagine e un video;
 * nel codice e' diventato piu' semplice — un video in pausa al fotogramma
 * zero che a un certo punto riceve `play()` — quindi in teoria non c'e'
 * niente da vedere, perche' non c'e' nessuno scambio.
 *
 * "In teoria" non basta. Il decodificatore potrebbe mostrare un fotogramma
 * diverso da quello fermo appena parte, la texture potrebbe aggiornarsi in
 * ritardo, il primo `play()` potrebbe saltare avanti. Tutte cose che a
 * occhio si vedono come un guizzo e che nessuno sa poi ricostruire.
 *
 * COME SI MISURA.
 *
 * Si percorre il confine a passi minuscoli e si guarda quanto ogni
 * fotogramma differisce dal precedente. Una partenza continua produce
 * differenze che CRESCONO piano; uno stacco produce un picco isolato, cioe'
 * un valore molto piu' grande dei suoi vicini. Quindi non conta la
 * differenza assoluta — a fine beat la strada corre e le differenze sono
 * legittimamente grandi — conta il RAPPORTO con la mediana locale.
 *
 *   node strumenti/partenza.mjs [passi]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:5174/'
const PASSI = Number(process.argv[2] || 70)
const USCITA = 'C:/Users/Giuseppe/Webingegno/velocity/docs/misure'
mkdirSync(USCITA, { recursive: true })

/** si guarda a cavallo del confine: un pezzo di 'accensione' e l'inizio di
 *  'velocita', perche' e' li' che il video passa da fermo a in corsa */
const DA = 0.80
const A = 0.92

const browser = await chromium.launch({
  // il video deve poter partire senza un gesto: e' muto, ma tanto vale
  // toglierci di mezzo la politica del browser mentre si misura
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'],
})
const pagina = await browser.newPage({ viewport: { width: 900, height: 560 }, deviceScaleFactor: 1 })
await pagina.goto(BASE, { waitUntil: 'load' })
await pagina.waitForFunction(() => !!window.esperienza, null, { timeout: 30000 })
// il video deve essere DECODIFICATO prima di cominciare, se no i primi
// passi misurano un caricamento invece di una partenza
await pagina.waitForFunction(() => window.esperienza.lastra.pronta, null, { timeout: 60000 })
await pagina.waitForTimeout(500)

const corsa = await pagina.evaluate(() => document.documentElement.scrollHeight - innerHeight)

async function fermoA(q, passi = 40) {
  for (let i = 1; i <= passi; i++) {
    await pagina.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / passi)])
    await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
  for (let i = 0; i < 50; i++) await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}

await fermoA(DA)

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
  const globale = DA + (A - DA) * (i / PASSI)
  await pagina.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, globale])
  for (let k = 0; k < 10; k++) await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const f = await firma()
  const stato = await pagina.evaluate(() => ({
    beat: window.esperienza.regia.beat,
    t: +window.esperienza.lastra.video.currentTime.toFixed(2),
    corre: !window.esperienza.lastra.video.paused,
    rate: +window.esperienza.lastra.video.playbackRate.toFixed(2),
  }))
  letture.push({ q: +globale.toFixed(4), ...stato, delta: prima ? +differenza(prima, f).toFixed(2) : 0 })
  prima = f
}

// il picco si cerca sul RAPPORTO con la mediana dei vicini, non sul valore
const F = 7
let peggiore = { rapporto: 0 }
for (let i = F; i < letture.length - F; i++) {
  const intorno = letture.slice(i - F, i + F + 1).map((l) => l.delta).sort((a, b) => a - b)
  const mediana = intorno[Math.floor(intorno.length / 2)] || 0.01
  letture[i].rapporto = +(letture[i].delta / Math.max(mediana, 0.3)).toFixed(2)
  if (letture[i].rapporto > peggiore.rapporto) peggiore = letture[i]
}

writeFileSync(`${USCITA}/partenza.json`, JSON.stringify(letture, null, 1))

console.log('\n   q      beat         video   delta  rapporto')
for (const l of letture) {
  if (letture.indexOf(l) % Math.max(1, Math.round(PASSI / 22)) > 0) continue
  const b = '#'.repeat(Math.min(30, Math.round(l.delta)))
  console.log(
    `  ${l.q.toFixed(3)}  ${String(l.beat).padEnd(11)} ${l.corre ? 'corre' : 'fermo'} ${String(l.t).padStart(5)}` +
    `  ${String(l.delta).padStart(6)}  ${String(l.rapporto ?? '-').padStart(5)} ${b}`,
  )
}
console.log(`\n  picco piu' alto: ${peggiore.rapporto}x la mediana locale, a q=${peggiore.q ?? '-'}`)
console.log(peggiore.rapporto > 4
  ? '  STACCO: la partenza si vede.'
  : "  nessuno stacco: la partenza e' continua.")

await browser.close()
