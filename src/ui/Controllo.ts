import { t } from './Lingua'
import { scriviCustom } from '../core/Custom'
import { Vetrina } from './Vetrina'

/**
 * IL CONTROLLO — il finale, e non e' un piede di pagina travestito.
 *
 * LA STORIA, IN NOVE ATTI E CINQUE SECONDI.
 *
 * Si sta guidando. Il sito ha appena detto «e adesso la guidi tu» e per un
 * minuto ha insegnato una grammatica sola: scorri e il mondo risponde. Poi,
 * senza preavviso, quella grammatica si rompe.
 *
 *   1 PRESENZA      un lampo blu, poi rosso. Nessun testo. Non si capisce
 *   2 RICONOSCIMENTO la volante entra da dietro
 *   3 RICHIAMO       sorpassa
 *   4 RALLENTAMENTO  il cruscotto perde i pezzi, uno per volta
 *   5 ARRESTO        taglia la strada. Schermo pulito. Una parola: DOCUMENTI.
 *   6 CONTROLLO      il quadro strumenti diventa la scheda dei lavori
 *   7 ESITO          una riga passa sopra come uno scanner. TUTTO IN REGOLA.
 *   8 CONVERSIONE    il prossimo progetto? SCRIVIMI
 *   9 VIA LIBERA     al clic la volante spegne i lampeggianti e riparte
 *
 * PERCHE' FUNZIONA MEGLIO DI QUALUNQUE CHIUSURA.
 *
 * Perche' non aggiunge un climax a tre climax gia' spesi. Fa l'opposto: dopo
 * un minuto in cui chi guarda ha imparato le regole, gliele cambia per cinque
 * secondi. La tensione non viene da un effetto piu' grande — viene dal non
 * sapere cosa stia succedendo, e sono i due secondi piu' attenti di tutta la
 * visita.
 *
 * E la risoluzione e' il progetto stesso. La pattuglia chiede i documenti, e
 * quello che esce non e' un modulo di contatto: sono i lavori. Il finale
 * anticipa esattamente l'esame che fara' chiunque riceva questo sito —
 * «bella esperienza, adesso fammi vedere le prove» — e lo mette dentro il
 * racconto invece che dopo.
 *
 * LA PAROLA E' FREDDA, ED E' LA DIFFERENZA CON QUELLA BOCCIATA.
 *
 * C'era un «Dove andiamo da qui?» a corpo ottanta in mezzo allo schermo, e il
 * committente l'ha chiamato «la scritta piu' brutta». Aveva ragione: era un
 * titolo umanista, morbido, centrato — un manifesto. DOCUMENTI. e' l'opposto:
 * maiuscolo, monospaziato, spaziato largo, una parola sola. Non e' un titolo
 * che parla a chi legge, e' un'INTIMAZIONE. La stessa grandezza in una voce
 * diversa fa un altro mestiere.
 *
 * NESSUN AGENTE, MAI. Si vede la volante e basta: niente sagome dietro il
 * vetro, niente finestrino che si abbassa, nessuno che bussa. Un attimo dopo
 * aver messo una persona in scena non si e' piu' nell'art direction, si e' in
 * una scenetta — e questo sito non ha nessuna scenetta da nessuna parte.
 */

/** i nove atti, in frazione del beat `contatto` */
/* GLI ATTI NON SI SOVRAPPONGONO, E NELLA PRIMA STESURA LO FACEVANO.
   Nel provino «TUTTO IN REGOLA» e «Il prossimo progetto?» comparivano insieme,
   uno sopra l'altro, illeggibili tutti e due: le due finestre si toccavano di
   un centesimo e la coda dell'una cadeva dentro la testa dell'altra.
   Una sequenza di nove atti in cinque secondi non ha margine per gli
   accavallamenti — ogni atto deve finire prima che cominci il seguente, e fra
   uno e l'altro ci vuole un respiro. E' il motivo per cui questi numeri stanno
   tutti in un posto solo: cosi' si vede a colpo d'occhio se due si toccano. */
