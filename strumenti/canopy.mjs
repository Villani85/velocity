/**
 * IL CANOPY: SI PUO' SEPARARE, E DOVE — il metro, non l'opinione.
 *
 * Risponde a tre domande, e ognuna con un numero:
 *
 *   1. SALUTE DELLA MAPPA (`node strumenti/canopy.mjs mappa`)
 *      Quanta della superficie che le UV coprono e' davvero DIPINTA nella
 *      mappa di colore. Serve perche' la maschera in shader di `scocca()`
 *      cerca il canopy nei pixel scuri: se la mappa e' nera, la maschera
 *      prende tutto. Confronta anche il bake nuovo col vecchio negli STESSI
 *      punti 3D, che e' l'unico confronto onesto fra due atlanti diversi.
 *
 *   2. IL GINOCCHIO (`node strumenti/canopy.mjs ginocchio`)
 *      Fetta per fetta lungo la vettura, l'altezza a cui la larghezza della
 *      sezione CROLLA. E' l'unica linea che questa carrozzeria possieda
 *      davvero — la cintura — e non e' decisa: e' misurata.
 *
 *   3. IL TAGLIO (`node strumenti/canopy.mjs taglio [x0] [x1]`)
 *      Se si dividesse la mesh sopra il ginocchio: quanti triangoli, quante
 *      isole, che perimetro — e soprattutto quanto il bordo SEGHETTA, cioe'
 *      di quanto si scosta dalla propria linea media. E' la misura che decide
 *      fra tagliare e non tagliare, perche' «su una superficie continua un
 *      bordo seghettato e' una ferita» (docs/CARROZZERIA_FAIRNESS.md §5).
 *
 * Tutto e' normalizzato a 4,4 m come `fairness.mjs`, cosi' i millimetri sono
 * millimetri veri e non unita' del file.
 */
import { readFileSync } from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import sharp from 'sharp'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })

const LUNG = 4.4
const MODO = process.argv[2] ?? 'taglio'

await MeshoptDecoder.ready
const LOADER = new GLTFLoader(); LOADER.setMeshoptDecoder(MeshoptDecoder)

/** carica un glb e restituisce la mesh piu' grossa, normalizzata a LUNG e
 *  appoggiata all'origine della sua scatola */
async function carica(file) {
  const b = readFileSync(file)
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  const g = await new Promise((r, j) => LOADER.parse(ab, '', r, j))
  let mesh = null, mx = -1
  g.scene.updateMatrixWorld(true)
  g.scene.traverse(o => { if (o.isMesh) { const v = o.geometry.attributes.position.count; if (v > mx) { mx = v; mesh = o } } })
  const geo = mesh.geometry, pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index
  const nTri = (idx ? idx.count : pos.count) / 3
  const tri = (t, k) => idx ? idx.getX(t * 3 + k) : t * 3 + k
  const P = []
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); P.push(v.clone()) }
  const box = new THREE.Box3().setFromPoints(P); const size = new THREE.Vector3(); box.getSize(size)
  const k = LUNG / Math.max(size.x, size.y, size.z)
  P.forEach(p => { p.sub(box.min); p.multiplyScalar(k) })
  const dim = size.clone().multiplyScalar(k)
  const CEN = [], AREA = new Float32Array(nTri), FN = [], CUV = []
  for (let t = 0; t < nTri; t++) {
    const a = P[tri(t, 0)], b2 = P[tri(t, 1)], c = P[tri(t, 2)]
    CEN.push(new THREE.Vector3().addVectors(a, b2).add(c).multiplyScalar(1 / 3))
    const cr = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(b2, a), new THREE.Vector3().subVectors(c, a))
    AREA[t] = cr.length() / 2
    FN.push(cr.normalize())
    if (uv) { const i = [0, 1, 2].map(q => tri(t, q))
      CUV.push([(uv.getX(i[0]) + uv.getX(i[1]) + uv.getX(i[2])) / 3, (uv.getY(i[0]) + uv.getY(i[1]) + uv.getY(i[2])) / 3]) }
  }
  return { file, mesh, geo, pos, uv, idx, nTri, tri, P, dim, CEN, AREA, FN, CUV }
}

/** salda per posizione: le cuciture UV duplicano i vertici e spezzerebbero
 *  ogni conto di adiacenza */
