import {
  CanvasTexture, Color, Group, LinearFilter, Mesh, MeshBasicMaterial,
  PlaneGeometry, SRGBColorSpace, Vector3,
} from 'three'
import { inCoda } from '../core/Salita'
import { quantoDiLato } from '../transizioni/Camera'
import { LAVORI } from '../ui/Lavori'
import type { Regia } from '../core/Regia'

/**
 * LE INSEGNE — tre siti veri, in piedi sul piazzale, nel primo fotogramma.
 *
 * IL PROBLEMA, detto dal committente in una riga: «dalla villa e dalla
 * macchina non si capisce che questo e' il sito di uno che costruisce siti».
 *
 * Ha ragione, e la mia prima risposta era sbagliata. Avevo costruito una
 * scatola d'ingombro quotata intorno all'automobile — misure vere lette dal
 * GLB, filetti ambra, tutto onesto. Solo che una scatola in filo di ferro dice
 * «questo e' 3D», cioe' dice 3D ARTIST. Non dice web.
 *
 * La cosa che lo dice in mezzo secondo, senza una parola, e' VEDERE DEI SITI.
 * Il fotomontaggio che il committente aveva portato come riferimento ci aveva
 * azzeccato: erano finestre di browser con dentro delle pagine. Sbagliava
 * l'esecuzione — barre del titolo, angoli tondi, riquadri pieni: chrome di
 * interfaccia appoggiata su una scena fotografica, cioe' un quarto materiale
 * in un'immagine che ne ha gia' tre — ma l'istinto era giusto.
 *
 * E LA VERSIONE VERA C'ERA GIA' IN CASA. Dieci fotografie di dieci siti veri
 * stanno in `public/lavori/` da quando le ho fatte per il carosello del
 * finale: 118 KB in tutto, ognuna scattata aprendo quel sito in un browser e
 * scorrendolo di un sesto di schermo. Erano usate una volta sola, nel punto
 * del sito che quasi nessuno raggiunge.
 *
 * Portarle qui fa due cose con lo stesso gesto: dice il mestiere
 * all'atterraggio, e tira fuori il portfolio da dove era sepolto.
 *
 * PERCHE' IN SCENA E NON SULLO SCHERMO.
 *
 * La strada facile era tre riquadri in HTML sopra la tela. Sarebbero stati
 * nitidi, gratis, e sarebbero sembrati esattamente quello che sono: un
 * pannello appiccicato davanti a una fotografia. In scena invece prendono la
 * prospettiva, si spostano con la camera, entrano nel riflesso del pavimento —
 * e da quel momento non si possono piu' leggere come interfaccia, perche' si
 * comportano come oggetti.
 *
 * Sono schermi accesi: `toneMapped: false` e nessuna luce addosso. Un pannello
 * che si spegne con la notte intorno e' la cosa meno credibile che ci sia — e'
 * la stessa regola del quadro strumenti e del carosello.
 */

/** quanto e' largo uno schermo, in metri */
const LARGO = 2.0
const RAPPORTO = 16 / 10

/* LA FILA E' UN ARCO CENTRATO SULL'OCCHIO, e la prima volta era una retta.
 *
 * Su una retta i tre schermi stanno a distanze diverse dalla camera, quindi
 * escono di tre misure diverse e con tre inclinazioni diverse: nel provino il
 * primo era grande e mezzo fuori dal bordo, il terzo piccolo e storto. Il
 * committente l'ha detto in tre parole — «ma sistemali bene».
 *
 * Su un arco centrato sull'occhio la distanza e' la stessa per tutti e tre.
 * Escono della stessa misura, e ognuno guarda la camera esattamente in faccia
 * invece che per approssimazione. Non e' un ritocco: e' la costruzione giusta,
 * e si taratura con quattro numeri che vogliono dire qualcosa.
 *
 * L'occhio e' fisso e non e' la camera vera: nel primo tempo la camera si
 * sposta di quaranta centimetri in tutto, e legare la posa degli schermi a un
 * punto che si muove li farebbe strisciare l'uno sull'altro mentre si scorre.
 * Fermi, invece, la camera ci passa davanti — che e' quello che deve fare. */

