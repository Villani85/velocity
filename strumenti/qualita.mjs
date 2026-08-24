/**
 * QUANTO COSTA IL PERCORSO, SUI TRE FORMATI — e cosa ne pensa `core/Qualita.ts`.
 *
 * E' `fps.mjs` portato a tre formati e con due cose in piu'.
 *
 * LA PRIMA: dentro la pagina viene costruito il misuratore vero, quello di
 * `core/Qualita.ts`, e gli si danno in pasto gli STESSI `dt` che sta vivendo
 * la scena. Cosi' non si misurano soltanto i millisecondi: si vede quale
 * livello avrebbe scelto all'avvio guardando la macchina, e se durante la
 * corsa sarebbe sceso o salito.
 *
 * LA SECONDA: alla fine si applicano a mano le impostazioni del livello
 * `alto` e del livello `minimo` e si rimisura lo stesso percorso. Senza
 * questo confronto il modulo e' una dichiarazione di intenti: dice di
 * risparmiare, e nessuno ha verificato quanto. Il numero che conta e' il
 * RAPPORTO fra i due, non il valore assoluto — che dipende da cos'altro sta
 * facendo la macchina in quel momento.
 *
 * PERCHE' SCORRENDO E NON DA FERMO. Da fermo una scena 3D e' sempre veloce:
 * il costo si vede quando la camera si muove, l'ombra si ricalcola, il
 * riflesso rifa' la sua passata e la lastra della strada comincia a scorrere.
 * Le tre cose piu' care del motore stanno in tratti diversi del percorso, e
 * una misura fatta in un punto solo non dice niente.
 *
 * PERCHE' SETTECENTO FOTOGRAMMI E NON CENTOTTANTA. L'isteresi di `Qualita`
 * butta via i primi due secondi e mezzo (sono i piu' lenti che quella
 * macchina vedra' mai: shader che si compilano, tessiture che arrivano) e poi
 * vuole tre secondi pieni sopra soglia prima di scendere. Con centottanta
 * fotogrammi non si arriva nemmeno alla fine del riscaldamento, e il
 * misuratore direbbe sempre e solo «non ho deciso niente».
 *
 * LE CHIAMATE DI DISEGNO VANNO CONTATE CON `autoReset` SPENTO, e la prima
 * stesura non lo faceva: `renderer.info` si azzera a ogni `render()`, e
 * l'ultima passata di un composer e' un rettangolo a schermo intero. Il
 * risultato era «1 chiamata, 1 triangolo» per una scena da centinaia di
 * migliaia — un numero che sembra una misura e non lo e'. Spento
 * l'azzeramento, il contatore accumula TUTTE le passate (riflesso e ombra
 * compresi) e diviso per i fotogrammi da il costo vero.
 *
 *   node strumenti/qualita.mjs
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const BASE = process.env.BASE_URL || 'http://localhost:5174/'
/** quanti fotogrammi di corsa: vedi sopra, servono a far parlare l'isteresi */
const PASSI = 600
/** il confronto fra livelli raddoppia il lavoro: si chiede, non si subisce */
const CONFRONTA = process.argv.includes('--livelli')

const FORMATI = [
  ['desktop 1600x1000', 1600, 1000],
  ['portatile 1280x800', 1280, 800],
  ['telefono 390x844', 390, 844],
]

/**
 * IL CORPO DELLA MISURA, come sorgente, perche' deve girare nella pagina.
 *
 * Sta in una stringa e non in una funzione passata a `evaluate` per un motivo
 * solo: serve chiamarlo piu' volte nello stesso contesto — una per la misura
 * di base e una per ogni livello applicato — senza ricaricare la pagina, e
 * senza ricaricarla proprio perche' un caricamento di questa scena costa
 * quaranta secondi e rimescolerebbe tutte le cache.
 */
