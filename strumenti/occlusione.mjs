/** L'OCCLUSIONE AMBIENTALE, cotta senza Blender.
 *
 *  IL DIFETTO. Il canale rosso della ORM ha mediana 1,000 e oltre il 70% dei
 *  texel a 255: sono 2048x2048 gia' pagati, gia' caricati e gia' trasferiti che
 *  non portano NIENTE. E `GTAOPass` ha raggio 0,9 m, tarato sulla corte: su una
 *  vettura di 4,4 m non tocca ne' i passaruota, ne' le fughe, ne' il
 *  sottosquadro del fondo. Zero occlusione sul soggetto, da entrambe le vie —
 *  ed e' il contributo maggiore all'effetto «pezzo appoggiato sopra» dopo il
 *  materiale.
 *
 *  PERCHE' NON IN BLENDER. Una cottura in Blender e' una sessione a mano: si
 *  apre, si imposta, si cuoce, si esporta. Non si ripete, non entra in una riga
 *  di comando, e fra due mesi nessuno sa piu' con che parametri e' stata fatta.
 *  Un raycast fa la stessa cosa ed e' RIPRODUCIBILE, che su questo progetto
 *  vale piu' della comodita'.
 *
 *  IL RAGGIO E' CORTO, ed e' il punto. 5-10 cm, non i raggi da architettura.
 *  Un'occlusione a raggio lungo su un'automobile scurisce tutto il sottoscocca
 *  e non dice niente; a raggio corto scurisce esattamente dove due superfici si
 *  avvicinano: il labbro del passaruota, le fughe, il fondo del diffusore.
 *
 *  PER VERTICE E NON PER TEXEL. L'occlusione e' una grandezza a BASSA
 *  frequenza: cambia sulla scala dei centimetri, non dei millimetri. Cuocerla
 *  per texel a 2048 vorrebbe dire pagare quaranta volte tanto per
 *  un'informazione che poi si interpola comunque.
 *
 *  Uso:  node strumenti/occlusione.mjs [raggio] [raggi] [--prova]
 */
import { readFileSync } from 'fs'
import sharp from 'sharp'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })

const RAGGIO = Number(process.argv[2] ?? 0.09)
const RAGGI = Number(process.argv[3] ?? 24)
const PROVA = process.argv.includes('--prova')

await MeshoptDecoder.ready
const buf = readFileSync('public/modelli/auto2.glb')
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((r, j) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', r, j))
g.scene.updateMatrixWorld(true)
let mesh = null, mx = -1
g.scene.traverse((o) => { if (o.isMesh && o.geometry.attributes.position.count > mx) { mx = o.geometry.attributes.position.count; mesh = o } })

const pos = mesh.geometry.attributes.position
const nor = mesh.geometry.attributes.normal
const uv = mesh.geometry.attributes.uv
const idx = mesh.geometry.index
const M = mesh.matrixWorld, nm = new THREE.Matrix3().getNormalMatrix(M)
const NV = pos.count
const P = new Float64Array(NV * 3), Nn = new Float64Array(NV * 3)
const v = new THREE.Vector3(), n = new THREE.Vector3()
for (let i = 0; i < NV; i++) {
  v.fromBufferAttribute(pos, i).applyMatrix4(M)
  P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z
  n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize()
  Nn[i * 3] = n.x; Nn[i * 3 + 1] = n.y; Nn[i * 3 + 2] = n.z
}
let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9
for (let i = 0; i < NV; i++) {
  const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]
  if (x < x0) x0 = x
  if (x > x1) x1 = x
  if (y < y0) y0 = y
  if (y > y1) y1 = y
  if (z < z0) z0 = z
  if (z > z1) z1 = z
}
const k = 4.4 / Math.max(x1 - x0, y1 - y0, z1 - z0)
for (let i = 0; i < NV * 3; i++) P[i] *= k
x0 *= k; x1 *= k; y0 *= k; y1 *= k; z0 *= k; z1 *= k

/* LA GRIGLIA. Cella uguale al raggio: cosi' i triangoli che possono occludere
   un punto stanno nelle 27 celle intorno, e non serve percorrere il raggio
   cella per cella. Con un raggio corto e' anche l'unica struttura che valga la
   pena costruire: un albero costerebbe piu' del guadagno. */