/** dove sta la camera nel primo tempo: misurato, non dedotto */
const OCCHIO = new Vector3(5.4, 0.88, 4.25)
/** a che distanza dall'occhio sta la fila */
const LONTANANZA = 9.6
/** e a che quota */
const QUOTA = 1.78
/** l'angolo fra uno schermo e il successivo, in radianti */
/* L'APERTURA DELL'ARCO — 0,226 e non 0,196, e il conto e' di due righe.
   Su un arco due vicini distano 2*R*sin(A/2). Con R = 9,6 e A = 0,196 quella
   distanza vale 1,879 metri, mentre ogni schermo e' largo 2,0 e ruotato di
   poco piu' di un decimo di radiante — ne proietta 1,96. Cioe' gli schermi si
   sovrapponevano di otto centimetri, e nel fotogramma la seconda insegna
   finiva sotto la terza: un difetto segnalato da due revisioni di fila e mai
   corretto, perche' nessuno aveva fatto il conto.
   A 0,226 la distanza sale a 2,17 e fra un pannello e l'altro restano venti
   centimetri di aria. */
const APERTURA = -0.226
/**
 * DI QUANTO LA FILA E' RUOTATA rispetto all'asse dello sguardo.
 *
 * Era 0,150 — cioe' spostata a sinistra — e il numero era giusto per
 * un'inquadratura che non c'e' piu'. Nella hero la mira si e' spostata di
 * 1,48 m di lato per liberare il titolo dalla carrozzeria (vedi
 * `SCOSTA_HERO` in «transizioni/Camera.ts»), e le insegne stanno nel gruppo
 * dell'esterno: si sono spostate anche loro, e la prima usciva dallo schermo.
 * E' il difetto tipico di due numeri che descrivono la stessa composizione da
 * due file diversi — si correggeva uno e l'altro restava indietro.
 * 0,2039 e' l'angolo che quello scostamento sottende a 7,15 m, e togliendolo
 * da 0,150 si arriva qui. Verificato guardando il provino: le tre insegne
 * tornano tutte dentro, con l'aria giusta fra loro.
 */
const SCARTO = 0.150
/**
 * QUANTO SI TOGLIE ALLO SCARTO quando la hero scosta il soggetto.
 *
 * E' l'angolo che 1,48 m di scostamento laterale sottendono a 7,15 m di
 * distanza. Non e' una seconda taratura: e' LA STESSA della camera, riportata
 * qui perche' le insegne stanno nel gruppo dell'esterno e quindi si spostano
 * insieme a tutto il resto.
 * E si applica con lo stesso fattore di formato — `quantoDiLato` — invece che
 * come numero fisso, che era il difetto del primo giro: corretto lo scarto sul
 * desktop, sul telefono la prima insegna finiva mezza fuori dallo schermo,
 * perche' li' lo scostamento della camera non c'e' e la compensazione restava.
 * Due numeri che descrivono la stessa composizione da due file diversi devono
 * dipendere dalla stessa condizione, o uno dei due resta indietro.
 */
const SCARTO_SCOSTATO = 0.2039

/**
 * A CHE ANGOLO STA L'INSEGNA `i` sull'arco, per un dato formato di schermo.
 *
 * E' una funzione e non piu' tre righe dentro il costruttore perche' adesso
 * dipende dal formato, e il formato cambia mentre il sito e' aperto: si
 * ridimensiona una finestra, si gira un telefono. Un angolo calcolato una
 * volta sola alla costruzione sarebbe giusto fino al primo ridimensionamento e
 * poi muto — e un valore che smette di essere giusto senza dare errore e' la
 * trappola piu' battuta di questo progetto.
 */
function angolo(i: number, aspetto: number) {
  // al centro quello di mezzo, gli altri due scostati e ruotati
  const s = i - (QUALI.length - 1) / 2
  // l'asse dello sguardo, dall'occhio verso l'automobile
  const base = Math.atan2(-OCCHIO.x, -OCCHIO.z)
  return base + SCARTO - SCARTO_SCOSTATO * quantoDiLato(aspetto) + s * APERTURA
}
/** quali lavori: non VELOCITY, che e' questo sito, e i tre piu' diversi fra loro */
/* QUALI TRE, E LA SCELTA L'HA FATTA UNA MISURA.
   La luminanza media delle dieci copertine va da 16,7 (STUDIO) a 244,3 (FLOW):
   quindici volte. La prima terna era EVERY / CEPP / CHRONO_01 — 153,7 / 46,6 /
   22,8 — e per quanto si pareggino i moltiplicatori, da un fondo quasi nero non
   si tira fuori uno schermo acceso senza ridurlo a una poltiglia grigia.
   Il pareggio si fa con i moltiplicatori DOVE SI PUO', e prima ancora
   scegliendo tre immagini che partano vicine. Queste tre stanno fra 46 e 154 e
   arrivano tutte attorno a ottanta, e sono anche le piu' diverse fra loro:
   un'editoriale bianca, una piscina azzurra, un legno caldo. Tre schermi che si
   somigliano sono un solo schermo ripetuto tre volte. */
