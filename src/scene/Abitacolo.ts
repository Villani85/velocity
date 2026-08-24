import {
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  Texture,
} from 'three'
import { dopoAuto } from '../core/Ordine'

/**
 * L'ABITACOLO — una FOTOGRAFIA, non una geometria.
 *
 * PERCHE' SI RINUNCIA AL 3D PROPRIO QUI.
 *
 * Nel beat 'accensione' e nel beat 'velocita' la camera sta FERMA: guarda
 * `POSE.occhi` in `transizioni/Camera.ts` — la posizione e' fissa, la mira
 * e' fissa, si muovono solo il campo visivo e una micro-vibrazione da un
 * millimetro e mezzo. Davanti a una camera che non trasla, una geometria e
 * un'immagine sono LO STESSO FOTOGRAMMA: non c'e' parallasse, non c'e' un
 * secondo punto di vista, non c'e' niente che possa smentire l'immagine.
 *
 * E questa e' l'unica parte del sito in cui vale, perche' e' l'unica in cui
 * la camera non gira intorno a niente.
 *
 * Il modello generato che stava qui (`public/modelli/plancia.glb`) e' un
 * ammasso di schegge: sotto ogni luce che lo colpisce si legge per quello
 * che e'. La fotografia invece e' gia' fotorealistica — ha la sua luce, i
 * suoi riflessi sul carbonio, il suo quadro acceso, il suo colonnato
 * illuminato oltre il parabrezza — e non c'e' nessun impianto luce di questo
 * progetto che possa avvicinarsi a quel risultato in una notte di lavoro.
 *
 * Non e' un ripiego: e' la stessa regola di `Corte.ts` applicata all'altro
 * verso. Li' si sceglie un'architettura il cui realismo sta dove lo si puo'
 * garantire (proporzioni e materiali); qui si sceglie il mezzo il cui
 * realismo e' gia' garantito, perche' la camera ferma toglie all'osservatore
 * l'unico strumento con cui potrebbe accorgersene.
 *
 * MA STA NEL MONDO 3D, E NON E' UN DETTAGLIO IMPLEMENTATIVO.
 *
 * La cosa ovvia sarebbe un `<img>` a schermo intero sopra la tela. Sarebbe
 * sbagliato per la stessa ragione per cui la lastra della strada e' un piano
 * e non un fondo (vedi `Interno.ts`): nel beat 'velocita' la camera TREMA.
 * Un'immagine incollata allo schermo resterebbe immobile mentre tutto quello
 * che si vede attraverso il parabrezza vibra, e in un fotogramma si
 * capirebbe che l'abitacolo non e' li'.
 *
 * Messa su un piano ancorato alla camera a sessanta centimetri, la
 * fotografia vibra con lei per costruzione — non perche' qualcuno abbia
 * ricopiato la vibrazione sull'immagine, ma perche' quel piano E' davanti a
 * quella camera. Non c'e' niente da tenere sincronizzato, quindi non c'e'
 * niente che possa desincronizzarsi.
 *
 * E per lo stesso motivo il piano si ricalcola a OGNI fotogramma dalla posa e
 * dall'ottica della camera, invece di essere posato una volta: cosi' regge il
 * campo visivo che si apre con la velocita' (da 40 a 56 gradi nel beat
 * 'velocita'), il ridimensionamento della finestra e qualunque vibrazione
 * futura, senza che nessuno debba ricordarsi di aggiornarlo.
 */

