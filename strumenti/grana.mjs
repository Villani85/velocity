/**
 * LA GRANA DELLA PELLE — generata, non fotografata e non chiesta a un modello.
 *
 * PERCHE' PROCEDURALE.
 *
 * Su una mappa di NORMALI un'immagine generata da un modello e' inutilizzabile,
 * e l'ho gia' pagato su questo progetto: i modelli producono immagini in cui la
 * luce e' cotta dentro, e una normale con la luce dentro descrive una
 * superficie che si illumina da sola. Il sintomo e' la «cartapesta»: il pezzo
 * ha un rilievo che non cambia mai al cambiare della luce.
 *
 * Una grana di pelle poi non ha bisogno di nessuna invenzione: e' letteralmente
 * un diagramma di Voronoi. La pelle si screpola lungo le linee equidistanti fra
 * i punti in cui il collagene si e' contratto — e' esattamente la definizione
 * di quel diagramma. Generarla e' piu' corretto che fotografarla, oltre che
 * ripetibile.
 *
 * PERCHE' AFFIANCABILE.
 *
 * La palpebra e' larga venti centimetri e le celle della grana sono un
 * millimetro e mezzo: servono centotrenta ripetizioni per lato. Una mappa che
 * non si affianca, ripetuta centotrenta volte, mostra centotrenta cuciture — e
 * a quel punto la cucitura E' la trama, che e' il difetto piu' comune delle
 * texture generate.
 *
 * Si ottiene misurando le distanze SUL TORO: quando si cerca la cella piu'
 * vicina, si considera anche il salto oltre il bordo. Costa una riga e rende il
 * risultato affiancabile per costruzione invece che per ritocco.
 *
 *   node strumenti/grana.mjs [lato] [celle per lato]
 */
import sharp from 'sharp'

const LATO = Number(process.argv[2] || 1024)
/**
 * QUANTE CELLE PER LATO, e da dove viene il numero.
 *
 * La grana di una pelle da plancia ha celle fra un millimetro e due. La mappa
 * si ripete ogni cinque centimetri di superficie (vedi `RIPETIZIONE` in
 * `Palpebra.ts`), quindi cinquanta millimetri diviso un millimetro e mezzo fa
 * trentatre celle per lato. Non e' un numero estetico: e' una misura fisica
 * divisa per un'altra.
 */
const CELLE = Number(process.argv[3] || 33)

// ---- i centri delle celle, con un disturbo: una griglia perfetta si vede
const centri = []
const passo = 1 / CELLE
// generatore deterministico: la stessa grana a ogni esecuzione, se no due
// versioni del sito hanno due plance diverse e nessuno capisce perche'
let seme = 20260821
const caso = () => {
  seme = (seme * 1664525 + 1013904223) >>> 0
  return seme / 4294967296
}
for (let y = 0; y < CELLE; y++) {
  for (let x = 0; x < CELLE; x++) {
    centri.push([
      (x + 0.5 + (caso() - 0.5) * 0.85) * passo,
      (y + 0.5 + (caso() - 0.5) * 0.85) * passo,
    ])
  }
}

/** distanza sul toro: il bordo destro confina con il sinistro */
function distanza(ax, ay, bx, by) {
  let dx = Math.abs(ax - bx); if (dx > 0.5) dx = 1 - dx
  let dy = Math.abs(ay - by); if (dy > 0.5) dy = 1 - dy
  return Math.sqrt(dx * dx + dy * dy)
}

// ---- l'altezza, in tre pezzi sovrapposti.
//
// IL SOLCO. La differenza fra la distanza dalla prima cella e dalla seconda
// vale zero esattamente sul confine e cresce verso l'interno: disegna le
// screpolature. Passata dentro uno smorzamento morbido diventa una riga scura
// STRETTA invece che una sfumatura larga — su una pelle vera i solchi sono
// sottili e netti, e' la superficie fra un solco e l'altro a essere morbida.
//
// LA CUPOLA. Il solco da solo lascia le celle PIATTE, e il risultato sembrano
// squame: nella prima versione la grana leggeva come pelle di coccodrillo. Una
// pelle bovina ha le celle leggermente BOMBATE, piu' alte al centro. Basta un
// ventotto per cento di bombatura perche' la luce ci scorra sopra invece di
// staccare da una faccetta all'altra.
//
// LA GRANA FINE. Sopra tutto, un disturbo a scala otto volte piu' piccola e
// ampiezza minima. E' quello che si vede solo da vicino, e la sua funzione non
// e' farsi notare: e' impedire che le zone piatte restino PERFETTAMENTE piatte,
// che e' il segnale con cui l'occhio riconosce una superficie generata.
const alt = new Float32Array(LATO * LATO)

// la ricerca si fa nelle nove celle intorno, non su tutte: senza, ogni prova
// costa un miliardo di distanze e non se ne fa nessuna
const dentroCella = (cx, cy) => centri[((cy + CELLE) % CELLE) * CELLE + ((cx + CELLE) % CELLE)]

