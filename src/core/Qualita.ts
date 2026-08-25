import type { PointLight } from 'three'
import { RIDOTTO } from './Moto'

/**
 * QUANTO PUO' COSTARE UN FOTOGRAMMA SU QUESTA MACCHINA.
 *
 * PERCHE' UN FILE SOLO, E PERCHE' DATI E NON CODICE SPARSO.
 *
 * La qualita' adattiva scritta male e' un `if` dentro ogni file: uno che
 * spegne il bloom, uno che dimezza l'ombra, uno che salta il riflesso. Dopo
 * tre di quegli `if` nessuno sa piu' quale combinazione sta davvero girando,
 * e soprattutto nessuno puo' PROVARE una combinazione: non esiste un posto in
 * cui dire «adesso fammi vedere il livello basso». Qui i quattro livelli sono
 * quattro record di dati, e chi guarda il file sa in dieci secondi cosa si
 * spegne e in che ordine.
 *
 * LA REGOLA CHE VIENE PRIMA DI TUTTE: SI DEGRADA SENZA CAMBIARE LA STORIA.
 *
 * Il §14.6 chiede «degrado automatico senza cambiare la storia», e non e' una
 * frase di contorno: e' il vincolo che decide COSA si puo' togliere. La
 * coreografia, i beat, i tempi, cosa si vede e quando — quelli non sono nella
 * lista. Si tolgono soltanto cose che rendono il fotogramma piu' ricco, mai
 * cose che lo rendono diverso. In pratica:
 *
 *   SI PUO' TOGLIERE   la risoluzione, il riflesso a terra, l'occlusione
 *                      ambientale, la nitidezza dell'ombra, il numero di
 *                      sorgenti che fanno lo stesso lavaggio, i megapixel
 *                      della fotografia dell'abitacolo.
 *
 *   NON SI PUO'        spegnere una luce e basta (il porticato diventa un
 *                      altro posto), togliere il bloom prima dell'ultimo
 *                      livello (senza fiore l'accensione del quadro non si
 *                      legge, e l'accensione E' un beat), saltare
 *                      l'attraversamento del faro, accorciare un beat.
 *
 * L'ORDINE IN CUI SI SPEGNE non e' «dal piu' costoso al meno costoso»: e'
 * «dal piu' costoso al meno NARRATIVO». Fra due cose che costano uguale,
 * cade prima quella che nessuno saprebbe nominare guardando.
 *
 * LE TRE TRAPPOLE CHE QUESTO FILE EVITA, e sono tutte e tre gia' pagate
 * altrove nel progetto:
 *
 *   1. IL NUMERO DI LUCI E' UNA COSTANTE DI COMPILAZIONE. Spegnere una luce
 *      togliendola dalla scena — o nascondendo il gruppo che la contiene —
 *      cambia il numero di luci, e al fotogramma dopo three ricompila OGNI
 *      materiale: centinaia di millisecondi. Un sistema di qualita' che
 *      degrada provocando un blocco di mezzo secondo ha peggiorato
 *      esattamente la cosa che doveva curare. Qui le luci si spengono
 *      sull'INTENSITA' e restano in scena — vedi `applicaLuciCorte` e il
 *      commento lungo in `transizioni/Attraversamento.ts`.
 *
 *   2. LE OMBRE HANNO LA STESSA TRAPPOLA. `renderer.shadowMap.enabled` e
 *      `luce.castShadow` entrano nei define dello shader esattamente come il
 *      conteggio delle luci. Quindi «ombre spente» si puo' applicare SOLO
 *      prima del primo fotogramma; a caldo si scende di risoluzione (che e'
 *      una uniform, non un define, e non costa nessuna ricompilazione) e si
 *      CONGELA la mappa. Congelarla qui e' quasi gratis: la direzionale sta
 *      ferma, l'auto sta ferma, e quindi la mappa d'ombra e' identica a se
 *      stessa sessanta volte al secondo. Vedi `ombra` e `ombraViva`.
 *
 *   3. IL VSYNC RENDE INUTILIZZABILE QUALUNQUE SOGLIA SOTTO IL BUDGET.
 *      Con lo scambio di buffer sincronizzato a 60 Hz, il tempo fra due
 *      `requestAnimationFrame` non scende MAI sotto 16,7 ms nemmeno se la
 *      scheda e' ferma. Una regola del tipo «risali quando la media e' sotto
 *      13 ms» non scatta mai su un monitor a 60 Hz, e il sito resta per
 *      sempre al livello a cui e' sceso — un difetto che non si vede mai in
 *      sviluppo, perche' in sviluppo si guarda il caso in cui il livello
 *      scende. Qui la salita si decide contando i fotogrammi LUNGHI, non
 *      guardando quanto sono corti quelli buoni.
 */

export type Livello = 'alto' | 'medio' | 'basso' | 'minimo'

/** dal migliore al peggiore: l'indice in questo elenco E' il livello */
export const SCALA: readonly Livello[] = ['alto', 'medio', 'basso', 'minimo']

