import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
console.log(await p.evaluate(() => {
  let tri = 0, ruote = 0
  esperienza.esterno.traverse((o) => {
    if (!o.isMesh) return
    const n = o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3
    tri += n
    if (/RUOTA|GOMMA_VERA|CERCHIO_VERO|DISCO_FRENO/.test(o.name || '')) ruote += n
  })
  return { triangoliEsterno: Math.round(tri), diCuiRuote: Math.round(ruote) }
}))
await b.close()
