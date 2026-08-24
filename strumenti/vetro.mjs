/** TROVARE IL VETRO DENTRO LA MESH UNICA.
 *  La calotta non si distingue dalla geometria (alto+centrale prende anche
 *  cofano e coda). Ma la texture cotta i finestrini li ha gia' dipinti scuri:
 *  quello e' il segnale. Per ogni vertice: quota reale + luminanza dell'albedo
 *  campionato alla sua UV. Se nella fascia alta la luminanza e' BIMODALE,
 *  il vetro e' separabile senza rimodellare niente. */
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

const { data, info } = await sharp('public/texture/auto2r_col.webp').raw().toBuffer({ resolveWithObject: true })
const W = info.width, Hh = info.height, CH = info.channels
const pos = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv
const P = [], v = new THREE.Vector3()
for (let i = 0; i < pos.count; i++) P.push(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).clone())
const box = new THREE.Box3().setFromPoints(P), size = new THREE.Vector3(); box.getSize(size)
const k = 4.4 / Math.max(size.x, size.y, size.z)
P.forEach(p => p.multiplyScalar(k)); box.setFromPoints(P)
const y0 = box.min.y, HT = box.max.y - box.min.y

function luma(i) {
  const u = uv.getX(i), w = uv.getY(i)
  const px = Math.min(W - 1, Math.max(0, Math.round(u * W)))
  const py = Math.min(Hh - 1, Math.max(0, Math.round((1 - w) * Hh)))
  const o = (py * W + px) * CH
  return 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
}

/* istogramma della luminanza nella fascia alta vs in quella bassa */
for (const [nome, lo, hi] of [['ALTA  (>0.55 m)', 0.55, 9], ['BASSA (<0.35 m)', -9, 0.35]]) {
  const bins = new Array(16).fill(0); let tot = 0
  for (let i = 0; i < pos.count; i++) {
    const q = P[i].y - y0
    if (q < lo || q > hi) continue
    bins[Math.min(15, Math.floor(luma(i) / 16))]++; tot++
  }
  console.log(`\n${nome}  ${tot} vertici`)
  bins.forEach((b, j) => {
    if (!b) return
    console.log(`  luma ${String(j * 16).padStart(3)}-${String(j * 16 + 15).padStart(3)}  ${String(b).padStart(6)}  ${'#'.repeat(Math.round(b / tot * 60))}`)
  })
}
/* quanti vertici sono ALTI e SCURI insieme: candidati vetro */
let cand = 0
const soglie = [32, 48, 64, 80]
console.log('\nvertici alti (>0.55 m) sotto soglia di luminanza:')
for (const s of soglie) {
  cand = 0
  for (let i = 0; i < pos.count; i++) if (P[i].y - y0 > 0.55 && luma(i) < s) cand++
  console.log(`  luma < ${String(s).padStart(3)}   ${String(cand).padStart(6)} vertici  (${(cand / pos.count * 100).toFixed(1)}% della mesh)`)
}
