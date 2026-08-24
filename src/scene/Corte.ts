import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  DataTexture,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type Material,
  type Texture,
} from 'three'
import { anisotropiaMassima } from '../core/Anisotropia'

/**
 * LA CORTE — architettura costruita, non fotografata e non generata.
 *
 * PERCHE' SI RIFA' TUTTO L'AMBIENTE.
 *
 * Le tre cose che nel provino leggono come «cartapesta» hanno la stessa
 * radice:
 *
 *   - le COLONNE generate: 4.500 triangoli con una tessitura impastata,
 *     nate da una descrizione. Un generatore inventa una colonna
 *     plausibile; ma una colonna vera ha proporzioni che vengono da come
 *     sta in piedi, e l'occhio quelle le conosce anche senza saperlo.
 *   - i PARAPETTI: scatole grigie. Erano dichiaratamente provvisori.
 *   - l'HDRI: una fotografia di un altro posto, con la sua ora e le sue
 *     lampade, dietro a tutto.
 *
 * Tre linguaggi diversi nella stessa inquadratura. Non c'e' impianto luce
 * che li tenga insieme, perche' il difetto non e' la luce: e' che non sono
 * lo stesso mondo.
 *
 * PERCHE' UNA CORTE E NON UN PALAZZO.
 *
 * Una corte quadrata circondata da un porticato e' l'unica architettura che
 * funziona per una camera che ORBITA. Duecento gradi di giro: qualunque
 * fondale rivolto in una sola direzione, a meta' orbita, mostra il suo
 * rovescio o il vuoto. Il porticato invece e' lo stesso da tutte le parti —
 * e sono i pilastri a passare davanti alla camera uno dopo l'altro a dare
 * il senso del movimento, che con un fondale non c'e'.
 *
 * E dice quello che deve dire senza una parola: un porticato di pietra
 * intorno a un pavimento di marmo e' un cortile d'onore, non un
 * parcheggio.
 *
 * PERCHE' NON C'E' NIENTE DI DIFFICILE DA MODELLARE.
 *
 * E' una scelta, non un ripiego. La corte e' fatta di parallelepipedi
 * grandi: nessuna superficie curva, nessun dettaglio organico, niente che
 * si possa sbagliare. Il realismo qui NON dipende dall'abilita' di
 * modellazione — dipende da due cose che so controllare, le PROPORZIONI e i
 * MATERIALI. E' il modo giusto di scegliere un'architettura quando si deve
 * arrivare al fotorealismo: si sceglie quella il cui realismo sta dove si
 * puo' garantirlo.
 *
 * ------------------------------------------------------------------------
 * SECONDA STESURA — «QUESTO DEVE ESSERE UN LUOGO DI LUSSO»
 * ------------------------------------------------------------------------
 *
 * Il giudizio, guardando il provino, era: sembra un ipogeo. Blocchi di
 * arenaria grezza, un materiale solo, illuminazione a chiazze. E guardando
 * il fotogramma con il committente, aveva ragione su tutti e quattro i
 * capi. Sono quattro difetti nominabili, e nessuno si cura con «piu'
 * risoluzione».
 *
 * 1. LE PROPORZIONI ERANO TOZZE. 8,40 di altezza su 1,90 di larghezza fa
 *    4,4. Un porticato monumentale vero sta fra 8 e 11 (il colonnato del
 *    Louvre, la Basilica Palladiana, qualunque cortile d'onore), e sotto 5
 *    l'occhio non legge «colonna»: legge PILONE. La differenza fra un
 *    cortile d'onore e un parcheggio interrato e' quel numero.
 *
 *    Adesso e' 9,60 su 1,08, cioe' 8,9. Ordine gigante: piu' alto, molto
 *    piu' sottile, e i vuoti fra i sostegni diventano piu' larghi dei
 *    sostegni — che e' esattamente cio' che fa entrare l'aria in un
 *    porticato.
 *
 * 2. IL RITMO ERA MONOTONO. Pilastri identici a passo costante sono
 *    corretti e non dicono niente. La soluzione classica — ed e' la
 *    soluzione del colonnato di Perrault al Louvre, il pezzo di
 *    architettura che piu' di ogni altro significa «facciata di
 *    rappresentanza» — e' ACCOPPIARLI: due fusti vicinissimi, poi un vuoto
 *    largo, poi di nuovo due. Il passo resta lo stesso (5,667: e' la
 *    campata, non si tocca), ma dentro ogni campata l'occhio trova una
 *    coppia stretta e un intervallo largo.
 *
 *    Costa il doppio dei pilastri e non costa un solo disegno in piu',
 *    perche' sono tutti disegnati insieme (vedi `schiera`).
 *
 * 3. NON C'ERA NIENTE A SCALA UMANA. A dodici metri un pilastro liscio e'
 *    un rettangolo colorato, e un rettangolo colorato non ha misura: puo'
 *    essere alto tre metri o trenta. Servono elementi la cui dimensione
 *    l'occhio conosce gia' — un gradino, uno zoccolo, una fascia
 *    all'altezza di una mano, un architrave di porta. Adesso ci sono, e
 *    stanno tutti nei primi cinque metri, che e' l'unica fascia che la
 *    camera vede davvero (bassa a 0,95 m, e con un campo di 38 gradi a
 *    venti metri arriva a guardare cinque metri sopra di se').
 *
 * 4. LA LUCE FACEVA CHIAZZE. Tre puntiformi per lato a mezzo metro
 *    dall'architrave: nel provino di meta' orbita c'e' una BOLLA BIANCA
 *    grande come un pilastro, in alto al centro. Non e' un difetto del
 *    motore, e' l'inverso del quadrato che fa il suo mestiere addosso a una
 *    superficie. La cura sta piu' sotto, ed e' fisica prima che estetica.
 *
 * IL PRINCIPIO CHE TIENE INSIEME TUTTE E QUATTRO LE CORREZIONI.
 *
 * Il lusso in architettura non si legge nelle superfici, si legge nei
 * GIUNTI: dove un materiale finisce e ne comincia un altro. Un blocco di
 * pietra bellissimo, tagliato e appoggiato male, sembra finto; una pietra
 * qualunque che incontra un profilo di bronzo con due centimetri di rientro
 * d'ombra fra i due sembra costata cara. Per questo qui i materiali sono
 * POCHI — una pietra sola in due finiture, un bronzo, l'ombra — e quasi
 * tutto il lavoro nuovo sta nei punti in cui si toccano.
 *
 * LE PROPORZIONI, e da dove vengono.
 *
 * Non sono inventate. L'altezza sta fra otto e undici volte la larghezza
 * (9,60 su 1,08 fa 8,9); l'architrave e' circa un quinto dell'altezza del
 * sostegno (1,92 su 9,60 e' esattamente un quinto); l'intervallo fra due
 * coppie vale quasi tre volte la larghezza di un fusto (3,13 su 1,08),
 * mentre dentro la coppia il vuoto e' un terzo di un fusto. Sono i rapporti
 * di un ordine costruito, ed e' esattamente quello che l'occhio verifica in
 * un decimo di secondo senza saper dire cosa sta verificando.
 *
 * DOVE STA LA LUCE, e perche' li'.
 *
 * Nel provino avevo appeso dei tagli di luce a mezz'aria: nel fotogramma
 * sono barre luminose che galleggiano, cioe' un difetto. Una luce
 * architetturale sta SEMPRE dentro qualcosa: annegata nel soffitto,
 * incassata a filo, nascosta dietro una veletta. Qui i tagli stanno nel
 * cassettone dell'architrave, dentro una gola d'ombra profonda venti
 * centimetri — si vede la luce, non la lampada, che e' la definizione di
 * illuminazione architetturale.
 *
 * E servono a tre cose insieme, che e' il motivo per cui reggono tutta la
 * scena: lavano la pietra dall'alto (e la pietra si legge), si specchiano
 * sulla fiancata nera in righe lunghe e orizzontali (e la carrozzeria si
 * legge), e si riflettono nel marmo del pavimento (e la scena raddoppia).
 */

