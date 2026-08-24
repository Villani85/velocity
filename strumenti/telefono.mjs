import { chromium, devices } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const U='C:/Users/Giuseppe/Webingegno/velocity/docs/provini'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => window.esperienza?.autoPronta, null, { timeout:150000 })
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
let da = 0
for (const [nome,q] of [['m1_hero',0.06],['m2_orbita',0.28],['m3_taglio',0.70],['m4_accensione',0.84],['m5_velocita',0.95]]) {
  for (let i=1;i<=45;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,da+(q-da)*(i/45)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
  for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  da = q
  await p.screenshot({ path:`${U}/${nome}.jpeg`, type:'jpeg', quality:88 })
  console.log(nome)
}
await b.close()
