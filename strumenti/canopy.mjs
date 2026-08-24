/** IL CANOPY: SI PUO' SEPARARE, E DOVE?
 *
 *  Non si decide guardando: si misura. Per ogni criterio candidato (altezza,
 *  normale, buio nella mappa, e le combinazioni) si contano i triangoli
 *  scelti, quante ISOLE fanno, e — la misura che decide tutto — quanto il
 *  bordo della selezione cade su una PIEGA vera della superficie. Un bordo che
 *  segue una piega e' una fuga; un bordo che taglia una superficie continua e'
 *  una ferita (docs/CARROZZERIA_FAIRNESS.md §5).
 *
 *  IL COLORE SI CAMPIONA AL BARICENTRO DEL TRIANGOLO, NON AL VERTICE.
 *  Campionando all'UV del vertice si cade sul BORDO dell'isola d'atlante, dove
 *  il bake ha lasciato nero: con `auto2r_col.webp` il 77% dei triangoli
 *  risultava "scuro" e non era vero, era il canale di scolo fra le isole. Al
 *  baricentro si cade dentro l'isola. E' lo stesso errore di misura di §4 del
 *  documento: un metro rotto non da' errore, da' un numero.
 */
import { readFileSync } from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import sharp from 'sharp'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })

const FILE = process.argv[2] ?? 'public/modelli/auto2.glb'
const TEX = process.argv[3] ?? 'public/texture/auto2r_col.webp'
const LUNG = 4.4

await MeshoptDecoder.ready
const b = readFileSync(FILE)
const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((r, j) => l.parse(ab, '', r, j))
let mesh = null, mx = -1
g.scene.updateMatrixWorld(true)
g.scene.traverse(o => { if (o.isMesh) { const v = o.geometry.attributes.position.count; if (v > mx) { mx = v; mesh = o } } })
const geo = mesh.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, idx = geo.index
const nTri = (idx ? idx.count : pos.count) / 3
const tri = (t, k) => idx ? idx.getX(t * 3 + k) : t * 3 + k

const P = [], N = []
{
  const v = new THREE.Vector3(), n = new THREE.Vector3()
  const M = mesh.matrixWorld, nmat = new THREE.Matrix3().getNormalMatrix(M)
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(M); P.push(v.clone())
    n.fromBufferAttribute(nor, i).applyMatrix3(nmat).normalize(); N.push(n.clone())
  }
}
const box = new THREE.Box3().setFromPoints(P); const size = new THREE.Vector3(); box.getSize(size)
const k = LUNG / Math.max(size.x, size.y, size.z)
P.forEach(p => { p.sub(box.min); p.multiplyScalar(k) })
const dim = size.clone().multiplyScalar(k)

// --- il colore, al BARICENTRO di ogni triangolo
const img = await sharp(TEX).raw().toBuffer({ resolveWithObject: true })
const W = img.info.width, H = img.info.height, CH = img.info.channels, D = img.data
const s2l = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const LUMA_T = new Float32Array(nTri)
for (let t = 0; t < nTri; t++) {
  let u = 0, w = 0
  for (let e = 0; e < 3; e++) { const i = tri(t, e); u += uv.getX(i); w += uv.getY(i) }
  u /= 3; w /= 3
  u = u - Math.floor(u); w = w - Math.floor(w)
  const x = Math.min(W - 1, Math.floor(u * W)), y = Math.min(H - 1, Math.floor((1 - w) * H))
  const o = (y * W + x) * CH
  LUMA_T[t] = 0.2126 * s2l(D[o]) + 0.7152 * s2l(D[o + 1]) + 0.0722 * s2l(D[o + 2])
}

const SNAP = 1e-5
const mappa = new Map(), sald = new Int32Array(pos.count)
for (let i = 0; i < pos.count; i++) {
  const p = P[i]
  const key = `${Math.round(p.x / SNAP)},${Math.round(p.y / SNAP)},${Math.round(p.z / SNAP)}`
  if (!mappa.has(key)) mappa.set(key, mappa.size)
  sald[i] = mappa.get(key)
}

const FN = [], AREA = new Float32Array(nTri), CEN = []
{
  const a = new THREE.Vector3(), bq = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
  for (let t = 0; t < nTri; t++) {
    a.copy(P[tri(t, 0)]); bq.copy(P[tri(t, 1)]); c.copy(P[tri(t, 2)])
    CEN.push(new THREE.Vector3().addVectors(a, bq).add(c).multiplyScalar(1 / 3))
    e1.subVectors(bq, a); e2.subVectors(c, a)
    const cr = new THREE.Vector3().crossVectors(e1, e2)
    AREA[t] = cr.length() / 2
    FN.push(cr.normalize())
  }
}
const spig = new Map()
for (let t = 0; t < nTri; t++) {
  const a = [sald[tri(t, 0)], sald[tri(t, 1)], sald[tri(t, 2)]]
  for (let e = 0; e < 3; e++) {
    const i0 = a[e], i1 = a[(e + 1) % 3]
    const key = i0 < i1 ? `${i0}_${i1}` : `${i1}_${i0}`
    let s = spig.get(key); if (!s) { s = []; spig.set(key, s) }
    s.push(t)
  }
}
const posSald = new Map()
for (let i = 0; i < pos.count; i++) if (!posSald.has(sald[i])) posSald.set(sald[i], P[i])
const adj = new Map()
for (const [, facce] of spig) {
  if (facce.length !== 2) continue
  const [f0, f1] = facce
  if (!adj.has(f0)) adj.set(f0, []); if (!adj.has(f1)) adj.set(f1, [])
  adj.get(f0).push(f1); adj.get(f1).push(f0)
}

