import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1000,height:620}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
p.on('console', m => { if (m.type()==='error') console.log('ERR', m.text().slice(0,150)) })
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout:30000 })
await p.waitForFunction(() => window.esperienza.autoPronta, null, { timeout:90000 }).catch(()=>console.log('auto non pronta'))
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
console.log(JSON.stringify(await p.evaluate(() => ({
  pronta: esperienza.autoPronta,
  misura: esperienza.misuraAuto ? esperienza.misuraAuto.toArray().map(v=>+v.toFixed(2)) : null,
}))))
await b.close()
