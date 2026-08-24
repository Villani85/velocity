/** Dove sta il quadro DIPINTO sulla plancia: si trova spostandola e
 *  guardando, non deducendolo dalla texture. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const U='C:/Users/Giuseppe/Webingegno/velocity/docs/misure'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:900,height:560}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => window.esperienza?.planciaPronta, null, { timeout:120000 })
await p.evaluate(() => {
  const h=document.getElementById('hud'); if(h) h.style.display='none'
  document.querySelector('.voci').style.display='none'
  document.querySelector('.testa').style.display='none'
  // si accende tutto per vedere dove sta il quadro dipinto
  esperienza.accensione.gruppo.visible = false
})
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=60;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,0.83*(i/60)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
for (const z of [-0.5,-0.25,0,0.25,0.5]) {
  await p.evaluate((z) => { esperienza.planciaVera.position.z = z }, z)
  for (let k=0;k<8;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  await p.screenshot({ path:`${U}/quadro_z${z}.jpeg`, type:'jpeg', quality:84 })
  console.log('z =', z)
}
await b.close()
