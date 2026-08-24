/** DOVE SONO DAVVERO I PASSARUOTA.
 *  Il criterio vecchio cercava «i dodici punti piu' larghi di ogni quadrante».
 *  Su una carena continua quello non e' il passaruota: e' semplicemente il
 *  punto in cui la fiancata gonfia di piu'. Risultato misurato: le due ruote
 *  posteriori sfasate di 26 cm fra destra e sinistra, e un passo di 2,45 m su
 *  una vettura di 4,30 — cioe' le ruote ammassate al centro con un metro di
 *  sbalzo per parte.
 *  IL CRITERIO GIUSTO E' FISICO: un passaruota e' un INCAVO, quindi lungo la
 *  fiancata il punto piu' basso della carrozzeria si ALZA. Si scandisce x, si
 *  legge la quota minima del corpo in quella fetta, e i due massimi di quella
 *  curva sono i due archi. */
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
P.forEach(p => p.multiplyScalar(k))
box.setFromPoints(P)
const L = box.max.x - box.min.x, W = box.max.z - box.min.z
console.log(`vettura  L ${L.toFixed(3)}  W ${W.toFixed(3)}  H ${(box.max.y - box.min.y).toFixed(3)}`)

const N = 96
/* SU UNA VETTURA A RUOTE CARENATE NON C'E' NESSUN PASSARUOTA APERTO: il fondo
   e' chiuso e piatto (verificato: il profilo della quota minima e' una riga
   sola). La ruota sta dentro un BAULETTO, e un bauletto sul fianco e' un
   RIGONFIAMENTO. Quindi il segnale non e' il fondo che si alza — e' la
   SEMILARGHEZZA che cresce. I due massimi locali per fianco sono i due assi. */
for (const [nome, segno] of [['destra', -1], ['sinistra', 1]]) {
  const cz = (box.min.z + box.max.z) / 2
  const semi = new Array(N).fill(0)
  for (const p of P) {
    const d = segno * (p.z - cz)
    if (d <= 0) continue
    const q = p.y - box.min.y
    // la fascia della ruota: sopra il fondo, sotto la linea di cintura
    if (q < 0.06 || q > 0.46) continue
    const f = Math.min(N - 1, Math.floor((p.x - box.min.x) / L * N))
    if (d > semi[f]) semi[f] = d
  }
  const maxS = Math.max(...semi)
  const meta = Math.floor(N / 2)
  const picco = (a, b) => {
    let bi = -1, bv = -1
    for (let i = a; i < b; i++) if (semi[i] > bv) { bv = semi[i]; bi = i }
    return { x: box.min.x + (bi + 0.5) / N * L, semi: bv }
  }
  const dietro = picco(3, meta - 4), davanti = picco(meta + 4, N - 3)
  console.log(`
fianco ${nome}:  semilarghezza massima ${maxS.toFixed(3)} m`)
  console.log(`  bauletto posteriore  x ${dietro.x.toFixed(3)}  semi ${dietro.semi.toFixed(3)}`)
  console.log(`  bauletto anteriore   x ${davanti.x.toFixed(3)}  semi ${davanti.semi.toFixed(3)}`)
  console.log(`  passo ${(davanti.x - dietro.x).toFixed(3)} m = ${((davanti.x - dietro.x) / L * 100).toFixed(0)}% della lunghezza`)
  console.log('  profilo della semilarghezza (coda a sinistra, muso a destra):')
  console.log('  ' + semi.map(v => { const r = v / maxS; return r > 0.97 ? '#' : r > 0.92 ? '+' : r > 0.82 ? '.' : r > 0.5 ? '-' : ' ' }).join(''))
}

/* ---- IL PROFILO DELL'ALTEZZA -------------------------------------------
   La semilarghezza non ha nessun picco davanti: e' un altopiano, e su un
   altopiano un cercatore di massimi restituisce un punto qualunque. Serve un
   altro segnale, e quello fisico e': UNA RUOTA DEVE STARCI SOTTO. Quindi si
   guarda quanto e' ALTA la carrozzeria fetta per fetta — dove il corpo si
   assottiglia in una lama, una ruota da 35 cm di raggio non ci sta. */
{
  const N2 = 96
  const alt = new Array(N2).fill(0)
  const largo = new Array(N2).fill(0)
  const cz2 = (box.min.z + box.max.z) / 2
  for (const p of P) {
    const f = Math.min(N2 - 1, Math.floor((p.x - box.min.x) / L * N2))
    const q = p.y - box.min.y
    if (q > alt[f]) alt[f] = q
    const d = Math.abs(p.z - cz2)
    if (d > largo[f]) largo[f] = d
  }
  const RAGGIO = 0.354
  console.log('\n  altezza della carrozzeria, fetta per fetta (coda a sinistra, muso a destra):')
  console.log('  ' + alt.map(v => v > 0.85 ? '#' : v > 0.70 ? '+' : v > 0.55 ? '.' : v > 0.35 ? '-' : ' ').join(''))
  console.log('  semilarghezza:')
  console.log('  ' + largo.map(v => v > 0.82 ? '#' : v > 0.70 ? '+' : v > 0.55 ? '.' : v > 0.30 ? '-' : ' ').join(''))
  // la finestra in cui una ruota ci sta: corpo alto almeno 2R e largo almeno R
  const ok = alt.map((a, i) => a >= RAGGIO * 1.9 && largo[i] >= 0.45)
  let primo = ok.indexOf(true), ultimo = ok.lastIndexOf(true)
  const xa = (i) => box.min.x + (i + 0.5) / N2 * L
  console.log(`\n  la carrozzeria puo' ospitare una ruota fra x ${xa(primo).toFixed(3)} e x ${xa(ultimo).toFixed(3)}`)
  console.log(`  cioe' una finestra lunga ${(xa(ultimo) - xa(primo)).toFixed(3)} m su ${L.toFixed(2)} m di vettura`)
  const marg = RAGGIO * 1.02
  console.log(`  assi con margine di un raggio ai due estremi:`)
  console.log(`     posteriore x ${(xa(primo) + marg).toFixed(3)}   anteriore x ${(xa(ultimo) - marg).toFixed(3)}`)
  console.log(`     passo ${((xa(ultimo) - marg) - (xa(primo) + marg)).toFixed(3)} m = ${(((xa(ultimo) - marg) - (xa(primo) + marg)) / L * 100).toFixed(0)}% della lunghezza`)
}
