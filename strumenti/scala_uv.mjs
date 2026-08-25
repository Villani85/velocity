/** QUANTO SONO FUORI SCALA LE UV che leggo dalla geometria.
 *  La copertura rasterizzata copre il 56,7% dell'atlante, le isole vere il
 *  26,7%: il doppio. I triangoli non sono spostati, sono TROPPO GRANDI —
 *  che e' la firma di un fattore di scala rimasto appeso alle UV. Si cerca
 *  il fattore che massimizza l'accordo con la maschera vera. */
import { readFileSync } from 'fs'
import sharp from 'sharp'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })

const N = 1024
const { data, info } = await sharp('texture-sorgente/auto2r_orm.webp').resize(N, N, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true })
const VERA = new Uint8Array(N * N)
for (let i = 0; i < N * N; i++) VERA[i] = (data[i * info.channels + 1] > 8 || data[i * info.channels + 2] > 8) ? 1 : 0

await MeshoptDecoder.ready
const buf = readFileSync('public/modelli/auto2.glb')
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((r, j) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', r, j))
let mesh = null, mx = -1
g.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > mx) { mx = o.geometry.attributes.position.count; mesh = o } })
const uv = mesh.geometry.attributes.uv, idx = mesh.geometry.index

let u0 = 9, u1 = -9, v0 = 9, v1 = -9
for (let i = 0; i < uv.count; i++) {
  const u = uv.getX(i), v = uv.getY(i)
  if (u < u0) u0 = u; if (u > u1) u1 = u
  if (v < v0) v0 = v; if (v > v1) v1 = v
}
console.log(`intervallo UV letto:  u ${u0.toFixed(4)} .. ${u1.toFixed(4)}   v ${v0.toFixed(4)} .. ${v1.toFixed(4)}`)
console.log(`normalizzato: tipo ${uv.array.constructor.name}, normalized=${uv.normalized}`)

function copertura(s, ou, ov) {
  const C = new Uint8Array(N * N), P = new Float64Array(6)
  for (let t = 0; t < idx.count; t += 3) {
    for (let k = 0; k < 3; k++) {
      const i = idx.getX(t + k)
      P[k * 2] = (uv.getX(i) * s + ou) * N
      P[k * 2 + 1] = (uv.getY(i) * s + ov) * N
    }
    const x0 = Math.max(0, Math.floor(Math.min(P[0], P[2], P[4]))), x1 = Math.min(N - 1, Math.ceil(Math.max(P[0], P[2], P[4])))
    const y0 = Math.max(0, Math.floor(Math.min(P[1], P[3], P[5]))), y1 = Math.min(N - 1, Math.ceil(Math.max(P[1], P[3], P[5])))
    const d = (P[2] - P[0]) * (P[5] - P[1]) - (P[4] - P[0]) * (P[3] - P[1])
    if (Math.abs(d) < 1e-9) continue
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5
      const w0 = ((P[2] - px) * (P[5] - py) - (P[4] - px) * (P[3] - py)) / d
      const w1 = ((P[4] - px) * (P[1] - py) - (P[0] - px) * (P[5] - py)) / d
      if (w0 >= 0 && w1 >= 0 && 1 - w0 - w1 >= 0) C[y * N + x] = 1
    }
  }
  let inter = 0, unione = 0
  for (let i = 0; i < N * N; i++) { if (C[i] || VERA[i]) unione++; if (C[i] && VERA[i]) inter++ }
  return inter / Math.max(1, unione)
}

let best = { s: 1, a: -1 }
for (const s of [1, 0.9375, 0.875, 0.8, 0.75, 0.7071, 0.6667, 0.625, 0.5, 4095/65535*16, 0.99994]) {
  const a = copertura(s, 0, 0)
  console.log(`  scala ${s.toFixed(5)}  accordo ${(a * 100).toFixed(1)}%`)
  if (a > best.a) best = { s, a }
}
console.log(`\nmigliore: scala ${best.s.toFixed(5)} con accordo ${(best.a * 100).toFixed(1)}%`)
