import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
const b = await chromium.launch({ args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport:{width:1200,height:750} })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', r => r.fulfill({ body:'export {}', contentType:'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil:'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza && window.esperienza.autoPronta, null, { timeout:180000 })
const res = await p.evaluate(() => {
  const e = window.esperienza
  let mesh = null
  e.scena.traverse(o => { if (o.isMesh && o.name === 'AUTO') mesh = o })
  if (!mesh) return { err: 'mesh AUTO non trovata' }
  mesh.updateWorldMatrix(true, true)
  const M = mesh.matrixWorld.elements
  const pos = mesh.geometry.attributes.position, nor = mesh.geometry.attributes.normal
  const n = pos.count
  const P = i => { const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    return [M[0]*x+M[4]*y+M[8]*z+M[12], M[1]*x+M[5]*y+M[9]*z+M[13], M[2]*x+M[6]*y+M[10]*z+M[14]] }
  const N = i => { const x=nor.getX(i),y=nor.getY(i),z=nor.getZ(i);
    let a=M[0]*x+M[4]*y+M[8]*z, b=M[1]*x+M[5]*y+M[9]*z, c=M[2]*x+M[6]*y+M[10]*z
    const L=Math.hypot(a,b,c)||1; return [a/L,b/L,c/L] }
  // bounding box mondiale
  let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9]
  for (let i=0;i<n;i++){ const q=P(i); for(let k=0;k<3;k++){ if(q[k]<mn[k])mn[k]=q[k]; if(q[k]>mx[k])mx[k]=q[k] } }
  const ext=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]]
  // asse LUNGHEZZA = orizzontale (X o Z) più esteso; H = l'altro orizzontale; up = Y
  const L = ext[0] >= ext[2] ? 0 : 2, H = L===0?2:0
  const midY = (mn[1]+mx[1])/2, hh = ext[1]
  // fiancata: normale prevalentemente laterale (verso +H) e banda a mezza altezza
  const BINS = 90
  const sum = new Array(BINS).fill(0), cnt = new Array(BINS).fill(0)
  for (let i=0;i<n;i++){
    const nn = N(i)
    if (nn[H] < 0.6) continue                                  // solo un fianco
    const q = P(i)
    if (Math.abs(q[1]-midY) > 0.35*hh) continue                // banda porta/parafango
    const t = (q[L]-mn[L])/(ext[L]||1)
    const bi = Math.min(BINS-1, Math.max(0, Math.floor(t*BINS)))
    sum[bi] += nn[1]; cnt[bi] += 1                             // segnale = inclinazione verticale
  }
  // riempi i vuoti per interpolazione
  const s = new Array(BINS).fill(null)
  for (let i=0;i<BINS;i++) if(cnt[i]>0) s[i]=sum[i]/cnt[i]
  for (let i=0;i<BINS;i++) if(s[i]===null){ let a=i-1;while(a>=0&&s[a]===null)a--; let b2=i+1;while(b2<BINS&&s[b2]===null)b2++;
    s[i] = a>=0&&b2<BINS ? s[a]+(s[b2]-s[a])*(i-a)/(b2-a) : (a>=0?s[a]:(b2<BINS?s[b2]:0)) }
  const filled = cnt.filter(c=>c>0).length
  // seconda differenza = curvatura; inversioni della prima = ondulazioni
  const d2=[]; for(let i=1;i<BINS-1;i++) d2.push(s[i-1]-2*s[i]+s[i+1])
  const rms = Math.sqrt(d2.reduce((a,v)=>a+v*v,0)/d2.length)
  const d1=[]; for(let i=0;i<BINS-1;i++) d1.push(s[i+1]-s[i])
  let flips=0; for(let i=1;i<d1.length;i++) if((d1[i-1]>0)!==(d1[i]>0)) flips++
  let wi=0; for(let i=0;i<d2.length;i++) if(Math.abs(d2[i])>Math.abs(d2[wi])) wi=i
  return { vertici:n, asseLunghezza:(L===0?'X':'Z'), estensione:ext.map(v=>+v.toFixed(2)),
           bin_pieni:filled, waviness_rms:+rms.toFixed(5), ondulazioni:flips,
           bin_peggiore:wi+1, materiale:{clearcoat:mesh.material.clearcoat, ccR:mesh.material.clearcoatRoughness, rough:mesh.material.roughness} }
})
console.log(JSON.stringify(res, null, 1))
await b.close()
