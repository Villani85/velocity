/** RAYCAST DIAGNOSTICO: invece di spegnere pezzi a caso, si chiede alla
 *  scena cosa c'e' sotto un pixel. Stampa i primi oggetti colpiti con
 *  distanza, nome, materiale e colore emesso. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const q = Number(process.argv[2] ?? 0.06)
const px = Number(process.argv[3] ?? 600), py = Number(process.argv[4] ?? 375)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1200,height:750}, deviceScaleFactor:1 })
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
await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout:120000 })
await p.waitForFunction(() => window.esperienza.autoPronta, null, { timeout:180000 }).catch(()=>{})
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i=1;i<=40;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,q*(i/40)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
const out = await p.evaluate(([px,py]) => {
  const e = window.esperienza, T = window.__THREE
  const ray = new T.Raycaster()
  ray.setFromCamera(new T.Vector2((px/innerWidth)*2-1, -(py/innerHeight)*2+1), e.camera)
  const hit = ray.intersectObject(e.scena, true).slice(0,6)
  return hit.map(h => {
    const m = Array.isArray(h.object.material)? h.object.material[0] : h.object.material
    const c = m?.color ? [m.color.r,m.color.g,m.color.b].map(v=>+v.toFixed(3)) : null
    return { d:+h.distance.toFixed(2), nome:h.object.name||'(senza nome)',
             padre:h.object.parent?.name||'', tipo:m?.type, mat:m?.name||'',
             colore:c, y:+h.point.y.toFixed(2) }
  })
}, [px,py])
console.log(JSON.stringify(out,null,1))
await b.close()
