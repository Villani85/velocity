/**
 * QUANTO SONO FRASTAGLIATI I BORDI — misurato, non giudicato a occhio.
 *
 * Il committente: «i contorni e tutta l'autovettura sembrano frastagliati,
 * come disegnati con un pennarello tremante». La causa era una misura, non
 * un'impressione: il multicampionamento del composer valeva zero a tre
 * livelli di qualita' su quattro, e il commento accanto diceva «il degrado e'
 * letteralmente invisibile» — falso proprio sui bordi ad alto contrasto.
 *
 * COME SI MISURA UN BORDO FRASTAGLIATO. Si prende il profilo della sagoma
 * dell'automobile (differenza fra vettura visibile e nascosta, come in
 * `carrozzeria.mjs`) e si guarda quanto la sua posizione ondeggia riga per
 * riga lungo un tratto di bordo quasi verticale: su un bordo pulito la
 * posizione scende con dolcezza; su un bordo a scaletta salta di un pixel
 * intero a ogni riga o due, in un pattern che si ripete.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const LIVELLO = process.argv[2] || 'medio'
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 })
await p.evaluate((l) => window.fissaQualita(l), LIVELLO)
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) { await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, 0.30 * (i / 40)]); await p.evaluate(() => new Promise((r) => requestAnimationFrame(r))) }
for (let i = 0; i < 60; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

const png = await p.screenshot({ type: 'png' })
await sharp(png).jpeg({ quality: 95 }).toFile('C:/Users/Giuseppe/Webingegno/velocity/docs/provini/frast_' + LIVELLO + '.jpeg')
const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info

/* SI CERCA UN BORDO QUASI VERTICALE della carrozzeria: per ogni riga, il primo
   pixel scuro-su-chiaro (o viceversa) in una finestra dove sappiamo gia' che
   passa il tetto/montante — la stessa zona che il commento originale del
   progetto (`Esperienza.ts`, «scaletta di punti bianchi sul montante») cita
   come il punto peggiore. */
/* SI TRACCIA LA LINEA DEL TETTO CONTRO IL CIELO, colonna per colonna, non
   riga per riga in una finestra larga. La prima versione cercava il primo
   salto di luminanza in un rettangolo che copriva anche la carena e l'ottica
   — bordi diversi, sovrapposti — e il risultato (15,6 px di scarto) era il
   metro che saltava da un bordo all'altro, non la misura dell'aliasing.
   Qui si segue UN bordo solo: si parte da un punto noto sulla linea del tetto
   e per ogni colonna si cerca la transizione chiaro/scuro in una finestra
   STRETTA centrata sulla posizione trovata nella colonna precedente. Un bordo
   pulito e uno a scaletta si separano subito su questo metro: il primo scarta
   di meno di un pixel colonna dopo colonna, il secondo salta a gradini. */
const X0 = 560, X1 = 760
let y = 222 // stimato dal provino: il tetto contro lo sfondo chiaro
const bordo = []
for (let x = X0; x < X1; x++) {
  let trovato = -1
  const raggio = 10
  for (let yy = Math.max(0, y - raggio); yy < Math.min(H - 1, y + raggio); yy++) {
    const i0 = (yy * W + x) * C, i1 = ((yy + 1) * W + x) * C
    const l0 = 0.2126 * data[i0] + 0.7152 * data[i0 + 1] + 0.0722 * data[i0 + 2]
    const l1 = 0.2126 * data[i1] + 0.7152 * data[i1 + 1] + 0.0722 * data[i1 + 2]
    if (l0 - l1 > 30) { trovato = yy; break } // chiaro sopra, scuro sotto: il tetto
  }
  if (trovato < 0) continue
  y = trovato
  bordo.push(trovato)
}
if (bordo.length < 20) {
  console.log('bordo non tracciato a sufficienza (' + bordo.length + ' punti) — controlla il provino e aggiusta la stima iniziale')
} else {
  const scarti = []
  for (let i = 2; i < bordo.length - 2; i++) {
    const media = (bordo[i - 2] + bordo[i - 1] + bordo[i] + bordo[i + 1] + bordo[i + 2]) / 5
    scarti.push(Math.abs(bordo[i] - media))
  }
  const rms = Math.sqrt(scarti.reduce((s, v) => s + v * v, 0) / scarti.length)
  let salti = 0
  for (let i = 1; i < bordo.length; i++) if (bordo[i] !== bordo[i - 1]) salti++
  console.log('livello ' + LIVELLO + '   bordo tracciato su ' + bordo.length + ' colonne, y da ' + bordo[0] + ' a ' + bordo[bordo.length - 1])
  console.log('  scarto dalla curva liscia (rms): ' + rms.toFixed(3) + ' px   (0 = liscio, 1 e\' gia\' il limite fisico di un pixel)')
  console.log('  colonne in cui il bordo cambia riga: ' + salti + ' su ' + (bordo.length - 1))
}

await b.close()
