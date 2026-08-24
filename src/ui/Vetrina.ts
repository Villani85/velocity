import { LAVORI } from './Lavori'
import { collegamento } from './Contatto'
import { t } from './Lingua'

/* QUANTA ROTELLA VALE UNA CARTA, e i due numeri hanno storie diverse.
   SOGLIA e' tarata su un gradino di rotella vero — Chrome ne manda 100 per
   scatto — quindi uno scatto secco gira una carta e un tremito no.
   RIPOSO e' il freno contro la coda d'inerzia del trackpad: sotto i tre
   decimi di secondo una sola strisciata sfoglierebbe mezzo portfolio. */
const SOGLIA = 92
const RIPOSO = 330

/**
 * LA VETRINA — i lavori come riquadri, con due frecce.
 *
 * COSA CHIEDE, ED E' CAMBIATA DUE VOLTE.
 *
 * La pattuglia chiede i documenti e il sito mostra i propri lavori. Prima
 * erano quattro righe di elenco dentro il quadro strumenti; il committente le
 * ha spostate a «dei quadratini sullo schermo con delle frecce a destra e a
 * sinistra: se clicco la freccia destra viene mostrato un altro lavoro».
 *
 * La differenza non e' grafica, e' di natura. Un elenco si legge; una vetrina
 * SI SFOGLIA. E in un finale che dura cinque secondi, dare a chi guarda una
 * cosa da toccare e' l'unico modo di trattenerlo oltre quei cinque secondi —
 * che e' esattamente il momento in cui gli si sta chiedendo di scrivere.
 *
 * PERCHE' I RIQUADRI VUOTI CI SONO E SI VEDONO.
 *
 * Oggi il portfolio ne ha uno. Riempire gli altri tre di progetti plausibili
 * e' fuori discussione — e' la stessa regola con cui sono sparite le
 * statistiche della hero, la carica della batteria e il totalizzatore. Ma tre
 * riquadri vuoti non sono un buco: sono tre posti gia' apparecchiati. Dicono
 * «ce ne saranno altri tre» molto meglio di quanto lo direbbe una frase.
 *
 * E sono la ragione per cui questa classe non ha niente di provvisorio dentro:
 * il giorno in cui un demo esiste, si riempie una riga in `ui/Lavori.ts` e il
 * riquadro si accende da solo, qui e nel documento semantico.
 *
 * LE FRECCE SONO DUE PULSANTI, non due icone che ascoltano il puntatore.
 * Funzionano da tastiera, hanno un'etichetta accessibile, e sul telefono si
 * toccano — dove un trascinamento litigherebbe con lo scorrimento, che su
 * questo sito e' il comando di tutto il resto.
 */
export class Vetrina {
  private radice: HTMLElement
  private avanti: HTMLButtonElement
  /** il rettangolo trasparente sopra la carta «SCRIVIMI» */
  private bersaglio!: HTMLAnchorElement
  /** vero da quando chi guarda ha premuto quella carta */
  private chiesto = false
  /** vero da quando il finale ha portato una volta sull'ultima carta */
  private portato = false
  private indietro: HTMLButtonElement
  private cifre!: HTMLElement
  private avviso!: HTMLElement
  private tacche: HTMLElement[] = []
  /** vero da quando l'avviso e' gia' comparso: compare una volta e basta */
  private avvisato = false
  private scelto = 0
  /** vero quando il carosello e' abbastanza in campo da meritare il comando */
  private inScena = false
  /** quanta rotella si e' accumulata da quando e' scattata l'ultima carta */
  private accumulo = 0
  /** quando e' scattata l'ultima carta, per non sfogliarne dieci in un gesto */
  private ultimoScatto = -1e9
  /** dove il dito ha toccato lo schermo l'ultima volta */
  private ditoY = 0

