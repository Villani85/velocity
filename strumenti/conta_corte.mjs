/** QUANTI OGGETTI E QUANTE CHIAMATE COSTA LA CORTE.
 *  `fps.mjs` legge `renderer.info` DOPO l'ultima passata a schermo intero e
 *  riporta «1 chiamata»: e' vero e non serve a niente. Qui si conta il
 *  contenuto del gruppo CORTE, che e' il numero che decide il costo. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 900, height: 560 } })
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
console.log(await p.evaluate(() => {
  const c = window.esperienza.scena.getObjectByName('CORTE')
  let oggetti = 0, schiere = 0, istanze = 0, luci = 0, mesh = 0, tri = 0
  c.traverse((o) => {
    oggetti++
    if (o.isPointLight) luci++
    if (o.isInstancedMesh) { schiere++; istanze += o.count }
    else if (o.isMesh) mesh++
    if (o.isMesh && o.geometry?.index) tri += o.geometry.index.count / 3 * (o.count || 1)
    else if (o.isMesh) tri += (o.geometry.attributes.position.count / 3) * (o.count || 1)
  })
  return { oggetti, mesh, schiere, istanze, luci, triangoli: tri }
}))
await b.close()
