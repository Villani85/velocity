import { LAVORI, datiLavoro, quantiInLinea, quantiRicerca } from './Lavori'
import { t } from './Lingua'
import {
  DataTexture,
  LinearFilter,
  Mesh,
  AdditiveBlending,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three'

/**
 * IL QUADRO STRUMENTI — l'unica cosa viva dentro una fotografia.
 *
 * PERCHE' NON PUO' ESSERE UN FILMATO.
 *
 * L'abitacolo e' una fotografia, e va benissimo: li' la camera e' ferma.
 * Il quadro no. Tutta la decisione D5 del progetto vive qui — «lo scorrimento
 * governa l'INTENSITA', non la riproduzione» — e un quadro filmato ha un suo
 * tempo: chi scorre piano lo vedrebbe correre lo stesso, chi si ferma lo
 * vedrebbe andare avanti da solo.
 *
 * Sarebbe l'unica cosa del sito che non risponde alla mano. E si noterebbe
 * subito, perche' e' anche l'unica cosa che in quel momento si sta guardando.
 *
 * PERCHE' UNA TELA 2D E NON GEOMETRIA.
 *
 * Perche' un quadro strumenti contemporaneo E' uno schermo. Non ci sono
 * lancette meccaniche da modellare: c'e' un pannello che disegna archi,
 * numeri e spie. Disegnarlo con geometria 3D sarebbe imitare con i triangoli
 * una cosa che nasce come pixel — piu' lavoro, meno nitidezza, e la
 * tipografia verrebbe male.
 *
 * COSA FA UNA SUPERCAR VERA ALL'ACCENSIONE, in ordine:
 *
 *   1. AUTOTEST. Alla rotazione della chiave il contagiri va a fondo scala e
 *      torna, e con lui tutte le spie si accendono insieme per un istante.
 *      Non e' scenografia: e' una verifica prescritta, serve a far vedere al
 *      guidatore che nessuna lampada e' bruciata. E' anche il gesto che
 *      qualunque appassionato riconosce in un decimo di secondo.
 *   2. SPEGNIMENTO DELLE SPIE, a scaglioni. Non tutte insieme: prima quelle
 *      dei servizi, poi la pressione olio quando il motore prende giri.
 *   3. MINIMO IRREGOLARE. Un motore aspirato al minimo non sta fermo a 900:
 *      oscilla di qualche decina di giri. E' un dettaglio da niente e senza
 *      di esso il contagiri sembra un'immagine.
 *   4. POI SI GUIDA, e i giri seguono la mano.
 *
 * LA MARCIA SALE COI GIRI, e questo e' il pezzo che rende credibile tutto il
 * resto: quando il contagiri arriva in zona rossa la marcia scatta e i giri
 * CROLLANO, per poi risalire. E' il dente di sega di una cambiata, ed e' il
 * movimento che l'occhio associa alla velocita' piu' di qualunque numero.
 */

/**
 * LA TELA E' LARGA E BASSA — 1024 per 280, cioe' 3,66 a 1.
 *
 * Non e' una scelta grafica: e' il rapporto del riquadro che la fotografia
 * dell'abitacolo dichiara (`ABITACOLO.quadro`, da 0,325 a 0,462 in larghezza
 * e da 0,545 a 0,605 in altezza). Se i due rapporti non coincidono, il
 * disegno si deforma — e su un quadro strumenti la deformazione si vede
 * subito, perche' il quadrante dei giri smette di essere tondo.
 *
 * Alla prima stesura la tela era 1024 x 420 e il contenuto sbordava sul
 * cruscotto: il quadro vivo e' finito largo il doppio dello strumento vero.
 * I due numeri vanno cambiati insieme, sempre.
 */
/**
 * LA MISURA DELLA TELA — 720x204, non 1200x340.
 *
 * IL CONTO. Sullo schermo il quadro occupa un terzo scarso della larghezza del
 * fotogramma: su un monitor da 1600 sono cinquecentotrenta pixel. Disegnarne
 * milleduecento significa buttarne via piu' della meta' in ogni
 * rimpicciolimento — e pagarli tutti, due volte: una per disegnarli sulla tela,
 * una per caricarli sulla scheda video.
 *
 * 720 lascia ancora un margine del trentacinque per cento sopra la misura a
 * schermo, che serve a chi apre il sito su un pannello ad alta densita'.
 *
 * Il rapporto resta 3,53 a 1, perche' e' lo stesso del riquadro dichiarato in
 * `Abitacolo.quadro`: cambiarne uno solo stira le cifre. I due numeri vanno
 * cambiati insieme, sempre.
 *
 * E RESTA 720x204 ANCHE ORA CHE IL PANNELLO E' PIENO, ed e' la decisione che
 * ha richiesto piu' misure di tutto il resto del disegno.
 *
 * Passando da tre zone a sette la tentazione era salire a 960x272 — stesso
 * rapporto esatto, il 78% di campioni in piu' — per guadagnare nitidezza sulle
 * scritte di servizio. Misurato PRIMA di farlo, parcheggiati dentro
 * l'abitacolo a 1600x900, spegnendo e riaccendendo il quadro a blocchi
 * alternati dentro la stessa corsa:
 *
 *     quadro spento     p50 16,7    p95 20,5     — sessanta al secondo pieni
 *     quadro acceso     p50 15,8    p75 83,4     — la mediana non lo sente
 *
 * Cioe': il quadro non costa NIENTE ai fotogrammi in cui non si carica la
 * tela, e costa quasi tutto il fotogramma a quelli in cui si carica. Il ritmo
 * a ventiquattro fa cadere il caricamento su due fotogrammi su cinque, e la
 * mediana resta dalla parte buona.
 *
 * MA C'E' UNO SCALINO, e si e' visto girare. Il ritmo dice «ridisegna quando
 * sono passati 41,7 ms»: finche' il fotogramma medio costa meno di 41,7 ms si
 * carica ogni due fotogrammi; appena costa di piu' si carica a OGNI fotogramma
 * e il costo raddoppia di colpo. In una corsa fatta mentre la macchina era
 * occupata da altro la mediana e' saltata da 16 a 50 ms — non per un fotogramma
 * piu' caro, ma perche' il conto era passato dall'altra parte dello scalino.
 * A 960x272 il caricamento cresce del 78% e ce lo butta dentro da fermo.
 *
 * E IL DISEGNO IN SE' NON C'ENTRA, che era l'altra cosa da verificare prima di
 * accusarlo: la tela piena delle sette zone nuove si dipinge in 0,10 ms
 * (mediana di 120 chiamate), e confrontata a blocchi alternati con la stessa
 * tela ridotta alle sole tre zone di prima da 50,6 ms contro 49,8. La
 * differenza fra sette zone e tre zone non si misura. Quello che si misura e'
 * quanti pixel si spediscono alla scheda video, e quelli non sono cambiati.
 *
 * La nitidezza si guadagna quindi con i corpi, non con la risoluzione: le
 * scritte di servizio stanno a 0,05 della tela, che a 204 sono dieci pixel,
 * ed e' lo stesso corpo che «POTENZA» aveva gia' e che si e' sempre letto.
 */
const L = 512
const A = 145

/**
 * QUANTO PIU' FINE SI DISEGNA DI QUANTO SI PROGETTA.
 *
 * Il committente ha guardato l'abitacolo e ha scritto «la qualita' bassa del
 * contachilometri». Misurato: la tela e' 512 per 145, e sullo schermo il
 * pannello sta su circa 930 per 264 px. Cioe' l'immagine viene INGRANDITA di
 * 1,82 volte, e su un quadrante fatto di archi sottili e di tacche l'occhio se
 * ne accorge subito — il testo grande regge, i segni fini no.
 *
 * E NON SI RISCRIVONO MILLECINQUECENTO RIGHE DI COORDINATE. Tutto il disegno e'
 * espresso in frazioni di `L` e di `A`, con qualche spessore di tratto in
 * pixel: raddoppiare le due costanti scalerebbe le posizioni e i corpi
 * tipografici ma NON gli spessori scritti a mano, e il quadro verrebbe fuori
 * con tutti i filetti dimezzati. Invece si tiene il disegno nelle sue unita' e
 * si scala il CONTESTO: `setTransform` moltiplica tutto — coordinate, corpi,
 * spessori, raggi — e non c'e' niente da ricontrollare a mano.
 *
 * DUE E NON TRE. La tela va riletta in memoria centrale a ogni disegno
 * («consegna»), e quella lettura cresce con l'area: da 512x145 a 1024x290 sono
 * quattro volte i byte. A tre volte sarebbero nove, ed e' un prezzo che questa
 * scena non ha — il quadro e' gia' stato la cosa piu' costosa del progetto,
 * trentacinque millisecondi per fotogramma, e la cura sta scritta piu' sotto.
 * A due il pannello e' disegnato piu' fine di come si vede, che e' esattamente
 * la condizione in cui un ingrandimento non si nota.
 */
const K = 2
/** la tela vera, in pixel: e' qui che si misura la nitidezza */
const LP = L * K
const AP = A * K
// 512x145 E NON 720x204, ED E' UNA MISURA CONTRO UN'ALTRA.
//
// Il costo di questo quadro e' tutto nel caricamento della tela sulla scheda, e
// quel caricamento cresce coi PIXEL. Scendendo da 147 mila a 74 mila se ne
// spediscono la meta'.
//
// Il prezzo e' la nitidezza, e va guardato invece che temuto: sullo schermo il
// pannello e' largo un terzo scarso del fotogramma, cioe' circa cinquecento
// pixel su un monitor da milleseicento. A 512 di tela il rapporto e' uno a uno:
// non si sta piu' sovracampionando, ma non si sta nemmeno stirando. Il margine
// che si perde e' quello per i pannelli ad alta densita', ed e' un margine —
// non nitidezza vera.
//
// Il rapporto 3,53 a 1 resta identico, perche' e' lo stesso del riquadro
// dichiarato in `Abitacolo.quadro`: cambiarne uno solo stira le cifre. I due
// numeri vanno cambiati insieme, sempre.
//
// E IL «RAPPORTO UNO A UNO» QUI SOPRA E' SBAGLIATO, misurato invece che
// stimato. Proiettando i quattro angoli del piano `QUADRO_VIVO` dentro
// l'abitacolo a 1600x900, il quadro occupa 936 pixel di larghezza e 275 di
// altezza — il 58% del fotogramma, non un terzo. La stima veniva dal riquadro
// dichiarato in `Abitacolo.quadro` (0,33 dell'IMMAGINE), ma la fotografia si
// ritaglia per riempire lo schermo, e cio' che si ritaglia ingrandisce.
//
// Quindi la tela da 512 non e' pari a schermo: viene STIRATA di 1,83 volte. Il
// numero non cambia la decisione — dimezzare i pixel non aveva cambiato i tempi
// (§17.2), quindi risalire non li peggiorerebbe ma nemmeno li migliorerebbe, e
// lo scalino del ritmo resta li' ad aspettare — ma cambia dove si guadagna
// nitidezza: sui CORPI. Una scritta a sei pixel di tela ne fa undici a schermo,
// ed e' su quel numero che va giudicata, non sulla tela ingrandita.

/** il regime massimo, in giri al minuto */
const GIRI_MAX = 9000
/** dove comincia la zona rossa */
const ROSSO = 7600
/** i rapporti, con la velocita' massima di ciascuno in km/h */
const MARCE = [78, 128, 176, 224, 268, 310, 350]

/**
 * LE TRE TINTE, e sono tre perche' un quadro strumenti non colora per
 * decorare: colora per dire A CHE PUNTO SI E'. Freddo vuol dire «c'e'
 * margine», ambra «ci sei quasi», caldo «sei oltre». La stessa scala vale sui
 * segmenti della potenza, sulle luci di cambiata e sulle celle della batteria,
 * e vale perche' e' sempre la stessa: tre colori usati in tre modi diversi
 * sarebbero tre codici da imparare.
 */
/* LE ETICHETTE NON SONO PIU' AZZURRE, e i filetti si'.
   L'audit chiede che il cruscotto e la hero sembrino due stati dello stesso
   sistema, e nota giustamente che il pannello porta dentro un azzurro che nella
   prima schermata non esiste. Ma la correzione non e' «via tutto l'azzurro»:
   il quadrante DEVE essere azzurro, perche' e' uno strumento e l'azzurro e' il
   colore con cui uno strumento si legge da sempre.
   La riga di confine e' fra il colore dello STRUMENTO e quello del TESTO. Le
   lancette, la corona, i filetti e le luci restano azzurri — sono lo strumento.
   Le etichette (SCORRIMENTO, RENDER, INPUT, MARCIA) passano all'avorio del
   resto del sito: sono parole, e le parole di questo sito hanno un colore solo.
*/
const FREDDO: readonly [number, number, number] = [110, 214, 255]
const AMBRA: readonly [number, number, number] = [255, 195, 70]
const CALDO: readonly [number, number, number] = [255, 70, 62]

/** la concatenazione a mano si ripeteva quaranta volte e rendeva illeggibili
 *  proprio le righe in cui conta vedere il valore dell'opacita' */
const rgba = (c: readonly [number, number, number], a: number) =>
  'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'

/**
 * LA CORNICE — di quanto il vetro sta dentro la scocca.
 *
 * E' la cosa che mancava di piu' e non si vedeva perche' mancava: finche' il
 * disegno arrivava fino al taglio della tela, il pannello non aveva bordi, e
 * una cosa senza bordi non e' un oggetto — e' uno sfondo. Chi guardava vedeva
 * dei numeri accesi sul cruscotto, non uno strumento.
 *
 * QUATTRO PIXEL DI TELA, e vanno letti a schermo e non sulla tela. Misurato
 * proiettando i quattro angoli del piano nell'abitacolo a 1600x900: il quadro
 * occupa 936 pixel di larghezza, cioe' la tela da 512 viene INGRANDITA 1,83
 * volte. Quattro pixel di margine diventano sette a schermo — abbastanza da
 * vedersi come uno stacco, troppo pochi per leggersi come un passe-partout.
 *
 * Il raggio e' un decimo dell'altezza: piu' stretto sembra una finestra di
 * sistema operativo, piu' largo sembra un tablet.
 */
const BORDO = Math.round(A * 0.028)
const RAGGIO = A * 0.105

/**
 * LE COLONNE DEL PANNELLO — dove finisce una zona e comincia l'altra, in
 * frazione di larghezza.
 *
 * Stanno tutte qui, e insieme, perche' spostarne una sola e' il modo in cui un
 * quadro strumenti torna a sembrare mezzo vuoto: un filetto serve a dire dove
 * finisce una zona e comincia l'altra, e un filetto che non cade in mezzo a
 * niente si legge come un graffio sul vetro.
 *
 * Da sinistra: energia | potenza | fari | quadrante | velocita' | viaggio.
 *
 * SETTE CONFINI PER SEI ZONE, e i filetti sono i cinque di mezzo — si ricavano
 * invece di riscriverli. Prima erano una lista a parte di quattro, e mancava
 * proprio quello fra la spia dei fari e il quadrante: le due zone erano
 * dichiarate a parole nel commento e disegnate come una sola. Tenendo una lista
 * sola non ci puo' piu' essere uno scarto fra cio' che il commento promette e
 * cio' che si vede.
 */
/* CINQUE ZONE E NON PIU' SEI: quella della spia dei fari e' sparita e i suoi
   sette centesimi sono andati al quadrante, che e' il protagonista e ne aveva
   bisogno. Il pannello e' piu' vuoto e si legge meglio — e' il venti per cento
   di «interfaccia da corsa» in meno chiesto dal committente, tolto dove non
   costava nessuna informazione. */
const ZONE = [0, 0.137, 0.250, 0.640, 0.855, 1]
const FILETTI = ZONE.slice(1, -1)

/**
 * QUANTO E' PIU' CHIARO IL FONDO DI OGNI ZONA, uno per zona.
 *
 * Sono numeri minuscoli — dal 6 al 30 per mille — e devono restarlo: il
 * materiale moltiplica per 1,35 sopra una strada che sta gia' a mezza scala, e
 * un fondo che sale troppo supera la soglia del bagliore, fiorisce e SI MANGIA
 * I PROPRI BORDI. Il pannello tornerebbe la macchia da cui e' partito.
 *
 * Servono lo stesso, perche' un filetto da solo dice «qui c'e' una riga»,
 * mentre due fondi diversi ai suoi lati dicono «qui finisce una superficie e ne
 * comincia un'altra». E' la differenza fra un foglio rigato e sei riquadri.
 *
 * Il quadrante e' il piu' chiaro perche' e' il centro della composizione, e le
 * due zone di servizio — potenza e velocita' — le piu' scure: cosi' i numeri
 * protagonisti stanno sul fondo piu' scuro e staccano di piu'.
 */
const VELI = [0.020, 0.007, 0.030, 0.007, 0.019]

const X_POTENZA = L * 0.193
const X_VELOCITA = L * 0.7475
/* LA COLONNA DI DESTRA SI SPOSTA DENTRO — 0,9045 e non 0,9275.
   Misurato con il carattere vero: «SCORRIMENTO» e' larga 73,6 pixel sulla tela
   da 512, e centrata a 474,9 arrivava a 511,7 — cioe' sul bordo esatto del
   pannello, dove l'angolo arrotondato la tagliava. Non era una questione di
   gusto: era una parola che non ci stava, e una revisione esterna l'ha
   fotografata prima che la vedessi io.
   A 0,9045 la stessa parola arriva a 499,8 e restano dodici pixel di aria.
   Sotto c'e' anche una difesa che vale per qualunque parola futura. */
const X_VIAGGIO = L * 0.9045
/** l'aria che deve restare fra la fine di una parola e il bordo della tela */
const ARIA_BORDO = 12

/**
 * IL QUADRANTE, e i tre numeri da cui dipende tutto il resto del centro.
 *
 * Il raggio e' sceso da 0,355 a 0,300 della tela quando le zone sono passate
 * da tre a sette: il pannello occupa lo stesso rettangolo di mondo, quindi
 * ogni frazione guadagnata dalle zone nuove esce da qualcosa. Il quadrante era
 * l'unico che poteva permetterselo, perche' e' l'unica cosa del quadro che si
 * legge per POSIZIONE e non per forma — un angolo si riconosce anche piccolo,
 * una cifra no.
 *
 * Il centro e' sceso a 0,585 dell'altezza per fare posto sopra all'orologio e
 * alle luci di cambiata, che dividono la stessa fascia.
 */
/* AL CENTRO DELLA SUA ZONA, e prima non lo era: la zona del quadrante va da
   0,250 a 0,640 da quando la spia dei fari e' stata tolta, cioe' ha il centro
   a 0,445.
   Diciassette pixel di scarto su un pannello da 512 non sembrano niente
   scritti; guardati, sono venticinque pixel d'aria a sinistra del quadrante e
   centotrenta a destra. Era quella la fascia vuota che si vedeva nella zona
   centrale, e non un problema di quanta roba c'e' dentro. */
const CX = L * 0.445
const CY = A * 0.585
const R = A * 0.300

/* LA CARICA, L'AUTONOMIA, IL PARZIALE E IL TOTALIZZATORE SONO STATI TOLTI.
   Erano quattro numeri che non misuravano niente — 87 per cento, 470 km di
   crociera, 128,4 di parziale, 14208 di totale — costruiti con cura, con
   dentro perfino il consumo che sale con la velocita'. Il lavoro era buono e
   l'oggetto era falso. Al loro posto ci sono i numeri della scheda video, che
   stanno in `misura()` e si possono verificare aprendo gli strumenti del
   browser. Vedi `fotogramma()` e `carico()`. */

export class Quadro {
  readonly mesh: Mesh
  /**
   * LA TELA NON E' PIU' LA SORGENTE DELLA TESSITURA, ed e' tutta qui la cura.
   *
   * IL DIFETTO. Un fotogramma su tre — quello in cui il quadro si ridisegna —
   * costava 110 ms contro i 17 di tutti gli altri. Nei due tempi dentro
   * l'abitacolo la mediana restava buona e il novantesimo percentile stava a
   * centodieci: il quadro andava a scatti proprio dove doveva stupire.
   *
   * DOVE NON ERA. Tre misure, ognuna delle quali toglie un sospetto:
   *
   *   registrare il disegno sulla tela        1,2 ms
   *   costringere la tela a rasterizzare      3,1 ms   (`getImageData` di 1 px)
   *   fabbricare una `ImageBitmap` dalla tela 1,5 ms
   *
   * Cinque millisecondi in tutto. Non era il disegno, non era la
   * rasterizzazione differita del canvas 2D, e non era la mole dei dati: 512x145
   * in RGBA sono 297 kB, che si copiano in un decimo di millisecondo.
   *
   * DOV'ERA. Era `texImage2D` che prende come sorgente L'ELEMENTO CANVAS. Quel
   * canvas vive sulla scheda video, in un contesto suo, e usarlo come sorgente
   * di una tessitura WebGL costringe i due contesti a sincronizzarsi: il
   * caricamento aspetta che il disegno 2D sia finito E che la scheda abbia
   * smesso di leggere la tessitura di prima. E' un'attesa, non un trasferimento
   * — ed e' per questo che nessuna delle cure «da manuale» aveva funzionato:
   *
   *   `willReadFrequently: true`   53 -> 111 ms   raddoppia
   *   due tessiture alternate      83 -> 106 ms   peggiora
   *   `flipY = false`              nessun cambio
   *   meta' dei pixel              nessun cambio
   *
   * L'ultima e' la piu' istruttiva e l'avevo scritta senza trarne la
   * conseguenza: se il costo non scende dimezzando i dati, il collo non e' il
   * tubo. E' chi sta all'altro capo.
   *
   * LA CURA. Si legge la tela UNA VOLTA in memoria centrale — `getImageData`,
   * i 3,1 ms misurati sopra — e si consegna alla scheda un semplice vettore di
   * byte. Una `DataTexture` non ha nessun canvas dietro: non c'e' niente da
   * sincronizzare, e il caricamento torna a costare quello che dovrebbe.
   *
   *   novantesimo percentile, tempi interni   109,6 -> 20,9 ms
   *
   * E si noti cosa NON e' cambiato: il disegno e' rimasto identico, riga per
   * riga. Non si e' rifatto lo strumento in WebGL — che era il piano, ed era un
   * lavoro di giorni. Si e' cambiata la strada per cui i pixel gia' disegnati
   * arrivano alla scheda.
   */
  private tela: HTMLCanvasElement
  private c: CanvasRenderingContext2D
  /** i pixel del quadro in memoria centrale: e' questa la sorgente vera */
  private pixel: Uint8Array
  private tessitura: DataTexture

  /** stato continuo, cosi' il disegno non sa niente della regia */
  private giriDisegno = 0
  private velocita = 0
  private marcia = 0
  private spie = 0
  /** quanto il pannello deve farsi indietro, 1 pieno: lo scrive il finale */
  velo = 1

  private acceso = 0
  private tempo = 0


  constructor() {
    this.tela = document.createElement('canvas')
    this.tela.width = LP
    this.tela.height = AP
    this.c = this.tela.getContext('2d')!
    // NIENTE `willReadFrequently` PUR LEGGENDO A OGNI GIRO, e sembra assurdo.
    //
    // La bandiera esiste esattamente per questo caso ed e' stata misurata: da
    // 53 a 111 ms, RADDOPPIA. Dice al browser di tenere la tela in memoria
    // centrale, e con lei se ne va l'accelerazione del disegno 2D — questo
    // quadro e' fatto di sfumature e di aloni sfocati, che in software costano
    // tre volte quello che si guadagna sulla rilettura. La rilettura di una
    // tela accelerata costa 3,1 ms e va benissimo cosi'.
    this.pixel = new Uint8Array(LP * AP * 4)
    // UNA `DataTexture` E NON UNA `CanvasTexture`: il perche' sta per esteso
    // sulle dichiarazioni in testa alla classe. In due parole: una tessitura
    // che ha per sorgente un elemento canvas costringe il contesto 2D e quello
    // WebGL a mettersi d'accordo a ogni caricamento, e quell'accordo costava
    // centodieci millisecondi. Un vettore di byte non ha nessuno con cui
    // mettersi d'accordo.
    this.tessitura = new DataTexture(this.pixel, LP, AP)
    this.tessitura.colorSpace = SRGBColorSpace
    // SI CAPOVOLGE, e va detto perche' e' l'unica differenza di comportamento
    // fra le due: `getImageData` rende le righe dall'alto in basso, mentre una
    // tessitura le vuole dal basso. Una `CanvasTexture` alza questa bandiera da
    // sola, una `DataTexture` no — e senza, il quadro esce a testa in giu'.
    this.tessitura.flipY = true
    // NIENTE MIPMAP: la tela cambia di continuo, e rigenerare la piramide a
    // ogni caricamento costa piu' del disegno. Il quadro sullo schermo e'
    // piccolo e non si rimpicciolisce mai oltre, non servono.
    this.tessitura.generateMipmaps = false
    this.tessitura.minFilter = LinearFilter
    this.tessitura.magFilter = LinearFilter

    this.mesh = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({
        map: this.tessitura,
        transparent: true,
        // SI SOMMA, perche' e' proiettato sul vetro e non stampato: la strada
        // continua a vedersi sotto il quadrante, ed e' quella trasparenza a
        // dire «riflesso» invece che «adesivo». Il fondo scuro del pannello,
        // sommandosi, sparisce da solo — e' l'unico modo di avere un pannello
        // con un fondo disegnato che sul vetro non lascia un rettangolo.
        blending: AdditiveBlending,
        // OLTRE L'UNO, ed e' quello che lo fa BRUCIARE.
        //
        // Una tela e' a otto bit: il suo bianco vale 1,0, e 1,0 sta sotto la
        // soglia del bagliore (2,6) — quindi per quanto luminoso lo si
        // disegni, un quadro dipinto su tela non si accende mai davvero.
        // Moltiplicando il materiale per 3,1 il fondo scuro resta scuro (0,02
        // diventa 0,06) e solo cio' che e' stato disegnato vicino al bianco
        // supera la soglia e prende l'alone.
        //
        // E' la stessa cosa che fa un pannello vero: il nero dello schermo
        // spento e il bianco di un pixel acceso non sono due grigi lontani,
        // sono due ordini di grandezza.

        // NON TONE-MAPPATO e non illuminato: e' uno schermo che EMETTE. Se
        // passasse per la curva di esposizione della scena si spegnerebbe
        // insieme alla notte, e uno schermo che si spegne col buio e' la cosa
        // meno credibile che ci sia.
        toneMapped: false,
        depthWrite: false,
        // E NEMMENO SI CONFRONTA CON LA PROFONDITA'.
        //
        // Il pannello sta ESATTAMENTE sul piano della fotografia
        // dell'abitacolo — stessa distanza dalla camera, per costruzione: il
        // suo riquadro e' dichiarato in coordinate di quell'immagine. Due
        // superfici alla stessa profondita' si contendono il test e vince
        // quella disegnata prima, che e' la fotografia. Risultato: il quadro
        // esisteva, era acceso, e non si vedeva — nel ritaglio del provino
        // quella zona era nera pulita.
        //
        // Spostarlo di qualche millimetro verso la camera funzionerebbe finche'
        // nessuno cambia la distanza del piano. Toglierlo dal confronto
        // funziona sempre, e qui e' anche corretto: fra il quadro e l'occhio
        // non c'e' niente, per definizione — e' il piano piu' vicino della
        // scena interna.
        depthTest: false,
        fog: false,
      }),
    )
    // 1,35 da quando il quadro si somma invece di coprire: sommando, i valori
    // si aggiungono a quelli della strada sotto, che di suo sta gia' a mezza
    // scala. Tenere 1,95 significava superare la soglia del bagliore anche sui
    // grigi, e il pannello tornava a essere una macchia.
    //
    // Prima: 1,95 e non 3,1. A 3,1 la soglia del bagliore (2,6) la superava anche il
    // GRIGIO delle cifre, non solo il loro bordo: nel provino «19» era una
    // macchia bianca senza forma e il numero della marcia idem. A 1,95 solo il
    // bianco pieno e il nucleo dell'arco ci arrivano, e l'alone torna a essere
    // un contorno invece che una nebbia. Si scrive dopo la
    // costruzione perche' `color` nel costruttore passa per il costruttore di
    // Color, che serra i valori a uno.
    ;(this.mesh.material as MeshBasicMaterial).color.setScalar(1.35)
    this.mesh.name = 'QUADRO_VIVO'
    this.mesh.renderOrder = 10
    this.mesh.visible = false
  }

  /**
   * Si aggancia al riquadro che la fotografia dell'abitacolo dichiara: e'
   * l'abitacolo a sapere dove cade il suo quadro, perche' dipende
   * dall'inquadratura e dal formato dello schermo.
   */
  /**
   * @param ritira da 0 a 1: quanto il quadro rientra nella plancia.
   *
   * IL CRUSCOTTO NON PUO' OCCUPARE IL QUARANTA PER CENTO DELLO SCHERMO PER
   * TUTTO IL CAPITOLO, e la revisione l'ha detto nel modo giusto: «la strada —
   * cioe' il soggetto — resta una fascia sottile».
   *
   * Ha ragione a meta', ed e' la meta' che conta. Nel capitolo del motore il
   * quadro E' il soggetto: e' li' che si accende, che fa l'autotest, che
   * dimostra la tesi del sito — «piu' forte scorri, piu' forte va». Li' deve
   * essere grande. Ma quando comincia la strada il soggetto cambia, e un
   * pannello che resta della stessa misura non e' piu' protagonista: e'
   * ingombro.
   *
   * Quindi non si rimpicciolisce e basta: si RITIRA, e solo dove serve.
   *
   * E RIENTRA DAL BASSO, non si stringe al centro. Il bordo inferiore resta
   * dov'e' e il pannello si abbassa dentro la plancia — che e' cio' che fa un
   * quadro a scomparsa vero, ed e' anche l'unico modo perche' il movimento si
   * legga come una MECCANICA invece che come una transizione CSS. Restringersi
   * attorno al proprio centro lascerebbe un vuoto sotto, e sotto c'e' la
   * fotografia di una plancia: si vedrebbe il taglio.
   */
  posiziona(
    riquadro: { centro: Vector3; larghezza: number; altezza: number },
    versoCamera: Vector3,
    ritira = 0,
  ) {
    const r = Math.min(Math.max(ritira, 0), 1)
    // 0,34: dal quaranta per cento di schermo si scende attorno al ventisei
    const k = 1 - 0.34 * r
    this.mesh.position.copy(riquadro.centro)
    // meta' dell'altezza persa, verso il basso: il bordo sotto non si muove
    this.mesh.position.y -= riquadro.altezza * (1 - k) * 0.5
    this.mesh.scale.set(riquadro.larghezza * k, riquadro.altezza * k, 1)
    this.mesh.lookAt(versoCamera)
  }

  /**
   * @param avvio da 0 a 1: quanto e' avanzata l'accensione
   * @param spinta da 0 a 1: quanto forte si sta scorrendo
   * @param dt secondi dal fotogramma prima
   */
  /**
   * QUANTE VOLTE AL SECONDO SI RIDISEGNA LA TELA.
   *
   * IL DIFETTO, misurato spegnendo un pezzo per volta dentro l'abitacolo:
   *
   *     tutto acceso        p50  52,1 ms
   *     senza quadro        p50  16,6 ms
   *     senza strada        p50  16,5 ms
   *     senza bloom         p50  17,0 ms
   *     senza abitacolo     p50  16,6 ms
   *
   * Il quadro da solo costava TRENTACINQUE MILLISECONDI per fotogramma, cioe'
   * due budget interi a sessanta al secondo, e tutto il resto della scena
   * insieme ne costava sedici. Da fuori si vedeva come «l'abitacolo va a scatti»
   * e sembrava un problema di quanti pixel si disegnano; era invece una tela
   * 2D ridisegnata e ricaricata sulla scheda video sessanta volte al secondo.
   *
   * VENTIQUATTRO E NON SESSANTA. Non e' un compromesso: e' la frequenza a cui
   * un occhio smette di distinguere i passaggi su una cifra che cambia. Il
   * cinema ne usa ventiquattro da un secolo. Le lancette e i numeri di un
   * quadro non hanno bisogno di piu' di quanto ne abbia bisogno un film.
   *
   * E il resto della scena continua a girare a sessanta: e' importante, perche'
   * la fluidita' la si giudica sul MOVIMENTO — la strada che scorre, la camera
   * che si muove — non su un numero che sale.
   */
  /* 1/30 e non piu' 1/24: da quando il caricamento non passa piu' dalla tela
     (vedi la nota in testa alla classe) un aggiornamento costa cinque
     millisecondi invece di centodieci, e il tetto puo' salire. Trenta al
     secondo e' il punto in cui l'arco del contagiri smette di scattare. */
  private static readonly RITMO = 1 / 30

  /**
   * E UN LIMITE ANCHE SUL CONTEGGIO DEI FOTOGRAMMI, non solo sul tempo.
   *
   * Il limite a tempo da solo ha un anello di retroazione, e ci sono cascato.
   * Funziona cosi': si ridisegna quando sono passati 1/24 di secondo. Ma il
   * disegno costa — anzi, costa il CARICAMENTO della tela sulla scheda, 38 ms
   * misurati — quindi appena un fotogramma supera i 41 millisecondi il tempo
   * accumulato basta sempre, e il quadro torna a ridisegnarsi a ogni giro. Il
   * che rallenta ancora, il che garantisce che basti di nuovo.
   *
   * Nella misura per capitolo si vedeva bene: `accensione` restava a 19 ms di
   * mediana, `velocita` era caduta nell'anello e stava a 50. Stesso codice,
   * due comportamenti, perche' uno dei due era partito un filo piu' lento.
   *
   * Un limite legato al CONTEGGIO non puo' scappare: uno su tre e' uno su tre
   * qualunque cosa succeda. A sessanta fotogrammi fa venti aggiornamenti al
   * secondo, e se la scena rallenta rallenta anche lui — degrada, invece di
   * peggiorare.
   */
  private static readonly OGNI = 2
  private daUltimo = 0
  private giri = 0

  /**
   * I NUMERI VERI, e sono l'unica cosa che questo quadro non inventa.
   *
   * PERCHE' ESISTONO. Il pannello e' nato pieno di dati da automobile: 87 per
   * cento di carica, 406 chilometri di autonomia, un parziale a 128,4 e un
   * totalizzatore a 14208. Nessuno di quei numeri misurava niente. Erano
   * esattamente la cosa che ho tolto dalla hero — le statistiche inventate — e
   * che qui era rimasta perche' «fa vero».
   *
   * Non fa vero: fa videogioco. Un cruscotto che dichiara un'autonomia che non
   * esiste e' la stessa promessa vuota di un sito che dichiara «+300%
   * conversioni», e su un portfolio che vende rigore tecnica e' un
   * autogol. La differenza fra uno strumento e la sua icona non e' quante
   * cifre ci sono: e' se le cifre rispondono a qualcosa.
   *
   * COSA RESTA FINTO, E VA BENE. Il regime e la marcia sono legati allo
   * scorrimento — «piu' forte scorri, piu' forte va» e' la tesi dichiarata del
   * sito, non una bugia — e la velocita' e' la stessa cosa in un'altra unita'.
   * L'ora e' l'ora vera del dispositivo. Quello che se ne va e' solo cio' che
   * fingeva di misurare un mondo che non c'e'.
   */
  /**
   * QUANTO E' AVANTI IL CONTROLLO, da 0 a 1.
   *
   * Alla fine della corsa la volante ferma l'automobile e chiede i documenti.
   * Il quadro strumenti smette di essere un cruscotto e diventa la scheda dei
   * lavori: e' il pezzo di regia che tiene insieme le due cose che questo sito
   * deve fare — raccontare, e mostrare le prove.
   *
   * Non e' una schermata nuova che compare sopra: e' LO STESSO pannello che
   * cambia contenuto. Un pannello che si sostituisce sarebbe un footer con
   * un'animazione davanti; uno che si riscrive e' l'oggetto che risponde.
   *
   * Fra 0 e 1 le due facce si sovrappongono, e la sovrapposizione dura poco:
   * a meta' strada si leggerebbero tutte e due e non si leggerebbe niente.
   */
  documenti = 0

  /**
   * LO SPEGNIMENTO DEL CRUSCOTTO, da 0 a 1, e VIENE PRIMA DEI DOCUMENTI.
   *
   * Era la contraddizione piu' imbarazzante del finale, e l'ha vista il
   * committente in un fotogramma: mentre sullo schermo campeggia la parola
   * DOCUMENTI — cioe' «fammi vedere le credenziali» — il quadro strumenti
   * stava ancora mostrando 24 FPS e 42 millisecondi. Chiedere le credenziali
   * ed esibire la peggiore che si ha e' comico nel modo sbagliato: un
   * direttore tecnico che riceve questo sito legge «documenti», legge «24
   * FPS», e ha gia' finito di valutare.
   *
   * La cura non e' nascondere il numero: e' che quel pannello, in quel
   * momento, non deve piu' parlare dell'automobile. La pattuglia non chiede i
   * dati del motore — chiede chi sei e cosa hai costruito.
   *
   * Quindi il cruscotto si spegne PRIMA che la parola arrivi, non dopo, e
   * quello che resta acceso e' un pannello vuoto: e' su quel vuoto che
   * atterra DOCUMENTI, ed e' li' che poi si riscrivono le credenziali.
   */
  spegnimento = 0

  /** quale lavoro sta guardando la vetrina: la riga corrispondente si accende */
  lavoroScelto = 0

  /** quale tempo si sta guardando, quanti sono, e come si chiama */
  /* I TRE CAMPI DELLA SCENA SONO RIMASTI, e non e' una dimenticanza: li
     scrive `core/Esperienza.ts` a ogni fotogramma e non costano niente. Il
     giorno in cui il pannello dovesse tornare a dire dove si e' — per esempio
     su un telefono, dove la rotaia non c'e' — il dato e' gia' qui. */
  scenaNumero = 1
  scenaTotale = 7
  scenaNome = ''

  private ms = 0
  private chiamate = 0
  private triangoli = 0
  private ingresso = 0

  /**
   * @param ms tempo per fotogramma misurato dal gestore di qualita'
   * @param chiamate quante volte la scheda e' stata chiamata a disegnare
   * @param triangoli quanti triangoli sono passati nell'ultimo fotogramma
   */
  misura(ms: number, chiamate: number, triangoli: number) {
    // LE MEDIE SONO GIA' FATTE A MONTE per il tempo, ma non per gli altri due,
    // e senza smorzamento le cifre ballano di continuo — un numero che cambia
    // sessanta volte al secondo non si legge, lampeggia. Un decimo per giro e'
    // abbastanza lento da leggersi e abbastanza svelto da rispondere entrando
    // e uscendo dalle scene.
    this.ms += (ms - this.ms) * 0.10
    this.chiamate += (chiamate - this.chiamate) * 0.10
    this.triangoli += (triangoli - this.triangoli) * 0.10
  }

  aggiorna(avvio: number, spinta: number, dt: number) {
    this.ingresso += (Math.min(Math.max(spinta, 0), 1) - this.ingresso) * Math.min(dt * 6, 1)
    this.tempo += dt
    this.acceso = Math.min(Math.max(avvio, 0), 1)
    if (this.acceso <= 0.001) { this.mesh.visible = false; return }
    this.mesh.visible = true
    ;(this.mesh.material as MeshBasicMaterial).color.setScalar(1.35 * this.velo)

    // --- 1. L'AUTOTEST: fondo scala e ritorno, nel primo quinto ------------
    // La salita e' piu' RAPIDA del ritorno (0,08 contro 0,14): una lancetta
    // spinta a fondo scala parte di scatto e rientra frenata. Simmetrica
    // sembrerebbe un'onda, non una verifica.
    const test = this.acceso < 0.22
    if (test) {
      const t = this.acceso / 0.22
      const su = Math.min(t / 0.36, 1)
      const giu = Math.max(0, (t - 0.46) / 0.54)
      this.giri = GIRI_MAX * Math.max(0, su - giu)
      this.spie = 1
      this.marcia = 0
      this.velocita = 0
    } else {
      // --- 2. le spie si spengono a scaglioni ----------------------------
      this.spie = Math.max(0, 1 - (this.acceso - 0.22) / 0.18)

      // --- 3. il minimo irregolare --------------------------------------
      // 880 giri con una modulazione di venticinque su due frequenze
      // incommensurabili: due sinusoidi con periodi in rapporto irrazionale
      // non si ripetono mai, e un minimo che si ripete si sente.
      const minimo = 880
        + Math.sin(this.tempo * 5.7) * 14
        + Math.sin(this.tempo * 2.31) * 11

      // --- 4. e poi si guida ---------------------------------------------
      // la velocita' insegue la spinta con inerzia: un'automobile non cambia
      // velocita' in un fotogramma, e la parte che si vede di piu' e'
      // proprio il RITARDO fra il gesto e la risposta
      const bersaglio = spinta * 330
      this.velocita += (bersaglio - this.velocita) * Math.min(dt * 1.35, 1)

      // la marcia si sceglie dalla velocita': si sale quando si supera il
      // massimo del rapporto, si scala quando si scende sotto il 78% del
      // rapporto sotto — quel divario e' l'ISTERESI, senza la quale il
      // cambio impazzirebbe intorno al punto di scambio
      let m = this.marcia
      while (m < MARCE.length - 1 && this.velocita > MARCE[m]) m++
      while (m > 0 && this.velocita < MARCE[m - 1] * 0.78) m--
      this.marcia = m

      // i giri sono la velocita' RIPORTATA DENTRO il rapporto: e' questo a
      // produrre il dente di sega della cambiata, cioe' il movimento che
      // l'occhio associa alla velocita' piu' di qualunque numero
      const daZero = m === 0 ? 0 : MARCE[m - 1]
      const dentro = (this.velocita - daZero) / Math.max(1, MARCE[m] - daZero)
      const inMarcia = 1400 + Math.min(Math.max(dentro, 0), 1.05) * (GIRI_MAX - 1400)
      const voluti = this.velocita < 3 ? minimo : inMarcia
      // i giri seguono in fretta ma non all'istante: un motore ha un'inerzia
      this.giri += (voluti - this.giri) * Math.min(dt * 9, 1)

    }

    // SI RIDISEGNA A RITMO. Il conto dello stato qui sopra resta a sessanta al
    // secondo — costa una manciata di moltiplicazioni e tenerlo fluido e' cio'
    // che fa muovere l'arco senza scatti — ma il DISEGNO, che e' la parte cara,
    // scatta solo quando e' il momento.
    this.daUltimo += dt
    this.giriDisegno++
    if (this.giriDisegno < Quadro.OGNI || this.daUltimo < Quadro.RITMO) return
    this.daUltimo = 0
    this.giriDisegno = 0

    // SI DISEGNA SU QUELLA LIBERA E POI SI SCAMBIA.
    //
    // L'ordine conta: prima si passa all'altra tela, poi ci si disegna sopra,
    // poi la si consegna al materiale. Disegnando prima di scambiare si
    // scriverebbe di nuovo su quella appena consegnata — cioe' proprio su
    // quella che la scheda sta leggendo — e lo stallo tornerebbe identico.
    this.disegna()
    this.consegna()
  }

  /**
   * DALLA TELA ALLA SCHEDA, passando per la memoria centrale.
   *
   * Sono le due righe che valgono novanta millisecondi. `getImageData`
   * costringe la tela a rasterizzare davvero — il disegno 2D e' differito, e
   * fino a qui erano solo comandi registrati — e rende i byte; da li' in poi
   * la tessitura e' un vettore come un altro.
   *
   * La copia in `this.pixel` invece di appendere direttamente `im.data` non e'
   * cerimoniale: tenere lo stesso vettore per sempre significa che three non
   * si accorge mai che la sorgente e' cambiata di identita', e non rimette in
   * discussione niente del materiale.
   */
  private consegna() {
    const im = this.c.getImageData(0, 0, LP, AP)
    this.pixel.set(im.data)
    this.tessitura.needsUpdate = true
  }

  // ------------------------------------------------------------------ disegno

  /**
   * IL QUADRO — un pannello largo con un quadrante tondo dentro.
   *
   * E' la grammatica delle strumentazioni delle sportive di oggi, e non e' un
   * capriccio: il quadrante tondo e' l'unico modo di leggere un regime CON LA
   * CODA DELL'OCCHIO. Un numero va guardato; un angolo si vede. Chi guida
   * forte non legge i giri, ne vede la posizione — e quando la posizione entra
   * nel settore rosso lo sa senza aver letto niente.
   *
   * Intorno al quadrante ci sono le cose che si guardano UNA VOLTA e non piu':
   * la velocita' a destra, la potenza a sinistra, le spie sotto. La marcia sta
   * nel mezzo del quadrante, perche' e' l'unica informazione che si guarda con
   * la stessa frequenza dei giri.
   *
   * PERCHE' IL PANNELLO ARRIVA AI BORDI, e non e' un vezzo.
   *
   * Nella prima stesura il disegno stava tutto nella fascia centrale —
   * potenza, quadrante, velocita' — e ai due lati restavano due terzi di tela
   * neri. Sullo schermo si leggeva come uno strumento piccolo appoggiato dentro
   * una cornice grande, cioe' come un errore di montaggio: l'occhio non vede
   * «un quadro con dei margini», vede «un quadro che non funziona tutto».
   *
   * Il rimedio non e' allargare le tre cose che c'erano: un contagiri grande
   * il doppio non riempie niente, ingrandisce. Il rimedio e' che ci sia
   * qualcosa da mettere — e su una sportiva elettrica c'e', ed e' proprio la
   * roba che nessuno disegna perche' non e' spettacolare: l'energia a
   * sinistra, il viaggio a destra, l'ora sopra. Sono le zone che in un quadro
   * vero occupano i lati, ed e' per questo che un quadro vero e' pieno.
   *
   * L'ORDINE DELLE CHIAMATE E' L'ORDINE DEI PIANI: fondo e striscia sotto,
   * poi le zone, poi i filetti — che vanno per ultimi perche' devono cadere
   * SOPRA il fondo e non sotto gli aloni delle zone vicine — e le spie
   * dell'avviamento in cima a tutto, perche' durante l'autotest coprono.
   *
   * E TUTTO STA DENTRO IL RITAGLIO DELLA CORNICE, che si apre qui e si chiude
   * qui. Non e' una precauzione teorica: l'alone largo del quadrante arriva a
   * 141,3 pixel su una tela alta 145, cioe' MEZZO PIXEL oltre il bordo interno
   * del vetro. Senza il ritaglio quel mezzo pixel taglia lo smusso dell'angolo
   * in basso e la cornice si apre proprio dove la si guarda.
   */
  private disegna() {
    const c = this.c
    /* IL CONTESTO SI SCALA QUI, una volta per disegno. Da questa riga in poi
       ogni coordinata, ogni corpo tipografico e ogni spessore di tratto e'
       espresso nelle unita' di progetto — 512 per 145 — e finisce sulla tela
       moltiplicato per K. `setTransform` e non `scale` perche' azzera anche
       qualunque trasformazione rimasta dal disegno precedente: `scale` si
       accumulerebbe, e al secondo fotogramma il quadro sarebbe quattro volte
       piu' grande della tela. */
    c.setTransform(K, 0, 0, K, 0, 0)
    c.clearRect(0, 0, L, A)

    const acceso = Math.min(this.acceso / 0.12, 1)
    c.globalAlpha = acceso

    c.save()
    c.beginPath()
    c.roundRect(BORDO, BORDO, L - BORDO * 2, A - BORDO * 2, RAGGIO)
    c.clip()

    this.fondo()
    this.strisciaAlta()

    /* LE DUE FACCE DEL PANNELLO.
     *
     * `guida` e' quanto vale ancora il cruscotto, `carta` quanto vale la
     * scheda dei lavori. Non si sommano a uno: si incrociano in fretta, con
     * una finestra morta in mezzo in cui non c'e' quasi niente — ed e' quella
     * finestra a rendere il cambio un CAMBIO invece di una dissolvenza.
     *
     * Nella finestra morta, sullo schermo, resta il pannello vuoto e acceso.
     * E' li' che sopra compare la parola DOCUMENTI. */
    const guida = 1 - Math.min(this.spegnimento, 1)
    const carta = Math.min(Math.max(this.documenti, 0), 1)
    const base = c.globalAlpha

    if (guida > 0.002) {
      c.globalAlpha = base * guida
      /* LA SCENA NON SI DISEGNA PIU' QUI, E LA RAGIONE E' UN DUPLICATO.
         Il pannello scriveva «06 / 07 — CORSA — SCENA», e la rotaia sul bordo
         sinistro dello schermo scrive «06 / 07 CORSA» nello stesso fotogramma,
         a dieci centimetri di distanza. Due segni per un'informazione sola non
         si rafforzano, si dimezzano: e' la regola con cui e' gia' sparita la
         fascia tecnica quando ripeteva la spina, ed e' la stessa con cui sono
         sparite le celle della batteria quando ripetevano il numero.
         E' anche il taglio piu' pulito del dieci-quindici per cento chiesto dal
         committente: un cruscotto deve sembrare progettato da chi ha progettato
         la hero, non da un secondo designer specializzato in plance. Fra tutto
         quello che c'e' li' sopra, questo era l'unico pezzo che non aggiungeva
         NIENTE — gli altri almeno dicono qualcosa di vero una volta sola.
         Il codice resta e la zona pure: la zona di sinistra e' adesso tutta
         dello scorrimento, che ci sta piu' comodo. */
      this.scorrimento()
        this.quadrante()
      this.marciaCentrale()
      this.tachimetro()
      this.carico()
    }
    // l'ora e il marchio restano accesi anche durante il controllo: sono le
    // due cose che un pannello vero non spegne mai
    c.globalAlpha = base
    this.orologio()

    if (carta > 0.002) {
      c.globalAlpha = base * carta
      // il marchio compare solo qui: durante il controllo qualcuno lo sta
      // guardando, nella guida era uno dei satelliti di troppo
      this.marchio()
      this.scheda()
      c.globalAlpha = base
    }

    if (guida > 0.002) {
      c.globalAlpha = base * guida
      this.filetti()
      this.spieServizio()
      c.globalAlpha = base
    }

    c.restore()
    // il filo del perimetro va DOPO il ritaglio, se no lo si disegnerebbe
    // meta' dentro e meta' fuori e resterebbe spesso mezzo pixel
    this.cornice()

    c.globalAlpha = 1
  }

  /**
   * LA SCHEDA DEI LAVORI — il pannello quando la volante chiede i documenti.
   *
   * PERCHE' I LAVORI E NON LE CREDENZIALI TECNICHE.
   *
   * La prima stesura mostrava le credenziali del progetto: peso dell'asset,
   * WebGL, three.js, tempo per fotogramma. Era coerente — «il sito mostra i
   * propri documenti» — e il committente l'ha spostata di un passo, in meglio:
   * i documenti sono i LAVORI. Una pattuglia non chiede di che materiale e'
   * fatta l'automobile: chiede chi sei e cosa hai fatto.
   *
   * E risolve un problema che il sito si portava dietro da settimane. La
   * sezione dei lavori aveva quattro segnaposto, e riempirli di progetti
   * inventati era fuori discussione. Qui i tre slot vuoti non sono un buco:
   * sono la cosa che si sta guardando. «01 VELOCITY / 02 in arrivo» dice
   * insieme che il primo esiste e che gli altri stanno arrivando — che e'
   * esattamente la verita' di un portfolio nuovo, detta senza scusarsene.
   *
   * L'elenco vive in `ui/Lavori.ts` e da li' lo legge anche il documento
   * semantico: aggiungere un demo e' riempire una riga.
   *
   * LE RIGHE VUOTE SI DISEGNANO LO STESSO, in grigio, con il codice e una
   * lineetta. Nasconderle darebbe una scheda con una riga sola — che si legge
   * come un errore di caricamento, non come un portfolio giovane.
   */
  private scheda() {
    const c = this.c
    c.textBaseline = 'middle'
    const x0 = L * 0.055
    const x1 = L - L * 0.055

    /* IL PANNELLO MOSTRA IL LAVORO CHE SI STA GUARDANDO, e prima ne mostrava
       sempre uno solo.
       Erano scritti a mano: «VELOCITY», «PERSONAL R&D · 2026» e tre credenziali
       fisse. Funzionava finche' il lavoro era uno. Da quando ce ne sono dieci e
       le frecce li fanno scorrere, il carosello cambiava riquadro e il pannello
       sotto continuava a dire VELOCITY — cioe' il documento non corrispondeva
       piu' alla cosa che la pattuglia stava guardando.
       E' anche la richiesta del committente in cinque parole: «qui devi scrivere
       i dettagli del progetto». */
    const scelto = LAVORI[Math.min(Math.max(this.lavoroScelto, 0), LAVORI.length - 1)]

    /* ---- IL NOME STA SULLA CARTA, QUI STA DI CHE SI TRATTA --------------
       I due erano scambiati, e il risultato era che nel finale la stessa
       parola compariva due volte a dieci centimetri di distanza: «STEFANIA
       CHIARADIA» grande sulla carta e «STEFANIA CHIARADIA» grande qui sotto,
       con «Profilo di una Salesforce architect» stampato pure lui in tutti e
       due i posti. Il committente l'ha detto in tre parole — «la descrizione
       sotto sistemala» — e una revisione esterna l'ha contato come tre livelli
       di testo sovrapposti.
       La divisione adesso e' netta: LA CARTA E' L'OGGETTO e porta il nome, che
       e' l'unica cosa che deve restare in testa; IL PANNELLO E' IL DOCUMENTO e
       porta cio' che il nome non dice. Il nome resta qui come occhiello
       piccolo, perche' serve l'aggancio fra la figura e la sua scheda — ma
       piccolo, e col codice davanti: un occhiello non compete, indirizza.
       E il posto grande passa alla riga che prima era un'etichetta ambra sotto
       il nome, cioe' l'unica che diceva qualcosa di nuovo. */
    c.textAlign = 'left'
    this.etichetta(
      scelto.codice + ' — ' + scelto.nome, x0, A * 0.245, A * 0.044,
      'rgba(216,162,88,0.88)', 0.20, 'sinistra',
    )
    let corpoNome = A * 0.150
    c.font = '700 ' + Math.round(corpoNome) + 'px Switzer, system-ui, sans-serif'
    // «Profilo di una Salesforce architect» e' lungo il quadruplo di «Divani su
    // misura»: la riga rientra invece di finire sopra le credenziali, che
    // stanno a meta' pannello. Si misura la larghezza vera, non si contano le
    // lettere — una M e' larga il triplo di una I.
    while (c.measureText(scelto.soggetto).width > L * 0.40 && corpoNome > A * 0.070) {
      corpoNome *= 0.94
      c.font = '700 ' + Math.round(corpoNome) + 'px Switzer, system-ui, sans-serif'
    }
    c.fillStyle = '#eef7ff'
    c.fillText(scelto.soggetto, x0, A * 0.475)

    /**
     * LE CREDENZIALI, E OGNUNA E' VERIFICABILE.
     *
     * E' la regola di tutto questo pannello, applicata al momento in cui conta
     * di piu': una pattuglia sta chiedendo i documenti, e un documento falso e'
     * peggio di nessun documento.
     *
     *   667 kB      il peso di `public/modelli/auto2.glb`, misurato sul file
     *   WEBGL       si apre la console e si vede
     *   DESKTOP /   c'e' una versione telefono vera, non il desktop stretto:
     *   MOBILE      `strumenti/telefono_giro.mjs` la fotografa a 390x844
     *
     * Non c'e' il tempo per fotogramma, e la sua assenza e' una scelta. E'
     * l'unico numero che varia da macchina a macchina, ed e' proprio quello
     * che il committente ha visto scritto 24 mentre chiedeva le credenziali.
     * Un dato che sulla macchina di chi valuta puo' dire una cosa qualunque
     * non e' una credenziale: e' una scommessa.
     */
    /* «DESKTOP + MOBILE» SU UNA RIGA SOLA, e la correzione conta.
     * Prima erano incolonnati come le altre due — DESKTOP grande e MOBILE
     * piccolo sotto — e in quella gerarchia la seconda parola si legge come
     * una nota a pie' di pagina: un giurato poteva leggerci «il telefono non
     * e' supportato», che e' il contrario della verita'. Una versione telefono
     * c'e' ed e' vera, fotografata a 390x844 da `strumenti/telefono_giro.mjs`:
     * le due parole devono avere lo stesso peso. */
    const cred = datiLavoro(scelto)
    const dax = L * 0.46
    const passo = (x1 - dax) / cred.length
    for (let i = 0; i < cred.length; i++) {
      const x = dax + passo * i
      c.textAlign = 'left'
      /* IL CORPO SI SCEGLIE MISURANDO, non contando le lettere.
         C'era `cred[i][0].length > 10 ? piccolo : grande`, cioe' una soglia sul
         NUMERO di caratteri. Finche' le tre celle erano scritte a mano e sempre
         le stesse funzionava. Da quando il pannello mostra i dati del lavoro
         SCELTO, la prima cella puo' essere «REAL-TIME 3D / WEBGL» — venti
         caratteri — e con la soglia a dieci prendeva il corpo piccolo lo stesso
         e sconfinava sopra la colonna dell'anno. Il committente l'ha visto
         subito: «REAL-TIME 3D / WEBGL» stampato sopra «2026».
         Contare i caratteri e' una stima; `measureText` e' una misura, e sa
         anche che una M e' larga il triplo di una I. */
      let corpo = A * 0.090
      c.font = '700 ' + corpo.toFixed(1) + 'px Switzer, system-ui, sans-serif'
      const largo = passo * 0.86
      while (c.measureText(cred[i][0]).width > largo && corpo > A * 0.040) {
        corpo *= 0.93
        c.font = '700 ' + corpo.toFixed(1) + 'px Switzer, system-ui, sans-serif'
      }
      c.fillStyle = 'rgba(238,247,255,0.94)'
      c.fillText(cred[i][0], x, A * 0.415)
      this.etichetta(cred[i][1], x, A * 0.565, A * 0.042, 'rgba(196,224,252,0.60)', 0.20, 'sinistra')
      // il filetto verticale fra una credenziale e l'altra, tranne prima della
      // prima: e' lo stesso segno che separa le sei zone del cruscotto
      if (i > 0) {
        c.strokeStyle = 'rgba(232,234,238,0.16)'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(Math.round(x - passo * 0.16) + 0.5, A * 0.33)
        c.lineTo(Math.round(x - passo * 0.16) + 0.5, A * 0.65)
        c.stroke()
      }
    }

    /* ---- e in fondo, che cosa c'e' davvero nella vetrina ----------------
       Diceva «10 / 10 LAVORI», ed erano dieci nomi contati due volte: il
       numeratore e il denominatore erano lo stesso numero. Una revisione
       esterna l'ha bocciata con l'argomento che non si ribatte — CHI GUARDA
       PUO' CONTARE — e un numero gonfiato che il visitatore verifica non mette
       in dubbio quel numero: mette in dubbio tutto il pannello, che e' l'unico
       posto del sito dove ogni cella dev'essere vera.
       Adesso dice due numeri separati, e la loro somma si conta scorrendo. */
    c.textAlign = 'left'
    this.etichetta(
      String(quantiInLinea()).padStart(2, '0') + '  IN LINEA     ' +
      String(quantiRicerca()).padStart(2, '0') + '  RICERCA',
      x0,
      A * 0.80,
      A * 0.042,
      'rgba(232,234,238,0.50)',
      0.24,
      'sinistra',
    )
    c.textAlign = 'center'
  }

  /**
   * IL VETRO E LE SUE SEI SUPERFICI.
   *
   * Il fondo e' nero non assoluto e piu' chiaro dietro il quadrante, che e' il
   * modo in cui un pannello vero reagisce alla propria retroilluminazione: la
   * luce sta dietro il centro e degrada verso gli angoli.
   *
   * Sopra ci vanno sei veli verticali, uno per zona, PIU' CHIARI IN ALTO. La
   * sfumatura verso il basso e' la meta' del lavoro: un velo di intensita'
   * uniforme si legge come una casella, uno che si spegne verso il basso si
   * legge come una superficie illuminata da sopra — che e' esattamente cio' che
   * la striscia del bordo alto sta gia' raccontando.
   *
   * UNA SFUMATURA SOLA PER SEI ZONE. E' verticale, quindi non dipende da dove
   * cade la zona; l'intensita' si governa con `globalAlpha`. Costruirne sei
   * significherebbe pagare sei volte la stessa cosa a ogni disegno.
   */
  private fondo() {
    const c = this.c
    const g = c.createRadialGradient(CX, CY, 30, CX, CY, L * 0.66)
    g.addColorStop(0, '#0b111a')
    g.addColorStop(1, '#03050a')
    c.fillStyle = g
    c.fillRect(0, 0, L, A)

    const y0 = BORDO, y1 = A - BORDO
    const velo = c.createLinearGradient(0, y0, 0, y1)
    velo.addColorStop(0, 'rgba(150,190,240,1)')
    velo.addColorStop(0.55, 'rgba(150,190,240,0.55)')
    velo.addColorStop(1, 'rgba(150,190,240,0.16)')
    c.fillStyle = velo
    const base = c.globalAlpha
    for (let i = 0; i < VELI.length; i++) {
      c.globalAlpha = base * VELI[i]
      c.fillRect(L * ZONE[i], y0, L * (ZONE[i + 1] - ZONE[i]), y1 - y0)
    }
    c.globalAlpha = base
  }

  /**
   * IL FILO DEL PERIMETRO — due passate, larga e sottile.
   *
   * E' la stessa ricetta dell'alone del quadrante e per la stessa ragione:
   * `shadowBlur` su un rettangolo lungo quanto la tela costa piu' di tutto il
   * resto del disegno, e va rifatto ventiquattro volte al secondo. Una passata
   * spessa e quasi trasparente sotto, una da un pixel e viva sopra, e il bordo
   * ha lo stacco senza la sfocatura.
   *
   * IL FILO NON GIRA UGUALE TUTTO INTORNO: sopra e' piu' vivo, sotto quasi
   * spento. Un contorno di intensita' costante e' un rettangolo disegnato; un
   * contorno che raccoglie la luce in alto e la perde in basso e' un pezzo di
   * vetro dentro una scocca, illuminato dalla stessa striscia che si vede
   * accesa due pixel piu' sotto.
   */
  private cornice() {
    const c = this.c
    const w = L - BORDO * 2, h = A - BORDO * 2
    const g = c.createLinearGradient(0, BORDO, 0, A - BORDO)
    g.addColorStop(0, 'rgba(170,210,250,0.40)')
    g.addColorStop(0.45, 'rgba(120,165,215,0.17)')
    g.addColorStop(1, 'rgba(88,128,178,0.09)')

    c.strokeStyle = 'rgba(90,150,215,0.075)'
    c.lineWidth = 3.2
    c.beginPath(); c.roundRect(BORDO, BORDO, w, h, RAGGIO); c.stroke()

    c.strokeStyle = g
    c.lineWidth = 1
    c.beginPath(); c.roundRect(BORDO + 0.5, BORDO + 0.5, w - 1, h - 1, RAGGIO - 0.5); c.stroke()
  }

  /**
   * UN'ETICHETTA — piccola, maiuscola e SPAZIATA a mano.
   *
   * La spaziatura fa due cose che il corpo da solo non fa. Rende leggibile una
   * maiuscoletta minuscola: a 6,4 pixel di tela — dodici a schermo — le lettere
   * attaccate diventano una macchia, staccate restano lettere. E soprattutto
   * dice il RANGO: in tipografia una parola larga e chiara che sta sotto un
   * numero grande si legge come una didascalia, non come un secondo dato.
   *
   * A MANO E NON CON `letterSpacing`, che il contesto 2D ha da poco e non
   * dappertutto: una proprieta' che su un browser c'e' e su un altro no
   * produrrebbe due quadri diversi, e questo e' il genere di differenza che non
   * si vede finche' non la vede qualcun altro.
   *
   * IL CICLO NON COSTA NIENTE, LE MISURE SI'. Sembrava la parte gratuita del
   * lavoro e invece e' l'unica che si e' vista nei tempi: vedi sotto, e vale la
   * pena leggerlo prima di aggiungere qualunque altra scritta a questo quadro.
   */
  /**
   * @param da dove parte la `x`: `centro` (di serie) o `sinistra`.
   *
   * Serviva da quando la scheda delle credenziali incolonna a sinistra. Nel
   * provino «PERSONAL R&D · 2026» e «01 / 02 LAVORI» erano tagliati a meta'
   * dal bordo del pannello: erano centrati su una `x` che era il loro bordo
   * SINISTRO, quindi meta' finiva a coordinata negativa. Non si vedeva nessun
   * errore — si vedeva del testo mangiato, che e' il modo in cui i difetti di
   * allineamento si presentano sempre.
   */
  private etichetta(
    testo: string,
    x: number,
    y: number,
    corpo: number,
    tinta: string,
    quanto = 0.36,
    da: 'centro' | 'sinistra' = 'centro',
  ) {
    const c = this.c
    c.font = '600 ' + corpo.toFixed(1) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = tinta
    // LA SPAZIATURA SI REGOLA, e non e' un vezzo: su una maiuscoletta —
    // AUTONOMIA, POTENZA — allargare fa leggere meglio, su una parola in
    // minuscolo con una barra dentro — «km/h» — la stessa spaziatura la spezza
    // in quattro segni sconnessi. Nel provino si leggeva «k m / h».
    const passo = corpo * quanto
    // LE LARGHEZZE SI MISURANO UNA VOLTA SOLA, e non e' pignoleria: la prima
    // stesura chiamava `measureText` due volte per lettera — una per centrare,
    // una per avanzare — e il disegno intero e' passato da 0,10 a 0,60
    // millisecondi. Misurare il testo obbliga il browser a preparare la forma
    // dei glifi, ed e' la cosa piu' cara che si possa fare in un ciclo.
    const larghezze: number[] = []
    let larga = -passo
    for (const ch of testo) {
      const w = c.measureText(ch).width
      larghezze.push(w)
      larga += w + passo
    }
    const prima = c.textAlign
    c.textAlign = 'left'
    let xx = da === 'sinistra' ? x : x - larga / 2
    for (let i = 0; i < larghezze.length; i++) {
      c.fillText(testo[i], xx, y)
      xx += larghezze[i] + passo
    }
    c.textAlign = prima
  }

  /**
   * LA STRISCIA DEL BORDO ALTO — una riga di luce da un capo all'altro.
   *
   * Fa una cosa sola e la fa meglio di qualunque altra: DICHIARA LA LARGHEZZA.
   * Finche' il fondo e' nero e additivo, il pannello non ha un contorno — chi
   * guarda vede delle isole di numeri sospese sul cruscotto e non sa dove
   * comincia e dove finisce l'oggetto. Una riga che attraversa tutto trasforma
   * quelle isole nel contenuto di UNA cosa.
   *
   * PIU' CHIARA AL CENTRO E SPENTA AI LATI. Una barra di intensita' uniforme
   * si legge come il bordo di una finestra, cioe' come un elemento
   * dell'interfaccia; una che sfuma agli estremi si legge come luce, che e'
   * quello che le luci d'ambiente delle sportive vere sono.
   *
   * E RESPIRA COL REGIME. Non e' un dato in piu' da leggere: e' la stessa
   * informazione dell'arco, messa dove la si prende con la coda dell'occhio
   * mentre si sta guardando la strada.
   *
   * DUE PASSATE, non un'ombra: `shadowBlur` su una banda larga quanto la tela
   * costerebbe piu' di tutto il resto del disegno, e va rifatto ventiquattro
   * volte al secondo. Vedi il commento del quadrante, e' la stessa ricetta.
   */
  private strisciaAlta() {
    const c = this.c
    const forza = 0.45 + Math.min(this.giri / GIRI_MAX, 1) * 0.55
    // PARTE DAL BORDO INTERNO DEL VETRO, non piu' dal taglio della tela. Da
    // quando c'e' la cornice la striscia non e' piu' il contorno del pannello:
    // e' la luce che sta DENTRO al contorno, e due pixel di scarto sono
    // esattamente cio' che distingue le due letture.
    const y = BORDO

    const alone = c.createLinearGradient(0, y, 0, y + A * 0.075)
    alone.addColorStop(0, 'rgba(70,170,255,' + 0.30 * forza + ')')
    alone.addColorStop(1, 'rgba(70,170,255,0)')
    c.fillStyle = alone
    c.fillRect(BORDO, y, L - BORDO * 2, A * 0.075)

    const nucleo = c.createLinearGradient(0, 0, L, 0)
    nucleo.addColorStop(0, 'rgba(150,220,255,0.04)')
    nucleo.addColorStop(0.5, 'rgba(200,240,255,' + 0.78 * forza + ')')
    nucleo.addColorStop(1, 'rgba(150,220,255,0.04)')
    c.fillStyle = nucleo
    c.fillRect(BORDO, y, L - BORDO * 2, Math.max(2, A * 0.014))
  }

  /**
   * I FILETTI — quattro righe verticali che dividono le sei zone.
   *
   * Ce n'erano gia' due, fra quadrante e velocita' e fra potenza e quadrante,
   * e c'erano per la ragione scritta allora: «senza, il pannello e' un fondo
   * unico con delle cose sopra». Adesso che le zone sono sei ne servono
   * quattro, e la ragione e' la stessa moltiplicata.
   *
   * SFUMANO AGLI ESTREMI. Una riga netta che tocca il bordo alto e quello
   * basso disegna delle caselle, e delle caselle fanno sembrare il quadro un
   * foglio di calcolo; una che nasce e muore nel buio separa senza incasellare.
   *
   * UNA SOLA SFUMATURA PER TUTTE E QUATTRO: e' verticale, quindi non dipende
   * da dove cade la riga, e costruirne quattro identiche sarebbe stato pagare
   * tre volte la stessa cosa a ogni disegno.
   */
  private filetti() {
    const c = this.c
    // NASCONO E MUOIONO DENTRO IL VETRO, a un decimo dai due bordi interni.
    // Toccare la cornice li trasformerebbe in montanti e il quadro in una
    // vetrata a sei riquadri: e' proprio la lettura che i veli del fondo
    // servono a evitare.
    const y0 = BORDO + (A - BORDO * 2) * 0.10
    const y1 = BORDO + (A - BORDO * 2) * 0.88
    const g = c.createLinearGradient(0, y0, 0, y1)
    // il filetto e' piu' vivo a META' ALTEZZA e si spegne alle due estremita':
    // e' la stessa forma della striscia alta girata di novanta gradi, e la
    // ripetizione e' voluta — due separatori disegnati con due grammatiche
    // diverse si leggono come due elementi di due strumenti diversi
    g.addColorStop(0, 'rgba(120,160,205,0)')
    g.addColorStop(0.22, 'rgba(130,172,218,0.20)')
    g.addColorStop(0.5, 'rgba(150,192,238,0.30)')
    g.addColorStop(0.78, 'rgba(130,172,218,0.20)')
    g.addColorStop(1, 'rgba(120,160,205,0)')
    c.strokeStyle = g
    c.lineWidth = 1
    for (const f of FILETTI) {
      c.beginPath()
      // il mezzo pixel e' quello che tiene la riga NETTA: una linea da un pixel
      // centrata su un intero si spalma su due colonne e viene grigia
      c.moveTo(Math.round(L * f) + 0.5, y0)
      c.lineTo(Math.round(L * f) + 0.5, y1)
      c.stroke()
    }
  }

  /**
   * IL QUADRANTE DEI GIRI.
   *
   * Un anello aperto in basso, come su ogni strumento vero: l'apertura serve a
   * dire dove comincia e dove finisce la corsa. Da 135 a 405 gradi, cioe' tre
   * quarti di giro — piu' di cosi' e le due estremita' si avvicinano tanto da
   * confondersi, meno e il settore rosso diventa troppo corto per vedersi.
   *
   * TRE PASSATE E NON UN'OMBRA. `shadowBlur` su un arco lungo costa piu' del
   * disegno di tutto il resto del quadro, e va rifatto sessanta volte al
   * secondo. Tre archi concentrici — largo e trasparente, medio, stretto e
   * pieno — danno lo stesso alone a un decimo del prezzo, e in piu' si
   * governano uno per uno.
   */
  private quadrante() {
    const c = this.c
    const cx = CX, cy = CY, r = R
    const DA = Math.PI * 0.75, FI = Math.PI * 2.25
    const t = Math.min(this.giri / GIRI_MAX, 1)
    const rosso = this.giri >= ROSSO

    /* LA PISTA SPENTA DEVE VEDERSI PER TUTTO IL GIRO, e al 20% non si vedeva.
     *
     * E' il difetto che rendeva il quadro «non intero». Al minimo — 900 giri su
     * 9000, cioe' un decimo della corsa — la parte accesa e' un arco di
     * ventisette gradi, piu' corto del diametro della testa che ci sta sopra.
     * Se la pista spenta e' invisibile, quello che resta sullo schermo e' UN
     * PEZZO LUMINOSO SOSPESO NEL NERO, alle sette in punto, senza niente che lo
     * colleghi allo zero da una parte e alla scala dall'altra. Non sembra un
     * contagiri fermo al minimo: sembra un contagiri rotto.
     *
     * La cura non e' accendere di piu' la parte accesa — quella si vede gia'
     * troppo — e' rendere visibile il giro intero. Un quadrante e' un ANELLO
     * con dentro un settore acceso; se l'anello non c'e', non c'e' lo
     * strumento, c'e' solo il settore.
     *
     * Da 0,20 a 0,42, e il conto della soglia regge: 120 di canale verde al 42%
     * su fondo scuro fa 0,20, che moltiplicato per 1,35 dal materiale fa 0,27
     * — un decimo della soglia del bagliore (2,6). La pista puo' vedersi
     * quanto serve, perche' non e' bianca.
     */
    c.lineCap = 'butt'
    c.lineWidth = A * 0.068
    c.strokeStyle = 'rgba(120,158,205,0.42)'
    c.beginPath(); c.arc(cx, cy, r, DA, FI); c.stroke()
    // e un filo netto sul bordo esterno: e' quello che fa leggere l'anello come
    // un solco ricavato nel pannello invece che come una banda sfumata, e
    // soprattutto e' continuo — non dipende da quanto e' acceso
    c.lineWidth = 1
    c.strokeStyle = 'rgba(150,190,236,0.30)'
    c.beginPath(); c.arc(cx, cy, r + A * 0.034, DA, FI); c.stroke()

    // IL SETTORE ROSSO, PIENO E NETTO, segnato sulla pista: si deve sapere
    // dov'e' PRIMA di arrivarci, se no serve solo a dire che si e' gia'
    // sbagliato.
    //
    // Da 0,30 a 0,58 di opacita', ed e' una misura contro una paura. La paura
    // era il bagliore: un rosso pieno che fiorisce diventa una macchia e mangia
    // le tacche. Il conto dice di no — 255,48,44 al 58% su fondo scuro fa 0,58
    // di canale, che moltiplicato per 1,35 fa 0,79, cioe' un terzo della soglia
    // (2,6). Il settore puo' essere pieno quanto serve: quello che non puo'
    // essere pieno e' il BIANCO, e il rosso non e' bianco.
    const ar = DA + (FI - DA) * (ROSSO / GIRI_MAX)
    c.strokeStyle = 'rgba(255,48,44,0.58)'
    c.beginPath(); c.arc(cx, cy, r, ar, FI); c.stroke()
    // e comincia con uno STACCO, non con una sfumatura: una riga chiara sul
    // primo giro della zona rossa e' la cosa che si vede con la coda
    // dell'occhio, ed e' l'unico punto della scala in cui serve
    c.strokeStyle = 'rgba(255,190,180,0.85)'
    c.lineWidth = 1.6
    c.beginPath()
    c.moveTo(cx + Math.cos(ar) * (r - A * 0.036), cy + Math.sin(ar) * (r - A * 0.036))
    c.lineTo(cx + Math.cos(ar) * (r + A * 0.036), cy + Math.sin(ar) * (r + A * 0.036))
    c.stroke()

    /**
     * LE TACCHE: una ogni 250 giri, piu' alta ogni 1000.
     *
     * Trentasette invece di dieci, e la ragione non e' la precisione — nessuno
     * legge un contagiri a duecentocinquanta giri. E' che una scala fitta e'
     * cio' che distingue uno STRUMENTO da un'icona di strumento: dieci tacche
     * si contano, trentasette si guardano. E' anche il modo in cui l'occhio
     * misura la velocita' con cui l'arco corre, perche' con le tacche fitte il
     * movimento ha dei riferimenti e non scivola su un fondo liscio.
     *
     * LE PICCOLE STANNO DENTRO LA PISTA, le grandi la attraversano. Fuori non
     * c'era posto: le luci di cambiata girano a 58 pixel dal centro e una
     * tacca che esce di otto arriva a 51,5 — due pixel e mezzo di aria, cioe'
     * niente. Dentro l'anello lo spazio c'e' ed e' anche il posto giusto: la
     * scala fine appartiene alla pista, non al bordo.
     */
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineWidth = 1
    c.strokeStyle = 'rgba(150,185,228,0.34)'
    for (let g = 250; g < GIRI_MAX; g += 250) {
      if (g % 1000 === 0) continue
      const a = DA + (FI - DA) * (g / GIRI_MAX)
      const co = Math.cos(a), si = Math.sin(a)
      const dentro = r - A * 0.030, fuori = r - A * 0.004
      c.strokeStyle = g >= ROSSO ? 'rgba(255,150,145,0.42)' : 'rgba(150,185,228,0.34)'
      c.beginPath()
      c.moveTo(cx + co * dentro, cy + si * dentro)
      c.lineTo(cx + co * fuori, cy + si * fuori)
      c.stroke()
    }
    for (let g = 0; g <= GIRI_MAX; g += 1000) {
      const a = DA + (FI - DA) * (g / GIRI_MAX)
      const co = Math.cos(a), si = Math.sin(a)
      const dentro = r - A * 0.052, fuori = r + A * 0.046
      c.strokeStyle = g >= ROSSO ? 'rgba(255,120,120,0.85)' : 'rgba(175,205,242,0.60)'
      c.lineWidth = 2.4
      c.beginPath()
      c.moveTo(cx + co * dentro, cy + si * dentro)
      c.lineTo(cx + co * fuori, cy + si * fuori)
      c.stroke()
      // TUTTI I NUMERI DA 0 A 8, non piu' uno ogni duemila. Una scala numerata
      // a salti si legge come un'approssimazione — l'occhio si chiede cosa c'e'
      // in mezzo — e su un quadrante e' proprio la cosa che non deve succedere.
      //
      // Il nove non c'e' e la sua assenza e' voluta: cade a meta' del settore
      // rosso, dove l'unica informazione utile e' il colore. Un numero li'
      // dentro sarebbe un numero da leggere in un punto in cui non si legge.
      //
      // A 0,098 DAL BORDO e non a 0,100, e il corpo scende da 0,085 a 0,068:
      // con nove numeri invece di cinque la corona e' fitta e ha due vicini
      // scomodi, le tacche fuori e la cifra della marcia dentro. Nel primo
      // provino con nove numeri il 3, il 4, il 5 e il 6 toccavano la «N».
      // Misurato sul disegno dopo la correzione: dieci pixel di aria sopra la
      // marcia, tre e mezzo dalla punta delle tacche grandi.
      if (g < GIRI_MAX) {
        const rn = r - A * 0.098
        c.font = '600 ' + (A * 0.068).toFixed(1) + 'px Switzer, system-ui, sans-serif'
        c.fillStyle = g >= ROSSO ? 'rgba(255,150,150,0.92)' : 'rgba(186,210,240,0.80)'
        c.fillText(String(g / 1000), cx + co * rn, cy + si * rn)
      }
    }

    // il riempimento, in tre passate
    const fine = DA + (FI - DA) * t
    const tinta = rosso ? [255, 70, 62] : [110, 214, 255]
    /* L'ALONE NON PUO' ESSERE PIU' LARGO DELLA PISTA CHE ILLUMINA.
     *
     * Era 0,180 di A, cioe' 26 pixel, contro i 9,9 della pista: due volte e
     * mezzo. La conseguenza si vede girando intorno al quadrante — dalla parte
     * accesa l'anello e' una banda spessa, da quella spenta un filo — e
     * l'occhio non legge «un anello con un pezzo acceso», legge DUE ANELLI
     * DIVERSI attaccati male. E' l'altra meta' del difetto.
     *
     * 0,112 e 0,082: il primo esce dalla pista di appena un pixel e mezzo per
     * parte, quanto basta perche' l'acceso respiri, e il secondo ci sta dentro.
     */
    const passate: Array<[number, number]> = [[A * 0.112, 0.20], [A * 0.082, 0.34]]
    for (const [larga, alfa] of passate) {
      c.lineWidth = larga
      c.strokeStyle = 'rgba(' + tinta[0] + ',' + tinta[1] + ',' + tinta[2] + ',' + alfa + ')'
      c.beginPath(); c.arc(cx, cy, r, DA, fine); c.stroke()
    }

    /**
     * IL NUCLEO SCIVOLA VERSO IL BIANCO ANDANDO VERSO LA TESTA.
     *
     * Un arco di tinta uniforme e' una barra di caricamento: dice quanto e'
     * pieno e basta. Un arco che schiarisce verso l'estremita' dice anche DA
     * CHE PARTE STA ANDANDO, perche' il punto piu' chiaro e' quello che si e'
     * appena acceso — e' la scia di una cosa che corre, non il livello di un
     * serbatoio. Fa anche un secondo lavoro: la coda piu' spenta lascia
     * respirare le tacche che ha sotto invece di cancellarle.
     *
     * A SEDICI SEGMENTI E NON CON UNA SFUMATURA CONICA. `createConicGradient`
     * farebbe la stessa cosa in una riga, ma e' arrivata tardi nei browser e un
     * quadro che su una macchina ha la sfumatura e su un'altra e' piatto e' il
     * genere di differenza che non si vede finche' non la vede qualcun altro.
     * Sedici archi corti si misurano come uno lungo — il disegno intero sta in
     * due decimi di millisecondo — e in piu' si governano uno per uno.
     *
     * I segmenti si SOVRAPPONGONO di un pelo. Accostati esatti lasciano una
     * riga di fondo fra l'uno e l'altro, larga meno di un pixel e visibilissima
     * perche' cade su un arco chiaro. Con opacita' piena la sovrapposizione non
     * si vede: e' il caso in cui accavallare e' piu' pulito che accostare.
     */
    if (fine - DA > 0.004) {
      const n = 16
      c.lineWidth = A * 0.056
      // LA CODA PARTE DA UN AZZURRO PIU' CUPO DELLA TINTA DELLE ZONE, ed e' una
      // correzione fatta guardando invece che ragionando. In tinta 110,214,255
      // l'arco veniva bianco per tutta la sua lunghezza e la sfumatura non si
      // vedeva: moltiplicato per 1,35 dal materiale, il verde arriva a 1,13 e il
      // blu a 1,35, cioe' due canali su tre sono gia' fuori scala e il colore si
      // scarica verso il bianco da solo. Partendo da 46,150,255 il rosso resta a
      // 0,24 e la coda ha ancora un colore da perdere.
      const coda: readonly [number, number, number] = rosso ? [255, 44, 38] : [46, 150, 255]
      for (let i = 0; i < n; i++) {
        const q0 = i / n, q1 = (i + 1) / n
        // la coda resta in tinta e la testa arriva quasi al bianco: l'esponente
        // 2,2 tiene lo scolorimento tutto nell'ultimo quarto, che e' l'unico
        // punto in cui deve leggersi come velocita'
        const k = Math.pow(q1, 2.2) * 0.92
        const rr = Math.round(coda[0] + (255 - coda[0]) * k)
        const vv = Math.round(coda[1] + (255 - coda[1]) * k)
        const bb = Math.round(coda[2] + (255 - coda[2]) * k)
        c.strokeStyle = 'rgba(' + rr + ',' + vv + ',' + bb + ',1)'
        c.beginPath()
        c.arc(cx, cy, r, DA + (fine - DA) * q0, DA + (fine - DA) * q1 + 0.006)
        c.stroke()
      }
    }

    // LA TESTA DELL'ARCO E' UN PUNTO PIENO, ed e' il pezzo che fa sembrare
    // vivo tutto il resto: e' l'unica cosa che si muove in modo continuo, e
    // l'occhio la insegue come inseguirebbe una lancetta.
    const co = Math.cos(fine), si = Math.sin(fine)
    /* E LA TESTA SMETTE DI ESSERE PIU' GRANDE DEI NUMERI. Il raggio era 0,115
     * di A — 16,7 pixel — contro i 9,9 di corpo delle cifre della scala: a
     * meta' corsa copriva il 4 e il 5 insieme. Una testa che nasconde la scala
     * su cui corre e' l'unico modo di rendere illeggibile uno strumento
     * rendendolo piu' vistoso. A 0,072 e' larga come la pista, che e' la sola
     * misura sensata: e' la pista che si sta accendendo. */
    const TESTA = A * 0.072
    const gt = c.createRadialGradient(cx + co * r, cy + si * r, 0, cx + co * r, cy + si * r, TESTA)
    gt.addColorStop(0, 'rgba(255,255,255,1)')
    gt.addColorStop(0.35, 'rgba(' + tinta[0] + ',' + tinta[1] + ',' + tinta[2] + ',0.85)')
    gt.addColorStop(1, 'rgba(' + tinta[0] + ',' + tinta[1] + ',' + tinta[2] + ',0)')
    c.fillStyle = gt
    c.beginPath(); c.arc(cx + co * r, cy + si * r, TESTA, 0, Math.PI * 2); c.fill()

    // le luci di cambiata: un arco di segmenti sopra il quadrante, che si
    // accendono dal centro verso i lati a partire dal 74% del regime
    const n = 9
    const t2 = Math.max(0, (this.giri / GIRI_MAX - 0.74) / 0.26)
    const lampeggia = t2 > 0.97 && Math.sin(this.tempo * 26) > 0
    for (let i = 0; i < n; i++) {
      const q = i / (n - 1)
      const a = -Math.PI * 0.86 + q * Math.PI * 0.72
      const ordine = Math.abs(q - 0.5) * 2
      const on = t2 > ordine * 0.95
      const col: readonly [number, number, number] =
        i < 3 || i >= n - 3 ? [90, 240, 140] : i < 4 || i >= n - 4 ? AMBRA : [255, 70, 70]
      // LA LAMPADA SPENTA NON HA COLORE, ed e' la correzione che ha tolto di
      // mezzo l'ultimo effetto da mockup. In tinta al 7% i nove punti spenti si
      // leggevano come nove coriandoli verdi, ambra e rossi sparsi sopra il
      // quadrante: nel provino ingrandito sembravano sporco sul vetro. Un led
      // spento e' grigio scuro anche quando e' un led verde, e il colore deve
      // essere una NOTIZIA — se c'e' gia' prima, accendersi non dice niente.
      const alfa = lampeggia ? 1 : 0.95
      // 0,10 dal bordo e non 0,135: sopra la corona ci passa l'orologio, e le
      // due cose insieme non ci stavano — misurato sul disegno, non dedotto
      const rr = r + A * 0.100
      c.fillStyle = on ? rgba(col, alfa) : 'rgba(122,152,192,0.13)'
      c.beginPath()
      c.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, A * 0.026, 0, Math.PI * 2)
      c.fill()
    }
  }

  /**
   * LA MARCIA, grande, al centro del quadrante.
   *
   * IL CORPO E' SCESO DA 0,52 A 0,34 e non e' un ripensamento estetico. La
   * cifra e la corona dei numeri dei giri stanno sullo stesso disco, e prima
   * si sovrapponevano: nel provino la «N» copriva il 4 e il 6, cioe' proprio
   * la meta' alta della scala, che e' quella che si guarda. Con il quadrante
   * a 0,300 il disco e' piu' stretto e la sovrapposizione sarebbe peggiorata.
   *
   * Una cifra piu' piccola non si legge peggio: si legge in un punto in cui
   * non c'e' nient'altro, che e' la stessa cosa scritta al contrario.
   */
  private marciaCentrale() {
    const c = this.c
    // LA CIFRA STA SOTTO IL CENTRO DEL QUADRANTE, non sopra come prima.
    // Il vuoto dentro l'anello non e' simmetrico: in alto c'e' il numero delle
    // quattromila, in basso l'anello e' APERTO. Spostare la cifra di due
    // centesimi verso il basso non toglie niente a nessuno e le regala sette
    // pixel di aria proprio dove ne aveva zero.
    const cx = CX, cy = CY - A * 0.008
    const rosso = this.giri >= ROSSO
    const testo = this.marcia === 0 && this.velocita < 3 ? 'N' : String(this.marcia + 1)

    c.textAlign = 'center'; c.textBaseline = 'middle'
    // E DA 0,34 SCENDE A 0,25, per la terza volta e sempre per lo stesso
    // motivo: la corona dei numeri e' passata da cinque cifre a nove, e le
    // quattromila cadono dritte sopra la marcia. Il primo tentativo si era
    // fermato a 0,30 ed era ancora troppo — nel provino il 3, il 4, il 5 e il 6
    // toccavano la «N». A 0,25 la cifra e' alta ventisei pixel di tela, cioe'
    // quarantotto a schermo: continua a essere la cosa piu' grande dentro
    // l'anello, che e' l'unico primato che le serve.
    c.font = '700 ' + Math.round(A * 0.25) + 'px Switzer, system-ui, sans-serif'
    // due passate: sotto l'alone largo, sopra il segno pieno
    c.fillStyle = rosso ? 'rgba(255,80,70,0.30)' : 'rgba(120,200,255,0.26)'
    c.fillText(testo, cx, cy + 3)
    c.fillStyle = rosso ? '#ff6b5f' : '#eef7ff'
    c.fillText(testo, cx, cy)

    // 0,205 e non 0,185: lo zero della scala cade in basso a sinistra e la
    // prima lettera di MARCIA gli arrivava addosso — tre pixel di tela fra i
    // due, visti nel provino ingrandito. Sotto, dentro l'apertura dell'anello,
    // non c'e' niente per venti pixel.
    this.etichetta('MARCIA', cx, cy + A * 0.205, A * 0.042, 'rgba(232,234,238,0.62)')
  }

  /**
   * L'OROLOGIO, piccolo e centrato sopra il quadrante.
   *
   * L'ORA E' QUELLA VERA, presa dall'orologio di chi guarda. E' l'unica
   * scritta di tutto il pannello che chi legge puo' VERIFICARE senza alzare
   * gli occhi dallo schermo — la marcia, i giri, i chilometri sono finzione e
   * nessuno li puo' smentire, un orario sbagliato invece si smaschera da solo
   * e si porta dietro tutto il resto.
   *
   * Sta sopra il quadrante perche' e' la definizione di un'informazione da
   * quadro strumenti: la si guarda una volta ogni tanto, di proposito, e il
   * resto del tempo non deve dare fastidio.
   *
   * E STA DENTRO UNA CAPSULA, con due filetti che ne escono fino ai bordi della
   * zona del quadrante. Prima era testo appoggiato sul fondo, e testo appoggiato
   * sul fondo e' la cosa che fa sembrare un pannello un mockup: in uno strumento
   * vero ogni scritta sta DENTRO qualcosa — una casella, una barra, una pista.
   * La capsula fa anche un lavoro di composizione: aggancia l'ora al centro
   * geometrico del pannello invece di lasciarla galleggiare sopra il quadrante.
   *
   * I DUE FILETTI SI SPENGONO ANDANDO IN FUORI. Se arrivassero pieni fino al
   * bordo diventerebbero una traversa e il quadro si dividerebbe in due piani
   * sovrapposti; spegnendosi dicono soltanto «questa fascia appartiene al
   * quadrante», che e' tutto quello che devono dire.
   *
   * L'ALTEZZA E' DECISA DA CIO' CHE HA SOTTO, non dal gusto: le luci di
   * cambiata girano a 58 pixel dal centro e la piu' alta arriva a 23 dal bordo
   * della tela, il nucleo della striscia finisce a 6,3. La capsula sta in quei
   * diciassette pixel — 16,7 di altezza — e ci sta tutta.
   */
  private orologio() {
    const c = this.c
    const d = new Date()
    const testo = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.font = '600 ' + (A * 0.078).toFixed(1) + 'px Switzer, system-ui, sans-serif'

    const y = A * 0.100
    const h = A * 0.115
    const w = c.measureText(testo).width + A * 0.115
    const sx = CX - w / 2, sy = y - h / 2

    // i due filetti, che nascono spenti ai confini della zona del quadrante e
    // arrivano vivi alla capsula
    const dentro = 'rgba(140,185,232,0.34)', fuori = 'rgba(140,185,232,0)'
    const xa = L * ZONE[3] + 4, xb = L * ZONE[4] - 4
    const ga = c.createLinearGradient(xa, 0, sx, 0)
    ga.addColorStop(0, fuori); ga.addColorStop(1, dentro)
    const gb = c.createLinearGradient(sx + w, 0, xb, 0)
    gb.addColorStop(0, dentro); gb.addColorStop(1, fuori)
    c.lineWidth = 1
    c.strokeStyle = ga
    c.beginPath(); c.moveTo(xa, Math.round(y) + 0.5); c.lineTo(sx, Math.round(y) + 0.5); c.stroke()
    c.strokeStyle = gb
    c.beginPath(); c.moveTo(sx + w, Math.round(y) + 0.5); c.lineTo(xb, Math.round(y) + 0.5); c.stroke()

    // la capsula: un velo dentro e un filo intorno, come la cornice in piccolo
    c.beginPath(); c.roundRect(sx, sy, w, h, h / 2)
    c.fillStyle = 'rgba(96,140,196,0.16)'
    c.fill()
    c.strokeStyle = 'rgba(150,195,240,0.36)'
    c.lineWidth = 1
    c.stroke()

    c.fillStyle = 'rgba(206,230,252,0.88)'
    c.fillText(testo, CX, y)
  }

  /**
   * LA VELOCITA', a destra e in cifre TABULARI.
   *
   * Senza cifre tabulari le larghezze cambiano da un numero all'altro e il
   * valore BALLA mentre sale. E' il difetto che si nota di piu' su un
   * tachimetro, perche' e' il punto su cui l'occhio sta fermo piu' a lungo.
   */
  private tachimetro() {
    const c = this.c
    const x = X_VELOCITA, y = A * 0.455
    c.textAlign = 'center'; c.textBaseline = 'middle'
    // 0,375 E NON 0,40, e il tetto e' misurato invece che scelto: la zona della
    // velocita' va da 328 a 438 pixel di tela, tre cifre monospaziate a 0,375
    // occupano 98 pixel di larghezza e ne lasciano cinque per parte. A 0,40 ne
    // lasciano zero e la cifra delle centinaia tocca il filetto.
    //
    // E' il numero piu' grande del pannello e deve restarlo: insieme alla
    // percentuale della batteria e' uno dei due che si guardano da lontano, e
    // il salto di corpo verso autonomia, trip e odo — da 54 pixel a 11 — e' cio'
    // che rende superfluo spiegare quale dei cinque numeri conta.
    c.font = '700 ' + Math.round(A * 0.375) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = 'rgba(140,200,255,0.22)'
    c.fillText(String(Math.round(this.velocita)), x, y + 2)
    c.fillStyle = '#ffffff'
    c.fillText(String(Math.round(this.velocita)), x, y)

    this.etichetta('km/h', x, y + A * 0.235, A * 0.048, 'rgba(155,192,232,0.78)', 0.14)
  }

  /**
   * LA SPIA DEI FARI, nella colonna fra lo scorrimento e il quadrante.
   *
   * La faccia piatta sta a sinistra e la calotta a destra, e i raggi escono
   * dalla faccia: e' il simbolo omologato, e va disegnato come lo si e' visto
   * in macchina per mille volte, non come verrebbe meglio. Un'icona di fari
   * specchiata si riconosce lo stesso ma si legge come un errore di stampa.
   *
   * DUE PASSATE — larga e trasparente sotto, stretta e piena sopra — che e' la
   * stessa ricetta del quadrante e per lo stesso motivo: e' l'alone senza
   * `shadowBlur`, cioe' a un decimo del prezzo.
   */
  /* LA SPIA DEI FARI E' STATA TOLTA, insieme alla sua zona.
     Era l'unico elemento del pannello che non significava niente: un'icona di
     fari accesi che non si accendeva ne' si spegneva, ferma li' perche' su un
     cruscotto vero c'e'. E' esattamente cio' che faceva sembrare questo
     capitolo «una plancia disegnata» invece di un Creative Developer che usa
     l'automobile come linguaggio — la stessa ragione per cui sono spariti la
     carica, l'autonomia, il parziale e la runa del Bluetooth.
     I sette centesimi che occupava sono andati al quadrante, che e' il
     protagonista e ne aveva bisogno. */


  /**
   * IL CARICO, all'estrema destra: quante volte si chiama la scheda e quanti
   * triangoli le si danno.
   *
   * Sono `renderer.info.render`, cioe' esattamente cio' che un altro
   * sviluppatore andrebbe a guardare per capire se la scena e' fatta bene. E
   * sono la ragione per cui stanno qui e non in una barra di diagnostica: chi
   * legge questo pannello sta guardando la scena mentre la scena dichiara
   * quanto costa. Nessun filmato puo' farlo.
   *
   * A DIFFERENZA DEL TEMPO PER FOTOGRAMMA, QUESTI DUE SI POSSONO MOSTRARE.
   * Non dipendono dalla macchina di chi guarda: duecentoquarantuno chiamate e
   * due milioni e mezzo di triangoli sono duecentoquarantuno e due milioni e
   * mezzo su qualunque scheda video esista. Sono una proprieta' della scena,
   * non una prestazione — ed e' quella la differenza che decide cosa si
   * scrive su un pannello e cosa no.
   */
  private carico() {
    const c = this.c
    const x = X_VIAGGIO
    c.textAlign = 'center'
    c.textBaseline = 'middle'

    /**
     * DUE DICHIARAZIONI, NON PIU' DUE NUMERI.
     *
     * Qui c'erano «DISEGNO 41» e «TRIANGOLI 1k». Erano veri e misurati, e il
     * committente ha visto il difetto che li accomuna: nessuno dei due ha una
     * lettura univoca. «Disegno 41» non vuol dire niente per chi guarda un
     * portfolio; e a un tecnico dice «chiamate di disegno» solo se indovina,
     * perche' quello e' il nome che ha in inglese. «Triangoli 1k» dentro
     * l'abitacolo e' un numero minuscolo — la scena li' e' una fotografia e un
     * quadrilatero — e senza contesto sembra poco, non leggero.
     *
     * E' la terza applicazione della stessa regola, e ormai vale come regola:
     * un dato vero non e' automaticamente un dato da mostrare. Prima i
     * millisecondi, poi i quattrocentosessantamila triangoli, adesso questi.
     *
     * Al loro posto due frasi che dicono la stessa cosa senza chiedere di
     * essere interpretate, e rispondono alla domanda che un direttore tecnico
     * fa davvero: perche' WebGL e non una sequenza di fotogrammi?
     *
     *   RENDER / REAL-TIME   la scena si calcola mentre la si guarda
     *   INPUT / SCORRIMENTO  e quello che la comanda e' la mano di chi guarda
     *
     * Sono tutte e due verificabili in un secondo: si scorre e si vede.
     */
    const righe: Array<[string, string, number]> = [
      ['RENDER', 'REAL-TIME', 0.320],
      ['INPUT', t('inputScorrimento'), 0.660],
    ]
    for (const [nome, valore, y] of righe) {
      this.etichetta(nome, x, A * y, A * 0.042, 'rgba(232,234,238,0.58)')
      /* E LA PAROLA RIENTRA SE NON CI STA, invece di uscire dal pannello.
         E' lo stesso rimedio gia' usato per il nome del lavoro qui sopra, ed
         e' la difesa vera: spostare la colonna sistema «SCORRIMENTO» oggi, ma
         il giorno in cui qualcuno traduce in tedesco, o scrive una parola piu'
         lunga, il difetto tornerebbe identico e nessuno se ne accorgerebbe
         finche' non lo fotografa un estraneo.
         Il limite e' la distanza dal bordo piu' vicino: il testo e' centrato,
         quindi cio' che sborda a destra sborda anche a sinistra. */
      let corpo = A * 0.070
      c.font = '700 ' + corpo.toFixed(1) + 'px Switzer, system-ui, sans-serif'
      const largoMax = (L - ARIA_BORDO - x) * 2
      while (c.measureText(valore).width > largoMax && corpo > A * 0.045) {
        corpo *= 0.95
        c.font = '700 ' + corpo.toFixed(1) + 'px Switzer, system-ui, sans-serif'
      }
      c.fillStyle = 'rgba(212,234,255,0.88)'
      c.fillText(valore, x, A * (y + 0.115))
    }

    /**
     * IL FILETTO AMBRA — l'unico punto caldo di tutto il pannello.
     *
     * Sta fra i due perche' li' serve un separatore comunque: due coppie
     * etichetta-valore incolonnate alla stessa distanza si leggono come quattro
     * righe, non come due blocchi.
     *
     * MA IL COLORE NON E' PER LORO. E' l'ambra della rotaia e della spina del
     * resto del sito. Un quadro strumenti disegnato tutto in azzurro sarebbe
     * uno strumento credibile e un pezzo estraneo alla pagina che lo contiene:
     * basta un tratto della tinta di casa — uno solo, e nel posto piu'
     * tranquillo che c'e' — perche' lo strumento diventi parte del sito.
     */
    const ya = Math.round(A * 0.545) + 0.5
    const semi = L * 0.048
    const g = c.createLinearGradient(x - semi, 0, x + semi, 0)
    g.addColorStop(0, 'rgba(216,162,88,0)')
    g.addColorStop(0.5, 'rgba(216,162,88,0.75)')
    g.addColorStop(1, 'rgba(216,162,88,0)')
    c.strokeStyle = g
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(x - semi, ya)
    c.lineTo(x + semi, ya)
    c.stroke()
  }

  /**
   * IL MARCHIO, in alto a destra e piccolissimo.
   *
   * Qui c'era la runa del Bluetooth, disegnata bene e completamente falsa: non
   * c'e' nessun telefono collegato e non c'e' niente da collegare. Era l'ultimo
   * pezzo di finzione rimasto, ed era anche il piu' gratuito, perche' non
   * diceva nemmeno un numero — diceva solo «questo e' un cruscotto vero,
   * fidati».
   *
   * Al suo posto due parole nella tipografia piu' piccola del pannello, che
   * fanno il lavoro opposto: invece di chiedere di credere che sia
   * un'automobile, dichiarano che non lo e'.
   *
   * Due righe e non una: «REAL-TIME» da solo e' un vanto, «REAL-TIME / WEBGL»
   * e' una scheda tecnica. La differenza sta tutta nella seconda riga, che dice
   * con che cosa.
   */
  /* NON SI CHIAMA PIU' NELLA GUIDA.
     «REAL-TIME / WEBGL» in corpo cinque nell'angolo era vero e non serviva a
     nessuno: la stessa cosa la dicono le credenziali quando la pattuglia
     chiede i documenti, dove qualcuno la sta guardando. Nella guida era uno
     dei satelliti che rendevano il pannello «una plancia disegnata» — il
     quindici per cento in meno chiesto dal committente, tolto di nuovo dove
     non costava nessuna informazione.
     Resta chiamata durante il controllo, che e' il suo posto. */
  private marchio() {
    const c = this.c
    const x = L - BORDO - A * 0.052
    c.textAlign = 'right'
    c.textBaseline = 'middle'
    c.font = '600 ' + (A * 0.040).toFixed(1) + 'px Switzer, system-ui, sans-serif'
    const righe: Array<[string, number, string]> = [
      ['REAL-TIME', 0.098, 'rgba(150,190,232,0.62)'],
      ['WEBGL', 0.168, 'rgba(150,190,232,0.34)'],
    ]
    for (const [testo, y, tinta] of righe) {
      c.fillStyle = tinta
      let sx = x
      // la spaziatura si compone a mano perche' `letterSpacing` sul contesto 2D
      // non c'e' su tutti i browser che questo sito deve reggere
      for (let i = testo.length - 1; i >= 0; i--) {
        c.fillText(testo[i], sx, A * y)
        sx -= c.measureText(testo[i]).width + A * 0.014
      }
    }
    c.textAlign = 'center'
  }

  /* IL BLOCCO DELLA SCENA E' STATO CANCELLATO, non commentato.
     Disegnava «06 / 07 — CORSA — SCENA» nella zona di sinistra, e la rotaia
     sul bordo dello schermo scrive la stessa identica cosa nello stesso
     fotogramma. Tenerlo qui spento «per un domani» sarebbe stato peggio che
     toglierlo: un metodo morto in un file da millesettecento righe e' una
     trappola per chi lo riapre fra sei mesi. Se un giorno servira', la
     rotaia sa gia' come si disegna un contatore. */


  /**
   * LO SCORRIMENTO — la colonna di segmenti fra il fotogramma e il quadrante.
   *
   * QUI C'ERA LA POTENZA, e leggeva `this.giri`: cioe' disegnava una seconda
   * volta, in verticale, esattamente il numero che il quadrante disegna gia'
   * in tondo e meglio. Due indicatori della stessa cosa non si rafforzano, si
   * dimezzano — e' la regola con cui ho tolto la fascia tecnica quando diceva
   * le stesse cose della spina.
   *
   * Adesso legge la SPINTA, cioe' quanto in fretta si sta scorrendo. E' l'unica
   * grandezza del pannello che non viene dalla scena ma da CHI GUARDA, ed e'
   * la tesi del sito ridotta a una colonna di sedici segmenti: quello che
   * succede sullo schermo e' una funzione della mano di chi legge. Fermandosi
   * si spegne. Non c'e' modo di ottenere questa colonna da un filmato.
   *
   * LA SCALA RESTA FREDDA-AMBRA-CALDA e resta nel verso di prima — in alto e'
   * tanto — perche' qui tanto e' tanto e basta: scorrere forte non e' un
   * allarme. E' l'opposto della colonna del budget, che sta a due zone di
   * distanza e ha il verso invertito, e i due versi si distinguono perche' le
   * due zone hanno etichette che dicono cosa misurano.
   */
  private scorrimento() {
    const c = this.c
    const x = X_POTENZA, y0 = A * 0.815, y1 = A * 0.115
    const n = 16
    const p = Math.min(Math.max(this.ingresso, 0), 1)
    for (let i = 0; i < n; i++) {
      const q = i / (n - 1)
      const yy = y0 + (y1 - y0) * q
      const on = p > q * 0.98
      const col = q > 0.84 ? CALDO : q > 0.66 ? AMBRA : FREDDO
      c.fillStyle = rgba(col, on ? 0.95 : 0.08)
      const w = L * 0.058 * (0.5 + q * 0.5)
      c.fillRect(x - w / 2, yy - A * 0.013, w, A * 0.026)
    }
    c.textAlign = 'center'; c.textBaseline = 'middle'
    this.etichetta('SCORRIMENTO', x, A * 0.895, A * 0.042, 'rgba(232,234,238,0.60)')
  }

  /**
   * LE SPIE DELL'AVVIAMENTO, che si vedono solo mentre si accende.
   *
   * Ci sono perche' l'accensione di una vettura vera E' quel momento — tutte
   * le spie che si accendono insieme e si spengono in ordine — e senza, la
   * chiave gira e non succede niente.
   */
  private spieServizio() {
    const c = this.c
    if (this.spie <= 0.01) return
    const simboli = ['ABS', 'ESP', 'OLIO', 'BATT', 'ASR', 'AIRBAG']
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.font = '700 ' + Math.round(A * 0.052) + 'px Switzer, system-ui, sans-serif'
    for (let i = 0; i < simboli.length; i++) {
      // stretti a 0,062 e centrati sul quadrante: la riga deve restare DENTRO
      // la sua zona, se no durante l'autotest scavalca i filetti e per un
      // istante il pannello sembra una cosa sola
      const x = CX + (i - (simboli.length - 1) / 2) * L * 0.062
      if (this.spie <= i / simboli.length) continue
      c.fillStyle = i === 2
        ? 'rgba(255,90,70,' + this.spie + ')'
        : 'rgba(255,190,70,' + this.spie + ')'
      // 0,93 e non 0,95: da quando c'e' la cornice, il bordo interno del vetro
      // sta a 141 pixel e a 0,95 la riga finiva a 141,5 — cioe' mezza lettera
      // tagliata dal ritaglio, e proprio nell'istante dell'accensione
      c.fillText(simboli[i], x, A * 0.93)
    }
  }
}