const IMPIANTO = `
window.__misura = async function (passi, osserva) {
  const esp = window.esperienza
  const corsa = document.documentElement.scrollHeight - innerHeight
  const R = esp.renderer

  // vedi il commento in testa: senza questo si conta l'ultima passata e basta
  R.info.autoReset = false
  R.info.reset()

  const t = []
  const cambi = []
  let prec = performance.now()
  for (let i = 0; i <= passi; i++) {
    window.scrollTo(0, corsa * (i / passi))
    await new Promise((r) => requestAnimationFrame(r))
    const ora = performance.now()
    const ms = ora - prec
    prec = ora
    t.push(ms)
    if (osserva && window.__qualita) {
      const q = window.__qualita
      // la media si legge PRIMA di aggiornare: al cambio di livello
      // \`Qualita\` la riazzera al budget, e leggerla dopo dava sempre 16,7 —
      // cioe' il numero che avrebbe dovuto spiegare la discesa spariva
      // esattamente nell'istante della discesa
      const prima = q.millisecondi
      if (q.aggiorna(ms / 1000)) cambi.push(i + ':' + q.livello + '@' + prima.toFixed(1))
    }
  }

  const ord = t.slice().sort((a, b) => a - b)
  const q = (f) => ord[Math.min(ord.length - 1, Math.floor(ord.length * f))]
  const info = R.info
  const fuori = { mediana: q(0.5), p95: q(0.95), peggio: ord[ord.length - 1],
    lunghi: t.filter((v) => v > 18.5).length, totale: t.length,
    chiamate: Math.round(info.render.calls / t.length),
    triangoli: Math.round(info.render.triangles / t.length),
    cambi }
  R.info.autoReset = true
  return fuori
}

/**
 * APPLICA UN LIVELLO DA FUORI.
 *
 * \`Qualita\` non e' ancora agganciato a \`Esperienza\` — le righe per
 * collegarlo stanno in fondo a \`Qualita.ts\` — quindi qui si fa a mano
 * esattamente quello che faranno quelle righe. E' anche l'unico modo per
 * misurare i livelli PRIMA di collegarli, cioe' per sapere se conviene.
 */
window.__applica = function (imp) {
  const esp = window.esperienza
  const R = esp.renderer

  // SI SCAVALCA IL TAPPO \`Math.min(devicePixelRatio, ...)\`, apposta: il
  // browser di prova gira a densita' 1, quindi il tappo non morderebbe mai e
  // la manopola piu' potente del modulo resterebbe invisibile alla misura.
  // Mettendo il valore secco si misura quello che vive una macchina a
  // densita' doppia, che e' il caso che il tappo esiste per governare.
  R.setPixelRatio(imp.pixelRatio)
  if (esp.composer) {
    esp.composer.setPixelRatio(R.getPixelRatio())
    esp.composer.setSize(innerWidth, innerHeight)
  }
  if (esp.bloom) esp.bloom.enabled = imp.bloom
  if (esp.ao) {
    esp.ao.enabled = imp.occlusione
    if (imp.occlusione) esp.ao.updateGtaoMaterial({ samples: imp.campioniOcclusione })
  }

  // IL RIFLESSO SI SPEGNE SOSTITUENDO IL METODO e non alzando \`attivo\`:
  // \`fotogramma()\` riscrive \`attivo\` sessanta volte al secondo, quindi da
  // fuori quel campo e' di sola lettura in pratica. Nel sito vero la riga
  // giusta e' quella del punto (8) in fondo a \`Qualita.ts\`.
  if (!window.__riflessoVero) window.__riflessoVero = esp.riflesso.aggiorna.bind(esp.riflesso)
  esp.riflesso.aggiorna = imp.riflesso
    ? window.__riflessoVero
    : function () { esp.riflesso.mesh.visible = false }

  const T = window.__THREE
  if (!window.__luciCorte) {
    window.__luciCorte = []
    esp.scena.getObjectByName('CORTE').traverse(function (o) {
      if (o.isPointLight) window.__luciCorte.push(o)
    })
    window.__forzeCorte = window.__luciCorte.map(function (l) { return l.intensity })
    window.__ombra = esp.scena.getObjectByName('OMBRA')
  }
  window.__applicaLuci(window.__luciCorte, window.__forzeCorte, imp.luciCorte)

  const o = window.__ombra
  if (o) {
    if (imp.ombra > 0) {
      if (o.shadow.mapSize.x !== imp.ombra) {
        o.shadow.mapSize.set(imp.ombra, imp.ombra)
        if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null }
      }
      o.shadow.autoUpdate = imp.ombraViva
      o.shadow.needsUpdate = true
      R.shadowMap.enabled = true
    } else {
      // spegnerle davvero ricompila tutta la scena: e' la trappola descritta
      // in \`Qualita.ts\`, e qui la si paga apposta per misurarne il costo
      R.shadowMap.enabled = false
    }
  }
  void T
}
`

