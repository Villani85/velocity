/**
 * LA TIPOGRAFIA SI MISURA, NON SI GUARDA.
 *
 * Il difetto del testo su una scena 3D non e' che "sta stretto": e' che
 * COPRE il soggetto, e la copertura non si vede finche' non si mette un
 * numero sotto.
 *
 * E il numero sposta il sospetto. Qui si partiva convinti che il titolo sul
 * telefono fosse troppo grande, tarato sul desktop. Misurato: 41px, due
 * righe, il 10,5% dell'altezza a 390x844 — non e' grande. Grande era il
 * BLOCCO, perche' la fila dei dati restava in flusso a opacita' zero e i
 * suoi ~110px di ingombro vuoto spingevano il titolo di un settimo di
 * schermo verso l'alto, cioe' addosso alla macchina. Nessuno l'avrebbe mai
 * indovinato guardando un provino: si vede un titolo, non un ingombro
 * invisibile sotto di lui.
 *
 * QUINDI QUI SI MISURANO TRE COSE, per ogni formato e per ogni beat:
 *
 *  1. il RETTANGOLO DEL TITOLO in percentuale di larghezza e altezza del
 *     viewport. Non il box dell'elemento — che e' largo quanto la colonna
 *     anche dove non c'e' inchiostro — ma l'unione delle righe vere, presa
 *     con un Range: e' quella che si vede.
 *  2. il TRABOCCO: `scrollWidth > clientWidth` su ogni pezzo di testo, piu'
 *     il caso peggiore, cioe' una riga che esce dai bordi del viewport.
 *     Un titolo che trabocca su un telefono non si accorcia: taglia.
 *  3. la COPERTURA DEL SOGGETTO. Il riquadro centrale non e' un ritaglio
 *     arbitrario: e' la proiezione sullo schermo dei vertici dell'auto (o
 *     della plancia, quando si e' dentro), la stessa misura di
 *     `formati.mjs`. Poi si campiona quel riquadro su una griglia e si
 *     conta quanti campioni cadono sotto una riga di testo. La griglia
 *     serve perche' le righe si sovrappongono e sommare le aree
 *     conterebbe due volte le stesse zone.
 *
 * LA PRESENZA VA STAMPATA INSIEME AL RESTO. Le voci dissolvono con il
 * progresso: misurare un titolo a `--presenza` 0,03 significa misurare una
 * cosa che nessuno vede. Le tappe qui sotto sono scelte a meta' beat
 * proprio perche' la presenza sia 1.
 *
 * I PROVINI SI TENGONO IN MEMORIA E SI SCRIVONO ALLA FINE, e questa riga
 * costa quattro esecuzioni buttate.
 *
 * L'errore era `page.evaluate: Execution context was destroyed, most likely
 * because of a navigation`, e la parola "navigation" sembrava una formula di
 * rito: la pagina non naviga da nessuna parte. Il listener su
 * `framenavigated`, messo apposta per distinguere una scheda morta da una
 * pagina ricaricata, ha stampato `!! navigazione a http://localhost:5174/`.
 * Era una navigazione davvero.
 *
 * E la traccia dice quando: il primo provino scritto in `docs/provini/`, poi
 * subito la ricarica. E' lo STESSO difetto che `vite.config.ts` racconta di
 * aver risolto — «ogni riga di log scritta li' dentro faceva scattare un
 * ricaricamento» — solo che la cura non cura piu': il controllore di Vite 8
 * non e' piu' quello che accettava i motivi glob, e una stella-barra-docs
 * in `server.watch.ignored` oggi non esclude niente. Il difetto e' tornato
 * identico, in silenzio, perche' l'esclusione fallisce senza dire nulla.
 *
 * Qui non si aggira il difetto: lo si toglie di mezzo. `p.screenshot()`
 * senza `path` restituisce i byte. Quindici provini da ~150 kB stanno in
 * memoria senza che nessuno se ne accorga, e si scrivono su disco DOPO
 * `b.close()`, quando una ricarica non ha piu' niente da rompere.
 *
 * Il corollario vale lo stesso: non si tocca `src/` mentre questo gira. Un
 * `.ts` modificato a meta' corsa manda un ricaricamento pieno e la misura
 * muore allo stesso modo.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { writeFileSync } from 'node:fs'

const FUORI = 'C:/Users/Giuseppe/Webingegno/velocity/docs/provini'

/**
 * SI MISURA IL SITO COSTRUITO, NON QUELLO IN SVILUPPO.
 *
 * Il server di sviluppo ricarica la pagina da solo, a intervalli, e non per
 * qualcosa che facciamo noi: il listener su `framenavigated` ha stampato
 * `!! navigazione a http://localhost:5174/` a meta' corsa in quattro
 * esecuzioni su cinque, con `src` intoccato e i provini tenuti in memoria.
 * Una corsa completa dura mezz'ora; una ricarica ogni cinque minuti
 * significa che non finira' mai.
 *
 * Contro un `vite preview` non c'e' niente da ricaricare: e' un server
 * statico, senza controllore dei file e senza HMR. In piu' si misura la
 * roba che va in produzione — stesso CSS passato dal minificatore, stesse
 * unita' — che e' cio' di cui si vuole sapere il comportamento. Il server di
 * sviluppo resta buono per guardare; per misurare no.
 *
 *   npx vite build
 *   npx vite preview --port 5199   (in un'altra finestra)
 *   VELOCITY_URL=http://localhost:5199/ node strumenti/tipografia.mjs --prima
 */
