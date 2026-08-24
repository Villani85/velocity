/**
 * DUE FOTOGRAMMI IN UN CARICAMENTO SOLO, e i livelli gia' misurati.
 *
 * PERCHE' NON BASTAVA `uno.mjs`. Il costo di un provino non e' lo scatto: e'
 * il caricamento — tre megabyte di geometria, il cielo, la mappa d'ambiente
 * generata dalla scena. Su questa macchina sono minuti, e per tarare la corte
 * servono SEMPRE due inquadrature (la hero e la meta' orbita, dove si vede il
 * lato opposto). Chiamare `uno.mjs` due volte paga il caricamento due volte.
 *
 * Qui la pagina si apre una volta sola e si scorre da un punto all'altro.
 *
 *   node strumenti/corte.mjs dopo 0.06 0.28
 *
 * scrive docs/provini/dopo_006.jpeg e dopo_028.jpeg e stampa le misure.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const nome = process.argv[2] ?? 'corte'
const punti = process.argv.slice(3).map(Number)
const QUOTE = punti.length ? punti : [0.06, 0.28]
const CARTELLA = 'C:/Users/Giuseppe/Webingegno/velocity/docs/provini'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
// due minuti su ogni attesa: il valore di serie e' trenta secondi e questa
// scena li supera regolarmente. Vedi la nota in `uno.mjs`.
p.setDefaultTimeout(120000)

const errori = []
p.on('pageerror', (e) => errori.push(String(e)))
p.on('console', (m) => { if (m.type() === 'error') errori.push(m.text()) })

await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.waitForFunction(
  () => window.esperienza.autoPronta && window.esperienza.ambientePronto,
  null, { timeout: 180000 },
).catch(() => console.log('  (asset non tutti pronti)'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

let da = 0
for (const q of QUOTE) {
  // si scorre A PASSI e non di colpo: la regia interpola sullo scorrimento,
  // e un salto secco lascia la camera a meta' strada per qualche fotogramma
  for (let i = 1; i <= 40; i++) {
    const v = da + (q - da) * (i / 40)
    await p.evaluate(([c, x]) => window.scrollTo(0, c * x), [corsa, v])
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
  da = q
  for (let i = 0; i < 60; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const file = `${CARTELLA}/${nome}_${String(q).replace('.', '')}.jpeg`
  await p.screenshot({ path: file, type: 'jpeg', quality: 88 })
  const beat = await p.evaluate(() => ({ b: esperienza.regia.beat, l: +esperienza.regia.locale.toFixed(2) }))
  console.log(`\n${file}  beat ${beat.b} ${beat.l}`)
  await misura(file)
}

if (errori.length) {
  console.log('\n!! ERRORI IN PAGINA')
  for (const e of errori.slice(0, 6)) console.log('  ' + e.slice(0, 300))
}
await b.close()

/** le stesse tre fasce di `livelli.mjs`, per poter confrontare i numeri */
async function misura(f) {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height
  const fascia = (x0, x1, y0, y1, etichetta) => {
    const v = []; let brucia = 0, nero = 0
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 3
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      v.push(l); if (l > 250) brucia++; if (l < 4) nero++
    }
    v.sort((a, b) => a - b)
    const q = (t) => v[Math.floor(v.length * t)] | 0
    const media = v.reduce((a, b) => a + b, 0) / v.length
    console.log(`${etichetta.padEnd(12)} media ${media.toFixed(1).padStart(5)}  p05 ${String(q(.05)).padStart(3)}  p50 ${String(q(.5)).padStart(3)}  p95 ${String(q(.95)).padStart(3)}  p99 ${String(q(.99)).padStart(3)}  bruciato ${(brucia / v.length * 100).toFixed(2)}%  nero ${(nero / v.length * 100).toFixed(1)}%`)
  }
  fascia(0, W, 0, H, 'fotogramma')
  fascia(Math.round(W * 0.26), Math.round(W * 0.74), Math.round(H * 0.36), Math.round(H * 0.64), 'soggetto')
  fascia(0, W, 0, Math.round(H * 0.33), 'alto')
}
