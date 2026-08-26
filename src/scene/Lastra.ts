import {
  DataTexture,
  Mesh,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  type Texture,} from 'three'
import { anisotropiaMassima } from '../core/Anisotropia'

import { dopoAuto } from '../core/Ordine'
import { AUTO } from './Esterno'
import { QA } from '../core/Banco'

/**
 * LA STRADA OLTRE IL PARABREZZA — costruita, non filmata.
 *
 * =====================================================================
 * PERCHE' IL FILMATO SE N'E' ANDATO. Quattro misure, non un'opinione.
 * =====================================================================
 *
 * Il committente ha detto una cosa sola: «non si vede la strada». Prima di
 * decidere cosa fare ho misurato che cosa si vedeva davvero.
 *
 * 1. IL FILMATO. `public/lastra/strada.mp4`: 1280x720, cinque secondi,
 *    327 kB a 520 kbit/s. Estratti i fotogrammi e guardati: e' asfalto NERO
 *    PIENO — non scuro, nero — con sopra un tratteggio bianco e due file di
 *    rettangoli bianchi ai lati. Nessun cielo, nessun riflesso, nessun
 *    orizzonte, nessuna luce che tocchi il manto. Attraverso il buco del
 *    parabrezza legge come il soffitto di un parcheggio interrato, non come
 *    una strada. Non e' un buon filmato girato male: e' un segnaposto.
 *
 * 2. STA FERMO PER UN DECIMO DEL SITO. Misurato in pagina
 *    (`strumenti/misuralastra.mjs`): a scorrimento 0,78 e 0,84 il video ha
 *    `currentTime = 0` e `paused = true`. `aggiorna` chiama `play()` solo
 *    quando `acceso`, e `acceso` e' vero solo nel beat `velocita` — quindi
 *    tutto il beat `accensione`, dal 75% all'85% del percorso, mostra il
 *    fotogramma zero. Con quel contenuto, un fotogramma zero e' un
 *    rettangolo nero con dentro dei trattini fermi.
 *
 * 3. E QUANDO PARTE, VA AL RALLENTATORE. Sempre misurato: `playbackRate` a
 *    0,36. La formula era `0,35 + min(velocita*3,2 ; 1) * 2,05`, ma
 *    `scorrimento.velocita` non arriva mai vicino a 0,3125 —
 *    `strumenti/andatura.mjs` l'ha campionata alla rotella: 0,03-0,07 mentre
 *    si scorre davvero, 0,35 solo sul picco di una scrollata violenta. Cioe'
 *    la manopola era tarata su un intervallo che non esiste, e la strada
 *    correva sempre a un terzo.
 *
 * 4. L'INQUADRATURA, INVECE, ERA GIUSTA. Proiettati i quattro vertici del
 *    piano con la camera vera: cadono a x -0,31..1,36 e y -0,34..1,15 dello
 *    schermo. Il piano copriva tutto, con margine. Non era quello.
 *
 * Tre difetti su quattro stanno nel CONTENUTO e nel fatto che un filmato ha
 * un tempo suo. Nessuno dei tre si corregge con la regia.
 *
 * =====================================================================
 * LA MISURA CHE HA DECISO ANCHE LA GEOMETRIA
 * =====================================================================
 *
 * Misurata la maschera del parabrezza (`abitacolo_apertura.webp`, fascia
 * centrale): il buco si apre a 0,208 dell'altezza dello schermo e si chiude
 * a 0,524. Sotto quella riga c'e' la plancia, che e' opaca.
 *
 * E l'ORIZZONTE VERO cade a 0,569.
 *
 * La camera in abitacolo sta a `POSE.occhi` e guarda `MIRA_AVANTI`, che e'
 * 58 cm piu' in alto a 12 metri: l'asse ottico e' inclinato di 2,77 gradi
 * VERSO L'ALTO. L'orizzonte sta sempre al livello dell'occhio, quindi 2,77
 * gradi sotto l'asse: con campo visivo 40 gradi finisce a 0,569 dello
 * schermo — QUARANTACINQUE MILLESIMI SOTTO IL BORDO DELLA PLANCIA.
 *
 * Conseguenza secca: con una strada piana e una camera onesta, del manto
 * NON SI VEDE UN CENTIMETRO. Si vedrebbe solo cielo. Il filmato se la
 * cavava mettendo il proprio orizzonte a 0,368 — cioe' barando, ma senza
 * saperlo, perche' quel numero veniva dall'aver inquadrato il render dal
 * centro del piano.
 *
 * Qui si bara apposta e si dichiara: IL RAGGIO SI INCLINA DI 8,4 GRADI
 * prima di incontrare il manto. Vale a dire che la strada scende, che e'
 * anche il racconto giusto — si e' appena usciti da una corte rialzata e si
 * imbocca il viale in discesa. Il punto di fuga finisce a 0,36 dello
 * schermo a campo 40 e a 0,40 a campo 56 (il campo si apre con la
 * velocita'): sempre dentro il buco, con una fascia di manto alta il 16%
 * dello schermo sotto di lui. Nessuno puo' misurare una pendenza da dentro
 * un'auto — non c'e' un riferimento esterno — quindi si legge come «strada»
 * e basta.
 *
 * =====================================================================
 * COS'E' ADESSO: UN PIANO SOLO, E DENTRO IL MONDO VERO
 * =====================================================================
 *
 * Il piano resta un piano — un `Mesh`, come prima, nello stesso posto — ma
 * il suo frammento non legge una tessitura: RICOSTRUISCE la scena.
 *
 * Per ogni pixel si prende il raggio che va dall'occhio a quel punto del
 * piano, lo si inclina della pendenza, e lo si fa incontrare con tre cose:
 * il manto (un piano orizzontale a 1,02 m sotto l'occhio) e i due muretti
 * (due piani verticali). Da li' escono coordinate di strada vere — quanto
 * avanti, quanto di lato — ed e' su quelle che si disegna.
 *
 * NON E' UN TRUCCO IN PIU' DI UNA GEOMETRIA: E' MENO. Una prospettiva
 * calcolata dal raggio e' ESATTA a qualunque campo visivo, a qualunque
 * formato, e segue la micro-vibrazione della camera per costruzione, perche'
 * la vibrazione sposta `cameraPosition` e quindi sposta i raggi. Una strada
 * modellata a triangoli avrebbe voluto un LOD, un ricucire le mattonelle, e
 * un fondo dove i triangoli finiscono. Qui la strada e' infinita perche' non
 * e' fatta di niente.
 *
 * E cosi' cadono, insieme, i quattro difetti misurati sopra: il movimento e'
 * un numero (`uAvanzamento`) che risponde allo scorrimento in modo continuo
 * invece che a scatti di decodifica; non c'e' un fotogramma zero da
 * nascondere, perche' un'auto ferma con i fari accesi su una strada
 * illuminata e' un'immagine, non un blocco; non ci sono megabyte; e non c'e'
 * un ciclo di cinque secondi che l'occhio riconosce al secondo giro.
 *
 * PERCHE' NON E' UN'ALTRA COSA DENTRO LO STESSO FOTOGRAMMA (D17, D18).
 *
 * La corte e' costruita, il cielo e' procedurale, e la ragione dichiarata in
 * `Corte.ts` e' che tre linguaggi diversi nella stessa inquadratura non li
 * tiene insieme nessun impianto luce. Un filmato compresso oltre il
 * parabrezza era il quarto linguaggio. Il cielo di questo shader e' lo stesso
 * di quello della corte — le stesse fasce, gli stessi numeri — e la pietra dei
 * pilastri ha l'albedo della pietra della corte. Non e' che si somigliano: e'
 * che sono la stessa cosa.
 *
 * (QUANDO SCRISSI QUESTE RIGHE il cielo della corte era `Cielo.ts` e i numeri
 *  arrivavano da li'. Adesso la corte e' una fotografia e i numeri arrivano
 *  dalla fotografia: il PRINCIPIO e' identico, la SORGENTE e' cambiata. Il
 *  «secondo giro» qui sotto ha l'elenco delle misure e il perche'.)
 *
 * =====================================================================
 * SECONDO GIRO — «SI PUO' RENDERE ANCHE LA STRADA PIU' REALE?»
 * =====================================================================
 *
 * La geometria di sopra e' rimasta tutta. Il giudizio non era sulla
 * prospettiva: era sulla MATERIA. Guardando il fotogramma aveva ragione —
 * l'asfalto era una campitura piatta senza granulometria, il cielo era del
 * colore sbagliato, e i pilastri erano lingotti d'oro sospesi nel nero.
 *
 * Vale la regola gia' scritta in `Panorama.ts`: si COSTRUISCE cio' che
 * risponde al movimento, si FOTOGRAFA la materia. Qui la geometria resta
 * costruita perche' e' l'unica cosa che risponde allo scorrimento; la materia
 * arriva da tre fotografie.
 *
 * 1. L'ASFALTO E' UNA FOTOGRAFIA, campionata in coordinate di STRADA.
 *    Colore, normali e ruvidita' da `public/texture/asfalto_*.webp`, indicizzate
 *    con (s, u) — metri lungo la strada, metri di lato — e non con le UV dello
 *    schermo. E' l'unica cosa che conta davvero: con le UV di schermo la grana
 *    resta incollata all'obiettivo e scorre con la camera invece che col
 *    manto, e diventa una velina davanti alla lente.
 *
 * 2. IL CIELO ERA DEL COLORE SBAGLIATO, E SI PUO' DIMOSTRARE.
 *
 *    Il commento qui sopra dice che il cielo di questo shader e' lo stesso di
 *    `Cielo.ts`. Era vero quando l'ho scritto e adesso non lo e' piu', per una
 *    ragione che sta in `core/Esperienza.ts` riga 252: appena la fotografia a
 *    360 gradi arriva, `this.cielo.visible = false`. Il cielo costruito e'
 *    diventato una rete di sicurezza fra l'avvio e il caricamento, e il cielo
 *    che si vede nella corte e' quello di `public/hdri/corte_pano.webp`.
 *
 *    Misurato sulla fotografia, riga per riga, in lineare (mediana per fascia,
 *    non media, per non farsi sporcare dalle luci dell'architettura):
 *
 *      86-72 gradi   0,0116  0,0409  0,1046   indaco profondo, piatto
 *      63 gradi      0,0012  0,0356  0,2462
 *      54 gradi      0,0012  0,0529  0,3185
 *      45 gradi      0,0021  0,0865  0,4397
 *      36 gradi      0,0030  0,1500  0,5583
 *      27 gradi      0,0273  0,2664  0,7084   cobalto pieno
 *      18 gradi e sotto: comincia l'architettura, non e' piu' cielo
 *
 *    Cioe' e' un'ORA BLU: niente rosso da nessuna parte (tre millesimi a 36
 *    gradi), e la saturazione che CRESCE scendendo verso l'orizzonte. Il cielo
 *    di questo shader invece aveva l'orizzonte a (0,400 0,215 0,098), cioe'
 *    ambra. Uscire dalla corte voleva dire passare da un cobalto a un beige in
 *    un taglio — ed e' precisamente il genere di salto che fa dire «sembra un
 *    render» senza saper dire perche'.
 *
 *    Adesso le fasce sono i quattro campioni misurati sopra, interpolati. Il
 *    manto lontano, che specchia proprio quella fascia, diventa un lenzuolo
 *    COBALTO invece che beige — che e' anche l'unica cosa che una fotografia
 *    notturna di strada bagnata fa sempre.
 *
 *    E CADE L'ALONE DEL SOLE. Nella fotografia non c'e': il rosso e' a tre
 *    millesimi ovunque. Quindi sparisce il termine `CALDO * pow(vicino, 3)` e
 *    con lui l'uniform `uVersoSole` e la rotazione del verso del sole nel
 *    costruttore. Al suo posto c'e' l'INQUINAMENTO LUMINOSO dei lampioni, che
 *    e' caldo, sta appiccicato all'orizzonte e segue l'asse della strada
 *    invece dell'azimut del sole — perche' sono i lampioni della strada a
 *    farlo, e loro stanno in fila lungo la strada.
 *
 * 3. I LAMPIONI ERANO TUTTI UGUALI. Il raggio angolare della lampada era
 *    tappato a 0,0035 e sotto quel tappo la lampada smetteva di rimpicciolire
 *    e restava alla stessa luminosita': una fila di punti identici fino in
 *    fondo. Adesso, quando il disco scende sotto il pixel, si SPEGNE invece di
 *    restare grande — e con la distanza si scalda e gli cresce l'alone,
 *    perche' e' l'aria in mezzo a farlo.
 *
 * 4. LA VIGNETTATURA C'E' GIA', e non l'ho rifatta. Sta in
 *    `post/Grado.ts`, vale 0,30 con una rampa da 0,45 a 1,15 del raggio, e
 *    agisce sul fotogramma finito. Aggiungerne una seconda qui avrebbe
 *    scurito due volte gli stessi angoli.
 *
 *    LA SFOCATURA DI MOVIMENTO INVECE VA FATTA QUI, e non in post, per una
 *    ragione che decide da sola: nella fotografia dell'abitacolo il cruscotto
 *    e' FERMO rispetto alla camera. Una sfocatura radiale stesa sul fotogramma
 *    finito spalmerebbe anche il volante e le bocchette, cioe' le uniche cose
 *    che a 295 all'ora restano nitide. Qui si muove solo cio' che si muove
 *    davvero.
 *
 * =====================================================================
 * TERZO GIRO — «SEMBRA CALCOLATA», E AVEVA RAGIONE TRE VOLTE
 * =====================================================================
 *
 * Il secondo giro aveva sistemato la MATERIA. Quello che restava era il
 * difetto che si diagnostica peggio, perche' non e' in nessun oggetto: la
 * scena era REGOLARE. Tre cose, e nessuna costa una geometria.
 *
 * 1. I DODICI PILASTRI ERANO DODICI COPIE, A PASSO PERFETTO. Il passo di 13
 *    metri divide 156, quindi ci sono dodici pilastri distinti prima che il
 *    motivo si ripeta — dodici valori sono tantissimi, e ne stavamo usando
 *    uno. Adesso ognuno si sposta di qualche decimetro dentro la propria
 *    cella, cambia altezza e larghezza di qualche punto percento, e uno su
 *    dodici ha la lampada fulminata. La cosa che si vede di piu' e' il PASSO:
 *    l'altezza si nota solo confrontando, il ritmo si sente senza guardare,
 *    perche' e' un tempo. Vedi `COLONNATO`, che spiega anche perche' spostarli
 *    dentro la cella non puo' rompere il ripiegamento.
 *
 * 2. IL CIELO ERA UN GRADIENTE PERFETTAMENTE LISCIO. I valori erano giusti —
 *    misurati sulla fotografia, riga per riga — ma in natura non esiste un
 *    cielo con dentro niente, e un occhio allenato lo legge in mezzo secondo.
 *    C'e' una fascia di nuvole basse, rade e a bassissimo contrasto, che fa
 *    anche un secondo mestiere: da' una SCALA al fondo. La stessa fascia, con
 *    la stessa funzione e gli stessi numeri, sta in `Cielo.ts`: due cieli che
 *    si nuvolano in modo diverso sarebbero due luoghi diversi.
 *
 * 3. OLTRE IL COLONNATO NON C'ERA NIENTE. Un piano vuoto fino all'orizzonte,
 *    ed e' quello che faceva sembrare la strada sospesa nel vuoto. Adesso c'e'
 *    una silhouette di vegetazione con la base sulla riga d'orizzonte, che si
 *    scioglie nella foschia da 900 metri come tutto il resto. Non e' geometria
 *    e non e' un disegno in piu': e' un profilo in funzione dell'azimut dentro
 *    lo stesso ramo che disegna il cielo, quindi il colonnato la copre da solo.
 *
 * =====================================================================
 * COSA CAMBIA NELLA SUPERFICIE PUBBLICA — dichiarato, come richiesto
 * =====================================================================
 *
 *   `mesh`     invariato: sempre un `Mesh` con `PlaneGeometry`, sempre
 *              posato a 14 m dagli occhi. `Esperienza` non cambia di una
 *              riga (lo aggiunge alla scena e ne accende `visible`).
 *   `pronta`   invariato come tipo, ma vale `true` DAL COSTRUTTORE: non c'e'
 *              piu' niente da caricare. Gli strumenti che l'aspettano
 *              (`continuita.mjs`, `registra.mjs`, `partenza.mjs`) smettono
 *              semplicemente di aspettare.
 *   `aggiorna(acceso, velocita)`  invariata come firma. Cambia cosa fa: non
 *              governa piu' `playbackRate`, governa i metri al secondo.
 *   `video`    RESTA COME CAMPO MA VALE `null`, ed e' l'unica rottura. Non
 *              c'e' piu' nessun elemento video. Chi lo leggeva:
 *                - `strumenti/partenza.mjs` righe 89-91 legge
 *                  `video.currentTime`, `.paused`, `.playbackRate`: adesso
 *                  esplode. I tre valori equivalenti sono `avanzamento`,
 *                  `inMoto` e `andatura`, esposti qui sotto apposta.
 *                - `strumenti/abitacolo_prova.mjs` riga 238 fa
 *                  `material.map = null; material.color.setRGB(1,0,1)` per
 *                  la prova del buco: un `ShaderMaterial` non ha `.color`.
 *                  Al suo posto c'e' `lastra.tingi(1, 0, 1)`, che fa
 *                  esattamente la stessa cosa in una riga.
 *              Il campo si tiene invece di toglierlo perche' un `null` dice
 *              «qui c'era un video e non c'e' piu'», mentre un campo assente
 *              dice solo «non esiste», e i due errori si diagnosticano in
 *              tempi molto diversi.
 *
 * E AL SECONDO GIRO LA SUPERFICIE PUBBLICA NON CAMBIA DI NIENTE. `mesh`,
 * `pronta`, `aggiorna(acceso, velocita)`, `video`, `tingi`, `smonta`: tutto
 * dov'era e con lo stesso significato. `Esperienza.ts` continua a non doversi
 * toccare.
 *
 * Una cosa sola e' nuova ed e' bene saperla: adesso questo file CHIEDE tre
 * file, `public/texture/asfalto_col|nor|rgh.webp`. Non li aspetta — `pronta`
 * resta true dal costruttore e senza di loro l'immagine e' completa, e' solo
 * piu' povera — ma se un giorno sparissero dal deploy, il difetto si
 * presenterebbe come «l'asfalto e' tornato piatto» e non come un errore.
 *
 * E la decisione D12 — lo scorrimento governa `playbackRate`, mai
 * `currentTime` — non si viola: si estingue. Esisteva perche' lo scrubbing
 * di un video va a scatti. Qui non c'e' niente da cercare dentro un flusso
 * compresso: c'e' un numero in metri che si integra a ogni fotogramma, e
 * l'unico modo di farlo saltare sarebbe scriverlo male.
 */

export const LASTRA = {
  /** distanza dagli occhi del guidatore, in metri. Invariata. */
  distanza: 14.0,
  /**
   * IL PIANO E' MOLTO PIU' GRANDE DI PRIMA, E ADESSO NON COSTA NIENTE.
   *
   * Prima era 30 x 16,875, cioe' 16:9, e la misura era VINCOLANTE: da li'
   * usciva il campo visivo con cui era stato renderizzato il filmato, e
   * cambiarla avrebbe stirato l'immagine.
   *
   * Adesso la misura non entra piu' nell'immagine. Ogni pixel calcola il
   * proprio raggio: allargare il piano cambia solo QUANTO SCHERMO copre, non
   * che cosa ci si vede sopra — un ingrandimento non zooma niente.
   *
   * Quindi si prende margine, e si prende dove serviva. Il piano precedente
   * arrivava in basso a -1,006 in coordinate normalizzate a campo 56 gradi:
   * fuori di sei millesimi, cioe' passava per un pelo, e passava solo perche'
   * la plancia copre comunque la parte bassa. 44 x 30 copre 57 gradi per lato
   * e da -43 a +50 in verticale: qualunque campo visivo, qualunque formato,
   * qualunque vibrazione futura, senza che nessuno debba rifare il conto.
   */
  larghezza: 44.0,
  altezza: 30.0,
}

/**
 * I NUMERI DELLA STRADA, in metri e in gradi.
 *
 * Stanno in un posto solo perche' lo shader li riceve come costanti scritte
 * dentro il sorgente: qui si leggono, li' si usano, e non c'e' modo che i due
 * elenchi divergano perche' e' questo a generare quello.
 */
