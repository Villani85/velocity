/** SWEEP DELL'IMPIANTO LUCE.
 *  Sei configurazioni in un solo caricamento, ognuna misurata. Tarare a
 *  occhio, in questo progetto, e' costato tre giri sbagliati: il bloom, il
 *  montante e il soffitto della corte. Ogni manopola qui passa da una
 *  misura. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const PROVE = [
  // pannelli, gole (puntiformi), esposizione, punto di nero del grading
  { n:'A_ora',    pan:1.0, gole:1.0, esp:0.85, nero:0.028 },
  { n:'B_x3',     pan:3.0, gole:2.0, esp:1.00, nero:0.010 },
  { n:'C_x5',     pan:5.0, gole:3.0, esp:1.05, nero:0.006 },
  { n:'D_x8',     pan:8.0, gole:4.0, esp:1.10, nero:0.004 },
  { n:'E_gole',   pan:3.0, gole:6.0, esp:1.05, nero:0.006 },
  { n:'F_cielo',  pan:4.0, gole:3.0, esp:1.05, nero:0.006, amb:2.4 },
]

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
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout:180000 }).catch(()=>{})
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=40;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,0.06*(i/40)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }

// si registrano le intensita' di partenza una volta sola
await p.evaluate(() => {
  const e = window.esperienza
  e.__base = []
  e.scena.traverse(o => {
    if (o.isRectAreaLight || o.isPointLight) e.__base.push([o, o.intensity])
  })
  e.__grado = null
  const c = e.composer ?? e['composer']
})

function misura(data, W, H, x0,x1,y0,y1){
  const v=[]; let brucia=0, nero=0
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
    const i=(y*W+x)*3
    const l=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2]
    v.push(l); if(l>250) brucia++; if(l<4) nero++
  }
  v.sort((a,b)=>a-b)
  const q=t=>v[Math.floor(v.length*t)]|0
  return { media:v.reduce((a,b)=>a+b,0)/v.length, p50:q(.5), p95:q(.95), brucia:brucia/v.length*100, nero:nero/v.length*100 }
}

console.log('prova       soggetto: media  p50  p95  bruciato  nero  | fotogramma media')
for (const t of PROVE) {
  await p.evaluate((t) => {
    const e = window.esperienza
    for (const [o, base] of e.__base) o.intensity = base * (o.isRectAreaLight ? t.pan : t.gole)
    e.renderer.toneMappingExposure = t.esp
    if (t.amb !== undefined) e.scena.environmentIntensity = t.amb
    e.grado_nero?.(t.nero)
  }, t)
  for (let k=0;k<12;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  const png = await p.screenshot({ type:'png', timeout:120000 })
  await sharp(png).jpeg({quality:86}).toFile(`C:/Users/Giuseppe/Webingegno/velocity/docs/provini/luce_${t.n}.jpeg`)
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W=info.width,H=info.height
  const s = misura(data,W,H,Math.round(W*0.26),Math.round(W*0.74),Math.round(H*0.36),Math.round(H*0.64))
  const f = misura(data,W,H,0,W,0,H)
  console.log(`${t.n.padEnd(10)}  ${s.media.toFixed(1).padStart(6)} ${String(s.p50).padStart(4)} ${String(s.p95).padStart(4)}   ${s.brucia.toFixed(2).padStart(5)}%  ${s.nero.toFixed(1).padStart(5)}%  |  ${f.media.toFixed(1)}`)
}
await b.close()