const A = {
  /* IL CRUSCOTTO SI SPEGNE PRIMA CHE ARRIVI LA PAROLA, non dopo.
     Nella prima stesura la parola cadeva su un pannello ancora acceso che
     mostrava i fotogrammi al secondo: chiedere i documenti mentre si esibisce
     la propria peggiore credenziale. Adesso l'ordine e': il cruscotto muore,
     resta un pannello vuoto, la parola atterra li' sopra, e su quel vuoto si
     riscrivono le credenziali. */
  spegnimento: [0.30, 0.48] as const,
  /** la parola */
  /* 0,44 E NON 0,50, e i sei centesimi tolti sono un buco misurato.
     La finestra morta fra il cruscotto che si spegne e la parola che arriva
     esiste apposta — e' quella a rendere il cambio un CAMBIO invece di una
     dissolvenza, e la nota sta in «ui/Quadro.ts». Ma nel provino a 0,905 di
     corsa si vede cos'era diventata: il pannello acceso, grande mezzo schermo,
     COMPLETAMENTE vuoto, e nient'altro in campo. Non e' una pausa, e' un buco
     — e chi guarda un buco non pensa «sta per succedere qualcosa», pensa che
     manchi un pezzo.
     La parola adesso comincia mentre il cruscotto sta ancora finendo di
     spegnersi: resta lo stacco, sparisce il vuoto. */
  parola: [0.44, 0.64] as const,
  /** la scheda dei lavori e la vetrina */
  scheda: [0.64, 0.76] as const,
  /* LO SCANNER HA PIU' TEMPO DI PRIMA e l'esito arriva dopo che ha finito.
     Con [0,76-0,83] e l'esito a 0,82 la riga era ancora a meta' pannello
     quando compariva TUTTO IN REGOLA: il verdetto arrivava prima della fine
     del controllo, che e' il difetto esatto che lo scanner esiste per non
     avere. */
  scanner: [0.74, 0.84] as const,
  /* L'ESITO E' IL PAYOFF DELL'INTERA SORPRESA E DEVE SENTIRSI.
     Con [0,845-0,90] passava come un'etichetta fra due stati; e in piu'
     l'invito partiva a 0,93, cioe' tre centesimi dopo — nessun respiro. Ora
     dura il doppio e fra la sua uscita e l'ingresso della domanda ci sono sei
     centesimi di beat in cui sullo schermo non c'e' nessun testo. Quel vuoto
     e' il verdetto che si deposita: senza, «tutto in regola» e' una parola
     che scorre, con, e' una risposta. */
  esito: [0.820, 0.895] as const,
  /* E L'INVITO ARRIVA PIU' TARDI, PER LA SECONDA VOLTA.
     Il primo giro aveva gia' allontanato l'invito dall'esito, e non bastava:
     rivisto al rallentatore, TUTTO IN REGOLA si spegne e «Il prossimo
     progetto?» comincia praticamente subito. Tre centesimi di beat sono meno
     di duecento millisecondi — un tempo che c'e' sulla carta e non si sente.
     Sei centesimi, il doppio, e in mezzo sullo schermo non c'e' NESSUN testo.
     Quel vuoto e' il verdetto che si deposita: il ritmo giusto e' DOCUMENTI →
     verifica → TUTTO IN REGOLA → respiro → la domanda, e senza il respiro il
     payoff della sorpresa si perde tutto insieme al resto. */
  invito: [0.955, 1.0] as const,
}

export class Controllo {
  private radice: HTMLElement
  private parola: HTMLElement
  private esito: HTMLElement
  /** la parola dentro il timbro: ha una sua opacita', vedi `aggiorna` */
  private verdetto: HTMLElement
  private scanner: HTMLElement
  private lampo: HTMLElement | null
  private vetrina: Vetrina
  private vivo = false
  /** vero da quando si e' chiesto di scrivere: la volante riparte */
  private liberato = false

