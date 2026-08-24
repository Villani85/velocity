import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const Q = Number(process.argv[2] ?? 0.06)
const NOME = process.argv[3] ?? 'zebra'
const b = await chromium.launch({ args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1200,height:750} })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', r => r.fulfill({ body:'export {}', contentType:'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza && window.esperienza.autoPronta && !!window.__THREE, null, { timeout:180000 })
await p.evaluate(()=>window.fissaQualita('alto'))
await p.evaluate(()=>{const h=document.getElementById('hud');if(h)h.style.display='none'})
// scorri alla posizione richiesta
const corsa = await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight)
for(let i=1;i<=40;i++){await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,Q*(i/40)]);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))}
// ZEBRA: env a bande + vernice a specchio con normali del MODELLO isolate (no normal map)
await p.evaluate(() => {
  const T = window.__THREE, e = window.esperienza
  const W=1024,H=512, d=new Uint8Array(W*H*4)
  for(let y=0;y<H;y++){ const on = Math.floor(y/H*22)%2; const v = on?245:10
    for(let x=0;x<W;x++){ const i=(y*W+x)*4; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255 } }
  const tex = new T.DataTexture(d,W,H,T.RGBAFormat); tex.mapping=T.EquirectangularReflectionMapping
  tex.colorSpace=T.SRGBColorSpace; tex.needsUpdate=true
  e.scena.environment = tex
  window.__restoreMats = []
  e.scena.traverse(o=>{ if(o.isMesh && o.name && o.name.startsWith('AUTO')){
    const m = Array.isArray(o.material)?o.material[0]:o.material
    window.__restoreMats.push([m,{cc:m.clearcoat,ccr:m.clearcoatRoughness,r:m.roughness,me:m.metalness,emi:m.envMapIntensity}])
    m.clearcoat=1.0; m.clearcoatRoughness=0.02; m.roughness=0.06; m.metalness=0.0; m.envMapIntensity=1.6
    if(m.normalScale) m.normalScale.set(0,0)
    if(m.clearcoatNormalScale) m.clearcoatNormalScale.set(0,0)
    m.needsUpdate=true
  }})
})
for(let i=0;i<70;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
await p.screenshot({path:`C:/Users/Giuseppe/Webingegno/velocity/docs/provini/${NOME}.jpeg`,type:'jpeg',quality:92})
console.log('scritto', NOME, 'a q=', Q)
await b.close()