const SITO = process.env.VELOCITY_URL ?? 'http://localhost:5174/'
/** con `--prima` ogni tappa viene misurata due volte, con il vecchio
 *  impaginato e con quello nuovo, sullo stesso fotogramma */
const CONFRONTO = process.argv.includes('--prima')

// TRE FORMATI E NON QUATTRO. Il telefono e' il caso di studio; gli altri due
// sono la guardia: 1600x1000 e' il desktop su cui la scena e' stata tarata,
// 1280x800 e' il portatile piu' comune ed e' li' che un `vw` troppo generoso
// si vede per primo.
//
// TUTTO A dpr 1, e non e' una rinuncia. A dpr 2 la scheda si e' schiantata
// ("Target crashed") mentre l'ambiente finiva di caricare: qui il WebGL gira
// in software (`--enable-unsafe-swiftshader`) e 780x1688 di framebuffer con
// ventidue luci e due passate non ci stanno. La misura che serve qui e'
// tipografica, ed e' in pixel CSS: la densita' non la cambia di un decimo.
// Il provino esce meno inciso, e' l'unico prezzo.
//
// IL PIU' GRANDE PER PRIMO, perche' la scheda si apre a quella misura e
// rimpicciolire un bersaglio di rendering costa meno che ingrandirlo.
//
// IL TELEFONO PER PRIMO, e questa e' una lezione di sessione piu' che di
// tipografia. Su una macchina contesa — piu' browser headless insieme, il
// WebGL in software — una corsa completa puo' durare quaranta minuti o non
// finire. L'ordine dei formati decide quale meta' del lavoro si porta a casa
// se si deve tagliare corto, e il caso di studio non puo' essere l'ultimo
// della fila. `--solo=telefono` restringe ancora, quando serve solo lui.
const FORMATI = [
  ['telefono', 390, 844],
  ['1600x1000', 1600, 1000],
  ['1280x800', 1280, 800],
].filter((f) => {
  const solo = process.argv.find((a) => a.startsWith('--solo='))
  return !solo || f[0] === solo.slice(7)
})

