import {
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RectAreaLight,
  Vector3,
} from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

/**
 * L'IMPIANTO LUCE — pannelli, non lampade.
 *
 * PERCHE' L'HDRI DA SOLO NON BASTA, e non e' una questione di intensita'.
 *
 * Una carrozzeria nera non ha colore da mostrare: quello che si vede su una
 * fiancata nera NON E' LUCE, e' il riflesso di cio' che le sta intorno. Se
 * intorno c'e' una notte scura punteggiata da qualche lampione, la
 * carrozzeria riflette una notte scura punteggiata da qualche lampione —
 * cioe' niente, piu' un paio di punti bruciati. E' esattamente il difetto
 * che si legge nel provino: una macchia nera senza forma con due bolle
 * bianche sopra.
 *
 * Ed e' il motivo per cui aumentare le tessiture non ha spostato niente. La
 * tessitura descrive la superficie; ma su una vernice nera lucida la
 * superficie e' quasi invisibile — si vede solo cio' che ci si specchia.
 *
 * COME SI FOTOGRAFA DAVVERO UN'AUTO.
 *
 * In studio non si punta un faro: si mettono dei PANNELLI grandi, lunghi e
 * morbidi, e li si dispone in modo che la loro immagine riflessa scorra
 * lungo la carrozzeria. Il famoso «filo di luce» che corre dal parafango
 * anteriore alla coda non e' un effetto: e' un pannello lungo nove metri
 * appeso di traverso sopra l'auto. Chi guarda non lo vede mai, vede solo il
 * suo riflesso — ed e' quel riflesso a disegnare la forma.
 *
 * Quindi qui non ci sono lampade. Ci sono tre pannelli, e ognuno ha un
 * mestiere dichiarato:
 *
 *   CHIAVE   il pannello lungo sopra e leggermente verso la camera. Fa il
 *            filo di luce su cofano, tetto e spalla. E' quello che
 *            trasforma la macchia nera in un volume.
 *
 *   TAGLIO   dietro, dalla parte opposta alla camera, alto e stretto. Stacca
 *            il profilo dal fondo. Su un'auto nera di notte e' l'unica cosa
 *            che dice dove finisce l'auto e comincia lo sfondo: senza, il
 *            soggetto e il fondo sono lo stesso nero.
 *
 *   BASSO    davanti, largo e debole. Apre il frontale e i cerchi, che
 *            altrimenti restano un buco. Debole APPOSTA: se pareggia gli
 *            altri due il fotogramma si appiattisce e torna «render».
 *
 * IL VETRO E' LA RAGIONE PER CUI THREE PUO' FARLO.
 *
 * `RectAreaLight` non e' una luce puntiforme con un rettangolo disegnato
 * sopra: calcola lo specchio del rettangolo sulla superficie (le tabelle
 * LTC). Cioe' produce davvero un riflesso LUNGO, con due bordi e una
 * lunghezza — non un puntino. E' l'unica luce in three con cui una vernice
 * possa somigliare a una vernice.
 *
 * In cambio non fa ombre, mai. L'ombra resta mestiere della direzionale,
 * che qui e' rimasta per quello e solo per quello.
 *
 * I PANNELLI NON SI VEDONO MAI. NESSUNO.
 *
 * Ci ho provato — vedi `luciArchitettura()` piu' sotto — e il provino ha
 * detto no in modo inequivocabile. Cio' che si specchia e' un'altra
 * famiglia di oggetti: tagli di luce lontani, sottili, che stanno
 * nell'architettura. I pannelli restano invisibili e fanno solo il
 * modellato.
 */

