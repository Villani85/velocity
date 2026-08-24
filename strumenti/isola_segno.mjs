/** DA DOVE VIENE IL SEGNO AD ARCO SOPRA LA RUOTA.
 *  Tre sospetti, e si spengono uno alla volta sulla scena viva invece di
 *  ricompilare tre volte: la normal map cotta, l'ombra proiettata dalla ruota
 *  sul parafango, e la mappa di colore. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!!', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, 0.06 * (i / 40)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}
const fermo = async () => { for (let i = 0; i < 8; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r))) }
const zona = { x: 620, y: 400, width: 340, height: 220 }

const prove = [
  ['0_com_e', () => {}],
  ['1_senza_normal', () => {
    esperienza.esterno.traverse((o) => {
      if (o.isMesh && o.material?.name === 'SCOCCA') { o.material.__n = o.material.normalScale.clone(); o.material.normalScale.set(0, 0) }
    })
  }],
  ['2_senza_ombra', () => {
    esperienza.scena.traverse((o) => { if (o.isDirectionalLight) o.castShadow = false })
    esperienza.esterno.traverse((o) => { if (o.isMesh) o.receiveShadow = false })
  }],
  ['3_senza_mappa_colore', () => {
    esperienza.esterno.traverse((o) => {
      if (o.isMesh && o.material?.name === 'SCOCCA') { o.material.__m = o.material.map; o.material.map = null; o.material.needsUpdate = true }
    })
  }],
]
for (const [nome, azione] of prove) {
  await p.evaluate(azione)
  await fermo()
  await p.screenshot({ path: `docs/provini/segno_${nome}.png`, clip: zona })
  console.log('scritto', nome)
}
await b.close()
