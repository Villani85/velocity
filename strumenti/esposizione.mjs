import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:800,height:500}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => !!window.esperienza?.ambientePronto, null, { timeout:60000 })
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=40;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,0.06*(i/40)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
console.log(' amb   fondo  espo |  luce media   bruciati%')
for (const [amb, fondo, espo] of [[1.0,0.55,1.05],[0.5,0.35,0.9],[0.35,0.30,0.85],[0.25,0.25,0.8],[0.18,0.22,0.75]]) {
  await p.evaluate(([a,f,e]) => {
    const s = window.esperienza.scena
    s.environmentIntensity = a; s.backgroundIntensity = f
    window.esperienza.renderer.toneMappingExposure = e
  }, [amb, fondo, espo])
  for (let k=0;k<6;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  const png = await p.screenshot({ type:'png' })
  const { data } = await sharp(png).resize(64,40,{fit:'fill'}).grayscale().raw().toBuffer({resolveWithObject:true})
  let s=0, alti=0
  for (const v of data){ s+=v; if(v>235) alti++ }
  console.log(`${String(amb).padStart(5)} ${String(fondo).padStart(6)} ${String(espo).padStart(5)} |${String((s/data.length).toFixed(0)).padStart(9)}   ${(alti/data.length*100).toFixed(1)}%`)
}
await b.close()