const MISURA = {
  /** semilato del quadrato su cui stanno i pilastri, in metri */
  raggio: 17.0,
  /**
   * ORDINE GIGANTE: 9,60 diviso 1,08 fa 8,9.
   *
   * Il committente ha chiesto di verificare che il rapporto stesse fra 8 e
   * 11, ed e' la richiesta piu' precisa che abbia ricevuto in questo
   * progetto: sotto 5 un sostegno legge come pilone di cemento, sopra 12
   * come palo. Fra 8 e 11 c'e' tutto quello che chiunque chiamerebbe
   * «colonnato», dal Louvre in giu'.
   *
   * La sezione e' QUADRATA e non piu' rettangolare (era 1,90 x 1,30): con
   * la camera che orbita, un pilastro a sezione rettangolare cambia
   * larghezza apparente mentre si gira e la fila «respira» in modo
   * innaturale. Un quadrato ha la stessa faccia da tutte le parti.
   */
  pilastro: { larghezza: 1.08, profondita: 1.08, altezza: 9.60 },
  /**
   * L'interasse dei due fusti ACCOPPIATI dentro la stessa campata. 1,46
   * meno 1,08 di fusto lascia 38 centimetri di vuoto: abbastanza da vederci
   * dentro l'ombra, troppo poco perche' ci passi qualcosa. E' la misura che
   * fa leggere i due come UNA cosa sola invece che come due sostegni
   * vicini.
   */
  coppia: 1.46,
  /** interasse fra due campate, cioe' fra due coppie */
  passo: 5.667,
  /** un quinto esatto dell'altezza del sostegno */
  architrave: { altezza: 1.92, profondita: 2.30 },
  /** quanto e' profondo il deambulatorio dietro i pilastri */
  ambulacro: 3.20,
  /**
   * IL PODIO, cioe' i due gradini su cui sta tutto il porticato.
   *
   * E' il pezzo a scala umana che conta di piu', e costa quattro scatole.
   * Un gradino e' l'unica misura che ogni essere umano conosce senza
   * pensarci: 13 centimetri. Messo alla base di un colonnato, dice
   * all'occhio quanto e' alto tutto il resto — ed e' per questo che un
   * porticato che parte direttamente dal pavimento sembra sempre piu' basso
   * di quello che e'.
   *
   * `sporto` e' quanto il piano del portico avanza nella corte oltre la
   * faccia del pilastro: 86 centimetri, cioe' un passo.
   */
  podio: { alto: 0.26, sporto: 0.86 },
}

/**
 * LE QUOTE DEL PILASTRO, misurate dal piano del portico.
 *
 * Un fusto liscio da terra al soffitto e' un rettangolo. Un fusto con un
 * dado alla base, un giunto d'ombra, un profilo di bronzo, un collarino e
 * una cimasa e' un ORDINE — e la differenza in triangoli e' quasi zero,
 * perche' sono sei scatole invece di una.
 *
 * L'ordine in cui si leggono, dal basso:
 *
 *   0,00 - 0,44   ZOCCOLO       il dado di base, piu' largo di 12 cm per lato
 *   0,44 - 0,50   GIUNTO        6 cm di rientro d'ombra: la pietra si ferma
 *   0,50 - 0,60   FASCIA        il profilo di bronzo, sporge di 2,5 cm
 *   0,60 - 8,80   FUSTO         il corpo, con tre scanalature per faccia
 *   8,80 - 8,88   GIUNTO        di nuovo il rientro, in cima
 *   8,88 - 9,02   COLLARINO     bronzo, e chiude il fusto sotto il capitello
 *   9,02 - 9,60   CIMASA        il capitello: una lastra piu' larga di 14 cm
 *
 * I DUE GIUNTI D'OMBRA sono la ragione per cui questo elenco esiste. Sono
 * due scatole leggermente PIU' STRETTE del fusto, di materiale scurissimo:
 * dove passano, la luce non arriva e resta una riga nera netta. In
 * architettura si chiama giunto d'ombra ed e' il dettaglio piu' costoso che
 * esista — richiede che due pezzi di pietra siano tagliati al millimetro,
 * perche' quella riga mostra qualunque errore. Chi la vede non sa niente di
 * tutto questo e legge solo «e' fatto bene».
 */
const PARTI = {
  zoccolo: { da: 0.00, a: 0.44, extra: 0.24 },
  giuntoBasso: { da: 0.44, a: 0.50, extra: -0.07 },
  fascia: { da: 0.50, a: 0.60, extra: 0.05 },
  fusto: { da: 0.60, a: 8.80, extra: 0.00 },
  giuntoAlto: { da: 8.80, a: 8.88, extra: -0.07 },
  collarino: { da: 8.88, a: 9.02, extra: 0.05 },
  cimasa: { da: 9.02, a: 9.60, extra: 0.28 },
}

/**
 * Il gradiente dell'alone: bianco al centro, nero ai bordi, con una curva
 * che scende in fretta e poi si allunga.
 *
 * L'esponente 2,2 non e' scelto a occhio: la luce che esce da un'apertura e
 * colpisce un muro complanare cade circa col quadrato della distanza, piu' un
 * termine di coseno per l'angolo. 2,2 e' quella somma, approssimata con un
 * numero solo — e la differenza fra 2,2 e un lineare e' tutta la differenza
 * fra «alone» e «macchia».
 */
function gradienteAlone() {
  const N = 128
  const dati = new Uint8Array(N * N * 4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x / (N - 1)) * 2 - 1
      const dy = (y / (N - 1)) * 2 - 1
      // ellittico: l'alone di un'apertura verticale e' piu' alto che largo
      const r = Math.min(1, Math.hypot(dx * 1.15, dy * 0.85))
      const v = Math.pow(1 - r, 2.2)
      const i = (y * N + x) * 4
      dati[i] = dati[i + 1] = dati[i + 2] = 255
      dati[i + 3] = Math.round(v * 255)
    }
  }
  const t = new DataTexture(dati, N, N)
  t.needsUpdate = true
  return t
}

/**
 * IL DENTRO DELLA SALA — e perche' un rettangolo di colore piatto non e'
 * mai sembrato una stanza accesa.
 *
 * Nel provino di meta' orbita le aperture sono cinque toppe arancioni della
 * stessa identica tinta dal bordo di sopra a quello di sotto. Ed e'
 * esattamente cio' che non capita mai guardando dentro una stanza
 * illuminata: la luce sta nel soffitto, quindi il fondo e' CHIARO IN ALTO e
 * si spegne scendendo verso il pavimento. Quella caduta e' l'unico indizio
 * che dice «qui dentro c'e' un volume» invece di «qui c'e' una superficie
 * dipinta».
 *
 * Due sole informazioni in questa tessitura: la caduta verticale (uno in
 * alto, 0,38 in basso, con una curva) e un velo di ombra sui montanti
 * laterali, che e' cio' che fa lo spessore del muro. Sono trentadue righe
 * per trentadue: quattro kilobyte scarsi generati al volo, nessun file.
 */