export type Impostazioni = {
  readonly nome: Livello

  /**
   * Il tappo al rapporto di pixel. E' la manopola piu' potente di tutte
   * perche' il costo cresce col QUADRATO: passare da 2 a 1,5 non toglie un
   * quarto del lavoro alla scheda, ne toglie il quarantaquattro per cento.
   * Ed e' anche quella che si vede meno, perche' tutto il resto della scena
   * e' morbido — nebbia, riflessi sfocati, bloom.
   *
   * ATTENZIONE A COSA E' QUESTO NUMERO NELLA TABELLA: e' il tetto DEL
   * LIVELLO, cioe' quanto quel livello si spingerebbe a chiedere, non quello
   * che il renderer riceve. Il numero applicato esce da tre tappi in fila, e
   * il minore vince:
   *
   *     il tetto del livello        (questa colonna)
   *     il tetto dello schermo      (`tettoPerLarghezza`, qui sotto)
   *     la densita' vera            (`devicePixelRatio`, in `Esperienza`)
   *
   * `Qualita.impostazioni` restituisce il record gia' abbassato ai primi due;
   * il terzo lo chiude `Esperienza` con il `Math.min(devicePixelRatio, ...)`
   * che ha gia'. Sono tre tappi diversi, non tre copie dello stesso: nessuno
   * dei tre puo' restare indietro rispetto agli altri, perche' ognuno sa una
   * cosa che gli altri due non sanno.
   *
   * Chi legge `IMPOSTAZIONI[...].pixelRatio` a mano sta quindi leggendo
   * l'ambizione del livello e non la decisione — lo fa `strumenti/qualita.mjs`
   * apposta, per misurare cosa costa una densita' doppia su un browser di
   * prova che gira a densita' 1.
   */
  readonly pixelRatio: number

  /**
   * Il riflesso a terra. E' una passata di rendering INTERA in piu': tutte le
   * chiamate di disegno della scena, una seconda volta, dalla camera
   * speculare. Su una macchina limitata dalla CPU — cioe' quasi ogni telefono
   * — e' il singolo pezzo piu' costoso di tutto il motore, molto piu' del
   * bloom e dell'occlusione messi insieme, perche' quelli costano riempimento
   * e questo costa chiamate.
   *
   * E' anche la prima cosa importante che si perde, e lo si accetta a
   * malincuore: il riflesso e' l'ANCORA che tiene l'auto appoggiata a terra
   * (vedi `scene/Riflesso.ts`). Cade prima dell'ombra proprio perche' l'ombra
   * fa lo stesso mestiere a un decimo del prezzo.
   */
  readonly riflesso: boolean

  /**
   * A che frazione dello schermo si renderizza il riflesso. SI APPLICA SOLO
   * ALLA COSTRUZIONE: `Riflesso` prende la risoluzione nel costruttore e non
   * espone un modo per cambiarla dopo. Quindi un livello raggiunto a caldo
   * eredita la risoluzione di quello iniziale — e va bene cosi', perche' a
   * caldo il riflesso o resta o si spegne del tutto, e la via di mezzo
   * varrebbe pochi punti percentuali.
   */
  readonly riflessoRisoluzione: number

  /**
   * L'occlusione ambientale. E' il passaggio che trasforma la geometria in
   * architettura (il commento in `core/Esperienza.ts` spiega perche'), e
   * costa riempimento: cresce col numero di pixel e col numero di campioni,
   * e su uno schermo piccolo costa proporzionalmente poco. Per questo scende
   * di campioni prima di spegnersi, e si spegne solo quando anche il riflesso
   * e' gia' caduto.
   */
  readonly occlusione: boolean

  /**
   * Quanti campioni per pixel. Sedici e' il valore tarato; otto raddoppia la
   * velocita' del passaggio e in cambio l'ombra d'angolo diventa un po' piu'
   * granulosa — che su una scena notturna, dietro a un bloom e a una nebbia,
   * e' difficile perfino da fotografare. Sotto otto compaiono le bande, e
   * una banda si vede piu' di quanto si veda l'assenza dell'occlusione:
   * quindi sotto otto non si scende, si spegne.
   *
   * Cambiare questo numero ricompila UN materiale — quello a schermo intero
   * del passaggio — e non tutta la scena. E' un intoppo da pochi
   * millisecondi, accettabile perche' capita solo al cambio di livello.
   */
  readonly campioniOcclusione: number

  /**
   * IL CAMPIONAMENTO MULTIPLO, e costa quasi il doppio dei fotogrammi.
   *
   * Aggiunto per togliere le scalette sui fili di luce — un difetto vero, che
   * il committente aveva indicato sul montante — e misurato solo dopo, quando
   * `strumenti/salti.mjs` ha permesso di misurare il sito IN MOVIMENTO invece
   * che fermo:
   *
   *     senza     1164 fotogrammi su 1800
   *     con 4      646
   *     con 2      656
   *
   * Due cose che non mi aspettavo. La prima: il prezzo e' quasi la meta' dei
   * fotogrammi. La seconda: fra due campioni e quattro non cambia niente, il
   * costo non sta nel NUMERO ma nell'avere un bersaglio multicampione — la
   * risoluzione del bersaglio a ogni fotogramma e il doppio di banda passano
   * comunque.
   *
   * Quindi e' una scelta binaria e va al gestore, come il bloom e l'occlusione:
   * al livello alto si tiene, sotto si spegne. Chi scende di livello non resta
   * senza antialiasing — quello speculare, che sta dentro lo shader
   * (`scene/Nitidezza.ts`), non costa niente ed e' proprio quello che cura il
   * difetto peggiore, cioe' la scaletta sulle righe di luce sottili.
   */
  readonly multicampione: number

  /**
   * Il bloom. Resta acceso fino al penultimo livello, e non perche' costi
   * poco: perche' PORTA UN BEAT. L'accensione del quadro strumenti funziona
   * solo se cio' che e' dichiarato sorgente fiorisce e il resto no (vedi la
   * soglia a 2,6 in `Esperienza.costruisciPost`). Spento, il quadro si
   * accende e non succede niente. Toglierlo prima significherebbe cambiare
   * la storia, che e' esattamente cio' che non si puo' fare.
   */
  readonly bloom: boolean

  /**
   * Il lato della mappa d'ombra in pixel; 0 vuol dire ombre spente, e
   * SI PUO' APPLICARE SOLO ALLA PARTENZA per la trappola dei define
   * descritta in testa al file.
   *
   * L'ombra e' l'ultimo appoggio a terra che resta quando il riflesso e'
   * gia' caduto: senza, l'auto galleggia, ed e' il difetto che chiunque nota
   * per primo pur non sapendolo nominare. Per questo scende di nitidezza
   * (2048 -> 1024 -> 512) invece di sparire, e sparisce solo al livello in
   * cui la macchina non regge nemmeno una passata da mezzo milione di
   * triangoli.
   */
  readonly ombra: number

  /**
   * Se falso, la mappa d'ombra si disegna una volta e poi si congela.
   *
   * Qui costa quasi niente perche' la geometria che proietta non si muove:
   * la direzionale e' fissa a (5,5 / 8 / 4,5), l'auto sta sull'origine, e la
   * camera che gira NON entra nel calcolo di un'ombra direzionale. Cioe' la
   * mappa e' identica a se stessa sessanta volte al secondo, e ridisegnarla
   * e' lavoro buttato — solo che a livello alto lo si butta volentieri, per
   * non dover garantire che nessuno aggiunga mai qualcosa di mobile.
   *
   * Chi la congela deve ricordarsi di chiedere UN aggiornamento quando la
   * scena cambia davvero: quando l'auto arriva dalla rete, e quando si entra
   * o si esce dall'abitacolo.
   */
  readonly ombraViva: boolean

  /**
   * Quante delle dodici puntiformi della corte restano accese. Dodici sono
   * tre per lato (vedi `scene/Corte.ts`): servono a fare un LAVAGGIO
   * morbido, non tre bolle, e la morbidezza viene dal fatto che sono tante e
   * deboli.
   *
   * Spegnendone si perde morbidezza, non luce: `applicaLuciCorte` ridistribuisce
   * l'intensita' su quelle che restano, cosi' la corte resta illuminata
   * uguale e diventa solo un po' piu' «a chiazze». E' esattamente il tipo di
   * degrado che si puo' fare: la scena e' la stessa scena.
   *
   * Non si scende MAI sotto quattro, cioe' una per lato. A zero il porticato
   * diventa nero e non e' piu' lo stesso posto — sarebbe cambiare la storia.
   */
  readonly luciCorte: number

  /**
   * Quale fotografia dell'abitacolo: `abitacolo_mobile.webp` (1280 px) invece
   * di `abitacolo.webp` (2560). Non e' una scelta di velocita' di disegno —
   * costano identico da campionare — e' memoria video e tempo di rete: sono
   * 250 kB e qualche megabyte di VRAM, e su una macchina che sta gia'
   * soffrendo la VRAM e' spesso il vero motivo per cui soffre.
   *
   * `scene/Abitacolo.ts` sa gia' decidere da solo sui pixel veri dello
   * schermo; questo campo serve a poterlo forzare quando e' il LIVELLO a
   * chiederlo, cioe' su un desktop debole con uno schermo grande — il caso
   * che la soglia sui pixel non puo' vedere.
   */
  readonly abitacoloMobile: boolean
}

/**
 * I QUATTRO LIVELLI.
 *
 * Letti in colonna si legge l'ordine di caduta: prima la risoluzione e la
 * morbidezza delle luci, poi il riflesso e l'occlusione, poi la nitidezza
 * dell'ombra, e per ultimi il bloom e l'ombra stessa — cioe' le due cose che
 * portano un pezzo di racconto.
 */
