/** DIPINGE DI ROSSO LA CODA nella mappa emissiva.
 *  Quali pixel siano "la coda" non si indovina guardando l'atlante: si ricava
 *  dalla GEOMETRIA. Si prendono i triangoli del quarto posteriore, si
 *  rasterizzano i loro triangoli UV in una maschera, e dentro quella maschera
 *  i pixel accesi diventano rossi. Funziona solo con le UV a piena scala:
 *  finche' erano schiacciate a 0..0,0625 l'intersezione era vuota. */
import { readFileSync, writeFileSync } from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })
await MeshoptDecoder.ready
const b = readFileSync('public/modelli/auto2.glb')
const ab = b.buffer.slice(b.byteOffset, b.byteOffset+b.byteLength)
const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((r,j)=>l.parse(ab,'',r,j))
let mesh=null, mx=-1
g.scene.updateMatrixWorld(true)
g.scene.traverse(o=>{ if(o.isMesh){ const v=o.geometry.attributes.position.count; if(v>mx){mx=v;mesh=o} } })
const geo=mesh.geometry, pos=geo.attributes.position, uv=geo.attributes.uv, idx=geo.index
const box=new THREE.Box3().setFromBufferAttribute(pos)
const size=new THREE.Vector3(); box.getSize(size)
const asse = size.x>=size.z ? 'x' : 'z'
const min=box.min[asse], max=box.max[asse]
const N=2048
const mask=new Uint8Array(N*N)
function raster(u0,v0,u1,v1,u2,v2){
  const X=[u0*N,u1*N,u2*N], Y=[(1-v0)*N,(1-v1)*N,(1-v2)*N]
  const x0=Math.max(0,Math.floor(Math.min(...X))), x1=Math.min(N-1,Math.ceil(Math.max(...X)))
  const y0=Math.max(0,Math.floor(Math.min(...Y))), y1=Math.min(N-1,Math.ceil(Math.max(...Y)))
  const d=(Y[1]-Y[2])*(X[0]-X[2])+(X[2]-X[1])*(Y[0]-Y[2]); if(Math.abs(d)<1e-9) return
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const a=((Y[1]-Y[2])*(x+0.5-X[2])+(X[2]-X[1])*(y+0.5-Y[2]))/d
    const bb=((Y[2]-Y[0])*(x+0.5-X[2])+(X[0]-X[2])*(y+0.5-Y[2]))/d
    if(a>=-0.03&&bb>=-0.03&&a+bb<=1.03) mask[y*N+x]=1
  }
}
const LATO = process.argv[2]==='min' ? 'min' : 'max'
const QUOTA = Number(process.argv[3] ?? 0.30)
const limite = LATO==='max' ? max-(max-min)*QUOTA : min+(max-min)*QUOTA
const v=new THREE.Vector3()
let nTri=0
const n = idx? idx.count : pos.count
for(let t=0;t<n;t+=3){
  const a=[0,1,2].map(k=> idx? idx.getX(t+k) : t+k)
  let c=0; for(const q of a){ v.fromBufferAttribute(pos,q); c+=v[asse] } c/=3
  if(LATO==='max' ? c<limite : c>limite) continue
  nTri++
  raster(uv.getX(a[0]),uv.getY(a[0]),uv.getX(a[1]),uv.getY(a[1]),uv.getX(a[2]),uv.getY(a[2]))
}
let px=0; for(let i=0;i<mask.length;i++) px+=mask[i]
console.log(JSON.stringify({asse, lato:LATO, triangoli:nTri, pixelMaschera:px}))
writeFileSync('.tmp/maschera_coda.raw', Buffer.from(mask))
