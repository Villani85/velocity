/**
 * LA MASCHERA DELL'APERTURA — ricavata dalla fotografia, non disegnata.
 *
 * Il parabrezza nella scena non e' vetro: e' un BUCO. Dietro ci passa la
 * strada, che e' geometria vera in movimento. Serve quindi sapere, pixel per
 * pixel, dove finisce l'abitacolo e comincia il fuori.
 *
 * IL CRITERIO E' LA LUMINANZA, e funziona per una ragione fisica e non per
 * fortuna: di sera, dentro un'automobile, TUTTO cio' che e' dentro e' scuro e
 * tutto cio' che e' fuori e' chiaro. Non c'e' nessun punto dell'abitacolo piu'
 * luminoso del cielo al crepuscolo. Il gradino misurato su questa fotografia e'
 * netto — la plancia sta fra 17 e 40, il parabrezza fra 87 e 112 — quindi una
 * soglia a meta' strada separa i due senza casi dubbi.
 *
 * TRE PASSAGGI DOPO LA SOGLIA, e ognuno toglie un difetto preciso:
 *
 *   LA COMPONENTE PIU' GRANDE. Dentro l'abitacolo ci sono riflessi isolati piu'
 *   chiari della soglia — la modanatura in alluminio, un bordo lucido — e
 *   diventerebbero buchi nel cruscotto attraverso cui si vedrebbe la strada.
 *   Si tiene solo la macchia contigua piu' estesa, che e' il parabrezza.
 *
 *   I BUCHI SI RIEMPIONO. Dentro l'apertura ci sono cose scure — lo
 *   specchietto retrovisore — che la soglia esclude. Ma lo specchietto lo
 *   disegna gia' la fotografia sopra: se lo si toglie anche dalla maschera,
 *   resta un ritaglio a forma di specchietto in mezzo alla strada.
 *
 *   IL BORDO SI AMMORBIDISCE. Un ritaglio netto fra due immagini diverse si
 *   vede sempre, ed e' il modo piu' rapido di dire «due livelli». Due pixel di
 *   sfumatura bastano: e' anche cio' che fa una vera lente, che sul bordo di
 *   un oggetto in controluce lascia sempre un filo.
 *
 *   node strumenti/apertura_maschera.mjs <foto> <uscita.webp> [soglia]
 */
import sharp from 'sharp'

const FOTO = process.argv[2] || 'asset/abitacolo/abitacolo_v2.png'
const USCITA = process.argv[3] || 'public/texture/abitacolo_apertura.webp'
/** a meta' fra il piu' chiaro dell'abitacolo (40) e il piu' scuro del fuori (87) */
const SOGLIA = Number(process.argv[4] || 62)

const { data, info } = await sharp(FOTO).greyscale().raw().toBuffer({ resolveWithObject: true })
const { width: L, height: A } = info
const dentro = new Uint8Array(L * A)
for (let i = 0; i < L * A; i++) dentro[i] = data[i] > SOGLIA ? 1 : 0

/** la macchia contigua piu' grande, trovata con una coda invece che per ricorsione:
 *  su due milioni di pixel la ricorsione esaurisce lo stack e muore senza dire perche' */
function macchiaPiuGrande(m) {
  const visto = new Uint8Array(L * A)
  const coda = new Int32Array(L * A)
  let migliore = null, migliorArea = 0
  for (let s = 0; s < L * A; s++) {
    if (!m[s] || visto[s]) continue
    let testa = 0, fine = 0
    coda[fine++] = s; visto[s] = 1
    const pezzi = []
    while (testa < fine) {
      const p = coda[testa++]
      pezzi.push(p)
      const x = p % L, y = (p / L) | 0
      if (x > 0 && m[p - 1] && !visto[p - 1]) { visto[p - 1] = 1; coda[fine++] = p - 1 }
      if (x < L - 1 && m[p + 1] && !visto[p + 1]) { visto[p + 1] = 1; coda[fine++] = p + 1 }
      if (y > 0 && m[p - L] && !visto[p - L]) { visto[p - L] = 1; coda[fine++] = p - L }
      if (y < A - 1 && m[p + L] && !visto[p + L]) { visto[p + L] = 1; coda[fine++] = p + L }
    }
    if (pezzi.length > migliorArea) { migliorArea = pezzi.length; migliore = pezzi }
  }
  const fuori = new Uint8Array(L * A)
  if (migliore) for (const p of migliore) fuori[p] = 1
  return { m: fuori, area: migliorArea }
}

