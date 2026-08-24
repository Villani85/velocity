/**
 * LA PRESA DEL CAROSELLO — la prova che la rotella muove i lavori e non la pagina.
 *
 * Il difetto era che il carosello arriva negli ultimi centesimi della corsa e
 * mezzo giro di rotella lo scavalcava: dieci lavori che nessuno vedeva mai.
 * La cura passa il comando al carosello finche' ci sono carte da girare.
 *
 * Qui non si guarda il codice: si mandano gesti di rotella veri e si guarda
 * SE LA PAGINA SI E' MOSSA. Due cose devono essere entrambe vere, e sono in
 * tensione fra loro — se la presa non tiene i lavori si saltano, se non
 * molla la pagina si blocca e diventa una trappola.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 })
await p.evaluate(() => window.fissaQualita('alto'))

const stato = () => p.evaluate(() => ({
  y: Math.round(scrollY),
  q: +(scrollY / (document.documentElement.scrollHeight - innerHeight)).toFixed(4),
  carta: esperienza.controllo?.quale ?? -1,
  fondo: Math.round(document.documentElement.scrollHeight - innerHeight),
}))

// si arriva al carosello scorrendo davvero, un pezzo per volta
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 60; i++) {
  await p.evaluate((y) => scrollTo(0, y), Math.round(corsa * 0.93 * (i / 60)))
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}
for (let i = 0; i < 90; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
let s = await stato()
console.log('arrivato al carosello:  q ' + s.q + '  carta ' + s.carta)

const passo = async (dy) => {
  await p.mouse.wheel(0, dy)
  await new Promise((r) => setTimeout(r, 420))
  for (let i = 0; i < 6; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  return stato()
}

console.log('')
console.log('  gesto        y      carta   la pagina si e\' mossa?')
let fermi = 0, scivolate = 0, carte = 0
let prima = s
for (let g = 1; g <= 14; g++) {
  const d = await passo(240)
  const mossa = Math.abs(d.y - prima.y) > 2
  const girata = d.carta !== prima.carta
  if (girata) carte++
  if (mossa) scivolate++; else fermi++
  console.log('  giu\' #' + String(g).padStart(2) + '   ' + String(d.y).padStart(6) + '   ' + String(d.carta).padStart(4) + '     ' + (mossa ? 'SI  (+' + (d.y - prima.y) + ')' : 'no'))
  prima = d
}

console.log('')
console.log('carte girate: ' + carte + ' su 10 lavori + SCRIVIMI')
console.log('gesti in cui la pagina e\' rimasta ferma: ' + fermi)
console.log('gesti in cui la pagina e\' scivolata:     ' + scivolate)

// e la prova opposta: dall'ultima carta si deve poter uscire
const uscita = await passo(240)
console.log('')
const alFondo = uscita.y >= uscita.fondo - 2
console.log(String.fromCharCode(10) + [uscita.y, uscita.fondo, uscita.y > prima.y ? 1 : alFondo ? 2 : 0].join(" ") + "   <- y, fondo, esito(1=esce 2=gia-in-fondo 0=trappola)")

// e tornando indietro fino alla prima, si deve risalire
let indietro = uscita
for (let g = 0; g < 13; g++) indietro = await passo(-240)
const su = await passo(-240)
console.log('tornati alla prima carta, un altro gesto all\'insu\': y ' + su.y + (su.y < indietro.y ? '  RISALE (giusto)' : '  BLOCCATO (trappola)'))

const ok = carte >= 10 && fermi >= 10 && (uscita.y > prima.y || alFondo) && su.y < indietro.y
console.log('')
console.log(ok ? 'PRESA OK: i lavori si sfogliano, e ai due estremi la pagina torna libera' : 'PRESA DA SISTEMARE')
await b.close()
