/**
 * FERMO — la prova che con `prefers-reduced-motion` la scena STA DAVVERO
 * FERMA.
 *
 * PERCHE' ESISTE, e perche' non poteva essere un controllo sul codice.
 *
 * Il sito promette da mesi una cosa precisa, scritta in `core/Scorrimento.ts`
 * e ripetuta in testa a `index.html`: chi chiede meno movimento non riceve
 * meno sito, riceve lo stesso sito senza il movimento che gli fa male. E'
 * l'argomento giusto — qui l'accelerazione e' la cosa che fa l'utente, non
 * un'animazione che parte da sola — ed e' anche la promessa piu' facile da
 * fare a vuoto: nessuno se ne accorge, perche' per accorgersene bisogna aprire
 * la pagina con quella preferenza accesa E STARE FERMI A GUARDARE.
 *
 * Nessun controllo statico lo trova. Si puo' cercare `prefers-reduced-motion`
 * in tutto il progetto, trovarlo in sei posti, e avere lo stesso una grana di
 * pellicola che sfarfalla ventiquattro volte al secondo, una strada che scorre
 * a mano ferma, una lancetta che ondeggia sul minimo e una camera che trema
 * con `Math.random()`. Erano tutte e quattro li' dentro, e stanno in file che
 * la parola `reduce` non la contengono nemmeno.
 *
 * L'UNICA DOMANDA CHE CONTA, quindi, e' fotografica: apri la pagina, mettiti
 * in un tempo, NON TOCCARE PIU' NIENTE, e guarda se due fotogrammi lontani due
 * secondi sono lo stesso fotogramma.
 *
 * COME SI MISURA.
 *
 * Un pixel «e' cambiato» se uno dei tre canali si sposta di piu' di SEI
 * livelli su 255. La soglia non e' zero apposta: fra due passate identiche
 * restano il disturbo del dithering, il tono mappato al bordo dei gradienti e
 * l'arrotondamento del PNG, e a soglia zero un'immagine ferma risulterebbe
 * mossa — cioe' il metro direbbe sempre di no e non servirebbe a niente. Sei
 * livelli sono sotto la soglia in cui l'occhio distingue due grigi vicini, e
 * abbastanza sopra il rumore.
 *
 * IL CANCELLO E' L'UNO PER CENTO DEI PIXEL. Non zero, per la stessa ragione,
 * e nemmeno il cinque: un movimento vero in questa scena — la strada, la
 * grana, la camera — non tocca l'uno per cento dello schermo, ne tocca dal
 * trenta al cento. Fra «ferma» e «si muove» qui non c'e' una zona grigia, e
 * infatti la misura o esce sotto lo zero virgola o esce sopra il venti.
 *
 * COSA NON SI CONTA, e va dichiarato invece che nascosto: il pannello `#hud`
 * si spegne prima di misurare. Non e' il sito — e' il pannello di diagnosi che
 * si accende con il tasto H, scritto per chi costruisce, e ci stanno dentro i
 * millisecondi per fotogramma. Contarlo vorrebbe dire misurare lo strumento
 * invece della scena. Tutto il resto resta acceso, compreso il quadro
 * strumenti dell'abitacolo con i suoi numeri veri.
 *
 *     node strumenti/fermo.mjs             tutti e sette i tempi
 *     node strumenti/fermo.mjs velocita    uno solo
 *
 * Esce con errore se anche un solo tempo supera il cancello, e stampa sempre
 * la percentuale — anche quando passa, perche' un numero che si vede e' un
 * numero che si puo' confrontare con quello della settimana prossima.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)('sharp')
const BASE = process.env.BASE_URL || 'http://localhost:5174/'
const L = 1400, A = 875

/** quanto si deve spostare un canale perche' il pixel conti come cambiato */
const SOGLIA = 6
/** quanta parte dello schermo puo' cambiare e passare lo stesso, in frazione */
const CANCELLO = 0.01
/** quanto si aspetta fra le due fotografie, in millisecondi */
const DISTANZA = 2000
/** quanto si lascia assestare la scena dopo essersi messi nel tempo */
const RIPOSO = 2500

