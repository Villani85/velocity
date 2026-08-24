/**
 * LE MICROSUPERFICI — buccia d'arancia e tessuto di carbonio.
 *
 * PERCHE' DUE IMMAGINI DA VENTI KILOBYTE VALGONO PIU' DI UNA TESSITURA DA
 * OTTO MEGABYTE.
 *
 * La tessitura generata dall'IA descriveva il COLORE, e su una carrozzeria
 * nera il colore non esiste: e' tutto riflesso. Queste due invece
 * descrivono la FORMA della superficie alla scala del millimetro, che e'
 * l'unica cosa che cambia davvero come un riflesso si comporta.
 *
 * 1. LA BUCCIA D'ARANCIA.
 *
 * Nessuna vernice e' piatta. Il trasparente si stende a spruzzo e si
 * assesta lasciando un'ondulazione larga mezzo millimetro e alta qualche
 * micron: si chiama buccia d'arancia, e la si vede su qualunque automobile
 * guardando di striscio un riflesso lungo — il bordo del riflesso non e'
 * una riga netta, ondeggia appena.
 *
 * E' un difetto di produzione, ed e' proprio per questo che conta: una
 * superficie perfettamente liscia non esiste al mondo, e l'occhio, che di
 * automobili ne ha viste migliaia, sa che le sta guardando una finta anche
 * senza sapere perche'. E' la riga «sembra troppo pulito» della griglia
 * diagnostica.
 *
 * Va sulla mappa di normali del TRASPARENTE, non su quella della vernice:
 * l'ondulazione sta nello strato di sopra. Metterla sotto sarebbe una
 * lamiera ammaccata, che e' un'altra cosa.
 *
 * AMPIEZZA MINIMA. Se si vede, e' sbagliata: la buccia d'arancia non si
 * guarda, si subisce. A occhio nudo su un provino non si nota nulla — ma
 * messe una accanto all'altra, la versione senza sembra plastica.
 *
 * 2. IL TESSUTO DI CARBONIO.
 *
 * Diffusore, splitter, minigonne e ala di una hypercar non sono verniciati:
 * sono fibra a vista. Il tessuto e' un twill 2/2 — ogni filo passa sopra
 * due e sotto due — e produce quel disegno a spina di pesce che si riconosce
 * da lontano. La sua caratteristica ottica e' che i due orditi riflettono in
 * DIREZIONI DIVERSE: girando intorno al pezzo, la scacchiera si inverte.
 *
 * Nessun materiale in three fa l'anisotropia per direzione di filo, ma
 * l'inversione la si ottiene gratis con la mappa di normali: due famiglie di
 * quadretti inclinate all'opposto riflettono l'ambiente in modo opposto, che
 * e' esattamente il fenomeno. E' il caso in cui capire la causa fisica fa
 * risparmiare uno shader.
 *
 * SI GENERANO INVECE DI SCARICARLE, e non per risparmiare: perche' devono
 * essere ESATTAMENTE ripetibili. Una fotografia di carbonio ha una
 * prospettiva, un'illuminazione e un bordo; ripetuta su una minigonna si
 * vede la cucitura, e la cucitura e' la firma del finto.
 *
 *   node strumenti/microsuperfici.mjs
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const USCITA = 'C:/Users/Giuseppe/Webingegno/velocity/public/texture'
mkdirSync(USCITA, { recursive: true })

/** rumore di valore, periodico per costruzione: si interpola su una griglia
 *  che si richiude, quindi la piastrella non ha giunte */
function grigliaCasuale(n, seme) {
  let s = seme
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
  const g = new Float32Array(n * n)
  for (let i = 0; i < n * n; i++) g[i] = rnd()
  return g
}

function morbido(t) { return t * t * (3 - 2 * t) }

function rumore(g, n, x, y) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = morbido(x - xi)
  const yf = morbido(y - yi)
  const a = (i, j) => g[((j % n) + n) % n * n + (((i % n) + n) % n)]
  const s0 = a(xi, yi) * (1 - xf) + a(xi + 1, yi) * xf
  const s1 = a(xi, yi + 1) * (1 - xf) + a(xi + 1, yi + 1) * xf
  return s0 * (1 - yf) + s1 * yf
}

