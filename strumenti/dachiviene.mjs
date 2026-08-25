/** DA CHI VIENE — chi possiede quel pixel.
 *
 *  Nasce da un difetto inseguito troppe volte a occhio: una lastra chiara e
 *  squadrata sotto la vettura, che a ogni giro ho attribuito a un materiale
 *  diverso e a ogni giro ho corretto il materiale sbagliato. La luminanza dice
 *  QUANTO e' chiaro un pixel, non CHI l'ha disegnato — e finche' non si sa chi,
 *  ogni cura e' una scommessa.
 *
 *  Qui si tira un raggio dall'obiettivo attraverso una griglia di pixel e si
 *  stampa una mappa: una lettera per oggetto. Non e' una statistica, e' un
 *  catasto — dice il nome del proprietario, e i nomi non si interpretano.
 *
 *  node strumenti/dachiviene.mjs <scorrimento> [x0 y0 x1 y1] [larghezza altezza]
 *  I quattro numeri sono in frazione di schermo (0..1). Senza, prende la
 *  fascia bassa centrale, che e' dove sta il difetto.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const q  = Number(process.argv[2] ?? 0.06)
const x0 = Number(process.argv[3] ?? 0.10), y0 = Number(process.argv[4] ?? 0.45)
const x1 = Number(process.argv[5] ?? 0.90), y1 = Number(process.argv[6] ?? 0.95)
const VL = Number(process.argv[7] ?? 1200), VA = Number(process.argv[8] ?? 750)

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: VL, height: VA }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
// LE RUOTE VERE, se no si cataloga uno stato transitorio: la trappola e' gia'
// scritta in `uno.mjs` e costa un'ora ogni volta che ci si ricasca.
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 120000 }).catch(() => console.log('  (ATTENZIONE: ruote di segnale)'))
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / 40)])
  await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
}
for (let i = 0; i < 60; i++) await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))

const esito = await p.evaluate(async ([x0, y0, x1, y1]) => {
  const THREE = window.__three ?? (await import('/node_modules/three/build/three.module.js'))
  const e = window.esperienza
  const rc = new THREE.Raycaster()
  // I PIANI DELL'INTERFACCIA NON SI CONTANO. Il carosello e il quadro stanno su
  // un layer loro e non c'entrano con quello che si vede sotto la vettura.
  rc.layers.set(0)
  const COL = 78, RIG = 26
  const mappa = [], nomi = new Map(), dettagli = new Map(), punti = []
  const lettere = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let r = 0; r < RIG; r++) {
    let riga = ''
    for (let c = 0; c < COL; c++) {
      const fx = x0 + (x1 - x0) * (c / (COL - 1))
      const fy = y0 + (y1 - y0) * (r / (RIG - 1))
      rc.setFromCamera(new THREE.Vector2(fx * 2 - 1, -(fy * 2 - 1)), e.camera)
      const hit = rc.intersectObject(e.scena, true)
        // via le cose che non si vedono: invisibili, o opacita' zero
        .filter(h => {
          let o = h.object
          while (o) { if (!o.visible) return false; o = o.parent }
          const m = h.object.material
          if (!m) return false
          if (m.transparent && (m.opacity ?? 1) <= 0.02) return false
          return true
        })[0]
      if (!hit) { riga += '.'; continue }
      const o = hit.object
      // il nome buono e' il primo che qualcuno ha scritto risalendo l'albero
      let nome = o.name, n = o
      while (!nome && n.parent) { n = n.parent; nome = n.name }
      nome = nome || ('(senza nome) ' + o.type)
      if (!nomi.has(nome)) {
        nomi.set(nome, lettere[nomi.size % lettere.length])
        const m = o.material
        dettagli.set(nome, {
          tipo: m.type,
          colore: m.color ? m.color.getHexString() : null,
          emissivo: m.emissive ? m.emissive.getHexString() : null,
          forza: m.emissiveIntensity ?? null,
          ruvido: m.roughness ?? null,
          metallo: m.metalness ?? null,
          opacita: m.opacity ?? null,
          trasp: !!m.transparent,
          lati: m.side,
          toni: m.toneMapped,
          dist: +hit.distance.toFixed(2),
          y: +hit.point.y.toFixed(3),
        })
      }
      riga += nomi.get(nome)
      punti.push([Math.round(fx * innerWidth), Math.round(fy * innerHeight), nome])
    }
    mappa.push(riga)
  }
  return { mappa, nomi: [...nomi], dettagli: [...dettagli], punti }
}, [x0, y0, x1, y1])

console.log('\n  catasto della fascia x[' + x0 + '..' + x1 + '] y[' + y0 + '..' + y1 + ']\n')
for (const r of esito.mappa) console.log('  ' + r)
console.log('')
for (const [nome, lettera] of esito.nomi) {
  const d = esito.dettagli.find(x => x[0] === nome)[1]
  console.log('  ' + lettera + ' = ' + nome)
  console.log('      ' + d.tipo + '  col#' + d.colore + '  emi#' + d.emissivo + ' x' + d.forza +
    '  ruv=' + d.ruvido + ' met=' + d.metallo + '  op=' + d.opacita + (d.trasp ? ' trasp' : '') +
    '  lati=' + d.lati + ' toni=' + d.toni + '  dist=' + d.dist + ' y=' + d.y)
}

/* E QUI LE DUE COSE SI UNISCONO. Il catasto da solo dice CHI possiede il pixel,
   la luminanza da sola dice QUANTO e' chiaro: nessuna delle due, presa da sola,
   risponde alla domanda «chi e' la lastra chiara». Separate mi hanno gia' fatto
   correggere due volte il materiale sbagliato — la prima l'emissione delle
   ruote di segnale, che nel fotogramma non c'erano; la seconda l'emissione di
   questa stessa minigonna, che contribuisce il nove per cento.
   Il differenziale — scattare con e senza il pezzo — sembra piu' diretto e non
   funziona: l'esposizione automatica insegue la luminanza media della scena,
   quindi togliere un oggetto sposta TUTTO il fotogramma e il riquadro delle
   differenze esce grande quanto lo schermo. Verificato: x[25..1152] su 1200. */
await p.screenshot({ path: 'C:/Users/Giuseppe/Webingegno/velocity/docs/provini/_catasto.png', type: 'png' })
// sharp non sta nel progetto: si risolve dove node lo trova, non da un percorso a mano
const { createRequire } = await import('node:module')
const sharp = createRequire(import.meta.url)('sharp')
const img = await sharp('C:/Users/Giuseppe/Webingegno/velocity/docs/provini/_catasto.png').raw().toBuffer({ resolveWithObject: true })
const W = img.info.width, CH = img.info.channels
const per = new Map()
for (const [px, py, nome] of esito.punti) {
  const i = (py * W + px) * CH
  const l = 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]
  if (!per.has(nome)) per.set(nome, [])
  per.get(nome).push(l)
}
console.log('')
console.log('  luminanza per proprietario (sugli stessi punti del catasto)')
console.log('')
const righe = [...per].map(([n, v]) => {
  v.sort((a, b) => a - b)
  return { n, q: v.length, med: v[v.length >> 1], p90: v[Math.floor(v.length * 0.9)], max: v[v.length - 1] }
}).sort((a, b) => b.med - a.med)
for (const r of righe) {
  console.log('  ' + r.n.padEnd(18) + ' n=' + String(r.q).padStart(5) +
    '  mediana ' + r.med.toFixed(1).padStart(6) + '  p90 ' + r.p90.toFixed(1).padStart(6) +
    '  max ' + r.max.toFixed(0).padStart(4))
}
await b.close()
