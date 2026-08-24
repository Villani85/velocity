/** UN SOLO FOTOGRAMMA, per iterare in fretta sulla luce.
 *  `provini.mjs` fa tutta la corsa e ci mette minuti; quando si sta tarando
 *  un pannello serve vedere la hero in venti secondi, non la storia intera. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const q = Number(process.argv[2] ?? 0.06)
const nome = process.argv[3] ?? 'uno'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1200,height:750}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
// SI STACCA L'AGGIORNAMENTO A CALDO PER TUTTA LA DURATA DELLA MISURA.
//
// Vite ricarica la pagina a ogni salvataggio in `src/`. Se qualcuno sta
// scrivendo codice mentre lo strumento misura — altri agenti al lavoro sullo
// stesso repo, per dire — la pagina riparte a meta' corsa e la misura muore
// con «Execution context was destroyed». Quattro corse perse cosi'.
//
// Servire vuoto il client di Vite toglie il canale: la pagina resta quella
// caricata all'inizio, che e' anche l'unica cosa sensata da misurare — una
// misura ha senso su UNO stato, non su uno che cambia sotto.
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout:120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout:180000 }).catch(()=>console.log('  (asset non tutti pronti)'))
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=40;i++){
  await p.evaluate(([c,v]) => window.scrollTo(0,c*v), [corsa, q*(i/40)])
  await p.evaluate(() => new Promise(r=>requestAnimationFrame(r)))
}
for (let i=0;i<60;i++) await p.evaluate(() => new Promise(r=>requestAnimationFrame(r)))
await p.screenshot({ path:`C:/Users/Giuseppe/Webingegno/velocity/docs/provini/${nome}.jpeg`, type:'jpeg', quality:88 })
console.log(nome, await p.evaluate(() => ({b:esperienza.regia.beat, l:+esperienza.regia.locale.toFixed(2)})))
await b.close()
