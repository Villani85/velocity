import {
  AdditiveBlending, BoxGeometry, CanvasTexture, Color, Group, LinearFilter, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, Vector3,
} from 'three'
import { inCoda } from '../core/Salita'
import { quantoDiLato } from '../transizioni/Camera'
import { LAVORI } from '../ui/Lavori'
import { t } from '../ui/Lingua'
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
/* PIU' ALTO CHE LARGO... quasi. 1,18 e non 1,60.
   Il committente ha portato due mockup della hero chiedendo «riesci a rendere
   i 3 lavori cosi'?»: li' i pannelli sono verticali e alti, con una cornice
   d'ambra e una barra di luce sul bordo. Il formato conta quanto la cornice —
   un rettangolo lungo e basso legge come un'insegna stradale, uno alto legge
   come una PAGINA, che e' cio' che questi contengono.
   Non si va fino al 3:4 del riferimento: a 2,0 m di larghezza sarebbero alti
   2,67 e coprirebbero la villa dietro, che e' la scena. A 1,18 l'altezza passa
   da 1,25 a 1,69 m — il 35% in piu' — e resta sotto il cornicione. */
const RAPPORTO = 1.18

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
/* LA QUOTA E' SALITA CON L'ALTEZZA. 1,98 e non 1,78.
   I pannelli sono passati da 1,25 a 1,69 m di altezza (vedi `RAPPORTO`), e
   crescendo si allungano da tutte e due le parti: il bordo basso e' sceso di
   22 cm ed e' finito dietro l'automobile, portandosi via la didascalia — cioe'
   proprio la riga aggiunta in quel giro.
   E' il difetto ricorrente di questo file: si cambia un numero e l'altro che
   descrive la stessa composizione resta indietro. Qui la quota si alza di
   quanto e' scesa la base. */
const QUOTA = 1.98
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


/* ============================================================ L'ANELLO

   PERCHE' L'ARCO NON SEMBRAVA CURVO — e la risposta e' geometrica, non di gusto.

   Le insegne stavano su un arco CENTRATO SULL'OCCHIO, e il commento sopra
   `angolo` lo dichiarava come un pregio: stessa distanza per tutte e tre,
   stessa dimensione, ognuna che guarda la camera esattamente in faccia.
   Tutto vero — ed e' esattamente la ragione per cui non poteva funzionare.

   Una circonferenza centrata sull'osservatore, PROIETTATA DA QUELL'OSSERVATORE,
   e' indistinguibile da una retta frontale. Tutti i punti sono equidistanti,
   quindi nessuno rimpicciolisce; tutte le normali puntano all'occhio, quindi
   nessuna faccia si gira. Non restava un solo indizio di profondita': la
   costruzione era un cerchio e il fotogramma era una fila di rettangoli.
   Il committente l'ha detto tre volte con parole diverse — l'ultima:
   «la curvatura come un cerchio che parte dal primo ed e' tondo».

   COSA SI CAMBIA. Il centro del cerchio si sposta OLTRE le insegne, sulla
   direzione della PRIMA — «che parte dal primo»: quella resta frontale e fa da
   punto di tangenza, e le altre due si girano e si allontanano progressivamente
   seguendo l'anello.

   COSA NON SI CAMBIA: le direzioni angolari. Le tre insegne restano esattamente
   dove stavano sullo schermo, perche' quelle posizioni sono costate due
   revisioni (lo scostamento della hero, l'apertura calcolata perche' non si
   sovrapponessero) e non c'e' nessun motivo di rimetterle in discussione.
   Cambiano solo la DISTANZA lungo ciascuna direzione e l'ORIENTAMENTO — cioe'
   esattamente i due indizi che mancavano.

   I NUMERI CHE NE ESCONO, calcolati e non sperati (`strumenti/anello.mjs`):

     insegna    direzione   distanza   girata di
     prima        0,000       9,60 m     0,0 gradi
     seconda      0,226       9,91 m    16,1 gradi
     terza        0,452      10,99 m    32,8 gradi

   La terza e' il 14% piu' lontana della prima e gira di un terzo di angolo
   retto: da li' viene il tondo.

   E NON SI SOVRAPPONGONO — anzi, si allontanano. Girandosi, un pannello
   proietta meno larghezza: la terza da 2,00 m ne proietta 1,68, e stando piu'
   lontana ne occupa ancora meno in angolo. L'aria fra la prima e la seconda
   passa da 0,20 a 0,24 m, fra la seconda e la terza a 0,55 m. Era il difetto
   che due revisioni avevano segnalato, e questa modifica lo allarga invece di
   riaprirlo.

   PERCHE' QUARANTA METRI. Sembra enorme, e lo e': ma il raggio da solo non
   dice niente: conta insieme all'apertura. Le tre insegne coprono 0,452
   radianti visti dall'occhio, e su quell'arco un raggio piccolo le girerebbe
   troppo — a 15 m l'ultima sarebbe a 46 gradi, cioe' una lama di taglio con
   dentro un sito da leggere. Quaranta e' il raggio che porta l'ultima a 32,8
   gradi: la soglia sotto cui si legge ancora la fotografia e sopra cui si vede
   l'anello. Il numero che conta e' quello, non il raggio. */
