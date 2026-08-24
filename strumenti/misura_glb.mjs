import { readFileSync } from 'fs'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

// three GLTFLoader in node tocca il DOM per le texture: le neutralizzo (misuro solo geometria)
globalThis.self = globalThis
globalThis.createImageBitmap = async () => ({ width:1, height:1, close(){} })

function measure(mesh){
  mesh.updateWorldMatrix(true,true)
  const M=mesh.matrixWorld.elements, pos=mesh.geometry.attributes.position, nor=mesh.geometry.attributes.normal, n=pos.count
  const P=i=>{const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);return[M[0]*x+M[4]*y+M[8]*z+M[12],M[1]*x+M[5]*y+M[9]*z+M[13],M[2]*x+M[6]*y+M[10]*z+M[14]]}
  const N=i=>{const x=nor.getX(i),y=nor.getY(i),z=nor.getZ(i);let a=M[0]*x+M[4]*y+M[8]*z,b=M[1]*x+M[5]*y+M[9]*z,c=M[2]*x+M[6]*y+M[10]*z;const L=Math.hypot(a,b,c)||1;return[a/L,b/L,c/L]}
  let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9]
  for(let i=0;i<n;i++){const q=P(i);for(let k=0;k<3;k++){if(q[k]<mn[k])mn[k]=q[k];if(q[k]>mx[k])mx[k]=q[k]}}
  const ext=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]], L=ext[0]>=ext[2]?0:2, H=L===0?2:0, midY=(mn[1]+mx[1])/2, hh=ext[1], B=90
  const sum=new Array(B).fill(0),cnt=new Array(B).fill(0)
  for(let i=0;i<n;i++){const nn=N(i); if(nn[H]<0.6)continue; const q=P(i); if(Math.abs(q[1]-midY)>0.35*hh)continue;
    const t=(q[L]-mn[L])/(ext[L]||1),bi=Math.min(B-1,Math.max(0,Math.floor(t*B))); sum[bi]+=nn[1]; cnt[bi]+=1}
  const s=new Array(B).fill(null); for(let i=0;i<B;i++) if(cnt[i]>0)s[i]=sum[i]/cnt[i]
  for(let i=0;i<B;i++) if(s[i]===null){let a=i-1;while(a>=0&&s[a]===null)a--;let b2=i+1;while(b2<B&&s[b2]===null)b2++;s[i]=a>=0&&b2<B?s[a]+(s[b2]-s[a])*(i-a)/(b2-a):(a>=0?s[a]:(b2<B?s[b2]:0))}
  const d2=[];for(let i=1;i<B-1;i++)d2.push(s[i-1]-2*s[i]+s[i+1]); const rms=Math.sqrt(d2.reduce((a,v)=>a+v*v,0)/d2.length)
  const d1=[];for(let i=0;i<B-1;i++)d1.push(s[i+1]-s[i]); let fl=0;for(let i=1;i<d1.length;i++)if((d1[i-1]>0)!==(d1[i]>0))fl++
  const filled=cnt.filter(c=>c>0).length
  return {vertici:n, asse:(L===0?'X':'Z'), ext:ext.map(v=>+v.toFixed(2)), bin_pieni:filled, waviness_rms:+rms.toFixed(5), ondulazioni:fl}
}

async function loadGLB(path){
  await MeshoptDecoder.ready
  const buf = readFileSync(path)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.byteLength)
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder)
  return await new Promise((res,rej)=> loader.parse(ab, '', g=>res(g), e=>rej(e)))
}

const file = process.argv[2]
try{
  const g = await loadGLB(file)
  let body=null, biggest=null, maxv=-1
  g.scene.traverse(o=>{ if(o.isMesh){ const v=o.geometry.attributes.position.count; if(o.name==='AUTO')body=o; if(v>maxv){maxv=v;biggest=o} } })
  const mesh = body || biggest
  const r = measure(mesh)
  console.log(JSON.stringify({file, mesh:mesh.name||'(senza nome)', ...r}, null, 1))
}catch(e){ console.log(JSON.stringify({file, errore:String(e).slice(0,200)})) }