  constructor(dentro: HTMLElement = document.body) {
    this.radice = document.createElement('section')
    this.radice.className = 'controllo'
    // le stesse parole stanno gia' nel documento semantico, in `#contatto`:
    // questo qui e' la loro rappresentazione dentro la scena, e un lettore di
    // schermo che le annunciasse due volte sarebbe un lettore peggiore
    this.radice.setAttribute('aria-hidden', 'true')

    this.radice.innerHTML =
      '<p class="controllo__parola"></p>' +
      '<div class="controllo__scanner"></div>' +
      /* IL VERDETTO NON E' PIU' UNA RIGA DI TESTO: E' UN TIMBRO, E QUINDI HA
         TRE PEZZI.
         Nel fermo immagine del committente «TUTTO IN REGOLA» era una riga
         d'ambra spaziata larga sospesa in mezzo a un fotogramma affollato — il
         carosello sopra, il cruscotto sotto, la strada dietro — e non arrivava
         per una ragione sola: non aveva un piano suo. Un testo che galleggia
         sopra tre livelli accesi non e' un verdetto, e' una didascalia.
         Quindi qui ci sono un filetto sopra, la parola, un filetto sotto. I
         due filetti sono la riga dello scanner che si e' appena depositata —
         stessa sfumatura, stesso alone, e arrivano PRIMA della parola: prima
         si chiude il riquadro, poi ci cade dentro il verdetto. E' l'ordine di
         un timbro vero, e serve a far sentire il risultato come la conclusione
         del controllo invece che come la riga successiva.
         Il piano scuro dietro e l'alone d'ambra stanno nello pseudo-elemento
         di `.controllo__esito`: vedi `src/stile.css`. */
      '<p class="controllo__esito">' +
      '<i class="controllo__filetto"></i>' +
      '<span class="controllo__verdetto"></span>' +
      '<i class="controllo__filetto"></i>' +
      '</p>'
    dentro.appendChild(this.radice)
    // LA VETRINA E' UN ELEMENTO A PARTE e non un figlio di questo: deve stare
    // sopra il quadro strumenti, non al centro dello schermo dove passano la
    // parola e l'esito. Metterla dentro avrebbe voluto dire disfare la griglia
    // che tiene quei due incolonnati.
    this.vetrina = new Vetrina(dentro)
    this.parola = this.radice.querySelector('.controllo__parola')!
    this.esito = this.radice.querySelector('.controllo__esito')!
    this.verdetto = this.radice.querySelector('.controllo__verdetto')!
    this.scanner = this.radice.querySelector('.controllo__scanner')!
    this.lampo = document.querySelector('.lampo')

    /* LA STORIA SI CHIUDE QUANDO SI ARRIVA ALL'ULTIMA CARTA.
       Prima si chiudeva al clic su «SCRIVIMI», che era un collegamento dentro
       questo blocco. Il blocco non c'e' piu' — il committente l'ha tolto e
       «SCRIVIMI» e' diventato l'ultima carta del carosello — quindi la
       liberazione la da' l'unica cosa che adesso puo' darla: essere arrivati
       fino in fondo all'elenco. Vedi `viaLibera` qui sotto. */
  }

  /**
   * VERO DA QUANDO CHI GUARDA E' ARRIVATO ALLA CARTA DEL CONTATTO.
   *
   * E' cio' che fa ripartire la pattuglia: i lampeggianti si spengono e la
   * strada torna libera. Prima lo diceva il clic su «SCRIVIMI»; adesso lo dice
   * l'ultima carta, che e' la stessa cosa detta con il gesto che c'e' — nel
   * tratto finale lo scorrimento e' esaurito e le frecce sono l'unico comando
   * rimasto, quindi arrivare in fondo all'elenco E' la decisione.
   */
  get viaLibera(): boolean {
    return this.liberato || this.vetrina.scritto
  }