const RAGGIO_ANELLO = 40.0

/**
 * DOVE STA E COME E' GIRATA l'insegna `i` — posizione e imbardata insieme.
 *
 * Stanno insieme apposta: sono due facce dello stesso anello, e tenerle in due
 * punti diversi del file e' il modo in cui si arriva ad avere una posizione
 * aggiornata e un orientamento vecchio. Questo file ha gia' pagato due volte
 * quell'errore (vedi `SCARTO_SCOSTATO`), e la seconda ha lasciato una insegna
 * mezza fuori dallo schermo.
 */
function posa(i: number, aspetto: number) {
  const a = angolo(i, aspetto)
  /* la tangente e' la PRIMA: da li' parte il cerchio */
  const a0 = angolo(0, aspetto)
  // di quanto questa insegna e' scostata, in angolo, dalla prima
  const psi = a - a0
  // il centro dell'anello: oltre le insegne, sulla direzione della prima
  const dc = LONTANANZA + RAGGIO_ANELLO
  const cx = OCCHIO.x + Math.sin(a0) * dc
  const cz = OCCHIO.z + Math.cos(a0) * dc
  /* dove il raggio dell'occhio incontra l'anello, sulla faccia VICINA.
     La radice e' quella con il meno: con il piu' si prende il punto dall'altra
     parte del cerchio, cioe' quaranta metri piu' in la', e le insegne
     sparirebbero nel fondo senza dare nessun errore. */
  const sotto = RAGGIO_ANELLO * RAGGIO_ANELLO - dc * dc * Math.sin(psi) * Math.sin(psi)
  const r = dc * Math.cos(psi) - Math.sqrt(Math.max(0, sotto))
  const x = OCCHIO.x + Math.sin(a) * r
  const z = OCCHIO.z + Math.cos(a) * r
  /* L'IMBARDATA E' LA NORMALE USCENTE DELL'ANELLO, cioe' la direzione dal
     centro verso l'insegna. Con `rotation.y = t` la normale del piano (il suo
     +Z locale) finisce lungo (sin t, cos t), quindi `t` e' proprio l'angolo di
     quel vettore.
     Verifica che vale piu' di una prova: per la prima insegna il centro sta
     esattamente dietro, quindi la normale e' l'opposto della direzione di
     vista e questa formula restituisce `a0 + PI` — la stessa riga che c'era
     prima. La costruzione nuova contiene la vecchia come caso particolare, ed
     e' il segno che non si e' cambiato quello che funzionava. */
  return { x, z, imbardata: Math.atan2(x - cx, z - cz) }
}

/* ============================================================ LA CURVA

   LE INSEGNE SONO ARCHI, NON RETTANGOLI — ed e' la seconda volta che questa
   richiesta arriva, la prima volta per il carosello dei lavori.

   Stavano gia' su un arco (vedi `angolo` qui sopra): tre posizioni su una
   circonferenza di 9,6 m, ognuna girata per guardare l'occhio in faccia. Ma
   ogni pannello era PIANO, e tre piani tangenti a un cerchio non sono un
   cerchio: sono un poligono. Il committente l'ha guardato e ha detto di farli
   «piu' stile curvi come quelli dei lavori» — cioe' ha riconosciuto che nel
   carosello la cosa era gia' stata risolta e qui no.

   Aveva ragione anche su dove guardare: `scene/Vetrina3D.ts` ha la stessa
   costruzione da mesi, con la stessa motivazione scritta accanto («la
   differenza fra un poligono e un cerchio la fa la curvatura DENTRO ogni
   faccia»). Questo e' quel pezzo portato qui.

   IL RAGGIO NON E' QUELLO DELLA DISPOSIZIONE, e la ragione e' aritmetica.
   Piegando un pannello di 2,0 m sul raggio su cui e' disposto (9,6 m) la
   freccia dell'arco viene di 5 cm: geometricamente esatta, otticamente
   inesistente — la stessa trappola gia' pagata sul carosello, dove il primo
   provino curvo era indistinguibile da quello piatto.
   A 1,90 la freccia sale a 28 cm su 2,0 m di larghezza, cioe' il 14%: i bordi
   vengono avanti di quasi un terzo di metro e la prospettiva li mostra piu'
   vicini del centro. Si perde la coincidenza con la circonferenza di
   disposizione, e va detto invece che nascosto: il bersaglio non e' un solido
   corretto, e' che si legga come un anello. */