/** da un campo di altezza a una mappa di normali, per differenze centrali */
function normali(h, L, forza) {
  const b = Buffer.alloc(L * L * 3)
  const at = (x, y) => h[((y % L) + L) % L * L + (((x % L) + L) % L)]
  for (let y = 0; y < L; y++) {
    for (let x = 0; x < L; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * forza
      const dy = (at(x, y + 1) - at(x, y - 1)) * forza
      const l = Math.hypot(dx, dy, 1)
      const i = (y * L + x) * 3
      b[i] = Math.round((-dx / l * 0.5 + 0.5) * 255)
      b[i + 1] = Math.round((-dy / l * 0.5 + 0.5) * 255)
      b[i + 2] = Math.round((1 / l * 0.5 + 0.5) * 255)
    }
  }
  return b
}

// --- 1. BUCCIA D'ARANCIA ----------------------------------------------
{
  const L = 512
  // TRE OTTAVE, la piu' bassa dominante. La buccia d'arancia e' quasi tutta
  // a una sola frequenza — e' il segno di un processo fisico unico, non di
  // usura accumulata come su una roccia. Un rumore frattale «bello» qui
  // sarebbe sbagliato: leggerebbe come lamiera martellata.
  const ott = [[9, 1.0, 7], [18, 0.34, 23], [37, 0.12, 61]]
  const griglie = ott.map(([n, , s]) => grigliaCasuale(n, s))
  const h = new Float32Array(L * L)
  for (let y = 0; y < L; y++) {
    for (let x = 0; x < L; x++) {
      let v = 0
      ott.forEach(([n, peso], k) => {
        v += rumore(griglie[k], n, (x / L) * n, (y / L) * n) * peso
      })
      h[y * L + x] = v
    }
  }
  // FORZA 1,1 e non 8: sono micron su millimetri. Il numero e' basso apposta
  // — vedi sopra, se si nota e' gia' troppo.
  const b = normali(h, L, 1.1)
  await sharp(b, { raw: { width: L, height: L, channels: 3 } })
    .webp({ quality: 94, effort: 6 })
    .toFile(`${USCITA}/buccia_nor.webp`)
  console.log('buccia_nor.webp   512px  = 30 cm di lamiera  (0,6 mm per pixel)')
}

// --- 2. TWILL 2/2 DI CARBONIO -----------------------------------------
{
  const L = 512
  // dodici fili per lato: su una piastrella da 6 cm fa un filo ogni 5 mm,
  // che e' la misura vera di un tessuto 3K
  const FILI = 12
  const h = new Float32Array(L * L)
  const r = new Uint8Array(L * L)
  for (let y = 0; y < L; y++) {
    for (let x = 0; x < L; x++) {
      const u = (x / L) * FILI
      const v = (y / L) * FILI
      const iu = Math.floor(u)
      const iv = Math.floor(v)
      // IL TWILL 2/2: sopra e' l'ordito quando ((riga + colonna) mod 4) < 2.
      // Il «+ riga» e' cio' che sposta il passo di uno a ogni riga, ed e'
      // quello che produce la diagonale invece di una scacchiera.
      const sopra = ((iu + iv) % 4) < 2
      // dentro il singolo filo il rilievo e' un arco, non un gradino: un
      // filo e' tondo
      const fu = u - iu
      const fv = v - iv
      const arco = Math.sin(Math.PI * (sopra ? fv : fu))
      h[y * L + x] = (sopra ? 1.0 : 0.55) * arco
      // e la ruvidita' segue: la resina sulle creste e' piu' lucida che
      // negli avvallamenti, dove si accumula ed e' opaca
      r[y * L + x] = Math.round((0.42 - 0.14 * arco * (sopra ? 1 : 0.5)) * 255)
    }
  }
  await sharp(normali(h, L, 3.4), { raw: { width: L, height: L, channels: 3 } })
    .webp({ quality: 94, effort: 6 })
    .toFile(`${USCITA}/carbonio_nor.webp`)
  await sharp(Buffer.from(r), { raw: { width: L, height: L, channels: 1 } })
    .webp({ quality: 88, effort: 6 })
    .toFile(`${USCITA}/carbonio_rgh.webp`)
  console.log('carbonio_nor.webp 512px  = 6 cm di tessuto   (un filo ogni 5 mm)')
}