// il TypeScript gia' trasformato in JavaScript, preso dal server di sviluppo:
// e' l'unico pezzo di build che serve, e costa una richiesta
const sorgente = await (await fetch(new URL('/src/core/Qualita.ts', BASE))).text()

// UN BROWSER PER FORMATO, e non uno per tutti.
//
// Con un browser solo, la prima scheda che va in crash porta via anche le
// misure che non erano ancora partite: nel registro si vedono tre righe
// «Target page, context or browser has been closed» di fila, di cui solo la
// prima e' un'informazione. Riavviarlo costa due secondi e rende ogni formato
// indipendente dagli altri.
const apri = () => chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1', '--enable-gpu'] })

console.log(`percorso intero, ${PASSI} fotogrammi per corsa — ${BASE}\n`)

const riga = (etichetta, r) => {
  const fps = (ms) => (1000 / ms).toFixed(0)
  console.log(
    `${etichetta.padEnd(22)} mediana ${r.mediana.toFixed(1).padStart(5)} ms (${fps(r.mediana).padStart(3)} fps)` +
    `   p95 ${r.p95.toFixed(1).padStart(6)} ms (${fps(r.p95).padStart(3)} fps)` +
    `   peggio ${r.peggio.toFixed(0).padStart(5)} ms`,
  )
  console.log(
    `${''.padEnd(22)} giri persi ${String(r.lunghi).padStart(3)}/${r.totale}` +
    `   draw call/fotogramma ${r.chiamate}   tri/fotogramma ${r.triangoli.toLocaleString('it')}`,
  )
}

/**
 * OGNI FORMATO SI RIPROVA FINO A TRE VOLTE, e non e' pignoleria.
 *
 * Due cose fuori dal mio controllo fanno morire una corsa a meta': un altro
 * agente che tocca un file del progetto — Vite se ne accorge e RICARICA la
 * pagina, il contesto muore e Playwright dice «Execution context was
 * destroyed», che sembra un difetto dello strumento — e la scheda del browser
 * che va in crash quando la macchina e' satura (qui ci girano quattro agenti
 * insieme). In entrambi i casi la misura non e' sbagliata: e' assente. Si
 * rifa'.
 *
 * Cio' che NON si fa e' inventare il numero mancante: se tre tentativi
 * falliscono si stampa che sono falliti, e chi legge sa che quel dato non
 * c'e'.
 */
async function conRipetizioni(nome, quante, corpo) {
  for (let tentativo = 1; tentativo <= quante; tentativo++) {
    try {
      return await corpo()
    } catch (e) {
      const perche = String(e).split('\n')[0].slice(0, 110)
      if (tentativo === quante) {
        console.log(`${nome.padEnd(22)} MISURA NON RIUSCITA dopo ${quante} tentativi — ${perche}\n`)
        return null
      }
      console.log(`${nome.padEnd(22)} tentativo ${tentativo} perso (${perche}), si rifa'`)
    }
  }
  return null
}