/* ============================================================ E POI PIATTE

   LA SUPERFICIE NON E' PIU' PIEGATA, e la storia di questa riga vale piu' della
   riga.

   Il committente aveva chiesto la curvatura due volte — «falli piu' stile curvi
   come quelli dei lavori», poi «la curvatura come un cerchio che parte dal
   primo ed e' tondo» — e tutte e due le volte aveva ragione: i tre pannelli
   leggevano come una fila dritta. Ma la causa vera era UNA SOLA delle due cose
   che ho cambiato, e non questa: era l'arco centrato sull'occhio (vedi
   «L'ANELLO» qui sopra), che per costruzione proietta come una retta.
   Sistemato quello, la piega dentro la faccia e' diventata quello che era
   sempre stata — un secondo rimedio per un problema gia' risolto. E dopo aver
   visto i mockup, dove i pannelli sono rettangoli PIATTI angolati, l'ha detto
   in cinque parole: «non deve essere piu' curvo pero'».

   E' la stessa lezione della minigonna e del compenso sui comandi, la terza
   volta in una notte: quando due rimedi partono insieme e il difetto sparisce,
   uno dei due non stava servendo — e resta li' a deformare qualcosa finche'
   qualcuno non lo guarda.

   COSA RESTA. L'anello: posizioni, distanze e imbardate progressive. Il cerchio
   c'e' ancora ed e' quello che si vede — perche' era sempre stato quello.

   `insegnaCurva` NON resta nel file. L'avevo lasciata «per quando servira'», e
   il compilatore l'ha rifiutata: codice mai chiamato e' un errore, non un
   deposito. Aveva ragione lui — un pezzo tenuto da parte senza chiamante non e'
   disponibile, e' solo non compilato. Sta nella storia del progetto, che e' il
   posto dove le cose tolte si ritrovano davvero, ed e' venti righe.
   E la piega c'e' ancora dove serve, viva e usata: `scene/Vetrina3D.ts`, sulle
   carte del carosello, che sono schermi ricurvi apposta. */
/* ============================================================ L'ALONE

   LA LUCE CADE SULLA SCENA, e questa e' l'unica cosa che distingue una cornice
   accesa da una cornice disegnata.

   Nella fotografia portata dal committente il filo d'oro non finisce sul bordo
   del pannello: sfuma verso l'esterno, sul buio intorno. E' quello che dice che
   la cornice EMETTE invece di essere dipinta — e non si puo' ottenere dentro la
   tela del pannello, perche' li' il bordo dell'immagine e' il confine del mondo.

   Quindi e' un piano a parte, un filo piu' grande del pannello e messo dietro,
   con una tessitura che e' trasparente al centro, accesa lungo il perimetro del
   pannello e spenta ai propri bordi.

   ADDITIVA, non trasparente. Una luce si SOMMA a cio' che ha sotto: e' il
   motivo per cui un alone su fondo chiaro quasi non si vede e su fondo scuro
   brilla, che e' esattamente come si comporta la luce vera. In trasparenza
   normale, invece, l'alone COPRIREBBE il fondo con una velatura beige — che e'
   il difetto del giro precedente, spostato di dieci centimetri.

   La tessitura si costruisce una volta sola e la usano tutte e tre: e' la
   stessa forma, e tre copie dello stesso disegno sono tre volte la memoria per
   niente. */
let tessituraAlone: CanvasTexture | null = null
/** quanto il piano dell'alone e' piu' grande del pannello */
const ALONE_FUORI = 1.30

