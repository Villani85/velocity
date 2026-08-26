/** UN TRATTO SOLO, filmato per il tempo che serve a giudicarlo.
 *
 *  `registra.mjs` percorre tutto il sito in ventisei secondi. Va bene per
 *  vedere il racconto, e non va per niente bene per giudicare UN tempo: quello
 *  della corsa va da 0,725 a 0,815 di scorrimento, cioe' due secondi e tre
 *  decimi su ventisei. Due secondi non bastano a dire se una strada da' la
 *  sensazione della velocita'.
 *
 *  E SOPRATTUTTO: la velocita' di questa scena e' una funzione della velocita'
 *  di SCORRIMENTO — «piu' forte scorri, piu' forte va». Ogni provino fermo che
 *  ho reso finora scorre a scatti e poi aspetta sessanta fotogrammi, quindi la
 *  velocita' decade a zero e il tachimetro segna nove chilometri all'ora.
 *  Ho passato la sera a fotografare una macchina ferma e a chiedermi perche'
 *  non sembrasse veloce.
 *
 *  Un fermo immagine non puo' mostrare la velocita'. E' la stessa famiglia
 *  dell'errore gia' pagato due volte: un criterio che non puo' vedere la
 *  grandezza di cui si sta parlando.
 *
 *  node strumenti/tratto.mjs <da> <a> <secondi> <nome>
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { mkdirSync, renameSync, existsSync } from 'node:fs'

const DA = Number(process.argv[2] ?? 0.70)
const A = Number(process.argv[3] ?? 0.83)
const SECONDI = Number(process.argv[4] ?? 10)
const NOME = process.argv[5] ?? 'tratto'
const FPS = 30, L = 1280, A_PX = 800
const U = 'C:/Users/Giuseppe/Webingegno/velocity/docs/video'
mkdirSync(U, { recursive: true })

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const ctx = await b.newContext({
  viewport: { width: L, height: A_PX }, deviceScaleFactor: 1,
  recordVideo: { dir: U, size: { width: L, height: A_PX } },
})
const p = await ctx.newPage()
p.setDefaultTimeout(120000)
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 120000 })
  .catch(() => console.log('  (ATTENZIONE: ruote di segnale, il filmato non vale)'))
await p.evaluate(() => window.fissaQualita('alto'))

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

/* CI SI PORTA ALL'INIZIO DEL TRATTO SENZA FILMARE IL VIAGGIO, e poi si aspetta:
   la scena ha uno smorzamento, e cominciare a filmare mentre sta ancora
   arrivando vuol dire filmare la coda del tempo precedente. */
await p.evaluate(([c, da]) => window.scrollTo(0, c * da), [corsa, DA])
await p.waitForTimeout(1200)

const pxAlSecondo = (corsa * (A - DA)) / SECONDI
console.log('  tratto ' + DA + ' -> ' + A + ' in ' + SECONDI + 's')
console.log('  = ' + Math.round(pxAlSecondo) + ' pixel di scorrimento al secondo')

const stati = await p.evaluate(async ([c, da, a, secondi]) => {
  const campioni = []
  const t0 = performance.now()
  await new Promise((fine) => {
    const passo = () => {
      const t = (performance.now() - t0) / (secondi * 1000)
      if (t >= 1) { window.scrollTo(0, c * a); return fine() }
      window.scrollTo(0, c * (da + (a - da) * t))
      /* SI ANNOTA L'AVANZAMENTO VERO, in metri al secondo, non quello che credo
         di vedere. `andatura` e' la grandezza che muove il manto — il codice fa
         `avanzamento += andatura * dt` — e confrontarla con le due costanti
         dichiarate in ANDATURA (crociera 17 m/s = 61 km/h, punta 82 = 295) dice
         in una riga se la strada corre o sta ferma.
         E si campiona a intervalli di tempo veri invece che «quando l'indice
         supera»: la prima versione spingeva a raffica appena la condizione
         diventava vera e poi lasciava buchi di tre secondi. */
      const ora = performance.now() - t0
      if (ora >= campioni.length * 250) {
        const e = window.esperienza
        const L = e.lastra
        campioni.push({
          t: +(ora / 1000).toFixed(2),
          beat: e.regia.beat,
          ms: +(L?.andatura ?? -1).toFixed(1),
          kmh: Math.round((L?.andatura ?? 0) * 3.6),
          avanz: Math.round(L?.avanzamento ?? -1),
          v: +(e.scorrimento?.velocita ?? -1).toFixed(4),
        })
      }
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
  return campioni
}, [corsa, DA, A, SECONDI])

await p.waitForTimeout(600)
const video = p.video()
await ctx.close()
await b.close()

const dove = await video.path()
const finale = U + '/' + NOME + '.webm'
if (existsSync(finale)) { try { renameSync(finale, finale + '.vecchio') } catch {} }
renameSync(dove, finale)

console.log('')
console.log('  avanzamento vero (crociera dichiarata 17 m/s = 61 km/h, punta 82 = 295):')
let riga = ''
for (const s of stati) {
  riga += '  ' + String(s.t).padStart(5) + 's ' + s.beat.padEnd(11) +
    String(s.ms).padStart(6) + ' m/s = ' + String(s.kmh).padStart(4) + ' km/h' +
    '   avanz ' + String(s.avanz).padStart(4) + ' m   v=' + s.v + String.fromCharCode(10)
}
process.stdout.write(riga)
console.log('')
console.log('  filmato in ' + finale)
