
/**
 * IL FINALE — la strada diventa il contatto.
 *
 * L'IDEA, E PERCHE' NON E' UN FOOTER.
 *
 * Alla fine di un percorso come questo la tentazione e' una di due: chiuderlo
 * con un altro colpo — un'altra scena, altre particelle — oppure atterrare su
 * un piede di pagina con dentro un modulo. La prima abbassa il progetto,
 * perche' dopo tre climax un quarto e' una demo; la seconda lo interrompe,
 * perche' esce dal mondo che ha appena costruito.
 *
 * Qui non succede ne' l'una ne' l'altra: la strada che si stava guidando
 * DIVENTA la pagina di contatto. La prospettiva si appiattisce finche' resta
 * una sola riga orizzontale, e quella riga e' la sottolineatura dell'indirizzo.
 * Non c'e' nessun taglio da indicare, perche' non ce n'e' uno.
 *
 * DUE RIGHE PER LA STESSA RIGA, ed e' tutto il trucco.
 *
 * Quella che si vede all'inizio e' disegnata da WebGL — e' l'orizzonte della
 * scena, vedi il blocco «IL FINALE» in `scene/Lastra.ts`. Quella che resta
 * alla fine e' un elemento del documento, un bordo da un pixel.
 *
 * Si scambiano nel mezzo, e lo scambio non si vede perche' cadono nello STESSO
 * POSTO: la camera del beat `contatto` si mette in bolla, e una camera senza
 * inclinazione mette l'orizzonte esattamente a meta' schermo — sempre,
 * qualunque sia il campo visivo e qualunque sia il formato. Il valore 50% qui
 * sotto non e' tarato a occhio: e' una conseguenza.
 *
 * E' anche il motivo per cui la riga del documento non poteva essere
 * semplicemente «sotto il testo»: doveva essere a un'altezza dettata dalla
 * scena in tre dimensioni. Sono le due meta' di un unico oggetto.
 *
 * NIENTE EFFETTI AL PUNTATORE, e la specifica ne chiedeva uno.
 *
 * L'idea era che la riga si incurvasse verso il cursore, come una traiettoria.
 * E' bella e non si fa, per la regola che vale su tutto questo sito e che non
 * l'ho scritta io: meta' di chi guarda apre da telefono, dove il puntatore non
 * esiste, e il puntatore si muove a caso mentre l'immersione si guida con lo
 * scorrimento e con il tempo, che li scriviamo noi. Una riga che risponde al
 * mouse sarebbe l'unica cosa del sito a rispondere al mouse, e per meta' del
 * pubblico l'unica cosa che non risponde.
 *
 * Quello che la riga fa invece — allungarsi da un punto a tutta la larghezza
 * mentre si scorre — risponde alla stessa mano che ha guidato fin li'.
 *
 * TUTTO E' UNA FUNZIONE DI `q`, E NIENTE E' UNA TRANSIZIONE CSS.
 *
 * E' il vincolo che rende questo finale una dimostrazione invece che un
 * effetto: risalendo lo scorrimento, la riga ritorna strada e il cruscotto si
 * riaccende. Con una transizione CSS o una classe che si aggiunge, il ritorno
 * sarebbe stato uno stato diverso dall'andata — e un finale che si puo'
 * percorrere in un verso solo lo puo' fare anche un filmato.
 */
export class Finale {
  private radice: HTMLElement
  private riga: HTMLElement
  private vivo = false

  constructor(dentro: HTMLElement = document.body) {
    this.radice = document.createElement('section')
    this.radice.className = 'finale'
    // ARIA-HIDDEN, ed e' importante che lo sia.
    //
    // Le stesse parole stanno gia' nel documento, in `#contatto`, in una
    // sezione con un titolo vero e un collegamento vero. Questo qui e' la
    // loro rappresentazione VISIVA dentro la scena. Lasciandolo leggibile, un
    // lettore di schermo annuncerebbe la domanda due volte — ed e' il difetto
    // classico dei siti che aggiungono uno strato accessibile invece di
    // decidere quale dei due strati e' il testo.
    this.radice.setAttribute('aria-hidden', 'true')

    /* RESTA SOLO LA RIGA, e il titolone in mezzo allo schermo se n'e' andato.
     *
     * C'erano una domanda a corpo ottanta — «Dove andiamo da qui?» — e un
     * invito sotto. Il committente li ha visti e li ha chiamati «la scritta
     * piu' brutta», ed e' un giudizio che dopo averlo letto si vede: un titolo
     * centrato grande mezzo schermo non appartiene a questo sito. Qui il testo
     * ha una sola forma da sei tempi — occhiello piccolo, titolo su due righe,
     * sommario, tutto incolonnato di lato — e l'ultimo tempo aveva deciso di
     * parlare un'altra lingua proprio dove il sito deve suonare piu' suo.
     *
     * Il testo del contatto torna dov'e' quello di tutti gli altri, in
     * `ui/Voci.ts`, con lo stesso trattamento. Qui resta la riga, che non e'
     * un elemento di interfaccia: e' la meta' in HTML di una cosa che comincia
     * dentro WebGL, e senza di lei l'orizzonte della strada non avrebbe niente
     * in cui trasformarsi. */
    this.radice.innerHTML = '<div class="finale__riga"></div>'
    dentro.appendChild(this.radice)
    this.riga = this.radice.querySelector('.finale__riga')!
  }

  /**
   * @param q quanto e' avanti il finale, da 0 a 1. E' lo stesso numero che
   *   comanda lo shader della strada: vedi `Esperienza.finale`.
   */
  aggiorna(q: number) {
    const acceso = q > 0.001
    if (acceso !== this.vivo) {
      this.vivo = acceso
      this.radice.classList.toggle('e-vivo', acceso)
    }
    if (!acceso) return

    /* LA RIGA SI APRE DAL CENTRO, e comincia PRIMA che il mondo sia spento.
     *
     * Da 0,35 a 0,80 di corsa: a 0,35 la strada e' ancora accesa e la riga di
     * WebGL e' gia' li' — quella del documento nasce sopra di lei, larga
     * niente, e le due si sovrappongono per mezza corsa. Facendola cominciare
     * dopo si sarebbe vista comparire una riga nuova su un fondo nero, che e'
     * esattamente lo stacco che questo finale esiste per non avere. */
    const apertura = lisc(q, 0.35, 0.80)
    this.riga.style.transform = 'scaleX(' + apertura.toFixed(4) + ')'
    // e diventa piu' densa mentre quella di WebGL si spegne: la somma delle
    // due resta costante, ed e' la somma che l'occhio guarda
    this.riga.style.opacity = lisc(q, 0.40, 0.72).toFixed(3)
  }
}

/** un tratto da 0 a 1 con le due estremita' addolcite */
function lisc(x: number, da: number, a: number) {
  const t = Math.min(Math.max((x - da) / (a - da), 0), 1)
  return t * t * (3 - 2 * t)
}