export const IMPOSTAZIONI: Record<Livello, Impostazioni> = {
  /** una macchina da gioco, o un portatile Apple recente. Nulla e' spento. */
  alto: {
    nome: 'alto',
    pixelRatio: 2,
    riflesso: true,
    riflessoRisoluzione: 0.5,
    occlusione: true,
    campioniOcclusione: 16,
    multicampione: 4,
    bloom: true,
    ombra: 2048,
    ombraViva: true,
    luciCorte: 12,
    abitacoloMobile: false,
  },

  /**
   * Il grosso del parco macchine: un portatile con grafica integrata recente,
   * un telefono di fascia alta. Tutto acceso, tutto un gradino sotto —
   * e' il livello in cui il degrado e' letteralmente invisibile senza un
   * confronto affiancato.
   */
  medio: {
    nome: 'medio',
    pixelRatio: 1.5,
    riflesso: true,
    riflessoRisoluzione: 0.34,
    occlusione: true,
    campioniOcclusione: 8,
    multicampione: 0,
    bloom: true,
    ombra: 1024,
    ombraViva: true,
    luciCorte: 8,
    abitacoloMobile: false,
  },

  /**
   * Qui si comincia a togliere roba vera: cade la passata in piu' del
   * riflesso e cade l'occlusione. Restano l'ombra (che tiene l'auto a terra
   * da sola) e il bloom (che porta l'accensione).
   */
  basso: {
    nome: 'basso',
    pixelRatio: 1.25,
    riflesso: false,
    riflessoRisoluzione: 0.34,
    occlusione: false,
    campioniOcclusione: 0,
    multicampione: 0,
    bloom: false,
    ombra: 512,
    ombraViva: false,
    luciCorte: 4,
    abitacoloMobile: true,
  },

  /**
   * L'ultima spiaggia. Un pixel per pixel, nessuna passata in piu', nessuna
   * ombra. L'auto perde il contatto con il pavimento ed e' una perdita
   * grossa — ma un fotogramma ogni otto la storia la cambia molto piu' di
   * un'auto che galleggia, perche' a otto fotogrammi al secondo non c'e'
   * nessuna storia da raccontare.
   *
   * Restano: la coreografia intera, l'attraversamento del faro, le quattro
   * luci del porticato, l'abitacolo. Cioe' il sito.
   */
  minimo: {
    nome: 'minimo',
    pixelRatio: 1,
    riflesso: false,
    riflessoRisoluzione: 0.34,
    occlusione: false,
    campioniOcclusione: 0,
    multicampione: 0,
    bloom: false,
    ombra: 0,
    ombraViva: false,
    luciCorte: 4,
    abitacoloMobile: true,
  },
}

// Il bloom cade gia' a `basso` e non solo a `minimo`: e' scritto qui e non
// sopra perche' e' l'unica scelta della tabella che contraddice la regola
// «cio' che porta un beat cade per ultimo». Il motivo e' misurabile: il bloom
// e' l'unico passaggio che campiona in catena sei bersagli via via piu'
// piccoli, e su una scheda integrata quei sei passaggi valgono da soli piu'
// dell'occlusione. E l'accensione del quadro non si perde del tutto senza
// bloom — resta un rettangolo che si illumina, solo senza alone.

/* ------------------------------------------------------------------- */
/* IL RAPPORTO DI PIXEL VA AL CONTRARIO: MENO SUL GRANDE, PIU' SUL PICCOLO */
/* ------------------------------------------------------------------- */

/** sopra questa larghezza in pixel CSS la finestra e' «grande» */
const SOGLIA_LARGHEZZA = 768
/** il tetto sulle finestre grandi */
const TETTO_GRANDE = 1.25
/** e quello sulle finestre piccole */
const TETTO_PICCOLO = 2

/**
 * IL TETTO ALLA DENSITA' LO DECIDE LA LARGHEZZA DELLA FINESTRA.
 *
 *     larghezza  > 768   ->   1,25
 *     larghezza <= 768   ->   2
 *
 * La prima volta che si legge sembra un errore di battitura, perche' e' il
 * ROVESCIO di quello che fa quasi tutto il resto del mestiere: il telefono —
 * la macchina debole — riceve la densita' ALTA, e il desktop — la macchina
 * forte — quella bassa. La regola non guarda nemmeno che apparecchio sia:
 * guarda quanto e' larga la finestra, che e' una cosa diversa.
 *
 * LA RAGIONE E' FISICA, E STA NEL RIEMPIMENTO INVECE CHE NELLA POTENZA.
 *
 * Il prezzo di un passaggio a schermo intero non dipende da quanto e' brava
 * la scheda: dipende da quanti pixel deve ombreggiare, e quel numero cresce
 * col QUADRATO della densita'. Su questa scena i passaggi a schermo intero
 * sono quattro — il riflesso planare, l'occlusione ambientale a sedici
 * campioni per pixel, la catena del bloom su sei bersagli, il grado finale —
 * e su una finestra grande sono il costo dominante, molto piu' della
 * geometria. Raddoppiare la densita' su 1440x900 vuol dire quattro volte
 * quel costo. Un telefono ha un canvas piccolo: la' la densita' alta si paga
 * su pochi pixel in assoluto, e in cambio si vede davvero, perche' un
 * pannello a 3x lo si guarda a venticinque centimetri dagli occhi.
 *
 * I conti, sui due casi:
 *
 *     desktop 1440x900 a densita' 2      2880x1800 = 5,2 milioni di pixel
 *     lo stesso desktop a 1,25           1800x1125 = 2,0 milioni
 *     telefono 390x844 a densita' 3      1170x2532 = 3,0 milioni
 *     lo stesso telefono a 2              780x1688 = 1,3 milioni
 *
 * Cioe' anche DOPO aver rovesciato la regola il desktop continua a ombreggiare
 * una volta e mezza i pixel del telefono. Non si sta dando piu' lavoro alla
 * macchina piccola: si sta smettendo di darne una quantita' assurda a quella
 * grande.
 *
 * DA DOVE VIENE, ED E' MISURATA. E' la scelta del sito di Lando Norris, Site
 * of the Year 2025 di Awwwards, verificata sul loro sito: un desktop 1440x900
 * con `devicePixelRatio` 2 produce un buffer di 1800x1125, cioe' 1,25x; un
 * iPhone con `devicePixelRatio` 3 produce 780x1688, cioe' 2x. Il sito
 * dell'anno sotto-campiona il desktop del 37 per cento per lato — il 61 per
 * cento dei pixel — e nessun giurato se n'e' accorto.
 *
 * PERCHE' NON SE NE ACCORGE NESSUNO, e vale anche qui: una scena notturna con
 * nebbia, riflessi sfocati e bloom non ha bordi duri da perdere, e la scaletta
 * che la densita' bassa farebbe emergere — quella sui fili di luce sottili,
 * l'unico difetto di aliasing che in questo progetto qualcuno ha davvero
 * indicato col dito — la cura l'antialiasing speculare dentro lo shader
 * (`scene/Nitidezza.ts`), che sta nella matematica del materiale e non costa
 * un pixel.
 *
 * QUI SERVE A COMPRARE MARGINE NELL'ABITACOLO, che e' il tratto in cui il
 * costo per fotogramma e' piu' alto: dentro, la fotografia da 2560 px, il
 * quadro che fiorisce e il vetro riempiono lo schermo intero e non c'e' piu'
 * niente fuori campo da non disegnare.
 *
 * E' UNA SCELTA DELLA SOGLIA DI PARTENZA, NON UN SECONDO SISTEMA. Il gestore
 * qui sotto continua a fare esattamente il suo mestiere: misura, e se i
 * fotogrammi restano lunghi scende di livello lungo `SCALA` togliendo
 * riflesso, occlusione, multicampione, ombra e luci. Questa riga decide solo
 * da dove si parte.
 *
 * COSA SI PERDE, e va detto perche' e' un prezzo vero. Su un desktop a
 * densita' 2 i livelli alto, medio e basso finiscono tutti e tre a 1,25,
 * perche' 1,25 e' gia' sotto i loro tetti (2 / 1,5 / 1,25): su quel tipo di
 * schermo la risoluzione smette di essere una manopola del degrado e restano
 * le altre. Si accetta per due motivi. Il primo e' che si PARTE da dove prima
 * si arrivava scendendo di due livelli — il margine c'e' gia' dal primo
 * fotogramma invece di doverlo andare a prendere soffrendo tre secondi. Il
 * secondo e' che su un desktop a densita' 1, che e' la maggioranza, non cambia
 * assolutamente niente: li' i quattro livelli erano gia' appiattiti a 1 dal
 * tappo sul `devicePixelRatio`, e nessuno l'ha mai chiamato un difetto.
 *
 * DUE COSE SCARTATE.
 *
 * Riscalare l'intera scala sul desktop (1,25 / 0,94 / 0,78 / 0,63) per
 * riavere i gradini: sarebbero quattro numeri che nessuno ha misurato, e
 * sotto 1 il sotto-campionamento comincia a mangiare i bordi delle insegne,
 * che sono l'unica cosa in scena con del testo dentro.
 *
 * Mettere il tetto in `Esperienza`, accanto al `Math.min(devicePixelRatio,
 * ...)` che gia' c'e': sarebbero due numeri sulla stessa cosa in due file
 * diversi, ed e' il difetto che questo progetto ha gia' pagato — uno dei due
 * resta indietro, non da' nessun errore, e mente. Il tetto sta qui, dove sta
 * gia' la tabella dei livelli; `Esperienza` conserva un solo compito, chiudere
 * sulla densita' vera dell'apparecchio, che e' l'unica cosa che sa lei.
 *
 * LA LARGHEZZA E' `innerWidth`, in pixel CSS come chiede la regola. Scartato
 * `documentElement.clientWidth`, che toglierebbe la barra di scorrimento:
 * costa una lettura che forza il calcolo del layout, e i quindici pixel di
 * differenza contano solo per chi ha la finestra larga esattamente 768.
 */