/* E SI SCELGONO PER NOME, NON PER NUMERO — questa riga e' una cicatrice.
   Erano ['02', '06', '03'], cioe' tre POSIZIONI nell'elenco. Il giorno in cui
   l'elenco e' stato riordinato — i due lavori in linea davanti, la vetrina
   tecnica in fondo — quei tre numeri hanno continuato a funzionare e hanno
   cominciato a puntare ad altri tre siti. Nessun errore, nessun avviso: la
   hero mostrava tre schermi diversi da quelli scelti, e con loro se n'era
   andata la taratura di luminanza descritta qui sotto, che era costata una
   misura su tutte e dieci le copertine.
   Un indice e' un riferimento che si rompe in silenzio quando la lista cambia.
   Un nome no. */
const QUALI = ['EVERY INTERFACE', 'CORTE BIANCA', 'CÈPP']

/* A CHE LUMINANZA DEVONO STARE TUTTI E TRE, su 255.
   Novanta e' sotto la villa (141) e sotto la piscina (156), e sopra la
   carrozzeria: sono presenti e non comandano. E' la gerarchia chiesta dal
   committente — prima l'automobile e il titolo, poi i lavori. */
const BERSAGLIO_LUCE = 90

/** e l'aria della sera che hanno addosso: la stessa della villa e dell'acqua */
const TINTA_NOTTE = new Color(0xc6d2e2)

const TL = 640
const TA = Math.round(TL / RAPPORTO)

export class Insegne {
  readonly gruppo = new Group()
  private pannelli: Mesh[] = []
  /** secondi da quando la scena gira: serve al ritardo d'ingresso */
  private eta = 0
  private presenza = 0
  /** con quale formato di schermo l'arco e' stato posato l'ultima volta */
  private aspettoPosato = 1.6

  constructor() {
    this.gruppo.name = 'INSEGNE'
    this.gruppo.visible = false

    QUALI.forEach((quale, i) => {
      const lavoro = LAVORI.find((l) => l.nome === quale)
      if (!lavoro) return
      const tela = document.createElement('canvas')
      tela.width = TL
      tela.height = TA
      this.disegna(tela, lavoro.nome, null)
      const t = new CanvasTexture(tela)
      t.colorSpace = SRGBColorSpace
      t.generateMipmaps = false
      t.minFilter = LinearFilter
      t.magFilter = LinearFilter

      const m = new Mesh(
        new PlaneGeometry(LARGO, LARGO / RAPPORTO),
        /* PIU' SCURI DELLA LORO FOTOGRAFIA, e con un filo di notte addosso.
           Le copertine sono scatti di siti veri e alcune sono chiarissime:
           quella di EVERY INTERFACE e' quasi bianca. A piena forza, dentro una
           scena all'ora blu, quel bianco urla — si legge come un rettangolo
           incollato sopra la fotografia, che e' esattamente il difetto che
           tutta questa costruzione esiste per evitare.
           Il moltiplicatore le porta al settantotto per cento e le tinge appena
           di azzurro: la stessa aria che hanno la villa e la piscina. Restano
           schermi accesi — `toneMapped: false`, nessuna luce addosso — ma
           accesi DENTRO questa sera, non ritagliati da un'altra. */
        new MeshBasicMaterial({
          map: t, transparent: true, toneMapped: false, depthWrite: false,
          // il valore vero lo scrive `pareggia()` quando la fotografia arriva:
          // questo e' solo il colore di partenza, quando non c'e' ancora niente
          // da pareggiare
          color: 0xc6d2e2,
        }),
      )
      m.name = 'INSEGNA_' + (lavoro?.codice ?? quale)
      m.renderOrder = 6
      // dove sta sull'arco: il conto e' in `angolo`, e si rifa' se cambia il
      // formato dello schermo — vedi `aggiorna`
      const a = angolo(i, 1.6)
      m.position.set(
        OCCHIO.x + Math.sin(a) * LONTANANZA,
        QUOTA,
        OCCHIO.z + Math.cos(a) * LONTANANZA,
      )
      /* E OGNUNO GUARDA L'OCCHIO IN FACCIA — sta all'angolo `a` sull'arco,
         quindi la sua normale deve puntare all'indietro lungo lo stesso
         raggio: mezzo giro.
         Il segno l'ho sbagliato al primo giro, e non c'era nessun modo di
         accorgersene guardando: la normale di un piano guarda verso +Z, e
         girata dalla parte sbagliata puntava lontano dalla camera. Un
         `MeshBasicMaterial` disegna una faccia sola, quindi i tre schermi
         venivano scartati prima di essere rasterizzati — in scena, accesi,
         opacita' 0,99, e invisibili. Nessun errore e nessun avviso. */
      m.rotation.y = a + Math.PI
      this.pannelli.push(m)
      this.gruppo.add(m)

      if (lavoro.copertina) {
        const im = new Image()
        im.decoding = 'async'
        im.onload = () => {
          this.disegna(tela, lavoro.nome, im)
          t.needsUpdate = true
          this.pareggia(tela, m.material as MeshBasicMaterial)
          // e si mette in fila per salire sulla scheda al primo momento in cui
          // la pagina e' ferma, invece che nel fotogramma che la disegna:
          // vedi «core/Salita.ts»
          inCoda(t)
        }
        im.src = lavoro.copertina
      }
    })
  }

