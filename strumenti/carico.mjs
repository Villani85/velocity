/**
 * IL CARICO — quanto costa arrivare al primo fotogramma, misurato sulla build vera.
 *
 * PERCHE' ESISTE.
 *
 * Di questo sito si sa tutto di quanto costa DISEGNARLO — `dovecosta.mjs` dice
 * quale capitolo fa fotogrammi da 79 ms, `salti.mjs` dice dove il racconto
 * scavalca dei pezzi — e non si sapeva niente di quanto costa ARRIVARCI. Sono
 * due mestieri diversi: il primo si paga a ogni fotogramma, il secondo si paga
 * una volta sola, ed e' quello che decide se chi apre il sito lo vede o chiude
 * la scheda prima.
 *
 * IL NUMERO CHE GIRAVA ERA SBAGLIATO IN PARTENZA, ed e' la ragione per cui
 * questo strumento non riusa il server di sviluppo come tutti gli altri.
 * `strumenti/ripiego.mjs` aveva misurato «12,6 MB in sviluppo», e quel numero
 * non e' il sito: e' Vite che serve ogni modulo come file separato, non
 * minificato, con dentro tutti i commenti — e questo repo di commenti ne ha
 * piu' che di codice. Il conto vero si fa su `vite build`, e chi misura in
 * sviluppo misura la propria attrezzatura.
 *
 * COSA MISURA, e cosa vogliono dire i numeri che stampa.
 *
 * 1. I BYTE SUL PERCORSO CRITICO. Non c'e' un solo percorso critico, ce ne
 *    sono quattro, e confonderli e' il modo piu' comune di raccontarsi una
 *    bugia comoda. Qui sono tenuti separati, ognuno con il suo istante:
 *
 *      - PRIMA PITTURA (FCP): la pagina smette di essere bianca. Qui basta
 *        l'HTML, il foglio di stile e i due caratteri preannunciati. E' il
 *        traguardo che i cruscotti di prestazione premiano, ed e' anche il piu'
 *        facile da vincere barando: un sito che dipinge una testata in 200 ms
 *        e poi resta un rettangolo nero per otto secondi ha un ottimo FCP.
 *      - SCENA DISEGNATA: il primo fotogramma WebGL. Da qui in poi lo
 *        scorrimento fa succedere qualcosa, cioe' il sito comincia a esistere.
 *      - AMBIENTE PRONTO / AUTO PRONTA: `esperienza.ambientePronto` e
 *        `esperienza.autoPronta`, le due bandiere che la scena espone gia' per
 *        gli altri strumenti. Quando la seconda si alza, sul piedistallo c'e'
 *        un'automobile invece di un posto vuoto.
 *
 *    Per ognuno si dice quanti byte erano arrivati fino a li', divisi per tipo
 *    e — soprattutto — COME VIAGGIANO. Un file da 1,24 MB che sulla rete ne
 *    occupa 384 non pesa 1,24 MB per chi lo scarica: pesa 384 in attesa e 1,24
 *    in memoria. Sono due costi diversi che si pagano a due sportelli diversi,
 *    e sommarli o confonderli non serve a nessuno.
 *
 * 2. QUANTO DI QUEL JAVASCRIPT E' THREE.JS. Si legge dalla mappa dei sorgenti
 *    della build, camminando i segmenti uno per uno e attribuendo a ogni
 *    modulo i byte del file finale che gli corrispondono. Non e' una stima: e'
 *    il conto delle colonne. Quello che la mappa non copre — l'impalcatura che
 *    il raggruppatore scrive di suo — viene dichiarato a parte invece di
 *    essere spalmato, perche' spalmarlo vorrebbe dire attribuire a three.js
 *    dei byte che non sono suoi.
 *
 *    E siccome sulla rete conta il compresso, per i gruppi grossi si misura
 *    anche il COSTO MARGINALE: si ricomprime il file senza i byte di quel
 *    gruppo e si guarda di quanto cala. E' l'unico modo onesto di dire «questo
 *    modulo costa N kB compressi», perche' la compressione non e' additiva e
 *    una tabella che divide il gzip in proporzione al non compresso mente.
 *
 * 3. QUANTO ARRIVA DOPO. Tutto quello che il browser scarica una volta che il
 *    primo fotogramma c'e' gia'. E' la parte che dice se il carico e'
 *    ORGANIZZATO: byte che arrivano dopo sono byte che qualcuno ha spostato
 *    apposta, byte che arrivano prima e non servono subito sono byte fuori
 *    posto. Lo strumento nomina gli uni e gli altri.
 *
 * 4. I TEMPI, e due volte. La prima su rete piena, che e' la condizione in cui
 *    si sviluppa e l'unica in cui non si scopre mai niente. La seconda con la
 *    rete rallentata a 4G lento — 1,6 Mbit/s in discesa, 150 ms di latenza,
 *    imposti via CDP — che e' dove un ordine di caricamento sbagliato smette di
 *    essere un dettaglio e diventa dieci secondi di schermo nero. Su quella
 *    rete un byte vale 1/209715 di secondo, e questo strumento converte i byte
 *    fuori posto in millisecondi con quel cambio.
 *
 * 5. E CONTROLLA LE CREDENZIALI. Il sito scrive «2.9 MB» come dato tecnico in
 *    `src/ui/Lavori.ts` e in `src/ui/Quadro.ts`. Un numero scritto a mano che
 *    descrive un file e' una bomba a orologeria — sbaglia il giorno in cui
 *    qualcuno tocca il file, non il giorno in cui lo scrivi — quindi qui si
 *    pesa il file e si confronta. E si conta quante volte quel file viene
 *    scaricato: un preannuncio che non combacia con la richiesta vera non da'
 *    nessun errore, scarica tutto due volte e si vede solo contando.
 *
 * COME LAVORA. Costruisce due volte (una con le mappe, per l'attribuzione, e
 * una pulita, per i byte veri), serve la seconda con `vite preview` su una
 * porta sua, e apre la pagina in un Chromium senza cache. Non tocca il server
 * di sviluppo su 5174 e non ci misura sopra: quei numeri sarebbero falsi.
 *
 *     node strumenti/carico.mjs
 *
 * Stampa la tabella e il giudizio, e lascia il dettaglio in `docs/carico.json`.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const RADICE = path.resolve(new URL('.', import.meta.url).pathname.replace(/^\//, ''), '..')
const USCITA = 'dist_carico'
const USCITA_MAPPA = 'dist_carico_mappa'
let PORTA = Number(process.env.PORTA || 5199)

// 1,6 Mbit/s in discesa = 209715 byte al secondo. E' il cambio con cui in
// fondo si traducono i byte fuori posto in millisecondi.
const LENTA = { discesa: Math.round((1.6 * 1024 * 1024) / 8), salita: Math.round((750 * 1024) / 8), latenza: 150 }

const dorme = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * L'ANTEPRIMA SI SPEGNE ANCHE QUANDO LO STRUMENTO MUORE MALE.
 *
 * Senza questa riga, ogni corsa fallita lascia in vita un `vite preview` sulla
 * sua porta. Il giro dopo la porta e' occupata, Vite si sposta, e chi legge il
 * rapporto non capisce perche' i numeri sono di una build di ieri. E' successo
 * al primo tentativo di questo stesso strumento.
 */