/* I SETTE TEMPI, ognuno preso a META' del suo beat.
   I confini sono quelli di `core/Regia.ts` — hero .13, orbita .34, lato .53,
   taglio .645, accensione .725, velocita .815, contatto 1 — e si campiona in
   mezzo e non sul bordo per una ragione precisa: sul confine la scena sta
   scambiando due mondi (l'esterno con il corridoio, il corridoio con
   l'abitacolo) e una misura presa li' direbbe cose sullo scambio invece che
   sul tempo. In mezzo c'e' il fotogramma che uno guarda davvero. */
const TEMPI = [
  ['hero', 0.06],
  ['orbita', 0.24],
  ['lato', 0.44],
  ['taglio', 0.59],
  ['accensione', 0.685],
  ['velocita', 0.77],
  ['contatto', 0.90],
]

const scelto = process.argv[2]
const daFare = scelto ? TEMPI.filter(([n]) => n === scelto) : TEMPI
if (!daFare.length) {
  console.error('tempo sconosciuto:', scelto, '— quelli buoni sono', TEMPI.map(([n]) => n).join(', '))
  process.exit(2)
}

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})

/* LA PREFERENZA SI ACCENDE SUL CONTESTO, non con una media query finta.
   `reducedMotion: 'reduce'` fa rispondere `matchMedia` esattamente come
   risponde sulla macchina di chi ha spento le animazioni nel sistema
   operativo: e' la stessa strada che percorre il CSS e la stessa che percorre
   `core/Moto.ts`. Simularla scrivendo una classe sulla radice proverebbe che
   funziona la classe, non che funziona la preferenza. */
const ctx = await b.newContext({ viewport: { width: L, height: A }, reducedMotion: 'reduce' })
const p = await ctx.newPage()
p.setDefaultTimeout(200000)
/* VIA L'AGGIORNAMENTO A CALDO. Il client di Vite tiene aperta una connessione
   e puo' ricaricare il modulo sotto la misura: due fotogrammi a due secondi di
   distanza con in mezzo un ricaricamento non sono due fotogrammi della stessa
   scena. E' la stessa riga che sta in testa a tutti gli altri strumenti. */
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))

await p.goto(BASE, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto)
/* SI ASPETTANO ANCHE LE RUOTE VERE, e la ragione sta per esteso in
   `strumenti/carrozzeria.mjs`: finche' non arrivano, al loro posto ci sono
   quattro dischi che emettono luce propria. Qui conta anche di piu' che
   altrove, perche' l'istante in cui `ruota.glb` arriva e sostituisce i segnali
   e' un cambiamento vero del fotogramma — se cadesse fra le due fotografie
   verrebbe contato come movimento, e sarebbe un movimento che non c'entra
   niente con la preferenza. */
await p.waitForFunction(
  () => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4,
  null, { timeout: 120000 },
).catch(() => console.log('  (ATTENZIONE: le ruote vere non sono arrivate)'))
await p.evaluate(() => window.fissaQualita('alto'))

/* E LA STRADA LA CONGELA QUESTO STRUMENTO, non piu' il sito.
 *
 * Fino a ieri `Esperienza` spegneva l'avanzamento della carreggiata quando la
 * preferenza era accesa, e questo cancello lo verificava. Il committente ha
 * deciso il contrario, tre volte, con una riga che chiude la questione: «deve
 * funzionare sempre, altrimenti chi ce l'ha acceso non lo vede». Il
 * ragionamento per esteso, costo per l'accessibilita' compreso, sta accanto al
 * codice che decide, in `scene/Lastra.ts`.
 *
 * A quel punto questo strumento aveva due strade, e una sola e' onesta.
 * Bocciare: il fotogramma cambierebbe del tredici per cento e uscirebbe rosso a
 * ogni esecuzione, per una scelta presa apposta. Un cancello che suona contro
 * una decisione non protegge niente — insegna a ignorarlo, e da quel momento
 * non prende piu' nemmeno i difetti veri.
 * Oppure misurare cio' che gli resta da misurare, che e' quasi tutto: la grana
 * della pellicola, la lancetta dei giri, la vibrazione della camera, le code
 * dello scorrimento, i pannelli che respirano. Sono animazioni SOPRA il
 * contenuto, restano spente, e se una si riaccende va presa.
 *
 * Quindi si avvolge `lastra.aggiorna` e si riporta l'andatura a zero dopo che
 * ha fatto i suoi conti: la strada sta ferma DENTRO LA MISURA e solo li'. Il
 * sito non lo sa, e il resto della scena viene confrontato come sempre.
 * Un cancello che boccia una decisione presa fa politica, non misura. */
