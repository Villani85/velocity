/**
 * LE FINITURE — la prova che i campioni cambiano davvero l'automobile.
 *
 * Il comando FINITURA e' rimasto rotto per due giri senza che nessuno strumento
 * se ne accorgesse: `applicaFinitura` scriveva su un materiale che la
 * carrozzeria non indossava piu', quindi non dava errore e non faceva niente.
 * E' il caso da manuale dello strumento verde su una scena guasta.
 *
 * Questo strumento non guarda il codice: clicca i cinque campioni come farebbe
 * un dito e MISURA i pixel dell'automobile. Se due finiture danno lo stesso
 * numero, o se una qualsiasi finisce sotto la soglia del nero, si vede qui.
 *
 * Come trova i pixel dell'automobile: differenza fra la scena con la vettura e
 * la scena senza. E' la stessa tecnica di `carrozzeria.mjs` — segue la sagoma
 * vera invece di fidarsi di un riquadro disegnato a mano.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const OUT = 'C:/Users/Giuseppe/Webingegno/velocity/docs/provini'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 })
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

const fermo = async () => { for (let i = 0; i < 45; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r))) }
const scatta = async () => sharp(await p.screenshot({ type: 'png' })).raw().toBuffer({ resolveWithObject: true })

// la maschera: cosa cambia fra vettura nascosta e vettura in scena
await p.evaluate(() => { window.esperienza.autoVera.visible = false })
await fermo()
const senza = await scatta()
await p.evaluate(() => { window.esperienza.autoVera.visible = true })
await fermo()
const con = await scatta()
const { width: W, height: H, channels: C } = con.info
const mia = []
for (let i = 0; i < con.data.length; i += C) {
  const d = Math.abs(con.data[i] - senza.data[i]) + Math.abs(con.data[i + 1] - senza.data[i + 1]) + Math.abs(con.data[i + 2] - senza.data[i + 2])
  if (d > 24) mia.push(i)
}
console.log('pixel dell\'automobile: ' + mia.length + ' su ' + (W * H))

const campioni = await p.$$('.comandi__campione')
console.log('campioni trovati: ' + campioni.length)
const nomi = []
for (let i = 0; i < campioni.length; i++) nomi.push(await campioni[i].getAttribute('title'))

const righe = []
for (let i = 0; i < campioni.length; i++) {
  await campioni[i].click()
  await fermo()
  const png = await p.screenshot({ type: 'png' })
  await sharp(png).jpeg({ quality: 88 }).toFile(OUT + '/finitura_' + i + '.jpeg')
  const { data } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
  const ch = [[], [], []]
  for (const k of mia) for (let c = 0; c < 3; c++) ch[c].push(data[k + c])
  const med = ch.map((a) => { a.sort((x, y) => x - y); return a[a.length >> 1] })
  const luma = 0.2126 * med[0] + 0.7152 * med[1] + 0.0722 * med[2]
  righe.push({ i, nome: nomi[i], med, luma })
  console.log('  ' + String(i) + ' ' + (nomi[i] ?? '?').padEnd(20) + ' RGB ' + med.map((v) => String(v).padStart(3)).join(' ') + '   luma ' + luma.toFixed(1))
}

console.log('')
let guasto = false
for (let a = 0; a < righe.length; a++) {
  if (righe[a].luma < 8) { console.log('GUASTO: «' + righe[a].nome + '» e\' sotto la soglia del nero (luma ' + righe[a].luma.toFixed(1) + ')'); guasto = true }
  for (let c = a + 1; c < righe.length; c++) {
    const dist = Math.abs(righe[a].med[0] - righe[c].med[0]) + Math.abs(righe[a].med[1] - righe[c].med[1]) + Math.abs(righe[a].med[2] - righe[c].med[2])
    if (dist < 10) { console.log('GUASTO: «' + righe[a].nome + '» e «' + righe[c].nome + '» sono indistinguibili (distanza ' + dist + ')'); guasto = true }
  }
}
console.log(guasto ? 'FINITURA ROTTA' : 'FINITURA OK: cinque vestiti distinti, nessuno spento')
await b.close()
