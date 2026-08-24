/** CHI ACCENDE QUESTA MACCHIA?
 *  Si spegne una sorgente per volta e si misura la luminanza massima nel
 *  riquadro indicato. Chi la fa crollare e' il colpevole. Tre ipotesi
 *  sbagliate di fila su questo progetto — il montante, il bloom, il
 *  soffitto — sono nate tutte dal dedurlo invece di provarlo. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
const [x0,y0,x1,y1] = (process.argv[2] ?? '500,270,720,340').split(',').map(Number)
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
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, {timeout:180000}).catch(()=>{})
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=40;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,0.06*(i/40)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
// SI PROVANO I GRUPPI, NON LE SINGOLE LUCI.
// Alla prima stesura spegnevo una per una tutte e diciotto le sorgenti, con
// uno screenshot ciascuna: otto minuti e nessuna risposta. Le dodici
// puntiformi della corte sono la STESSA sorgente ripetuta — provarle
// separatamente non aggiunge informazione e moltiplica il costo.
const luci = await p.evaluate(() => {
  const e = window.esperienza; e.__G=[]
  const per = new Map()
  e.scena.traverse(o=>{
    if(!o.isLight) return
    const k = o.isPointLight ? 'GOLE_CORTE' : (o.name || o.type)
    if(!per.has(k)) per.set(k, [])
    per.get(k).push(o)
  })
  e.__G = [...per.entries()]
  return e.__G.map(([k,v],i)=>`${i}:${k}${v.length>1?' x'+v.length:''}`)
})
async function picco(){
  for(let k=0;k<10;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  const png = await p.screenshot({ type:'png', timeout:120000 })
  const {data,info} = await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true})
  let max=0, som=0, n=0
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
    const i=(y*info.width+x)*3
    const l=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2]
    max=Math.max(max,l); som+=l; n++
  }
  return {max:max|0, media:+(som/n).toFixed(1)}
}
const base = await picco()
console.log('con tutto acceso:', JSON.stringify(base))
for (let i=0;i<luci.length;i++){
  await p.evaluate((i)=>{for(const o of window.esperienza.__G[i][1]){o.__i=o.intensity; o.intensity=0}}, i)
  const r = await picco()
  await p.evaluate((i)=>{for(const o of window.esperienza.__G[i][1]) o.intensity=o.__i}, i)
  const calo = base.media - r.media
  if (calo > 0.8) console.log(`  spenta ${luci[i].padEnd(26)} media ${r.media} (-${calo.toFixed(1)})  max ${r.max}`)
}
await p.evaluate(()=>{ window.esperienza.scena.environmentIntensity = 0 })
console.log('  senza ambiente/cielo:', JSON.stringify(await picco()))
await b.close()
