/**
 * LA GUARDIA — sta in ascolto e avvisa nell'ISTANTE in cui qualcosa si rompe.
 *
 * PERCHE' ESISTE, e quanto e' costata la sua assenza.
 *
 * Tre volte in questo progetto ho perso minuti — una volta quasi un'ora —
 * inseguendo la causa sbagliata di un guasto che si annunciava in modo
 * fuorviante:
 *
 *   1. Ho aggiunto le luci del corridoio e da quel momento gli screenshot
 *      andavano in timeout. Ho passato un giro intero a cercare il costo di
 *      quelle luci. Non c'entravano: scrivevo un file di log dentro la
 *      cartella osservata da Vite, e la pagina si ricaricava a ogni riga.
 *
 *   2. Uno shader con un errore di sintassi non da' nessun messaggio utile:
 *      da' `window.esperienza is undefined`, che sembra un problema di
 *      caricamento.
 *
 *   3. Una `Vector2` non importata ha fermato tutto il modulo. Anche li':
 *      `esperienza undefined`, e lo strumento che aspettava e' rimasto due
 *      minuti a guardare una pagina morta prima di dirmi «timeout».
 *
 * Il tratto comune: il SINTOMO era sempre «lo strumento di misura non
 * risponde», e la CAUSA sempre un errore che il browser aveva gia' scritto in
 * console nel primo secondo. L'informazione c'era: non la stava leggendo
 * nessuno.
 *
 * COME AVVISA.
 *
 * Resta in esecuzione e controlla. Finche' va tutto bene non stampa quasi
 * nulla e non esce. Appena trova un guasto, stampa la diagnosi e TERMINA con
 * codice 1 — e siccome gira come processo in secondo piano, la sua
 * terminazione produce una notifica immediata. Cioe': non devo chiedere se e'
 * tutto a posto, me lo dice lei quando non lo e'.
 *
 * COSA CONTROLLA, in ordine di gravita':
 *
 *   ERRORE DI PAGINA      un'eccezione non catturata: il sito e' morto
 *   MODULO NON PARTITO    `window.esperienza` non compare entro il tempo:
 *                         quasi sempre un errore di sintassi o un import
 *   RICHIESTA FALLITA     un asset che non c'e' (404) o non si carica
 *   ERRORE IN CONSOLE     compreso l'avviso di shader non compilato, che
 *                         three scrive come errore ed e' facile perdere
 *   CICLO FERMO           il contatore dei fotogrammi non avanza: la scena e'
 *                         bloccata anche se la pagina e' viva
 *   SERVER GIU'           il server di sviluppo non risponde piu'
 *
 * SI IGNORANO gli avvisi noti e innocui: la deprecazione di RGBELoader, il
 * messaggio del driver sulle letture di pixel, la nota su PCFSoftShadowMap.
 * Una guardia che grida al lupo viene spenta, e una guardia spenta non
 * serve a niente.
 *
 *   node strumenti/guardia.mjs            controlla e resta in ascolto
 *   node strumenti/guardia.mjs --unavolta  controlla una volta ed esce
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const BASE = process.env.BASE_URL || 'http://localhost:5174/'
const UNA_VOLTA = process.argv.includes('--unavolta')
const OGNI = 15000

/** rumore noto: non sono guasti e non devono svegliare nessuno */
const INNOCUI = [
  /has been deprecated/i,
  /GL Driver Message/i,
  /GPU stall due to ReadPixels/i,
  /PCFSoftShadowMap/i,
  /\[vite\] (connecting|connected|hot updated)/i,
  /Download the React DevTools/i,
]
const innocuo = (t) => INNOCUI.some((r) => r.test(t))

const guasti = []
function guasto(tipo, testo) {
  if (innocuo(testo)) return
  guasti.push({ tipo, testo: String(testo).slice(0, 700), quando: new Date().toISOString() })
}

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const pagina = await browser.newPage({ viewport: { width: 900, height: 560 } })
pagina.setDefaultTimeout(120000)
// SI STACCA L'AGGIORNAMENTO A CALDO PER TUTTA LA DURATA DELLA MISURA.
//
// Vite ricarica la pagina a ogni salvataggio in `src/`. Se qualcuno sta
// scrivendo codice mentre lo strumento misura — altri agenti al lavoro sullo
// stesso repo, per dire — la pagina riparte a meta' corsa e la misura muore
// con «Execution context was destroyed». Quattro corse perse cosi'.
//
// Servire vuoto il client di Vite toglie il canale: la pagina resta quella
// caricata all'inizio, che e' anche l'unica cosa sensata da misurare — una
// misura ha senso su UNO stato, non su uno che cambia sotto.
await pagina.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))