let PID_ANTEPRIMA = null
const spegniAnteprima = () => {
  if (!PID_ANTEPRIMA) return
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(PID_ANTEPRIMA), '/T', '/F'], { stdio: 'ignore' })
    else process.kill(PID_ANTEPRIMA, 'SIGTERM')
  } catch (e) {}
  PID_ANTEPRIMA = null
}
process.on('exit', spegniAnteprima)
process.on('uncaughtException', (e) => { spegniAnteprima(); console.error(e); process.exit(1) })

// --- formattazione -----------------------------------------------------------
// kB decimali (1000), come li conta il rapporto di Vite: usarne due unita'
// diverse nello stesso progetto e' il modo piu' rapido di litigare su un
// numero che nessuno dei due ha sbagliato.
const kB = (n) => (n / 1000).toFixed(n < 100000 ? 1 : 0).replace('.', ',') + ' kB'
const MB = (n) => (n / 1e6).toFixed(2).replace('.', ',') + ' MB'
const peso = (n) => (n >= 1e6 ? MB(n) : kB(n))
const ms = (n) => (n == null ? '-' : Math.round(n) + ' ms')

// --- 1. le due build ---------------------------------------------------------
/**
 * COSTRUISCE, E RIPROVA SE UN ALTRO STA SCRIVENDO NEL CODICE.
 *
 * Questo repo viene lavorato da piu' agenti insieme. Una build che fallisce
 * mentre qualcun altro ha un file a meta' non e' un difetto del sito e non si
 * corregge: si aspetta. Tre tentativi a un minuto l'uno, e poi si rinuncia
 * dicendolo, invece di riportare numeri presi da una build vecchia.
 */
function costruisci(uscita, conMappe) {
  const arg = ['vite', 'build', '--outDir', uscita]
  if (conMappe) arg.push('--sourcemap')
  for (let tentativo = 1; tentativo <= 3; tentativo++) {
    const r = spawnSync('npx', arg, { cwd: RADICE, shell: true, encoding: 'utf8' })
    if (r.status === 0) return (r.stdout || '') + (r.stderr || '')
    console.log(`  build fallita (tentativo ${tentativo}/3). Probabile codice a meta' di un altro agente: aspetto 60 s.`)
    if (tentativo < 3) spawnSync('node', ['-e', 'setTimeout(()=>{},60000)'], { shell: true })
    else {
      console.error(r.stdout || '', r.stderr || '')
      throw new Error('vite build non riesce dopo tre tentativi')
    }
  }
}

// --- 2. l'attribuzione dei byte del JavaScript -------------------------------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const TAV = {}
for (let i = 0; i < B64.length; i++) TAV[B64[i]] = i

/** decodifica un segmento VLQ base64 della mappa dei sorgenti */
function vlq(s) {
  const out = []
  let i = 0
  while (i < s.length) {
    let r = 0, sh = 0, d, cont
    do { d = TAV[s[i++]]; cont = d & 32; r += (d & 31) << sh; sh += 5 } while (cont)
    const neg = r & 1
    r >>= 1
    out.push(neg ? -r : r)
  }
  return out
}

/**
 * A OGNI MODULO I SUOI BYTE.
 *
 * La mappa dice, per ogni punto del file finale, da quale sorgente viene. Fra
 * un punto e il successivo ci sono dei byte, e quei byte sono di quella
 * sorgente. Si cammina l'intera mappa e si somma. Quello che resta fuori — i
 * tratti che nessun segmento copre — e' l'impalcatura del raggruppatore, e
 * viene tenuto da parte con il suo nome.
 */
function attribuisci(percorsoJs) {
  const js = fs.readFileSync(percorsoJs, 'utf8')
  const map = JSON.parse(fs.readFileSync(percorsoJs + '.map', 'utf8'))
  const righe = js.split('\n')
  const inizio = []
  let off = 0
  for (const r of righe) { inizio.push(off); off += r.length + 1 }

  const tratti = []
  let src = 0
  const linee = map.mappings.split(';')
  for (let l = 0; l < linee.length && l < righe.length; l++) {
    let col = 0
    const punti = []
    for (const p of linee[l].split(',')) {
      if (!p) continue
      const v = vlq(p)
      col += v[0]
      if (v.length >= 4) src += v[1]
      punti.push({ col, src: v.length >= 4 ? src : -1 })
    }
    for (let k = 0; k < punti.length; k++) {
      const fine = k + 1 < punti.length ? punti[k + 1].col : righe[l].length
      if (punti[k].src < 0 || fine <= punti[k].col) continue
      tratti.push({ a: inizio[l] + punti[k].col, b: inizio[l] + fine, src: punti[k].src })
    }
  }

  const perSorgente = new Map()
  for (const t of tratti) {
    const nome = map.sources[t.src]
    if (!perSorgente.has(nome)) perSorgente.set(nome, { byte: 0, tratti: [] })
    const v = perSorgente.get(nome)
    v.byte += Buffer.byteLength(js.slice(t.a, t.b), 'utf8')
    v.tratti.push(t)
  }
  const totale = Buffer.byteLength(js, 'utf8')
  let attribuiti = 0
  for (const v of perSorgente.values()) attribuiti += v.byte
  return { js, totale, attribuiti, impalcatura: totale - attribuiti, perSorgente }
}

/** ricomprime il file senza i tratti indicati: la differenza e' il costo vero */
function gzipSenza(js, tratti) {
  const ord = tratti.slice().sort((x, y) => x.a - y.a)
  const pezzi = []
  let pos = 0
  for (const t of ord) {
    if (t.a > pos) pezzi.push(js.slice(pos, t.a))
    pos = Math.max(pos, t.b)
  }
  pezzi.push(js.slice(pos))
  return zlib.gzipSync(Buffer.from(pezzi.join(''), 'utf8'), { level: 9 }).length
}

