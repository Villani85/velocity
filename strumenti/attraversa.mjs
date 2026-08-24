/** LA SEQUENZA DELL'ATTRAVERSAMENTO, fotogramma per fotogramma.
 *  Dieci passi dentro il beat 'taglio', con la misura della continuita' fra
 *  l'uno e l'altro: e' l'unico modo di verificare che lo scambio di scala
 *  non si veda. Se si vedesse, sarebbe un picco fra due passi adiacenti. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
const U='C:/Users/Giuseppe/Webingegno/velocity/docs/provini'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:900,height:560}, deviceScaleFactor:1 })
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
p.on('console', m=>{ const t=m.text(); if(/corridoio|ottiche/i.test(t)) console.log('  >',t.slice(0,180)) })
await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, {timeout:120000})
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, {timeout:180000}).catch(()=>{})
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
// il beat 'taglio' sta fra 0,62 e 0,75 del globale
const N = 22, DA = 0.615, A = 0.755
const img=[]
let prec=null
console.log('passo   q      beat@locale   delta rispetto al passo prima')
for (let i=0;i<=N;i++){
  const q = DA + (A-DA)*(i/N)
  await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,q])
  for(let k=0;k<8;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  const png = await p.screenshot({ type:'png', timeout:120000 })
  const st = await p.evaluate(()=>({b:esperienza.regia.beat,l:+esperienza.regia.locale.toFixed(3)}))
  const {data} = await sharp(png).resize(96,60,{fit:'fill'}).grayscale().raw().toBuffer({resolveWithObject:true})
  let d=0
  if(prec){ for(let j=0;j<data.length;j++) d+=Math.abs(data[j]-prec[j]); d/=data.length }
  prec=data
  console.log(`${String(i).padStart(3)}  ${q.toFixed(4)}  ${st.b}@${String(st.l).padEnd(6)}  ${d.toFixed(2)}`)
  if(i%3===0) img.push(await sharp(png).resize(300).jpeg({quality:84}).toBuffer())
}
const W=300,H=Math.round(560/900*300), col=4
await sharp({create:{width:col*W,height:Math.ceil(img.length/col)*H,channels:3,background:'#000'}})
  .composite(img.map((b,i)=>({input:b,left:(i%col)*W,top:Math.floor(i/col)*H})))
  .jpeg({quality:88}).toFile(`${U}/attraversamento.jpeg`)
await b.close()
