/**
 * IL SITO SU UN TELEFONO — tutti i tempi, alla misura vera.
 *
 * Non e' una prova su un telefono FISICO e non va spacciata per tale: e' un
 * viewport da 390x844 dentro Chromium, con la scheda video del portatile. Dice
 * se la composizione regge e se qualcosa si accavalla; NON dice quanti
 * fotogrammi al secondo fa un telefono vero, che ha una scheda diversa e un
 * budget termico che qui non esiste.
 *
 * Serve lo stesso, e serve presto: il telefono trattato alla fine e' il posto
 * dove si comincia a spegnere roba il giorno prima di pubblicare.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
const U = 'C:/Users/Giuseppe/Webingegno/velocity/.tmp/telefono'
mkdirSync(U, { recursive: true })

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})
const p = await ctx.newPage()
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => window.esperienza.autoPronta).catch(() => {})
await p.evaluate(() => window.fissaQualita('alto'))

// sette tappe da quando esiste il beat `contatto`: senza la settima, il giro
// si fermava a 0,95 — che adesso e' gia' dentro il finale — e l'ultimo
// fotogramma della guida non lo guardava piu' nessuno
const TAPPE = [['1_hero', 0.05], ['2_orbita', 0.24], ['3_lato', 0.46], ['4_taglio', 0.60], ['5_accensione', 0.685], ['6_velocita', 0.77], ['7_contatto', 0.93]]
const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
let da = 0
const file = []
for (const [nome, q] of TAPPE) {
  for (let i = 1; i <= 30; i++) {
    await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, da + (q - da) * (i / 30)])
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
  da = q
  for (let i = 0; i < 30; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const f = `${U}/${nome}.png`
  await p.screenshot({ path: f })
  file.push(f)
  const s = await p.evaluate(() => {
    // si cerca cio' che sborda: e' il difetto piu' comune su una colonna stretta
    const fuori = []
    for (const el of document.querySelectorAll('.voci, .spina, .rotaia, .testa, .comandi, .voci__titolo')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0) continue
      if (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1) {
        fuori.push(el.className + ' [' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ']')
      }
    }
    return { beat: esperienza.regia.beat, fuori }
  })
  console.log(nome.padEnd(13), s.beat.padEnd(11), s.fuori.length ? 'SBORDA: ' + s.fuori.join(' · ') : 'dentro')
}
await b.close()

const L = 300, pz = []
let A = 0
for (let i = 0; i < file.length; i++) {
  const bb = await sharp(file[i]).resize(L).toBuffer()
  const m = await sharp(bb).metadata()
  A = m.height
  pz.push({ input: bb, top: 0, left: i * (L + 5) })
}
await sharp({ create: { width: file.length * (L + 5), height: A, channels: 3, background: { r: 25, g: 25, b: 25 } } })
  .composite(pz).jpeg({ quality: 88 }).toFile(`${U}/tavola.jpg`)
console.log('tavola in', `${U}/tavola.jpg`)