const STRADA = {
  /**
   * Altezza dell'occhio sul manto. E' `AUTO.occhi.y`, non un numero nuovo:
   * il pavimento della corte sta a zero e gli occhi del guidatore a 1,02, e
   * un'auto sportiva vera mette l'occhio poco sopra il metro. Prendendolo da
   * li' invece di riscriverlo, il giorno in cui si abbassa la seduta la
   * strada scende con lei.
   */
  occhio: AUTO.occhi.y,
  /** vedi il ragionamento lungo in testa al file: 8,4 gradi mettono il punto
   *  di fuga a 0,36 dello schermo, dentro il buco misurato (0,208-0,524) */
  pendenza: 8.4,
  /**
   * DOVE STA LA CAMERA DENTRO LA CORSIA, in metri dalla mezzeria.
   *
   * La mezzeria e' l'origine delle coordinate laterali. La corsia e' larga
   * 3,70 e l'auto ci sta in mezzo, a 1,85; il guidatore siede 38 cm alla
   * SINISTRA dell'asse dell'auto, quindi a 1,47 dalla mezzeria. Da li' esce
   * la conversione `u = P.z + 1,47`.
   *
   * E la mezzeria finisce alla SINISTRA di chi guida, che e' la mano giusta:
   * la fotografia dell'abitacolo ha il volante a sinistra, cioe' guida a
   * sinistra e circolazione a destra. Non e' un dettaglio da pedanti — una
   * mezzeria dalla parte sbagliata e' la classica cosa che nessuno sa dire
   * perche' non torna, ma che non torna.
   */
  scarto: 1.47,
  corsia: 3.70,
  /** meta' larghezza della vernice: una striscia di 15 cm */
  vernice: 0.075,
  /** tratteggio extraurbano: 4,5 metri di tratto ogni 12 */
  tratto: 4.5,
  passoTratto: 12.0,
  /** il cordolo di pietra fra asfalto e banchina erbosa */
  cordolo: { centro: 4.525, meta: 0.175 },
  /**
   * IL COLONNATO DEL VIALE, e ci sono voluti due provini sbagliati.
   *
   * Al primo giro erano due MURETTI continui a 8,60 metri, alti 1,85. Nel
   * fotogramma non erano un viale: erano un SOTTOPASSO. La ragione la da' un
   * conto di due righe — il guidatore sta a 1,47 dalla mezzeria, quindi il
   * muro di destra gli passa a 7,13 metri, e un muro alto 1,85 visto da un
   * occhio a 1,02 sporge 83 cm sopra l'orizzonte: 6,6 gradi, un sesto
   * dell'altezza dello schermo. Due pareti che salgono di un sesto dello
   * schermo ai lati sono una galleria, comunque le si illumini.
   *
   * Allontanarle e abbassarle (12 metri, 1,75) le ha spente ma non le ha
   * cambiate: restavano due campiture di cemento che scivolano.
   *
   * IL DIFETTO NON ERA LA MISURA, ERA LA CONTINUITA'. Sta scritto in
   * `Corte.ts` da prima che questo file esistesse: «sono i PILASTRI a passare
   * davanti alla camera uno dopo l'altro a dare il senso del movimento, che
   * con un fondale non c'e'». Un muro continuo non ha ritmo: a
   * duecentonovanta all'ora scorre e basta. Una schiera di pilastri lampeggia,
   * e il lampeggio E' la velocita'.
   *
   * Quindi ai lati del viale c'e' lo stesso colonnato della corte, con lo
   * stesso mestiere: il taglio di luce sta DENTRO il pilastro, in una gola —
   * si vede la luce, non la lampada, che e' la definizione di illuminazione
   * architetturale e la ragione per cui la corte non sembra un parcheggio.
   *
   * Il passo di 13 metri divide 156 (vedi `giro`), quindi al ripiegamento la
   * schiera ricade su se stessa. A 82 m/s passano sei pilastri al secondo:
   * sotto i quattro il ritmo sembra un cancello, sopra i dieci diventa uno
   * stroboscopio.
   *
   * LE PROPORZIONI SONO STATE SBAGLIATE UNA VOLTA, e vale la pena dire come.
   * Il primo giro li aveva larghi 62 cm e alti 2,45: nel provino non erano
   * pilastri, erano PALETTI DI RECINZIONE con una lucina in cima. Il rapporto
   * fra altezza e larghezza faceva 4,0 — cioe' il rapporto di un palo, non di
   * un sostegno. Nella corte il pilastro sta a 8,40 su 1,90, che fa 4,4, ma
   * quello e' un ordine ALTO: a due metri e mezzo da terra lo stesso rapporto
   * diventa uno stecco. 1,10 su 2,90 fa 2,6, che e' il rapporto di un pilastro
   * basso — un pilastro di cinta, non una colonna — ed e' quello che serve
   * qui, perche' questi non reggono niente: segnano un passo.
   *
   * ...E AL SECONDO GIRO LA LARGHEZZA E' PASSATA DA 1,10 A 2,05, perche' il
   * rapporto giusto non e' quello del pilastro: e' quello che si VEDE.
   *
   * Il conto che mancava e' lo scorcio. La faccia guarda la strada, cioe' ha
   * la normale lungo Z, ma dal posto di guida non la si vede mai di fronte: il
   * pilastro piu' vicino che entra nel parabrezza sta una ventina di metri
   * avanti e dieci di lato, quindi la sua faccia e' inclinata di sessantatre
   * gradi e ne mostra il coseno — 0,45. Un metro e dieci diventano quarantanove
   * centimetri contro due metri e novanta di altezza: il rapporto APPARENTE e'
   * 5,9, cioe' esattamente il rapporto di un palo. Il numero dichiarato di 2,6
   * valeva per una faccia vista di fronte, che qui non capita mai.
   *
   * Con 2,05 lo scorcio ne lascia 92 centimetri e il rapporto apparente scende
   * a 3,2 — un monolite basso, non uno stecco. Nel provino il cambiamento e'
   * netto e non e' un'opinione: la stessa fila, con la stessa luce, smette di
   * leggersi come una staccionata.
   *
   * SI TORNA INDIETRO CAMBIANDO UN NUMERO, e vale la pena dirlo: e' l'unica
   * misura di geometria toccata al secondo giro, tutto il resto e' materia.
   *
   * AL TERZO GIRO QUESTI NUMERI SONO DIVENTATI UNA MEDIA. Passo, altezza e
   * larghezza qui sotto restano quello che erano, ma nessuno dei dodici
   * pilastri li ha tutti e tre esatti: si spostano dentro la propria cella e
   * cambiano misura di qualche punto percento, e uno su dodici ha la lampada
   * fulminata. Vedi `COLONNATO`, che spiega anche perche' spostarli non puo'
   * rompere niente.
   */
  /**
   * QUARTO GIRO — «PALETTI NERI COME PARALLELEPIPEDI», E AVEVANO RAGIONE.
   *
   * Il commento qui sopra contiene, senza saperlo, la diagnosi completa: dice
   * che la faccia «dal posto di guida non la si vede mai di fronte», che e'
   * inclinata di sessantatre gradi e che quindi ne mostra il coseno. Da li' ha
   * ricavato la cura sbagliata — ALLARGARE LA FACCIA da 1,10 a 2,05, cioe'
   * disegnare una faccia falsa larga il doppio del vero perche' scorciata
   * tornasse giusta.
   *
   * Il conto della larghezza apparente era esatto. La conclusione no: se della
   * faccia frontale se ne vede il 45 per cento, il resto di quello che si vede
   * NON e' faccia frontale, e' il FIANCO — la testata del pilastro, quella che
   * guarda verso di noi lungo la strada. E il fianco non c'era proprio: al suo
   * posto c'era altra faccia frontale, con lo stesso colore, la stessa luce e
   * la stessa gola. Cioe' un rettangolo di colore unico.
   *
   * Un parallelepipedo di colore uniforme e' letteralmente cio' che si stava
   * disegnando, e infatti e' la parola che hanno usato tutti e due i revisori.
   *
   * IL CONTO DI QUANTO SE NE VEDE. La larghezza apparente di una faccia e' la
   * sua estensione per la componente del raggio lungo la sua normale. La
   * frontale ha la normale di traverso (Z), il fianco ce l'ha lungo la strada
   * (X): quindi stanno fra loro come «vera * |d.z|» a «profondita' * |d.x|».
   * Per un pilastro venti metri avanti e undici e mezzo di lato fa 0,37 contro
   * 0,63 — cioe' quasi due terzi di quello che si vede e' la faccia che
   * mancava.
   *
   * LA SAGOMA NON SI TOCCA. `larghezza` resta 2,05 e la prova d'intersezione
   * resta quella di prima, al centimetro: quel numero e' tarato a occhio su
   * due giri di provini e cambiarlo vorrebbe dire rifare il ritmo del
   * colonnato per guadagnare un'esattezza che nessuno puo' misurare da dentro
   * un'auto. Quello che cambia e' che DENTRO la stessa sagoma adesso ci sono
   * due facce invece di una, con due luci diverse e uno spigolo in mezzo.
   * Costa zero intersezioni in piu': lo spigolo e' una soglia sulla coordinata
   * che si stava gia' calcolando.
   */
  pila: {
    lato: 11.5, altezza: 2.90, larghezza: 2.05, passo: 13.0,
    /** la sezione VERA, che serve solo a dividere la sagoma fra le due facce.
     *  1,10 e' la larghezza dichiarata al primo giro, prima che venisse
     *  gonfiata per compensare lo scorcio; la profondita' e' uguale perche' un
     *  pilastro di cinta ha sezione quadra */
    vera: 1.10,
    profondita: 1.10,
  },
  /** il taglio di luce annegato nel pilastro: quota bassa, quota alta, meta'
   *  larghezza. Non arriva ne' a terra ne' in cima: una gola che tocca i due
   *  estremi non e' una gola, e' una parete verniciata */
  taglio: { basso: 0.55, alto: 2.30, meta: 0.075 },
  /** i pali della luce: dove, quanto alti, ogni quanto. Stanno DENTRO il
   *  colonnato, cosi' la loro luce lava i pilastri dal lato della strada */
  palo: { lato: 8.4, altezza: 5.40, passo: 26.0 },
  /** dove stanno i due fari, in coordinate di corsia */
  faro: { centro: 1.85, semipasso: 0.78, altezza: 0.62 },
  /**
   * IL GIRO SU CUI SI RIPIEGA L'AVANZAMENTO.
   *
   * Un contatore di metri che cresce per sempre perde precisione: a un
   * milione di metri un float a 32 bit ha il passo di 6 centimetri, e il
   * tratteggio comincia a tremare. Si ripiega, ma NON a un numero qualsiasi:
   * 156 e' divisibile per 12 (il passo del tratteggio) e per 26 (il passo dei
   * pali), quindi al ripiegamento tutti i motivi ricadono su se stessi e non
   * si vede niente. Con 150, o con 200, si vedrebbe un salto ogni due
   * chilometri e sarebbe impossibile da diagnosticare.
   */
  /* 780 E NON 156 — e il numero vecchio non era sbagliato, era corto.
     Il commento qui sopra dice giusto sul PERCHE' si ripiega e su come si
     sceglie il numero, e quella parte resta: 156 e' divisibile per 12 (il
     tratteggio), per 26 (i pali) e per 1,5 (la piastrella), quindi al
     ripiegamento tutti i motivi ricadono su se stessi.
     Quello che il commento non diceva e' che il ripiegamento non e' solo un
     conto di precisione: e' anche la LUNGHEZZA DEL FILM. A 295 all'ora
     l'automobile percorre 82 metri al secondo, quindi 156 metri sono UN
     SECONDO E NOVE DECIMI. Ogni due secondi la strada torna esattamente
     com'era. Finche' tutto sul manto sta su una griglia regolare non si nota —
     un pettine regolare e' identico a se stesso comunque lo si tagli — ma
     appena si mette una cosa irregolare, quella cosa diventa un motivo che
     ritorna ogni due secondi, che e' peggio del pettine.
     780 e' cinque volte 156, quindi conserva OGNI divisibilita' (780/12 = 65,
     780/26 = 30, 780/13 = 60, 780/1,5 = 520) e porta il film a nove secondi e
     mezzo. E la precisione regge senza discussione: i sei centimetri di passo
     citati sopra valgono a un MILIONE di metri; a ottocento un float a 32 bit
     ha un passo di cinque centesimi di millimetro. */
  giro: 780.0,
  /** i giunti di dilatazione: vedi il blocco «I GIUNTI» nello shader */
  giunto: { passo: 60.0, scarto: 34.0, meta: 0.105, scuro: 0.40 },
  /**
   * LA PIASTRELLA DELL'ASFALTO, in metri, e la misura NON e' libera.
   *
   * Le tre tessiture sono 1024 pixel per lato. A un metro e mezzo un texel
   * copre 1,46 millimetri, che e' la scala vera del granulato di un asfalto:
   * si vede il singolo sasso. Al doppio i sassi diventano ciottoli e il manto
   * legge come roccia; alla meta' i grani finiscono sotto il millimetro e in
   * lontananza non resta che moire' — che e' peggio del difetto che si sta
   * togliendo, perche' il moire' si muove.
   *
   * E 1,5 DIVIDE 156 esattamente 104 volte. Il giro dell'avanzamento e' stato
   * scelto (vedi sopra) perche' fosse divisibile per il passo del tratteggio e
   * per quello dei pali: la piastrella entra nella stessa regola, quindi al
   * ripiegamento ricade su se stessa e nessuno vede il salto.
   */
  piastrella: 1.5,
  /**
   * IL TEMPO DI POSA DELLA MACCHINA DA PRESA.
   *
   * Era gia' dentro lo shader, scritto 1/110 dentro la scia del tratteggio.
   * Adesso lo usano in tre — il tratteggio, la grana dell'asfalto e il nucleo
   * dei lampioni — e tre posti che devono concordare sono un numero, non un
   * letterale ripetuto. E' anche la manopola giusta se un giorno si vuole
   * un'immagine piu' o meno mossa: 1/110 e' quanto tiene un fotografo che
   * segue un'auto in movimento.
   */
  posa: 1 / 110,
}

/**
 * LE TESSITURE DELL'ASFALTO — quello che portano, misurato sul file.
 *
 * `asfalto_col`  media in lineare (gamma 2,2)  0,0353  0,0422  0,0503
 *                mediana del rapporto sulla media: 0,34-0,46, massimo 15x
 * `asfalto_nor`  deviazione delle pendenze: 0,26 in x, 0,29 in y — cioe'
 *                grani con fianchi fino a una quindicina di gradi
 * `asfalto_rgh`  media 0,658, dal 5% al 95% fra 0,565 e 0,714
 *
 * DUE NUMERI DECIDONO COME SI USANO.
 *
 * Il primo: la media in lineare del colore e' (0,035 0,042 0,050), cioe' e'
 * gia' quasi esattamente l'albedo dichiarato dell'asfalto (0,052 0,053
 * 0,058). Le due misure sono d'accordo, il che vuol dire che la fotografia e'
 * esposta come va esposta e non c'e' niente da correggere.
 *
 * Il secondo: la mediana del rapporto sulla media sta a 0,4, con code fino a
 * 15x. Cioe' l'asfalto e' quasi tutto bitume scuro con RARI sassi che
 * brillano. E' esattamente la distribuzione che un rumore non produce mai —
 * un rumore e' simmetrico attorno alla media — ed e' il motivo per cui la
 * fotografia batte il procedurale anche qui, come lo aveva battuto sul marmo.
 */
const ASF = {
  /** la media in lineare, per riportare la fotografia alla propria media */
  media: [0.03528, 0.04222, 0.05033],
  /**
   * SI COMPRIME LA FOTOGRAFIA PRIMA DI USARLA, e la ragione e' fisica.
   *
   * Nell'immagine la luce c'e' gia' dentro: quei sassi sono chiari perche'
   * qualcuno li stava illuminando. Moltiplicarla per la NOSTRA luce vuol dire
   * elevare al quadrato il contrasto, e un contrasto al quadrato su un
   * rapporto di quindici a uno da' schegge bianche in mezzo al nero.
   * L'esponente sotto uno restituisce grosso modo la meta' che c'era gia':
   * 15x diventa 5,3x, che sotto il fascio dei fari e' un sasso bagnato che
   * brilla, non un buco nel fotogramma.
   */
  compressione: 0.62,
  /** dopo la compressione la media non e' piu' uno (vale 0,79-0,84): senza
   *  questo riporto tutto il manto scenderebbe di un quinto, cioe' la
   *  fotografia cambierebbe l'ESPOSIZIONE oltre che la grana, che non e' il
   *  suo mestiere */
  riporto: [1.267, 1.227, 1.195],
  /** la media della ruvidita', per leggerla come scarto invece che come
   *  valore assoluto */
  ruvidita: 0.6582,
  /**
   * LA MAPPA DI RUVIDITA' E' CONTRASTATA POCO: dal 5% al 95% sta fra 0,565 e
   * 0,714, cioe' un piu' o meno dodici per cento attorno alla media. Cosi'
   * com'e' non si vedrebbe. Si amplifica di due volte e mezzo attorno alla
   * media — che e' un intervento dichiarato, non una misura — e a quel punto
   * i sassi affioranti specchiano davvero piu' del bitume intorno.
   */
  contrastoRuvidita: 2.5,
  /**
   * QUANTO PESA IL RILIEVO SUL RIFLESSO.
   *
   * E' la manopola piu' delicata del file. Le pendenze della mappa arrivano a
   * una quindicina di gradi, e a incidenza radente una pendenza di quindici
   * gradi sposta il raggio riflesso di trenta: dalla fascia luminosa
   * dell'orizzonte a mezzo cielo sopra. A piena forza il manto diventa una
   * lamiera martellata. A 0,45 lo spostamento resta sotto i quindici gradi:
   * abbastanza per rompere il lenzuolo uniforme — che e' l'effetto linoleum —
   * senza trasformarlo in scintillio.
   */
  rilievo: 0.45,
  /** oltre questa distanza il rilievo si spegne. Le mip medie fra loro le
   *  normali e la superficie torna piatta da sola, ma cio' che sparisce nella
   *  media e' proprio la VARIANZA, ed e' la varianza a produrre lo scintillio
   *  a incidenza radente dove l'anisotropia a otto campioni non arriva piu' */
  portataRilievo: 55.0,
  /** e oltre questa si spegne la grana del colore. Piu' lontana del rilievo
   *  perche' una macchia chiara che si spegne non fa danno, mentre una normale
   *  che sopravvive mezzo pixel sfarfalla */
  portataGrana: 70.0,
}

/**
 * QUANTO VA, e da dove vengono i due estremi.
 *
 * `scorrimento.velocita` e' in progresso al secondo, e va tradotto in metri
 * al secondo. La traduzione non e' inventata: `strumenti/andatura.mjs` ha
 * campionato quel numero muovendo la rotella come la muove una persona.
 *
 *   rotella piano     picco 0,26   in regime 0,05-0,07
 *   rotella normale   picco 0,18   in regime 0,03
 *   rotella forte     picco 0,35
 *   un secondo dopo aver smesso    0,0005-0,03
 *
 * Quindi la risposta si tara su 0,05, non su 0,31 come faceva la vecchia
 * formula del `playbackRate` — che infatti restituiva sempre un terzo.
 * L'esponenziale invece della saturazione lineare serve a non avere MAI un
 * tetto: chi scorre come un forsennato deve continuare a guadagnare
 * qualcosa, se no la manopola gli muore in mano.
 */
/**
 * L'USURA — cioe' la differenza fra una strada e un piano con le righe sopra.
 *
 * Il manto di questo file e' costruito bene: fotografia di granulato, normali,
 * ruvidita' letta come scarto dalla media, vernice piu' liscia dell'asfalto.
 * Manca una cosa sola, e l'audit la nomina senza saperla nominare quando dice
 * che la scena di guida «legge come prototipo»: quella strada NON LA USA
 * NESSUNO. E' appena stata stesa, tutta lo stesso giorno, e nessuna gomma ci
 * e' mai passata sopra.
 *
 * Sono quattro segni, e nessuno costa una geometria in piu'.
 */
const USURA = {
  /**
   * LE TRACCE DELLE RUOTE, e la misura viene da dov'era gia' scritta.
   *
   * Sotto ogni corsia ci sono due bande lucidate dai pneumatici, larghe poco
   * piu' della battuta di una gomma, distanti fra loro il passo delle ruote.
   * Il passo non e' un numero nuovo: e' `faro.semipasso`, 78 cm, cioe' la
   * stessa mezza carreggiata da cui escono i due fari — le ruote di questa
   * automobile passano esattamente dove passano quelle di tutte le altre.
   *
   * Il bitume lucidato SPECCHIA DI PIU' e riflette di meno il proprio
   * colore: e' il granulato affiorante che si e' consumato, quindi la
   * superficie si e' fatta liscia e un filo piu' scura. Le due cose insieme,
   * di notte e con l'asfalto che specchia il cobalto, danno due nastri chiari
   * che corrono via — che e' precisamente cio' che si vede dal parabrezza di
   * un'auto vera e che qui non c'era.
   */
  traccia: { largo: 0.26, lucidatura: 0.34, sporco: 0.10 },
  /**
   * I CATARIFRANGENTI, uno ogni dodici metri sulla banchina.
   *
   * Dodici perche' e' il passo del tratteggio, quindi divide il giro di 156 e
   * al ripiegamento ricade su se stesso; ma sfasati di sei, cioe' messi in
   * mezzo fra un tratto e il successivo, se no battono lo stesso tempo e si
   * legge un motivo solo invece di due.
   *
   * Sono l'unica cosa della scena che rimanda la luce DRITTA a chi la manda:
   * si accendono col fascio e con nient'altro, e con la sfocatura di
   * movimento diventano trattini che sfilano. E' anche il modo piu' economico
   * di dare un ritmo al BORDO della strada, che oggi e' l'unica parte del
   * fotogramma dove non succede niente.
   */
  occhi: { passo: 12.0, sfasamento: 6.0, dove: 3.86, meta: 0.075, lungo: 0.220, forza: 240.0, tetto: 12.0 },
  /**
   * IL MANTO NON E' STATO STESO TUTTO LO STESSO GIORNO.
   *
   * Una variazione lenta di ruvidita' e di esposizione, che si legge come
   * rappezzi e riprese di stesa. La fotografia porta la grana — il singolo
   * sasso — ma si ripete ogni metro e mezzo, quindi a media distanza il manto
   * torna una campitura uniforme: questo e' l'unico modo di avere una
   * variazione che si vede a cinquanta metri senza una tessitura nuova.
   *
   * LE DUE LUNGHEZZE NON SONO LIBERE. `uAvanzamento` si ripiega a 156 metri, e
   * qualunque motivo il cui passo non divide 156 SALTA al ripiegamento. 39 e
   * 52 lo dividono (quattro e tre volte) e il loro minimo comune multiplo e'
   * 156 stesso: le due onde insieme danno dodici combinazioni diverse prima di
   * ripetersi, cioe' l'occhio non trova il ciclo.
   */
  chiazza: { lungaA: 39.0, quanteA: 4.0, lungaB: 52.0, quanteB: 3.0, ruvido: 0.22, colore: 0.15 },
  /**
   * LE LAMPADE NON SONO TUTTE UGUALI, e la parte che conta e' la seconda.
   *
   * `indice` fa invecchiare le lampade una diversa dall'altra — sei valori,
   * perche' sei pali sono 156 metri e oltre quel numero il ripiegamento
   * ricomincerebbe da un'altra parte e si vedrebbe un lampo. Sei brillantezze
   * che si ripetono ogni due secondi in punta sono sotto la soglia in cui si
   * riconosce un ciclo; sei lampade IDENTICHE sono sopra la soglia in cui si
   * riconosce una macchina.
   *
   * `destra` e `sinistra` valgono di piu' e non hanno nessun rischio di
   * ciclo, perche' non dipendono da dove si e': i due filari sono due
   * forniture diverse, come su qualunque strada vera dove si e' rifatto un
   * lato solo. E rompono la simmetria perfetta del corridoio, che e' uno dei
   * segni piu' riconoscibili di una scena calcolata.
   *
   * La media dei quattro numeri e' uno: la taratura di `pozzaPali`, che e'
   * misurata sul fotogramma, resta valida.
   */
  lampade: { indice: 0.24, destra: 1.07, sinistra: 0.93 },
}

/**
 * I DODICI PILASTRI NON SONO DODICI COPIE — e dodici sono tanti.
 *
 * Il passo e' 13 metri e il giro e' 156: 156/13 fa esattamente DODICI, quindi
 * prima che il motivo ricada su se stesso passano dodici pilastri diversi. Non
 * e' un dettaglio da niente. Con quattro o cinque valori l'occhio trova il
 * ciclo in due secondi; con dodici non lo trova, perche' fra un pilastro e il
 * suo gemello ci sono 156 metri — nove secondi di crociera, due in punta — e
 * nel frattempo ne sono sfilati undici di mezzo.
 *
 * SPOSTARLI DENTRO LA CELLA E' SICURO PER COSTRUZIONE, e vale la pena dire
 * perche', se no la prima cosa che viene in mente e' che si rompa la cucitura.
 * Il pilastro si disegna con «mod(s + passo/2, passo) - passo/2», cioe' dentro
 * una cella larga tredici metri, e ne occupa due: il confine fra due celle e'
 * ARIA. Spostare il centro di mezzo metro non puo' toccarlo. Non c'e' nessun
 * bordo da ricucire ne' fra due celle ne' al ripiegamento dei 156 metri,
 * perche' l'indice si ripiega su dodici valori e dodici celle sono esattamente
 * un giro.
 *
 * E IL PASSO IRREGOLARE E' LA COSA CHE SI VEDE DI PIU'. Altezza e larghezza si
 * notano solo mettendo due pilastri uno accanto all'altro; il RITMO invece si
 * sente senza guardare, perche' e' un tempo e non una forma. Un colonnato che
 * batte esattamente sei colpi al secondo e' un metronomo, e un metronomo non
 * l'ha costruito un muratore. Mezzo metro di scarto su tredici e' il quattro
 * per cento: nessuno lo misura, tutti lo sentono.
 */
const COLONNATO = {
  /** quanti pilastri distinti prima che il motivo ricada su se stesso: 156/13 */
  quanti: 12.0,
  /** di quanto si sposta il centro dentro la cella, in metri (piu' o meno) */
  scarto: 0.45,
  /** di quanto cambiano altezza e larghezza, in frazione (piu' o meno). La
   *  quota del taglio di luce segue l'altezza, perche' un pilastro piu' alto
   *  non ha la gola alla stessa quota: ce l'ha alla stessa PROPORZIONE */
  altezza: 0.07,
  larghezza: 0.06,
  /**
   * QUALE TAGLIO E' SPENTO — e non lo decide un rumore, lo decide un conto.
   *
   * Un hash qui sarebbe stato una scommessa. «fract(sin(x) * 43758)» con x
   * dell'ordine delle migliaia dipende da quante cifre la scheda tiene su un
   * seno, e su una scheda diversa i dodici valori sono altri dodici. Per una
   * larghezza va benissimo — nessuno sa quanto doveva essere larga. Per una
   * cosa che si CONTA no: con un po' di sfortuna i tagli spenti diventano
   * quattro, e un viale con un terzo delle luci fulminate non e' trascurato,
   * e' abbandonato.
   *
   * «fract(i * 0,37 + 0,11)» sui dodici indici da' invece dodici numeri che si
   * possono scrivere qui e che non cambiano da nessuna parte:
   *
   *   i    0     1     2     3     4     5     6     7     8     9    10    11
   *       0,11  0,48  0,85  0,22  0,59  0,96  0,33  0,70  0,07  0,44  0,81  0,18
   *
   * Con la soglia fra 0,085 e 0,160 ne resta UNO spento (i = 8, che vale 0,07)
   * e UNO morente al ventisei per cento (i = 0, che vale 0,11). Uno su dodici
   * fulminato e uno che sta andando: e' il conto di una strada vera, ed e'
   * quello che si legge come manutenzione invece che come guasto.
   *
   * La gola d'ombra intorno alla feritoia resta accesa anche dove la lampada
   * e' morta: quella e' pietra scavata, non luce, e una lampada fulminata non
   * riempie la propria nicchia.
   */
  passoGuasto: 0.37,
  semeGuasto: 0.11,
  spento: 0.085,
  vivo: 0.160,
  /**
   * QUANTO DELLA SAGOMA PUO' DIVENTARE FIANCO, AL MASSIMO — e questo tetto e'
   * l'unica cosa non geometrica di tutto il pezzo, quindi si dichiara.
   *
   * Senza tetto il conto e' esatto e porta dritto a un guaio. Un pilastro a
   * duecento metri lo si vede quasi di testa: «|d.x| / |d.z|» vale diciassette,
   * quindi il fianco si prende il 94 per cento della sagoma e della faccia
   * frontale resta un filo di sei centesimi. Ma e' NELLA faccia frontale che
   * sta la gola di luce, ed e' la fila di gole che scappano a fare il ritmo di
   * tutto il beat: geometricamente sparirebbero, e sparirebbe con loro la cosa
   * per cui il colonnato esiste.
   *
   * Il tetto a 0,58 e' quello che si ottiene se i pilastri sono RUOTATI VERSO
   * IL TRAFFICO di una venticinquina di gradi invece che squadrati con la
   * strada — che e' esattamente cio' che si fa con un apparecchio di
   * illuminazione architettonica lungo un viale: lo si punta verso chi arriva,
   * se no lo vede solo chi e' gia' passato. Quindi non e' un trucco per salvare
   * il fotogramma, e' una posa: solo, e' una posa scelta guardando il provino e
   * non misurata da nessuna parte.
   */
  tettoFianco: 0.58,
}

/**
 * IL FONDO DEL MONDO — quello che c'era prima: NIENTE.
 *
 * Oltre il colonnato lo shader disegnava un piano vuoto fino a 4500 metri e poi
 * un gradiente. Sono due difetti diversi che sembrano lo stesso difetto.
 *
 * 1. UN GRADIENTE PERFETTAMENTE LISCIO SI LEGGE COME FINTO IN MEZZO SECONDO.
 *    Non perche' sia brutto — e' misurato sulla fotografia, riga per riga, e i
 *    valori sono giusti — ma perche' in natura non esiste un cielo senza NIENTE
 *    dentro. Anche la sera piu' limpida ha una fascia di nuvole basse
 *    all'orizzonte, e sono quelle a dire quanto e' lontano l'orizzonte.
 *
 * 2. SENZA SCALA, L'ORIZZONTE E' UNA LINEA E NON UNA DISTANZA. Una nuvola e un
 *    albero sono le due cose di cui si conosce la misura vera senza pensarci:
 *    messe la', dicono che quel punto e' a un chilometro. Tolte, la strada
 *    finisce nel vuoto — ed e' esattamente cio' che il fotogramma diceva.
 *
 * LE DUE COSE SONO SCRITTE INSIEME PERCHE' SI REGGONO A VICENDA, e tutte e due
 * si attaccano all'orizzonte dalla stessa parte: le nuvole SOPRA la riga, gli
 * alberi CON LA BASE SULLA RIGA. E' la stessa geometria vista dai due lati.
 */
