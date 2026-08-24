/** IL FOTOGRAMMA A VELOCITA' PIENA, che nessun altro strumento sa dare.
 *
 *  `uno.mjs` scorre e POI aspetta sessanta fotogrammi prima dello scatto: in
 *  quel secondo la discesa da 1,6 secondi ha gia' riportato l'andatura verso
 *  la crociera, e la fotografia esce a 80 km/h anche se durante la scrollata
 *  se ne toccavano 245. Va benissimo per la luce e i materiali; non serve a
 *  niente per la SFOCATURA DI MOVIMENTO, che dipende solo dai metri al
 *  secondo ed e' l'unica cosa che a 80 non si vede.
 *
 *  Qui l'andatura si impone da fuori e si scatta al fotogramma dopo. La
 *  costante di discesa e' 1,6 secondi: in un fotogramma da 16 ms l'andatura
 *  imposta perde l'uno per cento, quindi cio' che si fotografa e' davvero
 *  quella.
 *
 *    node strumenti/lanciata.mjs <scorrimento> <metri al secondo> <nome>
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const q = Number(process.argv[2] ?? 0.92)
const ms = Number(process.argv[3] ?? 82)
const nome = process.argv[4] ?? 'lanciata'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => console.log('  (asset non tutti pronti)'))
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / 40)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}
for (let i = 0; i < 40; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
const vero = await p.evaluate(async (ms) => {
  esperienza.lastra.andatura = ms
  await new Promise((r) => requestAnimationFrame(r))
  return { kmh: Math.round(esperienza.lastra.andatura * 3.6), beat: esperienza.regia.beat }
}, ms)
await p.screenshot({ path: `C:/Users/Giuseppe/Webingegno/velocity/docs/provini/${nome}.jpeg`, type: 'jpeg', quality: 92 })
console.log(nome, vero)
await b.close()
