/** LA MASCHERA DELL'ARCO, per togliere il segno solo dove sta.
 *
 *  Il difetto: sopra la ruota, sulla carrozzeria, corre una linea ad arco che
 *  disegna il passaruota. Isolata spegnendo la normal map della scocca: con
 *  `normalScale 0` sparisce, quindi e' COTTA in `auto2r_nor.webp` — e' l'arco
 *  del modello generato, rimasto impresso nella mappa.
 *  Non si puo' abbassare la scala e basta: quella mappa porta anche le fughe
 *  fra i pannelli, le prese d'aria e le griglie, che sono l'unico rilievo
 *  vero che questa carrozzeria abbia.
 *
 *  Quindi si costruisce una maschera in spazio UV dei soli triangoli che
 *  stanno nella corona intorno a ciascun asse — cioe' dove il passaruota
 *  verrebbe disegnato — e li' la normale si riporta a piatta, sfumando ai
 *  bordi perche' un taglio netto in una normal map si vede come una crepa.
 */
import { readFileSync } from 'fs'
import sharp from 'sharp'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })

await MeshoptDecoder.ready
const buf = readFileSync('public/modelli/auto2.glb')
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((r, j) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', r, j))
g.scene.updateMatrixWorld(true)
let mesh = null, mx = -1
g.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > mx) { mx = o.geometry.attributes.position.count; mesh = o } })
const pos = mesh.geometry.attributes.position
const uv = mesh.geometry.attributes.uv
const idx = mesh.geometry.index

const P = [], v = new THREE.Vector3()
for (let i = 0; i < pos.count; i++) P.push(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).clone())
const box = new THREE.Box3().setFromPoints(P), size = new THREE.Vector3(); box.getSize(size)
const k = 4.3 / size.x
P.forEach(p => p.multiplyScalar(k)); box.setFromPoints(P)
const L = box.max.x - box.min.x, H = box.max.y - box.min.y
const cz = (box.min.z + box.max.z) / 2

/* GLI ASSI: stesso criterio di `Ruote.trovaArchi` — nella fascia bassa la
   fiancata si allarga in due punti soli, i bauletti che contengono una ruota. */
const N = 86
const semi = new Array(N).fill(0)
for (const p of P) {
  const q = (p.y - box.min.y) / H
  if (q < 0.03 || q > 0.12) continue
  const f = Math.min(N - 1, Math.floor((p.x - box.min.x) / L * N))
  const d = Math.abs(p.z - cz)
  if (d > semi[f]) semi[f] = d
}
const largo = Math.max(...semi)
const dentro = semi.map(x => x / largo > 0.93)
const blocchi = []
for (let i = 0; i < N;) { if (!dentro[i]) { i++; continue }
  let j = i; while (j < N && dentro[j]) j++
  blocchi.push([i, j - 1]); i = j }
const xa = (i) => box.min.x + (i + 0.5) / N * L
const grandi = blocchi.filter(b => xa(b[1]) - xa(b[0]) > 0.25)
const ASSI = [ (xa(grandi[0][0]) + xa(grandi[0][1])) / 2,
               (xa(grandi[grandi.length - 1][0]) + xa(grandi[grandi.length - 1][1])) / 2 ]
/* IL CENTRO DELLA RUOTA sta al raggio sopra il suolo, non al centro del corpo */
const RAGGIO = 0.354
const yRuota = box.min.y + RAGGIO
console.log('assi x', ASSI.map(a => +a.toFixed(3)), ' quota mozzo', +yRuota.toFixed(3))

/* LA CORONA: fra 0,88 e 1,55 raggi ruota dal mozzo. Sotto c'e' la ruota,
   sopra c'e' carrozzeria pulita; in mezzo passa l'arco disegnato. */
const R0 = RAGGIO * Number(process.argv[2] ?? 0.80), R1 = RAGGIO * Number(process.argv[3] ?? 1.95)
const S = 2048
const mask = new Float32Array(S * S)
const Pt = new Float64Array(6)
let colpiti = 0
for (let t = 0; t < idx.count; t += 3) {
  const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2)
  const cx = (P[a].x + P[b].x + P[c].x) / 3
  const cy = (P[a].y + P[b].y + P[c].y) / 3
  const czz = (P[a].z + P[b].z + P[c].z) / 3
  // solo il fianco: l'arco si disegna sulla fiancata, non sul tetto o sotto
  if (Math.abs(czz - cz) < largo * Number(process.argv[4] ?? 0.42)) continue
  let vicino = false
  for (const ax of ASSI) {
    const d = Math.hypot(cx - ax, cy - yRuota)
    if (d > R0 && d < R1) { vicino = true; break }
  }
  if (!vicino) continue
  colpiti++
  for (let k2 = 0; k2 < 3; k2++) {
    const i = [a, b, c][k2]
    Pt[k2 * 2] = uv.getX(i) * S
    Pt[k2 * 2 + 1] = uv.getY(i) * S
  }
  const x0 = Math.max(0, Math.floor(Math.min(Pt[0], Pt[2], Pt[4])) - 1)
  const x1 = Math.min(S - 1, Math.ceil(Math.max(Pt[0], Pt[2], Pt[4])) + 1)
  const y0 = Math.max(0, Math.floor(Math.min(Pt[1], Pt[3], Pt[5])) - 1)
  const y1 = Math.min(S - 1, Math.ceil(Math.max(Pt[1], Pt[3], Pt[5])) + 1)
  const d2 = (Pt[2] - Pt[0]) * (Pt[5] - Pt[1]) - (Pt[4] - Pt[0]) * (Pt[3] - Pt[1])
  if (Math.abs(d2) < 1e-9) continue
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5
    const w0 = ((Pt[2] - px) * (Pt[5] - py) - (Pt[4] - px) * (Pt[3] - py)) / d2
    const w1 = ((Pt[4] - px) * (Pt[1] - py) - (Pt[0] - px) * (Pt[5] - py)) / d2
    if (w0 >= -0.03 && w1 >= -0.03 && 1 - w0 - w1 >= -0.03) mask[y * S + x] = 1
  }
}
console.log('triangoli nella corona:', colpiti, ' texel:', mask.reduce((s, v2) => s + v2, 0))

const bytes = Buffer.alloc(S * S)
for (let i = 0; i < mask.length; i++) bytes[i] = mask[i] ? 255 : 0
await sharp(bytes, { raw: { width: S, height: S, channels: 1 } })
  .blur(Number(process.argv[5] ?? 12))               // sfuma: un taglio netto in una normal map si vede
  .png().toFile(process.argv[6] ?? 'public/texture/_maschera_arco.png')
await sharp(bytes, { raw: { width: S, height: S, channels: 1 } })
  .resize(420, 420).png().toFile('docs/provini/maschera_arco.png')
console.log('maschera scritta')