const FONDO = {
  /**
   * LE NUVOLE — e la cosa importante non e' il rumore, e' la PROIEZIONE.
   *
   * Un ponte di nuvole basse e' un piano orizzontale a quota fissa. Guardarlo
   * vuol dire dividere la direzione dello sguardo per il seno dell'elevazione:
   * «d.xz / d.y». E' quella divisione a fare tutto il lavoro — le nuvole si
   * stringono e si allungano avvicinandosi all'orizzonte, esattamente come le
   * mattonelle di un pavimento visto di striscio — ed e' per questo che danno
   * una SCALA invece di essere una decorazione. Un rumore steso sulla volta
   * senza dividere per «d.y» e' carta da parati: si vede subito, e non si sa
   * dire perche'.
   *
   * LA DIVISIONE VA FERMATA, MA CON UN FONDO E NON CON UN TAPPO. All'orizzonte
   * «d.y» tende a zero, la coordinata tende all'infinito e il rumore diventa
   * piu' fitto del pixel: formicolio. La prima versione tappava il denominatore
   * a 0,06 — e sotto quella quota la coordinata smetteva di dipendere
   * dall'altezza, cioe' le nuvole diventavano strisce verticali con i bordi
   * dritti proprio nella fascia in cui si accendono. Adesso il denominatore e'
   * «d.y + 0,05»: fa lo stesso mestiere, e' monotono e non ha nessun ginocchio,
   * quindi non lascia nessuna riga da nessuna parte.
   */
  scala: 0.9,
  quota: 0.05,
  /**
   * DOVE COMINCIA E DOVE FINISCE LA FASCIA, in seno dell'elevazione — che e'
   * «d.y» di un raggio normalizzato, cioe' il numero che si ha gia' in mano.
   *
   * 0,012 e 0,060 sono 0,7 e 3,4 gradi; 0,09 e 0,30 sono 5,2 e 17,5. Cioe' le
   * nuvole stanno tutte sotto i diciassette gradi e mezzo, che e' dove stanno
   * le nuvole basse vere viste da terra.
   *
   * IL TETTO ERA A VENTISETTE GRADI E L'HO ABBASSATO, e la ragione e' misurata.
   * Il bordo alto del parabrezza, a campo aperto, cade a una ventina di gradi
   * sopra l'orizzonte: dai diciassette in su le nuvole ci sono ma valgono meno
   * del tre per cento di scurimento, cioe' non si vedono. E ogni pixel fra i
   * diciassette e i ventisette pagava otto seni per non farsi vedere. Chiudere
   * la fascia piu' in basso toglie quel terzo di lavoro e non toglie
   * un'immagine: e' anche il motivo per cui si chiamano nuvole BASSE.
   *
   * MA IL NUMERO CHE CONTA E' LO ZERO IN BASSO, ed e' un vincolo duro che
   * arriva da due schermate piu' su. Il manto lontano si scioglie in «aria»,
   * che e' il cielo preso ESATTAMENTE all'orizzonte, e tutto il ragionamento
   * sui 4500 metri esiste perche' fra il pixel sotto la riga e quello sopra non
   * ci sia nessuno scalino. Una nuvola che valesse qualcosa a «d.y = 0»
   * rimetterebbe li' quello scalino — piu' scuro sopra la riga, pieno sotto —
   * cioe' rifarebbe l'orizzonte marino che e' costato un giro intero a
   * togliere. Quindi la fascia si apre SOPRA la riga e non sulla riga.
   */
  attacco: 0.060,
  attaccoDa: 0.012,
  fine: 0.30,
  fineDa: 0.09,
  /**
   * RADE, e la soglia e' il modo di ottenerlo. Il rumore ha media un mezzo:
   * prendendo solo cio' che sta sopra 0,54 restano le creste, cioe' un terzo
   * scarso di cielo coperto. Senza soglia il ponte e' continuo, e un ponte
   * continuo di notte non e' una fascia di nuvole: e' una foschia, che in questa
   * scena c'e' gia' e non ha bisogno di aiuto.
   */
  soglia: 0.54,
  sogliaA: 0.80,
  /**
   * A BASSISSIMO CONTRASTO, E SCURE.
   *
   * All'ora blu il cielo e' piu' luminoso delle nuvole, non meno: la luce viene
   * dal basso dell'atmosfera e le nuvole la vedono di sotto. Quindi si SCURISCE
   * il cielo dove passano, non lo si schiarisce — che e' anche l'unico modo di
   * non far fiorire il bagliore su mezza volta.
   *
   * Il massimo che questa riga puo' fare e' togliere il diciotto per cento
   * («forza» per uno meno «scuro»), e ci mette dentro un filo dell'ambra dei
   * lampioni, perche' una nuvola bassa sopra una strada illuminata la
   * ripercuote — e' la stessa luce che fa la cupola arancione sopra le citta'.
   */
  scuro: 0.66,
  caldo: 0.20,
  forza: 0.55,
  /**
   * GLI ALBERI — una silhouette, non degli alberi.
   *
   * Costa zero disegni, zero byte e zero geometrie: e' un PROFILO in funzione
   * dell'azimut, disegnato dentro lo stesso ramo che disegna il cielo. E sta
   * dietro il colonnato senza che nessuno glielo dica, perche' quel ramo si
   * imbocca solo quando il raggio non ha colpito niente: se c'e' un pilastro di
   * mezzo, il pilastro ha gia' vinto.
   *
   * LA BASE STA ESATTAMENTE SULLA RIGA D'ORIZZONTE, e non e' un compromesso: e'
   * la cosa giusta. Da un occhio a un metro dal suolo, il terreno davanti agli
   * alberi converge alla riga d'orizzonte, e gli alberi sono la sola cosa che
   * ne sporge sopra. Disegnare la chioma sopra la riga e lasciare sotto il
   * manto velato e' letteralmente cio' che si vede da un parabrezza: pianura
   * chiara, bosco scuro, cielo.
   *
   * E NON E' UN PROFILO ATTORNO ALLA TESTA: E' UN FILARE LUNGO LA STRADA. La
   * prima versione disegnava un anello di rumore in funzione dell'azimut, ad
   * altezza angolare costante, e nel provino erano COLLINE. Il perche' — tutti
   * e quattro i motivi, che sono la definizione della differenza fra un rilievo
   * e un bosco — sta nella funzione «alberi» dentro lo shader.
   *
   * Adesso e' un piano verticale a 420 metri dalla mezzeria, uno per parte,
   * intersecato come si intersecano i pilastri. Da li' escono da sole la
   * prospettiva (il filare si stringe verso il punto di fuga invece di restare
   * alto uguale), la foschia alla distanza vera (che rende la silhouette PIATTA
   * di tono, perche' la distanza dipende solo da «d.z» e quindi e' la stessa su
   * tutta la colonna) e la PARALLASSE, che a un fondale dipinto manca sempre.
   */
  /** a quanti metri dalla mezzeria corre il filare. Da qui esce tutto il resto */
  lato: 420.0,
  /** la quota della chioma e di quanto ondeggia, in metri. Quasi piatta: un
   *  bordo che rulla e' un rilievo del terreno, non un bosco */
  alto: 10.0,
  chioma: 2.6,
  /** il passo delle chiome, in metri: sei metri sono una chioma vera, e sei
   *  divide 156 ventisei volte — quindi al ripiegamento il filare si ritrova */
  passoChioma: 6.0,
  chiome: 26.0,
  /** i cipressi: sei celle da 26 metri sul giro (26 divide 156 sei volte), e
   *  tre di quelle sei hanno il cipresso. Alto altri 4-7,5 metri sopra la
   *  chioma — una volta e mezzo la macchia, non il doppio: piu' alti di cosi'
   *  smettono di essere alberi e diventano lo skyline di una citta' lontana —
   *  e largo tre, che a quattrocento metri fanno un paio di pixel */
  passoCipresso: 26.0,
  /* TRENTA CELLE E NON SEI, perche' il giro e' passato da 156 a 780.
     Sei celle da 26 metri facevano esattamente 156: il motivo dei cipressi si
     ripeteva sul giro, ed era giusto cosi' finche' il giro era quello. Con 780
     resterebbe un motivo di sei celle ripetuto cinque volte dentro il film —
     cioe' la fila d'alberi tornerebbe uguale ogni 156 metri mentre tutto il
     resto ha nove secondi e mezzo di respiro.
     Trenta celle (780/26) danno una disposizione che non si ripete dentro il
     giro. La selezione resta la stessa — `fract(j*0,37 + 0,11)` sopra 0,55 —
     e su trenta celle produce una sequenza molto meno regolare che su sei:
     e' la stessa aritmetica che con piu' spazio smette di sembrare un motivo. */
  celle: 30.0,
  cipressoMeta: 1.5,
  cipressoBasso: 4.0,
  cipressoAlto: 7.5,
  /** il tetto della fascia, in seno d'elevazione: (10 + 2,6 + 7,5 - 1,02)/420.
   *  Sopra la cima del cipresso piu' alto non c'e' niente da cercare, e quel
   *  confronto secco tiene fuori dal conto tutti i pixel di cielo */
  tetto: 0.046,
}

const ANDATURA = {
  /**
   * NON SI FERMA MAI, e questa e' una scelta di regia.
   *
   * La tentazione e' legare i metri al secondo solo allo scorrimento: chi si
   * ferma, ferma la strada. E' sbagliato per una ragione fisica prima che
   * estetica — un'auto che inchioda nell'istante in cui si toglie il dito dal
   * trackpad non e' un'auto, e' un cursore. Sotto sta un'andatura di crociera
   * che regge da sola, e lo scorrimento ci si SOMMA sopra.
   */
  crociera: 17.0,
  /** 82 m/s sono 295 km/h: la punta di una supercar vera, non un numero tondo */
  punta: 82.0,
  /** il valore di `scorrimento.velocita` a cui la spinta vale il 63% */
  scala: 0.055,
  /**
   * ACCELERA IN FRETTA E RALLENTA PIANO, come un motore.
   *
   * Due costanti di tempo diverse invece di una: 0,55 s a salire, 1,6 s a
   * scendere. Ha due effetti che valgono entrambi. Il primo e' che la
   * partenza — dal beat `accensione`, dove l'andatura e' zero, al beat
   * `velocita` — diventa uno strappo vero invece di un cambio di stato. Il
   * secondo e' che quando si smette di scorrere la strada non si spegne: si
   * assesta, e chi guarda ha il tempo di accorgersi che stava guidando.
   */
  salita: 0.55,
  discesa: 1.6,
}

/**
 * COME SI COMPORTA, MISURATO (`strumenti/misuralastra.mjs`).
 *
 *   beat `accensione`, fermi          0 km/h — ferma, ma illuminata e visibile
 *   beat `velocita`, senza toccare   73-80 km/h — la crociera regge da sola
 *   picco durante una scrollata      245 km/h
 *   un secondo e mezzo dopo          185 km/h — scende, non si spegne
 *   metri in un secondo di crociera  27
 *
 * I 245 e non i 295 sono la risposta giusta e non un difetto: la punta la si
 * tocca solo con una scrollata piu' violenta di quella che una persona da'
 * davvero, e una manopola che arriva al fondo scala con un gesto normale non
 * ha piu' niente da dare dopo.
 *
 * E il picco va campionato DENTRO la pagina. Alla prima stesura lo strumento
 * leggeva l'andatura da fuori subito dopo la scrollata: rispondeva 94 km/h, e
 * la risposta sembrava fiacca. Non lo era — era il campione preso tardi,
 * quando la discesa da 1,6 secondi aveva gia' riportato tutto verso la
 * crociera. Un viaggio di andata e ritorno per campione perde sempre proprio
 * il picco, ed e' il tipo di misura che fa correggere la cosa sbagliata.
 */

/**
 * UN PIXEL SOLO, del valore medio della tessitura che sostituisce.
 *
 * `daLineare` dice che il valore in ingresso e' gia' in lineare e che lo
 * shader gli applichera' il suo `pow(2,2)`: quindi va RICODIFICATO prima di
 * scriverlo negli otto bit, se no il ripiego sarebbe piu' scuro di quattro
 * volte della tessitura vera e al momento del caricamento si vedrebbe uno
 * scalino di esposizione. Vale per il colore; le normali e la ruvidita' sono
 * dati e non colori, e ci vanno dentro come sono.
 */
function unPixel(rgb: number[], daLineare: boolean) {
  const otto = (v: number) =>
    Math.round(255 * Math.min(1, Math.max(0, daLineare ? Math.pow(v, 1 / 2.2) : v)))
  const t = new DataTexture(new Uint8Array([otto(rgb[0]), otto(rgb[1]), otto(rgb[2]), 255]), 1, 1)
  t.needsUpdate = true
  return t
}

const VERT = /* glsl */ `
varying vec3 vMondo;
void main() {
  vec4 m = modelMatrix * vec4(position, 1.0);
  vMondo = m.xyz;
  gl_Position = projectionMatrix * viewMatrix * m;
}
`

/**
 * Lo shader. I numeri veri arrivano da `STRADA` per sostituzione, cosi' il
 * sorgente GLSL non ne contiene nessuno che non sia commentato di sopra.
 */
/**
 * IL FATTORE CHE RIPORTA A UNO IL LAVAGGIO DEL PILASTRO A MEZZ'ALTEZZA.
 *
 * Sta qui e non dentro lo shader perche' e' una divisione fatta una volta
 * sola, e perche' scritta cosi' si vede che e' DERIVATA dalle misure — se un
 * giorno il palo si alza o i pilastri si allontanano, il numero segue da solo
 * invece di restare indietro come una costante scritta a mano.
 */
function lavaggio(s: typeof STRADA) {
  const lato = s.pila.lato - s.palo.lato
  const dv = s.palo.altezza - s.pila.altezza * 0.5
  const d2 = lato * lato + dv * dv
  return 1 / ((lato / (d2 * Math.sqrt(d2))) || 1)
}