export const ABITACOLO = {
  /**
   * La proporzione della fotografia: 2560 x 1440, cioe' 16:9 esatti. E' il
   * numero da cui dipende tutto l'adattamento al formato, e sta qui perche'
   * se un giorno l'immagine si rigenera in un altro taglio ci sia UN posto
   * solo da correggere.
   */
  /**
   * IL FORMATO E' UNO, non 16:9, e non e' una svista.
   *
   * La fotografia dell'abitacolo e' stata rifatta (vedi `asset/abitacolo/`) e
   * il generatore restituisce quadrati. Ritagliarla a 16:9 avrebbe voluto dire
   * buttare o il rivestimento del tetto o il tunnel centrale — e sono
   * esattamente i due elementi che dicono «sono seduto dentro un'automobile».
   *
   * Tenendola quadrata si ha piu' materiale di quanto ne serva in altezza, e a
   * decidere quanto mostrarne e' `BANDA`, che e' il posto giusto: una fascia
   * dichiarata in coordinate dell'immagine si adatta da sola a qualunque
   * formato di schermo, un ritaglio fatto una volta sul file no.
   */
  formato: 1,

  /**
   * A CHE DISTANZA STA IL PIANO, e perche' il numero non e' indifferente.
   *
   * In teoria e' arbitrario: piano piu' lontano e piu' grande copre lo stesso
   * campo. In pratica ha due vincoli veri.
   *
   * Sotto: il piano di taglio anteriore della camera sta a 5 cm
   * (`Esperienza.ts`). Troppo vicino e la vibrazione — o un ritocco alla posa
   * — puo' spingerlo dietro il taglio, e per un fotogramma l'abitacolo
   * sparisce.
   *
   * Sopra: dev'essere davanti a TUTTO cio' che resta acceso nell'abitacolo.
   * La lastra della strada sta a 14 metri dagli occhi, il resto della plancia
   * poco piu' avanti di un metro. A 0,60 m siamo davanti a tutto con dodici
   * volte il margine dal taglio anteriore: nessuno dei due estremi puo'
   * mordere.
   */
  distanza: 0.60,

  /**
   * L'AREA DEL QUADRO STRUMENTI nell'immagine normalizzata, con y=0 IN ALTO
   * (che e' la convenzione di un'immagine, non quella delle UV).
   *
   * Sono le coordinate della macchia bianca di `abitacolo_quadro.webp`,
   * verificate sul file: il riquadro misurato sui pixel sopra 200 cade a
   * x 0,363-0,590 e y 0,378-0,495, cioe' dentro il decimillesimo dei numeri
   * dichiarati. La maschera resta l'unica verita' per i BORDI SFUMATI; questo
   * riquadro serve a chi deve APPOGGIARCI SOPRA qualcosa, e per quello serve
   * un rettangolo con quattro numeri, non una texture.
   */
  // AGGIORNATO ALLA FOTOGRAFIA NUOVA, e la vecchia mostrava il difetto in
  // modo istruttivo: il quadro vivo galleggiava DENTRO IL PARABREZZA, un
  // metro sopra il cruscotto.
  //
  // La prima fotografia era un 28 mm in cui il volante riempiva mezzo quadro;
  // il committente l'ha giudicata «cruscotto troppo grande» e l'ho rifatta con
  // un 20 mm — si vedono entrambi i pannelli porta e tutta la plancia. Ma il
  // riquadro del quadro era rimasto quello di prima.
  //
  // E' il difetto tipico di un numero copiato da un'immagine: quando
  // l'immagine cambia, il numero non protesta. Sono le coordinate della
  // macchia bianca di `abitacolo_quadro.webp`, che si rigenera con
  // `node strumenti/apertura.mjs` — se un giorno la fotografia cambia ancora,
  // questi due valori vanno riletti DA LI'.
  // IL RIQUADRO COMPRENDE ANCHE IL DISPLAY LATERALE, non solo il quadrante.
  //
  // Alla prima prova avevo preso solo la macchia tonda dietro il volante
  // (0,328-0,424): il quadro vivo ci finiva dentro giusto, ma il suo
  // contenuto — arco dei giri, cifre della velocita', marcia — e' disposto su
  // una striscia larga, e sbordava sul cruscotto.
  //
  // Nella fotografia il gruppo strumenti e' fatto di DUE pezzi affiancati: il
  // quadrante circolare e un pannello rettangolare alla sua destra. Insieme
  // arrivano a 0,462, e la proporzione che ne esce (3,65 : 1) e' quella di un
  // quadro digitale vero — largo e basso, non tondo. La tela in `ui/Quadro.ts`
  // ha lo stesso rapporto, e le due cose vanno tenute d'accordo.
  /**
   * IL RIQUADRO DELLO STRUMENTO — dove sta il quadro VERO nella fotografia.
   *
   * Rifatte sulla fotografia nuova: il centro cade sull'asse del volante
   * (x 0,225, misurato sui pixel) e il bordo alto sfiora la modanatura del
   * cofanetto. Nella fotografia li' non c'e' nessun quadro — il generatore si
   * e' rifiutato quattro volte di disegnare una palpebra, fondendo sempre il
   * pannello nella plancia — quindi lo strumento e' interamente costruito:
   * pannello disegnato su tela piu' la palpebra in geometria (`Palpebra.ts`).
   *
   * Non e' un ripiego. Un pannello fotografato sarebbe stato spento per
   * sempre; questo si accende, gira e risponde allo scorrimento, che e' l'unica
   * cosa che in questo sito valga la pena mostrare due volte.
   *
   * Le proporzioni NON sono libere: la tela e' 1200x340, cioe' 3,53 a 1, e sullo
   * schermo il riquadro deve avere lo stesso rapporto o le cifre si stirano.
   * Con una fotografia quadrata il conto e' larghezza diviso altezza, e
   * 0,250 per 0,0708 fa 3,53.
   */
  /**
   * IL QUADRO STA SUL VETRO, e la ragione e' geometrica prima che estetica.
   *
   * Nella fotografia nuova la camera e' sulla mezzeria dell'automobile, non sul
   * posto di guida: il volante cade a sinistra, con l'asse a 0,225. Mettendoci
   * il quadro al posto suo, sullo schermo finisce contro il bordo sinistro e
   * meta' esce dal fotogramma — nel provino si vedeva tagliato a meta'.
   *
   * Le alternative erano due e nessuna buona. Spostare il fuoco orizzontale
   * sul guidatore avrebbe portato in campo il montante sinistro e buttato
   * fuori meta' plancia. Rigenerare la fotografia dal posto di guida e' costato
   * quattro tentativi senza che il modello mettesse mai la palpebra.
   *
   * Quindi il quadro torna a proiettarsi sul parabrezza, sopra il cofanetto e
   * centrato sulla strada. Questa volta pero' non sono due cifre sospese: e' il
   * pannello intero — quadrante tondo, marcia al centro, velocita' accanto — e
   * un pannello ha una forma, quindi si legge come uno strumento anche senza
   * una cornice intorno.
   *
   * CENTRATO SULL'ASSE DEL VOLANTE (0,28), non su quello dell'immagine. Il
   * volante sta a 0,225 e il suo strumento ci sta davanti, non a mezzo metro di
   * distanza: era la seconda meta' dello stesso difetto per cui il ritaglio si
   * centrava a meta' immagine. Adesso i due si muovono insieme.
   *
   * LARGO 0,33 E NON 0,42. Alla prima prova il pannello prendeva quasi meta'
   * larghezza dell'immagine, e i suoi tre pezzi — potenza, quadrante,
   * velocita' — finivano cosi' distanti da leggersi come tre elementi separati
   * appoggiati sulla strada invece che come un solo strumento. Un pannello si
   * riconosce dalla sua compattezza prima che dal suo contenuto.
   *
   * 0,4625 in basso e non 0,495. Appoggiarlo esattamente sul cofanetto — che
   * comincia a 0,50 — sembrava la scelta giusta, e nel provino il cofanetto ne
   * mangiava il terzo inferiore: il quadrante restava mezzo dentro e mezzo
   * fuori. Un visore vero sta SOPRA la linea del cofano, non appoggiato: e'
   * un'immagine virtuale a fuoco qualche metro davanti, e quindi non tocca
   * niente. Tre centesimi e mezzo di aria sono quel «non tocca niente».
   */
  // i due numeri orizzontali sono aumentati di 0,0098 insieme al ritaglio
  // della fotografia: e' lo spostamento che centra il cofanetto sul punto di
  // fuga, e il pannello lo segue per restare fermo sullo schermo (vedi `fuoco`)
  quadro: { x0: 0.0775, x1: 0.4075, y0: 0.3960, y1: 0.4895 },

  /**
   * IL VISORE SUL PARABREZZA E' STATO TOLTO, e la nota resta perche' il giro
   * intero e' stato utile.
   *
   * Era nato da un difetto vero: il quadro stava dietro il volante e su una
   * finestra bassa il pannello di testo lo copriva, quindi il committente ha
   * detto che il contachilometri non c'era. La risposta — proiettarlo sul
   * vetro, come fa un visore in trasparenza — era corretta in astratto e
   * sbagliata qui: due cifre sospese sopra la strada, senza niente intorno che
   * le contenga, si leggono come una sovrimpressione da videogioco. Il
   * committente l'ha detto in tre parole: «e' bruttissimo».
   *
   * La correzione non e' stata spostarlo un'altra volta: e' stata rifare
   * l'INQUADRATURA. Il quadro torna dietro il volante, dov'e' nella
   * fotografia, e la fascia visibile dell'abitacolo scende fino a mostrarlo
   * (vedi `BANDA`). Uno strumento dentro la sua palpebra e' un'automobile;
   * lo stesso strumento sospeso a mezz'aria e' un'interfaccia.
   */
}

/**
 * LA FASCIA UTILE DELLA FOTOGRAFIA — misurata riga per riga, non stimata.
 *
 * Rifatta sulla fotografia nuova (`asset/abitacolo/abitacolo_v2.png`), che ha
 * una plancia vera al posto del nero. La luminanza media per riga:
 *
 *     y 0,10   17   |  rivestimento del tetto
 *     y 0,22   20   |
 *     y 0,26   87   |  comincia il parabrezza
 *     y 0,38  112   |  il colonnato oltre il vetro, il punto piu' chiaro
 *     y 0,50   97   |
 *     y 0,54   58   |  il cofanetto
 *     y 0,58   33   |  la plancia
 *     y 0,66   40   |  la fascia in carbonio, le bocchette
 *     y 0,70   23   |  il tunnel e il pavimento
 *
 * IL CONFRONTO CHE VALE: nella fotografia di prima la fascia 0,58-0,66 stava a
 * 14 su 255, con l'ottantanove per cento dei pixel sotto 32. Era nera, non
 * sottoesposta, e non c'era niente da recuperare. Adesso sta fra 33 e 40 e ci
 * si legge la grana della pelle e la trama del carbonio.
 *
 * E' l'intero motivo per cui la fotografia e' stata rifatta: non per farla piu'
 * bella, per farla ESISTERE nella meta' bassa del fotogramma, che e' quella
 * dove prima non c'era niente da mostrare.
 *
 * 0,52 IN BASSO — cioe' della plancia non si mostra piu' niente, solo il primo
 * dito di cofanetto. E' una correzione controintuitiva subito dopo aver rifatto la
 * fotografia proprio per AVERE una plancia, quindi vale la pena dire perche'.
 *
 * La plancia nuova ha dentro il dettaglio: 33-40 su 255 nella fotografia. Ma
 * quella e' la sorgente. Nella scena ci passano sopra l'esposizione
 * dell'abitacolo, la curva di tono e il velo del testo, e misurando il
 * FOTOGRAMMA RESO quella stessa fascia esce a 15-19: piatta. Mostrarne il
 * trentasette per cento del fotogramma significa mostrare un terzo di
 * fotogramma vuoto — che e' esattamente il difetto che il committente aveva
 * segnalato all'inizio e che era rimasto identico dopo tutto il lavoro.
 *
 * La lezione: una sorgente con dentro l'informazione non basta, se la catena
 * che la porta a schermo la schiaccia. E finche' la catena e' quella, la
 * risposta giusta non e' mostrarne di piu' — e' mostrarne di meno e dare lo
 * spazio a cio' che si vede, cioe' la strada.
 *
 * Restano il cofanetto e il primo dito di plancia: quanto basta perche' si
 * capisca di essere dentro un'automobile.
 *
 * 0,245 in alto: taglia il rivestimento del tetto e lascia il bordo alto del
 * parabrezza, che serve a chiudere l'inquadratura verso l'alto.
 */
const BANDA = { cima: 0.245, fondo: 0.520, lato: 0.075 }

