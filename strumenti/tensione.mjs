/** TENSIONE DELLA CARROZZERIA — il metro della critica «sembra molle».
 *  Tre numeri, tutti in scala reale (asse maggiore normalizzato a 4,4 m):
 *   1. LINEA DI MASSIMA LARGHEZZA — per ogni fetta lungo x, il punto piu' esterno
 *      del fianco e la sua ALTEZZA. Su un'auto disegnata quell'altezza e' una
 *      curva intenzionale; qui oscilla, e l'oscillazione E' il difetto.
 *   2. DIEDRO nelle tre fasce dove andrebbero spalla / lama bassa / bordo del
 *      volume superiore: dice se una linea strutturale esiste davvero.
 *   3. FRAMMENTAZIONE UV lungo quelle fasce: quante isole dovrebbe attraversare
 *      una riga dipinta a mano nella normal map.
 *  Uso: node strumenti/tensione.mjs public/modelli/auto2.glb
 *  Il muso e' a +x (verificato: FARO_DX sta a x=+2,271). */
import { readFileSync } from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })
const FILE = process.argv[2], LUNG=4.4
await MeshoptDecoder.ready
const buf=readFileSync(FILE); const ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)
const l=new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder)
const g=await new Promise((r,j)=>l.parse(ab,'',r,j))
g.scene.updateMatrixWorld(true)
let mesh=null,mv=-1
g.scene.traverse(o=>{if(o.isMesh){const v=o.geometry.attributes.position.count;if(v>mv){mv=v;mesh=o}}})
const geo=mesh.geometry, pos=geo.attributes.position, nor=geo.attributes.normal, uv=geo.attributes.uv, idx=geo.index
const bb=new THREE.Box3().setFromBufferAttribute(pos); const dim=new THREE.Vector3(); bb.getSize(dim)
const S=LUNG/Math.max(dim.x,dim.y,dim.z)
// coordinate normalizzate: origine al centro in X e Z, Y da 0 (fondo) in su
const cx=(bb.min.x+bb.max.x)/2, cz=(bb.min.z+bb.max.z)/2, y0=bb.min.y
const P=[],N=[]
for(let i=0;i<pos.count;i++){
  P.push([(pos.getX(i)-cx)*S,(pos.getY(i)-y0)*S,(pos.getZ(i)-cz)*S])
  N.push([nor.getX(i),nor.getY(i),nor.getZ(i)])
}
const H=(bb.max.y-bb.min.y)*S, W=(bb.max.z-bb.min.z)*S
console.log(`altezza ${H.toFixed(3)} m, larghezza ${W.toFixed(3)} m, lunghezza ${LUNG}`)
console.log('\n== LINEA DI MASSIMA LARGHEZZA (lato +Z, solo vertici sopra 0.30*H) ==')
console.log('  x[m]     z_max    y      n.y    n_lat   | conteggio')
const NB=22, x0=-LUNG/2, dx=LUNG/NB
const linea=[]
for(let b=0;b<NB;b++){
  const xa=x0+b*dx, xb=xa+dx
  let best=-1,bi=-1,cnt=0
  for(let i=0;i<P.length;i++){
    const p=P[i]
    if(p[0]<xa||p[0]>=xb) continue
    if(p[2]<=0) continue
    if(p[1]<0.30*H) continue
    cnt++
    if(p[2]>best){best=p[2];bi=i}
  }
  if(bi<0){console.log(`  ${(xa+dx/2).toFixed(2).padStart(6)}  -- vuoto --`);continue}
  const p=P[bi],n=N[bi]
  linea.push([p[0],p[1],p[2]])
  const lat=Math.hypot(n[0],n[2])
  console.log(`  ${(xa+dx/2).toFixed(2).padStart(6)}  ${p[2].toFixed(3)}  ${p[1].toFixed(3)}  ${n[1].toFixed(2).padStart(5)}  ${lat.toFixed(2)}  | ${cnt}`)
}
const ys=linea.map(p=>p[1])
const scarto=Math.max(...ys)-Math.min(...ys)
console.log(`  --> SCARTO D'ALTEZZA della linea di massima larghezza: ${(scarto*1000).toFixed(0)} mm  (bersaglio: monotona, < 40 mm di deviazione dalla curva voluta)`)

