import {
  ACESFilmicToneMapping,
  Object3D,
  PCFSoftShadowMap,
  Vector2,
  Vector3,
  AmbientLight,
  DirectionalLight,
  PointLight,
  Color,
  Fog,
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  RectAreaLight,
  WebGLRenderTarget,
  HalfFloatType,
} from 'three'

import { costruisciCielo } from '../scene/Cielo'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'

import { Regia, morbido, CONFINI } from './Regia'
import { Scorrimento } from './Scorrimento'
import { AUTO, costruisciAmbiente, costruisciEsterno, normaliMarmo } from '../scene/Esterno'
import { fanale } from '../scene/Fanale'
import { montaPanorama, raccoglitoreOmbra } from '../scene/Panorama'
import { ALTEZZA_PIATTAFORMA, applicaSpecchio, costruisciPiattaforma } from '../scene/Piattaforma'
import { Matrix4 } from 'three'

import { ombraDiContatto } from '../scene/Appoggio'
import { trovaArchi } from '../scene/Ruote'
import { sottoscocca, piantaSottoscocca } from '../scene/Sottoscocca'
import { Ruote } from '../scene/Ruote'
import { vestiAuto, LIVELLO_SOGGETTO } from '../scene/Materiali'
import { caricaFaro, innestaFaro, type Faro } from '../scene/Faro'
import { Accensione } from '../scene/Accensione'
import { caricaNormalizzato } from '../scene/Modelli'

import { costruisciInterno } from '../scene/Interno'
import { Volante } from '../scene/Volante'
import { Vetrina3D } from '../scene/Vetrina3D'
import { Lastra } from '../scene/Lastra'
import { Abitacolo } from '../scene/Abitacolo'
import { Quadro } from '../ui/Quadro'
import { Palpebra } from '../scene/Palpebra'
import { Scritta } from '../scene/Scritta'
import { RIDOTTO } from './Moto'
import { Qualita, applicaLuciCorte, type Impostazioni } from './Qualita'
import { costruisciLuci } from '../scene/Luci'
import { Riflesso } from '../scene/Riflesso'
import { passaggioGrado } from '../post/Grado'
import { Insegne } from '../scene/Insegne'
import { guarnisci } from '../scene/Guarnizione'
import { antialiasSpeculare } from '../scene/Nitidezza'
import { impostaAnisotropiaMassima } from './Anisotropia'
import { riscalda, scaldaOra } from './Riscalda'
import { smaltisci } from './Salita'
import { scriviNumero } from './Custom'
import { RIQUADRO_TESTO } from '../ui/Voci'
import {
  collegaAttraversamento,
  dentroCorridoio,
  inquadra,
  MIRA_AVANTI,
  POSE,
  progressoIride,
  rotazioneScena,
  SCAMBIO_A,
} from '../transizioni/Camera'
import { Attraversamento, SCALA } from '../transizioni/Attraversamento'
import { apriLaCoda } from './Ordine'

/**
 * IL MOTORE.
 *
 * Una scena sola, due gruppi che si alternano. Non due scene Three, non due
 * renderer: un solo albero in cui l'esterno e l'interno si accendono e si
 * spengono. Cosi' lo scambio e' un booleano e non un cambio di contesto —
 * e un booleano non puo' produrre un fotogramma vuoto in mezzo, che e'
 * esattamente il rischio quando si sostituisce una scena intera.
 */
/**
 * IL POSTO DI GUIDA, in coordinate dell'abitacolo.
 *
 * MISURATO, non scelto: 82 cm avanti, 66 di altezza, 62 a sinistra dell'asse.
 * Lo scarto laterale si e' trovato spostando la plancia e guardando dove
 * cadeva il volante — a z=0 il guidatore si ritrovava davanti al vano
 * portaoggetti.
 */
const POSTO_GUIDA: [number, number, number] = [0.82, 0.66, 0.62]

/** quanto si comprime il fondo sotto il testo, a piena presenza */
const FORZA_VELO_TESTO = 0.62

export class Esperienza {
  readonly renderer: WebGLRenderer
  readonly scena = new Scene()
  readonly camera: PerspectiveCamera
  readonly regia = new Regia()
  readonly scorrimento = new Scorrimento()
  /**
   * QUANTO PUO' COSTARE UN FOTOGRAMMA su questa macchina.
   *
   * Non e' un interruttore «bello / brutto»: e' un contratto. Il sito deve
   * girare a sessanta fotogrammi al secondo, e cio' che si spegne per
   * ottenerli non deve MAI cambiare la storia — stesse pose, stessi tempi,
   * stesse parole. Cambia quanto costa disegnarli.
   */
  readonly qualita: Qualita

  /**
   * SE CHI GUARDA HA CHIESTO MENO MOVIMENTO.
   *
   * Non e' uno stato del motore: e' una FINESTRA su `core/Moto.ts`, che e'
   * l'unico posto che interroga il sistema. Sta qui perche' una preferenza
   * onorata dentro l'esperienza dev'essere anche VERIFICABILE dall'esterno —
   * `strumenti/fermo.mjs` la legge da `window.esperienza.ridotto` prima di
   * cominciare a misurare, e senza questa riga uno strumento che non trova
   * movimento non saprebbe distinguere «la preferenza e' arrivata e ha
   * funzionato» da «la preferenza non e' mai arrivata».
   */
  get ridotto(): boolean { return RIDOTTO }

  private luciCorte: PointLight[] = []
  private forzeCorte: number[] = []
  private ombraLuce: DirectionalLight | null = null

  readonly esterno: Group
  private piattaforma!: Group
  private specchioPiattaforma: (acceso: boolean) => void = () => {}
  readonly ambiente: Group
  readonly interno: Group
  readonly accensione: Accensione
  readonly lastra: Lastra
  /**
   * L'ABITACOLO E' UNA FOTOGRAFIA, ed e' la decisione piu' contro-intuitiva
   * del progetto.
   *
   * Li' la camera e' FERMA — resta su `POSE.occhi` per tutto l'ultimo quarto
   * del percorso — e davanti a una camera ferma un'immagine e una geometria
   * danno gli stessi pixel. Il modello generato della plancia era un ammasso
   * di schegge da tre megabyte; questa fotografia e' fotorealistica e pesa
   * trecentotrenta kilobyte.
   *
   * Non e' un ripiego: e' la stessa regola che decide tutto il resto del
   * progetto. Si costruisce cio' che la camera attraversa, si fotografa cio'
   * davanti a cui la camera si ferma.
   */
  readonly abitacolo: Abitacolo
  /**
   * IL QUADRO E' L'UNICA COSA VIVA dentro la fotografia dell'abitacolo.
   *
   * Tutto il resto li' dentro e' fermo perche' puo' esserlo: la camera non si
   * muove. Il quadro no — deve fare l'autotest, spegnere le spie a scaglioni,
   * tenere un minimo irregolare e poi salire di giri IN FUNZIONE DI QUANTO
   * FORTE SI SCORRE. E' la decisione D5 nel punto in cui si vede.
   */
  /**
   * DOVE CADE L'ORIZZONTE DELLA STRADA, in frazione dell'altezza dello schermo,
   * scritto sulla radice come `--orizzonte`.
   *
   * PERCHE' SI MISURA INVECE DI SAPERLO.
   *
   * La riga del finale deve cadere esattamente sull'orizzonte della strada, e
   * l'orizzonte della strada sta a meta' schermo solo se DUE cose sono vere
   * insieme: che la camera sia in bolla, e che la carreggiata sia piana.
   * Tutte e due lo diventano durante il finale — la prima in
   * `transizioni/Camera.ts`, la seconda in `scene/Lastra.ts` — ma lo diventano
   * PROGRESSIVAMENTE, e per meta' della corsa non lo sono.
   *
   * Scrivere 50% nel foglio di stile avrebbe funzionato solo nell'ultimo
   * fotogramma. Per tutti gli altri le due righe sarebbero state separate, e
   * lo scambio — che e' l'unica cosa che questo finale deve nascondere —
   * sarebbe stato la cosa piu' visibile dello schermo. E' esattamente il
   * difetto che il provino ha mostrato: la riga di WebGL al 22% e quella del
   * documento al 50%.
   *
   * Qui si proietta il punto di fuga vero — un punto a sei chilometri lungo
   * l'asse della strada, inclinato della pendenza corrente — e si consegna la
   * sua altezza al foglio di stile. Da quel momento le due righe non possono
   * separarsi: e' la stessa geometria a dettarle tutte e due.
   *
   * COSTA UNA SCRITTURA DI PROPRIETA' CUSTOM A FOTOGRAMMA, e solo nel beat
   * del finale: fuori di li' non si chiama nemmeno. Cambiare una custom
   * property invalida lo stile degli elementi che la usano, e sono due.
   */
  /* `spegniInterno` E' STATA TOLTA insieme alla dissolvenza a nero.
     Rendeva trasparente tutto il gruppo `INTERNO` — plancia e volante — e
     serviva solo finche' il finale doveva arrivare al nero pieno. Adesso che
     si ferma al trenta per cento, la plancia deve restare quello che e': il
     posto da cui si sta guidando. */