/**
 * QUANTO SI PUO' STRINGERE PRIMA DI RINUNCIARE ALLA FASCIA.
 *
 * Rispettare la fascia su una scheda alta e stretta — un telefono in piedi —
 * vorrebbe dire mostrare un quarto della larghezza della fotografia: sparirebbero
 * gli specchietti e i montanti, cioe' tutto cio' che dice «abitacolo», e
 * resterebbe un rettangolo di strada. A quel punto la fascia ha vinto la sua
 * battaglia e perso la guerra.
 *
 * 0,58 e' il minimo di larghezza che si accetta di mostrare. Sotto quella
 * soglia si smette di stringere e si riaccetta un po' di plancia: meglio un
 * pezzo di carbonio che un abitacolo irriconoscibile.
 */
const LARGHEZZA_MINIMA = 0.58

const caricatore = new TextureLoader()

/**
 * QUALE DELLE DUE FOTOGRAFIE.
 *
 * Si decide sui PIXEL VERI dello schermo, non sui pixel CSS: un telefono da
 * 390 px con densita' 3 disegna 780 pixel veri (il progetto tappa il rapporto
 * a 2, quindi 780), e a quella misura l'immagine da 1280 e' gia' abbondante.
 * Sotto i 1400 pixel veri si prende la mobile e si risparmiano 250 kB su una
 * connessione che quasi sempre e' quella che ne ha piu' bisogno.
 *
 * CIO' CHE QUESTO CONTO NON SA: su uno schermo verticale l'inquadratura usa
 * solo una FETTA della larghezza dell'immagine (vedi `misura`), quindi i
 * texel realmente spesi sono molti meno di quelli del file. E' un margine a
 * sfavore, non a favore — se un giorno la mobile leggesse molle su un
 * telefono molto stretto, la risposta e' un ritaglio verticale dedicato, non
 * una soglia diversa. Chi vuole decidere da fuori passa `mobile` e basta.
 */
function scegliFotografia(mobile?: boolean) {
  const stretta = mobile ?? innerWidth * Math.min(devicePixelRatio, 2) <= 1400
  return stretta ? '/texture/abitacolo_mobile.webp' : '/texture/abitacolo.webp'
}

/** vettori di servizio: la posa si ricalcola sessanta volte al secondo e non
 *  ha nessun motivo di allocare */
const _pos = new Vector3()
const _rot = new Quaternion()
const _sca = new Vector3()
const _avanti = new Vector3()
const _destra = new Vector3()
const _su = new Vector3()

type Opzioni = {
  /** distanza dal punto di vista, in metri. Vedi `ABITACOLO.distanza`. */
  distanza?: number
  /** forza la fotografia piccola o quella grande invece di dedurla */
  mobile?: boolean
  /**
   * Il punto dell'immagine che non si perde mai quando il formato costringe a
   * ritagliare, in coordinate immagine normalizzate con y=0 in alto. Di serie
   * il centro: e' li' che cade la postazione di guida (il quadro sta fra 0,362
   * e 0,592 in orizzontale), quindi centrare il ritaglio equivale a tenere in
   * campo volante e strumenti, che e' l'unica cosa che deve sopravvivere su
   * uno schermo stretto.
   */
  messaAFuoco?: { x: number; y: number }
}

export class Abitacolo {
  readonly mesh: Mesh
  /** il riferimento all'uniform della luce di quadro, appeso alla compilazione */
  private uLuceQuadro: { value: number } | null = null
  readonly materiale: MeshBasicMaterial

  /** vera quando fotografia e maschere sono arrivate: gli strumenti la
   *  aspettano invece di dormire un tot di millisecondi e sperare */
  pronto = false

  /**
   * COMPENSAZIONE DI ESPOSIZIONE, e va detto con precisione a cosa serve.
   *
   * `toneMapped: false` sul materiale spegne la curva ACES applicata dal
   * materiale — e questo vale solo quando si disegna dritti sullo schermo.
   * Sotto l'`EffectComposer` di `Esperienza` il tone mapping NON lo fa il
   * materiale (three lo disattiva quando si renderizza dentro un bersaglio):
   * lo fa l'`OutputPass` in fondo alla catena, e da li' ci passa tutto,
   * fotografia compresa. Quindi l'immagine ARRIVA COMUNQUE grigiata rispetto
   * al file originale, ed e' inutile far finta di no.
   *
   * Le strade erano due. Invertire ACES nello shader del piano, cosi' che
   * l'ACES finale lo riporti esattamente dov'era: elegante, e sbagliato —
   * l'inversa non e' stabile sulle alte luci (il quadro acceso e i fari fuori
   * dal parabrezza ci finiscono dentro) e comunque dopo l'OutputPass c'e'
   * ancora il grading, che ACES non sa di avere davanti. Oppure una manopola
   * moltiplicativa, che e' un numero solo e si TARA MISURANDO il fotogramma
   * finale con uno strumento — come si e' fatto per l'esposizione del
   * renderer, dove tre giri a occhio avevano dato tre risposte diverse e una
   * misura ha dato quella giusta in due minuti.
   *
   * Resta a 1 finche' qualcuno non la misura. Un numero messo a occhio qui
   * sarebbe peggio di nessun numero, perche' sembrerebbe una taratura.
   */
  get esposizione() { return this.materiale.color.r }
  set esposizione(v: number) { this.materiale.color.setRGB(v, v, v) }

  /**
   * QUANTO E' ACCESO IL QUADRO, per la cabina che ne riceve la luce.
   *
   * Sta separata dall'esposizione perche' sono due cose diverse: l'esposizione
   * dice quanto e' esposta la fotografia, questa dice quanta luce c'e' DENTRO
   * la scena fotografata. Se fossero lo stesso numero la cabina si
   * illuminerebbe di ciano anche prima dell'accensione, cioe' prima che quella
   * luce esista.
   */
  set luceQuadro(v: number) { if (this.uLuceQuadro) this.uLuceQuadro.value = v }

  private foto: Texture
  private apertura: Texture
  private distanza: number
  private fuoco: Vector2
  /** l'ultima misura calcolata: la condividono `aggiorna` e `riquadroQuadro`,
   *  cosi' i due non possono mai raccontare due inquadrature diverse */
  private m = { larghezza: 0, altezza: 0, ripX: 1, ripY: 1, offX: 0, offY: 0 }

