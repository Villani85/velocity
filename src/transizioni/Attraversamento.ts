import {
  ShaderMaterial,
  Texture,
  Vector2, Box3, CircleGeometry, Group, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, PointLight, Vector3 } from 'three'

/**
 * L'ATTRAVERSAMENTO — il momento del sito.
 *
 * COSA DEVE SUCCEDERE.
 *
 * La camera arriva al faro. La lente riempie il quadro. Si continua a
 * scorrere e si passa DENTRO il vetro. Dall'altra parte non ci sono lampadine
 * e plastica: la geometria ottica si e' aperta in un corridoio monumentale, e
 * si avanza dentro di esso finche' il metallo non diventa telaio e ci si
 * ritrova nell'abitacolo.
 *
 * Zero dissolvenze, zero nero, zero cambio di pagina percepito.
 *
 * LO SCAMBIO NON E' «QUASI INVISIBILE»: E' MATEMATICAMENTE ESATTO.
 *
 * Questa e' la parte di cui vado piu' fiero e vale la pena scriverla per
 * esteso, perche' e' un caso in cui la geometria regala una garanzia che
 * nessuna quantita' di taratura potrebbe dare.
 *
 * Una camera prospettica non misura le distanze: misura gli ANGOLI. Un
 * oggetto di raggio r visto da distanza d sottende esattamente lo stesso
 * angolo di un oggetto di raggio 200r visto da distanza 200d. Quindi se al
 * momento dello scambio esprimo la posizione della camera in RAGGI DI BOCCA
 * invece che in metri, la vista prima e dopo non e' simile: e' IDENTICA,
 * pixel per pixel.
 *
 * Non c'e' niente da nascondere perche' non cambia niente. E' l'unico modo
 * onesto di rispettare la regola 3 («nessuno stacco percepibile») su un salto
 * di scala di duecento volte.
 *
 * Il montante — la decisione D2, lo scambio in occlusione, misurato al 98,9%
 * di copertura — restava un ottimo trucco: c'era un istante buio in cui
 * sostituivo la scena. Qui non serve piu' nessun istante buio.
 *
 * E QUELLO CHE C'E' DALL'ALTRA PARTE E' LO STESSO OGGETTO.
 *
 * Il corridoio non e' un modello nuovo. E' `faro.glb`, moltiplicato per
 * duecento. Le undici coste del riflettore diventano campate ogni 2,98 metri;
 * la canna da 104 mm diventa una volta da 20,8 metri; la parabola in fondo
 * diventa un'abside. Le misure sono state scelte in `strumenti/faro.py`
 * perche' funzionassero in tutte e due le letture — se a 200x fossero venute
 * campate da 40 centimetri, il pezzo andava rifatto, non ritoccato.
 *
 * PERCHE' IL VETRO SI ATTRAVERSA DOPO LO SCAMBIO, e non prima.
 *
 * Al momento dello scambio la camera e' ancora FUORI dalla calotta. Il che
 * significa che il passaggio attraverso il vetro — il gesto che da' il nome a
 * tutto — avviene nella versione grande: non si buca una lente da otto
 * centimetri, si attraversa una parete di vetro da quindici metri.
 *
 * Non era il piano: e' venuto fuori dai numeri. Ed e' meglio del piano.
 */

/**
 * DUECENTO, e il numero non e' arbitrario.
 *
 * E' il fattore che porta la canna da 104 mm a 20,8 metri, cioe' alla luce
 * di una navata. Piu' basso (50x, 4 metri) e' un tunnel di servizio: si
 * legge come un condotto, non come un'architettura. Piu' alto (500x, 52
 * metri) e' un hangar, e un hangar non ha scala umana — paradossalmente
 * torna a sembrare piccolo, perche' non c'e' piu' niente con cui misurarlo.
 *
 * Venti metri e' la misura in cui un essere umano si sente dentro qualcosa
 * di monumentale ed e' ancora capace di sentirne il bordo.
 */
// 115 E NON 200, ricalcolato dopo aver misurato l'ottica montata.
//
// Il conto di prima partiva dal modello (canna da 104 mm x 200 = 20,8 m). Ma
// l'ottica in scena non e' alla scala del modello: `innestaFaro` la
// ridimensiona sull'apertura del faro generato, e li' e' venuta 1,41 volte
// piu' grande. Con 200 la galleria usciva da 42 metri — che e' un hangar, e
// un hangar non ha scala umana.
//
// 115 riporta la canna a 20,1 metri e le campate a 2,4: la luce di una
// navata, con l'interasse di un porticato. Sono le stesse misure della corte
// in cui l'auto e' parcheggiata, e non e' un caso che funzionino — sono le
// misure con cui si costruisce da duemila anni.
export const SCALA = 115

/** quanto brilla di suo il metallo delle coste: vedi `accendi()` */
const EMISSIONE_COSTE = 0.035

/**
 * DOVE AVVIENE LO SCAMBIO, in raggi di bocca.
 *
 * 0,95 vuol dire: la camera sta a una distanza pari al 95% del raggio della
 * bocca. Da li' la bocca sottende un angolo di 46 gradi per lato — molto piu'
 * del mezzo campo visivo, che a fov 40 su formato 16:10 vale 30 gradi in
 * orizzontale. Cioe' l'ottica copre TUTTO il fotogramma, angoli compresi.
 *
 * E' l'equivalente del 98,9% di copertura del montante, ma ottenuto per
 * costruzione invece che per taratura: qui non c'e' un numero da azzeccare,
 * c'e' una disuguaglianza da rispettare. Va comunque verificato con
 * `strumenti/occlusione.mjs`, perche' la bocca e' una superellisse e gli
 * angoli stanno piu' lontani del raggio nominale.
 */
export const SOGLIA = 0.95

const SU = /*@__PURE__*/ new Vector3(0, 1, 0)

export class Attraversamento {
  /** il corridoio: la stessa ottica, moltiplicata per SCALA */
  readonly gruppo = new Group()
  /** la bocca dell'ottica piccola, in coordinate mondo */
  readonly bocca = new Vector3()
  /** l'asse, dalla bocca verso l'interno dell'ottica */
  readonly dentro = new Vector3()
  /** il raggio della bocca, in metri */
  raggio = 0.06
  /** la profondita' utile della canna piccola, in metri */
  profondita = 0.22