function gradienteSala() {
  const N = 32
  const dati = new Uint8Array(N * N * 4)
  for (let y = 0; y < N; y++) {
    // v va da 0 in basso a 1 in alto: la riga 0 della tessitura sta in basso
    const v = y / (N - 1)
    // 0,38 in basso e 1 in alto, con esponente 0,55: la luce di un soffitto
    // non cade linearmente, si allunga verso il basso
    const alto = 0.38 + 0.62 * Math.pow(v, 0.55)
    for (let x = 0; x < N; x++) {
      const u = (x / (N - 1)) * 2 - 1
      // i montanti: gli ultimi 12% di larghezza vanno in ombra, e' lo
      // spessore del muro che si vede di sbieco
      const lato = Math.min(1, (1 - Math.abs(u)) / 0.12)
      const g = Math.round(255 * alto * (0.45 + 0.55 * lato))
      const i = (y * N + x) * 4
      dati[i] = dati[i + 1] = dati[i + 2] = g
      dati[i + 3] = 255
    }
  }
  const t = new DataTexture(dati, N, N)
  t.needsUpdate = true
  return t
}

const caricatore = new TextureLoader()
const cache = new Map<string, Texture>()

function tessitura(file: string, ripete: [number, number], srgb = false) {
  const chiave = file + ripete.join(',')
  const gia = cache.get(chiave)
  if (gia) return gia
  const t = caricatore.load(file)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(ripete[0], ripete[1])
  t.anisotropy = anisotropiaMassima()
  if (srgb) t.colorSpace = SRGBColorSpace
  cache.set(chiave, t)
  return t
}

/**
 * UNA PIETRA, con le tre mappe che servono e nessuna che non serve.
 *
 * `ripete` e' in METRI di pietra per unita' di tessitura, non in numero di
 * ripetizioni: cosi' due oggetti di misura diversa hanno la pietra della
 * stessa grana, che e' l'unica cosa che conta e l'errore piu' comune. Una
 * lastra grande con la stessa tessitura ripetuta lo stesso numero di volte
 * di una piccola ha i blocchi grandi il doppio, e l'occhio legge subito che
 * i due oggetti non sono dello stesso materiale.
 *
 * `rilievo` e' quanto pesa la mappa di normali, e adesso e' un parametro
 * perche' la stessa pietra deve poter avere DUE FINITURE. Vedi piu' sotto:
 * e' il modo di avere due materiali senza avere due materiali.
 */
/* ATTENZIONE: LE TESSITURE DI QUESTO FILE NON SONO PIU' IN `public/`.
 *
 * `pietra_*`, `intonaco_*`, i tre marmi e i tre cementi sono stati spostati in
 * `asset/texture_corte/`. Sono 6,6 MB, e in `public/` erano metà del peso del
 * pacchetto pubblicato: Vite copia quella cartella dentro `dist/` per intero e
 * senza guardare se qualcuno la usi.
 *
 * Nessuno la usava. La corte costruita e' fuori scena da quando l'ambiente e'
 * una fotografia a 360 gradi — lo dice `core/Esperienza.ts`, che tiene questo
 * file «come ripiego e come nota di lavoro» — quindi quei file non li scaricava
 * mai nessuno. Facevano male solo a chi guarda il repository o il peso del
 * deploy, che sono esattamente le due persone che contano prima di una
 * consegna.
 *
 * Se un giorno la corte torna in scena, le tessiture vanno rimesse in
 * `public/texture/` prima di chiamare `costruisciCorte()`. Sta scritto qui e
 * non in un file di appunti perche' e' qui che qualcuno lo leggera'.
 */
function materialePietra(
  nome: string,
  metriPerPiastrella: number,
  tinta: [number, number, number],
  ruvido: number,
  rilievo: number,
) {
  const r: [number, number] = [1 / metriPerPiastrella, 1 / metriPerPiastrella]
  const m = new MeshStandardMaterial({
    map: tessitura(`/texture/${nome}_col.webp`, r, true),
    normalMap: tessitura(`/texture/${nome}_nor.webp`, r),
    roughnessMap: tessitura(`/texture/${nome}_rgh.webp`, r),
    roughness: ruvido,
    metalness: 0,
    envMapIntensity: 1.0,
  })
  m.color.setRGB(tinta[0], tinta[1], tinta[2])
  m.normalScale = new Vector2(rilievo, rilievo)
  return m
}

/** il fantoccio che serve a comporre le matrici delle schiere */
const fantoccio = new Object3D()

/**
 * Posizione e orientamento di un elemento ripetuto.
 *
 * `ruota` non e' solo l'orientamento: definisce anche il SISTEMA LOCALE in
 * cui si esprimono gli scostamenti dei pezzi accessori. L'asse Z locale
 * guarda sempre verso il centro della corte, l'asse X corre lungo il lato.
 * Cosi' «lo stipite sta 1,13 a destra e 13 centimetri in avanti» si scrive
 * una volta sola e vale per tutti e quattro i lati, invece di diventare
 * quattro casi con i segni girati — che e' esattamente il punto in cui, la
 * prima volta, ho sbagliato un segno e non me ne sono accorto per un giro
 * intero.
 */
type Posa = {
  x: number
  y: number
  z: number
  ruota: number
}

/** un pezzo accessorio: scostamento nel sistema locale della posa, e rotazione propria */
type Pezzo = [dx: number, dy: number, dz: number, giro: number]

/**
 * TUTTI I PEZZI UGUALI IN UN DISEGNO SOLO.
 *
 * Con i pilastri accoppiati sono quaranta sostegni invece di venti, e ogni
 * sostegno e' fatto di sette pezzi piu' dodici scanalature: come oggetti
 * separati sarebbero SETTECENTOSESSANTA disegni, e vanno moltiplicati per
 * due perche' la corte viene disegnata una seconda volta dentro il riflesso
 * a terra. Millecinquecento chiamate per novemila triangoli: il rapporto
 * peggiore che si possa costruire, e la ragione per cui una scena fatta di
 * scatoline puo' andare piu' piano di una fatta di modelli.
 *
 * `InstancedMesh` li disegna tutti insieme. Il costo scende a UNA chiamata
 * per famiglia — sette per i pilastri, una per tutte le scanalature — e la
 * geometria e' la stessa di prima.
 *
 * `frustumCulled` a falso non e' pigrizia: la sfera che racchiude una
 * schiera contiene tutta la corte, quindi e' sempre dentro l'inquadratura e
 * il controllo non scarterebbe mai niente. Spegnerlo toglie un calcolo per
 * fotogramma e, soprattutto, toglie il caso in cui la sfera si calcola male
 * e i pilastri spariscono tutti insieme.
 */
function schiera(
  geo: BufferGeometry,
  mat: Material,
  pose: Posa[],
  pezzi: Pezzo[],
  ombra = false,
) {
  const m = new InstancedMesh(geo, mat, pose.length * pezzi.length)
  let n = 0
  for (const p of pose) {
    const c = Math.cos(p.ruota)
    const s = Math.sin(p.ruota)
    for (const [dx, dy, dz, giro] of pezzi) {
      fantoccio.position.set(
        p.x + dx * c + dz * s,
        p.y + dy,
        p.z - dx * s + dz * c,
      )
      fantoccio.rotation.set(0, p.ruota + giro, 0)
      fantoccio.updateMatrix()
      m.setMatrixAt(n++, fantoccio.matrix)
    }
  }
  m.instanceMatrix.needsUpdate = true
  m.castShadow = ombra
  m.receiveShadow = true
  m.frustumCulled = false
  return m
}

