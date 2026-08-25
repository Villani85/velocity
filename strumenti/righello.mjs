/** IL RIGHELLO — quanto e' dritto il bordo di un pezzo.
 *
 *  Nasce dal difetto piu' caro di questa sessione. Il committente ripeteva da
 *  giorni «un blocco geometrico sotto la scocca», io misuravo il TONO — quanto
 *  e' piu' chiaro il pavimento rispetto al pezzo — e quell'indicatore passava
 *  mentre il difetto restava intero. Non perche' fosse tarato male: perche' e'
 *  CIECO ALLA FORMA. Un cartoncino e un sottoscocca vero possono avere lo
 *  stesso identico rapporto di luminanza.
 *
 *  E' la stessa famiglia di errore che questo progetto ha gia' pagato otto
 *  volte: un criterio che non separa due popolazioni che condividono un valore.
 *  L'unica cura e' un criterio che guardi la cosa giusta — qui la geometria.
 *
 *  COME. Per ogni colonna dell'ingrandimento si cerca la riga piu' chiara
 *  dentro una fascia, cioe' la cresta del bordo. Poi si adatta una retta ai
 *  minimi quadrati e si misura di quanto la cresta se ne discosta. Se lo
 *  scostamento e' di due o tre pixel su un'immagine larga 1800, quel bordo e'
 *  una riga tirata col righello, e nessun colore lo salvera'. Un bordo che
 *  segue una carrozzeria vera si scosta di decine di pixel, perche' una
 *  fiancata non e' una retta.
 *
 *  ATTENZIONE A COSA VUOL DIRE PASSARE. Un valore alto non e' di per se' buono:
 *  una cresta che salta a caso da una colonna all'altra darebbe RMS altissimo
 *  ed e' rumore, non forma. Per questo si stampa anche la CONTINUITA' — quanto
 *  si muove la cresta fra due colonne vicine. Forma vuol dire scostamento
 *  grande e passo piccolo: una curva. Rumore vuol dire tutti e due grandi.
 *
 *  node strumenti/righello.mjs <immagine> [y0 y1]
 *  Le due quote sono in frazione dell'altezza; senza, prende il terzo centrale.
 */
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('sharp')

const file = process.argv[2]
if (!file) { console.log('serve un ingrandimento'); process.exit(1) }
const f0 = Number(process.argv[3] ?? 0.33)
const f1 = Number(process.argv[4] ?? 0.66)

const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, CH = info.channels
const y0 = Math.round(H * f0), y1 = Math.round(H * f1)
const L = (x, y) => {
  const i = (y * W + x) * CH
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
}

// la cresta: per ogni colonna, la riga piu' chiara dentro la fascia
const xs = [], ys = []
for (let x = 0; x < W; x++) {
  let mx = -1, my = -1
  for (let y = y0; y < y1; y++) { const v = L(x, y); if (v > mx) { mx = v; my = y } }
  /* LE COLONNE SPENTE NON SI CONTANO. Dove non c'e' nessun bordo, il massimo
     e' rumore di compressione e la sua posizione e' casuale: includerle
     gonfierebbe lo scostamento e farebbe passare per «forma» un'immagine
     vuota. E' lo stesso errore da cui nasce questo strumento, spostato di un
     passo. */
  if (mx < 12) continue
  xs.push(x); ys.push(my)
}
if (xs.length < W * 0.2) { console.log('  bordo non trovato in questa fascia'); process.exit(0) }

const n = xs.length
const mx = xs.reduce((a, b) => a + b, 0) / n
const my = ys.reduce((a, b) => a + b, 0) / n
let sxy = 0, sxx = 0
for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2 }
const m = sxx ? sxy / sxx : 0
let s2 = 0
for (let i = 0; i < n; i++) { const e = ys[i] - (my + m * (xs[i] - mx)); s2 += e * e }
const rms = Math.sqrt(s2 / n)

let passo = 0
for (let i = 1; i < n; i++) passo += Math.abs(ys[i] - ys[i - 1])
passo /= n - 1

console.log('  ' + file.split(/[\\/]/).pop() + '   (' + W + 'x' + H + ', fascia y ' + y0 + '-' + y1 + ')')
console.log('    colonne con bordo   ' + n + ' su ' + W)
console.log('    pendenza            ' + m.toFixed(4) + ' px per colonna')
console.log('    SCOSTAMENTO (RMS)   ' + rms.toFixed(1) + ' px' +
  (rms < 5 ? '   <- RIGA TIRATA COL RIGHELLO' : rms < 12 ? '   <- ancora molto dritta' : '   <- segue una forma'))
console.log('    continuita (passo)  ' + passo.toFixed(2) + ' px fra colonne vicine' +
  (passo > 6 ? '   <- attenzione: potrebbe essere rumore, non forma' : ''))