function frammento(s: typeof STRADA, a: typeof ASF) {
  const n = (v: number) => v.toFixed(4)
  /** l'usura, con un nome corto: dentro il modello di stringa si legge meglio */
  const u = USURA
  /** il colonnato e il fondo del mondo, stessa ragione */
  const col = COLONNATO
  const fon = FONDO
  return /* glsl */ `
uniform vec2  uPendenza;      // coseno e seno dell'inclinazione del raggio
uniform float uAvanzamento;   // metri di strada gia' passati, ripiegati sul giro
uniform float uAndatura;      // metri al secondo: comanda la scia del tratteggio
uniform float uSpinta;        // 0..1, quanto si sta scorrendo
uniform vec3  uTinta;         // diagnostica: vedi Lastra.tingi()
uniform float uForzaTinta;
uniform float uLuce;          // 0..1: quanto e' illuminato il mondo la' fuori
uniform float uFinale;        // 0..1: la strada si chiude nella sua linea
uniform float uPolizia;       // 0..1: quanto e' vicina la pattuglia
uniform float uLampo;         // il lampeggiante, gia' calcolato: -1 blu, +1 rosso
uniform sampler2D uAsfCol;    // le tre fotografie del manto: vedi ASF
uniform sampler2D uAsfNor;
uniform sampler2D uAsfRgh;

varying vec3 vMondo;

// LE QUATTRO FASCE DEL CIELO SONO MISURATE SULLA FOTOGRAFIA DELLA CORTE.
//
// Non sono piu' quelle di «Cielo.ts»: quel cielo, appena la fotografia a 360
// gradi si carica, viene spento («Esperienza.ts» riga 252). Il cielo che si
// vede prima di salire in macchina e' «public/hdri/corte_pano.webp», e questi
// sono i suoi valori, mediana per fascia, in lineare. L'elenco completo con
// le quote e' in testa al file.
//
// La cosa da sapere e' che sono un'ORA BLU e non un tramonto: il rosso non
// supera mai tre millesimi, e la saturazione CRESCE scendendo verso
// l'orizzonte invece di virare all'ambra. E' il contrario di quello che
// c'era, e la differenza si vede tutta sul manto, che quella fascia la
// specchia.
const vec3 ZENIT     = vec3(0.0116, 0.0409, 0.1046);  // 90-72 gradi, piatta
const vec3 ALTO      = vec3(0.0012, 0.0529, 0.3185);  // 54 gradi
const vec3 BASSO     = vec3(0.0273, 0.2664, 0.7084);  // 27 gradi, il cobalto
// SOTTO I 27 GRADI LA FOTOGRAFIA NON PUO' DIRE NIENTE: c'e' l'architettura
// della corte, non il cielo. Qui la strada e' aperta e quella fascia si vede
// eccome — e' anzi la piu' importante, perche' e' quella che il manto
// specchia. Si prolunga la tendenza (il cobalto continua a salire) e la si
// vela un poco, che e' quello che fa la foschia bassa: piu' chiara, meno
// satura, e con dentro il primo accenno del caldo dei lampioni.
const vec3 ORIZZONTE = vec3(0.0900, 0.2300, 0.5600);
// L'INQUINAMENTO LUMINOSO, che e' l'unico caldo rimasto nel cielo. Non e' il
// sole: il sole e' sotto l'orizzonte da un pezzo e nella fotografia non
// lascia traccia. E' la fila dei lampioni che rimanda in aria la propria
// ambra, e infatti segue l'asse della strada e non l'azimut del sole.
const vec3 SPORCO    = vec3(0.150, 0.072, 0.024);

// LA PIETRA HA L'ALBEDO DELLA PIETRA DELLA CORTE (0,181 / 0,178 / 0,167,
// dichiarato in Corte.ts): quasi neutra, perche' il calore glielo deve dare
// la luce. E' la differenza fra pietra ILLUMINATA di caldo e pietra DIPINTA
// di beige, e vale qui esattamente come vale li'.
const vec3 PIETRA  = vec3(0.181, 0.178, 0.167);
const vec3 ASFALTO = vec3(0.052, 0.053, 0.058);
// IL BOSCO ALL'ORIZZONTE NON E' VERDE, ED E' IL PUNTO.
//
// Di notte una massa di vegetazione a settecento metri non ha colore proprio:
// riceve solo il cielo, e il cielo qui e' cobalto. Quindi e' un blu quasi nero,
// non un verde scurito — dipingerla verde e' l'errore che fa sembrare una
// silhouette un adesivo. Il pizzico di rosso in piu' del canale verde e' quel
// tanto di ambra dei lampioni che le arriva da sotto.
const vec3 ALBERO  = vec3(0.014, 0.019, 0.038);
// la vernice stradale non e' bianca: e' consumata, e tira al caldo
const vec3 VERNICE = vec3(0.62, 0.60, 0.55);

// LE DUE LUCI SONO DI TEMPERATURA OPPOSTA, ED E' IL PUNTO.
// I pali sono l'ambra dell'architettura della corte (0xffc98d in lineare);
// i fari sono il bianco freddo di un LED. Corte.ts dice che senza il
// contrasto caldo-freddo nessuna pietra sembra costosa: qui quel contrasto
// e' l'unica cosa che separa il viale privato dall'illuminazione stradale.
const vec3 LUCE_PALO = vec3(1.00, 0.60, 0.28);
// E DA LONTANO SI SCALDA. Non e' un vezzo: un'ambra vista attraverso duecento
// metri d'aria perde il poco blu che le resta prima di perdere il rosso, ed e'
// per questo che in una fotografia notturna le luci in fondo alla strada sono
// sempre piu' rosse di quelle vicine. E' anche cio' che da' la PROFONDITA':
// due file di punti identici sono un disegno, due file che si scaldano
// allontanandosi sono uno spazio.
const vec3 LUCE_PALO_VIA = vec3(1.00, 0.42, 0.13);
const vec3 LUCE_FARO = vec3(0.95, 0.96, 1.00);
// IL RIEMPIMENTO CHE ARRIVA DAL CIELO, e adesso e' molto piu' forte perche' il
// cielo e' molto piu' forte.
//
// E' la media pesata delle fasce misurate sopra, cioe' quanto rimanda una
// superficie orizzontale che vede tutta la volta. Con l'ambra di prima valeva
// (0,055 0,070 0,115); con l'ora blu vale il triplo nel canale blu, e questo
// e' esattamente il motivo per cui i pilastri erano lingotti d'oro sospesi:
// non era la feritoia troppo accesa, era la pietra intorno che non riceveva
// da nessuno. Sotto un'ora blu una pietra a lato strada NON e' nera: e' blu.
const vec3 AMBIENTE  = vec3(0.022, 0.105, 0.300);

float alea(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

/**
 * IL RUMORE DI VALORE A DUE DIMENSIONI — quattro angoli e la stessa cubica.
 *
 * E' «onda» con una dimensione in piu' e nient'altro: gli stessi quattro
 * campioni presi agli angoli della cella, la stessa interpolazione di Hermite
 * («f*f*(3-2f)») che evita lo spigolo della derivata. Una lineare qui lascia le
 * DIAGONALI della griglia visibili — su una nuvola si leggono come pieghe
 * dritte a quarantacinque gradi, ed e' il modo piu' rapido di far sembrare un
 * cielo una texture.
 *
 * Non si ripiega su niente perche' non deve: le nuvole non sono legate
 * all'avanzamento, quindi il vincolo dei 156 metri qui non c'e'. E' l'unica
 * cosa periodica di questo file che puo' permetterselo, e vale la pena dirlo,
 * se no la prossima volta si cerca il bug che non c'e'.
 */
float rum2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  /* LA QUINTICA E NON LA CUBICA, E QUI LA DIFFERENZA SI E' VISTA.
     «onda» usa la cubica di Hermite e va benissimo: la sua derivata e' continua
     ai nodi, e quello basta a un'onda lenta che modula una ruvidita'. Qui no.
     Il valore di questo rumore passa dentro una smoothstep con soglia stretta,
     che ne AMPLIFICA le pendenze — e la cubica lascia discontinua la derivata
     SECONDA al confine fra due celle. Amplificata, quella diventa una banda di
     Mach: una riga dritta, orizzontale o verticale, dove il rumore cambia
     cella. Nel primo provino si vedeva un RETTANGOLO in cielo sopra il punto di
     fuga, con gli angoli a novanta gradi, e non era una nuvola.
     La quintica «6f^5 - 15f^4 + 10f^3» ha nulle anche le derivate seconde agli
     estremi. Costa due moltiplicazioni per componente e toglie il difetto alla
     radice invece di nasconderlo abbassando la soglia. */
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  /* I QUATTRO ANGOLI ESCONO DA UN PRODOTTO SCALARE SOLO, e questo e' l'unico
     posto del file dove l'aritmetica e' stata scritta per il costo.
     Chiamare «alea» quattro volte rifa' quattro volte lo stesso prodotto
     scalare, e i quattro angoli differiscono di uno in x o in y: dentro un
     prodotto scalare quello e' una SOMMA di costanti, non una moltiplicazione
     nuova. Cosi' quattro dot diventano un dot e tre addizioni, e il seno si
     chiede una volta sola su un vec4 invece di quattro volte su uno scalare.
     Costa la meta' e da' un rumore con le stesse identiche proprieta' — non
     gli stessi identici valori, perche' sommare la costante fuori dal dot non
     e' bit per bit come sommarla dentro, ma un hash non deve essere un numero
     particolare: deve essere sempre lo stesso numero, e lo e'.
     Vale la pena averlo fatto: questa funzione gira due volte per ogni pixel
     di cielo, e il cielo e' meta' schermo. */
  float b = dot(i, vec2(127.1, 311.7));
  vec4 h = fract(sin(vec4(b, b + 127.1, b + 311.7, b + 438.8)) * 43758.5453123);
  return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
}

/**
 * UN'ONDA LENTA LUNGO LA STRADA, che al ripiegamento non salta.
 *
 * E' un rumore di valore a una dimensione: un numero per ogni tratto lungo
 * «passo», interpolato dolcemente sui vicini. Il vincolo che lo rende diverso
 * da un rumore qualunque e' «quanti»: gli indici si ripiegano su un numero
 * finito di valori, e quel numero e' scelto perche' «passo * quanti» faccia
 * esattamente i 156 metri del giro. Cosi' quando «uAvanzamento» torna a zero
 * l'onda si ritrova identica a se stessa e non c'e' nessuno scatto.
 *
 * L'interpolazione e' la cubica di Hermite e non una lineare: una lineare
 * lascia uno SPIGOLO della derivata a ogni nodo, e su una superficie che
 * riflette lo spigolo di una derivata si vede come una riga.
 */
float onda(float x, float passo, float quanti, float seme) {
  float w = x / passo;
  float i = floor(w);
  float k = fract(w);
  return mix(alea(vec2(mod(i, quanti), seme)),
             alea(vec2(mod(i + 1.0, quanti), seme)),
             k * k * (3.0 - 2.0 * k));
}

/**
 * LA FASCIA DI NUVOLE BASSE — quanto ne copre, da 0 a 1.
 *
 * Il ragionamento completo sta in «FONDO», qui sopra. In due righe: e' un
 * PIANO a quota fissa, quindi la coordinata e' la direzione divisa per il seno
 * dell'elevazione, ed e' quella divisione a dare la prospettiva. La fascia si
 * apre sopra la riga d'orizzonte e non sulla riga, se no rimette lo scalino che
 * e' costato un giro intero a togliere.
 *
 * IL PRIMO CONTO E' LA FASCIA E NON IL RUMORE, e non e' pigrizia: sopra i
 * ventisette gradi e sotto il mezzo grado non c'e' niente da disegnare, e li'
 * dentro ci sta piu' di meta' dei pixel del cielo. Uscire prima costa un
 * confronto e risparmia otto seni.
 */
float nuvole(vec3 d) {
  // il confronto secco viene PRIMA delle due smoothstep, e non e' pignoleria:
  // questo piano copre da 43 gradi sotto a 50 sopra, quindi la maggior parte
  // dei suoi pixel sta fuori dalla fascia e non deve pagare nemmeno il costo di
  // scoprirlo con una curva
  if (d.y <= ${n(fon.attaccoDa)} || d.y >= ${n(fon.fine)}) return 0.0;
  float banda = smoothstep(${n(fon.attaccoDa)}, ${n(fon.attacco)}, d.y)
              * (1.0 - smoothstep(${n(fon.fineDa)}, ${n(fon.fine)}, d.y));
  if (banda <= 0.002) return 0.0;
  /* IL DENOMINATORE HA UN FONDO MORBIDO E NON UN TAPPO, e la prima versione
     aveva il tappo.
     Con «max(d.y, 0,06)» sotto quella quota la coordinata SMETTE di dipendere
     dall'altezza: il rumore diventa lo stesso per tutta una fascia di schermo,
     cioe' delle strisce verticali con i bordi dritti, ed e' proprio la fascia
     dove le nuvole si stanno accendendo. Sommato allo spigolo della derivata
     seconda della cubica, e' quello che disegnava il rettangolo.
     «d.y + 0,05» fa lo stesso mestiere — impedisce alla divisione di esplodere
     all'orizzonte, dove il rumore diventerebbe piu' fitto del pixel — ma senza
     nessun ginocchio: e' monotona e derivabile ovunque, quindi la coordinata
     continua a scorrere con l'altezza per tutta la fascia. Il fattore va da
     1,8 in cima a 14,5 in basso, che e' l'intervallo che serviva. */
  vec2 p = d.xz * (${n(fon.scala)} / (d.y + ${n(fon.quota)}));
  // due ottave e non una: con una sola il ponte e' fatto di bolle tutte della
  // stessa misura, che e' il modo in cui si riconosce un rumore a occhio nudo.
  // La seconda vale poco piu' di un terzo — serve a sfrangiare i bordi, non a
  // portare disegno — e lo scarto di 31 la scollega dalla prima, se no le due
  // creste cadono nello stesso posto e si sommano in un motivo a scacchi.
  float n = rum2(p) * 0.62 + rum2(p * 2.4 + 31.0) * 0.38;
  return smoothstep(${n(fon.soglia)}, ${n(fon.sogliaA)}, n) * banda;
}

/**
 * COPERTURA, NON MASCHERA — ed e' la funzione piu' importante dello shader.
 *
 * Uno smoothstep su una striscia larga 15 cm funziona a dieci metri e si
 * distrugge a cento: li' la striscia e' piu' stretta di un pixel, quindi
 * compare e sparisce a seconda di dove cade il centro del pixel. E' lo
 * sfarfallio — ed e' proprio il difetto che si vede nel filmato sostituito,
 * dove all'orizzonte il tratteggio diventa un pettine rotto.
 *
 * Questa restituisce invece la FRAZIONE del pixel coperta dalla striscia. Se
 * la striscia e' larga un decimo di pixel, restituisce un decimo: la riga si
 * spegne per gradi, e non lampeggia mai. La larghezza del pixel arriva da
 * fwidth, cioe' dalla derivata vera — non da una stima della distanza, che
 * sarebbe da rifare a ogni campo visivo.
 */
/**
 * ...E LA PRIMA VERSIONE NON CONSERVAVA L'ENERGIA. E' un difetto vero, ed e'
 * meta' della ragione per cui i pilastri sembravano lingotti d'oro.
 *
 * Era «clamp((meta - |x|)/pixel + 0.5, 0, 1)». Finche' la striscia e' piu'
 * larga del pixel funziona. Quando diventa molto piu' STRETTA — e la feritoia
 * dei pilastri e' larga 15 cm, contro un pixel che a cento metri ne copre
 * settanta — quella formula al centro della striscia restituisce
 * 0,15/0,70 + 0,5 = 0,71, mentre la risposta giusta e' 0,15/0,70 = 0,21. Cioe'
 * il tre e mezzo per cento del fotogramma che la striscia occupa davvero
 * veniva disegnato al settanta per cento di luminosita', e la feritoia in
 * fondo alla strada restava accesa come quella a dieci metri. Da qui la fila
 * di bastoncini d'oro tutti uguali fino all'orizzonte.
 *
 * Questa e' la sovrapposizione ESATTA fra il segmento [-meta, +meta] e un
 * pixel di larghezza «pixel» centrato in «x», divisa per il pixel. Costa un
 * min e un max invece di una somma, coincide con la vecchia formula quando la
 * striscia e' larga, e tende a «2*meta/pixel» quando e' stretta — cioe' la
 * riga si spegne per gradi fino a sparire davvero, invece di assestarsi a
 * meta' strada.
 *
 * Vale anche per la scia: allargare «pixel» fino ai metri percorsi durante il
 * tempo di posa da' una sfocatura di movimento che conserva la luce, che e'
 * l'unico modo perche' una striscia che si allunga di cinque volte non
 * diventi anche cinque volte piu' luminosa.
 */
float coperta(float x, float meta, float pixel) {
  float w = max(pixel, 1e-5);
  return clamp((min(x + w * 0.5, meta) - max(x - w * 0.5, -meta)) / w, 0.0, 1.0);
}

/**
 * IL FILARE ALL'ORIZZONTE — restituisce (quanto del pixel e' bosco, quanto e'
 * lontano). Il secondo numero serve alla foschia e non e' un di piu': e' la
 * meta' del lavoro.
 *
 * =====================================================================
 * LA PRIMA VERSIONE ERANO COLLINE, E LE RAGIONI ERANO QUATTRO
 * =====================================================================
 *
 * Era un profilo in funzione dell'AZIMUT: un anello di rumore attorno alla
 * testa, due-tre ottave, altezza angolare costante. Nel provino non era un
 * bosco, era una CATENA DI COLLINE — e il committente l'ha visto prima che lo
 * dicessi io. I quattro motivi, che vale la pena scrivere perche' sono la
 * differenza fra le due cose:
 *
 * 1. LA QUOTA RULLAVA. Un rilievo del terreno sale e scende su scale lunghe e
 *    non ha un'altezza propria; un bosco cresce fino alla chioma e li' si
 *    ferma. Il bordo di un bosco e' RUMOROSO MA IN PIANO. E' il segnale piu'
 *    forte dei quattro: se il profilo ondeggia molto, sono colline qualunque
 *    cosa ci si metta sopra. Adesso la quota e' 9,5 metri con un piu' o meno
 *    1,8 — cioe' quasi piatta — e tutto il resto e' dente.
 *
 * 2. LA FREQUENZA ERA TROPPO BASSA. L'ottava che comandava era lunga sei gradi,
 *    cioe' centinaia di metri di bosco: quella e' la scala di una collina. Le
 *    chiome vere sono larghe sei metri, e adesso il passo e' sei metri.
 *
 * 3. IL BORDO ERA DERIVABILE. «onda» interpola con la cubica di Hermite, che e'
 *    liscia agli spigoli per costruzione — ed e' esattamente cio' che serve a
 *    un'onda di usura sull'asfalto e cio' che NON serve qui. Una cresta di
 *    collina e' derivabile, una chioma no. Qui l'interpolazione e' LINEARE, che
 *    lascia un angolo a ogni nodo: e' il difetto della lineare, ed e' l'unico
 *    posto del file dove quel difetto e' la risposta giusta.
 *
 * 4. NON C'ERANO CIPRESSI. In un paesaggio italiano il segno inequivocabile di
 *    vegetazione non e' la massa: sono le poche VERTICALI sottili e piu' alte
 *    che rompono una chioma in piano. Ne bastano tre sul giro. Nessuno scambia
 *    per una collina un profilo piatto con sopra tre stecchi.
 *
 * =====================================================================
 * E ADESSO IL FILARE E' UNA GEOMETRIA, NON UN DISEGNO SUL FONDO
 * =====================================================================
 *
 * E' un piano verticale a 420 metri dalla mezzeria, uno per parte — cioe' un
 * filare che corre lungo la strada, che e' come sta la vegetazione lungo una
 * strada vera. Da quel piano esce tutto il resto con la stessa aritmetica che
 * questo file usa per i pilastri: il raggio lo incontra a «t = 420/|d.z|», e in
 * quel punto la strada e' a «s = d.x*t + uAvanzamento» metri.
 *
 * Costa quanto costava e in cambio da' tre cose che il disegno sul fondo non
 * poteva avere:
 *
 *   LA PROSPETTIVA VERA. L'altezza angolare e' «(H - occhio)*|d.z|/420»: il
 *   filare e' alto ai lati e si stringe fino a chiudersi nel punto di fuga,
 *   come fanno i due bordi della carreggiata. Un'altezza angolare costante e'
 *   una fascia dipinta, e si vede che lo e'.
 *
 *   LA FOSCHIA GIUSTA, E QUINDI IL TONO PIATTO. La distanza esce dal conto, non
 *   da una costante: il bosco vicino ai lati e' scuro e quello verso il fondo
 *   si scioglie da solo. E siccome «t» dipende solo da «d.z», la velatura e'
 *   la STESSA su tutta la colonna verticale della silhouette — cioe' dentro la
 *   sagoma non c'e' nessun gradiente. Una silhouette con un gradiente dentro
 *   torna a leggersi come un rilievo illuminato, cioe' come una collina.
 *
 *   LA PARALLASSE. «s» contiene «uAvanzamento», quindi il filare SFILA — piano,
 *   com'e' giusto a quattrocento metri, ma non e' fermo. Un fondo perfettamente
 *   immobile mentre tutto il resto corre e' il segno piu' riconoscibile di un
 *   fondale dipinto.
 *
 * E LA PARALLASSE NON SALTA AL RIPIEGAMENTO, che era il rischio vero. Tutti i
 * passi dividono 156: le chiome ogni 6 metri (ventisei volte), i cipressi ogni
 * 26 (sei volte). Quando «uAvanzamento» torna a zero, «s» cala di 156 e ogni
 * indice cala di un numero intero di celle: il filare si ritrova identico.
 *
 * LA BASE STA SULLA RIGA D'ORIZZONTE, con un errore che si puo' dichiarare. Il
 * piede di un albero a settecento metri sta un millesimo e mezzo di radiante
 * sotto la riga — un pixel e mezzo — e qui il bosco comincia a zero esatto. Si
 * sbaglia dalla parte giusta: cosi' non si lascia mai una frangia scura SOTTO
 * la riga, dove il manto velato ci sbatterebbe contro con uno scalino.
 */
vec2 alberi(vec3 d, float pix) {
  float dz = abs(d.z);
  // sopra la cima del cipresso piu' alto non c'e' niente da cercare, e sotto
  // la riga d'orizzonte nemmeno. Il tetto e' «(10 + 2,6 + 7,5 - 1,02)/420».
  if (d.y <= 0.0 || d.y >= ${n(fon.tetto)} || d.x <= 0.0 || dz < 1e-3) return vec2(0.0);
  float t = ${n(fon.lato)} / dz;
  // oltre i quattro chilometri la foschia ne lascia passare l'uno per cento:
  // il taglio non toglie un'immagine, toglie il pezzo di conto in cui «s»
  // diventa un numero troppo grande per avere ancora dei decimetri dentro
  if (t > 4000.0) return vec2(0.0);
  // il filare di destra e quello di sinistra sono lo STESSO conto, quindi
  // senza questo scarto sarebbero l'uno lo specchio dell'altro — e due boschi
  // simmetrici attorno a una strada non li ha mai visti nessuno. 63 non e'
  // multiplo ne' di 6 ne' di 26, cosi' scollega tutti e due i motivi, e
  // sommare una costante non tocca il ripiegamento sui 156 metri.
  float s = d.x * t + uAvanzamento + step(d.z, 0.0) * 63.0;

  // QUANTI METRI DI FILARE STANNO DENTRO UN PIXEL. Serve due volte, e senza di
  // lui il bosco lontano formicola invece di spegnersi: verso il punto di fuga
  // «s» corre di decine di metri per pixel, cioe' molte chiome dentro lo stesso
  // pixel. E' la derivata di «s», con tutti e due i termini — quello di «d.z»,
  // che comanda, e quello di «d.x».
  float ds = max(t * pix * (d.x / dz + 1.0), 1e-3);
  // e il DENTE si spegne quando una chioma scende sotto i due pixel. Non e'
  // una resa: sotto quella soglia il dente non e' piu' un profilo, e' rumore
  // che si muove. Quello che resta e' la quota piatta, che a quella distanza
  // e' comunque quasi tutta foschia.
  float dente = clamp(${n(fon.passoChioma)} / (ds * 2.0), 0.0, 1.0);

  // LE CHIOME — quota quasi costante, passo corto, interpolazione LINEARE.
  // La lineare lascia un ANGOLO a ogni nodo, e qui l'angolo e' il punto: un
  // profilo derivabile e' terra, un profilo con gli spigoli e' vegetazione.
  float w = s * ${n(1 / fon.passoChioma)};
  float i = floor(w);
  float a0 = alea(vec2(mod(i, ${n(fon.chiome)}), 31.0));
  float a1 = alea(vec2(mod(i + 1.0, ${n(fon.chiome)}), 31.0));
  float H = ${n(fon.alto)} + (mix(a0, a1, w - i) - 0.5) * ${n(fon.chioma * 2.0)} * dente;

  // I CIPRESSI — tre sul giro, e non li sceglie un rumore.
  //
  // Vale la stessa ragione dei tagli spenti nei pilastri: quante ne devono
  // essere e' una cosa che si CONTA, e un hash che dipende dalla precisione di
  // un seno non si conta. «fract(j*0,37 + 0,11)» sulle sei celle da 26 metri
  // da' 0,11 0,48 0,85 0,22 0,59 0,96, e sopra 0,55 ne restano TRE: le celle
  // 2, 4 e 5. Le loro distanze non sono uguali — 52, 26 e 78 metri — e il
  // posto dentro la cella cambia con la cella, quindi non battono un tempo.
  //
  // La larghezza si sfuma con «coperta», che e' la stessa funzione che tiene
  // ferme le strisce della segnaletica: un cipresso e' largo tre metri, cioe'
  // due pixel a quattrocento metri, e senza quella sfumatura sarebbe un filo
  // che compare e sparisce a ogni vibrazione della camera.
  float j = mod(floor(s * ${n(1 / fon.passoCipresso)}), ${n(fon.celle)});
  float e = fract(j * 0.37 + 0.11);
  if (e > 0.55) {
    float dove = fract(j * 0.618 + 0.29) * 20.0 + 3.0;
    float su = ${n(fon.cipressoBasso)} + fract(j * 0.847 + 0.05) * ${n(fon.cipressoAlto - fon.cipressoBasso)};
    H += su * coperta(mod(s, ${n(fon.passoCipresso)}) - dove, ${n(fon.cipressoMeta)}, ds);
  }

  // l'altezza angolare della cima sopra la riga d'orizzonte, e il bordo si
  // sfuma col pixel: un gradino netto su una silhouette di quindici pixel,
  // dentro un'inquadratura che vibra, non sta fermo — si arrampica, e una
  // scaletta che cammina lungo l'orizzonte si vede piu' della silhouette
  float cima = (H - ${n(s.occhio)}) * dz * ${n(1 / fon.lato)};
  return vec2(clamp((cima - d.y) / max(pix, 1e-5) + 0.5, 0.0, 1.0), t);
}

/**
 * IL CIELO — quattro campioni misurati sulla fotografia, interpolati.
 *
 * Le quote sono in SENO dell'elevazione e non in gradi, perche' e' il seno
 * quello che si ha in mano: «d.y» di un raggio normalizzato E' il seno
 * dell'elevazione, gratis. sin(27 gradi) = 0,454 e sin(54 gradi) = 0,809, e
 * quelle due soglie sono gli unici numeri magici qui dentro.
 *
 * L'interpolazione e' liscia a ogni giunto (smoothstep e non mix lineare):
 * un giunto con la derivata che salta si vede come una riga orizzontale
 * chiarissima in mezzo al cielo, ed e' un difetto che si nota solo dopo, in
 * un fotogramma fermo.
 *
 * NIENTE AZIMUT SULLE FASCE. La fotografia le ha piatte — la mediana e il
 * novantesimo percentile coincidono alla quarta cifra per tutta la calotta —
 * cioe' e' un cielo uniforme a 360 gradi. Metterci una variazione che li' non
 * c'e' vorrebbe dire far divergere di nuovo i due cieli.
 */
vec3 cielo(vec3 d) {
  float h = d.y;
  vec3 c = mix(ORIZZONTE, BASSO, smoothstep(0.0, 0.454, h));
  c = mix(c, ALTO,  smoothstep(0.454, 0.809, h));
  c = mix(c, ZENIT, smoothstep(0.809, 1.000, h));

  // L'INQUINAMENTO LUMINOSO DELLA STRADA.
  //
  // Sta appiccicato all'orizzonte — si spegne entro i nove gradi e mezzo,
  // perche' oltre l'aria e' troppo rarefatta per rimandare indietro qualcosa —
  // ed e' molto piu' forte AVANTI e INDIETRO che di traverso: le lampade sono
  // in fila lungo la strada, quindi la colonna d'aria illuminata e' lunga
  // nella direzione della strada e corta nell'altra. La terza potenza e'
  // quanto serve perche' resti un alone sopra il punto di fuga invece di
  // diventare una fascia tutt'intorno.
  float sopra = pow(clamp(1.0 - abs(h) * 6.0, 0.0, 1.0), 2.0);
  vec2 az = d.xz;
  float lungo = (length(az) > 1e-4) ? abs(normalize(az).x) : 1.0;
  c += SPORCO * sopra * (0.22 + 0.78 * pow(lungo, 3.0));

  return max(c, 0.0);
}

/**
 * IL CIELO CHE SI GUARDA DAVVERO — gradiente, nuvole, bosco.
 *
 * E' SEPARATO DA «cielo» PER UNA RAGIONE DI COSTO, e la separazione dice anche
 * qualcosa di vero. «cielo» ha tre chiamanti, e SOLO UNO dei tre guarda il
 * cielo: il ramo del fondo. Gli altri due sono «aria» (il colore dell'aria
 * all'orizzonte, con cui sfuma tutto il terreno) e il RIFLESSO sul manto, e
 * nessuno dei due vuole nuvole ne' alberi:
 *
 *   - «aria» si prende ESATTAMENTE all'orizzonte, dove per costruzione le
 *     nuvole valgono zero e il bosco non c'e' ancora. Chiamare la versione
 *     completa la' dentro costerebbe otto seni per restituire lo stesso numero.
 *
 *   - il riflesso e' schiacciato a 0,35 verso l'orizzonte e pesato da Fresnel:
 *     cio' che il manto specchia della fascia delle nuvole e' una striscia alta
 *     un paio di gradi, con dentro un contrasto del diciotto per cento gia'
 *     ridotto a un terzo dalla ruvidita'. E' sotto il valore di un bit su otto.
 *     Rinunciarci e' una scelta dichiarata, non una svista: il giorno in cui la
 *     strada dovesse diventare bagnata sul serio — «lucido» vicino a uno — la
 *     riga da cambiare e' una sola, ed e' quella del riflesso.
 */
vec3 cieloVisto(vec3 d, float pix) {
  vec3 c = cielo(d);

  // le nuvole SCURISCONO, non schiariscono: all'ora blu la sorgente e' il cielo
  // e la nuvola la vede di sotto. Con dentro un filo dell'ambra dei lampioni,
  // che e' la cupola arancione che ogni strada illuminata stampa sul proprio
  // ponte di nuvole.
  c = mix(c, c * ${n(fon.scuro)} + SPORCO * ${n(fon.caldo)}, nuvole(d) * ${n(fon.forza)});

  // E IL BOSCO VA DOPO LE NUVOLE, perche' sta davanti: e' a quattrocento metri,
  // loro sono in cielo. Mescolare nell'ordine sbagliato metterebbe una nuvola
  // davanti a un albero, che e' il genere di cosa che non si sa spiegare ma si
  // vede.
  //
  // E IL BOSCO SI VELA CON LA SUA DISTANZA, NON CON UNA COSTANTE, e non e' un
  // dettaglio: e' cio' che gli toglie il gradiente dentro.
  //
  // Mescolare direttamente verso «c» — il cielo alla quota del pixel — voleva
  // dire portarsi dentro la sagoma la variazione verticale del cielo, e
  // soprattutto quella dell'inquinamento luminoso, che sotto i nove gradi cala
  // in fretta. Ne usciva una silhouette piu' chiara in basso e piu' scura in
  // cima: cioe' una cosa ILLUMINATA DA SOTTO, che e' precisamente come si legge
  // un rilievo del terreno e non come si legge un controluce.
  //
  // Il bersaglio giusto e' il colore dell'aria all'ORIZZONTE in quella
  // direzione — lo stesso «aria» con cui sfuma tutto il terreno — e la foschia
  // e' quella vera, dalla distanza che il filare si e' appena calcolato. Cosi'
  // il tono e' piatto sulla colonna e cambia solo di traverso, dove cambia
  // davvero la distanza. Costa un «cielo» in piu', ma solo sui pixel di bosco,
  // che sono una striscia alta una cinquantina.
  vec2 alb = alberi(d, pix);
  if (alb.x > 0.0) {
    vec3 ariaOr = cielo(normalize(vec3(d.x, 0.0, d.z)));
    vec3 bosco = mix(ALBERO, ariaOr, 1.0 - exp(-alb.y / 900.0));
    c = mix(c, bosco, alb.x);
  }

  return c;
}

/**
 * IL FASCIO ANABBAGLIANTE, come illuminamento sul manto.
 *
 * Comincia a tre metri perche' prima c'e' il cofano, culmina intorno ai
 * quindici e si esaurisce entro la sessantina: sono le misure di un
 * anabbagliante vero, e sono anche quelle che tengono la pozza DENTRO
 * l'apertura del parabrezza invece di sprecarla sotto la plancia.
 */
float faro(float avanti, float u) {
  float acceso = smoothstep(2.5, 7.5, avanti) * exp(-avanti / 24.0);
  // il fascio si apre andando avanti: e' un cono, non un tubo
  float largo = 0.55 + avanti * 0.085;
  float a = exp(-pow((u - ${n(s.faro.centro - s.faro.semipasso)}) / largo, 2.0));
  float b = exp(-pow((u - ${n(s.faro.centro + s.faro.semipasso)}) / largo, 2.0));
  // piu' un riempimento largo e debole: la luce che il parabrezza e il manto
  // rimandano in giro. Senza, i due fasci sembrano due torce in mezzo al nero
  float sparso = exp(-avanti / 46.0) * exp(-pow((u - ${n(s.faro.centro)}) / 5.5, 2.0)) * 0.26;
  return acceso * (a + b) * 2.60 + sparso;
}

/** la pozza che ogni palo lascia a terra: caduta col quadrato, con un fondo
 *  che evita l'infinito esattamente sotto la lampada */
float pozzaPali(float s, float u) {
  /* Il «mod» di prima e' diventato un «fract» sullo stesso conto, perche'
     adesso serve anche l'INDICE del palo e non solo la distanza da esso. La
     posizione dentro il passo e la geometria della pozza non cambiano di un
     millesimo: «f» vale esattamente quello che valeva. */
  float w = (s + ${n(s.palo.passo * 0.5)}) * ${n(1 / s.palo.passo)};
  float k = fract(w);
  float f = (k - 0.5) * ${n(s.palo.passo)};
  float q = f * f;
  float a = q + pow(u - ${n(s.palo.lato)}, 2.0);
  float b = q + pow(u + ${n(s.palo.lato)}, 2.0);

  /* L'ETA' DELLA LAMPADA, E COME SI ATTRAVERSA IL CONFINE FRA DUE PALI.
     Il valore va preso a meta' strada fra i due, se no si vede una RIGA
     dritta attraverso tutta la carreggiata nel punto in cui l'indice scatta —
     e' poco luminosa, ma e' dritta, e le righe dritte si vedono sempre.
     A «k = 0,5» si sta esattamente sotto il palo e il valore e' il suo; ai due
     estremi si e' a meta' strada e vale mezzo e mezzo, che e' lo stesso numero
     visto dal periodo prima. Continuo per costruzione. */
  float n6 = mod(floor(w), ${n(USURA.chiazza.quanteA + 2.0)});
  float g0 = alea(vec2(n6, 5.0));
  float gm = alea(vec2(mod(n6 - 1.0, ${n(USURA.chiazza.quanteA + 2.0)}), 5.0));
  float gp = alea(vec2(mod(n6 + 1.0, ${n(USURA.chiazza.quanteA + 2.0)}), 5.0));
  float wl = max(0.0, 0.5 - k);
  float wh = max(0.0, k - 0.5);
  float eta = 1.0 + ${n(USURA.lampade.indice)} * ((g0 * (1.0 - wl - wh) + gm * wl + gp * wh) - 0.5) * 2.0;

  return 12.0 * eta * (${n(USURA.lampade.destra)} / (9.0 + a) + ${n(USURA.lampade.sinistra)} / (9.0 + b));
}

/**
 * LE MISURE DI QUESTO PILASTRO — quattro numeri da un indice solo.
 *
 *   x  di quanto si sposta il centro dentro la cella, in metri
 *   y  il fattore verticale: moltiplica l'altezza E le quote del taglio
 *   z  il fattore orizzontale: moltiplica la larghezza E quella della feritoia
 *   w  quanto e' viva la lampada, da 0 (fulminata) a 1
 *
 * IL RAGIONAMENTO STA IN «COLONNATO», qui non si ripete. Quello che va detto
 * qui e' il COSTO, perche' questa funzione gira per ogni pixel che tocca il
 * piano dei pilastri: un seno solo. Le tre variazioni geometriche escono tutte
 * dallo stesso «alea» moltiplicato per numeri diversi prima del «fract» — che
 * e' il modo economico di scollegare tre valori da un'estrazione sola — mentre
 * la lampada fulminata NON passa di li', perche' quella si conta e un hash non
 * si conta. Vedi la tabella dei dodici valori in «COLONNATO».
 *
 * L'INDICE SI RIPIEGA SU DODICI E NON SU UN NUMERO QUALUNQUE: dodici celle da
 * tredici metri sono i 156 del giro, quindi quando «uAvanzamento» torna a zero
 * ogni pilastro ritrova le proprie misure. Con undici o con tredici, al
 * ripiegamento la schiera intera cambierebbe forma in un fotogramma.
 */
vec4 misurePila(float sp) {
  // la divisione si scrive per esteso invece che come reciproco arrotondato a
  // quattro cifre: un reciproco troncato sposta il confine fra due indici di
  // qualche centimetro ogni centinaio di metri, e qui il confine non decide una
  // sfumatura — decide QUALE pilastro si sta guardando
  float i = mod(floor(sp / ${n(s.pila.passo)} + 0.5), ${n(col.quanti)});
  float g = alea(vec2(i, 7.0));
  float e = fract(i * ${n(col.passoGuasto)} + ${n(col.semeGuasto)});
  return vec4(
    (g - 0.5) * ${n(col.scarto * 2.0)},
    1.0 + (fract(g * 17.0) - 0.5) * ${n(col.altezza * 2.0)},
    1.0 + (fract(g * 53.0) - 0.5) * ${n(col.larghezza * 2.0)},
    smoothstep(${n(col.spento)}, ${n(col.vivo)}, e));
}

void main() {
  vec3 grezzo = normalize(vMondo - cameraPosition);

  // LA PENDENZA SI APPLICA AL RAGGIO, non alla camera — che non e' mia.
  // E' una rotazione attorno all'asse Z, perche' la strada corre lungo X e
  // l'alto e' Y: inclinare il muso vuol dire ruotare nel piano X-Y.
  vec3 d = normalize(vec3(
    grezzo.x * uPendenza.x + grezzo.y * uPendenza.y,
    -grezzo.x * uPendenza.y + grezzo.y * uPendenza.x,
    grezzo.z
  ));

  const float OCCHIO = ${n(s.occhio)};
  const float SCARTO = ${n(s.scarto)};

  // QUANTO VALE UN PIXEL, IN RADIANTI — preso qui, dove il raggio e' liscio
  // per tutti i pixel dello schermo.
  //
  // Serve piu' sotto per allargare la prova d'intersezione dei pilastri quel
  // tanto che basta a prendere anche i pixel coperti a meta'. Non si puo'
  // prendere li' dentro: una derivata dentro un ramo («fwidth» dopo un «if») e'
  // per specifica indefinita, perche' il pixel accanto puo' aver preso l'altra
  // strada — e in questo caso l'altra strada e' proprio «il pilastro non c'e'»,
  // cioe' il caso peggiore possibile.
  // «fwidth» somma le due derivate di schermo, quindi vale circa DUE pixel:
  // qui serve un pixel solo, perche' e' l'unita' in cui ragionano tutte le
  // formule di copertura di questo file. Si prende la media delle due.
  float pix = max(0.5 * (length(dFdx(d)) + length(dFdy(d))), 1e-6);
  // e quanti metri scorre la strada durante il tempo di posa. Serve tre volte
  // qui sotto: al bordo dei pilastri, alla grana dell'asfalto e al tratteggio.
  float corsa = uAndatura * ${n(s.posa)};

  // --- le tre intersezioni. Il manto e' un piano orizzontale sotto l'occhio,
  //     i muretti sono due piani verticali: tre divisioni in tutto.
  float tManto = (d.y < -1e-4) ? (OCCHIO / -d.y) : 1e9;

  // I PILASTRI SONO UN PIANO CON UN VUOTO OGNI TREDICI METRI.
  //
  // Non sono scatole: sarebbe una prova di slab per ogni pilastro, cioe' un
  // giro lungo dentro cui il raggio, a incidenza radente, resta per centinaia
  // di metri. Sono la FACCIA rivolta alla strada, e la faccia esiste solo
  // dove passa un pilastro. Dal posto di guida quella e' l'unica faccia che
  // si vede davvero — e cio' che l'occhio legge di un colonnato in corsa non
  // e' lo spessore, e' il RITMO fra pieno e vuoto.
  // LA PROVA E' ALLARGATA DI UN PIXEL E MEZZO, E NON E' UN DETTAGLIO.
  //
  // Con la prova secca — «dentro o fuori» — la sagoma del pilastro cade su un
  // confine netto, e un confine netto in un'immagine che scorre non sta fermo:
  // si arrampica. In un fotogramma solo si vede una scaletta sul bordo; in
  // movimento la scaletta CAMMINA su e giu' lungo lo spigolo, ed e' il difetto
  // che a occhio si legge come «e' un videogioco» piu' di qualunque altro.
  //
  // Allargando la prova, i pixel a cavallo del bordo entrano nel ramo del
  // pilastro e li' si calcola quanto sono coperti DAVVERO. La larghezza in
  // piu' e' la meta' dell'impronta del pixel sul piano del pilastro —
  // «t * pixel / |d.z|», che e' l'impronta scorciata dall'incidenza — oppure i
  // metri percorsi durante la posa se sono di piu': in corsa e' la seconda a
  // vincere, e il bordo diventa una sfumatura larga mezzo metro.
  float tPila = 1e9;
  float fpPila = 0.0;
  // le misure del pilastro colpito: si portano fuori dal giro invece di
  // ricalcolarle nel ramo del disegno, che sarebbe un seno pagato due volte
  // per lo stesso pilastro
  vec4 misPila = vec4(0.0, 1.0, 1.0, 1.0);
  for (int i = 0; i < 2; i++) {
    float lato = (i == 0) ? 1.0 : -1.0;
    float pz = lato * ${n(s.pila.lato)} - SCARTO;
    float t = pz / d.z;
    if (t <= 0.05 || t >= 420.0 || t >= tPila) continue;
    // l'impronta del pixel sul piano: scorciata lungo la strada, piena in
    // verticale — un pixel si allunga solo nella direzione in cui il piano
    // scappa, e questo piano scappa lungo x
    float fpS = max(t * pix / max(abs(d.z), 0.02), corsa);
    float fpH = t * pix;
    float h = d.y * t + OCCHIO;              // quanto sopra il manto cade il colpo
    // PRIMA SI PROVA COL PILASTRO PIU' ALTO DEI DODICI, e solo dopo si chiede
    // QUALE pilastro e'. L'ordine conta: sopra la cimasa e sotto il piede ci
    // stanno la maggior parte dei pixel dello schermo, e quelli devono uscire
    // di qui prima di aver pagato un seno per sapere di che pilastro non fanno
    // parte. Il tappo e' l'altezza nominale piu' il sette per cento, cioe' il
    // massimo che «misurePila» possa restituire: una prova conservativa non
    // butta via niente che poi servisse.
    if (h <= -fpH || h >= ${n(s.pila.altezza * (1 + COLONNATO.altezza))} + fpH) continue;
    float sp = d.x * t + uAvanzamento;       // dove cade lungo la schiera
    vec4 mis = misurePila(sp);
    if (h >= ${n(s.pila.altezza)} * mis.y + fpH) continue;
    // IL CENTRO SI SPOSTA, IL CONFINE DELLA CELLA NO: si sottrae lo scarto
    // DOPO il «mod», cosi' il ripiegamento resta quello di sempre e a muoversi
    // e' solo il pilastro dentro la propria cella. Sottrarlo prima vorrebbe
    // dire spostare la cella, e le celle devono restare attaccate.
    float dentro = abs(mod(sp + ${n(s.pila.passo * 0.5)}, ${n(s.pila.passo)}) - ${n(s.pila.passo * 0.5)} - mis.x);
    if (dentro > ${n(s.pila.larghezza * 0.5)} * mis.z + fpS * 0.75) continue;
    tPila = t;
    fpPila = fpS;
    misPila = mis;
  }

  float t = min(tManto, tPila);
  vec3 colore;
  float lontananza;

  // IL COLORE DELL'ARIA in quella direzione: e' il cielo appena sopra
  // l'orizzonte, ed e' verso quello che tutto sfuma. Prendere il colore
  // dell'aria dalla direzione VERA invece che da una costante e' cio' che fa
  // sparire la riga dell'orizzonte: il manto piu' lontano diventa
  // ESATTAMENTE il cielo che gli sta sopra, quindi non c'e' nessun bordo.
  // ESATTAMENTE ALL'ORIZZONTE, non poco sopra. Con 0,02 il colore dell'aria
  // era l'88% dell'ambra invece del 100%, quindi il manto lontano finiva un
  // filo piu' scuro del cielo che lo tocca: un gradino sottile ma dritto, e
  // una riga dritta in mezzo a un fotogramma la si vede sempre.
  //
  // E ADESSO SI CALCOLA DENTRO IL RAMO DEL TERRENO, non piu' qui fuori.
  // «aria» serve a due cose e tutte e due stanno nel ramo del terreno: la
  // foschia in fondo e il pezzetto di manto dietro lo spigolo di un pilastro.
  // Sopra l'orizzonte non la guarda nessuno — li' il cielo si prende dalla
  // direzione vera — quindi calcolarla per tutti i pixel voleva dire pagare un
  // «cielo» intero su meta' schermo per buttarlo via. Non c'e' nessuna ragione
  // di derivate che la tenga fuori dai rami, al contrario dei tre prelievi qui
  // sotto: «cielo» non campiona nessuna tessitura e non usa nessun fwidth.

  // ============ LA MATERIA DEL MANTO SI PRELEVA QUI, FUORI DA OGNI RAMO ====
  //
  // I tre prelievi stanno prima di sapere se il pixel e' manto o pilastro, e
  // non e' pignoleria. Un «texture2D» senza livello esplicito sceglie la mip
  // dalla derivata, e la derivata la prende dal pixel accanto: dentro un ramo,
  // il pixel accanto puo' aver preso l'altra strada e avere coordinate che non
  // c'entrano niente. Ne esce una riga di un pixel, lungo la sagoma dei
  // pilastri, dove l'asfalto e' o vetroso o impastato. Fuori dal ramo la
  // derivata e' sempre quella vera.
  //
  // SI CAMPIONA IN COORDINATE DI STRADA, non in UV di schermo, ed e' la cosa
  // che conta di piu' di tutte: con le UV di schermo la grana resta incollata
  // all'obiettivo e scorre con la camera invece che col manto — una velina
  // davanti alla lente. Qui la coordinata e' (metri lungo la strada, metri di
  // lato), quindi il sasso sta fermo sull'asfalto dove sta.
  //
  // La distanza si tappa a 1200 metri per il solo prelievo: sopra l'orizzonte
  // «tManto» vale un miliardo, e un miliardo diviso un metro e mezzo non e'
  // piu' una coordinata che un float a 32 bit sappia scrivere. Tappandola le
  // derivate restano comunque enormi, la mip finisce al fondo della catena —
  // cioe' alla media della tessitura — che e' esattamente cio' che serve li'.
  float tTes = min(tManto, 1200.0);
  vec2 uvA = vec2(d.x * tTes + uAvanzamento, d.z * tTes + SCARTO) * ${n(1 / s.piastrella)};

  // LA SFOCATURA DI MOVIMENTO SULLA GRANA — tre prelievi lungo la strada.
  //
  // Non e' un effetto aggiunto: e' la stessa aritmetica che governa gia' la
  // scia del tratteggio, applicata alla materia. Tre campioni bastano perche'
  // cio' che si sta spalmando e' RUMORE, e la media di tre campioni di rumore
  // e' gia' indistinguibile dalla media vera. Con un soggetto strutturato ne
  // servirebbero dieci e con tre si vedrebbero i fantasmi.
  vec2 spalma = vec2(corsa * ${n(0.36 / s.piastrella)}, 0.0);
  vec3 asfCrudo = (
    texture2D(uAsfCol, uvA).rgb +
    texture2D(uAsfCol, uvA + spalma).rgb +
    texture2D(uAsfCol, uvA - spalma).rgb) * (1.0 / 3.0);
  vec3 asfPend = texture2D(uAsfNor, uvA).xyz * 2.0 - 1.0;
  float asfRuv = texture2D(uAsfRgh, uvA).r;

  // DOVE SI SMETTE DI CONSIDERARLO TERRENO E LO SI CHIAMA CIELO — 4500 metri,
  // e la prima volta ce n'erano 900. E' un difetto che c'era da prima e che il
  // cielo nuovo ha reso impossibile da non vedere.
  //
  // Il taglio e la portata della foschia erano lo STESSO numero, e non e' un
  // caso che coincidessero: erano nati insieme. Ma a 900 metri la foschia vale
  // 1 - e^-1 = 0,63, non 1: il pixel appena sotto la linea d'orizzonte veniva
  // disegnato come banchina velata al 63%, quello appena sopra come cielo
  // pieno, e fra i due restava uno SCALINO del trentasette per cento steso su
  // una riga perfettamente dritta attraverso tutto il parabrezza. Con l'ambra
  // di prima i due colori erano vicini e lo scalino passava; con il cobalto la
  // banchina e' scura e il cielo e' chiaro, e la riga e' diventata un
  // orizzonte marino.
  //
  // Il taglio adesso e' cinque costanti di foschia: a 4500 metri il velo vale
  // 1 - e^-5 = 0,9933, cioe' il terreno e' gia' diventato cielo per conto suo
  // e il salto e' sotto un valore su 255. La portata resta 900, che e' la
  // misura vera di una sera limpida e non va toccata per un difetto di soglia.
  if (t > 4500.0) {
    // QUI, E SOLO QUI, IL CIELO SI GUARDA. Le nuvole e la linea d'alberi
    // costano otto seni e un arcotangente, e li paga il ramo che disegna il
    // fondo — non «aria», che sta sull'orizzonte dove per costruzione le due
    // cose valgono zero, e non il riflesso. Il perche' per esteso e' nella
    // docstring di «cieloVisto».
    colore = cieloVisto(d, pix);
    lontananza = 1e9;
  } else {
    vec3 P = d * t;
    float avanti = P.x;
    float s = avanti + uAvanzamento;
    float u = P.z + SCARTO;
    lontananza = t;

    // il colore dell'aria all'orizzonte, nella direzione in cui si guarda: e'
    // il bersaglio della foschia e il fondo dietro gli spigoli dei pilastri.
    // Il ragionamento sul perche' sia ESATTAMENTE all'orizzonte e non poco
    // sopra sta qui fuori, appena prima dei prelievi.
    vec3 aria = cielo(normalize(vec3(d.x, 0.0, d.z)));

    // la larghezza di un pixel misurata nelle coordinate della strada: e'
    // questa a decidere quanto sfumare ogni bordo
    float du = max(fwidth(u), 1e-3);
    float ds = max(fwidth(s), 1e-3);

    float luceCalda = pozzaPali(s, u);

    if (t == tPila) {
      // --------------------------------------------------------- IL PILASTRO
      float h = d.y * t + OCCHIO;
      // LE DUE IMPRONTE DEL PIXEL SUL PIANO DEL PILASTRO, calcolate e non
      // derivate. Un «fwidth» qui dentro sarebbe indefinito — il pixel accanto
      // puo' essere fuori dal pilastro, dove «s» e «h» valgono tutt'altro — e
      // sullo spigolo, che e' esattamente dove servono, restituirebbe numeri
      // enormi. La formula e' quella di sempre: distanza per pixel, diviso il
      // coseno fra raggio e normale del piano nella direzione in cui il piano
      // scappa. Il piano dei pilastri scappa lungo la strada; in verticale il
      // pixel non si allunga, quindi li' vale «t * pix» e basta.
      float dh = max(t * pix, 1e-3);
      float dsp = max(fpPila, 1e-3);
      // LO STESSO SCARTO DELLA PROVA D'INTERSEZIONE, e deve essere lo stesso
      // numero: «misPila» arriva dal giro qui sopra proprio per questo. Se le
      // due formule divergessero di un centimetro, il disegno starebbe un
      // centimetro fuori dalla sagoma che gli e' stata ritagliata, e si
      // vedrebbe una riga di pietra spuria lungo uno dei due spigoli.
      float lungoPila = mod(s + ${n(s.pila.passo * 0.5)}, ${n(s.pila.passo)}) - ${n(s.pila.passo * 0.5)} - misPila.x;
      // il pilastro e' piu' alto o piu' basso di quello nominale, e con lui
      // sale o scende tutto quello che ci sta appeso: la cimasa, la sagoma, e
      // le due quote della gola di luce
      float altPila = ${n(s.pila.altezza)} * misPila.y;
      // LA SFOCATURA DI MOVIMENTO LUNGO LA STRADA, calcolata QUI e non piu'
      // sessanta righe piu' giu': adesso serve prima, per sfumare lo spigolo
      // fra le due facce. E' la stessa riga di sempre, solo spostata in su.
      float dspMosso = max(dsp, corsa);

      /* ======================= LE DUE FACCE =============================
       *
       * Il perche' sta per esteso su «STRADA.pila»: di un pilastro di cinta
       * visto da un'auto in corsa, quello che si vede DI PIU' non e' la faccia
       * che guarda la strada, e' la TESTATA che guarda noi. Prima ce n'era una
       * sola e occupava tutta la sagoma, ed e' questo che si legge come
       * parallelepipedo di colore unico.
       *
       * QUAL E' LA TESTATA CHE SI VEDE: quella dalla parte da cui si arriva,
       * cioe' verso «s» minore. Non e' una scelta, e' il conto della sagoma —
       * il corpo del pilastro sta PIU' LONTANO dalla strada della sua faccia, e
       * dal posto di guida i suoi due spigoli lontani si proiettano indietro,
       * verso di noi. La sagoma quindi si allarga dalla parte del vicino, e
       * dentro quella parte c'e' il fianco.
       *
       * LO SPIGOLO NON E' UNA RIGA NETTA: si sfuma con la stessa impronta con
       * cui si sfumano i bordi esterni («dspMosso»), se no in corsa lo spigolo
       * resta di rasoio mentre i due bordi accanto sono spalmati su mezzo
       * metro — e uno spigolo piu' netto del bordo del suo stesso oggetto e' il
       * genere di incoerenza che si vede senza saperla nominare. */
      float mezzaPila = ${n(s.pila.larghezza * 0.5)} * misPila.z;
      float apFaccia = ${n(s.pila.vera)} * abs(d.z);
      float apFianco = ${n(s.pila.profondita)} * abs(d.x);
      float frazFianco = min(apFianco / max(apFianco + apFaccia, 1e-4), ${n(col.tettoFianco)});
      float spigolo = mezzaPila * (2.0 * frazFianco - 1.0);
      float fianco = clamp((spigolo - lungoPila) / max(dspMosso, 1e-3) + 0.5, 0.0, 1.0);

      // i corsi di pietra: una fuga ogni 42 cm, come nel porticato
      float corso = 1.0 - 0.22 * coperta(mod(h + 0.21, 0.42) - 0.21, 0.012, dh);
      // le macchie dei conci si spengono con la distanza invece di brulicare:
      // a cento metri un concio e' meno di un pixel, e tenerlo acceso vuol
      // dire disegnare rumore.
      // IL SEME SALTA DI TRENTASETTE SUL FIANCO: due facce dello stesso
      // pilastro non hanno gli stessi conci nello stesso posto, e con lo stesso
      // seme la macchia attraversava lo spigolo senza accorgersene — cioe'
      // proprio la cosa che rivela che li' non c'e' nessuno spigolo.
      float macchia = mix(1.0, 0.90 + 0.16 * alea(floor(vec2(s * 1.2 + fianco * 37.0, h * 2.4))), exp(-t / 40.0));
      // LA FACCIA GUARDA LA STRADA, QUINDI DEL CIELO NE VEDE META'.
      //
      // Il fattore 0,45 e' rimasto quello che era, ma «AMBIENTE» no: adesso
      // vale il triplo nel blu, perche' il cielo misurato sulla fotografia
      // della corte e' un'ora blu e non un'ambra. E' TUTTA QUI la ragione dei
      // lingotti d'oro sospesi. Non era la feritoia troppo accesa — quella e'
      // giusta, e' una sorgente — era la pietra intorno che non riceveva luce
      // da nessuno e finiva a cinque millesimi. Un pilastro di cinta a bordo
      // strada sotto un'ora blu non e' nero: e' BLU, e a quel punto la
      // feritoia ambra ci si stacca sopra come un accento invece di
      // galleggiare nel vuoto.
      // LA LAMPADA STA A 5,40 E IL PILASTRO E' ALTO 2,90: la faccia riceve
      // MOLTO piu' luce in cima che al piede, e non di poco.
      //
      // Il palo e' 3,10 metri piu' in la' del pilastro. Dal piede alla cimasa
      // la distanza dalla lampada scende da 6,23 a 3,99 metri e il coseno
      // sulla faccia — che e' verticale — sale da 0,50 a 0,78: l'irradianza
      // cambia di quasi QUATTRO VOLTE. Senza questo termine il pilastro riceve
      // la stessa luce dal piede alla cima, cioe' non e' un volume, e' una
      // campitura in piedi. E' la terza ragione dei lingotti, dopo l'ambiente
      // troppo scuro e lo sbaffo troppo forte: un lingotto e' precisamente un
      // parallelepipedo di colore uniforme.
      //
      // Si normalizza a mezz'altezza, cosi' il termine ridistribuisce la luce
      // sul pilastro senza cambiarne la quantita' totale — la taratura di
      // «pozzaPali», che e' misurata, resta valida.
      float dv = ${n(s.palo.altezza)} - h;
      float d2 = ${n((s.pila.lato - s.palo.lato) ** 2)} + dv * dv;
      float lava = ${n(s.pila.lato - s.palo.lato)} * inversesqrt(d2) / d2 * ${n(lavaggio(s))};
      /* E SUL FIANCO IL LAVAGGIO CROLLA, che e' tutto il punto.
       *
       * Il palo sta tre metri di lato rispetto alla faccia, e quasi sulla
       * stessa progressiva: il vettore che va dal pilastro alla lampada e'
       * quindi quasi tutto LATERALE. La faccia frontale ha la normale proprio
       * di traverso e se lo prende quasi per intero; la testata ha la normale
       * lungo la strada e ne prende il coseno di un angolo vicino al retto.
       * Un terzo e' la misura larga di quel coseno mediato sulla fila, e
       * soprattutto e' quel che serve: due facce dello stesso colore non fanno
       * un volume, due facce che differiscono di tre volte lo fanno subito. */
      lava *= mix(1.0, 0.34, fianco);

      vec3 luce = AMBIENTE * 0.45 + LUCE_PALO * luceCalda * lava * 0.45;
      /* E PRENDE ANCHE LO SBAFFO DEI FARI, MA SOLO DA VICINO — e adesso lo
       * prende soprattutto il fianco, che e' la parte piu' bella di tutta
       * questa storia.
       *
       * La testata guarda VERSO DI NOI, cioe' verso i nostri anabbaglianti:
       * e' l'unica superficie a bordo strada, insieme alla vernice, che stia
       * di fronte alla sorgente che ci portiamo dietro. La faccia frontale
       * invece i fari li prende di striscio e ne fa quasi niente. Il
       * risultato, sui due o tre pilastri piu' vicini, e' una testata calda e
       * chiara accanto a una faccia fredda e scura: e' cosi' che un pilastro
       * appare in un video girato da un'auto di notte, ed e' la ragione per
       * cui in un video quei pilastri hanno un volume e qui non ce l'avevano. */
      // 0,78 e non 0,98: a 0,98 la testata del pilastro piu' vicino diventava
      // un pannello illuminato invece che pietra colpita di striscio — si
      // staccava dal cielo come se avesse una luce dentro. Il rapporto fra le
      // due facce resta di tre a uno, che e' quello che fa il volume; e' il
      // valore assoluto che era troppo alto.
      luce += LUCE_FARO * exp(-avanti / 16.0) * mix(0.26, 0.78, fianco);
      colore = PIETRA * corso * macchia * luce;

      // IL TAGLIO DI LUCE ANNEGATO NEL PILASTRO.
      //
      // E' la cosa che fa il viale, e fa tre mestieri con una riga: e' il
      // ritmo (uno ogni tredici metri, cioe' sei al secondo in punta), e'
      // l'unica sorgente a lato strada che sfonda la soglia del bloom, ed e'
      // la citazione letterale della corte — luce dentro una gola, mai una
      // lampada a vista.
      // LA GOLA SEGUE LE PROPORZIONI DEL PILASTRO, NON UNA QUOTA FISSA. Un
      // pilastro piu' alto del sette per cento con la feritoia alla stessa
      // quota assoluta non e' lo stesso pilastro piu' grande: e' un pilastro
      // disegnato male. Le due quote e la mezza larghezza si moltiplicano per i
      // due fattori, e la gola resta al suo posto dentro la faccia.
      float su = coperta(h - ${n((s.taglio.basso + s.taglio.alto) * 0.5)} * misPila.y, ${n((s.taglio.alto - s.taglio.basso) * 0.5)} * misPila.y, dh);
      // LA SCIA DEL PILASTRO — ed e' la cosa che fa SENTIRE la velocita'.
      //
      // Il taglio di luce e' largo 15 cm. A 295 all'ora, in un tempo di posa
      // da 1/110, ne percorre 75: si stira a cinque volte la propria larghezza
      // e, dovendo conservare la luce, si abbassa nella stessa misura. Cioe'
      // in corsa i pilastri smettono di essere una fila di trattini accesi e
      // diventano una striscia continua che pulsa — che e' precisamente cio'
      // che una macchina da presa registra da un'auto lanciata, ed e' molto
      // piu' eloquente del tratteggio che scorre.
      //
      // Verticalmente NON si allarga niente: il moto e' orizzontale, e una
      // sfocatura che si allarga anche nella direzione in cui non ci si muove
      // e' semplicemente un'immagine fuori fuoco.
      // «dspMosso» sta piu' in su adesso: serviva prima, per lo spigolo.
      //
      // E LA GOLA SI SPOSTA COL FRONTE. Non e' piu' centrata sulla sagoma —
      // che era il centro di un rettangolo, cioe' di niente — ma sul centro
      // della FACCIA, che e' l'unico posto in cui una gola scavata nella faccia
      // possa stare. Da vicino la si vede quindi spostata verso il bordo
      // lontano, che e' esattamente cio' che si vede guardando di sbieco una
      // nicchia: e' quello scarto a dire all'occhio da che parte e' girato il
      // pilastro.
      float lungoFaccia = lungoPila - (spigolo + mezzaPila) * 0.5;
      float feritoia = coperta(lungoFaccia, ${n(s.taglio.meta)} * misPila.z, dspMosso);
      // la gola d'ombra intorno alla feritoia: senza, la luce sembra dipinta
      // sulla pietra invece che incassata dentro
      float gola = coperta(lungoFaccia, ${n(s.taglio.meta * 2.6)} * misPila.z, dspMosso) - feritoia;
      colore *= 1.0 - 0.50 * su * max(gola, 0.0);
      // LO SVERSAMENTO SULLA PIETRA, e senza questo i pilastri non esistono.
      //
      // Nel provino la pietra valeva cinque millesimi e la feritoia tre: un
      // rapporto di seicento a uno, cioe' due bastoncini d'oro sospesi nel
      // nero. Ma una gola di luce LAVA la faccia che la contiene — e' proprio
      // quello il mestiere per cui la si incassa. Con lo sbaffo intorno si
      // vede il pilastro, e la luce smette di galleggiare.
      // in verticale lo sbaffo NON si ferma dove finisce la feritoia: sfuma.
      // Con il bordo netto il pilastro sembrava una lastra d'oro incollata,
      // perche' una luce che si spegne su una riga dritta non e' luce.
      float suSfumato = exp(-pow((h - ${n((s.taglio.basso + s.taglio.alto) * 0.5)} * misPila.y) / 1.35, 4.0));
      // 0,60 E NON 2,0, ED E' L'ALTRA META' DEI LINGOTTI D'ORO.
      //
      // Con la pietra a cinque millesimi questo sbaffo era l'unica luce che il
      // pilastro riceveva, e per farlo esistere valeva 2,0: cioe' 0,36 in
      // ambra contro 0,005 di ambiente, settanta a uno. Il pilastro non era
      // pietra lavata da una gola di luce, era una barra di ottone dipinta
      // d'ambra da cima a fondo — e infatti nel provino sembravano lingotti
      // anche dopo aver alzato l'ambiente.
      //
      // Adesso il cielo blu porta (0,010 0,047 0,135) sulla faccia, e lo sbaffo
      // torna a fare il proprio mestiere: un ALONE caldo attorno alla feritoia,
      // che si spegne in trenta centimetri e lascia il resto della faccia alla
      // pietra fredda. E' anche il contrasto caldo-freddo dichiarato in
      // «Corte.ts»: per averlo servono tutte e due, e prima ce n'era una sola.
      //
      // E QUI PASSA ANCHE LA LAMPADA FULMINATA. «misPila.w» vale zero su uno dei
      // dodici pilastri e un quarto su un altro (la tabella e' in «COLONNATO»),
      // e moltiplica le DUE cose che la lampada fa: lo sbaffo sulla pietra e la
      // feritoia stessa. Sono due righe e non una perche' una gola spenta non e'
      // una gola meno accesa: e' una gola che non lava piu' niente intorno.
      //
      // Cio' che NON si spegne e' l'ombra della gola, tre righe piu' su. Quella
      // e' pietra scavata: resta scavata anche quando dentro non c'e' piu'
      // niente, e anzi e' l'unica cosa che fa capire che quel pilastro una
      // lampada ce l'aveva. Un pilastro liscio dove gli altri hanno una
      // feritoia sembra un pilastro di un altro tipo; una feritoia buia sembra
      // una lampadina fulminata, che e' quello che e'.
      colore += PIETRA * LUCE_PALO * suSfumato * exp(-abs(lungoFaccia) / 0.30) * 0.60 * misPila.w;
      colore += LUCE_PALO * su * feritoia * 2.8 * misPila.w;

      // la cimasa: il filo di sopra prende la luce di striscio e si accende.
      // Senza, il pilastro e' una campitura e non un oggetto.
      colore += PIETRA * LUCE_PALO * luceCalda * 0.55 * coperta(h - altPila, 0.05, dh);

      /* LO SPIGOLO FRA LE DUE FACCE, e i due SPIGOLI CONTRO IL CIELO.
       *
       * Sono due cose diverse e valgono per due ragioni diverse.
       *
       * LO SPIGOLO INTERNO e' pietra: un cantonale non e' mai vivo, e' smussato
       * dall'acqua e dagli urti, e uno smusso a quarantacinque gradi guarda in
       * alto — verso il cielo — e verso la lampada insieme. E' l'unica riga
       * chiara che possa stare in mezzo a una sagoma scura, ed e' anche quella
       * che DICE che le due facce sono due: senza, il salto fra le due luci si
       * legge come una macchia e non come un angolo.
       *
       * I DUE SPIGOLI ESTERNI non sono pietra, sono OTTICA, e per questo si
       * fanno qui e non in post. Un fondo luminoso — qui il cobalto
       * all'orizzonte — sborda dentro un primo piano scuro: succede
       * nell'obiettivo, nella diffusione dell'aria e nella pellicola, e succede
       * sempre. E' per questo che in una fotografia una sagoma controluce non
       * ha mai il bordo di rasoio, e in un render ce l'ha: era esattamente il
       * bordo che rendeva questi pilastri dei ritagli appoggiati sul cielo. In
       * post non si potrebbe fare, perche' in post non si sa piu' che dietro
       * quel bordo c'e' il cielo a novecento metri e non un'altra pietra.
       *
       * LA LARGHEZZA E' LEGATA A «dspMosso» con un tappo. In corsa l'impronta
       * del pixel sul pilastro arriva a mezzo metro, e un filo largo mezzo
       * metro non e' piu' un filo: e' mezza faccia schiarita. Il tappo a 34 cm
       * lo tiene un bordo anche in punta. */
      /* «q*q» E NON «pow(q, 2.0)», E NON E' UNA MICRO-OTTIMIZZAZIONE.
       *
       * «pow» in GLSL e' definita solo per base non negativa: le schede la
       * compilano come «exp2(2 * log2(q))», e il logaritmo di un numero
       * negativo non esiste. Qui la base e' «lungoPila - spigolo», che e'
       * negativa su tutta la meta' della sagoma occupata dal fianco — cioe' il
       * risultato sarebbe indefinito proprio dove serve, e indefinito vuol dire
       * «dipende dal driver»: nero su una scheda, bianco su un'altra, giusto su
       * quella su cui si sta provando. Il quadrato scritto per esteso e' anche
       * piu' veloce di un logaritmo e un'esponenziale. */
      float qSm = (lungoPila - spigolo) / max(0.075, dspMosso * 0.5);
      float smusso = exp(-qSm * qSm);
      colore += PIETRA * (AMBIENTE * 2.2 + LUCE_PALO * luceCalda * lava * 0.55) * smusso;

      float filoLargo = min(max(0.09, dspMosso * 1.1), 0.34);
      float filo = smoothstep(mezzaPila - filoLargo, mezzaPila, abs(lungoPila));
      colore += ORIZZONTE * filo * 0.13;

      // ----------------------------------- QUANTO DEL PIXEL COPRE IL PILASTRO
      //
      // La prova d'intersezione qui sopra e' stata allargata di mezza impronta
      // per pigliare anche i pixel a cavallo del bordo: adesso si dice quanto
      // sono coperti davvero, in larghezza e in altezza, e ci si mescola sopra
      // cio' che c'e' dietro. Senza, lo spigolo del pilastro e' una scaletta —
      // e una scaletta in un'immagine che scorre non sta ferma, cammina.
      //
      // In larghezza si usa «dspMosso», cioe' l'impronta O i metri percorsi
      // durante la posa, quale dei due e' maggiore: in corsa i due spigoli del
      // pilastro si spalmano su mezzo metro, ed e' quella la sfocatura di
      // movimento vera — la stessa cosa che il tratteggio fa da sempre.
      //
      // COSA C'E' DIETRO, senza calcolarlo. I pilastri stanno a 11,5 metri
      // dalla mezzeria e la banchina finisce a 4,7: dietro un pilastro non c'e'
      // mai asfalto, c'e' sempre o cielo o pietrisco. Il pietrisco vale
      // (0,036 0,036 0,036) per l'ambiente e la foschia se lo mangia con la
      // distanza, quindi si scrive quello invece di rifare tutto il ramo del
      // manto per una frangia larga un pixel. E' un'approssimazione dichiarata,
      // e sbaglia solo dove nessuno puo' vederlo.
      float copLargo = coperta(lungoPila, ${n(s.pila.larghezza * 0.5)} * misPila.z, dspMosso);
      float copAlto = coperta(h - altPila * 0.5, altPila * 0.5, dh);
      vec3 dietro = (tManto > 4500.0)
        ? cieloVisto(d, pix)
        : mix(PIETRA * 0.20 * AMBIENTE, aria, 1.0 - exp(-tManto / 900.0));
      colore = mix(dietro, colore, clamp(copLargo * copAlto, 0.0, 1.0));
    } else {
      // ------------------------------------------------------------ IL MANTO
      //
      // DUE ATTENUAZIONI, e sono la ragione per cui la fotografia non
      // sfarfalla.
      //
      // «nitido» spegne il RILIEVO oltre i 55 metri, «granoso» spegne la GRANA
      // del colore oltre i 70. Le mip mediano da sole le normali e la
      // superficie torna piatta, ma cio' che sparisce nella media e' proprio la
      // VARIANZA — ed e' la varianza a produrre lo scintillio a incidenza
      // radente, dove l'anisotropia a otto campioni ha gia' finito la corsa. Il
      // rilievo si spegne prima del colore perche' una macchia chiara che si
      // spegne non fa danno, mentre una normale che sopravvive mezzo pixel
      // brilla e si muove.
      float nitido  = exp(-t / ${n(a.portataRilievo)});
      float granoso = exp(-t / ${n(a.portataGrana)});

      // LA FOTOGRAFIA PORTA L'IRREGOLARITA', LA COSTANTE PORTA L'ESPOSIZIONE.
      //
      // Non si usa la fotografia COME albedo: la si usa come rapporto sulla
      // propria media, e quel rapporto moltiplica l'albedo dichiarato. Cosi'
      // l'esposizione del manto resta una decisione scritta qui dentro — con
      // il suo perche', a due schermate di distanza — e la fotografia porta
      // l'unica cosa che nessun rumore sa fare: una distribuzione ASIMMETRICA,
      // quasi tutto bitume scuro e rari sassi che brillano.
      //
      // Il passaggio da sRGB a lineare si fa a mano e la tessitura si carica
      // grezza. Delegarlo al formato hardware funziona, ma dipende da come
      // three decide di caricare quel file: un «pow» scritto e' un numero che
      // si verifica contro la media misurata sul file, e quella media e' il
      // perno di tutto cio' che viene dopo.
      vec3 grana = pow(pow(max(asfCrudo, 0.0), vec3(2.2)) * vec3(${n(1 / a.media[0])}, ${n(1 / a.media[1])}, ${n(1 / a.media[2])}), vec3(${n(a.compressione)}))
                 * vec3(${n(a.riporto[0])}, ${n(a.riporto[1])}, ${n(a.riporto[2])});
      vec3 albedo = ASFALTO * mix(vec3(1.0), grana, granoso);

      // LA RUVIDITA' LETTA COME SCARTO DALLA PROPRIA MEDIA, amplificata di due
      // volte e mezzo perche' la mappa e' contrastata poco (dal 5% al 95% sta
      // in un piu' o meno dodici per cento). E' un intervento dichiarato, non
      // una misura: senza, la variazione non arriva a schermo.
      float ruvido = clamp(1.0 + (asfRuv * ${n(1 / a.ruvidita)} - 1.0) * ${n(a.contrastoRuvidita)} * granoso, 0.55, 1.6);

      /* IL MANTO NON E' STATO STESO TUTTO LO STESSO GIORNO — due onde lente.
         La fotografia porta il singolo sasso ma si ripete ogni metro e mezzo:
         a cinquanta metri il manto torna una campitura uniforme, e la
         campitura uniforme e' il difetto. Queste due onde vivono su una scala
         che la tessitura non puo' avere — trentanove e cinquantadue metri —
         e sono i rappezzi, le riprese di stesa, il tratto rifatto l'anno
         scorso. Nessuna delle due si vede da sola; insieme, il manto smette di
         essere un piano e diventa una superficie con una storia.
         I due passi dividono il giro di 156 metri, quattro e tre volte: al
         ripiegamento dell'avanzamento ricadono su se stessi, e il loro minimo
         comune multiplo e' 156 stesso, cioe' dodici combinazioni prima di
         ripetersi. Un passo che non divide 156 darebbe uno scatto del manto
         ogni due chilometri — il genere di difetto che si vede e non si
         diagnostica. */
      float chiazza = onda(s, ${n(u.chiazza.lungaA)}, ${n(u.chiazza.quanteA)}, 11.0)
                    * 0.6 + onda(s, ${n(u.chiazza.lungaB)}, ${n(u.chiazza.quanteB)}, 23.0) * 0.4;
      ruvido *= 1.0 + ${n(u.chiazza.ruvido)} * (chiazza - 0.5) * 2.0 * granoso;

      /* LE TRACCE DELLE RUOTE — e' la cosa che dice «questa strada la usa
         qualcuno».
         Sotto ogni corsia corrono due bande lucidate dai pneumatici, distanti
         fra loro il passo delle ruote — che qui non e' un numero nuovo, e'
         «faro.semipasso»: le gomme di questa automobile passano dove passano
         quelle di tutte le altre. Il bitume lucidato SPECCHIA di piu' e
         restituisce meno del proprio colore, perche' il granulato affiorante
         si e' consumato. Di notte, con il manto che specchia il cobalto
         dell'orizzonte, i due nastri si accendono e corrono via: e'
         esattamente cio' che si vede da un parabrezza vero.
         LA LARGHEZZA SI APRE COL PIXEL, e l'ampiezza scende nella stessa
         misura. Una gaussiana di ventisei centimetri valutata al centro del
         pixel, a duecento metri dove tutta la carreggiata sta in cinque pixel,
         comparirebbe e sparirebbe: e' lo stesso sfarfallio che «coperta»
         risolve per le strisce, con la stessa cura — cio' che si stringe sotto
         il pixel non lampeggia, si spegne. */
      float largoT = max(${n(u.traccia.largo)}, du);
      float traccia = ${n(u.traccia.largo)} / largoT
        * exp(-pow((abs(abs(u) - ${n(s.faro.centro)}) - ${n(s.faro.semipasso)}) / largoT, 2.0));
      ruvido *= 1.0 - ${n(u.traccia.lucidatura)} * traccia;
      albedo *= 1.0 - ${n(u.traccia.sporco)} * traccia;
      albedo *= 1.0 + ${n(u.chiazza.colore)} * (chiazza - 0.5) * 2.0 * granoso;
      ruvido = clamp(ruvido, 0.45, 1.7);

      // IL RILIEVO ROMPE IL RIFLESSO, ed e' questo che toglie il linoleum.
      //
      // La mappa e' in spazio tangente. Sul manto la tangente e' l'asse della
      // strada e la bitangente e' il lato, quindi il passaggio al mondo e' uno
      // scambio di componenti e basta: (x, z, y). Non serve nessuna matrice —
      // il piano e' orizzontale e non si muove.
      //
      // E il rilievo si SPIANA quando si corre. A 295 all'ora la grana e'
      // spalmata su tre quarti di metro: non e' piu' un sasso, e' una striscia,
      // e una striscia non ha un fianco che riflette da un'altra parte.
      float rilievo = ${n(a.rilievo)} * nitido * (1.0 - 0.65 * clamp(corsa / ${n(s.piastrella * 0.5)}, 0.0, 1.0));
      vec3 nManto = normalize(vec3(asfPend.x * rilievo, asfPend.z, asfPend.y * rilievo));

      // IL RIFLESSO DEL CIELO E' LA RAGIONE PER CUI UNA STRADA SI VEDE.
      //
      // Un asfalto notturno con la sola albedo e' nero — ed e' esattamente
      // quello che si vedeva nel filmato. Ma a incidenza radente qualunque
      // superficie diventa uno specchio (Fresnel), e cio' che specchia e' il
      // cobalto sull'orizzonte. Il risultato e' che il manto LONTANO diventa un
      // lenzuolo luminoso, e il tratteggio ci si staglia sopra in controluce.
      // E' questo, e non la luce dei fari, che fa "vedere la strada" fino al
      // punto di fuga.
      //
      // La riflessione si prende adesso attorno alla normale VERA e non attorno
      // all'asse verticale. Con la normale piatta «reflect» restituisce
      // (d.x, -d.y, d.z), cioe' esattamente cio' che c'era scritto a mano
      // prima: la riga di sotto e' la stessa formula di prima piu' il rilievo,
      // non una formula nuova. Lo schiacciamento a 0,35 verso l'orizzonte resta
      // dov'era, ed e' sempre il modo piu' economico di dire «sfocato» senza
      // campionare il cielo dieci volte.
      vec3 rif = reflect(d, nManto);
      vec3 versoSpecchio = normalize(vec3(rif.x, rif.y * 0.35, rif.z));
      float fresnel = 0.035 + 0.965 * pow(1.0 - min(abs(d.y), 1.0), 5.0);
      // A INCIDENZA RADENTE LA RUVIDEZZA NON CONTA PIU'.
      //
      // Un asfalto ruvido rimanda un terzo di cio' che specchia — ma quando
      // il raggio lo sfiora, il lobo si stringe e la superficie torna uno
      // specchio vero. E' anche cio' che ricuce il fotogramma: senza, il
      // manto piu' lontano restava un terzo del cielo che gli sta sopra, e
      // sull'orizzonte si vedeva un GRADINO fra i due — una riga netta in
      // mezzo al parabrezza, che e' il difetto che il velo doveva impedire.
      //
      // QUELLO CHE CAMBIA CON LA MAPPA: sia il valore di partenza sia la QUOTA
      // a cui la superficie diventa specchio dipendono adesso dal punto. Il
      // bitume opaco resta opaco piu' a lungo, i sassi lisci passano a specchio
      // prima — e la mezza distanza smette di essere una campitura uniforme e
      // diventa chiazzata, che e' come si legge un asfalto bagnato vero.
      float esponente = mix(9.0, 15.0, clamp((ruvido - 0.75) / 0.7, 0.0, 1.0));
      float lucido = mix(0.34 / ruvido, 1.0, pow(1.0 - min(abs(d.y), 1.0), esponente));
      // LA BANCHINA NON SPECCHIA — TRANNE NELL'ULTIMO GRADO, E LI' SPECCHIA
      // TUTTO. E' il difetto che si vedeva come un orizzonte marino.
      //
      // Prima il riflesso sulla banchina veniva azzerato, e la ragione era
      // buona: il pietrisco non e' bagnato e con il riflesso acceso il bordo
      // strada sembrava una pista d'aeroporto. Ma azzerarlo del tutto lascia
      // una fascia SCURA che arriva fino alla linea d'orizzonte e li' si taglia
      // di netto contro un cielo cobalto — e nessuna foschia la salva, perche'
      // a 900 metri di portata il velo passa da un terzo a uno dentro l'ultimo
      // pixel sopra l'orizzonte. Sull'asfalto non si vedeva perche' l'asfalto
      // il cielo lo specchia e ci si dissolve dentro da solo.
      //
      // La risposta giusta non e' accorciare la foschia: e' che a incidenza
      // radente NON ESISTE una superficie opaca. Anche la ghiaia diventa uno
      // specchio quando il raggio la sfiora — e' lo stesso Fresnel dell'asfalto
      // con un esponente molto piu' duro, 26 contro 9-15. A mezza distanza
      // resta pietrisco spento com'era; nell'ultimo grado prima dell'orizzonte
      // si accende e la banchina si scioglie nel cielo senza lasciare il bordo.
      float fuoriStrada = clamp((abs(u) - ${n(s.cordolo.centro - s.cordolo.meta)}) / 0.9, 0.0, 1.0);
      /* E LA GHIAIA NON SPECCHIA TUTTA UGUALE — che e' la meta' che mancava.
       *
       * Dare al pietrisco la grana della fotografia (poche righe piu' giu',
       * su «ghiaia») non era bastato, e guardando il provino ingrandito si
       * capisce perche': quella fascia non si vede per la propria albedo, che
       * e' PIETRA * 0,20 cioe' quasi nera, si vede per il CIELO CHE SPECCHIA a
       * incidenza radente. Cambiare il colore di una superficie che si vede
       * solo per il proprio riflesso e' cambiare la cosa che non si guarda: il
       * numero cambia e il fotogramma no.
       *
       * Cio' che deve variare e' quindi lo SPECCHIO. Un pietrisco e' fatto di
       * sassi grandi come una nocciola: alcuni sono lisci e rimandano la
       * fascia luminosa, altri sono spaccati e la sparpagliano. Con un lucido
       * uniforme quella fascia diventa un lenzuolo, ed e' l'effetto linoleum
       * che «ASF.rilievo» descrive per il manto e che qui nessuno aveva ancora
       * tolto alla banchina.
       *
       * Si usa «ruvido», che e' gia' in mano ed e' la mappa di ruvidita' letta
       * come scarto dalla propria media: dove il sasso e' liscio si specchia di
       * piu', dove e' scabro di meno. Il fattore vale in media uno, quindi la
       * quantita' totale di riflesso non cambia — e con essa non cambia la
       * riga d'orizzonte, che e' il punto delicato di tutto questo blocco.
       *
       * E SI SPEGNE CON «granoso», cioe' entro i settanta metri. Sull'ultimo
       * grado prima dell'orizzonte il fattore torna esattamente uno: e' li' che
       * la banchina si deve sciogliere nel cielo senza lasciare un bordo, e
       * qualunque variazione superstite a quella distanza sarebbe piu' piccola
       * di un pixel e sfarfallerebbe invece di vedersi. */
      float lucidoGhiaia = 0.85 * pow(1.0 - min(abs(d.y), 1.0), 26.0)
                         * mix(1.0, 2.0 - ruvido, granoso);
      lucido = mix(lucido, lucidoGhiaia, fuoriStrada);
      // 0,34 e non 1: l'asfalto e' ruvido, di quel riflesso ne rimanda un
      // terzo. Al primo giro erano 0,50, e con quel valore la mezza distanza
      // era chiara quanto la pozza dei fari — cioe' il fascio non si vedeva,
      // e senza fascio non c'e' un'auto, c'e' una telecamera che scivola.
      vec3 specchio = cielo(versoSpecchio) * fresnel * lucido;

      float fascio = faro(avanti, u);

      // le fasce laterali, dall'esterno verso l'interno
      // OLTRE IL CORDOLO E' TUTTO BANCHINA, senza un bordo esterno.
      //
      // Prima era una FASCIA che finiva al muretto, e oltre il muretto
      // tornava asfalto: il muro lo nascondeva, quindi non si vedeva. I vuoti
      // fra i pilastri lo scoprono, e un anello di asfalto oltre il colonnato
      // e' esattamente il genere di errore che compare solo dopo aver
      // cambiato tutt'altro.
      /* IL PIETRISCO ERA L'UNICA CAMPITURA PIATTA RIMASTA, ED E' ENORME.
       *
       * Va dal cordolo a 4,7 metri fino ai pilastri a 11,5: quasi sette metri
       * per lato, che nel fotogramma sono la fascia larga che sta fra il bordo
       * della strada e la fila dei pilastri. Su tutta quella superficie
       * l'albedo era una COSTANTE — «PIETRA * 0,20» — perche' la riga di prima
       * sostituiva l'asfalto testurizzato con un colore secco.
       *
       * E' letteralmente il «piano grigio piatto» che le revisioni hanno visto.
       * Non era una questione di luce: era che li' non c'era nessuna materia. Il
       * manto accanto ha la fotografia del granulato, la banchina aveva una
       * tinta unita, e il salto fra le due si legge come «meta' della scena non
       * e' finita».
       *
       * IL RIMEDIO NON COSTA UN PRELIEVO IN PIU'. «grana» e' gia' in mano — e'
       * il rapporto fra la fotografia dell'asfalto e la propria media, gia'
       * campionato in coordinate di strada fuori da ogni ramo. Qui si riusa,
       * con il contrasto AUMENTATO di un terzo invece che ridotto: il pietrisco
       * di una banchina e' piu' grosso del granulato di un manto compattato, e
       * quindi ha piu' contrasto, non meno.
       *
       * SI ESTRAPOLA (fattore 1,35, cioe' oltre l'uno) invece di moltiplicare:
       * «grana» ha media uno per costruzione, quindi «1 + 1,35 * (grana - 1)»
       * ha ancora media uno e alza solo lo scarto. Elevare al quadrato — che e'
       * stata la prima idea — avrebbe alzato anche la MEDIA, cioe' schiarito
       * tutta la banchina: un'operazione che si presenta come «piu' contrasto»
       * e in realta' cambia l'esposizione, che e' la cosa che qui non si deve
       * toccare. */
      vec3 ghiaia = PIETRA * 0.20 * mix(vec3(1.0), grana, granoso * 1.35);
      albedo = mix(albedo, ghiaia, clamp((abs(u) - ${n(s.cordolo.centro + s.cordolo.meta)}) / du + 0.5, 0.0, 1.0));
      albedo = mix(albedo, PIETRA, coperta(abs(u) - ${n(s.cordolo.centro)}, ${n(s.cordolo.meta)}, du));

      /* ============================================================ I GIUNTI

         L'UNICA COSA IRREGOLARE DEL MANTO, e serve a rompere un pettine.

         Su questa strada tutto sta su una griglia: pile a 13 metri, pali a 26,
         tratteggio a 12, cipressi a 26, catarifrangenti a 12 sfasati di 6.
         Cinque ritmi, tutti divisori del giro, tutti costanti. I pilastri hanno
         gia' uno scarto del quattro per cento, e il commento che lo spiega dice
         la cosa giusta: «il ritmo si sente senza guardare, perche' e' un tempo e
         non una forma» — ma quattro per cento su tredici metri e' una
         sfumatura, non un evento.

         Il cervello misura la velocita' dagli EVENTI, non dal moto. Un manto in
         cui non succede niente scorre e basta: e' il motivo per cui una
         passerella mobile non sembra veloce anche quando lo e'.

         PASSO 60 CON SCARTO +/-17. Le distanze fra un giunto e il successivo
         vanno da 26 a 94 metri: nessuna coppia uguale dentro il giro, e nessun
         rischio che due si sovrappongano. 60 divide 780 esattamente tredici
         volte, quindi al ripiegamento l'indice del giunto ricade su se stesso e
         non si vede il salto — la stessa regola di ogni altro motivo qui.

         E QUI L'HASH SI PUO' USARE, mentre per i tagli di luce dei pilastri no.
         La regola scritta in COLONNATO e' precisa: «fract(sin(x)*43758) va
         benissimo per una larghezza — nessuno sa quanto doveva essere larga —
         per una cosa che si CONTA no». Qui non si conta niente: un giunto
         spostato di due metri su una scheda diversa resta un giunto, e nessuno
         sa dove doveva stare.

         VENTUN CENTIMETRI, E NON SETTE. Alla prima prova erano sette — la
         misura di una fessura di dilatazione — e nel provino non si vedevano:
         sette centimetri a venti metri sono due pixel, e piu' in la' spariscono
         sotto il filtraggio. E' l'errore che questo progetto ha gia' pagato con
         le dieci razze da 26 mm: un dettaglio non si valuta in millimetri, si
         valuta in PIXEL alla distanza a cui la camera lo mostra.
         Ventun centimetri sono la misura di un'altra cosa vera e piu' adatta:
         la RIPRESA DI STESA, la giunzione fra due strisciate d'asfalto messe in
         giorni diversi. Su una strada vera si vede, corre da un bordo all'altro,
         ed e' irregolare perche' dipende da dove il cantiere ha smesso la sera.
         Scuro e non chiaro: la ripresa e' piu' compatta e piu' opaca del manto
         intorno. Chiaro sarebbe vernice, e la vernice ce l'ha gia' il
         tratteggio. */
      {
        float gi = floor(s * ${n(1 / s.giunto.passo)});
        float scarto = (alea(vec2(gi, 7.0)) - 0.5) * ${n(s.giunto.scarto)};
        float dg = s - (gi + 0.5) * ${n(s.giunto.passo)} - scarto;
        float giunto = coperta(dg, ${n(s.giunto.meta)}, max(ds, corsa));
        albedo *= 1.0 - ${n(s.giunto.scuro)} * giunto;
      }

      // LA SCIA DEL TRATTEGGIO. A 295 all'ora un tratto percorre 75 cm dentro
      // un tempo di posa da 1/110: ammorbidire i suoi due estremi di quella
      // quantita' non e' un effetto, e' cio' che registra una macchina da
      // presa. Ed e' anche l'unica difesa contro lo stroboscopio, perche' a
      // quella velocita' il manto vicino avanza di piu' di un metro per
      // fotogramma e senza scia i tratti saltano invece di scorrere.
      float scia = max(ds, corsa);
      float f = mod(s + ${n(s.passoTratto * 0.5)}, ${n(s.passoTratto)}) - ${n(s.passoTratto * 0.5)};
      float lungo = coperta(f, ${n(s.tratto * 0.5)}, scia);

      float mezzeria = lungo * coperta(u, ${n(s.vernice)}, du);
      float margine = coperta(abs(u) - ${n(s.corsia)}, ${n(s.vernice)}, du);
      float segno = clamp(mezzeria + margine, 0.0, 1.0);
      albedo = mix(albedo, VERNICE, segno);

      vec3 luce = AMBIENTE + LUCE_FARO * fascio + LUCE_PALO * luceCalda;
      // LA VERNICE E' RETRORIFLETTENTE: rimanda il fascio dritto a chi lo
      // manda, ed e' il motivo per cui di notte le strisce sono l'unica cosa
      // che si legge davvero. Senza questo termine la segnaletica resta un
      // grigio appena piu' chiaro, cioe' sbagliata in un modo che si sente
      // senza saperlo dire.
      luce += LUCE_FARO * fascio * segno * 1.9;

      /* E LA VERNICE E' PIU' LISCIA DELL'ASFALTO — non solo piu' chiara.
         Fino a ieri la segnaletica cambiava soltanto l'albedo: stessa
         ruvidita', stesso riflesso del manto che le sta intorno. Ma una
         striscia stesa e' una pellicola, e una pellicola specchia il cielo
         molto piu' del granulato che ha sotto: e' proprio quella differenza di
         FINITURA, non quella di colore, a far leggere «strada vera» invece di
         «piano con delle righe sopra».
         Si vede quando la strada e' bagnata e di notte, cioe' sempre in questa
         scena: la mezzeria diventa una riga lucida dentro un manto opaco. */
      specchio *= mix(1.0, 1.95, segno);

      /* I CATARIFRANGENTI, e sono l'unica cosa della scena che rimanda la
         luce DRITTA a chi la manda.
         Si accendono col fascio e con nient'altro — non con i pali, non con
         l'ambiente: e' quello che li rende riconoscibili senza spiegarli.
         Vanno sommati al colore e non alla luce, perche' non hanno l'albedo
         dell'asfalto: un occhio di gatto e' un prisma di vetro, e cio' che
         torna indietro non passa dal bitume.
         Uno ogni dodici metri, cioe' il passo del tratteggio — che divide il
         giro — ma sfasati di sei e messi in mezzo fra un tratto e il
         successivo: due motivi che battono lo stesso tempo si leggono come
         uno, due sfasati danno il ritmo al bordo della strada, che oggi e'
         l'unica parte del fotogramma dove non succede niente.
         E prendono la stessa scia del tratteggio, quindi in corsa non sono
         punti che lampeggiano: sono trattini che sfilano. */
      float fOcchi = mod(s + ${n(u.occhi.sfasamento * 0.5)}, ${n(u.occhi.passo)}) - ${n(u.occhi.passo * 0.5)};
      float occhi = coperta(fOcchi, ${n(u.occhi.lungo)}, scia)
                  * coperta(abs(u) - ${n(u.occhi.dove)}, ${n(u.occhi.meta)}, du);

      colore = albedo * luce + specchio;
      /* IL TETTO NON E' UNA RESA: e' quello che fa un catarifrangente vero.
         La copertura tende a uno quando il prisma arriva vicino, e li' la
         formula darebbe un valore da centinaia — cioe' una macchia bianca che
         sfonda la soglia del bagliore e riempie mezzo fotogramma di velo.
         Un occhio di gatto vicino e' abbagliante, non infinito: il tetto e'
         l'equivalente della saturazione della pellicola, ed e' il motivo per
         cui nelle riprese vere quei punti restano punti. */
      colore += min(LUCE_FARO * fascio * occhi * ${n(u.occhi.forza)}, vec3(${n(u.occhi.tetto)}));
    }

    // LA FOSCHIA. Non e' la nebbia della scena (che comincia a 34 m e ha un
    // colore fisso): e' prospettiva aerea vera, cioe' il colore dell'aria
    // NELLA DIREZIONE IN CUI SI GUARDA. Verso il punto di fuga e' ambra,
    // verso l'alto e' indaco, e la strada ci si scioglie dentro senza bordi.
    // LA DISTANZA E' 900 METRI, E LA PRIMA VOLTA NE AVEVO SCRITTI 130.
    //
    // A 130 metri il velo vale gia' il 63%: nel primo provino tutto il
    // fotogramma — asfalto, muri, banchina — era diventato del colore
    // dell'orizzonte, cioe' un beige lattiginoso da tempesta di sabbia a
    // mezzogiorno. Non era foschia: era una vernice stesa sopra la scena.
    //
    // 900 e' la portata di una sera limpida: a cento metri il velo vale l'11%
    // e a trecento il 28%, mentre all'orizzonte — dove la distanza va
    // all'infinito — vale uno e la strada si scioglie nel cielo senza bordo,
    // che era l'unica cosa per cui il velo serviva davvero.
    colore = mix(colore, aria, 1.0 - exp(-lontananza / 900.0));
  }

  // ------------------------------------------------------------- I LAMPIONI
  //
  // Si disegnano DOPO, e solo dove possono stare: la testa di un palo e' a
  // 5,40 sul manto contro un occhio a 1,02, quindi sta SEMPRE sopra
  // l'orizzonte. Un raggio che punta in basso non ne puo' incontrare nessuno,
  // e saltare il giro per meta' dei pixel vale piu' di qualunque
  // ottimizzazione dentro il giro.
  if (d.y > 0.0) {
    float sfasa = mod(uAvanzamento, ${n(s.palo.passo)});
    vec3 alone = vec3(0.0);
    for (int k = 0; k < 9; k++) {
      float x = float(k) * ${n(s.palo.passo)} - sfasa;
      for (int i = 0; i < 2; i++) {
        float lato = (i == 0) ? 1.0 : -1.0;
        vec3 L = vec3(x, ${n(s.palo.altezza - s.occhio)}, lato * ${n(s.palo.lato)} - SCARTO);
        float avanti = dot(L, d);
        if (avanti < 1.0) continue;
        // lo scarto fra raggio e lampada, scomposto in RADIALE e TANGENZIALE.
        //
        // Radiale vuol dire «lungo la direzione in cui la lampada scappa»: con
        // una camera che trasla in avanti, tutto sullo schermo fugge in linea
        // retta dal punto di fuga, e la direzione di fuga di questa lampada e'
        // la componente dell'asse della strada perpendicolare al raggio.
        vec3 scarto = L - avanti * d;
        float r = length(scarto) / avanti;
        vec3 fuga = vec3(1.0, 0.0, 0.0) - d * d.x;
        float sinTheta = length(fuga);
        vec3 versoFuga = (sinTheta > 1e-4) ? fuga / sinTheta : vec3(0.0, 0.0, 1.0);
        float rRad = dot(scarto, versoFuga) / avanti;
        float rTan = sqrt(max(r * r - rRad * rRad, 0.0));

        // IL RAGGIO ANGOLARE DELLA LAMPADA CALA CON LA DISTANZA, e questo e'
        // tutto cio' che serve: una sorgente risolta mantiene la stessa
        // luminosita' per pixel e perde superficie, che e' il modo giusto di
        // ottenere la caduta col quadrato senza scriverla.
        //
        // MA IL TAPPO IN BASSO ROMPEVA PROPRIO QUESTO, ed era il difetto piu'
        // rumoroso del fotogramma. Il raggio era tappato a 0,0035 — circa tre
        // pixel, il minimo per non sfarfallare — e sotto quel tappo la lampada
        // SMETTEVA di rimpicciolire restando alla stessa luminosita': da 130
        // metri in poi tutti i lampioni erano dischi identici. Una fila di
        // punti tutti uguali fino in fondo e' un disegno, non una fotografia.
        //
        // Adesso, quando il disco vero scende sotto il minimo, si tiene il
        // minimo per la FORMA e si restituisce l'energia perduta alla
        // LUMINOSITA': il rapporto al quadrato, perche' e' una superficie. Da
        // li' in poi la lampada continua a spegnersi con il quadrato della
        // distanza, com'e' giusto, senza mai scendere sotto i tre pixel dove
        // comincerebbe a lampeggiare.
        float sigVero = 0.45 / avanti;
        float sig = max(sigVero, 0.0035);
        float energia = (sigVero / sig) * (sigVero / sig);

        // e in corsa il nucleo si allunga verso la fuga. La lunghezza e' quella
        // vera: velocita' per tempo di posa, per il seno dell'angolo dal punto
        // di fuga, diviso la distanza — cioe' lo spostamento angolare del punto
        // durante lo scatto. Verso il punto di fuga vale zero, come deve: cio'
        // che si ha davanti non si muove sullo schermo.
        float strisciata = uAndatura * ${n(s.posa)} * sinTheta / avanti;
        float sigRad = sqrt(sig * sig + strisciata * strisciata * 0.34);
        float nucleo = exp(-(rRad * rRad) / (sigRad * sigRad) - (rTan * rTan) / (sig * sig))
                     * (sig / sigRad);

        // L'ARIA IN MEZZO SI VEDE, E CRESCE CON LA DISTANZA.
        //
        // L'alone attorno a un lampione non e' un difetto dell'occhio: e' la
        // colonna d'aria fra lui e noi che ne diffonde una parte. Piu' aria c'e'
        // in mezzo, piu' l'alone e' largo e piu' pesa rispetto al nucleo — ed e'
        // esattamente questo che dice a chi guarda quanto e' lontana la fila.
        // Con un alone di misura fissa, come c'era, la profondita' non c'e'.
        float lontano = 1.0 - exp(-avanti / 160.0);
        float raggioVelo = sig * 3.0 + 0.008 + 0.022 * lontano;
        float velo = exp(-r * r / (raggioVelo * raggioVelo));

        // e la lampada si SCALDA allontanandosi: vedi LUCE_PALO_VIA
        vec3 tinta = mix(LUCE_PALO, LUCE_PALO_VIA, lontano);

        // il nucleo sfonda la soglia del bloom (2,60 in lineare, dichiarata
        // in Esperienza) e fiorisce; il velo resta sotto e fa la lampada
        // dentro la foschia. Sono due mestieri diversi, quindi due termini.
        alone += tinta * (nucleo * 4.0 * energia + velo * (0.10 + 0.14 * lontano))
               * exp(-avanti / 220.0);
      }
    }
    // i lampioni non passano davanti a cio' che li nasconde: se qualcosa e'
    // stato colpito piu' vicino della lampada, l'alone e' gia' stato pesato
    // dalla foschia sopra e qui si aggiunge soltanto
    colore += alone;
  }

  // un filo di caldo in piu' quando si spinge: e' il quadro e i fari che
  // salgono insieme alla velocita', non un effetto a se'
  colore *= 1.0 + 0.10 * uSpinta;

  // L'OCCHIO CHE SI ABITUA. Si arriva qui uscendo da un'ottica spenta, e una
  // strada gia' illuminata sarebbe l'ultimo stacco rimasto del percorso.
  // Moltiplicare invece che mescolare: si spegne il mondo, non lo si tinge —
  // e a luce piena questa riga non fa assolutamente niente.
  colore *= uLuce;

  /* IL FINALE — LA STRADA SI CHIUDE NELLA SUA LINEA.
   *
   * COSA SOPRAVVIVE, E PERCHE' PROPRIO QUELLO.
   *
   * La specifica diceva: la prospettiva si appiattisce finche' resta una sola
   * riga orizzontale luminosa. La prima idea era tenere la MEZZERIA — la
   * striscia bianca al centro della carreggiata — e spegnere tutto il resto.
   * E' sbagliata, e si vede disegnandola: la mezzeria corre VERSO il punto di
   * fuga, quindi sullo schermo e' una riga VERTICALE che si assottiglia, non
   * una riga orizzontale.
   *
   * Quello che diventa una riga orizzontale e' L'ORIZZONTE, che e' anche il
   * posto dove la mezzeria finisce: i due bordi della carreggiata e la
   * mezzeria convergono tutti e tre nello stesso punto, e quel punto sta
   * sull'orizzonte. Spegnendo la carreggiata resta la riga su cui era appesa.
   *
   * E si calcola in una riga sola, perche' l'orizzonte e' esattamente il
   * luogo dei raggi con d.y uguale a zero: quelli che non salgono ne'
   * scendono. Non serve sapere niente della geometria della strada — serve
   * sapere dove si sta guardando, che e' l'unica cosa che questo shader ha
   * sempre in mano.
   *
   * LA RIGA SI STRINGE MENTRE ARRIVA. Lo spessore va da due gradi a poco piu'
   * di un decimo: comincia come una fascia di foschia luminosa all'orizzonte —
   * che e' una cosa che nella scena c'era gia' — e finisce come un filo. Cosi'
   * non compare niente di nuovo: si stringe qualcosa che si stava gia'
   * guardando, ed e' quella continuita' a rendere il passaggio non
   * localizzabile.
   *
   * IL COLORE E' L'AMBRA DEL SITO, la stessa della rotaia e del filetto del
   * quadro. L'ultima cosa che resta accesa in una scena che si spegne e' anche
   * l'unica occasione in cui quel colore puo' essere l'unico colore.
   */
  if (uFinale > 0.0) {
    float f = uFinale;
    // lo spessore angolare della riga, in radianti: da due gradi a 0,12
    /* LO SPESSORE VA DA UN GRADO A UN DECIMO, e i primi numeri erano il
       doppio. Nel provino, a meta' corsa, la riga era una fascia luminosa
       alta un ventesimo di schermo: non «la strada che si chiude in una
       linea», ma una barra. Il conto: 0,035 radianti sono due gradi, che con
       il campo a 39 gradi su 800 pixel fanno 43 pixel di sigma, cioe' una
       fascia visibile alta piu' di cento. */
    float spessore = mix(0.018, 0.0012, f * f);
    float riga = exp(-(d.y * d.y) / (spessore * spessore));
    // 3,4 e non 1: la riga e' l'unica sorgente rimasta nel fotogramma e deve
    // superare la soglia del bagliore (2,6), se no il finale e' una linea
    // spenta su un nero e non una linea che ILLUMINA un nero
    /* 2,9 e non 3,4: la riga deve superare la soglia del bagliore (2,6) e
       non doppiarla. A 3,4 il bloom le costruiva intorno un alone alto
       quanto la fascia stessa, e la somma delle due cose tornava a essere
       una barra — cioe' esattamente cio' che assottigliare lo spessore
       serviva a evitare. */
    vec3 filo = vec3(0.847, 0.635, 0.345) * 2.9 * riga;
    // il mondo scende nel nero prima che la riga arrivi al massimo: fra 0,55 e
    // 0,85 di corsa si e' nel mezzo dello scambio, ed e' li' che il documento
    // fa comparire la propria riga sopra la stessa altezza dello schermo
    /* IL MONDO SI ABBASSA, NON SI SPEGNE — ed e' la correzione piu' importante
     * di tutto il finale.
     *
     * La prima versione portava tutto a nero, con il fattore della mescolanza
     * che arrivava a uno. Sulla carta era la specifica —
     * «quasi tutto nero» — e guardata sullo schermo era un'altra cosa: un
     * rettangolo nero con sopra una scritta, cioe' la fine del sito tre
     * dimensioni due schermate prima della fine del sito. Il committente l'ha
     * detto in tre parole: «e' creativo? e' 3D? no».
     *
     * Aveva ragione, e l'errore e' di lettura: «quasi tutto nero» descrive un
     * FOTOGRAMMA, non una scena spenta. Una strada notturna che rallenta e'
     * gia' quasi tutta nera — di suo, per come e' illuminata — e resta una
     * strada. Spegnerla in aggiunta non toglie rumore: toglie il soggetto.
     *
     * 0,62 e non 1,0: alla fine resta il 38% della luce. L'asfalto si vede,
     * il tratteggio scorre, i lampioni passano — e sopra tutto questo c'e' la
     * riga all'orizzonte, che e' l'unica cosa che si accende invece di
     * spegnersi. Il contrasto fra le due direzioni e' cio' che fa leggere il
     * finale come un arrivo e non come uno spegnimento. */
    colore = mix(colore, colore * 0.38, smoothstep(0.10, 0.80, f));
    /* IL FILO ALL'ORIZZONTE E' STATO TOLTO INSIEME ALL'IDEA CHE LO REGGEVA.
       Serviva quando il finale era «la strada si appiattisce in una riga e la
       riga diventa la sottolineatura del contatto». Adesso il finale e' un
       controllo di polizia, e in quei cinque secondi sullo schermo ci sono
       gia' due lampeggianti e uno scanner: una terza riga luminosa non
       aggiunge, sottrae. Il codice resta perche' la riga si accende ancora,
       ma a un decimo — quel tanto che tiene l'orizzonte leggibile mentre il
       resto si abbassa. */
    colore += filo * smoothstep(0.05, 0.55, f) * 0.10;
  }

  /* LA LUCE DELLA PATTUGLIA SULLA CARREGGIATA.
   *
   * La volante e' un modello vero e sta nella scena: vedi scene/Volante.ts.
   * Questo qui e' l'altra meta' del lavoro, e senza di lei il modello da solo
   * non basterebbe: la luce che getta.
   *
   * Un lampeggiante lo si riconosce da quello che ILLUMINA, non da com'e'
   * fatto. La carreggiata davanti si accende di blu e di rosso a battute
   * alterne, i guard-rail si stampano contro il buio, e quella luce arriva da
   * DIETRO — quindi accende il primo piano e si spegne verso il punto di fuga.
   * E' quella caduta a dire dov'e' la pattuglia, molto prima che la si veda.
   *
   * Due sorgenti alternate: uLampo vale -1 quando batte il blu e +1 quando
   * batte il rosso. La forma non e' una sinusoide ma due impulsi corti — un
   * lampeggiante non dissolve, sbatte.
   *
   * E il rosso e il blu non sono puri: un po' di verde dentro tutti e due, se
   * no a soglia del bagliore superata diventano due macchie sature senza forma.
   */
  if (uPolizia > 0.0) {
    // quanto e' vicino il pezzo di strada che si sta guardando: il fascio
    // arriva da dietro, quindi accende il davanti e non il fondo
    float vicino = clamp(1.0 - lontananza / 46.0, 0.0, 1.0);
    vicino *= vicino;
    // e non tocca il cielo: sopra l'orizzonte un lampeggiante non arriva
    float sotto = clamp(-d.y * 14.0, 0.0, 1.0);
    vec3 blu  = vec3(0.10, 0.32, 1.00);
    vec3 ross = vec3(1.00, 0.16, 0.12);
    float bLampo = max(-uLampo, 0.0);
    float rLampo = max(uLampo, 0.0);
    /* 1,15 e non 2,1: nel primo provino la battuta blu portava il fotogramma
       intero fuori scala e la carreggiata diventava una lastra di colore
       piatto. Un lampeggiante non annulla la scena che illumina — la macchia
       di colore corre sull'asfalto e lascia vedere il tratteggio sotto. */
    colore += (blu * bLampo + ross * rLampo) * vicino * sotto * uPolizia * 1.15;
  }

  colore = mix(colore, uTinta, uForzaTinta);
  gl_FragColor = vec4(colore, 1.0);
}
`
}