export function tettoPerLarghezza(larghezza: number = innerWidth): number {
  return larghezza > SOGLIA_LARGHEZZA ? TETTO_GRANDE : TETTO_PICCOLO
}

/* ------------------------------------------------------------------ */
/* GLI INDIZI: cosa si puo' sapere PRIMA di aver disegnato un fotogramma */
/* ------------------------------------------------------------------ */

export type Indizi = {
  /** `navigator.hardwareConcurrency`, 0 se non lo dice */
  nucleo: number
  /** `navigator.deviceMemory` in GB, 0 se non lo dice (Safari e Firefox non lo dicono) */
  memoria: number
  /** la stringa del renderer WebGL, minuscola. Vuota se il browser la nasconde. */
  gpu: string
  /** `pointer: coarse` — un dito, non un mouse */
  grossolano: boolean
  /** `devicePixelRatio` grezzo, non tappato */
  dpr: number
  /** il voto che ne esce, prima delle regole di prudenza */
  punteggio: number
}

type NavigatoreEsteso = Navigator & { deviceMemory?: number }

/**
 * LE FAMIGLIE DI SCHEDE, e perche' si guarda questa stringa e non lo user
 * agent.
 *
 * Lo user agent dice CHI E' il browser, non QUANTO CORRE la macchina: lo
 * stesso «Android 14; Chrome» sta su un telefono da milleduecento euro e su
 * uno da centoventi, e i due differiscono di venti volte. E' la trappola
 * classica, e produce sempre lo stesso difetto: il sito bello sul telefono
 * scarso e il sito brutto su quello caro. `WEBGL_debug_renderer_info` invece
 * dice il nome del pezzo che dovra' fare il lavoro, che e' l'unica cosa
 * pertinente.
 *
 * In cambio va presa per quello che e': un indizio. Molti browser la
 * offuscano o la negano del tutto, e allora il voto viene da nucleo e
 * memoria e la misura sistema tutto in pochi secondi.
 */
const GPU_FINTA = /swiftshader|llvmpipe|software|basic render|microsoft basic/
const GPU_FORTE =
  /rtx|radeon rx [5-9]\d{3}|radeon pro|arc [ab]\d{3}|apple m[1-9]|quadro|geforce gtx (9[7-8]0|10[5-8]0|16[5-6]0)/
const GPU_MEDIA =
  /iris xe|iris plus|uhd graphics 7\d{2}|apple gpu|apple a1[4-9]|adreno \(tm\) [78]\d{2}|adreno [78]\d{2}|immortalis|mali-g7[1-9]|mali-g[89]\d/
const GPU_DEBOLE =
  /mali-g[3-6]\d|mali-t\d|powervr|adreno \(tm\) [1-5]\d{2}|adreno [1-5]\d{2}|hd graphics|uhd graphics 6\d{2}|intel\(r\) hd/

function stringaGpu(gl?: WebGLRenderingContext | WebGL2RenderingContext | null): string {
  let contesto: WebGLRenderingContext | WebGL2RenderingContext | null = gl ?? null
  // SE NESSUNO CE LO PASSA se ne apre uno e lo si butta subito. Un contesto
  // WebGL in piu' lasciato aperto non e' gratis: i browser ne tengono un
  // numero limitato (una decina) e quando si supera CHIUDONO IL PIU' VECCHIO,
  // che a quel punto e' quello della scena. Da qui il `loseContext` esplicito
  // invece di lasciarlo al raccoglitore di rifiuti, che passerebbe chissa'
  // quando.
  let usaEGetta = false
  if (!contesto) {
    const tela = document.createElement('canvas')
    contesto = (tela.getContext('webgl2') ??
      tela.getContext('webgl')) as WebGLRenderingContext | null
    usaEGetta = true
  }
  if (!contesto) return ''

  let nome = ''
  const ext = contesto.getExtension('WEBGL_debug_renderer_info') as
    | { UNMASKED_RENDERER_WEBGL: number }
    | null
  if (ext) nome = String(contesto.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '')
  if (!nome) nome = String(contesto.getParameter(contesto.RENDERER) ?? '')

  if (usaEGetta) {
    const perdi = contesto.getExtension('WEBGL_lose_context') as { loseContext(): void } | null
    perdi?.loseContext()
  }
  return nome.toLowerCase()
}

export function raccogliIndizi(gl?: WebGLRenderingContext | WebGL2RenderingContext | null): Indizi {
  const nav = navigator as NavigatoreEsteso
  const nucleo = nav.hardwareConcurrency || 0
  const memoria = nav.deviceMemory || 0
  const gpu = stringaGpu(gl)
  const grossolano = matchMedia('(pointer: coarse)').matches
  const dpr = devicePixelRatio || 1

  let punteggio = 0

  // I NUCLEI CONTANO PERCHE' QUESTA SCENA E' LIMITATA DALLA CPU almeno
  // quanto dalla scheda: due passate di scena intera (riflesso e ombra) piu'
  // qualche centinaio di chiamate di disegno sono lavoro di programma, non di
  // pixel. Un doppio nucleo non e' una macchina lenta, e' una macchina che
  // non ha dove mettere il lavoro del browser mentre disegna.
  if (nucleo >= 8) punteggio += 2
  else if (nucleo >= 4) punteggio += 1
  else if (nucleo > 0) punteggio -= 1

  // LA MEMORIA E' UN INDIZIO DEBOLE ma quasi gratis: chi dichiara 2 GB non ha
  // mai una scheda buona. Chi non dichiara niente non viene penalizzato — e'
  // quasi sempre Safari, e Safari sta su hardware Apple, cioe' l'ultimo posto
  // in cui conviene essere pessimisti.
  if (memoria >= 8) punteggio += 2
  else if (memoria >= 4) punteggio += 1
  else if (memoria > 0 && memoria <= 2) punteggio -= 1

  if (GPU_FINTA.test(gpu)) {
    // niente scheda: si disegna col processore. Non c'e' misura da fare, e
    // non c'e' livello che la salvi: si parte dal minimo e si spera.
    punteggio -= 100
  } else if (GPU_FORTE.test(gpu)) punteggio += 3
  else if (GPU_MEDIA.test(gpu)) punteggio += 2
  else if (GPU_DEBOLE.test(gpu)) punteggio -= 3

  // IL DITO NON DICE «TELEFONO», DICE «BATTERIA». Un pannello tattile e'
  // quasi sempre un apparecchio alimentato a batteria con un dissipatore che
  // non esiste: i suoi primi trenta secondi sono i suoi migliori trenta
  // secondi, e qualunque misura fatta all'avvio e' ottimistica per
  // costruzione. Un punto in meno e' il prezzo di quel calore che arrivera'.
  if (grossolano) punteggio -= 1

  // e una densita' molto alta su pochi nuclei e' la firma del telefono
  // economico con lo schermo bello: tanti pixel da riempire, poco con cui
  // riempirli
  if (dpr >= 3 && nucleo > 0 && nucleo <= 4) punteggio -= 1

  return { nucleo, memoria, gpu, grossolano, dpr, punteggio }
}

