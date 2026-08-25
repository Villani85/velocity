import { dopoAuto } from '../core/Ordine'
import { rincorsa } from '../core/Moto'
import {
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { inCoda } from '../core/Salita'
import { LAVORI } from '../ui/Lavori'
import { t } from '../ui/Lingua'
import { scritto } from '../ui/Contatto'

/**
 * LA VETRINA — i lavori su un arco, in tre dimensioni.
 *
 * DA DOVE VIENE.
 *
 * Il committente ha mandato un riferimento: un carosello di lattine disposte
 * su un arco, in prospettiva, con due frecce che lo fanno ruotare; quella
 * scelta viene al centro e cresce, le altre restano ai lati inclinate. E ha
 * detto una frase sola — «i documenti, i miei lavori, li vorrei cosi'».
 *
 * La versione precedente erano quattro riquadri piatti nel documento, con le
 * stesse frecce. Funzionava e non c'entrava niente con questo sito: era
 * un'interfaccia appoggiata sopra una scena in tre dimensioni, cioe' esatta-
 * mente la cosa che qui e' stata tolta tre volte — la fascia tecnica, la
 * scheda sotto il dato, il riquadro del testo. Un carosello piatto in mezzo a
 * un mondo calcolato e' la quarta.
 *
 * PERCHE' L'ARCO E NON UNA FILA.
 *
 * Una fila di pannelli frontali si legge come una galleria di immagini: piatta,
 * e in prospettiva quelli laterali si accorciano e basta. Su un arco invece i
 * pannelli laterali RUOTANO — si vedono di tre quarti, mostrano il proprio
 * spessore — e la profondita' diventa leggibile. E' la differenza fra mettere
 * degli oggetti in fila e disporli intorno a chi guarda.
 *
 * E c'e' una ragione che vale piu' dell'estetica: ruotando, l'arco dice DOVE
 * SI E' dentro l'elenco senza bisogno di indicatori. Il pannello che entra da
 * destra e quello che esce a sinistra raccontano il movimento da soli.
 *
 * I PANNELLI SONO SCHERMI, non fotografie.
 *
 * Sono siti web: il formato e' 16:10 e il contenuto e' quello che si vedrebbe
 * aprendo la pagina. Finche' un demo non esiste, il pannello resta acceso e
 * vuoto — con il codice e una parola. Un posto apparecchiato, non un buco.
 */

/* LE MISURE SONO TARATE SULLA FASCIA LIBERA DELLO SCHERMO, che e' stretta.
   Dall'alto: la testata prende il 12%, il quadro strumenti prende dal 54% in
   giu'. Restano quarantadue punti percentuali, e dentro ci devono stare il
   carosello E la domanda finale. Il primo giro non ne teneva conto: i
   pannelli erano larghi 0,62 a due metri e quindici, uscivano dal bordo alto
   e finivano sopra la testata. */

/* QUANTO E' LARGO UN PANNELLO, IN METRI — 0,98 e non 0,52.
   Il doppio, ed e' il seguito della stessa frase: «i riquadri non si vedono
   bene». La prospettiva era meta' del difetto; l'altra meta' e' che a 0,52 il
   pannello centrale occupava un ottavo di schermo, cioe' centosettanta pixel
   su millequattrocento. Dentro non ci stava un'anteprima: ci stava un
   francobollo. Un carosello di lavori che non si riesce a guardare e' peggio
   di nessun carosello, perche' occupa lo spazio senza pagarlo. */
const LARGO = 0.80
/** e il suo rapporto: sono siti, non fotografie */
const RAPPORTO = 16 / 10
/* IL RAGGIO DELL'ARCO SU CUI STANNO — e cresce con i pannelli.
   Non e' una scelta di gusto: e' aritmetica. Su un arco, due vicini distano
   2·R·sin(PASSO/2). Con R = 1,02 quella distanza vale 0,41 metri, cioe' MENO
   della larghezza di un pannello: a 0,98 si sarebbero sovrapposti a meta'.
   R = 1,51 porta il passo a 0,60. Il vicino e' largo 0,57 ma sta al settanta
   per cento di scala e ruotato di ventitre' gradi: ne proietta 0,37, e fra un
   pannello e l'altro restano trenta pixel di aria su uno schermo da 1400.
   E il numero l'ha deciso una misura, non l'occhio. Proiettando gli angoli dei
   pannelli sullo schermo (`.tmp/misura_vetrina.mjs`), con R = 2,77 il vicino
   cadeva da 1126 a 1674 pixel su uno schermo largo 1400: mezzo pannello fuori,
   che sul bordo si legge come una lastra e non come un altro lavoro. */
const RAGGIO = 2.70
/* L'ANGOLO FRA UN PANNELLO E IL SUCCESSIVO, IN RADIANTI.
   0,40 e non 0,52, e la ragione e' che i lavori sono diventati dieci. Con 0,52
   un vicino sta gia' a trenta gradi e si vede come un trapezio: il lato vicino
   piu' alto del lontano, il testo che scappa. E' il difetto che il committente
   ha visto per primo — «i riquadri non si vedono bene» — e non era un difetto
   di disegno, era prospettiva. A 0,40 il vicino sta a ventitre' gradi, cioe'
   e' di tre quarti, che e' quello che deve fare: dire che c'e', senza chiedere
   di essere letto. */
const PASSO = 0.42
/** a che distanza sta il centro dell'arco, davanti all'obiettivo */
const LONTANANZA = 2.20
/** e quanto sta in alto: con i pannelli grandi scende, se no tocca la testata */
const ALTEZZA = 0.142

/* QUANTE CARTE CI SONO, ed e' una in piu' dei lavori.
   L'ultima non e' un lavoro: e' «SCRIVIMI». Prima era un blocco di testo che
   compariva da solo nell'ultimo tratto di scorrimento, e il committente l'ha
   tolto con una frase che vale come specifica: «l'ultimo scroll io posso solo
   usare le frecce». Vero — li' la pagina e' finita e l'unico comando rimasto
   sono le due frecce, quindi qualunque cosa debba succedere alla fine deve
   stare DENTRO il carosello. Il contatto smette di essere una cosa che
   compare e diventa una cosa a cui si arriva. */
/**
 * LA CARTA E' UN PEZZO DI CILINDRO, NON UN RETTANGOLO PIATTO.
 *
 * Le carte stanno gia' su una circonferenza — `sin`/`cos` con `RAGGIO`, e
 * ognuna ruotata di `-a` per restare tangente. Ma erano PIANE, quindi quello
 * che si vedeva era un poligono spezzato: tre facce dritte messe ad angolo
 * fra loro. Il committente l'ha detto guardandole: le vuole «curve, come se
 * seguissero un cerchio».
 *
 * La differenza fra un poligono e un cerchio la fa la curvatura DENTRO ogni
 * faccia. Si prende lo stesso `RAGGIO` della disposizione e si piega la carta
 * su quello: a quel punto le tre carte non sono piu' tre piani tangenti a una
 * circonferenza, sono TRE ARCHI DELLA STESSA CIRCONFERENZA, e i bordi
 * combaciano invece di formare uno spigolo.
 *
 * IL VERSO CONTA. Il centro dell'arco sta a `+z` rispetto alla carta (la
 * posizione e' `RAGGIO - cos(a)·RAGGIO`, che cresce allontanandosi dal
 * centro), quindi i bordi si spostano verso `+z`: la carta si incava verso il
 * centro del cerchio. Con il segno invertito si otterrebbe la stessa
 * curvatura in faccia opposta, e le carte si aprirebbero a ventaglio invece
 * di chiudersi in un anello.
 *
 * VENTIQUATTRO SEGMENTI E NON QUATTRO: la corda di un arco approssimato male
 * si vede come una piega dritta proprio dove passa il riflesso — che su uno
 * schermo emissivo e' l'unica cosa che si guarda.
 */
/* IL RAGGIO DELLA CARTA E' PIU' STRETTO DI QUELLO DELLA DISPOSIZIONE, e non
   e' un'incoerenza: e' una misura.
   Piegandola sul raggio della circonferenza (2,70) la freccia dell'arco viene
   di TRE CENTIMETRI su ottanta di larghezza — geometricamente esatta e
   otticamente invisibile: il provino era indistinguibile dalla carta piatta.
   A 1,15 la freccia sale a sette centimetri, e a quel punto il riflesso che
   corre sullo schermo si PIEGA, che e' l'unica cosa che dice «curvo» su una
   superficie che emette luce propria.
   Si perde la coincidenza esatta con la circonferenza di disposizione, e va
   detto invece che nascosto: qui il bersaglio non e' la correttezza del
   solido, e' che si legga come un anello. */
const CURVA_CARTA = 0.95

/**
 * IL MATERIALE DELLA CARTA, con la caduta angolare di uno schermo.
 *
 * PERCHE' SERVE. Le carte sono `MeshBasicMaterial`: non illuminate e non
 * tone-mappate, perche' sono SCHERMI e uno schermo non si spegne con la notte.
 * Ma un materiale che non riceve luce non ha ombreggiatura, e senza
 * ombreggiatura CURVARE UNA SUPERFICIE NON SI VEDE: il primo provino con le
 * carte piegate era indistinguibile da quello con le carte piatte, perche'
 * l'unico indizio rimasto era la deformazione prospettica della tessitura —
 * che su ottanta centimetri e' niente.
 *
 * COSA SI AGGIUNGE. Uno schermo vero perde luminosita' guardato di taglio: e'
 * la caduta angolare dei pannelli, e chiunque abbia guardato un televisore da
 * un lato la conosce. Qui la si calcola dal prodotto scalare fra la normale e
 * la direzione di vista: al centro della carta, dove la normale punta
 * all'osservatore, resta piena; verso i bordi, dove la curvatura la fa
 * girare, si smorza.
 * E' quella sfumatura ai bordi a far leggere la curva. Non e' un trucco per
 * simulare qualcosa che non c'e': la geometria E' curva, questo la mostra.
 */
function cartaMateriale(t: CanvasTexture) {
  const m = new MeshBasicMaterial({
    map: t, transparent: true, toneMapped: false,
    depthWrite: false, depthTest: false,
  })
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vNormCarta;
varying vec3 vVistaCarta;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vNormCarta = normalize( normalMatrix * normal );
  vVistaCarta = ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz;`)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vNormCarta;
varying vec3 vVistaCarta;`)
      .replace('#include <opaque_fragment>', `
  {
    float faccia = abs( dot( normalize( vNormCarta ), normalize( -vVistaCarta ) ) );
    // 0,55 e' il residuo ai bordi: a zero il bordo sparisce e la carta sembra
    // tagliata, invece che girata
    gl_FragColor.rgb *= mix( 0.55, 1.0, pow( faccia, 1.35 ) );
  }
#include <opaque_fragment>`)
  }
  m.customProgramCacheKey = () => 'cartaCurva'
  return m
}


