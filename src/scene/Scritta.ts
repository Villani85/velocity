import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three'

/**
 * LA SCRITTA CHE ARRIVA — un piano coricato che viene addosso.
 *
 * PERCHE' NON SUL PAVIMENTO.
 *
 * Il primo tentativo dipingeva le frasi sull'asfalto, come segnaletica: stessa
 * vernice, stessa prospettiva, il fascio del faro che ci passava sopra. Era
 * corretto e ILLEGGIBILE. Una scritta a terra, vista da un'automobile bassa, si
 * schiaccia contro l'orizzonte — le lettere sono alte tre pixel finche' sono
 * lontane e sono gia' sotto le ruote quando finalmente si aprono. La
 * segnaletica vera funziona perche' dice una parola sola e perche' chi guida la
 * conosce a memoria.
 *
 * PERCHE' CORICATA E NON IN PIEDI.
 *
 * Un cartello perpendicolare alla strada e' leggibile ma non arriva: cresce e
 * basta, come un manifesto a cui ci si avvicina. L'inclinazione e' cio' che
 * aggiunge la FUGA — le righe lontane piu' piccole, quelle vicine piu' grandi —
 * ed e' quella fuga a far sentire il movimento. E' il motivo per cui il titolo
 * di Guerre stellari e' inclinato e non piatto: non serve a essere piu' bello,
 * serve a dare una profondita' che un piano frontale non ha.
 *
 * CINQUANTADUE GRADI. Sotto i quaranta il testo torna verso il pavimento e si
 * schiaccia; sopra i settanta diventa un cartello e la fuga sparisce. A
 * cinquantadue la riga piu' lontana e' circa la meta' della piu' vicina: c'e'
 * prospettiva, e si legge tutto.
 *
 * ATTACCATA ALLA CAMERA, come l'iride e per la stessa ragione. La strada non e'
 * geometria — e' uno shader che la calcola dal verso dello sguardo — quindi non
 * c'e' nessun mondo in cui piazzarla. Appesa all'obiettivo, invece, sta dove
 * deve stare per costruzione, e a farla arrivare basta cambiarle la distanza.
 */

/** quanto e' inclinato il piano: vedi in testa */
const INCLINAZIONE = (52 * Math.PI) / 180

export class Scritta {
  readonly mesh: Mesh
  private tessitura: CanvasTexture | null = null
  private fraseCorrente = ''
  private tela = document.createElement('canvas')

