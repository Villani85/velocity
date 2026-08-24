/**
 * SCANDAGLIO DEL PUNTO DI OCCLUSIONE.
 *
 * Tarare a occhio un punto in tre dimensioni vuol dire fare venti prove e
 * ricordarsele. E il ragionamento non basta: avevo dedotto che il montante
 * fosse fuori campo e l'ho spostato "sull'asse dello sguardo" — la
 * copertura e' scesa dal 95% al 66%. La geometria di un'occlusione dipende
 * da dove guarda la camera, da quanto e' aperto il campo e da cosa c'e'
 * intorno: si prova, non si deduce.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const DA = 0.62, A = 0.75
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:800,height:500}, deviceScaleFactor:1 })
// TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
// di questa scena — 460k triangoli, ventidue luci, una passata di riflesso e
// una di grading — puo' superarli quando la macchina sta anche generando
// modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
// sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
await p.goto('http://localhost:5174/', { waitUntil:'load' })
await p.waitForFunction(() => !!window.esperienza && !!window.POSE, null, { timeout:30000 })
// IL LIVELLO SI FISSA, se no si misura una scena diversa da quella vera:
// Chromium headless disegna in software e il gestore di qualita' scende da
// solo, spegnendo riflesso e occlusione. Vedi `main.ts`, `fissaQualita`.
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { window.esperienza.forzaEsterno = true })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

async function copertura(locale) {
  await p.evaluate(([c,v]) => window.scrollTo(0, c*v), [corsa, DA + (A-DA)*locale])
  for (let k=0;k<10;k++) await p.evaluate(() => new Promise(r=>requestAnimationFrame(r)))
  const png = await p.screenshot({ type:'png' })
  const { data } = await sharp(png).resize(64,40,{fit:'fill'}).grayscale().raw().toBuffer({resolveWithObject:true})
  let scuri=0, somma=0
  for (const v of data) { somma+=v; if (v<26) scuri++ }
  return { coperto: scuri/data.length*100, luce: somma/data.length }
}

// si arriva scorrendo una volta sola, poi si resta nel beat
for (let i=1;i<=40;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa,DA*(i/40)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))

const candidati = []
for (const x of [0.62, 0.66, 0.70, 0.74])
  for (const z of [0.74, 0.80, 0.86, 0.92])
    candidati.push([x, 0.99, z])

const esiti = []
for (const [x,y,z] of candidati) {
  await p.evaluate(([x,y,z]) => window.POSE.tagliMezzo.set(x,y,z), [x,y,z])
  let migliore = { coperto:0 }
  for (const l of [0.50,0.56,0.62,0.68,0.74]) {
    const r = await copertura(l)
    if (r.coperto > migliore.coperto) migliore = { ...r, locale:l }
  }
  esiti.push({ x, y, z, ...migliore })
  console.log(`  (${x.toFixed(2)}, ${z.toFixed(2)})  coperto ${migliore.coperto.toFixed(1)}%  luce ${migliore.luce.toFixed(0)}  a locale ${migliore.locale}`)
}
esiti.sort((a,b) => b.coperto - a.coperto)
const v = esiti[0]
console.log(`\n  migliore: tagliMezzo (${v.x}, ${v.y}, ${v.z}) -> ${v.coperto.toFixed(1)}% a locale ${v.locale}`)
await b.close()
