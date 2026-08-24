import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1400,height:875}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => window.esperienza?.autoPronta && window.esperienza?.ambientePronto, null, { timeout:150000 })
await p.evaluate(() => { const e=document.getElementById('hud'); if(e) e.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
async function vai(q){ for (let i=1;i<=45;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,q*(i/45)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
  for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
async function luce(){ const png=await p.screenshot({type:'png'})
  const {data}=await sharp(png).resize(64,40,{fit:'fill'}).grayscale().raw().toBuffer({resolveWithObject:true})
  let s=0,alti=0; for(const v of data){s+=v; if(v>245)alti++}
  return [s/data.length, alti/data.length*100] }
await vai(0.06)
console.log('  forza soglia | hero  |  accensione (il quadro DEVE fiorire)')
for (const [f, so] of [[0.42,1.04],[0.26,1.10],[0.18,1.15],[0.12,1.20],[0.08,1.25]]) {
  await p.evaluate(([f,s]) => { esperienza.bloomForza(f); esperienza.bloomSoglia(s) }, [f,so])
  for (let k=0;k<6;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  const [lh] = await luce()
  await vai(0.845)
  await p.evaluate(([f,s]) => { esperienza.bloomForza(f); esperienza.bloomSoglia(s) }, [f,so])
  for (let k=0;k<8;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  const [la, ba] = await luce()
  await vai(0.06)
  console.log(`  ${String(f).padStart(5)} ${String(so).padStart(5)}  | ${lh.toFixed(0).padStart(4)}  |  ${la.toFixed(0).padStart(4)}   bruciati ${ba.toFixed(1)}%`)
}
await b.close()
