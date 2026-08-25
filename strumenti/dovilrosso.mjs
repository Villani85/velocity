/** DOVE STA IL FANALE — che non e' un oggetto, e' un colore.
 *
 *  La revisione: «il fanale posteriore resta una barra rossa dipinta al centro
 *  esatto della composizione». Sondando la scena si scopre che ha ragione alla
 *  lettera: fra le mesh dell'automobile non esiste nessun fanale. Il rosso vive
 *  dentro `auto2r_col2.webp`, cioe' e' un pixel della carrozzeria.
 *
 *  Per sostituirlo con un oggetto vero servono le sue coordinate NEL MONDO, e
 *  non si possono leggere dalla tessitura: la tessitura sa dove sta il rosso in
 *  UV, non dove quel pezzo di superficie finisce nello spazio.
 *
 *  Il ponte fra le due cose sono i vertici. Si scorrono i triangoli della
 *  scocca, si campiona la mappa colore alle UV di ogni vertice, e si tengono
 *  quelli che cadono sul rosso. La nuvola di punti che ne esce E' il fanale, in
 *  metri.
 *
 *  IL CRITERIO DEL ROSSO non e' «R alto»: una vernice illuminata da lampade
 *  calde ha R alto dappertutto. E' R molto piu' alto di G E di B insieme —
 *  cioe' saturo — che e' l'unica firma che una plastica rossa ha e una lamiera
 *  scura no. La solita regola: un criterio deve separare due popolazioni, non
 *  descriverne una.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ' + e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.waitForTimeout(2500)

const esito = await p.evaluate(async () => {
  const scocca = []
  esperienza.autoVera.traverse((o) => {
    if (o.isMesh && o.material && o.material.name === 'SCOCCA') scocca.push(o)
  })
  if (!scocca.length) return { errore: 'nessuna mesh SCOCCA' }
  const mappa = scocca[0].material.map
  if (!mappa || !mappa.image) return { errore: 'la scocca non ha mappa colore' }

  // si legge la mappa dentro una tela, che e' l'unico modo di campionarla da qui
  const im = mappa.image
  const L = im.width
  const A = im.height
  const tela = document.createElement('canvas')
  tela.width = L
  tela.height = A
  const c = tela.getContext('2d', { willReadFrequently: true })
  c.drawImage(im, 0, 0)
  const dati = c.getImageData(0, 0, L, A).data

  const rosso = (u, v) => {
    /* LE UV DEL glTF HANNO L'ORIGINE IN ALTO A SINISTRA e la tela pure, quindi
       qui NON si rovescia la v. E' la stessa convenzione di `flipY = false` con
       cui la mappa e' caricata: rovesciarla qui vorrebbe dire cercare il fanale
       specchiato sull'altra meta' della vettura, e trovarci lamiera. */
    const x = Math.min(L - 1, Math.max(0, Math.round(u * L)))
    const y = Math.min(A - 1, Math.max(0, Math.round(v * A)))
    const i = (y * L + x) * 4
    const R = dati[i]
    const G = dati[i + 1]
    const B = dati[i + 2]
    // saturo nel rosso: molto piu' di verde E di blu
    return R > 90 && R - G > 55 && R - B > 55
  }

  const punti = []
  const V = new window.__THREE.Vector3()
  for (const m of scocca) {
    const pos = m.geometry.attributes.position
    const uv = m.geometry.attributes.uv
    if (!uv) continue
    m.updateWorldMatrix(true, false)
    for (let i = 0; i < pos.count; i++) {
      if (!rosso(uv.getX(i), uv.getY(i))) continue
      V.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
      punti.push([V.x, V.y, V.z])
    }
  }
  if (!punti.length) return { errore: 'nessun vertice cade sul rosso', mappa: L + 'x' + A }

  /* IL GRUPPO PRINCIPALE, non tutta la nuvola.
     La scatola di TUTTI i vertici rossi e' larga tre metri, e non descrive
     niente: dentro ci sono il fanale vero e una manciata di texel rossi sparsi
     altrove (le UV di una carrozzeria generata non sono ordinate). Una scatola
     che contiene due popolazioni non e' la misura di nessuna delle due — la
     stessa trappola di sempre.
     Si tiene il gruppo piu' fitto lungo l'asse lungo: si fa l'istogramma su x,
     si prende la colonna piu' popolata e si allarga finche' i vicini
     contribuiscono. */
  const XS = punti.map((q) => q[0]).sort((u, v) => u - v)
  const x0 = XS[0]
  const x1 = XS[XS.length - 1]
  const N = 60
  const cesti = new Array(N).fill(0)
  for (const q of punti) cesti[Math.min(N - 1, Math.floor(((q[0] - x0) / (x1 - x0 || 1)) * N))]++
  let capo = 0
  for (let k = 1; k < N; k++) if (cesti[k] > cesti[capo]) capo = k
  let da = capo
  let a2 = capo
  const minimo = cesti[capo] * 0.12
  while (da > 0 && cesti[da - 1] >= minimo) da--
  while (a2 < N - 1 && cesti[a2 + 1] >= minimo) a2++
  const larghezzaCesto = (x1 - x0) / N
  const xDa = x0 + da * larghezzaCesto
  const xA = x0 + (a2 + 1) * larghezzaCesto
  const gruppo = punti.filter((q) => q[0] >= xDa && q[0] <= xA)

  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  const somma = [0, 0, 0]
  for (const q of gruppo) {
    for (let k = 0; k < 3; k++) {
      if (q[k] < min[k]) min[k] = q[k]
      if (q[k] > max[k]) max[k] = q[k]
      somma[k] += q[k]
    }
  }
  return {
    mappa: L + 'x' + A,
    vertici: punti.length,
    nelGruppo: gruppo.length,
    min: min.map((x) => +x.toFixed(3)),
    max: max.map((x) => +x.toFixed(3)),
    centro: somma.map((x) => +(x / gruppo.length).toFixed(3)),
    misura: [0, 1, 2].map((k) => +(max[k] - min[k]).toFixed(3)),
  }
})

console.log(JSON.stringify(esito, null, 1))
await b.close()
