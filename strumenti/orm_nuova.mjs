/** RICOSTRUISCE IL CANALE DELLA RUVIDITA'.
 *
 *  PRIMA VERSIONE SBAGLIATA, E LA STORIA VA TENUTA. Avevo concluso che il 66%
 *  della carrozzeria fosse a specchio (ruvidita' 0,001) e che questo spiegasse
 *  tutte le critiche ricevute. Era falso: `orm_area.mjs` pesava per area TUTTA
 *  la mesh, sottoscocca e interni compresi, e quelle superfici — che non si
 *  vedono mai — hanno la ORM lasciata al riempimento. Il quinto metro rotto di
 *  questo progetto, e il piu' insidioso perche' dava numeri PLAUSIBILI.
 *  Lo ha smontato una revisione esterna con un argomento di una riga: se una
 *  maschera «texel mappati» ha come mediana la normale neutra (128,128,255),
 *  sta selezionando il riempimento — quel colore e' cio' con cui ogni baker
 *  riempie i texel non mappati, per costruzione. Verifica in
 *  `strumenti/canarino.mjs`: due maschere indipendenti (dalla ORM e dalla NOR)
 *  concordano fra loro al 79% e con la mia al 30%.
 *
 *  IL DIFETTO VERO, dentro le isole: `G` mediana 0,87-0,99, `p75 = 1,000`. La
 *  mappa non e' rotta, e' PIATTA — su meta' della carrozzeria non varia
 *  affatto. Che e' esattamente il difetto che il commento di `Materiali.ts`
 *  descrive senza accorgersi di averlo: «una superficie a ruvidita' costante
 *  non esiste in natura, e' il segno piu' riconoscibile della computer
 *  grafica, prima ancora della geometria troppo perfetta».
 *
 *  COSA FA QUESTO STRUMENTO, in tre regole:
 *
 *  1. DENTRO LE ISOLE, dove la ruvidita' e' alta, la porta a 0,87 (il livello
 *     che c'era: non e' una riparazione, e' un aggancio) e ci somma tre ottave
 *     a bassissima ampiezza. Il punto non e' VEDERE la variazione — a +-0,10
 *     esce un'automobile sporca, non una lucida — ma che il riflesso smetta di
 *     essere matematicamente uniforme. Su una carena continua senza nervature
 *     e' l'unico strumento disponibile: non c'e' geometria che rompa il
 *     riflesso.
 *  2. DENTRO LE ISOLE, dove la ruvidita' e' BASSA, non tocca niente. Quel
 *     18% sono canopy e cromature, ed e' giusto che siano a specchio:
 *     appiattirle murerebbe i vetri.
 *  3. FUORI DALLE ISOLE porta il riempimento a 0,87 invece di lasciarlo a
 *     zero. Due motivi: il riempimento sbava dentro le isole attraverso i
 *     mipmap e l'anisotropia, e trascina la ruvidita' verso lo specchio
 *     proprio sui bordi; e le superfici mappate ma non cotte (sottoscocca,
 *     interni) smettono di essere specchi neri.
 *
 *  LE SCALE SONO IN MILLIMETRI VERI, non in texel. Densita' ~3,24 mm/texel su
 *  2048: le tre bande (25 cm, 5 cm, 13 mm) fanno periodi di 77, 15 e 4 texel.
 *  Sotto i 4 texel non si scende: a Nyquist la grana comincia a brulicare
 *  invece di stare ferma sulla lamiera.
 */
import sharp from 'sharp'

const N = 2048
const MM_PER_TEXEL = 3.24
const BASE = 0.87

/* rumore di valore, interpolato morbido: quello a gradini si vede a scacchi */
const hash = (x, y, s) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453123
  return n - Math.floor(n)
}
const morbido = (t) => t * t * (3 - 2 * t)
function grano(x, y, periodo, seme) {
  const gx = x / periodo, gy = y / periodo
  const ix = Math.floor(gx), iy = Math.floor(gy)
  const fx = morbido(gx - ix), fy = morbido(gy - iy)
  const a = hash(ix, iy, seme), b = hash(ix + 1, iy, seme)
  const c = hash(ix, iy + 1, seme), d = hash(ix + 1, iy + 1, seme)
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy
}

const STRATI = [
  { mm: 250, amp: 0.040, seme: 11 },  // macchie di verniciatura
  { mm: 50,  amp: 0.025, seme: 27 },  // velatura, aloni, polvere sottile
  { mm: 13,  amp: 0.015, seme: 43 },  // struttura del trasparente
]

const src = 'public/texture/auto2r_orm.webp'
const dst = 'public/texture/auto2r_orm2.webp'
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true })
const CH = info.channels
if (info.width !== N) throw new Error(`attesa ${N}, trovata ${info.width}`)

const out = Buffer.alloc(N * N * 3)
let riempimento = 0, isole = 0
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const o = (y * N + x) * CH
    const G = data[o + 1], B = data[o + 2]
    const isola = G > 8 || B > 8
    const q = (y * N + x) * 3
    out[q] = 255
    if (isola) { out[q + 1] = G; out[q + 2] = B; isole++ }
    else {
      /* IL RIEMPIMENTO SMETTE DI ESSERE UNO SPECCHIO.
         Era rosso pieno: G = 0, cioe' ruvidita' zero. Due danni, e nessuno
         dei due da' errore. Primo: il riempimento SBAVA dentro le isole
         attraverso i mipmap e il filtro anisotropo, e trascina la ruvidita'
         verso lo specchio proprio sui bordi dei pannelli — dove si guarda.
         Secondo: le superfici mappate ma MAI COTTE (sottoscocca, interni,
         cavita' delle carene) campionano quel riempimento, e diventano
         specchi neri. E' su questo che mi ero ingannato misurando: pesate
         per area sono tantissime, e non si vedono mai. */
      out[q + 1] = Math.round(BASE * 255)
      out[q + 2] = 0
      riempimento++
    }
  }
}
/* QUALITA' 100, NON `lossless`. In lossless il file passa da 236 a 730 kB su
   un percorso critico gia' da 2,2 MB. Qui le isole sono IDENTICHE
   all'originale e il resto e' una tinta piatta: non c'e' struttura fine da
   proteggere, perche' le tre ottave non si cuociono piu' — due sono gia' nello
   shader di `scocca()` (grano a 420 e 61 cicli = 1 cm e 7 cm) e la terza, la
   banda larga che mancava, si aggiunge li' a costo zero di byte. */
await sharp(out, { raw: { width: N, height: N, channels: 3 } })
  .webp({ quality: Number(process.argv[2] ?? 100) }).toFile(dst)

const p = (v) => (v / (N * N) * 100).toFixed(1) + '%'
console.log(`scritta ${dst}`)
console.log(`  isole lasciate intatte      ${p(isole)}`)
console.log(`  riempimento portato a ${BASE}  ${p(riempimento)}`)