function alonePerimetro(largo: number, alto: number) {
  if (!tessituraAlone) {
    /* 256 e non 1024: e' una macchia sfumata, e una macchia sfumata non ha
       nessun dettaglio da perdere. Il filtro lineare fa il resto. */
    const L = 256
    const A = Math.round(L / RAPPORTO)
    const tela = document.createElement('canvas')
    tela.width = L
    tela.height = A
    const c = tela.getContext('2d')!
    const dati = c.createImageData(L, A)
    // dove sta il bordo del pannello dentro questo piano piu' grande
    const mx = (L * (1 - 1 / ALONE_FUORI)) / 2
    const my = (A * (1 - 1 / ALONE_FUORI)) / 2
    for (let y = 0; y < A; y++) {
      for (let x = 0; x < L; x++) {
        /* la distanza dal RETTANGOLO del pannello, positiva fuori.
           Fuori da un rettangolo la distanza e' l'ipotenusa degli scarti sui
           due assi: prenderne solo il massimo darebbe angoli quadrati, e un
           alone con gli angoli quadrati si vede subito che e' finto. */
        const dx = Math.max(mx - x, x - (L - mx), 0)
        const dy = Math.max(my - y, y - (A - my), 0)
        const d = Math.hypot(dx, dy)
        // quanto puo' arrivare lontano: il lato corto del margine
        const portata = Math.min(mx, my)
        let v = 1 - d / portata
        v = Math.max(0, v)
        /* la quarta potenza: la luce che esce da un bordo cade in fretta, e una
           caduta lineare fa una fascia larga e uniforme — cioe' un contorno
           sfocato invece di un bagliore. */
        v = v * v * v * v
        // dentro il pannello non serve: li' davanti c'e' il pannello
        if (dx === 0 && dy === 0) v = 0
        const i = (y * L + x) * 4
        dati.data[i] = 232
        dati.data[i + 1] = 176
        dati.data[i + 2] = 102
        dati.data[i + 3] = Math.round(v * 255)
      }
    }
    c.putImageData(dati, 0, 0)
    tessituraAlone = new CanvasTexture(tela)
    tessituraAlone.colorSpace = SRGBColorSpace
    tessituraAlone.minFilter = LinearFilter
    tessituraAlone.magFilter = LinearFilter
    tessituraAlone.generateMipmaps = false
  }
  const m = new Mesh(
    new PlaneGeometry(largo * ALONE_FUORI, alto * ALONE_FUORI),
    new MeshBasicMaterial({
      map: tessituraAlone,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      blending: AdditiveBlending,
      /* 0,26, E SCESO DOPO I MONTANTI PERCHE' LO SCOPRE LA MISURA.
         Abbassando il profilo, l'alone e' rimasto a 102 di mediana contro i 62
         del profilo: era diventato lui la cosa piu' chiara del gruppo, e nessuno
         lo avrebbe detto guardando — un alone e' sfumato, e una cosa sfumata
         sembra sempre meno luminosa di una netta.
         E' esattamente il tipo di scoperta per cui lo strumento misura i due
         SEPARATAMENTE: con un numero solo per il gruppo avrei continuato a
         girare la manopola sbagliata. */
      opacity: 0.20,
    }),
  )
  m.name = 'INSEGNA_ALONE_BORDO'
  return m
}

/* ============================================================ IL PROFILO

   LA CORNICE E' UN OGGETTO, e questo e' il quarto giro sullo stesso pezzo.

   I tre precedenti l'hanno disegnata dentro la tessitura, con opacita' e
   spessori sempre diversi, e nessuno dei tre poteva funzionare per una ragione
   che il committente ha detto in sette parole: «non e' lo stesso livello
   tridimensionale». Un filo dipinto dentro un'immagine vive nel piano di
   quell'immagine. Non ha un fianco da mostrare quando il pannello gira, non
   riceve luce diversa in cima e di lato, non copre niente e non e' coperto da
   niente. Puo' essere brillante quanto si vuole: resta un disegno.

   Sui mockup il profilo SPORGE, e si vede perche' i pannelli sono girati —
   quello di destra a 33 gradi mostra il fianco del suo montante. E' esattamente
   il dettaglio che non si puo' dipingere.

   QUINDI E' METALLO, NON LUCE. Quattro barre di ottone lucido intorno allo
   schermo, spesse 26 mm e profonde 55, in piedi davanti al piano
   dell'immagine. Il materiale non e' `MeshBasic`: un `MeshBasic` disegna lo
   stesso colore su tutte e sei le facce e il rilievo tornerebbe a non vedersi —
   sarebbe un disegno con piu' passaggi. Serve un metallo VERO, che prenda
   l'ambiente: solo cosi' la faccia in cima e quella di lato restituiscono due
   luci diverse, ed e' quella differenza a dire «spessore».
   Un filo di emissione sotto (`emissiveIntensity`) perche' nei mockup il
   profilo e' anche acceso, non solo lucido: senza, di notte sparirebbe.

   IL MONTANTE DI SINISTRA E' PIU' PROFONDO degli altri tre. Nel riferimento
   quella e' la barra che si nota, e la ragione e' costruttiva prima che
   estetica: e' il montante a cui il pannello e' appeso, gli altri tre sono
   bordi. Un profilo tutto uguale legge come una cornice da quadro. */
