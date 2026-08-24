/**
 * QUANTO CI METTE IL SITO A DIVENTARE SE STESSO.
 *
 * Tre traguardi, misurati dall'istante della navigazione e non fra loro:
 *
 *   LUOGO     la fotografia a 360 gradi e' montata: il fotogramma ha i colori
 *             giusti anche se la piattaforma e' ancora vuota
 *   SOGGETTO  l'automobile e' in scena
 *   COMPLETO  ruote, fari e riflesso al loro posto
 *
 * Il primo e' quello che conta per chi arriva: un luogo vero con una
 * piattaforma vuota si legge come un'attesa voluta, un gradiente sbagliato si
 * legge come un sito rotto.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const RETE = process.argv[2] === 'lenta'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
const p = await ctx.newPage()
if (RETE) {
  // una connessione da telefono in movimento: 1,6 Mbit e 150 ms di latenza
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150,
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
  })
}
await p.goto('http://localhost:4180/', { waitUntil: 'commit' })
const t0 = Date.now()
const attendi = async (nome, cond) => {
  await p.waitForFunction(cond, null, { timeout: 60000 })
  console.log(nome.padEnd(10), ((Date.now() - t0) / 1000).toFixed(2), 's')
}
await attendi('luogo', () => !!window.esperienza?.ambientePronto)
await attendi('soggetto', () => !!window.esperienza?.autoPronta)
await attendi('completo', () => !!window.esperienza?.autoPronta && !!window.esperienza?.lastra?.pronta)
await b.close()
