/** AFFIANCA — due serie di tappe, una accanto all'altra, con il numero.
 *
 *  Il collaudo che conta su questo progetto e' sempre stato «due provini
 *  affiancati, prima e dopo». Finora li montavo a mano ogni volta, e ogni volta
 *  con un ritaglio leggermente diverso — che e' il modo piu' silenzioso di
 *  confrontare due cose diverse credendo di confrontarne una.
 *
 *  Qui le due serie arrivano da `strumenti/tappe.mjs`, quindi sono rese sullo
 *  stesso banco, alle stesse frazioni di scorrimento, con lo stesso ritaglio.
 *  L'unica cosa che puo' differire e' il codice.
 *
 *  Stampa anche QUANTO cambia ogni tappa. Non e' un giudizio — una differenza
 *  grande puo' essere la cura e una piccola puo' essere una rovina — ma dice
 *  DOVE guardare, e su dodici tappe serve.
 *
 *  node strumenti/affianca.mjs <cartellaA> <cartellaB> [nomeUscita]
 */
import { readdirSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('sharp')

const A = process.argv[2]
const B = process.argv[3]
const USCITA = process.argv[4] ?? (A + '-' + B)
if (!A || !B) {
  console.log('  node strumenti/affianca.mjs <cartellaA> <cartellaB> [nomeUscita]')
  process.exit(1)
}
const R = 'C:/Users/Giuseppe/Webingegno/velocity/docs/qa/'
for (const d of [A, B]) {
  if (!existsSync(R + d)) { console.log('  manca docs/qa/' + d); process.exit(1) }
}

const nomi = readdirSync(R + A).filter((f) => f.endsWith('.png'))
  .filter((f) => existsSync(R + B + '/' + f))
if (!nomi.length) { console.log('  nessuna tappa in comune fra le due cartelle'); process.exit(1) }

mkdirSync(R + USCITA, { recursive: true })
const LARGO = 900
const SOGLIA = 6

console.log('')
console.log('  ' + A + '  contro  ' + B + '   (' + nomi.length + ' tappe)')
console.log('')

const righe = []
for (const f of nomi) {
  const nome = f.replace('.png', '')
  const ga = await sharp(R + A + '/' + f).raw().toBuffer({ resolveWithObject: true })
  const gb = await sharp(R + B + '/' + f).raw().toBuffer({ resolveWithObject: true })
  if (ga.info.width !== gb.info.width || ga.info.height !== gb.info.height) {
    console.log('  ' + nome.padEnd(16) + ' misure diverse, salto')
    continue
  }
  const N = ga.info.width * ga.info.height
  const CH = ga.info.channels
  let cambiati = 0, somma = 0
  for (let i = 0; i < N; i++) {
    const k = i * CH
    const d = Math.max(
      Math.abs(ga.data[k] - gb.data[k]),
      Math.abs(ga.data[k + 1] - gb.data[k + 1]),
      Math.abs(ga.data[k + 2] - gb.data[k + 2]))
    if (d > SOGLIA) { cambiati++; somma += d }
  }
  const frazione = cambiati / N
  righe.push({ nome, frazione, forza: cambiati ? somma / cambiati : 0 })

  /* IL MONTAGGIO E' VERTICALE, non orizzontale. Due fotogrammi 16:10 affiancati
     danno un'immagine lunga il doppio e alta la meta': per confrontarli si
     finisce a guardarne uno per volta, che e' esattamente cio' che il confronto
     dovrebbe evitare. Uno sopra l'altro, i due si leggono con un movimento solo
     dell'occhio — ed e' cosi' che si vede uno spostamento. */
  const alto = Math.round(LARGO * ga.info.height / ga.info.width)
  const ia = await sharp(R + A + '/' + f).resize(LARGO, alto).toBuffer()
  const ib = await sharp(R + B + '/' + f).resize(LARGO, alto).toBuffer()
  const eti = (t) => Buffer.from(
    '<svg width="' + LARGO + '" height="26"><rect width="' + LARGO + '" height="26" fill="#0b0d12"/>' +
    '<text x="12" y="18" font-family="sans-serif" font-size="14" fill="#d8a258">' + t + '</text></svg>')
  await sharp({ create: { width: LARGO, height: (alto + 26) * 2, channels: 3, background: '#0b0d12' } })
    .composite([
      { input: eti(A + ' — ' + nome), top: 0, left: 0 },
      { input: ia, top: 26, left: 0 },
      { input: eti(B + ' — ' + nome + '   (' + (frazione * 100).toFixed(2) + '% diverso)'), top: alto + 26, left: 0 },
      { input: ib, top: alto + 52, left: 0 },
    ]).jpeg({ quality: 92 }).toFile(R + USCITA + '/' + nome + '.jpeg')
}

righe.sort((x, y) => y.frazione - x.frazione)
for (const r of righe) {
  console.log('  ' + r.nome.padEnd(16) + (r.frazione * 100).toFixed(2).padStart(7) + '% dei pixel' +
    '   forza media ' + r.forza.toFixed(0).padStart(3) + ' livelli')
}
console.log('')
console.log('  affiancate in docs/qa/' + USCITA + '/')
console.log('  la tappa piu diversa e ' + righe[0].nome + ': guarda quella per prima.')