  /**
   * DOVE CADE IL QUADRO STRUMENTI SULLO SCHERMO, scritto sulla radice come
   * `--quadroCima` e `--quadroFondo`.
   *
   * PERCHE' SERVE, ED E' LA STESSA RAGIONE DI `--orizzonte`.
   *
   * Lo scanner del controllo — la riga che attraversa i documenti prima del
   * verdetto — nella prima stesura passava per il centro dello schermo. Il
   * committente l'ha detto senza mezzi termini: «il verdetto arriva senza che
   * niente sia stato controllato». Aveva ragione, e la causa era geometrica:
   * le credenziali stanno DENTRO il pannello, che occupa la meta' bassa, e la
   * riga passava trenta punti percentuali piu' su. Attraversava il vuoto.
   *
   * Perche' una scansione si legga come una scansione deve attraversare la
   * cosa che sta leggendo. E il pannello non sta in un posto fisso: e' un
   * oggetto in tre dimensioni, e la sua altezza sullo schermo dipende dal
   * formato, dal campo visivo e dalla posa della camera — tutte cose che nel
   * beat del contatto cambiano.
   *
   * Quindi si proietta e si consegna. Da quel momento la riga non puo' piu'
   * sbagliare bersaglio: e' la stessa geometria a dettare dove sta il pannello
   * e dove passa la riga che lo legge.
   */
  private dichiaraQuadro() {
    const g = this.quadro.mesh.geometry
    if (!g.boundingBox) g.computeBoundingBox()
    const b = g.boundingBox
    if (!b) return
    let su = 1e9
    let giu = -1e9
    for (let i = 0; i < 8; i++) {
      FUGA.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)
      FUGA.applyMatrix4(this.quadro.mesh.matrixWorld).project(this.camera)
      const y = (-FUGA.y * 0.5 + 0.5) * 100
      if (y < su) su = y
      if (y > giu) giu = y
    }
    /* SCRITTE SOLO SE CAMBIANO — vedi `core/Custom.ts`.
       Una proprieta' personalizzata sulla radice si eredita in tutto l'albero:
       riscriverla invalida lo stile di ogni elemento della pagina. Sette di queste
       scritte a ogni fotogramma erano il vero costo del sito in movimento — non il
       disegno della scena, che a pagina ferma sta a sedici millisecondi. */
    scriviNumero('--quadroCima', su, 2, '%')
    /* L'ALTEZZA SI CONSEGNA SENZA UNITA', ed e' un difetto gia' pagato.
       Scritta come percentuale, `translateY(44%)` non sposta la riga di
       quarantaquattro punti di finestra: la sposta del 44% della PROPRIA
       altezza, che e' due pixel. La riga restava incollata al bordo alto del
       pannello e la scansione non si vedeva succedere.
       Senza unita' si moltiplica per `1vh` dove serve, e allora quel numero
       significa davvero quello che dice. */
    scriviNumero('--quadroAltezzaVh', giu - su, 2)
    /* E LA CIMA ANCHE SENZA UNITA', per la stessa ragione dell'altezza.
       `--quadroCima` porta il simbolo di percentuale perche' serve a chi la
       usa come `top`, dove una percentuale significa «della finestra». Ma chi
       la usa dentro una `translateY` non puo' toccarla: li' una percentuale si
       riferisce all'ALTEZZA DELL'ELEMENTO, e su una riga di testo alta trenta
       pixel il conto viene sbagliato di dieci volte. Sono la stessa misura in
       due mestieri diversi, e servono tutte e due. */
    scriviNumero('--quadroCimaVh', su, 2)
  }

  private dichiaraOrizzonte() {
    const p = this.lastra.materiale.uniforms.uPendenza.value as { x: number; y: number }
    const ang = Math.atan2(p.y, p.x)
    // l'asse della strada, inclinato della pendenza: e' la direzione in cui
    // guarda un raggio che nello shader esce con d.y uguale a zero
    FUGA.set(Math.cos(ang), Math.sin(ang), 0)
    FUGA.multiplyScalar(6000).add(this.camera.position).project(this.camera)
    const frazione = -FUGA.y * 0.5 + 0.5
    scriviNumero('--orizzonte', frazione * 100, 2, '%')
  }

  /**
   * LA PATTUGLIA CHE ARRIVA ALLA FINE.
   *
   * Sta appesa alla SCENA e non a `interno`, e la ragione e' la stessa per cui
   * ci stanno le ottiche: la sua posa e' in coordinate mondo — insegue il
   * posto di guida lungo l'asse della strada — mentre `interno` porta la posa
   * dell'abitacolo. Appenderla li' vorrebbe dire comporre due trasformazioni
   * per sapere dove sta un'automobile a settanta metri.
   */
  readonly volante = new Volante()

  /**
   * IL BERSAGLIO DELL'IRIDE — dove si disegna il mondo che arriva.
   *
   * A META' RISOLUZIONE, e non e' un compromesso: il contenuto si vede dentro
   * un cerchio che per meta' della transizione e' piccolo, e sempre attraverso
   * un margine sfumato. Meta' dei pixel qui dentro non li distingue nessuno, e
   * costano un quarto.
   *
   * Si costruisce una volta e si ridimensiona con la finestra, esattamente
   * come `scene/Riflesso.ts` — che e' il precedente da cui questa passata
   * copia tutto, salva/ripristina compresi.
   */
  private bersaglioIride: WebGLRenderTarget
  /**
   * LA CAMERA DEL MONDO CHE ARRIVA, ed e' una seconda camera per una ragione
   * precisa.
   *
   * Durante l'attraversamento la camera principale sta dentro una galleria
   * larga decine di metri, a centoventi metri dall'automobile: e' il mondo a
   * scala 115. Disegnando l'interno da li' si otterrebbe l'abitacolo posato
   * davanti a quella camera — che tecnicamente funziona, perche' tutto
   * l'interno e' costruito in coordinate di camera — e inquadrato con il campo
   * visivo e l'orientamento della galleria, cioe' diverso da come sara' un
   * istante dopo.
   *
   * Con una camera sua, posata esattamente dove la regia mette l'interno al
   * suo primo fotogramma, quello che si vede dentro l'iride E' gia' il
   * fotogramma successivo. Non c'e' niente che debba coincidere: e' la stessa
   * inquadratura.
   */
  private cameraIride: PerspectiveCamera

  /** i lavori su un arco, in tre dimensioni: vedi `scene/Vetrina3D.ts` */
  readonly vetrina = new Vetrina3D()

  /**
   * IL CONTROLLO, agganciato da `avvio.ts`.
   *
   * Sta qui e non nello strato di interfaccia perche' il suo progresso comanda
   * COSE DELLA SCENA: il quadro strumenti che diventa la scheda dei lavori, e
   * la volante che riparte quando chi guarda ha chiesto di scrivere. Un
   * elemento del documento che pilota tre dimensioni e' esattamente il tipo di
   * legame che questo sito esiste per avere.
   */
  controllo: {
    aggiorna(q: number): number
    illumina(battito: number, forza: number): void
    perdita(q: number): number
    ritiro(q: number): number
    timbro(q: number): number
    lampeggiante(q: number): number
    /** quanto si sta frenando davanti alla pattuglia */
    frenata(q: number): number
    readonly viaLibera: boolean
    readonly quale: number
  } | null = null

  /** quanto e' avanti il finale, ADDOLCITO: comanda luce, spegnimento e campo */
  finale = 0
  /** e lo stesso istante in progresso GREZZO: comanda la regia del controllo,
   *  che e' un copione a soglie e non un movimento di camera */
  finaleGrezzo = 0
  /** l'ultimo valore passato alla strada: serve solo con il movimento ridotto,
   *  per non riscrivere un numero che non e' cambiato — vedi `fotogramma()`,
   *  dove c'e' scritto perche' riscriverlo farebbe lampeggiare la pattuglia.
   *  NaN e non 0 come partenza: 0 e' un valore legittimo del finale, e con
   *  quello il primo fotogramma non avrebbe mai scritto niente sulla strada. */
  private finaleScritto = NaN
  readonly quadro = new Quadro()
  /** la cornice in cui il quadro e' incastonato: vedi `scene/Palpebra.ts` */
  readonly palpebra = new Palpebra()
  /** il testo che arriva coricato dentro l'abitacolo: vedi `scene/Scritta.ts` */
  readonly scritta = new Scritta()

  private cielo!: Mesh
  private riflesso!: Riflesso
  private grado: ReturnType<typeof passaggioGrado> | null = null

  private ultimo = performance.now()

  /**
   * SOLO PER MISURARE. Blocca lo scambio e tiene in campo l'esterno per
   * tutto il beat, cosi' `strumenti/occlusione.mjs` puo' vedere QUANTO il
   * montante copre l'obiettivo invece di misurare l'interno, che e' scuro
   * di suo. Senza questo interruttore lo strumento dava 99% di copertura e
   * sembrava un successo: stava fotografando l'abitacolo.
   */
  forzaEsterno = false
  ambientePronto = false

  constructor(tela: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas: tela, antialias: true })
    /* L'ANISOTROPIA MASSIMA SI LEGGE QUI, e da nessun'altra parte: e' l'unico
       istante in cui questo numero esiste, perche' dipende dal driver. Vedi
       «core/Anisotropia.ts» — prima era 8 scritto a mano in cinque file, un
       numero plausibile che su meta' delle schede vere butta via la meta'
       della nitidezza disponibile sulle superfici viste di taglio. */
    impostaAnisotropiaMassima(this.renderer)
    // IL LIVELLO SI DECIDE PRIMA DI QUALUNQUE ALTRA COSA. Il rapporto di
    // pixel, la risoluzione del riflesso e lo stato delle ombre sono decisioni
    // che a caldo costano care o non si possono piu' prendere: `shadowMap.
    // enabled` e' una costante di compilazione, e cambiarla dopo ricompila
    // ogni materiale della scena.
    this.qualita = new Qualita(this.renderer.getContext())
    console.log(this.qualita.descrivi())
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.qualita.impostazioni.pixelRatio))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = this.qualita.impostazioni.ombra > 0
    this.renderer.shadowMap.type = PCFSoftShadowMap
    // 1,00 E NON 0,85, misurato con `strumenti/tara_luce.mjs`.
    //
    // A 0,85, con le sorgenti di adesso, il SESSANTACINQUE PER CENTO del
    // riquadro del soggetto stava sotto 4 su 255 — cioe' nero pieno, senza
    // informazione. Non era una scelta di atmosfera: era sottoesposizione, e
    // a occhio sembrava soltanto «notturno». Sei configurazioni misurate in
    // un caricamento hanno dato il numero in due minuti, dopo che tre giri a
    // occhio avevano dato tre risposte diverse.
    /* ESPOSIZIONE NOTTURNA. Abbassarla scurisce cio' che passa per il tone
       mapping — la villa, il lastricato, il cielo — ma NON le sorgenti
       dichiarate (gola del podio, strisce, filamenti), che hanno
       `toneMapped: false`. E' esattamente la separazione che serve: lo sfondo
       va giu' di uno stop scarso, le luci restano dove sono, e la scena
       diventa notte invece che una foto scurita. */
    this.renderer.toneMappingExposure = 0.82

    // LA NEBBIA E' CALDA E LONTANA. Serve a una cosa sola: sfumare il fondo
    // del porticato, che a quaranta metri deve perdersi invece di finire con
    // un bordo netto. Il colore e' quello dell'orizzonte del cielo, se no si
    // vede la fascia grigia dove la nebbia incontra l'aria.
    this.scena.fog = new Fog(new Color(0x1a1310), 34, 96)

    this.camera = new PerspectiveCamera(38, 1, 0.05, 200)

    this.esterno = costruisciEsterno()
    this.ambiente = costruisciAmbiente()
    // LA CORTE COSTRUITA E' USCITA DI SCENA, e il file resta.
    //
    // Ci ho lavorato a lungo e i numeri miglioravano a ogni giro; la sostanza
    // no. Il traguardo e' diventato «non deve essere distinguibile fra una
    // foto e questo», e scatole con tessiture da 1024 pixel non ci arrivano —
    // non per come sono fatte, ma per cosa sono.
    //
    // Al suo posto: una FOTOGRAFIA del cortile, a 360 gradi, che fa da fondo
    // e da mappa dei riflessi insieme. Vedi `scene/Panorama.ts` per il
    // ragionamento completo, compreso quanto vale la parallasse che si perde.
    //
    // `costruisciCorte` resta nel repo come ripiego e come nota di lavoro: le
    // proporzioni che contiene sono servite a tarare questa scena, e sono la
    // ragione per cui il panorama e' credibile alla scala giusta.
    this.cielo = costruisciCielo()
    this.ambiente.add(this.cielo)
    this.interno = costruisciInterno()
    this.accensione = new Accensione(POSTO_GUIDA)
    this.interno.add(this.accensione.gruppo)
    this.lastra = new Lastra()
    this.scena.add(this.esterno, this.ambiente, this.interno, this.lastra.mesh)
    // LE DUE LUCI DEL LAMPEGGIANTE NASCONO ADESSO, spente, e non quando la
    // pattuglia compare: il numero di sorgenti e' una costante di compilazione
    // dello shader, e aggiungerne una a meta' percorso ricompila ogni
    // materiale della scena. E' la regola piu' ripetuta di questo progetto.
    this.bersaglioIride = new WebGLRenderTarget(2, 2, { depthBuffer: true })
    this.cameraIride = new PerspectiveCamera(40, 1, 0.05, 200)
    this.attraversamento.mondoDietro = this.bersaglioIride.texture

    this.scena.add(this.volante.gruppo, ...this.volante.luci, this.vetrina.gruppo)
    // il bersaglio dello spot va nel grafo, se no three non ne legge la posa
    this.scena.add(this.volante.bersaglioFascio)
    // la camera deve VEDERE il livello su cui vive la volante: i livelli
    // filtrano tutte e due le cose, cosa si illumina e cosa si disegna
    this.camera.layers.enable(1)
    // il gruppo dell'abitacolo entra sul livello 2, dove vive la sola sorgente
    // del riflesso: e' cosi' che il lampeggiante tocca la plancia e nient'altro
    this.interno.traverse((o) => o.layers.enable(2))
    void this.volante.costruisci()
    // appeso alla SCENA e non a `interno`: la sua posa e' in coordinate mondo,
    // ricalcolata a ogni fotogramma dalla camera
    this.abitacolo = new Abitacolo({ mobile: this.qualita.impostazioni.abitacoloMobile })
    this.scena.add(this.abitacolo.mesh)
    this.scena.add(this.quadro.mesh, this.palpebra.gruppo)

    // LA CAMERA ENTRA NELLA SCENA, e non e' pignoleria.
    //
    // In three una camera funziona benissimo anche fuori dal grafo — il
    // renderer usa la sua matrice e basta. Ma i suoi FIGLI no: il disegno
    // percorre l'albero della scena, e cio' che pende da un nodo che
    // nell'albero non c'e' non viene mai raggiunto.
    //
    // Qui serve perche' l'iride dell'attraversamento e' appesa alla camera
    // (vedi `Attraversamento.agganciaIride`): e' l'unico modo perche' resti
    // davanti all'obiettivo comunque si muova. Senza questa riga il disco
    // esisteva, aveva la sua opacita' e la sua scala giuste, e non compariva in
    // nessun provino — senza nessun errore da nessuna parte.
    this.scena.add(this.camera)

    // IL PAVIMENTO E' NELLA FOTOGRAFIA. Qui resta solo cio' che una
    // fotografia non puo' dare: l'OMBRA di contatto dell'auto, su un piano
    // che non si vede. Senza, l'auto galleggia — ed e' il difetto che si nota
    // per primo anche senza saperlo nominare.
    this.ambiente.add(raccoglitoreOmbra(90))

    // LA PIATTAFORMA GIREVOLE va dentro `esterno`, cioe' GIRA COL SOGGETTO.
    //
    // E' la cosa che rende sensata la rotazione: un'automobile che ruota su
    // se stessa in mezzo a un piazzale e' un oggetto che si comporta in modo
    // impossibile; sopra una piattaforma e' semplicemente un'automobile su
    // una piattaforma.
    //
    // Girando insieme, l'auto e il disco restano solidali e la gola di luce
    // del bordo continua a cadere sui fianchi bassi della carrozzeria sempre
    // allo stesso modo — che e' anche il motivo per cui quella gola serve.
    this.piattaforma = costruisciPiattaforma()
    this.esterno.add(this.piattaforma)

    /* LE INSEGNE — tre siti veri in piedi sul piazzale, e stanno nell'ESTERNO
       e non davanti alla camera. Vedi `scene/Insegne.ts`: se stessero appese
       all'obiettivo si comporterebbero da interfaccia, e sarebbero la quarta
       lingua visiva di un'immagine che ne ha gia' tre. Dentro il mondo prendono
       la prospettiva e si spostano, cioe' si comportano da oggetti. */
    this.insegne = new Insegne()
    this.esterno.add(this.insegne.gruppo)

    // L'IMPIANTO LUCE STA IN UN FILE SUO, e non e' pulizia: e' che ha
    // smesso di essere «due luci per vedere qualcosa» ed e' diventato la
    // cosa che decide se la carrozzeria si legge. Su un'auto nera la luce
    // NON illumina, si SPECCHIA — vedi `scene/Luci.ts`.
    this.scena.add(costruisciLuci())
    // LE LUCI SI RACCOLGONO UNA VOLTA, con le loro intensita' vere: dopo il
    // primo spegnimento non sarebbero piu' leggibili dalle luci stesse, e si
    // perderebbe il valore a cui tornare risalendo di livello.
    this.ambiente.getObjectByName('CORTE')?.traverse((o) => {
      if ((o as PointLight).isPointLight) this.luciCorte.push(o as PointLight)
    })
    this.forzeCorte = this.luciCorte.map((l) => l.intensity)
    this.ombraLuce = this.scena.getObjectByName('OMBRA') as DirectionalLight | null
    // l'ambientale resta debolissima e fredda: e' il cielo, non una luce.
    // Serve solo a impedire che il sotto-scocca sia un buco assoluto.
    // l'ambientale e' il cielo che rimbalza: azzurra, e piu' presente di prima.
    // E' cio' che apre le ombre senza scaldare, cioe' l'esatto contrario di
    // quello che fa la corte.
    this.scena.add(new AmbientLight(0x2a4470, 0.42))

    // IL RIFLESSO A TERRA. Il lato e' 60 e non 90 come il marmo: oltre i
    // trenta metri il riflesso e' gia' svanito dalla sfumatura, e
    // renderizzare pavimento che non si vedra' mai costa e basta.
    // IL PIANO CHE SPECCHIA STA SULLA PIATTAFORMA, non per terra: e' li' che
    // l'automobile appoggia. E il piano si stringe da sessanta metri a otto,
    // perche' adesso serve solo a coprire il disco — sessanta metri di
    // geometria per un riflesso ritagliato a tre e sei erano tutta superficie
    // renderizzata e poi moltiplicata per zero.
    this.riflesso = new Riflesso(
      /* IL RIFLESSO ESCE DAL PODIO E BAGNA IL PAVIMENTO INTORNO.
         Era ritagliato esattamente sul raggio della piattaforma, quindi
         l'automobile si specchiava solo sul suo disco e finiva li'. Nella
         fotografia di riferimento meta' dell'effetto e' il pavimento BAGNATO
         intorno, che allunga la vettura verso chi guarda.
         Il pavimento vero e' la fotografia e una fotografia non riflette:
         quello che si puo' fare e' lasciare che il piano del riflesso continui
         oltre il bordo. Il raggio passa da 2,62 a 5,6 e la sfumatura del disco
         (gia' dentro `Riflesso`) fa sparire il bordo da sola. Il lato del piano
         sale di conseguenza: con 8 metri il riflesso si sarebbe tagliato di
         netto appena fuori dal podio. */
      13, normaliMarmo(), this.qualita.impostazioni.riflessoRisoluzione,
      ALTEZZA_PIATTAFORMA + 0.0015, 5.6,
    )
    // e il piano della piattaforma se lo prende dentro il proprio materiale:
    // il piano additivo qui sopra continua a fare il suo mestiere sul bordo,
    // ma il DISCO ha bisogno di un riflesso che possa anche spegnersi
    this.specchioPiattaforma = applicaSpecchio(
      this.piattaforma, this.riflesso.immagine, this.riflesso.matriceMondo,
    )
    this.ambiente.add(this.riflesso.mesh)

    // le colonne arrivano quando arrivano: la scena non le aspetta, perche'
    // un grey box che non parte finche' non ha finito di scaricare non e'
    // piu' un grey box


    // IL LUOGO E' UNA FOTOGRAFIA A 360 GRADI, e fa due mestieri con un file.
    //
    // Fa da FONDO: quello che si vede intorno all'auto e' una villa
    // fotografata, non un'architettura costruita. E fa da MAPPA D'AMBIENTE:
    // filtrata per ruvidita', e' cio' che la carrozzeria riflette — le stesse
    // vetrate accese, la stessa piscina, lo stesso cielo.
    //
    // E' quella coincidenza a reggere tutto: non la qualita' del materiale
    // dell'auto, ma il fatto che cio' che riflette e cio' che le sta intorno
    // siano LA STESSA IMMAGINE. E' il metodo con cui si fanno le campagne
    // automobilistiche vere, dove la scena e' uno scatto e la vettura e'
    // computer grafica.
    //
    // Vedi `scene/Panorama.ts` per il ragionamento completo, compreso quanto
    // vale la parallasse che si perde e perche' qui non e' un problema.
    // IL FONDALE PARTE PRIMA DEL SOGGETTO, e l'ordine vale cinque secondi.
    //
    // Prima l'automobile veniva chiesta per prima: due megabyte e nove contro
    // i cinquecento chilobyte del panorama. Il browser apre le connessioni in
    // ordine di richiesta, quindi la fotografia — che e' L'IMMAGINE CHE VENDE
    // IL PROGETTO — aspettava in coda dietro al soggetto. Nel filmato si
    // vedeva: a un secondo e due il fotogramma e' un gradiente beige con una
    // piattaforma vuota, e la villa arriva al quinto secondo.
    //
    // Invertito, la scena e' GIUSTA quasi subito anche senza l'automobile: un
    // luogo vero con una piattaforma vuota si legge come un'attesa voluta,
    // mentre un gradiente beige si legge come un sito rotto.
    /* IL CIELO COSTRUITO SI SPEGNE QUANDO ARRIVA LA FOTOGRAFIA, non quando e'
       pronto l'ambiente — e adesso sono due momenti diversi.
       La sorgente dell'ambiente pesa 132 kB e scende presto; la fotografia del
       fondo ne pesa 491 e arriva dopo. In mezzo la scena ha la luce giusta ma
       non ha ancora il cielo vero, e il cielo costruito e' esattamente cio' che
       serve li': e' la rete di sicurezza per cui esiste. Spegnerlo all'ambiente
       pronto lascerebbe un buco al posto del cielo. */
    montaPanorama(this.renderer, this.scena as unknown as Scene, () => {
      this.cielo.visible = false
      console.log('[panorama] fotografia del fondo al suo posto')
    })
      .then(() => {
        this.ambientePronto = true
        console.log('[panorama] luogo montato')
        /* E DA QUI COMINCIA LA PRIMA ONDATA DI RISCALDAMENTO, che prima non
           esisteva. Il riscaldamento partiva tutto insieme quando arrivava
           l'automobile — cioe' dopo quaranta secondi su rete lenta, misurati —
           e nel frattempo la scheda video non compilava niente. Ma di tutto
           quello che c'e' da compilare, l'automobile riguarda UN gruppo solo:
           la strada, l'abitacolo, il quadro, la palpebra, il carosello, le
           insegne, la volante e l'interno esistono gia' e non aspettano
           nessuno. Compilarli mentre il GLB scende e' tempo che non costa
           niente a nessuno, e sono i programmi che altrimenti si pagano tutti
           in una volta al primo scorrimento — `strumenti/dovecosta.mjs` li
           vedeva come picchi da centinaia di millisecondi con l'annotazione
           «niente di nuovo in scena: e' disegno», che e' esattamente la firma
           di uno shader compilato pigramente dentro la prima passata. */
        void riscalda(this.renderer, this.scena, this.camera, [
          this.interno, this.volante.gruppo, this.vetrina.gruppo,
          this.insegne.gruppo, this.quadro.mesh, this.palpebra.gruppo,
          this.abitacolo.mesh, this.lastra.mesh,
        ].filter(Boolean) as never, { bersaglio: this.bersaglioIride, camera: this.cameraIride })
      })
      .catch((e) => console.warn('[panorama]', e))

    // e l'automobile parte SUBITO DOPO, non dopo: le due richieste convivono,
    // e' solo l'ordine in cui entrano in coda che cambia
    // E SE L'AUTOMOBILE NON ARRIVA, LA PORTA SI APRE LO STESSO.
    //
    // Senza questa riga, un GLB mancante o un errore di rete lascerebbero
    // strada, abitacolo, pattuglia e miniature fermi dietro una promessa che
    // non si risolve piu': il sito resterebbe una corte vuota per sempre. E'
    // la stessa regola che vale in tutto il progetto — meglio in disordine che
    // fermi — ed e' anche cio' che permette al tempo massimo di `Ordine` di
    // essere lungo, perche' il caso normale del fallimento lo copre questa
    // riga e non lui.
    this.caricaAuto().catch((e) => { console.warn('[auto]', e); apriLaCoda() })

    this.costruisciPost()
    this.ridimensiona()
    addEventListener('resize', this.ridimensiona)
    // E SI GUARDA ANCHE LA TELA, non solo la finestra.
    //
    // La scheda cambia misura per ragioni che la finestra non conosce: le
    // barre del browser che compaiono su un telefono, `--scheda` che si muove,
    // un foglio di stile che arriva dopo il primo fotogramma. Nessuna di
    // queste manda un evento `resize`, e il risultato e' una scena disegnata
    // alla misura di prima — schiacciata, e senza niente che lo segnali.
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(this.ridimensiona).observe(this.renderer.domElement)
    }
    this.applicaQualita()
  }

  /** vero da quando la fotografia dell'abitacolo e' stata caricata sulla
   *  scheda video: vedi `scaldaOra` nel ciclo dei fotogrammi */
  private abitacoloScaldato = false

  private composer: EffectComposer | null = null
  private bloom: UnrealBloomPass | null = null
  /** pubblica per gli strumenti: si spegne per capire se un difetto e' suo */
  ao: GTAOPass | null = null

  /**
   * IL BLOOM, CON LA SOGLIA SOPRA 1.
   *
   * E' la lezione piu' costosa del progetto precedente, e la scrivo qui
   * perche' non venga ripagata: il bloom lavora PRIMA del tone mapping, su
   * valori lineari in cui una superficie bianca comune sta gia' intorno a
   * 0,9. Con la soglia sotto 1 fiorisce qualunque cosa sia chiara — un
   * muro, una pagina, un cofano illuminato — e il fotogramma si sbianca.
   *
   * Sopra 1 fiorisce solo cio' che e' DICHIARATO sorgente: il quadro
   * strumenti, le luci della galleria, i neon riflessi. E' anche l'unico
   * modo in cui l'accensione puo' funzionare: se tutto fiorisce, accendere
   * qualcosa non cambia niente.
   *
   * FORZA 0,12 E NON 0,42, e la differenza l'ha trovata una misura non un
   * occhio. A 0,42 il bloom RADDOPPIAVA la luminosita' del fotogramma —
   * 56 su 255 senza, 143 con — e su un telefono la scena notturna usciva
   * bianco latte. Il difetto c'era anche sul desktop, solo che li' passava
   * per atmosfera.
   *
   * Non e' che le luci della citta' non debbano fiorire: e' che un alone
   * che raddoppia tutto non e' piu' un alone, e' una nebbia.
   *
   * E LA SOGLIA FINISCE A 2,6, non a 1,04. Abbassare la forza non bastava
   * (a 0,12 aggiungeva ancora +58 su 56): un HDRI di citta' notturna ha
   * lampioni con valori altissimi, e sopra 1 ci passa mezzo cielo. A 2,6
   * ci restano solo le sorgenti vere.
   *
   * Il che obbliga a una cosa giusta: chi vuole fiorire deve DICHIARARSI
   * forte. Il quadro strumenti dell'accensione scrive oltre 3, e fiorisce;
   * una superficie chiara qualunque no. E' esattamente la separazione che
   * serve, ottenuta con un numero invece che con la speranza.
   */
  private costruisciPost() {
    const { innerWidth: l, innerHeight: a } = window

    /* IL COMPOSER RICEVE UN BERSAGLIO MULTICAMPIONE, e prima non lo faceva.
     *
     * `antialias: true` sul renderer NON STAVA FACENDO NIENTE, ed e' il genere
     * di riga che si scrive una volta e non si rimette piu' in discussione
     * perche' sembra ovvio che funzioni. Quella bandiera vale solo per il
     * fotogramma di sistema; qui pero' non si disegna mai li' — si disegna
     * dentro i bersagli del composer, che `EffectComposer` costruisce da solo
     * SENZA campionamento multiplo. Tutta la scena e' sempre stata renderizzata
     * con i bordi a scaletta, e il grading ci passava sopra un'accentuazione
     * del microcontrasto che quelle scalette le rende ancora piu' nette.
     *
     * COME L'HO TROVATO. Ingrandendo la linea del tetto al tempo `lato`, dove
     * l'automobile riempie il fotogramma: il filo di luce sul montante era una
     * scaletta di punti bianchi. Sembrava un difetto di geometria — cercavo
     * cricche nella decimazione — ed era il caso peggiore possibile per
     * l'aliasing, cioe' una riga speculare piu' sottile di un pixel su un fondo
     * quasi nero. E' anche l'artefatto che piu' di ogni altro fa dire «e' 3D»:
     * una fotografia non ha bordi a gradini.
     *
     * Quattro campioni e non otto: oltre i quattro il guadagno visibile e'
     * minimo e la banda di memoria raddoppia ancora. Il costo va verificato
     * con `strumenti/dovecosta.mjs` — su questo progetto e' gia' successo che
     * una correzione grafica diventasse un problema di prestazioni. */
    const bersaglio = new WebGLRenderTarget(
      Math.max(1, Math.round(l * this.renderer.getPixelRatio())),
      Math.max(1, Math.round(a * this.renderer.getPixelRatio())),
      { type: HalfFloatType, samples: 4 },
    )
    bersaglio.texture.name = 'COMPOSER_MSAA'
    this.composer = new EffectComposer(this.renderer, bersaglio)
    // IL COMPOSER DEVE SAPERE IL RAPPORTO DI PIXEL.
    //
    // Senza, i suoi bersagli di rendering restano alla misura in pixel CSS
    // mentre il renderer disegna al doppio: la catena del bloom finisce per
    // lavorare a meta' risoluzione, e lo stesso alone viene fuori grande il
    // doppio. Sul desktop, dove il rapporto e' 1, non si vede niente; su un
    // telefono a densita' doppia il fotogramma usciva bianco latte e
    // sembrava un difetto della scena.
    this.composer.setPixelRatio(this.renderer.getPixelRatio())
    this.composer.addPass(new RenderPass(this.scena, this.camera))

    /**
     * L'OCCLUSIONE AMBIENTALE — il singolo passaggio che trasforma una
     * geometria in architettura.
     *
     * PERCHE' LA CORTE SEMBRAVA CARTONE, e non era ne' la tessitura ne' la
     * luce.
     *
     * In un edificio vero, ogni punto in cui due superfici si incontrano e'
     * PIU' SCURO: l'angolo fra un pilastro e il muro, la fuga fra due lastre,
     * il sottosquadro di una cornice, il punto in cui un volume tocca terra.
     * Non perche' ci sia un'ombra proiettata, ma perche' quel punto vede meno
     * cielo. E' un fenomeno geometrico, non di illuminazione, e l'occhio lo
     * usa come misura principale della TRIDIMENSIONALITA'.
     *
     * Senza, un pilastro alto otto metri e mezzo e' un rettangolo colorato
     * uniforme, e resta un rettangolo colorato uniforme qualunque tessitura
     * gli si metta sopra e qualunque luce lo colpisca. E' il giudizio che ho
     * ricevuto — «questa parte non e' fotorealistica per niente» — ed e' il
     * difetto piu' difficile da nominare guardando, perche' non manca niente:
     * c'e' tutto, ed e' tutto piatto.
     *
     * GTAO E NON SSAO. Il metodo classico (SSAO) campiona un emisfero a caso
     * e produce quel bordo scuro sporco che si riconosce da lontano; GTAO
     * («ground truth») integra l'orizzonte visibile e da' un risultato molto
     * piu' vicino a quello calcolato per davvero. Su superfici grandi e
     * planari — che e' esattamente cio' di cui e' fatta questa corte — la
     * differenza fra i due e' enorme.
     *
     * IL RAGGIO E' IN METRI DI MONDO, ed e' la manopola che conta: 0,9 metri
     * significa «un angolo si scurisce per novanta centimetri». Su
     * un'architettura di questa scala e' la misura di un giunto profondo e di
     * un sottosquadro; a dieci centimetri non si vedrebbe nulla, a cinque
     * metri l'intera corte diventerebbe un'ombra sola.
     */
    this.ao = new GTAOPass(this.scena, this.camera, l, a)
    this.ao.output = GTAOPass.OUTPUT.Default
    this.ao.updateGtaoMaterial({
      radius: 0.9,
      distanceExponent: 1.4,
      thickness: 1.2,
      // 0,015 di scostamento: sotto, la superficie occlude se stessa e
      // compaiono le bande di autoocclusione; sopra, gli angoli si aprono e
      // l'effetto svanisce dove serve di piu'
      scale: 1.0,
      samples: 16,
      distanceFallOff: 1.0,
      screenSpaceRadius: false,
    })
    this.composer.addPass(this.ao)
    this.bloom = new UnrealBloomPass(new Vector2(l, a), 0.34, 0.20, 1.75)
    this.composer.addPass(this.bloom)
    this.tara(l, a)
    /**
     * L'ANTIALIASING VERO — quello che mancava a tre livelli di qualita' su
     * quattro, ed e' la causa del giudizio «disegnato con un pennarello
     * tremante».
     *
     * IL DIFETTO. Il multicampionamento del bersaglio del composer (`samples`
     * sul render target) e' acceso solo al livello ALTO — vedi `q.multicampione`
     * in `core/Qualita.ts`. Ai livelli medio, basso e minimo vale ZERO. Il
     * commento accanto a «medio» diceva «il degrado e' letteralmente
     * invisibile senza un confronto affiancato»: era falso proprio dove conta
     * di piu', cioe' sui bordi ad alto contrasto — il profilo dell'automobile
     * contro il cielo, il filo di luce sul montante, ogni fuga di lamiera.
     * Senza multicampionamento quei bordi diventano una scaletta di pixel, ed
     * e' esattamente quello che il committente ha visto e nominato.
     *
     * LA CURA NON E' ALZARE IL MULTICAMPIONAMENTO OVUNQUE. Un bersaglio MSAA a
     * 4 campioni costa quattro volte la banda di memoria per fotogramma, e
     * questo progetto ha gia' pagato una notte intera per tenere il costo per
     * fotogramma dentro banda. SMAA e' un'altra famiglia di tecnica: UNA sola
     * passata a schermo intero, sullo stesso bersaglio gia' disegnato, che
     * cerca i bordi per contrasto di luminanza e li sfuma. Costa una frazione
     * di un bersaglio multicampionato e non dipende dal numero di geometrie in
     * scena — quindi funziona identica a QUALUNQUE livello di qualita', ed e'
     * per questo che va aggiunta una volta sola qui, fuori dalla tabella dei
     * livelli.
     *
     * DOPO L'OUTPUTPASS E PRIMA DELLA GRADAZIONE. SMAA cerca discontinuita' di
     * luminanza: deve vedere l'immagine COSI' COM'E' USCITA DALL'OBIETTIVO —
     * tono mappato, in sRGB — non i valori lineari che ci sono prima
     * dell'OutputPass, dove il contrasto e' un altro. E deve vederla PRIMA
     * della grana della pellicola aggiunta da `Grado`: la grana e' rumore ad
     * alta frequenza apposta, e SMAA cercando bordi in mezzo al rumore
     * produrrebbe falsi positivi, ammorbidendo la grana invece di lasciarla
     * al suo posto.
     *
     * LE DUE TESSITURE DI RIFERIMENTO (l'area e la ricerca dei bordi, la
     * matematica di SMAA le usa per classificare la forma esatta di ogni
     * bordo) arrivano incorporate nel modulo come immagini in base64: zero
     * richieste di rete, zero righe da aggiungere al carico iniziale.
     */
    /* SI PUO' TOGLIERE CON UNA CODA ALL'INDIRIZZO, come il riscaldamento —
       `?senzasmaa` — per misurare l'effetto per A/B invece di fidarsi
       dell'occhio: `strumenti/frastagliato.mjs` la usa. */
    this.composer.addPass(new OutputPass())
    /* SI PUO' TOGLIERE CON UNA CODA ALL'INDIRIZZO, come il riscaldamento —
       `?senzasmaa` — per misurare l'effetto per A/B invece di fidarsi
       dell'occhio: `strumenti/frastagliato.mjs` la usa.
       DOPO L'OUTPUTPASS, E LA PRIMA STESURA L'AVEVA MESSA PRIMA — un errore
       silenzioso: SMAA ha soglie tarate per un'immagine sRGB 0-1, e prima
       dell'OutputPass i valori sono ancora lineari in mezza virgola mobile,
       dove il salto di luminanza fra la carrozzeria e il cielo non e' lo
       stesso salto percepito dopo la mappatura tonale. Il risultato era
       che la passata girava, costava il suo tempo, e non cambiava UN pixel:
       misurato — la stessa identica scaletta, con e senza — prima di
       capire che la riga era nel posto sbagliato della catena. */
    if (!location.search.includes('senzasmaa')) this.composer.addPass(new SMAAPass())
    // IL GRADING VA DOPO L'OUTPUTPASS, e l'ordine non e' arbitrario.
    //
    // L'OutputPass fa il tone mapping e porta da lineare a sRGB. Il punto di
    // nero, il contrasto e il microcontrasto sono decisioni sull'immagine
    // FINITA, cioe' sui valori che si vedono: applicarli prima
    // significherebbe agire su numeri lineari, dove «il grigio medio» non
    // sta a 0,22 ma a 0,05, e ogni taratura fatta a occhio sarebbe sbagliata
    // di un fattore quattro.
    this.grado = passaggioGrado(l, a)
    this.composer.addPass(this.grado)
  }

  /**
   * IL BLOOM VA TARATO SULLA DIMENSIONE DELLO SCHERMO.
   *
   * Il raggio di UnrealBloomPass e' relativo alla risoluzione: lo stesso
   * numero, su un fotogramma piccolo, sfoca una frazione molto piu' grande
   * dell'immagine. Sul desktop 0,7 e' un alone attorno alle sorgenti; su un
   * telefono da 390 px diventa una nebbia che copre tutto — nel provino il
   * tetto notturno usciva bianco latte, e sembrava un difetto della scena.
   *
   * Quindi raggio e forza scendono con il lato corto. Non e' una
   * concessione al telefono: e' la stessa quantita' di alone espressa in
   * una misura che ha senso, cioe' relativa a quanto e' grande davvero il
   * fotogramma.
   */
  /** solo per taratura: `strumenti/tara_luce.mjs` sposta il punto di nero */
  grado_nero = (v: number) => { if (this.grado) this.grado.uniforms.nero.value = v }

  /** solo per diagnosi: permette agli strumenti di spegnere il bloom */
  bloomForza(v: number) { if (this.bloom) this.bloom.strength = v }
  bloomSoglia(v: number) { if (this.bloom) this.bloom.threshold = v }

  /**
   * Riporta sul motore cio' che il livello ha deciso.
   *
   * Si chiama SOLO al cambio di livello, mai per fotogramma: ognuna di queste
   * righe rialloca un bersaglio di rendering o ricompila un materiale, e
   * farlo sessanta volte al secondo costerebbe piu' di tutto quello che sta
   * risparmiando.
   */
  private applicaQualita() {
    const q: Impostazioni = this.qualita.impostazioni

    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio))
    this.composer?.setPixelRatio(this.renderer.getPixelRatio())

    /* IL CAMPIONAMENTO MULTIPLO SI ACCENDE E SI SPEGNE COL LIVELLO.
       Cambiare `samples` non basta: three rialloca il bersaglio solo dopo che
       e' stato buttato, e senza `dispose` continuerebbe a disegnare in quello
       di prima — che e' esattamente il genere di modifica che non da' errore e
       non fa niente. Costa qualche millisecondo, e capita solo al cambio di
       livello. */
    for (const b of [this.composer?.renderTarget1, this.composer?.renderTarget2]) {
      if (b && b.samples !== q.multicampione) {
        b.samples = q.multicampione
        b.dispose()
      }
    }

    if (this.bloom) this.bloom.enabled = q.bloom
    if (this.ao) {
      this.ao.enabled = q.occlusione
      // cambiare i campioni ricompila UN materiale a schermo intero, non la
      // scena: e' un intoppo da pochi millisecondi, ed e' il motivo per cui
      // si tocca solo qui
      if (q.occlusione) this.ao.updateGtaoMaterial({ samples: q.campioniOcclusione })
    }

    if (this.ombraLuce && q.ombra > 0) {
      if (this.ombraLuce.shadow.mapSize.x !== q.ombra) {
        this.ombraLuce.shadow.mapSize.set(q.ombra, q.ombra)
        // la mappa vecchia va buttata a mano: `mapSize` da sola non la
        // rialloca, e three continuerebbe a disegnare in quella di prima
        this.ombraLuce.shadow.map?.dispose()
        this.ombraLuce.shadow.map = null
      }
      // CONGELATA quando si puo': la direzionale e l'auto non si muovono,
      // quindi la mappa d'ombra e' identica a se stessa a ogni fotogramma.
      // Si chiede un aggiornamento solo quando la scena cambia davvero.
      this.ombraLuce.shadow.autoUpdate = q.ombraViva
      this.ombraLuce.shadow.needsUpdate = true
    }

    applicaLuciCorte(this.luciCorte, this.forzeCorte, q.luciCorte)
    /* QUI SI SCRIVEVA L'INERZIA DELLO SCORRIMENTO, e la riga diceva la cosa
       giusta: «chi chiede meno movimento non riceve meno sito, riceve meno
       movimento AUTOMATICO — la scena segue il dito uno a uno invece di
       scivolare, e i beat restano tutti». E' ancora la regola del progetto.
       Sbagliato era il POSTO. Questo metodo esiste apposta per girare SOLO al
       cambio di livello — lo dice il commento in testa, ed e' la ragione per
       cui ogni riga qui dentro rialloca qualcosa. Ma la preferenza di
       movimento non e' una conseguenza del livello: non cambia quando cambiano
       i fotogrammi al secondo, e cambia quando il livello sta fermo. Su una
       macchina che regge il livello alto per tutta la visita, questa riga non
       veniva eseguita nemmeno una volta dopo la costruzione.
       Adesso `core/Scorrimento.ts` legge da se' `RIDOTTO` a ogni fotogramma. */
    this.ridimensiona()
  }

  private tara(l: number, a: number) {
    if (!this.bloom) return
    const corto = Math.min(l, a)
    const k = Math.min(Math.max(corto / 900, 0.42), 1)
    this.bloom.radius = 0.20 * k
    this.bloom.strength = 0.34 * (0.55 + 0.45 * k)
  }

  private ridimensiona = () => {
    // SI MISURA LA TELA, NON LA FINESTRA.
    //
    // Da quando la scena sta dentro una scheda, la finestra e la superficie
    // disegnata non coincidono piu'. Continuando a leggere `innerWidth` e
    // `innerHeight` il renderer disegnerebbe un fotogramma alto quanto tutta la
    // pagina dentro un riquadro alto due terzi: l'immagine esce schiacciata e
    // il rapporto della camera sbagliato, che e' il tipo di difetto che si
    // vede subito e si spiega male.
    //
    // `clientWidth` e non `getBoundingClientRect`: la tela non ha
    // trasformazioni, i due valori coincidono, e il primo non forza un
    // riordino del layout.
    //
    // Il `max(1, ...)` non e' pignoleria: al primo giro, prima che il foglio di
    // stile sia applicato, la tela misura zero — e un rapporto d'aspetto che
    // vale zero o infinito propaga NaN dentro la matrice di proiezione, dove
    // non si riesce piu' a rintracciarlo.
    const tela = this.renderer.domElement
    const l = Math.max(1, tela.clientWidth || innerWidth)
    const a = Math.max(1, tela.clientHeight || innerHeight)
    this.renderer.setSize(l, a, false)
    this.composer?.setPixelRatio(this.renderer.getPixelRatio())
    this.composer?.setSize(l, a)
    this.bloom?.setSize(l, a)
    this.ao?.setSize(l, a)
    if (this.grado) this.grado.uniforms.misura.value.set(l, a)
    this.riflesso?.ridimensiona(l, a)
    // meta' risoluzione: vedi il commento sul campo. E la misura in pixel di
    // disegno va anche al disco, che campiona il bersaglio in coordinate
    // schermo e senza quella non saprebbe dove guardare.
    const dpr = this.renderer.getPixelRatio()
    this.bersaglioIride.setSize(Math.max(2, Math.floor(l * dpr * 0.5)), Math.max(2, Math.floor(a * dpr * 0.5)))
    this.attraversamento.misuraSchermo(l * dpr, a * dpr)
    this.cameraIride.aspect = l / a
    this.cameraIride.updateProjectionMatrix()
    this.tara(l, a)
    this.camera.aspect = l / a
    this.camera.updateProjectionMatrix()
  }

  /**
   * L'AUTO VERA prende il posto della scatola.
   *
   * La scatola non si butta: resta come RIFERIMENTO di misura, invisibile.
   * Tutta la coreografia e' tarata sul suo ingombro, e avere il volume di
   * controllo ancora in scena permette di verificare che il modello
   * generato ci stia dentro invece di sperarlo.
   */
  private async caricaAuto() {
    /* L'AUTOMOBILE E' CAMBIATA, ed e' cambiato con lei un pezzo di progetto.
       Non e' piu' una hypercar a ruote scoperte: e' uno streamliner con le
       ruote CARENATE, generato da quattro viste e tagliato in sei pezzi.
       Cosa se ne va con lei: le quattro ruote innestate, il disco forato e la
       pinza rossa di stamattina. Erano il lavoro giusto sull'automobile
       sbagliata — un cerchio da mille triangoli non regge la camera a
       cinquanta centimetri, e nessun raffinamento ragionevole lo fa reggere.
       Una carena e' una superficie continua: regge.
       Cosa arriva: 667 kilobyte invece di 2,9 megabyte, sei pezzi invece di
       ventisette, e un faro che e' un ANELLO — cioe' la stessa forma
       dell'iride con cui questo sito attraversa il faro. */
    const { perno, misura } = await caricaNormalizzato('/modelli/auto2.glb', {
      lunghezza: AUTO.lunghezza,
      rotY: this.rotazioneAuto,
      /* LA QUOTA VIENE DALLA PIATTAFORMA, non da un numero scritto due volte.
         Era `0.24` dentro `scene/Modelli.ts` con accanto il commento che
         diceva quanto e' alta la piattaforma; poi la piattaforma e' diventata
         alta 0,11 e il numero e' rimasto. Risultato: tredici centimetri di
         aria sotto le carene, che il committente ha visto al primo sguardo. */
      appoggio: ALTEZZA_PIATTAFORMA,
    })
    // NON PIU' `correggiMateriali`, che aggiustava i due numeri di un
    // materiale solo. Adesso le parti hanno un nome e ognuna prende il
    // materiale che le compete — vedi `scene/Materiali.ts`.
    console.log('[auto] materiali:', Object.fromEntries(vestiAuto(perno)))
    perno.name = 'AUTO_VERA'
    this.esterno.add(perno)
    /* E L'OMBRA DI CONTATTO, che e' l'altra meta' del «sembra sospesa».
       Sta nel gruppo dell'esterno e non appesa al perno per una ragione
       precisa: e' `esterno` a ruotare (vedi `rotazioneScena`), e ruotando
       porta con se' sia la vettura sia la piattaforma. Appendendola al perno
       si sarebbe sommata due volte alla stessa rotazione. */
    /* LA PIANTA SI MISURA UNA VOLTA SOLA e la usano in due: l'ombra qui sotto e
       la minigonna piu' avanti. Non e' un'economia di calcolo — sono due letture
       da sessantacinquemila vertici, roba da un millesimo — e' che il buio deve
       avere ESATTAMENTE la forma del pezzo che lo produce. Quando erano due
       disegni indipendenti divergevano lungo il fianco, e li' il bordo netto
       della minigonna atterrava su pavimento acceso: il «blocco geometrico»
       che il committente ha segnalato. */
    const pianta = piantaSottoscocca(perno)
    this.esterno.add(ombraDiContatto(misura.x, misura.z, trovaArchi(perno), pianta?.raggi ?? null))
    /* E IL SOTTOSCOCCA, che e' l'altra meta' — quella che l'ombra non poteva
       fare. Vedi «scene/Sottoscocca.ts»: la scocca ha il fondo piatto a 0,291 e
       la pedana sta a 0,110, quindi sotto la vettura restavano diciotto
       centimetri d'aria che lo specchio del basamento raddoppiava a trentasei.
       Sta appeso al perno e non al gruppo dell'esterno: e' un pezzo
       DELL'AUTOMOBILE, e deve girare con lei anche se un giorno cambiera' chi
       ruota. La geometria nasce in coordinate del mondo — si legge dai vertici
       veri della carrozzeria — quindi va riportata nello spazio del perno
       prima di appenderla, o si troverebbe applicata due volte la stessa posa. */
    /* IL FANALE POSTERIORE, che fino a ieri era un colore dentro la mappa.
       Sta appeso al perno come il sottoscocca e per la stessa ragione: e' un
       pezzo DELL'AUTOMOBILE e deve girare con lei. Le sue coordinate sono
       misurate sui vertici rossi della carrozzeria — vedi «scene/Fanale.ts». */
    const coda = fanale()
    /* E SI RIPORTA NELLO SPAZIO DEL PERNO, come il sottoscocca due righe sotto.
       Le sue coordinate nascono in coordinate del MONDO — `dovilrosso.mjs`
       misura i vertici rossi dopo `applyMatrix4(matrixWorld)` — e appenderle a
       un perno che ha gia' la sua posa vuol dire applicarla due volte.
       Nel primo provino il fanale galleggiava in aria dietro l'automobile, un
       metro piu' in alto e mezzo piu' indietro. Non e' un errore di misura: e'
       un errore di SPAZIO, ed e' il piu' facile da fare e il piu' facile da
       vedere — cosa che l'ha reso, per una volta, economico. */
    coda.applyMatrix4(new Matrix4().copy(perno.matrixWorld).invert())
    coda.traverse((o) => o.layers.enable(LIVELLO_SOGGETTO))
    perno.add(coda)

    const sotto = sottoscocca(perno, ALTEZZA_PIATTAFORMA, pianta)
    if (sotto) {
      sotto.applyMatrix4(new Matrix4().copy(perno.matrixWorld).invert())
      sotto.layers.enable(LIVELLO_SOGGETTO)
      perno.add(sotto)
    }
    /* IL SEGNALE DI RUOTA — richiesta di due revisioni esterne, indipendenti
       fra loro: le carenature restano (e' una scelta del committente), ma
       manca un accenno di contatto e di rotazione. Vedi «scene/Ruote.ts». Sta
       nel gruppo prima di applicare la posa inversa, per la stessa ragione del
       sottoscocca: e' misurato in coordinate del mondo. */
    this.ruote = new Ruote(perno, ALTEZZA_PIATTAFORMA)
    this.ruote.gruppo.applyMatrix4(new Matrix4().copy(perno.matrixWorld).invert())
    this.ruote.gruppo.traverse((o) => o.layers.enable(LIVELLO_SOGGETTO))
    perno.add(this.ruote.gruppo)
    /* LE RUOTE VERE ARRIVANO DOPO, e non si aspettano.
       Il modello della ruota (razze multiple, disco freno, battistrada) pesa
       trecento kilobyte: metterlo sulla strada critica ritarderebbe il velo di
       caricamento per un dettaglio che si vede da vicino. Si chiede qui e si
       innesta quando arriva; se non arriva restano le ruote di segnale, che
       reggono da lontano. */
    /* LE RUOTE SI COSTRUISCONO, e `ruota.glb` non si carica piu'.
       Erano 297 kB e 28.700 triangoli per ruota — 114.000 in quattro, contro
       i 106.000 di tutta la carrozzeria: sproporzionato di dieci volte. E
       soprattutto erano 28.700 triangoli di RUMORE. Vedi `scene/RuotaVera.ts`.
       Non c'e' piu' niente da aspettare e niente che possa non arrivare:
       quello che prima era una promessa asincrona adesso e' una chiamata. */
    if (this.ruote) {
      this.ruote.costruisci()
      this.ruote.gruppo.traverse((o) => o.layers.enable(LIVELLO_SOGGETTO))
    }
    /* LE GUARNIZIONI DEI VETRI, calcolate qui perche' qui la geometria c'e'.
       Vedi `scene/Guarnizione.ts`: e' la fascia ceramica nera che ogni vetro
       d'auto ha sul bordo, e senza la quale il perimetro del parabrezza resta
       una riga chiara e frastagliata. Costa una passata sui vertici, una volta
       sola, mentre il modello finisce di caricare. */
    /* IL RIEMPIMENTO DEL MUSO, APPESO ALLA VETTURA.
     *
     * Il committente ha fotografato lo splitter: «qui manca la definizione
     * dell'auto». Il metro gli da' ragione — `strumenti/carrozzeria.mjs` dice
     * mediana 1,7 su 255 e il sessantasette per cento dei pixel sotto 12.
     *
     * Non e' un difetto di modello ne' sottoesposizione: quelle superfici
     * guardano in BASSO e in AVANTI, e in quella direzione la scena non ha
     * niente. I quattro pannelli del rig stanno tutti a mezz'altezza o piu' su
     * — il taglio disegna la spalla, la chiave riempie il fianco, il basso e'
     * laterale — e il labbro dello splitter non vede nessuno.
     *
     * E STA APPESO AL PERNO, non al mondo. Provato prima come quinto pannello
     * fisso: al tempo `orbita` la frazione quasi nera e' scesa di dieci punti,
     * alla hero e al `lato` non e' cambiato niente. Qui la camera sta ferma e
     * gira l'automobile, quindi una sorgente ferma illumina un pezzo diverso a
     * ogni tempo. Appesa alla vettura, il muso ce l'ha sempre.
     *
     * Azzurra perche' davanti all'automobile, a due metri, c'e' una piscina
     * illuminata: quella luce esiste davvero, e non usarla era lasciare sul
     * tavolo l'unica sorgente che la scena regala al frontale.
     *
     * Debolissima: non illumina, restituisce il DISEGNO. Uno spigolo si legge
     * perche' i suoi due lati hanno luminanze diverse, e finche' sono tutti e
     * due a zero lo spigolo non esiste. */
    const muso = new RectAreaLight(0x9dc4f2, 5.2, 5.0, 1.3)
    muso.layers.set(LIVELLO_SOGGETTO)
    muso.name = 'PANNELLO_MUSO'
    muso.position.set(0, 0.40, 3.6)
    muso.lookAt(0, 0.55, 0)
    perno.add(muso)

    guarnisci(perno)
    /* E L'ANTIALIASING SPECULARE su tutto quello che e' lucido: vedi
       `scene/Nitidezza.ts` e le quattro diagnosi sbagliate che ci sono volute
       per arrivarci. Il campionamento multiplo leviga i bordi dei triangoli;
       questo leviga la LUCE calcolata dentro i triangoli, che sopra uno spigolo
       vivo e' l'altra meta' del problema. */
    const gia = new Set<string>()
    perno.traverse((o) => {
      const m = o as unknown as { isMesh?: boolean; material?: { name?: string } }
      if (!m.isMesh || !m.material) return
      const n = m.material.name || 'senza-nome'
      if (gia.has(n)) return
      gia.add(n)
      antialiasSpeculare(m.material as never, n)
    })
    this.autoVera = perno
    this.misuraAuto = misura

    /* LA BARRA IN CODA, misurata sull'automobile e non piazzata a numero.
       Si mette all'estremo POSTERIORE della scatola d'ingombro, a poco piu' di
       meta' altezza: e' dove sta la luce di una vettura, e cosi' resta giusta
       anche se il modello cambia. Guarda indietro, quindi si gira di 180 gradi
       rispetto al muso. */
    /* LA BARRA IN CODA NON SI FA COSI', ed e' una lezione sulla FORMA.
       Il riferimento del committente e' una hypercar con il posteriore
       VERTICALE: li' una barra luminosa ci sta per costruzione. Questa e' una
       streamliner e la coda va a punta — non c'e' nessun pannello dietro su
       cui appoggiarla. Provata come piano costruito, misurato in metri veri e
       posizionato sulla scatola d'ingombro (estremo, groppa, tre quote
       diverse): resta sempre DENTRO la carena o di taglio, invisibile da ogni
       angolo. Sopra i tre quarti di lunghezza la carena e' piu' stretta della
       barra stessa.
       La strada giusta e' la mappa emissiva, che dipinge la luce SULLA
       superficie: `auto2r_emi.webp` ha gia' tre zone pulite, tutte ciano.
       Perche' non e' stato fatto adesso: ricavare dalla geometria quali pixel
       UV siano «la coda» ha dato intersezione VUOTA con i pixel accesi da
       entrambi i lati dell'asse — le UV lette dall'attributo non corrispondono
       a quelle con cui la mappa e' stata cotta. Va risolto quel disallineamento
       prima, se no si dipinge a caso. */

    // LA SCATOLA RESTA MA SMETTE DI VEDERSI — E LE RUOTE ANCHE.
    //
    // Le quattro ruote del grey box non avevano un nome, quindi non erano
    // nell'elenco, quindi sono rimaste ACCESE sotto l'auto vera: nel provino
    // si vedono due cilindri grigi che spuntano dalla fiancata. E' il difetto
    // piu' stupido di tutto il progetto ed e' sopravvissuto a tre provini,
    // perche' finche' l'auto generata era un blocco nero ci si confondevano
    // dentro. Adesso che la carrozzeria si legge, si vedono.
    //
    // Si spegne l'intero gruppo tranne cio' che serve da riferimento di
    // misura: cosi' non c'e' piu' un elenco da tenere aggiornato a mano.
    // SI SPEGNE SOLO IL GREY BOX, non tutto quello che sta nel gruppo.
    //
    // «Spegni tutto tranne l'auto» sembrava piu' robusto di un elenco da
    // tenere aggiornato — e lo era, finche' nel gruppo c'era solo il grey
    // box. Poi ci e' entrata la PIATTAFORMA, costruita nel costruttore, e
    // questa riga l'ha spenta senza dire niente: nel provino l'auto ruotava
    // sospesa sul lastricato, che e' esattamente il difetto che la
    // piattaforma esisteva per togliere.
    //
    // La lezione: una regola scritta come «tutto tranne X» non e' piu' sicura
    // di un elenco. E' solo un elenco al contrario, e invecchia peggio —
    // perche' l'elenco protesta quando trova un nome che non conosce, mentre
    // questa accoglie in silenzio qualunque cosa arrivi dopo.
    //
    // `RIFERIMENTO` marca i pezzi che servono solo a misurare.
    for (const o of this.esterno.children) {
      if (o.userData.riferimento) o.visible = false
    }
    // L'OTTICA COSTRUITA PRENDE IL POSTO DELL'INTERNO DEL FARO GENERATO.
    //
    // Lo zoccolo generato resta — e' la conchiglia di carrozzeria intorno,
    // che il generatore ha fatto bene perche' e' superficie esterna. Quello
    // che non poteva fare e' cio' che c'e' dentro, ed e' esattamente il
    // pezzo che il percorso attraversa.
    this.innestaFari(perno, misura).catch((e) => console.warn('[faro]', e))
    // LE RUOTE COSTRUITE prendono il posto di quelle generate.
    //
    // Stesso ragionamento del faro: una ruota e' fatta di superfici di
    // rivoluzione, cioe' la categoria in cui la geometria costruita batte
    // quella ricostruita da un'immagine senza discussione. Il generatore
    // vedeva la ruota da fuori e ne ricostruiva l'ombra: le razze diventavano
    // un rilievo sul disco e il canale del cerchio si chiudeva.
    //
    // Sono anche il secondo posto dove l'occhio va, dopo il muso: sono
    // l'unico elemento di un'automobile con un DISEGNO, tutto il resto e'
    // superficie.
    /* SI ASPETTA, e prima non si aspettava.
       Era una promessa lasciata correre da sola, e per mesi non e' stato un
       problema: le ruote comparivano un attimo dopo e nessuno se ne accorgeva.
       Poi e' arrivato il riscaldamento degli shader, che per compilare accende
       tutto e poi rimette a posto — e ha rimesso a posto uno stato SCATTATO
       PRIMA che le ruote finissero. Risultato: il guscio generato, che
       `innestaRuote` aveva appena spento, e' tornato acceso e ha coperto la
       ruota vera. Il committente ha visto una ruota senza pinza e senza disco,
       e attraverso le razze si vedeva lo sfondo.
       La ruota vera c'era eccome — quattro gruppi da sei pezzi ciascuno,
       gomma, canale, razze, mozzo, disco e pinza — solo, invisibile.
       La lezione e' generale e vale piu' del difetto: una promessa lasciata
       correre non e' un dettaglio di stile. E' un pezzo di costruzione che
       finisce in un momento che nessuno conosce, e prima o poi qualcun altro
       fotografa lo stato in mezzo. */
    /* LE RUOTE NON SI INNESTANO PIU', PERCHE' NON CI SONO.
       L'automobile nuova ha le ruote CARENATE: la carrozzeria scende fino a
       terra e le copre del tutto. Non e' una semplificazione — e' il disegno,
       ed e' anche il motivo per cui questo modello costa 670 kilobyte invece
       di 2,9 megabyte: meta' dei settecentomila triangoli della vettura di
       prima stavano nei quattro cerchi, che sono la forma piu' cara che esista
       (superfici di rivoluzione dentro altre superfici di rivoluzione, tutte
       in vista).
       Con loro se ne va il lavoro di una mattina — il disco forato, la pinza
       rossa, gli smussi sulle razze — ed era il lavoro giusto sull'automobile
       sbagliata: un cerchio da mille triangoli non regge la camera a mezzo
       metro, e nessun raffinamento ragionevole glielo fa reggere. Una carena
       e' una superficie continua: regge. */
    // l'ombra e' congelata: quando arriva l'auto la scena e' cambiata
    // davvero, quindi si chiede un giro di aggiornamento
    if (this.ombraLuce) this.ombraLuce.shadow.needsUpdate = true
    this.autoPronta = true
    /* E DA QUI IN POI PUO' SCENDERE TUTTO IL RESTO.
       Vedi «core/Ordine.ts» e la misura che l'ha imposto: la strada, la
       fotografia dell'abitacolo, la pattuglia e le dieci miniature dei lavori
       sono tre megabyte e mezzo di capitoli che cominciano decine di secondi
       di scorrimento piu' tardi, e partivano subito solo perche' i loro
       oggetti nascono nel costruttore insieme a tutto il resto. Su una rete
       lenta quei byte li toglievano alla vettura: preannunciata per prima a
       213 ms, arrivata per ultima a 42,8 s.
       Questa riga sta DOPO «autoPronta» e non prima per una ragione precisa:
       cio' che conta non e' che il file sia sceso, e' che l'automobile sia in
       scena — se no si riaprirebbe la gara proprio nell'ultimo tratto, che e'
       quello che costa di piu'. */
    apriLaCoda()

    /* E DA QUI COMINCIA IL RISCALDAMENTO — vedi `core/Riscalda.ts`.
       E' l'ultimo pezzo ad arrivare, quindi e' il primo istante in cui c'e'
       tutto da compilare. Non si aspetta il risultato: il sito deve partire
       adesso, il riscaldamento e' un lavoro che gli corre accanto. */
    /* LA SECONDA ONDATA — quella che l'automobile la doveva aspettare davvero.
       Restano solo il gruppo dell'esterno e l'attraversamento: tutto il resto
       e' gia' stato compilato mentre il GLB scendeva (vedi la prima ondata,
       agganciata al panorama). Cosi' il morso che tocca a questo istante e'
       un ottavo di quello di prima, e l'istante e' anche il piu' delicato —
       e' quello in cui il sito diventa usabile. */
    void riscalda(this.renderer, this.scena, this.camera, [
      this.esterno, this.attraversamento?.gruppo,
    ].filter(Boolean) as never, { bersaglio: this.bersaglioIride, camera: this.cameraIride })
  }

  /**
   * LA PLANCIA VERA prende il posto delle scatole dell'abitacolo.
   *
   * E' un oggetto SEPARATO dall'auto, e questo e' il punto: il modello
   * generato dell'esterno e' un solido pieno, senza interno e senza vetri
   * staccabili. Non e' un difetto da correggere — e' esattamente la
   * decisione D2, in cui esterno e interno sono due asset distinti che si
   * scambiano dietro l'occlusione. Il fotogramma li' e' nero al 98,9%:
   * nessuno puo' accorgersi che i due pezzi non sono la stessa auto.
   */
  /** le due ottiche innestate: la destra e' quella che si attraversa */
  fari: Object3D[] = []
  readonly attraversamento = new Attraversamento()
  faroSorgente: Faro | null = null

  private async innestaFari(auto: Object3D, misuraAuto: Vector3) {
    // il centro dell'auto in coordinate mondo: l'auto sta sull'origine e
    // poggia a terra, quindi il suo centro e' a meta' altezza
    const centro = new Vector3(0, misuraAuto.y / 2, 0)
    auto.updateWorldMatrix(true, true)
    for (const nome of ['FARO_DX', 'FARO_SX']) {
      const zoccolo = auto.getObjectByName(nome)
      if (!zoccolo) { console.warn('[faro] manca lo zoccolo', nome); continue }
      // SI SCARICA UNA VOLTA SOLA. Prima il ciclo chiamava `caricaFaro()` per
      // ognuno dei due fari: due richieste di rete per lo stesso file, dieci
      // materiali invece di cinque, dieci programmi da compilare invece di
      // cinque — e per giunta in SEQUENZA, perche' l'attesa e' dentro il
      // ciclo. Il tempo di caricamento raddoppiava, ed e' proprio il tempo
      // che decide se si vede il difetto della scena vuota qui sotto.
      const f = this.faroSorgente ?? await caricaFaro()
      if (!this.faroSorgente) this.faroSorgente = f
      /* E LA GHIERA DICE DOVE STA IL BUCO.
         `OTTICA_BORDO` e' l'unico pezzo aggiunto a mano alla vettura (vedi
         `scene/Materiali.ts`): e' l'anello di metallo scuro intorno alla
         lente, cioe' il bordo che nel fotogramma DISEGNA l'apertura. Nel
         modello non e' concentrico con `FARO_DX` — sta 4,8 millesimi piu' in
         basso, che sulla vettura montata fanno 2,13 cm — e finche' l'ottica si
         posava sullo zoccolo l'anello luminoso restava alto di 11,4 pixel, con
         la mezzaluna scura sotto che il committente ha fotografato.
         La misura sta in `strumenti/centro_faro.mjs`; il ragionamento per
         esteso in testa a `innestaFaro`. */
      const apertura = auto.getObjectByName(
        nome === 'FARO_DX' ? 'OTTICA_BORDO' : 'OTTICA_BORDO_SX',
      )
      const innesto = innestaFaro(f, zoccolo, centro, apertura)
      innesto.name = 'OTTICA_' + nome
      // SI APPENDE A `esterno`, NON ALL'AUTO, e la differenza non e' di
      // stile: e' che `innestaFaro` misura la scatola dello zoccolo in
      // coordinate MONDO, mentre il gruppo dell'auto porta una scala e una
      // traslazione sue. Attaccando li' dentro, un numero in metri veniva
      // interpretato in unita' del modello — e nel provino le due ottiche
      // galleggiano a mezz'aria accanto alla vettura.
      //
      // `esterno` ha trasformazione identica, quindi mondo e locale
      // coincidono e i numeri misurati valgono cosi' come sono. E si spegne
      // insieme all'auto quando si entra nell'abitacolo, che e' l'altra cosa
      // che serve.
      this.esterno.add(innesto)
      this.fari.push(innesto)
      /* E LO ZOCCOLO SPARISCE, che sulla vettura di prima non serviva.
         Li' lo zoccolo era un pezzo della carrozzeria — una bolla di vetro
         sopra l'ottica — e bastava mandarlo in fondo alla coda di disegno
         perche' smettesse di nascondere quello che c'era dentro.
         Sulla vettura nuova non e' un pezzo: e' un CUBETTO di riferimento,
         messo nel modello apposta per dire a `innestaFaro` dove sta l'anello e
         quanto e' grande. Ha finito il suo mestiere nell'istante in cui la
         misura e' stata presa, e da li' in poi sarebbe solo una scatola
         conficcata nel muso. */
      ;(zoccolo as Mesh).renderOrder = -1
      zoccolo.visible = false
    }
    // IL CORRIDOIO SI COSTRUISCE DALL'OTTICA DESTRA, quella che si attraversa.
    //
    // Destra e non sinistra perche' l'orbita finisce da quel lato: la camera
    // arriva li' senza dover attraversare il muso, e un avvicinamento che
    // taglia davanti alla vettura per andare dall'altra parte e' un movimento
    // che si nota.
    const dx = this.esterno.getObjectByName('OTTICA_FARO_DX')
    if (dx) {
      const versoMuso = new Vector3()
      dx.getWorldPosition(versoMuso)
      versoMuso.sub(centro)
      versoMuso.y = 0
      this.attraversamento.costruisci(dx, versoMuso)
      this.scena.add(this.attraversamento.gruppo)
      // le luci del corridoio entrano nella scena e non nel gruppo: vedi
      // `Attraversamento.accendi()` per il perche'
      this.scena.add(...this.attraversamento.luci)
      collegaAttraversamento(this.attraversamento)
      console.log('[faro] corridoio pronto: bocca',
        this.attraversamento.bocca.toArray().map((v) => +v.toFixed(2)),
        'raggio', +this.attraversamento.raggio.toFixed(3),
        '-> galleria', +(this.attraversamento.raggio * 2 * SCALA).toFixed(1), 'm')
    }
    console.log('[faro] innestate', this.fari.length, 'ottiche')
  }

  // LA PLANCIA MODELLATA E' STATA TOLTA, e vale la pena dire perche'.
  //
  // Era un GLB da 3,1 MB: la si caricava, le si correggevano i materiali, la
  // si posizionava con uno scarto misurato di 37 cm — e poi `dentro()` la
  // spegneva sempre, in ogni beat, senza eccezioni. Restava a fare peso.
  //
  // A sostituirla e' l'abitacolo fotografico: un piano con una fotografia
  // grandangolare vera e tre maschere (parabrezza, finestrino, quadro). Una
  // plancia modellata regge il confronto con una fotografia solo se e'
  // modellata come si deve, e a quel punto costa piu' di tutto il resto della
  // scena messo insieme. Qui la fotografia c'e' gia' e vince.
  //
  // Cancellato anche `public/modelli/plancia.glb`, se no resta un file che
  // nessuno carica e che al primo che passa sembra ancora servire.
  //
  // Di quella plancia sopravvive un solo numero, e non e' un dettaglio suo:
  // dov'e' seduto chi guida. Serve ancora, perche' e' li' che si accende la
  // chiave. Sta qui sotto con un nome che dice cosa e', non da dove veniva.

  /** girata per portare il muso lungo +X: si trova guardando, una volta */
  /** i tre schermi con i lavori veri nella prima schermata */
  insegne!: Insegne

  /* MEZZO GIRO, perche' l'automobile e' cambiata e guardava dall'altra parte.
     Il modello nuovo esce da Blender con il muso verso +X; quello vecchio ce
     l'aveva verso -X. E' un'informazione che nessuno puo' dedurre dal file —
     dipende da come sono state inquadrate le quattro viste da cui e' nato —
     quindi sta qui, dove si vede, invece che dentro l'asset. */
  rotazioneAuto = Math.PI
  autoVera: Object3D | null = null
  /** il segnale di contatto e rotazione dentro le carenature: vedi «scene/Ruote.ts» */
  private ruote: Ruote | null = null
  misuraAuto: Vector3 | null = null
  autoPronta = false

  fotogramma = () => {
    const ora = performance.now()
    const dt = Math.min((ora - this.ultimo) / 1000, 0.1)
    this.ultimo = ora

    // IL LIVELLO SI ADATTA MISURANDO, con isteresi: si scende dopo tre
    // secondi di sofferenza, si risale solo dopo dieci di agio. Senza
    // isteresi il livello oscilla, e l'oscillazione si vede molto piu' del
    // calo di qualita' che dovrebbe evitare.
    if (this.qualita.aggiorna(dt)) {
      console.log('[qualita] ->', this.qualita.livello,
        this.qualita.millisecondi.toFixed(1), 'ms')
      this.applicaQualita()
    }

    this.scorrimento.aggiorna(dt)
    this.regia.aggiorna(this.scorrimento.morbido)
    // BLOCCO DELLA CAMERA, solo per gli strumenti di misura: permette a
    // `strumenti/faro_vicino.mjs` di mettersi dove vuole senza che la regia
    // gli riprenda il comando al fotogramma dopo.
    if (!(this as any).__bloccaCamera) {
      inquadra(this.camera, this.regia, this.scorrimento.velocita)
      // IL SOGGETTO GIRA, LA CAMERA NO — vedi `transizioni/Camera.ts`.
      //
      // Si ruota il GRUPPO e non la sola vettura: le ottiche dei fari e le
      // ruote costruite sono appese a `esterno` e non all'auto, perche' la
      // loro posa e' stata misurata in coordinate mondo. Girando solo l'auto
      // resterebbero indietro — quattro ruote e due fari fermi a mezz'aria
      // mentre la carrozzeria ruota.
      this.esterno.rotation.y = rotazioneScena
      // IL CORRIDOIO SI RIALLINEA UNA VOLTA, quando il soggetto ha finito di
      // girare. Prima di allora la sua bocca sarebbe misurata su una
      // posizione che sta ancora cambiando; dopo, la posa e' di nuovo ferma.
      // IL CORRIDOIO SI RIALLINEA A OGNI FOTOGRAMMA, non una volta sola.
      //
      // Prima scattava una volta, a meta' del beat `lato`, quando la rotazione
      // del soggetto era finita. Sembrava ragionevole — a rotazione finita il
      // faro sta fermo, quindi una volta basta — e produceva il difetto piu'
      // brutto della spina: fra il 54% e il 72% del beat la camera SALTAVA da
      // z +2,79 a z -1,93. Quasi cinque metri, attraverso l'automobile.
      //
      // Il motivo e' che `lato` non aspetta la fine della rotazione per
      // puntare il faro: ci punta dall'inizio, interpolando verso la posa
      // calcolata sulla bocca. Finche' la bocca era quella vecchia la camera
      // andava verso un faro che non c'era piu'; nell'istante del
      // riallineamento il bersaglio si spostava di due radianti e la camera
      // con lui.
      //
      // Adesso la bocca si ricalcola dalla rotazione corrente a ogni giro di
      // ciclo, quindi non c'e' nessun istante in cui cambia di scatto: la
      // camera insegue un bersaglio che si muove con continuita'. E costa
      // niente, perche' `riallinea` non rimisura piu' la scatola dell'ottica —
      // ruota un punto e una direzione, e se il giro non e' cambiato esce
      // subito.
      if (this.attraversamento.pronto) this.attraversamento.riallinea()
    }

    // LO SCAMBIO. Dentro il beat 'taglio' e oltre il punto misurato,
    // l'esterno si spegne e l'interno si accende. Sono due righe, e tutta
    // la decisione D2 sta nel fatto che accadano mentre il montante copre
    // l'obiettivo: se il momento e' giusto non c'e' niente da vedere.
    // TRE STATI, NON PIU' DUE: fuori, dentro il corridoio, dentro l'abitacolo.
    //
    // Il corridoio e' uno stato a se' perche' e' l'unico in cui non si vede
    // ne' la corte ne' l'abitacolo: si vede una sola cosa, la stessa ottica
    // moltiplicata per duecento. Ed e' proprio il fatto che non si veda
    // nient'altro a rendere lo scambio invisibile — non c'e' un secondo
    // oggetto con cui confrontare la scala.
    // `attraversamento.pronto` NON E' UN DI PIU': senza, la scena puo'
    // restare COMPLETAMENTE VUOTA.
    //
    // Se `auto_parti.glb` o `faro.glb` non sono ancora arrivati — rete lenta,
    // file in errore — il corridoio non e' mai stato costruito e il suo
    // gruppo e' vuoto. Ma la condizione scattava lo stesso e spegneva
    // l'esterno E l'ambiente, mentre l'interno era spento perche' non siamo
    // ancora dentro. Risultato: dal 70% al 75% dello scorrimento si vedeva
    // il nulla.
    //
    // La camera aveva gia' il suo ripiego per questo caso; la visibilita' no.
    // Il difetto non compare mai su questa macchina, dove tutto carica in due
    // secondi — ed e' esattamente il tipo di difetto che si vede solo dagli
    // altri.
    const corridoio = !this.forzaEsterno && this.attraversamento.pronto &&
      this.regia.beat === 'taglio' && dentroCorridoio(this.regia.locale)
    // LO SCAMBIO NELL'ABITACOLO AVVIENE PRIMA DEL CONFINE FRA I DUE TEMPI.
    //
    // Lasciandolo sul confine, il cambio cadeva nel primo fotogramma di
    // `accensione` — e li' il corridoio era gia' sparito, quindi lo scambio
    // era un taglio vero: differenza 58 su una mediana di 3, cioe' venti
    // volte. Si vedeva.
    //
    // A 0,94 del beat `taglio` la camera e' a un passo dall'abside, che
    // riempie tutto il quadro: e' una superficie sola, scura e senza
    // dettaglio. E' la stessa condizione del montante della decisione D2 —
    // quando qualcosa copre l'obiettivo, dietro si puo' cambiare il mondo.
    //
    // La differenza rispetto a D2 e' che qui l'occlusione non e' un trucco
    // costruito apposta: e' il fondo dell'ottica, cioe' il posto dove il
    // percorso doveva arrivare comunque.
    const dentro = this.forzaEsterno
      ? false
      : this.regia.beat === 'accensione' || this.regia.beat === 'velocita' ||
        this.regia.beat === 'contatto' ||
        // 0,98 e non 0,94: a 0,98 le luci del corridoio sono scese al 17% e
        // il fotogramma e' quasi nero. Lo scambio cade li' — nell'unico
        // istante in cui le due immagini, quella che finisce e quella che
        // comincia, sono la stessa cosa: il buio.
        // 0,984: LO SCAMBIO CADE DENTRO IL BIANCO. Lo scambio si fa quando l'iride ha gia' chiuso il
        // fotogramma — cioe' quando non c'e' piu' nessuna forma da confrontare
        // fra il prima e il dopo — non quando la camera e' arrivata in fondo.
        // Gli ultimi otto centesimi e mezzo erano proprio i tre secondi di
        // campo beige.
        (this.regia.beat === 'taglio' && progressoIride(this.regia.locale) >= 0.86)
    this.esterno.visible = !dentro && !corridoio
    this.ambiente.visible = !dentro && !corridoio
    this.attraversamento.gruppo.visible = corridoio
    // il corridoio si accende PRIMA di entrarci: a meta' avvicinamento e'
    // gia' al massimo, cosi' cio' che si intravede attraverso la calotta e'
    // gia' illuminato e lo scambio non porta nessun cambio di luce
    // LE LUCI DEL CORRIDOIO SI ACCENDONO SOLO SULLA SOGLIA.
    //
    // Salivano da `locale = 0,30` e arrivavano al massimo a 0,52, ma lo
    // scambio avviene a 0,625: per un quinto del beat quattro luci vivevano
    // in scena, accese, mentre in campo c'era ancora la corte. E siccome
    // stanno nella scena e non nel gruppo — devono starci, se no cambia il
    // numero di luci e three ricompila ogni materiale — illuminavano il
    // colonnato e la vettura da posizioni che non esistono: la piu' vicina
    // cade sei metri dietro la coda, all'altezza del paraurti, con
    // un'irradianza quaranta volte quella delle gole della corte.
    //
    // Cioe': una chiazza calda accecante dietro l'auto, senza nessuna
    // sorgente visibile. Lo stesso difetto gia' pagato due volte, in
    // `Luci.ts` e in `Corte.ts`, rientrato da una terza porta.
    //
    // Il motivo per cui le accendevo prima — «cosi' cio' che si intravede
    // dentro la calotta e' gia' illuminato» — era sbagliato in partenza:
    // prima dello scambio si intravede l'ottica PICCOLA, e il gruppo grande
    // resta invisibile fino a 0,625. Il beneficio non c'era; il costo si'.
    // LE LUCI SALGONO, POI SI SPENGONO — ed e' la seconda meta' a chiudere
    // l'attraversamento.
    //
    // Salgono appena prima della soglia, perche' cio' che si intravede
    // attraverso la calotta sia gia' illuminato. E scendono nell'ultimo
    // decimo, quando la camera ha ormai superato la lampada: oltre quel punto
    // si e' DIETRO la luce, e la parte finale del riflettore non e'
    // illuminata da niente.
    //
    // Non e' una dissolvenza, e la differenza non e' formale: una dissolvenza
    // e' una decisione presa sull'immagine, questo e' quello che si vedrebbe
    // davvero avanzando dentro un proiettore. E porta esattamente dove serve
    // — nell'abitacolo al buio, che e' il posto da cui un'accensione comincia.
    // anche questa nello spazio ADDOLCITO, come lo scambio: le luci devono
    // salire mentre il corridoio compare, non sei centesimi dopo
    const t = morbido(this.regia.locale)
    const sale = (t - (SCAMBIO_A - 0.03)) / 0.05
    // 0,12 e non 0,10: lo spegnimento deve essere GIA' avvenuto quando
    // avviene lo scambio, non stare ancora avvenendo. Con 0,10 e lo scambio a
    // 0,94 le luci erano ancora al 59% — e il cambio di mondo e' caduto su
    // un'immagine ancora illuminata, con una differenza di 54 contro una
    // mediana di 4.
    // 0,25 e non 0,12, e il numero l'ha deciso la misura del passo di prova.
    //
    // Il misuratore campiona il beat ogni cinque centesimi: con una discesa
    // lunga 0,12 il campione precedente allo scambio trovava il corridoio
    // ancora al 49%, e il salto sul nero dell'abitacolo valeva 49 contro una
    // mediana di 4. Con 0,25 lo stesso campione lo trova al 24% e quello
    // dello scambio al 6% — cioe' praticamente lo stesso valore
    // dell'abitacolo spento, che parte da 5%.
    //
    // Non e' tarare per far contento lo strumento: e' che lo strumento
    // misura esattamente cio' che l'occhio nota, un salto di luminanza fra
    // due fotogrammi vicini.
    /* LE LUCI DEL CORRIDOIO RESTANO ACCESE PIU' A LUNGO.
       Scendevano da tre quarti del beat, cioe' cominciavano a spegnersi prima
       che il disco della strada nascesse: fra le due cose restava una finestra
       di buio, ed e' il difetto che il committente ha continuato a leggere
       come «questo finisce e poi parte quello».
       Adesso calano nell'ultimo decimo, quando il disco ha gia' preso mezzo
       fotogramma: gli anelli si spengono DIETRO la strada, non prima di lei. */
    /* LE LUCI SCENDONO ANCORA PIU' TARDI: dall'ultimo sesto e non dall'ultimo
       quarto. Nel provino fitto si vede il difetto che resta: mentre il disco
       della strada cresce, il corridoio intorno e' gia' quasi nero, e cosi' il
       passaggio si legge lo stesso come «finisce una cosa, comincia l'altra»
       anche se la curva di luminanza e' continua.
       Quello che il committente chiede e' che per qualche fotogramma siano
       contemporaneamente in campo gli ultimi anelli E le prime righe della
       carreggiata. Con 0,26 le coste erano al 58% a meta strada; con 0,21 ci
       arrivano al 75, e restano visibili fin quando la strada si e' presa due
       terzi del fotogramma. Adesso si puo' fare, perche' lo stroboscopio non
       c'e' piu': prima tenerle accese piu' a lungo voleva dire tenere acceso
       piu' a lungo anche il lampeggio. */
    const scende = (1 - t) / 0.21
    this.attraversamento.accendi(
      this.regia.beat === 'taglio' ? Math.min(sale, scende) : corridoio ? 1 : 0,
    )
    // LA PLANCIA GENERATA SI SPEGNE, il gruppo `interno` resta.
    //
    // Sono due cose diverse dentro lo stesso gruppo: la GEOMETRIA della
    // plancia, che la fotografia sostituisce, e l'ACCENSIONE, che e' luce e
    // deve continuare a rispondere allo scorrimento. Spegnere il gruppo
    // intero spegnerebbe anche quella.
    //
    // E la plancia va spenta davvero, non lasciata dietro: sta a poco piu' di
    // un metro dagli occhi, cioe' DIETRO il piano fotografico ma DAVANTI alla
    // lastra della strada. Lasciandola accesa non si vedrebbe — tranne che
    // attraverso il buco del parabrezza, dove comparirebbe al posto della
    // strada.
    this.interno.visible = dentro
    this.abitacolo.mesh.visible = dentro
    this.lastra.mesh.visible = dentro

    // LA STRADA PARTE SOLO NEL SUO BEAT, e si ferma tornando indietro.
    // Non e' un dettaglio di pulizia: senza, chi risale lo scorrimento si
    // ritrova la strada che corre dietro un'auto ferma, ed e' la cosa che
    // piu' in fretta smaschera che fuori c'e' un filmato.
    /* IL FINALE — quanto e' avanti la chiusura, da 0 a 1.
     *
     * Si legge dal beat `contatto` e si passa alla strada PRIMA di
     * `aggiorna`, perche' e' la strada stessa a usarlo per togliere energia
     * all'ingresso: nel finale non e' l'automobile a frenare, e' lo spazio a
     * fermarsi.
     *
     * `morbido` e non il grezzo, e per una volta la ragione non e' estetica:
     * questo valore comanda insieme lo spegnimento del mondo, il restringersi
     * della riga e la comparsa del documento sopra di lei. Se le tre cose
     * usassero curve diverse, il momento in cui la riga di WebGL e quella del
     * documento si sovrappongono non cadrebbe piu' dove e' stato tarato — ed
     * e' esattamente il difetto gia' pagato sull'iride, dove le due estremita'
     * della stessa transizione vivevano in due spazi di progresso diversi.
     */
    this.finale = this.regia.beat === 'contatto' ? morbido(this.regia.locale) : 0
    /* IL GREZZO, E SERVE PER LA TERZA VOLTA IN QUESTO PROGETTO.
     *
     * `finale` e' addolcito, e va bene per quello che fa: abbassare la luce,
     * spegnere il cruscotto, chiudere il campo visivo. Sono tutte cose che
     * devono muoversi come una camera.
     *
     * La REGIA del controllo no. I suoi nove atti sono un copione — a 0,30 il
     * cruscotto si spegne, a 0,50 arriva la parola, a 0,82 l'esito — e in
     * spazio addolcito quelle soglie non cadono dove sembrano: `morbido(0,85)`
     * vale 0,94, quindi gli ultimi tre atti si schiacciavano nell'ultimo
     * cinque per cento dello scorrimento. Nel provino «TUTTO IN REGOLA» non si
     * vedeva proprio: passava in due fotogrammi.
     *
     * E' esattamente il difetto del capitolo 17.4 — due numeri per lo stesso
     * istante, tutti e due chiamati «progresso» — rientrato da una porta nuova.
     * La cura e' la stessa: dichiarare quale spazio usa chi, e non mescolarli.
     */
    this.finaleGrezzo = this.regia.beat === 'contatto' ? this.regia.locale : 0
    /* IL FINALE SI SCRIVE SULLA STRADA SOLO QUANDO CAMBIA, e solo con il
     * movimento ridotto. Non e' un'ottimizzazione: e' l'unico modo di fermare
     * il lampeggiante senza mettere le mani in `scene/Lastra.ts`.
     *
     * Dentro quel setter c'e' l'unico orologio dichiarato del progetto — «una
     * pattuglia lampeggia anche se ci si ferma, anzi soprattutto se ci si
     * ferma» — e l'argomento e' giusto per chi il movimento lo vuole. Per chi
     * ha chiesto di non riceverne, un blu e un rosso che sbattono due volte al
     * secondo su tutto il fotogramma sono la cosa peggiore che questa pagina
     * possa fare: e' moto puro, non richiesto, ad alto contrasto.
     *
     * `finale` e' una funzione dello scorrimento. Se lo scorrimento sta fermo
     * il valore non cambia, quindi non riscriverlo non toglie NIENTE — l'unico
     * effetto di riscriverlo sarebbe far avanzare quell'orologio. Appena si
     * scorre di nuovo il valore cambia, il setter gira, e la strada si
     * riallinea nello stesso fotogramma.
     *
     * Il lampeggiante resta congelato sul valore che aveva, che puo' essere
     * acceso o spento: e' una pattuglia con la barra accesa, non una pattuglia
     * che sbatte. */
    if (!RIDOTTO || this.finale !== this.finaleScritto) {
      this.finaleScritto = this.finale
      this.lastra.finale = this.finale
    }
    /* LA PATTUGLIA PRENDE IL BATTITO DALLA STRADA, non da un orologio suo.
       La luce che getta sulla carreggiata la disegna lo shader, quella che
       cade sulla carrozzeria la fanno due sorgenti: se battessero su due
       orologi separati si sfaserebbero, e uno sfasamento di un fotogramma su
       un lampeggiante si vede benissimo. */
    const doc = this.controllo?.aggiorna(this.finaleGrezzo) ?? 0
    // la luce della pattuglia entra anche nella pagina, e batte sullo stesso
    // orologio di tutte le altre: vedi `ui/Controllo.ts`, `illumina`
    // l'inviluppo del lampeggiante lo decide `ui/Controllo.ts`, che e' dove
    // stanno tutti gli altri tempi del finale: qui c'era una rampa che saliva
    // e non scendeva piu'
    this.controllo?.illumina(this.lastra.lampo, this.controllo.lampeggiante(this.finaleGrezzo))
    /* IL PANNELLO DELLE CREDENZIALI SI ABBASSA QUANDO ARRIVA LA DOMANDA.
       Non sparisce: e' la premessa di la prossima riga e senza di lui quella
       domanda perderebbe il suo antecedente. Ma cala al trenta per cento,
       perche' nell'ultimo fotogramma deve vincere il contatto — e finche' resta
       a piena forza il fotogramma sta chiedendo due cose insieme.
       Si abbassa il MOLTIPLICATORE del materiale, non l'opacita': il pannello
       e' additivo sul vetro, e la sua forza e' quel numero. */
    this.quadro.documenti = doc
    this.quadro.velo = 1 - 0.70 * (this.controllo?.ritiro(this.finaleGrezzo) ?? 0)
    this.quadro.spegnimento = this.controllo?.perdita(this.finaleGrezzo) ?? 0
    this.quadro.lavoroScelto = this.controllo?.quale ?? 0
    this.vetrina.scegli(this.controllo?.quale ?? 0)
    this.vetrina.aggiorna(
      doc, this.camera, dt,
      this.controllo?.ritiro(this.finaleGrezzo) ?? 0,
      this.controllo?.timbro(this.finaleGrezzo) ?? 0,
    )
    this.insegne.aggiorna(this.regia, dt, this.camera.aspect)
    this.volante.aggiorna(
      this.finaleGrezzo, this.lastra.lampo, GUIDA_MONDO,
      this.controllo?.viaLibera ?? false,
      // e le due luci vere si spengono con lo stesso inviluppo del bordo: se
      // il fotogramma smette di pulsare ma i lampeggianti no, si vede
      this.controllo?.lampeggiante(this.finaleGrezzo) ?? 1,
    )
    if (this.finale > 0) {
      this.dichiaraOrizzonte()
      this.dichiaraQuadro()
    }
    /* LA STRADA SI FERMA QUANDO LA PATTUGLIA SI E' MESSA DAVANTI.
       Non prima — durante tutta la manovra si sta ancora andando, ed e' il
       sorpasso a doversi sentire — e non dopo: quando arriva la parola
       DOCUMENTI si e' gia' fermi da un secondo. Il freno segue il progresso
       GREZZO, come tutto il resto della regia del controllo, se no la parte
       finale si comprime e la frenata diventa un fermo immagine. */
    /* E LA STRADA COMINCIA A SCORRERE GIA' NELL'ACCENSIONE.
       Prima partiva solo al beat `velocita`: si entrava nell'abitacolo, e per
       tutto un tempo si guardava una strada FERMA da dentro un'automobile con
       il motore appena acceso. «La strada all'inizio resta ferma», ed e' vero.
       Non e' che fosse sbagliato di logica — il motore si accende e poi si
       parte — ma di ritmo: quel tempo dura otto centesimi di pagina, e otto
       centesimi di immobilita' subito dopo il momento migliore del sito sono
       un buco, non una pausa.
       Adesso si muove dalla meta' dell'accensione in avanti, con una rampa: e'
       una partenza, non un interruttore. E si riusa il freno al contrario —
       la stessa manopola che ferma la vettura davanti alla pattuglia — invece
       di aggiungerne una seconda che faccia la stessa cosa. */
    const inAvvio = this.regia.beat === 'accensione'
    const rampa = inAvvio
      ? Math.min(Math.max((this.regia.locale - 0.34) / 0.50, 0), 1)
      : 1
    /* IL MOVIMENTO RIDOTTO TOGLIE LA CROCIERA, NON LA STRADA.
     *
     * COS'E' DAVVERO QUESTA STRADA, e la prima meta' di questo commento era ed
     * e' giusta. `avanzamento` e' un INTEGRALE DEL TEMPO: ogni fotogramma somma
     * `andatura * dt`. Lo scorrimento entra come ACCELERATORE — decide quanto si
     * va forte — non come posizione. Quindi a mano ferma la carreggiata
     * continuava a correre alla velocita' di crociera, ed era l'unico oggetto
     * del sito che si muove a schermo pieno senza che nessuno stia facendo
     * niente. Chiunque abbia il disturbo per cui questa preferenza esiste, e'
     * quella la cosa che lo fa star male. Va tolta, e resta tolta.
     *
     * QUELLO CHE MANCAVA. Insieme alla crociera erano stati tolti anche il
     * comando e la strada: `acceso: false`, `velocita: 0`, `freno: 1`, e per
     * sicurezza un `andatura = 0` scritto a mano subito dopo. Quattro
     * interruttori per spegnere una cosa sola.
     *
     * Il risultato l'ha visto il committente prima di qualunque strumento: «la
     * strada non si muove, non e' un problema di processi, non si muove neanche
     * a scatti». Misurato: con `reduce`, su duecento fotogrammi di scorrimento
     * CONTINUO, l'avanzamento faceva ZERO metri; senza la preferenza, 193.
     *
     * E nessuno dei miei strumenti l'aveva mai visto, perche' Playwright parte
     * con la preferenza spenta: misuravo sempre l'altra meta' del mondo.
     *
     * PERCHE' QUESTA NON E' LA COSA CHE ERA STATA SCARTATA. Questo commento
     * conteneva gia' l'idea di legare la strada allo scorrimento, e la
     * scartava per una ragione buona: «quel legame vuole un numero — quanti
     * metri di asfalto per un giro di rotella — e quel numero non si ricava da
     * niente di misurato. Inventarlo vorrebbe dire mettere in scena una
     * velocita' finta». Vero, e vale ancora.
     *
     * Ma quella era un'altra cosa: legare l'AVANZAMENTO alla POSIZIONE dello
     * scorrimento, cioe' una strada che torna indietro se si risale. Qui
     * l'avanzamento resta l'integrale del tempo che e' sempre stato, e la
     * velocita' esce dalla stessa formula di sempre — `spinta` letta da
     * `scorrimento.velocita`, la stessa riga che governa la strada normale.
     * Cade solo il termine costante. Non c'e' nessun numero nuovo da inventare:
     * ce n'e' uno vecchio messo a zero.
     *
     * COSA RICEVE ADESSO CHI HA LA PREFERENZA ACCESA. Una strada che si muove
     * mentre muove il dito e che si ferma quando lo alza — dentro `Lastra` le
     * code di salita e discesa scendono a un decimo di secondo apposta. Cioe'
     * movimento COMANDATO, che secondo `core/Moto.ts` non e' quello che la
     * preferenza chiede di togliere: «su questa pagina l'accelerazione non e'
     * un'animazione che parte da sola, e' la cosa che fa chi guarda».
     *
     * FERMA NON VUOL DIRE SPARITA, diceva la vecchia versione, e su questo
     * aveva torto: un tempo che si chiama `velocita`, sotto un titolo che dice
     * «piu' forte scorri, piu' forte va», con la carreggiata inchiodata, non e'
     * una fotografia invece di una ripresa. E' una promessa che non si mantiene.
     */
    this.lastra.aggiorna(
      inAvvio || this.regia.beat === 'velocita' || this.regia.beat === 'contatto',
      this.scorrimento.velocita,
      Math.max(this.controllo?.frenata(this.finaleGrezzo) ?? 0, 1 - rampa),
    )
    /* L'AZZERAMENTO A MANO NON C'E' PIU', e la ragione per cui c'era resta
       giusta: frenando, `Lastra` porta l'andatura a zero con una costante di
       tempo di un secondo e mezzo, e un secondo e mezzo di decelerazione dopo
       che la mano si e' fermata e' movimento che continua da solo — piccolo,
       ma autonomo, ed e' esattamente cio' che la preferenza chiede di togliere.
       Quello che non andava era il RIMEDIO. `andatura = 0` a ogni fotogramma
       non accorcia l'inerzia: impedisce alla strada di muoversi del tutto,
       anche mentre il dito la sta spingendo. Curava l'inerzia spegnendo il
       motore.
       La cura sta adesso dentro `scene/Lastra.ts`, dove la costante di tempo
       scende a un decimo di secondo con la preferenza accesa: la coda si
       accorcia, e la strada si ferma quando si smette di scorrere invece che
       un secondo e mezzo dopo. Ed e' il posto giusto — la vecchia nota diceva
       che quel file «e' in mano a qualcun altro in questa passata», che era una
       ragione di calendario, non di progetto. */

    // l'accensione attraversa il confine fra due beat, quindi legge il
    // progresso globale e non quello locale
    if (dentro) this.accensione.aggiorna(this.regia)
    // DOPO `inquadra`, sempre: se il piano leggesse la camera del fotogramma
    // precedente, nel beat 'velocita' — dove la camera ha una
    // micro-vibrazione — l'abitacolo tremerebbe scollato di un fotogramma, e
    // quello si vede.
    if (dentro) this.abitacolo.aggiorna(this.camera)
    // IL QUADRO SEGUE IL RIQUADRO CHE LA FOTOGRAFIA DICHIARA.
    //
    // Non ha coordinate proprie: e' l'abitacolo a sapere dove cade il suo
    // quadro, perche' dipende dall'inquadratura e dal formato dello schermo —
    // su un telefono la fotografia si ritaglia, e il quadro deve ritagliarsi
    // con lei. Chiederglielo a ogni fotogramma costa quattro moltiplicazioni
    // e toglie di mezzo un'intera categoria di disallineamenti.
    if (dentro) {
      const r = this.abitacolo.riquadroQuadro(this.camera)
      /* E QUANTO IL QUADRO SI RITIRA lo decide il capitolo, non un orologio.
         Pieno in `accensione`, dove il quadro e' il soggetto e si sta
         accendendo; ritirato in `velocita`, dove il soggetto e' la strada;
         e di nuovo pieno in `contatto`, perche' li' la pattuglia legge quel
         pannello — e' il DOCUMENTO, non piu' uno strumento di bordo.
         Le due rampe sono dentro `velocita` e non sul confine fra i beat: un
         pannello che cambia misura nell'istante esatto in cui cambia capitolo
         si legge come un taglio di montaggio, non come una cosa che si muove. */
      const dentroVeloce = this.regia.beat === 'velocita'
      /* E NEL FINALE SI RITIRA UN PO' ANCHE LUI — misurato, non deciso.
         La nota qui sopra dice «di nuovo pieno in `contatto`, perche' li' la
         pattuglia legge quel pannello», e resta vera come intenzione. Ma
         `strumenti/finale_livelli.mjs` ha contato quanto si accavallano
         davvero il carosello e il pannello in quel momento: NOVECENTOQUARANTUNO
         per DUECENTOSESSANTAQUATTRO pixel. Un pannello grande che sta sotto una
         carta grande non e' un pannello grande: e' un pannello coperto, e nel
         provino sopra ci si leggevano tre livelli di testo insieme — che e'
         esattamente cio' che una revisione esterna ha bocciato su Design e
         Usabilita' insieme, cioe' sul settanta per cento del voto.
         Il ritiro qui non lo rimpicciolisce e basta: `posiziona` tiene fermo il
         BORDO INFERIORE, quindi togliere altezza fa scendere il bordo alto —
         ed e' proprio il bordo alto quello che finiva sotto la carta. */
      const arretra = dentroVeloce
        ? Math.min(this.regia.locale / 0.14, 1) * Math.min((1 - this.regia.locale) / 0.12, 1)
        : this.regia.beat === 'contatto'
          ? 0.55 * Math.min(Math.max((this.regia.locale - 0.52) / 0.18, 0), 1)
          : 0
      this.quadro.posiziona(r, this.camera.position, arretra)
      // la palpebra legge lo STESSO riquadro: e' l'unica garanzia che non si
      // possano disallineare, qualunque cosa succeda al formato dello schermo
      this.palpebra.posiziona(r, this.camera.position)
      // L'AVVIO SI LEGGE DAL PROGRESSO GLOBALE, non dal beat: l'accensione
      // comincia dentro `accensione` e la guida prosegue in `velocita`, e il
      // quadro non deve accorgersi del confine fra i due.
      // riscalato insieme agli intervalli di `scene/Accensione.ts`: era
      // (globale - 0,775) / 0,09, cioe' da 0,775 a 0,865 nella vecchia scala
      /* IL QUADRO SI ACCENDE PRIMA, e la ragione e' un fotogramma che il
         committente ha fotografato: si e' appena entrati nell'abitacolo, la
         strada scorre davanti, e sotto c'e' un rettangolo scuro vuoto con la
         cornice accesa. «C'e' tutto ma non c'e' il quadro, ci deve essere.»
         Ha ragione. La sequenza di accensione — autotest, spie che si spengono
         a scaglioni, minimo irregolare — e' bella e ha senso, ma comincia a
         0,665 di progresso globale mentre nell'abitacolo si entra a 0,645.
         Restano venti millesimi in cui il pannello e' acceso e non dice niente,
         e un pannello acceso e vuoto non si legge come «sta partendo»: si legge
         come «e' rotto».
         Adesso comincia con l'abitacolo e ci mette meno ad arrivare a regime. */
      const avvio = (this.regia.globale - 0.648) / 0.058
      // L'ABITACOLO ARRIVA AL BUIO E SI ACCENDE.
      //
      // E' insieme la cosa giusta da raccontare e la correzione di uno stacco
      // misurato. Alla fine dell'attraversamento il corridoio e' quasi nero —
      // si e' passata la lampada e dietro non c'e' niente che illumini — e
      // l'abitacolo entrava in scena con la sua fotografia a piena
      // esposizione: differenza 45 su una mediana di 20.
      //
      // Ma soprattutto: si arriva dentro un'automobile SPENTA. Che sia buia
      // non e' un espediente per nascondere un cambio — e' l'unico stato in
      // cui ha senso trovarla, ed e' anche il solo da cui un'accensione possa
      // cominciare. Se fosse gia' illuminata, il beat successivo non avrebbe
      // niente da fare.
      //
      // 0,05 di partenza e non zero: un'automobile ferma di notte non e' nera
      // dentro, riceve la luce di cio' che le sta intorno. Zero sarebbe un
      // fotogramma vuoto, e un fotogramma vuoto e' esattamente cio' che
      // questo progetto ha giurato di non fare.
      // ARRIVA A 1,45 E NON A 1, e il motivo e' cambiata la fotografia.
      //
      // La vecchia aveva un parabrezza chiarissimo e una plancia nera: esposta
      // a uno, il vetro era giusto e sotto non c'era niente da perdere. La
      // nuova ha una plancia VERA, con la grana della pelle e la trama del
      // carbonio a luminanza 33-40 su 255 — che in luce lineare fa 0,016, cioe'
      // praticamente zero. Esposta a uno, tutto quel dettaglio cade sotto la
      // soglia in cui uno schermo lo puo' mostrare, e la plancia torna a essere
      // la stessa macchia nera di prima: il lavoro di rifare la fotografia
      // andrebbe perso in una moltiplicazione.
      //
      // 1,45 alza tutto di mezzo diaframma. Il parabrezza non brucia perche' la
      // sua parte piu' chiara sta a 112 su 255 e ha margine; la plancia sale
      // dove si vede. E' il classico caso in cui il numero giusto dipende
      // dall'immagine e non dalla scena — e infatti e' cambiato quando e'
      // cambiata l'immagine.
      /* IL FINALE ABBASSA, NON SPEGNE.
       *
       * Prima questo fattore scendeva a zero: l'abitacolo, il quadro e la
       * luce sulla strada sparivano del tutto, e negli ultimi due terzi del
       * beat sullo schermo restava un nero con una riga. Non era la specifica
       * letta male una volta sola — era la stessa lettura sbagliata che c'era
       * nello shader della strada, e le due si sommavano.
       *
       * Adesso il minimo e' 0,30. Il cruscotto resta acceso e leggibile, il
       * volante resta un volante, e la domanda arriva SOPRA un abitacolo in
       * movimento invece che sopra il vuoto. Il fotogramma finale continua a
       * essere una scena in tre dimensioni calcolata mentre la si guarda, che
       * e' l'unica cosa che questo sito ha da dimostrare — e sarebbe assurdo
       * smettere di dimostrarla proprio nell'ultima schermata, che e' quella
       * che si ricorda.
       *
       * Quello che si abbassa serve ancora: senza, la riga all'orizzonte non
       * avrebbe niente da cui staccarsi. */
      const spegni = 1 - lisciato(this.finale, 0.05, 0.50) * 0.70
      this.abitacolo.esposizione =
        (0.26 + 0.74 * Math.min(Math.max(avvio / 0.34, 0), 1)) * 1.45 * spegni
      /* E LA CABINA RICEVE LA LUCE DEL QUADRO, che e' l'unica sorgente che
         quella scena abbia. Segue `avvio` e non l'esposizione: la luce esiste
         da quando il pannello si accende, non da quando la fotografia compare
         — e infatti prima dell'accensione questo numero e' zero e la corona
         del volante resta la sagoma che deve essere. */
      this.abitacolo.luceQuadro = Math.min(Math.max(avvio, 0), 1) * spegni
      // il quadro e' additivo: l'opacita' del materiale ne scala il contributo
      // senza obbligare a ridisegnare la tela — che nel finale sarebbe
      // l'unica cosa a costare qualcosa
      ;(this.quadro.mesh.material as unknown as { opacity: number }).opacity = spegni
      // E LA STRADA CON LUI. Il mondo fuori dal parabrezza entra in scena con
      // la stessa rampa: arrivando dal corridoio spento, una strada gia'
      // illuminata era l'ultima cosa che restava a fare lo stacco — differenza
      // 49 con l'abitacolo gia' scurito.
      //
      // Ed e' l'occhio che si abitua, non un effetto: si e' appena usciti da
      // un'ottica buia. Chiunque abbia guidato di notte sa che il primo
      // istante fuori da una galleria non si vede niente.
      // parte da 0,26 come dentro l'iride: se ricominciasse da 0,04 il
      // fotogramma dopo lo scambio sarebbe piu' scuro di quello prima, e un
      // gradino all'ingiu' si vede come uno all'insu'
      const luceFuori = (0.26 + 0.74 * Math.min(Math.max(avvio / 0.34, 0), 1)) * spegni
      this.lastra.luce(luceFuori)

      /*
       * LA SCRITTA CHE ARRIVAVA DALLA STRADA E' STATA TOLTA, e il giro merita
       * di restare scritto perche' e' finito dove non pensavo.
       *
       * L'idea era del committente ed era buona: nei due tempi interni il testo
       * non sta di lato, arriva dal mondo insieme alla strada. E' l'unico punto
       * del sito in cui una frase puo' AVVICINARSI.
       *
       * Primo tentativo: dipinta sull'asfalto come segnaletica, stessa vernice
       * e stessa prospettiva. Tecnicamente corretto e illeggibile — una scritta
       * a terra vista da un'automobile bassa si schiaccia contro l'orizzonte.
       *
       * Secondo: un piano coricato all'indietro che viene addosso, come il
       * titolo di Guerre stellari. Leggibile, e l'effetto c'era. Poi il
       * committente l'ha guardato e ha detto che non gli piace.
       *
       * E va bene cosi'. Un effetto che funziona tecnicamente ma non piace a
       * chi deve metterci la faccia e' un effetto che non funziona: sono due
       * tentativi buttati e una cosa imparata, che e' il prezzo normale di
       * un'idea provata sul serio invece che discussa. Il testo di questi due
       * tempi torna dove sta quello di tutti gli altri.
       *
       * `scene/Scritta.ts` resta nel progetto, scollegato: il meccanismo — un
       * piano ancorato all'obiettivo, la distanza finale ricavata dal campo
       * visivo perche' la misura apparente non dipenda dalla finestra — e'
       * corretto e il giorno che serva un testo nello spazio e' gia' fatto.
       */
      /* I NUMERI VERI ARRIVANO DA QUI, e vanno passati PRIMA di `aggiorna`
         perche' e' li' dentro che si decide se ridisegnare.
         `renderer.info.render` si azzera a ogni fotogramma e va letto DOPO
         l'ultima passata: qui siamo all'inizio del giro successivo, quindi
         i conteggi sono quelli del fotogramma appena finito — che e'
         esattamente quello che va mostrato. */
      const inf = this.renderer.info.render
      this.quadro.misura(this.qualita.tempoMedio, inf.calls, inf.triangles)
      // dove si e' nel percorso: lo sa la regia, e il pannello lo mostra al
      // posto dei fotogrammi al secondo — vedi il commento in testa a `scena()`
      const iBeat = CONFINI.findIndex(([b]) => b === this.regia.beat)
      this.quadro.scenaNumero = iBeat + 1
      this.quadro.scenaTotale = CONFINI.length
      this.quadro.scenaNome = NOMI_SCENA[this.regia.beat] ?? ''
      /* IL GUADAGNO SALE DA 3 A 9, e la ragione e' che il tachimetro non si
       * leggeva.
       *
       * Con tre, uno scorrimento normale dava una spinta di 0,07 e il
       * tachimetro segnava venticinque all'ora. Su un sito che si chiama
       * VELOCITY, in un tempo che si chiama CORSA, mentre visivamente si sta
       * raccontando un'accelerazione — l'ha notato il committente, ed e' una
       * contraddizione fra quello che si vede e quello che lo strumento dice.
       *
       * Non e' un numero gonfiato: e' la conversione fra due grandezze che non
       * hanno niente in comune. Quanto vale «forte» per uno scorrimento non lo
       * decide la fisica, lo decide chi progetta — e a nove, uno scorrimento
       * deciso porta il fondoscala, uno tranquillo sta intorno ai centoventi.
       */
      const spinta = Math.min(this.scorrimento.velocita * 9.0, 1)
      /* DOVE SIAMO NEL RACCONTO — sette tempi, e il quadro non lo sapeva.
         I confini arrivano da `Regia.CONFINI`, che e' la stessa tabella che
         decide i beat: scriverne una copia nel quadro vorrebbe dire che al
         prossimo ritocco della regia il cruscotto indicherebbe un film
         diverso da quello che si sta guardando. */
      this.quadro.stato(
        CONFINI.findIndex(([b]) => b === this.regia.beat),
        CONFINI.map(([, f]) => f),
        this.regia.globale,
      )
      this.quadro.aggiorna(avvio, spinta, dt)
      // le ruote girano sulla STESSA spinta del tachimetro, non su un
      // numero loro: sono la prova visiva della cifra che il quadro mostra
      /* E CON IL MOVIMENTO RIDOTTO NON GIRANO. Anche loro sono un integrale
         del tempo — `angolo += velocita * dt * 14` — quindi seguono la sorte
         della strada: ferma la carreggiata, delle ruote che continuano a
         girare sarebbero anche un errore di continuita'. Restano dove sono,
         con i cerchi e le gomme al loro posto. */
      if (!RIDOTTO) this.ruote?.aggiorna(spinta, dt)
      // LA PALPEBRA RESTA SPENTA finche' il quadro sta sul parabrezza: una
      // cornice in pelle intorno a una proiezione su un vetro e' un
      // controsenso — la palpebra esiste per incassare uno schermo dentro un
      // cruscotto, e qui non c'e' nessun cruscotto sotto. Il codice resta
      // (`scene/Palpebra.ts`) perche' il giorno in cui la fotografia
      // dell'abitacolo sara' scattata dal posto di guida, il quadro torna al
      // posto suo e la palpebra con lui.
      this.palpebra.accendi(0)
    } else {
      this.quadro.mesh.visible = false
      this.palpebra.accendi(0)
    }

    // IL RIFLESSO SI SPEGNE DENTRO L'ABITACOLO.
    //
    // Li' il pavimento non e' in campo, e una passata di rendering in piu'
    // su un fotogramma che non la usa e' il modo piu' stupido di perdere
    // fotogrammi al secondo — proprio nel tratto in cui la scena e' piu'
    // carica, perche' c'e' il filmato della strada che decodifica.
    this.riflesso.attivo = this.qualita.impostazioni.riflesso && !dentro && !corridoio
    // il piano della piattaforma segue: lo specchio e il riflesso sono la
    // stessa immagine, e devono accendersi e spegnersi insieme
    this.specchioPiattaforma(this.riflesso.attivo)
    this.riflesso.aggiorna(this.renderer, this.scena, this.camera)
    if (this.grado) {
      /* LA GRANA SI FERMA, MA RESTA — ed e' l'esempio che spiega tutto il
         capitolo meglio di qualunque frase.
         `tempo` non muove niente nella scena: entra in `post/Grado.ts` dentro
         un `floor(tempo * 24.0)`, cioe' RISEMINA il fiocco di pellicola
         ventiquattro volte al secondo. E' l'unica cosa del sito che si muove
         su OGNI PIXEL del fotogramma anche quando la pagina e' immobile: da
         sola vale piu' differenza fra due fotogrammi di tutto il resto messo
         insieme, ed e' il primo movimento che un misuratore trova.
         Congelandola a zero il fotogramma non perde la grana: la conserva
         identica, con la stessa densita' e lo stesso peso sulle basse luci —
         diventa una texture invece di uno sfarfallio. Cioe' esattamente cio'
         che la preferenza chiede: la stessa immagine, senza il movimento. */
      this.grado.uniforms.tempo.value = RIDOTTO ? 0 : ora * 0.001
      // IL FONDO SOTTO IL TESTO: quattro numeri gia' misurati da `ui/Voci.ts`,
      // nessuna lettura di impaginazione dentro il ciclo di disegno
      const r = RIQUADRO_TESTO
      this.grado.uniforms.testo.value.set(r.x0, r.y0, r.x1, r.y1)
      this.grado.uniforms.veloTesto.value = r.forza * FORZA_VELO_TESTO
    }

    /* I CONTEGGI SI AZZERANO QUI, A MANO, E NON A OGNI PASSATA.
     *
     * `renderer.info.render` di serie si azzera all'inizio di ogni `render()`.
     * Con una catena di effetti le passate sono quattro o cinque — scena,
     * soglia del bagliore, due sfocature, composizione — e l'ultima e' un
     * rettangolo a pieno schermo. Il risultato e' che il quadro leggeva
     * «DISEGNO 1 / TRIANGOLI 1»: i numeri dell'ultimo quadrilatero, non quelli
     * della scena.
     *
     * Spegnendo l'azzeramento automatico e azzerando UNA VOLTA prima di tutta
     * la catena, i conteggi si sommano su tutte le passate — che e' la
     * grandezza vera: quante volte la scheda e' stata chiamata per costruire
     * questo fotogramma. */
    /**
     * LA PASSATA DELL'IRIDE — il mondo che arriva, disegnato prima di quello
     * che sta finendo.
     *
     * COME FUNZIONA. Si nasconde tutto cio' che appartiene al fuori, si mostra
     * l'interno, lo si disegna nel bersaglio con la sua camera, e si rimette
     * tutto com'era. Il disco dell'iride poi lo campiona in coordinate
     * schermo, e quello che si vede nel buco e' esattamente quello che si
     * vedrebbe se il corridoio non ci fosse.
     *
     * QUANTO COSTA. Una passata di scena in piu' a un quarto dei pixel, per
     * circa un secondo di sito — la finestra dell'iride, da 0,905 a 0,995 del
     * beat `taglio`. Fuori da quella finestra questo blocco non fa niente,
     * nemmeno un confronto in piu' del necessario.
     *
     * IL SALVA/RIPRISTINA E' QUELLO DI `scene/Riflesso.ts`, che e' l'unico
     * altro posto del progetto in cui si disegna fuori dalla catena. Copiarlo
     * invece di reinventarlo vuol dire anche ereditarne le correzioni: fu li'
     * che si scopri' che senza rimettere `autoClear` il fotogramma successivo
     * non si puliva.
     */
    const qIride = this.regia.beat === 'taglio' ? progressoIride(this.regia.locale) : 0
    if (qIride > 0.001 && qIride < 0.999) {
      const eraEsterno = this.esterno.visible
      const eraAmbiente = this.ambiente.visible
      const eraCorridoio = this.attraversamento.gruppo.visible
      const eraInterno = this.interno.visible
      const eraAbitacolo = this.abitacolo.mesh.visible
      const eraLastra = this.lastra.mesh.visible
      const eraQuadro = this.quadro.mesh.visible

      this.esterno.visible = false
      this.ambiente.visible = false
      this.attraversamento.gruppo.visible = false
      this.interno.visible = true
      this.abitacolo.mesh.visible = true
      this.lastra.mesh.visible = true
      this.quadro.mesh.visible = false

      // la camera del mondo che arriva: la stessa posa che avra' un istante
      // dopo, quando l'interno sara' la scena e non piu' il contenuto di un buco
      this.cameraIride.position.copy(POSE.occhi)
      this.cameraIride.lookAt(MIRA_AVANTI)
      this.cameraIride.updateMatrixWorld()
      this.abitacolo.aggiorna(this.cameraIride)
      /* L'ESPOSIZIONE E' QUELLA DEL PRIMO FOTOGRAMMA DELL'INTERNO, e non
       * quella a regime.
       *
       * Nel primo provino dentro l'iride si vedeva la strada a piena luce, e
       * un istante dopo lo scambio il fotogramma diventava buio. Era il
       * difetto peggiore possibile per una transizione che esiste per non
       * avere stacchi: il mondo nuovo si mostrava com'e' a regime invece di
       * come sara' quando lo si guardera' davvero.
       *
       * L'interno comincia quasi al buio, ed e' voluto — si arriva da
       * un'ottica spenta e l'occhio si abitua (vedi `luceFuori` nel blocco
       * dell'abitacolo). Quindi qui si riproduce esattamente quello stato:
       * `avvio` vale zero, e da zero vengono questi due numeri.
       */
      /* 0,26 E NON 0,04, e il numero e' salito dopo aver guardato.
       *
       * L'idea era giusta — l'interno comincia quasi al buio perche' si arriva
       * da un'ottica spenta, e riprodurre quello stato dentro l'iride rende il
       * passaggio continuo. Il difetto e' che a 0,04 dentro l'anello non si
       * vede quasi niente: il bianco di prima e' stato sostituito da un buio,
       * e il committente ha letto ancora «faro, passaggio scuro, interno»
       * invece di «faro che diventa interno».
       *
       * A 0,26 la strada dentro il cerchio si legge — l'asfalto, il
       * tratteggio, la fila di lampioni — e resta comunque molto piu' scura di
       * quanto sara' a regime. La continuita' si paga con un po' di luce, non
       * con l'illeggibilita': quello che deve combaciare e' il TIPO di
       * immagine, non l'ultimo decimo di esposizione. */
      this.abitacolo.esposizione = 0.26 * 1.45
      this.lastra.luce(0.26)

      const primaBersaglio = this.renderer.getRenderTarget()
      const primaAuto = this.renderer.autoClear
      this.renderer.autoClear = true
      this.renderer.setRenderTarget(this.bersaglioIride)
      this.renderer.clear()
      this.renderer.render(this.scena, this.cameraIride)
      this.renderer.setRenderTarget(primaBersaglio)
      this.renderer.autoClear = primaAuto

      this.esterno.visible = eraEsterno
      this.ambiente.visible = eraAmbiente
      this.attraversamento.gruppo.visible = eraCorridoio
      this.interno.visible = eraInterno
      this.abitacolo.mesh.visible = eraAbitacolo
      this.lastra.mesh.visible = eraLastra
      this.quadro.mesh.visible = eraQuadro
      // e l'abitacolo torna davanti alla camera vera, se no il fotogramma
      // principale lo troverebbe posato per un'altra
      if (eraAbitacolo) this.abitacolo.aggiorna(this.camera)
    }

    /* LA FOTOGRAFIA DELL'ABITACOLO SI SCALDA APPENA ARRIVA, non quando serve.
       Vedi `scaldaOra` in «core/Riscalda.ts»: quella tessitura arriva in
       ritardo apposta — quattrocento kilobyte che toglierebbero banda
       all'automobile — e quindi il riscaldamento grande le passa davanti prima
       che esista. Misurato: un fotogramma da 1129 ms con «+1 tessiture» in
       piena `accensione`, cioe' proprio mentre il quadro si accende e chi
       guarda sta scorrendo.
       Un `if` per fotogramma su un valore booleano non si misura nemmeno, e la
       bandiera si alza una volta sola. */
    /* E SI ASPETTA LA QUIETE, che e' la meta' della cura.
       Al primo tentativo il morso partiva nell'istante in cui la tessitura
       arriva. Misurato: `accensione` guariva davvero — da 1741-3341 ms a
       327-660 — ma il secondo di stallo non spariva, si SPOSTAVA, e finiva
       dove capitava a trovarsi lo scorrimento in quel momento. Nel sito vero
       quel momento e' la hero, perche' la fotografia scende subito dopo
       l'automobile e chi guarda e' ancora in cima: cioe' avrei portato uno
       stallo dal fondo del racconto alla prima schermata. Un miglioramento che
       peggiora, ed e' il tipo che si vede solo misurando dove va a finire il
       costo invece di controllare che sia sparito da dove stava.
       Adesso il morso aspetta che nessuno stia scorrendo. Un secondo di gelo a
       pagina ferma non lo sente nessuno — non si sta muovendo niente — e
       l'attesa non puo' durare per sempre: chi scorre senza fermarsi mai passa
       comunque dal `taglio`, e a quel punto la tessitura le serve. */
    /* SOLO L'ABITACOLO, e non e' una dimenticanza: e' cio' che la misura
       sostiene. Provato lo stesso morso anche sulle insegne e sul carosello —
       le altre due cose che caricano fotografie in ritardo — e su tre corse di
       `strumenti/amano.mjs` non e' cambiato niente: gli stessi stalli, con le
       stesse annotazioni. La ragione e' che quelle tessiture salgono sulla
       scheda nel PRIMO fotogramma visibile dopo il loro arrivo, e una bandiera
       che si alza quando sono arrivate tutte si alza per definizione dopo. Per
       arrivare prima servirebbe `renderer.initTexture` chiamata dentro
       l'`onload` di ognuna, e una coda che ne smaltisca una per fotogramma
       fermo. Vale la pena, ma e' un'altra cosa da fare con calma.
       L'abitacolo invece guarisce davvero — da 1741-3341 ms a 327-804 — perche'
       li' la tessitura e' una sola e grande, e il morso la prende in pieno. */
    if (this.abitacolo.pronto && !this.abitacoloScaldato && this.scorrimento.velocita < 0.02) {
      this.abitacoloScaldato = true
      scaldaOra(this.renderer, this.scena, this.camera, this.abitacolo.mesh,
        { bersaglio: this.bersaglioIride, camera: this.cameraIride })
    } else if (this.scorrimento.velocita < 0.02) {
      /* E UNA TESSITURA PER VOLTA SALE SULLA SCHEDA — vedi «core/Salita.ts».
         Nel ramo `else` apposta: il morso dell'abitacolo costa gia' il suo
         fotogramma, e sommarci un caricamento vorrebbe dire due stalli in uno.
         Uno per fotogramma fermo e' abbastanza: fra una raffica di scorrimento
         e l'altra ci sono decine di fotogrammi, e le fotografie da caricare
         sono tredici in tutto. */
      smaltisci(this.renderer)
    }

    this.renderer.info.autoReset = false
    this.renderer.info.reset()
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scena, this.camera)
    requestAnimationFrame(this.fotogramma)
  }
}