/**
 * IL LIVELLO DEI PANNELLI — la bandiera, tradotta in codice.
 *
 * In uno studio fotografico, fra il pannello e il pavimento si mette una
 * BANDIERA: un pannello nero che intercetta la luce diretta verso terra. Non
 * e' un dettaglio da perfezionisti, e' routine — senza, ogni sorgente stende
 * una pozza chiara sul fondo, la pozza compare nell'inquadratura e non ha
 * nessuna causa visibile, quindi legge come un errore.
 *
 * Nel provino era esattamente cosi': una macchia calda allungata davanti
 * all'auto che sembrava un difetto del motore. Ho dato la colpa al riflesso a
 * terra e l'ho corretto due volte; il riflesso c'entrava poco. La sorgente
 * era il pannello basso, che sta a un metro e quindici da terra e illumina il
 * pavimento prima ancora di arrivare al muso.
 *
 * In three la bandiera si fa con i LIVELLI: una luce illumina solo gli
 * oggetti con cui condivide un livello. Mettendo i pannelli sul livello 2 e
 * accendendo il livello 2 sulla sola vettura, i pannelli diventano luce da
 * studio nel senso pieno del termine — esistono per il soggetto e per nessun
 * altro.
 *
 * E' anche la soluzione onesta al problema piu' generale di questa scena:
 * l'illuminazione dell'AMBIENTE e quella del SOGGETTO sono due impianti
 * diversi con due mestieri diversi, e finora si pestavano i piedi.
 */
export const LIVELLO_SOGGETTO = 2

let inizializzata = false

export type Pannello = {
  luce: RectAreaLight
  /** l'oggetto luminoso che si specchia, quando serve che si veda */
  corpo?: Mesh
}

function pannello(
  colore: number,
  forza: number,
  larghezza: number,
  altezza: number,
  dove: Vector3,
  mira: Vector3,
  visibile = false,
): Pannello {
  const luce = new RectAreaLight(colore, forza, larghezza, altezza)
  // solo il soggetto: vedi LIVELLO_SOGGETTO
  luce.layers.set(LIVELLO_SOGGETTO)
  luce.position.copy(dove)
  luce.lookAt(mira.x, mira.y, mira.z)

  if (!visibile) return { luce }

  // il corpo luminoso: stessa posa, stessa misura. Non emette luce — quella
  // la fa la RectAreaLight — esiste solo per finire dentro i riflessi.
  const corpo = new Mesh(
    new PlaneGeometry(larghezza, altezza),
    new MeshBasicMaterial({ color: colore, toneMapped: false }),
  )
  corpo.position.copy(dove)
  corpo.lookAt(mira)
  // SOTTO LA SOGLIA DEL BLOOM, che sta a 2,6.
  //
  // Un pannello che fiorisce non e' piu' un pannello: l'alone gli mangia i
  // bordi, e sono proprio i bordi a dare al riflesso la forma di un
  // rettangolo invece che di una macchia. La regola della fotografia di
  // lusso e' che le sorgenti sono LUMINOSE e NETTE, non esplose.
  corpo.material.color.multiplyScalar(1.6)
  return { luce, corpo }
}

/*
 * QUI C'ERA `luciArchitettura()`, ed e' stata tolta. La nota resta perche' il
 * passaggio e' servito.
 *
 * Erano cinque rettangoli luminosi sospesi a quindici metri, messi li' per
 * dare alla vernice nera qualcosa di lungo da specchiare quando l'ambiente
 * era una fotografia. Nel provino galleggiavano: barre di luce senza niente
 * che le reggesse.
 *
 * Il difetto ha insegnato la distinzione su cui poi si e' costruita tutta la
 * corte: CIO' CHE ILLUMINA e CIO' CHE SI SPECCHIA sono due famiglie di
 * oggetti diverse. Il primo sta vicino, e' grande e non si vede MAI — se
 * entra in campo, il fotogramma e' sbagliato per definizione. Il secondo sta
 * lontano, e' stretto ed e' ARCHITETTURA: in una fotografia di questo tipo le
 * righe che scorrono sulla fiancata non sono softbox, sono i tagli di luce
 * dei portici.
 *
 * Adesso quel mestiere lo fanno le gole vere annegate nell'architrave della
 * corte, che si specchiano meglio perche' sono attaccate a qualcosa. Tenere
 * anche le finte avrebbe voluto dire dieci sorgenti di cui cinque
 * impossibili.
 */