  /**
   * PAREGGIA LA LUCE FRA I TRE SCHERMI — misurando, non a occhio.
   *
   * IL DIFETTO. Le tre copertine sono scatti di siti veri e hanno luminanze
   * lontanissime: EVERY INTERFACE e' quasi bianco, CHRONO_01 e' quasi nero.
   * Con lo stesso moltiplicatore per tutti, il primo batteva il titolo e la
   * carrozzeria — l'occhio ci finiva sopra prima che sul claim — e il terzo
   * spariva. La gerarchia percettiva che serve e' un'altra: prima
   * l'automobile e il titolo, poi i lavori, poi i dati tecnici. I lavori
   * devono far capire il mestiere in mezzo secondo, non diventare il soggetto.
   *
   * PERCHE' NON TRE COSTANTI A MANO. Sarebbero giuste per queste tre immagini
   * e sbagliate al primo lavoro nuovo — e queste copertine si rifanno ogni
   * volta che uno di quei siti cambia. Un numero scritto a mano invecchia in
   * silenzio.
   *
   * Qui invece si legge la tela: si campiona la luminanza media della
   * fotografia e si sceglie il moltiplicatore che la porta al bersaglio.
   * Qualunque immagine ci si metta, esce alla stessa forza.
   *
   * I limiti servono a non fare danni nei due sensi: sotto 0,55 una copertina
   * chiara diventerebbe grigia e illeggibile, sopra 1,25 una scura comincia a
   * slavare i neri. Fuori da quella forbice si accetta di non pareggiare del
   * tutto — meglio tre schermi quasi pari che uno rovinato.
   */
  private pareggia(tela: HTMLCanvasElement, mat: MeshBasicMaterial) {
    const c = tela.getContext('2d', { willReadFrequently: true })
    if (!c) return
    // un campione ogni sedici pixel per lato: duemila punti bastano per una
    // media, e leggere l'intera tela costerebbe dieci volte tanto
    const im = c.getImageData(0, 0, TL, TA).data
    let somma = 0, quanti = 0
    for (let y = 0; y < TA; y += 16) {
      for (let x = 0; x < TL; x += 16) {
        const i = (y * TL + x) * 4
        somma += 0.2126 * im[i] + 0.7152 * im[i + 1] + 0.0722 * im[i + 2]
        quanti++
      }
    }
    const media = somma / Math.max(quanti, 1)
        /* IL FATTORE SI CALCOLA IN SRGB E SI APPLICA IN LINEARE, e la prima
       stesura confondeva i due spazi.
       Il rapporto che serve e' fra due luminanze LETTE DA UNA TELA, cioe' due
       numeri gia' codificati in sRGB: la copertina piu' scura chiedeva 1,93.
       Ma `material.color` moltiplica in spazio LINEARE, e una moltiplicazione
       lineare di 1,6 sposta l'aspetto in sRGB solo di 1,6^(1/2,2) = 1,23. Per
       questo il terzo schermo restava a 29 invece che a 75: chiedevo il
       sessanta per cento in piu' e ne ottenevo il ventitre'.
       Si limita il rapporto dove ha senso limitarlo — cioe' in sRGB, che e'
       quello che si vede — e poi lo si porta in lineare con l'esponente.
       0,55 in basso: sotto, una copertina chiara diventa grigia. 1,90 in alto:
       sopra, una scura comincia a slavare i neri. */
    const rapporto = Math.min(1.90, Math.max(0.55, BERSAGLIO_LUCE / Math.max(media, 1)))
    const k = Math.pow(rapporto, 2.2)
    mat.color.setScalar(k).multiply(TINTA_NOTTE)
  }