function topologia(M) {
  const SNAP = 1e-5, mp = new Map(), sald = new Int32Array(M.pos.count)
  for (let i = 0; i < M.pos.count; i++) {
    const p = M.P[i]
    const kk = `${Math.round(p.x / SNAP)},${Math.round(p.y / SNAP)},${Math.round(p.z / SNAP)}`
    if (!mp.has(kk)) mp.set(kk, mp.size)
    sald[i] = mp.get(kk)
  }
  const posS = new Map()
  for (let i = 0; i < M.pos.count; i++) if (!posS.has(sald[i])) posS.set(sald[i], M.P[i])
  const spig = new Map()
  for (let t = 0; t < M.nTri; t++) {
    const a = [sald[M.tri(t, 0)], sald[M.tri(t, 1)], sald[M.tri(t, 2)]]
    for (let e = 0; e < 3; e++) {
      const i0 = a[e], i1 = a[(e + 1) % 3]
      const kk = i0 < i1 ? `${i0}_${i1}` : `${i1}_${i0}`
      let q = spig.get(kk); if (!q) { q = []; spig.set(kk, q) }
      q.push(t)
    }
  }
  const adj = new Map()
  for (const [, f] of spig) {
    if (f.length !== 2) continue
    const [a, c] = f
    if (!adj.has(a)) adj.set(a, []); if (!adj.has(c)) adj.set(c, [])
    adj.get(a).push(c); adj.get(c).push(a)
  }
  return { sald, posS, spig, adj, saldati: mp.size }
}

/** IL GINOCCHIO: per ogni fetta lungo X, l'altezza a cui la larghezza crolla */
function ginocchio(M, NS = 44) {
  const G = new Float32Array(NS).fill(NaN)
  for (let f = 0; f < NS; f++) {
    const xc = M.dim.x * (f + 0.5) / NS
    const sel = M.P.filter(p => Math.abs(p.x - xc) < M.dim.x / NS)
    if (sel.length < 80) continue
    const NB = 40, w = new Float32Array(NB).fill(0)
    for (const p of sel) { const q = Math.min(NB - 1, Math.floor(p.y / M.dim.y * NB)); w[q] = Math.max(w[q], Math.abs(p.z - M.dim.z / 2) * 2) }
    for (let q = 1; q < NB; q++) if (w[q] === 0) w[q] = w[q - 1]
    const dy = M.dim.y / NB
    let best = -1, bd = 0
    for (let q = Math.floor(NB * 0.45); q < NB - 1; q++) { const d = (w[q + 1] - w[q]) / dy; if (d < bd) { bd = d; best = q } }
    if (best > 0 && bd < -2.5) G[f] = (best + 0.5) * dy
  }
  const S = [...G]
  for (let it = 0; it < 8; it++) for (let f = 1; f < NS - 1; f++) {
    const a = S[f - 1], c = S[f + 1]
    if (!isNaN(a) && !isNaN(c)) S[f] = isNaN(S[f]) ? (a + c) / 2 : S[f] * 0.6 + (a + c) * 0.2
  }
  return { S, NS, a: x => S[Math.min(NS - 1, Math.max(0, Math.floor(x / M.dim.x * NS)))] }
}

const s2l = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
async function tex(f) { const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true }); return { d: data, W: info.width, H: info.height, C: info.channels } }
const campiona = (T, u, w) => { u -= Math.floor(u); w -= Math.floor(w)
  const x = Math.min(T.W - 1, Math.floor(u * T.W)), y = Math.min(T.H - 1, Math.floor((1 - w) * T.H)); const o = (y * T.W + x) * T.C
  return [T.d[o], T.d[o + 1], T.d[o + 2]] }

