/** LE TAPPE — i fotogrammi di riferimento, congelati sul banco di prova.
 *
 *  Serve a una cosa sola: poter mettere due versioni del sito una accanto
 *  all'altra e sapere che la differenza viene dal codice e non dal rumore.
 *  Rende sempre con `?qa=1`, quindi con la qualita' ferma, senza vibrazioni
 *  casuali, con l'orologio e il lampeggiante a fase fissa. Il cancello che
 *  garantisce che funzioni e' `strumenti/ripetibile.mjs`.
 *
 *  LE COORDINATE SONO FRAZIONI DI SCORRIMENTO, NON SECONDI. Una revisione
 *  esterna elencava i suoi riferimenti a 12 s, 14 s, 17 s: quei tempi dipendono
 *  dalla registrazione — su un filmato di durata diversa non ci cadono, e sul
 *  mio da 29 secondi infatti non ci cadevano. Lo scorrimento e' cio' che governa
 *  la regia, ed e' l'unica coordinata che non si sposta.
 *
 *  node strumenti/tappe.mjs <cartella> [gruppo] [ridotto|bloom0]
 *
 *    gruppo    tutto (default) · ottica · guida
 *    ridotto   forza la preferenza del movimento accesa
 *    bloom0    spegne il bagliore
 *
 *  Esempio del confronto per cui e' nato:
 *    node strumenti/tappe.mjs prima ottica     # con l'iride
 *    ... si cambia una riga ...
 *    node strumenti/tappe.mjs dopo ottica      # senza
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { mkdirSync } from 'node:fs'

const CARTELLA = process.argv[2]
if (!CARTELLA || CARTELLA.startsWith('-')) {
  console.log('  serve un nome di cartella: node strumenti/tappe.mjs <nome> [gruppo]')
  process.exit(1)
}
const GRUPPO = process.argv[3] ?? 'tutto'
const EXTRA = process.argv.slice(4)

const TUTTO = [
  ['hero', 0.06], ['orbita', 0.22], ['lato', 0.44],
  ['avvicinamento', 0.56], ['ingresso', 0.61], ['scambio', 0.63],
  ['abitacolo', 0.685], ['guida', 0.77], ['pattuglia', 0.90],
]
/* IL PASSAGGIO OTTICO SI CAMPIONA FITTO, e non e' un capriccio: dura nove
   centesimi di scorrimento su uno, cioe' due secondi e mezzo su ventisei. Con
   il passo delle altre tappe ci cadrebbero dentro due fotogrammi, e la cosa da
   giudicare — se lo scambio di mondo si vede — sta in mezzo a quei due. */
const OTTICA = [
  ['o_56', 0.560], ['o_575', 0.575], ['o_59', 0.590], ['o_60', 0.600],
  ['o_61', 0.610], ['o_62', 0.620], ['o_625', 0.625], ['o_63', 0.630],
  ['o_635', 0.635],
  /* QUI DENTRO CADE LO SCAMBIO DI MONDO, ed e' il punto per cui esiste tutto
     questo elenco. `Esperienza.ts` scambia quando `progressoIride(locale)`
     supera 0,86, cioe' a `locale` 0,951 — che su questo beat vuol dire fra
     0,635 e 0,645 di scorrimento. Senza campioni li' dentro si guarda il
     fotogramma prima e quello dopo, e la domanda «lo scambio si vede?» resta
     senza risposta per costruzione. */
  ['o_637', 0.637], ['o_639', 0.639], ['o_641', 0.641],
  ['o_645', 0.645], ['o_66', 0.660], ['o_685', 0.685],
]
const GUIDA = [
  ['g_70', 0.70], ['g_74', 0.74], ['g_77', 0.77], ['g_80', 0.80],
  ['g_85', 0.85], ['g_90', 0.90], ['g_95', 0.95],
]
const TAPPE = GRUPPO === 'ottica' ? OTTICA : GRUPPO === 'guida' ? GUIDA : TUTTO

let url = 'http://localhost:5174/?qa=1'
if (EXTRA.includes('ridotto')) url += '&ridotto=1'
if (EXTRA.includes('bloom0')) url += '&bloom=0'

const DOVE = 'C:/Users/Giuseppe/Webingegno/velocity/docs/qa/' + CARTELLA
mkdirSync(DOVE, { recursive: true })

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(180000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto(url, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
/* LE RUOTE VERE, se no si congela uno stato transitorio. E' l'inganno piu'
   lungo di questo progetto: al loro posto ci sono quattro dischi che emettono
   luce propria, e un riferimento preso li' e' sbagliato per sempre. */
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 120000 })
  .catch(() => console.log('  !! ruote di segnale: queste tappe NON valgono come riferimento'))

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
console.log('')
console.log('  ' + url)
console.log('  -> docs/qa/' + CARTELLA + '   (' + TAPPE.length + ' tappe, gruppo ' + GRUPPO + ')')
console.log('')

for (const [nome, q] of TAPPE) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q])
  const dt = await p.evaluate(async () => {
    const v = []
    let prima = performance.now()
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => requestAnimationFrame(r))
      const ora = performance.now(); v.push(ora - prima); prima = ora
    }
    return v.sort((a, b) => a - b)[v.length >> 1]
  })
  const stato = await p.evaluate(() => ({
    b: window.esperienza.regia.beat,
    l: +window.esperienza.regia.locale.toFixed(3),
  }))
  await p.screenshot({ path: DOVE + '/' + nome + '.png', type: 'png' })
  console.log('  ' + nome.padEnd(15) + String(q).padStart(6) + '   ' + stato.b.padEnd(12) +
    'locale ' + String(stato.l).padStart(5) + '   carico ' + dt.toFixed(1) + ' ms')
}
await b.close()
console.log('')
console.log('  confronto: node strumenti/affianca.mjs <cartellaA> <cartellaB>')
