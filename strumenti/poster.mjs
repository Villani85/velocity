/**
 * IL POSTER — il primo fotogramma vero, non un fermo immagine finto.
 *
 * Serve a due cose diverse e la seconda e' quella che conta.
 *
 * La prima e' il ripiego: chi ha `prefers-reduced-motion`, chi apre senza
 * WebGL, chi sta su una rete che non regge il carico entro il budget d'attesa.
 * Quelle persone devono trovare un sito, e un sito comincia con un'immagine.
 *
 * La seconda e' l'LCP. Finche' l'elemento piu' grande della pagina e' una tela
 * che si riempie dopo aver scaricato tre megabyte, la misura di Google dice
 * quello che ci mette la tela — e non c'e' ottimizzazione del codice che la
 * cambi. Un'immagine preannunciata nell'HTML la chiude in mezzo secondo.
 *
 * E' RENDERIZZATO DALLA SCENA VERA, non disegnato a parte. Un poster fatto a
 * mano diverge dalla scena al primo ritocco della camera e nessuno se ne
 * accorge finche' non lo vede un cliente. Questo si rifa' con un comando.
 *
 *   node strumenti/poster.mjs
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'
const richiedi = createRequire(import.meta.url)
const sharp = richiedi('sharp')
import { mkdirSync } from 'node:fs'

const U = 'C:/Users/Giuseppe/Webingegno/velocity/public/poster'
mkdirSync(U, { recursive: true })

// I DUE FORMATI SONO DUE INQUADRATURE, non due ritagli.
//
// Il ritaglio verticale di un'immagine orizzontale mette l'automobile in mezzo
// a due bande di cielo e di lastricato. Renderizzando due volte, la camera del
// sito compone da sola per il formato che le si da' — che e' esattamente il
// motivo per cui la scena e' in tre dimensioni.
const FORMATI = [
  { nome: 'orizzontale', l: 1600, a: 1000, largo: 1400 },
  { nome: 'verticale', l: 780, a: 1400, largo: 720 },
]

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})

for (const f of FORMATI) {
  const p = await b.newPage({ viewport: { width: f.l, height: f.a }, deviceScaleFactor: 1 })
  p.setDefaultTimeout(200000)
  await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza)
  await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 200000 })
  // il livello si fissa: in headless il gestore scende da solo vedendo
  // SwiftShader, e il poster uscirebbe senza riflessi (vedi COSTRUZIONE §16)
  await p.evaluate(() => window.fissaQualita('alto'))
  // NIENTE INTERFACCIA: il poster e' la SCENA. Il testo, nella pagina di
  // ripiego, e' testo vero nel documento — sovrapporlo anche all'immagine
  // significherebbe averlo due volte, una delle quali non selezionabile.
  await p.evaluate(() => {
    for (const s of ['#hud', '.testa', '.voci', '.spina', '.spina__disegno', '.rotaia', '.comandi', '.cornice', '.cornice__filo']) {
      document.querySelectorAll(s).forEach((e) => (e.style.display = 'none'))
    }
  })
  // si arriva scorrendo, come in `provini.mjs`: atterrare di colpo mostra uno
  // stato smorzato a meta' che nessuno vedra' mai
  const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (let i = 1; i <= 40; i++) {
    await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, 0.05 * (i / 40)])
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
  for (let i = 0; i < 60; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const png = await p.screenshot({ type: 'png' })
  await p.close()

  // AVIF PRIMA, WEBP DOPO, e la ragione e' nel peso: a parita' di resa AVIF
  // taglia circa un terzo. Il webp resta per chi non lo legge, che nel 2026
  // e' poca gente ma non nessuno.
  const base = `${U}/hero_${f.nome}`
  await sharp(png).resize(f.largo).avif({ quality: 58, effort: 6 }).toFile(base + '.avif')
  await sharp(png).resize(f.largo).webp({ quality: 74 }).toFile(base + '.webp')
  const a = (await sharp(base + '.avif').metadata()).size ?? 0
  const w = (await sharp(base + '.webp').metadata()).size ?? 0
  console.log(f.nome.padEnd(12), 'avif', Math.round(a / 1024) + ' kB', ' webp', Math.round(w / 1024) + ' kB')
}
await b.close()