/**
 * IL LIVELLO DI PARTENZA E' UNA SCOMMESSA, E VA FATTA AL RIALZO.
 *
 * L'asimmetria e' tutta nei tempi dell'isteresi: sbagliare verso l'alto costa
 * TRE SECONDI di fotogrammi lunghi, sbagliare verso il basso costa DIECI
 * SECONDI di sito brutto piu' l'intero avvio — cioe' proprio i secondi in cui
 * si decide se qualcuno resta. Fra due livelli plausibili si prende quello
 * migliore, sempre.
 *
 * L'unica prudenza e' sul tattile, ed e' l'altra faccia dello stesso
 * ragionamento: la' la misura dei primi secondi MENTE, perche' il telefono
 * non si e' ancora scaldato. Nessun apparecchio a dito parte da `alto`; se lo
 * merita ci sale in dieci secondi, con una misura fatta a regime invece che a
 * freddo.
 */
export function livelloIniziale(i: Indizi): Livello {
  let l: Livello
  if (i.punteggio >= 5) l = 'alto'
  else if (i.punteggio >= 2) l = 'medio'
  else if (i.punteggio >= 0) l = 'basso'
  else l = 'minimo'

  if (i.grossolano && l === 'alto') l = 'medio'
  return l
}

/* ------------------------------------------------------------------ */
/* LA MISURA, CON ISTERESI                                             */
/* ------------------------------------------------------------------ */

/** il budget dichiarato dal §14.6: 60 fotogrammi al secondo sostenuti */
const BUDGET = 16.7

/**
 * SOPRA QUESTA MEDIA SI STA SOFFRENDO — 19,5 ms, cioe' 51 fotogrammi.
 *
 * Non e' 16,7 e non poteva esserlo. Su un pannello a 60 Hz i tempi si
 * quantizzano: un fotogramma o costa 16,7 o costa 33,3, non esistono valori
 * in mezzo. Una media di 19,5 ms vuol dire che circa un fotogramma su sei sta
 * saltando un giro — ed e' proprio li' che uno scorrimento continuo comincia
 * a leggersi a scatti. A 18 ms (un salto ogni dodici) non si vede ancora, e
 * degradare per qualcosa che non si vede e' peggio che non degradare.
 */
const SOGLIA_SOFFERENZA = 19.5

/**
 * UN FOTOGRAMMA OLTRE QUESTO E' UN GIRO PERSO — 18,5 ms.
 *
 * Serve alla SALITA, che non puo' basarsi su una soglia bassa: col vsync il
 * tempo fra due fotogrammi non scende sotto il periodo del pannello nemmeno
 * a scheda ferma, quindi «media sotto 13 ms» su un monitor a 60 Hz e' una
 * condizione che non si verifica mai. Si conta invece quanti giri si
 * perdono: zero giri persi per dieci secondi vuol dire che c'e' margine,
 * qualunque sia la frequenza del pannello.
 */
const SOGLIA_LUNGO = 18.5

/** oltre questa media non si accumula agio nemmeno se non si perde un giro */
const SOGLIA_AGIO = 17.4

/** quota di giri persi tollerata sulla finestra di salita: due su cento */
const QUOTA_LUNGHI = 0.02

/**
 * TRE SECONDI PER SCENDERE, DIECI PER SALIRE — l'asimmetria e' il punto.
 *
 * Tre secondi bastano a distinguere «questa macchina non ce la fa» da «e'
 * passato un tratto pesante»: il tratto piu' carico della coreografia — lo
 * scambio, con il filmato della strada che comincia a decodificare — dura
 * meno di due secondi. Dieci secondi per salire perche' la salita e' una
 * scommessa, e una scommessa persa costa un altro cambio di livello, cioe'
 * la cosa che si sta cercando di evitare.
 */
const ATTESA_GIU = 3.0
const ATTESA_SU = 10.0

/**
 * DOPO OGNI CAMBIO SI BUTTANO OTTO DECIMI DI MISURA.
 *
 * Cambiare livello COSTA: cambiare il rapporto di pixel rialloca ogni
 * bersaglio di rendering della catena, cambiare i campioni dell'occlusione
 * ricompila il suo materiale, ridimensionare la mappa d'ombra la ributta via
 * e la ridisegna. Sono decine di millisecondi che finirebbero dritti nella
 * media e verrebbero letti come «anche il livello nuovo soffre» — cioe' il
 * degrado si darebbe da solo la ragione per degradare ancora, fino al
 * minimo, in tre secondi. E' il modo piu' facile per scrivere un sistema
 * adattivo che crolla sempre.
 */
const ASSESTAMENTO = 0.8

/**
 * E DAL CARICAMENTO SI ASPETTANO DUE SECONDI E MEZZO.
 *
 * All'avvio arrivano le tessiture della pietra, si compilano gli shader, si
 * genera la mappa d'ambiente con una passata intera (vedi
 * `Esperienza.accendiAmbiente`). Sono i fotogrammi piu' lenti che quella
 * macchina vedra' mai, e non dicono niente sul suo regime.
 */
const RISCALDAMENTO = 2.5

/**
 * LA COSTANTE DI TEMPO DELLA MEDIA MOBILE: mezzo secondo.
 *
 * Piu' corta e la media insegue il rumore — un solo fotogramma lungo la fa
 * sbandare e la decisione diventa un lancio di dadi. Piu' lunga e non si
 * accorge di un tratto pesante finche' non e' finito. Mezzo secondo e'
 * abbastanza da mediare una trentina di fotogrammi e abbastanza poco da
 * reagire dentro i tre secondi di attesa.
 *
 * La media e' ESPONENZIALE E LEGATA AL TEMPO, non ai fotogrammi:
 * `1 - exp(-dt/tau)`. Con un peso fisso per fotogramma, una macchina a 10 fps
 * avrebbe una media sei volte piu' lenta a reagire di una a 60 — cioe' il
 * sistema sarebbe piu' lento a reagire proprio dove serve piu' in fretta.
 */
const TAU = 0.5

export class Qualita {
  /** il livello che sta girando adesso */
  livello: Livello

  /**
   * `prefers-reduced-motion`, e la regola che ne discende.
   *
   * CHI LO CHIEDE NON DEVE RICEVERE MENO SITO, DEVE RICEVERE MENO MOVIMENTO
   * AUTOMATICO. La distinzione e' tutta qui: il movimento che nasce dal dito
   * o dalla rotella e' voluto — l'ha chiesto chi guarda, ed e' il modo in cui
   * si legge questa pagina — quindi resta. Sparisce quello che si muove DA
   * SOLO: l'inerzia che continua a scorrere dopo che ci si e' fermati, la
   * deriva lenta della camera, gli spostamenti che partono senza che nessuno
   * li abbia chiesti.
   *
   * Chi soffre di disturbi vestibolari sta male per il movimento che non
   * controlla, non per il movimento in se'. Un sito che alla richiesta
   * risponde togliendo contenuti ha capito la domanda al contrario.
   *
   * IL VALORE NON NASCE PIU' QUI, E IL RAGIONAMENTO QUI SOPRA RESTA GIUSTO.
   *
   * Fin qui questo campo era la lettura vera: un `matchMedia` nel costruttore
   * e un ascolto del cambio. Cio' che diceva il commento era corretto — la
   * distinzione fra movimento voluto e movimento automatico e' esattamente
   * quella — e cio' che mancava era che nessuno la applicava: l'unico
   * consumatore era `Esperienza.applicaQualita()`, che gira SOLO al cambio di
   * livello. Chi accendeva la preferenza a pagina aperta poteva non vedere mai
   * l'effetto, perche' l'unica cosa che lo avrebbe portato in scena e' un calo
   * di fotogrammi che magari non arriva.
   *
   * Adesso la lettura sta in `core/Moto.ts`, che e' il posto che si va a
   * cercare quando si vuole sapere come il sito onora quella richiesta, e
   * questo resta un getter di comodo per chi ha gia' in mano il gestore di
   * qualita' — la scheda tecnica, gli strumenti — senza che diventi una
   * SECONDA lettura che puo' divergere dalla prima.
   */
  get motoRidotto(): boolean { return RIDOTTO }

