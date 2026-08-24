import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
const U='C:/Users/Giuseppe/Webingegno/velocity/docs/misure'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
for (const [nome, w, h, dpr] of [['telefono',390,844,2],['telefono_dpr1',390,844,1],['desktop',1400,875,1]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:dpr })
  await p.goto('http://localhost:5174/', { waitUntil:'load' })
  await p.waitForFunction(() => window.esperienza?.autoPronta && window.esperienza?.ambientePronto, null, { timeout:150000 })
  await p.evaluate(() => { const e=document.getElementById('hud'); if(e) e.style.display='none' })
  const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (let i=1;i<=45;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,0.06*(i/45)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
  for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
  for (const [etichetta, azione] of [
    ['normale', () => {}],
    ['senzabloom', () => { window.esperienza.bloomForza(0) }],
    ['senzavelo', () => { document.querySelector('.velo').style.display='none' }],
  ]) {
    await p.evaluate(azione)
    for (let k=0;k<6;k++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
    const png = await p.screenshot({ type:'png' })
    const { data } = await sharp(png).resize(64,40,{fit:'fill'}).grayscale().raw().toBuffer({resolveWithObject:true})
    let s=0; for (const v of data) s+=v
    console.log(`${nome.padEnd(14)} dpr${dpr}  ${etichetta.padEnd(11)} luce media ${(s/data.length).toFixed(0)}`)
    await p.screenshot({ path:`${U}/diag_${nome}_${etichetta}.jpeg`, type:'jpeg', quality:82 })
  }
  await p.close()
}
await b.close()
