/**
 * IL MARMO NERO — generato, non fotografato.
 *
 * PERCHE' GENERARLO E' MEGLIO CHE TROVARLO.
 *
 * Il riferimento e' un Nero Marquina: fondo quasi nero, ragnatela di venature
 * bianche sottili. Su Poly Haven non c'e' — i loro marmi sono chiari o a
 * lastre — e comprarne uno significherebbe una fotografia con tre problemi:
 *
 *   NON E' RIPETIBILE. Una fotografia di marmo ripetuta su un pavimento di
 *   novanta metri mostra la stessa venatura ogni tot, e il timbro si vede da
 *   lontano proprio perche' il disegno e' riconoscibile. Il marmo e' il
 *   materiale peggiore da ripetere, perche' l'occhio memorizza le venature
 *   come memorizza i volti.
 *
 *   HA LA LUCE DENTRO. Come tutte le fotografie: ombre e riflessi della
 *   sessione in cui e' stata scattata, che qui non c'entrano niente. E' lo
 *   stesso difetto per cui ho buttato la tessitura generata dell'auto.
 *
 *   NON SI DOSA. Se le venature sono troppe non si tolgono.
 *
 * COS'E' DAVVERO LA VENATURA DEL MARMO NERO.
 *
 * Non e' un disegno decorativo: e' una RETE DI FRATTURE riempita di calcite.
 * La roccia si spacca, l'acqua deposita carbonato bianco nelle crepe, e resta
 * il reticolo. Le crepe di un materiale fragile formano celle — poligoni
 * irregolari che si toccano senza sovrapporsi.
 *
 * Ed e' esattamente cio' che produce il rumore CELLULARE (Worley): dato un
 * insieme di punti, la differenza fra la distanza dal secondo punto piu'
 * vicino e quella dal primo (F2 - F1) e' zero sui confini fra le celle e
 * cresce verso il centro. Le venature sono i confini.
 *
 * Non e' un'imitazione dell'aspetto: e' la stessa costruzione geometrica del
 * fenomeno. Ed e' per questo che viene bene senza doverla ritoccare.
 *
 * TRE SCALE, come nella roccia vera:
 *   - le fratture MAESTRE, poche e larghe, che attraversano tutta la lastra
 *   - le SECONDARIE, che si staccano dalle maestre
 *   - la RAGNATELA fine, fitta, che riempie le celle
 * Una scala sola da' un disegno da cartone animato: si riconosce la regola.
 *
 * E LE VENATURE SERPEGGIANO, non sono rette. Le coordinate si deformano con
 * un rumore prima di calcolare le celle: e' il «domain warping», e trasforma
 * poligoni netti in crepe organiche.
 *
 *   node strumenti/marmo.mjs
 */
import sharp from 'sharp'

const USCITA = 'C:/Users/Giuseppe/Webingegno/velocity/public/texture'

/** LATO IN PIXEL e LATO IN METRI: 2048 px per 2,4 m fa 1,17 mm per pixel.
 *  E' la densita' giusta per un pavimento guardato da un metro — sotto quella
 *  le venature diventano una macchia grigia. */
const L = 2048
const METRI = 2.4

// ---------------------------------------------------------------- rumore
function seme(n) {
  let s = n >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** griglia periodica di valori: interpolata, si richiude su se stessa */
function griglia(n, s) {
  const r = seme(s)
  const g = new Float32Array(n * n)
  for (let i = 0; i < n * n; i++) g[i] = r()
  return g
}

const lisc = (t) => t * t * (3 - 2 * t)

function valore(g, n, x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = lisc(x - xi), yf = lisc(y - yi)
  const a = (i, j) => g[(((j % n) + n) % n) * n + (((i % n) + n) % n)]
  const s0 = a(xi, yi) * (1 - xf) + a(xi + 1, yi) * xf
  const s1 = a(xi, yi + 1) * (1 - xf) + a(xi + 1, yi + 1) * xf
  return s0 * (1 - yf) + s1 * yf
}

/**
 * CELLULARE PERIODICO. I punti stanno su una griglia di celle, uno per cella,
 * e gli indici si avvolgono: cosi' la piastrella non ha giunte.
 *
 * Restituisce F2 - F1, che vale zero sul confine fra due celle e cresce
 * verso il centro. E' il negativo della venatura.
 */
function cellulare(n, s, px, py) {
  const r = seme(s)
  const pnt = new Float32Array(n * n * 2)
  for (let i = 0; i < n * n; i++) {
    pnt[i * 2] = r()
    pnt[i * 2 + 1] = r()
  }
  const cx = Math.floor(px * n), cy = Math.floor(py * n)
  let f1 = 1e9, f2 = 1e9
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const gx = ((cx + i) % n + n) % n
      const gy = ((cy + j) % n + n) % n
      const k = (gy * n + gx) * 2
      const dx = (cx + i + pnt[k]) / n - px
      const dy = (cy + j + pnt[k + 1]) / n - py
      const d = Math.hypot(dx, dy)
      if (d < f1) { f2 = f1; f1 = d } else if (d < f2) { f2 = d }
    }
  }
  return (f2 - f1) * n
}

