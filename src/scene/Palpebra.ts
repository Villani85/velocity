import {
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PointLight,
  RepeatWrapping,
  Shape,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three'

/**
 * LA PALPEBRA DEL QUADRO — la cornice in cui lo strumento e' incastonato.
 *
 * PERCHE' SERVE, e non e' decorazione.
 *
 * Il quadro disegnato funziona: anello dei giri, marcia al centro, velocita'
 * accanto, e il bagliore che lo fa sembrare acceso. Ma appoggiato sulla
 * fotografia dell'abitacolo resta un RETTANGOLO NERO con dentro della grafica.
 * Gli manca la sola cosa che, in un'automobile vera, dice che quello e' uno
 * strumento e non uno schermo: la palpebra. La modanatura che lo circonda, gli
 * fa ombra sopra e lo tiene incassato.
 *
 * E' anche la ragione per cui un cruscotto vero non abbaglia mai chi guida: la
 * palpebra e' nata per quello, non per bellezza. Un pannello a filo di
 * cruscotto riflette il parabrezza e di notte si specchia sul vetro.
 *
 * PERCHE' COSTRUITA E NON FOTOGRAFATA.
 *
 * Tutto il resto dell'abitacolo e' una fotografia, e la regola di questo
 * progetto (decisione D21) dice: si costruisce cio' che la camera attraversa,
 * si fotografa cio' davanti a cui si ferma. Qui pero' c'e' un terzo caso: cio'
 * che deve COMBACIARE con una cosa costruita. La palpebra deve stare intorno
 * al quadro al millimetro, e il quadro e' una tela posizionata da un calcolo.
 * Una palpebra fotografata andrebbe riallineata a mano a ogni cambio di
 * formato, di riquadro, di inquadratura — e sbaglierebbe al primo.
 *
 * Costruita, prende lo stesso riquadro dello strumento e non puo' disallinearsi
 * per definizione. In cambio deve reggere il confronto con una fotografia
 * accanto, ed e' per questo che il materiale conta piu' della forma: nessuno
 * guarda la sezione di una modanatura, tutti vedono se la luce ci scorre sopra
 * come su una plastica morbida o come su un pezzo di plastica lucida.
 */

/** quanto la palpebra sporge in avanti rispetto al piano dello strumento */
const SPORGENZA = 0.055
/** quanto e' larga la cornice intorno al quadro, in frazione della sua altezza */
const CORNICE = 0.16
/** quanto scende la visiera sopra, sempre in frazione dell'altezza del quadro */
const VISIERA = 0.30

/**
 * Un rettangolo con gli angoli arrotondati, come contorno di una forma.
 * Il raggio si esprime in frazione del lato corto: cosi' la forma resta la
 * stessa a qualunque misura, che e' l'unico modo perche' non vada ritarata.
 */
function rettangoloTondo(l: number, a: number, raggio: number) {
  const r = Math.min(raggio * Math.min(l, a), Math.min(l, a) / 2)
  // SEMPRE una `Shape`, anche quando serve come buco.
  //
  // `Path` e `Shape` disegnano allo stesso modo, ma solo `Shape` puo' avere
  // buchi a sua volta e solo `Shape` e' accettata da `ExtrudeGeometry`. Usare
  // `Path` per i buchi — che e' quello che dicono quasi tutti gli esempi —
  // costa due errori di tipo e nessun vantaggio: un buco e' una forma chiusa
  // come le altre.
  const forma = new Shape()
  const x = -l / 2, y = -a / 2
  forma.moveTo(x + r, y)
  forma.lineTo(x + l - r, y)
  forma.quadraticCurveTo(x + l, y, x + l, y + r)
  forma.lineTo(x + l, y + a - r)
  forma.quadraticCurveTo(x + l, y + a, x + l - r, y + a)
  forma.lineTo(x + r, y + a)
  forma.quadraticCurveTo(x, y + a, x, y + a - r)
  forma.lineTo(x, y + r)
  forma.quadraticCurveTo(x, y, x + r, y)
  return forma
}

/**
 * IL MATERIALE — plastica morbida da cruscotto, non plastica lucida.
 *
 * E' la differenza fra un abitacolo da centomila euro e uno da utilitaria, e si
 * gioca su due numeri.
 *
 * RUVIDITA' 0,62: alta. Una plancia vera e' goffrata — ha una grana fine
 * apposta — e quella grana disperde il riflesso in un alone largo invece che
 * in una macchia. A 0,2 la stessa forma legge come plastica stampata a caldo.
 *
 * TRASPARENTE 0,25 e non zero: sopra la goffratura c'e' comunque un velo
 * protettivo, e quel velo un riflesso nitido ce l'ha. E' il contrasto fra i due
 * — alone largo sotto, riflesso stretto sopra — a dire «morbido». Con un solo
 * strato si ottiene o gomma o plastica, mai pelle.
 *
 * COLORE 0,022: piu' scuro di quanto sembri sensato. Una plancia e' quasi nera
 * perche' non deve specchiarsi nel parabrezza, ed e' anche il motivo per cui il
 * quadro acceso ci risalta sopra come risalta.
 */
/**
 * LA GRANA E' LA META' DEL MATERIALE, e senza non c'e' fotografia che tenga.
 *
 * Ruvidita' e colore descrivono COME una superficie riflette; la grana descrive
 * COM'E' FATTA. Un pezzo senza grana ha un riflesso che scivola liscio, e non
 * esiste in natura una plancia cosi': anche la plastica piu' economica e'
 * goffrata, perche' una plastica liscia si graffia guardandola.
 *
 * La mappa la genera `strumenti/grana.mjs` — un diagramma di Voronoi, che e'
 * letteralmente come si screpola una pelle — piu' una bombatura per cella e una
 * sotto-grana otto volte piu' fine. E' procedurale e non generata da un
 * modello: su una mappa di NORMALI un'immagine di un modello ha la luce cotta
 * dentro, e il risultato e' la «cartapesta» gia' pagata su questo progetto.
 *
 * `pelle_rgh` non e' uniforme: i dossi sono un po' piu' lucidi dei solchi,
 * perche' su una plancia vera le creste le hanno sfiorate mille mani. E' il
 * dettaglio che separa «materiale con una grana» da «materiale usato».
 */
const caricatore = new TextureLoader()
function mappa(url: string) {
  const t = caricatore.load(url)
  t.wrapS = t.wrapT = RepeatWrapping
  return t
}

function plasticaMorbida() {
  const m = new MeshPhysicalMaterial({
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.42,
    envMapIntensity: 0.55,
    normalMap: mappa('/texture/pelle_nor.webp'),
    roughnessMap: mappa('/texture/pelle_rgh.webp'),
  })
  // 0,55 e non 1: la mappa e' generata con una forza pensata per essere
  // ammorbidita qui. Tenere il rilievo governabile da UN posto — questo —
  // significa poterlo ritoccare senza rigenerare mezzo megabyte di immagine.
  m.normalScale = new Vector2(0.55, 0.55)
  m.color.setRGB(0.022, 0.023, 0.026)
  m.name = 'PLANCIA_MORBIDA'
  return m
}

/** il filo lucido che corre sul bordo interno: un pezzo tornito, non verniciato */
function filoMetallo() {
  const m = new MeshPhysicalMaterial({
    roughness: 0.28,
    metalness: 1.0,
    envMapIntensity: 1.0,
  })
  m.color.setRGB(0.34, 0.35, 0.37)
  m.name = 'PLANCIA_FILO'
  return m
}

export class Palpebra {
  readonly gruppo = new Group()
  private cornice: Mesh
  private filo: Mesh
  private visiera: Mesh
  private morbida: MeshPhysicalMaterial
  private spia: PointLight

  constructor() {
    // Le geometrie si costruiscono a misura UNITARIA — larghezza 1, altezza 1 —
    // e la scala vera arriva da `posiziona`. E' cio' che permette di seguire un
    // riquadro che cambia con il formato dello schermo senza ricostruire niente
    // a ogni ridimensionamento: una moltiplicazione al posto di una geometria.
    const morbida = plasticaMorbida()
    this.morbida = morbida

    const fuori = rettangoloTondo(1 + CORNICE * 2, 1 + CORNICE * 2, 0.09)
    fuori.holes.push(rettangoloTondo(1, 1, 0.07))
    this.cornice = new Mesh(
      new ExtrudeGeometry(fuori, { depth: SPORGENZA, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 3, curveSegments: 12 }),
      morbida,
    )
    this.cornice.name = 'PALPEBRA_CORNICE'

    const filoForma = rettangoloTondo(1 + CORNICE * 0.5, 1 + CORNICE * 0.5, 0.08)
    filoForma.holes.push(rettangoloTondo(1 + CORNICE * 0.18, 1 + CORNICE * 0.18, 0.075))
    this.filo = new Mesh(
      new ExtrudeGeometry(filoForma, { depth: SPORGENZA * 0.45, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.005, bevelSegments: 2, curveSegments: 12 }),
      filoMetallo(),
    )
    this.filo.name = 'PALPEBRA_FILO'

    // LA VISIERA — la falda che sporge sopra e fa ombra sul quadro.
    //
    // E' un pezzo separato e non un ispessimento della cornice perche' deve
    // sporgere PIU' del resto: e' quella sporgenza a produrre l'ombra, ed e'
    // l'ombra il segnale che l'occhio usa per capire che lo strumento e'
    // incassato invece che appiccicato.
    const vis = rettangoloTondo(1 + CORNICE * 2, VISIERA, 0.22)
    this.visiera = new Mesh(
      new ExtrudeGeometry(vis, { depth: SPORGENZA * 2.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.022, bevelSegments: 4, curveSegments: 14 }),
      morbida,
    )
    this.visiera.name = 'PALPEBRA_VISIERA'
    this.visiera.position.y = 0.5 + CORNICE - VISIERA * 0.22

    /**
     * LA LUCE CHE ESCE DAL QUADRO, ed e' quella che rende la palpebra un
     * oggetto invece che una sagoma.
     *
     * Nell'abitacolo di notte non c'e' nessun'altra sorgente vicina: il
     * cruscotto e' illuminato DAL PROPRIO STRUMENTO, e solo da quello. Senza,
     * la palpebra riceve un filo di mappa d'ambiente e resta una macchia nera
     * su una macchia nera — che e' esattamente com'era nel primo provino.
     *
     * Sta DAVANTI al pannello e non dietro, perche' e' il pannello a emettere:
     * la luce va verso chi guarda e torna indietro sulla cornice di striscio.
     * E' quel radente a disegnare la grana — una luce frontale la
     * spianerebbe, ed e' il motivo per cui le grane si fotografano sempre di
     * taglio.
     *
     * Portata corta (mezza unita', cioe' meta' larghezza del quadro) e
     * decadimento quadratico: deve morire prima di arrivare al parabrezza. Una
     * sorgente che illumina anche il resto dell'abitacolo tradirebbe che
     * l'abitacolo e' una fotografia, perche' la fotografia non le
     * risponderebbe.
     */
    this.spia = new PointLight(0x9fd8ff, 0, 0.5, 2)
    this.spia.position.set(0, 0.05, SPORGENZA * 1.6)
    this.spia.name = 'PALPEBRA_SPIA'

    this.gruppo.add(this.cornice, this.filo, this.visiera, this.spia)
    this.gruppo.name = 'PALPEBRA'
    this.gruppo.visible = false
    // niente ombre proiettate: l'unica che conterebbe e' quella della visiera
    // sul quadro, e il quadro non e' illuminato — e' una sorgente. L'ombra la
    // fa il disegno del quadro, che verso l'alto e' piu' scuro.
    this.gruppo.traverse((o) => { o.castShadow = false; o.receiveShadow = false })
  }

  /**
   * Si aggancia allo STESSO riquadro dello strumento, e ne eredita misura e
   * posa. Le due cose non possono separarsi perche' leggono lo stesso numero.
   */
  posiziona(
    riquadro: { centro: Vector3; larghezza: number; altezza: number },
    versoCamera: Vector3,
  ) {
    this.gruppo.position.copy(riquadro.centro)

    // LA GRANA RESTA QUADRATA anche se il pezzo non lo e'.
    //
    // Il riquadro e' molto largo e poco alto — quattro a uno — e la geometria
    // viene scalata di conseguenza. Con la stessa ripetizione sui due assi le
    // celle della pelle uscirebbero stirate nella stessa proporzione, e una
    // grana stirata e' il segnale piu' rapido con cui l'occhio riconosce una
    // texture applicata male.
    //
    // La ripetizione in orizzontale viene da una misura: la mappa contiene
    // trentatre celle e una cella di pelle da plancia e' circa un millimetro,
    // quindi la mappa copre tre centimetri e mezzo di superficie apparente. In
    // verticale si ricava dalla prima moltiplicando per il rapporto delle due
    // scale, che e' l'unico modo perche' resti quadrata a qualunque formato di
    // schermo.
    const rx = riquadro.larghezza / 0.036
    const ry = rx * (riquadro.altezza / riquadro.larghezza)
    for (const t of [this.morbida.normalMap, this.morbida.roughnessMap] as Texture[]) {
      if (t) t.repeat.set(rx, ry)
    }
    // la profondita' si scala come l'altezza e non come la larghezza: il
    // riquadro e' molto largo e poco alto, e scalando la z sulla larghezza la
    // palpebra sporgerebbe di mezzo metro
    this.gruppo.scale.set(riquadro.larghezza, riquadro.altezza, riquadro.altezza)
    this.gruppo.lookAt(versoCamera)
  }

  /** l'accensione la governa chi governa il quadro: sono lo stesso oggetto */
  accendi(quanto: number) {
    const q = Math.min(Math.max(quanto, 0), 1)
    this.gruppo.visible = q > 0.001
    // L'INTENSITA' SI MUOVE, IL NUMERO DI LUCI NO. Il conteggio delle sorgenti
    // e' una costante di compilazione degli shader di three: aggiungerne o
    // toglierne una a scena avviata ricompila tutto e fa saltare qualche
    // decimo di secondo. Si accende e si spegne con l'intensita', sempre.
    this.spia.intensity = 0.85 * q
  }
}
