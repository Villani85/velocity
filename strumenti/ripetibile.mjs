/** RIPETIBILE — due rese dello stesso stato danno lo stesso fotogramma?
 *
 *  E' il cancello del banco di prova, e viene prima di tutti gli altri: se due
 *  immagini dello stesso stato non coincidono, nessun confronto prima/dopo
 *  significa niente. In una giornata sola ho preso quattro decisioni sbagliate
 *  confrontando immagini che non erano confrontabili.
 *
 *  Con `?qa=1` devono coincidere. Senza, NON devono — e questa e' la
 *  provocazione: un banco che non ha mai fatto differenza non ha mai
 *  dimostrato di servire.
 *
 *  E OGNI LETTURA PORTA CON SE' IL CARICO DELLA MACCHINA. Un riferimento che
 *  non dice sotto quale carico e' stato preso mente: ho attribuito alla scena
 *  quarantasette programmi shader che a macchina scarica erano due. Il carico
 *  qui si legge come tempo mediano per fotogramma durante l'assestamento —
 *  non e' un numero assoluto, e' il metro con cui rileggere tutto il resto.
 *
 *  node strumenti/ripetibile.mjs [--senza-banco]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('sharp')

const SENZA = process.argv.includes('--senza-banco')
const BASE = 'http://localhost:5174/' + (SENZA ? '' : '?qa=1')

/* I RIFERIMENTI SONO IN FRAZIONE DI SCORRIMENTO, NON IN SECONDI.
   Una revisione esterna li elencava a 12 s, 14 s, 17 s: quei tempi dipendono
   dalla registrazione, e su un filmato di durata diversa non ci cadono. La
   coordinata vera di questo sito e' lo scorrimento — e' quella che governa la
   regia, ed e' l'unica che non si sposta se cambio la velocita' del filmato. */
const TAPPE = [
  ['hero', 0.06], ['orbita', 0.22], ['lato', 0.44],
  ['avvicinamento', 0.56], ['ingresso', 0.61], ['scambio', 0.63],
  ['abitacolo', 0.685], ['guida', 0.77], ['pattuglia', 0.90],
]
/** un canale che cambia di piu' di questo conta: sotto ci sta la compressione */
const SOGLIA = 6
/** e si tollera questa frazione di pixel: zero assoluto e' irraggiungibile */
const CANCELLO = 0.0005

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(180000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto(BASE, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 120000 })
  .catch(() => console.log('  (ATTENZIONE: ruote di segnale, la misura non vale)'))
if (SENZA) await p.evaluate(() => window.fissaQualita('alto'))

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

console.log('')
console.log('  ' + (SENZA ? 'BANCO SPENTO (provocazione: deve fallire)' : 'banco acceso — ?qa=1'))
console.log('')

const esiti = []
for (const [nome, q] of TAPPE) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q])
  /* SI ASSESTA E SI MISURA IL CARICO NELLO STESSO GIRO: i tempi per fotogramma
     dell'assestamento sono gia' li', e buttarli per poi stimare il carico in
     un altro modo sarebbe misurare due volte la stessa cosa peggio. */
  const dt = await p.evaluate(async () => {
    const v = []
    let prima = performance.now()
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => requestAnimationFrame(r))
      const ora = performance.now(); v.push(ora - prima); prima = ora
    }
    return v.sort((a, b) => a - b)[v.length >> 1]
  })
  const a = await p.screenshot({ type: 'png' })
  await p.waitForTimeout(2000)
  const c = await p.screenshot({ type: 'png' })

  const ga = await sharp(a).raw().toBuffer({ resolveWithObject: true })
  const gc = await sharp(c).raw().toBuffer({ resolveWithObject: true })
  const N = ga.info.width * ga.info.height
  const CH = ga.info.channels
  let cambiati = 0
  for (let i = 0; i < N; i++) {
    const k = i * CH
    if (Math.abs(ga.data[k] - gc.data[k]) > SOGLIA ||
        Math.abs(ga.data[k + 1] - gc.data[k + 1]) > SOGLIA ||
        Math.abs(ga.data[k + 2] - gc.data[k + 2]) > SOGLIA) cambiati++
  }
  const frazione = cambiati / N
  const passa = frazione <= CANCELLO

  /* QUANDO UNA TAPPA NON PASSA, SI DISEGNA CHE COSA SI E' MOSSO.
     Un cancello che dice «il quindici per cento dello schermo e cambiato» dice
     QUANTO e non CHE COSA, e senza il che cosa si tira a indovinare — che qui
     e' costato tre ipotesi sbagliate di fila. Con la mappa delle differenze
     davanti, il lampeggiante della pattuglia si e' riconosciuto in un secondo:
     era l'unica cosa del sito a leggere l'orologio invece dello scorrimento.
     Costa un'immagine, e solo quando serve. */
  if (!passa) {
    const mappa = Buffer.alloc(N * 3)
    for (let i = 0; i < N; i++) {
      const k = i * CH
      const d = Math.max(
        Math.abs(ga.data[k] - gc.data[k]),
        Math.abs(ga.data[k + 1] - gc.data[k + 1]),
        Math.abs(ga.data[k + 2] - gc.data[k + 2]))
      if (d > SOGLIA) { mappa[i * 3] = 255; mappa[i * 3 + 1] = 60 }
    }
    const dove = 'C:/Users/Giuseppe/Webingegno/velocity/docs/provini/diff_' + nome + '.jpeg'
    await sharp(mappa, { raw: { width: ga.info.width, height: ga.info.height, channels: 3 } })
      .jpeg({ quality: 88 }).toFile(dove)
  }
  esiti.push({ nome, frazione, passa })
  console.log('  ' + (passa ? ' ok ' : ' NO ') + nome.padEnd(15) +
    (frazione * 100).toFixed(4).padStart(9) + '%  ' + String(cambiati).padStart(8) + ' pixel' +
    '   carico ' + dt.toFixed(1) + ' ms/fotogramma' +
    (passa ? '' : '   -> docs/provini/diff_' + nome + '.jpeg'))
}
await b.close()

const rotti = esiti.filter((e) => !e.passa)
console.log('')
if (SENZA) {
  /* LA PROVOCAZIONE E' AL CONTRARIO: senza banco il sito DEVE muoversi da solo.
     Se non si muove, non e' il sito a essere fermo — e' il banco che non sta
     facendo niente, e allora l'esito verde di prima non valeva nulla. */
  console.log(rotti.length
    ? '  la provocazione funziona: senza banco ' + rotti.length + ' tappe su ' + esiti.length + ' non si ripetono.'
    : '  IL BANCO NON SERVE A NIENTE: anche spento, tutto si ripete identico.')
  process.exit(rotti.length ? 0 : 1)
}
console.log(rotti.length
  ? '  NON RIPETIBILE in ' + rotti.length + ' tappe su ' + esiti.length + ': ogni confronto prima/dopo e inaffidabile.'
  : '  ripetibile in tutte e ' + esiti.length + ' le tappe.')
process.exit(rotti.length ? 1 : 0)
