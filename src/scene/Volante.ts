import {
  CircleGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  SpotLight,
  Object3D,
  Vector3,
} from 'three'
import { caricaNormalizzato } from './Modelli'
import { dopoAuto } from '../core/Ordine'

/**
 * LA VOLANTE — chi arriva alla fine della corsa.
 *
 * L'IDEA E' DEL COMMITTENTE, ed e' migliore di quella che sostituisce.
 *
 * Il finale era una domanda scritta grande in mezzo allo schermo. Lui l'ha
 * guardata e l'ha chiamata «la scritta piu' brutta», e aveva ragione due
 * volte: perche' non parlava la lingua del resto del sito, e perche' alla
 * fine di una corsa non ci vuole una schermata — ci vuole la cosa che
 * succede davvero quando si e' corso troppo.
 *
 * E succede alle spalle.
 *
 * PERCHE' UN MODELLO VERO E NON SOLO LE LUCI.
 *
 * La prima versione erano soltanto i lampi sulla carreggiata: blu e rosso a
 * battute alterne, e il cervello ci mette l'automobile. Funziona, costa niente
 * e non basta — «deve essere fatta bene pero', non solo le luci. Tutto 3D».
 * Ed e' giusto: un sito che passa un minuto a dimostrare che dietro c'e' un
 * mondo calcolato non puo' chiudere con un effetto di luce dipinto. La
 * pattuglia dev'essere una cosa che sta nello spazio, che si avvicina, e che
 * si puo' guardare.
 *
 * Quindi c'e' tutte e due: il modello, e la luce che getta — che sta nello
 * shader della strada, perche' e' li' che si vede (vedi il blocco della
 * pattuglia in `Lastra.ts`). Il modello dice cosa c'e'; la luce dice dov'e'.
 *
 * DA DOVE ARRIVA. Nasce a settanta metri dietro, sulla corsia di sorpasso, e
 * si avvicina fino a otto. Non affianca e non supera: resta dietro. E' quello
 * che fa una pattuglia che ti sta chiedendo di accostare, ed e' anche
 * l'inquadratura in cui il lampeggiante lavora meglio — di fronte
 * abbaglierebbe e basta.
 *
 * LE LUCI NASCONO ALL'AVVIO E VIVONO SULL'INTENSITA'.
 *
 * E' la regola piu' ripetuta di questo progetto e non si discute: il numero
 * di sorgenti e' una costante di compilazione dello shader, e aggiungerne una
 * a meta' percorso ricompila ogni materiale della scena. Le quattro luci di
 * questa classe esistono dal primo fotogramma con intensita' zero.
 */

/** quanto e' lunga una berlina, in metri: serve a normalizzare il generato */
const LUNGHEZZA = 4.86

/** da quanti metri dietro arriva */
const LONTANO = 70

/* DI QUANTO STA DI LATO, ed e' NEGATIVO.
   Nel provino la volante compariva a destra: in questa scena l'asse Z cresce
   verso destra, e la corsia di sorpasso — quella da cui si viene affiancati —
   sta dall'altra parte. Il segno non e' un dettaglio di gusto: una pattuglia
   che sorpassa a destra e' una pattuglia che sta commettendo un'infrazione. */
const SCARTO = -3.15

/** il livello su cui vivono la volante e le sue due luci: vedi il costruttore */
const LIVELLO = 1

/** e quello del riflesso sull'abitacolo, che deve toccare `INTERNO` e nient'altro */
const LIVELLO_INTERNO = 2

export class Volante {
  readonly gruppo = new Group()
  pronta = false

  /** le due del lampeggiante e i due fari: create all'avvio, spente */
  readonly luci: (PointLight | SpotLight | HemisphereLight)[] = []
  private blu: PointLight
  private rosso: PointLight
  private fascio: SpotLight
  private cielo: HemisphereLight
  private riflesso: PointLight
  private ombra: Mesh | null = null
  private lampade: Mesh[] = []
  private barra: Mesh[] = []
  private materialiBarra: MeshStandardMaterial[] = []
  /** quanto e' avanti il congedo: vedi `aggiorna` */
  private congedo = 0

