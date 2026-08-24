/** LA ORM PESATA PER AREA VERA.
 *  Contare i triangoli mente: sono di dimensioni diversissime. Quello che si
 *  vede e' l'AREA, e la domanda a cui serve rispondere e' una sola: quanta
 *  superficie della vettura campiona una ruvidita' da specchio? */
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

const uv = mesh.geometry.attributes.uv
const pos = mesh.geometry.attributes.position
const nor = mesh.geometry.attributes.normal
const idx = mesh.geometry.index
const { data, info } = await sharp('public/texture/auto2r_orm.webp').raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, CH = info.channels

const M = mesh.matrixWorld
const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3()
const e1 = new THREE.Vector3(), e2 = new THREE.Vector3()
let tot = 0, specchio = 0, opaca = 0, metallo = 0, su = 0, suSpecchio = 0
for (let t = 0; t < idx.count; t += 3) {
  const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2)
  A.fromBufferAttribute(pos, a).applyMatrix4(M)
  B.fromBufferAttribute(pos, b).applyMatrix4(M)
  C.fromBufferAttribute(pos, c).applyMatrix4(M)
  const ar = e1.subVectors(B, A).cross(e2.subVectors(C, A)).length() * 0.5
  const u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3
  const v = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3
  const o = (Math.min(H - 1, Math.round(v * H)) * W + Math.min(W - 1, Math.round(u * W))) * CH
  const G = data[o + 1], Bl = data[o + 2]
  const ny = (nor.getY(a) + nor.getY(b) + nor.getY(c)) / 3
  tot += ar
  if (G < 64) specchio += ar
  else if (G > 192) opaca += ar
  if (Bl > 128) metallo += ar
  if (ny > 0.2) { su += ar; if (G < 64) suSpecchio += ar }
}
const p = x => (x / tot * 100).toFixed(1) + '%'
console.log('ruvidita mappata sotto 0,25 (SPECCHIO):', p(specchio))
console.log('ruvidita mappata sopra 0,75 (opaca)   :', p(opaca))
console.log('metallico mappato sopra 0,5           :', p(metallo))
console.log('area rivolta verso l alto             :', p(su),
  ' di cui a specchio', (suSpecchio / Math.max(1e-9, su) * 100).toFixed(1) + '%')
