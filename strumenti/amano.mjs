/**
 * COME SCORRE UNA PERSONA — e perche' `dovecosta.mjs` non basta piu'.
 *
 * `strumenti/dovecosta.mjs` scorre da zero a uno in quattrocentoventi passi
 * senza fermarsi mai: nessuna pausa, nessun ripensamento, sette secondi filati.
 * E' il metro giusto per sapere quanto costa DISEGNARE, perche' toglie di mezzo
 * il comportamento e lascia solo la scena.
 *
 * Ma diventa il metro sbagliato appena la domanda cambia. Su questo sito una
 * parte del costo si puo' SPOSTARE — un caricamento sulla scheda video, una
 * compilazione — e spostarlo dentro una pausa vuol dire farlo sparire per chi
 * guarda: un decimo di secondo di gelo a pagina ferma non lo sente nessuno,
 * perche' non si sta muovendo niente. Uno scorrimento che non si ferma mai non
 * ha pause, quindi con quel metro un lavoro fatto bene non si vede.
 *
 * Qui si scorre a scatti, come si fa davvero: una raffica di rotella, una
 * pausa per guardare, un'altra raffica. E si separano due popolazioni che
 * dovevano stare separate da sempre:
 *
 *   FOTOGRAMMI IN MOVIMENTO — quelli che chi guarda SENTE. E' su questi che si
 *   giudica.
 *   FOTOGRAMMI IN PAUSA — quelli in cui la pagina e' ferma. Un costo che cade
 *   qui e' un costo pagato bene.
 *
 * Non e' un metro piu' indulgente: e' un metro che misura la cosa giusta. Uno
 * stallo di due secondi in movimento resta uno stallo di due secondi.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const CODA = process.argv[2] ? '?' + process.argv[2] : ''
/** quanti gradini di scorrimento in una raffica */
const RAFFICA = 14
/** quanto dura la pausa fra due raffiche, in millisecondi */
const PAUSA = 620
/** quante raffiche per arrivare in fondo */
const RAFFICHE = 26

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/' + CODA, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
for (let i = 0; i < 90; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

await p.evaluate(() => {
  window.__campioni = []
  let prima = performance.now()
  const giro = () => {
    const ora = performance.now()
    const inf = esperienza.renderer.info
    window.__campioni.push({
      ms: ora - prima,
      beat: esperienza.regia.beat,
      fermo: esperienza.scorrimento.velocita < 0.02,
      pr: inf.programs ? inf.programs.length : 0,
      tx: inf.memory.textures,
      ge: inf.memory.geometries,
    })
    prima = ora
    requestAnimationFrame(giro)
  }
  requestAnimationFrame(giro)
})

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let r = 0; r < RAFFICHE; r++) {
  for (let i = 0; i < RAFFICA; i++) {
    const q = Math.min(1, (r * RAFFICA + i + 1) / (RAFFICHE * RAFFICA))
    await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, q])
    await p.evaluate(() => new Promise((rr) => requestAnimationFrame(rr)))
  }
  await new Promise((rr) => setTimeout(rr, PAUSA))
}

const dati = await p.evaluate(() => window.__campioni.slice(6))
await b.close()

const inMoto = dati.filter((d) => !d.fermo)
const inPausa = dati.filter((d) => d.fermo)
const perc = (a, q) => { const s = a.map((d) => d.ms).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * q))] }
const max = (a) => a.reduce((m, d) => Math.max(m, d.ms), 0)
const sopra = (a, s) => a.filter((d) => d.ms > s).length

console.log('fotogrammi: ' + dati.length + '   in movimento ' + inMoto.length + '   in pausa ' + inPausa.length)
console.log('')
console.log('                     p50      p95      max     sopra 45 ms')
const riga = (nome, a) => console.log(
  '  ' + nome.padEnd(18) +
  perc(a, 0.5).toFixed(1).padStart(6) +
  perc(a, 0.95).toFixed(1).padStart(9) +
  max(a).toFixed(1).padStart(9) +
  ('   ' + sopra(a, 45) + ' su ' + a.length).padStart(16))
riga('IN MOVIMENTO', inMoto)
riga('in pausa', inPausa)

console.log('')
console.log('gli stalli sopra 200 ms, e dove sono caduti:')
let uno = false
let pr = dati[0].pr, tx = dati[0].tx, ge = dati[0].ge
for (const d of dati) {
  const nuovi = []
  if (d.pr > pr) nuovi.push('+' + (d.pr - pr) + ' programmi')
  if (d.tx > tx) nuovi.push('+' + (d.tx - tx) + ' tessiture')
  if (d.ge > ge) nuovi.push('+' + (d.ge - ge) + ' geometrie')
  pr = d.pr; tx = d.tx; ge = d.ge
  if (d.ms <= 200) continue
  uno = true
  console.log('  ' + d.ms.toFixed(0).padStart(6) + ' ms   ' + d.beat.padEnd(11) +
    (d.fermo ? 'a pagina ferma' : 'IN MOVIMENTO').padEnd(15) +
    (nuovi.length ? nuovi.join(', ') : 'niente di nuovo in scena: e disegno'))
}
if (!uno) console.log('  nessuno')
