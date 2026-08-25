import {
  AdditiveBlending, BackSide, CanvasTexture, Color, Group, LinearFilter, Mesh,
  MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, SphereGeometry,
  SRGBColorSpace, Vector3,
} from 'three'
import type { Texture, WebGLRenderer } from 'three'

/**
 * IL TRAMONTO — l'unica ora che questo posto non ha, e che quindi si calcola.
 *
 * IL DIFETTO, trovato guardando la fotografia invece che il codice.
 *
 * Il pulsante «TRAMONTO» gira il panorama di 90 gradi. Il commento di
 * `Panorama.ts` diceva che li' c'era «la piscina a sfioro col tramonto
 * dentro» — e il provino dei quattro luoghi dice il contrario: TRAMONTO e' la
 * vista PIU' FREDDA delle quattro, cielo azzurro e vettura illuminata di
 * azzurro.
 *
 * Ho provato a cercare il sole vero con due misure. La prima, sulla
 * panoramica (`strumenti/dovesta.mjs`), ha trovato un picco caldo netto a 74
 * gradi. La seconda, girando la manopola e misurando il cielo dietro
 * l'automobile (`strumenti/cercatramonto.mjs`), ha detto 45 gradi. Poi ho
 * guardato la striscia dell'orizzonte, e nessuna delle due aveva ragione: il
 * caldo che avevo misurato e' l'INTERNO ILLUMINATO DELLA VILLA. La panoramica
 * e' un'ora blu — villa bianca, piscina a sfioro, mare, cielo grigio-azzurro
 * uniforme. Non c'e' nessun sole, da nessuna parte.
 *
 * Due misure corrette e due conclusioni sbagliate di fila, per la stessa
 * ragione: «caldo» non distingue un tramonto da una lampadina. E' la terza
 * volta in due giorni che un criterio non separa due popolazioni che
 * condividono un valore, ed e' la ragione per cui la striscia
 * dell'orizzonte — dieci secondi di lavoro — andava guardata per prima.
 *
 * QUINDI IL TRAMONTO SI COSTRUISCE, e non e' un ripiego: e' la cosa piu'
 * coerente che questo sito possa fare. Il suo argomento e' che un ambiente
 * CALCOLATO puo' fare quello che una fotografia non fa, e i comandi esistono
 * per dimostrarlo. Una fotografia sola non puo' cambiare ora — lo dice il
 * commento in `ui/Comandi.ts`, ed e' vero. Ma una fotografia PIU' UNA LUCE
 * CALCOLATA si', ed e' esattamente la differenza che il sito vende.
 *
 * PERCHE' PROPRIO PER QUESTA VETTURA. Una carena continua senza nervature non
 * ha spigoli su cui appoggiare un riflesso: quello che le serve sono sorgenti
 * LUNGHE e ORIZZONTALI, che si comprimono su un asse solo e restano righe. Un
 * sole basso e' la sorgente orizzontale piu' lunga che esista — e' l'intero
 * orizzonte acceso. E' la stessa ragione per cui le strisce di
 * `ambienteConStrisce` sono 24 x 0,18 invece che 12 x 0,55.
 */

/** quanto e' lontano il sole: abbastanza da stare dietro tutto */
const LONTANANZA = 62
/** e a che quota, cioe' quanto e' basso. 2,2 m su 62 sono meno di due gradi. */
const QUOTA_SOLE = 2.2

/**
 * DOVE STA IL SOLE, in azimut del mondo.
 *
 * La camera del primo tempo sta a (5,4 / 0,88 / 4,25) e guarda l'origine,
 * quindi «dietro l'automobile» e' la direzione opposta: circa -128 gradi. Il
 * sole sta li', scostato di venti gradi verso il lato lungo della vettura —
 * un sole esattamente in asse dietro il soggetto lo mette in controluce
 * totale, e una carrozzeria nera in controluce totale e' una sagoma nera.
 * Scostandolo, la luce arriva di TRE QUARTI: prende la spalla e corre lungo
 * la fiancata, che e' dove serve.
 */
/* 12 E NON 22. A ventidue gradi di scostamento il sole cadeva FUORI
   dall'inquadratura: la luce arrivava — la vettura era accesa di rame — ma la
   sorgente non si vedeva, e un tramonto di cui si vede solo l'effetto e' un
   filtro colore. La camera del primo tempo apre circa trentacinque gradi,
   quindi il margine utile e' meta' di quello: dodici sta dentro con un po'
   d'aria, ventidue no.
   E' l'ennesima volta che un numero giusto in scena e' sbagliato NEL
   FOTOGRAMMA: la geometria non sa dove guarda l'obiettivo. */
const AZIMUT = -128 + 12

