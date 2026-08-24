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
  const basse = fuori.filter((f) => Math.abs(f.pos[2]) > 0.4 && f.pos[1] < 0.7)
  let cer = null, gom = null
  esperienza.esterno.traverse((o) => {
    if (!o.isMesh) return
    if (o.material?.name === 'CERCHIO_VERO' && !cer) cer = o.material
    if (o.material?.name === 'GOMMA_SEGNALE' && !gom) gom = o.material
  })
  const d = (m) => m ? {
    tipo: m.type, ruvidita: m.roughness, metallo: m.metalness,
    env: m.envMapIntensity, toneMapped: m.toneMapped,
    colore: [m.color.r, m.color.g, m.color.b].map((v) => Math.round(v * 1000) / 1000),
  } : 'assente'
  return { visibiliBasse: basse.length, CERCHIO_VERO: d(cer), GOMMA: d(gom),
    forzaAmbiente: esperienza.scena?.environmentIntensity,
    fondo: esperienza.scena?.backgroundIntensity }
}))
await b.close()