pagina.on('pageerror', (e) => guasto('ERRORE DI PAGINA', e))
pagina.on('console', (m) => { if (m.type() === 'error') guasto('ERRORE IN CONSOLE', m.text()) })
pagina.on('requestfailed', (r) => {
  guasto('RICHIESTA FALLITA', `${r.url()} — ${r.failure()?.errorText}`)
})
pagina.on('response', (r) => {
  if (r.status() >= 400) guasto('RISPOSTA ' + r.status(), r.url())
})

function esci(motivo) {
  console.log('\n########  GUASTO  ########')
  console.log(motivo)
  for (const g of guasti.slice(-8)) {
    console.log(`\n[${g.tipo}]  ${g.quando}`)
    console.log('  ' + g.testo.replace(/\n/g, '\n  '))
  }
  console.log('\n##########################')
  // ESCE SUBITO. La prima stesura chiamava `browser.close().then(...)` e
  // proseguiva: una promessa non ferma il flusso, quindi il controllo dopo
  // girava su una pagina gia' chiusa e stampava un secondo guasto — falso —
  // che contraddiceva il primo. Il registro diceva «il modulo non e'
  // partito» e due righe sotto «la scena e' partita».
  //
  // Una guardia che si contraddice e' peggio di nessuna guardia: la prima
  // cosa che si fa e' smettere di crederle. Si stampa e si esce; il browser
  // lo chiude il sistema operativo insieme al processo.
  process.exit(1)
}

try {
  await pagina.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })
} catch (e) {
  esci('Il server di sviluppo non risponde su ' + BASE + '\n' + e.message)
}

// IL MODULO DEVE PARTIRE. E' il controllo che avrebbe risparmiato piu' tempo:
// se `window.esperienza` non compare, l'errore vero e' gia' nella lista dei
// guasti raccolti sopra — un import mancante, uno shader che non compila, una
// sintassi sbagliata — e viene stampato insieme al motivo.
try {
  // NOVANTA SECONDI E NON VENTICINQUE. La scena carica tre megabyte di
  // geometria, sei tessiture e un cielo HDR, e genera la mappa d'ambiente
  // dalla scena stessa. Su una macchina che sta facendo anche altro —
  // quattro agenti al lavoro in parallelo, per dire — venticinque secondi
  // non bastano. E una guardia che da' falsi allarmi viene ignorata, che e'
  // il modo piu' rapido di rendere inutile un sistema di controllo.
  await pagina.waitForFunction(() => !!window.esperienza, null, { timeout: 90000 })
} catch {
  esci('Il modulo non e\' partito: `window.esperienza` non esiste dopo 90 secondi.\n' +
       'Quasi sempre significa un errore di sintassi, un import mancante o uno\n' +
       'shader che non compila. La causa vera dovrebbe essere qui sotto.')
}
if (guasti.length) esci('Errori raccolti durante il caricamento della pagina.')

console.log(`guardia attiva su ${BASE} — la scena e' partita, nessun errore al caricamento`)

// IL CICLO DEVE AVANZARE. Una pagina viva con la scena bloccata non da'
// nessun errore: e' il guasto piu' silenzioso di tutti.
await pagina.evaluate(() => {
  window.__battiti = 0
  const conta = () => { window.__battiti++; requestAnimationFrame(conta) }
  requestAnimationFrame(conta)
})

if (UNA_VOLTA) {
  await browser.close()
  console.log('controllo singolo: tutto a posto')
  process.exit(0)
}

let precedenti = 0
let giro = 0
for (;;) {
  await new Promise((r) => setTimeout(r, OGNI))
  giro++
  if (guasti.length) esci(`Comparso un errore dopo ${(giro * OGNI) / 1000} secondi di esecuzione.`)

  let battiti
  try {
    battiti = await pagina.evaluate(() => window.__battiti)
  } catch (e) {
    esci('La pagina non risponde piu\' (probabilmente chiusa o in crash).\n' + e.message)
  }
  if (battiti === precedenti) {
    esci(`Il ciclo di disegno e' FERMO: il contatore dei fotogrammi non e'\n` +
         `avanzato in ${OGNI / 1000} secondi. La pagina e' viva ma la scena no.`)
  }
  const fps = ((battiti - precedenti) / (OGNI / 1000)).toFixed(0)
  precedenti = battiti
  // una riga ogni due minuti: abbastanza da sapere che e' viva, non tanta da
  // riempire il registro
  if (giro % 8 === 0) console.log(`  ...viva, ${fps} fotogrammi al secondo`)
}
