/** Un fotogramma ravvicinato del faro, con la camera piazzata a mano.
 *  Serve a giudicare l'innesto: da otto metri un'ottica sbagliata sembra
 *  giusta. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1100,height:700}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
// SI STACCA L'AGGIORNAMENTO A CALDO PER TUTTA LA DURATA DELLA MISURA.
//
// Vite ricarica la pagina a ogni salvataggio in `src/`. Se qualcuno sta
// scrivendo codice mentre lo strumento misura — altri agenti al lavoro sullo
// stesso repo, per dire — la pagina riparte a meta' corsa e la misura muore
// con «Execution context was destroyed». Quattro corse perse cosi'.
//
// Servire vuoto il client di Vite toglie il canale: la pagina resta quella
// caricata all'inizio, che e' anche l'unica cosa sensata da misurare — una
// misura ha senso su UNO stato, non su uno che cambia sotto.
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('console', m=>{ const t=m.text(); if(/faro|auto\]/i.test(t)) console.log('  >', t.slice(0,160)) })
await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout:120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, {timeout:180000}).catch(()=>{})
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none'
  document.querySelector('.voci')?.style.setProperty('display','none') })
const dist = Number(process.argv[2] ?? 1.2)
const info = await p.evaluate((d) => {
  const e=window.esperienza, T=window.__THREE
  const o = e.scena.getObjectByName('OTTICA_FARO_DX')
  if(!o) return {errore:'ottica non trovata'}
  const c = new T.Vector3(); o.getWorldPosition(c)
  // ci si mette davanti, sull'asse del muso, all'altezza del faro
  const avanti = new T.Vector3(c.x, 0, c.z).normalize()
  e.camera.position.copy(c).addScaledVector(avanti, d).add(new T.Vector3(0, 0.10, 0))
  e.camera.lookAt(c)
  e.camera.updateMatrixWorld()
  e.__bloccaCamera = true
  const b = new T.Box3().setFromObject(o), s = new T.Vector3(); b.getSize(s)
  return { centro:[+c.x.toFixed(3),+c.y.toFixed(3),+c.z.toFixed(3)], misura:[+s.x.toFixed(3),+s.y.toFixed(3),+s.z.toFixed(3)] }
}, dist)
console.log(JSON.stringify(info))
for(let i=0;i<30;i++) await p.evaluate(()=>{ const e=window.esperienza; return new Promise(r=>requestAnimationFrame(()=>{ r() })) })
await p.screenshot({ path:'C:/Users/Giuseppe/Webingegno/velocity/docs/provini/faro_vicino.png' , timeout:120000 })
await b.close()
