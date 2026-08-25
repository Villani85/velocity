/** COME LO VEDONO - il fotogramma alle condizioni di chi guarda, non alle mie.
 *
 *  Nasce da uno scarto durato giorni: il committente manda l'ingrandimento di
 *  una lastra chiara sotto la vettura, io rendo lo stesso tempo e li' e' scura.
 *  Nessuno dei due sbaglia a guardare - guardiamo due scene diverse.
 *
 *  `uno.mjs` chiama `fissaQualita('alto')`, e deve farlo: Chromium headless
 *  disegna in software e il gestore scenderebbe da solo, spegnendo riflesso e
 *  occlusione, cioe' misurerei una scena che nessuno vede. Ma il rovescio e'
 *  che NON misuro mai la scena che quasi tutti vedono: a qualita' media la
 *  pedana riflette a 0,34 di risoluzione e il basamento diventa un disco opaco.
 *  Sotto la vettura quella differenza cambia tutto, perche' li' l'unica luce
 *  arriva da sotto.
 *
 *  Quindi qui la qualita' e' un parametro, e 'auto' vuol dire: non toccarla,
 *  lasciala scegliere all'applicazione come farebbe a casa di chi guarda.
 *
 *  E IL RITAGLIO NON SI SCRIVE A MANO. Le coordinate del difetto cambiano con
 *  la finestra, e far coincidere a occhio il mio ritaglio con quello di un
 *  altro mi ha gia' portato fuori strada. Si tira una griglia di raggi, si
 *  tengono i pixel che appartengono al pezzo, e il riquadro esce da li': su
 *  qualunque finestra inquadra sempre la stessa COSA.
 *
 *  node strumenti/comelovedono.mjs <scorrimento> <nome> [qualita|auto] [larg] [alt] [dpr] [pezzo]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('sharp')

const q     = Number(process.argv[2] ?? 0.06)
const nome  = process.argv[3] ?? 'come'
const qual  = process.argv[4] ?? 'alto'
const VL    = Number(process.argv[5] ?? 1200)
const VA    = Number(process.argv[6] ?? 750)
const DPR   = Number(process.argv[7] ?? 1)
const PEZZO = process.argv[8] ?? 'SOTTOSCOCCA'
const DOVE  = 'C:/Users/Giuseppe/Webingegno/velocity/docs/provini/'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: VL, height: VA }, deviceScaleFactor: DPR })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 120000 })
  .catch(() => console.log('  (ATTENZIONE: ruote di segnale, il provino non vale)'))
if (qual !== 'auto') await p.evaluate((v) => window.fissaQualita(v), qual)
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / 40)])
  await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
}
for (let i = 0; i < 60; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))

const stato = await p.evaluate(() => ({
  beat: esperienza.regia.beat,
  locale: +esperienza.regia.locale.toFixed(2),
  dpr: devicePixelRatio,
}))

const box = await p.evaluate(async (PEZZO) => {
  const THREE = await import('/node_modules/three/build/three.module.js')
  const e = window.esperienza
  const rc = new THREE.Raycaster(); rc.layers.set(0)
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0
  const P = 140
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const fx = c / (P - 1), fy = r / (P - 1)
    rc.setFromCamera(new THREE.Vector2(fx * 2 - 1, -(fy * 2 - 1)), e.camera)
    const h = rc.intersectObject(e.scena, true).filter(k => {
      let o = k.object
      while (o) { if (!o.visible) return false; o = o.parent }
      return !!k.object.material
    })[0]
    if (!h) continue
    let nm = h.object.name, o = h.object
    while (!nm && o.parent) { o = o.parent; nm = o.name }
    if (nm !== PEZZO) continue
    n++
    const px = fx * innerWidth, py = fy * innerHeight
    if (px < x0) x0 = px
    if (px > x1) x1 = px
    if (py < y0) y0 = py
    if (py > y1) y1 = py
  }
  return n ? { x0, x1, y0, y1, n } : null
}, PEZZO)

await p.screenshot({ path: DOVE + nome + '.jpeg', type: 'jpeg', quality: 92 })
await b.close()

console.log(nome, JSON.stringify(stato))
if (!box) { console.log('  ' + PEZZO + ' non compare in questo fotogramma'); process.exit(0) }

/* IL RITAGLIO DEBORDA SOTTO PIU' CHE SOPRA. Il difetto non e' il pezzo: e' il
   confine fra il suo bordo basso e il pavimento, e un ritaglio che si ferma al
   pezzo taglia via proprio la cosa da giudicare. */
const meta = await sharp(DOVE + nome + '.jpeg').metadata()
const alt = box.y1 - box.y0
const rit = {
  left: Math.max(0, Math.round((box.x0 - alt * 0.35) * DPR)),
  top: Math.max(0, Math.round((box.y0 - alt * 0.55) * DPR)),
}
rit.width = Math.min(meta.width - rit.left, Math.round((box.x1 - box.x0 + alt * 0.70) * DPR))
rit.height = Math.min(meta.height - rit.top, Math.round(alt * 2.1 * DPR))
await sharp(DOVE + nome + '.jpeg').extract(rit)
  .resize(1800, Math.round(1800 * rit.height / rit.width), { kernel: 'nearest' })
  .jpeg({ quality: 94 }).toFile(DOVE + nome + '_zoom.jpeg')

const luma = async (r) => {
  const { data, info } = await sharp(DOVE + nome + '.jpeg').extract(r).raw().toBuffer({ resolveWithObject: true })
  let s = 0, mx = 0
  const N = info.width * info.height
  for (let i = 0; i < N; i++) {
    const l = 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2]
    s += l
    if (l > mx) mx = l
  }
  return { media: +(s / N).toFixed(1), max: Math.round(mx) }
}
const L = Math.round((box.x0 + (box.x1 - box.x0) * 0.25) * DPR)
const W = Math.max(8, Math.round((box.x1 - box.x0) * 0.5 * DPR))
const pezzo = await luma({ left: L, top: Math.round((box.y0 + alt * 0.15) * DPR), width: W, height: Math.max(4, Math.round(alt * 0.6 * DPR)) })
const suolo = await luma({ left: L, top: Math.min(meta.height - 6, Math.round((box.y1 + alt * 0.10) * DPR)), width: W, height: Math.max(4, Math.round(alt * 0.35 * DPR)) })
console.log('  ' + PEZZO + '  media ' + pezzo.media + ' (max ' + pezzo.max + ')')
console.log('  pavimento sotto  media ' + suolo.media + ' (max ' + suolo.max + ')')
console.log('  STACCO AL BORDO  ' + (suolo.media / Math.max(0.1, pezzo.media)).toFixed(2) + 'x   (1 = invisibile, oltre 2 = si legge come un ritaglio)')
console.log('  ingrandimento in docs/provini/' + nome + '_zoom.jpeg')
