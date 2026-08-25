/** CHI E' PIU' LUMINOSO, e quindi dove va l'occhio per primo.
 *
 *  LA DOMANDA, posta dalla revisione esterna: «i tre montanti verticali sono
 *  ancora luminosi quanto la parte piu' chiara della vettura, e sono tre linee
 *  parallele nette in una zona dove l'occhio dovrebbe gia' essere sceso
 *  sull'automobile».
 *
 *  E' una domanda di GERARCHIA, e la gerarchia percettiva la decide una cosa
 *  sola: il picco di luminanza. L'occhio non va sulla cosa importante, va sulla
 *  cosa piu' chiara — poi, se ha tempo, corregge. In tre secondi non ce l'ha.
 *
 *  QUINDI NON SI MISURA LA MEDIA. Un montante e' tre pixel di larghezza: la sua
 *  media dentro un riquadro e' bassa qualunque cosa faccia, perche' il riquadro
 *  e' quasi tutto fondo. Quello che compete con la vettura e' il suo PICCO, e il
 *  novantanovesimo percentile lo misura senza farsi ingannare da un pixel
 *  isolato di compressione.
 *
 *  Si misura sul poster, che e' l'artefatto che qualcuno guarda davvero, e non
 *  in scena: e' li' che la gerarchia conta.
 */
import sharp from 'sharp'

const IMG = process.argv[2] ?? 'public/poster/hero_social.jpeg'

/* I RIQUADRI SONO IN FRAZIONI, non in pixel: lo stesso strumento deve valere
   sul poster sociale (1200x630) e su quello orizzontale (1400x875), e due
   elenchi di coordinate per la stessa domanda sono due cose da tenere
   allineate — cioe' una che resta indietro. */
const ZONE = {
  'montante 1':      [0.093, 0.22, 0.016, 0.34],
  'montante 2':      [0.290, 0.23, 0.016, 0.31],
  'montante 3':      [0.487, 0.26, 0.016, 0.27],
  'vettura: spalla': [0.300, 0.50, 0.125, 0.045],
  'vettura: cofano': [0.190, 0.55, 0.090, 0.040],
  'vettura: cerchi': [0.160, 0.61, 0.040, 0.070],
  'fondo: villa':    [0.815, 0.19, 0.100, 0.095],
  'titolo':          [0.515, 0.56, 0.270, 0.120],
}

const m = await sharp(IMG).metadata()
const risultati = []

for (const [nome, [fx, fy, fw, fh]] of Object.entries(ZONE)) {
  const left = Math.round(fx * m.width)
  const top = Math.round(fy * m.height)
  const width = Math.max(2, Math.round(fw * m.width))
  const height = Math.max(2, Math.round(fh * m.height))
  const { data, info } = await sharp(IMG).extract({ left, top, width, height })
    .raw().toBuffer({ resolveWithObject: true })
  const luma = []
  for (let i = 0; i < data.length; i += info.channels) {
    luma.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
  }
  luma.sort((a, b) => a - b)
  const q = (p) => luma[Math.min(luma.length - 1, Math.floor(p * luma.length))]
  risultati.push({ nome, media: luma.reduce((s, x) => s + x, 0) / luma.length, p99: q(0.99), p50: q(0.5) })
}

console.log('GERARCHIA DI LUMINANZA su ' + IMG + '  (' + m.width + 'x' + m.height + ')')
console.log('')
console.log('  zona                 media    mediana    picco (p99)')
for (const r of risultati) {
  console.log('  ' + r.nome.padEnd(20) +
    r.media.toFixed(1).padStart(5) + '     ' +
    r.p50.toFixed(1).padStart(5) + '      ' +
    r.p99.toFixed(1).padStart(5))
}

/* IL CONFRONTO CHE RISPONDE ALLA DOMANDA.
   Non «i montanti sono luminosi» — sempre, sono luce — ma «lo sono PIU' della
   vettura». Un montante che picca sopra il punto piu' chiaro della carrozzeria
   sta prendendo il primo sguardo. */
const picco = (n) => risultati.find((r) => r.nome === n).p99
const montanti = Math.max(picco('montante 1'), picco('montante 2'), picco('montante 3'))
const vettura = Math.max(picco('vettura: spalla'), picco('vettura: cofano'), picco('vettura: cerchi'))
console.log('')
console.log('  picco dei montanti : ' + montanti.toFixed(1))
console.log('  picco della vettura: ' + vettura.toFixed(1))
console.log('  rapporto           : ' + (montanti / vettura).toFixed(2))
console.log('')
if (montanti > vettura) {
  console.log('  I MONTANTI BATTONO LA VETTURA. Il primo sguardo va su tre linee')
  console.log('  parallele invece che sul soggetto. Va abbassata l emissione.')
} else if (montanti > vettura * 0.85) {
  console.log('  PARI MERITO. Non rubano la scena ma non cedono il passo: al confine.')
} else {
  console.log('  La vettura tiene il primo sguardo. La gerarchia regge.')
}