  /**
   * @param q quanto e' avanti il beat `contatto`, da 0 a 1
   * @returns quanto e' avanti il controllo dei documenti, da 0 a 1: lo legge
   *   `ui/Quadro.ts` per trasformarsi nella scheda dei lavori
   */
  /**
   * IL LAMPEGGIANTE SULL'INTERFACCIA.
   *
   * @param battito -1 blu, +1 rosso, 0 fra una battuta e l'altra. Arriva da
   *   `scene/Lastra.ts`, che e' l'unico orologio del lampeggiante: la luce
   *   sulla carreggiata, quella sulla carrozzeria della volante, quella
   *   sull'abitacolo e questa sui bordi della pagina battono tutte da li'.
   *
   * PERCHE' NON BASTAVA LA LUCE NELLA SCENA. Perche' la scena finisce dove
   * comincia la cornice, e fino a ieri la pattuglia illuminava un render
   * dentro un'interfaccia che non se ne accorgeva. Un'automobile che entra
   * fisicamente in un mondo lo modifica tutto, compresa la parte che sta
   * sopra il vetro.
   */
  illumina(battito: number, forza: number) {
    if (!this.lampo) return
    const f = Math.min(Math.max(forza, 0), 1)
    if (battito === 0 || f < 0.01) {
      this.lampo.style.opacity = '0'
      document.documentElement.removeAttribute('data-lampo')
      return
    }
    const blu = battito < 0
    // 0,19, misurato guardando: a 0,30 la pagina intera diventava rossa a ogni
    // battuta. E' una luce che ENTRA, non una che accende — sopra un quinto di
    // opacita' smette di illuminare e comincia a tingere, che e' la differenza
    // fra una pattuglia e una discoteca.
    const a = (0.19 * f).toFixed(3)
    const r = document.documentElement
    scriviCustom('--lampoLuce', blu ? 'rgba(38,96,255,' + a + ')' : 'rgba(255,42,32,' + a + ')')
    scriviCustom('--lampoBordo', blu ? 'rgba(90,140,255,0.62)' : 'rgba(255,110,96,0.62)')
    r.dataset.lampo = '1'
    this.lampo.style.opacity = '1'
  }