// A META' BEAT, dove `--presenza` vale 1. I confini stanno in Regia.ts:
// hero 0-0,15 | orbita 0,15-0,40 | lato 0,40-0,62 | taglio 0,62-0,75 |
// accensione 0,75-0,85 | velocita 0,85-1. `taglio` non ha voce ed e' escluso:
// non c'e' tipografia da misurare dove il racconto tace.
const TAPPE = [
  ['hero', 0.06],
  ['orbita', 0.25],
  ['lato', 0.49],
  ['accensione', 0.79],
  ['velocita', 0.925],
]

/**
 * L'IMPAGINATO DI PRIMA, TENUTO PER IL CONFRONTO.
 *
 * La copertura del soggetto non si puo' confrontare fra due esecuzioni
 * diverse: la camera non si ferma mai allo stesso millesimo e l'auto non e'
 * mai nello stesso punto, quindi la differenza fra 24% e 31% potrebbe essere
 * tutta della camera. Iniettando le vecchie regole NELLA STESSA PAGINA e
 * misurando lo STESSO fotogramma, l'unica variabile che cambia e' la
 * tipografia — che e' l'unica cosa di cui si vuole sapere l'effetto.
 *
 * E' lo stato del 20 agosto, prima di questo giro. Si applica solo con
 * `--prima`, e serve una volta: quando questi numeri saranno in un rapporto,
 * questo blocco potra' sparire.
 */
const PRIMA = `
:root { --margine: clamp(20px, 4.5vw, 64px); }
.voci { bottom: clamp(28px, 6vh, 72px); }
.voci__occhiello { font-size: clamp(10px, 1.05vw, 12px); }
.voci__titolo { font-size: clamp(38px, 7.4vw, 108px); }
.voci__fatti { position: fixed; bottom: clamp(28px, 6vh, 72px); }
@media (max-width: 820px) {
  .voci { max-width: none; bottom: clamp(56px, 12vh, 96px); }
  .voci__titolo { font-size: clamp(34px, 10.5vw, 60px); }
  .voci__riga { max-width: none; font-size: clamp(14px, 3.6vw, 17px); }
  .voci__fatti {
    position: static; display: flex; flex-wrap: wrap; max-width: 42%;
    justify-content: flex-end; gap: clamp(14px, 4.5vw, 26px);
    margin-top: clamp(16px, 3vh, 26px); column-gap: normal;
  }
  .voci__fatti dt, .voci__fatti dd { white-space: normal; }
  .voci:not([data-tempo='hero']) .voci__fatti { display: flex; }
}`