export class Lastra {
  readonly mesh: Mesh
  readonly materiale: ShaderMaterial

  /**
   * NON C'E' PIU' NIENTE DA CARICARE, quindi vale `true` da subito.
   * Il campo resta perche' quattro strumenti lo aspettano prima di misurare.
   */
  pronta = true

  /**
   * IL VIDEO NON C'E' PIU'. Vedi il blocco «cosa cambia» in testa al file:
   * resta come campo a `null` perche' un `null` racconta una storia e un
   * campo mancante no.
   */
  readonly video: HTMLVideoElement | null = null

  /** metri di strada passati sotto le ruote, ripiegati su `STRADA.giro` */
  avanzamento = 0
  /** metri al secondo */
  andatura = 0
  /** vero quando la strada scorre: e' il sostituto di `!video.paused` */
  get inMoto() { return this.andatura > 0.05 }

  /* QUANTO VA DAVVERO, in due forme, e sono l'unica sorgente della cifra.
   *
   * Il quadro e le ruote avevano una loro formula per la velocita': partivano
   * dallo scorrimento e ci applicavano `min(v * 9, 1) * 330`, mentre la strada
   * parte dallo stesso scorrimento e applica `crociera + (punta - crociera) *
   * (1 - e^(-v/scala))`. Due conversioni diverse della stessa grandezza, e
   * quindi due velocita' diverse nello stesso fotogramma.
   *
   * Misurato: a dito fermo la carreggiata correva a 70 km/h e il tachimetro
   * segnava 1; scorrendo, 113 contro 38. Il committente l'ha visto senza
   * strumenti: «il luogo si muove e contachilometri fermo».
   *
   * La causa e' strutturale, non un numero da ritoccare: la crociera esiste
   * solo nella formula della strada, quindi a scorrimento zero la strada ha un
   * fondo e il quadro no. Nessuna taratura dei coefficienti puo' far
   * coincidere due funzioni che hanno un termine costante diverso.
   *
   * Da qui in poi la velocita' e' UNA e nasce dove viene usata per muovere il
   * mondo. Il quadro la legge, le ruote la leggono. E' la stessa regola che il
   * commento delle ruote dichiarava gia': «girano sulla STESSA spinta del
   * tachimetro, non su un numero loro: sono la prova visiva della cifra che il
   * quadro mostra» — solo che nessuno dei due leggeva la strada. */
  /** i chilometri orari veri: e' la cifra che il quadro deve mostrare */
  get kmh() { return this.andatura * 3.6 }
  /** e la stessa cosa da 0 a 1, per chi ragiona in frazione di fondoscala */
  get quanto() { return this.andatura / ANDATURA.punta }