/* SOTTILE E ACCESO, non spesso e lucido — quinto giro, e la differenza fra i
   due e' tutta qui.
   A 26 mm di spessore le quattro barre leggevano come una CORNICE DA QUADRO:
   un bordo di ottone largo abbastanza da diventare lui il soggetto, con dentro
   una fotografia. Nel riferimento il profilo e' un filo — sottile quanto una
   riga e acceso come una lampada al neon — e la profondita' c'e' lo stesso
   perche' e' profondo, non perche' e' largo.
   Sono due parametri indipendenti e li avevo legati: lo spessore scende a
   11 mm, la profondita' resta a 55. Un filo profondo cinque volte la propria
   larghezza mostra il fianco quando il pannello gira (che era il difetto del
   giro prima) senza mai diventare una fascia. */
const PROFILO_SP = 0.011
const PROFILO_PR = 0.055

function profiloMateriale() {
  if (!materialeProfilo) {
    materialeProfilo = new MeshStandardMaterial({
      /* SU UN METALLO IL COLORE E' LA RIFLETTANZA, e questa e' la manopola che
         mancava. 0,72 di rosso non vuol dire «ottone chiaro»: vuol dire che
         quel profilo rimanda il 72% di quello che ha davanti — e davanti ha la
         villa illuminata. Nessuna riduzione dell'emissione poteva toglierglielo,
         e infatti tre giri di manopole non hanno mosso il numero.
         0,30 E' IL MIGLIORE MISURATO, e non fa passare il cancello: lo dico
         perche' e' piu' onesto di sceglierne un altro.
         Il percorso, con `strumenti/gerarchia.mjs` che spegne un telaio per
         volta e guarda quanto STACCA da cio' che copre:
             riflettanza 0,105  ->  peggiore -77,6
             riflettanza 0,235  ->  peggiore -66,0
             riflettanza 0,30   ->  peggiore -55,2   <- il migliore
         (Il metro e' ripetibile: tre corse identiche a 0,235 danno -66,2,
          -65,3 e -66,5. Una quarta misura isolata aveva dato -50,2 ed era
          l'anomalia — l'ho scoperto solo perche' ho verificato il rumore prima
          di credere alla differenza, che e' la regola che mi ero dato e che
          per quattro giri avevo saltato.)
         Il segno conta: a 0,105 i telai erano piu' SCURI del fondo del 92%, e
         continuare ad abbassarli li rendeva piu' evidenti, non meno. Una linea
         scura su fondo chiaro stacca come una chiara su fondo scuro.
         PERCHE' NON SI ARRIVA A 0,70. Il telaio peggiore e' quello del pannello
         di EVERY INTERFACE, che e' quasi BIANCO: per accordarcisi dovrebbe
         essere bianco anche lui, e a quel punto gli altri due — che stanno su
         pannelli scuri — si sfonderebbero. Un materiale solo non puo' accordarsi
         a tre fondi diversi, e un telaio intorno a una superficie bianca e'
         scuro per necessita': e' quello che fa un telaio.
         Il cancello resta li' a dirlo invece di essere abbassato fino a
         passare. Se un giorno si vorra' chiudere davvero, la strada non e' il
         materiale: e' il fondo — un velo dietro il bordo del pannello chiaro,
         o un telaio che prende la tinta del pannello che incornicia.
         Sembra troppo scuro finche' non si ricorda che questo profilo sta
         intorno a uno SCHERMO ACCESO: un telaio scuro attorno a una superficie
         luminosa e' quello che si vede in qualunque cornice retroilluminata, e
         quello che lo fa leggere non e' la sua luce — e' il contrasto col
         pannello. Un telaio non e' un gioiello. */
      color: new Color(0.30, 0.225, 0.135),
      metalness: 0.95,
      /* 0,42 E NON 0,22, E L'AMBIENTE A 0,45.
         Abbassare la sola emissione non bastava, e il motivo e' che un metallo
         a ruvidita' 0,22 non brilla per quello che emette: brilla per quello che
         SPECCHIA. Il profilo aveva addosso l'intero panorama, e nessuna
         manopola dell'emissione poteva toglierglielo.
         Ruvidita' piu' alta allarga il colpo speculare e ne abbassa il colmo —
         e' la stessa leva che aveva risolto i cerchi che diventavano dischi
         ciano — e l'intensita' d'ambiente scende con lei. Un ottone spazzolato
         invece che lucidato: che e' anche piu' giusto per un montante. */
      roughness: 0.42,
      envMapIntensity: 0.24,
      emissive: new Color(1.0, 0.80, 0.52),
      /* 0,13, E CI SONO ARRIVATO IN QUATTRO GIRI: 0,22, 0,85, 0,30, e adesso
         questo. Vale la pena dire perche' il terzo non e' bastato.
         A 0,30 avevo misurato e concluso «fatto»: la mediana dei montanti era
         scesa da 98-146 a 69-127. Sembrava molto. Ma il confronto giusto non e'
         con SE STESSI PRIMA — e' con la vettura, e la revisione l'ha rimisurato:
         montanti 105-146 di mediana contro 103 della spalla. Ancora sopra.
         Ero caduto nel modo piu' banale di sbagliare una correzione: misurare
         il MIGLIORAMENTO invece del BERSAGLIO. Un numero che scende del
         quaranta per cento sembra una vittoria finche' non si guarda dove
         doveva arrivare.
         Adesso il bersaglio e' scritto e lo controlla `strumenti/gerarchia.mjs`:
         la mediana dei montanti sotto il 70% di quella della spalla. Non e' un
         gusto — sotto quella soglia il primo sguardo va sul soggetto, sopra va
         su tre linee parallele.
         Il ragionamento del giro precedente resta, ed era gia' giusto:
         Il ragionamento che porto' a 0,85 era giusto nel merito: su un filo di
         11 mm il rilievo non lo porta l'ombreggiatura della faccia, lo porta il
         profilo contro il fondo, e li' l'emissione non copre niente. Ma
         rispondeva a una domanda sola — «si vede?» — e ne esisteva una seconda
         che non avevo posto: «si vede PIU' DELLA VETTURA?».
         `strumenti/gerarchia.mjs` l'ha misurata sul poster: i montanti
         piccavano a 252,2 contro i 254,3 del punto piu' chiaro della
         carrozzeria — pari merito. E il picco non e' nemmeno il numero
         peggiore: la MEDIANA dei montanti era 98-146 mentre quella della
         fiancata e' 18-52. Un filo continuamente chiaro batte un riflesso
         intermittente a parita' di picco, perche' l'occhio somma la lunghezza.
         Tre linee parallele nette che vincono sul soggetto sono un difetto di
         gerarchia, non di luce.
         Vecchio commento, che resta perche' e' la meta' vera del ragionamento:
         il ragionamento precedente era giusto per barre
         LARGHE e sbagliato per un filo.
         Su una fascia di 26 mm l'emissione piena appiattiva le sei facce sullo
         stesso valore e il rilievo spariva: vero. Ma su un filo di 11 mm il
         rilievo non lo porta l'ombreggiatura della faccia — che a quella
         larghezza e' due pixel — lo porta il PROFILO contro il fondo. Li'
         l'emissione non copre niente e fa l'unica cosa che serve: accendere.
         E' la stessa correzione degli altri due numeri di stanotte: un valore
         giusto smette di esserlo quando cambia quello a cui era accordato. */
      emissiveIntensity: 0.03,
    })
    materialeProfilo.name = 'PROFILO_INSEGNA'
  }
  return materialeProfilo
}
let materialeProfilo: MeshStandardMaterial | null = null

