/**
 * QUANTO E' ONDULATA LA CARROZZERIA — un numero, invece di «sembra ammaccata».
 *
 * Il difetto si vede in un riflesso e non nella silhouette, quindi non si
 * misura guardando la forma: si misura guardando come gira la NORMALE.
 *
 * Per ogni spigolo della maglia si prende l'angolo fra le normali dei due
 * vertici e lo si divide per la lunghezza dello spigolo. Viene una curvatura
 * in radianti al metro, cioe' l'inverso del raggio della superficie in quel
 * punto.
 *
 * Su una fiancata vera il raggio sta fra mezzo metro e qualche metro: 0,3-2
 * rad/m. Un pannello quasi piatto sta sotto 0,5. Sopra i 10 rad/m si e' su un
 * raggio di dieci centimetri, che su una superficie che dovrebbe essere liscia
 * NON e' una forma: e' un'ammaccatura.
 *
 * Quello che conta non e' la media ma la CODA: basta che il 5% degli spigoli
 * sia sopra soglia perche' il riflesso si spezzi dappertutto.
 */
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(process.argv[2] || 'public/modelli/auto_parti.glb')

const perc = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))]

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL')
    const I = prim.getIndices()
    if (!P || !N || !I) continue
    const idx = I.getArray()
    if (idx.length < 300) continue

    const curv = []
    const a = [0, 0, 0], b = [0, 0, 0], na = [0, 0, 0], nb = [0, 0, 0]
    for (let t = 0; t < idx.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const i = idx[t + e], j = idx[t + (e + 1) % 3]
        if (i > j) continue                       // ogni spigolo una volta sola
        P.getElement(i, a); P.getElement(j, b)
        N.getElement(i, na); N.getElement(j, nb)
        const L = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
        if (L < 1e-5) continue
        const d = Math.min(1, Math.max(-1, na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2]))
        curv.push(Math.acos(d) / L)
      }
    }
    if (!curv.length) continue
    curv.sort((x, y) => x - y)
    const sopra = curv.filter((v) => v > 10).length / curv.length
    console.log(
      mesh.getName().padEnd(22),
      'spigoli', String(curv.length).padStart(7),
      '| mediana', perc(curv, 0.5).toFixed(2).padStart(6),
      '| 95%', perc(curv, 0.95).toFixed(1).padStart(7),
      '| 99%', perc(curv, 0.99).toFixed(1).padStart(7),
      '| oltre 10 rad/m:', (sopra * 100).toFixed(1) + '%',
    )
  }
}