  pronto = false
  /** si tengono per poter RIALLINEARE quando il soggetto ruota */
  private innesto: Object3D | null = null
  private versoMuso = new Vector3()
  /** centro e direzione dell'ottica come stavano prima che il soggetto girasse */
  private centroFermo = new Vector3()
  private musoFermo = new Vector3()
  private giroFatto = Number.NaN
  /** le luci del corridoio: stanno in scena sempre, si accendono con `accendi` */
  luci: PointLight[] = []
  private forze: number[] = []

  /**
   * `q` da 0 a 1: quanto e' acceso il corridoio. Non e' un interruttore —
   * le luci salgono mentre la camera si avvicina alla soglia, cosi' quello
   * che si intravede dentro l'ottica PRIMA di entrarci e' gia' illuminato.
   * Se si accendessero allo scambio, lo scambio si vedrebbe: sarebbe
   * l'unica cosa che cambia in un'immagine altrimenti identica.
   */
  /** il metallo delle coste: `accendi` gli scrive quanto deve brillare */
  private architettura: MeshStandardMaterial | null = null

  /**
   * ACCENDE IL CORRIDOIO — le lampade E il metallo.
   *
   * IL BUCO NERO ERA UNO STROBOSCOPIO, e ci sono volute quattro diagnosi.
   *
   * Le prime tre le ho scritte e misurate tutte, e sono tutte sbagliate:
   *
   *   1. «il disco della strada nasce troppo tardi» — anticipato due volte,
   *      da 0,905 a 0,79 a 0,68. Il buco e' rimasto.
   *   2. «le luci calano troppo presto» — discesa spostata dall'ultimo quarto
   *      all'ultimo decimo. Il buco e' rimasto.
   *   3. «la camera sorpassa le lampade» — scritto il codice per farsele
   *      trainare, misurato, numeri IDENTICI. La camera arriva al 43% della
   *      canna e la lampada sta al 70%: non la sorpassa mai. Codice tolto.
   *   4. «le lampade non bastano a fondo canna» — aggiunto un guadagno che
   *      cresceva con l'affondo. Alzava tutto insieme: portato a dodici volte,
   *      i minimi salivano da 17 a 44 ma i massimi da 87 a 92. Codice tolto.
   *
   * A spiegarlo e' stato `strumenti/raccordo.mjs`, che invece di guardare
   * quattro provini misura la luminanza di QUARANTA fotogrammi di fila. La
   * curva non scende: OSCILLA.
   *
   *     locale   0,65   0,67   0,70   0,72   0,75   0,77   0,80   0,82   0,85
   *     luminanza  50     40     23     17     19     34     65     57     29
   *
   * Massimo, minimo, massimo, minimo, con un periodo di circa dodici centesimi
   * di beat — che e' esattamente il passo con cui la camera supera le coste.
   * Il fotogramma non si sta spegnendo: sta LAMPEGGIANDO, e un lampeggio con
   * un rapporto di quattro a uno l'occhio lo legge come un taglio di montaggio.
   * E' anche il motivo per cui nessuna correzione sui tempi poteva chiuderlo, e
   * perche' ogni volta che guardavo un provino fermo mi sembrava a posto: in un
   * fotogramma solo uno stroboscopio non si vede.
   *
   * LA CAUSA E' IL MATERIALE, ED E' UNA SCELTA CHE RESTA.
   *
   * Le coste sono metallo quasi specchio — 0,88 di metallicita', 0,18 di
   * ruvidita', colore 0,035 — e la ragione sta scritta per esteso dov'e'
   * costruito: dentro un gruppo ottico non c'e' pietra, c'e' cromo, e le coste
   * devono essere lame chiare su nero. E' giusto e non si tocca.
   *
   * Ma uno specchio si vede solo dove ci si riflette dentro qualcosa. Mentre la
   * camera avanza, le strisce di luce corrono via dalle coste e per mezzo metro
   * non c'e' NIENTE che rimandi luce all'obiettivo: da qui il minimo. Alzare le
   * lampade non serve, perche' alza anche i massimi — l'ho misurato.
   *
   * LA CURA E' UN PAVIMENTO DI LUCE, non piu' luce.
   *
   * Un filo di emissione sul metallo: non dipende da dove sta la camera, quindi
   * non lampeggia, e mette sotto l'oscillazione un valore che non scende mai.
   * Le lame restano lame — l'emissione e' molto piu' debole del riflesso — ma
   * il nero fra una lama e l'altra smette di essere nero.
   *
   * E' anche l'unica cosa fisicamente vera delle cinque che ho provato. Questo
   * non e' un tubo di metallo: e' l'interno di un riflettore con una lampada da
   * quattromila watt accesa dentro. Un riflettore acceso, visto da dentro, non
   * ha zone buie fra un lobo e l'altro — brilla tutto.
   */
  accendi(q: number) {
    const k = Math.min(Math.max(q, 0), 1)
    for (let i = 0; i < this.luci.length; i++) this.luci[i].intensity = this.forze[i] * k
    if (this.architettura) this.architettura.emissiveIntensity = k * EMISSIONE_COSTE
  }