  private bersaglio = 0
  private ultimo = 0
  private u: Record<string, { value: unknown }>

  constructor() {
    // IL VERSO DEL SOLE NON SERVE PIU', ed e' bene dire cosa se n'e' andato.
    //
    // Qui si ruotava `versoSole()` di 8,4 gradi per portarlo dal sistema del
    // mondo a quello della strada, e serviva a far cadere l'alone caldo del
    // crepuscolo nello stesso punto in cui cade nella corte. Ma la corte
    // adesso e' una fotografia, e in quella fotografia un alone caldo NON C'E':
    // il canale rosso del cielo non supera tre millesimi a nessuna quota
    // (l'elenco delle misure e' in testa al file). Tenere una rotazione esatta
    // per posizionare una cosa che non deve esistere e' il modo piu' sicuro di
    // farla riapparire fra sei mesi.
    //
    // `uPendenza` resta e fa il lavoro vero: e' lei che inclina il raggio.
    const p = (STRADA.pendenza * Math.PI) / 180

    this.materiale = new ShaderMaterial({
      uniforms: {
        uFinale: { value: 0 },
        uPolizia: { value: 0 },
        uLampo: { value: 0 },
        uPendenza: { value: new Vector2(Math.cos(p), Math.sin(p)) },
        uAvanzamento: { value: 0 },
        uAndatura: { value: 0 },
        uSpinta: { value: 0 },
        uTinta: { value: new Vector3(1, 0, 1) },
        uForzaTinta: { value: 0 },
        uLuce: { value: 1 },
        // I RIPIEGHI SONO UN PIXEL DEL VALORE MEDIO DELLA TESSITURA VERA, e
        // non un bianco o un nero.
        //
        // `pronta` vale true dal costruttore e gli strumenti misurano subito:
        // se qui ci fosse un sampler vuoto, three ci legherebbe la sua texture
        // di riserva e per qualche fotogramma l'asfalto sarebbe nero pieno —
        // cioe' esattamente il difetto del filmato che questo file e' nato per
        // togliere, ricomparso durante il caricamento. Con la media della
        // fotografia dentro un pixel, il fotogramma prima del caricamento e'
        // la vecchia campitura piatta, che e' brutta ma e' giusta, e quando le
        // immagini arrivano non c'e' nessun salto di esposizione.
        uAsfCol: { value: unPixel(ASF.media, true) },
        uAsfNor: { value: unPixel([0.5, 0.5, 1.0], false) },
        uAsfRgh: { value: unPixel([ASF.ruvidita, ASF.ruvidita, ASF.ruvidita], false) },
      },
      vertexShader: VERT,
      fragmentShader: frammento(STRADA, ASF),
      // NIENTE NEBBIA E NIENTE TRASPARENZA. La foschia se la fa lo shader, ed
      // e' prospettiva aerea vera invece di una tinta piatta; la nebbia della
      // scena, applicata sopra, la coprirebbe con un colore fisso proprio
      // dove il lavoro e' piu' delicato. E il piano e' opaco: e' il fondo del
      // mondo, quindi scrive in profondita' come deve.
      fog: false,
      transparent: false,
      depthWrite: true,
    })

    this.mesh = new Mesh(new PlaneGeometry(LASTRA.larghezza, LASTRA.altezza), this.materiale)
    this.mesh.position.set(AUTO.occhi.x + LASTRA.distanza, 3.0, 0)
    this.mesh.rotation.y = -Math.PI / 2
    this.mesh.name = 'LASTRA'
    // il piano e' grande e non si muove mai: il taglio della vista lo
    // butterebbe fuori quando la camera guarda di lato, e riapparirebbe. Non
    // e' un risparmio che convenga su due triangoli.
    this.mesh.frustumCulled = false

    this.u = this.materiale.uniforms as unknown as Record<string, { value: unknown }>

    // LE TRE FOTOGRAFIE ARRIVANO DOPO, E NESSUNO LE ASPETTA.
    //
    // `pronta` resta true dal costruttore: non e' una svista, e' la stessa
    // decisione di prima. Il fotogramma senza tessiture e' completo e giusto
    // — e' la campitura piatta con l'esposizione esatta — quindi non c'e'
    // niente per cui valga la pena tenere fermi quattro strumenti e la
    // partenza del sito. Quando le immagini arrivano, cambia solo la materia.
    this.carica('/texture/asfalto_col.webp', 'uAsfCol')
    this.carica('/texture/asfalto_nor.webp', 'uAsfNor')
    this.carica('/texture/asfalto_rgh.webp', 'uAsfRgh')
  }