/** riusato a ogni fotogramma del finale: vedi `dichiaraOrizzonte` */
const FUGA = new Vector3()

/** un tratto da 0 a 1 con le estremita' addolcite: la stessa curva di `ui/Finale.ts`,
 *  ed e' importante che sia la stessa — le due meta' del finale devono scendere
 *  insieme, se no il momento dello scambio si sposta */
function lisciato(x: number, da: number, a: number) {
  const t = Math.min(Math.max((x - da) / (a - da), 0), 1)
  return t * t * (3 - 2 * t)
}

/** il posto di guida come vettore: `POSTO_GUIDA` e' una terna letterale
 *  perche' la consuma anche `Accensione`, e la volante vuole un `Vector3` */
const GUIDA_MONDO = new Vector3(POSTO_GUIDA[0], POSTO_GUIDA[1], POSTO_GUIDA[2])

/** come si chiamano i sette tempi sul quadro strumenti: le stesse parole della
 *  rotaia, perche' due nomi per lo stesso tempo sono due tempi */
const NOMI_SCENA: Partial<Record<string, string>> = {
  hero: 'ESTERNO',
  orbita: 'SUPERFICIE',
  lato: 'INGRESSO',
  taglio: 'OTTICA',
  accensione: 'ABITACOLO',
  velocita: 'CORSA',
  contatto: 'CONTATTO',
}