const congelata = await p.evaluate(() => {
  const L = window.esperienza?.lastra
  if (!L || typeof L.aggiorna !== 'function') return false
  const orig = L.aggiorna.bind(L)
  /* SI CONGELA ANCHE LE UNIFORM, e il primo tentativo non lo faceva.
     Azzerare `andatura` DOPO `aggiorna` non basta: dentro `aggiorna` le
     uniform sono gia' state scritte con il valore vero, e il fotogramma dopo
     l'andatura riparte da zero e risale. Il risultato e' un dente di sega —
     l'avanzamento resta quasi fermo ma le scie dello shader sfarfallano — e la
     misura leggeva l'otto per cento dello schermo in movimento. Un
     congelamento a meta' e' peggio di nessun congelamento: sembra funzionare. */
  const fermo = L.avanzamento
  L.aggiorna = (...a) => {
    const v = orig(...a)
    L.andatura = 0
    L.avanzamento = fermo
    if (L.u) {
      if (L.u.uAvanzamento) L.u.uAvanzamento.value = fermo
      if (L.u.uAndatura) L.u.uAndatura.value = 0
      if (L.u.uSpinta) L.u.uSpinta.value = 0
    }
    return v
  }
  return !!L.u
})
console.log(congelata
  ? "  la strada e' congelata dentro la misura (e' una scelta del sito, non un difetto)"
  : '  ATTENZIONE: non sono riuscito a congelare la strada, i numeri qui sotto la contengono')


/* LA PRIMA COSA CHE SI VERIFICA E' CHE LA PREFERENZA SIA ARRIVATA.
   Senza questo controllo, uno strumento che non trova movimento non sa
   distinguere «la preferenza e' arrivata e ha funzionato» da «la preferenza
   non e' mai arrivata e la scena era ferma per un altro motivo» — per esempio
   perche' il modello non ha caricato e si stava fotografando un fondale. E' la
   trappola del metro rotto: un numero verde che non prova niente. */
const ridotto = await p.evaluate(() => window.esperienza?.ridotto === true)
if (!ridotto) {
  console.error('\nLA PREFERENZA NON E\' ARRIVATA FINO ALLA SCENA.')
  console.error('`esperienza.ridotto` e\' falso con il contesto in `reducedMotion: reduce`:')
  console.error('non c\'e\' niente da misurare finche\' `core/Moto.ts` non la legge.')
  await b.close()
  process.exit(1)
}

await p.evaluate(() => {
  // il pannello di diagnosi non e' il sito: vedi la nota in testa al file
  const h = document.getElementById('hud')
  if (h) h.style.display = 'none'
})

const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
const fermo = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

/**
 * CI SI METTE NEL TEMPO SCORRENDO, non saltandoci.
 *
 * Un `scrollTo` secco porta la posizione giusta ma non fa PASSARE la pagina
 * per i tempi in mezzo, e mezza scena e' una macchina a stati che si aspetta
 * di essere attraversata: la sequenza d'accensione del quadro, la regia del
 * controllo, il carosello che sceglie un lavoro. Arrivandoci di colpo si
 * fotografa una scena in uno stato che nessun visitatore vedrebbe mai.
 *
 * Sessanta passi e non settecento come in `carrozzeria.mjs`: li' servivano
 * perche' lo scorrimento aveva l'inerzia e bisognava darle il tempo di
 * seguire. Qui l'inerzia non c'e' per costruzione — e' proprio la cosa che
 * questo strumento verifica — quindi la posizione e' quella vera al primo
 * fotogramma dopo ogni passo.
 */