/** disturbo deterministico da coordinate intere, senza tabelle */
function disturbo(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >> 13)) * 1274126177 | 0
  return ((h ^ (h >> 16)) >>> 0) / 4294967296
}
function disturboMorbido(fx, fy, n) {
  const x = fx * n, y = fy * n
  const xi = Math.floor(x), yi = Math.floor(y)
  const tx = x - xi, ty = y - yi
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty)
  const a00 = disturbo(xi % n, yi % n), a10 = disturbo((xi + 1) % n, yi % n)
  const a01 = disturbo(xi % n, (yi + 1) % n), a11 = disturbo((xi + 1) % n, (yi + 1) % n)
  return (a00 * (1 - sx) + a10 * sx) * (1 - sy) + (a01 * (1 - sx) + a11 * sx) * sy
}

let min = 1e9, max = -1e9
for (let y = 0; y < LATO; y++) {
  const fy = (y + 0.5) / LATO
  const cy = Math.floor(fy * CELLE)
  for (let x = 0; x < LATO; x++) {
    const fx = (x + 0.5) / LATO
    const cx = Math.floor(fx * CELLE)
    let d1 = 1e9, d2 = 1e9
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const c = dentroCella(cx + i, cy + j)
        const d = distanza(fx, fy, c[0], c[1])
        if (d < d1) { d2 = d1; d1 = d } else if (d < d2) { d2 = d }
      }
    }
    const q = Math.min(1, (d2 - d1) / (0.30 * passo))
    const solco = q * q * (3 - 2 * q)
    const cupola = 1 - Math.min(1, d1 / (0.62 * passo))
    const fine = (disturboMorbido(fx, fy, CELLE * 8) - 0.5) * 0.10
    const v = solco * (0.72 + 0.28 * cupola) + fine
    alt[y * LATO + x] = v
    if (v < min) min = v
    if (v > max) max = v
  }
}
for (let i = 0; i < alt.length; i++) alt[i] = (alt[i] - min) / (max - min || 1)

// ---- la mappa delle normali, con Sobel sul toro
//
// FORZA 2,6: la profondita' apparente. E' bassa di proposito. Una grana di
// pelle e' alta qualche centesimo di millimetro, e la tentazione di alzarla
// per «vederla» produce una superficie che sembra corteccia. Se non si vede,
// il problema e' la luce, non la grana.
const FORZA = 2.6
const nor = Buffer.alloc(LATO * LATO * 3)
const a = (x, y) => alt[((y + LATO) % LATO) * LATO + ((x + LATO) % LATO)]
for (let y = 0; y < LATO; y++) {
  for (let x = 0; x < LATO; x++) {
    const gx = (a(x + 1, y - 1) + 2 * a(x + 1, y) + a(x + 1, y + 1))
             - (a(x - 1, y - 1) + 2 * a(x - 1, y) + a(x - 1, y + 1))
    const gy = (a(x - 1, y + 1) + 2 * a(x, y + 1) + a(x + 1, y + 1))
             - (a(x - 1, y - 1) + 2 * a(x, y - 1) + a(x + 1, y - 1))
    let nx = -gx * FORZA, ny = -gy * FORZA, nz = 1
    const L = Math.hypot(nx, ny, nz)
    nx /= L; ny /= L; nz /= L
    const i = (y * LATO + x) * 3
    nor[i] = Math.round((nx * 0.5 + 0.5) * 255)
    nor[i + 1] = Math.round((ny * 0.5 + 0.5) * 255)
    nor[i + 2] = Math.round((nz * 0.5 + 0.5) * 255)
  }
}

// ---- la ruvidita': i dossi sono lucidati dall'uso, i solchi restano opachi.
//
// E' il dettaglio che fa la differenza fra «materiale con una grana» e
// «materiale usato»: su una plancia vera le creste sono state sfiorate da
// mille mani e riflettono un po' di piu'. Una ruvidita' uniforme sopra una
// normale variabile e' il segno tipico della texture fatta a meta'.
const rug = Buffer.alloc(LATO * LATO)
for (let i = 0; i < alt.length; i++) {
  rug[i] = Math.round((0.72 - alt[i] * 0.20) * 255)
}

const U = 'C:/Users/Giuseppe/Webingegno/velocity/public/texture'
await sharp(nor, { raw: { width: LATO, height: LATO, channels: 3 } })
  .webp({ quality: 92 }).toFile(`${U}/pelle_nor.webp`)
await sharp(rug, { raw: { width: LATO, height: LATO, channels: 1 } })
  .toColourspace('b-w').webp({ quality: 88 }).toFile(`${U}/pelle_rgh.webp`)
console.log(`grana ${LATO}x${LATO}, ${CELLE} celle per lato -> pelle_nor.webp, pelle_rgh.webp`)
