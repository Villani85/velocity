import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE:', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.evaluate(() => window.fissaQualita('alto'))
console.log(await p.evaluate(() => {
  const fuori = []
  const v3 = new (window.THREE?.Vector3 ?? Object)()
  esperienza.esterno.traverse((o) => {
    if (!o.isMesh) return
    let vis = o.visible, q = o.parent
    while (q) { if (!q.visible) vis = false; q = q.parent }
    if (!vis) return
    o.updateWorldMatrix(true, false)
    const m = o.matrixWorld.elements
    fuori.push({
      nome: o.name || '(anonima)',
      mat: o.material?.name || o.material?.type,
      tipo: o.material?.type,
      env: o.material?.envMapIntensity,
      tone: o.material?.toneMapped,
      pos: [Math.round(m[12] * 100) / 100, Math.round(m[13] * 100) / 100, Math.round(m[14] * 100) / 100],
      tri: Math.round((o.geometry?.index ? o.geometry.index.count : o.geometry?.attributes.position.count) / 3),
    })
  })
  // le ruote: basse e larghe rispetto alla mezzeria
  const box = new (Object.getPrototypeOf(esperienza.esterno).constructor === Object ? Object : Object)()
  let auto = null
  esperienza.esterno.traverse((o) => { if (o.isMesh && o.material?.name === 'SCOCCA') auto = o })
  auto.updateWorldMatrix(true, false)
  const g = auto.geometry
  g.computeBoundingBox()
  const bb = g.boundingBox.clone().applyMatrix4(auto.matrixWorld)
  const ruote = esperienza.ruote.ruoteVere.map((p) => {
    p.updateWorldMatrix(true, false)
    const m = p.matrixWorld.elements
    return [Math.round(m[12] * 1000) / 1000, Math.round(m[13] * 1000) / 1000, Math.round(m[14] * 1000) / 1000]
  })
  return {
    scocca: {
      x: [Math.round(bb.min.x * 1000) / 1000, Math.round(bb.max.x * 1000) / 1000],
      y: [Math.round(bb.min.y * 1000) / 1000, Math.round(bb.max.y * 1000) / 1000],
      z: [Math.round(bb.min.z * 1000) / 1000, Math.round(bb.max.z * 1000) / 1000],
      lunghezza: Math.round((bb.max.x - bb.min.x) * 1000) / 1000,
      larghezza: Math.round((bb.max.z - bb.min.z) * 1000) / 1000,
    },
    ruote,
    passo: ruote.length >= 4
      ? Math.round((Math.max(...ruote.map(r => r[0])) - Math.min(...ruote.map(r => r[0]))) * 1000) / 1000
      : 'n/d',
    carreggiata: ruote.length >= 4
      ? Math.round((Math.max(...ruote.map(r => r[2])) - Math.min(...ruote.map(r => r[2]))) * 1000) / 1000
      : 'n/d',
  }
}))
await b.close()
