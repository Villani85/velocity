/** DENSITA' UV — quanti millimetri di lamiera vale un texel dell'atlante 2048.
 *  E' il numero che decide se una linea strutturale puo' stare in una texture:
 *  un bevel di 2 mm dentro un texel da 3,2 mm non esiste. Stampa anche isole e
 *  lunghezza totale delle cuciture, cioe' quante volte una riga dipinta a mano
 *  verrebbe spezzata. Uso: node strumenti/densita_uv.mjs public/modelli/auto2.glb */
import { readFileSync } from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })
const FILE = process.argv[2], LUNG = 4.4, TEX = 2048
await MeshoptDecoder.ready
const buf = readFileSync(FILE); const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength)
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
const g = await new Promise((res,rej)=>loader.parse(ab,'',res,rej))
g.scene.updateMatrixWorld(true)
let mesh=null,maxv=-1
g.scene.traverse(o=>{ if(o.isMesh){const v=o.geometry.attributes.position.count; if(v>maxv){maxv=v;mesh=o}} })
const geo = mesh.geometry
const pos = geo.attributes.position, uv = geo.attributes.uv
const idx = geo.index
// scala reale: normalizza sull'asse maggiore a LUNG
const bb = new THREE.Box3().setFromBufferAttribute(pos)
const dim = new THREE.Vector3(); bb.getSize(dim)
const asseMax = Math.max(dim.x,dim.y,dim.z)
const S = LUNG/asseMax
console.log('box locale', dim.toArray().map(n=>+n.toFixed(4)), '-> reale', dim.toArray().map(n=>+(n*S).toFixed(3)))
const nTri = idx ? idx.count/3 : pos.count/3
const gi = i => idx ? idx.getX(i) : i
const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3()
const ua=new THREE.Vector2(),ub=new THREE.Vector2(),uc=new THREE.Vector2()
const ab_=new THREE.Vector3(),ac_=new THREE.Vector3(),cr=new THREE.Vector3()
let a3tot=0, a2tot=0
const mmPerTexel=[]
for(let t=0;t<nTri;t++){
  const i0=gi(t*3),i1=gi(t*3+1),i2=gi(t*3+2)
  a.fromBufferAttribute(pos,i0).multiplyScalar(S); b.fromBufferAttribute(pos,i1).multiplyScalar(S); c.fromBufferAttribute(pos,i2).multiplyScalar(S)
  ab_.subVectors(b,a); ac_.subVectors(c,a); cr.crossVectors(ab_,ac_)
  const A3 = cr.length()*0.5
  ua.fromBufferAttribute(uv,i0); ub.fromBufferAttribute(uv,i1); uc.fromBufferAttribute(uv,i2)
  const A2 = Math.abs((ub.x-ua.x)*(uc.y-ua.y)-(uc.x-ua.x)*(ub.y-ua.y))*0.5
  a3tot+=A3; a2tot+=A2
  if(A3>1e-10&&A2>1e-12){
    const texelPerM2 = (A2*TEX*TEX)/A3
    mmPerTexel.push(1000/Math.sqrt(texelPerM2))
  }
}
mmPerTexel.sort((x,y)=>x-y)
const q=p=>+mmPerTexel[Math.floor(p*(mmPerTexel.length-1))].toFixed(3)
console.log('area 3D totale m2', +a3tot.toFixed(3), '| area UV usata (0..1)', +a2tot.toFixed(4), `(${(a2tot*100).toFixed(1)}% dell'atlante)`)
console.log('mm per texel  p05',q(.05),' p25',q(.25),' MEDIANA',q(.5),' p75',q(.75),' p95',q(.95))
console.log('globale: sqrt(a3/(a2*TEX^2))*1000 =', +(1000*Math.sqrt(a3tot/(a2tot*TEX*TEX))).toFixed(3),'mm/texel')

// isole UV: componenti connesse nello spazio UV (spigoli che condividono ENTRAMBI gli indici)
const parent=new Int32Array(pos.count); for(let i=0;i<parent.length;i++)parent[i]=i
const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x}
const uni=(x,y)=>{x=find(x);y=find(y);if(x!==y)parent[y]=x}
for(let t=0;t<nTri;t++){const i0=gi(t*3),i1=gi(t*3+1),i2=gi(t*3+2);uni(i0,i1);uni(i1,i2)}
const isole=new Set(); for(let i=0;i<pos.count;i++)isole.add(find(i))
console.log('isole UV (componenti connesse):', isole.size)

// cuciture: spigoli di posizione condivisa da 2 facce ma con indici diversi
const key=i=>{const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);return `${Math.round(x*1e5)},${Math.round(y*1e5)},${Math.round(z*1e5)}`}
const mapPos=new Map(); const canon=new Int32Array(pos.count)
for(let i=0;i<pos.count;i++){const k=key(i); if(!mapPos.has(k))mapPos.set(k,i); canon[i]=mapPos.get(k)}
const spig=new Map()
const add=(i,j)=>{const A=canon[i],B=canon[j];const k=A<B?A+'_'+B:B+'_'+A; if(!spig.has(k))spig.set(k,[]); spig.get(k).push([i,j])}
for(let t=0;t<nTri;t++){const i0=gi(t*3),i1=gi(t*3+1),i2=gi(t*3+2);add(i0,i1);add(i1,i2);add(i2,i0)}
let cuciti=0, interni=0, lunghCucitura=0
const p1=new THREE.Vector3(),p2=new THREE.Vector3()
for(const [k,lista] of spig){
  if(lista.length<2) continue
  interni++
  const set=new Set(lista.flat().map(i=>uv.getX(i).toFixed(6)+','+uv.getY(i).toFixed(6)))
  if(set.size>2){ cuciti++
    p1.fromBufferAttribute(pos,lista[0][0]).multiplyScalar(S); p2.fromBufferAttribute(pos,lista[0][1]).multiplyScalar(S)
    lunghCucitura+=p1.distanceTo(p2)
  }
}
console.log('spigoli interni', interni, '| di cui CUCITURA UV', cuciti, `(${(100*cuciti/interni).toFixed(1)}%)`, '| lunghezza totale cuciture', +lunghCucitura.toFixed(2),'m')