// diedro massimo in una fascia attorno alla linea di max larghezza
const gi=i=>idx?idx.getX(i):i
const nTri=idx?idx.count/3:pos.count/3
const key=i=>`${Math.round(P[i][0]*1e4)},${Math.round(P[i][1]*1e4)},${Math.round(P[i][2]*1e4)}`
const mp=new Map(); const canon=new Int32Array(pos.count)
for(let i=0;i<pos.count;i++){const k=key(i);if(!mp.has(k))mp.set(k,i);canon[i]=mp.get(k)}
const fn=[]
const A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3(),e1=new THREE.Vector3(),e2=new THREE.Vector3()
const spig=new Map()
for(let t=0;t<nTri;t++){
  const i0=gi(t*3),i1=gi(t*3+1),i2=gi(t*3+2)
  A.set(...P[i0]);B.set(...P[i1]);C.set(...P[i2])
  e1.subVectors(B,A);e2.subVectors(C,A)
  fn.push(new THREE.Vector3().crossVectors(e1,e2).normalize())
  const ad=(a,b)=>{const x=canon[a],y=canon[b];const k=x<y?x+'_'+y:y+'_'+x;if(!spig.has(k))spig.set(k,[]);spig.get(k).push(t)}
  ad(i0,i1);ad(i1,i2);ad(i2,i0)
}
function diedroInFascia(test,nome){
  let n=0,max=0,sopra20=0,sopra40=0
  for(const [k,ts] of spig){
    if(ts.length!==2) continue
    const [a,b]=k.split('_').map(Number)
    const pa=P[a],pb=P[b]
    const mx=(pa[0]+pb[0])/2,my=(pa[1]+pb[1])/2,mz=(pa[2]+pb[2])/2
    if(!test(mx,my,mz)) continue
    n++
    const ang=Math.acos(Math.max(-1,Math.min(1,fn[ts[0]].dot(fn[ts[1]]))))*180/Math.PI
    if(ang>max)max=ang
    if(ang>20)sopra20++
    if(ang>40)sopra40++
  }
  console.log(`  ${nome}: ${n} spigoli, diedro MAX ${max.toFixed(1)}°, >20° = ${sopra20} (${(100*sopra20/n).toFixed(2)}%), >40° = ${sopra40}`)
}
console.log('\n== DIEDRO NELLE FASCE DOVE ANDREBBERO LE TRE LINEE ==')
const lz=x=>{ // interpola la linea di max larghezza
  let best=null,bd=1e9
  for(const p of linea){const d=Math.abs(p[0]-x); if(d<bd){bd=d;best=p}}
  return best
}
diedroInFascia((x,y,z)=>{ if(z<0.15) return false; const p=lz(x); return p && Math.abs(y-p[1])<0.04 }, 'spalla (±40mm dalla max larghezza)')
diedroInFascia((x,y,z)=>z>0.15 && y>0.22*H && y<0.34*H, 'lama bassa (22-34% altezza, fiancata)')
diedroInFascia((x,y,z)=>y>0.62*H, 'volume superiore (>62% altezza)')
diedroInFascia(()=>true,'TUTTA la mesh')

// quante isole UV tocca una fascia di 30 mm attorno alla linea di spalla
const parent=new Int32Array(pos.count);for(let i=0;i<parent.length;i++)parent[i]=i
const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x}
const uni=(x,y)=>{x=find(x);y=find(y);if(x!==y)parent[y]=x}
for(let t=0;t<nTri;t++){const i0=gi(t*3),i1=gi(t*3+1),i2=gi(t*3+2);uni(i0,i1);uni(i1,i2)}
function isoleInFascia(test,nome){
  const s=new Set(); let n=0
  for(let i=0;i<P.length;i++){const p=P[i]; if(!test(p[0],p[1],p[2]))continue; n++; s.add(find(i))}
  console.log(`  ${nome}: ${n} vertici, ${s.size} ISOLE UV distinte`)
}
console.log('\n== FRAMMENTAZIONE UV LUNGO LE LINEE (quante isole va attraversata la riga dipinta) ==')
isoleInFascia((x,y,z)=>{const p=lz(x);return z>0.15&&p&&Math.abs(y-p[1])<0.03},'fascia spalla 30mm (lato destro)')
isoleInFascia((x,y,z)=>z>0.15&&y>0.24*H&&y<0.32*H,'fascia lama bassa (lato destro)')
isoleInFascia((x,y,z)=>y>0.72*H,'calotta superiore')