// ─────────────────────────────────────────────────────────────────────────
if (MODO === 'mappa') {
  const M = await carica('public/modelli/auto2.glb')
  const N = 2048, cov = new Uint8Array(N * N)
  for (let t = 0; t < M.nTri; t++) {
    const a = [0, 1, 2].map(k => M.tri(t, k))
    const X = a.map(i => M.uv.getX(i) * N), Y = a.map(i => (1 - M.uv.getY(i)) * N)
    const x0 = Math.max(0, Math.floor(Math.min(...X))), x1 = Math.min(N - 1, Math.ceil(Math.max(...X)))
    const y0 = Math.max(0, Math.floor(Math.min(...Y))), y1 = Math.min(N - 1, Math.ceil(Math.max(...Y)))
    const d = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2]); if (Math.abs(d) < 1e-9) continue
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const A = ((Y[1] - Y[2]) * (x + .5 - X[2]) + (X[2] - X[1]) * (y + .5 - Y[2])) / d
      const B = ((Y[2] - Y[0]) * (x + .5 - X[2]) + (X[0] - X[2]) * (y + .5 - Y[2])) / d
      if (A >= 0 && B >= 0 && A + B <= 1) cov[y * N + x] = 1
    }
  }
  let nCov = 0; for (let i = 0; i < cov.length; i++) nCov += cov[i]
  console.log('UV coprono', (nCov / (N * N) * 100).toFixed(1) + '% dell\'atlante')
  for (const f of ['auto2_col.webp', 'auto2r_col.webp']) {
    const T = await tex('public/texture/' + f)
    let dipInCov = 0
    for (let p = 0; p < N * N; p++) { if (!cov[p]) continue; const o = p * T.C; if (T.d[o] + T.d[o + 1] + T.d[o + 2] > 18) dipInCov++ }
    console.log('  ', f.padEnd(18), 'della superficie coperta, DIPINTA:', (dipInCov / nCov * 100).toFixed(1) + '%')
  }
  // confronto onesto: stessi punti 3D, atlanti diversi
  const V = await carica('asset/auto/auto2_PRIMA_DEL_REMESH.glb')
  const Tn = await tex('texture-sorgente/auto2r_col.webp'), Tv = await tex('texture-sorgente/auto2_col.webp')
  const cell = 0.06, gr = new Map()
  V.CEN.forEach((p, i) => { const kk = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)},${Math.floor(p.z / cell)}`
    let a = gr.get(kk); if (!a) { a = []; gr.set(kk, a) } a.push(i) })
  let n = 0, sn = 0, sv = 0
  const passo = Math.max(1, Math.floor(M.nTri / 20000))
  for (let t = 0; t < M.nTri; t += passo) {
    const p = M.CEN[t]; let best = -1, bd = 1e9
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell)
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const arr = gr.get(`${cx + a},${cy + b},${cz + c}`); if (!arr) continue
      for (const i of arr) { const d = p.distanceToSquared(V.CEN[i]); if (d < bd) { bd = d; best = i } } }
    if (best < 0) continue
    n++
    const [r1, g1, b1] = campiona(Tn, M.CUV[t][0], M.CUV[t][1])
    const [r2, g2, b2] = campiona(Tv, V.CUV[best][0], V.CUV[best][1])
    if (0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1 < 40) sn++
    if (0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2 < 40) sv++
  }
  console.log('negli STESSI', n, 'punti 3D — scuri(<40): nuova', (sn / n * 100).toFixed(1) + '%  vecchia', (sv / n * 100).toFixed(1) + '%')
}

// ─────────────────────────────────────────────────────────────────────────
if (MODO === 'ginocchio') {
  const M = await carica('public/modelli/auto2.glb')
  const g = ginocchio(M)
  console.log('LUNG', M.dim.x.toFixed(3), 'ALT', M.dim.y.toFixed(3), 'LARG', M.dim.z.toFixed(3))
  console.log('x     y_ginocchio   largTetto(93% h locale)')
  for (let f = 0; f < g.NS; f += 2) {
    const x = M.dim.x * (f + 0.5) / g.NS
    const sel = M.P.filter(p => Math.abs(p.x - x) < M.dim.x / g.NS)
    let h = 0; for (const p of sel) h = Math.max(h, p.y)
    let wt = 0; for (const p of sel) if (p.y > h * 0.93) wt = Math.max(wt, Math.abs(p.z - M.dim.z / 2) * 2)
    console.log(x.toFixed(2).padStart(5), (isNaN(g.S[f]) ? '—' : g.S[f].toFixed(3)).padStart(12), wt.toFixed(3).padStart(12))
  }
}

// ─────────────────────────────────────────────────────────────────────────
if (MODO === 'taglio') {
  const X0 = Number(process.argv[3] ?? 1.00), X1 = Number(process.argv[4] ?? 3.45)
  const M = await carica('public/modelli/auto2.glb')
  const T = topologia(M)
  const g = ginocchio(M)
  let somma = 0, ns = 0
  for (const [kk] of T.spig) { const [a, c] = kk.split('_').map(Number); somma += T.posS.get(a).distanceTo(T.posS.get(c)); ns++ }
  console.log('spigolo medio della maglia:', (somma / ns * 1000).toFixed(1), 'mm  — e\' l\'ampiezza minima di un dente di sega')

  const sel = new Uint8Array(M.nTri)
  for (let t = 0; t < M.nTri; t++) {
    const q = g.a(M.CEN[t].x)
    sel[t] = (!isNaN(q) && M.CEN[t].y > q && M.CEN[t].x > X0 && M.CEN[t].x < X1) ? 1 : 0
  }
  const comp = val => { const visto = new Uint8Array(M.nTri), gr = []
    for (let t = 0; t < M.nTri; t++) { if (sel[t] !== val || visto[t]) continue
      const pila = [t]; visto[t] = 1; const gg = [t]
      while (pila.length) { const q = pila.pop(); for (const r of (T.adj.get(q) ?? [])) if (sel[r] === val && !visto[r]) { visto[r] = 1; pila.push(r); gg.push(r) } }
      gr.push(gg) }
    return gr.sort((a, c) => c.length - a.length) }
  const prima = comp(1).length
  for (const q of comp(1).slice(1)) if (q.length < 400) for (const t of q) sel[t] = 0
  for (const q of comp(0).slice(1)) if (q.length < 400) for (const t of q) sel[t] = 1
  let nSel = 0, area = 0, areaT = 0; const vset = new Set()
  for (let t = 0; t < M.nTri; t++) { areaT += M.AREA[t]; if (sel[t]) { nSel++; area += M.AREA[t]; for (let e = 0; e < 3; e++) vset.add(M.tri(t, e)) } }
  const bordo = []; let lung = 0
  for (const [kk, f] of T.spig) { if (f.length !== 2) continue; const [a, c] = f; if (sel[a] === sel[c]) continue
    const [i0, i1] = kk.split('_').map(Number); lung += T.posS.get(i0).distanceTo(T.posS.get(i1)); bordo.push([i0, i1]) }
  console.log(`taglio sopra il ginocchio, x[${X0},${X1}] → ${nSel} triangoli (${(nSel / M.nTri * 100).toFixed(1)}%), ${vset.size} vertici, ${(area / areaT * 100).toFixed(1)}% dell'area`)
  console.log('  isole', comp(1).length, '(prima della pulizia', prima + ')', ' perimetro', lung.toFixed(2), 'm su', bordo.length, 'spigoli')

  // --- la seghettatura: il bordo contro la propria linea media
  const grado = new Map()
  for (const [a, c] of bordo) { if (!grado.has(a)) grado.set(a, []); if (!grado.has(c)) grado.set(c, [])
    grado.get(a).push(c); grado.get(c).push(a) }
  const usato = new Set(), anelli = []
  for (const [a] of bordo) { if (usato.has(a)) continue
    let cur = a, prev = -1; const loop = []
    while (true) { loop.push(cur); usato.add(cur)
      const vic = (grado.get(cur) ?? []).filter(x => x !== prev && !usato.has(x))
      if (!vic.length) break
      prev = cur; cur = vic[0] }
    if (loop.length > 8) anelli.push(loop) }
  anelli.sort((a, c) => c.length - a.length)
  let tg = 0, tl = 0
  const righe = []
  for (const loop of anelli.slice(0, 4)) {
    const pts = loop.map(i => T.posS.get(i).clone())
    let grezzo = 0; for (let i = 0; i < pts.length - 1; i++) grezzo += pts[i].distanceTo(pts[i + 1])
    const lisc = pts.map(p => p.clone())
    for (let it = 0; it < 60; it++) { const nu = lisc.map(p => p.clone())
      for (let i = 1; i < lisc.length - 1; i++) nu[i].copy(lisc[i - 1]).add(lisc[i + 1]).multiplyScalar(0.5).lerp(lisc[i], 0.35)
      for (let i = 0; i < lisc.length; i++) lisc[i].copy(nu[i]) }
    let liscio = 0; for (let i = 0; i < lisc.length - 1; i++) liscio += lisc[i].distanceTo(lisc[i + 1])
    const dev = pts.map((p, i) => p.distanceTo(lisc[i])).sort((a, c) => a - c)
    tg += grezzo; tl += liscio
    righe.push({ vertici: pts.length, grezzo_m: +grezzo.toFixed(3), liscio_m: +liscio.toFixed(3),
      seghetta: +(grezzo / liscio).toFixed(2), scarto_mediano_mm: +(dev[Math.floor(dev.length / 2)] * 1000).toFixed(1),
      scarto_p90_mm: +(dev[Math.floor(dev.length * 0.9)] * 1000).toFixed(1) })
  }
  console.table(righe)
  console.log('SEGHETTATURA COMPLESSIVA', (tg / tl).toFixed(2) + 'x  (', tg.toFixed(2), 'm di bordo per', tl.toFixed(2), 'm di linea media )')
  console.log('→ il bordo per faccia non puo\' essere piu\' fine di uno spigolo: senza un anello')
  console.log('  di spigoli CUCITO sulla linea, il taglio zigzaga di circa mezza maglia.')
}