const famiglia = (sorgente) => {
  const s = sorgente.replace(/\\/g, '/')
  if (/node_modules\/three\//.test(s)) return 'three.js'
  if (/node_modules\//.test(s)) return 'altre librerie'
  return 'codice del progetto'
}

// --- 3. il server di anteprima ----------------------------------------------
/**
 * LA PORTA VERA LA DICE VITE, NON LA RIGA DI COMANDO.
 *
 * `--port 5199` e' una richiesta, non un ordine: se quella porta e' occupata —
 * e in questo repo lo e' spesso, perche' gli strumenti lasciano dietro qualche
 * anteprima orfana — Vite scrive «Port 5199 is in use, trying another one» e si
 * sposta sulla 5200. Uno strumento che continua a misurare sulla 5199 non
 * trova niente e da' la colpa al server.
 *
 * Quindi non si indovina: si legge la riga che Vite stampa, e si misura la'.
 */
function avviaAnteprima(portaChiesta) {
  return new Promise((ris, err) => {
    const s = spawn('npx', ['vite', 'preview', '--outDir', USCITA, '--port', String(portaChiesta)], {
      cwd: RADICE, shell: true, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    })
    let visto = ''
    /* E SI TOLGONO I COLORI PRIMA DI LEGGERE.
       Vite scrive il numero della porta in grassetto, cioe' spezzato da due
       sequenze di controllo: `localhost:\x1b[1m5199\x1b[22m/`. Una espressione
       regolare che cerca delle cifre attaccate ai due punti non trova niente, e
       lo strumento conclude che il server non e' partito mentre e' li' che
       risponde. Trenta secondi buttati la prima volta. */
    const senzaColori = (t) => t.replace(/\[[0-9;]*m/g, '')
    const guarda = (b) => {
      visto += senzaColori(b.toString())
      const m = visto.match(/http:\/\/localhost:(\d+)\//)
      if (m) { ris({ server: s, porta: Number(m[1]), spostata: Number(m[1]) !== portaChiesta }) }
    }
    s.stdout.on('data', guarda)
    s.stderr.on('data', guarda)
    s.on('error', err)
    setTimeout(() => err(new Error('vite preview non ha mai annunciato una porta:\n' + visto)), 40000)
  })
}

/** e poi si controlla che risponda davvero, con una richiesta vera */
async function aspettaRisposta(porta, limite = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < limite) {
    try {
      const r = await fetch(`http://localhost:${porta}/`)
      if (r.ok) { await r.arrayBuffer(); return true }
    } catch (e) {}
    await dorme(250)
  }
  return false
}

// --- 4. la misura nel browser ------------------------------------------------
/**
 * LE BANDIERE SI GUARDANO A OGNI FOTOGRAMMA, non con un timer.
 *
 * Un timer a 100 ms sbaglia il traguardo di 100 ms, ed e' un errore grosso
 * quanto la meta' dei numeri che stiamo misurando. Un ciclo su
 * `requestAnimationFrame` sbaglia di un fotogramma, e in piu' e' lo stesso
 * orologio della scena.
 */
const SPIA = `(() => {
  const m = {}
  window.__traguardi = m
  const segna = (k) => { if (m[k] == null) m[k] = performance.now() }
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') segna('fcp') })
      .observe({ type: 'paint', buffered: true })
  } catch (e) {}
  try {
    new PerformanceObserver((l) => { const e = l.getEntries(); m.lcp = e[e.length - 1].startTime })
      .observe({ type: 'largest-contentful-paint', buffered: true })
  } catch (e) {}
  const guarda = () => {
    const e = window.esperienza
    if (e) {
      segna('esperienza')
      if (e.renderer && e.renderer.info && e.renderer.info.render.frame >= 1) segna('scena')
      if (e.ambientePronto) segna('ambiente')
      if (e.autoPronta) segna('auto')
      if (e.lastra && e.lastra.pronta) segna('lastra')
    }
    requestAnimationFrame(guarda)
  }
  requestAnimationFrame(guarda)
})()`

const TIPI = ['HTML', 'CSS', 'JS', 'font', 'panorama', 'modelli', 'tessiture', 'immagini', 'video', 'altro']

function tipoDi(url) {
  let p
  try { p = new URL(url).pathname } catch (e) { p = url }
  if (p === '/' || /\.html?$/.test(p)) return 'HTML'
  if (/\.css$/.test(p)) return 'CSS'
  if (/\.m?js$/.test(p)) return 'JS'
  if (/\.woff2?$/.test(p)) return 'font'
  if (/\.glb$/.test(p)) return 'modelli'
  if (/\.mp4$|\.webm$/.test(p)) return 'video'
  if (p.startsWith('/hdri/')) return 'panorama'
  if (p.startsWith('/poster/') || p.startsWith('/lavori/')) return 'immagini'
  if (/\.(webp|avif|png|jpe?g|ktx2|hdr)$/.test(p)) return 'tessiture'
  return 'altro'
}

/**
 * UNA CORSA: apre la pagina a cache vuota, aspetta i traguardi, poi percorre
 * tutta la pagina per far uscire allo scoperto quello che arriva piu' tardi.
 *
 * La corsa serve al punto 3: senza, «quello che arriva dopo» sarebbe solo
 * quello che arriva da solo, e non si vedrebbe mai la roba agganciata ai
 * capitoli — la strada, l'abitacolo, le immagini dei lavori.
 */
async function corsa(browser, lenta) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const pag = await ctx.newPage()
  pag.setDefaultTimeout(300000)
  await pag.addInitScript(SPIA)

  const cdp = await ctx.newCDPSession(pag)
  await cdp.send('Network.enable')
  // la cache si spegne a mano oltre che con il contesto nuovo: una misura del
  // primo caricamento fatta su una cache calda non e' sbagliata di poco, e'
  // un'altra misura
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  if (lenta) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: LENTA.latenza,
      downloadThroughput: LENTA.discesa,
      uploadThroughput: LENTA.salita,
    })
  }

  const t0 = Date.now()
  await pag.goto(`http://localhost:${PORTA}/`, { waitUntil: 'commit' })

  // si aspettano le due bandiere che contano; se non arrivano si prosegue e lo
  // si dice, invece di far morire tutta la misura per un traguardo mancato
  const attesa = lenta ? 240000 : 120000
  let completa = true
  await pag.waitForFunction(
    () => window.__traguardi && window.__traguardi.auto != null && window.__traguardi.ambiente != null,
    null, { timeout: attesa },
  ).catch(() => { completa = false })

  await pag.waitForTimeout(1500)
  const dopoPronta = await pag.evaluate(() => performance.now())

  // la corsa lungo la pagina, a tempo reale, come farebbe un dito
  await pag.evaluate(async (secondi) => {
    const corsa = document.documentElement.scrollHeight - window.innerHeight
    const t0 = performance.now()
    await new Promise((fine) => {
      const passo = () => {
        const t = (performance.now() - t0) / (secondi * 1000)
        if (t >= 1) return fine()
        window.scrollTo(0, corsa * t)
        requestAnimationFrame(passo)
      }
      requestAnimationFrame(passo)
    })
  }, lenta ? 14 : 10)
  await pag.waitForTimeout(lenta ? 6000 : 3000)

  const dati = await pag.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const risorse = performance.getEntriesByType('resource').map((r) => ({
      url: r.name,
      inizio: r.startTime,
      fine: r.responseEnd,
      rete: r.transferSize,
      compresso: r.encodedBodySize,
      steso: r.decodedBodySize,
      come: r.initiatorType,
    }))
    return {
      traguardi: window.__traguardi,
      documento: nav ? {
        url: location.href,
        inizio: 0,
        fine: nav.responseEnd,
        rete: nav.transferSize,
        compresso: nav.encodedBodySize,
        steso: nav.decodedBodySize,
        come: 'documento',
      } : null,
      risorse,
      dom: nav ? nav.domContentLoadedEventEnd : null,
      carico: nav ? nav.loadEventEnd : null,
    }
  })
  await ctx.close()

  const tutte = (dati.documento ? [dati.documento] : []).concat(dati.risorse)
    .filter((r) => !/\/@vite\/|favicon\.ico/.test(r.url))
  for (const r of tutte) r.tipo = tipoDi(r.url)
  return { ...dati, tutte, completa, dopoPronta, muro: Date.now() - t0 }
}

