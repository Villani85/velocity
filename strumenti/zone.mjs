/** DOVE TAGLIARE LA MESH UNICA IN ZONE DI MATERIALE.
 *  Il modello ha una sola mesh `AUTO`: carrozzeria, vetri, prese e trim sono
 *  lo stesso materiale, ed e' il rilievo n.1 del revisore («un solo materiale
 *  su tutto: questo da solo urla CG»). Prima di tagliare bisogna sapere DOVE,
 *  e non a occhio. Questo misura, per fascia di quota, quanta superficie
 *  guarda in alto e quanto sta vicino alla mezzeria: una calotta di abitacolo
 *  e' precisamente area rivolta al cielo, alta e centrale. */
import { readFileSync } from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })

const FILE = process.argv[2] ?? 'public/modelli/auto2.glb', LUNG = 4.4
await MeshoptDecoder.ready
const buf = readFileSync(FILE)
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((res, rej) => loader.parse(ab, '', res, rej))
g.scene.updateMatrixWorld(true)

let mesh = null, maxv = -1
g.scene.traverse(o => { if (o.isMesh) { const v = o.geometry.attributes.position.count; if (v > maxv) { maxv = v; mesh = o } } })
console.log(`mesh piu' grande: ${mesh.name}  ${maxv} vertici`)

const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal
const M = mesh.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(M)
const P = [], N = [], v = new THREE.Vector3(), n = new THREE.Vector3()
for (let i = 0; i < pos.count; i++) {
  P.push(v.fromBufferAttribute(pos, i).applyMatrix4(M).clone())
  N.push(n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize().clone())
}
const box = new THREE.Box3().setFromPoints(P), size = new THREE.Vector3()
box.getSize(size)
const k = LUNG / Math.max(size.x, size.y, size.z)
P.forEach(p => p.multiplyScalar(k))
box.setFromPoints(P); box.getSize(size)
const c = new THREE.Vector3(); box.getCenter(c)
/* asse lungo = lunghezza vettura, asse corto orizzontale = larghezza */
const assi = [['x', size.x], ['y', size.y], ['z', size.z]].sort((a, b) => b[1] - a[1])
console.log(`ingombro reale  ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)} m`)
console.log(`asse lunghezza=${assi[0][0]}  larghezza=${assi[1][0]}  altezza=${assi[2][0]}`)

const H = size.y, y0 = box.min.y
const F = 12
const tot = new Array(F).fill(0), su = new Array(F).fill(0), lat = new Array(F).fill(0)
for (let i = 0; i < P.length; i++) {
  const f = Math.min(F - 1, Math.floor((P[i].y - y0) / H * F))
  tot[f]++
  if (N[i].y > 0.55) su[f]++
  lat[f] += Math.abs(P[i].x - c.x)
}
console.log('\n fascia   quota da terra   vertici   guarda-su   |x| medio')
for (let f = 0; f < F; f++) {
  const q = (y0 + H * f / F) - box.min.y
  console.log(`  ${String(f).padStart(2)}      ${q.toFixed(3)} m      ${String(tot[f]).padStart(6)}     ${String(Math.round(su[f] / Math.max(1, tot[f]) * 100)).padStart(4)}%    ${(lat[f] / Math.max(1, tot[f])).toFixed(3)}`)
}

/* ---- LA LINEA DI CINTURA -------------------------------------------------
   La calotta non si trova col colore (l'albedo e' nero quasi ovunque) ne' con
   la sola quota (a quella quota c'e' anche il cofano). Si trova dove la
   vettura si STRINGE: sopra la cintura la semilarghezza crolla, perche' il
   vetro e' rientrato rispetto alla spalla. Qui la semilarghezza reale (asse z)
   e l'estensione longitudinale, fascia per fascia. */
const semiL = new Array(F).fill(0), cnt = new Array(F).fill(0)
const xmin = new Array(F).fill(1e9), xmax = new Array(F).fill(-1e9)
for (let i = 0; i < P.length; i++) {
  const f = Math.min(F - 1, Math.floor((P[i].y - y0) / H * F))
  semiL[f] += Math.abs(P[i].z - c.z); cnt[f]++
  if (P[i].x < xmin[f]) xmin[f] = P[i].x
  if (P[i].x > xmax[f]) xmax[f] = P[i].x
}
const maxSemi = Math.max(...semiL.map((s, f) => s / Math.max(1, cnt[f])))
console.log('\n fascia   quota     semilarghezza   % del max   estensione in lunghezza')
for (let f = 0; f < F; f++) {
  const s = semiL[f] / Math.max(1, cnt[f])
  const q = (y0 + H * f / F) - box.min.y
  const est = cnt[f] ? `${(xmin[f] - box.min.x).toFixed(2)} .. ${(xmax[f] - box.min.x).toFixed(2)} m` : '-'
  console.log(`  ${String(f).padStart(2)}     ${q.toFixed(3)}      ${s.toFixed(3)} m       ${String(Math.round(s / maxSemi * 100)).padStart(3)}%      ${est}`)
}