function versoIlSole(distanza = LONTANANZA) {
  const a = (AZIMUT * Math.PI) / 180
  return new Vector3(Math.sin(a) * distanza, QUOTA_SOLE, Math.cos(a) * distanza)
}

/* ============================================================ LA TESSITURA

   UN DISCO SFUMATO, costruito una volta e riusato da tutti i pezzi che ne
   hanno bisogno. Serve al sole, al suo alone e alla foschia: sono tre cose di
   misura diversa fatte dello stesso materiale — luce che si spegne dai bordi.

   LA CADUTA E' UNA POTENZA, non lineare. Una sfumatura lineare disegna un
   cerchio con un contorno visibile: l'occhio trova il punto in cui finisce.
   Con l'esponente il bordo non c'e' mai, e la cosa legge come luce invece che
   come disco. */
let tessituraAlone: CanvasTexture | null = null
function alone() {
  if (tessituraAlone) return tessituraAlone
  const N = 256
  const tela = document.createElement('canvas')
  tela.width = N
  tela.height = N
  const c = tela.getContext('2d')!
  const dati = c.createImageData(N, N)
  const r = N / 2
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - r, y - r) / r
      const v = d >= 1 ? 0 : Math.pow(1 - d, 2.6)
      const i = (y * N + x) * 4
      dati.data[i] = 255
      dati.data[i + 1] = 255
      dati.data[i + 2] = 255
      dati.data[i + 3] = Math.round(v * 255)
    }
  }
  c.putImageData(dati, 0, 0)
  tessituraAlone = new CanvasTexture(tela)
  tessituraAlone.colorSpace = SRGBColorSpace
  tessituraAlone.minFilter = LinearFilter
  tessituraAlone.magFilter = LinearFilter
  tessituraAlone.generateMipmaps = false
  return tessituraAlone
}

function pezzoLuce(largo: number, alto: number, colore: number, forza: number) {
  const m = new MeshBasicMaterial({
    map: alone(),
    color: new Color(colore),
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    /* ADDITIVA: una luce si SOMMA a cio' che ha dietro. In trasparenza normale
       il sole coprirebbe il cielo con un disco opaco, che e' il contrario di
       quello che fa una sorgente. */
    blending: AdditiveBlending,
    opacity: forza,
  })
  return new Mesh(new PlaneGeometry(largo, alto), m)
}

/**
 * IL SOLE CHE SI VEDE — tre pezzi, e nessuno dei tre e' il sole.
 *
 * Un sole al tramonto non e' un disco: e' un disco piccolo dentro un alone
 * grande dentro una foschia larghissima. Se se ne disegna uno solo si ottiene
 * una lampadina incollata sul cielo, e si riconosce subito.
 *
 * LE PROPORZIONI SONO QUELLE VERE, non inventate: l'alone di un sole basso
 * arriva a una decina di volte il suo diametro, e la foschia all'orizzonte si
 * stende per decine di gradi su pochissima altezza. E' quel rapporto
 * ESTREMO — larghissima e bassissima — a far leggere «orizzonte» invece che
 * «macchia»: la stessa regola delle strisce dell'ambiente.
 */
export function soleBasso() {
  const g = new Group()
  g.name = 'SOLE_BASSO'
  const p = versoIlSole()

  // la foschia: larghissima e bassa, il caldo che sta lungo tutto l'orizzonte
  const foschia = pezzoLuce(150, 13, 0xff8a3c, 0.34)
  foschia.position.set(p.x, QUOTA_SOLE * 0.5, p.z)
  foschia.lookAt(0, QUOTA_SOLE * 0.5, 0)
  g.add(foschia)

  // l'alone
  const a = pezzoLuce(34, 34, 0xffa347, 0.55)
  a.position.copy(p)
  a.lookAt(0, QUOTA_SOLE, 0)
  g.add(a)

  // e il disco, piccolo e quasi bianco: un sole visto attraverso l'aria bassa
  // e' arancione ai bordi e bianco al centro, perche' li' e' saturo
  const disco = pezzoLuce(4.6, 4.6, 0xfff0d8, 0.95)
  disco.position.copy(p)
  disco.lookAt(0, QUOTA_SOLE, 0)
  g.add(disco)

  g.renderOrder = 2
  return g
}

/**
 * L'AMBIENTE DEL TRAMONTO — cio' che la carrozzeria specchia.
 *
 * Il sole che si vede e quello che ILLUMINA sono due cose separate, e devono
 * esserlo: il primo sta in scena e la camera lo inquadra, il secondo vive
 * dentro una mappa d'ambiente che la PMREM cuoce una volta. Tenerli uguali
 * sarebbe piu' semplice e sbagliato — la mappa d'ambiente guarda dall'ORIGINE
 * in tutte le direzioni, quindi le misure che vanno bene in scena li' non
 * vogliono dire niente.
 *
 * `DoubleSide` DAPPERTUTTO, e la ragione sta scritta per esteso in
 * `Panorama.ts`: la PMREM guarda dall'origine, e un piano `FrontSide` girato
 * dall'altra parte non esiste. Otto pannelli su nove sono stati invisibili per
 * settimane in questo progetto per quel motivo.
 */
