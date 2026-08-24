/** QUANTO VALE DAVVERO `scorrimento.velocita`.
 *
 *  La strada costruita deve tradurre quel numero in metri al secondo, e per
 *  scrivere la conversione serve sapere che valori assume DAVVERO quando una
 *  persona scorre — non quando uno strumento salta da un punto all'altro.
 *
 *  Si simula la rotella (`mouse.wheel`), che e' il gesto vero, e si campiona
 *  a ogni fotogramma tenendo il massimo.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
console.log('corsa in pixel:', corsa)
await p.evaluate(([c]) => window.scrollTo(0, c * 0.88), [corsa])
for (let i = 0; i < 40; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))

// il campionatore sta nella pagina: leggere da fuori a ogni fotogramma
// costerebbe un viaggio di andata e ritorno per campione, e il massimo
// sfuggirebbe proprio nei fotogrammi piu' veloci
await p.evaluate(() => {
  window.__picco = 0
  window.__serie = []
  const passo = () => {
    const v = window.esperienza.scorrimento.velocita
    if (v > window.__picco) window.__picco = v
    window.__serie.push(+v.toFixed(4))
    requestAnimationFrame(passo)
  }
  requestAnimationFrame(passo)
})

for (const [nome, passo, colpi, pausa] of [
  ['rotella piano', 120, 8, 90],
  ['rotella normale', 300, 10, 45],
  ['rotella forte', 600, 14, 16],
]) {
  // SI TORNA INDIETRO PRIMA DI OGNI PROVA. La prima versione non lo faceva e
  // la seconda prova misurava ZERO: la pagina era gia' in fondo, quindi la
  // rotella girava a vuoto. Un numero a zero sembra un risultato, ed e'
  // l'errore piu' facile da credere.
  await p.evaluate(([c]) => window.scrollTo(0, c * 0.55), [corsa])
  await p.evaluate(() => new Promise(r => setTimeout(r, 700)))
  await p.evaluate(() => { window.__picco = 0; window.__serie = [] })
  for (let i = 0; i < colpi; i++) {
    await p.mouse.wheel(0, passo)
    await p.evaluate((ms) => new Promise(r => setTimeout(r, ms)), pausa)
  }
  const r = await p.evaluate(() => ({ picco: +window.__picco.toFixed(4), coda: window.__serie.slice(-4) }))
  console.log(nome.padEnd(16), JSON.stringify(r))
  await p.evaluate(() => new Promise(r => setTimeout(r, 900)))
  console.log('   dopo un secondo di fermo:', await p.evaluate(() => +window.esperienza.scorrimento.velocita.toFixed(5)))
}
await b.close()
