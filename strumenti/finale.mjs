/**
 * IL FINALE, GUARDATO A PASSI, E RIAVVOLTO.
 *
 * Due cose da verificare, e la seconda e' quella che distingue questo finale
 * da un filmato.
 *
 * 1. CHE LO SCAMBIO NON SI VEDA. La riga che si vede all'inizio la disegna
 *    WebGL — e' l'orizzonte della scena — e quella che resta alla fine e' un
 *    bordo del documento. Devono cadere alla stessa altezza dello schermo,
 *    perche' la camera in bolla mette l'orizzonte esattamente a meta'. Se il
 *    conto non torna, in mezzo alla corsa si vedono DUE righe.
 *
 * 2. CHE SI POSSA TORNARE INDIETRO. Il finale si percorre in tutti e due i
 *    versi: risalendo, la riga ridiventa strada e il cruscotto si riaccende.
 *    Lo strumento arriva in fondo, torna su, e confronta i fotogrammi con
 *    quelli dell'andata sugli stessi punti — se un fotogramma di ritorno non
 *    somiglia al suo gemello di andata, da qualche parte c'e' uno stato che
 *    non e' una funzione dello scorrimento.
 *
 *   node strumenti/finale.mjs
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'
const richiedi = createRequire(import.meta.url)
const sharp = richiedi('sharp')
import { mkdirSync } from 'node:fs'

const U = 'C:/Users/Giuseppe/Webingegno/velocity/.tmp/finale'
mkdirSync(U, { recursive: true })
const L = 1280, A = 800
// i punti della CORSA GLOBALE in cui guardare. Il beat `contatto` va da 0,93
// a 1,00: si comincia appena prima per prendere anche l'ultimo respiro di
// guida, che e' il fotogramma da cui il finale deve sembrare nato.
const PUNTI = [0.915, 0.945, 0.960, 0.972, 0.984, 0.996]

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: L, height: A }, deviceScaleFactor: 1 })
p.setDefaultTimeout(200000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 200000 })
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

/** ci si arriva SCORRENDO, sempre: lo smorzamento fa parte della scena */
async function vai(da, a, passi = 60) {
  for (let i = 1; i <= passi; i++) {
    await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, da + (a - da) * (i / passi)])
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
  for (let i = 0; i < 30; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}

/**
 * DOVE STA LA RIGA, MISURATA SUI PIXEL.
 *
 * Si guarda una colonna sola — quella centrale — e si cerca la riga di pixel
 * piu' luminosa. Se le righe sono due (lo scambio non allineato) ci sono due
 * massimi separati, e la distanza fra loro e' l'errore in pixel.
 */
async function misuraRiga(nome) {
  const png = await p.screenshot({ type: 'png' })
  await sharp(png).png().toFile(`${U}/${nome}.png`)
  const { data, info } = await sharp(png).extract({ left: L / 2 - 40, top: 0, width: 80, height: A })
    .greyscale().raw().toBuffer({ resolveWithObject: true })
  const profilo = []
  for (let y = 0; y < info.height; y++) {
    let somma = 0
    for (let x = 0; x < info.width; x++) somma += data[y * info.width + x]
    profilo.push(somma / info.width)
  }
  const max = Math.max(...profilo)
  // i picchi separati da almeno sei pixel e alti almeno mezzo massimo
  const picchi = []
  for (let y = 1; y < profilo.length - 1; y++) {
    if (profilo[y] < max * 0.5) continue
    if (profilo[y] < profilo[y - 1] || profilo[y] < profilo[y + 1]) continue
    if (picchi.length && y - picchi[picchi.length - 1] < 6) continue
    picchi.push(y)
  }
  return { picchi, max: Math.round(max), profilo }
}

console.log('ANDATA — la riga, in pixel dal bordo alto (meta schermo = ' + A / 2 + ')')
const andata = {}
let da = 0.90
await vai(0, 0.90, 160)
for (const q of PUNTI) {
  await vai(da, q); da = q
  const m = await misuraRiga('a_' + q)
  const stato = await p.evaluate(() => ({ beat: esperienza.regia.beat, fin: +esperienza.finale.toFixed(3) }))
  andata[q] = m
  console.log(
    ('  ' + q).padEnd(10), stato.beat.padEnd(10), 'finale', String(stato.fin).padEnd(6),
    'picchi', JSON.stringify(m.picchi), ' max', m.max,
  )
}

console.log('\nRITORNO — gli stessi punti, risalendo')
for (const q of [...PUNTI].reverse()) {
  await vai(da, q); da = q
  const m = await misuraRiga('r_' + q)
  // quanto si somiglia il profilo luminoso: la stessa colonna, andata contro ritorno
  const a = andata[q].profilo, r = m.profilo
  let scarto = 0
  for (let i = 0; i < a.length; i++) scarto += Math.abs(a[i] - r[i])
  scarto = scarto / a.length
  console.log(
    ('  ' + q).padEnd(10), 'picchi', JSON.stringify(m.picchi).padEnd(12),
    'scarto medio dall\'andata', scarto.toFixed(1), scarto > 12 ? '  <-- NON COMBACIA' : '',
  )
}

await b.close()