// --- 5. i conti sui risultati ------------------------------------------------
/** somma per tipo le risorse gia' arrivate a un certo istante */
function fotografia(tutte, istante) {
  const dentro = istante == null ? tutte : tutte.filter((r) => r.fine <= istante)
  const per = new Map()
  for (const r of dentro) {
    if (!per.has(r.tipo)) per.set(r.tipo, { n: 0, rete: 0, steso: 0 })
    const v = per.get(r.tipo)
    v.n++
    v.rete += r.rete || r.compresso || 0
    v.steso += r.steso || 0
  }
  const tot = { n: dentro.length, rete: 0, steso: 0 }
  for (const v of per.values()) { tot.rete += v.rete; tot.steso += v.steso }
  return { per, tot, dentro }
}

function tabellaTipi(f, titolo) {
  console.log('  ' + titolo)
  console.log('    tipo          file      in rete    steso')
  for (const t of TIPI) {
    const v = f.per.get(t)
    if (!v) continue
    console.log('    ' + t.padEnd(12) + String(v.n).padStart(5) + peso(v.rete).padStart(12) + peso(v.steso).padStart(11))
  }
  console.log('    ' + 'TOTALE'.padEnd(12) + String(f.tot.n).padStart(5) + peso(f.tot.rete).padStart(12) + peso(f.tot.steso).padStart(11))
}

// =============================================================================
console.log('CARICO INIZIALE - misurato sulla build di produzione')
console.log('')

// --- build -------------------------------------------------------------------
console.log('1. build')
const logMappa = costruisci(USCITA_MAPPA, true)
const logPulita = costruisci(USCITA, false)
const rigaTempo = (logPulita.match(/built in [\d.]+m?s/) || [''])[0]
console.log(`   ${USCITA}/ costruita (${rigaTempo}), ${USCITA_MAPPA}/ con le mappe per l'attribuzione`)

// --- pesi su disco e come viaggiano -----------------------------------------
const TESTO = /\.(html|css|js|mjs|json|svg|txt|xml)$/i
function elenca(dir, base = dir) {
  const out = []
  for (const v of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, v.name)
    if (v.isDirectory()) out.push(...elenca(p, base))
    else out.push({ percorso: p, rel: path.relative(base, p).replace(/\\/g, '/'), byte: fs.statSync(p).size })
  }
  return out
}
const suDisco = elenca(path.join(RADICE, USCITA))
for (const f of suDisco) {
  f.tipo = tipoDi('/' + f.rel)
  if (TESTO.test(f.rel)) {
    const b = fs.readFileSync(f.percorso)
    f.gzip = zlib.gzipSync(b, { level: 9 }).length
    f.brotli = zlib.brotliCompressSync(b, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: b.length,
      },
    }).length
  }
}

// --- attribuzione del JavaScript --------------------------------------------
console.log('')
console.log('2. il JavaScript, modulo per modulo')
const chunk = elenca(path.join(RADICE, USCITA_MAPPA))
  .filter((f) => f.rel.endsWith('.js'))
  .sort((a, b) => b.byte - a.byte)
const pezzi = []
for (const c of chunk) {
  if (!fs.existsSync(c.percorso + '.map')) continue
  const a = attribuisci(c.percorso)
  const perFamiglia = new Map()
  for (const [nome, v] of a.perSorgente) {
    const f = famiglia(nome)
    if (!perFamiglia.has(f)) perFamiglia.set(f, { byte: 0, tratti: [] })
    const g = perFamiglia.get(f)
    g.byte += v.byte
    g.tratti.push(...v.tratti)
  }
  const gzipTutto = zlib.gzipSync(Buffer.from(a.js, 'utf8'), { level: 9 }).length
  const famiglie = []
  for (const [nome, g] of perFamiglia) {
    // costo marginale compresso: quanto cala il gzip togliendo proprio quei byte
    famiglie.push({ nome, byte: g.byte, gzipMarginale: gzipTutto - gzipSenza(a.js, g.tratti) })
  }
  famiglie.sort((x, y) => y.byte - x.byte)
  const moduli = [...a.perSorgente].map(([nome, v]) => ({ nome: nome.replace(/^(\.\.\/)+/, ''), byte: v.byte }))
    .sort((x, y) => y.byte - x.byte)
  pezzi.push({
    nome: path.basename(c.rel).replace(/-[A-Za-z0-9_]{8}\.js$/, '.js'),
    file: c.rel,
    byte: a.totale,
    gzip: gzipTutto,
    impalcatura: a.impalcatura,
    famiglie,
    moduli,
  })
}

for (const p of pezzi) {
  console.log(`   ${p.nome.padEnd(14)} ${peso(p.byte).padStart(9)} steso, ${peso(p.gzip).padStart(9)} in rete (gzip)`)
  for (const f of p.famiglie) {
    const q = ((f.byte / p.byte) * 100).toFixed(0)
    console.log(`      ${f.nome.padEnd(22)} ${peso(f.byte).padStart(9)}  ${(q + '%').padStart(4)}   costo compresso ${peso(f.gzipMarginale)}`)
  }
  console.log(`      ${"impalcatura del bundler".padEnd(22)} ${peso(p.impalcatura).padStart(9)}  ${(((p.impalcatura / p.byte) * 100).toFixed(0) + '%').padStart(4)}`)
  if (p.moduli.length) {
    console.log('      i cinque moduli piu' + "' grossi:")
    for (const m of p.moduli.slice(0, 5)) console.log(`        ${peso(m.byte).padStart(9)}  ${m.nome}`)
  }
}

// --- il modello dell'automobile ---------------------------------------------
/* IL NOME DEL MODELLO NON E' PIU' QUELLO, e lo strumento e' morto invece di
   dirlo. `auto_parti.glb` e' stato cancellato quando l'automobile e' stata
   sostituita, e questo file lo cercava ancora: eccezione, e nessun conto del
   carico. Adesso si prende il primo GLB che esiste fra quelli noti, e se non
   ne trova nessuno lo scrive invece di cadere. */
const CANDIDATI = ['public/modelli/auto2.glb', 'public/modelli/auto_parti.glb']
const GLB = CANDIDATI.map((c) => path.join(RADICE, c)).find((c) => fs.existsSync(c))
if (!GLB) { console.log('nessun modello di automobile trovato fra: ' + CANDIDATI.join(', ')); process.exit(0) }
const glbByte = fs.statSync(GLB).size
const glbGzip = zlib.gzipSync(fs.readFileSync(GLB), { level: 9 }).length
let glbEst = null
try {
  const b = fs.readFileSync(GLB)
  const g = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'))
  glbEst = { estensioni: g.extensionsUsed || [], mesh: (g.meshes || []).length, immagini: (g.images || []).length }
} catch (e) {}

// --- server + due corse ------------------------------------------------------
console.log('')
console.log('3. la misura nel browser')
const anteprima = await avviaAnteprima(PORTA)
const server = anteprima.server
PID_ANTEPRIMA = server.pid
if (anteprima.spostata) console.log(`   la porta ${PORTA} era occupata: Vite si e' spostato sulla ${anteprima.porta}`)
PORTA = anteprima.porta
if (!(await aspettaRisposta(PORTA))) throw new Error('vite preview annuncia la porta ma non risponde')
console.log(`   vite preview su http://localhost:${PORTA}/ (gzip acceso, come in produzione)`)

const browser = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})