export function costruisciCorte() {
  const gruppo = new Group()
  gruppo.name = 'CORTE'

  /**
   * DUE FINITURE DELLA STESSA PIETRA, e non due pietre.
   *
   * E' la regola numero uno di un'architettura che deve leggere come
   * costosa: pochi materiali, eseguiti benissimo. Un cortile con la pietra
   * chiara, il travertino, il fondo in cotto e il basamento in granito e'
   * un campionario, non un progetto — e si vede subito, perche' nessuna
   * cava fornisce quattro materiali diversi allo stesso cantiere.
   *
   * Qui c'e' UNA pietra, in due lavorazioni, che e' come funziona un
   * edificio vero:
   *
   *   LEVIGATA   il fusto, la cimasa, l'architrave. Ruvidita' 0,52 e
   *              rilievo 0,7: la superficie prende un velo speculare e i
   *              giunti si vedono appena. E' la pietra lucidata a mano di un
   *              cortile d'onore.
   *
   *   BOCCIARDATA  lo zoccolo, il podio, la fascia bassa del muro. Molto
   *              piu' scura, ruvidita' 0,88 e rilievo 1,55: assorbe la luce
   *              invece di rimandarla.
   *
   * E' anche il modo giusto di distribuire il tono: la roccia grezza sta in
   * BASSO e la pietra fine in ALTO. Un edificio fatto al contrario sembra
   * sempre sul punto di ribaltarsi, e nessuno sa dire perche'.
   *
   * LA GRANA E' GRANDE — 1,9 METRI DI PIETRA PER PIASTRELLA — E CI SONO
   * ARRIVATO SBAGLIANDO DUE VOLTE NEL VERSO OPPOSTO.
   *
   * La prima stesura stava a 1,05 con questo ragionamento: «a 2,4 ci stava
   * meno di un blocco per faccia, cioe' una superficie liscia con una
   * macchia sopra». Vero. Allora ho stretto ancora, a 0,62, per avere piu'
   * corsi su un fusto alto nove metri — e il provino ha risposto in un modo
   * che non avevo previsto: righe orizzontali ogni QUINDICI centimetri che,
   * sommate alle scanalature verticali, hanno fatto sembrare i pilastri
   * PERLINATO DI LEGNO. Non pietra sbagliata: proprio un altro materiale.
   *
   * La grana giusta non e' «tanti giunti» ne' «pochi giunti»: e' la misura
   * del pezzo che quel tipo di edificio userebbe davvero. Un fusto di
   * colonnato monumentale e' fatto di rocchi alti mezzo metro, non di
   * mattoni. A 1,9 metri per piastrella i corsi vengono alti 48 centimetri:
   * diciassette su un fusto, che si contano e non si confondono.
   *
   * LA TINTA CORREGGE IL COLORE DELLA TESSITURA, e non e' la stessa cosa
   * che scegliere un colore.
   *
   * La tessitura di partenza e' un calcare beige: in lineare vale circa
   * (0,72 / 0,63 / 0,45), cioe' un rapporto rosso-blu di 1,6. Qualunque
   * tinta GRIGIA le lascia addosso quel rapporto, e sotto una luce calda il
   * rapporto arriva a 3: il fotogramma esce tutto marrone, ed e' esattamente
   * l'«arenaria grezza» del giudizio. Nella prima stesura la tinta era
   * (0,170 / 0,152 / 0,128), cioe' calda SOPRA una tessitura calda: due
   * strati di caldo non fanno pietra calda, fanno terracotta.
   *
   * Qui la tinta e' piu' FREDDA della tessitura apposta — il blu vale la
   * meta' in piu' del rosso — e il prodotto dei due esce quasi neutro: circa
   * (0,181 / 0,178 / 0,167). Il calore glielo da' la luce, che e' la
   * differenza fra pietra ILLUMINATA di caldo e pietra DIPINTA di beige. E'
   * anche cio' che permette al riempimento azzurro dell'ambientale di
   * leggersi nelle ombre: su una pietra gia' arancione non ci arriverebbe
   * mai, e senza quel contrasto caldo-freddo nessuna pietra sembra costosa.
   *
   * IL MURO DI FONDO E' L'UNICA COSA DICHIARATAMENTE FREDDA della corte, e
   * lo e' per contrasto: e' il piano piu' lontano, sta in ombra, e un fondo
   * bluastro dietro una pietra calda e' cio' che da' l'aria fra i due. Un
   * fondo caldo dietro una pietra calda le appiccica insieme, ed e' un'altra
   * delle ragioni per cui il primo provino sembrava un ipogeo: era tutto
   * dello stesso colore, quindi tutto sullo stesso piano.
   */
  const pietra = materialePietra('pietra', 1.90, [0.252, 0.283, 0.372], 0.52, 0.70)
  const pietraGrezza = materialePietra('pietra', 2.60, [0.112, 0.126, 0.166], 0.88, 1.55)
  const intonaco = materialePietra('intonaco', 2.2, [0.060, 0.074, 0.112], 0.90, 1.10)
  // il fondo del deambulatorio: quasi nero, e' l'ombra che da' profondita'
  // al porticato. Senza, fra un pilastro e l'altro si vede il cielo e il
  // porticato diventa una fila di paletti.
  const buio = new MeshStandardMaterial({ roughness: 0.95, metalness: 0 })
  buio.color.setRGB(0.020, 0.019, 0.018)

  /**
   * IL BRONZO, e perche' e' lui a dire «lusso» piu' della pietra.
   *
   * Un porticato di sola pietra e' monumentale ma puo' essere qualunque cosa:
   * un tribunale, una stazione, un museo. Cio' che sposta la lettura verso il
   * lusso non e' la scala — e' l'INCONTRO FRA MATERIALI diversi eseguito con
   * precisione: la pietra che si ferma, una fascia di metallo che riprende, un
   * giunto d'ombra fra i due.
   *
   * E' anche il motivo per cui un dettaglio costoso si riconosce da lontano
   * senza vederlo: il metallo brunito e' l'unica cosa in scena che riflette in
   * modo direzionale, quindi cambia mentre la camera si muove mentre la pietra
   * resta ferma. Quel movimento differenziale l'occhio lo legge come
   * ricchezza di materia.
   *
   * Brunito e non lucidato: 0,30 di ruvidita'. Un bronzo a specchio in
   * architettura non esiste — ossida in un mese — e leggerebbe come ottone da
   * bagno.
   *
   * NELLA PRIMA STESURA C'ERA E NON SI VEDEVA: una sola fascia da dieci
   * centimetri a quaranta centimetri da terra, dietro l'auto, al buio. Un
   * materiale che compare una volta sola non e' un materiale, e' un
   * accidente. Adesso ricorre — base e sommita' di ogni fusto, naso del
   * gradino, filo sotto l'architrave delle porte, cornice di ogni apertura —
   * e ricorrendo diventa la LINGUA dell'edificio.
   */
  const bronzo = new MeshStandardMaterial({ metalness: 1.0, roughness: 0.30, envMapIntensity: 0.9 })
  bronzo.color.setRGB(0.36, 0.24, 0.13)
  bronzo.name = 'BRONZO'

  /**
   * LE SALE ILLUMINATE DIETRO IL COLONNATO.
   *
   * E' la seconda meta' del «luogo di lusso», e vale piu' di qualunque
   * dettaglio: la PROFONDITA' ABITATA. Un porticato che gira intorno a un
   * vuoto nero e' un rudere; lo stesso porticato con delle sale accese dietro
   * e' un palazzo in cui c'e' qualcuno.
   *
   * Non serve modellare le sale. Serve che fra un pilastro e l'altro, in
   * fondo al deambulatorio, si veda un rettangolo di luce calda: l'occhio
   * costruisce da solo la stanza che c'e' dietro. E' lo stesso principio per
   * cui una finestra accesa di notte racconta una casa intera.
   *
   * E in piu' danno alla carrozzeria qualcosa di LUNGO e VERTICALE da
   * riflettere mentre la camera orbita — che era esattamente il mestiere dei
   * «tagli di luce» finti che avevo appeso a mezz'aria e poi tolto. Stavolta
   * pero' sono attaccati a qualcosa.
   *
   * QUANTO DEVONO ESSERE LUMINOSE: 1,30, e ci sono arrivato per eccesso.
   *
   * Prima erano a 1,35 e leggevano come cartone. Le ho portate a 1,95
   * pensando «una stanza accesa di notte e' la cosa piu' luminosa
   * dell'inquadratura», e la misura ha risposto di no: il 2,94% del
   * fotogramma BRUCIATO — sei volte il limite dello 0,5% — e venti
   * rettangoli bianchi che si mangiano l'auto. Il difetto e' facile da
   * capire guardando le aree: ogni apertura, a venti metri, e' larga 125
   * pixel e alta 200; venti aperture sono un settimo dell'immagine. Un
   * settimo di fotogramma a 240 non e' un'atmosfera, e' una parete di
   * lampade.
   *
   * A 1,30 il colmo sta intorno a 225 e la base, per via del gradiente,
   * sotto 160: la sala si legge accesa, non abbagliante, e il bianco resta
   * un privilegio dei fari e del quadro strumenti. Che e' anche l'ordine
   * giusto della scena: la cosa piu' luminosa deve essere l'AUTO.
   *
   * E in ogni caso sotto la soglia del bloom (2,60), perche' il fiore qui e'
   * riservato all'accensione del quadro, che e' un beat: se fiorisce anche
   * il fondale, quel beat non si vede piu'.
   */
  const sala = new MeshBasicMaterial({ map: gradienteSala() })
  sala.color.setRGB(1, 0.80, 0.575)
  sala.color.multiplyScalar(1.30)

  // l'alone: una sfumatura radiale generata al volo, additiva. Nessun file da
  // scaricare — un gradiente e' l'unica immagine che conviene sempre
  // disegnare invece che caricare.
  const sversamento = new MeshBasicMaterial({
    map: gradienteAlone(),
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  sversamento.color.setRGB(0.62, 0.42, 0.24)

  const { raggio: R, passo, coppia: CP, pilastro: P, architrave: A, ambulacro: AM } = MISURA
  /** la quota del piano del portico: tutto l'ordine parte da qui */
  const Q = MISURA.podio.alto
  /** raggio del filo esterno del podio (verso la corte) e del muro di fondo */
  const RPODIO = R - P.profondita / 2 - MISURA.podio.sporto
  const RMURO = R + AM

  // QUANTI PILASTRI PER LATO: si ricava dal passo, non si sceglie. Cosi'
  // cambiando il raggio della corte l'ordine resta coerente invece di
  // stiracchiarsi.
  const meta = Math.round(R / passo)
  const posizioni: number[] = []
  for (let i = -meta; i <= meta; i++) posizioni.push(i * passo)

  const lati: Array<[number, number, number]> = [
    // normale del lato (verso il centro), e asse lungo cui si allineano
    [0, 1, 0],   // lato a z = -R, guarda verso +z
    [0, -1, 0],  // lato a z = +R
    [1, 0, 1],   // lato a x = -R
    [-1, 0, 1],  // lato a x = +R
  ]

  /** le pose di tutti i fusti della corte, in un elenco solo */
  const posePilastri: Posa[] = []
  /** le pose di tutte le aperture illuminate */
  const poseAperture: Posa[] = []

  for (const [nx, nz, asseX] of lati) {
    /**
     * L'ANELLO, e perche' due lati sono piu' corti degli altri due.
     *
     * Tutto cio' che gira intorno alla corte — il podio, il soffitto,
     * l'architrave — e' fatto di quattro pezzi che si incontrano negli
     * angoli. Se tutti e quattro sono lunghi uguale, negli angoli si
     * sovrappongono, e due facce complanari alla stessa quota danno
     * z-fighting: quello sfarfallio a scacchiera che si vede solo quando la
     * camera si muove e che non si riesce mai a fotografare.
     *
     * Si risolve come in cantiere: due lati passano interi, gli altri due si
     * fermano contro. Il pezzo che passa e' lungo due volte il raggio
     * ESTERNO dell'anello, quello che si ferma due volte il raggio INTERNO.
     */
    const anello = (rInterno: number, rEsterno: number) =>
      asseX ? rEsterno * 2 : rInterno * 2

    // la posizione lungo il lato -> coordinate mondo
    const px = (u: number) => (asseX ? -nx * R : u)
    const pz = (u: number) => (asseX ? u : -nz * R)

    for (const t of posizioni) {
      // agli angoli i due lati si sovrappongono: si salta, se no restano due
      // pilastri compenetrati che nel riflesso si vedono doppi
      if (Math.abs(t) > R - 0.01) continue
      // LA COPPIA: due fusti a mezzo interasse dal centro della campata.
      for (const g of [-CP / 2, CP / 2]) {
        posePilastri.push({
          x: px(t + g), y: Q, z: pz(t + g),
          ruota: asseX ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : (nz > 0 ? 0 : Math.PI),
        })
      }
    }

    /**
     * IL PODIO — due gradini e un filo di bronzo sul naso.
     *
     * Il naso del gradino e' il posto in cui il bronzo si vede sempre,
     * qualunque sia la posizione della camera: e' l'unico spigolo
     * orizzontale rivolto verso l'alto in tutta la corte, quindi prende
     * luce da qualunque sorgente e disegna una riga continua lunga quaranta
     * metri. Una riga lunga e ininterrotta e' il segnale piu' forte di
     * esecuzione precisa che esista — perche' basta un pezzo fuori
     * allineamento per rovinarla, e l'occhio lo sa.
     */
    const posa = (lung: number, alt: number, prof: number, y: number, r: number, mat: Material) => {
      const m = new Mesh(new BoxGeometry(lung, alt, prof), mat)
      m.position.set(asseX ? -nx * r : 0, y, asseX ? 0 : -nz * r)
      if (asseX) m.rotation.y = Math.PI / 2
      m.receiveShadow = true
      gruppo.add(m)
      return m
    }

    // gradino basso: sporge di altri 16 cm rispetto a quello alto
    posa(
      anello(RPODIO - 0.16, RMURO), 0.145, RMURO - (RPODIO - 0.16),
      0.0725, (RMURO + RPODIO - 0.16) / 2, pietraGrezza,
    )
    // gradino alto: il piano su cui poggia l'ordine
    posa(
      anello(RPODIO, RMURO), Q, RMURO - RPODIO,
      Q / 2, (RMURO + RPODIO) / 2, pietraGrezza,
    )
    // il filo di bronzo, incassato nel naso: sporge 3 cm e alto 5
    posa(anello(RPODIO - 0.03, RPODIO + 0.03), 0.055, 0.06, Q - 0.028, RPODIO, bronzo)

    // L'ARCHITRAVE: una trave continua sopra tutti i pilastri del lato.
    // Continua e non a pezzi: e' cio' che trasforma una fila di sostegni in
    // un edificio.
    const trave = posa(
      anello(R - A.profondita / 2, R + A.profondita / 2), A.altezza, A.profondita,
      Q + P.altezza + A.altezza / 2, R, pietra,
    )
    trave.castShadow = true

    // LA GOLA DI LUCE, incassata nel sottotrave.
    //
    // E' un canale profondo: una scatola scura sotto la trave, e dentro il
    // canale il taglio luminoso. Cosi' la sorgente sta in ombra e si vede
    // solo cio' che illumina — che e' come si fa in architettura e la
    // ragione per cui una luce incassata sembra costosa e una a vista no.
    const rGola = R - P.profondita / 2 - 0.18
    posa(anello(rGola - 0.22, rGola + 0.22) - 0.4, 0.34, 0.44, Q + P.altezza - 0.17, rGola, buio)

    const taglio = new Mesh(
      new PlaneGeometry(anello(rGola - 0.22, rGola + 0.22) - 0.6, 0.16),
      // 2,3: forte, caldo, e SOTTO la soglia del bloom (2,6). Deve essere la
      // cosa piu' luminosa dell'architettura senza fiorire: un alone le
      // mangerebbe i bordi, e sono i bordi a farla leggere come una riga di
      // luce invece che come una macchia.
      new MeshBasicMaterial({ color: 0xffc79a }),
    )
    // 1,35 e non 2,3: adesso che le puntiformi fanno un lavaggio vero, il
    // taglio non deve piu' essere l'unica cosa luminosa. Una gola che si
    // vede meno della pietra che illumina e' esattamente il risultato
    // voluto — e con la pietra piu' chiara di prima il rapporto e' cambiato
    // di nuovo, quindi e' sceso ancora.
    ;(taglio.material as MeshBasicMaterial).color.multiplyScalar(1.35)
    // LA ROTAZIONE Y VA MESSA ANCHE QUI, e mancava.
    //
    // Il piano nasce sul piano XY, si corica con una rotazione X e a quel
    // punto e' lungo lungo l'asse X. Sui due lati che corrono lungo Z serve
    // girarlo di novanta gradi come la trave e la gola — che infatti lo
    // fanno. Senza, i due tagli dei lati X attraversavano la corte da parte
    // a parte passando SOPRA L'AUTO: nel provino sono due barre luminose
    // sbilenche in mezzo al fotogramma, e sembrano un difetto del motore.
    taglio.rotation.set(Math.PI / 2, 0, 0)
    if (asseX) taglio.rotation.z = Math.PI / 2
    taglio.position.set(
      asseX ? -nx * rGola : 0,
      Q + P.altezza - 0.345,
      asseX ? 0 : -nz * rGola,
    )
    gruppo.add(taglio)

    /**
     * LA LUCE PULITA — la correzione piu' importante di questa stesura.
     *
     * COSA C'ERA CHE NON ANDAVA, misurato e non dedotto. Nel provino a
     * meta' orbita c'e' una bolla bianca in alto al centro, grande come un
     * pilastro. E' una delle tre puntiformi del lato, che stava a 45
     * CENTIMETRI dalla faccia interna dell'architrave: con decadimento
     * quadratico, a mezzo metro l'intensita' e' quattro volte quella a un
     * metro e cento volte quella a cinque. Il risultato non e' un lavaggio,
     * e' un faro puntato addosso a una superficie.
     *
     * LA REGOLA VERA, ed e' geometrica: una fila di sorgenti sembra
     * continua solo se la DISTANZA dalla superficie e' dello stesso ordine
     * del PASSO fra le sorgenti. Tre luci su un lato di 34 metri hanno
     * passo 11; stando a mezzo metro dal muro il rapporto e' 22 a 1, e si
     * vedono tre bolle. Non c'e' intensita' che lo aggiusti: e' la
     * posizione a essere sbagliata.
     *
     * COSA HO CAMBIATO, tre cose insieme.
     *
     *   1. LE HO ALLONTANATE. Adesso stanno tre metri dentro la corte
     *      rispetto all'asse dei pilastri e due metri sotto il soffitto: il
     *      punto piu' vicino di architrave e' a 2,7 metri invece che a 0,45,
     *      e il picco scende di sei volte. In piu' la luce arriva sulla
     *      faccia dei pilastri di SBIECO e non piu' radente dall'alto —
     *      cioe' i fusti si illuminano invece di restare due bordi chiari e
     *      un centro nero.
     *
     *   2. LE HO MESSE AI TERZI. Erano a 0,62 x 1,3 x R, cioe' a 13,7 metri
     *      dal centro del lato: quasi negli angoli, con otto metri di buco
     *      in mezzo. Ai terzi esatti (0,667 x R = 11,34) tre sorgenti
     *      coprono un segmento in modo uniforme — e' il posto dove le
     *      metterebbe chiunque debba illuminare un corridoio.
     *
     *   3. DECADIMENTO 1,50 E NON 2. Questa e' la correzione fisica, ed e'
     *      quella che conta di piu'. L'inverso del quadrato vale per una
     *      sorgente PUNTIFORME; qui le tre puntiformi non fanno le veci di
     *      tre lampadine, fanno le veci di una GOLA CONTINUA lunga
     *      trentaquattro metri. E l'irradianza di una sorgente lineare
     *      infinita cade come 1/r, non come 1/r^2 — una lineare finita sta
     *      in mezzo ai due. 1,50 e' quel «in mezzo».
     *
     *      Cioe': non e' un trucco per ammorbidire, e' l'esponente giusto
     *      per la sorgente che sto simulando. E si vede subito, perche' e'
     *      il termine lontano a cambiare: a otto metri una luce a
     *      decadimento 1,5 arriva quasi tre volte piu' forte di una a
     *      decadimento 2, mentre a due metri ne arriva solo il 40% in piu'.
     *      Il gradiente si distende, che e' letteralmente la definizione di
     *      lavaggio uniforme.
     *
     *      La prima prova era a 1,35 e a 17 di intensita': misurata, dava
     *      74 di media sulla fascia alta del fotogramma (era 38) e il 7% di
     *      bruciato. Uniforme si', ma PIATTA — e una corte notturna senza
     *      buio non e' lussuosa, e' un capannone illuminato. La seconda, a
     *      1,50 e 13, e' finita troppo in basso (media del soggetto 17).
     *      1,50 con 15 e' il punto in cui il lavaggio resta e il modellato
     *      torna.
     *
     * QUANTE SONO: SEMPRE TRE PER LATO, DODICI IN TUTTO, e non e' un
     * dettaglio. `core/Esperienza.ts` le raccoglie per tipo dentro il gruppo
     * CORTE e `core/Qualita.ts` ne spegne otto o quattro ai livelli bassi
     * ridistribuendo l'intensita' sulle altre, con la centrale come prima a
     * restare accesa: quel codice conta sull'ordine (-0,667 / 0 / +0,667) e
     * sul fatto che siano `PointLight`. Cambiare tipo o numero qui vuol dire
     * andare a cambiare due file che non e' compito di questo. Sono cambiate
     * solo posizione, portata e decadimento.
     *
     * PORTATA 20, cioe' poco piu' della meta' del lato della corte. Una gola
     * di luce e' fatta per lavare LA PARETE IN CUI STA: se la sua portata
     * arriva dall'altra parte del cortile non e' piu' una gola, e' un
     * proiettore, e il pavimento al centro si schiarisce senza che niente lo
     * giustifichi. La finestra di spegnimento di three cade con la quarta
     * potenza della distanza, quindi negli ultimi metri e' gia' quasi tutto
     * spento e il centro della corte resta scuro — che e' l'unico modo
     * perche' l'auto illuminata stacchi dal fondo invece di stare dentro una
     * stanza tutta accesa.
     */
    for (const f of [-0.667, 0, 0.667]) {
      const l = new PointLight(0xffdfc8, 15.0, 20.0, 1.50)
      l.position.set(
        asseX ? -nx * (R - 3.0) : f * R,
        Q + P.altezza - 2.0,
        asseX ? f * R : -nz * (R - 3.0),
      )
      gruppo.add(l)
    }

    // IL FONDO DEL PORTICATO, dietro i pilastri.
    //
    // LUNGO QUANTO TUTTO IL LATO, ANGOLI COMPRESI, e la prima versione non
    // lo era: era lungo come la fila di pilastri (35,9 m) mentre il quadrato
    // dei fondi misura 40,4 m di lato. Restavano quattro fessure di due
    // metri agli angoli, e attraverso una di quelle si vedeva il CIELO —
    // nel provino e' un rettangolo bianco bruciato in fondo alla corte, e
    // sembrava un difetto del materiale.
    //
    // Non l'ho dedotto: l'ho chiesto alla scena con un raggio
    // (`strumenti/chiedi.mjs`), che ha risposto «CIELO, a 168 metri». Tre
    // ipotesi sbagliate in meno.
    //
    // Alto 15 e non 13: l'ordine gigante e' cresciuto di 1,2 metri e
    // l'architrave arriva a 11,78. Da una camera bassa che guarda in su la
    // linea del muro non deve mai comparire, e il margine sopra la trave e'
    // l'unica cosa che lo garantisce.
    const fondo = new Mesh(new PlaneGeometry(RMURO * 2 + 2.0, 15.0), intonaco)
    fondo.position.set(asseX ? -nx * RMURO : 0, 15.0 / 2, asseX ? 0 : -nz * RMURO)
    if (asseX) fondo.rotation.set(0, nx > 0 ? Math.PI / 2 : -Math.PI / 2, 0)
    else fondo.rotation.set(0, nz > 0 ? 0 : Math.PI, 0)
    fondo.receiveShadow = true
    gruppo.add(fondo)

    /**
     * LE TRE FASCE DEL MURO DI FONDO, e sono la scala umana della scena.
     *
     * Il muro in fondo al deambulatorio e' l'unica superficie GRANDE e
     * CONTINUA che si vede fra un pilastro e l'altro. Liscio, e' un piano
     * scuro senza misura: puo' essere a tre metri o a trenta. Con tre righe
     * orizzontali diventa un muro alto quattro metri e mezzo, e siccome le
     * tre righe stanno alle quote di un edificio vero — zoccolo alla vita,
     * architrave delle porte sopra la testa — l'occhio ne ricava
     * immediatamente l'altezza di tutto il resto.
     *
     * Il filo di bronzo sta SOTTO la fascia e sporge MENO di lei: cosi'
     * resta nella sua ombra e non prende mai luce diretta. Un metallo che
     * brilla in ombra e' quello che si vede nei portoni degli alberghi
     * buoni; un metallo in piena luce sembra un profilo di alluminio.
     */
    const rMuro = (sporgenza: number) => RMURO - sporgenza / 2
    // lo zoccolo del muro: dal piano del portico fino a 1,02
    posa(RMURO * 2, 1.02 - Q, 0.10, (1.02 + Q) / 2, rMuro(0.10), pietraGrezza)
    // l'architrave continuo delle porte, a 4,55
    posa(RMURO * 2, 0.30, 0.16, 4.70, rMuro(0.16), pietra)
    // e il filo di bronzo appena sotto, in ombra
    posa(RMURO * 2, 0.08, 0.11, 4.51, rMuro(0.11), bronzo)

    // LE SALE ACCESE, una per campata, in fondo al deambulatorio.
    //
    // Alte 3,4 e larghe 2,1: la proporzione di una portafinestra, non di una
    // finestra. In un edificio monumentale le aperture sono verticali e
    // alte — sono quelle proporzioni a dire l'altezza dei soffitti dietro, e
    // quindi il tipo di edificio.
    //
    // Erano larghe 2,6 su un intervallo di 3,8; adesso l'intervallo fra due
    // coppie e' 3,13 e riempirlo tutto toglierebbe il margine scuro ai lati.
    // Quel margine non e' spazio avanzato: e' cio' che fa leggere la luce
    // come una fessura in un muro invece che come un pannello acceso.
    for (const t of posizioni) {
      if (Math.abs(t) > R - 2.0) continue
      // sfalsate rispetto ai pilastri: cadono negli INTERVALLI, se no le
      // coprirebbe il pilastro e non si vedrebbero mai
      const tt = t + passo / 2
      if (Math.abs(tt) > R - 0.6) continue
      // la posa sta SUL MURO di fondo: gli scostamenti locali in Z portano
      // i pezzi in avanti, verso la corte
      poseAperture.push({
        x: asseX ? -nx * RMURO : tt, y: 2.85, z: asseX ? tt : -nz * RMURO,
        ruota: asseX ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : (nz > 0 ? 0 : Math.PI),
      })
    }

    // e il soffitto del deambulatorio: chiude sopra, cosi' fra i pilastri
    // non si vede il cielo ma un'ombra profonda
    const rSofInt = R - P.profondita / 2
    const rSofEst = RMURO + P.profondita / 2
    const soffitto = new Mesh(
      new PlaneGeometry(anello(rSofInt, rSofEst), rSofEst - rSofInt),
      buio,
    )
    soffitto.rotation.x = Math.PI / 2
    soffitto.position.set(
      asseX ? -nx * (rSofInt + rSofEst) / 2 : 0,
      Q + P.altezza,
      asseX ? 0 : -nz * (rSofInt + rSofEst) / 2,
    )
    if (asseX) soffitto.rotation.z = Math.PI / 2
    gruppo.add(soffitto)
  }

  /* ---------------------------------------------------------------- */
  /* I PEZZI RIPETUTI, tutti disegnati insieme                         */
  /* ---------------------------------------------------------------- */

  const L = P.larghezza
  type Parte = { da: number; a: number; extra: number }
  const dado = (parte: Parte) =>
    new BoxGeometry(L + parte.extra, parte.a - parte.da, P.profondita + parte.extra)
  /** il pezzo unico di un pilastro, alla sua quota, senza scostamenti */
  const quota = (parte: Parte): Pezzo[] => [[0, (parte.da + parte.a) / 2, 0, 0]]

  const ordine: Array<[Parte, Material, boolean]> = [
    [PARTI.zoccolo, pietraGrezza, false],
    [PARTI.giuntoBasso, buio, false],
    [PARTI.fascia, bronzo, false],
    [PARTI.fusto, pietra, true],
    [PARTI.giuntoAlto, buio, false],
    [PARTI.collarino, bronzo, false],
    [PARTI.cimasa, pietra, false],
  ]
  for (const [parte, materiale, ombra] of ordine) {
    gruppo.add(schiera(dado(parte), materiale, posePilastri, quota(parte), ombra))
  }

  /**
   * LE SCANALATURE — dodici listelli per fusto, e sono il dettaglio che
   * dichiara la misura.
   *
   * PERCHE' UN FUSTO LISCIO NON FUNZIONA. A venti metri un pilastro liscio
   * e' un rettangolo di un colore solo: non ha nessun elemento di cui
   * l'occhio conosca la dimensione, quindi non ha altezza. E' il motivo per
   * cui i colonnati sono scanalati da duemilacinquecento anni, e non e'
   * decorazione: e' che le scanalature danno alla luce radente qualcosa da
   * incidere, e quelle righe verticali chiare e scure raccontano la
   * rotondita' e la statura del sostegno.
   *
   * PERCHE' SPORGONO INVECE DI RIENTRARE. Una scanalatura vera e' un solco
   * concavo. Qui il fusto e' una scatola piena e un solco richiederebbe di
   * bucare la geometria; un listello che sporge di due centimetri produce le
   * stesse due righe — un bordo che prende luce e un fianco in ombra — con
   * dodici triangoli. La differenza si vedrebbe a due metri, e la camera non
   * ci arriva mai: passa al piu' vicino a otto metri e mezzo dal centro,
   * cioe' a otto metri e mezzo dal pilastro piu' vicino.
   *
   * DUE PER FACCIA E NON TRE, e questo l'ho imparato dal provino.
   *
   * Con tre listelli a trenta centimetri l'uno dall'altro la faccia veniva
   * divisa in quattro campi uguali larghi nove pixel a venti metri, e il
   * risultato — insieme ai corsi orizzontali troppo fitti — erano pilastri
   * che sembravano PERLINATO DI LEGNO. Righe verticali regolari, fitte e a
   * contrasto uguale sono la firma visiva del legno, non della pietra: sulla
   * pietra le righe devono essere POCHE e stare vicino ai bordi.
   *
   * Due listelli a 34 centimetri dal centro lasciano un campo centrale largo
   * e due margini stretti: e' una SPECCHIATURA, cioe' un pannello incassato
   * fra due bordi, che e' come si lavora una lesena di pietra. Stesso costo,
   * stessa luce radente, e legge come quello che e'.
   *
   * SU TUTTE E QUATTRO LE FACCE, e non solo su quella verso la corte, perche'
   * la camera fa duecento gradi: a meta' orbita si guardano i fianchi dei
   * pilastri del lato opposto, e un pilastro scanalato davanti e liscio di
   * fianco si smaschera nel momento in cui gira.
   *
   * E LA ROTAZIONE DEL PILASTRO NON ENTRA NEL CONTO. I dodici listelli sono
   * disposti a simmetria di quarto di giro: ruotando il gruppo di novanta
   * gradi si ottiene lo stesso gruppo. Quindi le stesse dodici pose valgono
   * per i pilastri dei lati lungo X e per quelli dei lati lungo Z, e non
   * serve comporre due rotazioni.
   */
  const filo = P.profondita / 2 + 0.010
  const mezzoFusto = (PARTI.fusto.da + PARTI.fusto.a) / 2
  const listelli: Pezzo[] = []
  for (const u of [-0.34, 0.34]) {
    listelli.push(
      [u, mezzoFusto, filo, 0],
      [u, mezzoFusto, -filo, 0],
      [filo, mezzoFusto, u, Math.PI / 2],
      [-filo, mezzoFusto, u, Math.PI / 2],
    )
  }
  const geoListello = new BoxGeometry(0.075, PARTI.fusto.a - PARTI.fusto.da - 0.20, 0.020)
  gruppo.add(schiera(geoListello, pietra, posePilastri, listelli))

  /**
   * LE APERTURE, tre schiere sovrapposte.
   *
   * LO SVERSAMENTO: l'alone di luce che l'apertura getta sul muro.
   *
   * Un'apertura illuminata non e' un rettangolo luminoso appiccicato a un
   * muro scuro: e' una sorgente, e una sorgente BAGNA cio' che le sta
   * intorno. Nel provino le mie leggevano come toppe di colore arancione
   * incollate sopra la pietra — piatte, senza nessun legame con la
   * superficie che le ospita.
   *
   * Un quadrato additivo largo il doppio, con una sfumatura che si spegne
   * ai bordi, costa un disegno e risolve. Additivo e non mescolato: e' luce
   * che si somma alla pietra, non vernice che la copre — e la differenza si
   * vede, perche' la venatura della pietra continua a leggersi sotto l'alone
   * invece di sparire.
   *
   * IL DIFETTO CHE HO TROVATO QUI, ed e' il piu' istruttivo di tutto il
   * lavoro: NELLA PRIMA STESURA LE SALE ACCESE NON SI VEDEVANO AFFATTO.
   *
   * La cornice era una SCATOLA PIENA di 2,86 per 3,66, cioe' piu' grande
   * dell'apertura di 2,60 per 3,40, e stava sei centimetri PIU' AVANTI del
   * piano luminoso. Una scatola piena piu' grande e davanti: copriva
   * esattamente cio' che doveva incorniciare. Nel provino a meta' orbita si
   * vedono cinque rettangoli marroni con un alone intorno, e per tutto
   * questo tempo li ho letti come «sale troppo smorte»: erano il metallo
   * scuro della cornice, e la luce dietro non e' mai arrivata al sensore.
   *
   * E' il difetto tipico di questo progetto — la diagnosi guarda il
   * parametro (il colore, l'intensita') mentre la causa e' un ordine di
   * profondita'. Nessun ritocco alla tinta l'avrebbe mai risolto.
   *
   * Adesso la cornice non e' piu' una scatola ma TRE PEZZI — due stipiti e
   * una soglia — che stanno FUORI dal vano e sporgono in avanti di 25
   * centimetri. Uno stipite profondo proietta la propria ombra dentro la
   * luce, e quell'ombra e' la prova che il muro ha uno spessore. L'architrave
   * della porta non c'e' perche' lo fa gia' la fascia continua del muro: e'
   * il modo in cui e' costruito un porticato vero, un'unica pietra sopra
   * tutte le aperture.
   *
   * L'ORDINE IN PROFONDITA', adesso esplicito, dal muro verso la corte:
   *
   *   0,008   l'alone additivo, appoggiato al muro
   *   0,020   il piano luminoso della sala
   *   0,130   gli stipiti e la soglia di bronzo, che sporgono fino a 0,25
   */
  const alone = schiera(new PlaneGeometry(6.0, 7.4), sversamento, poseAperture, [[0, 0, 0.008, 0]])
  alone.renderOrder = 1
  gruppo.add(alone)
  gruppo.add(schiera(new PlaneGeometry(2.10, 3.40), sala, poseAperture, [[0, 0, 0.020, 0]]))

  const stipite = new BoxGeometry(0.16, 3.54, 0.24)
  gruppo.add(schiera(stipite, bronzo, poseAperture, [[-1.13, 0, 0.13, 0], [1.13, 0, 0.13, 0]]))
  gruppo.add(schiera(new BoxGeometry(2.42, 0.10, 0.26), bronzo, poseAperture, [[0, -1.72, 0.14, 0]]))

  return gruppo
}

export const RAGGIO_CORTE = MISURA.raggio