  /**
   * IL DISEGNO DI UNO SCHERMO — la fotografia, e nient'altro che un filetto.
   *
   * La barra c'e' — vedi il commento dentro il metodo, e perche' ho cambiato
   * idea. Quello che NON c'e' sono gli angoli tondi e l'ombra portata: quelli
   * sono i due segni che appartengono al sistema operativo di chi guarda e non
   * a questa scena, e sono anche i due che facevano sembrare incollato il
   * fotomontaggio di partenza.
   *
   * Resta un filetto ambra di un pixel e il nome del progetto in monospazio
   * maiuscolo, con la stessa spaziatura di REAL-TIME / 01. Sono i due segni con
   * cui e' scritto tutto il resto del sito: e' questo a farli leggere come
   * parte della stessa cosa invece che come un elemento importato.
   */
  private disegna(tela: HTMLCanvasElement, nome: string, foto: HTMLImageElement | null) {
    const c = tela.getContext('2d')!
    c.clearRect(0, 0, TL, TA)
    const g = c.createLinearGradient(0, 0, 0, TA)
    g.addColorStop(0, '#0d1420')
    g.addColorStop(1, '#04060b')
    c.fillStyle = g
    c.fillRect(0, 0, TL, TA)

    /* LA BARRA CON I TRE PALLINI — e la avevo scartata.
     *
     * Nella mia prima stesura qui sotto c'e' scritto per esteso perche' non
     * andava messa: barra del titolo e angoli tondi appartengono al sistema
     * operativo di chi guarda, non a questa scena, e messi sopra una
     * fotografia si leggono come un elemento incollato. Il ragionamento era
     * giusto — per un pannello VUOTO.
     *
     * Il committente l'ha rovesciato in una riga: «e poi incorniciare i siti in
     * quei tre pallini che sembrano all'interno di un browser?». E qui dentro
     * non c'e' un pannello vuoto: c'e' la fotografia di un sito che gira
     * davvero. La cornice non finge niente — dichiara cos'e' quella cosa. Senza,
     * tre rettangoli con dentro delle immagini possono essere qualunque cosa:
     * fotografie, poster, schermi di un'installazione. Con la barra, in mezzo
     * secondo e senza una parola, sono tre SITI.
     *
     * Ed e' esattamente la frase che tutta questa costruzione deve dire.
     *
     * I PALLINI NON SONO ROSSO-GIALLO-VERDE. Quelli sono i bottoni di un
     * sistema operativo preciso e citarli sarebbe la scorciatoia — oltre a
     * portare dentro tre colori che il sito non ha. Qui sono uno ambra (la
     * tinta di casa) e due nella stessa famiglia, spenti: la forma dice
     * «browser», il colore continua a dire «questo sito».
     */
    const BARRA = Math.round(TA * 0.085)
    c.fillStyle = '#0e141e'
    c.fillRect(0, 0, TL, BARRA)
    const raggio = Math.max(2.5, BARRA * 0.17)
    const tinte = ['rgba(216,162,88,0.82)', 'rgba(150,185,225,0.34)', 'rgba(150,185,225,0.22)']
    for (let k = 0; k < 3; k++) {
      c.beginPath()
      c.arc(BARRA * 0.9 + k * raggio * 3.1, BARRA / 2, raggio, 0, Math.PI * 2)
      c.fillStyle = tinte[k]
      c.fill()
    }
    /* E IL NOME STA NELLA BARRA, non sotto la fotografia.
       Prima era in basso, su un velo scuro. Funzionava finche' i tre schermi
       erano in aria; da quando stanno dietro l'automobile, l'automobile ne
       copre il bordo inferiore — e la prima cosa a sparire era proprio il nome
       del progetto, cioe' l'unica parola del riquadro.
       Nella barra e' al riparo, ed e' anche piu' giusto: il posto dove sta
       scritto che sito si sta guardando, dentro un browser, e' quello. */
    c.fillStyle = 'rgba(150,185,225,0.10)'
    const px = BARRA * 3.4, pw = TL - px - BARRA * 1.2
    c.beginPath()
    c.roundRect(px, BARRA * 0.22, pw, BARRA * 0.56, BARRA * 0.28)
    c.fill()
    c.textAlign = 'left'
    c.textBaseline = 'middle'
    c.font = '600 ' + Math.round(BARRA * 0.36) + 'px Switzer, system-ui, sans-serif'
    c.fillStyle = 'rgba(216,236,255,0.72)'
    c.fillText(nome.toLowerCase().replace(/[^a-z0-9]/g, '') + '.velocity', px + BARRA * 0.5, BARRA * 0.5)

    if (foto) {
      const r = Math.max(TL / foto.width, (TA - BARRA) / foto.height)
      c.save()
      c.beginPath()
      c.rect(0, BARRA, TL, TA - BARRA)
      c.clip()
      c.drawImage(foto, (TL - foto.width * r) / 2, BARRA, foto.width * r, foto.height * r)
      c.restore()
    }

    /* IL VELO IN BASSO E' STATO TOLTO INSIEME AL NOME che ci stava sopra.
       Un velo scuro sul terzo inferiore di una fotografia si nota: e' un segno
       in piu' che non serve piu' a niente, e su tre riquadri diventano tre. Le
       copertine restano intere. */

    /* UNA VIGNETTATURA APPENA ACCENNATA. Una fotografia di sito e' piatta per
       costruzione — e' uno screenshot — e una superficie perfettamente piatta
       dentro una scena con la luce che cade da una parte sola si riconosce
       subito come un'immagine e non come un oggetto. Sedici centesimi agli
       angoli bastano a darle una curvatura di luce. */
    const vig = c.createRadialGradient(TL / 2, TA / 2, TA * 0.28, TL / 2, TA / 2, TL * 0.72)
    vig.addColorStop(0, 'rgba(3,6,12,0)')
    vig.addColorStop(1, 'rgba(3,6,12,0.28)')
    c.fillStyle = vig
    c.fillRect(0, 0, TL, TA)

    c.strokeStyle = 'rgba(216,162,88,0.55)'
    c.lineWidth = 2
    c.strokeRect(1, 1, TL - 2, TA - 2)

  }

