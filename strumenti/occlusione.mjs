/**
 * DOVE IL MONTANTE COPRE DAVVERO L'OBIETTIVO.
 *
 * PERCHE' SI MISURA INVECE DI GUARDARE.
 *
 * Il taglio in occlusione (decisione D2) funziona solo se lo scambio fra
 * le due scene avviene NELL'ISTANTE in cui il fotogramma e' chiuso. Un
 * decimo prima o un decimo dopo si vede un lampo di ambiente sbagliato, e
 * si vede benissimo — e' il momento in cui l'occhio sta cercando appigli.
 *
 * A occhio quell'istante non si trova: dura due decimi di secondo dentro
 * uno scorrimento di sette schermate, passa troppo in fretta per
 * accorgersene e troppo lentamente per rivederlo. Quindi si percorre il
 * beat a passi minuscoli, si fotografa ogni passo, e si guarda il numero.
 *
 * COSA SI MISURA, ESATTAMENTE.
 *
 * Due cose diverse, e servono entrambe:
 *   - la LUMINOSITA' media: quanto e' scuro il fotogramma
 *   - la COPERTURA: quanti pixel stanno sotto una soglia di nero
 * La seconda conta piu' della prima. Un fotogramma puo' essere scuro in
 * media perche' e' notte, ma restare pieno di dettagli riconoscibili — e
 * allora lo scambio si vede. Serve che sia OTTURATO, cioe' che quasi tutti
 * i pixel siano dello stesso nero.
 *
 *   node strumenti/occlusione.mjs [passi]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:5174/'
const PASSI = Number(process.argv[2] || 60)
const USCITA = 'C:/Users/Giuseppe/Webingegno/velocity/docs/misure'
mkdirSync(USCITA, { recursive: true })

/** i confini del beat, dal codice: non si riscrivono qui */
const DA = 0.62
const A = 0.75

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const pagina = await browser.newPage({ viewport: { width: 1000, height: 620 }, deviceScaleFactor: 1 })
await pagina.goto(BASE, { waitUntil: 'load' })
await pagina.waitForFunction(() => !!window.esperienza, null, { timeout: 30000 })
await pagina.waitForTimeout(600)

// SI MISURA IL SOLO ESTERNO. Lasciando avvenire lo scambio, da meta' beat
// in poi si fotografa l'abitacolo — che e' scuro per conto suo — e il
// numero dice 99% di copertura anche quando il montante non copre niente.
// E' il primo risultato che ho ottenuto, e sembrava ottimo.
await pagina.evaluate(() => { window.esperienza.forzaEsterno = true })

const corsa = await pagina.evaluate(() => document.documentElement.scrollHeight - innerHeight)

// SI ARRIVA SCORRENDO, non saltando. Lo smorzamento dello scorrimento e'
// parte della scena: atterrare di colpo su un progresso mostra uno stato
// che nessuno vedra' mai, e ci si taglierebbe l'inquadratura su un
// fotogramma che non esiste.
async function vaiA(q, passi = 30) {
  for (let i = 1; i <= passi; i++) {
    await pagina.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / passi)])
    await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
  // lo smorzamento ha un ritardo: gli si lascia raggiungere il bersaglio
  for (let i = 0; i < 40; i++) {
    await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
}

await vaiA(DA)

const letture = []
for (let i = 0; i <= PASSI; i++) {
  const locale = i / PASSI
  const globale = DA + (A - DA) * locale
  await pagina.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, globale])
  for (let k = 0; k < 12; k++) {
    await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }

  const png = await pagina.screenshot({ type: 'png' })
  const { data, info } = await sharp(png).resize(80, 50, { fit: 'fill' }).grayscale().raw()
    .toBuffer({ resolveWithObject: true })
  let somma = 0
  let scuri = 0
  for (const v of data) {
    somma += v
    if (v < 26) scuri++
  }
  const stato = await pagina.evaluate(() => ({
    beat: window.esperienza.regia.beat,
    l: +window.esperienza.regia.locale.toFixed(3),
  }))
  letture.push({
    locale: +locale.toFixed(3),
    ...stato,
    luce: +(somma / data.length).toFixed(1),
    coperto: +((scuri / data.length) * 100).toFixed(1),
  })
  void info
}

writeFileSync(`${USCITA}/occlusione.json`, JSON.stringify(letture, null, 1))

const piuScuro = letture.reduce((a, b) => (b.luce < a.luce ? b : a))
const piuCoperto = letture.reduce((a, b) => (b.coperto > a.coperto ? b : a))

console.log('\n  locale   beat        luce  coperto')
for (const l of letture) {
  if (l.locale * PASSI % Math.max(1, Math.round(PASSI / 24)) > 0.001) continue
  const barra = '#'.repeat(Math.round(l.coperto / 3))
  console.log(
    `  ${l.locale.toFixed(2)}   ${String(l.beat).padEnd(11)}${String(l.luce).padStart(5)}  ${String(l.coperto).padStart(5)}% ${barra}`,
  )
}
console.log(`\n  piu' scuro   a locale ${piuScuro.locale}  luce ${piuScuro.luce}`)
console.log(`  piu' coperto a locale ${piuCoperto.locale}  ${piuCoperto.coperto}% dei pixel sotto soglia`)
console.log(`\n  -> SCAMBIO_A andrebbe messo a ${piuCoperto.locale}`)

// i tre fotogrammi intorno al punto migliore, per guardarli
for (const d of [-0.06, 0, 0.06]) {
  const q = Math.min(1, Math.max(0, piuCoperto.locale + d))
  await pagina.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, DA + (A - DA) * q])
  for (let k = 0; k < 12; k++) await pagina.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  await pagina.screenshot({ path: `${USCITA}/taglio_${q.toFixed(2)}.jpeg`, type: 'jpeg', quality: 86 })
}

await browser.close()
