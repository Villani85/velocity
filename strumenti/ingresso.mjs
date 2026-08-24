/**
 * LA COREOGRAFIA D'INGRESSO, contata invece che guardata.
 *
 * Serve a rispondere a una domanda che a occhio non si risponde: alla schermata
 * zero, QUANTE cose sono in campo nello stesso istante? Due revisioni esterne
 * hanno messo la densita' della hero al primo posto, e una densita' si conta.
 *
 * Qui si fotografa la pagina a intervalli dal momento in cui il velo si chiude,
 * e per ogni istante si contano i blocchi visibili — quelli con opacita'
 * sopra un quarto e area sopra i mille pixel quadri. Se la coreografia
 * funziona, quel numero sale a gradini invece di partire al massimo.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
// si aspetta il momento in cui il velo si chiude, non un tempo a caso
await p.waitForFunction(() => document.documentElement.classList.contains('e-svelato'), null, { timeout: 120000 })
const t0 = Date.now()

/* SI ENUMERA, NON SI CONTROLLA UNA LISTA. Prima versione: sei selettori
   scritti a mano e una soglia d'area a mille pixel quadri. Risultato: la
   rotaia — che e' una riga verticale sottile — non la passava, e altri due
   blocchi non li trovava affatto. Contava se' stesso.
   Adesso si guardano tutti i figli diretti del corpo e i blocchi
   dell'interfaccia, e si tiene quello che un occhio vedrebbe: opacita' sopra
   un quarto e almeno cinquecento pixel quadri di area. */
const conta = () => p.evaluate(() => {
  const fuori = []
  const visto = new Set()
  for (const e of document.querySelectorAll('body > *, body > * > .voci, body > * > .comandi')) {
    if (e.id === 'attesa' || e.tagName === 'CANVAS' || e.tagName === 'SCRIPT' || e.tagName === 'MAIN') continue
    const r = e.getBoundingClientRect()
    const st = getComputedStyle(e)
    if (+st.opacity <= 0.25 || st.visibility === 'hidden' || st.display === 'none') continue
    if (r.width * r.height < 500) continue
    const n = (e.className && String(e.className).split(' ')[0]) || e.tagName.toLowerCase()
    if (visto.has(n)) continue
    visto.add(n)
    fuori.push(n)
  }
  return fuori
})

/* E SI GUARDANO I FOTOGRAMMI, che e' la verifica che non puo' misurare se'
   stessa. Due contatori di fila hanno dato numeri sbagliati — uno per una
   soglia d'area, uno per una selezione troppo stretta — e su una domanda
   visiva come «quante cose ci sono in campo» il metro definitivo e' l'occhio
   su una tavola di contatto. */
const tempi = [0, 300, 650, 1000, 1450, 2100]
const scatti = []
for (const ms of tempi) {
  while (Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 8))
  scatti.push(await sharp(await p.screenshot({ type: 'png' })).resize(600).toBuffer())
  console.log('  scatto a +' + ms + ' ms')
}
const m = await sharp(scatti[0]).metadata()
await sharp({ create: { width: 1800, height: m.height * 2 + 8, channels: 3, background: '#101014' } })
  .composite(scatti.map((b, i) => ({ input: b, left: (i % 3) * 600, top: Math.floor(i / 3) * (m.height + 8) })))
  .jpeg({ quality: 90 })
  .toFile('C:/Users/Giuseppe/Webingegno/velocity/docs/provini/ingresso.jpeg')
console.log('tavola in docs/provini/ingresso.jpeg — ordine: ' + tempi.join(', ') + ' ms')
await b.close()
