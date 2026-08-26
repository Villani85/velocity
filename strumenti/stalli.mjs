/** GLI STALLI — non quanti fotogrammi al secondo, ma i BUCHI.
 *
 *  `fps.mjs` dice mediana 20 ms e p95 536 ms. La mediana e' buona e non conta:
 *  quello che si vede e' il p95. Un fotogramma da mezzo secondo, dentro una
 *  scena il cui soggetto e' la velocita', e' la strada che si ferma.
 *
 *  E c'e' un aggravante che sta nel codice: `dt` e' limitato a 0,1 s. Durante
 *  uno stallo di 536 ms il mondo avanza di un decimo di secondo e PERDE gli
 *  altri quattro. Non e' solo uno scatto: e' strada che non viene percorsa.
 *
 *  Questo strumento raccoglie OGNI fotogramma di un tratto e dice quando i
 *  buchi succedono, non solo quanti sono: un p95 alto perche' i primi tre
 *  fotogrammi compilano gli shader e' un problema diverso da un p95 alto
 *  sparso per tutto il tratto.
 *
 *  node strumenti/stalli.mjs <da> <a> <secondi>
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const DA = Number(process.argv[2] ?? 0.70)
const A = Number(process.argv[3] ?? 0.83)
const SECONDI = Number(process.argv[4] ?? 10)
const QUAL = process.argv[5] ?? 'alto'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 120000 }).catch(() => {})
if (QUAL !== 'auto') await p.evaluate((v) => window.fissaQualita(v), QUAL)
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
await p.evaluate(([c, da]) => window.scrollTo(0, c * da), [corsa, DA])
/* SI SCALDA PRIMA DI MISURARE. I primi fotogrammi di un tratto compilano
   programmi e caricano tessiture: contarli come stalli e' come cronometrare
   una macchina mentre la si accende. Due secondi di corsa a vuoto. */
await p.evaluate(() => new Promise((f) => { let n = 0; const g = () => (++n > 120 ? f() : requestAnimationFrame(g)); requestAnimationFrame(g) }))

const r = await p.evaluate(async ([c, da, a, secondi]) => {
  const dt = [], quando = []
  let prima = performance.now()
  const t0 = prima
  await new Promise((fine) => {
    const passo = () => {
      const ora = performance.now()
      dt.push(ora - prima); quando.push(ora - t0)
      prima = ora
      const t = (ora - t0) / (secondi * 1000)
      if (t >= 1) return fine()
      window.scrollTo(0, c * (da + (a - da) * t))
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
  return { dt: dt.slice(1), quando: quando.slice(1), beat: window.esperienza.regia.beat }
}, [corsa, DA, A, SECONDI])
await b.close()

const d = [...r.dt].sort((x, y) => x - y)
const q = (f) => d[Math.min(d.length - 1, Math.floor(d.length * f))]
console.log('')
console.log('  ' + r.dt.length + ' fotogrammi su ' + SECONDI + 's, tratto ' + DA + ' -> ' + A)
console.log('  mediana ' + q(0.5).toFixed(1) + ' ms    p90 ' + q(0.9).toFixed(1) +
  '    p95 ' + q(0.95).toFixed(1) + '    p99 ' + q(0.99).toFixed(1) + '    massimo ' + q(1).toFixed(0) + ' ms')
/* IL CONTO CHE DECIDE: quanto tempo di STRADA si perde. Ogni fotogramma piu'
   lungo di 100 ms fa avanzare il mondo di 100 ms soltanto, perche' `dt` e'
   tagliato li'. Il resto e' strada che non viene percorsa. */
const TAGLIO = 100
const persi = r.dt.filter((x) => x > TAGLIO)
const msPersi = persi.reduce((s, x) => s + (x - TAGLIO), 0)
console.log('')
console.log('  fotogrammi oltre ' + TAGLIO + ' ms: ' + persi.length + ' su ' + r.dt.length +
  ' (' + (100 * persi.length / r.dt.length).toFixed(1) + '%)')
console.log('  TEMPO DI STRADA PERSO per il taglio del dt: ' + (msPersi / 1000).toFixed(2) + ' s su ' + SECONDI +
  ' = ' + (100 * msPersi / (SECONDI * 1000)).toFixed(1) + '%')
console.log('')
console.log('  dove cadono i buchi (ogni riga e mezzo secondo, # = 10 ms del piu lungo):')
const fasce = Math.ceil(SECONDI * 2)
for (let i = 0; i < fasce; i++) {
  const dentro = r.dt.filter((_, k) => r.quando[k] >= i * 500 && r.quando[k] < (i + 1) * 500)
  if (!dentro.length) continue
  const mx = Math.max(...dentro)
  console.log('  ' + String((i / 2).toFixed(1)).padStart(5) + 's  ' + String(dentro.length).padStart(3) + ' fot.  max ' +
    String(Math.round(mx)).padStart(4) + ' ms  ' + '#'.repeat(Math.min(60, Math.round(mx / 10))))
}
