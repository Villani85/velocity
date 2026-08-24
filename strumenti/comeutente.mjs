import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
/* SENZA `fissaQualita`: si guarda quello che il sito sceglie da solo, cioe'
   quello che vede chi apre la pagina. Tutti i provini della notte forzavano
   «alto», e su questo progetto un provino preso in una configurazione che
   nessuno usa e' gia' costato due volte. */
import sharp from 'sharp'
const b = await chromium.launch({ args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1200,height:750}, deviceScaleFactor:1 })
await p.route('**/@vite/client', r => r.fulfill({ body:'export {}', contentType:'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout:120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout:180000 })
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
const Q = Number(process.argv[2] ?? 0.055)
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=40;i++){ await p.evaluate(([c,v])=>scrollTo(0,c*v),[corsa,Q*(i/40)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
for (let i=0;i<80;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
console.log(await p.evaluate(() => {
  const q = esperienza.qualita
  const i = q?.impostazioni ?? {}
  const piano = esperienza.scena.getObjectByName('PIATTAFORMA_PIANO')
  const m = piano?.material
  return 'livello scelto dal sito: ' + (q?.livello ?? q?.nome ?? '?') +
    '\n  specchio della pedana: ' + (m && m.customProgramCacheKey ? 'ACCESO' : 'SPENTO') +
    '\n  impostazioni: ' + JSON.stringify(i).slice(0, 300)
}))
await sharp(await p.screenshot({type:'png'})).jpeg({quality:92}).toFile('C:/Users/Giuseppe/Webingegno/velocity/docs/provini/'+(process.argv[3]||'comeutente')+'.jpeg')
await b.close()
