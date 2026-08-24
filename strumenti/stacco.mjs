/**
 * LO STACCO — quanto il fondo cambia SOTTO una riga di testo.
 *
 * PERCHE' ESISTE, e perche' non misura il contrasto.
 *
 * Il contrasto medio fra il testo bianco e il fondo di questa hero e' buono:
 * circa sette a uno, ben oltre qualunque soglia. Eppure il titolo si legge come
 * appiccicato sopra l'immagine, e per settimane non ho saputo dire perche'.
 *
 * Il numero che lo spiega non e' il contrasto: e' la VARIAZIONE del fondo
 * lungo la riga. Misurata sulla hero a 1400x875, colonna per colonna:
 *
 *     x     900   1000   1100   1200   1300
 *     lum    66     91     93     48     36
 *
 * Le prime due parole stanno sul pavimento chiaro, l'ultima sul nero: uno
 * sbalzo di 2,6 volte dentro una riga sola. L'occhio non legge «testo su
 * fondo», legge «testo su DUE fondi» — e due fondi vogliono dire che il testo
 * non appartiene a nessuno dei due, cioe' che e' stato appoggiato sopra.
 *
 * E' anche la ragione per cui alzare il velo non basta: un velo lineare
 * schiaccia il bordo destro, dove il fondo era gia' scuro, e lascia scoperta
 * proprio la fascia chiara in mezzo. Il rimedio deve sagomarsi sulla curva.
 *
 * COSA MISURA.
 *
 * Per ogni tempo del sito: la luminanza del fondo colonna per colonna dentro la
 * fascia verticale occupata dal titolo, e il rapporto fra la piu' chiara e la
 * piu' scura. E per non contare i pixel delle lettere, campiona una fascia
 * ALTA QUANTO IL TITOLO ma spostata di mezza interlinea, dove il testo non c'e'.
 *
 * IL CRITERIO E' LA DIFFERENZA ASSOLUTA, NON IL RAPPORTO.
 *
 * Il primo giro giudicava sul rapporto, ed era una soglia che non voleva dire
 * niente: dove il fondo e' quasi nero, 2 contro 60 fa trenta volte e 2 contro
 * 40 ne fa venti — due numeri enormi per due situazioni che a occhio sono la
 * stessa. Quello che si vede e' di quanti punti di luminanza cambia il fondo
 * lungo la riga, e quaranta punti su 255 e' il limite oltre il quale si legge
 * come un gradino dietro le lettere.
 *
 * E si media su piu' fotogrammi. Dal quinto tempo in poi la scena si muove —
 * la strada scorre, i lampioni passano — e una misura sola su un fondo che
 * cambia e' un campione a caso: due giri identici davano 60,8 e 71,2.
 *
 * E un secondo criterio che serve a non barare: la luminanza della meta' dello
 * schermo dove NON c'e' il testo non deve calare piu' del 6% rispetto alla
 * misura di riferimento. Si puo' sempre far sparire uno sbalzo annerendo tutto,
 * e sarebbe la cura peggiore della malattia.
 *
 *     node strumenti/stacco.mjs
 *     node strumenti/stacco.mjs --segna    scrive il riferimento della meta' libera
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const sharp = createRequire(import.meta.url)('sharp')
const BASE = process.env.BASE_URL || 'http://localhost:5174/'
const SEGNA = process.argv.includes('--segna')
const RIFERIMENTO = 'docs/misure/stacco.json'

/** i sette tempi, presi al centro */
const TEMPI = [
  ['hero', 0.06], ['orbita', 0.23], ['lato', 0.43], ['taglio', 0.58],
  ['accensione', 0.68], ['velocita', 0.77], ['contatto', 0.90],
]
const SOGLIA = 40
/** quanti fotogrammi si mediano: la scena si muove, uno solo e' un caso */
const RIPETIZIONI = 4
const luminanza = (m) => 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})
const p = await b.newPage({ viewport: { width: 1400, height: 875 } })
p.setDefaultTimeout(200000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto(BASE, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto)
await p.evaluate(() => document.fonts.ready)
await p.evaluate(() => window.fissaQualita('alto'))
const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)

