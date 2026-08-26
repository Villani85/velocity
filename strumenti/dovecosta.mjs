/**
 * DOVE NASCONO GLI SCATTI — un p95 per capitolo, non uno per sessione.
 *
 * IL PROBLEMA DI UN p95 SOLO. La misura dice 79 ms su una mediana di 19: c'e'
 * un fotogramma su venti che costa quasi cinque budget. Ma un numero solo su
 * tutta la corsa non dice DOVE, e senza il dove l'unica cosa che si puo' fare e'
 * togliere roba a caso — meno ombre, meno risoluzione, meno effetti — che e' il
 * modo piu' rapido di peggiorare un sito credendo di ripararlo.
 *
 * Quindi si misura per capitolo. Un p95 alto SOLO dentro un beat e' un evento di
 * quel beat; alto dappertutto e' un costo di disegno.
 *
 * E SI GUARDA COSA SUCCEDE NELLO STESSO ISTANTE. `renderer.info` dice quanti
 * programmi sono compilati: se il numero SALE mentre il fotogramma costa, quello
 * scatto e' una compilazione di shader e non ha niente a che vedere con quanti
 * pixel si disegnano. E' la distinzione che decide se la cura e' precaricare o
 * alleggerire — due lavori opposti.
 *
 *   node strumenti/dovecosta.mjs [passi]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const PASSI = Number(process.argv[2] || 420)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
/* SI PUO' PASSARE UNA CODA ALL'INDIRIZZO — serve per gli esperimenti in cui si
   spegne un pezzo del sito e si rimisura:
   `node strumenti/dovecosta.mjs 420 senzariscaldamento`.
   E sta in TERZA posizione, non in seconda: la seconda era gia' il numero di
   passi. Mettendocela io ci ho scritto sopra, `PASSI` e' diventato NaN, il
   ciclo non ha girato nemmeno una volta e lo strumento ha stampato «0 su 0»
   invece di dire che l'avevo rotto. Anche gli strumenti sanno mentire. */
const coda = process.argv[3] ? '?' + process.argv[3] : ''
/* E L'INDIRIZZO SI PUO' CAMBIARE DA FUORI, che prima non si poteva.
   Stava scritto qui dentro come `localhost:5174`, cioe' il server di sviluppo:
   moduli non impacchettati, niente minificazione, il client di Vite attaccato.
   Il committente ha guardato la build vera pubblicata e ha detto «sembra
   pesantissimo» — e questo strumento non poteva rispondere, perche' l'unica
   cosa che sapeva guardare era un'altra pagina.
     BASE_URL=https://... node strumenti/dovecosta.mjs 420 */
const BASE = process.env.BASE_URL || 'http://localhost:5174/'
await p.goto(BASE + coda, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 120000 }).catch(() => {})
await p.evaluate(() => window.fissaQualita('alto'))

// RISCALDAMENTO: i primi fotogrammi di qualunque scena compilano e caricano.
// Misurarli insieme al resto vuol dire attribuire al disegno un costo che e'
// di avvio, e cercarlo poi per sempre nel posto sbagliato.
for (let i = 0; i < 90; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

const dati = await p.evaluate(async (passi) => {
  const corsa = document.body.scrollHeight - innerHeight
  const out = []
  let prima = performance.now()
  for (let i = 0; i <= passi; i++) {
    window.scrollTo(0, corsa * (i / passi))
    await new Promise((r) => requestAnimationFrame(r))
    const ora = performance.now()
    const inf = esperienza.renderer.info
    out.push({
      ms: ora - prima,
      beat: esperienza.regia.beat,
      programmi: inf.programs ? inf.programs.length : 0,
      chiamate: inf.render.calls,
      triangoli: inf.render.triangles,
      geometrie: inf.memory.geometries,
      tessiture: inf.memory.textures,
    })
    prima = ora
  }
  return out
}, PASSI)

await b.close()

// il primo fotogramma dopo un salto di scorrimento e' sempre anomalo: si
// scarta la coda iniziale, non i picchi — sono proprio quelli da trovare
const utili = dati.slice(6)
const perc = (a, q) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * q))] : 0

const capitoli = new Map()
for (const d of utili) {
  if (!capitoli.has(d.beat)) capitoli.set(d.beat, [])
  capitoli.get(d.beat).push(d)
}

console.log('capitolo      n    p50     p75     p90     p95     p99     max     chiamate  triangoli')
for (const [beat, righe] of capitoli) {
  const ms = righe.map((r) => r.ms).sort((x, y) => x - y)
  const c = Math.round(righe.reduce((a, r) => a + r.chiamate, 0) / righe.length)
  const t = Math.round(righe.reduce((a, r) => a + r.triangoli, 0) / righe.length)
  console.log(
    beat.padEnd(12),
    String(righe.length).padStart(4),
    ...[0.5, 0.75, 0.9, 0.95, 0.99].map((q) => perc(ms, q).toFixed(1).padStart(7)),
    perc(ms, 1).toFixed(1).padStart(7),
    String(c).padStart(9),
    String(t).padStart(10),
  )
}

// I PICCHI, uno per uno, con cosa e' cambiato nello stesso fotogramma.
const soglia = 45
const picchi = utili.filter((d) => d.ms > soglia)
console.log(`\npicchi sopra ${soglia} ms: ${picchi.length} su ${utili.length} (${(picchi.length / utili.length * 100).toFixed(1)}%)`)
let progPrec = utili[0].programmi, texPrec = utili[0].tessiture, geoPrec = utili[0].geometrie
for (const d of utili) {
  const dProg = d.programmi - progPrec, dTex = d.tessiture - texPrec, dGeo = d.geometrie - geoPrec
  if (d.ms > soglia || dProg || dTex || dGeo) {
    const causa = []
    if (dProg) causa.push(`+${dProg} programmi`)
    if (dTex) causa.push(`${dTex > 0 ? '+' : ''}${dTex} tessiture`)
    if (dGeo) causa.push(`${dGeo > 0 ? '+' : ''}${dGeo} geometrie`)
    const perche = causa.length ? causa.join(', ') : 'niente di nuovo in scena: e disegno'
    console.log('  ' + d.beat.padEnd(11) + d.ms.toFixed(1).padStart(8) + ' ms   ' + perche)
  }
  progPrec = d.programmi; texPrec = d.tessiture; geoPrec = d.geometrie
}
