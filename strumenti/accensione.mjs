import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const U='C:/Users/Giuseppe/Webingegno/velocity/docs/misure'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1000,height:620}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
p.on('pageerror', e => console.log('ERRORE', String(e).slice(0,140)))
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => window.esperienza?.planciaPronta, null, { timeout:120000 })
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=60;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,0.76*(i/60)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
for (const q of [0.78, 0.80, 0.82, 0.845, 0.87, 0.90]) {
  await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,q])
  for (let k=0;k<14;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  await p.screenshot({ path:`${U}/acc_${q}.jpeg`, type:'jpeg', quality:86 })
  console.log('resa q =', q)
}
await b.close()