function profilo(largo: number, alto: number) {
  const g = new Group()
  g.name = 'INSEGNA_PROFILO'
  const M = profiloMateriale()
  const sp = PROFILO_SP
  const pr = PROFILO_PR
  // il montante di sinistra: piu' profondo, ed e' quello che si vede
  const prSx = pr * 1.7
  const barra = (l: number, a: number, p: number, x: number, y: number) => {
    const b = new Mesh(new BoxGeometry(l, a, p), M)
    /* z = p/2 e non 0: le barre stanno DAVANTI al piano dell'immagine, cioe'
       poggiate sopra invece che dentro. E' tutta qui la differenza. */
    b.position.set(x, y, p / 2)
    b.name = 'PROFILO_BARRA'
    g.add(b)
    return b
  }
  /* I MONTANTI ESCONO SOPRA E SOTTO, le traverse no.
     Nel riferimento le due righe verticali superano il pannello: e' quello a
     far leggere il pannello come APPESO a una struttura invece che chiuso
     dentro una cornice. Una cornice si chiude sui quattro angoli; un telaio
     no, e questi sono schermi montati su un telaio.
     Il 9% e non il 30%: piu' lunghi diventerebbero due colonne, ed e' l'errore
     gia' fatto e corretto due giri fa con la vecchia lama di luce. */
  const oltre = alto * 0.09
  // sopra e sotto, lunghe quanto tutto il pannello piu' i due montanti
  barra(largo + sp * 2, sp, pr, 0, alto / 2 + sp / 2)
  barra(largo + sp * 2, sp, pr, 0, -alto / 2 - sp / 2)
  // destra
  barra(sp, alto + oltre * 2, pr, largo / 2 + sp / 2, 0)
  // e il montante di sinistra: piu' profondo, e' quello che si vede
  barra(sp, alto + oltre * 2, prSx, -largo / 2 - sp / 2, 0)
  return g
}