async function mettitiA(q) {
  await p.evaluate(() => window.scrollTo(0, 0))
  await fermo()
  const passi = 60
  for (let i = 1; i <= passi; i++) {
    await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / passi)])
    await fermo()
  }
}

/** i pixel grezzi di una fotografia, senza passare per il PNG compresso */
async function scatta() {
  return sharp(await p.screenshot()).raw().toBuffer()
}

/**
 * QUANTI PIXEL SONO CAMBIATI, e DOVE.
 *
 * Il «dove» non e' un di piu': quando la misura non passa, la percentuale dice
 * soltanto che qualcosa si muove. Il riquadro dice se e' tutto lo schermo (la
 * grana, la gradazione, la camera) o una fascia bassa (la strada) o un
 * rettangolo piccolo in mezzo al cruscotto (una lancetta, un numero) — cioe'
 * dice quale dei movimenti e' rimasto acceso, che e' l'unica cosa che serve
 * sapere per andarlo a spegnere.
 */
function confronta(a, s) {
  const canali = a.length / (L * A)
  let cambiati = 0
  let x0 = L, x1 = -1, y0 = A, y1 = -1
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const i = (y * L + x) * canali
      const d = Math.max(
        Math.abs(a[i] - s[i]),
        Math.abs(a[i + 1] - s[i + 1]),
        Math.abs(a[i + 2] - s[i + 2]),
      )
      if (d <= SOGLIA) continue
      cambiati++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return { frazione: cambiati / (L * A), cambiati, x0, x1, y0, y1 }
}

console.log('\nFERMO — la scena con `prefers-reduced-motion: reduce`')
console.log(`due fotogrammi a ${DISTANZA} ms di distanza, senza toccare niente`)
console.log(`un pixel conta se un canale cambia di piu' di ${SOGLIA} su 255`)
console.log(`cancello: ${(CANCELLO * 100).toFixed(1)}% dei pixel\n`)

const esiti = []
for (const [nome, q] of daFare) {
  await mettitiA(q)
  // e adesso non si tocca piu' niente: si lascia assestare, si fotografa, si
  // aspetta, si rifotografa. Nessun `scrollTo`, nessun clic, nessun tasto.
  await p.waitForTimeout(RIPOSO)
  const prima = await scatta()
  await p.waitForTimeout(DISTANZA)
  const dopo = await scatta()

  const m = confronta(prima, dopo)
  const passa = m.frazione <= CANCELLO
  esiti.push({ nome, ...m, passa })
  const dove = m.x1 < 0
    ? 'niente'
    : `x ${m.x0}-${m.x1}  y ${m.y0}-${m.y1}`
  console.log(
    (passa ? '  ok  ' : '  NO  ') + nome.padEnd(11),
    (m.frazione * 100).toFixed(3).padStart(8) + '%',
    String(m.cambiati).padStart(9), 'pixel  ',
    dove,
  )
}

await b.close()

const bocciati = esiti.filter((e) => !e.passa)
const peggio = esiti.reduce((a, e) => (e.frazione > a.frazione ? e : a), esiti[0])
console.log('\npeggiore:', peggio.nome, (peggio.frazione * 100).toFixed(3) + '%')

if (bocciati.length) {
  console.log('\nLA SCENA NON STA FERMA in ' + bocciati.length + ' tempo/i su ' + esiti.length + ':')
  for (const e of bocciati) {
    console.log('  ' + e.nome.padEnd(11), (e.frazione * 100).toFixed(3) + '%',
      ' riquadro x ' + e.x0 + '-' + e.x1 + ' y ' + e.y0 + '-' + e.y1)
  }
  console.log('\nUn riquadro largo quanto lo schermo e\' la grana o la gradazione;')
  console.log('una fascia in basso e\' la strada; un rettangolo piccolo e\' il quadro.')
  process.exit(1)
}

console.log('\nla scena e\' ferma in tutti i tempi misurati.')
