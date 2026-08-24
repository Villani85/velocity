/**
 * L'ONDULAZIONE E' NELLA FORMA O NELLE NORMALI? — la domanda che decide se si
 * rifa' il modello o si corregge una riga.
 *
 * `strumenti/ondulazione.mjs` dice QUANTO ondeggia la carrozzeria: mediana
 * 5,40 rad/m e il 38,8% degli spigoli sopra 10, dove una fiancata vera sta fra
 * 0,3 e 2. Ma non dice DA DOVE viene, e le due cause possibili chiedono due
 * lavori incomparabili:
 *
 *   se ondeggia la GEOMETRIA — i vertici stanno davvero su una superficie
 *   bitorzoluta — non c'e' materiale ne' luce che la salvi, e va rigenerato il
 *   modello: mezza giornata, piu' il taglio in pezzi, l'ottimizzazione e la
 *   riverifica dell'attraversamento;
 *
 *   se ondeggiano solo le NORMALI — la forma e' liscia ma il vettore che dice
 *   «da che parte guarda la superficie» e' rumoroso — si ricalcolano al
 *   caricamento e costa dieci righe.
 *
 * IL SOSPETTO CHE HA FATTO NASCERE QUESTO STRUMENTO. Il file e' compresso con
 * `KHR_mesh_quantization`: le normali non sono tre numeri in virgola mobile,
 * sono tre interi corti. La risoluzione angolare che ne esce e' di frazioni di
 * grado, e la curvatura si ottiene DIVIDENDO quell'angolo per la lunghezza
 * dello spigolo — che su una maglia da 176.000 spigoli su 4,5 metri e' di
 * pochi millimetri. Dividere un errore piccolo per un numero piccolissimo da'
 * un numero grande: l'ondulazione misurata potrebbe essere, in buona parte,
 * l'errore di quantizzazione e non una forma.
 *
 * COME SI DECIDE. Si misura la stessa cosa due volte sullo stesso file: una
 * con le normali COSI' COME SONO NEL FILE, una con le normali RICALCOLATE
 * dalle posizioni — media delle normali delle facce che toccano il vertice,
 * cioe' quello che fa qualunque motore quando gliele si chiede. Le posizioni
 * sono le stesse in tutti e due i casi, quindi se il secondo numero e' molto
 * piu' basso l'ondulazione non e' nella forma.
 */
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(process.argv[2] || 'public/modelli/auto2.glb')

const perc = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))]

/* LE COMPONENTI SI LEGGONO CON `getElement`, NON CON `getArray`.
   Prima versione: `getArray()`, e tutti i numeri venivano ZERO. Con
   `KHR_mesh_quantization` quell'array e' di interi grezzi — le normali stanno
   su interi corti, cioe' valori attorno a 32767 — quindi il prodotto scalare
   di due normali vale un miliardo, il clamp lo porta a 1 e l'arcocoseno di 1
   fa zero. Un metro che restituisce zero dappertutto, e non un errore.
   `getElement` applica la dequantizzazione dichiarata nell'accessore e rende i
   numeri veri. La sesta volta stanotte che una misura plausibile era una
   misura rotta — qui si e' vista subito solo perche' «zero ovunque» e' un
   risultato impossibile, non perche' io sia stato piu' attento. */

/** la curvatura su ogni spigolo, in radianti al metro */
function curvature(P, N, idx) {
  const fuori = []
  const a = [0, 0, 0], b = [0, 0, 0], na = [0, 0, 0], nb = [0, 0, 0]
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const i = idx[t + e], j = idx[t + (e + 1) % 3]
      if (i > j) continue                       // ogni spigolo una volta sola
      P.getElement(i, a); P.getElement(j, b)
      N(i, na); N(j, nb)
      const L = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
      // spigoli degeneri: dividere per zero non e' una misura
      if (L < 1e-5) continue
      const d = Math.min(1, Math.max(-1, na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2]))
      fuori.push(Math.acos(d) / L)
    }
  }
  fuori.sort((x, y) => x - y)
  return fuori
}

/** le normali che il motore calcolerebbe da solo, dalle sole posizioni */
function normaliDaPosizioni(P, idx, n) {
  const out = new Float32Array(n * 3)
  const ax = new Float32Array(3)
  const bx = new Float32Array(3)
  const pa = [0, 0, 0], pb = [0, 0, 0], pc = [0, 0, 0]
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2]
    P.getElement(a, pa); P.getElement(b, pb); P.getElement(c, pc)
    for (let k = 0; k < 3; k++) {
      ax[k] = pb[k] - pa[k]
      bx[k] = pc[k] - pa[k]
    }
    // la normale della faccia NON si normalizza prima di sommarla: il suo
    // modulo e' il doppio dell'area, ed e' esattamente il peso giusto — cosi'
    // un triangolo grande conta piu' di una scheggia, che e' quello che
    // impedisce alle schegge di dominare la media
    const nx = ax[1] * bx[2] - ax[2] * bx[1]
    const ny = ax[2] * bx[0] - ax[0] * bx[2]
    const nz = ax[0] * bx[1] - ax[1] * bx[0]
    for (const v of [a, b, c]) {
      out[v * 3] += nx
      out[v * 3 + 1] += ny
      out[v * 3 + 2] += nz
    }
  }
  for (let v = 0; v < n; v++) {
    const L = Math.hypot(out[v * 3], out[v * 3 + 1], out[v * 3 + 2]) || 1
    out[v * 3] /= L
    out[v * 3 + 1] /= L
    out[v * 3 + 2] /= L
  }
  return out
}

const riga = (nome, a) =>
  '  ' + nome.padEnd(24) +
  ' mediana ' + perc(a, 0.5).toFixed(2).padStart(7) +
  ' | 95% ' + perc(a, 0.95).toFixed(1).padStart(7) +
  ' | 99% ' + perc(a, 0.99).toFixed(1).padStart(7) +
  ' | oltre 10 rad/m: ' + (100 * a.filter((v) => v > 10).length / a.length).toFixed(1) + '%'

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION')
    const N = prim.getAttribute('NORMAL')
    const I = prim.getIndices()
    if (!P || !N || !I) continue
    const idx = I.getArray()
    if (idx.length < 300) continue
    const conta = P.getCount()
    console.log(mesh.getName() + '   vertici ' + conta + '   triangoli ' + (idx.length / 3))
    const a = curvature(P, (i, out) => N.getElement(i, out), idx)
    console.log(riga('normali del file', a))
    const ric = normaliDaPosizioni(P, idx, conta)
    const b = curvature(P, (i, out) => { out[0] = ric[i * 3]; out[1] = ric[i * 3 + 1]; out[2] = ric[i * 3 + 2] }, idx)
    console.log(riga('normali ricalcolate', b))
    const g = perc(a, 0.95) / (perc(b, 0.95) || 1)
    console.log('  il 95% scende di ' + g.toFixed(1) + ' volte ricalcolando: ' +
      (g > 2 ? 'L\'ONDULAZIONE E\' NELLE NORMALI, non nella forma'
             : 'la forma ondeggia davvero — ricalcolare non basta'))
    console.log('')
  }
}