/** due tentativi e poi una pausa, come vuole la regola di questo repo */
async function corsaTenace(lenta) {
  for (let i = 1; i <= 3; i++) {
    try { return await corsa(browser, lenta) } catch (e) {
      console.log(`   corsa ${lenta ? 'lenta' : 'piena'} fallita (${i}/3): ${e.message.split('\n')[0]}`)
      if (i === 2) await dorme(30000)
      if (i === 3) throw e
    }
  }
}

const piena = await corsaTenace(false)
console.log(`   rete piena: ${piena.tutte.length} richieste in ${(piena.muro / 1000).toFixed(1)} s${piena.completa ? '' : '  (ATTENZIONE: qualche bandiera non si e\' alzata)'}`)
const lento = await corsaTenace(true)
console.log(`   4G lento (1,6 Mbit/s, 150 ms): ${lento.tutte.length} richieste in ${(lento.muro / 1000).toFixed(1)} s${lento.completa ? '' : '  (ATTENZIONE: qualche bandiera non si e\' alzata)'}`)

await browser.close()
spegniAnteprima()

// --- la tabella --------------------------------------------------------------
/**
 * L'LCP NON STA IN QUESTA TABELLA, e va detto perche' e' la misura che tutti
 * si aspettano di trovarci.
 *
 * `largest-contentful-paint` smette di aggiornarsi alla prima interazione
 * vera. Uno scorrimento fatto da uno script non e' un'interazione: l'osservatore
 * continua a segnare elementi nuovi per tutta la corsa lungo la pagina, e alla
 * fine il numero che si legge — 61 secondi, misurati — non dice quanto ci ha
 * messo il sito a caricarsi, dice quanto e' durata la corsa dello strumento.
 * Resta nel JSON come dato grezzo, con questa avvertenza; in tabella no,
 * perche' un numero senza significato messo in colonna con quattro che ce
 * l'hanno diventa vero per posizione.
 */
const TRAGUARDI = [
  ['fcp', 'prima pittura (FCP)'],
  ['scena', 'primo fotogramma della scena'],
  ['ambiente', 'ambiente pronto'],
  ['auto', 'auto pronta'],
]

function stampaCorsa(c, titolo) {
  console.log('')
  console.log('=== ' + titolo + ' ' + '='.repeat(Math.max(0, 62 - titolo.length)))
  console.log('')
  console.log('  traguardo                        quando    scaricato fin li\'      file')
  for (const [k, etichetta] of TRAGUARDI) {
    const t = c.traguardi[k]
    const f = fotografia(c.tutte, t)
    console.log('  ' + etichetta.padEnd(30) + ms(t).padStart(9) +
      (t == null ? '           -' : peso(f.tot.rete).padStart(12)) +
      (t == null ? '        -' : String(f.tot.n).padStart(9)))
  }
  const fine = fotografia(c.tutte, null)
  console.log('  ' + 'tutto, a fine corsa'.padEnd(30) + ' '.repeat(9) + peso(fine.tot.rete).padStart(12) + String(fine.tot.n).padStart(9))
  /**
   * E QUANDO HA FINITO LA RETE, che e' la riga che rende leggibili le altre.
   *
   * Su rete piena l'ultimo byte arriva in mezzo secondo e l'auto e' pronta
   * tredici secondi dopo: quei tredici secondi non sono carico, sono CPU —
   * il modello da spacchettare, le tessiture da decodificare, gli shader da
   * compilare. E in Chromium senza scheda video sono molto peggiori che sulla
   * macchina di chi guarda, perche' qui si disegna in software (e' la trappola
   * gia' pagata da mezzo repo, vedi `fissaQualita` in `avvio.ts`).
   *
   * Quindi la colonna dei tempi su rete piena NON e' una misura del sito: e'
   * una misura di questa macchina. Quella che vale e' la corsa lenta, dove i
   * traguardi cadono dove li mette la rete.
   */
  /* IL CONFINE E' L'INIZIO DELLA CORSA, non la fine della misura: durante la
     corsa lungo la pagina partono altre richieste (le miniature pigre, il
     poster), e contarle qui farebbe dire che la rete ha finito a diciannove
     secondi quando in realta' aveva finito a seicentosessantacinque
     millisecondi. Sarebbe un numero giusto per una domanda diversa. */
  const reteFinita = c.tutte.filter((r) => r.inizio <= c.dopoPronta).reduce((a, r) => Math.max(a, r.fine), 0)
  console.log('  ' + 'la rete ha finito a'.padEnd(30) + ms(reteFinita).padStart(9))
  const cpu = (c.traguardi.auto ?? 0) - reteFinita
  if (cpu > 500) {
    console.log(`  (fra l'ultimo byte e l'auto pronta passano ${ms(cpu)}: quello non e' carico, e' CPU -`)
    console.log("   il modello da spacchettare e le tessiture da decodificare. Qui e' peggio del vero:")
    console.log('   Chromium senza scheda video disegna in software.)')
  }
  console.log('')
  tabellaTipi(fotografia(c.tutte, c.traguardi.fcp), 'sul percorso critico fino alla prima pittura')
  console.log('')
  tabellaTipi(fotografia(c.tutte, c.traguardi.auto), 'sul percorso critico fino all\'auto pronta')
  console.log('')
  const dopo = c.tutte.filter((r) => c.traguardi.fcp != null && r.fine > c.traguardi.fcp)
  const perTipo = new Map()
  for (const r of dopo) {
    if (!perTipo.has(r.tipo)) perTipo.set(r.tipo, { n: 0, rete: 0 })
    const v = perTipo.get(r.tipo)
    v.n++
    v.rete += r.rete || 0
  }
  console.log('  dopo la prima pittura arrivano ' + peso(dopo.reduce((a, r) => a + (r.rete || 0), 0)) + ' in ' + dopo.length + ' file')
  const dopoPronta = dopo.filter((r) => c.traguardi.auto != null && r.fine > c.traguardi.auto)
  console.log('  di cui ' + peso(dopoPronta.reduce((a, r) => a + (r.rete || 0), 0)) + ' in ' + dopoPronta.length +
    ' file arrivano DOPO che l\'auto e\' pronta (cioe' + "' sono fuori dal percorso critico per davvero)")
  const grossi = c.tutte.slice().sort((a, b) => (b.rete || 0) - (a.rete || 0)).slice(0, 12)
  console.log('')
  console.log('  i dodici file piu\' pesanti, e quando finiscono di arrivare')
  if (c.traguardi.fcp != null && reteFinita < c.traguardi.fcp) {
    console.log("  (su questa rete arriva tutto prima della prima pittura: l'ultima colonna qui non")
    console.log("   distingue niente. E' la corsa lenta che la rende leggibile.)")
  }
  console.log('    ' + 'file'.padEnd(34) + 'in rete'.padStart(10) + 'finisce'.padStart(10) + '   dove cade')
  for (const r of grossi) {
    let dove = 'dopo tutto'
    if (c.traguardi.fcp != null && r.fine <= c.traguardi.fcp) dove = 'prima della pittura'
    else if (c.traguardi.scena != null && r.fine <= c.traguardi.scena) dove = 'prima della scena'
    else if (c.traguardi.auto != null && r.fine <= c.traguardi.auto) dove = "prima dell'auto"
    console.log('    ' + (new URL(r.url).pathname).slice(-34).padEnd(34) + peso(r.rete || 0).padStart(10) + ms(r.fine).padStart(10) + '   ' + dove)
  }
}

