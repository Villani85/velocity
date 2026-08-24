/**
 * PREPARARE UNA FOTOGRAFIA PANORAMICA PERCHE' SIA UNA VERA EQUIRETTANGOLARE.
 *
 * IL PROBLEMA, e non e' ovvio finche' non si vede.
 *
 * Una proiezione equirettangolare ha due proprieta' rigide: e' larga il
 * doppio di quanto e' alta, e la sua altezza copre 180 gradi di elevazione —
 * dallo zenit al nadir — con l'orizzonte esattamente a meta'.
 *
 * Una fotografia panoramica generata NON le rispetta. Copre i 360 gradi in
 * orizzontale, ma in verticale ne copre un centinaio scarsi: il cielo si
 * ferma poco sopra i tetti e il terreno poco oltre i piedi. Se la si dà a
 * three come equirettangolare, quei cento gradi vengono spalmati su
 * centottanta, e TUTTO SI ALLUNGA di quasi il doppio in altezza.
 *
 * Il sintomo non somiglia alla causa: nel provino la villa sembrava a cinque
 * metri invece che a trenta. Sembra un problema di scala o di posizione della
 * camera, ed e' invece un problema di proiezione — la stessa immagine, con la
 * stessa camera, alla distanza giusta.
 *
 * LA CORREZIONE.
 *
 * Si costruisce una tela 2:1 vera, si rimpicciolisce la fotografia perche'
 * occupi solo la FASCIA DI ELEVAZIONE che copre davvero, e si riempie il
 * resto: il cielo sopra col colore del cielo, il terreno sotto col colore del
 * terreno. Nessuna delle due zone si vede mai — sopra c'e' lo zenit, sotto il
 * punto esattamente sotto i piedi, che nella scena e' coperto dall'auto — ma
 * la loro presenza rimette a posto la geometria di tutto il resto.
 *
 * L'ORIZZONTE SI MISURA, non si stima: e' la riga in cui la luminanza media
 * crolla passando dall'architettura illuminata al pavimento. Su questa
 * fotografia cade a 0,625, non a 0,5.
 *
 *   node strumenti/panorama.mjs <immagine> [gradi verticali]
 */
import sharp from 'sharp'
import { statSync } from 'node:fs'

const SORGENTE = process.argv[2]
/**
 * QUANTI GRADI DI ELEVAZIONE COPRE DAVVERO LA FOTOGRAFIA.
 *
 * 104 e' il valore che fa combaciare la scala apparente con la distanza
 * dichiarata dalla scena: il colonnato a diciassette metri, la villa a
 * trenta. Si trova per prova — si rende, si guarda quanto e' grande un
 * elemento di misura nota, si corregge — e una volta trovato non si tocca
 * piu', perche' e' una proprieta' della fotografia e non della scena.
 *
 * Piu' basso: tutto si rimpicciolisce e si allontana.
 * Piu' alto: tutto si ingrandisce e si avvicina.
 */
const GRADI = Number(process.argv[3] || 104)
const USCITA = 'C:/Users/Giuseppe/Webingegno/velocity/public/hdri/corte_pano.webp'

if (!SORGENTE) {
  console.error('uso: node strumenti/panorama.mjs <immagine.png> [gradi verticali]')
  process.exit(1)
}

const meta = await sharp(SORGENTE).metadata()
const W = 4096
const H = W / 2

// --- 1. dove sta l'orizzonte, misurato -------------------------------
const { data, info } = await sharp(SORGENTE).resize(64, null).greyscale().raw()
  .toBuffer({ resolveWithObject: true })
const righe = []
for (let y = 0; y < info.height; y++) {
  let s = 0
  for (let x = 0; x < info.width; x++) s += data[y * info.width + x]
  righe.push(s / info.width)
}
let best = 0
let bestv = 0
for (let y = Math.floor(info.height * 0.35); y < info.height - 3; y++) {
  const d = (righe[y - 2] + righe[y - 1]) / 2 - (righe[y + 1] + righe[y + 2]) / 2
  if (d > bestv) { bestv = d; best = y }
}
const vOrizzonte = best / info.height

// --- 2. la fascia che la fotografia occupa davvero -------------------
const altezzaContenuto = Math.round(H * (GRADI / 180))
const orizzonteDentro = Math.round(altezzaContenuto * vOrizzonte)
const cima = Math.round(H / 2 - orizzonteDentro)

// i due colori di riempimento, presi dalle righe vere
const su = await sharp(SORGENTE).extract({ left: 0, top: 0, width: meta.width, height: 20 }).stats()
const giu = await sharp(SORGENTE)
  .extract({ left: 0, top: meta.height - 20, width: meta.width, height: 20 }).stats()
const colore = (st, k) => ({
  r: Math.round(st.channels[0].mean * k),
  g: Math.round(st.channels[1].mean * k),
  b: Math.round(st.channels[2].mean * k),
})

const contenuto = await sharp(SORGENTE).resize(W, altezzaContenuto, { fit: 'fill' }).toBuffer()

// LO ZENIT SI SCURISCE (0,75): il cielo diretto sopra la testa e' piu' scuro
// di quello all'orizzonte, sempre. Riempire con lo stesso colore della riga
// piu' alta darebbe una cupola uniforme, che nei riflessi di una carrozzeria
// si legge come un fondale da studio.
await sharp({
  create: { width: W, height: H, channels: 3, background: colore(su, 0.75) },
})
  .composite([
    { input: contenuto, left: 0, top: cima },
    // e il nadir, sotto: un rettangolo scuro. Non si vede mai — sotto i piedi
    // c'e' l'auto — ma nella mappa dei riflessi impedisce che il sottoscocca
    // riceva luce da un pavimento che non esiste.
    {
      input: await sharp({
        create: { width: W, height: H - (cima + altezzaContenuto), channels: 3, background: colore(giu, 0.55) },
      }).png().toBuffer(),
      left: 0,
      top: cima + altezzaContenuto,
    },
  ])
  .webp({ quality: 88, effort: 5 })
  .toFile(USCITA)

console.log(`sorgente        ${meta.width}x${meta.height}`)
console.log(`orizzonte       v = ${vOrizzonte.toFixed(3)}  (salto di luminanza ${bestv.toFixed(1)})`)
console.log(`fascia          ${GRADI} gradi = ${altezzaContenuto} righe su ${H}`)
console.log(`contenuto da    y=${cima} a y=${cima + altezzaContenuto}, orizzonte a y=${H / 2}`)
console.log(`scritto         ${(statSync(USCITA).size / 1024).toFixed(0)} kB`)