  constructor(dentro: HTMLElement = document.body) {
    this.radice = document.createElement('div')
    this.radice.className = 'vetrina'
    this.radice.setAttribute('aria-hidden', 'true')

    /* LA PUNTA E' DISEGNATA, NON SCRITTA.
       Qui c'erano `&#8249;` e `&#8250;`, cioe' due virgolette a caporale prese
       in prestito come frecce. Il difetto non e' di gusto: lo SPESSORE di quel
       segno lo decide il disegnatore del carattere, non questo foglio di
       stile. Switzer le fa sottili, il ripiego di sistema le fa di un altro
       peso ancora, e il risultato e' che i due comandi piu' importanti del
       finale — gli unici con cui si vedono gli altri lavori — hanno un tratto
       che cambia da una macchina all'altra e in tutti i casi e' piu' leggero
       di qualunque altra cosa sullo schermo.
       Due segmenti in CSS invece: lo spessore e' un numero scritto qui
       accanto, e' lo stesso ovunque, e si puo' alzare quando serve. Il gallone
       lo compone `.vetrina__punta` in `src/stile.css`. */
    const frecce = (verso: 'indietro' | 'avanti') =>
      '<button type="button" class="vetrina__freccia vetrina__freccia--' + verso + '" ' +
      'tabindex="-1" aria-label="' + t(verso === 'avanti' ? 'lavoroDopo' : 'lavoroPrima') + '">' +
      '<i class="vetrina__punta" aria-hidden="true"></i></button>'

    this.radice.innerHTML =
      frecce('indietro') +
      /* I RIQUADRI SE NE SONO ANDATI NELLA SCENA.
         Erano quattro caselle di vetro nel documento, e il committente ha
         mandato un riferimento che le ha spostate in tre dimensioni: un arco
         di pannelli in prospettiva, come un carosello di prodotti. Il codice
         sta in `scene/Vetrina3D.ts`.
         Qui restano le due frecce, e restano nel DOM per una ragione precisa:
         sono due PULSANTI. Funzionano da tastiera, hanno un'etichetta
         accessibile, e su un telefono si toccano. Disegnarle nella scena
         avrebbe voluto dire rifare a mano tutto quello che un `<button>` fa
         gia', e farlo peggio. */
      frecce('avanti') +
      /* IL CONTATORE, e non e' un vezzo: e' la meta' mancante della presa.
         Da quando la rotella muove il carosello invece della pagina, chi
         scorre e non guarda le frecce riceve un segnale ambiguo — la pagina
         non si muove — e l'interpretazione piu' naturale di una pagina che non
         si muove e' «si e' bloccata», non «adesso comandi qualcos'altro».
         E' esattamente il difetto che le giurie chiamano scroll-jacking, e non
         si cura togliendo la presa: si cura dicendo DOVE SI E' e QUANTI CE NE
         SONO. Undici tacche e due cifre rispondono a tutte e due, e stanno in
         fondo allo schermo dove non litigano con niente.
         Le tacche si aggiungono nel documento e non si disegnano con uno
         pseudo-elemento ripetuto: undici elementi veri sono undici cose che si
         possono colorare una per una, e domani, se i lavori diventano
         quattordici, non c'e' nessun numero da ritoccare qui dentro. */
      '<p class="vetrina__conto" aria-hidden="true">' +
      '<span class="vetrina__tacche"></span>' +
      '<span class="vetrina__cifre"></span></p>' +
      /* E L'AVVISO, UNA VOLTA SOLA. Compare al primo gesto che la presa si
         mangia — cioe' nell'istante preciso in cui nasce il dubbio — e se ne
         va da solo. Un avviso permanente diventa arredamento e smette di
         essere letto; uno che compare quando serve e sparisce dopo e' una
         risposta a una domanda. */
      '<p class="vetrina__avviso" role="status"></p>'

    dentro.appendChild(this.radice)

    /* IL BERSAGLIO DELL'ULTIMA CARTA — invisibile, e sta fuori dalla striscia.
       La carta «SCRIVIMI» e' disegnata dentro la scena in tre dimensioni:
       nella scena non ci sono pulsanti, e mettercene uno vorrebbe dire un
       raggio che cerca un piano a ogni clic. Qui invece basta un rettangolo
       trasparente messo dove la carta si trova, che esiste solo quando la
       carta e' al centro. Non e' un trucco: e' cio' che rende quella parola
       una cosa che si puo' PREMERE, con la tastiera come col dito, senza
       riscrivere quello che un elemento del documento sa gia' fare.
       Sta fuori da `.vetrina` perche' quella e' una striscia stretta in fondo
       allo schermo, e la carta occupa la meta' alta. */
    this.bersaglio = document.createElement('a')
    this.bersaglio.className = 'vetrina__contatto'
    this.bersaglio.hidden = true
    const dove = collegamento()
    if (dove) this.bersaglio.href = dove
    else this.bersaglio.setAttribute('role', 'button')
    this.bersaglio.tabIndex = -1
    this.bersaglio.setAttribute('aria-label', t('nextInvito'))
    dentro.appendChild(this.bersaglio)
    this.indietro = this.radice.querySelector('.vetrina__freccia--indietro')!
    this.avanti = this.radice.querySelector('.vetrina__freccia--avanti')!
    this.cifre = this.radice.querySelector('.vetrina__cifre')!
    this.avviso = this.radice.querySelector('.vetrina__avviso')!
    this.avviso.textContent = t('frecceAvviso')
    const tacche = this.radice.querySelector('.vetrina__tacche')!
    for (let i = 0; i <= LAVORI.length; i++) {
      const s = document.createElement('i')
      s.className = 'vetrina__tacca'
      tacche.appendChild(s)
    }
    this.tacche = Array.from(tacche.children) as HTMLElement[]

    /* AL CLIC LA STORIA SI CHIUDE, e non e' un vezzo: e' la risoluzione della
       scena. La volante spegne i lampeggianti e riparte, la strada torna
       libera. Senza, si resta fermi davanti a una pattuglia per sempre — che
       e' un finale sospeso, non un finale.
       E succede al CLIC, non arrivando sulla carta. Il primo tentativo
       liberava la scena appena l'ultima carta arrivava al centro, e il
       risultato era che l'iride si apriva sopra la parola prima che si
       riuscisse a leggerla: il traguardo mangiava il suo stesso premio. */
    this.bersaglio.addEventListener('click', () => { this.chiesto = true })
    this.indietro.addEventListener('click', () => this.vai(-1))
    this.avanti.addEventListener('click', () => this.vai(1))
    this.ascolta()
    this.segna()
  }