// --------------------------------------------------------------- lastra
const colore = Buffer.alloc(L * L * 3)
const ruvido = Buffer.alloc(L * L)
const altezza = new Float32Array(L * L)

// i rumori per la deformazione delle coordinate
const w1 = griglia(6, 11), w2 = griglia(13, 29), w3 = griglia(31, 47)
// il rumore del fondo: la roccia non e' nera uniforme
const m1 = griglia(9, 71), m2 = griglia(23, 89), m3 = griglia(57, 101)

// LE TRE SCALE. Il numero e' quante celle stanno nel lato della piastrella:
// 6 celle su 2,4 m fa una frattura maestra ogni 40 cm; 17 ne fa una ogni 14;
// 43 una ogni 5,6. Sono le misure che si vedono su una lastra vera.
const SCALE = [
  { celle: 5, forza: 1.00, spessore: 0.026, s: 5, modula: 0.15 },
  { celle: 13, forza: 0.58, spessore: 0.040, s: 17, modula: 0.75 },
  { celle: 34, forza: 0.26, spessore: 0.062, s: 33, modula: 1.00 },
]

/**
 * LA MASCHERA DI DENSITA' — la correzione che ha cambiato tutto.
 *
 * Alla prima stesura la rete di venature era ovunque della stessa fittezza, e
 * il risultato non sembrava marmo: sembrava FANGO SCREPOLATO. Il disegno era
 * giusto, mancava la sua distribuzione.
 *
 * In una lastra vera le fratture non sono uniformi: si concentrano dove la
 * roccia ha ceduto e lasciano campi puliti dove ha tenuto. Quel contrasto fra
 * zone fitte e ampie campiture nere e' proprio cio' che rende una lastra
 * «bella» agli occhi di chi la compra — ed e' anche cio' che rende
 * riconoscibile il Nero Marquina.
 *
 * Le fratture MAESTRE non si modulano quasi (0,15): attraversano la lastra da
 * parte a parte comunque, e sono loro a dare la struttura. Le secondarie e la
 * ragnatela fine si modulano molto: compaiono e spariscono, e sono loro a
 * disegnare le zone.
 */
const dens1 = griglia(3, 211)
const dens2 = griglia(7, 233)