/**
 * APERTURA MORFOLOGICA — erosione seguita da dilatazione, dello stesso raggio.
 *
 * Serve contro i FILAMENTI. Lungo il montante sinistro la fotografia ha una
 * modanatura lucida che supera la soglia per pochi pixel di larghezza: la
 * soglia la accende, la ricerca della macchia piu' grande la trova ATTACCATA
 * al parabrezza — e quindi la tiene — e il risultato e' una striscia
 * diagonale attraverso cui si vede passare la strada. Nel sito si legge come
 * un alone che parte dall'angolo sinistro e arriva al centro, ed e' il difetto
 * che il committente ha segnalato.
 *
 * L'erosione toglie `RAGGIO` pixel da ogni bordo: un filamento largo meno del
 * doppio del raggio sparisce del tutto, mentre il parabrezza, largo mille
 * pixel, si limita a dimagrire. La dilatazione dello stesso raggio gli ridà
 * quello che ha perso. Cio' che era sparito non torna: non c'e' piu' niente da
 * dilatare.
 *
 * E' la stessa ragione per cui si erode PRIMA e si dilata DOPO. Nell'ordine
 * inverso il filamento si ingrasserebbe e poi dimagrirebbe, tornando com'era.
 */
const RAGGIO = 6
function morfologia(m, raggio, tieni) {
  // separabile: prima le righe, poi le colonne. Su un raggio di sei pixel sono
  // ventiquattro confronti per pixel invece di centoquarantaquattro.
  const passa = (dentro, orizzontale) => {
    const fuori = new Uint8Array(L * A)
    for (let y = 0; y < A; y++) {
      for (let x = 0; x < L; x++) {
        let v = tieni
        for (let d = -raggio; d <= raggio; d++) {
          const xx = orizzontale ? x + d : x
          const yy = orizzontale ? y : y + d
          if (xx < 0 || xx >= L || yy < 0 || yy >= A) continue
          const c = dentro[yy * L + xx]
          v = tieni ? Math.min(v, c) : Math.max(v, c)
        }
        fuori[y * L + x] = v
      }
    }
    return fuori
  }
  return passa(passa(m, true), false)
}

let { m: apertura, area } = macchiaPiuGrande(dentro)
apertura = morfologia(apertura, RAGGIO, 1)   // erosione
apertura = morfologia(apertura, RAGGIO, 0)   // dilatazione

/**
 * CHIUSURA — dilatazione seguita da erosione, cioe' l'operazione inversa.
 *
 * L'apertura toglie le punte; la chiusura chiude le TACCHE. Servono tutte e
 * due, e questa e' arrivata dopo perche' il difetto che risolve non si vedeva
 * nella maschera: si vedeva nel sito.
 *
 * IL DIFETTO. Nella fotografia dell'abitacolo, oltre il parabrezza, c'e' un
 * colonnato: una fila di colonne verticali piu' scure del cielo. La soglia le
 * esclude — sono sotto — e il riempimento dei buchi non le recupera, perche'
 * quel riempimento parte DA FUORI e considera buco solo cio' che non e'
 * raggiungibile dal bordo dell'immagine. Le colonne pero' arrivano fino al
 * bordo basso dell'apertura, quindi sono raggiungibili, quindi restano spente.
 *
 * Il risultato nel sito e' una catena di schegge azzurre sospese nel cielo: la
 * fotografia che passa attraverso una fila di fessure verticali. Il committente
 * le ha segnalate tre volte come «aloni», e per due giri ho cercato la causa
 * nel motore invece che nella maschera.
 *
 * VENTOTTO PIXEL. Le colonne sono larghe una ventina: una chiusura di raggio
 * maggiore della meta' della loro larghezza le sigilla. Lo specchietto
 * retrovisore, che deve RESTARE un buco, e' largo duecento e sopravvive senza
 * problemi — e' l'unico motivo per cui questo raggio non puo' crescere ancora.
 */
