/** IL CRUSCOTTO — quanta luce chiede, non quanto spazio occupa.
 *
 *  Il bersaglio della sottrazione non e' ridurre la superficie del pannello del
 *  trenta per cento: e' ridurre di un quarto o un terzo LA QUANTITA' DI
 *  INFORMAZIONE LUMINOSA CHE COMPETE PER L'OCCHIO. Sono due cose diverse, e la
 *  seconda e' quella che si vede.
 *
 *  PERCHE' SI LEGGE LA TELA E NON IL FOTOGRAMMA. Il quadro nella scena e' una
 *  texture su una mesh, quindi passa per l'esposizione, il bagliore e la
 *  gradazione: misurarlo li' vorrebbe dire misurare anche loro, e una modifica
 *  al tone mapping sposterebbe il numero senza che nessuno abbia toccato il
 *  cruscotto. La tela e' la sorgente: 1024 per 290, quello che il codice
 *  disegna e nient'altro.
 *
 *  DUE NUMERI, e servono tutti e due:
 *    AREA    quanti pixel stanno sopra una soglia di luminosita'
 *    ENERGIA la somma di quanto stanno sopra
 *  Cento pixel bianchi e mille pixel grigi possono avere la stessa energia e
 *  un'area diversissima. Il primo compete per l'occhio molto piu' del secondo,
 *  quindi guardare solo l'energia direbbe che sono uguali.
 *
 *  node strumenti/cruscotto.mjs <etichetta> [scorrimento]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
const sharp = createRequire(import.meta.url)('sharp')

const ETICHETTA = process.argv[2] ?? 'ora'
const Q = Number(process.argv[3] ?? 0.77)
const DOVE = 'C:/Users/Giuseppe/Webingegno/velocity/docs/qa/cruscotto'
mkdirSync(DOVE, { recursive: true })

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(180000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto('http://localhost:5174/?qa=1', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, Q])
for (let i = 0; i < 120; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

const dati = await p.evaluate(() => {
  const q = window.esperienza?.quadro
  const tela = q?.tela
  if (!tela || typeof tela.toDataURL !== 'function') return null
  return { png: tela.toDataURL('image/png'), l: tela.width, a: tela.height }
})
await b.close()

if (!dati) {
  console.log('  non riesco a leggere la tela del quadro (esperienza.quadro.tela)')
  process.exit(2)
}

const png = Buffer.from(dati.png.split(',')[1], 'base64')
writeFileSync(DOVE + '/' + ETICHETTA + '.png', png)
const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const N = info.width * info.height

/* LA SOGLIA E' 40 SU 255, e non e' scelta a caso: sotto ci sta il fondo del
   pannello — un gradiente scurissimo con cinque veli fra lo 0,7% e il 3% — che
   occupa il cento per cento della tela e non compete con niente. Contarlo
   vorrebbe dire che il numero e' dominato dalla cosa che non si vede. */
const SOGLIA = 40
let area = 0, energia = 0, picco = 0
for (let i = 0; i < N; i++) {
  const k = i * 4
  const alfa = data[k + 3] / 255
  const l = (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) * alfa
  if (l > SOGLIA) { area++; energia += l - SOGLIA }
  if (l > picco) picco = l
}

console.log('')
console.log('  ' + ETICHETTA + '   tela ' + info.width + 'x' + info.height + '   scorrimento ' + Q)
console.log('  area luminosa  ' + area + ' pixel  (' + (100 * area / N).toFixed(2) + '% della tela)')
console.log('  energia        ' + Math.round(energia))
console.log('  picco          ' + picco.toFixed(0) + ' su 255')

/* E SI CONFRONTA CON IL RIFERIMENTO, se c'e'. Un numero da solo non dice se la
   sottrazione ha funzionato: il bersaglio e' una FRAZIONE del vecchio, e senza
   il vecchio non c'e' frazione. */
const ARCHIVIO = DOVE + '/riferimento.json'
if (ETICHETTA === 'riferimento') {
  writeFileSync(ARCHIVIO, JSON.stringify({ area, energia, N }, null, 2))
  console.log('')
  console.log('  archiviato come riferimento.')
  process.exit(0)
}
if (!existsSync(ARCHIVIO)) {
  console.log('')
  console.log('  nessun riferimento: lancialo prima con  node strumenti/cruscotto.mjs riferimento')
  process.exit(0)
}
const r = JSON.parse(readFileSync(ARCHIVIO, 'utf8'))
const fa = area / r.area, fe = energia / r.energia
console.log('')
console.log('  contro il riferimento:')
console.log('    area     ' + (fa * 100).toFixed(1) + '%  (' + r.area + ' -> ' + area + ')')
console.log('    energia  ' + (fe * 100).toFixed(1) + '%  (' + Math.round(r.energia) + ' -> ' + Math.round(energia) + ')')
console.log('')
/* IL BERSAGLIO E' 65-75%, e il limite ALTO conta quanto quello basso: scendere
   sotto il 60% non e' «ancora meglio», e' aver tolto qualcosa che serviva. Un
   cruscotto che non si legge piu' non e' un cruscotto sobrio. */
const dentro = fa >= 0.60 && fa <= 0.78
console.log(dentro
  ? '  dentro il bersaglio (65-75% dell area, con un margine).'
  : fa > 0.78
    ? '  TROPPO POCO TOLTO: l area e ancora il ' + (fa * 100).toFixed(0) + '% del riferimento.'
    : '  TOLTO TROPPO: al ' + (fa * 100).toFixed(0) + '% non e piu sobrieta, e un cruscotto che non si legge.')
process.exit(dentro ? 0 : 1)