const misura = () => {
  const L = innerWidth
  const A = innerHeight

  // LE RIGHE VERE, e la prima versione le sbagliava. Un Range sull'intero
  // elemento restituisce anche i box dei figli di blocco: gli `<span>` del
  // titolo sono `display:block`, quindi larghi quanto la colonna, e il
  // titolo risultava largo l'89,7% del viewport su un telefono dove
  // l'inchiostro arriva al 68%. Si misurava il contenitore e si chiamava
  // tipografia. Un Range per NODO DI TESTO restituisce un rettangolo per
  // riga vera, e quello e' l'inchiostro.
  const righe = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return []
    const out = []
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const r = document.createRange()
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.nodeValue.trim()) continue
      r.selectNodeContents(n)
      for (const q of r.getClientRects()) if (q.width > 0.5 && q.height > 0.5) out.push(q)
    }
    return out
  }
  const unione = (rs) => {
    if (!rs.length) return null
    return {
      x: Math.min(...rs.map((r) => r.left)),
      y: Math.min(...rs.map((r) => r.top)),
      r: Math.max(...rs.map((r) => r.right)),
      b: Math.max(...rs.map((r) => r.bottom)),
    }
  }

  const PEZZI = ['.voci__occhiello', '.voci__titolo', '.voci__riga', '.voci__fatti']
  const tutte = PEZZI.flatMap(righe)

  // LA FILA DEI DATI VA CONTATA IN RIGHE, non guardata. Il difetto di oggi
  // sul telefono e' che si spezza in due bande allineate a DESTRA mentre il
  // titolo e' allineato a sinistra: due assi diversi a due centimetri di
  // distanza. Si conta quante quote distinte occupano i `dd`, e da dove
  // partono rispetto al titolo.
  const dd = [...document.querySelectorAll('.voci__fatti dd')].flatMap((el) => {
    const r = document.createRange(); r.selectNodeContents(el)
    return [...r.getClientRects()].filter((q) => q.width > 0.5)
  })
  const fatti = {
    righe: new Set(dd.map((q) => Math.round(q.top))).size,
    sinistra: dd.length ? Math.round(Math.min(...dd.map((q) => q.left))) : null,
    posizione: getComputedStyle(document.querySelector('.voci__fatti')).position,
  }

  const t = unione(righe('.voci__titolo'))
  const titolo = t
    ? {
        largo: +((t.r - t.x) / L * 100).toFixed(1),
        alto: +((t.b - t.y) / A * 100).toFixed(1),
        cima: +(t.y / A * 100).toFixed(1),
        fondo: +(t.b / A * 100).toFixed(1),
        righe: righe('.voci__titolo').length,
      }
    : null

  // TRABOCCO. Due domande diverse: il contenuto sfonda il suo contenitore
  // (scrollWidth) oppure il contenitore sfonda il viewport (right/left).
  // La seconda e' quella che taglia le lettere sul telefono.
  const trabocco = []
  for (const sel of PEZZI) {
    const el = document.querySelector(sel)
    if (!el) continue
    if (el.scrollWidth > el.clientWidth + 1) trabocco.push(`${sel} scrollW ${el.scrollWidth}>${el.clientWidth}`)
    for (const q of righe(sel)) {
      if (q.right > L + 1) trabocco.push(`${sel} esce a destra +${Math.round(q.right - L)}px`)
      if (q.left < -1) trabocco.push(`${sel} esce a sinistra ${Math.round(q.left)}px`)
      if (q.bottom > A + 1) trabocco.push(`${sel} esce sotto +${Math.round(q.bottom - A)}px`)
    }
  }
  const de = document.documentElement
  if (de.scrollWidth > de.clientWidth + 1) trabocco.push(`documento scrollW ${de.scrollWidth}>${de.clientWidth}`)

  // IL RIQUADRO DEL SOGGETTO, proiettato. Dentro l'abitacolo il soggetto e'
  // la plancia: misurare l'auto da dentro darebbe un riquadro grande quanto
  // lo schermo e una copertura sempre bassa, cioe' una misura consolante.
  const e = window.esperienza
  const dentro = e.regia.beat === 'accensione' || e.regia.beat === 'velocita'
  const g = dentro ? e.planciaVera : e.autoVera
  let sog = null
  if (g) {
    const cam = e.camera
    cam.updateMatrixWorld(true)
    cam.updateProjectionMatrix()
    const V = window.__V3
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0
    g.traverse((o) => {
      if (!o.isMesh) return
      const pos = o.geometry.attributes.position
      const passo = Math.max(1, Math.floor(pos.count / 400))
      for (let i = 0; i < pos.count; i += passo) {
        const v = new V(pos.getX(i), pos.getY(i), pos.getZ(i))
        v.applyMatrix4(o.matrixWorld).project(cam)
        if (v.z >= 1) continue
        const sx = (v.x * 0.5 + 0.5) * L
        const sy = (1 - (v.y * 0.5 + 0.5)) * A
        if (sx < x0) x0 = sx
        if (sy < y0) y0 = sy
        if (sx > x1) x1 = sx
        if (sy > y1) y1 = sy
        n++
      }
    })
    if (n > 20) {
      x0 = Math.max(0, x0); y0 = Math.max(0, y0)
      x1 = Math.min(L, x1); y1 = Math.min(A, y1)
      if (x1 > x0 && y1 > y0) sog = { x: x0, y: y0, r: x1, b: y1 }
    }
  }
  // se la proiezione non e' disponibile si ripiega sul terzo centrale: e'
  // meno onesto ma non lascia la casella vuota
  const rq = sog ?? { x: L * 0.2, y: A * 0.2, r: L * 0.8, b: A * 0.8 }

  // COPERTURA A GRIGLIA. 160x160 campioni: l'errore di quantizzazione resta
  // sotto lo 0,7% su ogni lato, che e' un decimo della differenza che
  // stiamo cercando di leggere.
  const N = 160
  let coperti = 0
  for (let i = 0; i < N; i++) {
    const px = rq.x + (rq.r - rq.x) * ((i + 0.5) / N)
    for (let j = 0; j < N; j++) {
      const py = rq.y + (rq.b - rq.y) * ((j + 0.5) / N)
      for (const q of tutte) {
        if (px >= q.left && px <= q.right && py >= q.top && py <= q.bottom) { coperti++; break }
      }
    }
  }

  return {
    beat: e.regia.beat,
    locale: +e.regia.locale.toFixed(2),
    presenza: +(getComputedStyle(document.querySelector('.voci')).opacity),
    titolo,
    fatti,
    corpoTitolo: Math.round(parseFloat(getComputedStyle(document.querySelector('.voci__titolo')).fontSize)),
    trabocco,
    soggetto: sog ? 'proiettato' : 'ripiego',
    riquadro: {
      largo: +((rq.r - rq.x) / L * 100).toFixed(0),
      alto: +((rq.b - rq.y) / A * 100).toFixed(0),
    },
    copertura: +(coperti / (N * N) * 100).toFixed(1),
    // il fondo dichiarato, per leggere il respiro insieme alla regola che lo
    // produce. `svh` dice se il ramo che riserva la barra del browser e'
    // attivo: in un browser senza barra vale 0, ma esistere e valere zero
    // sono due cose diverse e vanno distinte nel rapporto
    fondo: getComputedStyle(document.querySelector('.voci')).bottom,
    svh: CSS.supports('height: 100svh'),
    // quanto respiro resta sotto l'ultima riga: sul telefono e' lo spazio
    // che la barra del browser si mangia quando ricompare
    respiro: (() => {
      const u = unione(tutte)
      return u ? Math.round(A - u.b) : null
    })(),
  }
}