  /**
   * QUANDO I LAVORI SONO IN CAMPO, LA ROTELLA MUOVE LORO E NON LA PAGINA.
   *
   * E' una richiesta del committente detta nel modo piu' chiaro possibile —
   * «devi togliere lo scroll e fare in modo che vadano le frecce quando ci
   * sono i miei lavori» — e nasce da un difetto vero: il carosello arriva
   * negli ultimi centesimi della corsa, quindi bastava mezzo giro di rotella
   * per scavalcarlo. Chi scorreva e basta vedeva la prima carta e la fine
   * della pagina, e i dieci lavori non li vedeva mai.
   *
   * MA NON E' SCROLL-JACKING, e la differenza non e' un cavillo: e' esatta.
   * Lo scroll-jacking e' quando l'input dell'utente viene mangiato e non
   * succede niente, o succede qualcosa che non ha rapporto col gesto. Qui il
   * gesto verso il basso porta AVANTI, quello verso l'alto porta INDIETRO, e
   * a ogni gesto una carta si muove sullo schermo. Il comando non sparisce:
   * cambia oggetto, e l'oggetto si vede.
   *
   * E NON SI RESTA MAI INTRAPPOLATI, che e' la sola cosa che renderebbe
   * questo blocco un difetto invece di una cura. La presa vale solo mentre il
   * gesto avrebbe ancora carte da girare: arrivati a «SCRIVIMI» la rotella
   * torna alla pagina e il finale parte; tornati alla prima carta la pagina
   * risale. Ai due estremi il documento riprende esattamente da dove era
   * rimasto, perche' non e' mai stato spostato — la posizione dello
   * scorrimento non viene forzata, viene semplicemente non consumata.
   * Restano liberi anche Inizio e Fine, che sono l'uscita di sicurezza di chi
   * usa solo la tastiera.
   *
   * IL RIPOSO FRA UNA CARTA E L'ALTRA e' la parte che si sbaglia. Un trackpad
   * non manda un evento per gesto: ne manda quaranta, con la coda d'inerzia
   * del sistema operativo dentro. Senza soglia e senza riposo, una sola
   * strisciata sfoglierebbe tutti e undici i pannelli e si finirebbe in fondo
   * peggio di prima.
   */
  private ascolta() {
    addEventListener('wheel', this.rotella, { passive: false })
    addEventListener('keydown', this.tasto)
    addEventListener('touchstart', this.posa, { passive: true })
    addEventListener('touchmove', this.trascina, { passive: false })
  }

