import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { Vector3, Matrix4 } from 'three'
const T0 = Date.now(); const log = (...a) => console.log(((Date.now()-T0)/1000).toFixed(1)+'s', ...a)
const U = 'C:/Users/Giuseppe/Webingegno/velocity/.tmp/probe3'
mkdirSync(U, { recursive: true })
const GIRI = (process.argv[2] || '0,225').split(',').map(Number)
const W = 700, H = 460, R = 0.55, CY = 0.95
const b = await chromium.launch({ args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
p.setDefaultTimeout(90000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' }); log('goto')
await p.waitForFunction(() => !!window.esperienza); log('esperienza')
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto).catch(()=>log('(non pronti)')); log('pronti')
await p.evaluate(() => window.fissaQualita('alto'))
const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
for (let i = 1; i <= 20; i++) { await p.evaluate(([c,v]) => window.scrollTo(0, c*v), [corsa, 0.06*(i/20)]); await p.evaluate(() => new Promise(r => requestAnimationFrame(r))) }
log('hero')
const setup = await p.evaluate(([R, CY]) => {
  const T = window.__THREE, e = window.esperienza
  let n = 0
  e.scena.traverse((o) => { if (o.isLight) { o.intensity = 0; n++ } })
  const auto = e.scena.getObjectByName('AUTO_VERA'); if (auto) auto.visible = false
  const s = new T.Mesh(new T.SphereGeometry(R, 128, 96), new T.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.01, envMapIntensity: 1 }))
  s.name = 'PROBE'; s.position.set(0, CY, 0); e.scena.add(s)
  e.renderer.toneMapping = T.LinearToneMapping
  e.renderer.toneMappingExposure = 0.012
  e.scena.backgroundIntensity = 0.001
  return { luci: n }
}, [R, CY]); log('setup', JSON.stringify(setup))
const scatti = []
for (const g of GIRI) {
  await p.evaluate((v) => window.giraPanorama(v), g)
  for (let i = 0; i < 25; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
  const f = `${U}/${String(g).padStart(3,'0')}.png`; await p.screenshot({ path: f }); scatti.push({ g, f }); log('reso', g)
}
const cam = await p.evaluate(() => { const c = window.esperienza.camera; c.updateMatrixWorld(true); return { pos: c.position.toArray(), mw: c.matrixWorld.elements.slice(), proj: c.projectionMatrix.elements.slice() } })
log('camera', cam.pos.map(v=>v.toFixed(3)).join(','), 'az', (Math.atan2(cam.pos[0],cam.pos[2])*180/Math.PI).toFixed(1))
await b.close(); log('chiuso')
const mw = new Matrix4().fromArray(cam.mw), invProj = new Matrix4().fromArray(cam.proj).invert()
const P = new Vector3().fromArray(cam.pos), C = new Vector3(0, CY, 0)
const v = new Vector3(), dir = new Vector3(), oc = new Vector3(), hit = new Vector3(), nn = new Vector3(), rf = new Vector3()
for (const { g, f } of scatti) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  const AZ = 72, EL = 36 // bin da 5 gradi
  const somma = new Float64Array(AZ*EL), conta = new Float64Array(AZ*EL)
  let dentro = 0, clip = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    v.set(((x+0.5)/W)*2-1, -(((y+0.5)/H)*2-1), 0.5).applyMatrix4(invProj)
    dir.copy(v).normalize().transformDirection(mw)
    oc.copy(P).sub(C)
    const bq = 2*oc.dot(dir), cq = oc.lengthSq()-R*R, disc = bq*bq-4*cq
    if (disc <= 0) continue
    const t = (-bq-Math.sqrt(disc))/2; if (t <= 0) continue
    hit.copy(P).addScaledVector(dir, t); nn.copy(hit).sub(C).normalize()
    rf.copy(dir).addScaledVector(nn, -2*dir.dot(nn)).normalize()
    const i = (y*W+x)*ch
    const lum = 0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2]
    if (lum >= 254) clip++
    dentro++
    const az = ((Math.atan2(rf.x, rf.z)*180/Math.PI)+360)%360
    const el = Math.asin(Math.max(-1,Math.min(1,rf.y)))*180/Math.PI + 90
    const k = Math.min(AZ-1, Math.floor(az/5))*EL + Math.min(EL-1, Math.floor(el/5))
    somma[k] += lum; conta[k]++
  }
  let best = -1, bk = 0
  for (let k = 0; k < somma.length; k++) { if (conta[k] < 4) continue; const m = somma[k]/conta[k]; if (m > best) { best = m; bk = k } }
  const az = Math.floor(bk/EL)*5+2.5, el = (bk%EL)*5+2.5-90
  log(`giro ${String(g).padStart(3)}  pixel=${dentro} clip=${clip}  BIN PIU' LUMINOSO: azimut ${az}  elevazione ${el}  (media ${best.toFixed(1)}/255)`)
}
