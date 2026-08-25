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
/* UNA GUARDIA CHE AVVISA. Senza questa il provino di un'applicazione ROTTA
   esce lo stesso: un fotogramma nero con sopra l'interfaccia, e il misuratore
   ci calcola sopra delle statistiche perfettamente formate. E' successo — un
   errore a runtime nelle ruote ha spento tutta la scena, e il primo segnale
   e' stato una mediana 0,0 che sembrava una taratura andata male. Un guasto
   deve gridare, non restituire un numero. */
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
p.on('console', (m) => { if (m.type() === 'error') console.log('!! console.error:', m.text()) })
await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout:120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout:180000 }).catch(()=>console.log('  (asset non tutti pronti)'))
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
/* SI ASPETTANO ANCHE LE RUOTE VERE, e non e' un dettaglio: e' stato l'inganno
   piu' lungo della sessione. `autoPronta && ambientePronto` non copre
   `ruota.glb`, che arriva dopo — e fino ad allora al loro posto ci sono le
   RUOTE DI SEGNALE, che sono `MeshBasicMaterial` con `toneMapped: false`,
   cioe' emettono luce propria. Nei provini uscivano quattro dischi ciano
   luminosi, e per due volte ho creduto fossero i cerchi veri troppo
   specchianti: la prima volta ho abbassato ruvidita' e intensita' d'ambiente,
   la seconda le ho abbassate ancora. Non cambiava niente, perche' stavo
   correggendo un materiale che nel fotogramma non c'era.
   Un provino che ritrae uno stato TRANSITORIO non e' un provino: e' una
   fotografia scattata mentre la scena si vestiva. */
await p.waitForFunction(
  () => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4,
  null, { timeout: 120000 },
).catch(() => console.log('  (ATTENZIONE: le ruote vere non sono arrivate, nel provino ci sono i segnali)'))
await p.addInitScript((v) => { if (v !== undefined) globalThis.__ao = v }, process.argv[5] ? Number(process.argv[5]) : undefined)
await p.evaluate(() => window.fissaQualita('alto'))
/* SI PUO' CHIEDERE UNA FINITURA DIVERSA: `node uno.mjs <t> <nome> <indice>`.
   Serve perche' i difetti della carrozzeria NON SI VEDONO TUTTI SULLO STESSO
   COLORE: i segni cotti nella normal map su una vernice nera si intuiscono,
   su una bianca gridano. Collaudare solo sulla finitura di partenza vuol dire
   scoprire i difetti dal committente. */
const FIN = process.argv[4]
if (FIN !== undefined) {
  await p.evaluate((i) => {
    const c = document.querySelectorAll('.comandi__campione')
    if (c[i]) c[i].click()
  }, Number(FIN))
  for (let i = 0; i < 8; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
}
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
