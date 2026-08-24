/**
 * QUANTO E' LARGA LA TRANSIZIONE SU UN BORDO — la misura giusta per
 * l'antialiasing, dove la posizione del bordo non lo e'.
 *
 * Un bordo aliasato passa da un colore all'altro in UN pixel: un salto secco.
 * Un bordo con antialiasing vero passa attraverso due o tre pixel intermedi,
 * ognuno una miscela dei due colori — e' quella rampa a dare l'impressione
 * di un contorno disegnato con un tratto fermo invece che con un pennarello
 * tremante.
 *
 * Si misura su piu' scanline che attraversano lo stesso bordo (il canopy
 * contro il riflesso chiaro sotto di lui, trovato guardando il provino) e si
 * conta quanti PIXEL DISTINTI compongono la salita dal 20% all'80% del salto
 * di luminanza.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const CODA = process.argv[2] ? '?' + process.argv[2] : ''
const NOME = process.argv[3] || 'con'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/' + CODA, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 })
await p.evaluate(() => window.fissaQualita('medio'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) { await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, 0.30 * (i / 40)]); await p.evaluate(() => new Promise((r) => requestAnimationFrame(r))) }
for (let i = 0; i < 60; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

const png = await p.screenshot({ type: 'png' })
await sharp(png).extract({ left: 660, top: 235, width: 140, height: 60 }).resize(1400, 600, { kernel: 'nearest' })
  .jpeg({ quality: 96 }).toFile('C:/Users/Giuseppe/Webingegno/velocity/docs/provini/bordo_' + NOME + '.jpeg')
const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
const { width: W, channels: C } = info
const L = (x, y) => { const i = (y * W + x) * C; return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] }

const larghezze = []
for (let y = 240; y < 262; y++) {
  const vals = []
  for (let x = 730; x < 810; x++) vals.push(L(x, y))
  const mn = Math.min(...vals), mx = Math.max(...vals)
  if (mx - mn < 40) continue // niente bordo su questa riga
  // soglia alta = quasi al massimo (roof), soglia bassa = quasi al minimo (cielo):
  // la larghezza e' la distanza fra il primo punto che scende sotto l'alta e
  // il primo punto, dopo di lui, che scende sotto la bassa
  const alta = mx - (mx - mn) * 0.1, bassa = mn + (mx - mn) * 0.1
  let iAlta = -1, iBassa = -1
  for (let i = 0; i < vals.length; i++) {
    if (iAlta < 0 && vals[i] < alta) iAlta = i
    if (iAlta >= 0 && vals[i] < bassa) { iBassa = i; break }
  }
  if (iAlta >= 0 && iBassa >= 0) larghezze.push(iBassa - iAlta + 1)
}
console.log(NOME + '   scanline utili: ' + larghezze.length + '   larghezze: ' + larghezze.join(', '))
if (larghezze.length) console.log('  media: ' + (larghezze.reduce((s, v) => s + v, 0) / larghezze.length).toFixed(2) + ' px')
await b.close()