  constructor() {
    this.gruppo.name = 'VOLANTE'
    this.gruppo.visible = false

    // IL LAMPEGGIANTE E' UNA COPPIA DI SORGENTI, non un materiale acceso.
    //
    // Un materiale emissivo si vede solo dove sta; una sorgente illumina
    // l'asfalto intorno, e di un lampeggiante e' proprio quello che si guarda.
    // Servono tutte e due — il materiale perche' la barra sul tetto sia una
    // barra accesa, la sorgente perche' getti — e qui ci sono le sorgenti.
    //
    // Portata 26 metri e decadimento 1,4: piu' corto del quadrato vero,
    // perche' a distanza reale un lampeggiante illumina molto piu' lontano di
    // quanto direbbe la fisica di una lampadina puntiforme — e' una barra
    // larga un metro con dentro una decina di sorgenti e uno specchio dietro.
    this.blu = new PointLight(0x2a5cff, 0, 26, 1.4)
    this.rosso = new PointLight(0xff2418, 0, 26, 1.4)
    this.blu.name = 'VOLANTE_BLU'
    this.rosso.name = 'VOLANTE_ROSSO'

    /* LE DUE SORGENTI VIVONO SU UN LIVELLO LORO, E SENZA QUESTO IL FINALE
     * DIVENTA BLU.
     *
     * Nel primo provino, a ogni battuta del lampeggiante l'intero abitacolo si
     * accendeva di blu e poi di rosso: la plancia, il volante, la cornice del
     * quadro. Sembrava una discoteca, non una pattuglia.
     *
     * La ragione e' che una sorgente puntiforme di three illumina TUTTO quello
     * che sta nel suo raggio, e ventisei metri dietro la camera contengono
     * anche l'abitacolo — che sta a mezzo metro. La luce di un lampeggiante,
     * nella realta', l'abitacolo lo prende dallo specchietto e dai vetri, cioe'
     * pochissimo e in un punto solo; qui lo prendeva pieno.
     *
     * I livelli di three servono esattamente a questo: una sorgente illumina
     * solo gli oggetti che condividono un livello con lei. Le due luci stanno
     * sul livello 1 insieme al modello della volante, e null'altro. Quello che
     * si vede sulla carreggiata non viene da loro: viene dallo shader della
     * strada, dove e' scritto a mano ed e' governabile.
     */
    this.blu.layers.set(LIVELLO)
    this.rosso.layers.set(LIVELLO)

    /* I NOSTRI FARI, E SENZA DI LORO LA VOLANTE E' UNA SAGOMA NERA.
     *
     * Nel provino l'automobile c'era, era della misura giusta — 4,86 metri,
     * il 52% della larghezza dello schermo — ed era invisibile: una macchia
     * appena piu' scura del nero. Ci ho messo un giro a capire perche', e la
     * ragione e' ovvia solo dopo: DENTRO L'ABITACOLO NON CI SONO LUCI. La
     * strada notturna non e' geometria illuminata, e' uno shader che si
     * disegna da solo la propria illuminazione — i fari, i lampioni, la
     * foschia sono tutti scritti li' dentro. Non c'e' nessuna sorgente vera in
     * quella scena, quindi non c'e' niente che possa illuminare un oggetto
     * vero messo in mezzo.
     *
     * Il fascio qui sotto e' il faro della NOSTRA automobile, ed e' la
     * sorgente che nella realta' illuminerebbe una vettura undici metri
     * davanti. Sta sul livello della volante, quindi non tocca niente
     * altro — e non deve: l'illuminazione della strada continua a farla lo
     * shader, che e' scritto e governabile.
     *
     * Il cielo e' l'altra meta': un fascio da solo lascia i fianchi in nero
     * pieno, e a quel punto la vettura sembra ritagliata. Un emisferico
     * debolissimo, blu sopra e asfalto sotto, le restituisce il volume senza
     * schiarire niente.
     */
    this.fascio = new SpotLight(0xfff2dc, 0, 34, 0.42, 0.55, 1.1)
    this.fascio.name = 'VOLANTE_FASCIO'
    this.fascio.layers.set(LIVELLO)
    this.fascio.target.layers.set(LIVELLO)
    this.cielo = new HemisphereLight(0x24406e, 0x141416, 0)
    this.cielo.name = 'VOLANTE_CIELO'
    this.cielo.layers.set(LIVELLO)

    /* IL RIFLESSO SULL'ABITACOLO — una quarta sorgente, e serve.
     *
     * Le due del lampeggiante vivono su un livello loro apposta per NON
     * tingere di blu la plancia: era il difetto della prima versione, un
     * effetto discoteca a ogni battuta. Ma spegnere del tutto quel riflesso e'
     * l'errore opposto, e il committente l'ha visto subito: se una volante ti
     * arriva a otto metri di notte, il cruscotto QUALCOSA lo prende. Senza,
     * la pattuglia sembra incollata sopra la scena invece che dentro.
     *
     * La differenza fra le due cose e' la dose. Questa sorgente vive su un
     * livello suo — il due — insieme al gruppo `INTERNO`, ha un raggio di sei
     * metri e un'intensita' di un ordine di grandezza sotto le altre: fa
     * pulsare il bordo della plancia e il montante, e non tocca nient'altro.
     * Batte sullo stesso `uLampo`, quindi e' lo stesso lampeggiante. */
    this.riflesso = new PointLight(0xffffff, 0, 6.5, 1.6)
    this.riflesso.name = 'VOLANTE_RIFLESSO'
    this.riflesso.layers.set(LIVELLO_INTERNO)

    this.luci.push(this.blu, this.rosso, this.fascio, this.cielo, this.riflesso)
  }