  /**
   * SI VEDONO NEL PRIMO TEMPO E SE NE VANNO GIRANDO INTORNO.
   *
   * La loro frase e' «questo costruisce siti», e va detta all'atterraggio: chi
   * arriva la deve trovare gia' in campo, non dopo un gesto. Ma dal secondo
   * tempo in poi il soggetto e' l'automobile — la si gira intorno, ci si entra
   * — e tre schermi accesi alle sue spalle diventerebbero tre cose che
   * chiedono attenzione mentre se ne sta guardando un'altra.
   *
   * Escono prima che finisca il primo tempo, cosi' la loro uscita e' un
   * movimento della scena e non uno spegnimento.
   */
  aggiorna(regia: Regia, dt: number, aspetto = 1.6) {
    /* E LE INSEGNE ENTRANO PER ULTIME FRA GLI OGGETTI, non insieme a tutto.
       Sono tre schermi accesi con dentro tre siti: l'elemento piu' DENSO della
       prima schermata, e due revisioni esterne hanno messo la densita' della
       hero al primo posto. Il documento le sue cose le scaglione nel foglio di
       stile (vedi `.e-svelato`), ma queste stanno nella scena e il foglio di
       stile non le vede: il ritardo lo devono contare da sole.
       Un secondo dall'inizio: l'automobile ha il suo mezzo secondo, il titolo
       arriva, e solo dopo arrivano le prove. */
    this.eta += dt
    const entrata = Math.min(Math.max((this.eta - 1.0) / 0.55, 0), 1)
    const vuole = regia.beat === 'hero'
      ? entrata * (1 - Math.min(Math.max((regia.locale - 0.52) / 0.34, 0), 1))
      : 0
    this.presenza += (vuole - this.presenza) * Math.min(dt * 3.4, 1)
    const acceso = this.presenza > 0.005
    this.gruppo.visible = acceso
    if (!acceso) return
    /* SUGLI SCHERMI STRETTI SI STRINGONO, per la stessa ragione del carosello
       del finale: la larghezza e' in metri ma il campo della camera e' fisso in
       verticale, quindi su un telefono in piedi tre schermi da 2,6 metri
       coprirebbero l'automobile invece di stare dietro di lei. */
    /* 0,72 DI PAVIMENTO E NON 0,42: nel provino del telefono i tre schermi
       erano francobolli — dentro non si distingueva un sito da una fotografia,
       e uno schermo illeggibile non dice niente, quindi tanto vale toglierlo.
       Il conto e' che su un telefono in piedi il campo verticale e' lo stesso
       ma quello orizzontale e' un terzo, quindi una misura in metri ci sta un
       terzo. Scendere fino a 0,42 li rendeva innocui e inutili insieme.
       A 0,72 coprono di piu' l'automobile, ed e' un prezzo che si paga
       volentieri: sul telefono la frase «questo costruisce siti» vale piu' del
       profilo della fiancata, che nella prima schermata si vede comunque. */
    /* E SE IL FORMATO E' CAMBIATO, L'ARCO SI RIPOSA. Vedi `angolo`: la
       compensazione dello scostamento della hero vale sul desktop e non sul
       telefono, quindi non puo' essere congelata alla costruzione. */
    if (aspetto !== this.aspettoPosato) {
      this.aspettoPosato = aspetto
      let i = 0
      for (const o of this.gruppo.children) {
        if (!o.name.startsWith('INSEGNA_')) continue
        const a = angolo(i++, aspetto)
        o.position.set(OCCHIO.x + Math.sin(a) * LONTANANZA, QUOTA, OCCHIO.z + Math.cos(a) * LONTANANZA)
        o.rotation.y = a + Math.PI
      }
    }

    const stretto = Math.min(1, Math.max(0.72, aspetto / 1.35))

    /* E SUL TELEFONO SCENDONO, perche' in alto c'e' gia' qualcun altro.
       Trovato nel provino a otto tempi, e nessun metro poteva trovarlo:
       `strumenti/telefono_audit.mjs` confronta blocchi di TESTO fra loro, e qui
       si sovrappongono un pannello del documento e tre oggetti della scena —
       due mondi che nessun rettangolo mette a confronto.
       Sul telefono i comandi stanno in alto (e' l'unica fascia libera della
       colonna, e la ragione sta scritta nel foglio di stile) e cadono
       esattamente dove stanno i tre schermi. Nessuno dei due puo' cedere il
       posto: le insegne dicono il mestiere all'atterraggio, i comandi sono
       l'unica cosa che un filmato non potrebbe fare.
       Quindi le insegne scendono nella fascia fra i comandi e l'automobile.
       Scendono solo dove serve: il fattore e' zero su uno schermo largo. */
    const quanto = 1 - Math.min(1, Math.max(0, (aspetto - 0.55) / 0.75))
    /* Abbassarli e basta non bastava: nel provino successivo i tre schermi
       finivano DIETRO l'automobile, e sul telefono se ne vedeva un dito sopra
       il cofano. Quindi oltre a scendere si AVVICINANO — di due metri e mezzo
       lungo l'asse dello sguardo — e passano davanti.
       Coprono un pezzo di fiancata, ed e' un prezzo che si paga volentieri: su
       un telefono la frase «questo costruisce siti» vale piu' del profilo
       dell'automobile, che nella prima schermata si vede comunque. Su uno
       schermo largo `quanto` vale zero e non si muove niente.
       I due numeri sono scesi da 2,5 e 0,62 dopo che i comandi si sono
       stretti: liberati cinquantotto pixel in alto, gli schermi possono
       tornare un po' piu' su e un po' piu' indietro — cioe' coprire meno
       automobile. Le due misure sono legate, e vale la pena saperlo: chi
       ritocca l'una deve guardare l'altra. */
    this.gruppo.position.set(0.786 * 2.1 * quanto, -0.30 * quanto, 0.618 * 2.1 * quanto)

    for (const m of this.pannelli) {
      const mat = m.material as MeshBasicMaterial
      mat.opacity = this.presenza
      m.scale.setScalar(stretto)
    }
  }

  smonta() {
    for (const m of this.pannelli) {
      m.geometry.dispose()
      const mat = m.material as MeshBasicMaterial
      mat.map?.dispose()
      mat.dispose()
    }
  }
}