const C = RAGGIO
const gx = Math.max(1, Math.ceil((x1 - x0) / C))
const gy = Math.max(1, Math.ceil((y1 - y0) / C))
const gz = Math.max(1, Math.ceil((z1 - z0) / C))
const celle = new Map()
const NT = idx.count / 3
for (let t = 0; t < NT; t++) {
  const a = idx.getX(t * 3), b = idx.getX(t * 3 + 1), c = idx.getX(t * 3 + 2)
  const cx = Math.min(gx - 1, Math.max(0, Math.floor(((P[a * 3] + P[b * 3] + P[c * 3]) / 3 - x0) / C)))
  const cy = Math.min(gy - 1, Math.max(0, Math.floor(((P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3 - y0) / C)))
  const cz = Math.min(gz - 1, Math.max(0, Math.floor(((P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3 - z0) / C)))
  const key = (cx * gy + cy) * gz + cz
  let arr = celle.get(key)
  if (!arr) { arr = []; celle.set(key, arr) }
  arr.push(t)
}
console.log('vertici ' + NV + '  triangoli ' + NT + '  griglia ' + gx + 'x' + gy + 'x' + gz + '  celle piene ' + celle.size)

/* le direzioni: spirale di Fibonacci pesata sul coseno, che e' la
   distribuzione piu' uniforme che si ottenga senza tabelle */
const DIR = []
for (let i = 0; i < RAGGI; i++) {
  const cosT = Math.sqrt(1 - (i + 0.5) / RAGGI)
  const sinT = Math.sqrt(1 - cosT * cosT)
  const phi = i * Math.PI * (3 - Math.sqrt(5))
  DIR.push([Math.cos(phi) * sinT, Math.sin(phi) * sinT, cosT])
}

const EPS = 1e-5
function colpisce(ox, oy, oz, dx, dy, dz, tri) {
  for (let q = 0; q < tri.length; q++) {
    const t = tri[q]
    const a = idx.getX(t * 3) * 3, b = idx.getX(t * 3 + 1) * 3, c = idx.getX(t * 3 + 2) * 3
    const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2]
    const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2]
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x
    const det = e1x * px + e1y * py + e1z * pz
    if (det > -1e-9 && det < 1e-9) continue
    const inv = 1 / det
    const tx = ox - P[a], ty = oy - P[a + 1], tz = oz - P[a + 2]
    const u = (tx * px + ty * py + tz * pz) * inv
    if (u < 0 || u > 1) continue
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x
    const vv = (dx * qx + dy * qy + dz * qz) * inv
    if (vv < 0 || u + vv > 1) continue
    const dist = (e2x * qx + e2y * qy + e2z * qz) * inv
    if (dist > EPS && dist < RAGGIO) return true
  }
  return false
}

const AO = new Float32Array(NV).fill(1)
const inizio = Date.now()
const bersaglio = PROVA ? 400 : NV
const passo = PROVA ? Math.max(1, Math.floor(NV / bersaglio)) : 1
let fatti = 0
for (let i = 0; i < NV; i += passo) {
  const ox = P[i * 3], oy = P[i * 3 + 1], oz = P[i * 3 + 2]
  const nx = Nn[i * 3], ny = Nn[i * 3 + 1], nz = Nn[i * 3 + 2]
  let ux, uy, uz
  if (Math.abs(nz) < 0.9) { ux = -ny; uy = nx; uz = 0 } else { ux = 0; uy = -nz; uz = ny }
  const ul = Math.hypot(ux, uy, uz) || 1
  ux /= ul; uy /= ul; uz /= ul
  const wx = ny * uz - nz * uy, wy = nz * ux - nx * uz, wz = nx * uy - ny * ux
  const cx = Math.min(gx - 1, Math.max(0, Math.floor((ox - x0) / C)))
  const cy = Math.min(gy - 1, Math.max(0, Math.floor((oy - y0) / C)))
  const cz = Math.min(gz - 1, Math.max(0, Math.floor((oz - z0) / C)))
  const vicini = []
  for (let a = -1; a <= 1; a++) {
    for (let b = -1; b <= 1; b++) {
      for (let c = -1; c <= 1; c++) {
        const X = cx + a, Y = cy + b, Z = cz + c
        if (X < 0 || Y < 0 || Z < 0 || X >= gx || Y >= gy || Z >= gz) continue
        const arr = celle.get((X * gy + Y) * gz + Z)
        if (arr) for (let m = 0; m < arr.length; m++) vicini.push(arr[m])
      }
    }
  }
  let liberi = 0
  const sx = ox + nx * 2e-4, sy = oy + ny * 2e-4, sz = oz + nz * 2e-4
  for (let d = 0; d < RAGGI; d++) {
    const dd = DIR[d]
    const dx = ux * dd[0] + wx * dd[1] + nx * dd[2]
    const dy = uy * dd[0] + wy * dd[1] + ny * dd[2]
    const dz = uz * dd[0] + wz * dd[1] + nz * dd[2]
    if (!colpisce(sx, sy, sz, dx, dy, dz, vicini)) liberi++
  }
  AO[i] = liberi / RAGGI
  fatti++
  if (PROVA && fatti >= bersaglio) break
}
const ms = Date.now() - inizio

