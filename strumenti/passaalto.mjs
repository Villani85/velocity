/** PASSA-ALTO SULLA NORMAL MAP.
 *
 *  IL DIFETTO. Sulla carrozzeria corrono dei SEGNI: un arco che disegna il
 *  passaruota, una macchia a meta' fiancata, delle righe sul frontale. Sui
 *  colori scuri si intuiscono, su una vernice chiara sono evidenti. Isolati
 *  spegnendo `normalScale`: a zero spariscono tutti, quindi sono COTTI in
 *  `auto2r_nor.webp` — sono il modello generato rimasto impresso nella mappa.
 *
 *  PERCHE' UNA MASCHERA LOCALE NON BASTAVA. Il primo tentativo spianava una
 *  corona intorno a ciascun mozzo. Toglieva l'arco e basta: le righe davanti
 *  restavano, e il committente le ha viste subito su una finitura chiara.
 *  Curare un difetto dove lo si e' notato invece che dove sta e' la strada
 *  per accorgersene di nuovo al provino successivo.
 *
 *  LA DISTINZIONE GIUSTA NON E' «DOVE», E' «QUANTO LARGO».
 *  Una fuga fra due pannelli e' STRETTA: un solco di un paio di millimetri,
 *  cioe' pochi texel. Un arco cotto da un generatore e' una cresta LARGA, che
 *  si distende su decine di texel. Sono due bande di frequenza diverse, e si
 *  separano con un passa-alto: si sottrae alla mappa una versione sfocata di
 *  se' stessa. Quel che resta e' solo cio' che cambia in fretta — le fughe,
 *  le griglie, le prese — mentre l'ondulazione larga se ne va.
 *  E' lo stesso ragionamento delle bande BYK gia' usato per la vernice:
 *  Wa/Wb restano, Wd/We spariscono.
 *
 *  SI LAVORA SU XY, NON SU Z. I canali R e G sono le due componenti
 *  tangenti; Z si RICALCOLA alla fine come sqrt(1 - x^2 - y^2), perche' una
 *  normale deve restare unitaria. Filtrare anche il blu darebbe vettori non
 *  normalizzati, e three non se ne accorge: illumina storto e basta.
 */
import sharp from 'sharp'

/* SIGMA 34, E IL VERSO NON E' QUELLO CHE SEMBRA.
   Un passa-alto e' «originale meno sfocato». Un sigma PICCOLO da' una sfocatura
   vicina all'originale, quindi la differenza e' piccola: toglie DI PIU'. Avevo
   la regola al contrario, e cercando di salvare le fughe le stavo cancellando.
   Il cancello e' su due numeri e vanno letti insieme: la MEDIANA dello scarto
   angolare deve scendere (la banda bassa se ne va) e il P95 deve restare alto
   (la coda e' dove vivono fughe, prese d'aria e griglie — l'unico contenuto
   per cui la mappa esiste).
     sigma  5   mediana 1,7   p95 16,6   <- fughe rase
     sigma 11   mediana 4,6   p95 28,5
     sigma 20   mediana 6,4   p95 39,3
     sigma 34   mediana 7,8   p95 47,1   <- passa: <=8 e >=40
     sigma 50   mediana 8,4   p95 51,2   <- la banda bassa comincia a restare
   34 px su 2048 sono ~22 cm sulla carrozzeria: se ne va solo l'ondulazione
   piu' larga di cosi'. */
const SIGMA = Number(process.argv[2] ?? 34)
const TIENI = Number(process.argv[3] ?? 1.0)   // quanto del dettaglio stretto si conserva
const SRC = 'public/texture/auto2r_nor.webp'
const DST = process.argv[4] ?? 'public/texture/_nor_passaalto.png'

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
const S = info.width, CH = info.channels
// la versione sfocata: e' la banda BASSA, quella da togliere
const sf = await sharp(SRC).blur(SIGMA).raw().toBuffer()

const out = Buffer.alloc(S * S * 3)
let scartoPrima = 0, scartoDopo = 0
for (let i = 0; i < S * S; i++) {
  const o = i * CH, q = i * 3
  // alto = originale - sfocato, ricentrato su 128
  const hx = 128 + (data[o] - sf[o]) * TIENI
  const hy = 128 + (data[o + 1] - sf[o + 1]) * TIENI
  const X = Math.max(0, Math.min(255, Math.round(hx)))
  const Y = Math.max(0, Math.min(255, Math.round(hy)))
  const nx = (X / 255) * 2 - 1, ny = (Y / 255) * 2 - 1
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
  out[q] = X; out[q + 1] = Y; out[q + 2] = Math.round((nz * 0.5 + 0.5) * 255)
  scartoPrima += Math.abs(data[o] - 128) + Math.abs(data[o + 1] - 128)
  scartoDopo += Math.abs(X - 128) + Math.abs(Y - 128)
}
await sharp(out, { raw: { width: S, height: S, channels: 3 } })
  .png().toFile(DST)
const n = S * S
console.log(`sigma ${SIGMA} px  (su ${S}: la banda tolta e' piu' larga di ~${(SIGMA * 2 * 3.24).toFixed(0)} mm sulla carrozzeria)`)
console.log(`scarto medio dal piatto:  prima ${(scartoPrima / n / 2).toFixed(2)}  dopo ${(scartoDopo / n / 2).toFixed(2)} livelli`)
