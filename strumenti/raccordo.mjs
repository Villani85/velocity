/**
 * IL RACCORDO — misura se il passaggio faro→strada ha un buco di luce.
 *
 * PERCHE' ESISTE.
 *
 * Il committente ha guardato il filmato tre volte e tre volte ha detto la
 * stessa cosa: qui finisce il tunnel e qui comincia la strada. Io ho provato a
 * correggerlo due volte spostando i TEMPI — l'iride anticipata da 0,905 a 0,79
 * a 0,68, le luci del corridoio che calano nell'ultimo decimo invece che
 * nell'ultimo quarto — e tutte e due le volte ho dichiarato chiuso un difetto
 * che era ancora li'. Guardavo un provino e dicevo «adesso si sovrappongono».
 *
 * Poi ho misurato la luminanza media del fotogramma lungo il beat, e il numero
 * ha detto un'altra cosa:
 *
 *     corridoio pieno          43,4
 *     nasce il disco           17,5     ← il 40% dei vicini
 *     la strada ha il campo    62
 *
 * Il fotogramma si dimezza e poi raddoppia. Non e' un problema di quando
 * nascono le cose: e' un problema di ESPOSIZIONE fra due mondi che hanno due
 * luminanze diverse, e nessuna quantita' di sovrapposizione temporale lo
 * chiude. Un occhio che vede il fotogramma dimezzarsi legge uno stacco, punto,
 * anche se le due immagini sono contemporaneamente sullo schermo.
 *
 * E il disco non c'entra: dentro vale 24,3 contro i 3,9 del centro che
 * sostituisce, quindi il centro lo MIGLIORA. E' il corridoio intorno che
 * collassa mentre la camera scende nella canna.
 *
 * COSA MISURA.
 *
 * La luminanza media di ogni fotogramma lungo il beat `taglio`, a passi
 * regolari, e per ogni campione il rapporto con la mediana dei suoi vicini.
 *
 * IL CRITERIO: nessun campione sotto il 70% della mediana locale.
 *
 * Non e' una soglia scelta per far passare il codice di oggi — oggi il minimo
 * sta al 40% e questo strumento fallisce. E' la soglia sotto la quale una
 * variazione di luminanza smette di leggersi come «la scena cambia» e comincia
 * a leggersi come «un'altra scena». Un fotogramma al 70% di quelli intorno e'
 * una nuvola davanti al sole; al 40% e' un taglio di montaggio.
 *
 * La finestra dei vicini e' larga cinque campioni: abbastanza da non farsi
 * trascinare dal campione difettoso stesso, abbastanza stretta da non
 * confondere un buco con la naturale discesa del beat.
 *
 *     node strumenti/raccordo.mjs
 *     node strumenti/raccordo.mjs --provini    salva anche le immagini
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const sharp = createRequire(import.meta.url)('sharp')
const PROVINI = process.argv.includes('--provini')
const BASE = process.env.BASE_URL || 'http://localhost:5174/'

/** il beat `taglio`, in progresso globale (vedi core/Regia.ts) */
const DA = 0.53
const A = 0.645
/** quanti campioni: uno ogni tre millesimi di pagina */
const QUANTI = 40

const luminanza = (m) => 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
p.setDefaultTimeout(200000)
// il client di Vite scrive nella console e ricarica sotto la misura
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto(BASE, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto)
// LA QUALITA' SI FISSA, se no il livello scende sotto la misura e si finisce
// per misurare una scena degradata — e' successo davvero (vedi COSTRUZIONE.md)
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
const fermo = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

/** ci si arriva SCORRENDO, non saltando: meta' di questo sito e' inerzia */
async function vaiA(da, a, passi) {
  for (let i = 1; i <= passi; i++) {
    await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, da + (a - da) * (i / passi)])
    await fermo()
  }
  // e si aspetta che lo scorrimento morbido raggiunga il bersaglio
  for (let i = 0; i < 18; i++) await fermo()
}

if (PROVINI) mkdirSync('docs/provini/raccordo', { recursive: true })

await vaiA(0, DA, 700)

const campioni = []
let dove = DA
for (let i = 0; i <= QUANTI; i++) {
  const q = DA + (A - DA) * (i / QUANTI)
  await vaiA(dove, q, Math.max(6, Math.round((q - dove) * 2600)))
  dove = q
  const stato = await p.evaluate(() => ({
    locale: +esperienza.regia.locale.toFixed(3),
    iride: +esperienza.attraversamento.iridePiena.toFixed(3),
  }))
  const png = await p.screenshot(
    PROVINI ? { path: 'docs/provini/raccordo/' + String(i).padStart(2, '0') + '.png' } : {},
  )
  const s = await sharp(png).stats()
  campioni.push({
    q: +q.toFixed(4),
    ...stato,
    lum: +luminanza(s.channels.slice(0, 3).map((c) => c.mean)).toFixed(1),
  })
}
await b.close()

// --- il giudizio ------------------------------------------------------------
const FINESTRA = 2
const mediana = (v) => {
  const o = [...v].sort((x, y) => x - y)
  return o.length % 2 ? o[(o.length - 1) / 2] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2
}

let peggio = { rapporto: 99 }
console.log('  q      locale  iride   lum   vicini  rapporto')
for (let i = 0; i < campioni.length; i++) {
  const c = campioni[i]
  const vicini = campioni
    .slice(Math.max(0, i - FINESTRA), i + FINESTRA + 1)
    .filter((_, k) => Math.max(0, i - FINESTRA) + k !== i)
    .map((x) => x.lum)
  const med = mediana(vicini)
  const rapporto = med > 0 ? c.lum / med : 1
  if (rapporto < peggio.rapporto) peggio = { ...c, med: +med.toFixed(1), rapporto }
  const male = rapporto < 0.70 ? '  <-- BUCO' : ''
  console.log(
    String(c.q).padEnd(7),
    String(c.locale).padStart(6),
    String(c.iride).padStart(6),
    String(c.lum).padStart(6),
    String(med.toFixed(1)).padStart(7),
    (rapporto * 100).toFixed(0).padStart(7) + '%' + male,
  )
}

console.log('')
console.log('il campione peggiore: q', peggio.q, '— luminanza', peggio.lum,
  'contro', peggio.med, 'dei vicini, cioe\' il', (peggio.rapporto * 100).toFixed(0) + '%')
if (peggio.rapporto < 0.70) {
  console.log('RACCORDO ROTTO: sotto il 70%, il fotogramma si legge come uno stacco')
  process.exit(1)
}
console.log('raccordo continuo: nessun buco di luce')
