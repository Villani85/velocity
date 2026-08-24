/** Un fotogramma per beat. Si arriva SCORRENDO, mai saltando: lo
 *  smorzamento fa parte della scena e atterrare di colpo mostra uno stato
 *  che nessuno vedra' mai. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { mkdirSync } from 'node:fs'
const U = 'C:/Users/Giuseppe/Webingegno/velocity/docs/provini'
mkdirSync(U, { recursive: true })
// sette, da quando c'e' il finale: la sesta a 0,95 sarebbe caduta dentro
// `contatto` e la guida non avrebbe piu' avuto un suo provino
// i punti sono riscalati insieme ai confini: allungando il settimo beat (vedi
// `core/Regia.ts`) i vecchi cadevano tutti un beat piu' avanti — «3_lato»
// atterrava dentro `taglio` e «6_velocita» dentro `contatto`
const TAPPE = [['1_hero',0.05],['2_orbita',0.24],['3_lato',0.46],['4_taglio',0.60],['5_accensione',0.685],['6_velocita',0.77],['7_contatto',0.93]]
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
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout:120000 }).catch(()=>console.log('  (asset non tutti pronti)'))
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
await p.waitForTimeout(700)
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
let da = 0
for (const [nome, q] of TAPPE) {
  const passi = 45
  for (let i=1;i<=passi;i++){
    await p.evaluate(([c,v]) => window.scrollTo(0,c*v), [corsa, da + (q-da)*(i/passi)])
    await p.evaluate(() => new Promise(r=>requestAnimationFrame(r)))
  }
  for (let i=0;i<45;i++) await p.evaluate(() => new Promise(r=>requestAnimationFrame(r)))
  await p.screenshot({ path:`${U}/${nome}.jpeg`, type:'jpeg', quality:88 })
  const s = await p.evaluate(() => ({b:esperienza.regia.beat, l:+esperienza.regia.locale.toFixed(2)}))
  console.log(nome.padEnd(14), s.b, s.l)
  da = q
}
await b.close()