const SIGILLO = 28
apertura = morfologia(apertura, SIGILLO, 0)  // dilatazione
apertura = morfologia(apertura, SIGILLO, 1)  // erosione

// i buchi: si riempiono partendo DA FUORI. Tutto cio' che e' spento e si
// raggiunge dal bordo dell'immagine e' vero fuori-apertura; tutto il resto e'
// un buco dentro l'apertura, e va acceso.
const raggiungibile = new Uint8Array(L * A)
{
  const coda = new Int32Array(L * A)
  let testa = 0, fine = 0
  const metti = (p) => { if (!apertura[p] && !raggiungibile[p]) { raggiungibile[p] = 1; coda[fine++] = p } }
  for (let x = 0; x < L; x++) { metti(x); metti((A - 1) * L + x) }
  for (let y = 0; y < A; y++) { metti(y * L); metti(y * L + L - 1) }
  while (testa < fine) {
    const p = coda[testa++]
    const x = p % L, y = (p / L) | 0
    if (x > 0) metti(p - 1)
    if (x < L - 1) metti(p + 1)
    if (y > 0) metti(p - L)
    if (y < A - 1) metti(p + L)
  }
}
let riempiti = 0
for (let i = 0; i < L * A; i++) {
  if (!apertura[i] && !raggiungibile[i]) { apertura[i] = 1; riempiti++ }
}

/**
 * LA LISCIATURA DEL CONTORNO — sfocare e poi risogliare.
 *
 * L'apertura morfologica toglie i filamenti staccati, ma lascia il bordo
 * FRASTAGLIATO: dove la soglia oscilla di poco lungo un montante restano punte
 * e tacche larghe pochi pixel. Nel sito si vedono come aloni — una diagonale di
 * frammenti che attraversa il cielo, una macchia rossa del colonnato all'angolo
 * sinistro — perche' attraverso ogni tacca passa la scena che sta dietro.
 *
 * Sfocare una maschera binaria e poi risogliarla a meta' e' il modo piu' corto
 * per lisciarne il contorno: ogni punta piu' stretta del raggio di sfocatura si
 * diluisce sotto la soglia e sparisce, ogni tacca piu' stretta si riempie sopra
 * la soglia e si chiude. E' simmetrico, quindi non gonfia ne' dimagrisce la
 * forma — cosa che invece fa una dilatazione da sola.
 *
 * Dodici pixel su duemila: togli i dettagli sotto il mezzo per cento della
 * larghezza, che e' esattamente la scala del frastagliamento e un ordine di
 * grandezza sotto quella delle forme vere (il montante, lo specchietto).
 */
const LISCIA = 12
const morbida = await sharp(
  Buffer.from(apertura.map((v) => (v ? 255 : 0))),
  { raw: { width: L, height: A, channels: 1 } },
).blur(LISCIA).toColourspace('b-w').raw().toBuffer()

const grigio = Buffer.alloc(L * A)
for (let i = 0; i < L * A; i++) grigio[i] = morbida[i] > 127 ? 255 : 0

await sharp(grigio, { raw: { width: L, height: A, channels: 1 } })
  .blur(2)
  // `toColourspace('b-w')` E' OBBLIGATORIO DOPO `blur`: su un raw a un canale
  // la sfocatura restituisce tre canali, e la maschera esce a strisce. E' un
  // difetto gia' pagato una volta su questo progetto.
  .toColourspace('b-w')
  .webp({ quality: 92 })
  .toFile(USCITA)

console.log(
  `maschera ${L}x${A}  soglia ${SOGLIA}  apertura ${(area / (L * A) * 100).toFixed(1)}%  ` +
  `buchi riempiti ${riempiti}  ->  ${USCITA}`,
)