  /**
   * IL RIPETITORE E' `RepeatWrapping` E LE COORDINATE NON SI RIPIEGANO A MANO.
   *
   * Fare `fract(uv)` nello shader sembrerebbe piu' esplicito e invece rompe
   * tutto: sulla riga dove la coordinata torna a zero la derivata vale uno
   * invece di un millesimo, la mip salta al fondo della catena e compare una
   * riga sfocata attraverso la strada, una ogni metro e mezzo. Il ripiegamento
   * lo fa il campionatore, che sa distinguere il salto dalla pendenza.
   *
   * L'ANISOTROPIA A OTTO e' la stessa del resto del progetto, e qui serve piu'
   * che altrove: su un manto visto di striscio il rapporto fra i due assi del
   * pixel arriva a qualche centinaio, e senza anisotropia la mip viene scelta
   * sull'asse peggiore — cioe' a venti metri la grana sarebbe gia' sparita.
   * Otto campioni non bastano a coprire quel rapporto, e infatti il rilievo si
   * spegne comunque con la distanza: sono due difese per lo stesso problema.
   */
  private carica(url: string, nome: string) {
    /* E ASPETTA CHE L'AUTOMOBILE SIA IN SCENA — sono 1,51 megabyte in tre file,
       il gruppo piu' pesante rimasto sul percorso critico.
       Il manto compare nel terzo tempo del racconto, decine di secondi di
       scorrimento piu' tardi; queste tre tessiture partivano subito solo
       perche' `Lastra` nasce nel costruttore di «Esperienza» insieme a tutto il
       resto. Misurato in `strumenti/carico.mjs`: su 4G lento portavano via alla
       vettura circa sette secondi.
       Aspettare non costa niente qui, ed e' la ragione per cui questo e' il
       posto giusto dove metterlo: finche' le tessiture non arrivano lo shader
       disegna il ripiego da un pixel che sta gia' scritto sotto — il colore
       medio dell'asfalto — e nessuno vede la differenza, perche' in quel
       momento la strada non e' ancora in campo. */
    void dopoAuto.then(() => {
    new TextureLoader().load(url, (t) => {
      t.wrapS = t.wrapT = RepeatWrapping
      t.anisotropy = anisotropiaMassima()
      // NESSUNO SPAZIO COLORE DICHIARATO, nemmeno sul colore: la conversione
      // da sRGB a lineare la fa lo shader con un `pow` scritto. Vedi il
      // ragionamento nel ramo del manto — in due parole, la media misurata sul
      // file e' il perno di tutti i numeri dell'asfalto, e quella media deve
      // valere qualunque cosa three decida di fare con il formato hardware.
      t.needsUpdate = true
      // il ripiego a un pixel se ne va adesso: e' servito per i fotogrammi
      // fra la partenza e questo istante, e da qui in poi e' un byte fermo in
      // memoria video con un nome che dice il contrario di quello che fa
      ;(this.u[nome].value as Texture | null)?.dispose?.()
      this.u[nome].value = t
    })
    })
  }