function insegnaPiana(largo: number, alto: number) {
  /* due segmenti in orizzontale e non uno: la caduta angolare qui sotto legge
     la normale per vertice, e su un quadrilatero a quattro vertici il centro
     della faccia lo ricava interpolando i quattro angoli — che su un piano e'
     esatto, ma diventa sbagliato appena qualcuno rimette una piega. Costa due
     triangoli. */
  return new PlaneGeometry(largo, alto, 2, 1)
}


/**
 * LA CADUTA ANGOLARE — senza questa, curvare non si vede.
 *
 * E' il reperto che e' costato un provino sul carosello e che qui sarebbe
 * costato lo stesso: le insegne sono `MeshBasicMaterial`, cioe' non ricevono
 * luce, e una superficie senza ombreggiatura NON MOSTRA la propria forma. Un
 * pannello piegato e uno piatto disegnano gli stessi pixel, perche' l'unico
 * indizio rimasto e' la deformazione prospettica della tessitura — che a dieci
 * metri e' niente.
 *
 * Quello che si aggiunge non e' un trucco: uno schermo vero perde luminosita'
 * guardato di taglio, e qui la si calcola dal prodotto scalare fra normale e
 * direzione di vista. Al centro, dove la normale punta all'occhio, resta
 * piena; verso i bordi, dove la curvatura la fa girare, si smorza. La
 * geometria E' curva — questo la mostra.
 *
 * Sui numeri di qui: al bordo la normale e' girata di 31,8 gradi e la
 * direzione di vista di altri 5,9, quindi il fattore scende a circa 0,88 —
 * un dodici per cento di caduta. Sotto il dieci non si legge, sopra il venti
 * i bordi sembrano sporchi.
 */