  /** vero se un gesto in quel verso ha ancora una carta da girare */
  private comanda(verso: number) {
    if (!this.inScena || verso === 0) return false
    return verso > 0 ? this.scelto < LAVORI.length : this.scelto > 0
  }

  /** gira una carta se e' passato abbastanza gesto e abbastanza tempo */
  private forse(verso: number, quanto: number) {
    this.accumulo += quanto
    const ora = performance.now()
    if (Math.abs(this.accumulo) < SOGLIA || ora - this.ultimoScatto < RIPOSO) return
    this.ultimoScatto = ora
    this.accumulo = 0
    this.vai(verso)
  }

  private rotella = (e: WheelEvent) => {
    const verso = Math.sign(e.deltaY)
    if (!this.comanda(verso)) return
    // si consuma l'evento PRIMA di decidere se girare una carta: se lo si
    // consumasse solo al momento dello scatto, i quaranta eventi di coda del
    // trackpad passerebbero alla pagina e il carosello se ne andrebbe da solo
    e.preventDefault()
    this.avvisa()
    this.forse(verso, e.deltaY)
  }

  /** l'avviso compare al primo gesto mangiato dalla presa, e mai piu' */
  private avvisa() {
    if (this.avvisato) return
    this.avvisato = true
    this.radice.classList.add('e-avvisa')
    setTimeout(() => this.radice.classList.remove('e-avvisa'), 2600)
  }

  private posa = (e: TouchEvent) => {
    this.ditoY = e.touches[0]?.clientY ?? 0
    this.accumulo = 0
  }

  private trascina = (e: TouchEvent) => {
    const y = e.touches[0]?.clientY ?? 0
    // sul telefono il dito va GIU' per andare avanti, come una pagina che sale
    const passo = this.ditoY - y
    this.ditoY = y
    if (!this.comanda(Math.sign(passo))) return
    e.preventDefault()
    this.forse(Math.sign(passo), passo * 2.4)
  }

