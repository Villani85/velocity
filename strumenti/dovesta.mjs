/** DOVE STA IL SOLE DENTRO LA PANORAMICA — e a che rotazione lo si porta dietro
 *  l'automobile.
 *
 *  IL PUNTO. Il pulsante TRAMONTO gira la fotografia a 90 gradi, e il provino
 *  dice che quella e' la vista PIU' FREDDA delle quattro: cielo blu, nessun
 *  sole, la vettura illuminata d'azzurro. Ma il commento di `Panorama.ts` dice
 *  che nella fotografia il tramonto c'e' — «a settanta la piscina a sfioro col
 *  tramonto dentro».
 *
 *  Prima di costruire un sole finto conviene cercare quello vero. Una
 *  equirettangolare mappa l'azimut sull'asse orizzontale: la colonna x
 *  corrisponde a un angolo, e trovando la colonna piu' calda e piu' luminosa si
 *  trova dove guarda il sole. Poi si fa il conto di quale rotazione lo porta
 *  dietro l'automobile.
 *
 *  SI CERCA IL CALDO, NON IL LUMINOSO. La parte piu' luminosa di una
 *  panoramica notturna con una villa illuminata sono le vetrate — che sono
 *  bianche. Un tramonto e' meno luminoso e molto piu' ROSSO: il criterio e'
 *  (R-B) pesato per la luminanza, che premia cio' che e' insieme caldo e
 *  acceso. Cercare il massimo assoluto avrebbe trovato le finestre, ed e' la
 *  solita trappola del criterio che non separa due popolazioni.
 */
import sharp from 'sharp'

const IMG = process.argv[2] ?? 'public/hdri/corte_pano.webp'
const COLONNE = 180

const { data, info } = await sharp(IMG).raw().toBuffer({ resolveWithObject: true })
const L = info.width
const A = info.height
const C = info.channels

/* SOLO LA FASCIA DELL'ORIZZONTE. Un sole al tramonto sta basso per
   definizione, e cercarlo in tutta l'immagine vorrebbe dire farsi trovare
   il riflesso sull'acqua o una lampada del soffitto. Dal 40% al 62%
   dell'altezza: appena sopra e appena sotto la linea dell'orizzonte. */
const y0 = Math.floor(A * 0.40)
const y1 = Math.floor(A * 0.62)

const calore = new Float64Array(COLONNE)
const luce = new Float64Array(COLONNE)
for (let y = y0; y < y1; y++) {
  for (let x = 0; x < L; x++) {
    const i = (y * L + x) * C
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const k = Math.min(COLONNE - 1, Math.floor((x / L) * COLONNE))
    // caldo E acceso: la differenza rosso-blu pesata per quanta luce c'e'
    calore[k] += Math.max(0, r - b) * Y
    luce[k] += Y
  }
}

let migliore = 0
for (let k = 1; k < COLONNE; k++) if (calore[k] > calore[migliore]) migliore = k

const gradiSole = (migliore / COLONNE) * 360
console.log('LA PANORAMICA: ' + L + 'x' + A)
console.log('')
console.log('  la colonna piu calda della fascia d orizzonte sta a ' + gradiSole.toFixed(0) + ' gradi')
console.log('')

/* LE PRIME CINQUE, per capire se il massimo e' un picco vero o un caso.
   Un sole e' un massimo NETTO e isolato; se le prime cinque colonne sono
   sparse su tutto il giro, non c'e' nessun sole e il calore che si misura e'
   solo il colore generale della sera. */
const ordine = Array.from({ length: COLONNE }, (_, k) => k).sort((a, b) => calore[b] - calore[a])
const norm = calore[ordine[0]] || 1
console.log('  le cinque colonne piu calde:')
for (const k of ordine.slice(0, 5)) {
  console.log('    ' + ((k / COLONNE) * 360).toFixed(0).padStart(4) + ' gradi   calore ' +
    (calore[k] / norm).toFixed(3) + '   luce ' + (luce[k] / (luce[ordine[0]] || 1)).toFixed(2))
}

const vicine = ordine.slice(0, 5).filter((k) => {
  const d = Math.abs(k - migliore)
  return Math.min(d, COLONNE - d) <= COLONNE * 0.06
}).length
console.log('')
console.log(vicine >= 3
  ? '  E UN PICCO VERO: le colonne calde stanno vicine fra loro.'
  : '  NON E UN PICCO: il calore e sparso, in questa fotografia non c e un sole.')