  /**
   * L'IRIDE — il fotogramma si chiude sulla LUCE, non su una parete.
   *
   * IL DIFETTO CHE CORREGGE, misurato sul filmato. Dal secondo 41 al 43 il
   * fotogramma era un campo beige uniforme con un puntino chiaro in mezzo: tre
   * secondi di niente subito dopo il momento migliore del sito. Non era un
   * errore di caricamento ne' un ritaglio: era il FONDO DELLA GALLERIA. La
   * camera ci arrivava a ridosso, e da li' non ci sono piu' coste da vedere —
   * c'e' una parete piatta illuminata da una lampada calda che riempie
   * l'obiettivo.
   *
   * LA CORREZIONE NON E' ILLUMINARE MEGLIO QUELLA PARETE. E' non arrivarci.
   *
   * Una transizione attraverso un oggetto si chiude in un modo solo che
   * funzioni: la sorgente in fondo diventa cosi' luminosa da mangiarsi il
   * fotogramma. E' un'iride di luce, ed e' esattamente quello che succede
   * all'occhio quando esce da un tunnel — non si vede la parete, si vede
   * bianco. Sopra la soglia del bagliore (2,6) ci pensa il bloom a spalmarla
   * fino ai bordi.
   *
   * Il vantaggio non e' solo estetico: il fotogramma pieno di luce e' l'unico
   * istante in cui si puo' scambiare il mondo senza che nessuno se ne accorga,
   * perche' non c'e' nessuna forma da confrontare fra prima e dopo.
   *
   * `q` va da 0 (niente) a 1 (fotogramma chiuso). Alla quarta potenza: per tre
   * quarti della corsa non succede quasi niente e nell'ultimo quarto succede
   * tutto. Una rampa lineare si legge come una luce che si accende, questa si
   * legge come una luce in cui si sta entrando.
   */
  iride(q: number) {
    const k = Math.min(Math.max(q, 0), 1)
    this.iridePiena = k
    const fuoco = this.luci[0]
    // la puntiforme sale lo stesso, ma di poco: su un metallo quasi specchio il
    // suo mestiere non e' illuminare, e' mettere un riflesso netto sulle coste
    if (fuoco) fuoco.intensity = this.forze[0] * (1 + 6 * k * k)

    const d = this.disco
    const u = (d.material as ShaderMaterial).uniforms
    d.visible = k > 0.001

    /* LA CRESCITA RESTA AL QUADRATO — il buco si apre piano e poi di scatto,
       che e' come si apre un diaframma — ma adesso quello che cresce non e'
       una macchia di luce: e' la quantita' di mondo nuovo che si vede. */
    const c = k * k
    const scala = 0.1 + c * 5.4
    d.scale.set(scala, scala, 1)

    // il contenuto entra subito e resta pieno: e' una finestra, non una
    // dissolvenza. Quello che cambia e' quanto e' grande.
    u.uForza.value = Math.min(1, k * 6)
    /* E IL BORDO SI ACCENDE E SI SPEGNE. Forte a meta' corsa, quando il buco
       sta correndo; quasi spento alla fine, quando il mondo nuovo ha gia'
       riempito il fotogramma e un anello luminoso sarebbe solo un residuo.
       E' l'unico bianco rimasto di tutta la transizione. */
    /* 3,0 E NON 4,2, E L'ANELLO E' PIU' STRETTO.
       A 4,2 il bordo superava la soglia del bagliore di un terzo e il bloom
       gli costruiva intorno un alone largo mezzo fotogramma: nel provino, a
       meta' corsa, lo schermo tornava bianco — cioe' esattamente il difetto
       che questa riscrittura esiste per togliere, rientrato dal bordo invece
       che dal centro.
       A 3,0 la soglia (2,6) la supera di poco: l'anello si accende e resta un
       anello. E' l'unico bianco di tutta la transizione, e deve restare un
       filo. */
    /* E ADESSO NON HA PIU' IL MASSIMO A META' CORSA, ce l'ha SUBITO.
       Il seno metteva il picco esattamente a k = 0,5, e in quel punto valeva
       3,25 — sopra la soglia del bagliore. Sulla curva di luminanza misurata da
       `strumenti/raccordo.mjs` si vede benissimo: a meta' transizione il
       fotogramma risaliva del trentuno per cento contro un andamento che stava
       scendendo, e subito dopo crollava del trentacinque. Un lampo e un tonfo,
       nel punto piu' delicato del sito.
       Adesso e' massimo quando il disco e' piccolo — che e' anche quando ha
       senso, perche' li' l'iride e' un PUNTO DI LUCE — e si spegne mentre il
       disco cresce, cioe' mentre quello che c'e' dentro comincia a bastare da
       solo. Il valore massimo resta 3,0 e la soglia (2,6) la supera sempre di
       poco: l'anello si accende e resta un anello. */
    const g = 1 - Math.min(k, 1)
    // 2,3 e non 3,0: sotto la soglia del bagliore (2,6) invece che sopra. Un
    // orlo che fiorisce si stacca dallo sfondo e torna a essere un elemento;
    // uno che resta sotto e' luce che c'e' e basta. La corona adesso e' larga,
    // quindi la stessa quantita' di luce si distribuisce e non serve spingerla.
    u.uBordo.value = 2.3 * g * g + 0.22
    /* E L'ORLO SI STRINGE MENTRE IL DISCO CRESCE.
       Allargarlo era la cura giusta per il difetto giusto — un cerchio netto
       racconta un buco che si apre — ma a larghezza fissa creava un difetto
       nuovo: a meta' corsa la corona e' grande, e una corona grande e chiara
       e' un'area luminosa. Misurato, il fotogramma risaliva del quaranta per
       cento contro un andamento che scendeva. E' lo stesso identico difetto
       del seno che avevo tolto due giri fa, rientrato da un'altra porta.
       Larga quando il disco e' un punto, dove serve a non far vedere il bordo;
       stretta quando il disco e' meta' schermo, dove il bordo lo copre gia' la
       strada che ci sta dentro. */
    u.uOrlo.value = 0.72 + (0.965 - 0.72) * Math.min(k, 1)
  }

  /** quanto e' chiusa l'iride: la legge la regia per decidere quando scambiare */
  iridePiena = 0

