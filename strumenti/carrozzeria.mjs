/**
 * LA CARROZZERIA — quanta luce prende davvero l'automobile.
 *
 * PERCHE' ESISTE.
 *
 * Sulla hero, misurato a fasce: la piscina sta a 156, la villa a 141,
 * l'automobile a 50. E' quasi solo profilo — il modello c'e', il modellato no.
 * E' il difetto che il committente ha portato dopo il confronto con The Watch
 * («quando vai molto vicino, il livello di fedelta' non ha ancora la stessa
 * qualita' product-film») ed e' l'unico dei suoi punti che riguarda la materia
 * e non l'impaginazione.
 *
 * Il rig delle luci pero' e' gia' fatto ed e' buono: quattro pannelli e una
 * direzionale, ognuno con la sua ragione scritta accanto. Quindi non si
 * aggiungono sorgenti — si tara. E per tarare serve un numero che parli
 * dell'AUTOMOBILE e non del fotogramma.
 *
 * COME TROVA I PIXEL DELL'AUTOMOBILE.
 *
 * Non con un riquadro a mano: con una differenza. Si fotografa la scena due
 * volte, una con la vettura nascosta e una con la vettura al suo posto, e i
 * pixel che cambiano sono i suoi. E' esatto — segue la sagoma vera, cerchi e
 * alettone compresi — e non va rifatto quando la camera si sposta.
 *
 * La differenza prende anche l'ombra e il riflesso, che cambiano pure loro.
 * Per questo si tiene solo la meta' alta del rettangolo che cambia: ombra e
 * riflesso stanno sotto la vettura, per definizione.
 *
 * COSA STAMPA.
 *
 *   mediana      quanta luce ha addosso la carrozzeria
 *   novantesimo  le alte luci: se supera 250 sta bruciando
 *   scuri        la frazione di pixel sotto 12, cioe' quanto e' silhouette
 *
 *     node strumenti/carrozzeria.mjs
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)('sharp')
const BASE = process.env.BASE_URL || 'http://localhost:5174/'
const L = 1400, A = 875

/** i tempi in cui l'automobile si vede da fuori */
const TEMPI = [['hero', 0.06], ['orbita', 0.23], ['lato', 0.43]]

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})
const p = await b.newPage({ viewport: { width: L, height: A } })
p.setDefaultTimeout(200000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto(BASE, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto)
/* SI ASPETTANO ANCHE LE RUOTE VERE, e non e' un dettaglio: e' stato l'inganno
   piu' lungo della sessione. `autoPronta && ambientePronto` non copre
   `ruota.glb`, che arriva dopo — e fino ad allora al loro posto ci sono le
   RUOTE DI SEGNALE, che sono `MeshBasicMaterial` con `toneMapped: false`,
   cioe' emettono luce propria. Nei provini uscivano quattro dischi ciano
   luminosi, e per due volte ho creduto fossero i cerchi veri troppo
   specchianti: la prima volta ho abbassato ruvidita' e intensita' d'ambiente,
   la seconda le ho abbassate ancora. Non cambiava niente, perche' stavo
   correggendo un materiale che nel fotogramma non c'era.
   Un provino che ritrae uno stato TRANSITORIO non e' un provino: e' una
   fotografia scattata mentre la scena si vestiva. */
await p.waitForFunction(
  () => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4,
  null, { timeout: 120000 },
).catch(() => console.log('  (ATTENZIONE: le ruote vere non sono arrivate, nel provino ci sono i segnali)'))
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => {
  const h = document.getElementById('hud'); if (h) h.style.display = 'none'
  // via anche il testo: non e' carrozzeria e la differenza lo prenderebbe
  const v = document.querySelector('.voci'); if (v) v.style.visibility = 'hidden'
})
const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
const fermo = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

/* SI ASPETTA CHE IL FOTOGRAMMA SMETTA DI CAMBIARE, non un numero di frame.
   Questo strumento non era RIPETIBILE: tre esecuzioni con le stesse identiche
   impostazioni davano mediana 41,2 / 4,3 / 25,7 e scuri 27,4% / 56,8% / 37,1%,
   con il conteggio dei pixel che ballava del cento per cento. Ci ho tarato
   sopra mezza sessione.
   La causa: la scena e' VIVA — lo scorrimento ha inerzia (Lenis continua a
   frenare dopo `scrollTo`) e il gruppo dell'esterno ruota. Aspettare «18
   fotogrammi» non e' un'attesa, e' una scommessa: quanti ne passano davvero
   dipende dal carico della macchina. E soprattutto fra la fotografia CON
   l'automobile e quella SENZA la scena si muoveva, quindi la differenza fra
   le due prendeva dentro il FONDO che si era spostato — non la carrozzeria.
   Adesso si confrontano due fotogrammi consecutivi e si va avanti finche' non
   sono praticamente uguali. E' un'attesa su una CONDIZIONE, non sul tempo:
   e' la differenza fra un controllo e una speranza. */