  async costruisci() {
    /* LA PATTUGLIA ASPETTA L'AUTOMOBILE, e sono 936 kilobyte.
       Questa volante compare nell'ultimo settimo del racconto, cioe' decine
       di secondi di scorrimento dopo. Partiva subito solo perche' viene
       costruita nel costruttore di «Esperienza» insieme a tutto il resto, e
       su una rete da telefono quei 936 kB li toglieva alla vettura — che e'
       il soggetto, e che senza non c'e' niente da guardare.
       Vedi «core/Ordine.ts»: la porta si apre da sola dopo dodici secondi
       anche se l'automobile non arriva mai. */
    await dopoAuto
    const { perno } = await caricaNormalizzato('/modelli/volante.glb', {
      lunghezza: LUNGHEZZA,
      /* NESSUNA ROTAZIONE, E LA PRIMA VERSIONE NE AVEVA UNA DI TROPPO.
       *
       * Avevo scritto `rotY: Math.PI / 2` deducendo che il generatore
       * consegnasse il muso verso -Z. Non e' cosi': lo consegna lungo X, e
       * quella rotazione lo metteva di traverso. Il risultato e' che per tutto
       * il finale la volante viaggiava DI FIANCO — sorpassava scivolando
       * lateralmente, e il committente l'ha detto due volte prima che me ne
       * accorgessi: «non puo' passarmi in orizzontale».
       *
       * La prova sta nell'ingombro misurato a runtime: 2,22 per 1,77 per 4,86.
       * L'asse lungo era Z, e la strada corre lungo X. Bastava guardare quel
       * numero invece di dedurre come fosse orientato il modello — ed e' la
       * stessa lezione di tutto questo progetto, arrivata anche qui.
       */
      rotY: 0,
      aTerra: true,
    })
    perno.name = 'VOLANTE_CORPO'
    this.gruppo.add(perno)
    // il modello sta su TUTTI E DUE i livelli: sullo zero perche' la camera lo
    // renda, sull'uno perche' le sue luci lo illuminino. `enable` e non `set`,
    // che sostituirebbe.
    perno.traverse((o: Object3D) => o.layers.enable(LIVELLO))

    /**
     * LA BARRA SUL TETTO SI TROVA MISURANDO, non cercandola per nome.
     *
     * Il modello arriva da un generatore: i nomi delle sue parti sono
     * `mesh_0`, `mesh_1`, e cambiano a ogni rigenerazione. Cercare
     * «light bar» sarebbe un codice che funziona finche' non si rifa'
     * l'asset — cioe' il tipo di dipendenza che questo progetto ha gia'
     * pagato con le parti dell'automobile.
     *
     * Si guarda invece dove stanno i triangoli: la barra e' l'unica cosa
     * sopra il novanta per cento dell'altezza. E' una descrizione della
     * FORMA, e la forma sopravvive alla rigenerazione.
     */
    const scatola = new Vector3()
    perno.updateWorldMatrix(true, true)
    perno.traverse((o: Object3D) => {
      const m = o as Mesh
      if (!m.isMesh || !m.geometry) return
      m.geometry.computeBoundingBox()
      const b = m.geometry.boundingBox
      if (!b) return
      b.getSize(scatola)
      // alta poco, larga, e in cima: sono le tre cose che dicono «barra»
      const alta = m.position.y
      if (scatola.y < LUNGHEZZA * 0.06 && scatola.x > LUNGHEZZA * 0.15 && alta > 0) {
        this.barra.push(m)
      }
    })

    // e se la ricerca per forma non trova niente — succede, i generatori
    // fondono spesso tutto in una mesh sola — la barra si costruisce lo
    // stesso: due sorgenti sopra il tetto bastano a raccontarla
    for (const m of this.barra) {
      const mat = (m.material as MeshStandardMaterial).clone()
      mat.toneMapped = false
      mat.emissiveIntensity = 0
      this.materialiBarra.push(mat)
      m.material = mat
    }

    // le due sorgenti stanno sul tetto, una a sinistra e una a destra
    this.blu.position.set(-0.45, 1.62, -0.35)
    this.rosso.position.set(0.45, 1.62, 0.35)
    this.gruppo.add(this.blu, this.rosso)

    /**
     * L'OMBRA A TERRA, E SENZA DI LEI L'AUTOMOBILE GALLEGGIA.
     *
     * E' il difetto piu' antico del comporre un oggetto in una scena: la
     * geometria e' giusta, la luce e' giusta, e l'oggetto sembra appeso a un
     * centimetro dal suolo. Manca il punto di contatto — quella macchia scura
     * che sta sotto ogni cosa appoggiata e che nessuno guarda mai, ma che
     * l'occhio cerca sempre.
     *
     * Qui non si puo' avere quella vera: l'asfalto non e' geometria, e' uno
     * shader, e non riceve ombre. Quindi si disegna: un disco scuro, morbido
     * ai bordi, appena sopra il manto. E' un trucco vecchio quanto il mestiere
     * e regge benissimo, perche' l'ombra di notte sotto una vettura non e'
     * un'ombra portata dal sole — e' semplicemente il buio sotto il pianale.
     */
    const ombra = new Mesh(
      new CircleGeometry(0.5, 40),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.62, depthWrite: false }),
    )
    ombra.name = 'VOLANTE_OMBRA'
    ombra.rotation.x = -Math.PI / 2
    ombra.position.y = 0.012
    ombra.scale.set(LUNGHEZZA * 0.52, LUNGHEZZA * 0.30, 1)
    ombra.renderOrder = -1
    ombra.layers.enable(LIVELLO)
    this.gruppo.add(ombra)
    this.ombra = ombra

    /**
     * I FARI E LE LUCI POSTERIORI, e sono quello che si vede davvero.
     *
     * Di una vettura di traverso, di notte, in un fotogramma che dura tre
     * secondi, la carrozzeria non la guarda nessuno: si guardano le luci. Sono
     * loro a dire dov'e' il muso e dov'e' la coda, e quindi in che direzione
     * sta bloccando la strada.
     *
     * Sono dischi piatti e non sorgenti: una lampadina in piu' per lato
     * sarebbe stata la scelta ovvia e sarebbe costata due ricompilazioni di
     * ogni materiale della scena — la regola sul numero di luci vale anche
     * quando fa comodo violarla. Un disco emissivo che supera la soglia del
     * bagliore fiorisce da solo, e l'alone e' esattamente cio' che si vede di
     * un faro acceso a otto metri.
     */
    const lampada = (x: number, z: number, colore: number, forza: number, raggio: number) => {
      const m = new Mesh(
        new CircleGeometry(raggio, 20),
        new MeshBasicMaterial({ color: colore, toneMapped: false, transparent: true, depthWrite: false }),
      )
      m.material.color.multiplyScalar(forza)
      m.position.set(x, 0.62, z)
      // guardano lungo l'asse della vettura: il gruppo poi ruota tutto insieme
      m.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2
      m.renderOrder = 12
      m.layers.enable(LIVELLO)
      this.gruppo.add(m)
      this.lampade.push(m)
      return m
    }
    // i due davanti, bianchi e forti; i due dietro, rossi e molto piu' deboli
    lampada(LUNGHEZZA * 0.47, -0.62, 0xfff4e2, 4.2, 0.115)
    lampada(LUNGHEZZA * 0.47, 0.62, 0xfff4e2, 4.2, 0.115)
    lampada(-LUNGHEZZA * 0.47, -0.66, 0xff2a1c, 2.9, 0.095)
    lampada(-LUNGHEZZA * 0.47, 0.66, 0xff2a1c, 2.9, 0.095)

    this.pronta = true
  }

  /**
   * @param q quanto e' avanti il finale, da 0 a 1
   * @param lampo il battito del lampeggiante: -1 blu, +1 rosso, 0 spento.
   *   Lo calcola `Lastra` e lo si passa qui invece di ricalcolarlo, perche' la
   *   luce sulla carreggiata e quella sulla carrozzeria devono battere
   *   nello stesso istante — a due orologi separati si sfasano, e uno
   *   sfasamento di un fotogramma su un lampeggiante si vede benissimo.
   */
  /** il bersaglio dello spot: three lo legge dal grafo, quindi va aggiunto */
  get bersaglioFascio(): Object3D {
    return this.fascio.target
  }

  /**
   * @param viaLibera vero da quando chi guarda ha chiesto di scrivere. E' la
   *   risoluzione fisica della scena: la volante spegne i lampeggianti,
   *   accelera e sparisce davanti, e la strada torna libera. Senza, si resta
   *   fermi davanti a una pattuglia per sempre — che e' un finale sospeso.
   */
  /**
   * @param inviluppo da 0 a 1: quanto la pattuglia sta ancora lampeggiando.
   *   Lo decide `ui/Controllo.ts`, che e' dove stanno tutti gli altri tempi
   *   del finale, ed e' lo stesso numero che spegne il bordo pulsante
   *   dell'interfaccia. Se il fotogramma smette di pulsare e i due punti luce
   *   no, il finale si sfascia in due tempi diversi.
   */
  aggiorna(q: number, lampo: number, occhi: Vector3, viaLibera = false, inviluppo = 1) {
    if (!this.pronta) return
    const acceso = q > 0.02
    this.gruppo.visible = acceso
    if (!acceso) {
      this.blu.intensity = 0
      this.rosso.intensity = 0
      this.fascio.intensity = 0
      this.cielo.intensity = 0
      this.riflesso.intensity = 0
      return
    }

    /**
     * IL SORPASSO, E PERCHE' NON PUO' RESTARE DIETRO.
     *
     * La prima stesura la teneva alle spalle e la faceva avvicinare fino a
     * otto metri: e' quello che fa una pattuglia vera, ed era invisibile. In
     * questo beat la camera guarda avanti lungo la strada — non c'e' nessuno
     * specchietto, perche' l'abitacolo e' una fotografia — quindi
     * un'automobile dietro non entra mai nel fotogramma. Sarebbe stato un
     * modello da dodicimila triangoli caricato per non farlo vedere a nessuno.
     *
     * Quindi sorpassa. E' anche la manovra giusta: una pattuglia che ti ferma
     * non resta dietro a lampeggiare, ti affianca e poi ti si mette davanti
     * rallentando. Sono tre atti, e ognuno si vede da un posto diverso del
     * fotogramma:
     *
     *   fino a 0,38   sta dietro e non si vede. Si vede la sua LUCE, che
     *                 arriva da dietro e accende la carreggiata di blu e
     *                 rosso — vedi il blocco della pattuglia in `Lastra.ts`
     *   0,38 - 0,68   affianca a sinistra, ed entra nel fotogramma dal bordo.
     *                 E' l'istante in cui si capisce cos'e'
     *   da 0,68       passa avanti, rientra in corsia e rallenta fino a
     *                 quattordici metri, dove riempie mezzo parabrezza
     *
     * LA VELOCITA' RELATIVA NON E' COSTANTE. Arriva forte — e' il quadrato
     * nel primo tratto — affianca quasi alla pari, e davanti rallenta. Un
     * sorpasso a velocita' uniforme si legge come un oggetto che scivola su
     * un binario; questo si legge come qualcuno che sta guidando.
     */
    /* NIENTE VA OLTRE I QUATTORDICI METRI, e non e' una scelta di regia.
     *
     * La strada non e' geometria: e' un piano solo, a quattordici metri dalla
     * camera, con dentro uno shader che ci disegna sopra una carreggiata
     * infinita. Quel piano scrive la profondita' — quindi tutto cio' che gli
     * sta DIETRO sparisce.
     *
     * Nel primo provino la pattuglia finiva il sorpasso a quattordici metri e
     * otto: due decimi oltre il piano, e negli ultimi due fotogrammi non
     * c'era piu'. Non c'era nessun errore nella traiettoria — c'era un muro
     * dipinto a quattordici metri di cui la traiettoria non sapeva niente.
     *
     * Il quarto atto qui sotto si ferma a sette metri e mezzo, con margine
     * abbondante: il piano e' fermo rispetto alla camera, ma la camera vibra,
     * e a ridosso della soglia la volante lampeggerebbe dentro e fuori
     * dall'esistenza.
     */

    /**
     * QUATTRO ATTI, E IL QUARTO E' QUELLO CHE MANCAVA.
     *
     * La versione precedente faceva sorpassare la volante e la lasciava
     * affiancata, parallela, per tutto il resto del beat. Il committente l'ha
     * bocciata con una frase che e' anche la specifica: «mi deve passare e poi
     * girare, non puo' passarmi in orizzontale».
     *
     * Ed e' esatto. Un'automobile che ti affianca e ci resta non ti sta
     * fermando: ti sta accompagnando, o sta andando dove va lei. Il gesto che
     * dice FERMATI e' uno solo, e lo conosce chiunque abbia guidato — passa
     * avanti, rientra, e si mette DI TRAVERSO davanti al muso. Da quel momento
     * non c'e' piu' niente da interpretare.
     *
     *   fino a 0,38   dietro, invisibile. Si vede solo la sua luce sulla
     *                 carreggiata, che arriva da dietro (vedi `Lastra.ts`)
     *   0,38 - 0,60   affianca a sinistra ed entra dal bordo del parabrezza
     *   0,60 - 0,78   passa avanti, ancora sulla sua corsia
     *   da 0,78       TAGLIA: rientra davanti e ruota di cinquanta gradi,
     *                 mostrando la fiancata. E' l'unico atto in cui la
     *                 rotazione fa piu' lavoro della posizione.
     *
     * CINQUANTA GRADI E NON NOVANTA. Di traverso perfetto sembra un incidente
     * — una vettura ferma perpendicolare in mezzo alla carreggiata non e' un
     * alt, e' un tamponamento appena avvenuto. Cinquanta e' l'angolo con cui
     * si chiude davvero la strada a qualcuno: il muso e' gia' oltre la
     * mezzeria e la coda e' ancora nella corsia da cui si e' arrivati.
     *
     * E RALLENTA MENTRE GIRA. La distanza scende da nove metri e mezzo a
     * sette e mezzo nello stesso tratto in cui ruota: non e' lei ad arretrare,
     * siamo noi che la raggiungiamo perche' lei sta frenando. E' il modo in
     * cui una manovra si racconta senza mostrare i freni.
     */
/* GLI ATTI SONO ANTICIPATI, e la ragione e' di racconto, non di ritmo.
       Nella prima stesura la volante tagliava la strada a nove decimi del
       beat: cioe' DOPO che la parola DOCUMENTI era gia' comparsa e la scheda
       dei lavori era gia' aperta. L'ordine era rovesciato — il sito chiedeva i
       documenti prima che qualcuno avesse fermato l'automobile.
       Adesso la manovra si compie entro la meta' del beat, e la parola arriva
       nell'istante in cui la strada e' chiusa. Cause prima, effetti dopo. */
    const AFFIANCA = 0.18
    const AVANTI = 0.32
    const TAGLIA = 0.42

    let lungo: number
    let lato: number
    let giro = 0
    if (q < AFFIANCA) {
      // arriva col quadrato: da lontano sembra ferma e negli ultimi metri
      // arriva addosso, che e' come la si vedrebbe nello specchietto
      const k = q / AFFIANCA
      lungo = -LONTANO + (LONTANO - 13) * (k * k)
      lato = SCARTO
    } else if (q < AVANTI) {
      const k = (q - AFFIANCA) / (AVANTI - AFFIANCA)
      lungo = -13 + 15 * dolce(k)
      lato = SCARTO
    } else if (q < TAGLIA) {
      const k = (q - AVANTI) / (TAGLIA - AVANTI)
      lungo = 2 + 7.5 * dolce(k)
      lato = SCARTO
    } else {
      const k = Math.min((q - TAGLIA) / (1 - TAGLIA), 1)
      const m = dolce(k)
      lungo = 9.5 - 2.0 * m
      // rientra e sconfina: finisce oltre la mezzeria, non in mezzo alla
      // corsia, se no il muso della volante e la nostra traiettoria
      // coinciderebbero e sembrerebbe che ci si stia per finire addosso
      // e il conto e' semplice, ma la prima volta l'ho sbagliato: si parte da
      // `SCARTO` (negativo, la corsia di sinistra) e si arriva a 1,35, cioe'
      // appena oltre la mezzeria. Scritto male finiva a 4,5 e la volante usciva
      // dal fotogramma a destra invece di mettersi davanti.
      lato = SCARTO + (1.35 - SCARTO) * m
      /* IL SEGNO DELLA ROTAZIONE. Ruotando di y positivo, three porta il muso
         da +X verso -Z, cioe' verso sinistra; qui il muso deve andare verso
         DESTRA — la volante arriva da sinistra e chiude verso il centro — e
         quindi l'angolo e' negativo. Il conto e' facile da sbagliare e da
         accorgersene: se il segno e' invertito la vettura gira dalla parte da
         cui e' venuta, e la manovra diventa incomprensibile. */
      giro = -0.87 * m
    }
    /* VIA LIBERA — e da qui in poi il tempo non e' piu' lo scorrimento.
     *
     * E' l'unico momento del sito in cui qualcosa si muove per conto suo, e ha
     * una ragione precisa: e' una RISPOSTA a un gesto, non un'animazione che
     * parte da sola. Chi ha chiesto di scrivere ha fatto la sua parte, e la
     * pattuglia lo lascia andare — se restasse agganciata allo scorrimento
     * bisognerebbe continuare a scorrere per vederla partire, cioe' lavorare
     * per ottenere il proprio congedo.
     *
     * Si raddrizza e accelera in avanti, e i lampeggianti si spengono per
     * primi: e' l'ordine in cui succede davvero.
     */
    /* IL CONGEDO ARRIVA DA SOLO DOPO L'ESITO, e non piu' solo al clic.
     *
     * Prima la volante restava li' mentre il sito passava allo stato finale:
     * compariva, faceva la sua parte e restava sospesa. Il committente l'ha
     * detto bene — «la macchina deve lasciarti andare».
     *
     * Ed e' anche la conseguenza giusta di quello che e' appena successo: dopo
     * TUTTO IN REGOLA non c'e' nessuna ragione perche' una pattuglia resti
     * ferma davanti. Spegne i lampeggianti, riparte, e mentre esce dal
     * fotogramma arriva l'ultima domanda. Ogni stato causa il seguente.
     *
     * Il clic resta, e accelera: chi chiede di scrivere non aspetta il resto
     * della manovra. Le due strade si sommano invece di escludersi. */
    const daSolo = Math.min(Math.max((q - 0.86) / 0.10, 0), 1)
    if (viaLibera) this.congedo = Math.min(this.congedo + 0.016, 1)
    else this.congedo = Math.max(this.congedo * 0.7, daSolo)
    const via = this.congedo * this.congedo
    this.gruppo.position.set(occhi.x + lungo + 46 * via, 0, occhi.z + lato)
    this.gruppo.rotation.y = giro * (1 - Math.min(this.congedo * 2.4, 1))

    /* I LAMPEGGIANTI SI SPENGONO PER PRIMI, in tre decimi di secondo — e da
       oggi anche quando la pattuglia ha semplicemente FINITO, non solo quando
       chi guarda se ne va. Dopo «TUTTO IN REGOLA» il controllo e' concluso: un
       lampeggiante che continua contraddice il verdetto che ha appena dato. */
    const forza = Math.min(q / 0.25, 1) * (1 - Math.min(this.congedo * 3.5, 1)) * inviluppo
    // fari e ombra invece restano finche' la vettura c'e': un'automobile che
    // riparte accende i fari, non li spegne
    const presenza = Math.min(q / 0.18, 1)
    for (const l of this.lampade) (l.material as MeshBasicMaterial).opacity = presenza
    if (this.ombra) (this.ombra.material as MeshBasicMaterial).opacity = 0.62 * presenza
    this.blu.intensity = lampo < 0 ? 52 * forza : 0
    this.rosso.intensity = lampo > 0 ? 52 * forza : 0

    // il fascio parte dal posto di guida e punta la volante: e' il nostro
    // faro, quindi si muove con noi e insegue lei
    this.fascio.position.set(occhi.x, 0.62, occhi.z)
    this.fascio.target.position.copy(this.gruppo.position)
    this.fascio.target.updateMatrixWorld()
    /* 58 E NON 210. Con duecentodieci la carrozzeria andava fuori scala e la
       volante diventava una sagoma bianca senza livrea — cioe' si perdeva
       esattamente la cosa che la fa riconoscere. Il fascio deve STACCARLA dal
       nero, non illuminarla: quello che si guarda di una pattuglia di notte e'
       il lampeggiante, e il resto e' contorno. */
    this.fascio.intensity = 58 * forza
    this.cielo.intensity = 1.15 * forza

    // il riflesso sta appena dietro il posto di guida e batte con lo stesso
    // ritmo: e' la stessa luce, vista da dentro
    this.riflesso.position.set(occhi.x - 1.1, 1.35, occhi.z)
    this.riflesso.color.setRGB(lampo < 0 ? 0.16 : 1, 0.13, lampo < 0 ? 1 : 0.10)
    this.riflesso.intensity = lampo === 0 ? 0 : 3.1 * forza
    for (const m of this.materialiBarra) {
      m.emissive.setRGB(lampo < 0 ? 0.1 : 1, 0.08, lampo < 0 ? 1 : 0.06)
      m.emissiveIntensity = lampo === 0 ? 0.05 : 3.4 * forza
    }
  }

  /** serve agli strumenti, che costruiscono e buttano decine di scene */
  smonta() {
    this.gruppo.traverse((o: Object3D) => {
      const m = o as Mesh
      if (m.isMesh) m.geometry?.dispose()
    })
  }
}

/** un tratto da 0 a 1 con le due estremita' addolcite: la stessa curva che usa
 *  il resto del progetto, e usarne una sola e' cio' che tiene insieme i tempi */
function dolce(k: number) {
  return k * k * (3 - 2 * k)
}
