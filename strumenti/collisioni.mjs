/**
 * CHI SI SOVRAPPONE A CHI, nella hero — contato, non giudicato a occhio.
 *
 * Due revisioni esterne indipendenti hanno scritto la stessa frase con parole
 * diverse: «la fascia dei tre screenshot taglia la carrozzeria e collide con
 * l'headline», «l'occhio non sa quale sia il protagonista». E' un giudizio, e
 * un giudizio non si corregge: si corregge un numero.
 *
 * Il numero e' questo: quanta parte del testo cade SOPRA la sagoma
 * dell'automobile, e quanta parte dell'automobile e' coperta. La sagoma non e'
 * un riquadro disegnato a mano — si ricava nascondendo l'oggetto e guardando
 * quali pixel cambiano, che e' esatto e segue la forma vera.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const q = Number(process.argv[2] ?? 0.004)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 })
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) { await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, q * (i / 40)]); await p.evaluate(() => new Promise((r) => requestAnimationFrame(r))) }
for (let i = 0; i < 70; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

const grezzo = async () => sharp(await p.screenshot({ type: 'png' })).raw().toBuffer({ resolveWithObject: true })
const con = await grezzo()
const { width: W, height: H, channels: C } = con.info

const sagoma = async (spegni) => {
  await p.evaluate(spegni, true)
  for (let i = 0; i < 14; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const senza = await grezzo()
  await p.evaluate(spegni, false)
  for (let i = 0; i < 14; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const m = new Uint8Array(W * H)
  let n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0
  for (let i = 0, k = 0; i < con.data.length; i += C, k++) {
    const d = Math.abs(con.data[i] - senza.data[i]) + Math.abs(con.data[i + 1] - senza.data[i + 1]) + Math.abs(con.data[i + 2] - senza.data[i + 2])
    if (d > 22) { m[k] = 1; n++; const x = k % W, y = (k / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return { m, n, x0, x1, y0, y1 }
}

const auto = await sagoma((v) => { esperienza.autoVera.visible = !v })
console.log('automobile: ' + auto.n + ' px   riquadro x ' + auto.x0 + '..' + auto.x1 + '  y ' + auto.y0 + '..' + auto.y1)
const ins = await sagoma((v) => { const g = esperienza.scena.getObjectByName('INSEGNE') ?? esperienza.insegne?.gruppo; if (g) g.visible = !v })
console.log('insegne:    ' + ins.n + ' px   riquadro x ' + ins.x0 + '..' + ins.x1 + '  y ' + ins.y0 + '..' + ins.y1)

// quanto le insegne coprono l'automobile: si guarda dove la sagoma dell'auto
// esisterebbe ma e' nascosta, cioe' dove le due maschere NON si intersecano
// perche' una copre l'altra. Il conto diretto e' l'intersezione dei riquadri.
const inter = (a, b) => {
  const x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1)
  const y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y1, b.y1)
  return x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) : 0
}
console.log('insegne sopra il riquadro dell\'auto: ' + inter(auto, ins) + ' px quadri')

const testi = await p.evaluate(() => {
  const fuori = []
  for (const s of ['h1', '.storia__occhiello', '.storia__corpo', '.storia p', 'a.bottone, .storia a']) {
    for (const e of document.querySelectorAll(s)) {
      const r = e.getBoundingClientRect()
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue
      const st = getComputedStyle(e)
      if (st.opacity === '0' || st.visibility === 'hidden') continue
      fuori.push({ s, t: (e.textContent || '').trim().slice(0, 26), x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom) })
    }
  }
  return fuori
})
console.log('')
console.log('quanto di ogni testo cade sopra la SAGOMA vera dell\'automobile:')
for (const t of testi) {
  let dentro = 0, tot = 0
  for (let y = Math.max(t.y0, 0); y < Math.min(t.y1, H); y++)
    for (let x = Math.max(t.x0, 0); x < Math.min(t.x1, W); x++) { tot++; if (auto.m[y * W + x]) dentro++ }
  const pc = tot ? (100 * dentro / tot) : 0
  console.log('  ' + (pc.toFixed(1) + '%').padStart(7) + '  ' + t.s.padEnd(20) + ' «' + t.t + '»')
}
await sharp(await p.screenshot({ type: 'png' })).jpeg({ quality: 90 }).toFile('C:/Users/Giuseppe/Webingegno/velocity/docs/provini/collisioni.jpeg')
await b.close()
