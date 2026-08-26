/**
 * GLI SCATTI — non la mediana, la CODA.
 *
 * PERCHE' NON BASTAVA `fps.mjs`. Quello stampa la mediana e il p95 di una
 * corsa, e la mediana e' esattamente la statistica che uno scatto non tocca:
 * una scena con mediana 16 ms e un fotogramma da 120 ms ogni due secondi ha
 * sessanta fotogrammi al secondo sulla carta e si vede a singhiozzo. Il
 * committente l'ha detto due volte — «lo vedo a scatti» — e le due volte lo
 * strumento che avevo diceva che andava bene.
 *
 * Uno scatto e' un fotogramma che dura MOLTO PIU' DEI SUOI VICINI. Non «piu'
 * di 16 ms»: su una macchina carica tutta la corsa puo' stare a 25 ms ed
 * essere perfettamente fluida, perche' l'occhio si accorge della VARIAZIONE,
 * non del valore. Quindi il metro e' il rapporto con la mediana della corsa,
 * come in `raccordo.mjs` — la stessa forma, per un'altra grandezza.
 *
 * COSA STAMPA, e perche' ognuna serve:
 *   mediana        quanto costa un fotogramma normale
 *   p95 / p99      dove comincia la coda
 *   il piu' lungo  il caso peggiore, che e' quello che si vede
 *   strappi        quanti fotogrammi durano piu' del doppio della mediana
 *   DOVE           la frazione di scorrimento di ognuno dei dieci peggiori
 *
 * Il «dove» e' la meta' del valore di questo strumento. Se i dieci peggiori
 * sono sparsi, e' carico di fondo o raccolta della memoria; se stanno tutti
 * nello stesso centesimo di pagina, e' un pezzo di scena identificabile — la
 * vetrina che compone una tela, la pattuglia che entra, il modello che
 * arriva — e allora c'e' qualcosa da andare a guardare.
 *
 * E SI DICHIARA IL CARICO DELLA MACCHINA. Un riferimento che non dice sotto
 * quale carico e' stato preso mente: ho diagnosticato «47 shader compilati
 * durante la corsa» e a macchina scarica erano due.
 *
 * SI SCORRE COME SCORRE UNA PERSONA, non un fotogramma per passo. Un ciclo
 * `for` con uno `scrollTo` per `requestAnimationFrame` percorre la pagina in
 * tre secondi e misura una corsa che nessuno fa mai; e soprattutto tiene il
 * processore occupato a fare `scrollTo`, che e' proprio il lavoro che non si
 * vuole misurare. Qui la pagina si percorre in un tempo dichiarato e la
 * posizione si calcola dall'orologio.
 *
 *     node strumenti/scatti.mjs
 *     node strumenti/scatti.mjs http://localhost:5179/    un altro indirizzo
 *
 * IL CANCELLO non c'e' ancora, ed e' voluto: prima si guarda che numeri fa
 * questa scena su questa macchina, poi si decide sotto quale soglia si sta.
 * Una soglia scelta prima di vedere i dati e' un'aspirazione travestita da
 * misura — e' la stessa trappola in cui e' caduto il bersaglio della
 * carrozzeria. Finche' non c'e', questo strumento ESCE SEMPRE CON ZERO e lo
 * dichiara nell'ultima riga, perche' un cartello che sembra un cancello e'
 * peggio di nessuno dei due.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { execSync } from 'node:child_process'

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:5174/'
/** quanto dura la corsa dall'inizio alla fine della pagina, in millisecondi */
const CORSA_MS = 20000
/** un fotogramma e' uno «strappo» se dura piu' di questo per la mediana */
const STRAPPO = 2.0

function carico() {
  try {
    const s = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_Processor).LoadPercentage"',
      { encoding: 'utf8', timeout: 20000 },
    ).trim()
    return s + '%'
  } catch { return 'non misurato' }
}

const primaCarico = carico()

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(200000)
/* IL CLIENT DI VITE NON SI TOGLIE, e qui e' una differenza voluta rispetto a
   tutti gli altri strumenti. Altrove si toglie perche' puo' ricaricare il
   modulo sotto la misura; qui la domanda e' proprio «cosa vede il committente
   sulla porta 5174», e sulla 5174 quel client c'e'. Toglierlo vorrebbe dire
   misurare una pagina che nessuno sta guardando. */
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))

console.log('\nSCATTI —', BASE)
console.log('carico della macchina prima di cominciare:', primaCarico)

const t0 = Date.now()
await p.goto(BASE, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 240000 })
await p.waitForFunction(
  () => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4,
  null, { timeout: 120000 },
).catch(() => console.log('  (le ruote vere non sono arrivate)'))
console.log('scena pronta dopo', ((Date.now() - t0) / 1000).toFixed(1), 's')

const r = await p.evaluate(async (CORSA_MS) => {
  const corsa = document.documentElement.scrollHeight - innerHeight
  const campioni = []
  const avvio = performance.now()
  let prec = avvio
  await new Promise((fine) => {
    function giro(ora) {
      const t = (ora - avvio) / CORSA_MS
      campioni.push({ ms: ora - prec, q: Math.min(1, t) })
      prec = ora
      if (t >= 1) return fine()
      window.scrollTo(0, corsa * t)
      requestAnimationFrame(giro)
    }
    requestAnimationFrame(giro)
  })
  return {
    campioni: campioni.slice(1), // il primo intervallo parte da prima del ciclo
    livello: window.esperienza?.qualita?.livello ?? '?',
    chiamate: window.esperienza?.renderer?.info?.render?.calls ?? 0,
  }
}, CORSA_MS)

await b.close()

const ms = r.campioni.map((c) => c.ms).sort((a, x) => a - x)
const q = (f) => ms[Math.min(ms.length - 1, Math.floor(ms.length * f))]
const mediana = q(0.5)
const strappi = r.campioni.filter((c) => c.ms > mediana * STRAPPO)
const peggiori = [...r.campioni].sort((a, x) => x.ms - a.ms).slice(0, 10)

console.log('livello di qualita\' a fine corsa:', r.livello, '  draw call:', r.chiamate)
console.log('fotogrammi misurati:', ms.length, 'in', (CORSA_MS / 1000) + ' s di corsa\n')
console.log('  mediana   ', mediana.toFixed(1).padStart(7), 'ms  (' + (1000 / mediana).toFixed(0) + ' fps)')
console.log('  p95       ', q(0.95).toFixed(1).padStart(7), 'ms')
console.log('  p99       ', q(0.99).toFixed(1).padStart(7), 'ms')
console.log('  il piu\' lungo', ms[ms.length - 1].toFixed(1).padStart(4), 'ms')
console.log('')
console.log('  strappi (oltre ' + STRAPPO + 'x la mediana, cioe\' ' + (mediana * STRAPPO).toFixed(0) + ' ms):',
  strappi.length, 'su', ms.length,
  '=', (strappi.length / ms.length * 100).toFixed(1) + '%')
console.log('')
console.log('  i dieci peggiori, e DOVE cadono:')
for (const c of peggiori) {
  console.log('   ', c.ms.toFixed(1).padStart(7), 'ms   a q =', c.q.toFixed(3))
}
console.log('\ncarico della macchina alla fine:', carico())
console.log('(questo strumento MISURA e basta: non ha ancora un cancello, e lo dice)')
