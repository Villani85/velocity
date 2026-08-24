import { Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import type { Beat, Regia } from '../core/Regia'
import { t } from './Lingua'

/**
 * LA SPINA TECNICA — l'informazione che nasce dal piedistallo.
 *
 * PERCHE' NON PIU' UN RIQUADRO.
 *
 * Prima il dato stava dentro un rettangolo arrotondato con il fondo scuro e la
 * sfocatura. Era pulito, ed era il problema: un pannello appoggiato SOPRA il
 * render. Diceva «ho messo una scheda sopra la macchina», e la macchina restava
 * lo sfondo di un'interfaccia.
 *
 * Qui il rettangolo non c'e'. Restano tre cose sole — la tipografia, una linea
 * da un pixel e un piccolo rombo — e la linea arriva a toccare un punto vero
 * della vettura. Il dato smette di stare sopra l'oggetto e comincia ad
 * appartenergli: non e' piu' una didascalia, e' una targhetta.
 *
 * E' anche la differenza fra i riferimenti che il committente ha portato e
 * quello che qui si puo' fare in piu'. Quelli sono riquadri sopra una
 * FOTOGRAFIA, e non possono fare altro. Qui sotto c'e' un mondo in tre
 * dimensioni: la linea puo' sapere dove sta il faro, e seguirlo.
 *
 * IL ROMBO E NON IL PALLINO.
 *
 * Un cerchietto in punta a una linea e' il segno piu' riconoscibile di un
 * mirino da videogioco, ed e' esattamente il territorio da cui questo sito deve
 * stare lontano — c'e' gia' un abitacolo che rischia di scivolarci. Un rombo di
 * cinque pixel dice la stessa cosa in linguaggio da disegno tecnico.
 *
 * LA LINEA NON E' ORIZZONTALE.
 *
 * Parte seguendo l'inclinazione del bordo del piedistallo, per un tratto breve,
 * e solo dopo piega verso il punto. Una linea orizzontale perfetta e' il
 * richiamo di un'infografica: dice «questo callout l'ho preso da una libreria».
 * Seguire per un pezzo una linea che esiste gia' nella scena la fa sembrare la
 * PROSECUZIONE di quel bordo — e per un istante non si capisce dove finisca il
 * tre dimensioni e cominci l'interfaccia.
 */

type Stato = {
  etichetta: string
  /** il numero grande. `{ms}` diventa il tempo per fotogramma misurato */
  numero: string
  didascalia: string
  /** la riga piu' tenue, sotto. Vuota dove non serve */
  coda: string
}

/**
 * COSA DICE, TEMPO PER TEMPO.
 *
 * «CAR ASSET» e' separato da «WEBGL / THREE.JS» e non piu' su una riga sola.
 * Scritti insieme — «MODELLO · WEBGL · THREE.JS» — sembrava che i 2,9 MB
 * fossero il peso anche di WebGL e di three.js, che non vuol dire niente. Il
 * numero si riferisce a UNA cosa, e quella cosa va detta da sola.
 */
const STATI: Partial<Record<Beat, Stato>> = {
  hero: { etichetta: t('spinaHero'), numero: '2.9 MB', didascalia: t('spinaHeroDida'), coda: 'WEBGL / THREE.JS' },
  /* IL TEMPO PER FOTOGRAMMA SE N'E' ANDATO ANCHE DA QUI.
     Era gia' sparito dal quadro strumenti per la stessa ragione, e qui era
     rimasto: nel beat della superficie campeggiavano «24.5 MS» e «PER
     FOTOGRAMMA», cioe' quaranta al secondo scritti grandi accanto
     all'automobile. E' l'unica grandezza del sito che dipende dalla macchina
     di chi guarda, e metterla in evidenza vuol dire mettere una lente
     d'ingrandimento sulla propria parte debole. Torna pubblica il giorno in
     cui e' un risultato di cui vantarsi.
     Al suo posto il numero dei triangoli: e' una proprieta' della scena, non
     una prestazione, quindi dice la stessa cosa su qualunque macchina. */
  /* E ANCHE I 460 MILA TRIANGOLI SE NE SONO ANDATI.
     Erano il rimpiazzo del tempo per fotogramma, e sono durati un giro. Il
     ragionamento che li ha tolti e' lo stesso che aveva tolto i millisecondi,
     applicato meglio: un dato vero non e' automaticamente un dato da mostrare.
     «2.9 MB» ha una lettura sola e positiva — l'asset e' leggero. «460K
     TRIANGOLI» non ne ha nessuna senza contesto: un direttore tecnico puo'
     leggerci «perche' cosi' tanti?». Non dimostra ottimizzazione, dimostra
     quantita', e la quantita' da sola non e' mai una credenziale.
     Il posto di quel numero e' il caso di studio, dove accanto ci si puo'
     scrivere da dove viene e come e' stato ridotto. Qui resta il beat senza
     cifra, come gli altri due dell'avvicinamento: il testo grande basta. */
  orbita: { etichetta: t('spinaOrbita'), numero: '', didascalia: t('spinaOrbitaDida'), coda: t('spinaOrbitaCoda') },
  lato: { etichetta: t('spinaLato'), numero: '', didascalia: 'LEFT OPTIC', coda: t('spinaLatoCoda') },
  taglio: { etichetta: t('spinaTaglio'), numero: '', didascalia: 'ENTERING', coda: '' },
}

/**
 * IL PESO DELL'AUTOMOBILE, misurato sul file — 667 kB, ed erano 2,9 MB.
 *
 * 667 E NON PIU' 741, e la correzione vale la riga che la spiega: la
 * carrozzeria e' stata levigata (vedi «strumenti/liscia.mjs») e il file
 * ricompresso e' sceso da 686.196 a 682.660 byte. Sono quattro kilobyte, cioe'
 * niente — ma questa cella e' una CREDENZIALE, e una credenziale la puo'
 * controllare chiunque scarichi il file. Un numero gonfiato che il visitatore
 * verifica non mette in dubbio quel numero: mette in dubbio tutto il pannello.
 * Il 741 di prima era gia' sbagliato per un motivo diverso: era il peso del
 * file precedente, `auto2_parti.glb`, rimasto scritto quando il modello e'
 * cambiato nome. Il numero non protesta mai.
 *
 * Il numero e' sceso di quattro volte cambiando vettura, e va detto perche' non
 * e' merito di un'ottimizzazione: e' merito del DISEGNO. La vettura di prima
 * era una hypercar a ruote scoperte, ventisette pezzi, settecentomila
 * triangoli — e la meta' di quei triangoli stavano nei quattro cerchi, che
 * sono la forma piu' cara che esista: superfici di rivoluzione con dentro
 * altre superfici di rivoluzione, tutte in vista.
 * Questa ha le ruote CARENATE. Non e' un modello piu' ottimizzato: e' un
 * oggetto che non ha quel problema, e centoventimila triangoli gli bastano.
 *
 * E' anche una credenziale migliore, perche' e' piu' difficile da credere e
 * piu' facile da verificare: si apre la scheda di rete del browser e c'e'.
 */
const PESO_AUTO = '667 kB'

export class Spina {
  private radice: HTMLElement
  private etichetta: HTMLElement
  private numero: HTMLElement
  private didascalia: HTMLElement
  private coda: HTMLElement
  private tratto: SVGPathElement
  private rombo: SVGPolygonElement
  private disegno: SVGSVGElement
  private beatCorrente: Beat | null = null

  /** la punta della linea, smorzata: vedi `aggiorna` */
  private x = 0
  private y = 0
  private avviata = false
  private punto = new Vector3()

  constructor(dentro: HTMLElement = document.body) {
    this.radice = document.createElement('aside')
    this.radice.className = 'spina'
    this.radice.innerHTML =
      '<p class="spina__etichetta"></p>' +
      '<p class="spina__numero"></p>' +
      '<p class="spina__didascalia"></p>' +
      '<p class="spina__coda"></p>'
    dentro.appendChild(this.radice)
    this.etichetta = this.radice.querySelector('.spina__etichetta')!
    this.numero = this.radice.querySelector('.spina__numero')!
    this.didascalia = this.radice.querySelector('.spina__didascalia')!
    this.coda = this.radice.querySelector('.spina__coda')!

    // IL DISEGNO E' UN SVG A PIENO SCHERMO, non un bordo o uno pseudo-elemento.
    //
    // La linea deve andare da un blocco di testo fermo a un punto che si muove
    // con la scena: e' una spezzata fra due coordinate che cambiano, e non c'e'
    // nessun modo onesto di ottenerla con dei bordi. Un SVG grande quanto la
    // finestra la disegna e basta, senza contenitori intermedi che poi
    // diventerebbero riquadri.
    const NS = 'http://www.w3.org/2000/svg'
    this.disegno = document.createElementNS(NS, 'svg')
    this.disegno.setAttribute('class', 'spina__disegno')
    this.tratto = document.createElementNS(NS, 'path')
    this.tratto.setAttribute('class', 'spina__tratto')
    this.rombo = document.createElementNS(NS, 'polygon')
    this.rombo.setAttribute('class', 'spina__rombo')
    this.disegno.append(this.tratto, this.rombo)
    dentro.appendChild(this.disegno)
  }

  /**
   * @param ancora il punto del mondo a cui la linea arriva: la bocca del faro.
   *   Senza, la spina non si mostra — meglio niente che una linea che indica
   *   un oggetto che non c'e' ancora.
   * @param msFotogramma il tempo per fotogramma MISURATO
   */
  aggiorna(regia: Regia, camera: PerspectiveCamera, ancora: Vector3 | null, msFotogramma: number) {
    const stato = STATI[regia.beat]
    if (!stato || !ancora) {
      this.radice.classList.remove('e-viva')
      this.disegno.classList.remove('e-viva')
      this.beatCorrente = null
      return
    }

    if (regia.beat !== this.beatCorrente) {
      this.beatCorrente = regia.beat
      this.etichetta.textContent = stato.etichetta
      this.didascalia.textContent = stato.didascalia
      this.coda.textContent = stato.coda
      this.coda.hidden = !stato.coda
      // il numero grande SPARISCE avvicinandosi al faro, non cambia valore.
      // Da li' in poi l'informazione non e' piu' una quantita': e' una
      // direzione, e una direzione non ha una cifra.
      this.numero.hidden = !stato.numero
    }
    if (stato.numero) {
      this.numero.textContent = stato.numero === '{ms}'
        ? (msFotogramma > 0 ? msFotogramma.toFixed(1) + ' MS' : '—')
        : stato.numero.replace('2.9 MB', PESO_AUTO)
    }

    // ---- dove cade sullo schermo il punto del mondo
    this.punto.copy(ancora).project(camera)
    const inCampo = this.punto.z < 1 && Math.abs(this.punto.x) < 1.5 && Math.abs(this.punto.y) < 1.5
    const bx = (this.punto.x * 0.5 + 0.5) * innerWidth
    const by = (-this.punto.y * 0.5 + 0.5) * innerHeight
    if (!this.avviata) { this.x = bx; this.y = by; this.avviata = true }
    // UN'INERZIA PICCOLA, E SERVE. Seguire la proiezione fotogramma per
    // fotogramma fa tremare la punta insieme al modello: la proiezione di un
    // punto vicino, sotto una camera che si muove, cambia in fretta. Con un
    // decimo di ritardo la linea INSEGUE il faro invece di essere incollata a
    // lui, ed e' quel ritardo a farla leggere come una cosa che risponde.
    this.x += (bx - this.x) * 0.10
    this.y += (by - this.y) * 0.10

    // ---- il blocco di testo: fermo, in basso a sinistra
    // LA SPINA COMINCIA DOVE FINISCE LA ROTAIA.
    //
    // Stavano tutte e due nello stesso angolo: la rotaia con la sua etichetta
    // ruotata di novanta gradi — «06 / 06 ESTERNO» — e la spina con «REAL-TIME
    // / 01» e il numero grande. Nel provino le lettere si attraversavano.
    //
    // Il margine della rotaia e' `clamp(20px, 3.4vw, 56px)` in `stile.css`, e
    // la sua etichetta ne occupa altri quattordici verso destra piu' il corpo
    // del testo. Quarantasei pixel oltre il suo margine e' il primo posto
    // libero, e si ricava dallo stesso conto invece che a occhio: se un giorno
    // la rotaia si sposta, questo la segue.
    const rotaia = Math.max(20, Math.min(56, innerWidth * 0.034))
    const sx = rotaia + 46
    const sy = innerHeight - 210
    this.radice.style.transform = `translate3d(${sx}px, ${sy}px, 0)`

    // ---- la spezzata
    this.disegno.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`)
    const px = sx + 214, py = sy + 96
    // IL PRIMO TRATTO SEGUE IL PIEDISTALLO. Nove gradi sotto l'orizzontale: e'
    // l'inclinazione con cui il bordo dell'ellisse sale verso destra in questa
    // inquadratura. Non e' un numero universale — se cambia la posa della
    // camera nella hero, va rimisurato sul fotogramma.
    const primo = Math.min(120, Math.max(80, (this.x - px) * 0.35))
    const gx = px + primo, gy = py - primo * 0.16
    this.tratto.setAttribute('d', `M ${px} ${py} L ${gx} ${gy} L ${this.x.toFixed(1)} ${this.y.toFixed(1)}`)
    const r = 5
    this.rombo.setAttribute(
      'points',
      `${this.x},${this.y - r} ${this.x + r},${this.y} ${this.x},${this.y + r} ${this.x - r},${this.y}`,
    )

    this.radice.classList.toggle('e-viva', inCampo)
    this.disegno.classList.toggle('e-viva', inCampo)
  }
}
