import { ambienteTramonto, soleBasso } from './Tramonto'
import {
  DoubleSide,
  BackSide,
  Group,
  EquirectangularReflectionMapping,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three'

/**
 * IL LUOGO E' UNA FOTOGRAFIA. L'AUTO E' IN 3D.
 *
 * PERCHE' HO SMESSO DI COSTRUIRE L'ARCHITETTURA.
 *
 * Il committente ha alzato l'asticella a una frase sola: «non deve essere
 * distinguibile fra una foto e questo». E' un traguardo netto, e obbliga a
 * una risposta netta.
 *
 * La corte costruita non ci arriva. Ci ho lavorato a lungo — proporzioni di
 * un ordine vero, pietra a tre mappe, bronzo nei giunti, gole di luce
 * annegate nell'architrave, occlusione ambientale — e ogni giro miglioravano
 * i numeri e non la sostanza: piu' dettaglio ci mettevo, piu' leggeva come un
 * livello di gioco. Il difetto non era in nessuna di quelle cose. Era che
 * scatole con tessiture da 1024 pixel restano scatole con tessiture, per
 * quanto giuste siano le misure.
 *
 * E QUESTA NON E' UNA RESA: E' IL METODO STANDARD DEL MESTIERE.
 *
 * Le fotografie di automobili che il committente ha portato come riferimento
 * — quelle che «sembrano una campagna vera» — sono quasi tutte fatte cosi':
 * una fotografia del luogo, l'automobile in computer grafica, e la luce del
 * primo copiata addosso alla seconda. Non e' un trucco da poveri: e' il modo
 * in cui si fanno, perche' nessun render costruisce un palazzo credibile
 * quanto un palazzo fotografato.
 *
 * Ed e' anche la stessa regola gia' usata per l'abitacolo (decisione D21): si
 * costruisce cio' che la camera attraversa, si fotografa cio' davanti a cui
 * si ferma. Qui la camera non attraversa niente: gira intorno a un'auto,
 * dentro un cortile che sta a diciassette metri.
 *
 * LA PARALLASSE — l'obiezione vera, e quanto vale in numeri.
 *
 * La decisione D14 diceva: una mappa equirettangolare e' esatta sotto
 * ROTAZIONE e sbagliata sotto TRASLAZIONE. Resta vero. Ma vale la pena
 * misurare quanto:
 *
 *   la camera orbita fra raggio 5,10 e 8,15 metri
 *   il colonnato fotografato sta a circa diciassette
 *
 * Muovendosi di tre metri su un soggetto a diciassette, la parallasse
 * mancante vale circa il 18% di spostamento apparente sugli elementi piu'
 * vicini, e scende a zero su quelli lontani. E' un errore che c'e' — e che
 * pero' l'occhio non ha con cosa confrontare, perche' nel fotogramma non
 * resta nessun elemento costruito alla stessa distanza che si muova
 * correttamente. La discrepanza si vede solo se ci sono ENTRAMBI.
 *
 * E' per questo che qui non ci sono piu' colonne 3D vicine: erano nate
 * proprio per portare la parallasse, e adesso sarebbero il testimone che
 * denuncia il fondale.
 *
 * COSA RESTA IN TRE DIMENSIONI, e sono le tre cose che una fotografia non
 * puo' dare:
 *
 *   L'OMBRA DI CONTATTO. Un piano invisibile che raccoglie solo l'ombra
 *   dell'auto. Senza, l'auto galleggia — ed e' il difetto che si nota per
 *   primo anche senza saperlo nominare.
 *
 *   IL RIFLESSO. Il marmo della fotografia riflette gia' il colonnato; ci
 *   manca solo l'auto, e quella la aggiunge `scene/Riflesso.ts` in modo
 *   additivo, cioe' senza cancellare cio' che c'e' sotto.
 *
 *   LA LUCE. La stessa immagine, filtrata per ruvidita', diventa la mappa
 *   d'ambiente: la carrozzeria riflette ESATTAMENTE il cortile in cui si
 *   trova, colonna per colonna. E' questa coincidenza — non la qualita' del
 *   materiale — a far sembrare che l'auto sia stata fotografata li'.
 */

/**
 * L'ORIZZONTE DELLA FOTOGRAFIA E' STATO PORTATO A META' ALTEZZA.
 *
 * In una proiezione equirettangolare l'orizzonte sta a meta' immagine per
 * definizione: la meta' di sopra e' il cielo, quella di sotto la terra.
 * Nella fotografia generata stava a 0,594 — misurato cercando il gradino di
 * luminanza fra il colonnato illuminato e il pavimento, non a occhio.
 *
 * La correzione e' allungare il FONDO, non tagliare il cielo: il fondo e' il
 * terreno sotto la camera, che nella scena e' coperto dall'auto e dalla sua
 * ombra e non si guarda mai. Tagliare il cielo avrebbe invece mangiato la
 * cornice alta del colonnato, che si vede eccome.
 */
export async function caricaPanorama(url = '/hdri/corte_pano.webp') {
  const t = await new TextureLoader().loadAsync(url)
  t.mapping = EquirectangularReflectionMapping
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * L'AMBIENTE NASCE DA UN FILE PIU' PICCOLO, e sono novantadue megabyte di
 * memoria video.
 *
 * COSA SI E' MISURATO. La mappa d'ambiente e' il PMREM del panorama, e la sua
 * dimensione la decide quella della SORGENTE: dal panorama intero — 4096x2048 —
 * esce una mappa 3072x4096 in mezza virgola mobile, cioe' NOVANTASEI MEGABYTE
 * di memoria video per una cosa sola. Piu' i 32 MB del fondo. Su un telefono
 * quella e' una cifra che avvicina la perdita del contesto WebGL.
 *
 * E NON SERVE. Una mappa d'ambiente si guarda sfocata per costruzione: serve a
 * dire di che colore e' la luce che arriva da ogni direzione, non a mostrare
 * dettagli. Provato e misurato sul provino del primo piano della carrozzeria —
 * che e' il posto dove un ambiente povero si vedrebbe per primo, perche' quella
 * e' una superficie quasi a specchio:
 *
 *     sorgente 4096x2048  ->  96,0 MB   (riferimento)
 *     sorgente 2048x1024  ->  24,0 MB   differenza media 2,49 su 255
 *     sorgente 1024x512   ->   6,0 MB   differenza media 4,16 su 255
 *
 * 2,49 su 255 e' il livello del rumore di compressione JPEG: nel confronto
 * affiancato le due immagini non si distinguono. A 1024 invece la sciabolata
 * sul parafango si allarga, e si vede — quindi si e' scelto 2048, che e' il
 * punto in cui si risparmia tutto quello che si puo' senza pagare niente.
 *
 * PERCHE' UN FILE E NON UNA TELA. La strada ovvia era ridimensionare il
 * panorama gia' scaricato disegnandolo su una tela. Misurato: il disegno costa
 * UN millisecondo, e il PMREM da quella tela MILLETRECENTOOTTANTASETTE — contro
 * uno dal panorama intero. La differenza non e' il PMREM, e' il caricamento di
 * una texture che ha per sorgente un canvas: passa per una strada lenta che una
 * immagine scaricata non prende. Un file in piu' da 132 kB e' molto meno di un
 * secondo e mezzo di stallo.
 *
 * E ARRIVA PRIMA, che e' il regalo inatteso: 132 kB scendono prima dei 491 del
 * panorama, quindi la mappa d'ambiente — cioe' il modo in cui ogni superficie
 * del sito appare — e' pronta piu' presto di quanto fosse.
 */
export async function caricaAmbiente(url = '/hdri/corte_pano_ambiente.webp') {
  const t = await new TextureLoader().loadAsync(url)
  t.mapping = EquirectangularReflectionMapping
  t.colorSpace = SRGBColorSpace
  return t
}

export function ambienteDaPanorama(renderer: WebGLRenderer, texture: Parameters<PMREMGenerator['fromEquirectangular']>[0]) {
  const pmrem = new PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const env = pmrem.fromEquirectangular(texture).texture
  pmrem.dispose()
  return env
}

/**
 * LE STRISCE — il terzo passo, e quello che fa la differenza fra un'auto
 * ILLUMINATA e un'auto FOTOGRAFATA.
 *
 * Una carrozzeria non ha texture: e' una superficie continua, e l'unica cosa
 * che ne racconta la forma e' COME SI DEFORMA UN RIFLESSO LUNGO mentre ci
 * scorre sopra. Per questo negli studi le automobili si illuminano con strisce
 * da tre a nove metri e non con pannelli quadrati: la striscia produce una riga
 * che percorre tutta la fiancata e ne rivela ogni curvatura, il pannello
 * quadrato una macchia che non dice niente.
 *
 * E la riga che si vede sulla lamiera e' quasi tutta MAPPA D'AMBIENTE, non luce
 * diretta: una `RectAreaLight` illumina, ma cio' che il trasparente SPECCHIA e'
 * l'ambiente. Quindi le strisce vanno cotte QUI DENTRO, insieme al panorama.
 *
 * Perche' solo adesso: e' una sequenza accoppiata di tre mosse, e le prime due
 * sono state pagate prima. (1) le normali raddrizzate — senza, uno specchio
 * netto mostra ogni increspatura; (2) il trasparente portato a 0,88/0,045 —
 * con 0,15 di ruvidita' la riga si sfoca comunque in macchia. Aggiungere le
 * strisce senza quelle due non avrebbe prodotto nessuna riga.
 *
 * Il panorama diventa una sfera rovesciata e le strisce dei piani luminosi:
 * `fromScene` cuoce tutto in una mappa sola.
 */
export function ambienteConStrisce(
  renderer: WebGLRenderer,
  texture: Parameters<PMREMGenerator['fromEquirectangular']>[0],
  /* ALZATA DA 3,0: e' il contraccolpo della vernice scura.
     Con una tinta chiara le strisce servivano a disegnare una riga; con una
     tinta quasi nera sono l'UNICA cosa che racconta la forma, perche' il
     colore non restituisce piu' niente da solo. Il metro della carrozzeria
     l'ha detto subito — la mediana era crollata a 17 con il 42% di pixel
     scuri, cioe' la vettura stava tornando una silhouette. */
  /* ALZATA ANCORA, da 5,2, per il contraccolpo dell'esposizione notturna.
     Le strisce vivono nella mappa d'ambiente: cio' che la lamiera specchia
     passa comunque per il tone mapping, quindi abbassare l'esposizione a 0,72
     le ha spente insieme allo sfondo. La gola del podio invece non si e'
     mossa, perche' e' `toneMapped: false`. E' la differenza fra una sorgente
     DICHIARATA e un riflesso: la prima resta, il secondo va ricompensato. */
  forza = 12,
) {
  const s = new Scene()

  /* IL PANORAMA COME SFONDO: sfera grande vista da dentro. `BackSide` perche'
     la si guarda dall'interno, e `MeshBasic` perche' non deve essere illuminata
     da niente — e' gia' una fotografia. */
  const sfondo = new Mesh(
    new SphereGeometry(100, 48, 32),
    new MeshBasicMaterial({ map: texture as never, side: BackSide }),
  )
  s.add(sfondo)

  /* DUE STRISCE LUNGHE E STRETTE, una per fianco, inclinate verso il basso.
     Il rapporto e' quello che conta: 12 metri per 0,55 di larghezza. Un
     rettangolo piu' largo tornerebbe a fare la macchia. */
  /* LE STRISCE SONO CALDE, e non e' una scelta di gusto: e' la scena.
     La gola di luce della piattaforma e' ambra (0xffbe72), le finestre della
     villa sono ambra, i lampioni sono ambra. Una striscia BIANCA che scorre su
     una fiancata dentro un ambiente caldo si legge come una luce di servizio
     accesa per sbaglio — l'accento dello stesso colore di tutto il resto smette
     di essere un accento. Sulla lamiera il riflesso ambra e' anche cio' che
     distingue una carrozzeria FOTOGRAFATA di notte da una illuminata a giorno. */
  /* PIU' LUNGHE E MOLTO PIU' STRETTE — 24 x 0,18 invece di 12 x 0,55.
     La ragione e' la forma di QUESTA vettura. Una carena continua ha doppia
     curvatura dappertutto: una striscia larga 55 cm ci si comprime in una
     MACCHIA, e una macchia non racconta niente. Una striscia sottile si
     comprime su un asse solo e resta una RIGA anche dopo — ed e' la riga che
     corre lungo la fiancata a dire dove la superficie gira.
     Piu' lunga per la stessa ragione: la riga deve attraversare tutta la
     vettura, non accenderne un pezzo. */
/* `DoubleSide` SU TUTTI I PANNELLI, E NON E' UN DETTAGLIO: SENZA, OTTO SU
   NOVE NON ESISTONO.
   La PMREM guarda dall'ORIGINE in tutte le direzioni. Un piano senza `side`
   e' `FrontSide`, quindi contribuisce solo se la sua normale punta verso di
   li' — e le strisce sono inclinate per illuminare la fiancata, cioe' danno
   le spalle al centro. Misurato intercettando `PMREMGenerator.fromScene` e
   sparando raggi dall'origine: pannelli visti com'era, 1 su 9; con
   `DoubleSide`, 9 su 9.
   Il difetto e' vecchio, ed e' il piu' insidioso di tutti: la funzione
   costruiva NOVE pannelli, li orientava con cura, e la mappa ne riceveva uno.
   Tutto il lavoro sulle strisce piu' strette e sulle bandiere nere non aveva
   avuto nessun effetto — e non poteva darne segno, perche' la scena e'
   giusta, solo che quei pannelli non li vede nessuno.
   Conseguenza immediata: `forza` era stata alzata a 55 per compensare un
   ambiente che riceveva un nono di cio' che gli si stava dando. */
  const calda = new MeshBasicMaterial({ color: 0xffb877, toneMapped: false , side: DoubleSide })
  calda.color.multiplyScalar(forza)
  for (const lato of [-1, 1]) {
    const striscia = new Mesh(new PlaneGeometry(24, 0.18), calda)
    striscia.position.set(lato * 3.4, 3.1, 0)
    striscia.rotation.set(-Math.PI / 2 + lato * 0.42, 0, Math.PI / 2)
    s.add(striscia)
  }
  /* LA TERZA, sopra e trasversale: e' quella che disegna la riga sul cofano,
     che nell'inquadratura hero e' meta' di cio' che si vede. Questa resta
     FREDDA: due riflessi di temperatura diversa sulla stessa lamiera dicono
     che la luce viene da piu' parti, ed e' quello che fa sembrare vero un
     ambiente. Tutte calde e la carrozzeria diventa monocroma. */
  /* DA FREDDA A TIEPIDA: nell'inquadratura hero si guarda il TETTO, quindi
     la riga che si vede e' questa. Restando azzurra dava alla vettura un
     colpo di luce da studio dentro una scena calda. Adesso e' un bianco
     leggermente caldo — resta piu' fredda delle due laterali, che e' cio' che
     serviva (due temperature dicono che la luce viene da piu' parti), ma non
     litiga piu' con l'ambiente. */
  const fredda = new MeshBasicMaterial({ color: 0xffe3c4, toneMapped: false , side: DoubleSide })
  fredda.color.multiplyScalar(forza * 0.8)
  const alta = new Mesh(new PlaneGeometry(16, 0.14), fredda)
  alta.position.set(0, 4.2, -1.2)
  alta.rotation.set(-Math.PI / 2, 0, 0)
  s.add(alta)

  /* LA LAMA DI CONTORNO — il rim light, e secondo il revisore e' il singolo
     miglioramento visivo piu' forte possibile su questa vettura.
     Serve a una cosa sola: SEPARARE la silhouette dal fondo. In parecchie zone
     dell'inquadratura l'automobile e lo sfondo si fondevano, e un oggetto che
     si fonde col fondo non ha volume — qualunque cosa gli si faccia sopra.
     Sta DIETRO e ALTA, quasi di taglio: una sorgente in quella posizione non
     illumina la fiancata, disegna il bordo di tetto, spalla e coda. Ed e'
     FREDDA contro un ambiente caldo, perche' un contorno dello stesso colore
     della scena non stacca. */
  const contorno = new MeshBasicMaterial({ color: 0xbcd8ff, toneMapped: false , side: DoubleSide })
  /* 0,45 E NON 1,5. Era una frazione della forza, e la forza e' salita da 7,6
     a 55: la lama e' passata da 11 a 82, cioe' e' diventata la sorgente
     dominante di tutta la scena. Un contorno che stacca la silhouette deve
     essere piu' DEBOLE del riempimento, non piu' forte — se no non contorna,
     illumina. */
  contorno.color.multiplyScalar(forza * 0.45)
  const lama = new Mesh(new PlaneGeometry(11, 0.32), contorno)
  lama.position.set(0, 2.4, -5.2)
  lama.rotation.set(-Math.PI / 2 + 1.15, 0, 0)
  s.add(lama)

  /* LE BANDIERE NERE — la cosa che mancava del tutto, ed e' meta' del mestiere
     in uno studio di fotografia d'automobili.
     Fra una softbox e l'altra si mettono PANNELLI NERI, e non e' per togliere
     luce: e' perche' su una superficie lucida la forma la disegna il CONTRASTO
     fra chiaro e scuro riflessi, non il chiaro da solo. Una lamiera che
     riflette luce ovunque non ha bordi — e' esattamente il difetto che una
     revisione esterna ha chiamato «saponetta».
     Su questa vettura pesano il doppio che altrove: e' una streamliner senza
     spigoli, quindi non c'e' NIENTE di geometrico che possa dare un bordo. Le
     bande nere sono l'unica cosa che puo' farlo.
     Sono nere per davvero: `MeshBasicMaterial` a zero, `toneMapped: false`.
     Un nero passato per la curva ACES si schiarirebbe, e una bandiera grigia
     non stacca da un ambiente gia' scuro. */
  /* LA VOLTA — una sorgente LARGA e DEBOLE sopra, che non c'era.
     Nella mappa d'ambiente c'erano solo strisce strette e bandiere nere. Va
     bene per disegnare le righe speculari sulla fiancata, ma lascia le
     superfici rivolte in ALTO senza niente da restituire: di notte specchiano
     il cielo nero del panorama, e diventano buie.
     Si vede in due punti, e il committente li ha segnalati tutti e due senza
     collegarli: sulla vernice CHIARA il tetto resta scuro mentre i fianchi
     sono bianchi — «il bianco e' a meta'» — e dentro il passaruota i cerchi
     spariscono, perche' un metallo li' puo' solo restituire un ambiente che
     non c'e' — «ancora senza raggi».
     E' la stessa cosa che in uno studio fotografico e' il soffitto bianco:
     non fa nessun colpo di luce, e senza non si vede niente.
     LARGA E DEBOLE, non stretta e forte: a 0,16 della forza non compete con
     le strisce e non appiattisce il nero — alza il fondo, che e' cio' che
     serve. Una sorgente stretta e forte darebbe un secondo riflesso e
     toglierebbe alle righe il loro contrasto. */
  const volta = new MeshBasicMaterial({ color: 0xdfe8f5, toneMapped: false, side: DoubleSide })
  volta.color.multiplyScalar(forza * 0.16)
  const cielo = new Mesh(new PlaneGeometry(16, 12), volta)
  cielo.position.set(0, 5.4, 0)
  cielo.rotation.x = Math.PI / 2
  s.add(cielo)

  /* IL RIMANDO DA TERRA — una striscia bassa, sotto il livello del mozzo.
     Nell'ambiente non c'era NIENTE sotto l'asse delle ruote, e si vedeva in un
     punto solo ma preciso: il cerchio posteriore misurava (3, 3, 3) con un
     contrasto p5-p95 di CINQUE. Non scuro: nero piatto, zero informazione.
     Un cerchio in alluminio, anche di notte in un cortile, riceve luce DA
     SOTTO — il pavimento bagnato rimanda su. Senza quella sorgente un metallo
     dentro un passaruota puo' solo restituire il buio, e nessuna manopola del
     materiale lo cambia: e' l'ambiente a non avere niente da dare.
     Calda e bassa, perche' e' il riflesso della pietra del podio e della corte
     illuminata, non una seconda luce. */
  const daTerra = new MeshBasicMaterial({ color: 0xffcf9e, toneMapped: false, side: DoubleSide })
  daTerra.color.multiplyScalar(forza * 0.30)
  for (const lato of [-1, 1]) {
    const rimando = new Mesh(new PlaneGeometry(9, 1.1), daTerra)
    rimando.position.set(lato * 2.5, 0.12, 0)
    rimando.rotation.set(-Math.PI / 2 - lato * 0.30, 0, Math.PI / 2)
    s.add(rimando)
  }

  const bandiera = new MeshBasicMaterial({ color: 0x000000, toneMapped: false , side: DoubleSide })
  for (const lato of [-1, 1]) {
    for (const [dy, largo] of [[-0.62, 0.42], [0.62, 0.42]] as Array<[number, number]>) {
      const b = new Mesh(new PlaneGeometry(24, largo), bandiera)
      b.position.set(lato * 3.4, 3.1 + dy, 0)
      b.rotation.set(-Math.PI / 2 + lato * 0.42, 0, Math.PI / 2)
      s.add(b)
    }
  }
  // e una sopra, che separa la lama alta dal cielo del panorama
  const bAlta = new Mesh(new PlaneGeometry(16, 0.5), bandiera)
  bAlta.position.set(0, 4.2, -0.45)
  bAlta.rotation.set(-Math.PI / 2, 0, 0)
  s.add(bAlta)

  const pmrem = new PMREMGenerator(renderer)
  const env = pmrem.fromScene(s, 0, 0.1, 200).texture
  pmrem.dispose()
  sfondo.geometry.dispose()
  ;(sfondo.material as MeshBasicMaterial).dispose()
  calda.dispose()
  fredda.dispose()
  contorno.dispose()
  bandiera.dispose()
  volta.dispose()
  daTerra.dispose()
  return env
}

/**
 * IL RACCOGLITORE D'OMBRA — un piano che non si vede, tranne dove l'auto
 * proietta.
 *
 * E' il pezzo che tiene insieme le due meta' del trucco. Il pavimento e' gia'
 * nella fotografia: metterci sopra un marmo vero significherebbe averne due,
 * e il secondo coprirebbe il primo perdendo tutti i riflessi delle colonne
 * che rendono credibile lo scatto. `ShadowMaterial` disegna SOLO l'ombra
 * ricevuta e lascia passare tutto il resto.
 *
 * L'OPACITA' NON E' 1. Un'ombra su marmo lucido non e' nera: la pietra
 * riceve luce anche da dove il corpo la copre, per riflessione dalle pareti
 * intorno. 0,42 e' quanto basta perche' l'auto appoggi senza che le si apra
 * un buco sotto.
 */
export function raccoglitoreOmbra(lato = 90) {
  const m = new ShadowMaterial({ opacity: 0.42 })
  // 0,015 sopra lo zero: sullo stesso piano del riflesso i due si
  // contenderebbero la profondita' e il pavimento sfarfallerebbe a scacchi
  const p = new Mesh(new PlaneGeometry(lato, lato), m)
  p.rotation.x = -Math.PI / 2
  p.position.y = 0.0015
  p.receiveShadow = true
  p.name = 'OMBRA_A_TERRA'
  return p
}

/**
 * DOVE GUARDA LA CAMERA DENTRO LA FOTOGRAFIA — e perche' e' un parametro.
 *
 * La camera sta a un azimut fisso, perche' e' il soggetto a girare e non lei
 * (decisione D24). Quindi per tutta la parte esterna si guarda SEMPRE LA
 * STESSA FETTA del panorama: una novantina di gradi su trecentosessanta.
 *
 * Quale fetta, e' una scelta di composizione, e all'inizio non l'avevo fatta:
 * era quella che capitava. Capitava un muretto basso con tre faretti a terra,
 * mentre a venti gradi di la' c'era l'ala della villa con le vetrate accese e
 * a settanta la piscina a sfioro col tramonto dentro. Il committente l'ha
 * detto guardando il sito: «la villa si vede in minima parte».
 *
 * Ruotare l'AMBIENTE invece di spostare la camera tiene separate due cose che
 * non c'entrano niente fra loro: da che parte si guarda l'automobile — che
 * decide se si vede il tre quarti anteriore o il fianco — e cosa le sta
 * dietro. Muovendo la camera si cambiano tutte e due insieme e non se ne
 * governa piu' nessuna.
 *
 * 225 GRADI, SCELTI GUARDANDO. `strumenti/orienta.mjs` gira la manopola di
 * quarantacinque gradi per volta e rende l'eroe una volta per posizione:
 * otto fotogrammi in una tavola, e la scelta si fa in due secondi invece che
 * in venti prove tenute a mente. Non c'e' nessun numero che dica se dietro
 * l'auto sta meglio la vetrata o la piscina.
 *
 * A 225 si mettono in fila tre cose: l'ala della villa con le vetrate accese
 * occupa tutta la larghezza, la piscina a sfioro passa ESATTAMENTE dietro la
 * vettura — e quella striscia chiara e' cio' che ne stacca la sagoma, che su
 * una carrozzeria nera e' il problema principale — e la terrazza in pietra
 * resta davanti, dove serve a dare appoggio.
 *
 * SI RUOTANO INSIEME FONDO, AMBIENTE E OMBRA. Il fondo e l'ambiente sono la
 * stessa immagine e devono restare allineati, se no la carrozzeria riflette
 * un posto diverso da quello che le sta dietro. E la direzionale che fa
 * l'ombra va con loro: e' l'unica sorgente direzionale della scena, sta al
 * posto del tramonto, e lasciandola ferma l'ombra cadrebbe dalla parte
 * sbagliata rispetto alla luce che si vede nel fotogramma.
 */
export const GIRO_PANORAMA = 225

/** comodita': monta fondo e ambiente sulla scena in un colpo solo */
export async function montaPanorama(
  renderer: WebGLRenderer,
  scena: Scene,
  /** chiamata quando la fotografia del fondo e' al suo posto: da li' il cielo
   *  costruito ha finito il suo mestiere e si puo' spegnere */
  alFondo?: () => void,
) {
  /* PRIMA L'AMBIENTE, POI IL FONDO — e questa e' la seconda versione, perche'
     la prima era una regressione.
     Al primo giro chiedevo i due file in parallelo e aspettavo entrambi:
     sembrava ovvio, l'attesa e' quella del piu' grande. Misurato con
     `strumenti/carico.mjs` su 4G lento: «ambiente pronto» passava da 5440 a
     11538 ms. Sei secondi. E quella bandiera non e' un dettaglio contabile: e'
     quella che chiude il velo di caricamento. Avevo scambiato settantadue
     megabyte di memoria video con sei secondi di schermata d'attesa.
     La versione giusta rovescia l'ordine. La sorgente dell'ambiente pesa 132 kB
     contro 491: scende molto prima, quindi l'ambiente e' pronto PRIMA di quanto
     fosse — e da quel momento ogni superficie del sito ha la luce giusta. Il
     fondo arriva dopo e nel frattempo c'e' il cielo costruito, che sta in scena
     esattamente per questo: e' la rete di sicurezza fra l'avvio e l'arrivo
     della fotografia. */
  const tAmb = await caricaAmbiente()
  scena.environment = ambienteConStrisce(renderer, tAmb)
  /* SI RICORDA LA NOTTE, perche' il tramonto e' un'ALTRA mappa e ci si torna.
     Senza questo riferimento, scegliendo TRAMONTO e poi VILLA il sito
     resterebbe al tramonto per sempre — e sarebbe un difetto silenzioso, di
     quelli che sembrano una scelta di regia. */
  scena.userData.ambienteNotte = scena.environment
  /* E LA SORGENTE SI BUTTA SUBITO. Il PMREM l'ha gia' letta e non le servira'
     mai piu': tenerla in memoria video sarebbe pagare due volte il file che si
     e' aggiunto per risparmiare. */
  tAmb.dispose()

  /* IL FONDO CONTINUA PER CONTO SUO. Non si aspetta: chi ha chiamato questa
     funzione puo' gia' scoprire la scena, e quando la fotografia arriva prende
     il posto del cielo costruito senza che nessuno debba accorgersene. */
  void caricaPanorama().then((t) => {
    scena.background = t
    giraPanorama(scena, GIRO_PANORAMA)
    alFondo?.()
  })

  /* LA ROTAZIONE SI APPLICA SUBITO E ANCHE DOPO, e non e' una ripetizione
     inutile: `giraPanorama` gira DUE cose — l'ambiente e il fondo — e in questo
     momento il fondo non c'e' ancora. La chiamata qui orienta l'ambiente, che
     e' quello che decide da che parte arriva la luce; quella dentro il `then`
     orienta la fotografia quando arriva. Senza la seconda la villa si
     troverebbe a duecentoventicinque gradi dalla sua luce. */
  giraPanorama(scena, GIRO_PANORAMA)
  // 1,0 e non 0,42 come col vecchio HDRI notturno: questa fotografia e' gia'
  // esposta come va esposta, ed e' proprio la sua esposizione a portare la
  // credibilita'. Scurirla per «sicurezza» significherebbe buttare la cosa
  // per cui e' stata scelta.
  /* LO SFONDO SCENDE, L'AMBIENTE NO — ed e' la manopola che fa la notte
     senza spegnere l'automobile.
     `backgroundIntensity` tocca SOLO la fotografia che si vede dietro;
     `environmentIntensity` (poco sotto, lasciato a 1,0) e' cio' che ILLUMINA
     la lamiera. Separarle vuol dire: villa e lastricato scendono di mezzo
     stop e diventano notte, mentre la vettura continua a ricevere la stessa
     luce e resta leggibile. Abbassare l'esposizione, invece, le avrebbe
     abbassate tutte e due insieme — che e' come si ottiene una foto scurita
     al posto di una notte. */
  scena.backgroundIntensity = 0.62
  /* LO SFONDO E' UN FILO MENO NITIDO DEL SOGGETTO.
     Tre centesimi, che sono pochissimi e si sentono: e' la profondita' di
     campo di un teleobiettivo aperto, dove il fondo non e' sfocato — e' solo
     un gradino indietro rispetto a cio' che sta a fuoco. Senza, villa e
     automobile hanno esattamente la stessa nitidezza, e due piani alla stessa
     nitidezza l'occhio li legge come la stessa distanza: e' una delle ragioni
     per cui un render sembra un render.
     Misurato (energia alle alte frequenze, `.tmp` di prova): la fascia della
     villa passa da 5,63 a 4,13, cioe' meno ventisette per cento; la
     carrozzeria da 4,70 a 4,36, meno sette. Il soggetto perde quattro volte
     meno del fondo — e quel poco che perde e' giusto che lo perda, perche' su
     una vernice a specchio quello che si vede E' la villa.
     Costa zero: nessuna passata nuova, nessuna immagine in piu'. */
  /* 0,14 E NON 0,03 — ed e' la profondita' di campo, che non c'era da nessuna
     parte nella catena (`RenderPass -> GTAO -> Bloom -> OutputPass -> SMAA ->
     Grado`). Il colonnato della villa era nitido quanto la lamiera, e per
     questo i mockup del carosello leggevano come adesivi incollati su una
     fotografia invece che come oggetti a una distanza.
     NON serve un `BokehPass`: costa, e fa artefatti proprio sui bordi
     speculari, che su una carrozzeria nera sono la cosa piu' preziosa che ci
     sia. E non serve nemmeno cuocere un secondo panorama sfocato: three sfoca
     il fondo da solo, e sfoca SOLO il fondo — l'ambiente che l'auto specchia
     resta quello nitido, che e' esattamente la divisione giusta. Zero byte
     sul percorso critico.
     0,055 E NON 0,14. A 0,14 la villa si dissolve in una macchia beige: il
     fondo smette di essere un LUOGO e diventa un gradiente, e con lui se ne va
     l'unica cosa che rendeva fotografica la scena. La sfocatura deve staccare
     il soggetto, non cancellare cio' da cui lo stacca — il colonnato deve
     restare leggibile come colonnato. */
/* ZERO — E IL MECCANISMO ERA SBAGLIATO, NON IL VALORE.
     Questo numero e' sceso tre volte, sempre per la stessa segnalazione: «la
     villa legge come vetro smerigliato, non come fuori fuoco». 0,14, poi
     0,055, poi 0,035 — e la revisione continuava a vedere il vetro smerigliato.
     Aveva ragione, e il motivo e' che `backgroundBlurriness` non e' una
     sfocatura: campiona i MIP della PMREM, cioe' una cascata di riduzioni a
     meta'. E' matematicamente una convoluzione con un nucleo a piramide,
     ripetuta — che e' esattamente il modello di una superficie ruvida, cioe'
     del vetro smerigliato. Non e' un'approssimazione del fuori fuoco: e' la
     cosa giusta per un'altra domanda.
     Un fuori fuoco e' una GAUSSIANA (o un disco, se si vuole il bokeh vero):
     allarga i bordi conservandone la struttura, invece di mescolarli. A
     qualunque valore, un mip blur non puo' fare quello.
     Quindi la sfocatura si cuoce nel file, una volta, con una gaussiana vera a
     sigma 1,35 sui 4096 px del panorama.

     IL SIGMA VA CONTATO IN PIXEL DI SCHERMO, non di sorgente, e al primo giro
     l'ho sbagliato. A sigma 3,5 la villa spariva del tutto: il panorama copre
     360 gradi in 4096 px, la hero ne inquadra una quarantina — cioe' 455 px di
     sorgente stirati su 1200 di schermo, un ingrandimento di 2,6. Sigma 3,5
     diventava nove pixel a schermo. 1,35 sulla sorgente fa i 3,5 veri, che e'
     il fuori fuoco di un obiettivo lungo su un fondale a quella distanza.
     L'originale nitido sta in `texture-sorgente/corte_pano_nitido.webp`.

     E COSTA MENO DI QUANTO COSTAVA. Un'immagine sfocata non ha alte frequenze,
     e le alte frequenze sono quasi tutto quello che un codificatore paga:
     491 kB -> 228 kB. Duecentosessantatre kilobyte in meno sul percorso critico,
     su un file che e' il secondo per peso. La cura di un difetto visivo che
     alleggerisce e' rara abbastanza da meritare di essere scritta.

     NON TOCCA LA LUCE: l'ambiente nasce da `corte_pano_ambiente.webp`, che e'
     un altro file e resta nitido. La divisione fra «cio' che si vede dietro» e
     «cio' che la carrozzeria specchia» regge, ed e' quella che rende possibile
     questa cura. */
  scena.backgroundBlurriness = 0
  scena.environmentIntensity = 1.0
  /* NON TORNA PIU' LA FOTOGRAFIA. Tornava il fondo, e adesso quando questa
     funzione finisce il fondo non e' ancora arrivato: chi lo volesse dovrebbe
     aspettarlo, e aspettarlo e' esattamente cio' che si e' smesso di fare.
     Nessuno lo usava — la si trova su `scena.background` quando serve. */
}

/**
 * Ruota la fotografia intorno all'asse verticale, in gradi.
 *
 * La direzionale la segue: la si ritrova per nome invece di passarla da fuori,
 * perche' chi ruota il panorama non deve sapere come e' fatto l'impianto luci
 * — deve solo poter dire «gira di tanto» ed essere sicuro che non resti
 * indietro qualcosa.
 */
/**
 * QUALE LUOGO, e non e' solo una rotazione.
 *
 * Tre dei quattro pulsanti girano la stessa fotografia e basta: il posto
 * cambia, l'ora no. Il quarto — TRAMONTO — cambia l'ORA, e un'ora non sta
 * dentro una fotografia scattata all'ora blu (vedi «scene/Tramonto.ts» per
 * come l'ho scoperto, e per due misure giuste che mi avevano portato altrove).
 *
 * Quindi qui succedono due cose diverse a seconda del luogo, e la ragione per
 * cui stanno nella stessa funzione e' che sono la stessa decisione: cosa vede
 * e cosa riceve la vettura. Tenerle separate significherebbe poter cambiare
 * l'una senza l'altra, cioe' una carrozzeria che specchia un posto diverso da
 * quello che le sta dietro — che e' esattamente il difetto che la rotazione
 * congiunta di fondo e ambiente esiste per evitare.
 *
 * SI COSTRUISCE ALLA PRIMA RICHIESTA E POI SI TIENE. Cuocere una PMREM costa,
 * e pagarlo all'avvio per un pulsante che magari nessuno tocca sarebbe pagarlo
 * per tutti. Pagarlo ogni volta che si preme sarebbe peggio. Una volta sola,
 * alla prima pressione.
 */
export function applicaLuogo(
  renderer: WebGLRenderer,
  scena: Scene,
  indice: number,
  gradi: number,
) {
  giraPanorama(scena, gradi)
  const d = scena.userData
  const alTramonto = indice === 2
  if (alTramonto && !d.ambienteTramonto) {
    /* la sorgente si ricarica invece di tenerla in memoria video: e' 132 kB e
       il browser ce l'ha gia' in cache, mentre una tessitura tenuta viva costa
       memoria per sempre a chi il pulsante non lo preme mai */
    void caricaAmbiente().then((t) => {
      d.ambienteTramonto = ambienteTramonto(renderer, t)
      t.dispose()
      if (d.luogoCorrente === 2) scena.environment = d.ambienteTramonto
    })
  }
  d.luogoCorrente = indice
  if (alTramonto) {
    if (d.ambienteTramonto) scena.environment = d.ambienteTramonto
    if (!d.sole) { d.sole = soleBasso(); scena.add(d.sole) }
    ;(d.sole as Group).visible = true
  } else {
    if (d.ambienteNotte) scena.environment = d.ambienteNotte
    if (d.sole) (d.sole as Group).visible = false
  }
  /* IL SOLE GIRA CON IL PANORAMA. E' un oggetto della scena, non della
     fotografia: lasciandolo fermo, cambiando luogo si troverebbe davanti alla
     villa invece che sul mare. Lo si riporta ogni volta dalla posa di partenza,
     come si fa gia' con l'ombra qui sotto. */
  if (d.sole) {
    const s = d.sole as Group
    if (!s.userData.posaZero) s.userData.posaZero = s.rotation.y
    s.rotation.y = s.userData.posaZero + ((gradi - 90) * Math.PI) / 180
  }
}

export function giraPanorama(scena: Scene, gradi: number) {
  const a = (gradi * Math.PI) / 180
  scena.backgroundRotation.y = a
  scena.environmentRotation.y = a
  const ombra = scena.getObjectByName('OMBRA')
  if (ombra) {
    const d = ombra.userData
    // si ricorda la posa di partenza: ruotare due volte di seguito, come
    // succede spingendo la manopola nello strumento di taratura, altrimenti
    // sommerebbe i giri invece di sostituirli
    if (!d.posaZero) d.posaZero = ombra.position.clone()
    ombra.position.copy(d.posaZero).applyAxisAngle(SU, a)
  }
}

const SU = /*@__PURE__*/ new Vector3(0, 1, 0)