function cartaCurva(largo: number, alto: number, raggio: number) {
  const g = new PlaneGeometry(largo, alto, 24, 1)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    // la freccia dell'arco: quanto quel punto rientra rispetto alla corda
    pos.setZ(i, raggio - Math.sqrt(Math.max(0, raggio * raggio - x * x)))
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

const CARTE = LAVORI.length + 1
/** l'indice della carta del contatto: l'ultima */
const CONTATTO = LAVORI.length
/* E UNA CARTA NON E' UNA CARTA COME LE ALTRE: quella di VELOCITY.
   Mostrava una fotografia del sito dentro il quale si sta gia' navigando — la
   carta piu' debole del mazzo, perche' e' l'unica il cui soggetto ce l'hai
   sotto gli occhi mentre la guardi. E intanto la voce piu' bassa del punteggio
   era il CONTENUTO, con l'argomento piu' forte del progetto — il metodo, le
   prove, le cifre misurate — chiuso dentro il documento statico, cioe' il
   canale che chi scorre l'esperienza non percorre mai.
   Quindi quella carta cambia mestiere: non e' un undicesimo lavoro, e' IL COME.
   Due immagini vere prima e dopo, tagliate sulla mezzeria, e tre numeri che
   vengono tutti da una misura fatta qui dentro.
   L'indice si cerca per nome e non si scrive a mano: i lavori si riordinano, e
   un dieci scritto in un altro file e' l'errore gia' pagato due volte qui
   dentro con i centri delle ruote. */
const METODO = LAVORI.findIndex((l) => l.nome === 'VELOCITY')
/* IL RITAGLIO DELLE DUE PROVE, in pixel della sorgente — e non e' scelto a
   occhio. Differenziando `fiancata_prima` e `fiancata_dopo` per blocchi di 48
   pixel, la cura si concentra in due zone: l'arco sul passaruota e una macchia
   a meta' fianco. Questo rettangolo inquadra la prima, che e' la piu' leggibile
   perche' segue una forma riconoscibile. Il rapporto 1,60 e' quello del
   pannello: cosi' non si perde niente ai bordi e le due immagini restano
   allineate al pixel. */
const RIT_X = 96
const RIT_Y = 76
const RIT_L = 384
const RIT_A = 240

/** la tela di un pannello, e ha la misura esatta delle copertine */
const TL = 960
const TA = Math.round(TL / RAPPORTO)

/* QUANTI SE NE VEDONO PER LATO.
   Due, e poi il nulla. Prima non c'era nessun limite: i pannelli oltre il
   secondo restavano al trentaquattro per cento di opacita', ed essendo ruotati
   di piu' di quaranta gradi erano lame verticali ai bordi dello schermo. Con
   due lavori non si notava; con dieci il carosello diventava una ghirlanda.
   Due per lato bastano a dire «ce ne sono altri»: e' esattamente il mestiere
   delle due frecce, e piu' di cosi' non serve. */
const FINESTRA = 2.15

/* ============================================================ LO SFONDO

   QUANDO IL LAVORO SCELTO CAMBIA, CAMBIA ANCHE IL MONDO DIETRO.

   E' la risposta a una richiesta precisa — «puoi cambiare lo sfondo e farlo
   inerente al progetto?» — ma non e' un vezzo: e' cio' che trasforma un
   carosello in una MESSA IN SCENA. Un riquadro appoggiato su un fondo neutro
   e' un elenco; lo stesso riquadro dentro un ambiente che porta i suoi colori
   e' un progetto presentato.

   E si fa con quello che c'e' gia'. Nessun file nuovo, nessun byte in piu':
   la copertina del lavoro — la stessa che sta dentro il pannello — viene
   ridisegnata su una tela minuscola, centosessanta per cento pixel, e poi
   stirata su un piano che riempie il fotogramma.

   LA SFOCATURA E' LA MAGNIFICAZIONE, e non costa niente. Centosessanta pixel
   spalmati su milleduecento sono un ingrandimento di sette volte e mezzo: il
   campionatore lineare interpola, e cio' che ne esce e' una sfocatura vera,
   fatta dall'hardware nel momento in cui disegna. Una sfocatura gaussiana
   scritta a mano sullo schermo intero costerebbe due passate di post; questa
   costa un piano e una tessitura da sedicimila pixel.

   DUE PIANI E NON UNO, perche' il cambio dev'essere una DISSOLVENZA. Con un
   piano solo si potrebbe solo scambiare la tessitura, cioe' far saltare il
   fondo di colpo nel momento esatto in cui il carosello sta scorrendo — che
   e' l'istante in cui un salto si nota di piu'. */
const FONDO_L = 160
const FONDO_A = 100
/** quanto sta dietro il centro dell'arco: abbastanza da non entrare mai in
 *  contatto con i pannelli, poco perche' resti dentro la stessa foschia */
const FONDO_DIETRO = 2.6

export class Vetrina3D {
  readonly gruppo = new Group()
  private pannelli: Mesh[] = []
  private tele: HTMLCanvasElement[] = []
  /** le tele minuscole dello sfondo, una per lavoro: vedi il blocco LO SFONDO */
  private fondi: (CanvasTexture | null)[] = []
  /** le due prove della carta del metodo, quando arrivano */
  private paio: (HTMLImageElement | null)[] = [null, null]
  /** i due piani che si danno il cambio in dissolvenza */
  private fondoA!: Mesh
  private fondoB!: Mesh
  /** quale lavoro sta mostrando lo sfondo davanti, e quanto e' arrivato */
  private fondoQuale = -1
  private fondoMix = 1
  /** l'angolo mostrato adesso, smorzato verso quello scelto */
  private angolo = 0
  private bersaglio = 0

  constructor() {
    this.gruppo.name = 'VETRINA'
    this.gruppo.visible = false

    /* I DUE PIANI DELLO SFONDO NASCONO ADESSO, VUOTI. Non quando serve: una
       geometria e un materiale creati a meta' racconto vogliono dire un
       programma compilato nel fotogramma peggiore, ed e' la regola piu'
       ripetuta di questo progetto. */
    this.fondoA = this.piano()
    this.fondoB = this.piano()
    this.gruppo.add(this.fondoB, this.fondoA)

    for (let i = 0; i < CARTE; i++) {
      const tela = document.createElement('canvas')
      tela.width = TL
      tela.height = TA
      this.disegna(tela, i, null)
      const t = new CanvasTexture(tela)
      t.colorSpace = SRGBColorSpace
      t.generateMipmaps = false
      t.minFilter = LinearFilter
      t.magFilter = LinearFilter

      const m = new Mesh(
        cartaCurva(LARGO, LARGO / RAPPORTO, CURVA_CARTA),
        // NON ILLUMINATO E NON TONE-MAPPATO: sono schermi, cioe' emettono.
        // Un pannello che si spegne insieme alla notte e' la cosa meno
        // credibile che ci sia — e' la stessa regola del quadro strumenti.
        /* NON SI FA COPRIRE DALLA PLANCIA — `depthTest: false`.
           Il primo provino con le anteprime vere aveva il pannello scelto
           tagliato in basso da una gobba scura: la fotografia dell'abitacolo,
           che sta piu' vicina alla camera. Il carosello non e' un oggetto
           appoggiato dentro l'auto — e' quello che la scena sta mostrando, e
           sta sul vetro, esattamente come il quadro strumenti e la palpebra,
           che per la stessa ragione hanno la stessa riga. Alzare il carosello
           per schivare la plancia sarebbe stato il rimedio sbagliato: lo
           avrebbe portato sotto la testata, cioe' avrebbe scambiato un
           sovrapposto con un altro. */
        cartaMateriale(t),
      )
      m.name = i === CONTATTO ? 'CARTA_CONTATTO' : 'LAVORO_' + LAVORI[i].codice
      m.renderOrder = 20
      this.pannelli.push(m)
      this.tele.push(tela)
      this.gruppo.add(m)

      /* E POI ARRIVA LA FOTOGRAFIA, quando arriva.
         Il pannello e' gia' completo e leggibile senza: fondo, cornice,
         codice, nome, soggetto. La copertina lo migliora, non lo costituisce —
         quindi non c'e' niente da aspettare e niente che possa rompersi se una
         delle dieci immagini non arriva. Quando arriva si ridisegna la tela e
         si alza `needsUpdate`: costa un disegno su una tela di 640 pixel, una
         volta sola. */
      const src = LAVORI[i]?.copertina
      if (src) {
        const im = new Image()
        im.decoding = 'async'
        im.onload = () => {
          this.disegna(tela, i, im)
          t.needsUpdate = true
          // la stessa immagine serve due volte: dentro il riquadro alla sua
          // risoluzione, e dietro tutta la scena a centosessanta pixel
          this.fondo(i, im)
          if (i === this.fondoQuale || this.fondoQuale < 0) {
            this.fondoQuale = -1
            this.scegli(i)
          }
          // e in fila per la scheda, come le insegne: vedi «core/Salita.ts»
          inCoda(t)
        }
        /* E ASPETTANO L'AUTOMOBILE. Sono dieci file per centotrentadue
           kilobyte: poco per volta, ma sono dieci CONNESSIONI aperte in
           parallelo con il GLB della vettura proprio mentre sta scendendo, e
           su una rete lenta il numero di richieste conta quanto i byte.
           Il pannello nel frattempo e' gia' completo — fondo, cornice, codice,
           nome, soggetto — quindi non c'e' niente da aspettare, come dice il
           commento qui sopra: adesso e' vero anche per il momento in cui
           partono. */
        void dopoAuto.then(() => { im.src = src })
      }

      /* E PER LA CARTA DEL METODO ARRIVANO ANCHE LE DUE PROVE.
         Stessa disciplina della copertina: partono DOPO l'automobile, la carta
         e' gia' completa e leggibile senza — cornice, codice, le tre cifre — e
         se non arrivassero resterebbe una carta con tre numeri, che e'
         comunque il contenuto che mancava. Si ridisegna solo quando ci sono
         tutte e due, perche' mezza coppia prima/dopo non e' un confronto: e'
         un'immagine che sembra il difetto.
         Sono le stesse due immagini che stanno in `#studio` nel documento, non
         due copie: `public/studio/` e' gia' pagato e gia' in cache per chi ha
         letto la pagina. */
      if (i === METODO) {
        const prove = ['/studio/fiancata_prima.webp', '/studio/fiancata_dopo.webp']
        prove.forEach((sorgente, quale) => {
          const pr = new Image()
          pr.decoding = 'async'
          pr.onload = () => {
            this.paio[quale] = pr
            if (this.paio[0] && this.paio[1]) {
              this.disegna(tela, i, null)
              t.needsUpdate = true
              inCoda(t)
            }
          }
          void dopoAuto.then(() => { pr.src = sorgente })
        })
      }
    }
  }

  /**
   * IL DISEGNO DI UN PANNELLO.
   *
   * L'ANTEPRIMA E' IL SITO, NON UN DISEGNO DEL SITO.
   *
   * Qui prima c'era una finestra spenta con dentro il codice del lavoro, e
   * accanto una nota che diceva: quando ci sara' un'anteprima vera si mettera'
   * un'immagine al posto di questo disegno. La nota aveva ragione e il momento
   * e' arrivato — le anteprime ci sono, stanno in `public/lavori/`, e ognuna
   * e' una fotografia di quel sito mentre gira davvero.
   *
   * La differenza non e' di rifinitura. Dieci rettangoli scuri con dentro
   * scritto REAL-TIME 3D / WEBGL si assomigliano tutti: sono un indice, e un
   * indice in mezzo a un finale non lo legge nessuno. Dieci fotografie diverse
   * si distinguono in mezzo secondo, da lontano, mentre scorrono — ed e'
   * l'unico modo perche' un carosello di lavori faccia il suo mestiere, che e'
   * far venire voglia di guardarne uno.
   *
   * IL VELO SOTTO IL TESTO NON E' DECORAZIONE.
   *
   * Sopra una fotografia qualunque il testo chiaro e' illeggibile un pezzo su
   * tre, e qui sotto ce ne sono di chiarissime (Stefania, Flow) e di scure (il
   * pianoforte). Il velo e' una sfumatura che va dal nulla al nero quasi pieno
   * sull'ultimo quaranta per cento, cioe' esattamente dove sta il testo — e in
   * cambio la parte alta dell'immagine resta pulita.
   */
  /**
   * LA CARTA DEL CONTATTO — l'ultima, e non assomiglia alle altre apposta.
   *
   * Le dieci prima sono ANTEPRIME: hanno una fotografia, una didascalia, una
   * tecnica, un anno. Questa non ha niente da mostrare, ha una cosa da
   * chiedere. Se le somigliasse — stesso impaginato, stesso peso — sarebbe
   * l'undicesimo lavoro e nessuno capirebbe che l'elenco e' finito.
   *
   * Quindi e' vuota, scura, e dentro c'e' una parola sola grande quanto tutto
   * il riquadro. E' la stessa idea del timbro nel finale: quando una cosa
   * deve essere l'ultima, si toglie tutto il resto invece di aggiungere.
   */
  private disegnaContatto(tela: HTMLCanvasElement) {
    const c = tela.getContext('2d')
    if (!c) return
    c.clearRect(0, 0, TL, TA)
    const g = c.createLinearGradient(0, 0, 0, TA)
    g.addColorStop(0, '#0b1119')
    g.addColorStop(1, '#050709')
    c.fillStyle = g
    c.fillRect(0, 0, TL, TA)

    // la cornice d'ambra: e' l'unica carta che la porta piena, ed e' il segno
    // che qui l'elenco cambia natura
    c.strokeStyle = 'rgba(216,162,88,0.72)'
    c.lineWidth = Math.max(2, TL * 0.004)
    c.strokeRect(c.lineWidth, c.lineWidth, TL - c.lineWidth * 2, TA - c.lineWidth * 2)

    const x = TL * 0.075
    c.textBaseline = 'alphabetic'
    c.font = '600 ' + Math.round(TL * 0.026) + 'px Switzer, system-ui, sans-serif'
    c.letterSpacing = Math.round(TL * 0.006) + 'px'
    c.fillStyle = 'rgba(216,162,88,0.92)'
    c.fillText(t('nextOcchiello'), x, TA * 0.175)

    /* LA DOMANDA VA A CAPO DOVE DICE IL TESTO, non dove capita.
       «nextDomanda» porta dentro un a capo — e' scritto in `ui/Lingua.ts`,
       ed e' una decisione di impaginazione presa insieme alla frase. Una tela
       non manda a capo da sola: `fillText` disegnerebbe il carattere di
       controllo come uno spazio e stenderebbe tutto su una riga sola, che a
       quel corpo esce dal riquadro. Si spezza a mano, e ogni riga scende di
       un'interlinea. */
    c.letterSpacing = '0px'
    const corpoD = Math.round(TL * 0.078)
    c.font = '600 ' + corpoD + 'px "Clash Display", Clash ripiego, system-ui, sans-serif'
    c.fillStyle = 'rgba(246,244,238,0.97)'
    const righe = t('nextDomanda').split(String.fromCharCode(10))
    for (let r = 0; r < righe.length; r++) {
      c.fillText(righe[r], x, TA * 0.335 + r * corpoD * 1.06)
    }

    // e la parola grande: e' la sola cosa che questa carta deve dire
    c.font = '600 ' + Math.round(TL * 0.135) + 'px "Clash Display", Clash ripiego, system-ui, sans-serif'
    c.letterSpacing = Math.round(TL * 0.014) + 'px'
    c.fillStyle = 'rgb(232,178,102)'
    c.fillText(t('nextInvito'), x, TA * 0.700)

    // il filetto sotto, come sotto una firma
    c.letterSpacing = '0px'
    const lg = c.createLinearGradient(x, 0, TL - x, 0)
    lg.addColorStop(0, 'rgba(216,162,88,0.85)')
    lg.addColorStop(1, 'rgba(216,162,88,0.06)')
    c.fillStyle = lg
    c.fillRect(x, Math.round(TA * 0.760), TL - x * 2, Math.max(2, TL * 0.0035))

    c.font = '500 ' + Math.round(TL * 0.030) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = 'rgba(196,214,236,0.72)'
    c.fillText(t('contattoRiga'), x, TA * 0.858)

    /* E L'INDIRIZZO, SOLO SE ESISTE.
       Finche' `ui/Contatto.ts` e' vuoto qui non compare niente: un indirizzo
       inventato e' l'unica cosa finta che qualcuno proverebbe davvero a usare,
       ed e' la ragione per cui quella riga e' rimasta vuota apposta per tutto
       il progetto. Il giorno in cui c'e', si scrive da sola. */
    const posta = scritto()
    if (posta) {
      c.font = '500 ' + Math.round(TL * 0.026) + 'px Switzer, system-ui, sans-serif'
      c.letterSpacing = Math.round(TL * 0.003) + 'px'
      c.fillStyle = 'rgba(216,162,88,0.88)'
      c.fillText(posta, x, TA * 0.935)
      c.letterSpacing = '0px'
    }
  }

  /**
   * LA CARTA DEL METODO — due prove e tre numeri.
   *
   * DUE PANNELLI AFFIANCATI, E NON UNA COPPIA TAGLIATA SULLA MEZZERIA.
   *
   * Il primo giro era un tergicristallo: meta' sinistra della prima, meta'
   * destra della seconda, una lama ambra sulla cucitura. Il ragionamento che
   * lo sosteneva era buono e vale la pena tenerlo scritto, perche' e' vero in
   * generale — due immagini affiancate obbligano l'occhio a saltare e a tenere
   * a mente la prima, mentre una cucitura le fonde in una cosa sola e la
   * differenza salta fuori senza cercarla. E' il motivo per cui i confronti
   * prima/dopo si fanno cosi' da sempre.
   *
   * Quello che quel ragionamento non prevedeva e' la condizione perche'
   * funzioni: che il DIFETTO ATTRAVERSI LA CUCITURA. Un tergicristallo mostra
   * a sinistra una parte e a destra un'altra: se le due parti non contengono
   * la stessa cosa, non stai confrontando due trattamenti, stai guardando due
   * pezzi di macchina. Nel provino usciva esattamente cosi' — a sinistra un
   * fianco scuro, a destra un colmo di luce — e si leggeva come un cambio di
   * illuminazione, non come una cura.
   *
   * E la condizione qui non e' soddisfatta, ed e' una cosa che si misura invece
   * di stimarla. Differenza fra le due immagini per blocchi di 48 pixel: la
   * cura si concentra in DUE zone separate — l'arco sul passaruota (x 144-432,
   * y 96-144) e una macchia a meta' fianco (x 432-768, y 192-288). Qualunque
   * cucitura verticale ne lascia una per parte.
   *
   * Quindi due pannelli, tutti e due sulla stessa regione, quella dell'arco.
   * L'occhio confronta due composizioni identiche, che e' la cosa che sa fare
   * meglio: a sinistra l'arco chiaro e il parafango chiazzato, a destra la
   * stessa identica inquadratura pulita.
   *
   * PERCHE' TRE NUMERI E NON UN PARAGRAFO. Su una carta larga trecento pixel
   * sullo schermo un paragrafo non si legge: si vede che c'e' del testo. Tre
   * cifre grandi si leggono a colpo d'occhio, e sono il tipo di contenuto che
   * regge il peso — «0,840 → 0,424» dice piu' di dieci righe sul fatto che
   * qui si misura prima di dichiarare.
   * Vengono tutte e tre da `#studio`, cioe' dallo stesso posto: se un giorno
   * cambia il numero nel documento e non qui, la carta mente. E' l'unico
   * difetto che questa costruzione puo' avere, e vale la pena scriverlo.
   */
  private disegnaMetodo(tela: HTMLCanvasElement, i: number) {
    const c = tela.getContext('2d')!
    const l = LAVORI[i]
    c.clearRect(0, 0, TL, TA)

    const g = c.createLinearGradient(0, 0, 0, TA)
    g.addColorStop(0, '#0d1420')
    g.addColorStop(1, '#04060b')
    c.fillStyle = g
    c.fillRect(0, 0, TL, TA)

    c.strokeStyle = 'rgba(216,162,88,0.42)'
    c.lineWidth = 2
    c.strokeRect(1, 1, TL - 2, TA - 2)

    c.textBaseline = 'middle'
    const x = TL * 0.055

    c.textAlign = 'left'
    c.font = '700 ' + Math.round(TA * 0.062) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = 'rgba(216,162,88,0.95)'
    c.fillText(l.codice, x, TA * 0.108)

    // dove sulle altre carte sta il genere, qui sta cos'e' questa carta
    c.textAlign = 'right'
    c.font = '600 ' + Math.round(TA * 0.048) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = 'rgba(216,162,88,0.62)'
    c.fillText(t('studioCarta'), TL - x, TA * 0.108)

    const rx = TL * 0.055
    const rw = TL * 0.890
    const ry = TA * 0.185
    const rh = TA * 0.435
    const vano = TL * 0.022
    const pw = (rw - vano) / 2
    const pri = this.paio[0]
    const dop = this.paio[1]
    const pannello = (im: HTMLImageElement | null, x0: number, eti: string) => {
      if (im) {
        c.save()
        c.beginPath()
        c.rect(x0, ry, pw, rh)
        c.clip()
        /* IL RITAGLIO SULLA SORGENTE, e i quattro numeri non sono a occhio:
           vengono dalla mappa delle differenze fra le due immagini. La regione
           dell'arco sta fra x 96 e x 480 e fra y 76 e y 316, ed e' un rettangolo
           di 384 per 240 — cioe' 1,60, che e' il rapporto del pannello (1,596).
           Quando ritaglio e destinazione hanno lo stesso rapporto non si perde
           niente ai bordi, e soprattutto le due immagini restano allineate al
           pixel: se una delle due fosse inquadrata anche solo un poco diversa,
           l'occhio leggerebbe lo scarto e non la cura. */
        /* E SI ALZA L'ESPOSIZIONE, LA STESSA SU TUTTI E DUE.
           Le due prove sono ritratti di una vernice quasi nera in una scena
           notturna: nel provino della carta i due pannelli erano corretti e
           illeggibili, perche' la differenza che devono mostrare vive fra il
           dieci e il venti per cento del fondoscala. Su una carta larga
           trecento pixel sullo schermo, li' dentro non ci arriva l'occhio.
           Non e' un trucco e non falsa il confronto: e' la stessa identica
           trasformazione applicata a tutti e due, quindi ogni differenza che
           si vede dopo c'era anche prima. Sarebbe disonesto solo se i due
           pannelli avessero esposizioni diverse — ed e' esattamente il motivo
           per cui questa riga sta DENTRO la funzione che disegna un pannello,
           dove non c'e' modo di darne una diversa all'uno e all'altro. */
        c.filter = 'brightness(1.55) contrast(1.10)'
        const sr = Math.max(pw / RIT_L, rh / RIT_A)
        c.drawImage(
          im, RIT_X, RIT_Y, RIT_L, RIT_A,
          x0 + (pw - RIT_L * sr) / 2, ry + (rh - RIT_A * sr) / 2, RIT_L * sr, RIT_A * sr,
        )
        c.filter = 'none'
        c.restore()
      } else {
        // il posto apparecchiato, finche' le prove non arrivano
        c.fillStyle = 'rgba(238,247,255,0.045)'
        c.fillRect(x0, ry, pw, rh)
      }
      c.strokeStyle = 'rgba(216,162,88,0.30)'
      c.lineWidth = 1
      c.strokeRect(x0 + 0.5, ry + 0.5, pw - 1, rh - 1)
      c.font = '700 ' + Math.round(TA * 0.036) + 'px Switzer, system-ui, sans-serif'
      c.letterSpacing = Math.round(TA * 0.004) + 'px'
      c.fillStyle = 'rgba(238,247,255,0.88)'
      c.textAlign = 'left'
      c.fillText(eti, x0 + TL * 0.014, ry + rh - TA * 0.038)
      c.letterSpacing = '0px'
    }
    /* SI DISEGNANO TUTTI E DUE O NESSUNO. Mezza coppia prima/dopo non e' un
       confronto: e' un'immagine che sembra il difetto. */
    const insieme = !!(pri && dop)
    pannello(insieme ? pri : null, rx, t('studioPrima'))
    pannello(insieme ? dop : null, rx + pw + vano, t('studioDopo'))

    c.textAlign = 'left'
    c.font = '500 ' + Math.round(TA * 0.034) + 'px Switzer, system-ui, sans-serif'
    c.letterSpacing = Math.round(TA * 0.003) + 'px'
    c.fillStyle = 'rgba(216,162,88,0.72)'
    c.fillText(t('studioDidascalia'), x, TA * 0.672)
    c.letterSpacing = '0px'

    /* LE TRE CIFRE. Il numero grande e la parola piccola sotto, che e' la
       gerarchia giusta: la cifra e' la cosa che si ricorda, l'etichetta serve
       solo a non farla sembrare arbitraria. */
    const cifre: Array<[string, string]> = [
      ['0,840 \u2192 0,424', t('studioCifra1')],
      ['619 kB', t('studioCifra2')],
      ['6', t('studioCifra3')],
    ]
    const colonne = [TL * 0.055, TL * 0.400, TL * 0.720]
    cifre.forEach(([n, et], k) => {
      let corpo = TA * 0.078
      c.font = '700 ' + Math.round(corpo) + 'px Switzer, system-ui, sans-serif'
      // «0,840 -> 0,424» e' lungo il quadruplo di «6»: la cifra rientra invece
      // di finire sopra la vicina. Si misura, non si contano i caratteri.
      const largo = (k < 2 ? colonne[k + 1] - colonne[k] : TL - x - colonne[k]) - TL * 0.02
      while (c.measureText(n).width > largo && corpo > TA * 0.042) {
        corpo *= 0.94
        c.font = '700 ' + Math.round(corpo) + 'px Switzer, system-ui, sans-serif'
      }
      c.fillStyle = 'rgba(238,247,255,0.96)'
      c.fillText(n, colonne[k], TA * 0.790)
      c.font = '600 ' + Math.round(TA * 0.030) + 'px Switzer, system-ui, sans-serif'
      c.letterSpacing = Math.round(TA * 0.003) + 'px'
      c.fillStyle = 'rgba(216,162,88,0.60)'
      c.fillText(et, colonne[k], TA * 0.855)
      c.letterSpacing = '0px'
    })

    // e il nome resta dov'e' sulle altre carte: e' l'aggancio fra la figura e
    // la sua scheda, e senza quello sono due cose separate
    c.font = '700 ' + Math.round(TA * 0.078) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = 'rgba(238,247,255,0.96)'
    c.fillText(l.nome, x, TA * 0.945)
  }

  private disegna(tela: HTMLCanvasElement, i: number, foto: HTMLImageElement | null) {
    if (i === CONTATTO) return this.disegnaContatto(tela)
    if (i === METODO) return this.disegnaMetodo(tela, i)
    const c = tela.getContext('2d')!
    const l = LAVORI[i]

    c.clearRect(0, 0, TL, TA)

    // il fondo: si vede finche' la fotografia non c'e', ed e' quello che resta
    // se non dovesse arrivare
    const g = c.createLinearGradient(0, 0, 0, TA)
    g.addColorStop(0, '#0d1420')
    g.addColorStop(1, '#04060b')
    c.fillStyle = g
    c.fillRect(0, 0, TL, TA)

    if (foto) {
      // COPRE, non si adatta: le copertine sono gia' 640x400, ma il giorno in
      // cui qualcuno ne rifa' una con un ritaglio diverso non deve comparire
      // una banda nera
      const r = Math.max(TL / foto.width, TA / foto.height)
      const w = foto.width * r, h = foto.height * r
      c.drawImage(foto, (TL - w) / 2, 0, w, h)
    }

    // il velo, solo dove sta il testo
    const velo = c.createLinearGradient(0, TA * 0.34, 0, TA)
    velo.addColorStop(0, 'rgba(2,5,10,0)')
    velo.addColorStop(0.45, 'rgba(2,5,10,0.72)')
    velo.addColorStop(1, 'rgba(2,5,10,0.94)')
    c.fillStyle = velo
    c.fillRect(0, TA * 0.34, TL, TA * 0.66)

    // e uno appena accennato in alto, per il codice e il genere
    const cima = c.createLinearGradient(0, 0, 0, TA * 0.24)
    cima.addColorStop(0, 'rgba(2,5,10,0.62)')
    cima.addColorStop(1, 'rgba(2,5,10,0)')
    c.fillStyle = cima
    c.fillRect(0, 0, TL, TA * 0.24)

    // la cornice: ambra, la tinta di casa, e sottile
    c.strokeStyle = 'rgba(216,162,88,0.42)'
    c.lineWidth = 2
    c.strokeRect(1, 1, TL - 2, TA - 2)

    c.textBaseline = 'middle'
    const x = TL * 0.055

    // il codice, in alto a sinistra
    c.textAlign = 'left'
    c.font = '700 ' + Math.round(TA * 0.062) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = 'rgba(216,162,88,0.95)'
    c.fillText(l.codice, x, TA * 0.108)

    /* E IL GENERE IN ALTO A DESTRA: e' la riga piu' piccola del riquadro ed e'
       la piu' importante. Nove di questi dieci sono dimostrazioni. Mostrarli
       senza dirlo, dentro una scena in cui una pattuglia sta controllando dei
       documenti, sarebbe l'unica cosa non vera del sito e anche la piu' facile
       da smontare. Detto, invece, non toglie niente: un demo costruito per far
       vedere come si lavora e' esattamente cio' che un'agenzia vuole guardare. */
    c.textAlign = 'right'
    c.font = '600 ' + Math.round(TA * 0.048) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = 'rgba(216,162,88,0.62)'
    c.fillText(l.genere, TL - x, TA * 0.108)

    /* IL NOME NON SI SCRIVE PIU' QUI, E QUESTA E' LA SECONDA VOLTA.
     *
     * La prima l'avevo tolto per la stessa identica ragione — c'erano due
     * VELOCITY nello stesso fotogramma, uno sul riquadro e uno grande sul
     * pannello delle credenziali — e poi e' rientrato quando i riquadri hanno
     * preso l'anteprima vera e il nome e' tornato utile per distinguerli.
     * E' rientrato anche il difetto: a settanta secondi la scheda dice VELOCITY
     * e sotto, in corpo cinquanta, c'e' scritto di nuovo VELOCITY.
     *
     * Il nome resta dove pesa di piu': sul documento che la pattuglia sta
     * controllando. E il riquadro non ne ha bisogno per essere riconosciuto —
     * ha la fotografia del sito, che e' un segno molto piu' forte di una
     * parola, e il pannello sotto cambia insieme alla selezione, quindi il
     * nome di quello scelto c'e' sempre.
     *
     * La regola generale, e vale per tutto il progetto: due segni per la stessa
     * informazione non si rafforzano, si dimezzano. E' la stessa con cui sono
     * spariti la fascia tecnica quando ripeteva la spina, le celle della
     * batteria quando ripetevano il numero, e il contatore del capitolo dal
     * cruscotto quando ripeteva la rotaia.
     */
    /* RESTA IL NOME, E SE NE VANNO SOGGETTO, TECNICA E ANNO.
       La regola qui sopra — due segni per la stessa informazione si dimezzano
       — era scritta ma non applicata fino in fondo: nel provino del finale la
       carta diceva «Profilo di una Salesforce architect / SEQUENZA SU TELA /
       2026» e il pannello dieci centimetri piu' sotto diceva le identiche tre
       cose, piu' il nome e lo stato. Il committente l'aveva gia' segnalato in
       tre parole — «la descrizione sotto sistemala» — e una revisione esterna
       l'ha contata come tre livelli di testo illeggibili insieme.
       La divisione del lavoro adesso e' netta e non si puo' sbagliare:
       LA CARTA E' L'OGGETTO, e porta l'unica cosa che deve restare in testa
       dopo averla vista una volta, cioe' il nome; IL PANNELLO E' IL DOCUMENTO,
       e porta i dati. Il nome resta in tutti e due apposta: e' l'aggancio fra
       la figura e la sua scheda, e senza quello sono due cose separate.
       E c'e' un guadagno che non e' solo di ordine: liberata la fascia bassa,
       la fotografia del lavoro respira fino in fondo alla carta — che e'
       precisamente cio' che il committente chiedeva con «devono essere i
       protagonisti e scenografici». */
    c.textAlign = 'left'
    let corpoNome = TA * 0.105
    c.font = '700 ' + Math.round(corpoNome) + 'px Switzer, system-ui, sans-serif'
    // «STEFANIA CHIARADIA» e' lungo il triplo di «FUSTO»: il nome rientra
    // invece di uscire dalla carta. Si misura, non si contano le lettere.
    while (c.measureText(l.nome).width > TL - x * 2 && corpoNome > TA * 0.055) {
      corpoNome *= 0.94
      c.font = '700 ' + Math.round(corpoNome) + 'px Switzer, system-ui, sans-serif'
    }
    c.fillStyle = 'rgba(238,247,255,0.96)'
    c.fillText(l.nome, x, TA * 0.905)
  }

  /** un piano dello sfondo: grande, muto, e dietro a tutto il resto */
  private piano(): Mesh {
    const m = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({
        transparent: true, toneMapped: false, opacity: 0,
        depthWrite: false, depthTest: false,
      }),
    )
    // PRIMA DEI PANNELLI E DOPO LA SCENA. I pannelli non scrivono in
    // profondita' e non la leggono — sono su un piano loro — quindi l'ordine
    // fra i due lo decide solo questo numero.
    m.renderOrder = 1
    m.visible = false
    return m
  }

  /**
   * LA TELA MINUSCOLA DELLO SFONDO, disegnata una volta per lavoro.
   *
   * Centosessanta per cento pixel: la sfocatura non si calcola, la fa il
   * campionatore stirando questa tela su tutto il fotogramma. Vedi il blocco
   * LO SFONDO in testa al file.
   *
   * Le tre passate, e ognuna ha un mestiere:
   *   la copertina, presa piu' larga del piano perche' i bordi sfocati non
   *     devono mai scoprire l'angolo;
   *   una mano scura, perche' dietro un riquadro acceso ci va un ambiente, non
   *     una seconda immagine che compete;
   *   la vignetta, che e' cio' che rende il fondo una SCENOGRAFIA invece di
   *     una fotografia stirata: chiude il fotogramma e riporta l'occhio al
   *     centro, dove sta il lavoro.
   */
  private fondo(i: number, im: HTMLImageElement) {
    const tela = document.createElement('canvas')
    tela.width = FONDO_L
    tela.height = FONDO_A
    const c = tela.getContext('2d')
    if (!c) return
    c.filter = 'blur(3px) saturate(1.45)'
    c.drawImage(im, -14, -9, FONDO_L + 28, FONDO_A + 18)
    c.filter = 'none'
    c.fillStyle = 'rgba(4,7,15,0.50)'
    c.fillRect(0, 0, FONDO_L, FONDO_A)
    const g = c.createRadialGradient(
      FONDO_L * 0.5, FONDO_A * 0.46, FONDO_A * 0.10,
      FONDO_L * 0.5, FONDO_A * 0.46, FONDO_A * 0.92,
    )
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.55, 'rgba(2,4,10,0.45)')
    g.addColorStop(1, 'rgba(1,2,6,0.97)')
    c.fillStyle = g
    c.fillRect(0, 0, FONDO_L, FONDO_A)
    const t = new CanvasTexture(tela)
    t.colorSpace = SRGBColorSpace
    t.generateMipmaps = false
    t.minFilter = LinearFilter
    t.magFilter = LinearFilter
    this.fondi[i] = t
  }

  /** quale pannello sta al centro */
  scegli(i: number) {
    const q = Math.min(Math.max(i, 0), CARTE - 1)
    this.bersaglio = -q * PASSO
    /* E IL FONDO SI DA' IL CAMBIO. Quello che c'era passa dietro, quello
       nuovo entra davanti da opacita' zero: la dissolvenza dura quanto la
       rotazione dell'arco, cosi' il mondo cambia INSIEME al lavoro e non
       dopo. Se il fondo del lavoro non e' ancora arrivato non si scambia
       niente: meglio tenere quello di prima che aprire un buco nero. */
    if (q === this.fondoQuale || !this.fondi[q]) return
    const dietro = this.fondoB.material as MeshBasicMaterial
    const davanti = this.fondoA.material as MeshBasicMaterial
    dietro.map = davanti.map
    davanti.map = this.fondi[q]
    this.fondoQuale = q
    this.fondoMix = 0
  }

  /**
   * @param p quanto e' comparsa, da 0 a 1
   * @param camera serve a posare l'arco davanti all'obiettivo
   *
   * L'ARCO STA DAVANTI ALLA CAMERA E NON NEL MONDO. Nel mondo dovrebbe
   * inseguire una strada che scorre e un'automobile che si sposta; davanti
   * all'obiettivo sta fermo, che e' quello che deve fare — non e' un oggetto
   * della scena, e' quello che la scena sta mostrando. E' la stessa scelta
   * dell'abitacolo e del quadro strumenti, per la stessa ragione.
   */
  /**
   * @param ritira da 0 a 1: quanto il carosello si fa da parte per lasciare
   *   spazio alla domanda finale.
   *
   * SI RITIRA INVECE DI SPARIRE, ed e' una differenza di racconto. I lavori
   * sono appena stati controllati e approvati: farli sparire nell'istante in
   * cui si chiede «il prossimo progetto?» vorrebbe dire cancellare la premessa
   * della domanda. Salgono e si stringono — restano li', piu' piccoli, come
   * una cosa gia' vista.
   *
   * E' anche l'unico modo di far stare due blocchi in quarantadue punti
   * percentuali di schermo senza sovrapporli: la fascia libera e' quella, e
   * quando ne arriva un secondo il primo deve stringersi.
   */
  /**
   * @param cede da 0 a 1: quanto il carosello arretra mentre il timbro
   *   atterra. E' un'altra cosa dal ritiro, e le due non vanno confuse.
   *
   * IL RITIRO E' UN CONGEDO, QUESTO E' UN PASSO INDIETRO. I lavori non hanno
   * finito — anzi, sono esattamente cio' che il timbro sta approvando — quindi
   * non si spengono: si tirano indietro di mezzo metro e si smorzano di un
   * terzo per il tempo in cui «TUTTO IN REGOLA» sta sullo schermo, e poi
   * tornano avanti.
   *
   * Serve perche' i riquadri sono diventati grandi. Finche' erano larghi 0,57
   * il timbro cadeva nella fascia d'aria fra un pannello e il quadro
   * strumenti; a 1,02 quella fascia non esiste piu' e il verdetto attraversava
   * il lavoro nel punto in cui il lavoro si legge. Fra le due cose non c'era
   * una da sacrificare: c'era da metterle in fila nel TEMPO invece che nello
   * spazio, che e' quello che fa una regia quando lo spazio e' finito.
   */
  aggiorna(p: number, camera: PerspectiveCamera, dt: number, ritira = 0, cede = 0) {
    const acceso = p > 0.02
    this.gruppo.visible = acceso
    if (!acceso) return

    /* QUANTO STA ANDANDO, da 0 (fermo) a 1 (sta cambiando lavoro adesso).
       E' la manopola dello zoom, ed e' gratis: la distanza fra dove l'arco e'
       e dove vuole arrivare la conosciamo gia', serviva solo darle un nome. */
    const moto = Math.min(1, Math.abs(this.bersaglio - this.angolo) / PASSO)
    // lo smorzamento: l'arco INSEGUE la scelta invece di saltarci sopra, ed e'
    // il ritardo a farlo sembrare un oggetto con un peso
    /* E CON IL MOVIMENTO RIDOTTO L'ARCO ARRIVA SUBITO. Il ritardo che gli da'
       il peso e' proprio cio' che continua dopo il gesto: si gira una carta e
       per mezzo secondo tre pannelli traslano e ruotano da soli, con lo zoom
       che li accompagna. Con `rincorsa` la carta scelta e' gia' al centro nel
       fotogramma del gesto — e il carosello cambia per dissolvenza, perche'
       `fondoMix` e le opacita' dei pannelli restano al loro posto. */
    this.angolo += (this.bersaglio - this.angolo) * rincorsa(Math.min(dt * 7, 1))
    // e la dissolvenza dello sfondo cammina con lo stesso passo
    this.fondoMix = Math.min(1, this.fondoMix + dt * 1.7)

    camera.updateMatrixWorld()
    _pos.setFromMatrixPosition(camera.matrixWorld)
    _rot.setFromRotationMatrix(camera.matrixWorld)
    _avanti.set(0, 0, -1).applyQuaternion(_rot)
    _su.set(0, 1, 0).applyQuaternion(_rot)

    // il centro dell'arco: davanti e in alto, nella fascia libera fra la
    // testata e il quadro strumenti. Ritirandosi sale ancora e si allontana.
    const r = Math.min(Math.max(ritira, 0), 1)
    const c = Math.min(Math.max(cede, 0), 1)
    /* LO ZOOM DEL CAMBIO — e non e' un effetto appiccicato sopra, e' una
       CAMERA che si butta dentro.
       Mentre l'arco ruota, tutto il gruppo scende verso l'obiettivo di
       ventidue centimetri e torna. E' poco in metri e molto a schermo, perche'
       a due metri e venti un quinto di metro vale un decimo di ingrandimento:
       il fotogramma si apre, il lavoro nuovo arriva addosso e si assesta.
       Con la stessa manopola c'e' anche una INCLINAZIONE nel verso del moto —
       due gradi scarsi. E' il trucco piu' vecchio del montaggio: un'immagine
       che si inclina verso dove sta andando racconta la direzione senza
       bisogno che ci sia qualcosa che si muove nel fotogramma. Serve che sia
       PICCOLA: sopra i tre gradi diventa un difetto di orizzonte. */
    const zoom = 0.22 * moto
    this.gruppo.position
      .copy(_pos)
      .addScaledVector(_avanti, LONTANANZA + 0.55 * r + 1.85 * c - zoom)
      .addScaledVector(_su, ALTEZZA + 0.16 * r)
    this.gruppo.quaternion.copy(_rot)
    this.gruppo.rotateZ(Math.max(-1, Math.min(1, (this.bersaglio - this.angolo) / PASSO)) * -0.032)

    /* E LO SFONDO SI POSA DIETRO L'ARCO, grande abbastanza da non finire mai.
       La misura si rifa' a ogni fotogramma perche' dipende dal formato dello
       schermo: la camera ha un campo VERTICALE fisso, quindi su uno schermo
       largo serve piu' larghezza per coprire lo stesso fotogramma. Il piano
       non si scala in altezza, che e' gia' abbondante. */
    const lontanoFondo = LONTANANZA + FONDO_DIETRO
    const altoFondo = 2.35 * lontanoFondo * Math.tan((camera.fov * Math.PI) / 360)
    const largoFondo = altoFondo * Math.max(1.05, camera.aspect)
    const mA = this.fondoA.material as MeshBasicMaterial
    const mB = this.fondoB.material as MeshBasicMaterial
    for (const f of [this.fondoA, this.fondoB]) {
      f.position.set(0, 0, FONDO_DIETRO)
      f.scale.set(largoFondo, altoFondo, 1)
    }
    /* IL FONDO SI TIRA INDIETRO QUANDO IL CAROSELLO SI RITIRA e sale con la
       comparsa: e' l'ambiente del lavoro, quindi arriva e se ne va con lui.
       E non arriva mai al pieno — 0,88 — perche' sotto ci deve restare la
       strada: se il fondo la coprisse del tutto, il finale smetterebbe di
       succedere dentro l'automobile. */
    const forza = 0.88 * p * (1 - r) * (1 - 0.88 * c)
    mA.opacity = forza * this.fondoMix
    mB.opacity = forza * (1 - this.fondoMix)
    this.fondoA.visible = !!mA.map && mA.opacity > 0.004
    this.fondoB.visible = !!mB.map && mB.opacity > 0.004

    for (let i = 0; i < this.pannelli.length; i++) {
      const a = this.angolo + i * PASSO
      const m = this.pannelli[i]
      // sull'arco: x e z in coordinate del gruppo, che guarda come la camera
      m.position.set(Math.sin(a) * RAGGIO, 0, RAGGIO - Math.cos(a) * RAGGIO)
      // e ruota con l'arco: e' questo a farlo vedere di tre quarti, ed e' la
      // differenza fra un arco e una fila
      m.rotation.y = -a
      // quello al centro cresce e si accende; gli altri restano indietro
      const centrale = Math.max(0, 1 - Math.abs(a) / (PASSO * 1.6))
      // e quanto sta dentro la finestra: oltre il secondo vicino non c'e'
      // niente, ne' pallido ne' storto
      const dentro = Math.max(0, Math.min(1, (FINESTRA - Math.abs(a) / PASSO) / 1.1))
      /* IL VICINO E' MOLTO PIU' PICCOLO DELLO SCELTO — 0,70 contro 1.
         Con 0,86 + 0,34 il rapporto era 0,82: due pannelli quasi uguali
         affiancati, e in un carosello due pannelli uguali vogliono dire che
         non ce n'e' uno scelto. La gerarchia non la fa l'opacita', che si
         legge come «lontano»; la fa la misura. */
      const s = 0.62 + 0.58 * centrale
      /* E SI STRINGE SUGLI SCHERMI STRETTI.
         La misura in metri e' una misura ORIZZONTALE, ma la camera ha un campo
         verticale fisso: la stessa larghezza in metri, su un telefono in piedi,
         occupa quasi quattro volte la frazione di schermo che occupa su un
         desktop. Nel provino a 390 il riquadro del lavoro si prendeva meta'
         pagina e copriva la strada.
         Il fattore e' il rapporto d'aspetto normalizzato su 1,2 e non scende
         mai sotto un terzo: sotto quella soglia il testo dentro il riquadro
         smetterebbe di leggersi, e un'anteprima illeggibile non serve a
         niente. */
      const stretto = Math.min(1, Math.max(0.34, camera.aspect / 1.2))
      /* E IL CENTRALE CRESCE ANCORA MENTRE ARRIVA. Lo zoom della camera vale
         per tutto il gruppo; questo vale solo per chi sta entrando al centro,
         ed e' la differenza fra «la scena si avvicina» e «questo lavoro si sta
         presentando». Un decimo, e solo sul centrale: sui vicini
         sembrerebbe un rimbalzo. */
      m.scale.setScalar(s * stretto * (0.6 + 0.4 * p) * (1 - 0.22 * r) * (1 + 0.10 * moto * centrale))
      const mat = m.material as MeshBasicMaterial
      // E SI SPEGNE DEL TUTTO, non si attenua. Vedi `ritiro()` in
      // `ui/Controllo.ts`: quando arriva la domanda finale i lavori hanno gia'
      // fatto il loro mestiere — sono stati mostrati e approvati — e restare
      // in scena, anche tenui, vorrebbe dire chiedere due cose insieme.
      /* E SONO QUASI OPACHI.
         Nel primo provino con le anteprime vere si vedeva la volante ATTRAVERSO
         il pannello di VELOCITY: lampeggianti blu in mezzo a una fotografia di
         un sito. Un riquadro di portfolio non e' un vetro — e' uno schermo, e
         uno schermo copre quello che ha dietro. La trasparenza serve solo a
         farlo comparire e a dire che i vicini sono indietro, e per dirlo basta
         un quarto: da 0,76 (vicino) a 1 (scelto). */
      /* E IL PASSO INDIETRO E' DIVENTATO MOLTO PIU' DECISO — da 0,38 a 0,84.
         Con un terzo di attenuazione il timbro continuava a cadere SOPRA il
         riquadro, e una revisione l'ha segnalato quattro volte di fila; l'ultima
         con l'argomento che chiude la questione: adesso taglia proprio la
         scheda di STEFANIA CHIARADIA, cioe' l'unico lavoro in linea
         dell'elenco. Il verdetto copriva la credenziale migliore del sito.
         Il carosello non sparisce — i lavori sono cio' che il timbro sta
         approvando, e cancellarli cancellerebbe la premessa — ma per i pochi
         centesimi in cui la frase e' sullo schermo si tira indietro di un
         metro e resta un'ombra. Poi torna avanti, piu' grande di prima. */
      /* E DA 0,84 A 0,94, con il passo indietro da 1,05 a 1,85 metri.
         Al giro prima il carosello si ritirava gia', e non bastava: nel
         provino del timbro «TUTTO IN REGOLA» cadeva esattamente sul nome
         scritto grande in fondo alla carta, e sotto le lettere ambra si
         leggeva «STEFANIA CHIARADIA» in bianco. Due scritte grandi
         sovrapposte, ed e' il difetto che due revisioni esterne hanno segnato
         su Design e Usabilita' insieme.
         Spostare il timbro non era una via d'uscita: sopra c'e' la fotografia
         del lavoro, sotto il pannello, e in mezzo non c'e' una fascia libera
         alta abbastanza. Quindi non si sposta il timbro, si toglie di mezzo
         cio' che gli sta sotto — che e' anche la cosa giusta da fare in un
         climax: al momento della frase, tutto il resto arretra.
         A 0,94 la carta resta al sei per cento, cioe' un fantasma che dice
         «c'e' ancora, non e' sparita» senza avere piu' niente da leggere. */
      mat.opacity = p * (0.62 + 0.38 * centrale) * dentro * (1 - r) * (1 - 0.94 * c)
      m.visible = mat.opacity > 0.004
    }
  }

  smonta() {
    for (const f of [this.fondoA, this.fondoB]) {
      f.geometry.dispose()
      ;(f.material as MeshBasicMaterial).dispose()
    }
    for (const t of this.fondi) t?.dispose()
    for (const m of this.pannelli) {
      m.geometry.dispose()
      const mat = m.material as MeshBasicMaterial
      mat.map?.dispose()
      mat.dispose()
    }
  }
}

const _pos = new Vector3()
const _rot = new Quaternion()
const _avanti = new Vector3()
const _su = new Vector3()
