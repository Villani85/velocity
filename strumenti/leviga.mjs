/** LEVIGA — smorzamento di Taubin sulla mesh di una vettura.
 *
 *  !! PROVATO IL 26 AGOSTO 2026, E PEGGIORA IL NUMERO. Non usarlo senza aver
 *  prima letto questo.
 *
 *  Scansione su `auto2.glb`, misurando `strumenti/fairness.mjs` a R=25 mm:
 *
 *    originale   mediana 0,424 mm   p95 1,510   620 kB
 *    K = 4               0,482          1,675   1,4 MB
 *    K = 8               0,514          1,463   1,4 MB
 *    K = 16              0,534          1,639   1,3 MB
 *    K = 28              0,566          1,737   1,3 MB
 *
 *  Peggiora in modo MONOTONO, e gia' a quattro iterazioni. Quindi non e' un
 *  problema di taratura — troppe iterazioni smorzano via la forma — e' un
 *  difetto strutturale.
 *
 *  L'IPOTESI CHE REGGE: la mesh ha 60.137 vertici con le cuciture delle UV
 *  DUPLICATE. Smorzare ogni copia per conto suo le allontana invece di
 *  avvicinarle: la superficie si strappa lungo le isole di texture, e il
 *  residuo dal fit quadrico locale sale proprio li'. Smorzare una mesh non
 *  saldata non e' levigare, e' scucire.
 *
 *  Perche' funzioni servirebbe: saldare i vertici per posizione, smorzare,
 *  e ricucire le UV al loro posto. Non e' impossibile — e' un'altra cosa da
 *  quella che fa questo file oggi.
 *
 *  E l'asset passa da 620 kB a 1,4 MB, perche' riesportando si perde la
 *  quantizzazione. Su un percorso critico gia' da 2,2 MB, da solo basterebbe.
 *
 *  Che la superficie sia davvero il collo di bottiglia lo dice la prova zebra
 *  (`strumenti/zebra_render.mjs`): le bande ondeggiano e si strozzano su quasi
 *  tutta la fiancata. Il difetto c'e'; questa non e' la sua cura.
 */
import { NodeIO } from '@gltf-transform/core'
import { KHRMeshQuantization, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { dequantize, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

const IN = process.argv[2]
const K = parseInt(process.argv[3] ?? '8', 10)          // iterazioni Taubin
const OUT = process.argv[4] ?? `.tmp/auto2_fair${K}.glb`
const SOLO = process.argv[5] ?? 'AUTO'                   // mesh da lisciare

await MeshoptDecoder.ready; await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions([KHRMeshQuantization, EXTMeshoptCompression])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })

const doc = await io.read(IN)
await doc.transform(dequantize(), weld())               // float + salda i vertici coincidenti

function taubin(pos, idx, iters, lambda=0.5, mu=-0.53){
  const n = pos.length/3
  const nb = Array.from({length:n}, ()=>new Set())
  for(let t=0;t<idx.length;t+=3){const a=idx[t],b=idx[t+1],c=idx[t+2];nb[a].add(b);nb[a].add(c);nb[b].add(a);nb[b].add(c);nb[c].add(a);nb[c].add(b)}
  const tmp = new Float32Array(pos.length)
  const step=(l)=>{ for(let i=0;i<n;i++){ let sx=0,sy=0,sz=0,c=0; for(const j of nb[i]){sx+=pos[j*3];sy+=pos[j*3+1];sz+=pos[j*3+2];c++}
      if(c){const dx=sx/c-pos[i*3],dy=sy/c-pos[i*3+1],dz=sz/c-pos[i*3+2]; tmp[i*3]=pos[i*3]+l*dx;tmp[i*3+1]=pos[i*3+1]+l*dy;tmp[i*3+2]=pos[i*3+2]+l*dz}
      else{tmp[i*3]=pos[i*3];tmp[i*3+1]=pos[i*3+1];tmp[i*3+2]=pos[i*3+2]} } pos.set(tmp) }
  for(let it=0;it<iters;it++){ step(lambda); step(mu) }
  return nb
}
function recomputeNormals(pos, nor, idx){
  nor.fill(0)
  for(let t=0;t<idx.length;t+=3){ const a=idx[t],b=idx[t+1],c=idx[t+2]
    const ax=pos[a*3],ay=pos[a*3+1],az=pos[a*3+2], bx=pos[b*3],by=pos[b*3+1],bz=pos[b*3+2], cx=pos[c*3],cy=pos[c*3+1],cz=pos[c*3+2]
    const e1x=bx-ax,e1y=by-ay,e1z=bz-az, e2x=cx-ax,e2y=cy-ay,e2z=cz-az
    const nx=e1y*e2z-e1z*e2y, ny=e1z*e2x-e1x*e2z, nz=e1x*e2y-e1y*e2x
    for(const v of [a,b,c]){ nor[v*3]+=nx; nor[v*3+1]+=ny; nor[v*3+2]+=nz } }
  for(let i=0;i<nor.length;i+=3){ const L=Math.hypot(nor[i],nor[i+1],nor[i+2])||1; nor[i]/=L;nor[i+1]/=L;nor[i+2]/=L }
}

let toccate=0
for(const mesh of doc.getRoot().listMeshes()){
  if(!mesh.getName().startsWith(SOLO)) continue
  for(const prim of mesh.listPrimitives()){
    const pAcc = prim.getAttribute('POSITION'), nAcc = prim.getAttribute('NORMAL'), iAcc = prim.getIndices()
    if(!pAcc || !iAcc) continue
    const pos = Float32Array.from(pAcc.getArray())
    const idx = Uint32Array.from(iAcc.getArray())
    taubin(pos, idx, K)
    const nor = nAcc ? Float32Array.from(nAcc.getArray()) : new Float32Array(pos.length)
    recomputeNormals(pos, nor, idx)
    pAcc.setArray(pos)
    if(nAcc) nAcc.setArray(nor); else prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor))
    toccate++
  }
}
await io.write(OUT, doc)
console.log(JSON.stringify({ in:IN, out:OUT, iterazioni:K, primitive_lisciate:toccate }))