  /**
   * @param acceso vero nel beat `velocita`. Prima di quello l'auto e' ferma —
   *   e ferma non vuol dire spenta: i fari illuminano, i lampioni passano
   *   sopra il muretto, il cielo e' quello. E' un'auto in sosta col motore
   *   appena avviato, che e' esattamente cio' che il beat racconta.
   * @param velocita `scorrimento.velocita`: progresso al secondo.
   */
  /**
   * QUANTO E' AVANTI IL FINALE, da 0 a 1.
   *
   * E' una proprieta' e non un parametro di `aggiorna` per una ragione sola:
   * quella firma la usano quattro strumenti, ed e' scritto nel contratto in
   * testa al file che non si tocca. Un valore in piu' passato di la' avrebbe
   * costretto a cambiarli tutti per una cosa che riguarda un beat solo.
   */
  /** il battito del lampeggiante: -1 blu, +1 rosso, 0 fra una battuta e
   *  l'altra. Lo legge `scene/Volante.ts`, che deve battere insieme a questa. */
  get lampo(): number {
    return this.u.uLampo.value as number
  }

  set finale(q: number) {
    const f = Math.min(Math.max(q, 0), 1)
    this.u.uFinale.value = f

    /* IL LAMPEGGIANTE — due impulsi corti, non una sinusoide.
     *
     * Un lampeggiante vero non dissolve: sbatte. La forma e' un ciclo da 1,05
     * secondi con dentro due battute per colore, ognuna lunga sette
     * centesimi — che e' la ragione per cui si riconosce con la coda
     * dell'occhio anche in uno specchietto.
     *
     * Il tempo lo prende dall'orologio e non dallo scorrimento, ed e' l'unica
     * cosa del sito che lo fa: una pattuglia lampeggia anche se ci si ferma.
     * Anzi soprattutto se ci si ferma.
     */
    this.u.uPolizia.value = Math.min(Math.max((f - 0.30) / 0.35, 0), 1)
    /* SUL BANCO DI PROVA LA FASE SI FISSA, e questa e' l'unica cosa del sito
       che ne aveva davvero bisogno: il commento qui sopra lo dichiara — il
       tempo arriva dall'orologio e non dallo scorrimento. Due rese dello stesso
       stato a due secondi di distanza colgono il lampeggiante in due battute
       diverse, e nella misura erano il 26% dello schermo.
       Si sceglie 0,03 e non zero: cade DENTRO la prima battuta blu, quindi sul
       banco il lampeggiante si vede acceso. Fissarlo su una fase spenta
       renderebbe ripetibile anche un lampeggiante rotto. */
    const t = QA ? 0.03 : (performance.now() / 1000) % 1.05
    const battuta = (a: number) => (t > a && t < a + 0.07) || (t > a + 0.14 && t < a + 0.21)
    this.u.uLampo.value = battuta(0.0) ? -1 : battuta(0.52) ? 1 : 0

    /* LA STRADA SI SPIANA, e non e' un abbellimento: e' quello che fa
     * combaciare le due righe.
     *
     * IL DIFETTO. La riga che sopravvive al finale e' l'orizzonte della
     * strada, cioe' i raggi con d.y uguale a zero DOPO la rotazione di
     * pendenza. Quella rotazione vale 8,4 gradi — la carreggiata sale — e
     * quindi l'orizzonte della strada NON e' l'orizzonte del mondo: con la
     * camera in bolla e il campo a trenta gradi cade al 22,4% dell'altezza
     * dello schermo invece che al 50%.
     *
     * Nel provino si vedevano due righe: quella di WebGL in alto e quella del
     * documento a meta'. Lo scambio, che questo finale esiste per nascondere,
     * era la cosa piu' visibile del fotogramma.
     *
     * LA CURA E' NELLA COSA STESSA. Non si sposta la riga del documento per
     * inseguire una pendenza: si toglie la pendenza. Una strada che si
     * spiana e' esattamente cio' che la specifica chiedeva — «la prospettiva
     * comincia a schiacciarsi» — e mentre lo fa porta il suo orizzonte a
     * coincidere con quello del mondo, cioe' a meta' schermo, dove la camera
     * in bolla lo mette per costruzione.
     *
     * Otto gradi e mezzo distribuiti su tutta la corsa sono un movimento che
     * non si legge come un movimento: si legge come la strada che smette di
     * salire.
     */
    const p = (STRADA.pendenza * Math.PI) / 180 * (1 - f)
    const v = this.u.uPendenza.value as { set: (x: number, y: number) => void }
    v.set(Math.cos(p), Math.sin(p))
  }

  /**
   * @param freno da 0 (niente) a 1 (ferma). Lo scrive il finale.
   *
   * L'UNICA COSA CHE PUO' FERMARE QUESTA STRADA E' UNA PATTUGLIA.
   *
   * Qui sotto c'e' scritto, per esteso, che il freno era stato tolto: c'era un
   * rallentamento automatico nell'ultimo tempo, il committente l'ha bocciato
   * perche' toglieva a chi guarda l'unica cosa che puo' fare, e la regola che
   * ne e' uscita — l'accelerazione e' il comando, non si spegne mai — e'
   * ancora buona e vale ancora.
   *
   * Questo freno non la viola: la conferma. Quello era il mondo che rallentava
   * da solo, per un'idea di regia, mentre chi guarda stava ancora spingendo.
   * Questo e' una volante che ti taglia la strada e ti si mette davanti — un
   * fatto che succede nella scena, con una causa che si vede.
   *
   * E finche' non lo fa nessuno frena: il freno arriva a 1 solo dopo che la
   * manovra e' finita. Il difetto che chiude e' quello che il committente ha
   * scritto in sei parole guardando lo schermo: «mi ha fermato la polizia
   * invece continua a muoversi». Un controllo dei documenti fatto a settanta
   * all'ora non e' una scena, e' un errore di continuita' — e in un finale che
   * si regge tutto sul fatto che quella pattuglia sia credibile, e' l'errore
   * che costa di piu'.
   */
  aggiorna(acceso: boolean, velocita: number, freno = 0) {
    // IL PASSO DI TEMPO SE LO MISURA DA SOLA, e non lo riceve.
    //
    // La firma non si tocca (la usa `Esperienza`), quindi il tempo si legge
    // dall'orologio. Va TAPPATO: chi cambia scheda per un minuto torna con un
    // delta da sessanta secondi, e senza tappo l'auto farebbe cinque
    // chilometri in un fotogramma — cioe' il tratteggio salterebbe di fase e
    // si vedrebbe uno strappo proprio al ritorno.
    const ora = performance.now() / 1000
    const dt = this.ultimo > 0 ? Math.min(Math.max(ora - this.ultimo, 0), 0.1) : 0
    this.ultimo = ora

    /* NIENTE FRENO NEL FINALE, E LA CORREZIONE VIENE DAL COMMITTENTE.
     *
     * C'era un freno che toglieva energia allo scorrimento durante l'ultimo
     * tempo: l'idea era che il mondo rallentasse da solo, «come quando una
     * ripresa si smorza». Sulla carta era regia; nei fatti toglieva a chi
     * guarda l'unica cosa che puo' fare — accelerare — e gliela toglieva
     * proprio nell'ultima schermata.
     *
     * E' la stessa lezione del movimento ridotto, arrivata due volte nello
     * stesso giorno: su questo sito l'accelerazione non e' un'animazione da
     * governare, e' il comando. Non si spegne mai, per nessun motivo.
     */
    const spinta = acceso ? 1 - Math.exp(-Math.max(velocita, 0) / ANDATURA.scala) : 0

    const fermo = Math.min(Math.max(freno, 0), 1)

    /* LA STRADA CORRE UGUALE PER TUTTI, ANCHE CON IL MOVIMENTO RIDOTTO.
     *
     * E' una decisione del committente, presa tre volte, e va scritta qui
     * perche' e' controintuitiva e perche' contraddice una regola che questo
     * progetto applica dappertutto: «AUTONOMO si toglie, COMANDATO resta»
     * (`core/Moto.ts`). La crociera e' autonoma — diciassette metri al secondo
     * che corrono senza che nessuno tocchi niente — quindi per quella regola
     * andrebbe tolta con la preferenza accesa.
     *
     * E' stata tolta, in due versioni diverse, e tutte e due erano sbagliate
     * dal punto di vista di chi guarda:
     *
     *   la prima spegneva TUTTA la strada — quattro interruttori per una cosa
     *   sola — e il committente ha visto un tempo intero in cui non succede
     *   niente: «la strada non si muove, non si muove neanche a scatti»;
     *
     *   la seconda toglieva solo la crociera e teneva il comando. Misurata,
     *   funzionava: 73 metri percorsi scorrendo, zero pixel di movimento a dito
     *   fermo. Ma resta un sito diverso per chi ha quella preferenza, e il
     *   committente l'ha rifiutata con una frase che chiude la questione:
     *   «deve funzionare sempre, altrimenti chi ce l'ha acceso non lo vede».
     *
     * LA RAGIONE PER CUI LA REGOLA NON SI APPLICA QUI. `core/Moto.ts` dice che
     * chi chiede `reduce` non deve ricevere MENO SITO, deve ricevere lo stesso
     * sito senza il movimento che gli fa male. Su questa pagina il moto della
     * strada non e' un ornamento sopra il contenuto: e' il contenuto. Toglierlo
     * non lascia lo stesso sito piu' quieto, lascia una fotografia di un sito.
     *
     * E IL COSTO VA SCRITTO, non nascosto: chi accende quella preferenza spesso
     * lo fa per un disturbo vestibolare, e una carreggiata che corre a schermo
     * pieno e' precisamente il caso per cui la preferenza esiste. Questa scelta
     * lo accetta. Tutto il resto del capitolo del movimento ridotto resta in
     * piedi e non e' in discussione — la grana della pellicola, la lancetta dei
     * giri, la vibrazione della camera, le code dello scorrimento: quelle sono
     * animazioni sopra il contenuto, e restano spente.
     *
     * `strumenti/fermo.mjs` e' stato aggiornato di conseguenza: congela lui la
     * strada e continua a verificare che tutto il resto stia fermo. Un cancello
     * che boccia una decisione presa fa politica, non misura. */
    /* E SUL BANCO DI PROVA CADE LA CROCIERA — non nel sito, dentro la misura.
       La crociera e' l'unica cosa di questa scena che avanza senza che nessuno
       tocchi niente, quindi due rese dello stesso stato a due secondi di
       distanza mostrano due tratti di strada diversi. Misurato: le tre tappe
       dentro l'abitacolo cambiavano del 7, del 15 e del 45 per cento fra due
       fotogrammi che dovevano essere identici.
       Si azzera solo il termine costante: la spinta dello scorrimento resta, e
       quindi il banco non mente sul meccanismo — se si scorre, la strada corre.
       E non c'entra con la preferenza del movimento ridotto: li' la crociera
       resta accesa, perche' e' una decisione del committente presa tre volte.
       Qui e' uno strumento che congela cio' che deve confrontare. */
    const crociera = QA ? 0 : ANDATURA.crociera
    this.bersaglio = acceso
      ? (crociera + (ANDATURA.punta - crociera) * spinta) * (1 - fermo)
      : 0

    // salita e discesa hanno costanti di tempo diverse: vedi ANDATURA
    /* E SUL BANCO LE DUE COSTANTI DI TEMPO CROLLANO. Salita e discesa valgono
       0,55 e 1,6 secondi perche' la strada si comporti come un motore, ed e'
       giusto: ma un secondo e mezzo di decelerazione dopo un salto di
       scorrimento vuol dire che due rese a due secondi di distanza mostrano due
       tratti di strada diversi. Azzerare la crociera non bastava — e infatti la
       misura restava rossa: la strada non correva piu' da sola, stava ancora
       rallentando. */
    const tau = QA ? 0.03
      : this.bersaglio > this.andatura ? ANDATURA.salita : ANDATURA.discesa
    const k = 1 - Math.exp(-dt / tau)
    this.andatura += (this.bersaglio - this.andatura) * k

    this.avanzamento = (this.avanzamento + this.andatura * dt) % STRADA.giro

    this.u.uAvanzamento.value = this.avanzamento
    this.u.uAndatura.value = this.andatura
    this.u.uSpinta.value = spinta
  }

  /**
   * TINGE LA STRADA DI UN COLORE PIATTO. Serve a una prova sola, ma serve
   * davvero: `strumenti/abitacolo_prova.mjs` verifica che il parabrezza sia
   * BUCATO tingendo di magenta cio' che ci sta dietro — perche' nella
   * fotografia c'e' gia' un colonnato illuminato oltre il vetro, e senza un
   * colore che in questa scena non esiste non si distingue una maschera che
   * funziona da una che non fa niente.
   *
   * Prima lo si faceva da fuori (`material.color.setRGB`). Con uno shader
   * quel campo non esiste, quindi la manopola si dichiara qui invece di
   * lasciare che uno strumento frughi dentro il materiale.
   */
  /**
   * Quanto e' illuminato il mondo oltre il parabrezza, da 0 a 1.
   *
   * Serve all'arrivo dal corridoio: li' si e' appena passata la lampada del
   * proiettore e non c'e' luce, quindi una strada a piena esposizione sarebbe
   * uno stacco — misurato, valeva 49 su una mediana di 4. Ed e' anche cio'
   * che succede davvero: chiunque abbia guidato di notte sa che nel primo
   * istante fuori da una galleria non si vede niente.
   *
   * MOLTIPLICA, non mescola. `tingi` esiste per la diagnostica e sostituisce
   * il colore: usarla per schiarire dava un parabrezza BIANCO PIENO, perche'
   * `tingi(1,1,1)` significa «tutto bianco» e non «tutto illuminato». Sono
   * due operazioni diverse che sembrano la stessa cosa fino al momento in cui
   * si guarda il fotogramma.
   */
  /*
   * LE PAROLE SULL'ASFALTO SONO STATE TOLTE, e la nota resta perche' l'idea era
   * buona e il difetto e' istruttivo.
   *
   * Erano dipinte come segnaletica: stessa vernice, stessa prospettiva, stessa
   * luce del faro addosso. Tecnicamente giusto — e ILLEGGIBILE. Una scritta sul
   * manto, vista da un'automobile bassa, si schiaccia contro l'orizzonte: le
   * lettere diventano una riga alta tre pixel prima di essere arrivate
   * abbastanza vicino da leggersi, e quando finalmente si aprono sono gia'
   * sotto le ruote. La segnaletica vera funziona perche' dice UNA parola
   * («STOP», «BUS») e perche' chi guida la conosce gia'.
   *
   * Il posto giusto per un testo che arriva non e' il pavimento: e' un piano
   * CORICATO ALL'INDIETRO, che dell'inclinazione ne prende quanto basta per
   * dare la fuga e non tanta da schiacciare le lettere. Vedi `scene/Scritta.ts`.
   */

  luce(v: number) {
    this.u.uLuce.value = Math.min(Math.max(v, 0), 1)
  }

  tingi(r: number, g: number, b: number) {
    ;(this.u.uTinta.value as Vector3).set(r, g, b)
    this.u.uForzaTinta.value = 1
  }

  nonTingere() {
    this.u.uForzaTinta.value = 0
  }

  /** si smonta tutto: serve agli strumenti, che costruiscono e buttano
   *  decine di scene in un caricamento solo */
  smonta() {
    this.mesh.geometry.dispose()
    this.materiale.dispose()
    // le tre fotografie pesano un megabyte e mezzo in memoria video, e gli
    // strumenti costruiscono e buttano decine di scene in un caricamento solo:
    // dimenticarle qui vuol dire finire la memoria a meta' di una corsa di
    // provini, che e' il genere di guasto che si presenta come «lento»
    for (const nome of ['uAsfCol', 'uAsfNor', 'uAsfRgh']) {
      ;(this.u[nome].value as Texture | null)?.dispose?.()
    }
  }
}

/**
 * PER `core/Esperienza.ts` — NIENTE. Non serve cambiare una riga.
 *
 * `this.lastra = new Lastra()`, `this.scena.add(..., this.lastra.mesh)`,
 * `this.lastra.mesh.visible = dentro` e
 * `this.lastra.aggiorna(this.regia.beat === 'velocita', this.scorrimento.velocita)`
 * continuano a dire esattamente quello che devono dire.
 *
 * DUE COSE DA SAPERE, PERO', SE UN GIORNO SI TOCCA QUEL FILE.
 *
 * 1. `public/lastra/strada.mp4` NON SERVE PIU' A NESSUNO. Sono 327 kB che
 *    non vengono piu' richiesti: si possono cancellare. Non l'ho fatto io
 *    perche' cancellare un asset e' una decisione di chi possiede il
 *    progetto, non di chi riscrive un file.
 *
 * 2. `Interno.ts` dichiara in testa (decisione D3-bis) che «fermo e video
 *    vengono dalla stessa sorgente». Non e' piu' vero, ed e' vero di piu':
 *    adesso non c'e' NESSUNA sorgente esterna, quindi non c'e' nessun momento
 *    in cui due sistemi di rendering debbano somigliarsi. Il commento andra'
 *    aggiornato — un commento che contraddice la riga sotto e' peggio di
 *    nessun commento, e questo file lo ha imparato da `Camera.ts`.
 */