export function ambienteTramonto(
  renderer: WebGLRenderer,
  texture: Texture,
  forza = 12,
) {
  const s = new Scene()

  /* LA FOTOGRAFIA RESTA, ed e' il posto. Quello che cambia e' l'ora, e l'ora e'
     luce: si aggiunge, non si sostituisce. Togliere il panorama qui vorrebbe
     dire che al tramonto la villa sparisce. */
  const sfondo = new Mesh(
    new SphereGeometry(100, 48, 32),
    new MeshBasicMaterial({ map: texture as never, side: BackSide }),
  )
  s.add(sfondo)

  const p = versoIlSole(30)

  /* LA BANDA DELL'ORIZZONTE — la sorgente lunga.
     E' il pezzo che conta per questa vettura: 90 metri per 1,6, cioe' un
     rapporto di 56 a 1. Una carena a doppia curvatura comprime qualunque
     sorgente su un asse; una sorgente gia' schiacciata resta una RIGA anche
     dopo, ed e' la riga che dice dove la superficie gira. */
  const caldo = new MeshBasicMaterial({ color: 0xff9142, toneMapped: false, side: 2 })
  /* 0,62 E NON 0,85. Al primo provino la carrozzeria leggeva RAME invece che
     nera-illuminata-di-arancio: una vernice quasi nera con addosso una sorgente
     cosi' forte perde la propria tinta e prende quella della luce. Un tramonto
     su un'auto nera si riconosce perche' il nero resta nero DOVE la luce non
     arriva — se arriva dappertutto, e' una verniciatura. */
  caldo.color.multiplyScalar(forza * 0.62)
  const banda = new Mesh(new PlaneGeometry(90, 1.6), caldo)
  banda.position.set(p.x, 1.05, p.z)
  banda.lookAt(0, 1.05, 0)
  s.add(banda)

  /* IL SOLE DENTRO LA MAPPA: piccolo e violento. E' quello che accende il
     riflesso stretto sulla spalla — la banda da sola fa una luce diffusa, e una
     luce solo diffusa su una vernice lucida la fa sembrare opaca. */
  const nucleo = new MeshBasicMaterial({ color: 0xffe0b0, toneMapped: false, side: 2 })
  nucleo.color.multiplyScalar(forza * 5.5)
  const sole = new Mesh(new PlaneGeometry(2.6, 2.6), nucleo)
  sole.position.set(p.x, 1.5, p.z)
  sole.lookAt(0, 1.5, 0)
  s.add(sole)

  /* IL CONTROLUCE FREDDO dalla parte opposta. Un tramonto non e' caldo
     dappertutto: il cielo alle spalle del sole resta blu, e senza quel freddo
     la vettura diventa monocroma arancione — che e' il modo piu' rapido di far
     sembrare finto un tramonto. */
  const freddo = new MeshBasicMaterial({ color: 0x7fa8d8, toneMapped: false, side: 2 })
  freddo.color.multiplyScalar(forza * 0.22)
  const dietro = new Mesh(new PlaneGeometry(60, 9), freddo)
  dietro.position.set(-p.x, 4.5, -p.z)
  dietro.lookAt(0, 4.5, 0)
  s.add(dietro)

  /* IL RIMANDO DA TERRA, caldo come la pietra scaldata dal giorno. Serve ai
     cerchi, che stanno dentro un passaruota e possono ricevere luce solo da
     sotto: la stessa ragione per cui esiste in `ambienteConStrisce`. */
  const daTerra = new MeshBasicMaterial({ color: 0xffb877, toneMapped: false, side: 2 })
  daTerra.color.multiplyScalar(forza * 0.34)
  for (const lato of [-1, 1]) {
    const rimando = new Mesh(new PlaneGeometry(9, 1.1), daTerra)
    rimando.position.set(lato * 2.5, 0.12, 0)
    rimando.rotation.set(-Math.PI / 2 - lato * 0.30, 0, Math.PI / 2)
    s.add(rimando)
  }

  const pmrem = new PMREMGenerator(renderer)
  const env = pmrem.fromScene(s, 0, 0.1, 200).texture
  pmrem.dispose()
  sfondo.geometry.dispose()
  ;(sfondo.material as MeshBasicMaterial).dispose()
  caldo.dispose()
  nucleo.dispose()
  freddo.dispose()
  daTerra.dispose()
  return env
}