  aggiorna(q: number): number {
    const acceso = q > 0.001
    if (acceso !== this.vivo) {
      this.vivo = acceso
      this.radice.classList.toggle('e-vivo', acceso)
      const s = this.radice.querySelector('.controllo__scrivi')
      if (s instanceof HTMLAnchorElement) s.tabIndex = acceso ? 0 : -1
      if (!acceso) this.liberato = false
    }
    if (!acceso) return 0

    /* LA PAROLA ENTRA E SE NE VA, e il fatto che se ne vada e' meta' del suo
       lavoro. Una parola che resta diventa un'etichetta; una che compare per
       un secondo e sparisce resta impressa e lascia il posto a cio' che deve
       rispondere. */
    const p = finestra(q, A.parola[0], A.parola[1])
    this.parola.style.opacity = p.toFixed(3)
    // le lettere si stringono mentre arriva: una spaziatura che si chiude e'
    // un'intimazione che si mette a fuoco
    /* LA SPAZIATURA PASSA DA UNA VARIABILE, non piu' dritta nello stile in
       linea, e la ragione e' un difetto che il telefono ha reso visibile.
       Su schermo stretto «COSA TRASPORTA?» usciva dai bordi di dodici pixel:
       quindici lettere al corpo minimo, con mezza em di spaziatura ciascuna,
       non ci stanno in 390 px. Ma uno stile in linea vince su qualunque regola
       del foglio, quindi il foglio non poteva correggerlo — nemmeno dentro una
       media query. Scrivendo un NUMERO in una variabile, la decisione di
       quanto valga in em torna al foglio di stile, che e' l'unico posto che sa
       quanto e' largo lo schermo.
       Il difetto c'era da prima e l'attrezzo non lo vedeva: a quel punto della
       corsa la parola era ancora spenta, e cio' che e' invisibile non viene
       misurato. E' emerso solo anticipandone l'ingresso — cioe' per caso. */
    this.parola.style.setProperty('--parolaSpazio', (0.62 - 0.34 * Math.min(q / A.parola[1], 1)).toFixed(3))

    const doc = lisc(q, A.scheda[0], A.scheda[1])
    // la vetrina compare insieme alla scheda e resta fino alla fine: e' l'unica
    // cosa del finale che si puo' toccare, e sparire mentre la si sta
    // sfogliando sarebbe la peggiore delle regie
    // le frecce se ne vanno insieme ai pannelli che comandano: due pulsanti
    // che restano dopo che il loro oggetto e' sparito sono due bersagli da
    // tastiera che non portano da nessuna parte
    // e nell'ultimo tratto il carosello si porta da solo sull'ultima carta:
    // vedi `inFondo` in `ui/Vetrina.ts`, succede una volta e poi il comando
    // resta a chi guarda
    this.vetrina.inFondo(q)
    this.vetrina.aggiorna(doc * (1 - this.ritiro(q)))

    /* LO SCANNER SCENDE LUNGO IL PANNELLO, UNA VOLTA SOLA.
     *
     * `--quadroAltezza` e' l'altezza del quadro strumenti sullo schermo, in
     * percentuale della finestra, e la scrive `core/Esperienza.ts` proiettando
     * il pannello vero. La riga parte dal bordo alto e arriva a quello basso:
     * e' il tragitto di una cosa che legge un documento, ed e' la ragione per
     * cui il verdetto dopo si sente MERITATO invece che dichiarato.
     *
     * E si allarga mentre parte: nasce come un punto in mezzo e si apre verso
     * i due bordi. Una riga che compare gia' lunga e' un elemento che si
     * accende; una che si apre e' un raggio.
     */
    const sc = finestra(q, A.scanner[0], A.scanner[1])
    const corsa = lisc(q, A.scanner[0], A.scanner[1] + 0.005)
    const larga = lisc(q, A.scanner[0], A.scanner[0] + (A.scanner[1] - A.scanner[0]) * 0.30)
    this.scanner.style.opacity = sc.toFixed(3)
    this.scanner.style.transform =
      'translateY(calc(var(--quadroAltezzaVh, 44) * ' + corsa.toFixed(4) + ' * 1vh)) scaleX(' +
      (0.06 + 0.94 * larga).toFixed(3) + ')'

    // NIENTE MARGINE IN CODA: con `+ 0.05` la finestra di uscita si allungava
    // fino a 0,985 e l'esito era ancora al quaranta per cento quando arrivava
    // l'invito. E' lo stesso accavallamento gia' corretto sui numeri qui sopra,
    // rientrato da una riga che sembrava innocua.
    const es = finestra(q, A.esito[0], A.esito[1])
    /* IL TIMBRO PRECEDE LA PAROLA DI TRE CENTESIMI DI BEAT, E CI VUOLE UN
     * SECONDO OROLOGIO PER DIRLO.
     *
     * Il gesto e' quello di un timbro vero: prima si posa il riquadro, poi
     * dentro ci si legge il risultato. Se arrivano insieme, il verdetto torna
     * a essere una riga di testo con una decorazione intorno — che e' il
     * difetto da cui si e' partiti.
     *
     * I tre centesimi non sono liberi, sono presi dove c'erano: `A.scanner`
     * finisce a 0,84 e il piano parte a 0,786, quindi i filetti nascono
     * mentre la riga che legge sta ancora scendendo. E' voluto — i filetti
     * SONO quella riga che si deposita, e una cosa che si deposita deve
     * toccare terra prima che l'altra sia sparita, se no sono due oggetti
     * diversi che si danno il cambio.
     *
     * PERCHE' DUE OPACITA' ANNIDATE E NON DUE ELEMENTI SEPARATI. Perche'
     * l'opacita' del `<p>` e' anche il segnale con cui il resto del mondo
     * capisce se il verdetto e' in campo: `strumenti/telefono_audit.mjs`
     * moltiplica le opacita' risalendo l'albero per decidere quali blocchi
     * sono davvero visibili, e con il verdetto e DOCUMENTI nella stessa
     * cella di griglia un `<p>` sempre a uno li farebbe risultare
     * sovrapposti per tutto il finale. Quindi il padre porta il tempo LARGO
     * (il timbro) e la parola dentro ci si moltiplica il proprio, che e'
     * `es / tb`: il prodotto torna esattamente la vecchia finestra.
     */
    const tb = finestra(q, A.esito[0] - 0.034, A.esito[1])
    /* e i filetti si aprono dal centro come faceva lo scanner: una riga che
       compare gia' lunga si accende, una che si apre e' un gesto */
    const apre = lisc(q, A.esito[0] - 0.034, A.esito[0] + 0.016)
    this.esito.style.opacity = tb.toFixed(3)
    this.esito.style.setProperty(
      '--esitoParola',
      (tb > 0.001 ? Math.min(es / tb, 1) : 0).toFixed(3),
    )
    this.esito.style.setProperty('--esitoFiletto', (0.05 + 0.95 * apre).toFixed(3))

    return doc
  }

