/** MISURA LA STRADA — che cosa si vede, e se si muove davvero.
 *
 *  Prima serviva a decidere se «non si vede la strada» fosse un difetto di
 *  regia o di contenuto (era di contenuto: vedi il commento in testa a
 *  `src/scene/Lastra.ts`). Adesso serve a dimostrare le due cose che la
 *  strada costruita deve fare e il filmato non faceva:
 *
 *   1) nel beat `accensione` si VEDE, anche se e' ferma;
 *   2) nel beat `velocita` corre, e corre DI PIU' se si scorre di piu'.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => console.log('  (asset non tutti pronti)'))
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

const stato = () => p.evaluate(() => {
  const e = window.esperienza
  return {
    beat: e.regia.beat,
    velocita: +e.scorrimento.velocita.toFixed(4),
    andatura: +e.lastra.andatura.toFixed(1),
    kmh: Math.round(e.lastra.andatura * 3.6),
    avanzamento: +e.lastra.avanzamento.toFixed(1),
    inMoto: e.lastra.inMoto,
    video: e.lastra.video,
  }
})

async function vai(q, fotogrammi = 45) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q])
  for (let i = 0; i < fotogrammi; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
}

console.log('--- fermi in ogni punto (la strada deve essere ferma solo prima di `velocita`)')
for (const q of [0.78, 0.84, 0.88, 0.92, 0.98]) {
  await vai(q)
  console.log(q, JSON.stringify(await stato()))
}

console.log('--- e adesso si scorre davvero: la strada deve rispondere')
// IL PICCO SI CAMPIONA DENTRO LA PAGINA, non da fuori. Alla prima stesura
// leggevo l'andatura DOPO la scrollata: e' arrivata 94 km/h, e sembrava una
// risposta fiacca. Non lo era — era il campione preso tardi, quando la
// discesa da 1,6 secondi aveva gia' riportato tutto verso la crociera. Un
// viaggio di andata e ritorno per campione perde sempre proprio il picco.
await p.evaluate(() => {
  window.__max = 0
  const passo = () => {
    window.__max = Math.max(window.__max, window.esperienza.lastra.andatura)
    requestAnimationFrame(passo)
  }
  requestAnimationFrame(passo)
})
await vai(0.60)
await p.evaluate(() => { window.__max = 0 })
// una scrollata vera, a colpi di rotella come la da' una persona
for (let i = 0; i < 9; i++) {
  await p.mouse.wheel(0, 260)
  await p.evaluate(() => new Promise(r => setTimeout(r, 32)))
}
const picco = await p.evaluate(() => Math.round(window.__max * 3.6))
console.log('picco durante la scrollata  ', picco, 'km/h')
console.log('subito dopo la scrollata ', JSON.stringify(await stato()))
await p.evaluate(() => new Promise(r => setTimeout(r, 1500)))
console.log('un secondo e mezzo dopo  ', JSON.stringify(await stato()))

// e i metri devono aumentare da soli, se no non c'e' movimento
const a = (await stato()).avanzamento
await p.evaluate(() => new Promise(r => setTimeout(r, 1000)))
const bb = (await stato()).avanzamento
console.log('metri percorsi in un secondo di sola crociera:', +((bb - a + 156) % 156).toFixed(1))

await b.close()
