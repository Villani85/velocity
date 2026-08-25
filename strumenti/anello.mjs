/** I NUMERI DELL'ANELLO DELLE INSEGNE — calcolati, non sperati.
 *
 *  Non e' uno strumento di misura in piu' (la regola di questo progetto e' che
 *  non se ne aggiungono): e' la CALCOLATRICE della costruzione descritta in
 *  `src/scene/Insegne.ts`, e serve a una cosa sola — che le cifre scritte in
 *  quel commento siano state calcolate invece che stimate a occhio.
 *
 *  Risponde a due domande, e la seconda e' quella che conta:
 *    1. quanto e' girata e quanto e' lontana ogni insegna
 *    2. quanta aria resta fra una e l'altra, DOPO la girata
 *
 *  La seconda va fatta perche' girare un pannello ne cambia l'ingombro: la
 *  larghezza proiettata scende con il coseno. Su questo file una revisione
 *  aveva gia' trovato una sovrapposizione di otto centimetri che nessuno aveva
 *  visto perche' nessuno aveva fatto il conto — e quel conto e' questo.
 */
const LONTANANZA = 9.6
const APERTURA = -0.226
const LARGO = 2.0
const RAGGIO = Number(process.argv[2] ?? 40.0)

const dc = LONTANANZA + RAGGIO
const righe = []
for (let i = 0; i < 3; i++) {
  const psi = i * APERTURA
  const sotto = RAGGIO * RAGGIO - dc * dc * Math.sin(psi) ** 2
  const r = dc * Math.cos(psi) - Math.sqrt(Math.max(0, sotto))
  // il punto, in coordinate (laterale, assiale) rispetto all'occhio
  const px = Math.sin(psi) * r
  const pz = Math.cos(psi) * r
  // il centro dell'anello sta a (0, dc); la normale uscente e' P - C
  const nx = px - 0
  const nz = pz - dc
  const nl = Math.hypot(nx, nz)
  // la direzione di vista rovesciata: quanto la normale se ne discosta E' la girata
  const vx = -Math.sin(psi)
  const vz = -Math.cos(psi)
  const cos = (nx / nl) * vx + (nz / nl) * vz
  const girata = Math.acos(Math.min(1, Math.max(-1, cos)))
  righe.push({ i, psi, r, girata, px, pz })
}

console.log('RAGGIO DELL ANELLO ' + RAGGIO.toFixed(1) + ' m\n')
console.log('  insegna   direzione   distanza   girata      larghezza proiettata')
const nomi = ['prima  ', 'seconda', 'terza  ']
for (const g of righe) {
  const proiettata = LARGO * Math.cos(g.girata)
  console.log('  ' + nomi[g.i] +
    '   ' + Math.abs(g.psi).toFixed(3).padStart(7) +
    '   ' + g.r.toFixed(2).padStart(6) + ' m' +
    '   ' + ((g.girata * 180) / Math.PI).toFixed(1).padStart(5) + ' gradi' +
    '      ' + proiettata.toFixed(2) + ' m')
}

console.log('\nARIA FRA UN PANNELLO E L ALTRO (dopo la girata)')
let peggio = 99
for (let i = 0; i + 1 < righe.length; i++) {
  const a = righe[i], b = righe[i + 1]
  // mezza larghezza in ANGOLO visto dall'occhio: la proiezione divisa dalla distanza
  const ha = (LARGO / 2) * Math.cos(a.girata) / a.r
  const hb = (LARGO / 2) * Math.cos(b.girata) / b.r
  const varco = Math.abs(b.psi - a.psi) - ha - hb
  // e in metri, alla distanza di mezzo
  const metri = varco * ((a.r + b.r) / 2)
  if (metri < peggio) peggio = metri
  console.log('  fra la ' + nomi[i].trim() + ' e la ' + nomi[i + 1].trim() + ': ' +
    varco.toFixed(4) + ' rad = ' + metri.toFixed(2) + ' m' + (metri < 0 ? '   SI SOVRAPPONGONO' : ''))
}

console.log('\naria minima ' + peggio.toFixed(2) + ' m')
if (peggio < 0.10) {
  console.log('BOCCIATO: sotto i dieci centimetri due schermi accesi si leggono come uno solo.')
  process.exit(1)
}
console.log('passa.')