const esito = {}
let peggio = { sbalzo: 0 }
for (const [nome, q] of TEMPI) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q])
  for (let i = 0; i < 20; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

  const dove = await p.evaluate(() => {
    const t = document.querySelector('.voci__titolo')
    if (!t) return null
    /* SI MISURA RIGA PER RIGA, e dove stanno le LETTERE.
       Due correzioni, tutte e due imposte dai numeri.
       La prima: campionavo la scatola di `.voci__titolo`. Dal quinto tempo in
       poi il testo e' allineato a destra e occupa un terzo della sua scatola,
       quindi misuravo due terzi di parabrezza vuoto — sbalzi di cinquanta.
       La seconda: anche prendendo il rettangolo vero delle lettere, l'UNIONE di
       due righe di lunghezza diversa contiene un angolo dove testo non ce n'e'.
       «Dentro / c'e' un motore.» allineate a destra fanno una scala, e sopra il
       gradino c'e' il vetro. Restava 92,9 in prima colonna.
       Quindi ogni riga si misura per conto suo, e vale la peggiore: e' anche
       piu' giusto, perche' e' UNA riga che deve stare su un fondo solo. */
    const righe = []
    for (const m of t.querySelectorAll('.mascherina')) {
      /* SI PRENDE L'ELEMENTO PIU' INTERNO, e non la mascherina.
         La mascherina e' `display: block`: un Range sul suo contenuto restituisce
         la LINE BOX, che e' larga quanto la colonna anche quando dentro ci sono
         tre lettere. Misurato: al beat `velocita` sia il blocco sia le due
         righe davano 861..1309, cioe' lo stesso identico rettangolo — segno che
         non stavo misurando il testo. L'elemento interno invece e' in linea, e
         il suo rettangolo e' quello delle lettere. */
      const g = document.createRange()
      g.selectNodeContents(m.querySelector('i') ?? m)
      const r = g.getBoundingClientRect()
      g.detach?.()
      if (r.width < 40 || r.height < 8) continue
      righe.push({
        t: (m.textContent || '').trim().slice(0, 18),
        x: Math.round(r.left), largo: Math.round(r.width),
        // si stringe di un quinto sopra e sotto: i bordi della scatola di una
        // riga sono spazio interlinea, non fondo sotto le lettere
        y: Math.round(r.top + r.height * 0.2),
        alto: Math.max(4, Math.round(r.height * 0.6)),
      })
    }
    if (!righe.length) return null
    return { righe, W: innerWidth, H: innerHeight }
  })
  if (!dove) { esito[nome] = null; console.log(nome.padEnd(11), 'nessuna riga misurabile'); continue }

  // il testo si nasconde: cosi' si misura il FONDO e basta, senza indovinare
  // dove cadono le lettere
  await p.evaluate(() => { document.querySelector('.voci').style.visibility = 'hidden' })
  const scatti = []
  for (let k = 0; k < RIPETIZIONI; k++) {
    for (let i = 0; i < 6; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
    scatti.push(await p.screenshot())
  }
  await p.evaluate(() => { document.querySelector('.voci').style.visibility = '' })

  /* -1 E NON 0: un fondo PERFETTAMENTE uniforme da uno sbalzo di zero, e con
     lo zero come partenza il confronto `sb > sbalzoRiga` non scattava mai —
     la riga non veniva registrata e il tempo spariva dal rapporto senza dire
     niente. Sono spariti cosi' `accensione` e `contatto` subito dopo la
     correzione che li ha resi perfetti: il caso migliore possibile letto come
     un caso mancante. */
  let colonne = [], sbalzoRiga = -1, quale = null
  for (const riga of dove.righe) {
    const larghezza = Math.max(24, Math.round(riga.largo / 6))
    const q = []
    for (let i = 0; i < 6; i++) {
      const left = Math.max(0, Math.min(dove.W - larghezza, riga.x + i * larghezza))
      const top = Math.max(0, Math.min(dove.H - riga.alto, riga.y))
      let somma = 0
      for (const png of scatti) {
        const buf = await sharp(png).extract({ left, top, width: larghezza, height: riga.alto }).toBuffer()
        const st = await sharp(buf).stats()
        somma += luminanza(st.channels.slice(0, 3).map((c) => c.mean))
      }
      q.push(+(somma / scatti.length).toFixed(1))
    }
    const sb = Math.max(...q) - Math.min(...q)
    if (sb > sbalzoRiga) { sbalzoRiga = sb; colonne = q; quale = riga }
  }
  if (!colonne.length) { esito[nome] = null; continue }
  // e la meta' libera: quella dalla parte opposta al testo
  const aDestra = dove.righe[0].x > dove.W / 2
  const bufLibera = await sharp(scatti[0])
    .extract({ left: aDestra ? 0 : Math.round(dove.W / 2), top: 0, width: Math.round(dove.W / 2), height: dove.H })
    .toBuffer()
  const stLibera = await sharp(bufLibera).stats()
  const libera = +luminanza(stLibera.channels.slice(0, 3).map((c) => c.mean)).toFixed(1)

  const sbalzo = +sbalzoRiga.toFixed(1)
  esito[nome] = { colonne, sbalzo, libera }
  if (sbalzo > peggio.sbalzo) peggio = { nome, sbalzo, colonne }
  console.log(nome.padEnd(11), colonne.map((c) => String(c).padStart(6)).join(''),
    '  sbalzo', String(sbalzo).padStart(5), '  meta\' libera', libera)
}
await b.close()

console.log('')
if (SEGNA) {
  mkdirSync('docs/misure', { recursive: true })
  writeFileSync(RIFERIMENTO, JSON.stringify(esito, null, 2))
  console.log('riferimento scritto in ' + RIFERIMENTO)
} else if (existsSync(RIFERIMENTO)) {
  const rif = JSON.parse(readFileSync(RIFERIMENTO, 'utf8'))
  let annerito = false
  for (const [nome] of TEMPI) {
    if (!esito[nome] || !rif[nome]) continue
    const calo = 1 - esito[nome].libera / rif[nome].libera
    if (calo > 0.06) {
      console.log('ANNERITO: al tempo', nome, 'la meta\' libera ha perso il',
        (calo * 100).toFixed(0) + '% — si sta scurendo la scena, non schermando il testo')
      annerito = true
    }
  }
  if (!annerito) console.log('la meta\' libera non e\' stata annerita')
}

console.log('lo sbalzo peggiore:', peggio.nome, peggio.sbalzo, 'punti —', (peggio.colonne || []).join(' '))
if (peggio.sbalzo > SOGLIA) {
  console.log('TESTO APPICCICATO: sopra ' + SOGLIA + ' punti il fondo si legge come un gradino')
  process.exit(1)
}
console.log('il testo sta sul suo fondo')