  /** quale lavoro si sta guardando: lo legge il quadro strumenti */
  get quale(): number {
    return this.vetrina.quale
  }

  /**
   * QUANTO SI STA FRENANDO, da 0 a 1.
   *
   * Comincia mentre la volante taglia la strada — `TAGLIA` sta a 0,42 in
   * `scene/Volante.ts` — e finisce prima che compaia la parola DOCUMENTI, che
   * sta a 0,50. Fra le due c'e' tutta la frenata, ed e' corta apposta: una
   * frenata lunga davanti a una pattuglia che ti ha gia' tagliato la strada
   * sembrerebbe indecisione, non obbedienza.
   *
   * Non e' una soglia. Lo scorrimento resta reversibile — si torna indietro e
   * la strada riparte — perche' e' un valore continuo come tutto il resto.
   */
  frenata(q: number): number {
    return lisc(q, 0.36, 0.50)
  }

  /**
   * QUANTO IL CAROSELLO DEVE FARSI DA PARTE.
   *
   * E ADESSO SPARISCE DEL TUTTO, invece di ritirarsi in alto.
   *
   * Il ritiro era la scelta giusta finche' il problema era lo spazio. Il
   * committente ha guardato il fotogramma finale e ne ha visto un altro, piu'
   * grosso: dopo il climax ci sono contemporaneamente la scheda del progetto
   * in alto, l'occhiello, la domanda, l'invito, il pannello delle credenziali,
   * le frecce e il cruscotto sotto. Sette livelli. E il finale e' l'unico
   * punto del sito che dovrebbe respirare piu' di tutto il resto.
   *
   * La sua frase e' quella che decide: «sembra che tu voglia mostrare
   * contemporaneamente portfolio e contatto — scegli. Alla fine deve vincere
   * il contatto.» Ha ragione, ed e' anche la logica del racconto: i lavori
   * sono gia' stati controllati e approvati. Il loro momento e' passato.
   *
   * Quindi il carosello va a zero mentre la domanda arriva. Le credenziali
   * restano, molto tenui, sul pannello in basso — sono la premessa della
   * domanda e non devono sparire, ma devono smettere di competere.
   */
  /**
   * QUANTO IL CAROSELLO DEVE FARSI DA PARTE PERCHE' ATTERRI IL TIMBRO.
   *
   * E' la stessa finestra del verdetto, ne' piu' ne' meno: i lavori arretrano
   * esattamente per il tempo in cui «TUTTO IN REGOLA» sta sullo schermo. Non
   * si spengono — vedi `cede` in `scene/Vetrina3D.ts` — arretrano.
   */
  /**
   * QUANTO LAMPEGGIA LA PATTUGLIA, E QUANDO SMETTE.
   *
   * Non smetteva mai. `core/Esperienza.ts` scriveva
   * `Math.min(finaleGrezzo / 0.20, 1)`: una rampa che sale nel primo quinto
   * del beat e poi resta a uno per sempre, cioe' rosso e blu che pulsano su
   * tutto il finale — **proprio dove si devono sfogliare i lavori e premere
   * il contatto.** Una revisione esterna l'ha detto in una riga che vale piu'
   * dell'osservazione grafica: «un bordo che pulsa in permanenza in quella
   * sezione lavora contro la conversione».
   *
   * E c'e' una ragione di racconto ancora piu' forte di quella di
   * conversione: dopo «TUTTO IN REGOLA» il controllo E' FINITO. Un
   * lampeggiante che continua dopo il verdetto contraddice il verdetto che ha
   * appena dato — dice che qualcosa ancora non va, mentre la scritta dice il
   * contrario.
   *
   * Quindi si spegne dove il timbro si posa: comincia a scendere due centesimi
   * prima che il verdetto finisca di comparire, ed e' via sei centesimi dopo.
   * Sono circa due secondi di scorrimento in punta: il tempo che ci mette una
   * pattuglia a togliere la mano dall'interruttore.
   */
  lampeggiante(q: number): number {
    return Math.min(q / 0.20, 1) * (1 - lisc(q, A.esito[1] - 0.02, A.esito[1] + 0.06))
  }