  private tasto = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const k = e.key
    const verso =
      k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' ? 1 :
      k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' ? -1 : 0
    if (!this.comanda(verso)) return
    e.preventDefault()
    // da tastiera non serve accumulo: un tasto e' gia' un gesto intero
    this.vai(verso)
  }

  /**
   * SI SCORRE IL NASTRO, NON SI CAMBIA LA CASELLA.
   *
   * L'alternativa era mostrare un riquadro per volta e sostituirlo. Scorrere
   * e' meglio per una ragione sola e decisiva: si vedono anche quelli accanto.
   * Con quattro riquadri di cui tre vuoti, vedere i vicini e' proprio
   * l'informazione — dice quanti sono e a che punto si e'. Un riquadro per
   * volta lo nasconderebbe.
   */
  private vai(d: number) {
    /* L'ULTIMA CASELLA NON E' UN LAVORO, E' «SCRIVIMI».
       Il limite sale di uno perche' in fondo all'elenco c'e' una carta che non
       sta in LAVORI: il contatto. E' una richiesta esplicita del committente e
       cambia il senso del finale — «SCRIVIMI» smette di essere un'animazione
       che compare da sola all'ultimo scroll e diventa l'ultima cosa che si
       trova continuando a girare, cioe' un posto dove si ARRIVA.
       Nell'ultimo tratto lo scorrimento e' finito e le frecce sono l'unico
       comando rimasto: e' esattamente li' che quella carta deve stare. */
    this.scelto = Math.min(Math.max(this.scelto + d, 0), LAVORI.length)
    this.segna()
  }

  /** quanto e' in campo il carosello: sopra questa soglia prende il comando */
  private static readonly INGRESSO = 0.55

  private segna() {
    // quale pannello sta al centro lo legge `scene/Vetrina3D.ts` da `quale`:
    // qui restano solo i due pulsanti da spegnere agli estremi
    /* IL BERSAGLIO ESISTE SOLO SULL'ULTIMA CARTA. Un rettangolo trasparente
       lasciato acceso in mezzo allo schermo intercetterebbe i clic su tutto il
       resto del finale — le frecce comprese — e sarebbe il genere di difetto
       che si scopre quando qualcuno dice «non funziona niente». */
    this.bersaglio.hidden = this.scelto !== LAVORI.length
    this.indietro.disabled = this.scelto === 0
    this.avanti.disabled = this.scelto === LAVORI.length
    /* LE CIFRE CONTANO LE CARTE, NON I LAVORI. Sono undici perche' l'ultima e'
       «SCRIVIMI», che non sta in LAVORI ma e' un posto dove si arriva girando
       — e un contatore che dicesse «10» mentre le carte da girare sono undici
       sarebbe un numero che chi guarda puo' verificare e trovare falso. */
    const quante = LAVORI.length + 1
    this.cifre.textContent =
      String(this.scelto + 1).padStart(2, '0') + ' / ' + String(quante).padStart(2, '0')
    for (let i = 0; i < this.tacche.length; i++) {
      this.tacche[i].classList.toggle('e-qui', i === this.scelto)
      this.tacche[i].classList.toggle('e-passata', i < this.scelto)
    }
  }

  /**
   * L'ULTIMO TRATTO PORTA DA SOLO ALL'ULTIMA CARTA — una volta, e poi mai piu'.
   *
   * E' la cura di un difetto che nasce da una decisione giusta. «SCRIVIMI» e'
   * diventato l'undicesima carta invece di un blocco che compariva da solo, e
   * ci si arriva con le frecce: e' giusto, perche' nell'ultimo tratto lo
   * scorrimento e' esaurito e le frecce sono l'unico comando rimasto.
   * Ma chi scorre e basta, e le frecce non le tocca, arrivava in fondo alla
   * pagina senza vederla mai. Una revisione esterna l'ha chiamato «percorso
   * senza uscita», ed e' esatto: il sito finiva su un carosello.
   *
   * LA CURA NON E' RIMETTERE L'ANIMAZIONE. E' che il carosello, arrivato in
   * fondo, si porti da solo dove il racconto voleva arrivare. Chi scorre la
   * trova, chi usa le frecce ci arriva prima, e resta una carta — non torna
   * un blocco che compare.
   *
   * E SUCCEDE UNA VOLTA SOLA, con un fermo. Senza, chiunque tornasse indietro
   * con la freccia si vedrebbe strappare la scelta dalle mani al fotogramma
   * dopo: un carosello che combatte con chi lo usa e' peggio di un carosello
   * che non fa niente. Dopo il primo scatto il comando torna interamente a chi
   * guarda, e non glielo riprende piu' nessuno.
   */
  inFondo(q: number) {
    if (this.portato || q < 0.955) return
    this.portato = true
    this.scelto = LAVORI.length
    this.segna()
  }

  /** vero da quando chi guarda ha premuto «SCRIVIMI» sull'ultima carta */
  get scritto(): boolean {
    return this.chiesto
  }

  /** quale lavoro si sta guardando: lo legge il quadro strumenti */
  get quale(): number {
    return this.scelto
  }

  /** @param p quanto e' avanti la comparsa, da 0 a 1 */
  /** @param p quanto e' avanti la comparsa, gia' al netto del ritiro */
  aggiorna(p: number) {
    /* LA PRESA SI ATTACCA A META' COMPARSA, non appena il carosello esiste.
       A 0,02 di opacita' i pannelli sono un velo: prendere il comando li'
       vorrebbe dire fermare la pagina davanti a qualcosa che non si vede
       ancora, che e' precisamente la sensazione che fa dire «si e' bloccato».
       A 0,55 le carte sono leggibili, e fermarsi davanti a una cosa leggibile
       si legge come «ecco, guarda qui» invece che come un guasto. */
    this.inScena = p > Vetrina.INGRESSO
    const acceso = p > 0.02
    this.radice.classList.toggle('e-viva', acceso)
    this.radice.style.opacity = p.toFixed(3)
    // i pulsanti entrano nel giro della tabulazione solo quando esistono
    // sullo schermo: un bersaglio da tastiera invisibile e' una trappola
    const tab = acceso ? 0 : -1
    this.indietro.tabIndex = tab
    this.avanti.tabIndex = tab
    this.radice.setAttribute('aria-hidden', acceso ? 'false' : 'true')
  }
}