function sm(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// normale di faccia in su, altezza e larghezza del baricentro
const nySu = t => FN[t].y
const yT = t => CEN[t].y
const zT = t => Math.abs(CEN[t].z - dim.z / 2)

const SOGLIE = JSON.parse(process.env.SOGLIE ?? 'null')
function maskTri(nome, t) {
  const luma = LUMA_T[t], y = yT(t), ny = nySu(t)
  if (nome === 'shader') return (1 - sm(0.008, 0.030, luma)) * sm(0.16, 0.44, ny)
  if (nome === 'buio') return 1 - sm(0.008, 0.030, luma)
  if (nome === 'su') return sm(0.16, 0.44, ny)
  if (nome === 'alto') return y > dim.y * 0.62 ? 1 : 0
  if (nome === 'alto+su') return (y > dim.y * 0.62 ? 1 : 0) * sm(0.16, 0.44, ny)
  if (nome === 'alto+buio') return (y > dim.y * 0.62 ? 1 : 0) * (1 - sm(0.008, 0.030, luma))
  if (nome === 'tutti') return (y > dim.y * 0.55 ? 1 : 0) * sm(0.16, 0.44, ny) * (1 - sm(0.008, 0.030, luma))
  if (nome === 'su+stretto') return sm(0.16, 0.44, ny) * (zT(t) < dim.z * 0.30 ? 1 : 0)
  if (nome === 'tara' && SOGLIE) {
    const ok = y > SOGLIE.y && ny > SOGLIE.ny && CEN[t].x > SOGLIE.x0 && CEN[t].x < SOGLIE.x1 && zT(t) < SOGLIE.z
    return ok ? 1 : 0
  }
  return 0
}

function analizza(nome) {
  const sel = new Uint8Array(nTri)
  let areaSel = 0, areaTot = 0
  for (let t = 0; t < nTri; t++) {
    sel[t] = maskTri(nome, t) > 0.5 ? 1 : 0
    areaTot += AREA[t]; if (sel[t]) areaSel += AREA[t]
  }
  let nSel = 0; for (let t = 0; t < nTri; t++) nSel += sel[t]
  const visto = new Uint8Array(nTri); const isole = []
  for (let t = 0; t < nTri; t++) {
    if (!sel[t] || visto[t]) continue
    let c = 0, area = 0; const pila = [t]; visto[t] = 1
    const bb = new THREE.Box3()
    while (pila.length) {
      const q = pila.pop(); c++; area += AREA[q]
      for (let e = 0; e < 3; e++) bb.expandByPoint(P[tri(q, e)])
      for (const r of (adj.get(q) ?? [])) if (sel[r] && !visto[r]) { visto[r] = 1; pila.push(r) }
    }
    isole.push({ tri: c, area: +area.toFixed(4),
      x: [+bb.min.x.toFixed(2), +bb.max.x.toFixed(2)], y: [+bb.min.y.toFixed(2), +bb.max.y.toFixed(2)],
      z: [+bb.min.z.toFixed(2), +bb.max.z.toFixed(2)] })
  }
  isole.sort((a, b) => b.tri - a.tri)
  const diedri = []; let lungBordo = 0
  for (const [key, facce] of spig) {
    if (facce.length !== 2) continue
    const [f0, f1] = facce
    if (sel[f0] === sel[f1]) continue
    const [a, bq] = key.split('_').map(Number)
    lungBordo += posSald.get(a).distanceTo(posSald.get(bq))
    diedri.push(Math.acos(Math.min(1, Math.max(-1, FN[f0].dot(FN[f1])))) * 180 / Math.PI)
  }
  diedri.sort((x, y) => x - y)
  const q = p => diedri.length ? +diedri[Math.floor(diedri.length * p)].toFixed(2) : null
  const sopra = s => +(diedri.filter(d => d > s).length / Math.max(1, diedri.length) * 100).toFixed(1)
  const micro = isole.filter(i => i.tri < 50).length
  return { criterio: nome, triangoli: nSel, percTriangoli: +(nSel / nTri * 100).toFixed(1),
    percArea: +(areaSel / areaTot * 100).toFixed(1),
    isole: isole.length, isoleMicro: micro, primeIsole: isole.slice(0, 3),
    bordo_m: +lungBordo.toFixed(2), spigoliBordo: diedri.length,
    diedro_bordo: { p10: q(0.10), mediana: q(0.5), p90: q(0.9) },
    bordo_su_piega_perc: { oltre10: sopra(10), oltre20: sopra(20), oltre30: sopra(30) } }
}

const criteri = (process.env.CRITERI ?? 'shader,buio,su,alto,alto+su,alto+buio,tutti,su+stretto,tara').split(',')
const out = { file: FILE, texture: TEX, triangoli: nTri, vertici: pos.count,
  saldati: mappa.size, dim_m: [+dim.x.toFixed(3), +dim.y.toFixed(3), +dim.z.toFixed(3)], criteri: [] }
for (const c of criteri) out.criteri.push(analizza(c))
console.log(JSON.stringify(out, null, 1))