  timbro(q: number): number {
    return finestra(q, A.esito[0], A.esito[1])
  }

  /**
   * IL CAROSELLO NON SI RITIRA PIU', E RESTITUISCE SEMPRE ZERO.
   *
   * Si ritirava per lasciare spazio a «Il prossimo progetto? SCRIVIMI», che
   * arrivava da solo nell'ultimo tratto di scorrimento. Quel blocco e' stato
   * tolto — «l'ultimo scroll io posso solo usare le frecce», ed e' vero: li'
   * la pagina e' finita e le due frecce sono l'unico comando che resta —
   * quindi non c'e' piu' niente per cui farsi da parte, e i lavori restano
   * grandi fino all'ultimo fotogramma.
   *
   * Il metodo resta invece di sparire perche' e' l'unica manopola che sposta
   * il carosello, e il giorno in cui qualcosa dovra' di nuovo prendersi quello
   * spazio si riaccende qui invece di rifare la catena.
   */
  ritiro(_q: number): number {
    return 0
  }

  /** quanto il cruscotto si e' gia' spento: lo legge il quadro strumenti */
  perdita(q: number): number {
    return lisc(q, A.spegnimento[0], A.spegnimento[1])
  }

  /** i testi si riscrivono quando cambia la lingua: li chiede la costruzione */
  scrivi() {
    const frase = t('documenti')
    this.parola.textContent = frase
    /* SI DICHIARA QUANTO E' LUNGA, e il foglio di stile ci divide il corpo.
       «COSA TRASPORTA?» sono quindici caratteri, «WHAT ARE YOU CARRYING?»
       ventidue: con un corpo fisso la seconda esce dallo schermo. Il numero lo
       sa solo chi compone la frase, quindi lo scrive lui. */
    this.parola.style.setProperty('--lunga', String(frase.length))
    this.verdetto.textContent = t('inRegola')
  }
}

/** sale, resta, riscende: una cosa che compare e se ne va */
function finestra(x: number, da: number, a: number) {
  const dentro = lisc(x, da, da + (a - da) * 0.34)
  const fuori = 1 - lisc(x, a, a + (a - da) * 0.5)
  return Math.min(dentro, fuori)
}

/** un tratto da 0 a 1 con le estremita' addolcite */
function lisc(x: number, da: number, a: number) {
  const k = Math.min(Math.max((x - da) / (a - da), 0), 1)
  return k * k * (3 - 2 * k)
}
