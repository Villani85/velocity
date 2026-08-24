/** IL PASSARUOTA E' UN INCAVO, NON UN RIGONFIAMENTO.
 *  Avevo cercato i massimi della semilarghezza e ottenuto le ruote nel posto
 *  sbagliato. Il committente ha cerchiato sul provino l'arco vero, che sta
 *  altrove: la carrozzeria SI SCAVA per far posto alla ruota, quindi lungo la
 *  fiancata la semilarghezza CROLLA. Qui il profilo per fasce di quota, in
 *  modo da vedere a che altezza l'incavo si apre e dove sta. */
import { readFileSync } from 'fs'
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
const P = [], v = new THREE.Vector3()
for (let i = 0; i < pos.count; i++) P.push(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).clone())
const box = new THREE.Box3().setFromPoints(P), size = new THREE.Vector3(); box.getSize(size)
const k = 4.3 / size.x
P.forEach(p => p.multiplyScalar(k)); box.setFromPoints(P)
const L = box.max.x - box.min.x, H = box.max.y - box.min.y, cz = (box.min.z + box.max.z) / 2

const N = 86
console.log(`vettura L ${L.toFixed(2)} H ${H.toFixed(3)}   (coda a sinistra, muso a destra)\n`)
const bande = [[0.03, 0.12], [0.12, 0.22], [0.22, 0.32], [0.32, 0.42], [0.42, 0.55]]
const profili = []
for (const [a, b] of bande) {
  const semi = new Array(N).fill(0)
  for (const p of P) {
    const q = (p.y - box.min.y) / H
    if (q < a || q > b) continue
    const d = Math.abs(p.z - cz)
    const f = Math.min(N - 1, Math.floor((p.x - box.min.x) / L * N))
    if (d > semi[f]) semi[f] = d
  }
  profili.push(semi)
  const M = Math.max(...semi)
  const riga = semi.map(x => { const r = x / M
    return r > 0.96 ? '#' : r > 0.88 ? '+' : r > 0.76 ? '.' : r > 0.5 ? '-' : r > 0 ? ':' : ' ' }).join('')
  console.log(`  quota ${(a * H).toFixed(2)}-${(b * H).toFixed(2)} m  |${riga}|  max ${M.toFixed(3)}`)
}
/* L'INCAVO: dove la fascia BASSA e' molto piu' stretta di quella ALTA.
   E' la definizione geometrica di «la carrozzeria sporge sopra la ruota». */
const bassa = profili[0], alta = profili[3]
const Ma = Math.max(...alta)
const scarto = bassa.map((b, i) => (alta[i] > 0 ? (alta[i] - b) / Ma : 0))
const riga = scarto.map(s => s > 0.34 ? '#' : s > 0.24 ? '+' : s > 0.15 ? '.' : s > 0.07 ? '-' : ' ').join('')
console.log(`\n  QUANTO LA CARROZZERIA SPORGE SOPRA IL FONDO (l'incavo):`)
console.log(`  |${riga}|`)
const xa = (i) => box.min.x + (i + 0.5) / N * L
const meta = Math.floor(N / 2)
const picco = (a, b) => { let bi = a, bv = -1; for (let i = a; i < b; i++) if (scarto[i] > bv) { bv = scarto[i]; bi = i }; return { x: xa(bi), v: bv } }
const d = picco(3, meta - 2), f = picco(meta + 2, N - 3)
console.log(`\n  incavo posteriore  x ${d.x.toFixed(3)}  (sporgenza ${(d.v * 100).toFixed(0)}%)`)
console.log(`  incavo anteriore   x ${f.x.toFixed(3)}  (sporgenza ${(f.v * 100).toFixed(0)}%)`)
console.log(`  passo ${(f.x - d.x).toFixed(3)} m = ${((f.x - d.x) / L * 100).toFixed(0)}% della lunghezza`)

/* ---- I DUE BAULETTI, ESTRATTI INVECE CHE STIMATI A OCCHIO ---------------
   Nella fascia BASSA la fiancata ha due blocchi larghi separati da una
   strozzatura; nelle fasce alte il corpo e' largo dappertutto. Quei due
   blocchi SONO i vani ruota: la carrozzeria si allarga li' e solo li' vicino
   al suolo, perche' deve contenere una ruota. */
{
  const bassa2 = profili[0]
  const M = Math.max(...bassa2)
  const dentro = bassa2.map(v => v / M > 0.93)
  const blocchi = []
  let i = 0
  while (i < N) {
    if (!dentro[i]) { i++; continue }
    let j = i
    while (j < N && dentro[j]) j++
    blocchi.push({ da: i, a: j - 1, largo: j - i })
    i = j
  }
  console.log('\n  BLOCCHI LARGHI nella fascia bassa:')
  for (const b of blocchi) {
    const x0 = xa(b.da), x1 = xa(b.a)
    console.log(`    x ${x0.toFixed(3)} .. ${x1.toFixed(3)}   lungo ${(x1 - x0).toFixed(3)} m   centro ${((x0 + x1) / 2).toFixed(3)}`)
  }
  const grandi = blocchi.filter(b => xa(b.a) - xa(b.da) > 0.25).sort((p, q) => p.da - q.da)
  if (grandi.length >= 2) {
    const d2 = grandi[0], f2 = grandi[grandi.length - 1]
    const cd = (xa(d2.da) + xa(d2.a)) / 2, cf = (xa(f2.da) + xa(f2.a)) / 2
    console.log(`\n  => asse posteriore x ${cd.toFixed(3)}   asse anteriore x ${cf.toFixed(3)}`)
    console.log(`     passo ${(cf - cd).toFixed(3)} m = ${((cf - cd) / L * 100).toFixed(0)}% della lunghezza`)
    console.log(`     sbalzo dietro ${(cd - box.min.x).toFixed(3)} m, davanti ${(box.max.x - cf).toFixed(3)} m`)
  }
}