if (PROVA) {
  console.log('prova su ' + fatti + ' vertici sparsi: ' + ms + ' ms  ->  stimati ' +
    (ms / fatti * NV / 1000).toFixed(0) + ' s per tutti')
  const camp = []
  for (let i = 0; i < NV && camp.length < fatti; i += passo) camp.push(AO[i])
  camp.sort((a, b) => a - b)
  console.log('  occlusione  min ' + camp[0].toFixed(2) +
    '  p25 ' + camp[camp.length >> 2].toFixed(2) +
    '  mediana ' + camp[camp.length >> 1].toFixed(2) +
    '  max ' + camp[camp.length - 1].toFixed(2))
  process.exit(0)
}
console.log('cotta in ' + (ms / 1000).toFixed(0) + ' s')

/* SI RASTERIZZA NELL'ATLANTE, con le coordinate baricentriche: e' la stessa
   interpolazione che fa la scheda video, quindi il risultato coincide con
   quello che si vedrebbe usando l'occlusione come attributo di vertice — ma
   sta in una mappa, che e' dove three la vuole. */
const S = 2048
const R = new Float32Array(S * S).fill(1)
const visto = new Uint8Array(S * S)
const Pt = new Float64Array(6)
for (let t = 0; t < NT; t++) {
  const a = idx.getX(t * 3), b = idx.getX(t * 3 + 1), c = idx.getX(t * 3 + 2)
  const ii = [a, b, c]
  for (let q = 0; q < 3; q++) {
    Pt[q * 2] = uv.getX(ii[q]) * S
    Pt[q * 2 + 1] = uv.getY(ii[q]) * S
  }
  const bx0 = Math.max(0, Math.floor(Math.min(Pt[0], Pt[2], Pt[4])) - 1)
  const bx1 = Math.min(S - 1, Math.ceil(Math.max(Pt[0], Pt[2], Pt[4])) + 1)
  const by0 = Math.max(0, Math.floor(Math.min(Pt[1], Pt[3], Pt[5])) - 1)
  const by1 = Math.min(S - 1, Math.ceil(Math.max(Pt[1], Pt[3], Pt[5])) + 1)
  const den = (Pt[2] - Pt[0]) * (Pt[5] - Pt[1]) - (Pt[4] - Pt[0]) * (Pt[3] - Pt[1])
  if (Math.abs(den) < 1e-9) continue
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const px = x + 0.5, py = y + 0.5
      const w0 = ((Pt[2] - px) * (Pt[5] - py) - (Pt[4] - px) * (Pt[3] - py)) / den
      const w1 = ((Pt[4] - px) * (Pt[1] - py) - (Pt[0] - px) * (Pt[5] - py)) / den
      const w2 = 1 - w0 - w1
      if (w0 < -0.04 || w1 < -0.04 || w2 < -0.04) continue
      R[y * S + x] = w0 * AO[a] + w1 * AO[b] + w2 * AO[c]
      visto[y * S + x] = 1
    }
  }
}
let coperti = 0
for (let i = 0; i < visto.length; i++) coperti += visto[i]
console.log('texel coperti dalla cottura: ' + (coperti / (S * S) * 100).toFixed(1) + '%')

const grezzo = Buffer.alloc(S * S)
for (let i = 0; i < S * S; i++) grezzo[i] = Math.round(Math.max(0, Math.min(1, R[i])) * 255)
/* UNA SFUMATURA LEGGERA. L'occlusione per vertice su una maglia irregolare ha
   scalini dove i triangoli cambiano dimensione, e uno scalino in una mappa di
   occlusione si legge come una piega che non c'e'. Due pixel bastano: oltre,
   si perde il bordo del passaruota, che e' proprio il posto per cui la mappa
   esiste. */
await sharp(grezzo, { raw: { width: S, height: S, channels: 1 } })
  .blur(2).png().toFile('texture-sorgente/_ao.png')
console.log('scritta texture-sorgente/_ao.png')
