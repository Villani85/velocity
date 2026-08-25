/** IL SOMMARIO E I COMANDI NON SI TOCCANO — misurato, non guardato.
 *
 *  Due volte di fila ho creduto di aver risolto una sovrapposizione e l'ho
 *  spostata invece che tolta: prima la cornice dei comandi saliva dentro il
 *  pulsante, poi — tolto il pulsante — saliva dentro il sommario. Ogni volta
 *  me ne sono accorto guardando un provino, cioe' dopo.
 *
 *  Qui si leggono i rettangoli veri dei due elementi e si stampa quanti pixel
 *  di aria restano fra il fondo del testo e il bordo alto dei comandi. Un
 *  numero negativo e' una sovrapposizione, e lo strumento ESCE CON ERRORE:
 *  serve che si accorga da solo, altrimenti e' un altro provino da guardare.
 *
 *  E si misura su tre finestre, perche' entrambe le quote sono in `clamp` con
 *  una parte in `vh`: una sola misura direbbe che va bene alla mia altezza.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const MISURE = [
  { width: 1200, height: 750, nome: 'portatile' },
  { width: 1600, height: 1000, nome: 'schermo' },
  { width: 1280, height: 620, nome: 'finestra bassa' },
]

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
let peggio = 999
let guasto = false

for (const m of MISURE) {
  const p = await b.newPage({ viewport: { width: m.width, height: m.height } })
  await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
  // i comandi compaiono con `e-vivo`, e prima di allora il rettangolo non vale
  await p.waitForFunction(() => document.querySelector('.comandi.e-vivo'), null, { timeout: 60000 }).catch(() => {})
  await p.waitForTimeout(2500)

  const r = await p.evaluate(() => {
    const c = document.querySelector('.comandi')
    const t = document.querySelector('.voci__riga')
    const ti = document.querySelector('.voci__titolo')
    if (!c || !t) return null
    const rc = c.getBoundingClientRect()
    const rt = t.getBoundingClientRect()
    const ri = ti ? ti.getBoundingClientRect() : null
    return {
      comandiAlto: Math.round(rc.top), comandiSotto: Math.round(rc.bottom),
      testoFondo: Math.round(rt.bottom), testoAlto: Math.round(rt.top),
      titoloFondo: ri ? Math.round(ri.bottom) : null,
      // si sovrappongono davvero solo se si incrociano anche in orizzontale
      incrocioX: rc.left < rt.right && rt.left < rc.right,
    }
  })
  await p.close()

  if (!r) { console.log('  ' + m.nome + ': elementi non trovati'); guasto = true; continue }
  const aria = r.comandiAlto - r.testoFondo
  if (r.incrocioX && aria < peggio) peggio = aria
  console.log(
    '  ' + m.nome.padEnd(14) + String(m.width) + 'x' + m.height +
    '   sommario finisce a ' + String(r.testoFondo).padStart(4) +
    '   comandi partono da ' + String(r.comandiAlto).padStart(4) +
    '   aria ' + String(aria).padStart(5) + ' px' +
    (r.incrocioX ? '' : '   (non si incrociano di lato)'))
}

await b.close()
console.log('\naria minima dove si incrociano: ' + peggio + ' px')
if (guasto || peggio < 6) {
  console.log('BOCCIATO: il sommario e i comandi si toccano.')
  process.exit(1)
}
console.log('passa.')
