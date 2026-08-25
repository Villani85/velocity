import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { Vector3, Matrix4 } from 'three'

const U = 'C:/Users/Giuseppe/Webingegno/velocity/.tmp/probe'
mkdirSync(U, { recursive: true })
const GIRI = (process.argv[2] || '225,45,0').split(',').map(Number)
const W = 900, H = 600
const R = 0.55, CY = 0.95   // raggio e quota della sfera specchio

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

// sfera specchio al posto dell'auto
const info = await p.evaluate(([R, CY]) => {
  const T = window.__THREE, e = window.esperienza
  for (const n of ['AUTO_VERA','SOTTOSCOCCA','OMBRA_A_TERRA']) {
    const o = e.scena.getObjectByName(n); if (o) o.visible = false
  }
  const auto = e.esterno
  const g = new T.SphereGeometry(R, 96, 64)
  const m = new T.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.015, envMapIntensity: 1 })
  const s = new T.Mesh(g, m); s.name = 'PROBE'; s.position.set(0, CY, 0)
  e.scena.add(s)
  return { probe: true }
}, [R, CY])
console.log('probe inserita', JSON.stringify(info))

const scatti = []
for (const g of GIRI) {
  await p.evaluate((v) => window.giraPanorama(v), g)
  for (let i = 0; i < 40; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
  const f = `${U}/${String(g).padStart(3,'0')}.png`
  await p.screenshot({ path: f })
  scatti.push({ g, f })
  console.log('reso', g)
}
const cam = await p.evaluate(() => {
  const c = window.esperienza.camera
  c.updateMatrixWorld(true)
  return { pos: c.position.toArray(), mw: c.matrixWorld.elements.slice(), proj: c.projectionMatrix.elements.slice(), fov: c.fov, aspect: c.aspect }
})
console.log('camera pos', cam.pos.map(v=>v.toFixed(3)).join(', '), 'azim atan2(x,z)=', (Math.atan2(cam.pos[0], cam.pos[2])*180/Math.PI).toFixed(1))
await b.close()

// ---- analisi: per ogni pixel del disco della sfera, direzione riflessa nel mondo
const mw = new Matrix4().fromArray(cam.mw)
const proj = new Matrix4().fromArray(cam.proj)
const invProj = proj.clone().invert()
const P = new Vector3().fromArray(cam.pos)
const C = new Vector3(0, CY, 0)

for (const { g, f } of scatti) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  let best = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ndcx = ((x + 0.5) / W) * 2 - 1
      const ndcy = -(((y + 0.5) / H) * 2 - 1)
      const v = new Vector3(ndcx, ndcy, 0.5).applyMatrix4(invProj)
      const dir = v.clone().normalize().transformDirection(mw)
      // intersezione raggio-sfera
      const oc = P.clone().sub(C)
      const bq = 2 * oc.dot(dir), cq = oc.lengthSq() - R*R
      const disc = bq*bq - 4*cq
      if (disc <= 0) continue
      const t = (-bq - Math.sqrt(disc)) / 2
      if (t <= 0) continue
      const hit = P.clone().add(dir.clone().multiplyScalar(t))
      const n = hit.clone().sub(C).normalize()
      const refl = dir.clone().sub(n.clone().multiplyScalar(2*dir.dot(n))).normalize()
      const i = (y*W + x)*ch
      const lum = 0.2126*data[i] + 0.7152*data[i+1] + 0.0722*data[i+2]
      best.push({ lum, refl })
    }
  }
  best.sort((a,b) => b.lum - a.lum)
  const top = best.slice(0, Math.max(1, Math.round(best.length*0.01)))
  const acc = new Vector3()
  let wsum = 0
  for (const t of top) { acc.add(t.refl.clone().multiplyScalar(t.lum)); wsum += t.lum }
  acc.divideScalar(wsum || 1).normalize()
  const az = Math.atan2(acc.x, acc.z)*180/Math.PI
  const el = Math.asin(acc.y)*180/Math.PI
  console.log(`giro ${String(g).padStart(3)}  pixel sfera=${best.length}  lum max=${top[0].lum.toFixed(0)}  direzione media top1% -> azimut ${((az+360)%360).toFixed(1)}  elevazione ${el.toFixed(1)}`)
}
