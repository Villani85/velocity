/** L'ESPOSIZIONE SI MISURA. Media, percentili, quanto e' bruciato e quanto
 *  e' nero pieno — sul fotogramma intero e sulla fascia dove sta il
 *  soggetto. Un'immagine «troppo scura» o «troppo chiara» detta a occhio ha
 *  prodotto in questo progetto tre giri sbagliati di fila. */
import sharp from 'sharp'
const f = process.argv[2]
const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height
function stat(x0,x1,y0,y1,nome){
  const v=[]; let brucia=0, nero=0
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
    const i=(y*W+x)*3
    const l=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2]
    v.push(l); if(l>250) brucia++; if(l<4) nero++
  }
  v.sort((a,b)=>a-b)
  const q=p=>v[Math.floor(v.length*p)]|0
  const media=v.reduce((a,b)=>a+b,0)/v.length
  console.log(`${nome.padEnd(12)} media ${media.toFixed(1).padStart(5)}  p05 ${String(q(.05)).padStart(3)}  p50 ${String(q(.5)).padStart(3)}  p95 ${String(q(.95)).padStart(3)}  p99 ${String(q(.99)).padStart(3)}  bruciato ${(brucia/v.length*100).toFixed(2)}%  nero ${(nero/v.length*100).toFixed(1)}%`)
}
stat(0,W,0,H,'fotogramma')
stat(Math.round(W*0.26),Math.round(W*0.74),Math.round(H*0.36),Math.round(H*0.64),'soggetto')
stat(0,W,0,Math.round(H*0.33),'alto')
