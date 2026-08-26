/** FAIRNESS DELLA CARROZZERIA — residuo da fit quadrico locale.
 *  Per ogni vertice campionato: si prendono i vicini entro R (metri reali), si
 *  costruisce un piano tangente e si adatta w = a+bu+cv+du²+euv+fv². Il RMS dei
 *  residui dice quanto la superficie si scosta da una forma liscia ALLA SCALA R.
 *  Sottrae la curvatura legittima (la assorbe la quadrica) e non ha il pavimento
 *  di rumore dei conteggi sulle normali. Bersaglio "product film": < ~0.1 mm a R=25mm.
 *
 *  ATTENZIONE A QUEL BERSAGLIO: e' un'aspirazione scritta qui, non una soglia di
 *  visibilita' misurata. Il 26 agosto 2026 e' stato messo in dubbio proprio per
 *  questo — 0,424 mm su una vettura di 4,5 metri sono lo 0,0076% della lunghezza
 *  — e la prova zebra ha dato ragione al bersaglio: le bande di un riflesso
 *  lungo ondeggiano e si strozzano su quasi tutta la fiancata.
 *  La lezione non e' «il numero aveva ragione». E': quello che si vede non e'
 *  lo scostamento, e' la sua DERIVATA lungo una banda lunga. Un residuo piccolo
 *  ma che cambia in fretta rompe un riflesso; uno grande e costante no. Quando
 *  questo numero e un provino non concordano, si guarda il provino a bande. */
import { readFileSync } from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })

const FILE = process.argv[2], R = Number(process.argv[3] ?? 0.025), LUNG = 4.4
await MeshoptDecoder.ready
const buf = readFileSync(FILE); const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength)
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((res,rej)=>loader.parse(ab,'',res,rej))
let mesh=null, maxv=-1
g.scene.updateMatrixWorld(true)
g.scene.traverse(o=>{ if(o.isMesh){ const v=o.geometry.attributes.position.count; if(v>maxv){maxv=v;mesh=o} } })
const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal
const M = mesh.matrixWorld
const P=[], N=[]
const v=new THREE.Vector3(), n=new THREE.Vector3()
const nm=new THREE.Matrix3().getNormalMatrix(M)
for(let i=0;i<pos.count;i++){
  v.fromBufferAttribute(pos,i).applyMatrix4(M); P.push(v.clone())
  n.fromBufferAttribute(nor,i).applyMatrix3(nm).normalize(); N.push(n.clone())
}
// normalizza alla lunghezza reale
const box=new THREE.Box3().setFromPoints(P); const size=new THREE.Vector3(); box.getSize(size)
const k = LUNG / Math.max(size.x,size.y,size.z)
P.forEach(p=>p.multiplyScalar(k))
// griglia per i vicini
const cell=R, grid=new Map(), key=(x,y,z)=>`${Math.floor(x/cell)},${Math.floor(y/cell)},${Math.floor(z/cell)}`
P.forEach((p,i)=>{ const kk=key(p.x,p.y,p.z); if(!grid.has(kk))grid.set(kk,[]); grid.get(kk).push(i) })
function vicini(p){ const out=[]; const cx=Math.floor(p.x/cell),cy=Math.floor(p.y/cell),cz=Math.floor(p.z/cell)
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){
    const arr=grid.get(`${cx+a},${cy+b},${cz+c}`); if(arr) out.push(...arr) } return out }
// campiona
const res=[]
const passo = Math.max(1, Math.floor(P.length/1500))
for(let i=0;i<P.length;i+=passo){
  const p=P[i], nn=N[i]
  // frame tangente
  const t1=new THREE.Vector3(1,0,0); if(Math.abs(nn.x)>0.9) t1.set(0,1,0)
  t1.crossVectors(nn,t1).normalize(); const t2=new THREE.Vector3().crossVectors(nn,t1)
  const pts=[]
  for(const j of vicini(p)){ if(N[j].dot(nn)<0.3) continue
    const d=new THREE.Vector3().subVectors(P[j],p); if(d.length()>R) continue
    pts.push([d.dot(t1), d.dot(t2), d.dot(nn)]) }
  if(pts.length<12) continue
  // minimi quadrati 6 coefficienti
  const A=[],y=[]
  for(const [u,w,h] of pts){ A.push([1,u,w,u*u,u*w,w*w]); y.push(h) }
  const AT=Array.from({length:6},(_,r)=>A.map(row=>row[r]))
  const ATA=AT.map(r=>AT.map(c=>r.reduce((s,x,q)=>s+x*c[q],0)))
  const ATy=AT.map(r=>r.reduce((s,x,q)=>s+x*y[q],0))
  // gauss
  const m=ATA.map((r,q)=>[...r,ATy[q]])
  for(let c=0;c<6;c++){ let piv=c; for(let r=c+1;r<6;r++) if(Math.abs(m[r][c])>Math.abs(m[piv][c])) piv=r
    ;[m[c],m[piv]]=[m[piv],m[c]]; if(Math.abs(m[c][c])<1e-12) { break }
    for(let r=0;r<6;r++){ if(r===c) continue; const f=m[r][c]/m[c][c]; for(let q=c;q<7;q++) m[r][q]-=f*m[c][q] } }
  const co=m.map((r,q)=>Math.abs(r[q])<1e-12?0:r[6]/r[q])
  let s2=0; for(const [u,w,h] of pts){ const f=co[0]+co[1]*u+co[2]*w+co[3]*u*u+co[4]*u*w+co[5]*w*w; s2+=(h-f)**2 }
  res.push(Math.sqrt(s2/pts.length))
}
res.sort((a,b)=>a-b)
const med=res[Math.floor(res.length/2)], p95=res[Math.floor(res.length*0.95)]
console.log(JSON.stringify({file:FILE.split(/[\/]/).pop(), vertici:P.length, patch:res.length,
  R_mm:R*1000, residuo_mediano_mm:+(med*1000).toFixed(3), residuo_p95_mm:+(p95*1000).toFixed(3)}))