  /**
   * IL DISCO — la sorgente vera dell'iride, e il cerchio che diventa il mondo
   * dopo.
   *
   * PERCHE' UNA LUCE PUNTIFORME NON BASTA. Da quando la galleria e' metallo
   * quasi specchio (ruvidita' 0,18), una sorgente puntiforme non la illumina:
   * un metallo non ha componente diffusa, restituisce solo il RIFLESSO della
   * sorgente — e il riflesso di un punto e' un punto. Nei provini si vedeva
   * esattamente cosi': alzando l'intensita' di trentacinque volte, il
   * fotogramma restava nero con un puntino in mezzo.
   *
   * Per chiudere un fotogramma con la luce serve una SUPERFICIE che emette, non
   * un punto che illumina. Un disco: sul metallo si specchia come un disco, e
   * crescendo si mangia il quadro.
   *
   * E c'e' la seconda ragione, che e' quella che conta di piu': quel disco e'
   * la stessa forma da cui nasce il mondo successivo. Il fotogramma non passa
   * per un nero ne' per una dissolvenza — passa per un CERCHIO, che e' la forma
   * che c'era gia' (la lente del faro) e quella che ci sara' (il quadrante
   * dello strumento). Chi guarda non trova il punto in cui e' cambiato tutto,
   * perche' non c'e' nessun taglio: c'e' una forma che continua.
   *
   * `toneMapped: false` e colore oltre l'uno: deve superare la soglia del
   * bagliore (2,6) e restarci. Una sorgente che passa per la curva di
   * esposizione della scena si spegne insieme alla notte, ed e' l'esatto
   * contrario di quello che deve fare.
   */
  /**
   * L'IRIDE — e non e' piu' un disco bianco: e' una FINESTRA sul mondo che
   * arriva.
   *
   * IL DIFETTO CHE CHIUDE.
   *
   * Prima era un cerchio bianco che cresceva finche' riempiva il fotogramma, e
   * dietro quel bianco avveniva lo scambio fra le due scene. Funzionava — lo
   * scambio non si vedeva — e raccontava la cosa sbagliata. Quello che il
   * cervello leggeva era:
   *
   *     mondo A  →  BIANCO  →  mondo B
   *
   * cioe' due scene separate da uno stacco, che e' esattamente il contrario di
   * quello che il percorso deve dire: che si sta ATTRAVERSANDO una cosa sola.
   *
   * COSA FA ADESSO. Dentro il cerchio non c'e' bianco: c'e' l'interno, gia'
   * disegnato, in un bersaglio a meta' risoluzione. Il cerchio cresce e il
   * mondo nuovo si allarga dentro il vecchio:
   *
   *     galleria  →  un disco di STRADA dentro la galleria  →  strada
   *
   * Il bianco resta, e solo dove serve: un bordo emissivo sottile sul
   * perimetro del cerchio. E' la luce del passaggio, non il passaggio.
   *
   * PERCHE' IN COORDINATE SCHERMO. Il bersaglio contiene un fotogramma intero
   * dell'interno, inquadrato dalla sua camera. Campionandolo con le UV del
   * disco si vedrebbe quel fotogramma schiacciato dentro un cerchio — una
   * figurina. Campionandolo con la posizione sullo schermo, il disco diventa
   * un BUCO: quello che ci si vede dentro e' esattamente cio' che si vedrebbe
   * se il vecchio mondo non ci fosse. E' la differenza fra una finestra e un
   * poster.
   */
  private disco = /*@__PURE__*/ (() => {
    const m = new Mesh(
      new CircleGeometry(0.5, 96),
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uMondo: { value: null },
          uMisura: { value: new Vector2(1, 1) },
          uForza: { value: 0 },
          uBordo: { value: 0 },
          /** dove comincia l'orlo, in frazione di raggio: si stringe crescendo */
          uOrlo: { value: 0.72 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uMondo;
          uniform vec2 uMisura;
          uniform float uForza;
          uniform float uBordo;
          uniform float uOrlo;
          varying vec2 vUv;
          void main() {
            // il mondo nuovo si campiona in coordinate SCHERMO: il disco e' un
            // buco nel mondo vecchio, non uno schermo appeso dentro di lui
            vec3 dietro = texture2D(uMondo, gl_FragCoord.xy / uMisura).rgb;

            // quanto si e' lontani dal centro del disco, da 0 a 1
            float r = length(vUv - 0.5) * 2.0;

            // IL BORDO E' L'UNICA COSA BIANCA. Un anello stretto sul
            // perimetro, che e' la luce del passaggio: la si vede correre
            // sull'orlo del buco mentre si allarga, ed e' quello che resta
            // dell'iride di prima.
            // L'ORLO E' LARGO IL QUADRUPLO E MENO ACCESO, e il motivo e' che
            // era diventato l'ultimo indizio rimasto. Con una corona spessa sei
            // millesimi di raggio si legge come una RIGA — un cerchio bianco
            // netto — e un cerchio netto racconta un buco che si apre, cioe'
            // due immagini separate da un bordo. Allargata a un quarto di
            // raggio e sfumata dalle due parti diventa un alone: i due mondi si
            // toccano invece di essere divisi da un filo.
            float orlo = smoothstep(uOrlo, 0.985, r) * (1.0 - smoothstep(0.985, 1.0, r));
            vec3 luce = vec3(1.0, 0.985, 0.95) * orlo * uBordo;

            // e il buco si chiude con un margine morbido: netto sarebbe una
            // maschera, sfumato e' una lente
            float dentro = 1.0 - smoothstep(0.90, 1.0, r);
            gl_FragColor = vec4(dietro * dentro + luce, (dentro + orlo) * uForza);
          }
        `,
      }),
    )
    m.name = 'IRIDE'
    m.position.z = -1
    m.renderOrder = 900
    m.visible = false
    return m
  })()

  /** il bersaglio con dentro il mondo che arriva: lo riempie `core/Esperienza` */
  set mondoDietro(t: Texture | null) {
    const u = (this.disco.material as ShaderMaterial).uniforms
    u.uMondo.value = t
  }

  /** la misura del fotogramma, in pixel di disegno */
  misuraSchermo(l: number, a: number) {
    const u = (this.disco.material as ShaderMaterial).uniforms
    ;(u.uMisura.value as Vector2).set(l, a)
  }

  /**
   * IL DISCO STA APPESO ALLA CAMERA, non alla galleria.
   *
   * Alla prima stesura l'avevo messo in fondo alla canna, dentro il gruppo che
   * ruota col soggetto: sembrava piu' corretto — e' li' che sta la sorgente —
   * ed e' finito da qualche altra parte. La posizione dipendeva da `dentro`,
   * che e' un verso di mondo, applicata dentro un sistema gia' ruotato, con un
   * `lookAt` che lavora anche lui in mondo: tre sistemi di riferimento in tre
   * righe. Nei provini non si vedeva niente e non c'era nessun errore da
   * leggere.
   *
   * Appeso alla camera non puo' sbagliare: sta a un metro davanti
   * all'obiettivo, sempre perpendicolare, e cresce. E' anche cio' che un'iride
   * E' davvero — non un oggetto nel mondo, ma qualcosa che succede all'occhio.
   *
   * `depthTest: false` perche' deve coprire tutto, comprese le coste che gli
   * passano accanto: e' luce che invade, non un oggetto in mezzo agli altri.
   */
  agganciaIride(camera: PerspectiveCamera) {
    if (this.disco.parent !== camera) camera.add(this.disco)
  }

  /**
   * Si costruisce DALL'OTTICA GIA' IN SCENA, non da misure scritte a mano.
   *
   * L'ottica e' stata posata misurando lo zoccolo del faro generato, che a
   * sua volta dipende dal modello, che si rigenera. Riscrivere qui le sue
   * coordinate significherebbe avere due verita' che divergono al primo
   * cambio di asset — e divergerebbero in silenzio, perche' un corridoio
   * disallineato di dieci centimetri a scala 1 e' disallineato di venti
   * METRI a scala 200.
   */
  costruisci(innesto: Object3D, versoMuso: Vector3) {
    innesto.updateWorldMatrix(true, true)
    // SI MISURA NELLO SPAZIO LOCALE, e la prima stesura non lo faceva.
    //
    // `Box3.setFromObject` restituisce una scatola allineata agli assi del
    // MONDO. L'ottica pero' e' ruotata: `innestaFaro` le ha portato l'asse
    // sul muso, e un faro DESTRO sta di lato rispetto al centro dell'auto —
    // quindi quell'asse ha componenti su x e su z insieme, inclinato di una
    // ventina di gradi.
    //
    // Su una scatola allineata al mondo, la larghezza misurata lungo z
    // contiene gia' una fetta della LUNGHEZZA della canna. Con 18 gradi:
    // 0,30 x sin18 + 0,21 x cos18 = 0,29 invece di 0,21, cioe' il raggio
    // usciva del QUARANTA PER CENTO piu' grande del vero.
    //
    // E il raggio non e' un numero fra tanti: e' l'unita' di misura di tutto
    // l'attraversamento. `SOGLIA x raggio` decide dove avviene lo scambio, e
    // con un raggio gonfio la camera resta troppo LONTANA dalla bocca —
    // quindi la bocca non copre tutto il fotogramma, e la disuguaglianza su
    // cui si regge l'invarianza di scala non e' piu' rispettata. Lo scambio
    // «matematicamente esatto» smetteva di esserlo per il piu' banale dei
    // motivi: una misura presa nel sistema di riferimento sbagliato.
    //
    // Si annulla la rotazione per un istante, si misura, si rimette. Con
    // rotazione identica l'asse dell'ottica torna a coincidere con un asse
    // cardinale, e la scatola dice la verita'.
    this.innesto = innesto
    this.versoMuso.copy(versoMuso)
    const rotazione = innesto.quaternion.clone()
    innesto.quaternion.identity()
    innesto.updateWorldMatrix(true, true)
    const misuraLocale = new Vector3()
    new Box3().setFromObject(innesto).getSize(misuraLocale)
    innesto.quaternion.copy(rotazione)
    innesto.updateWorldMatrix(true, true)
    const iAsseLocale = misuraLocale.x > misuraLocale.y && misuraLocale.x > misuraLocale.z
      ? 0 : misuraLocale.y > misuraLocale.z ? 1 : 2

    const scatola = new Box3().setFromObject(innesto)
    const misura = new Vector3()
    const centro = new Vector3()
    scatola.getSize(misura)
    scatola.getCenter(centro)

    // LA DIREZIONE ARRIVA DA FUORI, non si legge dall'oggetto.
    //
    // `getWorldDirection()` restituisce lo Z locale, e l'asse dell'ottica non
    // e' detto che sia Z: `innestaFaro` lo trova misurando la scatola e puo'
    // essere X, Y o Z a seconda di come l'esportatore ha convertito gli assi.
    // Leggere Z «tanto di solito e' quello» e' esattamente il tipo di
    // assunzione che qui costa caro: uno sbaglio di dieci centimetri a scala
    // 1 diventa venti METRI a scala 200, e il corridoio si apre da un'altra
    // parte senza dare nessun errore.
    const avanti = versoMuso.clone().normalize()

    // la BOCCA e' l'estremo della scatola dalla parte del muso
    // meta' della lunghezza VERA dell'ottica, presa dalla misura locale: non
    // la proiezione di una scatola ruotata su una direzione inclinata
    const sporgenza = misuraLocale.getComponent(iAsseLocale) / 2
    this.bocca.copy(centro).addScaledVector(avanti, sporgenza)
    this.dentro.copy(avanti).negate()
    this.profondita = sporgenza * 2

    // IL CENTRO E IL MUSO SI MEMORIZZANO NEL SISTEMA CHE RUOTA.
    //
    // Da qui in poi il soggetto gira, e la bocca del faro con lui. Sapere
    // dov'era all'inizio e di quanto e' girato basta a sapere dov'e' adesso:
    // e' una rotazione di un punto, otto moltiplicazioni. L'alternativa —
    // rimisurare la scatola dell'ottica — costa cinquemila vertici per
    // fotogramma e da' lo stesso numero.
    const giro0 = innesto.parent?.rotation.y ?? 0
    this.centroFermo.copy(centro).applyAxisAngle(SU, -giro0)
    this.musoFermo.copy(avanti).applyAxisAngle(SU, -giro0)

    // IL RAGGIO DELLA BOCCA: il piu' largo dei due assi che NON sono l'asse.
    //
    // La prima stesura moltiplicava ogni lato per (1 - |componente dell'asse|)
    // «per togliere la parte lungo l'asse». Non toglie niente: SCALA tutti e
    // tre, e il minimo di tre numeri scalati e' un numero senza significato.
    // Il risultato misurato era un raggio di 9 mm invece di 107, cioe' una
    // galleria da 3,7 metri invece che da venti — un corridoio di servizio.
    //
    // Il difetto era muto: nessun errore, nessun avviso, solo un corridoio
    // della misura sbagliata. L'ha stanato la riga di diagnostica che stampa
    // la conversione in metri — ed e' il motivo per cui vale la pena stampare
    // le grandezze nell'unita' in cui uno sa giudicarle.
    //
    // Si ordinano i tre assi per quanto sono allineati alla direzione del
    // muso: il piu' allineato E' l'asse, gli altri due sono la sezione. Il
    // PIU' LARGO dei due, non il piu' stretto, perche' quello che deve
    // coprire il fotogramma e' l'ingombro massimo, non quello minimo.
    this.raggio = Math.max(
      ...[0, 1, 2].filter((i) => i !== iAsseLocale).map((i) => misuraLocale.getComponent(i)),
    ) / 2

    // IL CORRIDOIO: la stessa geometria, moltiplicata, CON LA BOCCA FERMA.
    //
    // Scalare intorno al centro dell'oggetto sposterebbe la bocca di venti
    // metri, e la corrispondenza fra le due viste — che e' tutto — salterebbe.
    // Si porta la bocca nell'origine del figlio e si mette il perno sulla
    // bocca: cosi' il punto che i due mondi devono avere in comune resta
    // esattamente dov'e', qualunque sia la scala.
    const copia = innesto.clone(true)
    copia.name = 'CORRIDOIO_OTTICA'

    // IL CORRIDOIO HA MATERIALI SUOI, e questa e' una scoperta, non un vezzo.
    //
    // Al primo tentativo il corridoio usava gli stessi materiali dell'ottica
    // piccola — un clone condivide i materiali — e usciva NERO PIENO: sette
    // fotogrammi identici, differenza 0,00. La geometria c'era (un materiale
    // di prova l'ha mostrata tutta), le luci erano accese, la camera era al
    // posto giusto.
    //
    // La causa: `metalness: 1`. Un metallo puro NON HA COMPONENTE DIFFUSA —
    // per definizione, non per approssimazione. Le quattro luci puntiformi
    // dentro la canna non potevano illuminarlo: su un metallo una luce
    // puntiforme produce un puntino speculare e nient'altro. Tutto il resto
    // sarebbe dovuto arrivare dalla mappa d'ambiente, che pero' e' stata
    // generata FUORI, nella corte, e dentro un tubo chiuso non c'entra nulla.
    //
    // Ed e' anche giusto che i due siano diversi: il racconto dice che le
    // superfici del faro DIVENTANO architettura. Un riflettore e' alluminio
    // metallizzato; una volta e' pietra e bronzo. Qui la trasformazione e'
    // letterale — stessa geometria, materia diversa.
    const architettura = new MeshStandardMaterial({
      // 0,25 e non 1: quel tanto di metallo che basta a tenere il carattere
      // bronzeo nei riflessi, lasciando pero' una diffusa vera su cui le
      // luci possano lavorare. E' la ragione per cui le coste si leggono come
      // arcate: un'arcata si riconosce dal GRADIENTE sulla sua curva, e il
      // gradiente lo fa la diffusa.
      // METALLO SCURO E LUCIDO, non pietra chiara.
      //
      // IL DIFETTO, misurato sui fotogrammi del filmato. Fra il secondo 41 e il
      // 43 il quadro era un campo beige uniforme, e per due giri ho dato la
      // colpa al fondo della galleria — pensavo che la camera ci arrivasse a
      // ridosso. Non era quello: erano LE PARETI. Colore 0,34/0,29/0,24, cioe'
      // una pietra chiara calda, con addosso una lampada da quattromila watt.
      // Un tubo di pietra chiara illuminato forte, visto da dentro, e' un campo
      // beige — non c'era nessun errore, era esattamente quello che avevo
      // costruito.
      //
      // E soprattutto era la cosa sbagliata da costruire. Qui non si e' dentro
      // una galleria: si e' dentro un GRUPPO OTTICO. Un faro dentro e' nero e
      // cromato, con la luce che ci corre sopra a strisce. La materia giusta
      // non riflette il colore, riflette la FORMA della luce — e le coste, che
      // fino a ieri erano cornici illuminate, diventano lame chiare su nero.
      //
      // 0,88 di metallicita' e 0,18 di ruvidita': quasi specchio. Il colore
      // scende a 0,035, cioe' quasi nero, perche' su un metallo il colore
      // tinge il riflesso e non la superficie — un metallo chiaro con una
      // lampada dentro torna a essere beige.
      metalness: 0.88,
      roughness: 0.32,
      /* L'EMISSIONE — il pavimento di luce che toglie lo stroboscopio.
         Colore quello della lampada, cosi' il filo di luce propria non si
         distingue dal riflesso che gia' c'era: se fosse bianco o azzurro si
         leggerebbe come una seconda sorgente e il corridoio avrebbe due
         famiglie di luce invece di una.
         L'intensita' la scrive `accendi()`: qui parte a zero perche' il
         corridoio esiste in scena molto prima di accendersi. */
      emissive: 0xfff0dc,
      emissiveIntensity: 0,
      // 0,10 e non 0,35: la mappa d'ambiente e' la fotografia della villa, e
      // qui dentro non c'entra niente — un corridoio chiuso non vede il
      // giardino. Lasciandola alta, le pareti ricevevano la luce di un posto
      // che in quel momento non esiste, e il fondo si schiariva senza ragione.
      // e la mappa d'ambiente sale: su un metallo quasi specchio e' lei a
      // dare il grigio di fondo, e a 0,10 il tubo sarebbe nero pieno
      envMapIntensity: 0.55,
    })
    architettura.color.setRGB(0.035, 0.038, 0.045)
    // LA NEBBIA VA SPENTA QUI, e la ragione e' sottile.
    //
    // Tutto l'attraversamento si regge su un'affermazione: una camera
    // prospettica misura ANGOLI, quindi un oggetto di raggio r a distanza d e
    // uno di raggio 200r a distanza 200d danno la stessa identica immagine.
    // Vero per la prospettiva. FALSO per la nebbia, che dipende dalla
    // distanza in metri e non dall'angolo.
    //
    // Al momento dello scambio l'ottica piccola sta a dieci centimetri
    // dall'obiettivo: nebbia zero. Il corridoio grande ha l'abside a quasi
    // cinquanta metri, cioe' dentro la fascia 34-96: un quinto del fondo
    // verrebbe mescolato col bruno caldo. Nel fotogramma esatto dello scambio
    // il fondo della canna cambierebbe colore di colpo — ed e' il tipo di
    // stacco che il misuratore di continuita' scuserebbe come «taglio in
    // occlusione» invece di segnalarlo, perche' cade dentro la finestra
    // dichiarata.
    //
    // La nebbia serve alla corte, che vive nella sua scala. Qui dentro la
    // scala non esiste per costruzione, e quindi non puo' esistere nemmeno
    // la nebbia.
    architettura.fog = false
    architettura.side = 2
    architettura.name = 'CORRIDOIO_PIETRA'
    copia.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      // la calotta resta vetro: e' la parete che si attraversa, e deve
      // restare trasparente anche a quindici metri
      if (o.name.includes('CALOTTA') || o.name.includes('ANELLO')) return
      mesh.material = architettura
    })
    copia.position.sub(this.bocca)
    this.architettura = architettura

    const perno = new Group()
    perno.name = 'CORRIDOIO'
    perno.position.copy(this.bocca)
    perno.scale.setScalar(SCALA)
    perno.add(copia)

    // LA LUCE DENTRO IL CORRIDOIO, e sta dove starebbe la lampadina.
    //
    // Senza, l'interno della canna riceve solo la mappa d'ambiente — che e'
    // stata generata FUORI, nella corte — e nel provino l'ultimo terzo del
    // percorso e' una superficie scura e informe con una macchia chiara in
    // mezzo. Un corridoio al buio non e' monumentale: e' solo buio.
    //
    // La sorgente principale sta NEL FUOCO DELLA PARABOLA. Non e' una scelta
    // scenografica: e' esattamente dove sta la lampadina di un proiettore
    // vero, ed e' il punto da cui la parabola e' progettata per riflettere.
    // Metterla li' significa che la luce si comporta come si comporterebbe
    // davvero — l'abside si accende in modo uniforme e le coste ricevono luce
    // radente, che e' cio' che le fa leggere come arcate invece che come
    // scanalature.
    //
    // E porta il racconto: si avanza verso una luce. Quella lampadina e' il
    // motivo per cui il faro esiste, ed e' la cosa verso cui si sta andando.
    // L'INTENSITA' SI RICAVA DALLA GEOMETRIA, non si scrive.
    //
    // Era 900, tarata a occhio su una galleria da 24,6 metri. Poi il raggio
    // della bocca e' stato corretto — era gonfio del quaranta per cento — e la
    // galleria e' diventata da 18: la stessa intensita' ha bruciato tutto,
    // perche' la camera arriva a otto metri dalla lampada invece che a trenta.
    // Nel provino gli ultimi quattro fotogrammi dell'attraversamento sono
    // BIANCO PIENO.
    //
    // Un numero scritto a mano regge finche' non cambia niente intorno. Qui
    // intorno cambia spesso — il modello si rigenera, il raggio si corregge,
    // la scala si ritocca — quindi il numero va legato a cio' da cui dipende,
    // se no ogni correzione a monte ne rompe uno a valle.
    //
    // Il conto: si vuole che dove la camera si FERMA l'irradianza valga circa
    // 0,9. La lampada sta al 95% della canna, la camera si ferma al 63%: fra
    // le due c'e' un terzo della lunghezza. Con decadimento quadratico,
    // intensita' = 0,9 per la distanza al quadrato.
    const lunghezza = this.profondita * SCALA

    // DECADIMENTO 1,2 E NON 2, e dentro un tubo e' l'unica scelta possibile.
    //
    // Con il decadimento quadratico — che e' quello fisico — l'irradianza
    // cambia di un fattore cento fra due metri e venti. In una stanza non e'
    // un problema, perche' le superfici stanno quasi tutte alla stessa
    // distanza dalla lampada. In un CORRIDOIO lungo trentacinque metri lo e'
    // eccome: qualunque intensita' che illumini decentemente il fondo brucia
    // tutto cio' che sta a meta' strada.
    //
    // E' successo esattamente cosi': l'abside si e' trovata a due metri dalla
    // lampada e nel provino gli ultimi quattro fotogrammi sono BIANCO PIENO,
    // con le coste visibili solo ai bordi.
    //
    // 1,2 non e' fisico ed e' quello che si fa in scena: in un ambiente
    // chiuso la luce che conta non e' quella diretta, e' quella rimbalzata —
    // che decade molto piu' lentamente. Un decadimento addolcito e' il modo
    // piu' economico di tenerne conto senza calcolare i rimbalzi.
    const DECADIMENTO = 1.2
    // si vuole irradianza circa 1 SULL'ABSIDE, che sta a un terzo della canna
    // davanti alla lampada
    const distanzaAbside = lunghezza * 0.30
    const fuoco = new PointLight(
      0xfff0dc, Math.pow(distanzaAbside, DECADIMENTO), lunghezza * 2.4, DECADIMENTO,
    )
    fuoco.name = 'FUOCO'
    fuoco.position
      .copy(this.bocca)
      // 0,70 e non 0,95: la lampada sta DAVANTI alla camera ma LONTANA
      // dall'abside. A 0,95 era appiccicata al fondo e lo bruciava; a 0,70
      // illumina l'abside da dieci metri e le coste da meta' canna.
      .addScaledVector(this.dentro, lunghezza * 0.70)

    // e tre luci deboli lungo la canna, per far vedere le coste anche prima
    // di arrivare in fondo. Deboli davvero: se pareggiano il fuoco, il fondo
    // smette di essere il punto verso cui si va e il corridoio diventa un
    // tubo illuminato a giorno.
    const lungo: PointLight[] = []
    for (const f of [0.18, 0.40, 0.62]) {
      // le tre lungo la canna: meno di un quinto del fuoco, con la stessa
      // regola. Devono far VEDERE le coste, non illuminare — se pareggiano il
      // fuoco, il fondo smette di essere il punto verso cui si va e il
      // corridoio diventa un tubo illuminato a giorno.
      // le tre lungo la canna: un quinto del fuoco, stessa regola e stesso
      // decadimento. Devono far VEDERE le coste, non illuminare — se
      // pareggiano il fuoco, il fondo smette di essere il punto verso cui si
      // va e il corridoio diventa un tubo illuminato a giorno.
      const l = new PointLight(
        0xffd9ae, 0.20 * Math.pow(distanzaAbside, DECADIMENTO),
        lunghezza * 0.9, DECADIMENTO,
      )
      l.position
        .copy(this.bocca)
        .addScaledVector(this.dentro, this.profondita * SCALA * f)
      lungo.push(l)
    }

    this.gruppo.clear()
    this.gruppo.add(perno)

    // LE LUCI STANNO FUORI DAL GRUPPO CHE SI ACCENDE E SI SPEGNE.
    //
    // In three il numero di luci di una scena e' una costante di
    // compilazione: entra nel preprocessore dello shader. Nascondere un
    // gruppo che le contiene cambia quel numero, e al fotogramma dopo OGNI
    // materiale della scena viene ricompilato — un blocco di centinaia di
    // millisecondi, che qui cadrebbe esattamente sullo scambio, cioe' nel
    // punto piu' delicato di tutto il sito.
    //
    // Restano quindi sempre in scena, e si accendono e si spengono
    // sull'INTENSITA'. Il conteggio non cambia mai, non si ricompila niente,
    // e una luce a intensita' zero costa quanto una moltiplicazione.
    this.luci = [fuoco, ...lungo]
    this.forze = this.luci.map((l) => l.intensity)
    this.accendi(0)
    this.gruppo.visible = false
    this.pronto = true
    return this
  }

  /**
   * RIALLINEA LA BOCCA quando il soggetto ha ruotato.
   *
   * Da quando la camera sta ferma e a girare e' l'AUTO (vedi
   * `transizioni/Camera.ts`), l'ottica del faro non e' piu' dove stava al
   * momento del caricamento: il gruppo dell'esterno ruota di oltre due
   * radianti fra l'orbita e la fine del lato.
   *
   * `bocca` e `dentro` erano stati misurati una volta sola, a rotazione zero.
   * Senza riallineare, la camera punterebbe dove il faro ERA e il corridoio
   * si aprirebbe da tutt'altra parte — e non ci sarebbe nessun errore a
   * dirlo, solo un attraversamento che manca il bersaglio.
   *
   * Si chiama UNA VOLTA, quando il soggetto ha finito di girare, non a ogni
   * fotogramma: la rotazione si ferma prima che il beat cominci, quindi dopo
   * quel momento la posa e' di nuovo stabile.
   */
  riallinea() {
    if (!this.innesto || !this.pronto) return
    const innesto = this.innesto

    // SI RICALCOLANO SOLO POSIZIONE E DIREZIONE, mai le misure.
    //
    // Alla prima stesura `riallinea` richiamava `costruisci`, cioe' rifaceva
    // tutto — compreso il raggio della bocca. Ed e' sbagliato per una ragione
    // che vale la pena scrivere: il raggio si misura annullando la rotazione
    // dell'oggetto, ma a quel punto il GENITORE e' ancora ruotato di due
    // radianti e passa, quindi la scatola torna a essere obliqua e il raggio
    // di nuovo gonfio. E' lo stesso difetto gia' corretto una volta, che
    // rientra da un piano piu' alto della gerarchia.
    //
    // Ma il raggio non ha nessun motivo di cambiare: ruotando un oggetto le
    // sue misure restano quelle. Cambiano solo DOVE sta la bocca e DOVE
    // guarda. Ricalcolare solo quelle e' insieme piu' corretto e piu'
    // economico — e toglie di mezzo per sempre la possibilita' che una
    // rotazione sporchi una misura.
    // E NON SI RIMISURA NIENTE, nemmeno il centro.
    //
    // Adesso questo metodo gira A OGNI FOTOGRAMMA — serviva a togliere il
    // salto di cinque metri che la camera faceva quando il riallineamento
    // scattava una volta sola a meta' beat — e una `Box3` sull'ottica costa
    // cinquemila vertici per volta per restituire un numero che si ottiene
    // ruotando un punto.
    //
    // Il centro e il muso sono stati memorizzati in `costruisci` nel sistema
    // che ruota. Da li' bastano una rotazione e una somma. E se il giro non e'
    // cambiato dall'ultima volta, non si fa nemmeno quella.
    const giro = innesto.parent?.rotation.y ?? 0
    if (Math.abs(giro - this.giroFatto) < 1e-6) return
    this.giroFatto = giro
    const centro = this.centroFermo.clone().applyAxisAngle(SU, giro)
    const avanti = this.musoFermo.clone().applyAxisAngle(SU, giro)

    // la sporgenza e' meta' della profondita', che e' gia' nota
    this.bocca.copy(centro).addScaledVector(avanti, this.profondita / 2)
    this.dentro.copy(avanti).negate()

    // e il corridoio si sposta con lei: la bocca grande deve restare
    // incollata a quella piccola, se no l'invarianza di scala salta
    const perno = this.gruppo.children[0]
    if (perno) {
      const copia = perno.children[0]
      if (copia) {
        // LO SCOSTAMENTO VA ESPRESSO NEL SISTEMA DEL PERNO, non in quello del
        // mondo — e questo e' il difetto che ha svuotato il corridoio due
        // volte di fila.
        //
        // `centro - bocca` e' un vettore MONDO. Ma il perno adesso e' ruotato
        // di `giro`, e tutto cio' che gli sta dentro ruota con lui: dandogli
        // quel vettore cosi' com'e', viene ruotato una seconda volta e la
        // bocca del corridoio finisce a decine di metri da quella dell'ottica.
        // A quel punto la camera guarda dentro il nulla e i fotogrammi
        // escono tutti identici — differenza 0,15 per sette passi di seguito.
        //
        // Si annulla la rotazione del perno sullo scostamento: cosi' il
        // vettore, riruotato dal perno, torna a essere quello di partenza.
        copia.position.copy(centro).sub(this.bocca)
          .applyAxisAngle(new Vector3(0, 1, 0), -giro)
      }
      perno.position.copy(this.bocca)
      perno.rotation.y = giro
    }

    // le luci seguono la bocca: sono in scena e non nel gruppo, quindi non si
    // spostano da sole
    for (let i = 0; i < this.luci.length; i++) {
      const f = i === 0 ? 0.70 : [0.18, 0.40, 0.62][i - 1]
      this.luci[i].position
        .copy(this.bocca)
        .addScaledVector(this.dentro, this.profondita * SCALA * f)
    }
  }

  /**
   * La posa della camera, espressa in RAGGI DI BOCCA.
   *
   * `u` positivo = fuori dall'ottica, davanti alla lente.
   * `u` negativo = dentro la canna.
   *
   * `grande` sceglie in quale dei due mondi. La stessa `u` da' la stessa
   * identica immagine nei due — e' l'invariante su cui si regge tutto il
   * passaggio, quindi sta in una funzione sola e non in due.
   */
  posa(camera: PerspectiveCamera, u: number, grande: boolean, mira: Vector3) {
    const k = grande ? SCALA : 1
    camera.position
      .copy(this.bocca)
      .addScaledVector(this.dentro, -u * this.raggio * k)
    // SI GUARDA IN FONDO ALLA CANNA, sempre l'abside.
    //
    // Non e' solo puntamento: e' cio' che da' la sensazione di avanzare. In
    // un corridoio lo sguardo dritto sul fondo fa scorrere le campate ai lati
    // del campo visivo, e sono quelle a dire la velocita'. Uno sguardo che
    // vaga in un corridoio produce l'effetto opposto — sembra di galleggiare.
    //
    // La mira si SCRIVE invece di applicarla qui, cosi' il resto della regia
    // continua a vedere una mira come per tutti gli altri beat e non serve un
    // percorso speciale nel codice.
    mira.set(
      this.bocca.x + this.dentro.x * this.profondita * k * 1.2,
      this.bocca.y + this.dentro.y * this.profondita * k * 1.2,
      this.bocca.z + this.dentro.z * this.profondita * k * 1.2,
    )
  }

  /** quanto e' lungo il corridoio grande, in metri */
  get lunghezzaCorridoio() {
    return this.profondita * SCALA
  }
}