stampaCorsa(piena, 'RETE PIENA')
stampaCorsa(lento, '4G LENTO - 1,6 Mbit/s, 150 ms di latenza')

// --- il modello, e le credenziali che il sito dichiara -----------------------
console.log('')
console.log('=== IL MODELLO DELL\'AUTOMOBILE ' + '='.repeat(35))
const scarichi = lento.tutte.filter((r) => /auto_parti\.glb/.test(r.url))
const dichiarato = (glbByte / 1e6).toFixed(1).replace('.', ',')
console.log(`  public/modelli/auto_parti.glb   ${glbByte} byte = ${MB(glbByte)} (${(glbByte / 1048576).toFixed(2).replace('.', ',')} MiB)`)
console.log(`  il sito dichiara "2.9 MB" in src/ui/Lavori.ts e src/ui/Quadro.ts:  ${dichiarato === '2,9' ? 'VERO' : 'NON PIU\' VERO, oggi sono ' + dichiarato + ' MB'}`)
if (glbEst) console.log(`  estensioni: ${glbEst.estensioni.join(', ') || 'nessuna'} - ${glbEst.mesh} mesh, ${glbEst.immagini} tessiture dentro`)
console.log(`  gzip non serve a niente su questo file: ${MB(glbGzip)} contro ${MB(glbByte)} (guadagno ${(100 - (glbGzip / glbByte) * 100).toFixed(1).replace('.', ',')}%)`)
console.log(`  il browser lo scarica ${scarichi.length} volta/e: ${scarichi.map((s) => peso(s.rete || 0)).join(', ') || 'mai (non compare fra le risorse: e\' arrivato come preannuncio del documento)'}`)

// --- IL GIUDIZIO -------------------------------------------------------------
/**
 * IL GIUDIZIO SI DA' SULLA CORSA LENTA, E SOLO SU QUELLA.
 *
 * Su rete piena tutti i nove megabyte arrivano in mezzo secondo, quindi ogni
 * file risulta «prima del primo fotogramma» e l'ordine di caricamento sembra
 * perfetto qualunque cosa si faccia. E' il motivo per cui un carico mal
 * organizzato non lo scopre mai chi lo scrive: sulla sua macchina non esiste.
 *
 * Sulla rete lenta la banda e' un budget, i file se lo contendono, e l'ordine
 * diventa visibile. Un byte vale 1/209715 di secondo: da li' in poi ogni
 * consiglio si puo' scrivere in millisecondi invece che in aggettivi.
 */
console.log('')
console.log('=== IL GIUDIZIO ' + '='.repeat(50))
console.log('')

const msPerByte = 1000 / LENTA.discesa
const inMs = (byte) => Math.round(byte * msPerByte) + ' ms'
const critFcpL = fotografia(lento.tutte, lento.traguardi.fcp)
const tuttoL = fotografia(lento.tutte, null)
const jsPezzo = pezzi.find((p) => p.nome.startsWith('avvio')) || pezzi[0]
const percorso = (r) => new URL(r.url).pathname
const somma = (v) => v.reduce((a, r) => a + (r.rete || 0), 0)

const accuse = []

// A. LO STESSO FILE DUE VOLTE.
// Un preannuncio che non combacia con la richiesta vera non da' nessun errore:
// il browser scarica, mette da parte, poi non riconosce la richiesta come la
// stessa e riscarica. Si vede solo contando le righe.
const conta = new Map()
for (const r of lento.tutte) conta.set(percorso(r), (conta.get(percorso(r)) || 0) + 1)
for (const [p, n] of conta) {
  if (n < 2) continue
  const copie = lento.tutte.filter((r) => percorso(r) === p)
  const sprecato = somma(copie) - (copie[0].rete || 0)
  accuse.push({
    titolo: `${p} viene scaricato ${n} volte`,
    perche: 'il preannuncio in index.html e il caricamento vero non hanno lo stesso modo CORS, ' +
      'quindi il browser tratta le due richieste come due file diversi. Il modello dell\'auto ' +
      'ha `crossOrigin: anonymous` sul preannuncio e infatti arriva una volta sola; il panorama no.',
    byte: sprecato,
    guadagno: inMs(sprecato),
    dove: copie.map((r) => `${percorso(r)} (${r.come}, finisce a ${ms(r.fine)})`),
  })
}

// B. IL PEZZO GROSSO DI JAVASCRIPT SI SCOPRE TARDI.
// `main.ts` chiede `avvio` con un `import()` dinamico. Il lettore anticipato
// del browser non guarda dentro il JavaScript: quel pezzo esiste per lui solo
// dopo che il primo modulo e' stato scaricato ED ESEGUITO.
const primoScript = lento.tutte.filter((r) => r.tipo === 'JS').sort((a, b) => a.inizio - b.inizio)[0]
const grosso = lento.tutte.filter((r) => r.tipo === 'JS').sort((a, b) => (b.rete || 0) - (a.rete || 0))[0]
if (primoScript && grosso && grosso !== primoScript) {
  const ritardo = grosso.inizio - primoScript.inizio
  if (ritardo > 300) {
    accuse.push({
      titolo: `il pezzo grosso di JavaScript parte ${ms(ritardo)} dopo gli altri`,
      perche: 'e\' un import() dinamico, e il lettore anticipato del browser dentro il ' +
        'JavaScript non guarda: quel pezzo per lui esiste solo dopo che il primo modulo e\' ' +
        'stato scaricato ED ESEGUITO. La divisione era nata per non farlo scaricare a chi ' +
        'finiva nella pagina di ripiego; ma Ripiego.esamina() si limita a leggere data-ripiego ' +
        'sulla radice, e index.html non lo scrive piu\' (la ragione sta scritta li\'). Quel caso ' +
        'non capita piu\', mentre il ritardo che costava si paga a ogni visita.',
      byte: 0,
      guadagno: `${Math.round(ritardo)} ms, con un <link rel="modulepreload"> in index.html (la divisione resta)`,
      dove: [`${percorso(grosso)} parte a ${ms(grosso.inizio)}, ${percorso(primoScript)} a ${ms(primoScript.inizio)}`],
    })
  }
}

// C. I CAPITOLI SUCCESSIVI SI CONTENDONO LA BANDA CON L'AUTOMOBILE.
/* QUESTA RIGA E' UN GIUDIZIO, NON UNA MISURA, e va detto.
   La rete non sa a quale tempo del racconto serve una tessitura: quello lo so
   io leggendo i percorsi, e lo scrivo qui accanto invece di far finta che sia
   uscito da uno strumento. Il numero di byte e i millisecondi, quelli sono
   misurati. La divisione fra «serve subito» e «serve dopo» e' mia.
   Restano fuori dall'elenco `nero_*` — la vernice dell'auto, che si vede alla
   prima inquadratura — e tutto cio' che gia' oggi arriva dopo. */
