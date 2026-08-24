/**
 * IL TITOLO — verifica che nessuna riga vada a capo dove non deve.
 *
 * PERCHE' ESISTE.
 *
 * A 1400 px «SI ATTRAVERSANO.» si spezzava dopo «SI». E' la parola su cui si
 * regge l'intero concetto del sito, rotta a meta', sul primo fotogramma che
 * qualcuno vede — e non l'aveva notato nessuno per settimane, me compreso,
 * perche' i provini li guardavo a 1200 e a 390, dove la riga ci sta.
 *
 * E' il genere di difetto che un occhio trova solo per caso e che un metro
 * trova sempre: la larghezza del testo dipende da corpo, spaziatura, colonna e
 * carattere caricato, cioe' da quattro cose che cambiano a formati diversi.
 *
 * COSA MISURA.
 *
 * Per ogni formato e per ogni tempo del sito, quante righe occupa davvero ogni
 * riga dichiarata del titolo. Nel testo le righe sono separate da un a-capo
 * esplicito (vedi `ui/Lingua.ts`): se una di quelle occupa piu' di
 * un'interlinea, e' andata a capo da sola ed e' un difetto.
 *
 * Aspetta i font: con i caratteri di sistema al posto di Inter le larghezze
 * sono un'altra cosa, e si misurerebbe una pagina che nessuno vede.
 *
 *     node strumenti/titolo.mjs
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const BASE = process.env.BASE_URL || 'http://localhost:5174/'

/** i formati che contano: dal desktop grande al portatile piccolo, e il telefono */
const FORMATI = [
  [1920, 1080], [1600, 1000], [1440, 900],
  [1400, 875], [1280, 800], [1024, 768],
  [390, 844],
]

/** dove si ferma per guardare: il centro di ognuno dei sette tempi */
const TEMPI = [0.06, 0.23, 0.43, 0.58, 0.68, 0.77, 0.90]

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})

let rotti = 0
for (const [w, h] of FORMATI) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  p.setDefaultTimeout(200000)
  await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza)
  await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto)
  // I FONT, SEMPRE: senza, si misura una pagina con i caratteri di sistema
  await p.evaluate(() => document.fonts.ready)
  const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)

  const guasti = []
  for (const q of TEMPI) {
    await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q])
    for (let i = 0; i < 14; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
    const r = await p.evaluate(() => {
      const t = document.querySelector('.voci__titolo')
      if (!t) return null
      const cs = getComputedStyle(t)
      const interlinea = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
      // ogni riga dichiarata sta nella sua mascherina: se e' piu' alta di
      // un'interlinea (con un margine del 25% per le code delle lettere), e'
      // andata a capo da sola
      return [...t.querySelectorAll('.mascherina')].map((m) => {
        const alta = m.getBoundingClientRect().height
        return {
          testo: (m.textContent || '').trim().slice(0, 24),
          righe: alta / interlinea,
          largo: Math.round(m.scrollWidth),
          colonna: Math.round(t.getBoundingClientRect().width),
        }
      })
    })
    if (!r) continue
    for (const riga of r) {
      if (riga.righe > 1.25) guasti.push(q.toFixed(2) + '  «' + riga.testo + '»  ' +
        riga.largo + 'px in una colonna da ' + riga.colonna)
    }
  }
  await p.close()

  if (guasti.length) {
    rotti += guasti.length
    console.log(w + 'x' + h + '  ' + guasti.length + ' righe spezzate')
    for (const g of guasti) console.log('    ' + g)
  } else {
    console.log(w + 'x' + h + '  ok')
  }
}
await b.close()

if (rotti) {
  console.log('\n' + rotti + ' righe vanno a capo dove non devono')
  process.exit(1)
}
console.log('\nnessuna riga spezzata a nessun formato')