function insegnaCadutaAngolare(m: MeshBasicMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vNormIns;
varying vec3 vVistaIns;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vNormIns = normalize( normalMatrix * normal );
  vVistaIns = ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz;`)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vNormIns;
varying vec3 vVistaIns;`)
      .replace('#include <opaque_fragment>', `
  {
    float faccia = abs( dot( normalize( vNormIns ), normalize( -vVistaIns ) ) );
    // 0,62 e' il residuo ai bordi. A zero il bordo sparisce e il pannello
    // sembra tagliato invece che girato, e questi sono piu' grandi delle carte
    // del carosello: il bordo si vede di piu' e va tenuto piu' alto.
    gl_FragColor.rgb *= mix( 0.62, 1.0, pow( faccia, 1.35 ) );
  }
#include <opaque_fragment>`)
  }
  m.customProgramCacheKey = () => 'insegnaCurva'
  return m
}

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
        insegnaPiana(LARGO, LARGO / RAPPORTO),
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
        insegnaCadutaAngolare(new MeshBasicMaterial({
          map: t, transparent: true, toneMapped: false, depthWrite: false,
          // il valore vero lo scrive `pareggia()` quando la fotografia arriva:
          // questo e' solo il colore di partenza, quando non c'e' ancora niente
          // da pareggiare
          color: 0xc6d2e2,
        })),
      )
      m.name = 'INSEGNA_' + (lavoro?.codice ?? quale)
      m.renderOrder = 6
      // dove sta sull'arco: il conto e' in `angolo`, e si rifa' se cambia il
      // formato dello schermo — vedi `aggiorna`
      const q = posa(i, 1.6)
      m.position.set(q.x, QUOTA, q.z)
      /* E OGNUNO GUARDA L'OCCHIO IN FACCIA — sta all'angolo `a` sull'arco,
         quindi la sua normale deve puntare all'indietro lungo lo stesso
         raggio: mezzo giro.
         Il segno l'ho sbagliato al primo giro, e non c'era nessun modo di
         accorgersene guardando: la normale di un piano guarda verso +Z, e
         girata dalla parte sbagliata puntava lontano dalla camera. Un
         `MeshBasicMaterial` disegna una faccia sola, quindi i tre schermi
         venivano scartati prima di essere rasterizzati — in scena, accesi,
         opacita' 0,99, e invisibili. Nessun errore e nessun avviso. */
      m.rotation.y = q.imbardata
      /* l'alone del perimetro sta DIETRO il pannello: se fosse davanti
         velerebbe la fotografia proprio sui bordi, cioe' dove c'e' il profilo
         da leggere. E il profilo, che e' un oggetto, sta davanti. */
      const bagliore = alonePerimetro(LARGO, LARGO / RAPPORTO)
      bagliore.position.z = -0.012
      bagliore.renderOrder = 5
      m.add(bagliore)
      m.add(profilo(LARGO, LARGO / RAPPORTO))

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

    /* LA FASCIA IN FONDO, e la fotografia sta fra le due.
       Nel riferimento ogni mockup ha una riga sotto — «SCOPRI IL PROGETTO» —
       ed e' quella a dire che si sta guardando un LAVORO invece che una
       decorazione. Senza, tre immagini dentro tre cornici sono tre immagini. */
    const CODA = Math.round(TA * 0.105)
    if (foto) {
      const alto = TA - BARRA - CODA
      const r = Math.max(TL / foto.width, alto / foto.height)
      c.save()
      c.beginPath()
      c.rect(0, BARRA, TL, alto)
      c.clip()
      /* SI PRENDE LA CIMA DELLA PAGINA, NON IL CENTRO.
         Le copertine sono scatti larghi 16:10 e questo riquadro adesso e'
         quasi quadrato: qualcosa va tagliato. Centrando, si taglierebbe in
         parti uguali sopra e sotto — cioe' si toglierebbe meta' del TITOLO,
         che nella fotografia di un sito e' la sola cosa leggibile a questa
         misura. Ancorando in alto si perde il fondo pagina, che a due metri di
         distanza non si legge comunque. */
      c.drawImage(foto, (TL - foto.width * r) / 2, BARRA, foto.width * r, foto.height * r)
      c.restore()
    }

    // la fascia della didascalia
    const yCoda = TA - CODA
    c.fillStyle = '#080c14'
    c.fillRect(0, yCoda, TL, CODA)
    c.fillStyle = 'rgba(216,162,88,0.20)'
    c.fillRect(0, yCoda, TL, 1)
    c.textAlign = 'left'
    c.textBaseline = 'middle'
    c.font = '600 ' + Math.round(CODA * 0.30) + 'px Switzer, system-ui, sans-serif'
    c.letterSpacing = Math.round(CODA * 0.055) + 'px'
    c.fillStyle = 'rgba(216,162,88,0.86)'
    c.fillText(t('insegnaScopri'), BARRA * 0.9, yCoda + CODA / 2)
    // la freccia, disegnata e non scritta: un carattere di freccia cambia
    // disegno da un sistema all'altro, e qui si vede grande
    c.letterSpacing = '0px'
    const fx = TL - BARRA * 1.6, fy = yCoda + CODA / 2, fs = CODA * 0.20
    c.strokeStyle = 'rgba(216,162,88,0.86)'
    c.lineWidth = Math.max(1.6, CODA * 0.035)
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(fx - fs, fy + fs); c.lineTo(fx + fs, fy - fs)
    c.moveTo(fx + fs * 0.1, fy - fs); c.lineTo(fx + fs, fy - fs); c.lineTo(fx + fs, fy - fs * 0.1)
    c.stroke()

    /* ============================================================ LA CORNICE

       IL FILO D'AMBRA INTORNO — e' la firma dei mockup del riferimento, ed e'
       anche la grammatica che il sito usa gia' dappertutto (la cornice di
       pagina, i comandi, le pastiglie in testa).
       Si disegna DENTRO la tela e non con un secondo piano: un secondo piano
       andrebbe curvato insieme al pannello e tenuto allineato, e sono due cose
       che si disallineano. Qui e' un pixel della stessa immagine, quindi segue
       la curvatura per costruzione.
       Due fili come altrove: uno pieno sul bordo e uno appena dentro, molto
       piu' tenue — a un filo solo la cornice legge come un contorno
       disegnato, a due legge come uno spessore. */
/* SULLA TELA RESTA SOLO IL TAGLIO DELLO SCHERMO — la cornice se n'e' andata
       da qui, ed e' il quarto giro.
       Il committente: «la cornice non e' lo stesso livello tridimensionale».
       E' esatto e si vede confrontandola con la lama di luce, che e' sempre
       stata un oggetto a se': un filo disegnato dentro la tessitura sta ESATTAMENTE
       nel piano dell'immagine, spessore zero, e quindi non gira con il pannello,
       non mostra un fianco, non riceve luce diversa in cima e di lato. Sui
       mockup la cornice e' un profilo che SPORGE, e i due pannelli girati la
       mostrano di taglio: e' quella la cosa che non si puo' dipingere.
       Questo filo sottile resta solo per chiudere il bordo dell'immagine sotto
       il profilo, che altrimenti si vedrebbe finire nel nulla. */
    c.strokeStyle = 'rgba(216,162,88,0.28)'
    c.lineWidth = 1
    c.strokeRect(1.5, 1.5, TL - 3, TA - 3)

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
        const q = posa(i++, aspetto)
        o.position.set(q.x, QUOTA, q.z)
        o.rotation.y = q.imbardata
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
