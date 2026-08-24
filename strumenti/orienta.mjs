/**
 * QUALE FETTA DELLA FOTOGRAFIA STA DIETRO L'AUTOMOBILE.
 *
 * La camera guarda sempre nella stessa direzione — gira il soggetto, non lei
 * — quindi di trecentosessanta gradi di panorama se ne vedono novanta, sempre
 * gli stessi. Quali novanta e' una scelta di composizione, e finora non era
 * stata fatta: era quella che capitava.
 *
 * Questo strumento gira la manopola e rende l'eroe una volta per posizione,
 * poi mette tutti i fotogrammi in una tavola sola. Si sceglie guardando,
 * perche' non c'e' nessun numero che dica se dietro l'auto sta meglio la
 * vetrata accesa o la piscina col tramonto.
 *
 *   node strumenti/orienta.mjs [gradi separati da virgola]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const GIRI = (process.argv[2] || '0,45,90,135,180,225,270,315').split(',').map(Number)
const U = 'C:/Users/Giuseppe/Webingegno/velocity/.tmp/orienta'
mkdirSync(U, { recursive: true })

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1100, height: 690 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 120000 })
  .catch(() => console.log('  (asset non tutti pronti)'))
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))

// si arriva all'eroe scorrendo, non saltando: lo smorzamento fa parte della
// scena e atterrare di colpo mostra uno stato che nessuno vedra' mai
const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
for (let i = 1; i <= 30; i++) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, 0.06 * (i / 30)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}

const tessere = []
for (const g of GIRI) {
  await p.evaluate((v) => window.giraPanorama(v), g)
  // trenta fotogrammi: la mappa d'ambiente non si riorienta al primo giro di
  // giostra, e uno scatto immediato coglie la carrozzeria che riflette ancora
  // il posto di prima
  for (let i = 0; i < 30; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const f = `${U}/${String(g).padStart(3, '0')}.png`
  await p.screenshot({ path: f })
  tessere.push({ g, f })
  console.log('reso', g, 'gradi')
}
await b.close()

// ---- la tavola: due colonne, con il numero stampato sopra ogni tessera
const L = 660, A = Math.round((690 / 1100) * L)
const col = 2, rig = Math.ceil(tessere.length / col)
const ETI = 26
const pezzi = []
for (let i = 0; i < tessere.length; i++) {
  const x = (i % col) * L, y = Math.floor(i / col) * (A + ETI)
  pezzi.push({ input: await sharp(tessere[i].f).resize(L).toBuffer(), top: y + ETI, left: x })
  pezzi.push({
    input: Buffer.from(
      `<svg width="${L}" height="${ETI}"><text x="10" y="19" font-family="monospace" font-size="16" fill="#fff">${tessere[i].g} gradi</text></svg>`,
    ),
    top: y, left: x,
  })
}
await sharp({ create: { width: col * L, height: rig * (A + ETI), channels: 3, background: { r: 0, g: 0, b: 0 } } })
  .composite(pezzi).png().toFile(`${U}/tavola.png`)
console.log('tavola in', `${U}/tavola.png`)