async function quieto(giri = 90) {
  /* SI ASPETTA UNA CONDIZIONE, NON UN NUMERO DI FOTOGRAMMI.
     Questo strumento non era ripetibile: tre esecuzioni identiche davano
     mediana 41,2 / 4,3 / 25,7 e scuri 27,4% / 56,8% / 37,1%, col conteggio
     dei pixel che ballava del cento per cento. Ci ho tarato sopra mezza
     sessione — e' il sesto metro rotto di questo progetto.
     La causa: lo scorrimento ha INERZIA (Lenis continua a frenare dopo
     `scrollTo`), quindi «aspetta 18 fotogrammi» non e' un'attesa ma una
     scommessa su quanti ne passano davvero, che dipende dal carico della
     macchina. E fra la fotografia CON l'automobile e quella SENZA la scena
     si spostava ancora: la differenza fra le due prendeva dentro il FONDO
     che si era mosso, non la carrozzeria.
     PRIMO TENTATIVO DI CURA, ANCHE LUI SBAGLIATO: confrontavo due
     `p.screenshot()` finche' non erano uguali. Ma `screenshot()` restituisce
     un PNG COMPRESSO, e due immagini quasi identiche danno sequenze di byte
     diversissime: la condizione non convergeva mai e la misura non finiva.
     Confrontare byte compressi non e' confrontare immagini.
     Adesso si guarda lo stato della pagina — la posizione di scorrimento e il
     tempo della regia — e si va avanti finche' non stanno fermi per qualche
     giro di seguito. Costa un `evaluate` invece di una fotografia. */
  let ultimo = null, fermi = 0
  for (let g = 0; g < giri; g++) {
    await fermo()
    const ora = await p.evaluate(() => [
      Math.round(window.scrollY * 100) / 100,
      Math.round((window.esperienza?.regia?.locale ?? 0) * 10000) / 10000,
    ])
    const uguale = ultimo && ora[0] === ultimo[0] && ora[1] === ultimo[1]
    fermi = uguale ? fermi + 1 : 0
    ultimo = ora
    if (fermi >= 6) { for (let i = 0; i < 3; i++) await fermo(); return }
  }
  console.log('  (attenzione: lo scorrimento non si e mai fermato)')
}


for (const [nome, q] of TEMPI) {
  const passi = Math.max(40, Math.round(q * 700))
  await p.evaluate(() => window.scrollTo(0, 0))
  for (let i = 1; i <= passi; i++) {
    await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / passi)])
    await fermo()
  }
  await quieto()
  const con = await p.screenshot()
  await p.evaluate(() => { esperienza.autoVera.visible = false })
  await quieto()
  const senza = await p.screenshot()
  await p.evaluate(() => { esperienza.autoVera.visible = true })
  await quieto()

  const a = await sharp(con).raw().toBuffer()
  const s = await sharp(senza).raw().toBuffer()
  const canali = a.length / (L * A)

  // 1. il rettangolo che cambia
  let x0 = L, x1 = 0, y0 = A, y1 = 0
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const i = (y * L + x) * canali
      const d = Math.abs(a[i] - s[i]) + Math.abs(a[i + 1] - s[i + 1]) + Math.abs(a[i + 2] - s[i + 2])
      if (d > 26) {
        if (x < x0) x0 = x; if (x > x1) x1 = x
        if (y < y0) y0 = y; if (y > y1) y1 = y
      }
    }
  }
  if (x1 <= x0) { console.log(nome.padEnd(8), 'nessuna differenza: la vettura non e\' in campo'); continue }

  // 2. i pixel della carrozzeria: quelli che cambiano, nella META' ALTA del
  //    rettangolo — sotto ci sono l'ombra di contatto e il riflesso, che
  //    cambiano anche loro ma non sono carrozzeria
  const meta = y0 + Math.round((y1 - y0) * 0.56)
  const luci = []
  for (let y = y0; y <= meta; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * L + x) * canali
      const d = Math.abs(a[i] - s[i]) + Math.abs(a[i + 1] - s[i + 1]) + Math.abs(a[i + 2] - s[i + 2])
      if (d <= 26) continue
      luci.push(0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2])
    }
  }
  if (luci.length < 500) { console.log(nome.padEnd(8), 'troppo pochi pixel:', luci.length); continue }
  luci.sort((u, v) => u - v)
  const q_ = (f) => luci[Math.min(luci.length - 1, Math.floor(luci.length * f))]
  const scuri = luci.filter((v) => v < 12).length / luci.length

  console.log(
    nome.padEnd(8),
    'pixel', String(luci.length).padStart(7),
    ' mediana', q_(0.5).toFixed(1).padStart(6),
    ' 90esimo', q_(0.9).toFixed(1).padStart(6),
    ' massimo', q_(0.999).toFixed(1).padStart(6),
    ' scuri', (scuri * 100).toFixed(1).padStart(5) + '%',
  )
}
await b.close()