/**
 * Il rig completo. La mira e' il fianco dell'auto, non il suo centro: i
 * pannelli devono lavorare sulla superficie che si vede, e il centro di una
 * scatola sta dentro la scatola.
 */
export function costruisciLuci() {
  if (!inizializzata) {
    // le tabelle LTC vanno caricate una volta sola, prima di qualunque
    // RectAreaLight: senza, la luce esiste ma non illumina niente e non da'
    // nessun errore
    RectAreaLightUniformsLib.init()
    inizializzata = true
  }

  const gruppo = new Group()
  gruppo.name = 'LUCI'
  const auto = new Vector3(0, 0.78, 0)

  // CHIAVE — nove metri per due e mezzo, appesa a quattro e mezzo.
  //
  // Lunga il doppio dell'auto apposta: un pannello corto quanto il soggetto
  // produce un riflesso che comincia e finisce dentro il fotogramma, e si
  // legge come una macchia bianca appoggiata sul cofano. Deve USCIRE da
  // entrambi i lati, cosi' il filo di luce attraversa tutta la vettura.
  //
  // Spostata verso la camera (z positivo) e non a piombo: a piombo il filo
  // cade sul centro del tetto, dove nessuno lo vede. Spostata, scivola
  // sulla spalla — il punto in cui il fianco gira verso l'alto — che e' la
  // linea che racconta la forma di un'automobile.
  const chiave = pannello(
    // 1,6 E NON 7,5, e la ragione e' che il rig da studio ha finito il suo
    // mestiere. Serviva quando intorno all'auto non c'era niente: adesso c'e'
    // un porticato con dodici sorgenti calde annegate nell'architrave, e i
    // pannelli si sommano a quelle invece di sostituirle.
    //
    // Il sintomo era preciso: il parabrezza, che e' quasi uno specchio
    // (ruvidita' 0,02), restituiva l'immagine del pannello — nove metri per
    // due e mezzo — come un rettangolo bianco grande quanto mezzo cofano. Non
    // era il materiale sbagliato: era che gli stavo mettendo davanti un
    // lenzuolo luminoso che nella scena non esiste.
    //
    // Quel poco che resta serve a una cosa sola: impedire che il fianco
    // rivolto alla camera vada in nero pieno quando l'orbita lo porta lontano
    // dalle gole. E' un riempimento, non piu' una chiave.
    // 3,4 con un pannello PIU' PICCOLO e PIU' ALTO: 7 x 2 metri a 5,4 di
    // quota invece di 9 x 2,5 a 4,6.
    //
    // Il parabrezza ha ruvidita' 0,02, cioe' e' uno specchio: la sua immagine
    // riflessa e' letteralmente la fotografia del pannello. Con nove metri di
    // lenzuolo bianco a quattro metri e mezzo quella fotografia riempiva mezzo
    // cofano e clippava. Rimpicciolire e alzare la sorgente rimpicciolisce il
    // riflesso senza toccarne la morbidezza, perche' la morbidezza dipende
    // dall'angolo sotteso e non dall'intensita'. Era l'unica manopola giusta
    // fra le quattro che avevo in mano.
    // IL PANNELLO DI CHIAVE DIVENTA FREDDO, e non e' un gusto: e' l'unica
    // manopola che introduce un SECONDO colore nel fotogramma.
    //
    // Il giudizio era «e' tutto scala di grigi»: giusto, perche' ogni
    // sorgente della scena era ambra — le gole della corte, i lampioni
    // dell'architettura, il riempimento basso. Un'immagine con una sola
    // dominante non ha colore, ha una tinta: l'occhio la normalizza e vede
    // grigio piu' o meno caldo.
    //
    // Il colore, in fotografia, e' un RAPPORTO. Basta che la luce dall'alto
    // sia il crepuscolo — azzurra, perche' il cielo di sera e' azzurro — e
    // quella delle architetture resti calda, perche' sono lampade: nello
    // stesso fotogramma compaiono due famiglie di ombre, e il nero smette di
    // essere nero e diventa blu di notte con i bordi ambra.
    //
    // E' la ragione fisica per cui le fotografie all'ora blu hanno quel
    // colore li'. Non e' un filtro: sono due sorgenti a temperature diverse.
    0xa9c8ff, 9.5, 7.4, 2.2,
    new Vector3(0.4, 5.4, 3.4), auto,
  )
  chiave.luce.name = 'PANNELLO_CHIAVE'

  // TAGLIO — dietro, alto, stretto, caldo, e FORTE.
  //
  // E' l'unico che si vede, ed e' l'unico che puo' permettersi di essere
  // forte: la sua immagine riflessa e' una riga verticale luminosa sul
  // fianco lontano, cioe' esattamente il bordo che altrimenti sparisce nel
  // nero. La forza serve perche' lavora contro un fondo notturno.
  //
  // Il colore e' bronzo, non bianco: la luce architetturale calda e' meta'
  // di quello che fa leggere «lusso» in una fotografia di questo tipo. Un
  // taglio bianco freddo dice «studio», un taglio ambra dice «palazzo».
  const taglio = pannello(
    // 7 E PIU' IN BASSO. A 15 e a 2,8 metri di quota questo pannello valeva
    // da solo un terzo della luminanza sul parabrezza — misurato spegnendolo
    // (`strumenti/colpevole.mjs`), non dedotto. Un taglio che si vede sul
    // VETRO non sta facendo il suo mestiere: deve disegnare il BORDO della
    // carrozzeria.
    //
    // Sceso a un metro e mezzo di quota lavora di striscio sulla fiancata,
    // che e' dove serve: e' l'altezza da cui si vede il fianco di un'auto,
    // ed e' anche l'altezza della camera. Alzato, colpisce il tetto e il
    // parabrezza, cioe' le due superfici che lo rimandano dritto
    // nell'obiettivo.
    0xffc98a, 11.0, 1.1, 4.0,
    new Vector3(-7.2, 1.5, -5.4), new Vector3(0, 0.55, 0),
  )
  taglio.luce.name = 'PANNELLO_TAGLIO'

  // BASSO — davanti, largo, debolissimo.
  //
  // Non deve illuminare: deve impedire che il frontale sia un buco. Su
  // un'auto nera il muso e i cerchi sono le zone piu' scure in assoluto
  // perche' guardano in basso, dove non c'e' niente. Un pannello a
  // mezz'altezza gli restituisce giusto il disegno.
  /* E ADESSO E' AZZURRO, perche' li' sotto c'e' una piscina.
     Era 0xffe6cc, cioe' crema: una luce di riempimento neutra, scelta quando
     doveva solo impedire che il muso fosse un buco. Ma sotto e a sinistra di
     questa vettura c'e' dell'acqua illuminata — misurata a 156 di luminanza,
     la cosa piu' chiara del fotogramma dopo la villa — e una superficie
     riflettente grande cosi', a due metri, manda su il proprio colore.
     Un riempimento crema, li', e' una luce che nella scena non esiste. Uno
     azzurro e' quello che c'e' gia' e che non stavo usando: arriva sul
     sottoporta, sui cerchi e sotto il diffusore, cioe' le tre superfici che
     guardano in basso e che in una vettura nera sono le piu' scure in assoluto.
     E fa anche il mestiere che il committente chiedeva senza saperlo nominare:
     e' la coppia fondo freddo / taglio caldo su cui si reggono quasi tutte le
     fotografie d'automobile premiate. Il caldo ce l'ha gia' il PANNELLO_TAGLIO
     dalle vetrate; mancava il freddo. */
  const basso = pannello(
    0xa8ccf5, 7.5, 6.0, 1.8,
    new Vector3(6.8, 1.15, 2.2), new Vector3(0, 0.55, 0),
  )
  basso.luce.name = 'PANNELLO_BASSO'

  /* IL RIEMPIMENTO DEL MUSO NON STA QUI, E LA RAGIONE E' UNA MISURA.
     L'avevo messo in questo rig, fermo nel mondo, e ha funzionato per un beat
     solo: al tempo `orbita` la frazione di carrozzeria quasi nera e' scesa dal
     48,7 al 39,2 per cento, e alla hero e al `lato` non e' cambiato NIENTE.
     Il motivo e' la scelta di regia che regge tutta la prima meta' del sito:
     qui la camera sta ferma e gira l'AUTOMOBILE. Una sorgente ferma nel mondo
     illumina un pezzo diverso a ogni tempo, e il muso — che e' quello che al
     committente mancava — se la trova addosso solo quando gli capita davanti.
     Quindi quel pannello e' appeso al perno della vettura: vedi
     `core/Esperienza.ts`. Gira con lei, e il muso ce l'ha sempre. */

  for (const p of [chiave, taglio, basso]) {
    gruppo.add(p.luce)
    if (p.corpo) gruppo.add(p.corpo)
  }

  // UN SECONDO TAGLIO SUL LATO OPPOSTO, piu' debole.
  //
  // Serve perche' la camera FA IL GIRO. Un rig tarato su una sola
  // inquadratura e' un rig da fotografia; questo deve reggere duecento
  // gradi di orbita, e nell'ultimo terzo il taglio principale finisce
  // davanti alla camera invece che dietro l'auto. Il secondo prende il suo
  // posto e la silhouette non si perde mai.
  const controtaglio = pannello(
    0xffbe7a, 9.0, 0.9, 4.4,
    new Vector3(4.2, 2.4, -6.2), auto,
  )
  controtaglio.luce.name = 'PANNELLO_CONTROTAGLIO'
  gruppo.add(controtaglio.luce)

  // I TAGLI FINTI A MEZZ'ARIA SONO STATI TOLTI.
  //
  // Erano cinque rettangoli luminosi sospesi a quindici metri, e servivano a
  // dare alla vernice nera qualcosa di lungo da specchiare quando l'ambiente
  // era una fotografia. Adesso l'ambiente e' costruito e ha le sue gole di
  // luce vere, annegate nell'architrave: quelle si specchiano meglio, perche'
  // sono attaccate a qualcosa. Tenere tutti e due significava avere dieci
  // sorgenti di cui cinque impossibili.
  //
  // `luciArchitettura()` resta nel file come nota di lavoro: e' il passaggio
  // in cui ho capito che cio' che illumina e cio' che si specchia sono due
  // famiglie diverse di oggetti, e quella distinzione e' servita a costruire
  // la corte.

  // LA DIREZIONALE RESTA, ma solo per l'ombra.
  //
  // I pannelli non ne fanno nessuna, e senza un contatto scuro sotto le
  // ruote l'auto galleggia — e' il difetto che si nota per primo anche
  // senza saperlo nominare. Scesa a 0,45 perche' adesso non deve piu'
  // illuminare: se resta a 0,9 somma la sua luce piatta a quella dei
  // pannelli e cancella proprio il modellato che i pannelli costruiscono.
  // LA DIREZIONALE RESTA SU TUTTI I LIVELLI, e deve: il suo mestiere e'
  // l'ombra di contatto sotto le ruote, e un'ombra ha bisogno che sia
  // illuminato anche il pavimento su cui cade. E' l'unica sorgente da studio
  // che il pavimento vede.
  const ombra = new DirectionalLight(0xbfd4f5, 0.75)
  ombra.position.set(5.5, 8.0, 4.5)
  ombra.castShadow = true
  ombra.shadow.mapSize.set(2048, 2048)
  const c = ombra.shadow.camera
  c.left = -6; c.right = 6; c.top = 6; c.bottom = -6
  c.near = 1; c.far = 30
  ombra.shadow.bias = -0.0006
  ombra.shadow.normalBias = 0.02
  ombra.name = 'OMBRA'
  gruppo.add(ombra)

  return gruppo
}
