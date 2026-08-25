import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { Vector3, Matrix4 } from 'three'

const U = 'C:/Users/Giuseppe/Webingegno/velocity/.tmp/probe2'
mkdirSync(U, { recursive: true })
const GIRI = (process.argv[2] || '0,45,90,225').split(',').map(Number)
const W = 900, H = 600
const R = 0.55, CY = 0.95

const b = await chromium.launch({ args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 120000 }).catch(()=>console.log('(asset non pronti)'))
await p.evaluate(() => window.fissaQualita('alto'))
const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
for (let i = 1; i <= 30; i++) {
  await p.evaluate(([c,v]) => window.scrollTo(0, c*v), [corsa, 0.06*(i/30)])
  await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
}

const setup = await p.evaluate(([R, CY]) => {
  const T = window.__THREE, e = window.esperienza
  const spenti = []
  e.scena.traverse((o) => {
    if (o.isLight) { spenti.push(o.name || o.type); o.intensity = 0 }
    if (o.material && o.material.emissive) { o.material.emissive.setRGB(0,0,0) }
  })
  // via tutto il resto della scena: resta solo la sfera specchio + l'ambiente
  for (const c of [...e.scena.children]) if (c.isLight !== true) c.visible = false
  e.scena.background = null
  e.scena.environmentIntensity = 1
  const g = new T.SphereGeometry(R, 128, 96)
  const m = new T.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.01, envMapIntensity: 1 })
  const s = new T.Mesh(g, m); s.name = 'PROBE'; s.position.set(0, CY, 0)
  e.scena.add(s)
  e.renderer.toneMapping = T.LinearToneMapping
  e.renderer.toneMappingExposure = 0.012
  return { luciSpente: spenti.length, toneMapping: e.renderer.toneMapping, exp: e.renderer.toneMappingExposure }
}, [R, CY])
console.log('setup', JSON.stringify(setup))

const scatti = []
for (const g of GIRI) {
  await p.evaluate((v) => window.giraPanorama(v), g)
  for (let i = 0; i < 40; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
  const f = `${U}/${String(g).padStart(3,'0')}.png`
  await p.screenshot({ path: f })
  scatti.push({ g, f }); console.log('reso', g)
}
const cam = await p.evaluate(() => {
  const c = window.esperienza.camera; c.updateMatrixWorld(true)
  return { pos: c.position.toArray(), mw: c.matrixWorld.elements.slice(), proj: c.projectionMatrix.elements.slice() }
})
console.log('camera', cam.pos.map(v=>v.toFixed(3)).join(', '), 'azim', (Math.atan2(cam.pos[0],cam.pos[2])*180/Math.PI).toFixed(1))
await b.close()

const mw = new Matrix4().fromArray(cam.mw)
const invProj = new Matrix4().fromArray(cam.proj).invert()
const P = new Vector3().fromArray(cam.pos)
const C = new Vector3(0, CY, 0)
for (const { g, f } of scatti) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  const pts = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = new Vector3(((x+0.5)/W)*2-1, -(((y+0.5)/H)*2-1), 0.5).applyMatrix4(invProj)
    const dir = v.normalize().transformDirection(mw)
    const oc = P.clone().sub(C)
    const bq = 2*oc.dot(dir), cq = oc.lengthSq()-R*R
    const disc = bq*bq-4*cq
    if (disc <= 0) continue
    const t = (-bq-Math.sqrt(disc))/2
    if (t <= 0) continue
    const n = P.clone().add(dir.clone().multiplyScalar(t)).sub(C).normalize()
    const refl = dir.clone().sub(n.clone().multiplyScalar(2*dir.dot(n))).normalize()
    const i = (y*W+x)*ch
    pts.push({ lum: 0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2], refl })
  }
  pts.sort((a,b)=>b.lum-a.lum)
  const clip = pts.filter(q=>q.lum>=254).length
  const top = pts.slice(0, Math.max(1, Math.round(pts.length*0.01)))
  const acc = new Vector3(); let w = 0
  for (const q of top) { acc.add(q.refl.clone().multiplyScalar(q.lum)); w += q.lum }
  acc.divideScalar(w||1).normalize()
  const a0 = pts[0].refl
  console.log(`giro ${String(g).padStart(3)}  clip=${clip}  max lum=${pts[0].lum.toFixed(0)}  argmax az=${((Math.atan2(a0.x,a0.z)*180/Math.PI)+360)%360|0} el=${(Math.asin(a0.y)*180/Math.PI).toFixed(1)}  |  top1% az=${(((Math.atan2(acc.x,acc.z)*180/Math.PI)+360)%360).toFixed(1)} el=${(Math.asin(acc.y)*180/Math.PI).toFixed(1)}`)
}