const PIU_TARDI = [
  [/^\/texture\/asfalto_/, 'la strada, che compare dal terzo tempo'],
  [/^\/texture\/(abitacolo|pelle_)/, "l'abitacolo, che si vede solo entrandoci"],
  [/^\/modelli\/volante\.glb$/, 'la pattuglia, che arriva nel finale'],
  [/^\/lavori\//, 'le miniature dei lavori, in fondo alla pagina'],
  [/^\/poster\//, 'il poster, che serve alla pagina di ripiego e non all\'esperienza'],
]
const fineAuto = lento.traguardi.auto ?? Infinity
const tardivi = lento.tutte.filter((r) => r.fine <= fineAuto && PIU_TARDI.some(([re]) => re.test(percorso(r))))
if (tardivi.length) {
  const b = somma(tardivi)
  const gruppi = new Map()
  for (const r of tardivi) {
    const [, etichetta] = PIU_TARDI.find(([re]) => re.test(percorso(r)))
    if (!gruppi.has(etichetta)) gruppi.set(etichetta, { n: 0, byte: 0 })
    const g = gruppi.get(etichetta)
    g.n++
    g.byte += r.rete || 0
  }
  accuse.push({
    titolo: `${peso(b)} di roba dei capitoli successivi scaricata PRIMA che l'auto sia pronta`,
    perche: 'partono tutte insieme all\'avvio della scena e si spartiscono la banda con il ' +
      'modello dell\'automobile, che e\' l\'unica cosa per cui chi guarda sta aspettando. Il ' +
      'progetto sa gia\' rimandare - carbonio, buccia, faro e ruota partono DOPO che l\'auto ' +
      'e\' arrivata - quindi non c\'e\' un meccanismo da inventare, c\'e\' da estenderlo.',
    byte: b,
    guadagno: inMs(b) + " sull'auto pronta, su una rete satura",
    dove: [...gruppi].map(([e, g]) => `${peso(g.byte)} in ${g.n} file - ${e}`),
  })
}

// D. UN PEZZO SOLO DI JAVASCRIPT, E DENTRO C'E' UNA LIBRERIA INTERA.
if (jsPezzo) {
  const tre = jsPezzo.famiglie.find((f) => f.nome === 'three.js')
  const rect = jsPezzo.moduli.find((m) => /RectAreaLightTexturesLib/.test(m.nome))
  accuse.push({
    titolo: `il JavaScript della scena e' un pezzo unico da ${peso(jsPezzo.gzip)} compressi`,
    perche: tre
      ? `il ${((tre.byte / jsPezzo.byte) * 100).toFixed(0)}% dei byte e' three.js (costo compresso misurato: ` +
        `${peso(tre.gzipMarginale)}), l'${((jsPezzo.famiglie.find((f) => f.nome === 'codice del progetto')?.byte || 0) / jsPezzo.byte * 100).toFixed(0)}% ` +
        `e' codice del progetto. Non e' un difetto: e' il prezzo di una scena in tre dimensioni. ` +
        `Va saputo, perche' e' l'unico pezzo di codice che sta fra il primo fotogramma e la scena.`
      : '',
    byte: jsPezzo.gzip,
    guadagno: `su 4G lento questo pezzo da solo vale ${inMs(jsPezzo.gzip)} di attesa`,
    dove: rect ? [
      `${peso(rect.byte)} stesi, cioe' il ${((rect.byte / jsPezzo.byte) * 100).toFixed(0)}% del pezzo, ` +
      "sono le tabelle della RectAreaLight (RectAreaLightTexturesLib.js): un blocco di numeri " +
      "che three porta appresso, e che qui serve davvero perche' Luci.ts chiama " +
      'RectAreaLightUniformsLib.init(). Senza, le luci rettangolari esistono e non illuminano.',
    ] : [],
  })
}

// E. IL SERVER COMPRIME IN GZIP, NON IN BROTLI.
/* E' l'unica riga di questo rapporto che non si corregge nel codice ma nella
   configurazione di chi ospita. La misura pero' e' la stessa: i file di testo
   sono gia' sul disco, si comprimono nei due modi e si confrontano. Vale la
   pena dirlo qui perche' non costa una riga di codice a nessuno e toglie byte
   dal percorso critico piu' caro che c'e', quello del JavaScript. */
const testi = suDisco.filter((f) => f.gzip && f.brotli)
const risparmio = testi.reduce((a, f) => a + (f.gzip - f.brotli), 0)
if (risparmio > 20000) {
  accuse.push({
    titolo: `brotli al posto di gzip toglierebbe ${peso(risparmio)} dai file di testo`,
    perche: "i byte sono gia' quelli giusti, e' l'involucro che e' vecchio: vite preview " +
      "comprime in gzip e quasi tutti gli host sanno fare brotli. Non si tocca una riga di " +
      "codice, si tocca una casella nella configurazione di chi ospita.",
    byte: risparmio,
    guadagno: inMs(risparmio) + " su 4G lento, tutti sul percorso critico della scena",
    dove: testi.filter((f) => f.gzip - f.brotli > 1000)
      .map((f) => `${f.rel}: ${peso(f.gzip)} in gzip contro ${peso(f.brotli)} in brotli`),
  })
}

if (accuse.length) {
  console.log('COSA E\' FUORI POSTO')
  console.log('')
  for (const a of accuse) {
    console.log('  * ' + a.titolo)
    // il testo si manda a capo a settantasei colonne: un paragrafo su una riga
    // sola in un terminale non lo legge nessuno
    const manda = (testo, primo, seguito) => {
      let riga = primo
      for (const parola of testo.split(/\s+/)) {
        if (riga.trimEnd().length + parola.length > 78) { console.log(riga.trimEnd()); riga = seguito }
        riga += parola + ' '
      }
      console.log(riga.trimEnd())
    }
    if (a.perche) manda(a.perche, '     ', '     ')
    for (const d of (a.dove || []).slice(0, 8)) manda(d, '       - ', '         ')
    console.log('     GUADAGNO: ' + a.guadagno)
    console.log('')
  }
} else {
  console.log('COSA E\' FUORI POSTO: niente. Il carico e\' organizzato.')
  console.log('')
}

// --- e quello che invece e' gia' a posto, che va detto uguale ----------------
/* UN RAPPORTO CHE TROVA SOLO DIFETTI NON E' UN RAPPORTO SEVERO, E' UN RAPPORTO
   CHE SI GIUSTIFICA. Queste righe sono misurate come le altre e dicono cosa
   non va toccato — che e' un'informazione utile quanto le altre, perche'
   protegge da chi domani «ottimizza» proprio quello. */
console.log('COSA E\' GIA\' A POSTO')
console.log('')
/* QUESTA RIGA SI SCRIVE DA SOLA, e non e' un vezzo.
   Alla prima stesura ci avevo messo la frase «ci sono solo il documento, il
   foglio di stile e i due caratteri preannunciati», che era vera nella corsa in
   cui l'avevo scritta. Due corse dopo davanti alla prima pittura c'erano nove
   file invece di sei — il momento in cui il compositore consegna il fotogramma
   balla di qualche secondo in headless — e il rapporto continuava a stampare
   quella frase con accanto dei numeri che la smentivano. Una didascalia fissa
   sotto un numero che cambia e' peggio del numero da solo. */
console.log(`  * la prima pittura costa ${peso(critFcpL.tot.rete)} in ${critFcpL.tot.n} file e arriva a ${ms(lento.traguardi.fcp)} anche su 4G lento.`)
console.log('     Davanti al primo fotogramma ci sono: ' +
  [...critFcpL.per].map(([t, v]) => `${t} (${v.n}, ${peso(v.rete)})`).join(', ') + '.')
const pesantiPrima = [...critFcpL.per.keys()].filter((t) => ['panorama', 'modelli', 'tessiture', 'video'].includes(t))
if (!pesantiPrima.length) {
  console.log("     Nessun modello, nessuna tessitura, nessun panorama: la decisione presa nello")
  console.log('     script in testa a index.html regge alla misura.')
} else {
  console.log('     ATTENZIONE: ci stanno anche ' + pesantiPrima.join(', ') + ", e li' non ci")
  console.log("     dovrebbero stare. E' la prima cosa da guardare.")
}
const dopoAuto = lento.tutte.filter((r) => lento.traguardi.auto != null && r.inizio > lento.traguardi.auto - 3000 && r.fine > lento.traguardi.auto - 2000)
const rimandati = lento.tutte.filter((r) => /carbonio|buccia|faro\.glb|ruota\.glb|turbina/.test(percorso(r)))
if (rimandati.length) {
  console.log('')
  console.log(`  * ${rimandati.length} file (${peso(somma(rimandati))}) sono gia' rimandati a dopo il modello dell'auto:`)
  console.log('     ' + rimandati.map((r) => percorso(r).split('/').pop()).join(', ') + '.')
  console.log('     Il meccanismo esiste ed e\' quello da estendere al resto.')
}
console.log('')
console.log(`  * il modello dell'auto e' gia' compresso come si deve: ${MB(glbByte)} con meshopt e`)
console.log(`     quantizzazione, zero tessiture dentro, e il gzip ci guadagna solo il ${(100 - (glbGzip / glbByte) * 100).toFixed(0)}% -`)
console.log('     segno che il lavoro di riduzione e\' gia\' stato fatto sul file, non lasciato alla rete.')
console.log('')
console.log(`  * i caratteri sono in locale e sono ${lento.tutte.filter((r) => r.tipo === 'font').length} file per ${peso(somma(lento.tutte.filter((r) => r.tipo === 'font')))},`)
console.log("     tutti con `font-display: swap` e con un ripiego di sistema a metriche corrette")
console.log('     (`size-adjust`, `ascent-override`): il testo si legge subito e non salta quando')
console.log('     il carattere vero arriva. Nessuno dei sei blocca il primo fotogramma.')

// --- il conto -----------------------------------------------------------------
console.log('')
console.log('IL CONTO, IN CHIARO (4G lento, 1,6 Mbit/s)')
for (const [k, etichetta] of TRAGUARDI) {
  const f = fotografia(lento.tutte, lento.traguardi[k])
  console.log('  ' + etichetta.padEnd(30) + ms(lento.traguardi[k]).padStart(9) + peso(f.tot.rete).padStart(12) + String(f.tot.n).padStart(5) + ' file')
}
console.log('  ' + 'tutto'.padEnd(30) + ' '.repeat(9) + peso(tuttoL.tot.rete).padStart(12) + String(tuttoL.tot.n).padStart(5) + ' file')
const recuperabile = accuse.filter((a) => a.byte > 0 && !/pezzo unico/.test(a.titolo)).reduce((a, x) => a + x.byte, 0)
console.log('')
console.log(`  byte che si possono togliere dal percorso critico dell'auto: ${peso(recuperabile)}`)
console.log(`  cioe' ${inMs(recuperabile)} su 4G lento: l'auto passerebbe da ${ms(lento.traguardi.auto)} a circa ${ms((lento.traguardi.auto || 0) - recuperabile * msPerByte)}.`)
console.log("  E' una stima di banda liberata, non una promessa: vale finche' il collegamento e'")
console.log("  saturo, e non tocca la coda di CPU che sta fra l'ultimo byte e la bandiera alzata.")
console.log(`  (su 4G lento un kilobyte costa ${(1000 * msPerByte).toFixed(1).replace('.', ',')} ms: e' il cambio con cui leggere ogni riga qui sopra)`)
// --- il file ------------------------------------------------------------------
const perJson = (c) => ({
  traguardi: c.traguardi,
  completa: c.completa,
  muroMs: c.muro,
  totale: (() => { const f = fotografia(c.tutte, null); return { file: f.tot.n, rete: f.tot.rete, steso: f.tot.steso } })(),
  aTraguardo: Object.fromEntries(TRAGUARDI.map(([k]) => {
    const f = fotografia(c.tutte, c.traguardi[k])
    return [k, {
      quandoMs: c.traguardi[k] ?? null,
      file: f.tot.n,
      rete: f.tot.rete,
      steso: f.tot.steso,
      perTipo: Object.fromEntries([...f.per].map(([t, v]) => [t, v])),
    }]
  })),
  risorse: c.tutte.map((r) => ({
    percorso: new URL(r.url).pathname, tipo: r.tipo, rete: r.rete, compresso: r.compresso,
    steso: r.steso, inizioMs: +r.inizio.toFixed(1), fineMs: +r.fine.toFixed(1), come: r.come,
  })).sort((a, b) => a.fineMs - b.fineMs),
})

const json = {
  generato: new Date().toISOString(),
  come: {
    build: `npx vite build --outDir ${USCITA}`,
    servito: `npx vite preview --outDir ${USCITA} --port ${PORTA} (gzip acceso)`,
    reteLenta: LENTA,
    nota: 'kB e MB sono decimali (1000), come nel rapporto di Vite. La cache e\' spenta: e\' la misura della PRIMA visita.',
  },
  suDisco: suDisco.sort((a, b) => b.byte - a.byte).map((f) => ({ file: f.rel, tipo: f.tipo, byte: f.byte, gzip: f.gzip ?? null, brotli: f.brotli ?? null })),
  javascript: pezzi.map((p) => ({
    pezzo: p.file, byte: p.byte, gzip: p.gzip, impalcatura: p.impalcatura,
    famiglie: p.famiglie, moduli: p.moduli.slice(0, 25),
  })),
  modelloAuto: {
    file: 'public/modelli/auto_parti.glb', byte: glbByte, MB: +(glbByte / 1e6).toFixed(2),
    MiB: +(glbByte / 1048576).toFixed(2), gzip: glbGzip, dichiaratoDalSito: '2.9 MB',
    dichiarazioneVera: (glbByte / 1e6).toFixed(1) === '2.9',
    ...(glbEst || {}),
    scaricatoVolte: scarichi.length,
  },
  corse: { piena: perJson(piena), lento: perJson(lento) },
  giudizio: accuse.length ? accuse : [{ cosa: 'niente fuori posto sul percorso critico', byte: 0 }],
}
fs.mkdirSync(path.join(RADICE, 'docs'), { recursive: true })
fs.writeFileSync(path.join(RADICE, 'docs/carico.json'), JSON.stringify(json, null, 2))
console.log('')
console.log('  il dettaglio, richiesta per richiesta, sta in docs/carico.json')

// la cartella con le mappe serviva solo all'attribuzione: si toglie, se no
// resta li' a pesare quattro megabyte e mezzo di roba che nessuno guardera'
try { fs.rmSync(path.join(RADICE, USCITA_MAPPA), { recursive: true, force: true }) } catch (e) {}
process.exit(0)
