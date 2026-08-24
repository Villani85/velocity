/** LE MAPPE, MISURATE SOLO DOVE LA VETTURA LE CAMPIONA DAVVERO.
 *  L'atlante e' pieno per un quarto: misurare tutti i texel mescola la
 *  carrozzeria col padding e da' numeri che sembrano precisi e non lo sono
 *  (a me e' successo: 75% "nero" era il vuoto). Qui si rasterizzano i
 *  triangoli UV, si costruisce la copertura, e le statistiche si fanno solo
 *  dentro. */
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
let mesh = null, mx = -1
g.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > mx) { mx = o.geometry.attributes.position.count; mesh = o } })
const uv = mesh.geometry.attributes.uv
const idx = mesh.geometry.index

const N = 2048
const cop = new Uint8Array(N * N)
const P = [0, 0, 0, 0, 0, 0]
const tri = (a, b, c) => {
  for (let k = 0; k < 3; k++) {
    const i = [a, b, c][k]
    P[k * 2] = uv.getX(i) * N
    /* NIENTE RIBALTAMENTO DELLA V, ed e' una trappola che ho preso in pieno.
       In glTF l'origine delle UV sta IN ALTO A SINISTRA, quindi la riga di
       texel e' v * altezza. Ribaltando (1 - v) la maschera di copertura esce
       specchiata: cade sul padding invece che sulla carrozzeria, e le
       statistiche che ne escono sono perfettamente formate e completamente
       false — mediana 0 su una mappa che sui texel veri e' quasi bianca.
       E' la stessa famiglia dei quattro metri buttati: il numero c'e', il
       metro no. */
    P[k * 2 + 1] = uv.getY(i) * N
  }
  const x0 = Math.max(0, Math.floor(Math.min(P[0], P[2], P[4])))
  const x1 = Math.min(N - 1, Math.ceil(Math.max(P[0], P[2], P[4])))
  const y0 = Math.max(0, Math.floor(Math.min(P[1], P[3], P[5])))
  const y1 = Math.min(N - 1, Math.ceil(Math.max(P[1], P[3], P[5])))
  const d = (P[2] - P[0]) * (P[5] - P[1]) - (P[4] - P[0]) * (P[3] - P[1])
  if (Math.abs(d) < 1e-9) return
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5
    const w0 = ((P[2] - px) * (P[5] - py) - (P[4] - px) * (P[3] - py)) / d
    const w1 = ((P[4] - px) * (P[1] - py) - (P[0] - px) * (P[5] - py)) / d
    const w2 = 1 - w0 - w1
    if (w0 >= -0.002 && w1 >= -0.002 && w2 >= -0.002) cop[y * N + x] = 1
  }
}
for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2))
let coperti = 0
for (let i = 0; i < cop.length; i++) coperti += cop[i]
console.log(`copertura dell'atlante: ${(coperti / cop.length * 100).toFixed(1)}%  (${coperti} texel)`)

/* SI SCRIVE LA MASCHERA SU FILE. Una copertura e' un'affermazione su DOVE
   cadono i triangoli, e un'affermazione si guarda: e' l'unico modo di
   accorgersi che il metro sta misurando il padding. */
{
  const img = Buffer.alloc(N * N)
  for (let i = 0; i < cop.length; i++) img[i] = cop[i] ? 255 : 0
  await sharp(img, { raw: { width: N, height: N, channels: 1 } })
    .resize(420, 420).png().toFile('docs/provini/copertura_uv.png')
  console.log('maschera scritta in docs/provini/copertura_uv.png')
}
const pct = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))]
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(`public/texture/${f}.webp`).raw().toBuffer({ resolveWithObject: true })
  const CH = info.channels, S = info.width / N
  const ch = [[], [], []]
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!cop[y * N + x]) continue
    const o = (Math.floor(y * S) * info.width + Math.floor(x * S)) * CH
    ch[0].push(data[o]); ch[1].push(data[o + 1]); ch[2].push(data[o + 2])
  }
  ch.forEach(a => a.sort((p, q) => p - q))
  console.log(`\n${f}  (${ch[0].length} texel mappati)`)
  ;['R', 'G', 'B'].forEach((n, i) => {
    console.log(`  ${n}  p10 ${String(pct(ch[i], 0.10)).padStart(3)}   mediana ${String(pct(ch[i], 0.5)).padStart(3)}   p90 ${String(pct(ch[i], 0.90)).padStart(3)}   (0..255)`)
  })
}
