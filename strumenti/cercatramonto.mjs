/** QUALE ROTAZIONE PORTA IL SOLE DIETRO L'AUTOMOBILE.
 *
 *  `dovesta.mjs` ha trovato il sole nella panoramica: un picco netto a 74 gradi
 *  di azimut dell'IMMAGINE. Ma il pulsante non gira l'immagine: gira la scena, e
 *  la camera guarda una fetta fissa. Fra «74 gradi nell'immagine» e «il numero
 *  da mettere nel pulsante» c'e' una mappatura che dipende da dove sta la
 *  camera, dal verso della rotazione e dall'origine dell'equirettangolare.
 *
 *  Dedurla e' un ottimo modo per sbagliare di segno e non accorgersene. Si
 *  misura: si gira la manopola a passi di dieci gradi e per ognuno si guarda
 *  QUANTO E' CALDO IL CIELO DIETRO L'AUTOMOBILE. Il massimo e' la risposta, e
 *  arriva senza dover sapere niente della mappatura.
 *
 *  IL RIQUADRO E' IL CIELO, non tutto il fotogramma: la parte alta e centrale,
 *  sopra la vettura e sotto la testata. Misurare tutto il fotogramma
 *  troverebbe il pavimento caldo della corte, che e' caldo sempre.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const PASSO = Number(process.argv[2] ?? 10)

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ' + e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.evaluate(() => window.fissaQualita('alto'))
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, 0.06 * (i / 40)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}

const CIELO = { left: 120, top: 130, width: 900, height: 110 }
const righe = []
for (let g = 0; g < 360; g += PASSO) {
  await p.evaluate((v) => window.giraPanorama(v), g)
  for (let j = 0; j < 8; j++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const png = await p.screenshot({ type: 'png' })
  const { data, info } = await sharp(png).extract(CIELO).raw().toBuffer({ resolveWithObject: true })
  let caldo = 0
  let luce = 0
  let n = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i]
    const gg = data[i + 1]
    const bb = data[i + 2]
    caldo += r - bb
    luce += 0.2126 * r + 0.7152 * gg + 0.0722 * bb
    n++
  }
  righe.push({ g, caldo: caldo / n, luce: luce / n })
}
await b.close()

righe.sort((a, c) => c.caldo - a.caldo)
console.log('IL CIELO DIETRO L AUTOMOBILE, a ogni rotazione')
console.log('')
console.log('  gradi   caldo (R-B)   luce')
for (const r of righe.slice(0, 8)) {
  console.log('  ' + String(r.g).padStart(5) + '   ' + r.caldo.toFixed(1).padStart(9) + '   ' + r.luce.toFixed(1).padStart(5))
}
console.log('')
console.log('  ... e i tre piu freddi:')
for (const r of righe.slice(-3)) {
  console.log('  ' + String(r.g).padStart(5) + '   ' + r.caldo.toFixed(1).padStart(9) + '   ' + r.luce.toFixed(1).padStart(5))
}
const attuale = righe.find((r) => r.g === 90)
console.log('')
console.log('  TRAMONTO oggi punta a 90 gradi: caldo ' + (attuale ? attuale.caldo.toFixed(1) : '?'))
console.log('  il piu caldo e a ' + righe[0].g + ' gradi: caldo ' + righe[0].caldo.toFixed(1))
