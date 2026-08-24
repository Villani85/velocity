/** LA STRADA SU UNO SCHERMO STRETTO.
 *
 *  Il ragionamento dice che va: dentro l'abitacolo `adattaAlFormato` esce
 *  subito (`Camera.ts`), quindi il campo VERTICALE resta 40 gradi a qualunque
 *  formato, e siccome la fotografia si ritaglia in orizzontale il buco del
 *  parabrezza resta fra 0,208 e 0,524 dell'altezza. Il punto di fuga della
 *  strada dipende solo dal campo verticale, quindi non si muove.
 *
 *  Ma un ragionamento pulito su questo progetto ha gia' sbagliato tre volte
 *  (il montante, il bloom, l'esposizione), quindi si guarda il fotogramma.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const q = Number(process.argv[2] ?? 0.94)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
for (const [nome, w, h] of [['telefono', 390, 844], ['tavoletta', 834, 1112]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  p.setDefaultTimeout(120000)
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
  await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
  await p.evaluate(() => { const e = document.getElementById('hud'); if (e) e.style.display = 'none' })
  const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (let i = 1; i <= 30; i++) {
    await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / 30)])
    await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
  }
  for (let i = 0; i < 50; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
  // il piano copre ancora tutto? Si proiettano i quattro vertici, come si era
  // fatto per misurare il difetto: sotto -0 e sopra 1 vuol dire che deborda,
  // cioe' che va bene.
  const ang = await p.evaluate(() => {
    const m = window.esperienza.lastra.mesh
    const c = window.esperienza.camera
    m.updateMatrixWorld()
    m.geometry.computeBoundingBox()
    const bb = m.geometry.boundingBox
    const out = []
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) {
      const v = new (m.position.constructor)(x, y, 0).applyMatrix4(m.matrixWorld).project(c)
      out.push([+((v.x + 1) / 2).toFixed(3), +((1 - v.y) / 2).toFixed(3)])
    }
    return { fov: +c.fov.toFixed(1), aspect: +c.aspect.toFixed(2), ang: out }
  })
  console.log(nome, w + 'x' + h, JSON.stringify(ang))
  await p.screenshot({ path: `C:/Users/Giuseppe/Webingegno/velocity/docs/provini/formato_${nome}.jpeg`, type: 'jpeg', quality: 88 })
  await p.close()
}
await b.close()
