/**
 * IL MOVIMENTO RIDOTTO — un posto solo che legge la preferenza, e tutto il
 * resto che la legge da qui.
 *
 * COSA PROMETTE IL SITO, E DA OGGI ANCHE COSA FA.
 *
 * L'argomento scritto in `core/Scorrimento.ts` e in testa a `index.html` e'
 * giusto e resta: chi chiede `prefers-reduced-motion: reduce` non deve
 * ricevere MENO SITO, deve ricevere lo stesso sito senza il movimento che gli
 * fa male. Su questa pagina l'accelerazione non e' un'animazione che parte da
 * sola — e' la cosa che fa chi guarda — e toglierla vorrebbe dire togliere il
 * sito, che e' una decisione gia' presa due volte dal committente e gia'
 * sbagliata due volte prima di lui.
 *
 * Quello che mancava e' che la promessa non era mantenuta da nessuna riga di
 * codice. Chi accendeva la preferenza riceveva le transizioni del foglio di
 * stile spente — cioe' l'unica meta' che il CSS sa fare — e un'automobile che
 * si muoveva comunque: la grana della pellicola che sfarfalla a ventiquattro
 * al secondo, la strada che scorre a mano ferma, la lancetta dei giri che
 * ondeggia sul minimo, la vibrazione della camera fatta con `Math.random()`.
 * Una preferenza onorata a parole e non nei fatti e' peggio che non onorarla,
 * perche' costa uguale e in piu' si vanta.
 *
 * LA DISTINZIONE CHE DECIDE TUTTO, e non e' fra «poco» e «tanto»:
 *
 *   AUTONOMO   si muove senza che nessuno tocchi niente — un orologio, un
 *              `dt`, un rumore casuale. SI FERMA.
 *   GUIDATO    si muove perche' si sta scorrendo: la posizione della camera,
 *              la rotazione del soggetto, il testo che entra. RESTA.
 *   INERZIA    e' guidato, ma continua DOPO che la mano si e' fermata. E'
 *              autonomo travestito, ed e' proprio quello che da' fastidio a
 *              chi ha un disturbo vestibolare. Diventa istantaneo.
 *
 * La regola di accessibilita' esiste per il moto NON RICHIESTO e per l'inerzia,
 * non per la presenza di un oggetto in tre dimensioni. Un'automobile ferma,
 * illuminata, con i suoi materiali, che gira quando e solo quando si scorre,
 * non fa male a nessuno.
 *
 * PERCHE' UN FILE APPOSTA, PER UN BOOLEANO.
 *
 * Prima la preferenza viveva dentro `core/Qualita.ts`, che e' il gestore della
 * qualita' grafica: quello che misura i millisecondi per fotogramma e decide
 * quante ombre la macchina si puo' permettere. Non era un posto scelto a caso
 * — e' li' che il livello si riapplica, quindi il campo era comodo — ed e'
 * proprio la comodita' ad aver nascosto il difetto: `applicaQualita()` gira
 * SOLO al cambio di livello, quindi la preferenza arrivava allo scorrimento
 * una volta sola e chi la accendeva a pagina aperta non otteneva niente.
 *
 * E il posto diceva anche la cosa sbagliata. `prefers-reduced-motion` non e'
 * un limite della macchina come la memoria video o il numero di campioni: e'
 * una RICHIESTA di chi guarda. Chi cerca dove il sito la onora non va a
 * cercarla nel misuratore di fotogrammi.
 *
 * Adesso la leggono in sette posti — lo scorrimento, la camera, il quadro
 * strumenti, la gradazione, il carosello del finale, la scatola tecnica, il
 * motore — e sette `matchMedia` sono sette letture che possono divergere. Su
 * questo progetto due numeri che descrivono la stessa cosa da file diversi
 * sono gia' costati piu' di un difetto: il tetto di densita' in
 * `core/Qualita.ts` e i due progressi del finale in `core/Esperienza.ts` sono
 * scritti per esteso proprio per non ripeterlo. Una lettura, un valore, un
 * ascolto.
 */

const DOMANDA = '(prefers-reduced-motion: reduce)'

/**
 * VERO QUANDO CHI GUARDA HA CHIESTO MENO MOVIMENTO.
 *
 * E' un `let` esportato e non una funzione, cioe' un LEGAME VIVO: chi lo
 * importa vede il valore aggiornato senza dover richiamare niente. E' lo
 * stesso meccanismo con cui `transizioni/Camera.ts` pubblica
 * `rotazioneScena`, quindi non e' un pattern nuovo da imparare in questo
 * progetto — e' quello che c'e' gia'.
 *
 * La tentazione era un getter su una classe. Non va bene qui: chi ha bisogno
 * di questo valore sono anche funzioni libere — `inquadra()` in
 * `transizioni/Camera.ts` non ha un'istanza a cui chiedere niente — e
 * passarglielo come parametro vorrebbe dire allargare la firma di mezza dozzina
 * di funzioni per trasportare un booleano che non cambia mai durante il
 * fotogramma.
 */
export let RIDOTTO = leggi()

function leggi(): boolean {
  /* LA GUARDIA NON E' PARANOIA SUL BROWSER: e' per gli strumenti.
     `matchMedia` c'e' dappertutto da anni. Ma questo modulo lo tira dentro
     anche `core/Qualita.ts`, e gli strumenti di misura importano dei pezzi del
     progetto fuori dalla pagina: senza guardia un banco che gira in Node
     morirebbe qui, e morirebbe con un messaggio che non parla di movimento —
     cioe' nel modo piu' lento possibile da capire. */
  return typeof matchMedia === 'function' && matchMedia(DOMANDA).matches
}

/* SI ASCOLTA IL CAMBIO, e non e' un di piu'.
   E' una preferenza di sistema e si puo' accendere mentre la pagina e' aperta
   — cosa che capita davvero, e capita proprio a chi la accende PERCHE' un
   sito gli sta dando fastidio. Se la si legge solo alla costruzione, l'unica
   persona che quella preferenza serve davvero e' l'unica che non la riceve.
   E si spegne anche al contrario: chi la toglie riprende il movimento senza
   ricaricare. */
if (typeof matchMedia === 'function') {
  matchMedia(DOMANDA).addEventListener('change', (e) => { RIDOTTO = e.matches })
}

/**
 * QUANTO SI INSEGUE — la stessa domanda, fatta da chi ha uno smorzamento.
 *
 * Mezzo progetto ha righe della forma
 *
 *     this.valore += (bersaglio - this.valore) * Math.min(dt * K, 1)
 *
 * cioe' «arrivaci in un tempo, non di scatto». Con il movimento ridotto quel
 * tempo va a zero: il valore ci arriva subito e il fotogramma seguente non si
 * muove piu'. Non e' la stessa cosa che spegnere l'effetto — il valore finale
 * e' identico — e' solo il TRAGITTO che sparisce, che e' esattamente cio' che
 * la preferenza chiede.
 *
 * Sta qui e non copiato in sei file perche' e' una decisione, non
 * un'aritmetica: se un giorno si scoprisse che qualche inseguimento va tenuto
 * (per esempio perche' senza fa uno scatto peggiore del movimento), si cambia
 * in un posto e vale dappertutto.
 */
export function rincorsa(k: number): number {
  return RIDOTTO ? 1 : k
}
