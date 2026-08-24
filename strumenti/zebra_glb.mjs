/** COLLAUDO A SPECCHIO di un glb: fotografa `collaudo.html` con il modello dato.
 *  NB: NON si stuba `@vite/client` qui (a differenza degli altri strumenti): la
 *  pagina di collaudo ha bisogno del client per completare il pre-bundling delle
 *  dipendenze, e la sua ricarica e' gestita dal retry dentro `src/collaudo.ts`.
 *  Si aspetta il flag `window.__pronto` con UNA attesa lunga, senza ricaricare. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const GLB = process.argv[2], NOME = process.argv[3], VISTA = process.argv[4] || 'tre-quarti'
const b = await chromium.launch({ args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport:{width:1200,height:750} })
p.setDefaultTimeout(120000)
// SI SERVE VUOTO IL CLIENT DI VITE, come tutti gli altri strumenti di questo
// repo: il «full-reload» dell'ottimizzatore viaggia SOLO su quel websocket.
// Senza client non arriva, e la richiesta del modello non viene interrotta.
await p.route('**/@vite/client', (r) => r.fulfill({ contentType:'text/javascript', body:'export {}' }))
p.on('framenavigated', (f) => { if (!f.parentFrame()) console.log('  !! navigazione a', f.url()) })
await p.goto(`http://localhost:5174/collaudo.html?glb=${GLB}&vista=${VISTA}`, { waitUntil:'domcontentloaded' })
try {
  await p.waitForFunction(() => window.__pronto === true, null, { timeout: 90000 })
} catch (e) {
  console.log('ERRORE', await p.evaluate(()=>window.__errore) || String(e).slice(0,120))
  await b.close(); process.exit(1)
}
for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
await p.screenshot({ path:`C:/Users/Giuseppe/Webingegno/velocity/docs/provini/${NOME}.jpeg`, type:'jpeg', quality:92 })
console.log('scritto', NOME, '| box', JSON.stringify(await p.evaluate(()=>window.__box)))
await b.close()
