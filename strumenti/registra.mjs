/**
 * Registra il percorso. Si registra con Playwright — quello e' il mestiere
 * di filmare; il browser MCP serve a esplorare e a misurare.
 *
 * Lo scorrimento e' guidato fotogramma per fotogramma invece che con un
 * `scrollTo` unico: il sito e' una funzione del progresso, quindi filmarlo
 * vuol dire percorrere quel progresso a velocita' controllata.
 *
 * MA IL CICLO STA DENTRO LA PAGINA, e la differenza non e' di stile.
 *
 * Scritto come prima — un `page.evaluate` per fotogramma, piu' una pausa di
 * 1/30 — ogni giro costava un viaggio di andata e ritorno sul protocollo di
 * Chromium. Su questa scena ne costava centottanta millisecondi invece di
 * trentatre, e il filmato del telefono e' venuto lungo 142 secondi al posto di
 * 26: a ventidue secondi si era ancora nella prima schermata. Un video che
 * dura cinque volte tanto non e' lento da guardare, e' un altro video.
 *
 * Adesso si manda UNA volta un ciclo che vive nella pagina e si regola sul
 * tempo vero — `performance.now()`, non il conteggio dei fotogrammi. Cosi' la
 * durata e' quella dichiarata anche se la scena rallenta: rallentando si
 * perdono fotogrammi, non secondi. E' la stessa regola gia' pagata sul limite
 * di frequenza del quadro, al contrario: li' serviva contare i giri, qui serve
 * guardare l'orologio.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { mkdirSync } from 'node:fs'
const SECONDI = Number(process.argv[2] || 26)
const FPS = 30, L = 1280, A = 800
const U = 'C:/Users/Giuseppe/Webingegno/velocity/docs/video'
mkdirSync(U, { recursive: true })
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1','--autoplay-policy=no-user-gesture-required'] })
const ctx = await b.newContext({ viewport:{width:L,height:A}, deviceScaleFactor:1, recordVideo:{dir:U, size:{width:L,height:A}} })
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
await p.goto('http://localhost:5174/', { waitUntil:'load' })
// SI ASPETTA LO STATO, non un tempo: in headless l'avvio e' molto piu'
// lento, e partire a tempo fisso vuol dire filmare una scena a cui manca
// meta' dei pezzi
// `planciaPronta` non c'e' piu': la plancia modellata e' stata tolta e
// sostituita dall'abitacolo fotografico. La condizione restava vera per
// sempre... cioe' falsa per sempre, e lo strumento aspettava fino al timeout
// senza dire perche'. E' il tipo di attesa cieca che non deve esistere.
await p.waitForFunction(() => window.esperienza?.autoPronta
  && window.esperienza?.ambientePronto && window.esperienza?.lastra?.pronta, null, { timeout:200000 })
// si filma al livello vero, non a quello a cui il gestore scende vedendo
// SwiftShader (vedi `main.ts`, `fissaQualita`)
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h=document.getElementById('hud'); if(h) h.style.display='none' })
await p.waitForTimeout(2200)
// segnato PRIMA dei tocchi: i tocchi sono la parte migliore del filmato e non
// si tagliano. Si taglia solo l'attesa.
const avvio = (Date.now() - nascita) / 1000
// ---- PRIMA SI TOCCANO I COMANDI, e prima di ogni altra cosa.
//
// E' la sola parte del filmato che dimostra qualcosa che un filmato non
// potrebbe fare: la vernice cambia, la villa dietro gira, e la lamiera
// rispecchia l'una e l'altra. Messa in fondo sarebbe una postilla; messa
// all'inizio e' la premessa di tutto quello che viene dopo.
async function tocca(scelta, quanto) {
  await p.locator(scelta).click({ timeout: 5000 }).catch(() => {})
  await p.waitForTimeout(quanto)
}
await p.waitForTimeout(900)
for (const i of [2, 1, 3, 0]) await tocca(`.comandi__campione >> nth=${i}`, 1250)
for (const i of [2, 0]) await tocca(`.comandi__vista >> nth=${i}`, 1700)
await p.waitForTimeout(700)

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
await p.evaluate(async ([c, secondi]) => {
  const t0 = performance.now()
  await new Promise((fine) => {
    const passo = () => {
      const t = (performance.now() - t0) / (secondi * 1000)
      if (t >= 1) { window.scrollTo(0, c); return fine() }
      // due secondi di quiete all'inizio: la prima schermata deve poter essere
      // guardata prima che cominci a muoversi
      const q = t < 0.07 ? (t / 0.07) ** 1.3 * 0.07 : t
      window.scrollTo(0, c * q)
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
}, [corsa, SECONDI])
await p.waitForTimeout(1600)
await ctx.close(); await b.close()
console.log('registrato; da tagliare i primi', avvio.toFixed(1), 's')
