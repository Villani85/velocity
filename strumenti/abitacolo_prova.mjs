/** L'ABITACOLO FOTOGRAFICO, provato sulla scena vera.
 *
 *  Costruisce un `Abitacolo` A MANO davanti alla camera del sito — senza
 *  toccare `Esperienza`, che lo collega chi di dovere — e ne salva un
 *  fotogramma. Serve a dimostrare due cose che a parole non si dimostrano:
 *  che il piano RIEMPIE il quadro a qualunque formato, e che il parabrezza
 *  e' davvero BUCATO (dietro si vede la lastra della strada, non una toppa
 *  scura dipinta).
 *
 *  DUE FORMATI IN UNA CORSA SOLA, e sono scelti uno per ramo.
 *
 *  L'adattamento nelle UV ha due strade — schermo piu' largo di 16:9 (si
 *  taglia sopra e sotto) e schermo piu' stretto (si taglia ai lati) — e a un
 *  formato solo se ne proverebbe una. Quindi 1000x500, che e' 2,00 e sta
 *  sopra 16:9, e 360x760, che e' 0,47 come un telefono in verticale.
 *
 *  IL MODULO SI CARICA DAL SERVER DI SVILUPPO con un import dinamico: Vite
 *  serve i .ts trasformati, e `three` gli arriva dalla stessa dipendenza
 *  pre-impacchettata che usa il sito — quindi le classi sono le stesse
 *  istanze, non una copia che sembrerebbe funzionare e non funzionerebbe.
 *
 *  I FOTOGRAMMI SONO POCHI E LE FINESTRE PICCOLE, e c'e' un motivo.
 *
 *  Headless, Chromium disegna con SwiftShader, cioe' in CPU. Questa scena
 *  (460k triangoli, ventidue luci, GTAO, bloom, una passata di riflesso e una
 *  di grading) li' dentro costa SECONDI per fotogramma, e il costo cresce con
 *  i pixel: a 1200x750 una corsa che scorre a trenta passi sono dieci minuti,
 *  e dieci minuti di finestra aperta sono dieci minuti in cui qualcosa puo'
 *  andare storto. A meta' dei pixel, e arrivando al beat in un colpo invece
 *  che a passi, una corsa dura poco piu' di un minuto — e la prova non perde
 *  niente, perche' il piano riempie il quadro alla stessa maniera a qualunque
 *  risoluzione.
 *
 *  E LA COSA CHE ANDAVA STORTA NON ERA LA LENTEZZA: era l'aggiornamento a
 *  caldo di Vite. Vedi la nota su `/@vite/client` dentro `corsa`, che e' la
 *  riga da non togliere. */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const U = 'C:/Users/Giuseppe/Webingegno/velocity/docs/provini'
/** in mezzo al beat 'velocita' (0,85 - 1,00): la camera e' ferma sugli occhi
 *  del guidatore, la strada corre, la vibrazione c'e' */
const Q = 0.93

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'],
})

