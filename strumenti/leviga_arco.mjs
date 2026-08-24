/** SPIANA LA NORMAL MAP DENTRO LA CORONA DEL PASSARUOTA.
 *  Vedi `arco_maschera.mjs` per il perche' e per come si trova la regione.
 *  Dentro la maschera la normale torna neutra (128,128,255): quella e' una
 *  fiancata verniciata, e una fiancata verniciata non ha rilievo. Fuori non
 *  si tocca niente — le fughe, le prese e le griglie restano. La maschera e'
 *  sfumata perche' un taglio netto in una normal map si legge come una crepa. */
import sharp from 'sharp'

const S = 2048
const nor = await sharp('public/texture/auto2r_nor.webp').raw().toBuffer({ resolveWithObject: true })
const msk = await sharp('public/texture/_maschera_arco.png').raw().toBuffer({ resolveWithObject: true })
if (nor.info.width !== S || msk.info.width !== S) throw new Error('dimensioni diverse')
const CH = nor.info.channels, MC = msk.info.channels

const out = Buffer.alloc(S * S * 3)
let toccati = 0, sommaScarto = 0
for (let i = 0; i < S * S; i++) {
  const o = i * CH, m = msk.data[i * MC] / 255
  const R = nor.data[o], G = nor.data[o + 1], B = nor.data[o + 2]
  const q = i * 3
  if (m > 0.002) {
    toccati++
    sommaScarto += m * (Math.abs(R - 128) + Math.abs(G - 128))
    out[q] = Math.round(R + (128 - R) * m)
    out[q + 1] = Math.round(G + (128 - G) * m)
    out[q + 2] = Math.round(B + (255 - B) * m)
  } else { out[q] = R; out[q + 1] = G; out[q + 2] = B }
}
await sharp(out, { raw: { width: S, height: S, channels: 3 } })
  .webp({ quality: 92 }).toFile('public/texture/auto2r_nor2.webp')
console.log(`texel toccati ${toccati} (${(toccati / (S * S) * 100).toFixed(1)}%)`)
console.log(`rilievo tolto: ${(sommaScarto / Math.max(1, toccati)).toFixed(1)} livelli medi su 255`)