const esito = []
/** [percorso, byte] — si svuota su disco solo a browser chiuso */
const provini = []

/**
 * UNA SOLA SCHEDA PER TUTTI E TRE I FORMATI, e ci sono voluti tre tentativi
 * per capire che era l'unica strada.
 *
 * Aprendo una pagina per formato, il processo del browser moriva: non la
 * scheda — l'intero browser, e i due formati successivi fallivano su
 * `newPage` con "browser has been closed". Qui il WebGL gira in software
 * (`--enable-unsafe-swiftshader`) e caricare tre volte 460k triangoli,
 * ventidue luci e le tessiture in una sessione sola non ci sta.
 *
 * `setViewportSize` invece riusa la scena: si carica una volta e si cambiano
 * le misure della finestra, che e' anche cio' che fa un utente che gira il
 * telefono. Costa una rinuncia dichiarata: `isMobile` e `deviceScaleFactor`
 * si fissano alla creazione del contesto e non si possono cambiare in corsa,
 * quindi il telefono viene misurato senza emulazione mobile. Per la
 * TIPOGRAFIA non cambia niente — la larghezza di layout e' quella, il meta
 * viewport e' `width=device-width` e le misure sono in pixel CSS — e in
 * cambio la corsa dura un terzo e non muore.
 */
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
// SI DICHIARA CHI MUORE. Un "Execution context was destroyed" senza altro
// contesto lascia due ipotesi indistinguibili — la pagina e' navigata,
// oppure il renderer e' caduto — e si finisce a sospettare il sito.
p.on('crash', () => console.log('  !! scheda caduta'))
p.on('framenavigated', (f) => { if (!f.parentFrame()) console.log('  !! navigazione a', f.url()) })
// DUE MINUTI SU TUTTO. Il valore di serie e' 30 s e lo screenshot di questa
// scena — 460k triangoli, ventidue luci, riflesso e grading — li supera
// quando la macchina ha altro da fare. Il timeout cadeva sullo scatto e
// sembrava un difetto del sito: era solo lo strumento impaziente.
p.setDefaultTimeout(120000)
// SI SERVE VUOTO IL CLIENT DI VITE. Se questo strumento viene puntato sul
// server di sviluppo — cosa legittima, e' l'indirizzo di serie — chiunque
// salvi un file in `src` mentre la corsa e' a meta' manda un ricaricamento e
// la misura muore. Senza `@vite/client` la pagina non apre nemmeno il canale
// dell'aggiornamento a caldo: resta il sito, se ne va il telecomando.
await p.route('**/@vite/client', (r) => r.fulfill({ contentType: 'text/javascript', body: 'export {}' }))
await p.goto(SITO, { waitUntil: 'load' })
await p.waitForFunction(() => window.esperienza?.autoPronta, null, { timeout: 150000 })
await p.waitForFunction(() => window.esperienza?.planciaPronta, null, { timeout: 150000 }).catch(() => console.log('  (plancia non pronta)'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

/** da dove siamo adesso: si ramerza sempre dalla posizione vera, anche
 *  quando si torna indietro per ricominciare un formato */
let da = 0

async function giro(nome, L, A) {
  await p.setViewportSize({ width: L, height: A })
  // il ridimensionamento rifa' il bersaglio di rendering e la camera: si
  // lascia respirare mezzo secondo prima di chiedere l'altezza della corsa,
  // altrimenti `scrollHeight` e' ancora quello di prima
  await p.waitForTimeout(600)
  const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

  console.log(`\n  ${nome}  ${L}x${A}${CONFRONTO ? '   (— vecchio impaginato, + nuovo)' : ''}`)
  console.log('  beat        pres  corpo  titolo L%xA%   cima%  fondo%  righe  dati  sogg L%xA%  copre%  respiro  trabocco')

  const parziale = []
  for (const [tappa, q] of TAPPE) {
    // SI ARRIVA SCORRENDO, NON SALTANDO: la regia e le voci sono funzioni del
    // progresso e un salto secco salterebbe le dissolvenze.
    //
    // E LA RAMPA STA IN UN SOLO `evaluate`. Prima erano ottanta chiamate CDP
    // per tappa, e con il WebGL in software una di quelle cadeva regolarmente
    // con "Execution context was destroyed": non era una navigazione, era il
    // renderer che moriva fra un giro e l'altro. Un solo passaggio dentro la
    // pagina lascia una sola finestra in cui puo' rompersi, e quando si rompe
    // si sa dove.
    await p.evaluate(async ([c, v0, v1]) => {
      const raf = () => new Promise((r) => requestAnimationFrame(r))
      for (let i = 1; i <= 40; i++) { window.scrollTo(0, c * (v0 + (v1 - v0) * (i / 40))); await raf() }
      for (let i = 0; i < 18; i++) await raf()
    }, [corsa, da, q])
    da = q

    const riga = (m, eti) => {
      const t = m.titolo
      return `  ${eti.padEnd(11)} ${m.presenza.toFixed(2)}  ${String(m.corpoTitolo).padStart(4)}px  ` +
        `${(t ? `${t.largo}x${t.alto}` : '—').padStart(11)}  ` +
        `${(t ? t.cima : '—').toString().padStart(5)}  ${(t ? t.fondo : '—').toString().padStart(6)}  ` +
        `${(t ? t.righe : '—').toString().padStart(5)}  ` +
        `${`${m.fatti.righe}r@${m.fatti.sinistra}`.padStart(6)}  ` +
        `${`${m.riquadro.largo}x${m.riquadro.alto}`.padStart(10)}  ` +
        `${m.copertura.toFixed(1).padStart(6)}  ${String(m.respiro).padStart(7)}  ` +
        (m.trabocco.length ? m.trabocco.join(' | ') : 'no')
    }

    const m = await p.evaluate(misura)
    m.formato = nome
    m.tappa = tappa

    // il confronto va fatto sullo STESSO fotogramma: si spegne il foglio,
    // si misura, lo si riaccende. Non si tocca lo scorrimento, quindi la
    // camera e' ferma dov'era e l'unica differenza e' la tipografia.
    if (CONFRONTO) {
      m.prima = await p.evaluate(async ([css, f]) => {
        const s = document.createElement('style')
        s.id = '__prima'
        s.textContent = css
        document.head.appendChild(s)
        await new Promise((r) => requestAnimationFrame(r))
        const v = new Function(`return (${f})()`)()
        s.remove()
        return v
      }, [PRIMA, misura.toString()])
      console.log(riga(m.prima, `${tappa} —`))
    }
    parziale.push(m)
    console.log(riga(m, CONFRONTO ? `${tappa} +` : tappa))

    provini.push([`${FUORI}/tipo_${nome}_${tappa}.jpeg`, await p.screenshot({ type: 'jpeg', quality: 86 })])
  }
  return parziale
}

for (const [nome, L, A] of FORMATI) {
  try { esito.push(...(await giro(nome, L, A))) }
  catch (e) { console.log(`  !! ${nome} caduto: ${String(e).split('\n')[0]}`) }
}
await p.close()
await b.close()

// ADESSO si scrive: il browser e' chiuso, e il ricaricamento che Vite manda
// a ogni file nuovo dentro `docs/` non ha piu' nessuna pagina da buttare giu'
for (const [dove, byte] of provini) writeFileSync(dove, byte)
console.log(`\n  ${provini.length} provini in ${FUORI}`)

writeFileSync('C:/Users/Giuseppe/Webingegno/velocity/docs/misure/tipografia.json', JSON.stringify(esito, null, 1))

// IL RIASSUNTO SERVE PIU' DELLA TABELLA. Tre numeri per formato: il titolo
// piu' grosso, la copertura peggiore, il respiro minimo. Sono quelli che
// dicono se il telefono e' un progetto o un desktop rimpicciolito.
console.log('\n  peggiori per formato')
const peggio = (f) => ({
  alt: Math.max(...f.map((m) => m.titolo?.alto ?? 0)),
  cop: Math.max(...f.map((m) => m.copertura)),
  res: Math.min(...f.map((m) => m.respiro ?? 9999)),
  dat: Math.max(...f.map((m) => m.fatti.righe)),
  tra: f.reduce((n, m) => n + m.trabocco.length, 0),
})
const stampa = (eti, x) =>
  console.log(`  ${eti.padEnd(14)} titolo max ${x.alt.toFixed(1)}% h   copertura max ${x.cop.toFixed(1)}%   ` +
    `respiro min ${String(x.res).padStart(3)}px   righe dati max ${x.dat}   traboccamenti ${x.tra}`)
for (const [nome] of FORMATI) {
  const f = esito.filter((m) => m.formato === nome)
  if (!f.length) { console.log(`  ${nome.padEnd(14)} nessuna misura`); continue }
  if (CONFRONTO && f[0].prima) stampa(`${nome} —`, peggio(f.map((m) => m.prima)))
  stampa(CONFRONTO ? `${nome} +` : nome, peggio(f))
  console.log(`  ${''.padEnd(14)} fondo dichiarato ${f[0].fondo}${f[0].svh ? '  (ramo svh/lvh attivo)' : '  (NIENTE svh: si riserva solo il safe-area)'}`)
}