for (const [nome, larghezza, altezza] of FORMATI) {
  await conRipetizioni(nome, 3, async () => {
  const browser = await apri()
  const p = await browser.newPage({
    viewport: { width: larghezza, height: altezza },
    deviceScaleFactor: 1,
  })
  p.setDefaultTimeout(120000)
  // SI DISINNESCA LA RICARICA DI VITE.
  //
  // Su questo progetto lavorano piu' agenti insieme: appena uno tocca un file
  // il server di sviluppo manda un `full-reload` e la pagina si ricarica a
  // meta' misura. Il contesto muore, Playwright dice «Execution context was
  // destroyed» e sembra un difetto dello strumento — ho perso due corse
  // intere prima di guardare gli eventi di navigazione.
  //
  // Si taglia alla radice: il client di Vite riceve gli ordini da un
  // WebSocket, e questa pagina non ne apre nessun altro. Senza socket non
  // arriva nessun `full-reload` e la misura arriva in fondo.
  //
  // NON si tocca `location.reload`, che era il primo tentativo: in Chrome
  // quella proprieta' non e' riconfigurabile, e il tentativo lascia in
  // console un `TypeError: Cannot redefine property: reload` che poi si
  // legge come un errore del SITO — cioe' lo strumento sporca la cosa che
  // deve misurare.
  await p.addInitScript(() => {
    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      value: function () {
        return {
          readyState: 3,
          addEventListener() {}, removeEventListener() {},
          send() {}, close() {},
        }
      },
    })
  })
  // la pagina si chiude SEMPRE, anche quando il tentativo muore: una scheda
  // orfana per ogni tentativo perso, su una macchina gia' satura, e' il modo
  // migliore per far fallire anche i tentativi successivi
  try {

  const errori = []
  p.on('pageerror', (e) => errori.push(String(e).slice(0, 200)))
  p.on('console', (m) => { if (m.type() === 'error') errori.push(m.text().slice(0, 200)) })

  const attendi = async () => {
    await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
    await p
      .waitForFunction(
        () => window.esperienza.autoPronta && window.esperienza.ambientePronto,
        null,
        { timeout: 180000 },
      )
      .catch(() => {})
  }

  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await attendi()

  const scelta = await p.evaluate(async ({ impianto, sorgente }) => {
    // IL MODULO SI IMPORTA DA UN BLOB, NON DAL SERVER DI SVILUPPO.
    //
    // `Qualita.ts` non e' ancora agganciato a `main.ts`. Chiedendolo con
    // `import('/src/core/Qualita.ts')` Vite lo aggiunge al grafo dei moduli e
    // TRECENTO MILLISECONDI DOPO ricarica la pagina — l'import riesce, e poi
    // il contesto muore sotto le mani. Il messaggio che ne esce, «Execution
    // context was destroyed», sembra un guasto del browser ed e' invece Vite
    // che fa il suo mestiere; ci ho perso due misure prima di guardare gli
    // eventi di navigazione invece del messaggio d'errore.
    //
    // Il testo trasformato si scarica da node e si importa come blob: stessa
    // identica esecuzione, ma il server non sa che e' successo e non ricarica
    // niente. Funziona perche' questo modulo, tolto il tipo `PointLight` che
    // il compilatore cancella, non importa nulla a runtime.
    const url = URL.createObjectURL(new Blob([sorgente], { type: 'text/javascript' }))
    const mod = await import(/* @vite-ignore */ url)
    window.__qualita = new mod.Qualita(window.esperienza.renderer.getContext())
    window.__IMPOSTAZIONI = mod.IMPOSTAZIONI
    window.__applicaLuci = mod.applicaLuciCorte
    // eslint-disable-next-line no-new-func
    new Function(impianto)()
    return { livello: window.__qualita.livello, descrizione: window.__qualita.descrivi() }
  }, { impianto: IMPIANTO, sorgente })

  const base = await p.evaluate((passi) => window.__misura(passi, true), PASSI)
  riga(nome, base)
  console.log(
    `${''.padEnd(22)} livello ${scelta.livello} -> ${await p.evaluate(() => window.__qualita.livello)}` +
    (base.cambi.length ? `   cambi ${base.cambi.join(' ')}` : '   nessun cambio'),
  )
  console.log(`${''.padEnd(22)} ${scelta.descrizione}`)
  if (errori.length) console.log(`${''.padEnd(22)} ERRORI: ${errori.slice(0, 3).join(' | ')}`)

  // IL CONFRONTO FRA LIVELLI SI FA SU UN FORMATO SOLO, il piu' grande: e'
  // quello in cui il costo si vede, ed e' anche l'unico in cui rifare due
  // corse intere vale il tempo che costa su una macchina condivisa.
  if (CONFRONTA && larghezza === 1600) {
    for (const liv of ['alto', 'minimo']) {
      await p.evaluate((l) => window.__applica(window.__IMPOSTAZIONI[l]), liv)
      // due secondi di assestamento: cambiare rapporto di pixel rialloca
      // ogni bersaglio della catena e spegnere le ombre ricompila la scena.
      // Misurare dentro quel rumore vorrebbe dire misurare il cambio invece
      // del livello.
      await p.waitForTimeout(2000)
      riga('  livello ' + liv, await p.evaluate((passi) => window.__misura(passi, false), PASSI))
    }
  }
  console.log()
  return true
  } finally {
    await browser.close().catch(() => {})
  }
  })
}

