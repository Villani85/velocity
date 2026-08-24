/** Fotogrammi al secondo VERI, misurati scorrendo, non da fermo.
 *  Da fermo una scena 3D e' sempre veloce: il costo si vede quando la camera
 *  si muove, l'ombra si ricalcola e il riflesso rifa' la sua passata. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1','--enable-gpu'] })
for (const [nome, w, h] of [['desktop 1600',1600,1000],['telefono 390',390,844]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:1 })
  await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza, null, {timeout:120000})
  await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, {timeout:180000}).catch(()=>{})
  const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  const r = await p.evaluate(async (corsa) => {
    const t=[]; let prec=performance.now()
    for (let i=0;i<=180;i++){
      window.scrollTo(0, corsa*(i/180))
      await new Promise(r=>requestAnimationFrame(r))
      const ora=performance.now(); t.push(ora-prec); prec=ora
    }
    t.sort((a,b)=>a-b)
    const info = window.esperienza.renderer.info
    return { mediana:t[90], p95:t[Math.floor(t.length*0.95)],
             chiamate:info.render.calls, triangoli:info.render.triangles }
  }, corsa)
  console.log(`${nome.padEnd(14)} mediana ${r.mediana.toFixed(1)} ms (${(1000/r.mediana).toFixed(0)} fps)   p95 ${r.p95.toFixed(1)} ms   draw call ${r.chiamate}   tri ${r.triangoli.toLocaleString('it')}`)
  await p.close()
}
await b.close()