  /** cosa si sapeva della macchina prima di disegnare: serve al registro e agli strumenti */
  readonly indizi: Indizi

  /**
   * IL TETTO ALLA DENSITA' DECISO DALLA LARGHEZZA — letto UNA VOLTA sola.
   *
   * Congelato apposta, e non per pigrizia. `Esperienza` porta il rapporto di
   * pixel sul renderer in due soli momenti — alla costruzione e al cambio di
   * livello — e non lo rifa' al ridimensionamento, perche' rifarlo vorrebbe
   * dire riallocare ogni bersaglio della catena a ogni fotogramma mentre si
   * trascina il bordo della finestra. Se questo numero si leggesse dal vivo,
   * fra un ridimensionamento e il cambio di livello successivo direbbe una
   * cosa diversa da quella che il renderer sta davvero usando: di nuovo due
   * numeri sulla stessa cosa e uno indietro, solo dentro lo stesso file.
   * Congelato non puo' succedere, e il valore resta d'accordo con
   * `renderer.getPixelRatio()` per tutta la visita.
   *
   * Il caso che sembra un difetto e non lo e': un telefono girato in
   * orizzontale misura 844 px di larghezza, cioe' sopra la soglia, e si tiene
   * il tetto del ritratto. Va bene cosi' — ruotare non cambia il numero di
   * pixel da ombreggiare, solo la loro forma, quindi il costo di riempimento
   * e' identico e non c'e' niente da correggere.
   *
   * Pubblico perche' `descrivi()` lo stampa: una decisione che non si vede nel
   * registro e' una decisione che nessuno verifica.
   */
  readonly tettoPixel = tettoPerLarghezza()

  /**
   * Si puo' spegnere l'adattamento e pilotare il livello a mano — serve a
   * `strumenti/qualita.mjs`, che deve poter misurare lo STESSO percorso sui
   * quattro livelli senza che il sistema glieli cambi sotto.
   */
  adatta = true
  /** un cambio di livello e' avvenuto e nessuno l'ha ancora applicato */
  private daApplicare = false

  private media = BUDGET

  /**
   * IL TEMPO PER FOTOGRAMMA MISURATO, in millisecondi.
   *
   * Si apre al pubblico perche' la scheda informativa lo mostra, e mostrarlo
   * cambia la natura di quel numero: da diagnostica interna diventa la PROVA di
   * cio' che il sito dichiara. E' anche il motivo per cui non se ne puo'
   * scrivere uno finto — un numero fermo su un valore tondo lo riconosce
   * chiunque in tre secondi.
   *
   * E' una media esponenziale, non l'ultimo fotogramma: l'ultimo salta di
   * continuo e sullo schermo darebbe un numero illeggibile.
   */
  get tempoMedio() { return this.media }
  private tempoSofferenza = 0
  private tempoAgio = 0
  private quadri = 0
  private lunghi = 0
  private quarantena = 0
  private dallAvvio = 0

  /**
   * IL TETTO, cioe' la regola che chiude l'oscillazione per sempre.
   *
   * Se si sale a un livello e da li' si torna giu', quella macchina ha
   * RISPOSTO: quel livello non lo regge. Senza tetto il sistema ci
   * riproverebbe dieci secondi dopo, e poi ancora, per tutta la visita — e
   * un'oscillazione lenta si vede molto piu' del calo di qualita' che
   * dovrebbe nascondere, perche' l'occhio non nota un livello basso ma nota
   * benissimo un CAMBIO. Da quel momento in poi il livello puo' solo
   * scendere.
   */
  private tetto = 0
  private salitoQui = false

  constructor(gl?: WebGLRenderingContext | WebGL2RenderingContext | null) {
    this.indizi = raccogliIndizi(gl)
    this.livello = livelloIniziale(this.indizi)

    /* QUI C'ERANO IL `matchMedia` E L'ASCOLTO DEL CAMBIO, e l'ascolto era la
       parte giusta: una preferenza di sistema si puo' accendere a pagina
       aperta, e chi la accende in quel momento la accende proprio perche' un
       sito gli sta dando fastidio. Quell'ascolto non e' sparito, si e'
       spostato in `core/Moto.ts` — dove serve a tutti e non solo a chi ha in
       mano il gestore di qualita'. Vedi il getter `motoRidotto`. */
  }

  /**
   * Le impostazioni del livello corrente, col rapporto di pixel GIA' ABBASSATO
   * al tetto dello schermo. Chi chiama non deve sapere che esiste una soglia a
   * 768: legge un numero e lo applica.
   *
   * IL RECORD RESTA LO STESSO OGGETTO finche' il livello non cambia, e non e'
   * pignoleria: `Esperienza.fotogramma()` legge questo getter sessanta volte
   * al secondo per decidere il riflesso, e costruire li' un oggetto nuovo a
   * ogni giro vorrebbe dire regalare al raccoglitore di rifiuti sessanta
   * oggetti al secondo — cioe' un fotogramma lungo ogni tanto, esattamente il
   * difetto che questo modulo esiste per evitare.
   *
   * Si confronta `nome` e non l'oggetto perche' e' l'unico campo che dice da
   * quale riga della tabella viene il record: la copia risolta non e' piu'
   * identica a `IMPOSTAZIONI[livello]`, e paragonarli darebbe sempre diverso.
   */
  get impostazioni(): Impostazioni {
    const base = IMPOSTAZIONI[this.livello]
    if (!this.risolte || this.risolte.nome !== base.nome) {
      this.risolte = { ...base, pixelRatio: Math.min(base.pixelRatio, this.tettoPixel) }
    }
    return this.risolte
  }

  /** la copia risolta dell'ultimo livello chiesto: vedi il getter qui sopra */
  private risolte: Impostazioni | null = null

  /** il tempo medio per fotogramma misurato adesso, in millisecondi */
  get millisecondi(): number {
    return this.media
  }

  /** quanto si e' dentro il budget: 1 = esattamente 16,7 ms, meno di 1 = si avanza */
  get carico(): number {
    return this.media / BUDGET
  }

  /**
   * Si chiama una volta per fotogramma con lo stesso `dt` in SECONDI che usa
   * il resto del motore. Torna `true` — e solo allora — se il livello e'
   * cambiato: chi chiama riapplica le impostazioni e per il resto non fa
   * niente.
   */
  aggiorna(dt: number): boolean {
    // un dt fuori scala non e' lentezza, e' assenza: la scheda si e' persa il
    // contesto, il sistema e' andato in sospensione, la scheda del browser e'
    // finita in secondo piano. Misurarlo vorrebbe dire degradare un sito che
    // in quel momento nessuno stava guardando.
    if (!(dt > 0) || dt > 1) return false

    this.dallAvvio += dt
    if (this.quarantena > 0) this.quarantena -= dt
    if (this.dallAvvio < RISCALDAMENTO) return false

    const ms = dt * 1000
    // media esponenziale legata al tempo: vedi TAU
    const k = 1 - Math.exp(-dt / TAU)
    this.media += (ms - this.media) * k

    /* L'ANNUNCIO VIENE PRIMA DELLA GUARDIA. `adatta` decide se questo oggetto
       puo' DECIDERE un cambio, non se un cambio gia' avvenuto vada applicato:
       sono due domande diverse, e tenerle insieme e' il difetto che ha reso
       muto `forza()`. Si consuma, cosi' l'applicazione avviene una volta sola. */
    if (this.daApplicare) {
      this.daApplicare = false
      return true
    }

    if (!this.adatta) return false

    /* --- si scende? --- */
    if (this.media > SOGLIA_SOFFERENZA) {
      this.tempoSofferenza += dt
      // soffrire azzera l'agio: le due condizioni non possono maturare
      // insieme, se no basterebbe un'alternanza per farle scattare entrambe
      this.azzeraAgio()
      if (this.tempoSofferenza >= ATTESA_GIU) {
        const giu = Math.min(this.indice() + 1, SCALA.length - 1)
        if (giu !== this.indice()) {
          // E' QUI CHE SI MONTA IL TETTO. Si scende da un livello in cui si
          // era SALITI: la scommessa e' stata smentita, e non si riprova.
          if (this.salitoQui) this.tetto = giu
          this.cambia(giu, false)
          return true
        }
        // gia' al minimo: si smette di contare, se no il primo fotogramma
        // buono trova un contatore pieno e la macchina sembra piu' instabile
        // di quanto sia
        this.tempoSofferenza = ATTESA_GIU
      }
      return false
    }
    this.tempoSofferenza = 0

    /* --- si sale? --- */
    if (this.indice() <= this.tetto || this.quarantena > 0) return false

    this.quadri += 1
    if (ms > SOGLIA_LUNGO) this.lunghi += 1
    // qualche giro perso ci sta sempre: un raccoglitore di rifiuti che passa,
    // una tessitura che arriva. Sopra il due per cento invece non e' rumore,
    // e' una macchina che sta al limite: in dieci secondi a 60 fotogrammi
    // sono dodici scatti, e dodici scatti si vedono.
    if (this.media > SOGLIA_AGIO || this.lunghi > Math.max(2, this.quadri * QUOTA_LUNGHI)) {
      this.azzeraAgio()
      return false
    }

    this.tempoAgio += dt
    if (this.tempoAgio >= ATTESA_SU) {
      this.cambia(this.indice() - 1, true)
      return true
    }
    return false
  }