  constructor() {
    this.mesh = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        // NON TONE-MAPPATA e non illuminata: e' un testo, non una superficie
        // del mondo. Passandola per la curva di esposizione si spegnerebbe
        // insieme alla notte, e un titolo che si spegne col buio non e' un
        // titolo.
        toneMapped: false,
        // sopra tutto: dietro c'e' la strada, che e' disegnata a schermo pieno
        depthTest: false,
      }),
    )
    this.mesh.rotation.x = -INCLINAZIONE
    this.mesh.renderOrder = 800
    this.mesh.visible = false
    this.mesh.name = 'SCRITTA'
  }

  /** si appende all'obiettivo la prima volta: vedi in testa */
  aggancia(camera: PerspectiveCamera) {
    if (this.mesh.parent !== camera) camera.add(this.mesh)
    this.obiettivo = camera
  }

  private obiettivo: PerspectiveCamera | null = null

  /**
   * @param frase cosa arriva. Due o tre parole: piu' lunga, la riga lontana e'
   *   gia' illeggibile prima di essere cresciuta.
   * @param avvicinamento da 0 (lontana) a 1 (addosso)
   * @param forza da 0 a 1
   */
  aggiorna(frase: string, avvicinamento: number, forza: number) {
    const f = Math.min(Math.max(forza, 0), 1)
    this.mesh.visible = f > 0.002 && frase.length > 0
    if (!this.mesh.visible) return

    if (frase !== this.fraseCorrente) {
      this.fraseCorrente = frase
      this.disegna(frase)
    }

    // DA CINQUANTACINQUE METRI A DUE E OTTO, E LA MISURA RESTA FISSA.
    //
    // E' la correzione che fa la differenza fra «un testo che compare» e «un
    // testo che arriva». Prima la scala cresceva con la distanza — larga
    // `d * 0,5` — e il risultato e' che la scritta restava sempre della stessa
    // misura apparente: si avvicinava senza ingrandire, che e' esattamente cio'
    // che NON fa nessuna cosa vera.
    //
    // Adesso e' larga sette metri e basta. Da novanta metri sottende quattro
    // gradi ed e' un segno piccolo in fondo alla strada; a tre metri e mezzo
    // riempie il fotogramma. Non c'e' nessuna regola di crescita scritta da
    // nessuna parte: cresce perche' si avvicina, come i pali e come il
    // tratteggio.
    //
    // La corsa e' LINEARE nella distanza, non nel tempo apparente. Sono la
    // stessa cosa solo per un oggetto lontanissimo: da vicino la prospettiva ci
    // mette del suo, e una scritta che percorra gli ultimi metri «a velocita'
    // costante sullo schermo» sarebbe una scritta che in realta' frena.
    const q = Math.min(Math.max(avvicinamento, 0), 1)
    // DOVE FINISCE LA CORSA LO DECIDE IL CAMPO VISIVO, non un numero.
    //
    // La misura della scritta e' fissa in metri — nove — ed e' giusto: e' cosi'
    // che cresce avvicinandosi. Ma allora la distanza a cui si ferma non puo'
    // essere fissa a sua volta, perche' quanto riempie il fotogramma dipende da
    // quanto e' largo il fotogramma. Con la distanza finale scritta a mano,
    // sulla finestra bassa e larga del committente la frase sfondava da tutte
    // le parti; su una alta e stretta sarebbe rimasta piccola.
    //
    // La larghezza visibile a distanza d vale 2 * d * tan(mezzo campo) * aspetto.
    // Volendo che la scritta ne occupi l'ottantacinque per cento, la distanza
    // finale si ricava girando la formula. Cosi' la frase arriva alla stessa
    // misura APPARENTE su qualunque schermo, che e' l'unica cosa che conta.
    const LARGO = 9
    const cam = this.obiettivo
    const meta = cam ? Math.tan((cam.fov * Math.PI) / 360) : 0.41
    const asp = cam ? cam.aspect : 1.6
    const fine = LARGO / (0.85 * 2 * meta * asp)
    const d = 55 - (55 - fine) * q

    // L'ALTEZZA RESTA PROPORZIONALE ALLA DISTANZA anche se la misura non lo e'.
    //
    // Sembra incoerente e non lo e': la posizione proporzionale tiene la
    // scritta alla stessa ALTEZZA SULLO SCHERMO mentre arriva — appena sopra il
    // punto di fuga — mentre la misura fissa la fa crescere. Sono due cose
    // diverse: dove si trova e quanto e' grande. Con l'altezza fissa in metri
    // scenderebbe verso il basso avvicinandosi, e uscirebbe dal fotogramma
    // prima di arrivare.
    this.mesh.position.set(0, d * 0.012, -d)
    this.mesh.scale.set(LARGO, LARGO * (this.tela.height / this.tela.width), 1)

    const m = this.mesh.material as MeshBasicMaterial
    m.opacity = f
  }

  /**
   * IL DISEGNO SI FA UNA VOLTA PER FRASE, non a ogni fotogramma.
   *
   * E' la lezione gia' pagata sul quadro strumenti: caricare una tela sulla
   * scheda video costa cinquanta millisecondi, disegnarla ne costa zero virgola
   * due. Qui la frase non cambia mai dentro un tempo, quindi il caricamento
   * avviene una volta sola e poi non si paga piu' niente.
   */
  private disegna(frase: string) {
    const L = 2048
    const parole = frase.split(' ')
    // si va a capo ogni due parole: tre righe corte si leggono in prospettiva,
    // una riga lunga no — le lettere ai bordi finiscono troppo lontane
    const righe: string[] = []
    for (let i = 0; i < parole.length; i += 2) righe.push(parole.slice(i, i + 2).join(' '))
    const corpo = Math.round(L * 0.135)
    const passo = Math.round(corpo * 1.06)
    const A = passo * righe.length + Math.round(corpo * 0.5)

    this.tela.width = L
    this.tela.height = A
    const c = this.tela.getContext('2d')!
    c.clearRect(0, 0, L, A)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = '700 ' + corpo + 'px Inter, system-ui, sans-serif'
    for (let i = 0; i < righe.length; i++) {
      const y = corpo * 0.35 + passo * (i + 0.5)
      // due passate: sotto un alone largo, sopra il segno pieno. Su una scena
      // che cambia luminosita' a ogni metro, e' l'alone a tenere il testo
      // leggibile senza doverci mettere un fondo dietro.
      c.fillStyle = 'rgba(10,16,28,0.55)'
      c.fillText(righe[i], L / 2 + 4, y + 6)
      c.fillStyle = '#f2f0ea'
      c.fillText(righe[i], L / 2, y)
    }

    if (this.tessitura) this.tessitura.dispose()
    this.tessitura = new CanvasTexture(this.tela)
    this.tessitura.colorSpace = SRGBColorSpace
    this.tessitura.minFilter = LinearFilter
    this.tessitura.generateMipmaps = false
    const m = this.mesh.material as MeshBasicMaterial
    m.map = this.tessitura
    m.needsUpdate = true
  }
}
