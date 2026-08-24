/**
 * I LIVELLI DEL FINALE, contati invece che guardati.
 *
 * Due revisioni esterne e il committente segnalano la stessa cosa: nel finale
 * ci sono tre cose che si accavallano — la carta del lavoro copre la testata
 * sopra e il pannello sotto, e la stessa descrizione compare due volte.
 * «TUTTO IN REGOLA» finisce sopra la scheda.
 *
 * Qui si misurano i riquadri VERI sullo schermo. Quelli in tre dimensioni non
 * hanno un rettangolo da leggere: si ricavano nascondendo l'oggetto e
 * guardando quali pixel cambiano. Quelli del documento si leggono dal DOM.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const q = Number(process.argv[2] ?? 0.955)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 })
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 50; i++) { await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, q * (i / 50)]); await p.evaluate(() => new Promise((r) => requestAnimationFrame(r))) }
for (let i = 0; i < 90; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

const grezzo = async () => sharp(await p.screenshot({ type: 'png' })).raw().toBuffer({ resolveWithObject: true })
const con = await grezzo()
const { width: W, height: H, channels: C } = con.info
const riquadro = async (nome, spegni) => {
  await p.evaluate(spegni, true)
  for (let i = 0; i < 14; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const senza = await grezzo()
  await p.evaluate(spegni, false)
  for (let i = 0; i < 14; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  /* IL RIQUADRO SI PRENDE DOVE I PIXEL CAMBIATI SONO DENSI, non dove esistono.
     Il finale non e' fermo: l'orologio scatta, la strada scorre, il bloom
     ridistribuisce. Fra i due scatti cambiano pixel sparsi in tutto il
     fotogramma, e un riquadro che li includa tutti viene grande quanto lo
     schermo — cioe' un numero, non un errore. Contando invece per riga e per
     colonna e tenendo l'estensione dove il conto supera un sesto del massimo,
     il rumore sparso non fa massa e l'oggetto si trova. */
  const perRiga = new Int32Array(H), perCol = new Int32Array(W)
  let n = 0
  for (let i = 0, k = 0; i < con.data.length; i += C, k++) {
    const d = Math.abs(con.data[i] - senza.data[i]) + Math.abs(con.data[i + 1] - senza.data[i + 1]) + Math.abs(con.data[i + 2] - senza.data[i + 2])
    if (d > 22) { n++; perRiga[(k / W) | 0]++; perCol[k % W]++ }
  }
  const estensione = (v) => {
    let max = 0
    for (const q of v) if (q > max) max = q
    const soglia = max / 6
    let a = -1, b = -1
    for (let i = 0; i < v.length; i++) if (v[i] >= soglia) { if (a < 0) a = i; b = i }
    return [a < 0 ? 0 : a, b < 0 ? 0 : b]
  }
  const [y0, y1] = estensione(perRiga)
  const [x0, x1] = estensione(perCol)
  const r = { nome, n, x0, x1, y0, y1 }
  console.log(nome.padEnd(14) + String(n).padStart(7) + ' px   x ' + String(x0).padStart(4) + '..' + String(x1).padStart(4) + '   y ' + String(y0).padStart(3) + '..' + String(y1).padStart(3))
  return r
}
console.log('nome            pixel          riquadro sullo schermo')
/* NON SI SPEGNE IL GRUPPO: dentro c'e' anche lo SFONDO del carosello, due
   piani da 160x100 metri che coprono tutto. Spegnendolo cambiava l'intero
   fotogramma e il riquadro misurato veniva grande quanto lo schermo — una
   misura che dava un numero invece di un errore, la quarta volta in questo
   progetto. Si spegne la sola carta al centro. */
const quale = await p.evaluate(() => esperienza.controllo?.quale ?? 0)
const nomeCarta = await p.evaluate((i) => {
  const n = []
  esperienza.scena.traverse(o => { if (/^LAVORO_|^CARTA_CONTATTO$/.test(o.name)) n.push(o.name) })
  return n[i] ?? n[0]
}, quale)
console.log('(la carta al centro: ' + nomeCarta + ')')
await p.evaluate((n) => { window.__nc = n }, nomeCarta)
const carta = await riquadro('carta', (v) => { esperienza.scena.getObjectByName(window.__nc).visible = !v })
const pann = await riquadro('pannello', (v) => { esperienza.quadro.mesh.visible = !v })

const dom = await p.evaluate(() => {
  const fuori = []
  for (const s of ['.testa', '.testa__nome', '.voci', '.vetrina__freccia--indietro', '.vetrina__freccia--avanti', '.controllo__parola', '.controllo']) {
    for (const e of document.querySelectorAll(s)) {
      const r = e.getBoundingClientRect()
      const st = getComputedStyle(e)
      if (r.width < 3 || r.height < 3) continue
      fuori.push({ s, op: +st.opacity, x0: Math.round(r.left), y0: Math.round(r.top), x1: Math.round(r.right), y1: Math.round(r.bottom) })
    }
  }
  return fuori
})
console.log('')
console.log('nel documento:')
for (const d of dom) console.log('  ' + d.s.padEnd(30) + ' opacita ' + d.op.toFixed(2) + '   x ' + String(d.x0).padStart(4) + '..' + String(d.x1).padStart(4) + '  y ' + String(d.y0).padStart(3) + '..' + String(d.y1).padStart(3))

const sovr = (a, b) => {
  const x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1), y0 = Math.max(a.y0, b.y0), y1 = Math.min(a.y1, b.y1)
  return x1 > x0 && y1 > y0 ? { l: x1 - x0, a: y1 - y0 } : null
}
console.log('')
const coppie = [['carta e pannello', carta, pann]]
for (const d of dom) if (d.op > 0.05) coppie.push(['carta e ' + d.s, carta, d])
for (const [nome, a, b] of coppie) {
  const s = sovr(a, b)
  console.log('  ' + (s ? 'SI  ' + s.l + 'x' + s.a + ' px' : 'no          ').padEnd(20) + nome)
}
await b.close()
