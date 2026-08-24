/**
 * IL FILMATO DEL TELEFONO — 390x844, tocco, e la finitura che cambia.
 *
 * Non e' una prova su un telefono fisico: e' un viewport da telefono dentro
 * Chromium, con la scheda video del portatile. Dice come si compone e come si
 * legge; non dice quanti fotogrammi al secondo fa un iPhone.
 *
 * Il giro comincia toccando una finitura, prima di scorrere: e' l'unica cosa
 * del sito che un filmato non potrebbe fare, e quindi e' la prima da mostrare.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { mkdirSync } from 'node:fs'
const SECONDI = Number(process.argv[2] || 26)
const FPS = 30, L = 390, A = 844
const U = 'C:/Users/Giuseppe/Webingegno/velocity/docs/video/telefono'
mkdirSync(U, { recursive: true })
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({
  viewport: { width: L, height: A }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true,
  recordVideo: { dir: U, size: { width: L * 2, height: A * 2 } },
})
const p = await ctx.newPage()
// LA REGISTRAZIONE COMINCIA QUI, non quando comincia il sito.
//
// Playwright filma dalla creazione della pagina, e questa scena ci mette fra i
// venti e i quaranta secondi a caricare 460k triangoli e le sue fotografie.
// Quei secondi finivano dentro il filmato: il video durava 82 secondi per
// trenta di sito, e sembrava che il sito fosse lento. Non lo era: era il
// filmato a cominciare troppo presto.
//
// Non si puo' dire a Playwright di cominciare dopo, ma si puo' segnare
// l'istante e tagliare in coda — `avvio` viene stampato e usato dal taglio.
const nascita = Date.now()
await p.goto('http://localhost:5174/', { waitUntil: 'load' })
await p.waitForFunction(() => window.esperienza?.autoPronta && window.esperienza?.ambientePronto
  && window.esperienza?.lastra?.pronta, null, { timeout: 200000 })
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
await p.waitForTimeout(2000)
// segnato PRIMA dei tocchi: i tocchi sono la parte migliore del filmato e non
// si tagliano. Si taglia solo l'attesa.
const avvio = (Date.now() - nascita) / 1000

// prima si TOCCA: la prova che risponde
for (const i of [2, 1, 0]) {
  await p.locator('.comandi__campione').nth(i).tap().catch(() => {})
  await p.waitForTimeout(1050)
}
// e poi il luogo: e' la seconda meta' della dimostrazione — cambia la
// fotografia dietro E la luce che arriva sulla lamiera, perche' sono la stessa
// immagine usata due volte
for (const i of [2, 0]) {
  await p.locator('.comandi__vista').nth(i).tap().catch(() => {})
  await p.waitForTimeout(1500)
}
await p.waitForTimeout(600)

// IL CICLO VIVE DENTRO LA PAGINA e si regola sul tempo, non sui fotogrammi:
// un `evaluate` per fotogramma costava centottanta millisecondi di protocollo
// a giro e questo filmato e' uscito lungo 142 secondi invece di 26. Vedi la
// nota in testa a `registra.mjs`.
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
await p.evaluate(async ([c, secondi]) => {
  const t0 = performance.now()
  await new Promise((fine) => {
    const passo = () => {
      const t = (performance.now() - t0) / (secondi * 1000)
      if (t >= 1) { window.scrollTo(0, c); return fine() }
      const q = t < 0.07 ? (t / 0.07) ** 1.3 * 0.07 : t
      window.scrollTo(0, c * q)
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
}, [corsa, SECONDI])
await p.waitForTimeout(1400)
await ctx.close(); await b.close()
console.log('registrato; da tagliare i primi', avvio.toFixed(1), 's')
