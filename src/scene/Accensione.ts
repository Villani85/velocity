import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
} from 'three'

import { morbido, type Regia } from '../core/Regia'

/**
 * L'ACCENSIONE.
 *
 * IL BUCO CHE CHIUDE.
 *
 * Il misuratore di continuita' ha trovato che fra q=0,80 e q=0,86 il delta
 * fra un fotogramma e il precedente e' ZERO: per il sei per cento dello
 * scorrimento non succede assolutamente niente. Non e' uno stacco — e'
 * peggio, e' un vuoto. Si scorre e la scena non risponde, e in quel
 * momento chi guarda pensa che il sito si sia rotto.
 *
 * UNA COSA ALLA VOLTA, ED E' TUTTA LA DIFFERENZA.
 *
 * Accendere tutto insieme e' un interruttore. Un'accensione vera e' una
 * sequenza, e ogni pezzo ha il suo momento perche' ogni pezzo ha il suo
 * circuito: prima il quadro fa il suo autotest, poi si stabilizza, poi
 * salgono le luci d'ambiente, e alla fine il motore. Il ritardo fra l'una e
 * l'altra non e' una decorazione: e' l'informazione che dice che li' dentro
 * c'e' un sistema e non una lampadina.
 *
 * TUTTO SOPRA 1, PERCHE' E' UNA SORGENTE.
 *
 * Il quadro non e' una superficie illuminata: e' cio' che illumina. Scrive
 * valori oltre 1 apposta, e il bloom — che ha la soglia a 2,60 — li
 * raccoglie. E' anche il motivo per cui la soglia sta sopra 1: se
 * fiorissero anche le superfici chiare, accendere non si vedrebbe.
 */

export class Accensione {
  readonly gruppo = new Group()
  private quadro: Mesh
  private matQuadro: MeshBasicMaterial
  private luce: PointLight
  private consolle: Mesh
  private matConsolle: MeshBasicMaterial

  constructor(posa: [number, number, number]) {
    this.gruppo.name = 'ACCENSIONE'
    this.gruppo.position.set(...posa)

    // IL QUADRO E' UN BAGLIORE, NON UN PANNELLO.
    //
    // Prima era un piano da 30 x 11 cm posato sopra il cruscotto, e si
    // vedeva per quello che era: un rettangolo bianco appiccicato sopra la
    // plancia, disallineato con lo strumento che la tessitura disegna gia'.
    // Allinearlo al pixel non si puo' — quella tessitura sta dentro un
    // materiale condiviso da tutto il pezzo.
    //
    // Quindi si rinuncia a fingere lo schermo e si tiene solo quello che
    // conta: la LUCE che getta. Un riquadro piccolo fa da sorgente per il
    // bloom, e a raccontare l'accensione sono i riflessi che corrono
    // sull'alcantara e sul carbonio — che e' poi quello che si vede
    // davvero quando si accende un cruscotto al buio.
    this.matQuadro = new MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.quadro = new Mesh(new PlaneGeometry(0.105, 0.045), this.matQuadro)
    this.quadro.position.set(-0.30, 0.23, -0.24)
    this.quadro.rotation.y = -Math.PI / 2
    this.quadro.rotation.z = 0.20
    this.gruppo.add(this.quadro)

    // la consolle centrale: si accende DOPO, ed e' quel ritardo a fare la
    // sequenza. Da sola non si noterebbe; in coda al quadro si', perche'
    // l'occhio ha appena imparato che le cose si accendono.
    this.matConsolle = new MeshBasicMaterial({ transparent: true, opacity: 0 })
    this.consolle = new Mesh(new PlaneGeometry(0.045, 0.062), this.matConsolle)
    this.consolle.position.set(-0.16, 0.06, -0.60)
    this.consolle.rotation.y = -Math.PI / 2
    this.consolle.rotation.z = 0.55
    this.gruppo.add(this.consolle)

    // LA LUCE CHE IL QUADRO GETTA INTORNO.
    // Un display che si accende senza illuminare niente e' un adesivo. Sono
    // i riflessi sull'alcantara e sul carbonio a dire che quella luce e'
    // dentro l'abitacolo insieme a te.
    this.luce = new PointLight(0x5fa8ff, 0, 1.25, 2.2)
    this.luce.position.set(-0.28, 0.26, -0.24)
    this.gruppo.add(this.luce)
  }

  /**
   * @param regia serve il progresso GLOBALE, non quello del beat: la
   *   sequenza attraversa il confine fra 'accensione' e 'velocita', e
   *   legarla al locale la farebbe ripartire da capo a meta' strada.
   */
  aggiorna(regia: Regia) {
    // le quattro tappe, in progresso globale. Si sovrappongono appena: un
    // sistema che si accende non e' una fila di interruttori, e' una cosa
    // che prende corrente e propaga.
    /* QUESTI QUATTRO INTERVALLI SONO STATI RISCALATI, e la traccia va lasciata.
     *
     * Erano 0,775-0,815 / 0,800-0,850 / 0,830-0,880 / 0,860-0,905, tarati
     * guardando l'autotest accendersi quando il beat `accensione` andava da
     * 0,75 a 0,85 e `velocita` da 0,85 a 0,93. Allungando il settimo beat —
     * vedi la nota in `core/Regia.ts` — tutti i confini si sono spostati, e
     * questi quattro numeri sarebbero finiti a cavallo di beat diversi
     * scomponendo la sequenza in un punto lontanissimo da dove l'avrei cercata.
     *
     * Il riscalamento e' stato fatto convertendo ognuno in (beat, posizione
     * dentro il beat) e riconvertendolo con i confini nuovi. La sequenza dura
     * quindi la stessa frazione di prima; a cambiare e' solo dove cade.
     *
     * E' anche il motivo per cui questi quattro sono gli unici numeri assoluti
     * rimasti fuori da `Regia.ts`: qualunque altro si aggiunga, va aggiunto
     * sapendo che un giorno andra' spostato a mano. */
    const autotest = regia.tratto(0.665, 0.697)
    const stabile = regia.tratto(0.685, 0.725)
    const consolle = regia.tratto(0.709, 0.759)
    const motore = regia.tratto(0.736, 0.787)

    // AUTOTEST: il quadro sale oltre il bianco e poi rientra. E' quello che
    // fa una strumentazione vera all'accensione — le lancette vanno a fondo
    // scala e tornano — ed e' l'unico istante in cui il bloom deve
    // esplodere davvero.
    const picco = Math.sin(Math.min(autotest, 1) * Math.PI)
    const base = morbido(stabile)
    // oltre 3: la soglia del bloom sta a 2,6, e sotto quella un display
    // acceso resta un rettangolo colorato invece di essere una sorgente
    const forza = base * 3.1 + picco * 4.4
    this.matQuadro.opacity = Math.min(base * 1.6 + picco, 1)
    this.matQuadro.color.setRGB(forza * 0.32, forza * 0.68, forza * 1.0)

    const fc = morbido(consolle)
    this.matConsolle.opacity = Math.min(fc * 1.4, 1)
    this.matConsolle.color.setRGB(fc * 3.4, fc * 1.05, fc * 0.36)

    // la luce d'ambiente segue il quadro ma piu' piano e senza il picco:
    // un lampo che illumina l'abitacolo sembrerebbe un tuono
    // 0,55 e non 1,5: a piena forza la luce del quadro sbiancava tutto
    // l'abitacolo e il testo sopra diventava illeggibile. Un cruscotto
    // illumina le superfici vicine, non la stanza.
    this.luce.intensity = base * 0.55 + morbido(motore) * 0.35
  }
}
