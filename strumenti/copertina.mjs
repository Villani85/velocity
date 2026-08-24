/**
 * LA COPERTINA DI VELOCITY, RIFATTA DAL SITO CHE GIRA ADESSO.
 *
 * PERCHE' ESISTE, e la ragione e' un abbaglio che ha ingannato un revisore.
 *
 * `public/lavori/velocity.webp` e' una schermata di QUESTO sito, scattata il
 * 22 agosto. Il giorno dopo la tipografia e' cambiata — via Inter, dentro
 * Clash Display e Switzer — e quella schermata e' rimasta dov'era: dentro la
 * carta del carosello, in bella vista.
 *
 * Il risultato e' che una revisione esterna ha letto «SITI CHE NON SI
 * GUARDANO» in Helvetica DENTRO L'IMMAGINE e ha concluso che il sito usava
 * ancora un carattere di sistema. Non era vero — i caratteri erano caricati e
 * applicati, verificabile in tre righe di console — ma il fotogramma glielo
 * diceva, ed e' cio' che un giurato vede.
 *
 * LA LEZIONE, che vale oltre questo file: **un portfolio che mostra se stesso
 * porta in giro la propria data di scadenza.** Ogni volta che il sito cambia,
 * la sua copertina mente, e mente proprio nel posto dove si guarda meglio.
 * Per questo la copertina non si scatta a mano: si rigenera, e si rigenera
 * dopo ogni cambio che si vede.
 *
 *     node strumenti/copertina.mjs [progresso] [nome]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const DOVE = Number(process.argv[2] ?? 0.055)
const NOME = process.argv[3] ?? 'velocity'
/* IL FORMATO E' 16:10 PERCHE' LO SONO I PANNELLI, e la larghezza e' 1,5 volte
   la tela su cui verranno disegnati (960 in `scene/Vetrina3D.ts`): una
   copertina alla stessa risoluzione della tela sarebbe gia' al limite, e sui
   telefoni ad alta densita' il riquadro si guarda da vicino. */
const L = 1440, A = 900

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})
const p = await b.newPage({ viewport: { width: L, height: A }, deviceScaleFactor: 1 })
p.setDefaultTimeout(180000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto(process.env.BASE_URL || 'http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto)
// la qualita' si fissa: in headless il gestore scende da solo e la copertina
// finirebbe per mostrare una scena degradata di quella che si vede davvero
await p.evaluate(() => window.fissaQualita?.('alto'))
// e i CARATTERI devono essere arrivati, se no si rifa' lo stesso errore da capo
await p.evaluate(() => document.fonts.ready)
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
await p.evaluate((q) => {
  const c = document.documentElement.scrollHeight - innerHeight
  window.scrollTo(0, c * q)
}, DOVE)
await p.waitForTimeout(2600)
const dove = 'public/lavori/' + NOME + '.png'
await p.screenshot({ path: dove })
console.log('scattata', dove, L + 'x' + A, 'al progresso', DOVE)
await b.close()