  /** forza un livello e — di norma — spegne l'adattamento. Solo per gli strumenti. */
  forza(l: Livello, continuaAdAdattarsi = false) {
    this.adatta = continuaAdAdattarsi
    this.cambia(SCALA.indexOf(l), false)
    this.salitoQui = false
  }

  private indice() {
    return SCALA.indexOf(this.livello)
  }

  private azzeraAgio() {
    this.tempoAgio = 0
    this.quadri = 0
    this.lunghi = 0
  }

  private cambia(indice: number, salendo: boolean) {
    /* IL CAMBIO SI ANNUNCIA DA QUI, e non dal ramo che l'ha deciso.
       Prima l'annuncio era il `return true` del ramo adattivo dentro
       `aggiorna()`. Funzionava per le discese e le salite automatiche e NON
       per `forza()`, che cambia il livello da fuori: `forza` spegne `adatta`,
       e `aggiorna` esce con `false` prima di arrivare al punto in cui l'avrebbe
       detto. Risultato: `Esperienza.applicaQualita()` non veniva mai chiamato
       dopo un `fissaQualita`.
       Misurato: dopo `fissaQualita('minimo')` le impostazioni dicevano
       pixelRatio 1 e il renderer restava a 1,25. Valeva per il rapporto di
       pixel, il bagliore, l'occlusione e l'ombra.
       E NON SI E' MAI VISTO NEI PROVINI per la ragione peggiore che ci sia: il
       riflesso planare e' l'unica impostazione che `fotogramma()` rilegge a
       ogni giro, quindi seguiva subito — ed e' esattamente quello che i provini
       guardano. Uno strumento che misura la sola cosa che funziona non puo'
       accorgersi che il resto no.
       Mettendo l'annuncio dove il cambio AVVIENE, chiunque cambi livello lo
       dichiara: non c'e' piu' una strada che cambia in silenzio. */
    this.daApplicare = true
    this.livello = SCALA[Math.min(Math.max(indice, 0), SCALA.length - 1)]
    this.salitoQui = salendo
    this.tempoSofferenza = 0
    this.azzeraAgio()
    // il cronometro dell'assestamento e' lo stesso del riscaldamento: per
    // otto decimi di secondo non si misura niente, perche' quello che si
    // misurerebbe e' il costo del cambio e non quello del livello nuovo
    this.dallAvvio = RISCALDAMENTO - ASSESTAMENTO
    // e la media riparte dal budget invece che dal valore vecchio, che
    // descriveva un livello che non esiste piu'
    this.media = BUDGET
    if (salendo) {
      // DOPO UNA SALITA C'E' UN TEMPO MORTO. Venti secondi: due volte la
      // finestra di salita. Serve a garantire che, anche nel caso peggiore —
      // sale, soffre, scende, risale — il periodo dell'oscillazione stia
      // sopra la mezza minuto, cioe' sotto la frequenza a cui l'occhio la
      // legge come un difetto invece che come un assestamento. Nella pratica
      // non ci si arriva quasi mai, perche' il tetto chiude il giro alla
      // prima discesa.
      this.quarantena = 20
    }
  }

  /** una riga per il registro: quello che si sapeva e quello che si e' deciso */
  descrivi(): string {
    const i = this.indizi
    // IL RAPPORTO DI PIXEL SI STAMPA DUE VOLTE, E NON E' UNA RIPETIZIONE:
    // `dpr` e' quello che offre l'apparecchio, `px` e' quello che il renderer
    // ricevera' davvero — cioe' il minore fra la densita' vera, il tetto dello
    // schermo e il tetto del livello. Senza il secondo numero, una finestra
    // larga che sotto-campiona del 37 per cento e' una decisione invisibile, e
    // le decisioni invisibili in questo progetto sono costate settimane.
    const px = Math.min(i.dpr, this.impostazioni.pixelRatio)
    return `[qualita] ${this.livello} (voto ${i.punteggio}) ` +
      `nuclei ${i.nucleo || '?'} mem ${i.memoria || '?'}GB dpr ${i.dpr} px ${px} ` +
      `(largo ${innerWidth}, tetto ${this.tettoPixel}) ` +
      `${i.grossolano ? 'dito' : 'mouse'} moto${this.motoRidotto ? 'Ridotto' : 'Pieno'} ` +
      `gpu "${i.gpu || 'nascosta'}"`
  }
}

/* ------------------------------------------------------------------ */
/* L'UNICA COSA CHE QUESTO FILE APPLICA DA SE'                         */
/* ------------------------------------------------------------------ */

/**
 * SPEGNE LE PUNTIFORMI DELLA CORTE SENZA TOGLIERLE DALLA SCENA.
 *
 * Sta qui e non in `Esperienza` perche' e' la regola in cui e' facilissimo
 * sbagliare, e sbagliarla costa un blocco di centinaia di millisecondi: il
 * numero di luci in scena e' una costante di compilazione dello shader, e
 * toglierne una — o nasconderla con `visible` — ricompila ogni materiale
 * della scena. Si spegne SEMPRE portando l'intensita' a zero. Il conteggio
 * non cambia mai, non si ricompila niente, e una luce a zero costa quanto una
 * moltiplicazione.
 *
 * QUALI SI SPENGONO, e non e' indifferente. Le dodici sono tre per lato, in
 * ordine: (-0,62 / 0 / +0,62) del lato. Spegnere «le ultime quattro»
 * lascerebbe un lato intero al buio, e un lato al buio non e' un degrado, e'
 * un'altra corte. Si tiene invece per prima la centrale di ogni lato, poi le
 * due esterne: cosi' ogni lato perde morbidezza allo stesso modo e nessuno
 * si spegne.
 *
 * E L'INTENSITA' SI RIDISTRIBUISCE. Tre luci da 26 e una da 78 mandano nella
 * corte la stessa quantita' di luce: cambia la MORBIDEZZA — una sorgente sola
 * fa un pozzo un po' piu' marcato — non l'esposizione. E' esattamente il
 * degrado che si puo' fare, perche' il fotogramma resta lo stesso fotogramma
 * un po' meno raffinato, e non un fotogramma piu' buio.
 *
 * `forze` sono le intensita' originali, lette una volta alla costruzione:
 * rileggerle dalle luci dopo averle spente darebbe zero, e alla risalita la
 * corte resterebbe spenta per sempre. E' il difetto che questa firma rende
 * impossibile.
 */
