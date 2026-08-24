/**
 * LA TARATURA DEL METRO DELL'ONDULAZIONE — quanto legge su una cosa perfetta.
 *
 * PERCHE' SERVE. Il metro dice che la carrozzeria ha mediana 5,40 rad/m e il
 * 38,8% degli spigoli sopra 10, e il commento accanto alla soglia dice che una
 * fiancata vera sta fra 0,3 e 2. Da quei due numeri si conclude «il modello e'
 * bitorzoluto, va rifatto» — che e' mezza giornata di lavoro piu' il taglio in
 * pezzi, la ricompressione e la riverifica dell'attraversamento.
 *
 * Prima di spendere quella mezza giornata bisogna sapere una cosa sola: quel
 * metro, su una superficie MATEMATICAMENTE liscia con la stessa densita' di
 * maglia, che numero da'? Perche' la curvatura si ottiene dividendo un angolo
 * per la lunghezza di uno spigolo, e su una maglia fitta quegli spigoli sono
 * millimetri: qualunque rumore — la quantizzazione del file, l'arrotondamento
 * in virgola mobile, la forma dei triangoli — viene diviso per un numero
 * piccolissimo e torna indietro grande.
 *
 * COME. Una sfera di raggio noto ha curvatura esattamente 1/R in ogni punto e
 * in ogni direzione: e' il campione di taratura piu' pulito che esista. Se ne
 * costruisce una con la stessa quantita' di triangoli della carrozzeria e le
 * si passa lo STESSO conto. Tre casi:
 *
 *   normali esatte (analitiche)   -> quanto sbaglia il conto per costruzione
 *   normali dalle facce           -> quanto sbaglia una maglia reale
 *   normali quantizzate a 16 bit  -> quanto ci mette la compressione del file
 *
 * Se il terzo caso legge molto sopra 1/R, allora il numero della carrozzeria
 * non e' la sua forma: e' il fondoscala del metro.
 */

const perc = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))]

/** una sfera UV di raggio R con circa `tri` triangoli */
function sfera(R, tri) {
  const n = Math.max(8, Math.round(Math.sqrt(tri / 2)))
  const pos = []
  const nor = []
  const idx = []
  for (let i = 0; i <= n; i++) {
    const v = (i / n) * Math.PI
    for (let j = 0; j <= n; j++) {
      const u = (j / n) * Math.PI * 2
      const x = Math.sin(v) * Math.cos(u)
      const y = Math.cos(v)
      const z = Math.sin(v) * Math.sin(u)
      pos.push(x * R, y * R, z * R)
      nor.push(x, y, z)
    }
  }
  const q = (i, j) => i * (n + 1) + j
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      idx.push(q(i, j), q(i + 1, j), q(i, j + 1))
      idx.push(q(i + 1, j), q(i + 1, j + 1), q(i, j + 1))
    }
  }
  return { pos: new Float64Array(pos), nor: new Float64Array(nor), idx: new Uint32Array(idx) }
}

/** le normali che un motore ricava dalle sole posizioni */
function daFacce(pos, idx, n) {
  const out = new Float64Array(n * 3)
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2]
    const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2]
    const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2]
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
    for (const v of [a, b, c]) { out[v * 3] += nx; out[v * 3 + 1] += ny; out[v * 3 + 2] += nz }
  }
  for (let v = 0; v < n; v++) {
    const L = Math.hypot(out[v * 3], out[v * 3 + 1], out[v * 3 + 2]) || 1
    out[v * 3] /= L; out[v * 3 + 1] /= L; out[v * 3 + 2] /= L
  }
  return out
}

/** le stesse normali passate per interi corti, come nel file compresso */
function quantizza(nor) {
  const out = new Float64Array(nor.length)
  for (let i = 0; i < nor.length; i++) out[i] = Math.round(nor[i] * 32767) / 32767
  for (let v = 0; v < nor.length / 3; v++) {
    const L = Math.hypot(out[v * 3], out[v * 3 + 1], out[v * 3 + 2]) || 1
    out[v * 3] /= L; out[v * 3 + 1] /= L; out[v * 3 + 2] /= L
  }
  return out
}

function curvature(pos, nor, idx) {
  const fuori = []
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const i = idx[t + e], j = idx[t + (e + 1) % 3]
      if (i > j) continue
      const L = Math.hypot(pos[i * 3] - pos[j * 3], pos[i * 3 + 1] - pos[j * 3 + 1], pos[i * 3 + 2] - pos[j * 3 + 2])
      if (L < 1e-9) continue
      const d = Math.min(1, Math.max(-1,
        nor[i * 3] * nor[j * 3] + nor[i * 3 + 1] * nor[j * 3 + 1] + nor[i * 3 + 2] * nor[j * 3 + 2]))
      fuori.push(Math.acos(d) / L)
    }
  }
  fuori.sort((x, y) => x - y)
  return fuori
}

const riga = (nome, a, atteso) =>
  '  ' + nome.padEnd(30) +
  ' mediana ' + perc(a, 0.5).toFixed(2).padStart(7) +
  ' | 95% ' + perc(a, 0.95).toFixed(1).padStart(8) +
  ' | 99% ' + perc(a, 0.99).toFixed(1).padStart(8) +
  ' | oltre 10: ' + (100 * a.filter((v) => v > 10).length / a.length).toFixed(1).padStart(5) + '%' +
  (atteso ? '   (il valore vero e\' ' + atteso.toFixed(2) + ')' : '')

/* IL RAGGIO E' UN METRO E MEZZO e i triangoli sono quelli della carrozzeria.
   Un metro e mezzo e' l'ordine di grandezza dei raccordi veri di questa
   vettura — il tetto, la spalla, il fianco — quindi la sfera non e' un
   campione astratto: ha la stessa scala di cio' che si vuole giudicare. */
const R = 1.5
const TRI = 117376
const s = sfera(R, TRI)
const n = s.pos.length / 3
console.log('sfera di raggio ' + R + ' m — vertici ' + n + ', triangoli ' + (s.idx.length / 3))
console.log('  la curvatura vera e\' 1/R = ' + (1 / R).toFixed(3) + ' rad/m su OGNI spigolo')
console.log('')
console.log(riga('normali esatte', curvature(s.pos, s.nor, s.idx), 1 / R))
const facce = daFacce(s.pos, s.idx, n)
console.log(riga('normali dalle facce', curvature(s.pos, facce, s.idx), 1 / R))
console.log(riga('normali dalle facce, quantizzate', curvature(s.pos, quantizza(facce), s.idx), 1 / R))
console.log(riga('normali esatte, quantizzate', curvature(s.pos, quantizza(s.nor), s.idx), 1 / R))