  constructor(opz: Opzioni = {}) {
    this.distanza = opz.distanza ?? ABITACOLO.distanza
    // IL FUOCO ORIZZONTALE STA A 0,33, NON A META'.
    //
    // La fotografia dell'abitacolo e' scattata dalla mezzeria dell'automobile,
    // non dal posto di guida: il volante ha l'asse a 0,225. Centrando il
    // ritaglio a meta' immagine si inquadra il TUNNEL CENTRALE, e il posto di
    // guida finisce sul bordo sinistro — con lo strumento che gli va dietro.
    // Il committente l'ha detto guardando: «non e' centrato rispetto al
    // volante».
    //
    // 0,33 e non 0,225: portarlo esattamente sull'asse del volante farebbe
    // entrare in campo il montante sinistro e uscire meta' plancia. A un terzo
    // il volante e il suo strumento stanno nel primo terzo del fotogramma —
    // dove sta davvero il posto di guida di un'automobile con la guida a
    // sinistra — e la plancia resta intera.
    /* 0,2925, E IL NUMERO VIENE DALLA MASCHERA — non dal provino.
       Il committente ha guardato l'abitacolo e ha scritto «un volante? allora
       non e' centrato». Aveva ragione due volte: quella sagoma scura che entra
       nel parabrezza e' davvero il volante — la maschera dice che la sua punta
       sta a 0,2207 e la nota qui sotto dichiarava l'asse a 0,225, quindi i due
       numeri si confermano a vicenda — e non era centrata.
       LA PRIMA MISURA E' STATA BUTTATA, e vale la pena scrivere perche'. Avevo
       misurato l'asse contando i pixel scuri sul provino della guida: 620,3 su
       1200, cioe' 20 px a destra. Ho corretto, rimisurato, e il numero era
       tornato dov'era. Il motivo e' che fra un provino e l'altro la strada
       cambia — lampioni diversi, velocita' diversa — e il bordo scuro si
       confonde con la carreggiata: quella misura non misurava il cofanetto,
       misurava il rumore. Il terzo giro in questo progetto in cui un metro
       rotto restituisce un numero invece di un errore.
       LA MASCHERA INVECE E' UN FILE FERMO. Il profilo della sagoma e'
       esattamente il bordo inferiore dell'apertura, e li' non c'e' niente da
       confondere: la sagoma va da 0,2002 a 0,3848, quindi il suo asse cade a
       0,2925. E questo campo e' per costruzione il punto dell'immagine che
       finisce al centro dello schermo — quindi scriverci l'asse della sagoma
       la centra, senza nessuna taratura per tentativi.
       Il riquadro del quadro strumenti si sposta dello stesso numero nella
       stessa direzione, cosi' il pannello resta dov'e' invece di seguire la
       fotografia. */
    this.fuoco = new Vector2(opz.messaAFuoco?.x ?? 0.2925, opz.messaAFuoco?.y ?? 0.5)

    // LA FOTOGRAFIA E' UN COLORE, quindi sRGB: e' il caso banale, ma e' anche
    // meta' della coppia che segue e le due vanno lette insieme.
    const file = scegliFotografia(opz.mobile)
    this.foto = this.piuTardi(file, () => console.warn('[abitacolo] manca', file))
    this.foto.colorSpace = SRGBColorSpace
    // LE MIPMAP RESTANO ACCESE — e' il valore di serie di three, e va detto
    // perche' su un piano che riempie lo schermo verrebbe da spegnerle
    // («tanto e' 1:1»). Non e' 1:1: 2560 texel spalmati su un fotogramma da
    // 1200 pixel sono una MINIFICAZIONE di 2,1 volte, cioe' esattamente il
    // caso in cui senza mipmap il carbonio del cruscotto brulica appena la
    // camera vibra.

    // LA MASCHERA NON E' UN COLORE, ED E' L'ERRORE FACILE DA FARE QUI.
    //
    // E' un file grigio come un altro, ma i suoi valori non sono luce: sono
    // una COPERTURA, un numero fra zero e uno. Decodificarla come sRGB
    // sposterebbe tutta la rampa — un grigio 0,5 diventerebbe 0,21 — e i bordi
    // sfumati del parabrezza si stringerebbero di brutto proprio dove la
    // sfumatura serve, cioe' sul giro del montante.
    //
    // `NoColorSpace` e' gia' il valore di serie di three; sta scritto lo
    // stesso perche' e' una decisione, non una dimenticanza.
    this.apertura = this.piuTardi(
      '/texture/abitacolo_apertura.webp',
      // se la maschera non arriva, il piano resta a opacita' zero e non si
      // vede nulla: meglio cosi' che un parabrezza murato, che sembrerebbe
      // una scelta invece di un file mancante
      () => console.warn('[abitacolo] manca la maschera del parabrezza'),
    )
    this.apertura.colorSpace = NoColorSpace

    /**
     * IL MATERIALE: BASIC, E NON E' PIGRIZIA.
     *
     * Un `MeshStandardMaterial` chiederebbe alla scena di illuminare una
     * superficie che E' GIA' ILLUMINATA. La fotografia porta dentro di se' la
     * sua luce — il riflesso sul carbonio, il quadro acceso, il taglio caldo
     * che entra dal parabrezza — e qualunque luce del progetto le si sommi
     * sopra e' luce contata due volte: il risultato non e' «piu' illuminato»,
     * e' un'immagine che si allontana da quella vera nell'unico modo che
     * l'occhio riconosce subito, cioe' perdendo il contrasto fra le zone che
     * la luce tocca e quelle che non tocca.
     *
     * E la nebbia si spegne per lo stesso motivo. Fra l'occhio del guidatore
     * e il suo cruscotto non c'e' atmosfera; la nebbia della scena comincia a
     * 34 metri e a 0,6 non farebbe nulla, ma dichiararlo costa una riga ed e'
     * una riga che impedisce a una taratura futura della nebbia di scoprire
     * per sbaglio l'abitacolo.
     */
    this.materiale = new MeshBasicMaterial({
      map: this.foto,
      transparent: true,
      // SI PARTE INVISIBILI, MA NON SPENTI.
      //
      // `visible = false` sarebbe piu' ovvio e ha due difetti: e' la manopola
      // che usa chi ci collega (`interno.visible = dentro`, in `Esperienza`),
      // e litigarci significa che uno dei due perde; e soprattutto un oggetto
      // invisibile non viene MAI compilato, quindi lo shader si compilerebbe
      // nel fotogramma in cui l'abitacolo compare — cioe' l'unico in cui non
      // ci si puo' permettere un singhiozzo. A opacita' zero il piano viene
      // disegnato, il programma esiste, e non si vede niente.
      opacity: 0,
      // Non scrive in profondita': e' un velo trasparente, e un velo che
      // pianta un muro a 60 cm nel buffer di profondita' e' il tipo di cosa
      // che poi si paga in un passaggio di post che legge le profondita'.
      depthWrite: false,
      fog: false,
      // Vedi `esposizione`: sotto il composer non cambia nulla perche' il tone
      // mapping lo fa l'OutputPass, ma se qualcuno disegna questa scena senza
      // la catena di post — ed e' quello che fa il ripiego di `Esperienza` —
      // la fotografia deve uscire come e' stata scattata.
      toneMapped: false,
    })

    /**
     * IL BUCO DEL PARABREZZA: `onBeforeCompile`, NON `alphaMap`.
     *
     * Due ragioni, e la seconda e' quella vera.
     *
     * La prima, superficiale: `alphaMap` in three vuole BIANCO = OPACO, e
     * questa maschera ha il bianco dove c'e' il VUOTO. Servirebbe il negativo,
     * cioe' rigenerare l'asset — che qui non si tocca — o ribaltarla in CPU
     * all'avvio, che vuol dire decodificare e riscrivere un milione di pixel
     * per risparmiarsi una riga di GLSL.
     *
     * La seconda, e questa e' la vera decisione: l'adattamento al formato vive
     * nell'`offset` e nel `repeat` della fotografia (vedi `misura`). Ogni
     * texture di three ha la SUA matrice UV, quindi con `alphaMap` ci sarebbero
     * DUE inquadrature da tenere uguali — e due cose che devono restare uguali
     * prima o poi non lo sono piu': basta un ridimensionamento gestito su una
     * sola delle due e il buco del parabrezza scivola sulla carrozzeria.
     *
     * Campionando la maschera con `vMapUv` — la varying della FOTOGRAFIA —
     * l'inquadratura e' letteralmente la stessa variabile. Non e' che stanno
     * sincronizzate: e' che non sono due.
     *
     * E resta un `MeshBasicMaterial` invece di uno `ShaderMaterial` scritto da
     * zero, perche' uno shader nuovo vorrebbe dire riscrivere anche tutto
     * quello che gia' funziona — spazi colore, opacita', taglio del fog — per
     * aggiungere una moltiplicazione. E' la stessa scelta, e per la stessa
     * ragione, di `posaALastre` in `Esterno.ts`.
     */
    this.materiale.onBeforeCompile = (shader) => {
      shader.uniforms.uApertura = { value: this.apertura }
      shader.uniforms.uLuceQuadro = { value: 0 }
      this.uLuceQuadro = shader.uniforms.uLuceQuadro
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
uniform sampler2D uApertura;
uniform float uLuceQuadro;

/**
 * IL RIALZO DELLA CABINA, e nasce da una misura che non lascia scampo.
 *
 * Campionato il fotogramma della guida per zone, in luminanza su 255:
 *
 *   alto a destra   mediana   6   il 68% dei pixel sotto 12
 *   plancia         mediana  29   il 13% sotto 12
 *   parabrezza      mediana 147   lo 0,1% sotto 12
 *
 * L'area in alto a destra — il padiglione, il montante, lo specchietto — e'
 * il 15,5% del fotogramma ed e' un BUCO: quattro volte piu' scura della
 * plancia che le sta sotto, ventiquattro volte piu' scura del parabrezza che
 * le sta accanto. Non e' «l'abitacolo e' scuro»: un sesto dell'inquadratura
 * non contiene informazione, e ci sta appoggiato sopra il testo.
 *
 * DA DOVE VIENE. La fotografia ha la luce cotta dentro e in quella zona era
 * gia' in ombra profonda; nella scena non le arriva niente, perche'
 * l'abitacolo e' un piano con una texture e non riceve luci. Quindi resta
 * dov'era, e la catena di post che schiaccia tutto cio' che sta sotto il
 * quattro per cento finisce il lavoro.
 *
 * LA CURA E' QUELLA FISICA, non un alzare le ombre a caso. Una cabina di
 * notte riceve qualcosa da fuori: il cielo entra dal parabrezza — ed e'
 * COBALTO, lo stesso di «Lastra» — e lava l'interno dal basso verso l'alto,
 * perche' l'apertura sta davanti e non sopra. Il padiglione ne prende meno di
 * tutti, ma non zero: e' quel «non zero» che gli restituisce la forma.
 *
 * Tre cose la tengono onesta:
 *
 *   IL RIALZO E' SOLO SULLE OMBRE. La maschera al quadrato sul complemento
 *   della luminanza spegne il termine appena il pixel ha gia' un valore: la
 *   plancia ne prende un quarto, il parabrezza niente. Un rialzo uniforme
 *   sarebbe un velo, e un velo su una fotografia si vede subito — e' il
 *   difetto per cui la foschia era stata rifatta.
 *
 *   E' BLU, e non grigio. Un grigio schiarisce e basta; il cobalto AGGANCIA
 *   l'interno all'esterno. Oggi la cabina e' un ritaglio neutro incollato
 *   sopra una scena blu, ed e' anche per questo che si stacca.
 *
 *   SCENDE VERSO L'ALTO. La luce entra dal parabrezza, quindi il cruscotto
 *   ne riceve piu' del padiglione. Un rialzo piatto appiattirebbe l'unica
 *   modulazione che quella fotografia ha ancora.
 */
const vec3 RIALZO_CABINA = vec3(0.0165, 0.0220, 0.0380);
/** sopra questa luminanza in lineare il rialzo non tocca piu' niente: e'
 *  circa 90 su 255 in sRGB, cioe' tutto cio' che gia' si legge */
const float SOGLIA_OMBRA = 0.045;

/**
 * IL QUADRO STRUMENTI ILLUMINA CIO' CHE HA DAVANTI, e finora non lo faceva.
 *
 * Il committente ha guardato l'abitacolo e ha scritto «non si capisce cosa e'
 * questo», poi «un volante? allora non e' centrato». Il secondo giudizio nasce
 * dal primo: quella e' una corona di volante, ma e' una MACCHIA NERA senza
 * bordo ne' razze, e una macchia nera non ha un centro riconoscibile. Una
 * revisione esterna aveva detto la stessa cosa in altra forma — «il materiale
 * non risponde alla luce» — e vale per la cabina come per la carrozzeria.
 *
 * LA CAUSA. La cabina e' una fotografia moltiplicata per uno scalare, quindi
 * al suo interno non succede NIENTE quando il quadro si accende. Ma il quadro
 * e' l'unica sorgente che quella scena abbia: di notte, in un'automobile vera,
 * la corona del volante si legge proprio perche' il cruscotto le sta sotto e
 * la illumina da li'. Togliere quella luce e' togliere l'unica cosa che dava
 * forma al volante.
 *
 * PERCHE' NON E' UN ALONE DISEGNATO. Tre vincoli lo tengono onesto:
 *
 *   CADE COME UN PANNELLO, non come una lampadina. Il quadro e' largo e basso
 *   (3,5 a 1), quindi la caduta e' schiacciata: si allarga in orizzontale e
 *   finisce in fretta salendo. Una caduta radiale pura farebbe una palla di
 *   luce, che e' il segno con cui si riconosce un effetto aggiunto.
 *
 *   SCENDE E BASTA. Sopra il quadro c'e' il parabrezza, e una luce che salisse
 *   sul vetro sarebbe la stessa luce contata due volte — l'errore contro cui
 *   e' scritta tutta la nota del RIALZO qui sopra.
 *
 *   MOLTIPLICA LA SUPERFICIE. Il termine e' scalato dalla luminanza della
 *   fotografia: una luce si vede su cio' che c'e', e dove non c'e' niente — il
 *   foro del parabrezza — l'alfa e' gia' zero e non se ne accorge nessuno.
 *
 * LE COORDINATE SONO LE STESSE del riquadro «quadro» qui sopra, girate nella
 * convenzione delle UV (y dal basso). Non sono due numeri copiati: sono LO
 * STESSO punto da cui «riquadroQuadro» calcola dove disegnare il pannello, e
 * quindi restano d'accordo anche se il ritaglio della fotografia cambia — che
 * e' precisamente il difetto pagato quando la fotografia e' stata rifatta e il
 * riquadro era rimasto quello di prima.
 */
const vec2 QUADRO_CENTRO = vec2( 0.2425, 0.5573 );
/** ciano freddo come il pannello, e piu' verde che blu: e' la tinta che un
 *  quadro digitale ha davvero, e un blu puro leggerebbe come lampeggiante */
const vec3 LUCE_QUADRO = vec3( 0.105, 0.225, 0.315 );

/**
 * IL FILO CONTROLUCE — l'unica cosa che fa leggere una corona di volante
 * contro una strada illuminata.
 *
 * La luce del quadro qui sopra da' materia alla cabina, ma non risolve il
 * difetto che il committente ha visto: il volante resta una macchia nera
 * ritagliata dentro un parabrezza chiaro, e una macchia nera non ha forma. In
 * fotografia questo caso ha un nome e una cura sole: e' un CONTROLUCE, e cio'
 * che lo salva e' il filo di luce che il fondo chiaro avvolge attorno al bordo
 * di cio' che lo copre. Senza quel filo un controluce e' una silhouette; con
 * quel filo diventa un oggetto.
 *
 * E IL BORDO NON VA DISEGNATO, PERCHE' E' GIA' SCRITTO. La maschera
 * dell'apertura dice esattamente dove finisce il parabrezza e comincia la
 * cabina: il filo e' il suo gradiente. Questo ha una conseguenza che vale piu'
 * della tecnica — il filo segue la sagoma VERA di tutto cio' che copre il
 * vetro: la corona, il cofanetto, i montanti, lo specchietto. Non c'e' nessun
 * numero da aggiornare se la fotografia cambia, perche' non c'e' nessun numero.
 *
 * E' la stessa idea con cui «scene/Guarnizione.ts» scurisce il perimetro del
 * guscio dell'automobile, girata al contrario: li' si toglie luce sul bordo
 * interno, qui se ne aggiunge sul bordo esterno.
 */
const float PASSO_BORDO = 0.0032;
/** bianco appena freddo: e' la carreggiata illuminata a fare da sorgente, e la
 *  carreggiata di notte in questa scena e' cobalto lavato */
const vec3 LUCE_BORDO = vec3( 0.052, 0.068, 0.092 );`)
        // dopo `map_fragment`, cioe' quando `diffuseColor` porta gia' il
        // colore della fotografia e l'alfa porta gia' `opacity`: qui si
        // MOLTIPLICA, non si assegna, se no la dissolvenza di cui sopra non
        // avrebbe piu' effetto
        .replace('#include <map_fragment>', `#include <map_fragment>
float apCentro = texture2D( uApertura, vMapUv ).g;
diffuseColor.a *= 1.0 - apCentro;
{
  // il filo sta dove il pixel e' cabina ma ha il vetro a un passo di distanza
  float apVicino = max(
    max( texture2D( uApertura, vMapUv + vec2( 0.0, PASSO_BORDO ) ).g,
         texture2D( uApertura, vMapUv - vec2( 0.0, PASSO_BORDO ) ).g ),
    max( texture2D( uApertura, vMapUv + vec2( PASSO_BORDO, 0.0 ) ).g,
         texture2D( uApertura, vMapUv - vec2( PASSO_BORDO, 0.0 ) ).g ) );
  float filo = clamp( apVicino - apCentro, 0.0, 1.0 ) * ( 1.0 - apCentro );
  float lumaCabina = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  float ombra = clamp( 1.0 - lumaCabina / SOGLIA_OMBRA, 0.0, 1.0 );
  ombra *= ombra;
  // il parabrezza sta davanti: la sua luce lava il cruscotto e sfiora il
  // padiglione. La coordinata verticale della fotografia e' ritagliata dal
  // «cover», quindi i due estremi sono scelti perche' l'intervallo VISIBILE
  // dia il gradiente giusto, non perche' 0 e 1 siano il pavimento e il tetto.
  float dalCielo = mix( 1.05, 0.62, vMapUv.y );
  diffuseColor.rgb += RIALZO_CABINA * ombra * dalCielo;

  vec2 dalQuadro = vMapUv - QUADRO_CENTRO;
  // scende: sopra il quadro c'e' il vetro, e il vetro non si illumina
  float giu = clamp( -dalQuadro.y * 3.4, 0.0, 1.0 );
  // schiacciata, come la sorgente che la produce
  float lontano = length( vec2( dalQuadro.x * 0.80, dalQuadro.y * 1.55 ) );
  float caduta = giu / ( 1.0 + 30.0 * lontano * lontano );
  diffuseColor.rgb += LUCE_QUADRO * uLuceQuadro * caduta * ( 0.13 + lumaCabina * 3.2 );
  diffuseColor.rgb += LUCE_BORDO * filo;
}`)
    }
    // uno shader modificato vuole una chiave sua, se no three riusa il
    // programma gia' compilato di un MeshBasicMaterial qualunque
    this.materiale.customProgramCacheKey = () => 'abitacolo'

    // IL PIANO E' UNITARIO E SI SCALA, non si ricostruisce.
    //
    // La misura cambia a ogni fotogramma (il campo visivo si apre con la
    // velocita'): rigenerare una `PlaneGeometry` sessanta volte al secondo per
    // due triangoli sarebbe il modo piu' costoso possibile di moltiplicare due
    // numeri. Scalando, le UV restano quelle e la geometria non si tocca mai.
    this.mesh = new Mesh(new PlaneGeometry(1, 1), this.materiale)
    this.mesh.name = 'ABITACOLO'
    // niente ombre in nessuna delle due direzioni: e' una fotografia, non una
    // superficie
    this.mesh.castShadow = false
    this.mesh.receiveShadow = false
    // Sta davanti a tutto per costruzione, ma l'ordinamento dei trasparenti va
    // per distanza e la distanza qui e' minima: `renderOrder` alto lo mette in
    // fondo alla coda in modo esplicito invece che per fortuna.
    this.mesh.renderOrder = 10
  }

  /**
   * LA TESSITURA ESISTE SUBITO E ARRIVA DOPO, e le due cose vanno separate.
   *
   * L'abitacolo pesa quattrocento kilobyte fra fotografia e maschera, e
   * compare a meta' racconto: su una rete da telefono partire subito
   * significava toglierli all'automobile, che e' il soggetto. Misurato in
   * «strumenti/carico.mjs»: il GLB della vettura e' preannunciato per primo e
   * finisce per ultimo, perche' trentaquattro altri file gli mangiano la banda.
   *
   * Ma il MATERIALE si costruisce nel costruttore e la sua mappa deve esistere
   * in quell'istante, se no il programma dello shader nasce senza «USE_MAP» e
   * ricompilarlo a meta' percorso e' precisamente la cosa che questo progetto
   * evita ovunque. Quindi si restituisce subito una tessitura VUOTA — three
   * la lega alla sua tessitura di riserva finche' non ha pixel, e nel
   * frattempo il piano sta a opacita' zero e non si vede comunque — e le si
   * mette dentro l'immagine quando arriva.
   *
   * `needsUpdate` a quel punto fa risalire tutto: caricamento, mipmap,
   * filtri. Le proprieta' impostate qui fuori sul risultato — lo spazio
   * colore, per dirne una — restano quelle, perche' l'oggetto e' sempre lo
   * stesso e non viene sostituito.
   */
  private piuTardi(url: string, fallito: () => void): Texture {
    const t = new Texture()
    void dopoAuto.then(() => {
      caricatore.load(url, (arrivata) => {
        t.image = arrivata.image
        t.needsUpdate = true
        this.arrivata()
      }, undefined, fallito)
    })
    return t
  }

  private caricate = 0
  private arrivata() {
    if (++this.caricate < 2) return
    this.pronto = true
    // la dissolvenza non c'e': l'abitacolo compare quando lo accende chi lo
    // possiede, e a quel punto e' gia' pronto da minuti di scorrimento
    this.materiale.opacity = 1
  }

  /**
   * L'ADATTAMENTO AL FORMATO STA NELLE UV, NON NELLA GEOMETRIA.
   *
   * Il piano ha SEMPRE la proporzione del viewport — deve riempirlo esatto,
   * e' tutto il suo mestiere. La fotografia ha sempre 16:9. Le due cose
   * coincidono solo per caso, quindi qualcosa deve cedere:
   *
   *   - deformare il piano (o la fotografia) e' fuori discussione. Un volante
   *     ovale si vede da un chilometro, ed e' il difetto che ammazza in un
   *     colpo tutto il vantaggio di usare una foto.
   *   - lasciare bande nere ai lati sarebbe un video dentro il sito, non un
   *     abitacolo.
   *   - RITAGLIARE. Si riempie sempre il quadro, e cio' che avanza esce
   *     dall'inquadratura.
   *
   * Cioe' un «cover», fatto con `offset` e `repeat`: su uno schermo piu' largo
   * di 16:9 si usa tutta la larghezza e si perde qualcosa sopra e sotto; su
   * uno piu' stretto — un telefono in verticale e' 0,46 contro 1,78 — si usa
   * tutta l'altezza e si INQUADRA una porzione, che e' un quarto scarso della
   * larghezza dell'immagine.
   *
   * Ed e' esattamente cio' che dice di fare `adattaAlFormato` in
   * `transizioni/Camera.ts` quando spiega perche' dentro l'abitacolo NON si
   * arretra: nessuno seduto al posto di guida vede tutto il cruscotto da un
   * capo all'altro. Su uno schermo stretto se ne vede meno — come attraverso
   * una feritoia — e l'informazione che conta non e' quanta plancia si vede,
   * e' che ci si e' dentro. Qui quella regola diventa geometria invece che
   * intenzione.
   *
   * La porzione si centra su `messaAFuoco` e si tappa ai bordi: il ritaglio
   * non puo' mai uscire dall'immagine, se no lungo un lato comparirebbe il
   * texel di bordo stirato — che con `ClampToEdge` (il modo di serie) e'
   * una striscia di colore piatto e si nota moltissimo.
   */
  private misura(camera: PerspectiveCamera) {
    // Il campo visivo di three e' VERTICALE, e lo `zoom` entra nella
    // tangente: tenerne conto costa una divisione e vuol dire che il piano
    // resta incollato al quadro anche se un giorno qualcuno lo usa per
    // stringere l'inquadratura senza toccare la focale.
    const meta = Math.tan((camera.fov * Math.PI) / 360) / camera.zoom
    const altezza = 2 * this.distanza * meta
    const larghezza = altezza * camera.aspect

    const F = ABITACOLO.formato
    // ANCHE IN ORIZZONTALE C'E' UN LIMITE, e viene da un difetto trovato
    // misurando.
    //
    // Sul formato del committente — 1920x540, cioe' 3,55 di rapporto — la
    // finestra arrivava a mostrare TUTTA la larghezza della fotografia. Ai suoi
    // due bordi estremi ci sono i montanti, i pannelli porta e gli specchietti:
    // al centro dell'immagine si leggono come un abitacolo, ritagliati contro il
    // bordo dello schermo diventano forme senza nome. Il committente li ha
    // segnalati tre volte come «aloni»: una catena di schegge azzurre nel cielo
    // e una macchia calda incollata a sinistra.
    //
    // Non erano un artefatto del motore, non erano la maschera del parabrezza e
    // non era il fondo che passava — tre ipotesi plausibili e tutte e tre false.
    // Era la fotografia stessa. L'ha trovato `strumenti/aloni.mjs`, che spegne
    // un ingrediente per volta e conta il contrasto locale nel cielo e i pixel
    // caldi sul bordo: spegnendo l'abitacolo la macchia crolla al 3% e le
    // schegge spariscono.
    //
    // Sette centesimi e mezzo per parte: quanto basta a tenere fuori i bordi e
    // non tanto da perdere gli specchietti, che stanno a 0,10 e servono.
    const LARGO = 1 - BANDA.lato * 2
    let ripX = LARGO
    let ripY = 1
    if (camera.aspect >= F) {
      // la scheda e' piu' larga della fotografia: si ritaglia in altezza, ed e'
      // qui che la fascia utile puo' dire la sua
      const pieno = (F / camera.aspect) * LARGO
      ripY = Math.min(pieno, BANDA.fondo - BANDA.cima)
      ripX = Math.min(LARGO, ripY * camera.aspect / F)
      if (ripX < LARGHEZZA_MINIMA) {
        // si allarga la finestra finche' la larghezza torna accettabile: si
        // riprende un po' di tetto e un po' di plancia, e va bene cosi'
        ripX = LARGHEZZA_MINIMA
        ripY = Math.min(1, ripX * F / camera.aspect)
      }
    } else {
      // LA SCHEDA E' PIU' ALTA DELLA FOTOGRAFIA: il ritaglio naturale sarebbe
      // orizzontale e in verticale si vedrebbe tutto, cruscotto compreso.
      //
      // Si stringe lo stesso, ma con giudizio. La fascia utile chiede di
      // mostrare solo 0,345 dell'altezza; onorarla qui vorrebbe dire mostrare
      // un terzo scarso della larghezza, e con quello se ne andrebbero
      // specchietti e montanti, cioe' tutto cio' che dice «abitacolo».
      //
      // Quindi comanda `LARGHEZZA_MINIMA`: si mostra almeno il 58% della
      // larghezza, e in altezza si prende quel che ne consegue. Su un 16:10 fa
      // 0,645 invece di 1 — un terzo di cruscotto in meno — e quel che resta
      // sta sotto la scheda del testo, che e' li' apposta.
      ripX = Math.max(LARGHEZZA_MINIMA, Math.min(LARGO, camera.aspect / F))
      ripY = Math.min(1, ripX * F / camera.aspect)
    }

    // SI SBORDA DEL DODICI PER CENTO IN ALTEZZA, E SI TAGLIA DAL BASSO.
    //
    // Nella fotografia dell'abitacolo la meta' inferiore e' cruscotto: carbonio
    // quasi nero, senza dettaglio, che occupa il fondo del fotogramma. Con
    // sopra il velo del testo diventa un rettangolo piatto grande come mezza
    // pagina — il committente l'ha indicato dicendo «questa parte qui non mi
    // piace», ed e' il posto dove il sito smette di sembrare fatto apposta.
    //
    // La correzione e' un ritaglio, non un ingrandimento. Il piano resta della
    // stessa misura apparente — ingrandirlo riporterebbe il difetto opposto,
    // «sembra che il cruscotto sia troppo grande» — e si mostra il 12% in meno
    // di immagine partendo dal basso, cioe' esattamente la fascia senza niente
    // dentro. Il cofanetto resta, ed e' quello che serve: e' lui a dire che si
    // sta guardando da dentro un'automobile.
    //

    // la y delle UV cresce verso l'ALTO, quella dell'immagine verso il basso:
    // il ribaltamento va fatto qui una volta sola, e vale anche per il
    // riquadro del quadro strumenti
    const offX = Math.min(Math.max(this.fuoco.x - ripX / 2, 0), 1 - ripX)

    // IL RITAGLIO SI DICHIARA CON UNA RIGA, non con uno scarto.
    //
    // Prima era «sborda del 12% e spostati un po' in su», e per capire dove
    // andasse a finire il bordo basso bisognava rifare il conto ogni volta che
    // cambiava il formato della scheda. Adesso si dichiara la cosa che conta:
    // FINO A QUALE RIGA DELLA FOTOGRAFIA si guarda. Sopra, si prende quel che
    // ci sta.
    //
    // Il resto e' la stessa aritmetica di prima, ma con un nome sopra: `offY`
    // e' il bordo BASSO della finestra in coordinate UV, che crescono verso
    // l'alto — quindi e' uno meno la riga dell'immagine. Il limite a `1 - ripY`
    // impedisce alla finestra di uscire dal bordo alto: quando la scheda e'
    // larga e bassa la finestra e' corta e la riga si rispetta, quando e'
    // quadrata la finestra e' alta e ci si accontenta.
    // LA FINESTRA SI CENTRA SULLA FASCIA, non sul centro dell'immagine.
    //
    // `offY` e' il bordo BASSO della finestra in coordinate UV, che crescono
    // verso l'alto: e' uno meno la riga piu' bassa che si mostra. Quando la
    // finestra e' piu' corta della fascia si prende la parte centrale della
    // fascia, che e' dove sta il parabrezza; quando e' piu' lunga sborda in
    // parti uguali sopra e sotto, invece che tutta da una parte.
    const centro = (BANDA.cima + BANDA.fondo) / 2
    const offY = Math.min(Math.max(1 - centro - ripY / 2, 0), 1 - ripY)

    this.m.larghezza = larghezza
    this.m.altezza = altezza
    this.m.ripX = ripX
    this.m.ripY = ripY
    this.m.offX = offX
    this.m.offY = offY
    return this.m
  }

  /**
   * Rimette il piano davanti alla camera. Da chiamare a ogni fotogramma,
   * DOPO che la regia ha posato la camera.
   *
   * SI LEGGE `matrixWorld` E NON `position`/`quaternion`. Oggi la camera non
   * ha genitori e le due cose coincidono; ma la vibrazione del beat
   * 'velocita' e' proprio il genere di cosa che un domani si sposta su un
   * gruppo-supporto per non sporcare la posa della regia, e il giorno in cui
   * succede questo file continua a funzionare senza che nessuno ci pensi.
   *
   * PER CONTRO IL PIANO VA APPESO A UN GRUPPO A TRASFORMAZIONE IDENTICA (la
   * scena), perche' la posa che si scrive qui e' in coordinate MONDO. E' la
   * stessa trappola gia' pagata con le ottiche dei fari in `Esperienza.ts`:
   * numeri misurati nel mondo, scritti dentro un gruppo che porta una scala
   * sua, e l'oggetto galleggia a mezz'aria.
   */
  aggiorna(camera: PerspectiveCamera) {
    camera.updateMatrixWorld()
    camera.matrixWorld.decompose(_pos, _rot, _sca)

    const m = this.misura(camera)
    this.foto.offset.set(m.offX, m.offY)
    this.foto.repeat.set(m.ripX, m.ripY)

    _avanti.set(0, 0, -1).applyQuaternion(_rot)
    this.mesh.position.copy(_pos).addScaledVector(_avanti, this.distanza)
    this.mesh.quaternion.copy(_rot)
    this.mesh.scale.set(m.larghezza, m.altezza, 1)
  }

  /**
   * DOVE CADE IL QUADRO STRUMENTI, in coordinate mondo.
   *
   * E' l'aggancio per il quadro VIVO: la fotografia ha il suo quadro acceso
   * dipinto dentro, e quello e' un fotogramma fermo di un'auto ferma. Nel
   * beat 'velocita' i numeri devono salire con lo scorrimento, e per farlo
   * serve un pezzo di WebGL vero sopra quell'area — la fotografia sotto fa da
   * cornice, dai riflessi sul vetro strumenti al carbonio intorno, che e'
   * proprio la parte che un quadro disegnato non saprebbe rifare.
   *
   * Il riquadro si ricava dalla catena inversa dell'inquadratura: coordinate
   * immagine -> UV della tessitura (con la y ribaltata) -> UV del piano
   * (togliendo `offset` e dividendo per `repeat`) -> metri sul piano ->
   * mondo. Passa per `misura`, cioe' per lo stesso conto che posa il piano:
   * se l'inquadratura cambia, il riquadro la segue senza che nessuno debba
   * ricordarsene.
   *
   * L'ORIENTAMENTO NON SI RESTITUISCE perche' non c'e' scelta: il piano
   * guarda la camera, quindi chi ci appoggia sopra qualcosa copia
   * `camera.quaternion` e lo mette alla stessa distanza. Restituirlo darebbe
   * l'illusione che possa essere diverso.
   *
   * ATTENZIONE AL RITAGLIO: su uno schermo molto stretto una parte del quadro
   * puo' finire FUORI dall'inquadratura, e allora il riquadro restituito esce
   * anche lui in parte fuori dal piano. E' corretto cosi' — dice la verita' su
   * dove starebbe — ma chi lo usa deve aspettarselo invece di assumere che
   * cada sempre dentro lo schermo.
   */
  /**
   * DOVE STA IL QUADRO — e non lo decide piu' la fotografia.
   *
   * PERCHE' E' CAMBIATO.
   *
   * Prima il riquadro veniva da `ABITACOLO.quadro`, quattro numeri in
   * coordinate dell'IMMAGINE dell'abitacolo: 0,115-0,445 in larghezza. Era la
   * cosa giusta finche' il quadro doveva incastonarsi dove la fotografia ha il
   * suo strumento — la macchia chiara del cofanetto — ed e' rimasta anche
   * quando il quadro e' diventato un pannello largo che non c'entra piu'
   * niente con quella macchia.
   *
   * La conseguenza si vedeva e il committente l'ha detta tre volte: il
   * pannello occupa un terzo dello schermo e ai suoi lati resta il nero. Il
   * problema non erano i quattro numeri — era il sistema di riferimento.
   * Quelle coordinate seguono la fotografia, e la fotografia si ritaglia in
   * modo diverso a ogni formato: quanto grande venga il quadro sullo schermo
   * era una conseguenza di due ritagli, cioe' nessuno lo stava decidendo.
   *
   * COSA SI DICHIARA ADESSO. Due sole cose, tutte e due in frazioni di
   * SCHERMO: quanto della larghezza visibile occupa il pannello, e a che
   * altezza cade il suo centro. Il rapporto fra i lati non e' un parametro —
   * e' quello della tela in `ui/Quadro.ts`, 512 per 145, e prenderlo da li'
   * significa che il quadro non puo' mai uscire stirato.
   *
   * IL TETTO SULL'ALTEZZA NON E' PRUDENZA, E' ARITMETICA. L'altezza del
   * pannello sullo schermo vale `quota * formato / rapporto`: su un 16:10 il
   * 94% di larghezza fa il 43% di altezza, che e' quello che si vuole; sul
   * 32:9 del committente lo stesso 94% farebbe il 95% e il quadro coprirebbe
   * il fotogramma dal cielo all'asfalto. Quindi si prende il piu' stretto dei
   * due vincoli, e su uno schermo largo e basso comanda l'altezza.
   */
  riquadroQuadro(camera: PerspectiveCamera) {
    const m = this.misura(camera)

    /** il rapporto della tela del quadro: `ui/Quadro.ts`, 512 x 145 */
    const RAPPORTO = 512 / 145
    /* 0,885 E NON 0,94, E LA DIFFERENZA E' MISURATA.
       Il pannello arriva sullo schermo circa il cinque per cento piu' grande
       di quanto lo si chiede: `ui/Quadro.ts` gli mette intorno una cornice, e
       quella cornice sta fuori dal riquadro dichiarato. A 0,94 il quadro
       misurava il 98,6% della finestra e le due colonne esterne — i
       fotogrammi a sinistra, i triangoli a destra — finivano tagliate dal
       bordo. Il numero e' quello che, sommata la cornice, fa il 93%. */
    const QUOTA = 0.885
    /** e quanta altezza gli si concede al massimo */
    const ALTEZZA_MAX = 0.44
    /** dove cade il centro, in frazione di schermo dall'alto: sotto il
     *  parabrezza, nella fascia della plancia */
    const CENTRO = 0.715

    const formato = camera.aspect
    const quota = Math.min(QUOTA, (ALTEZZA_MAX * RAPPORTO) / formato)
    // l'altezza che ne consegue, in frazione di schermo
    const alta = (quota * formato) / RAPPORTO
    // e il centro scende fin dove il pannello resta dentro il bordo basso
    const centro = Math.min(CENTRO, 0.965 - alta / 2)

    // dalle frazioni di schermo alle coordinate dell'immagine, che e' il
    // sistema in cui parla `riquadro()`. La finestra visibile va da `offX` a
    // `offX + ripX` in orizzontale, e da `offY` a `offY + ripY` in verticale —
    // ma in UV, che crescono verso l'alto, mentre le y dell'immagine crescono
    // verso il basso: il ribaltamento e' l'ultima riga.
    const x0 = m.offX + ((1 - quota) / 2) * m.ripX
    const x1 = m.offX + ((1 + quota) / 2) * m.ripX
    const vCentro = m.offY + (1 - centro) * m.ripY
    const vMezza = (alta * m.ripY) / 2
    return this.riquadro(camera, {
      x0,
      x1,
      y0: 1 - (vCentro + vMezza),
      y1: 1 - (vCentro - vMezza),
    })
  }

  /**
   * Dove cade, nel mondo, un rettangolo dichiarato in coordinate
   * dell'immagine. Prende il rettangolo da fuori invece di conoscerne uno
   * solo: da quando il quadro sta sul vetro, di rettangoli utili ce n'e' piu'
   * d'uno, e la conversione e' la stessa per tutti.
   */
  riquadro(camera: PerspectiveCamera, q: { x0: number; x1: number; y0: number; y1: number }): { centro: Vector3; larghezza: number; altezza: number } {
    camera.updateMatrixWorld()
    camera.matrixWorld.decompose(_pos, _rot, _sca)
    const m = this.misura(camera)

    // dalle coordinate immagine alle UV del piano
    const u0 = (q.x0 - m.offX) / m.ripX
    const u1 = (q.x1 - m.offX) / m.ripX
    const v0 = (1 - q.y1 - m.offY) / m.ripY
    const v1 = (1 - q.y0 - m.offY) / m.ripY

    // dalle UV del piano ai metri, con l'origine al centro del piano
    const cx = ((u0 + u1) / 2 - 0.5) * m.larghezza
    const cy = ((v0 + v1) / 2 - 0.5) * m.altezza

    _avanti.set(0, 0, -1).applyQuaternion(_rot)
    _destra.set(1, 0, 0).applyQuaternion(_rot)
    _su.set(0, 1, 0).applyQuaternion(_rot)

    // si alloca un vettore nuovo, e va bene: questo lo si chiama una volta per
    // fotogramma al massimo, e restituire un vettore riusato e' il tipo di
    // risparmio che si paga il giorno in cui qualcuno se lo tiene da parte
    const centro = new Vector3()
      .copy(_pos)
      .addScaledVector(_avanti, this.distanza)
      .addScaledVector(_destra, cx)
      .addScaledVector(_su, cy)

    return {
      centro,
      larghezza: (u1 - u0) * m.larghezza,
      altezza: (v1 - v0) * m.altezza,
    }
  }

  /** si smonta tutto: serve agli strumenti, che costruiscono e buttano decine
   *  di abitacoli in un caricamento solo */
  smonta() {
    this.mesh.geometry.dispose()
    this.materiale.dispose()
    this.foto.dispose()
    this.apertura.dispose()
  }
}

/**
 * PER COLLEGARLO IN `core/Esperienza.ts` — cinque righe, e nient'altro.
 *
 *   1) fra gli import:
 *      import { Abitacolo } from '../scene/Abitacolo'
 *
 *   2) fra i campi della classe, accanto a `readonly lastra: Lastra`:
 *      readonly abitacolo = new Abitacolo()
 *
 *   3) nel costruttore, DOPO `this.scena.add(this.esterno, ...)` — va appeso
 *      alla scena e non a `this.interno`, perche' la posa e' in coordinate
 *      mondo (vedi `aggiorna`):
 *      this.scena.add(this.abitacolo.mesh)
 *
 *   4) in `fotogramma`, accanto a `this.interno.visible = dentro`:
 *      this.abitacolo.mesh.visible = dentro
 *
 *   5) subito sotto, e DOPO `inquadra(...)`, se no il piano insegue la camera
 *      con un fotogramma di ritardo e nel beat 'velocita' la vibrazione si
 *      vedrebbe scollata:
 *      if (dentro) this.abitacolo.aggiorna(this.camera)
 *
 * E POI UNA RIGA CHE ESISTE GIA' VA GIRATA, che non e' un'aggiunta ma senza
 * non si vede niente: `this.interno.visible = dentro` deve diventare
 * `this.interno.visible = false`. La plancia generata sta a poco piu' di un
 * metro dagli occhi, cioe' DIETRO questo piano ma DAVANTI alla lastra della
 * strada: lasciandola accesa non si vedrebbe piu' — tranne che attraverso il
 * buco del parabrezza, dove comparirebbe al posto della strada. Il gruppo
 * `interno` porta pero' anche `Accensione`, che e' luce e non geometria: se la
 * si vuole tenere, si spengono i figli (`planciaVera`) invece del gruppo.
 */