export function applicaLuciCorte(luci: PointLight[], forze: number[], quante: number) {
  const lati = 4
  const perLato = Math.max(1, Math.round(luci.length / lati))
  const tenute = Math.min(Math.max(1, Math.round(quante / lati)), perLato)
  // la centrale per prima, poi le esterne: 1, 0, 2
  const priorita = [1, 0, 2]
  // il compenso: cio' che si spegne lo rimettono le altre
  const compenso = perLato / tenute

  for (let i = 0; i < luci.length; i++) {
    const posto = i % perLato
    const rango = priorita.indexOf(posto)
    const acceso = (rango < 0 ? posto : rango) < tenute
    luci[i].intensity = acceso ? forze[i] * compenso : 0
  }
}

/* ------------------------------------------------------------------ *\
 * DA AGGIUNGERE A `core/Esperienza.ts` — righe esatte.
 * ------------------------------------------------------------------
 *
 * (1) IN TESTA, fra gli altri import:
 *
 *     import { PointLight, DirectionalLight } from 'three'   // aggiungerli alla lista che c'e' gia'
 *     import { Qualita, applicaLuciCorte, type Impostazioni } from './Qualita'
 *
 * (2) FRA I CAMPI della classe, accanto a `readonly scorrimento`:
 *
 *     readonly qualita: Qualita
 *     private luciCorte: PointLight[] = []
 *     private forzeCorte: number[] = []
 *     private ombraLuce: DirectionalLight | null = null
 *
 * (3) NEL COSTRUTTORE, subito dopo `this.renderer = new WebGLRenderer(...)`,
 *     al posto della riga `this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`:
 *
 *     // il livello si decide PRIMA di qualunque altra cosa: il rapporto di
 *     // pixel, la risoluzione del riflesso e lo stato delle ombre sono tutte
 *     // decisioni che a caldo costano care o non si possono piu' prendere
 *     this.qualita = new Qualita(this.renderer.getContext())
 *     console.log(this.qualita.descrivi())
 *     this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.qualita.impostazioni.pixelRatio))
 *     // LE OMBRE SI ACCENDONO O NO QUI E BASTA: `shadowMap.enabled` e'
 *     // un define, cambiarlo a caldo ricompila tutta la scena
 *     this.renderer.shadowMap.enabled = this.qualita.impostazioni.ombra > 0
 *
 * (4) NEL COSTRUTTORE, al posto di `this.riflesso = new Riflesso(60, normaliMarmo())`:
 *
 *     this.riflesso = new Riflesso(60, normaliMarmo(), this.qualita.impostazioni.riflessoRisoluzione)
 *
 * (5) NEL COSTRUTTORE, subito dopo `this.scena.add(costruisciLuci())`:
 *
 *     // le dodici della corte e la direzionale si raccolgono UNA VOLTA, con
 *     // le loro intensita' vere: dopo il primo spegnimento non sarebbero
 *     // piu' leggibili dalle luci stesse
 *     this.scena.getObjectByName('CORTE')?.traverse((o) => {
 *       if ((o as PointLight).isPointLight) this.luciCorte.push(o as PointLight)
 *     })
 *     this.forzeCorte = this.luciCorte.map((l) => l.intensity)
 *     this.ombraLuce = this.scena.getObjectByName('OMBRA') as DirectionalLight | null
 *
 * (6) NEL COSTRUTTORE, come ULTIMA riga (dopo `addEventListener('resize', ...)`):
 *
 *     this.applicaQualita()
 *
 * (7) UN METODO NUOVO, accanto a `tara`:
 *
 *     / **
 *      * Riporta sul motore cio' che il livello ha deciso. Si chiama solo al
 *      * cambio di livello, mai per fotogramma: ognuna di queste righe rialloca
 *      * qualcosa o ricompila un materiale, e farlo sessanta volte al secondo
 *      * costerebbe piu' di tutto quello che sta risparmiando.
 *      * /
 *     private applicaQualita() {
 *       const q: Impostazioni = this.qualita.impostazioni
 *
 *       this.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio))
 *       this.composer?.setPixelRatio(this.renderer.getPixelRatio())
 *
 *       if (this.bloom) this.bloom.enabled = q.bloom
 *       if (this.ao) {
 *         this.ao.enabled = q.occlusione
 *         // cambiare i campioni ricompila UN materiale a schermo intero, non
 *         // la scena: e' un intoppo da pochi millisecondi ed e' il motivo per
 *         // cui si tocca solo qui
 *         if (q.occlusione) this.ao.updateGtaoMaterial({ samples: q.campioniOcclusione })
 *       }
 *
 *       // il riflesso si spegne dal ciclo (vedi punto 8): qui basta il caso in
 *       // cui il livello lo vieta del tutto
 *       this.riflesso.attivo = this.riflesso.attivo && q.riflesso
 *
 *       if (this.ombraLuce && q.ombra > 0) {
 *         if (this.ombraLuce.shadow.mapSize.x !== q.ombra) {
 *           this.ombraLuce.shadow.mapSize.set(q.ombra, q.ombra)
 *           // la mappa vecchia va buttata a mano: `mapSize` da sola non la
 *           // rialloca, e three continuerebbe a disegnare nella vecchia
 *           this.ombraLuce.shadow.map?.dispose()
 *           this.ombraLuce.shadow.map = null
 *         }
 *         // congelata: la direzionale e l'auto non si muovono, quindi la mappa
 *         // e' identica a se stessa ogni fotogramma. Si chiede un aggiornamento
 *         // solo quando la scena cambia davvero.
 *         this.ombraLuce.shadow.autoUpdate = q.ombraViva
 *         this.ombraLuce.shadow.needsUpdate = true
 *       }
 *
 *       applicaLuciCorte(this.luciCorte, this.forzeCorte, q.luciCorte)
 *       this.ridimensiona()
 *     }
 *
 * (8) IN `fotogramma()`, al posto di
 *     `this.riflesso.attivo = !dentro && !corridoio`:
 *
 *     this.riflesso.attivo = this.qualita.impostazioni.riflesso && !dentro && !corridoio
 *
 * (9) IN `fotogramma()`, subito dopo `this.ultimo = ora`:
 *
 *     if (this.qualita.aggiorna(dt)) {
 *       console.log('[qualita] ->', this.qualita.livello,
 *         this.qualita.millisecondi.toFixed(1), 'ms')
 *       this.applicaQualita()
 *     }
 *
 * (10) E DUE PUNTI IN CUI SERVE UN AGGIORNAMENTO D'OMBRA quando e' congelata,
 *      perche' la scena cambia davvero: in fondo a `caricaAuto()` e nel
 *      fotogramma in cui `dentro` cambia valore —
 *
 *      if (this.ombraLuce) this.ombraLuce.shadow.needsUpdate = true
 *
 * (11) DOVE SI COSTRUISCE L'ABITACOLO (`scene/Abitacolo.ts` lo accetta come
 *      opzione `mobile`), passare la decisione del livello:
 *
 *      new Abitacolo({ mobile: this.qualita.impostazioni.abitacoloMobile })
 *
 * (12) E per `prefers-reduced-motion`, QUESTO PASSO NON VA PIU' FATTO QUI.
 *
 *      Diceva: `this.scorrimento.inerzia = this.qualita.motoRidotto ? 0 : 1`.
 *      La frase che lo accompagnava — «si spegne l'inerzia e la deriva
 *      automatica della camera, NON i beat» — era ed e' la cosa giusta, ed e'
 *      il cuore di tutto il capitolo. Sbagliati erano i due numeri (in
 *      `core/Scorrimento.ts` inerzia 1 vuol dire ISTANTANEO e 0 vuol dire
 *      fermo: erano al contrario, e cosi' scritto avrebbe congelato la camera
 *      invece di toglierle il ritardo) e soprattutto il POSTO: questa lista
 *      descrive `applicaQualita()`, che gira solo al cambio di livello.
 *
 *      Adesso lo scorrimento legge da se' `RIDOTTO` da `core/Moto.ts` a ogni
 *      fotogramma, quindi non c'e' niente da riportargli e la preferenza vale
 *      anche se il livello non cambia mai.
\* ------------------------------------------------------------------ */
