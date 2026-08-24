import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const U='C:/Users/Giuseppe/Webingegno/velocity/docs/misure'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1100,height:690}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout:30000 })
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.waitForFunction(() => window.esperienza.planciaPronta, null, { timeout:120000 }).catch(()=>console.log('plancia non pronta'))
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
// quattro rotazioni, per capire da che parte guarda
for (const g of [0, 90, 180, 270]) {
  await p.evaluate((g) => {
    const o = esperienza.planciaVera
    if (o) o.children[0].children[0].rotation.y = g * Math.PI / 180
  }, g)
  for (let i=1;i<=50;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,0.81*(i/50)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
  for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  await p.screenshot({ path:`${U}/plancia_${g}.jpeg`, type:'jpeg', quality:86 })
  console.log('resa rotazione', g)
}
await b.close()
