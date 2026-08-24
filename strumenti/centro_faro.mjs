/** DOVE STA IL CENTRO DELL'ANELLO E DOVE STA IL CENTRO DEL FORO.
 *
 *  Il committente ha visto l'anello azzurro spostato in alto a sinistra
 *  rispetto al foro che lo contiene, con una mezzaluna scura sotto. Questo
 *  attrezzo non conta pixel: proietta la GEOMETRIA. Contare pixel su questa
 *  scena si e' gia' rotto tre volte, perche' il conteggio prendeva dentro il
 *  riflesso sul lastricato, l'alone del bloom o la barra dei menu.
 *
 *  Si proiettano i VERTICI veri dei due pezzi sullo schermo e si prende il
 *  centro del rettangolo che li contiene: e' la stessa cosa che fa l'occhio
 *  quando dice «e' spostato», ma con un numero.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const q = Number(process.argv[2] ?? 0.565)
const nome = process.argv[3] ?? 'centro_faro'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
// si stacca l'aggiornamento a caldo: se qualcuno salva in `src/` mentre si
// misura, la pagina riparte a meta' corsa e la misura muore
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('console', (m) => { const t = m.text(); if (/\[faro\]/.test(t)) console.log('  >', t.slice(0, 200)) })
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => console.log('  (asset non tutti pronti)'))
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / 40)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}
for (let i = 0; i < 60; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

const misura = await p.evaluate(() => {
  const e = window.esperienza, T = window.__THREE
  const cam = e.camera
  cam.updateMatrixWorld()
  const W = innerWidth, H = innerHeight

  /** proietta i vertici veri di un oggetto e restituisce il rettangolo in px */
  function riquadro(obj) {
    if (!obj) return null
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, n = 0
    const v = new T.Vector3()
    obj.updateWorldMatrix(true, true)
    obj.traverse((o) => {
      const g = o.geometry
      if (!g || !g.attributes || !g.attributes.position) return
      const pos = g.attributes.position
      // si campiona: una guida di luce puo' avere decine di migliaia di
      // vertici e non serve tutta per un rettangolo
      const passo = Math.max(1, Math.floor(pos.count / 4000))
      for (let i = 0; i < pos.count; i += passo) {
        v.fromBufferAttribute(pos, i)
        o.localToWorld(v)
        v.project(cam)
        const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H
        if (!isFinite(x) || !isFinite(y)) continue
        if (x < minx) minx = x; if (x > maxx) maxx = x
        if (y < miny) miny = y; if (y > maxy) maxy = y
        n++
      }
    })
    if (!n) return null
    return {
      cx: +((minx + maxx) / 2).toFixed(1), cy: +((miny + maxy) / 2).toFixed(1),
      larg: +(maxx - minx).toFixed(1), alt: +(maxy - miny).toFixed(1), vertici: n,
    }
  }

  /** il centro e il raggio dell'oggetto in 3D, in coordinate mondo */
  function solido(obj) {
    if (!obj) return null
    const bb = new T.Box3().setFromObject(obj)
    const c = new T.Vector3(), s = new T.Vector3()
    bb.getCenter(c); bb.getSize(s)
    return { c: c.toArray().map((v) => +v.toFixed(4)), s: s.toArray().map((v) => +v.toFixed(4)) }
  }

  const ottica = e.scena.getObjectByName('OTTICA_FARO_DX')
  const pezzi = {}
  if (ottica) ottica.traverse((o) => { if (o.geometry && o.name) pezzi[o.name] = o })

  const auto = e.autoVera

  const out = { camera: cam.position.toArray().map((v) => +v.toFixed(3)), viewport: [W, H], px: {}, mondo: {} }
  const elenco = { ...pezzi }
  if (ottica) elenco['OTTICA_FARO_DX'] = ottica
  // tutto quello che nella vettura ha un nome: lo zoccolo di riferimento e la
  // ghiera che disegna il foro vero
  if (auto) auto.traverse((o) => { if (o.geometry && o.name && !elenco[o.name]) elenco['AUTO/' + o.name] = o })
  for (const [k, o] of Object.entries(elenco)) {
    out.px[k] = riquadro(o)
    out.mondo[k] = solido(o)
  }
  return out
})

console.log(JSON.stringify(misura, null, 1))

const g = misura.px['FARO_GUIDA']
for (const rif of ['AUTO/OTTICA_BORDO', 'AUTO/FARO_DX']) {
  const z = misura.px[rif]
  if (!g || !z) continue
  console.log(`\nSCARTO anello luminoso rispetto a ${rif}, in pixel:`)
  console.log('  dx =', +(g.cx - z.cx).toFixed(1), ' dy =', +(g.cy - z.cy).toFixed(1),
    ' modulo =', +Math.hypot(g.cx - z.cx, g.cy - z.cy).toFixed(1))
  console.log('  anello', g.larg, 'x', g.alt, ' - riferimento', z.larg, 'x', z.alt)
  const a = misura.mondo['FARO_GUIDA'], w = misura.mondo[rif]
  if (a && w) console.log('  in metri:', [0, 1, 2].map((i) => +(a.c[i] - w.c[i]).toFixed(4)))
}
await p.screenshot({ path: `C:/Users/Giuseppe/Webingegno/velocity/docs/provini/${nome}.jpeg`, type: 'jpeg', quality: 90 })
await b.close()