/** una corsa su un formato. Torna le misure, o lancia se la pagina muore. */
async function corsa(nome, larg, alt, buco = false) {
  const p = await b.newPage({ viewport: { width: larg, height: alt }, deviceScaleFactor: 1 })
  // TUTTE LE ATTESE A DUE MINUTI. Il valore di serie e' 30 s, e uno screenshot
  // di questa scena puo' superarli quando la macchina sta anche generando
  // modelli. Il timeout cadeva sullo screenshot e sembrava un difetto del
  // sito: era solo lo strumento impaziente.
  p.setDefaultTimeout(120000)
  const t0 = Date.now()
  const passo = (m) => console.log(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`)
  p.on('pageerror', (e) => console.log('  [errore pagina]', e.message))
  // se il processo di rendering muore lo si vuole SAPERE, non dedurlo da un
  // messaggio che parla di navigazione
  p.on('crash', () => console.log('  [la pagina non c-e- piu-]'))

  try {
    // SI STACCA L'AGGIORNAMENTO A CALDO DI VITE, e questa e' la riga che ha
    // fatto la differenza fra quattro corse buttate e una corsa che finisce.
    //
    // Il sintomo era «Execution context was destroyed, most likely because of
    // a navigation» in mezzo allo scorrimento, sempre, anche senza toccare
    // niente. Sembrava un difetto dello strumento. Non lo era: BASTA CHE
    // QUALCUNO SALVI UN FILE IN `src/` — un'altra sessione al lavoro sullo
    // stesso progetto, e in questo caso `stile.css` — perche' Vite mandi un
    // aggiornamento a caldo, e per un modulo che non lo gestisce quello e' un
    // RICARICAMENTO DELLA PAGINA. La misura in corso muore con lei.
    //
    // Non l'ho dedotto: l'ho letto nella console della pagina, che stampava
    // «[vite] css hot updated», dopo aver dato la colpa prima al processo di
    // rendering e poi alle mie stesse modifiche.
    //
    // `/@vite/client` e' il modulo che apre il canale degli aggiornamenti.
    // Servendolo vuoto non c'e' piu' nessun canale — e a questo strumento non
    // serve, perche' carica la pagina, misura e se ne va. Il resto del server
    // di sviluppo continua a funzionare: i .ts vengono trasformati come
    // sempre, che e' cio' che serve per importare `Abitacolo.ts`.
    await p.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }))
    p.on('console', (m) => {
      const t = m.text()
      if (t.includes('[vite]')) console.log('  [vite]', t.slice(0, 90))
    })
    await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
    await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
    passo('pagina viva')
    await p.evaluate(() => {
      const h = document.getElementById('hud'); if (h) h.style.display = 'none'
      for (const s of ['.voci', '.testa']) {
        const e = document.querySelector(s); if (e) e.style.display = 'none'
      }
    })

    // I FOTOGRAMMI SI ASPETTANO A GRUPPI, non uno per volta: ogni `evaluate`
    // e' un giro di messaggi fra Node e il browser, e con un fotogramma per
    // giro il costo del PROTOCOLLO diventa paragonabile a quello del disegno.
    const frame = (n) => p.evaluate((n) => new Promise((r) => {
      let k = n
      const giro = () => (--k > 0 ? requestAnimationFrame(giro) : r())
      requestAnimationFrame(giro)
    }), n)

    // SI ARRIVA AL BEAT IN UN COLPO, scrivendo dentro il filtro.
    //
    // Scorrere a piccoli passi e' cio' che fanno gli altri strumenti, ed e'
    // giusto quando si vuole vedere il MOVIMENTO. Qui non serve: serve un
    // fotogramma fermo in mezzo al beat. E ogni passo costa un fotogramma
    // renderizzato in software, cioe' secondi — trenta passi sono mezzo
    // minuto di rendering per arrivare dove si puo' arrivare in uno.
    //
    // `Scorrimento.morbido` insegue `crudo` con inerzia: si posiziona il
    // documento E si porta il filtro gia' a destinazione, cosi' al primo
    // fotogramma la regia e' gia' dove deve essere e non ci resta niente da
    // inseguire.
    const corsaPx = await p.evaluate(([c, q]) => {
      window.scrollTo(0, c * q)
      esperienza.scorrimento.crudo = q
      esperienza.scorrimento.morbido = q
      // una velocita' plausibile: nel beat 'velocita' e' lei ad aprire il
      // campo visivo e a dosare la vibrazione, e un fotogramma con velocita'
      // zero mostrerebbe un'ottica che nel sito non si vede mai
      esperienza.scorrimento.velocita = 0.30
      return c
    }, [await p.evaluate(() => document.documentElement.scrollHeight - innerHeight), Q])
    await frame(4)
    passo(`arrivato al beat (corsa ${corsaPx} px)`)

    const esito = await p.evaluate(async () => {
      const mod = await import('/src/scene/Abitacolo.ts')
      const ab = new mod.Abitacolo()
      window.__ab = ab
      // ALLA SCENA E NON A `interno`: la posa che scrive `aggiorna` e' in
      // coordinate mondo, e `interno` e' a trasformazione identica solo per
      // ora.
      esperienza.scena.add(ab.mesh)

      // SI SPENGONO I FIGLI DI `interno`, NON IL GRUPPO.
      //
      // `Esperienza.fotogramma` riscrive `interno.visible` a ogni fotogramma:
      // spegnere il gruppo da qui durerebbe meno di un fotogramma. I figli
      // invece non li tocca nessuno. Vanno spenti perche' la plancia generata
      // sta a poco piu' di un metro dagli occhi — dietro la fotografia, ma
      // DAVANTI alla strada — e comparirebbe dentro il buco del parabrezza al
      // posto della lastra, che e' esattamente cio' che questa prova deve
      // guardare.
      for (const o of esperienza.interno.children) o.visible = false

      // IL PIANO SI RIMETTE IN POSA A OGNI FOTOGRAMMA, in un ciclo suo.
      //
      // Gira DOPO `Esperienza.fotogramma` (le rAF partono in ordine di
      // iscrizione e la sua era gia' in coda), quindi la posa che si vede e'
      // quella calcolata un fotogramma prima. Qui non conta: nel beat
      // 'velocita' la camera e' ferma e vibra di un millimetro e mezzo. Nel
      // sito vero la chiamata va dentro `fotogramma`, subito dopo `inquadra`
      // — vedi le cinque righe in fondo a `scene/Abitacolo.ts`.
      const ciclo = () => { ab.aggiorna(esperienza.camera); requestAnimationFrame(ciclo) }
      requestAnimationFrame(ciclo)

      await new Promise((r) => {
        const attendi = () => (ab.pronto ? r() : setTimeout(attendi, 100))
        attendi()
      })
      return { beat: esperienza.regia.beat, locale: +esperienza.regia.locale.toFixed(2) }
    })
    passo('abitacolo costruito e pronto')
    await frame(6)

    /** LA VERIFICA NUMERICA, che lo screenshot da solo non da'.
     *
     *  1. il piano riempie il quadro: si proiettano i quattro angoli del piano
     *     sullo schermo e si guarda se il rettangolo che formano CONTIENE il
     *     viewport. Se l'adattamento al formato sbagliasse verso, resterebbe
     *     una banda scoperta e questo numero la vedrebbe.
     *  2. il quadro strumenti cade dove deve: si proietta il centro
     *     restituito da `riquadroQuadro` e si confronta con lo stesso punto
     *     calcolato per l'altra strada — dalle coordinate immagine, passando
     *     per il ritaglio, fino ai pixel — senza toccare nessuna geometria.
     *     Due conti indipendenti sullo stesso punto: se non tornano, uno dei
     *     due e' sbagliato. */
    const misure = await p.evaluate(() => {
      const V3 = window.__V3
      const cam = esperienza.camera
      const ab = window.__ab
      const suSchermo = (v) => {
        const q = v.clone().project(cam)
        return [(q.x * 0.5 + 0.5) * innerWidth, (-q.y * 0.5 + 0.5) * innerHeight]
      }
      const angoli = []
      for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) {
        angoli.push(suSchermo(ab.mesh.localToWorld(new V3(sx, sy, 0))))
      }
      const xs = angoli.map((a) => a[0]); const ys = angoli.map((a) => a[1])
      const r = ab.riquadroQuadro(cam)

      const F = 16 / 9
      let ripX = 1, ripY = 1
      if (cam.aspect >= F) ripY = F / cam.aspect; else ripX = cam.aspect / F
      const offX = Math.min(Math.max(0.5 - ripX / 2, 0), 1 - ripX)
      const offY = Math.min(Math.max(0.5 - ripY / 2, 0), 1 - ripY)
      const ix = 0.5 * (0.362 + 0.592), iy = 0.5 * (0.376 + 0.498)
      return {
        formato: +cam.aspect.toFixed(3),
        fov: +cam.fov.toFixed(1),
        pianoPx: [+(Math.max(...xs) - Math.min(...xs)).toFixed(0), +(Math.max(...ys) - Math.min(...ys)).toFixed(0)],
        riempie: Math.min(...xs) <= 0.5 && Math.min(...ys) <= 0.5 &&
                 Math.max(...xs) >= innerWidth - 0.5 && Math.max(...ys) >= innerHeight - 0.5,
        ritaglio: [+ripX.toFixed(3), +ripY.toFixed(3)],
        quadroDaGeometria: suSchermo(r.centro).map((v) => +v.toFixed(0)),
        quadroDaImmagine: [
          +(((ix - offX) / ripX) * innerWidth).toFixed(0),
          +((1 - (1 - iy - offY) / ripY) * innerHeight).toFixed(0),
        ],
        quadroMetri: [+r.larghezza.toFixed(3), +r.altezza.toFixed(3)],
      }
    })

    await p.screenshot({ path: `${U}/${nome}.jpeg`, type: 'jpeg', quality: 88 })
    passo('scattato')

    if (buco) {
      // LA PROVA DEL BUCO, e serve perche' il primo scatto NON la da'.
      //
      // Nella fotografia c'e' gia' un colonnato illuminato oltre il
      // parabrezza. Guardando lo scatto non si distingue quel colonnato dalla
      // strada che sta dietro: se la maschera non funzionasse per niente, il
      // fotogramma sarebbe quasi identico — e uno strumento che non sa dire
      // fra funziona e non funziona non e' una prova, e' una rassicurazione.
      //
      // Quindi si tinge la lastra della strada di magenta. Il magenta in
      // questa scena non esiste: dove compare, li' il piano e' trasparente e
      // si vede cio' che c'e' dietro. Dove non compare, il piano copre.
      await p.evaluate(() => {
        const m = esperienza.lastra.mesh.material
        m.map = null
        m.color.setRGB(1, 0, 1)
        m.needsUpdate = true
      })
      await frame(6)
      await p.screenshot({ path: `${U}/${nome}_buco.jpeg`, type: 'jpeg', quality: 88 })
      passo('scattata la prova del buco')
    }

    return { esito, misure }
  } finally {
    await p.close().catch(() => {})
  }
}

for (const [nome, larg, alt, buco] of [['abitacolo_prova', 1000, 500, true], ['abitacolo_prova_telefono', 360, 760, false]]) {
  // DUE TENTATIVI. Il processo di rendering software muore ogni tanto, e
  // quando muore non c'e' niente da capire: si rifa'. Ritentare in silenzio
  // sarebbe peggio che fallire, quindi lo si stampa.
  let riuscito = false
  for (let t = 1; t <= 2 && !riuscito; t++) {
    try {
      const r = await corsa(nome, larg, alt, buco)
      console.log(nome, `${larg}x${alt}`, r.esito, r.misure)
      riuscito = true
    } catch (e) {
      console.log(`  [tentativo ${t} fallito] ${e.message.split('\n')[0]}`)
    }
  }
  if (!riuscito) console.log(nome, 'NON RIUSCITO')
}
await b.close()
