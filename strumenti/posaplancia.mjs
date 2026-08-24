/** Scandaglio della posa della plancia: si prova, non si deduce. */
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
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => window.esperienza?.planciaPronta, null, { timeout:120000 })
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=50;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,0.81*(i/50)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
for (const [x,y,larg] of [[0.62,0.78,1.62],[0.82,0.72,1.62],[0.82,0.66,1.85],[1.02,0.70,1.85]]) {
  await p.evaluate(([x,y,l]) => {
    const o = esperienza.planciaVera
    o.position.set(x,y,0)
    const k = l / esperienza.larghezzaPlancia
    o.scale.setScalar(k)
  }, [x,y,larg])
  for (let k=0;k<6;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  await p.screenshot({ path:`${U}/posa_${x}_${y}_${larg}.jpeg`, type:'jpeg', quality:85 })
  console.log('resa', x, y, larg)
}
await b.close()
