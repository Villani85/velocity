/** IL CANARINO. Tre maschere costruite in modo indipendente, messe a confronto.
 *  A: «non e' il rosso pieno del riempimento» (dalla ORM)
 *  B: «non e' la normale neutra (128,128,255)» (dalla NOR)
 *  C: la copertura rasterizzata dai triangoli UV (dalla geometria)
 *  Se A e B concordano fra loro e NON con C, e' C a essere sbagliata.
 *  E la regola nuova: dopo ogni maschera si stampa la mediana della normal
 *  map dentro. Se viene (128,128,255) la maschera sta selezionando il vuoto. */
import { readFileSync } from 'fs'
import sharp from 'sharp'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })

const N = 2048
const leggi = async (f) => {
  const { data, info } = await sharp(`public/texture/${f}.webp`).raw().toBuffer({ resolveWithObject: true })
  return { data, W: info.width, CH: info.channels }
}
const orm = await leggi('auto2r_orm')
/* SI LEGGE LA MAPPA NON PASSA-ALTATA, E NON E' UN DETTAGLIO.
   La maschera B ha come regola «se la mediana e' (128,128,255) stai misurando
   il vuoto». Ma un passa-alto CENTRA LA DISTRIBUZIONE SU ZERO per costruzione:
   la mediana di `auto2r_nor2.webp` dentro la maschera e' (129,129,254), a un
   punto dalla normale neutra. Puntando li', il canarino suonerebbe un falso
   allarme per sempre — e uno strumento che suona sempre e' uno strumento
   spento.
   `auto2r_nor.webp` resta su disco APPOSTA per questo. Non si cancella. */
const nor = await leggi('auto2r_nor')
const col = await leggi('auto2r_col')

const A = new Uint8Array(N * N), B = new Uint8Array(N * N), C = new Uint8Array(N * N)
for (let i = 0; i < N * N; i++) {
  const o = i * orm.CH
  // il riempimento della ORM e' rosso pieno: R alto, G e B a zero
  A[i] = (orm.data[o + 1] > 8 || orm.data[o + 2] > 8) ? 1 : 0
  const n = i * nor.CH
  const dx = Math.abs(nor.data[n] - 128), dy = Math.abs(nor.data[n + 1] - 128), dz = 255 - nor.data[n + 2]
  B[i] = (dx > 4 || dy > 4 || dz > 4) ? 1 : 0
}

await MeshoptDecoder.ready
const buf = readFileSync('public/modelli/auto2.glb')
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((r, j) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', r, j))
let mesh = null, mx = -1
g.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count > mx) { mx = o.geometry.attributes.position.count; mesh = o } })
const uv = mesh.geometry.attributes.uv, idx = mesh.geometry.index
const P = new Float64Array(6)
for (let t = 0; t < idx.count; t += 3) {
  for (let k = 0; k < 3; k++) {
    const i = idx.getX(t + k)
    P[k * 2] = uv.getX(i) * N; P[k * 2 + 1] = uv.getY(i) * N
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

const pct = (m) => { let s = 0; for (let i = 0; i < m.length; i++) s += m[i]; return s }
const accordo = (m, n) => { let u = 0, i2 = 0; for (let i = 0; i < m.length; i++) { if (m[i] || n[i]) u++; if (m[i] && n[i]) i2++ } return i2 / Math.max(1, u) }
console.log(`A (non-rosso nella ORM)     ${(pct(A) / (N * N) * 100).toFixed(1)}%`)
console.log(`B (non-neutra nella NOR)    ${(pct(B) / (N * N) * 100).toFixed(1)}%`)
console.log(`C (rasterizzazione UV)      ${(pct(C) / (N * N) * 100).toFixed(1)}%`)
console.log(`\naccordo A/B  ${(accordo(A, B) * 100).toFixed(1)}%`)
console.log(`accordo A/C  ${(accordo(A, C) * 100).toFixed(1)}%`)
console.log(`accordo B/C  ${(accordo(B, C) * 100).toFixed(1)}%`)

const med = (arr) => { arr.sort((a, b) => a - b); return arr[arr.length >> 1] }
for (const [nome, M] of [['A', A], ['B', B], ['C', C]]) {
  const gg = [], bb = [], cl = [], nx = [], ny = [], nz = []
  for (let i = 0; i < N * N; i++) {
    if (!M[i]) continue
    const o = i * orm.CH, n = i * nor.CH, c = i * col.CH
    gg.push(orm.data[o + 1]); bb.push(orm.data[o + 2])
    cl.push(0.2126 * col.data[c] + 0.7152 * col.data[c + 1] + 0.0722 * col.data[c + 2])
    nx.push(nor.data[n]); ny.push(nor.data[n + 1]); nz.push(nor.data[n + 2])
  }
  const canarino = `${med(nx)},${med(ny)},${med(nz)}`
  console.log(`\ndentro ${nome}:  ORM G ${med(gg)}   ORM B ${med(bb)}   COL luma ${Math.round(med(cl))}`)
  console.log(`   CANARINO normal map: (${canarino})` +
    (canarino === '128,128,255' ? '  <<< E IL RIEMPIMENTO: MASCHERA SBAGLIATA' : '  ok, non e il riempimento'))
}
