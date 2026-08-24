/** TOGLIE L'ARCO DIPINTO NELLA MAPPA DI COLORE.
 *
 *  LA DIAGNOSI, e ci sono voluti tre tentativi sulla mappa sbagliata.
 *  Il segno ad arco sopra la ruota resisteva sia al passa-alto sia alla
 *  levigatura locale delle NORMALI. La prova che lo ha inchiodato: azzerando
 *  `m.map` — la sola mappa di COLORE — la fiancata diventa pulita di colpo.
 *  Quindi l'arco non e' un rilievo: e' DIPINTO. Il generatore l'ha cotto
 *  nell'albedo come una riga scura, ed e' per questo che su una vernice
 *  chiara grida mentre su una nera si intuisce appena: li' il contrasto con
 *  cio' che sta intorno e' massimo.
 *  Lezione: quando un segno resiste alla cura, non insistere sulla stessa
 *  mappa. Spegnile una alla volta — costa un provino a testa e chiude la
 *  questione.
 *
 *  LA CURA. Dentro la corona del passaruota si ALZA il fondo: i texel scuri
 *  vengono portati verso il livello dell'isola, che sui texel mappati ha
 *  mediana ~250. Non si sostituisce tutto con del bianco piatto — si toglie
 *  solo il buio, cosi' se in quella zona c'e' altro resta.
 */
import sharp from 'sharp'

const S = 2048
const SOGLIA = Number(process.argv[2] ?? 215)   // sotto questo si considera «riga scura»
const src = await sharp('public/texture/auto2r_col.webp').raw().toBuffer({ resolveWithObject: true })
const msk = await sharp(process.argv[3] ?? 'public/texture/_maschera_arco.png').raw().toBuffer({ resolveWithObject: true })
const CH = src.info.channels, MC = msk.info.channels

const out = Buffer.alloc(S * S * 3)
let alzati = 0
for (let i = 0; i < S * S; i++) {
  const o = i * CH, q = i * 3, m = msk.data[i * MC] / 255
  const R = src.data[o], G = src.data[o + 1], B = src.data[o + 2]
  const luma = 0.2126 * R + 0.7152 * G + 0.0722 * B
  if (m > 0.002 && luma < SOGLIA) {
    /* LA RAMPA E' STRETTA, e la prima versione era sbagliata: dividevo per la
       soglia intera, quindi una riga a luma 180 su una soglia di 215 veniva
       alzata del SEDICI per cento. Il segno restava, solo piu' pallido — e
       sembrava che la cura non funzionasse mentre era la dose a essere
       sbagliata. Quaranta livelli sotto la soglia bastano per considerarlo
       buio pieno e toglierlo del tutto. */
    const f = m * Math.max(0, Math.min(1, (SOGLIA - luma) / 40))
    out[q] = Math.round(R + (250 - R) * f)
    out[q + 1] = Math.round(G + (250 - G) * f)
    out[q + 2] = Math.round(B + (250 - B) * f)
    alzati++
  } else { out[q] = R; out[q + 1] = G; out[q + 2] = B }
}
await sharp(out, { raw: { width: S, height: S, channels: 3 } })
  .webp({ quality: 92 }).toFile('public/texture/auto2r_col2.webp')
console.log(`texel alzati ${alzati} (${(alzati / (S * S) * 100).toFixed(1)}%)`)
