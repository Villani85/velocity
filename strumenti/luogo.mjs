/** UN PROVINO PER OGNI LUOGO — quello che il pulsante promette e quello che da'.
 *
 *  I quattro pulsanti LUOGO girano la stessa fotografia di 360 gradi. Il
 *  commento in `ui/Comandi.ts` e' onesto sul punto — «i nomi non dichiarano
 *  un'ora del giorno che non c'e': dichiarano dove si sta guardando» — ma chi
 *  arriva sul sito quel commento non lo legge: legge «TRAMONTO» e si aspetta
 *  un'ora.
 *
 *  Questo rende i quattro fotogrammi affiancati, cosi' la domanda «il pulsante
 *  mantiene?» si risponde guardando invece che discutendo.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const LUOGHI = ['VILLA', 'PISCINA', 'TRAMONTO', 'CORTE']
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ' + e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.evaluate(() => window.fissaQualita('alto'))
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, 0.06 * (i / 40)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}

for (let i = 0; i < LUOGHI.length; i++) {
  await p.evaluate((k) => {
    const v = document.querySelectorAll('.comandi__vista')
    if (v[k]) v[k].click()
  }, i)
  /* SESSANTA FOTOGRAMMI DI ATTESA. La rotazione del panorama non e' istantanea
     e nemmeno lo e' la mappa d'ambiente che ne dipende: fotografare subito dopo
     il clic vuol dire fotografare una transizione, cioe' un'immagine che non
     esiste in nessun momento in cui qualcuno guarda. */
  for (let j = 0; j < 60; j++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  await p.screenshot({ path: 'docs/provini/luogo_' + LUOGHI[i].toLowerCase() + '.jpeg', type: 'jpeg', quality: 86 })
  const misura = await p.evaluate(() => ({
    rotazione: Math.round((esperienza.scena.backgroundRotation.y * 180) / Math.PI),
  }))
  console.log('  ' + LUOGHI[i].padEnd(9) + ' rotazione ' + String(misura.rotazione).padStart(4) + ' gradi')
}
await b.close()