console.log('genero il marmo…')
for (let y = 0; y < L; y++) {
  for (let x = 0; x < L; x++) {
    const u = x / L, v = y / L

    // DEFORMAZIONE DELLE COORDINATE: e' cio' che fa serpeggiare le crepe.
    // Due giri di deformazione, il secondo piu' fine: uno solo da' curve
    // morbide e regolari, due danno l'irregolarita' della roccia.
    const wx = u + (valore(w1, 6, u * 6, v * 6) - 0.5) * 0.085
                 + (valore(w2, 13, u * 13, v * 13) - 0.5) * 0.030
                 + (valore(w3, 31, u * 31, v * 31) - 0.5) * 0.010
    const wy = v + (valore(w1, 6, v * 6 + 3.7, u * 6 + 1.3) - 0.5) * 0.085
                 + (valore(w2, 13, v * 13 + 5.1, u * 13) - 0.5) * 0.030
                 + (valore(w3, 31, v * 31 + 2.9, u * 31) - 0.5) * 0.010

    // dove la roccia si e' rotta di piu': 0 = campo pulito, 1 = zona fitta
    const densita = Math.pow(
      Math.min(1, Math.max(0,
        valore(dens1, 3, u * 3, v * 3) * 0.68 +
        valore(dens2, 7, u * 7, v * 7) * 0.32,
      )),
      1.35,
    )

    let vena = 0
    for (const S of SCALE) {
      const d = cellulare(S.celle, S.s, ((wx % 1) + 1) % 1, ((wy % 1) + 1) % 1)
      // LO SPESSORE VARIA lungo il percorso: una vena vera si allarga dove ha
      // trovato meno resistenza e si assottiglia fino a sparire. A spessore
      // costante il reticolo legge come una griglia disegnata.
      const sp = S.spessore * (0.45 + 1.25 * valore(m1, 9, u * 9 + 4.1, v * 9 + 2.3))
      const t = 1 - Math.min(1, d / sp)
      const peso = S.forza * (1 - S.modula + S.modula * densita)
      vena = Math.max(vena, Math.pow(t, 1.7) * peso)
    }

    // il fondo: quasi nero, con macchie appena piu' chiare — la grana della
    // roccia, che senza sarebbe una vernice nera con delle righe sopra
    const macchia =
      valore(m1, 9, u * 9, v * 9) * 0.55 +
      valore(m2, 23, u * 23, v * 23) * 0.30 +
      valore(m3, 57, u * 57, v * 57) * 0.15
    // il fondo varia anche a grande scala: le zone fitte sono un filo piu'
    // chiare, perche' la calcite le impregna
    const fondo = 0.034 + macchia * 0.030 + densita * 0.014

    // e le venature non sono bianche pure: sono calcite, grigio-avorio, e
    // variano di luminosita' lungo il percorso
    const forza = vena * (0.72 + 0.28 * valore(m2, 23, u * 23 + 7, v * 23 + 3))
    const c = fondo + forza * 0.66

    const i = (y * L + x) * 3
    colore[i] = Math.round(Math.min(1, c * 1.00) * 255)
    colore[i + 1] = Math.round(Math.min(1, c * 0.995) * 255)
    colore[i + 2] = Math.round(Math.min(1, c * 0.985) * 255)

    // LA RUVIDITA' CAMBIA CON LA VENATURA, ed e' il dettaglio che convince.
    //
    // La calcite delle vene ha una durezza diversa dal fondo: lucidando la
    // lastra si consuma in modo diverso, e le vene restano leggermente PIU'
    // OPACHE del fondo. Su un marmo levigato e' quasi l'unica cosa che
    // distingue una lastra vera da un'immagine stampata su un piano — le vene
    // si vedono anche dove non c'e' contrasto di colore, perche' brillano
    // diversamente.
    ruvido[y * L + x] = Math.round((0.58 + vena * 0.16 - macchia * 0.05) * 255)

    // e un rilievo microscopico: la lucidatura non spiana perfettamente
    altezza[y * L + x] = vena * 0.35 + macchia * 0.12
  }
  if (y % 512 === 0) console.log('  riga', y, 'di', L)
}

// normali per differenze centrali, periodiche
const nor = Buffer.alloc(L * L * 3)
const at = (x, y) => altezza[(((y % L) + L) % L) * L + (((x % L) + L) % L)]
for (let y = 0; y < L; y++) {
  for (let x = 0; x < L; x++) {
    // FORZA 0,9: appena percettibile. Un marmo levigato e' piatto; se il
    // rilievo si vede, e' diventato travertino.
    const dx = (at(x + 1, y) - at(x - 1, y)) * 0.9
    const dy = (at(x, y + 1) - at(x, y - 1)) * 0.9
    const l = Math.hypot(dx, dy, 1)
    const i = (y * L + x) * 3
    nor[i] = Math.round((-dx / l * 0.5 + 0.5) * 255)
    nor[i + 1] = Math.round((-dy / l * 0.5 + 0.5) * 255)
    nor[i + 2] = Math.round((1 / l * 0.5 + 0.5) * 255)
  }
}

await sharp(colore, { raw: { width: L, height: L, channels: 3 } })
  .webp({ quality: 90, effort: 6 }).toFile(`${USCITA}/nero_col.webp`)
await sharp(nor, { raw: { width: L, height: L, channels: 3 } })
  .webp({ quality: 90, effort: 6 }).toFile(`${USCITA}/nero_nor.webp`)
await sharp(ruvido, { raw: { width: L, height: L, channels: 1 } })
  .webp({ quality: 86, effort: 6 }).toFile(`${USCITA}/nero_rgh.webp`)

const { statSync } = await import('node:fs')
const kb = (f) => (statSync(`${USCITA}/${f}`).size / 1024).toFixed(0)
console.log(`\n${L}px per ${METRI} m  =  ${(METRI * 1000 / L).toFixed(2)} mm per pixel`)
console.log(`colore ${kb('nero_col.webp')} kB   normali ${kb('nero_nor.webp')} kB   ruvidita' ${kb('nero_rgh.webp')} kB`)
