import { LIVELLO_SOGGETTO } from './Luci'
import { anisotropiaMassima } from '../core/Anisotropia'
// si ri-esporta: le ruote costruite (`scene/Ruote.ts`) devono finire sullo
// stesso livello della carrozzeria, se no i pannelli da studio le saltano e
// le ruote restano scure mentre l'auto e' illuminata
export { LIVELLO_SOGGETTO }
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  SRGBColorSpace,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  TextureLoader,
  Box3,
  Vector2,
  Vector3,
  type Material,
  type Texture,
} from 'three'

/**
 * I MATERIALI DELL'AUTO — uno per parte, e ognuno risponde alla luce a modo
 * suo.
 *
 * LA DIAGNOSI CHE HA CAMBIATO IL PROGETTO.
 *
 * Il giudizio era «cartapesta», e per due giorni ho risposto con piu'
 * risoluzione: 2k, 4k, 8k, un passaggio di tessitura «extreme» da trenta
 * crediti. Zero. Poi ho guardato cosa stavo effettivamente illuminando: UN
 * SOLO MATERIALE su tutto l'oggetto. Vernice, vetro, gomma, cerchi in lega,
 * fibra di carbonio e cromature avevano tutti la stessa ruvidita', la stessa
 * metallicita' e lo stesso indice di riflessione, e le loro differenze erano
 * DIPINTE dentro una fotografia.
 *
 * Ma quello che distingue la gomma dal cromo non e' che sono di colore
 * diverso: e' che si comportano in modo opposto quando la luce li colpisce.
 * La gomma restituisce quasi niente e da tutte le parti; il cromo
 * restituisce quasi tutto e da una parte sola. Se hanno lo stesso materiale,
 * nessuna quantita' di pixel puo' salvarli — e sotto una camera che si
 * muove, che e' il nostro caso, si smaschera nel primo secondo, perche' i
 * riflessi non scorrono come dovrebbero.
 *
 * Sei materiali, sei comportamenti:
 *
 *   VERNICE    due strati. Sotto un nero quasi assoluto, sopra un
 *              trasparente lucidissimo con la buccia d'arancia. Il riflesso
 *              e' BIANCO e ci scivola sopra: e' il trasparente a farlo, non
 *              il colore.
 *   VETRO      scurissimo e liscissimo. Di notte un parabrezza e' uno
 *              specchio nero, non una finestra.
 *   CARBONIO   il tessuto inverte il riflesso a seconda del filo. Non e'
 *              nero lucido: e' nero DIREZIONALE.
 *   GOMMA      la cosa piu' opaca della scena. Serve a fare da contrasto:
 *              senza qualcosa di veramente opaco, tutto sembra lucido.
 *   CERCHIO    metallo lavorato, riflette ma sporco.
 *   CROMO      metallo puro, quasi specchio.
 *
 * NESSUNA MAPPA DI COLORE, DA NESSUNA PARTE.
 *
 * E' la scelta piu' contro-intuitiva del file. Una mappa generata ha la luce
 * COTTA dentro: l'ombra sotto lo specchietto, il riverbero di un pavimento
 * che qui non c'e'. Quella luce finta non risponde alla scena — se la camera
 * gira, resta ferma — e sommata a quella vera produce esattamente l'effetto
 * carta incollata sul volume.
 *
 * Le uniche immagini qui dentro descrivono la FORMA della superficie al
 * millimetro (buccia d'arancia, trama del carbonio) e pesano trentadue
 * kilobyte in tutto, contro gli otto megabyte della mappa che ho buttato.
 */

const caricatore = new TextureLoader()
const cache = new Map<string, Texture>()

/**
 * UNA MAPPA CHE SEGUE LE UV DEL MODELLO, non ripetuta a piastrella.
 *
 * `micro` serve per il carbonio e la buccia d'arancia: motivi senza scala
 * propria, che si ripetono venti volte sul pezzo. Queste no. Sono le mappe
 * NATE CON QUESTA CARROZZERIA — la ruvidita' e il rilievo che il generatore ha
 * prodotto insieme alla forma — e vanno lette con le sue UV, una volta sola,
 * o finiscono da un'altra parte rispetto al punto per cui sono state fatte.
 */
function sua(file: string) {
  const gia = cache.get(file)
  if (gia) return gia
  const t = caricatore.load(file)
  t.anisotropy = anisotropiaMassima()
  // NIENTE `flipY`: le UV arrivano da glTF, che ha l'origine in alto a
  // sinistra, e three lo sa gia'. Girarla sarebbe la cura di un difetto che
  // non c'e', e produrrebbe una ruvidita' specchiata rispetto alla forma.
  t.flipY = false
  cache.set(file, t)
  return t
}

function micro(file: string, ripete: number) {
  const chiave = file + ripete
  const gia = cache.get(chiave)
  if (gia) return gia
  const t = caricatore.load(file)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(ripete, ripete)
  t.anisotropy = anisotropiaMassima()
  cache.set(chiave, t)
  return t
}

/**
 * LA VERNICE NERA, che e' il colore piu' difficile.
 *
 * Il nero non perdona: non avendo colore proprio, tutto quello che si vede
 * e' la geometria del riflesso. Se il riflesso e' sbagliato non c'e' niente
 * che lo copra — ed e' per questo che una carrozzeria nera fatta male
 * diventa «un blob senza forma», che e' letteralmente il giudizio ricevuto.
 *
 * I DUE STRATI.
 *
 * `metalness: 0` e non 1, e sembra assurdo per una vernice metallizzata. Ma
 * la scaglia metallica sta SOSPESA in un legante trasparente: il grosso
 * della luce colpisce il legante, che e' un dielettrico. Trattarla come
 * metallo puro le toglie il riflesso speculare bianco — che e' proprio
 * quello che si vede — e la fa diventare grigio piombo.
 *
 * `color` a 0,012: piu' scuro di quanto sembri ragionevole. Una vernice nera
 * vera ha una riflettanza diffusa intorno al 3-4%; scritta in lineare fa un
 * numero minuscolo. Metterla a 0,05 «per vederla» produce quel nero slavato
 * da modellino di plastica.
 *
 * `clearcoat: 1` con `clearcoatRoughness: 0,028`: lo strato di sopra e'
 * quasi uno specchio, ed e' lui a dare il riflesso nitido. La buccia
 * d'arancia gli va sopra come mappa di normali PROPRIA — e' l'ondulazione
 * dello strato trasparente, non della lamiera.
 */
/**
 * IL COLORE DELLA CARROZZERIA, in un posto solo.
 *
 * Sta qui e non dentro `vernice()` perche' e' l'unica cosa di questo file che
 * e' una decisione di GUSTO e non di fisica. Tutto il resto — la ruvidita'
 * del trasparente, l'indice di riflessione, quanto assorbe il nero — sono
 * misure di come si comporta una vernice vera. Il colore no: quello si
 * sceglie, e va potuto cambiare in una riga.
 *
 * I valori sono in LINEARE, non in esadecimale da editor grafico. Una vernice
 * automobilistica ha una riflettanza diffusa fra il 4% e il 25%: numeri
 * bassi, che scritti in sRGB sembrerebbero molto piu' chiari di quanto sono.
 */
export const TINTE = {
  /** nero: il piu' difficile, non ha colore proprio e mostra solo i riflessi */
  nero: [0.016, 0.016, 0.019],
  /** blu notte profondo — a luce calda vira al viola, a luce fredda al blu */
  bluNotte: [0.014, 0.021, 0.062],
  /** verde inglese scuro, molto saturo: legge come laccato */
  verdeScuro: [0.013, 0.036, 0.024],
  /** bronzo liquido: caldo, si sposa con la pietra della corte */
  bronzo: [0.085, 0.052, 0.026],
  /** grigio canna di fucile con una punta di blu */
  grafite: [0.036, 0.039, 0.045],
  /** rosso profondo, quasi bordeaux: il rosso vivo sarebbe volgare qui */
  rossoCupo: [0.105, 0.011, 0.014],
}

export let TINTA: [number, number, number] = TINTE.bluNotte as [number, number, number]
export function scegliTinta(t: [number, number, number]) { TINTA = t }

/**
 * LA VERNICE, SATINATA E NON A SPECCHIO.
 *
 * IL PERCORSO CHE HA PORTATO QUI, perche' e' istruttivo.
 *
 * Prima versione: `clearcoat 1` con ruvidita' 0,028 su un nero 0,012. Cioe'
 * uno specchio perfetto sopra il buio assoluto. Il giudizio: «luccica in
 * maniera innaturale, sembra argentato». Giusto — una superficie che riflette
 * tutto e non assorbe niente E' argento, per definizione.
 *
 * Seconda versione: ruvidita' del trasparente a 0,075. Meglio, ma ancora
 * «brilla troppo». E qui la diagnosi vera: il problema non era QUANTO
 * riflettesse, era che riflettesse in modo NITIDO. Un riflesso nitido su una
 * carrozzeria si legge come cromatura anche quando e' debole, perche'
 * l'occhio riconosce la cromatura dalla definizione dell'immagine riflessa,
 * non dalla sua intensita'.
 *
 * Terza, questa: SATINATA. Trasparente a 0,22 di ruvidita' e presenza 0,55.
 * Le sorgenti restano visibili come chiazze morbide e allungate — cioe' come
 * su una vernice vera fotografata di sera — ma il porticato dietro non si
 * legge piu' come in uno specchio.
 *
 * E porta due vantaggi che non avevo previsto:
 *
 *   IL COLORE SI VEDE. Con un trasparente a specchio la vernice era
 *   invisibile: si vedeva solo cio' che ci si rifletteva. Satinata, lo strato
 *   di colore torna a contare, e una tinta smette di essere una decisione
 *   inutile.
 *
 *   I DIFETTI DELLA MESH SPARISCONO. Uno specchio mostra ogni increspatura
 *   della superficie, ingigantita: e' cosi' che sono venute fuori le «crepe»
 *   e i «quadratini». Un satinato media su un cono ampio, e le stesse
 *   increspature non si vedono piu'. Non e' nascondere un difetto: e' che una
 *   vernice satinata VERA fa esattamente la stessa cosa sulle imperfezioni
 *   di una lamiera vera.
 */
export function vernice() {
  const m = new MeshPhysicalMaterial({
    // resta zero: la scaglia metallica di una vernice metallizzata sta
    // sospesa in un legante trasparente, ed e' il legante — un dielettrico —
    // a prendere il grosso della luce. Trattarla come metallo puro la fa
    // diventare grigio piombo.
    metalness: 0.0,
    roughness: 0.48,
    // 0,55 e non 1: il trasparente c'e' ma non domina. E' il rapporto fra i
    // due strati a decidere se una vernice legge come lucida a specchio,
    // satinata od opaca — non l'uno o l'altro da solo.
    // 0,70 con 0,15 di ruvidita': satinato NON vuol dire opaco.
    //
    // A 0,55 e 0,22 la vernice aveva smesso di brillare, ma aveva smesso
    // anche di sembrare costosa: era diventata una superficie verniciata a
    // rullo. La differenza fra satinato e opaco e' che il satinato conserva
    // un riflesso RICONOSCIBILE — si vede che c'e' una forma riflessa, ma
    // sfocata — mentre l'opaco restituisce solo un alone. E' il riflesso
    // riconoscibile a dire «laccato», e quindi «curato».
    clearcoat: 0.70,
    clearcoatRoughness: 0.15,
    clearcoatNormalMap: micro('/texture/buccia_nor.webp', 5),
    /* 1,00 E NON 0,72 — la vernice guarda il posto in cui sta.
       Misurato da `strumenti/carrozzeria.mjs`, che isola i pixel della vettura
       facendo la differenza fra due scatti (uno con la vettura, uno senza):
       sulla hero il SESSANTAQUATTRO PER CENTO della carrozzeria stava sotto 12
       su 255, con mediana 2,1. Non e' una vettura scura, e' una sagoma: il
       modello c'e', il modellato no.
       La causa non e' il colore — 0,012 lineare e' giusto, una vernice nera
       vera riflette pochissimo — ne' i pannelli, che disegnano i bordi ed e'
       il loro mestiere. E' che l'unica cosa che puo' illuminare i CENTRI delle
       superfici e' l'ambiente, e l'ambiente contava tre quarti.
       Un'automobile ferma davanti a una villa con le vetrate accese e una
       piscina illuminata quella luce ce l'ha addosso davvero. Portare la mappa
       a uno non e' aggiungere una sorgente inventata: e' smettere di scontare
       quella che c'e' gia' nella fotografia. */
    envMapIntensity: 1.00,
    /* 1,0 E NON 0,6. Tagliare l'intensita' speculare porta F0 dal 4% al 2,4%,
       cioe' ammazza esattamente il Fresnel bianco su cui poggia tutta la
       lettura di una vernice scura. Su un metallo non si notava; su un
       dielettrico e' la cosa che fa vedere la superficie. */
    specularIntensity: 1.0,
  })
  /* IL COLORE DI PARTENZA E' LA PRIMA FINITURA DELL'ELENCO, non una costante
     a parte — ed era un difetto vero, non una pulizia.
     `applicaFinitura` veniva chiamata SOLO al clic su un campione. Quindi
     all'avvio la carrozzeria non portava la finitura selezionata: portava
     `TINTA`, una costante scritta qui accanto e rimasta al nero di due
     automobili fa. Il selettore mostrava il grigio come scelto e la vettura
     era blu scuro — cioe' l'interfaccia diceva una cosa e la scena un'altra,
     che sul comando che dimostra «questo non e' un filmato» e' il difetto
     peggiore possibile.
     Adesso c'e' una fonte sola: il primo elemento di FINITURE. Cambiare la
     finitura di partenza vuol dire riordinare quell'elenco, e non c'e' nessun
     secondo posto dove il colore possa restare indietro. */
  const zero = FINITURE[0]
  m.color.setRGB(zero.tinta[0], zero.tinta[1], zero.tinta[2])
  m.metalness = zero.metallo ?? 0
  m.roughness = zero.ruvidita
  m.clearcoat = zero.trasparente
  m.clearcoatRoughness = zero.ruviditaTrasparente
  // la buccia d'arancia sale, perche' con un trasparente satinato puo': non
  // rischia piu' di trasformarsi in una lamiera grandinata, e aggiunge quel
  // tanto di irregolarita' che dice «verniciato», non «colorato»
  m.clearcoatNormalScale = new Vector2(0.30, 0.30)
  /* LE DUE MAPPE NATE CON LA CARROZZERIA — ed e' la leva piu' forte che ci sia
     sul realismo, molto piu' di qualunque numero scelto a mano.
     Un materiale scritto in codice ha UNA ruvidita' su tutta la superficie, e
     una superficie a ruvidita' costante non esiste in natura: e' il segno piu'
     riconoscibile della computer grafica, prima ancora della geometria troppo
     perfetta. Queste due arrivano dal generatore insieme alla forma, quindi la
     variazione cade DOVE la forma la giustifica.
     Della terna ORM si usa cio' che serve: three legge la ruvidita' dal canale
     verde e il metallico dal blu, quindi una tessitura sola fa due mestieri.
     L'occlusione — il canale rosso — e' 255 dappertutto e non porta niente: si
     lascia dov'e' invece di caricare una mappa in piu' per moltiplicare per uno.
     E LA MAPPA MOLTIPLICA, non sostituisce: la finitura scelta decide il
     livello, questa decide lo scarto. Per questo e' stata normalizzata attorno
     a 0,80 prima di essere salvata — cosi' la ruvidita' dichiarata resta quella
     che si legge nel selettore. */
  /* LA ORM RICOSTRUITA — vedi `strumenti/orm_nuova.mjs` e il §0 di
     `docs/PIANO_FOTOREALISMO.md`. La vecchia mappa faceva campionare al 66%
     dell'area (e al 74,8% delle superfici rivolte in alto) una ruvidita' sotto
     0,25: `0,30 x 0,004 = 0,001`, cioe' uno SPECCHIO. Il commento qui sotto
     diceva «0,32 per la mappa fa 0,26» e descriveva un'intenzione che il file
     non soddisfaceva.
     Quella vecchia resta su disco come `auto2r_orm.webp`, non e' stata
     sovrascritta: si torna indietro cambiando una riga. */
  const orm = sua('/texture/auto2r_orm2.webp')
  m.roughnessMap = orm
  m.metalnessMap = orm
  m.normalMap = sua('/texture/auto2r_nor.webp')
  // il rilievo si tiene basso: e' micro-struttura, non lamiera ammaccata
  m.normalScale.set(0.45, 0.45)
  m.name = 'VERNICE'
  return m
}

/**
 * IL VETRO DI NOTTE: UNO SPECCHIO NERO, NON UNA FINESTRA.
 *
 * IL GIUDIZIO ERA TRE PAROLE: «e' ancora trasparente». E la tentazione ovvia —
 * alzare l'opacita' finche' non si vede piu' niente — sarebbe stata una toppa:
 * un vetro opaco non e' un vetro, e' un pannello scuro incollato dove va il
 * parabrezza. Si vede subito, perche' smette di rispondere al movimento della
 * camera.
 *
 * IL DIFETTO VERO NON E' LA TRASPARENZA, E' COSA C'E' DIETRO. Attraverso il
 * finestrino laterale si intravedono le forme dell'ABITACOLO, che qui non c'e'
 * — e' un asset separato che entra solo quando la regia va dentro (decisione
 * D2). Un vetro che lascia vedere una stanza vuota racconta che la vettura e'
 * un guscio, ed e' esattamente l'informazione che non deve arrivare.
 *
 * COSA FA UN VETRO VERO, e che qui non stava facendo.
 *
 * Un parabrezza scuro sotto un cielo crepuscolare non e' «un po' trasparente»
 * in modo uniforme: SPECCHIA, e quanto specchia dipende dall'ANGOLO. Di taglio
 * — quando la superficie e' quasi parallela alla linea di vista — riflette
 * quasi tutto e non lascia passare niente; di fronte riflette il quattro per
 * cento e il resto passa. E' la ragione per cui, camminando intorno a
 * un'automobile ferma, i finestrini si accendono e si spengono: non cambia la
 * luce, cambia l'incidenza.
 *
 * IL NUMERO E' DI FRESNEL, e in three c'e' gia' meta' del lavoro: il riflesso
 * SPECULARE lo calcola con Schlick, ed e' per questo che i bordi del
 * parabrezza brillavano gia'. Quello che non c'era e' il complemento: la
 * TRASMISSIONE. Con `transparent` + `opacity` l'alfa e' una costante, quindi
 * il vetro lasciava passare il quattordici per cento del fondo anche di
 * taglio, dove non avrebbe dovuto passare quasi niente — e quel quattordici
 * per cento si sommava al riflesso invece di sostituirlo, che e' il modo piu'
 * rapido di far leggere «plastica trasparente colorata».
 *
 * Quindi l'alfa si lega all'angolo con la stessa formula del riflesso, presa
 * dal verso opposto:
 *
 *     F     = 0,04 + 0,96 * (1 - cos)^5      quanto ne torna indietro
 *     alfa  = 1 - (1 - F) * (1 - alfa_base)  quanto NON passa
 *
 * Di fronte F vale 0,04 e l'alfa resta quella dichiarata; di taglio F tende a
 * uno e l'alfa con lui. Non e' un effetto aggiunto: e' la stessa quantita' che
 * governa il riflesso, usata per il suo complemento — cioe' la conservazione
 * dell'energia scritta in una riga.
 *
 * E LA BASE SALE DA 0,86 A 0,92, perche' di FRONTE Fresnel non puo' fare
 * niente e il finestrino laterale, nel beat `orbita`, si guarda quasi di
 * fronte. Un vetro privacy da hypercar trasmette fra il cinque e il quindici
 * per cento: 0,92 sta dentro quel campo.
 *
 * COME SI MISURA «SI VEDE DENTRO», che a occhio e' un'opinione. Si isolano i
 * pixel del vetro con lo stesso trucco della carrozzeria — un secondo scatto
 * con il solo materiale VETRO tinto di verde in emissione, che dice quali
 * pixel sono suoi — e su quelli si guarda la DEVIAZIONE della luminanza. Un
 * vetro che specchia una notte ha pochi valori diversi; un vetro che lascia
 * vedere sedili, montanti e il fondo dall'altra parte ne ha molti. Al beat
 * `orbita` (0,30), su 16728 pixel di vetro:
 *
 *     alfa 0,86 (prima)   luminanza 11,0   deviazione 15,0
 *     alfa 0,90           luminanza  8,7   deviazione 11,8
 *     alfa 0,94           luminanza  7,1   deviazione  9,5
 *
 * LA PRIMA VERSIONE SI ERA FERMATA QUI, a 0,94, e i numeri sembravano darle
 * ragione: la deviazione era scesa di un terzo, e la struttura interna dal
 * provino era sparita. Ma era scesa anche la luminanza, da 11 a 7 — e la
 * vettura intera l'aveva pagata. `strumenti/carrozzeria.mjs`, che misura solo
 * i pixel dell'automobile, diceva che il novantesimo percentile scendeva a
 * TUTTI e tre i tempi: 85,1 -> 85,5 alla hero (uguale), 69,7 -> 64,6 a
 * `orbita`, 30,9 -> 25,0 al `lato`.
 *
 * E la diagnosi e' la stessa cosa detta due volte: togliere la trasmissione
 * senza dare al vetro qualcosa da specchiare non fa un vetro, fa una toppa
 * scura — cioe' esattamente la scorciatoia che si era deciso di non prendere.
 *
 * CHI DOVEVA RIEMPIRE IL BUCO, e chi non poteva. La strada ovvia era alzare
 * `envMapIntensity`, e non ha funzionato: portata da 1,15 a 1,45, il
 * novantesimo al `lato` si muove da 25,7 a 26,3. Niente. Il motivo e' che un
 * vetro nudo rimanda il QUATTRO PER CENTO di quello che riceve: si puo'
 * moltiplicare per due la scena riflessa, ma se il coefficiente di riflessione
 * e' quattro centesimi non ne esce luce.
 *
 * La manopola giusta era quel coefficiente, cioe' l'INDICE DI RIFRAZIONE —
 * vedi `IOR_VETRO` qui sotto. Con n = 1,9 la riflessione di fronte passa dal
 * 4 al 9,6 per cento, e siccome lo stesso numero entra nella formula
 * dell'alfa, il vetro ferma di piu' E rimanda di piu' nello stesso gesto. A
 * quel punto l'alfa di base ha potuto tornare giu' a 0,92.
 *
 * DOVE SI E' FERMATA, misurato sulla ruota nuova contro la stessa scena senza
 * nessuna di queste modifiche:
 *
 *              90esimo percentile        quasi neri
 *     hero       85,1 -> 89,6              68,8% -> 65,9%
 *     orbita     69,7 -> 69,8              50,0% -> 50,0%
 *     lato       30,9 -> 27,8              81,1% -> 81,5%
 *
 * Hero migliora, `orbita` e' identico, e al `lato` il novantesimo resta sotto
 * di tre punti. Quei tre punti sono le luci del fondo che passavano attraverso
 * il parabrezza: non erano carrozzeria, erano sfondo visto in trasparenza, ed
 * erano il difetto. La mediana della vettura al `lato`, che invece e'
 * carrozzeria vera, sale da 1,0 a 1,4.
 *
 * La FINITURA invece non si tocca: la ruvidita' 0,055 e' la micro-ondulazione
 * da laminazione, e il ragionamento per cui non e' 0,02 sta scritto piu' sotto
 * riga per riga. La microvariazione sul bordo — dove il vetro e' curvato di
 * piu' e la laminazione e' meno piana — sta in `scene/Guarnizione.ts`, perche'
 * li' c'e' gia' la distanza di ogni vertice dal bordo del guscio.
 */
/**
 * L'INDICE DI RIFRAZIONE DEL VETRO, e perche' non e' 1,52.
 *
 * Un cristallo nudo sta a 1,52, cioe' rimanda il quattro per cento di quello
 * che riceve quando lo si guarda di fronte. Un parabrezza d'automobile
 * costruito dopo il duemila non e' un cristallo nudo: ha un TRATTAMENTO
 * SOLARE, uno o piu' strati di ossido metallico spessi qualche decina di
 * nanometri, messi li' per rimandare indietro l'infrarosso e non far diventare
 * un forno l'abitacolo. Quegli strati rimandano anche una parte del visibile,
 * ed e' il motivo per cui un'automobile ferma al sole ha i vetri che sembrano
 * specchiati mentre una finestra di casa no.
 *
 * 1,9 vale il nove e mezzo per cento di riflessione di fronte, cioe' due volte
 * e mezzo un vetro nudo. Non e' un trucco per schiarire: e' la ragione fisica
 * per cui un vetro d'auto puo' permettersi di essere scurissimo e non
 * diventare un buco nero. E si dichiara UNA VOLTA, qui, perche' lo stesso
 * numero deve andare in due posti — three lo usa per il riflesso, il Fresnel
 * qui sotto lo usa per il suo complemento — e due copie dello stesso numero
 * prima o poi divergono.
 */
const IOR_VETRO = 1.9

export function vetro() {
  const m = new MeshPhysicalMaterial({
    metalness: 0.0,
    ior: IOR_VETRO,
    // LISCISSIMO. Il vetro e' l'unica superficie dell'auto piu' liscia del
    // trasparente della vernice, e quel salto di nitidezza fra parabrezza e
    // cofano e' uno dei segnali che l'occhio usa per capire che sono due
    // materiali. Pareggiarli li fa leggere come un pezzo solo.
    // 0,055 e non 0,02. Anche il parabrezza era uno specchio perfetto, e su
    // una superficie curva e sfaccettata uno specchio perfetto e' il modo
    // piu' rapido di mostrare ogni difetto della mesh: ogni faccia riflette
    // in una direzione diversa e il vetro si legge A QUADRETTI. Un vetro
    // vero ha una micro-ondulazione da laminazione che ammorbidisce appena.
    roughness: 0.055,
    clearcoat: 0,
    // 1,45 E NON 0,85: vedi il ragionamento sopra. Portando l'alfa a uno di
    // taglio il fondo non passa piu', e quello che il vetro rimanda deve
    // bastare a riempire il buco — se no lo specchio nero diventa solo nero.
    // Misurato, sposta poco: la maggior parte di cio' che il parabrezza
    // specchia in questa scena non e' il panorama, sono i pannelli e le gole
    // della corte. Resta alto perche' e' l'unica manopola che lavora nei tempi
    // in cui la vettura guarda il cielo, dove il panorama e' tutto quel che
    // c'e'.
    envMapIntensity: 1.45,
    transparent: true,
    // LO SCOSTAMENTO DI POLIGONO, contro il tratteggio sulla sagoma.
    //
    // Lungo il tetto e il bordo del cofano correva una linea PUNTEGGIATA, un
    // pixel chiaro e uno scuro alternati. Non e' un difetto di antialiasing:
    // e' z-fighting. Il parabrezza generato non finisce dove comincia la
    // lamiera — ci si sovrappone per qualche decimo di millimetro — e su
    // quella striscia le due superfici si contendono la profondita' pixel per
    // pixel, vincendo a turno.
    //
    // TROVATO MISURANDO INVECE CHE GUARDANDO. Uno strumento spegne un pezzo
    // per volta e conta i pixel isolati lungo la sagoma: con tutto acceso 572,
    // senza parabrezza 333. Nessun altro pezzo scendeva sotto 430. Guardando,
    // avrei continuato a dare la colpa alla carrozzeria.
    //
    // Il numero e' negativo perche' il vetro deve vincere: sta FUORI dalla
    // lamiera, e quando i due sono a pari merito e' lui quello che si vede.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    // 0,92 e non 0,86: e' un vetro SCURO, e di notte quasi non passa niente.
    // Un parabrezza troppo trasparente mostra che dentro non c'e' l'abitacolo
    // — che infatti e' un asset separato (decisione D2) — ed e' il difetto che
    // il committente ha riassunto in «e' ancora trasparente».
    //
    // Questa e' solo la BASE, cioe' il valore di fronte, e nemmeno tutto: con
    // n = 1,9 il Fresnel qui sotto la porta comunque a 0,928 guardandola in
    // faccia, e a uno di taglio. E' il motivo per cui non serve piu' lo 0,94
    // della prima versione, che scuriva il vetro senza dargli niente da
    // rimandare.
    opacity: 0.92,
  })
  // il colore scende ancora: e' il vetro stesso, cioe' cio' che si vede DOVE
  // il fondo non passa piu'. Deve restare quasi nero, se no la trasmissione
  // diventa una velatura grigia e il parabrezza legge come plexiglass
  // graffiato invece che come cristallo scuro.
  m.color.setRGB(0.005, 0.006, 0.009)
  m.name = 'VETRO'
  specchiaDiTaglio(m, IOR_VETRO)
  return m
}

/**
 * FRESNEL SULLA TRASMISSIONE — la riga che fa la differenza fra un vetro e una
 * plastica trasparente.
 *
 * Sta fuori da `vetro()` perche' e' la meta' di un innesto: `Guarnizione.ts`
 * scrive nello stesso shader e questo va poterlo incatenare senza che i due si
 * cancellino a vicenda.
 *
 * DOVE SI INNESTA E PERCHE' PROPRIO LI'. `geometryNormal` e `geometryViewDir`
 * nascono dentro `lights_fragment_begin` — prima non esistono — e l'alfa viene
 * consumata da `opaque_fragment`, che e' l'ultima riga del fragment. In mezzo
 * c'e' tutto il calcolo della luce, e non se ne tocca una virgola: si legge
 * l'angolo appena e' disponibile e si corregge l'alfa appena prima che venga
 * scritta.
 *
 * `n` E' UN PARAMETRO E NON UNA COSTANTE: e' lo STESSO indice che il materiale
 * dichiara a three per il riflesso. Scriverlo due volte sarebbe la premessa di
 * un difetto muto — si cambia l'uno, si dimentica l'altro, e il vetro riflette
 * piu' di quanto ferma o viceversa, che e' energia inventata o buttata.
 */
export function specchiaDiTaglio(m: Material, n = 1.5) {
  const q = m as Material & { __fresnel?: boolean }
  if (q.__fresnel) return
  q.__fresnel = true

  // la riflettanza di fronte, da Fresnel per incidenza normale
  const f0 = ((n - 1) / (n + 1)) ** 2

  const prima = m.onBeforeCompile
  m.onBeforeCompile = function (s, r) {
    prima?.call(this, s, r)
    s.fragmentShader = s.fragmentShader.replace(
      '#include <lights_fragment_begin>',
      '#include <lights_fragment_begin>\n' +
      // il coseno fra normale e sguardo, in valore assoluto: le facce girate
      // dall'altra parte devono comportarsi allo stesso modo, se no il guscio
      // del parabrezza cambia carattere a meta'
      '  float cosVetro = abs(dot(geometryNormal, geometryViewDir));\n' +
      // Schlick, con la stessa F0 che three usa per il riflesso speculare
      '  float fresnelVetro = ' + f0.toFixed(5) + ' + ' + (1 - f0).toFixed(5) +
      ' * pow(1.0 - cosVetro, 5.0);\n',
    )
    s.fragmentShader = s.fragmentShader.replace(
      '#include <opaque_fragment>',
      // quello che NON passa: uno meno la parte trasmessa, che a sua volta e'
      // il complemento del riflesso per la quota che il vetro gia' fermava
      '  diffuseColor.a = 1.0 - (1.0 - fresnelVetro) * (1.0 - diffuseColor.a);\n' +
      '#include <opaque_fragment>',
    )
  }
  const chiavePrima = m.customProgramCacheKey
  // stessa trappola della guarnizione: senza chiave propria questo vetro si
  // scambierebbe il programma compilato con un altro materiale dagli stessi
  // parametri, portandosi dietro Fresnel o perdendolo
  m.customProgramCacheKey = function () {
    return 'fresnel|' + (chiavePrima ? chiavePrima.call(this) : '')
  }
  m.needsUpdate = true
}

/** fibra a vista: nera, ma DIREZIONALE */
export function carbonio() {
  const m = new MeshPhysicalMaterial({
    metalness: 0.0,
    roughness: 1.0,
    roughnessMap: micro('/texture/carbonio_rgh.webp', 22),
    normalMap: micro('/texture/carbonio_nor.webp', 22),
    // il carbonio a vista e' laccato: ha il suo trasparente sopra, piu'
    // opaco di quello di una carrozzeria
    // IL CARBONIO A VISTA E' LACCATO OPACO, non lucido a specchio.
    //
    // A 0,85 di trasparente con ruvidita' 0,10 l'ala e le minigonne
    // brillavano come plastica bagnata: il giudizio e' stato «lo specchietto
    // e l'alettone brillano ancora». Sulle hypercar il carbonio strutturale
    // e' quasi sempre finito OPACO — sia perche' e' piu' leggero (meno
    // strati di vernice) sia perche' e' cosi' che si vede la trama, che e'
    // tutto il motivo per cui lo si lascia a vista.
    //
    // E ha un effetto di composizione: un pezzo opaco accanto a uno satinato
    // crea un salto di finitura, e sono i salti di finitura a dire che un
    // oggetto e' fatto di parti diverse. Tutto ugualmente lucido legge come
    // un blocco unico verniciato — cioe' come un giocattolo.
    clearcoat: 0.30,
    clearcoatRoughness: 0.30,
    envMapIntensity: 0.55,
  })
  m.color.setRGB(0.016, 0.016, 0.018)
  m.normalScale = new Vector2(0.55, 0.55)
  m.name = 'CARBONIO'
  return m
}

/**
 * LA GOMMA, e perche' e' importante che sia BRUTTA.
 *
 * E' la superficie piu' opaca della scena, e serve proprio a questo. In un
 * fotogramma in cui tutto e' lucido, niente sembra lucido: il lucido si
 * legge solo per contrasto. Il pneumatico e' l'ancora opaca che fa sembrare
 * bagnata la vernice.
 */
export function gomma() {
  const m = new MeshStandardMaterial({ metalness: 0.0, roughness: 0.94, envMapIntensity: 0.35 })
  m.color.setRGB(0.017, 0.017, 0.018)
  m.name = 'GOMMA'
  return m
}

/** cerchio forgiato: metallo scuro lavorato, riflette ma non e' uno specchio */
export function cerchio() {
  // il cerchio scende a 0,38 di ruvidita': un forgiato scuro brunito, non
  // lucidato a specchio. Nel provino i cerchi uscivano dorati e lucenti
  // quanto i fari, e su una vettura scura sono la seconda cosa che deve
  // stare zitta dopo gli specchietti.
  const m = new MeshStandardMaterial({ metalness: 1.0, roughness: 0.38, envMapIntensity: 0.8 })
  m.color.setRGB(0.22, 0.215, 0.21)
  m.name = 'CERCHIO'
  return m
}

/**
 * LA PINZA DEI FRENI E' ROSSA, ed e' una decisione presa contro il mio parere.
 *
 * Qui c'era scritto il contrario: «su queste vetture non e' rossa, e una pinza
 * rossa griderebbe piu' di tutto il resto della scena messo insieme». Il
 * ragionamento non era sbagliato — in una scena notturna costruita su blu
 * cobalto e ambra, un rosso saturo e' l'unico colore che non ha parenti — ma
 * la decisione non era mia, e chi la prende ha una ragione che il ragionamento
 * non contempla: la pinza rossa e' il segno con cui si legge una vettura di
 * quel tipo, e una ruota senza quel segno resta una ruota qualunque per
 * chiunque non guardi le ruote di mestiere.
 *
 * QUINDI E' ROSSA, MA E' UNA PINZA E NON UN SEMAFORO. Le due cose che la
 * tengono al suo posto:
 *
 * 1. E' VERNICE SU ALLUMINIO, cioe' `metalness` zero. Il rosso metallico non
 *    esiste su una pinza: quella e' vernice a polvere, opaca sotto e con un
 *    trasparente sopra, e la differenza si vede nel modo in cui prende la luce
 *    dei fari — un metallo rosso rimanderebbe un riflesso rosso, la vernice
 *    rimanda un riflesso BIANCO sopra un colore rosso. E' quel riflesso bianco
 *    a far leggere «verniciato».
 * 2. IL ROSSO E' SPORCO DI NERO, non puro. In lineare vale 0,52 sul rosso e
 *    un paio di centesimi sugli altri due: in sRGB e' un mattone, non un rosso
 *    primario. Sotto la luce dei fari sale, all'ombra affonda — che e'
 *    esattamente il mestiere di un accento: farsi vedere quando la luce lo
 *    trova, sparire quando non lo trova.
 *
 * E POI E' ARRIVATO IL PROVINO, e diceva che il rosso non c'era.
 *
 * Nel fotogramma del beat `lato` — quello in cui la camera sta piu' vicina
 * alla ruota — la pinza si leggeva come un arco quasi nero. Misurata invece
 * che guardata (due scatti, uno normale e uno con la pinza tinta di verde in
 * emissione per sapere QUALI pixel sono suoi, poi si leggono i valori sul
 * primo): 2043 pixel, rosso medio 16,4 su 255. Con il verde e il blu sotto
 * l'uno. Cioe' la TINTA era giustissima — il rapporto fra i canali dice rosso
 * puro — ma la LUMINANZA era quella di un nero.
 *
 * E NON ERA COLPA DELLA GEOMETRIA, che nel frattempo e' cambiata. A meta'
 * lavoro la ruota costruita e' stata rifatta: la pinza e' passata da 68 a 560
 * triangoli, con la sezione ottagonale, i pistoncini e i ponti — cioe' con
 * delle facce INCLINATE, che sono l'unica cosa che possa prendere una luce
 * laterale. Era ragionevole aspettarsi che il difetto si fosse risolto da
 * solo, e la misura e' stata rifatta apposta: sulla ruota nuova, con il
 * materiale vecchio, il rosso medio fa 16,4 contro i 18,6 della vecchia. Non
 * si era mosso. Aveva ragione la diagnosi: il problema non e' quante facce ci
 * sono, e' che non arriva luce a nessuna di quelle facce.
 *
 * Non era un problema di colore, quindi, e alzare la saturazione non avrebbe
 * spostato niente: alla pinza NON ARRIVA LUCE. Sta dentro il passaruota, che
 * e' il punto piu' buio di tutta la vettura — sopra ha la lamiera del
 * parafango, davanti la gomma, dietro il fondo. Nessuno dei pannelli da
 * studio ci entra, e l'unica irradianza che la raggiunge e' l'ambiente, che
 * qui e' un blu notte da 0,07: moltiplicato per un'albedo rossa da' un numero
 * che in virgola mobile esiste e sullo schermo no.
 *
 * DUE MOSSE, in quest'ordine.
 *
 * PRIMA: PIU' PIGMENTO E MENO TRASPARENTE. L'albedo sale da 0,30 a 0,52 e il
 * trasparente scende da 0,45 a 0,16, con la sua ruvidita' su a 0,44 e quella
 * del fondo a 0,56. Non e' una scorciatoia per «vederla di piu'»: e' la
 * descrizione di una pinza VERA dopo mille chilometri. La polvere di freno e'
 * ghisa e ferodo macinati, si deposita sulla vernice a polvere e la rende
 * OPACA — e una superficie opaca rimanda in diffusione quasi tutto quello che
 * prende, invece di rimandarlo in una direzione sola dove la camera non c'e'.
 * Un trasparente lucido, in un posto senza sorgenti, non riflette niente e
 * basta: e' uno strato che toglie luce al colore e non ne restituisce.
 *
 * Da sola questa mossa non basta: il rosso medio passa da 16,4 a 32,1, cioe'
 * da nero a nero appena meno nero. Prevedibile — moltiplica per meno di due un
 * numero che vale zero.
 *
 * SECONDA: IL RIMBALZO DEL DISCO, che e' la cosa che mancava davvero.
 *
 * A tre centimetri dalla pinza c'e' l'unica superficie chiara di tutta la
 * ruota: il disco carboceramico (`RUOTA_DISCO`, grigio 0,30 e opaco — vedi
 * `scene/Ruote.ts`, dove sta scritto anche perche' deve essere chiaro). Su un
 * motore con illuminazione globale quel disco rimanderebbe addosso alla pinza
 * la luce che prende, e sarebbe di gran lunga la sua sorgente principale.
 * Three non calcola nessun rimbalzo: la luce colpisce una superficie, si
 * ferma li' e non riparte.
 *
 * Quindi il rimbalzo si dichiara. Non come luce vera — una PointLight dentro
 * il passaruota illuminerebbe anche la gomma, il cerchio e il parafango, e
 * costerebbe quattro sorgenti in piu' — ma come IRRADIANZA aggiunta al solo
 * materiale della pinza, dello stesso grigio del disco. Nello shader di three
 * si somma a `irradiance` subito dopo `lights_fragment_maps`: da li' in poi
 * segue la strada di tutte le altre luci indirette, cioe' viene moltiplicata
 * per l'albedo. E' importante che passi di li' e non che sia un'emissione:
 * un'emissione sarebbe un rosso stampato che non risponde piu' a niente,
 * mentre un'irradianza moltiplicata per il colore resta VERNICE — se domani
 * la pinza diventasse nera, il rimbalzo la lascerebbe nera.
 *
 * PERCHE' SENZA DIREZIONE. La pinza sta A CAVALLO del disco: lo abbraccia da
 * tutti e due i lati, e il disco e' un piatto largo trecentocinquanta
 * millimetri che la circonda per mezzo giro. La luce che le arriva da li' non
 * ha una direzione, arriva da un anello — e l'approssimazione onesta di una
 * sorgente che ti avvolge e' un termine ambientale, non un vettore.
 *
 * E L'ACCENTO RESTA UN ACCENTO. Era la condizione: una pinza che si vede
 * sempre non e' piu' un dettaglio, e' una decorazione — ed e' la ragione per
 * cui all'inizio era stata fatta nera. Il rimbalzo pero' non e' una luce che
 * si accende, e' una costante che moltiplica una superficie: quando la
 * vettura e' lontana quella superficie non c'e'. Misurato con lo stesso
 * metodo: alla hero (0,06) la pinza occupa SEI pixel su novecentomila, cioe'
 * un millesimo di per cento del fotogramma, e a `orbita` — sia a 0,20 sia a
 * 0,30 — ZERO, perche' le razze del cerchio la coprono per intero. Non e' un
 * compromesso riuscito: e' che a quella distanza il problema non esiste, e
 * l'unico posto dove il rosso deve comparire e' anche l'unico in cui e' fatto
 * di piu' di due pixel.
 */
/**
 * L'IRRADIANZA CHE IL DISCO RIMANDA ADDOSSO ALLA PINZA.
 *
 * E' il grigio di `RUOTA_DISCO` (0,30 / 0,295 / 0,285) preso tale e quale: il
 * rimbalzo ha il colore di cio' che rimbalza, ed e' anche il motivo per cui e'
 * NEUTRO e non blu come l'ambiente. Un rimbalzo neutro su un'albedo rossa da'
 * rosso; l'ambiente blu su un'albedo rossa da' nero, che e' esattamente quello
 * che c'era prima.
 *
 * IL FATTORE NON E' UNO, ed e' l'unica cosa arbitraria del blocco. Un rimbalzo
 * vero varrebbe l'albedo del disco moltiplicata per l'irradianza che il disco
 * riceve — cioe' molto meno di questo — ma il disco qui e' l'ultimo anello di
 * una catena gia' scontata due volte (la luce arriva dall'ambiente, entra nel
 * passaruota, colpisce il disco, riparte). Alzare il fattore e' il modo di
 * dire che quella catena, in un motore senza illuminazione globale, e' stata
 * troncata: si sta restituendo la luce che manca, non aggiungendone di nuova.
 *
 * E' anche la sola manopola di tutta la faccenda: alzarlo schiarisce la pinza,
 * abbassarlo la riaffonda. Misurato nel beat `lato`, sul rosso medio dei suoi
 * 2043 pixel: 0 -> 32,1 su 255, 1,6 -> 67,4 con le alte luci a 127. Sopra
 * comincia a sembrare illuminata da dentro, che e' il difetto tipico di un
 * rimbalzo dichiarato invece che calcolato.
 *
 * IL DISCO NEL FRATTEMPO E' STATO BUCATO — sessantaquattro fori passanti su
 * quattro corone, come su un carboceramico vero — e quindi la superficie che
 * rimanda la luce e' fisicamente meno di prima. Il numero qui non e' stato
 * abbassato per compensare: e' stato rimisurato dopo, e il risultato e'
 * quello scritto sopra. Un foro toglie disco ma aggiunge bordi, e un bordo
 * illuminato di taglio rimanda quanto una faccia piena.
 */
const GRIGIO_DISCO: [number, number, number] = [0.300, 0.295, 0.285]
const FORZA_RIMBALZO = 1.6
const RIMBALZO_DISCO = GRIGIO_DISCO.map((v) => v * FORZA_RIMBALZO)

export function pinza() {
  const m = new MeshPhysicalMaterial({
    metalness: 0.0,
    // 0,56 e non 0,42: la polvere di freno e' un abrasivo che si deposita, e
    // una pinza in servizio non e' mai liscia come una appena verniciata
    roughness: 0.56,
    // il trasparente della vernice a polvere: c'e', ma non e' quello di una
    // carrozzeria. Una pinza sta dietro una ruota e prende polvere di freno
    // dal primo chilometro — quindi 0,16 e non 0,45, con la ruvidita' quasi
    // doppia. In un posto senza sorgenti un trasparente lucido non riflette
    // niente: toglie luce al colore e non ne restituisce.
    clearcoat: 0.16,
    clearcoatRoughness: 0.44,
    // l'ambiente le arriva addosso poco e male — sta dentro un passaruota —
    // ma quel poco vale piu' di prima adesso che l'albedo e' quasi doppia
    envMapIntensity: 0.75,
  })
  m.color.setRGB(0.520, 0.026, 0.020)
  m.name = 'PINZA'

  // IL RIMBALZO, innestato nello shader.
  //
  // `irradiance` esiste gia' dentro `lights_fragment_begin` e viene consumata
  // da `RE_IndirectDiffuse` in `lights_fragment_end`: sommarci sopra subito
  // dopo `lights_fragment_maps` significa entrare nel calcolo esattamente come
  // ci entrano la luce ambientale e la mappa di irradianza, moltiplicata per
  // l'albedo e per l'occlusione. Nessuna riga di illuminazione riscritta.
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <lights_fragment_maps>',
      '#include <lights_fragment_maps>\n' +
      '  irradiance += vec3(' +
      RIMBALZO_DISCO.map((v) => v.toFixed(4)).join(', ') +
      ');',
    )
  }
  // NON E' FACOLTATIVO, ed e' una trappola gia' pagata su questo progetto (sta
  // scritta anche in `scene/Guarnizione.ts`): due materiali con gli stessi
  // parametri condividono il programma compilato, e senza una chiave propria
  // la pinza si scambierebbe lo shader con un'altra vernice qualunque —
  // portandosi dietro il rimbalzo, o perdendolo.
  m.customProgramCacheKey = () => 'pinza-rimbalzo'
  return m
}

/**
 * UN FILAMENTO DI LUCE — la lama sul fianco, la barra in coda, l'anello.
 *
 * Non e' un materiale illuminato: e' un materiale che EMETTE. La differenza
 * conta piu' di quanto sembri, ed e' la stessa gia' pagata sul quadro
 * strumenti e sui pannelli del carosello: una luce che si spegne insieme alla
 * notte non e' una luce, e' una superficie chiara. Di notte, in una corte
 * scura, quei tre filamenti devono essere le uniche cose accese della vettura.
 *
 * `toneMapped: false` perche' il valore sopra uno e' voluto: e' cosi' che
 * sfonda la soglia del bagliore e prende l'alone, che e' meta' dell'effetto.
 * Con il tone mapping addosso si assesterebbe su un bianco qualunque.
 */
export function filamento(r: number, g: number, b: number, forza = 2.4) {
  const m = new MeshBasicMaterial({ toneMapped: false })
  m.color.setRGB(r * forza, g * forza, b * forza)
  m.name = 'FILAMENTO'
  return m
}

/**
 * LA SCOCCA — un pezzo solo, con le quattro mappe nate insieme alla forma.
 *
 * PERCHE' NON E' PIU' TAGLIATA IN PEZZI, ed e' un errore mio corretto.
 *
 * Per mezza giornata questa carrozzeria e' stata divisa in sei — carrozzeria,
 * parabrezza, faro, fanale, lama, fondo — classificando ogni faccia dal colore
 * cotto nella texture, per poter assegnare i materiali per NOME come si fa in
 * tutto il resto del progetto. Funzionava, e ha distrutto la cosa migliore che
 * il modello aveva: le fughe. Il confronto e' agli atti — `docs/provini/
 * ab_intera_zoom.png` contro `ab_separata_zoom.png` — e non lascia dubbi: da
 * una parte una linea sottile e nitida attorno alla carenatura, dall'altra uno
 * strappo frastagliato lungo tutta la fiancata.
 *
 * La lezione e' generale: **una classificazione per faccia produce un bordo
 * seghettato, e su una superficie continua un bordo seghettato e' una ferita.**
 * Cio' che va diviso non e' la geometria: e' la MAPPA.
 *
 * COSA FANNO LE QUATTRO.
 *
 *   `auto2_col`  il colore, DECOTTO. La fotografia di partenza ha la luce
 *                dello studio dentro; il contrasto e' stato compresso verso la
 *                mediana (0,42) prima di salvarla. E' la stessa aritmetica
 *                dell'asfalto in `scene/Lastra.ts`: la fotografia porta la
 *                grana, l'esposizione la decide la scena.
 *   `auto2_orm`  ruvidita' nel verde e metallico nel blu, come vuole three.
 *                Una tessitura sola per due mestieri. La ruvidita' e' stata
 *                normalizzata attorno a 0,80 perche' three MOLTIPLICA: la
 *                finitura scelta decide il livello, la mappa lo scarto.
 *   `auto2_nor`  il rilievo. E' l'unica delle quattro che non contiene nessuna
 *                luce, quindi e' quella che si puo' usare tale e quale — ed e'
 *                anche la leva piu' forte sul realismo, perche' un materiale
 *                scritto a mano ha UNA ruvidita' su tutta la superficie, e una
 *                superficie a ruvidita' costante non esiste in natura.
 *   `auto2_emi`  l'anello, la lama e il fanale, ritagliati dal colore con la
 *                stessa soglia che serviva a tagliare i pezzi e tinti di ciano.
 *                Le luci erano gia' dipinte li' dentro: non c'era bisogno di
 *                tagliare niente per accenderle.
 */

export function scocca() {
  /* I NUMERI NON STANNO QUI, STANNO IN `FINITURE[0]` — ed e' la stessa lezione
     gia' pagata su `vernice()`, ripagata due volte.
     Finche' la scocca teneva i propri valori e l'elenco FINITURE i suoi, le due
     copie erano libere di divergere: e sono divergite, di parecchio — 0,62 di
     trasparente qui contro 0,35 la', 0,32 di ruvidita' contro 0,34. Cliccare il
     primo campione, quello che dovrebbe essere il vestito con cui l'automobile
     e' gia' in scena, la CAMBIAVA. Un configuratore in cui la prima scelta non
     e' lo stato di partenza e' un configuratore che si contraddice al primo
     clic.
     Adesso la fonte e' una sola: le ragioni dei numeri stanno scritte accanto
     ai numeri, dentro FINITURE[0], e qui restano soltanto le mappe. */
  const zero = FINITURE[0]
  const m = new MeshPhysicalMaterial({
    /* MEZZO METALLO, E NON METALLO PIENO — ed e' una resa consapevole alla
       scena, non un errore di fisica.
       Un metallo puro non ha diffusione: restituisce SOLO cio' che specchia.
       Nel disegno di partenza quella carrozzeria e' alluminio nudo dentro uno
       studio bianco, e brilla; qui sta in una corte di notte, e un metallo
       puro di notte e' NERO — fisicamente giusto e illeggibile. Nel provino la
       vettura usciva verde petrolio e il committente l'ha bocciata due volte.
       A 0,55 resta la mezza diffusione che la fa leggere grigia anche quando
       intorno non c'e' niente da specchiare, e resta abbastanza metallo perche'
       la villa riflessa sulla fiancata sia ancora riconoscibile — che e' la
       cosa che il comando FINITURA deve dimostrare.
       La mappa moltiplica: dove il generatore ha dipinto non-metallo (i vetri,
       le gomme del sottoscocca) scende ancora. */
    /* NOVANTADUE E TRENTADUE — e i due numeri di prima erano un errore mio,
       non una scelta.
       Avevo scritto `roughness: 1.0` convinto che fosse un valore neutro da
       lasciar decidere alla mappa. Non lo e': three MOLTIPLICA, e la mappa ha
       mediana 0,80. Il risultato effettivo era 0,80 di ruvidita', cioe' CRETA
       — e infatti una revisione esterna ha scritto «legge come un modello di
       studio in clay, non come un'auto», e aveva ragione sul sintomo.
       Sulla causa no: diceva che mancava la mappa d'ambiente. C'e', ed e'
       quella vera del panorama — `scene/Panorama.ts` la mette su
       `scena.environment`, e three la applica da sola a ogni materiale fisico.
       Mancava il posto in cui specchiarla: a 0,80 di ruvidita' non specchia
       niente nemmeno il cromo.
       0,32 per la mappa fa 0,26, che e' la ruvidita' di una carrozzeria vera.
       E a quel punto il metallo puo' tornare quasi pieno: il motivo per cui
       l'avevo abbassato a 0,55 era che di notte un metallo puro e' nero, ma un
       metallo nero e' nero perche' non ha NIENTE da specchiare — con 0,26 di
       ruvidita' la villa illuminata gli finisce addosso, e quella si vede. */
    metalness: zero.metallo ?? 0,
    roughness: zero.ruvidita,
    // il trasparente resta basso: questa non e' lamiera verniciata, e'
    // alluminio a vista, e un trasparente spesso sopra un metallo nudo e' la
    // cosa che fa sembrare di plastica un modello che non lo e'
    /* E IL TRASPARENTE SALE, perche' e' l'altra meta' di cio' che fa leggere
       «lamiera» invece di «materiale».
       Un metallo nudo restituisce un riflesso della TINTA del metallo; una
       carrozzeria ne restituisce due — quello colorato del metallo sotto e
       quello BIANCO del trasparente sopra — e sono i due riflessi
       sovrapposti, con nitidezza diversa, a dire che c'e' uno strato. */
    clearcoat: zero.trasparente,
    clearcoatRoughness: zero.ruviditaTrasparente,
    envMapIntensity: 1.55,
  })
  m.color.setRGB(zero.tinta[0], zero.tinta[1], zero.tinta[2])
  const col = sua('/texture/auto2r_col.webp')
  col.colorSpace = SRGBColorSpace
  m.map = col
  /* LA ORM RICOSTRUITA — vedi `strumenti/orm_nuova.mjs` e il §0 di
     `docs/PIANO_FOTOREALISMO.md`. La vecchia mappa faceva campionare al 66%
     dell'area (e al 74,8% delle superfici rivolte in alto) una ruvidita' sotto
     0,25: `0,30 x 0,004 = 0,001`, cioe' uno SPECCHIO. Il commento qui sotto
     diceva «0,32 per la mappa fa 0,26» e descriveva un'intenzione che il file
     non soddisfaceva.
     Quella vecchia resta su disco come `auto2r_orm.webp`, non e' stata
     sovrascritta: si torna indietro cambiando una riga. */
  const orm = sua('/texture/auto2r_orm2.webp')
  m.roughnessMap = orm
  m.metalnessMap = orm
  m.normalMap = sua('/texture/auto2r_nor.webp')
  m.normalScale.set(0.7, 0.7)
  const emi = sua('/texture/auto2r_emi.webp')
  emi.colorSpace = SRGBColorSpace
  m.emissiveMap = emi
  m.emissive.setRGB(1, 1, 1)
  /* SEI E NON UNO. La mappa di emissione e' quasi tutta nera — le luci sono
     poche centinaia di pixel su quattro milioni — quindi il valore alto non
     illumina niente che non debba: accende soltanto l'anello, la lama e la
     barra in coda, che sono le sole cose che questa vettura EMETTE. */
  /* DUE E QUATTRO, ED ERANO SEI. La lama correva lungo tutta la fiancata come
     un tubo al neon a luminosita' uniforme: cosi' forte da diventare l'unica
     cosa che si vedeva, e da appiattire il volume che aveva dietro. Un filo di
     luce su un'automobile non e' una sorgente che si guarda, e' un SEGNO — e
     un segno che brucia smette di disegnare. */
  m.emissiveIntensity = 2.4

  /**
   * LA MICRO-RUVIDITA' — la leva che la ricetta del fotorealismo mette per
   * prima, e l'unica di quella lista che questa carrozzeria non aveva.
   *
   * IL DIFETTO. «Riflessi un po' CG», «superfici troppo uniformi», «il
   * materiale non risponde alla luce»: tre giudizi esterni diversi che
   * indicano la stessa cosa. La mappa ORM che esce dal generatore e' larga e
   * morbida — descrive DOVE la vernice e' piu' opaca, non la grana della
   * vernice — quindi su tutta una fiancata la ruvidita' effettiva e'
   * praticamente una costante. E una superficie a ruvidita' costante non
   * esiste in natura: e' proprio quello che l'occhio riconosce come sintetico,
   * prima ancora di saper dire perche'.
   *
   * PERCHE' SI VEDE ANCHE SE E' PICCOLA. La ruvidita' non decide quanto un
   * riflesso e' luminoso: decide quanto e' LARGO. Una variazione del quindici
   * per cento non schiarisce niente e non scurisce niente, ma fa respirare il
   * bordo dei riflessi lunghi — e su una carrozzeria i riflessi lunghi sono
   * l'unica cosa che racconta la forma, perche' texture non ce n'e'.
   *
   * PERCHE' NON E' UNA TEXTURE. Sarebbe stato un file in piu' da scaricare su
   * un percorso critico che e' gia' il collo di bottiglia misurato — l'auto
   * arriva per ultima perche' trentaquattro file le mangiano la banda. Un
   * rumore calcolato nello shader costa una manciata di istruzioni per pixel e
   * zero byte di rete, e per una grana che non ha nessun disegno da conservare
   * e' esattamente lo stesso risultato.
   *
   * E SI AGGANCIA ALLE UV, non alla posizione nel mondo ne' alla vista. Alle
   * UV la grana resta INCOLLATA alla lamiera mentre la vettura gira; agganciata
   * alla vista brulicherebbe, ed e' il difetto che tradisce subito un rumore
   * aggiunto in fase di composizione invece che una proprieta' della superficie.
   */
  /* L'INTERVALLO DI QUOTA DELLA CARROZZERIA, in metri del mondo. Lo scrive
     `vestiAuto` misurando la scatola d'ingombro vera: scriverlo a mano qui
     vorrebbe dire che al prossimo modello i vetri finiscono sul cofano, e
     nessuno se ne accorgerebbe. Vedi `metriche-vanno-verificate`. */
  m.userData.quote = { min: 0, max: 1 }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uYmin = { value: m.userData.quote.min }
    shader.uniforms.uYmax = { value: m.userData.quote.max }
    // si conserva per poter aggiornare le quote se il modello cambia dopo
    // la prima compilazione
    m.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying float vAltCar;
uniform float uYmin;
uniform float uYmax;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  // la quota nel MONDO, normalizzata sull'altezza della vettura: 0 il fondo,
  // 1 il punto piu' alto del tetto
  vAltCar = clamp(
    ( ( modelMatrix * vec4( transformed, 1.0 ) ).y - uYmin )
      / max( 0.0001, uYmax - uYmin ), 0.0, 1.0 );`)
    shader.fragmentShader = ('varying float vAltCar;' + String.fromCharCode(10) + shader.fragmentShader)
      .replace('#include <common>', `#include <common>
/**
 * IL VETRO FUME' — trovato nella mappa, non aggiunto come geometria.
 *
 * IL DIFETTO. Il committente: «all'auto mancano i vetri, metti vetri scuri
 * cosi' non si vede dentro». Ed e' esatto: questa vettura non ha vetri. Il
 * modello e' UNA mesh sola da 65.333 vertici e «vestiAuto» le da' un materiale
 * solo, quindi il canopy e' carrozzeria — dipinto scuro nella mappa di colore,
 * ma con la stessa fisica della lamiera. Un vetro che si comporta come lamiera
 * si legge come una macchia di vernice nera, ed e' precisamente cosi' che si
 * vedeva.
 *
 * PERCHE' NON SI TAGLIA LA MESH. Dividerla per dare due materiali e' gia'
 * stato provato su questo progetto e ha distrutto le fughe fra i pannelli —
 * dimostrato con due provini affiancati. E il modello serve intero anche
 * altrove: il sottoscocca legge i suoi vertici, l'ottica ci si innesta.
 *
 * COME SI TROVA IL CANOPY SENZA TAGLIARE NIENTE. Due condizioni insieme, e
 * nessuna delle due basta da sola:
 *
 *   E' MOLTO SCURO NELLA MAPPA. Misurato l'istogramma di «auto2_col.webp»: il
 *   4,5% dei pixel sta sotto 31 su 255, e fra 32 e 95 c'e' soltanto lo 0,8%.
 *   C'e' una valle vera, quindi una soglia li' in mezzo separa senza sfrangiare.
 *
 *   GUARDA IN ALTO. Perche' scuro nella mappa lo sono anche il sottoscocca e le
 *   gomme dentro le carene — e quelli guardano in BASSO. La normale li
 *   distingue senza ambiguita', e costa un prodotto scalare.
 *
 * E COSA CAMBIA. Non il colore: la FISICA. Metallicita' a zero, perche' un
 * vetro e' un dielettrico e non tinge cio' che riflette; ruvidita' quasi nulla,
 * perche' un vetro riflette nitido; e la tinta scende a quasi nero, che e'
 * quello che fa un vetro fume' guardato da fuori — non si vede dentro, si vede
 * il cielo. Il risultato e' che il canopy smette di essere una macchia e
 * diventa la cosa piu' riflettente della vettura, come su un'automobile vera.
 */
/* LA SOGLIA SUL COLORE E' MORTA, E VA CAPITO PERCHE' PRIMA DI RIMPIAZZARLA.
   Era tarata sulla valle dell'istogramma di «auto2_col.webp»: 4,5% dei pixel
   sotto 31 e appena lo 0,8% fra 32 e 95, quindi una soglia in mezzo separava
   pulito. Quella valle apparteneva alla mappa PRE-REMESH. Su «auto2r_col.webp»
   i texel effettivamente mappati hanno mediana 0,99: la mappa e' bianca, la
   valle non esiste piu', e «diffuseColor» a quel punto vale colore x mappa —
   cioe' SOLO LA TINTA. La maschera quindi non misurava piu' il canopy:
   misurava quanto e' scura la vernice scelta. Con la tinta dielettrica
   (luma 0,015) si accendeva al 77% ovunque la superficie guardasse in alto,
   verniciando a vetro fume' un terzo della vettura.
   E' il difetto di famiglia gia' descritto al §12 del documento: un numero
   corretto rispetto a uno stato del progetto che non esiste piu'.

   LA CHIAVE NUOVA E' LA QUOTA, e non e' una scelta: e' misurata. Con
   «strumenti/zone.mjs» la semilarghezza della vettura crolla da 0,373 a
   0,246 m fra 0,64 e 0,72 m di altezza (74% -> 49% del massimo): quella e' la
   linea di cintura, il punto in cui il vetro rientra rispetto alla spalla.
   Normalizzata sull'altezza vera del corpo fa 0,67-0,75.
   Un vantaggio che la vecchia chiave non aveva: la quota non dipende dalla
   finitura scelta. Cambiare vernice non puo' piu' spostare i vetri. */
const float VETRO_CINTURA_DA = 0.66;
const float VETRO_CINTURA_A  = 0.78;
/** quanto deve guardare in alto per essere canopy e non sottoscocca */
const float VETRO_SU_DA = 0.16;
const float VETRO_SU_A  = 0.44;
/** la tinta di un fume' visto da fuori: quasi nero, appena freddo */
const vec3 VETRO_TINTA = vec3( 0.0040, 0.0048, 0.0068 );
// un rumore di valore, interpolato morbido: quello a gradini si vede a scacchi
float granoHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 );
}
float grano( vec2 g ) {
  vec2 i = floor( g );
  vec2 f = fract( g );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( granoHash( i ), granoHash( i + vec2( 1.0, 0.0 ) ), f.x ),
    mix( granoHash( i + vec2( 0.0, 1.0 ) ), granoHash( i + vec2( 1.0, 1.0 ) ), f.x ),
    f.y );
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
  float vetro = smoothstep( VETRO_CINTURA_DA, VETRO_CINTURA_A, vAltCar )
              * smoothstep( VETRO_SU_DA, VETRO_SU_A, normalize( vNormal ).y );
  diffuseColor.rgb = mix( diffuseColor.rgb, VETRO_TINTA, vetro );`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  // il vetro e' liscio: la ruvidita' della lamiera qui non c'entra
  roughnessFactor = mix( roughnessFactor, 0.040, vetro );
{
  /* DUE FREQUENZE E NON UNA. Una sola grana fine si perde nel filtraggio
     appena l'automobile e' lontana e resta solo nel primo piano; una sola
     grande legge come una macchia. Sommandole, da vicino si vede la
     buccia d'arancia e da lontano resta una modulazione larga — che e' come
     si comporta una vernice vera a due distanze diverse. */
  /* TRE OTTAVE, NON DUE — e la terza e' quella che mancava.
     C'erano 420 e 61 cicli. Su questo atlante un ciclo vale ~6,6 m di
     superficie, quindi erano la banda da 1,6 cm e quella da 11 cm: la
     struttura del trasparente e la velatura. Mancava la piu' larga, le
     MACCHIE DI VERNICIATURA da 25-40 cm, che e' quella che si vede per prima
     su una carena continua — perche' una carena non ha nervature che rompano
     il riflesso, e allora l'unica cosa che puo' romperlo e' questa.
     LE AMPIEZZE DECRESCONO con la frequenza: +-0,15 / +-0,10 / +-0,06 in
     moltiplicativo, che su una ruvidita' di 0,26 fanno +-0,039 / +-0,026 /
     +-0,016. Sono piccole APPOSTA: il punto non e' vedere la variazione — a
     +-0,10 assoluti esce un'automobile sporca, non una lucida — ma che il
     riflesso smetta di essere matematicamente uniforme. Una superficie a
     ruvidita' costante non esiste in natura, ed e' il segno piu' riconoscibile
     della computer grafica prima ancora della geometria troppo perfetta.
     Perche' nello shader e non cotte nella mappa: cuocerle voleva dire
     passare la ORM a webp senza perdita, da 236 a 730 kB su un percorso
     critico gia' da 2,2 MB — per una struttura che qui costa zero byte. */
  float gA = grano( vRoughnessMapUv *  22.0 ) - 0.5;   // ~30 cm  macchie
  float gB = grano( vRoughnessMapUv *  61.0 ) - 0.5;   // ~11 cm  velatura
  float gC = grano( vRoughnessMapUv * 420.0 ) - 0.5;   // ~1,6 cm trasparente
  float g = gA * 0.30 + gB * 0.20 + gC * 0.12;
  // la buccia d'arancia e' della vernice, non del vetro: sul canopy si spegne
  roughnessFactor = clamp( roughnessFactor * ( 1.0 + mix( g, 0.0, vetro ) ), 0.012, 1.0 );
}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
  // un vetro e' un DIELETTRICO: non tinge cio' che riflette, e con la
  // metallicita' della lamiera restituirebbe un riflesso grigio-metallo
  metalnessFactor = mix( metalnessFactor, 0.0, vetro );`)
  }
  // uno shader modificato vuole una chiave sua, se no three riusa il programma
  // gia' compilato di un MeshPhysicalMaterial qualunque
  /* LA BUCCIA D'ARANCIA SUL TRASPARENTE — mancava proprio dove serve.
     `vernice()` ce l'ha, `scocca()` no, e la scocca e' cio' che veste AUTO:
     quindi in produzione il trasparente a 0,028 era uno SPECCHIO IDEALE,
     posato su una mesh che `fairness.mjs` misura a 0,341 mm di residuo. Uno
     specchio ideale non perdona niente: ogni increspatura rimasta veniva
     mostrata in pieno, ed e' una delle ragioni per cui la fiancata leggeva a
     macchie invece che a righe.
     RIPETIZIONE 300, NON 5. In `vernice()` sta a 5, ed e' sbagliato di due
     ordini di grandezza da quando le UV sono a scala piena: su una vettura di
     4,4 m ogni cella della buccia misurerebbe quasi un metro — non e' buccia
     d'arancia, e' ondulazione di lamiera, cioe' esattamente il difetto tolto
     dalla geometria. La banda giusta e' quella BYK Wd/We, fra 1 e 10 mm.
     E VA SOLO SUL TRASPARENTE. E' l'ondulazione della vernice di finitura,
     non della lamiera: in three il clearcoat senza mappa usa la normale
     geometrica, ed e' proprio quella separazione che serve. */
  m.clearcoatNormalMap = micro('/texture/buccia_nor.webp', 300)
  m.clearcoatNormalScale = new Vector2(0.10, 0.10)

  m.customProgramCacheKey = () => 'scocca'

  m.name = 'SCOCCA'
  return m
}

/** cromo e alluminio lucidato: quasi specchio */
export function cromo(ruvido = 0.24) {
  // 0,24 DI RUVIDITA' E NON 0,06, e nessun cromo a specchio sull'auto.
  //
  // A 0,06 gli specchietti retrovisori catturavano una gola di luce della
  // corte e diventavano due macchie bianche piu' luminose dei fari. Su una
  // vettura di questo tipo, poi, gli specchietti non sono cromati: sono in
  // carbonio o in tinta. Il cromo lucido su un'auto contemporanea non esiste
  // quasi piu' — e' un segnale di anni Novanta, non di lusso.
  // METALNESS 0,86 E NON 1, ed e' il dado centrale della ruota a chiederlo.
  //
  // Oggi questa funzione veste un pezzo solo: l'attacco centrale monodado
  // (`RUOTA_MOZZO` in `scene/Ruote.ts`), dado esagonale, sei perni e la
  // freccia del verso di svitamento. Misurato con il metodo della pinza — uno
  // scatto normale, uno con il solo materiale CROMO in emissione verde per
  // sapere quali pixel sono suoi — nel beat `lato`: 11109 pixel, e il
  // SESSANTASETTE per cento sotto 12 su 255, con mediana 1,9. La corona
  // esterna, che e' bombata, prende un riflesso caldo e si legge benissimo; la
  // faccia dell'esagono, che e' PIANA E PERPENDICOLARE ALL'ASSE, e' nera.
  //
  // Non e' un difetto della geometria, ed e' il punto: un metallo puro non ha
  // diffusione, restituisce solo cio' che sta nella direzione dello specchio.
  // Con la camera sull'asse, la direzione dello specchio di una faccia
  // perpendicolare all'asse punta DIETRO LA CAMERA, dove in questa scena non
  // c'e' niente. Nessuna quantita' di luce laterale puo' raggiungerla, e
  // infatti tutte le luci qui sono laterali.
  //
  // Un dado di fissaggio pero' non e' un metallo puro: e' alluminio o titanio
  // ANODIZZATO, cioe' un ossido dielettrico sottile steso sopra il metallo. Nel
  // modello metallico-ruvidita' quello strato si scrive esattamente cosi', con
  // una metallicita' appena sotto uno — e la frazione che resta (il quattordici
  // per cento) e' una componente diffusa che raccoglie l'irradianza da TUTTE le
  // direzioni, non da una sola. E' l'unica strada per cui una faccia
  // perpendicolare all'asse possa smettere di essere nera senza inventare una
  // sorgente che nella corte non esiste.
  //
  // Il colore sale con lei, da 0,42 a 0,50: sotto la metallicita' piena il
  // colore era solo la riflettanza speculare, adesso comanda anche la
  // diffusione, e un alluminio lavorato riflette in diffusione molto piu' di un
  // cromo scuro. Resta comunque lontano dallo 0,91 dell'alluminio nudo, perche'
  // qui e' brunito e non lucidato.
  //
  // MISURATO DOPO, sugli stessi 11105 pixel: la mediana passa da 1,9 a 8,2 e i
  // quasi neri dal 67,3 al 63,2 per cento. Non e' molto, ed e' giusto che non
  // lo sia — il dado non deve accendersi, deve smettere di essere un buco. Nel
  // provino si legge la freccia del verso di svitamento, che prima non
  // esisteva. E il massimo sale solo da 69 a 74: la corona bombata, che era
  // gia' la parte piu' chiara della ruota, non e' scoppiata.
  const m = new MeshStandardMaterial({ metalness: 0.86, roughness: ruvido, envMapIntensity: 0.7 })
  m.color.setRGB(0.50, 0.49, 0.475)
  m.name = 'CROMO'
  return m
}

/**
 * DIVIDERE LA RUOTA IN GOMMA E CERCHIO, senza rigenerarla.
 *
 * Il generatore restituisce la ruota come un pezzo solo, ed e' il caso in
 * cui la geometria contiene gia' l'informazione che serve: la gomma sta
 * FUORI, il cerchio sta DENTRO. Basta guardare la distanza dall'asse.
 *
 * 0,72 non e' una soglia scelta a occhio: e' il rapporto vero fra il
 * diametro del cerchio e il diametro esterno su una gomma ribassata da
 * hypercar (un 275/35 R20 fa 508 su 700, cioe' 0,726). Con quel numero il
 * taglio cade esattamente sul tallone, dove cade anche nella realta'.
 *
 * SI RIORDINA L'INDICE invece di duplicare la geometria: due gruppi
 * contigui sullo stesso buffer, due materiali. Costa una passata sull'array
 * e non aggiunge un solo vertice.
 */
export function dividiRuota(mesh: Mesh, materialeGomma: Material, materialeCerchio: Material) {
  const g = mesh.geometry as BufferGeometry
  const pos = g.getAttribute('position')
  const idx = g.getIndex()
  if (!idx) return

  g.computeBoundingBox()
  const centro = new Vector3()
  g.boundingBox!.getCenter(centro)
  const misura = new Vector3()
  g.boundingBox!.getSize(misura)

  // L'ASSE DELLA RUOTA E' IL LATO CORTO della sua scatola: un disco e' largo
  // e alto uguale e sottile in una sola direzione. Si trova misurando invece
  // di assumere che sia X — e infatti dipende da come e' orientato il
  // modello, che cambia a ogni rigenerazione.
  const asse = misura.x < misura.y && misura.x < misura.z ? 0 : misura.y < misura.z ? 1 : 2
  const a = [0, 1, 2].filter((i) => i !== asse)
  const raggioMax = Math.max(misura.getComponent(a[0]), misura.getComponent(a[1])) / 2
  const soglia = raggioMax * 0.72

  const v = new Vector3()
  const raggio = (i: number) => {
    v.fromBufferAttribute(pos as BufferAttribute, i)
    const d0 = v.getComponent(a[0]) - centro.getComponent(a[0])
    const d1 = v.getComponent(a[1]) - centro.getComponent(a[1])
    return Math.hypot(d0, d1)
  }

  const arr = idx.array
  const fuori: number[] = []
  const dentro: number[] = []
  for (let t = 0; t < arr.length; t += 3) {
    // si guarda il raggio MASSIMO del triangolo: un triangolo a cavallo del
    // tallone appartiene alla gomma, perche' e' la gomma a fasciare il
    // cerchio e non il contrario
    const r = Math.max(raggio(arr[t]), raggio(arr[t + 1]), raggio(arr[t + 2]))
    const dove = r > soglia ? fuori : dentro
    dove.push(arr[t], arr[t + 1], arr[t + 2])
  }
  if (!fuori.length || !dentro.length) return

  const nuovo = new (arr.constructor as any)(arr.length)
  nuovo.set(fuori, 0)
  nuovo.set(dentro, fuori.length)
  g.setIndex(new BufferAttribute(nuovo, 1))
  g.clearGroups()
  g.addGroup(0, fuori.length, 0)
  g.addGroup(fuori.length, dentro.length, 1)
  mesh.material = [materialeGomma, materialeCerchio]
}

/**
 * L'ASSEGNAZIONE: ogni nome di parte al suo materiale.
 *
 * I nomi li ha scritti `strumenti/scomponi.mjs` riconoscendo le parti dalla
 * loro posizione. Qui non si indovina niente — e se domani il generatore
 * restituisce una parte in piu', arriva col nome `PEZZO_xx` e prende la
 * vernice, che e' il ripiego giusto: un pezzo di carrozzeria non
 * riconosciuto e' quasi sempre carrozzeria.
 */
/**
 * LE FINITURE — l'unica cosa di questo sito che un video non potrebbe fare.
 *
 * PERCHE' ESISTE QUESTO ELENCO.
 *
 * Un'obiezione che a un portfolio di questo tipo si fa sempre, ed e' giusta:
 * «tutto quello che ho visto poteva essere un filmato con lo scorrimento
 * agganciato». E' vero per la camera, per la rotazione, per l'attraversamento
 * del faro — tutte cose bellissime che si possono registrare una volta e
 * riprodurre.
 *
 * Cio' che un filmato non puo' fare e' RISPONDERE. Cambiare la vernice di
 * un'automobile e vederla rispecchiare la stessa villa con una superficie
 * diversa non e' un fotogramma in piu' da scaricare: e' un calcolo che avviene
 * mentre si guarda. E' la prova, e ne basta una.
 *
 * NON SONO QUATTRO COLORI: SONO QUATTRO MATERIALI.
 *
 * Un selettore che cambia solo la tinta dimostra poco — si fa con un filtro su
 * una fotografia. Qui cambiano insieme colore, ruvidita' e trasparente, cioe'
 * il MODO in cui la superficie tratta la luce: il nero satinato sfoca il
 * riflesso, la perla lo apre, il carbonio lo spezza. Guardando la villa
 * riflessa sulla fiancata si vede che e' un'altra superficie, non un'altra
 * tinta.
 *
 * I VALORI SONO IN LUCE LINEARE, non in esadecimale da editor grafico. Una
 * vernice nera vera sta intorno a 0,012: sembra assurdamente scuro finche' non
 * si ricorda che quasi tutto quello che se ne vede e' riflesso, non colore.
 */
export type Finitura = {
  nome: string
  /** il colore da mostrare nel selettore, in esadecimale */
  campione: string
  tinta: [number, number, number]
  ruvidita: number
  trasparente: number
  ruviditaTrasparente: number
  /**
   * QUANTO E' METALLO — e prima non c'era, perche' prima erano tutte VERNICI.
   *
   * Una vernice metallizzata ha `metalness` zero: la scaglia sta sospesa in un
   * legante trasparente, ed e' il legante — un dielettrico — a prendere il
   * grosso della luce. Ma l'automobile nuova non e' verniciata: e' alluminio
   * SPAZZOLATO a vista, e un metallo nudo si comporta all'opposto — non ha
   * diffusione, restituisce solo cio' che specchia, e il suo colore tinge il
   * riflesso invece di stare sotto.
   * Da qui il campo: la finitura puo' scegliere di essere una vernice o un
   * metallo, e non e' un'interpolazione fra le due — sono due fisiche diverse.
   */
  metallo?: number
}

export const FINITURE: Finitura[] = [
  {
    /* GRAFITE SPAZZOLATO — il vestito naturale di questa carrozzeria.
       L'automobile nuova nasce da un disegno di alluminio nudo, non di lamiera
       verniciata, e per due giri e' stata nera perche' quella era la prima
       finitura dell'elenco: una vettura che il committente ha visto e
       giudicato «lontana dal realismo», con ragione — un metallo trattato come
       vernice nera perde tutto quello che lo fa leggere metallo.
       `metallo` alto e tinta chiara: un metallo non ha colore proprio sotto la
       luce, ha un colore con cui TINGE cio' che riflette. Il grigio caldo qui
       sotto e' l'alluminio: appena piu' rosso nel canale basso, che e' quello
       che distingue l'alluminio dall'acciaio. */
    nome: 'NERO LIQUIDO',
    campione: '#8d9095',
    /* QUASI UNO, E NON MEZZO — perche' adesso sotto c'e' una MAPPA.
       Con una carrozzeria senza texture la tinta ERA il colore, e 0,52 dava un
       grigio giusto. Da quando la scocca porta la sua mappa di colore, three
       moltiplica le due cose: 0,52 per una mappa che ha mediana 0,21 in
       lineare fa 0,11, cioe' quasi nero — ed e' esattamente la vettura scura
       che si vedeva nel provino.
       La tinta torna a fare il mestiere per cui esiste in un configuratore:
       non decidere il colore, ma SPOSTARLO. Il livello lo porta la mappa. */
    /* SCURA E LUCIDA, come la vettura del riferimento.
       Era 0,96/0,97/0,99 — quasi bianca — e con metallo 0,92 dava una lamiera
       chiara che di notte legge argento. La vettura di riferimento e' NERA e
       lucida: il nero non lo fa il colore da solo, lo fa il colore scuro SOTTO
       un trasparente che specchia. Il metallo scende perche' un metallo puro
       nero non ha nulla da restituire se non lo specchio; sotto un clearcoat
       nitido la tinta scura diventa profondita' invece che buio. */
    /* GUNMETAL BLU, NON NERO — e' il rilievo del revisore: «la parte centrale
       della carrozzeria e' quasi nera, e spariscono curvature, volumi,
       spigoli». Su un oggetto da portfolio deve valere il contrario: la luce
       deve SPIEGARE la geometria. Il blu resta molto scuro ma smette di essere
       un buco: un metallo scuro con una punta di blu restituisce abbastanza da
       far leggere le superfici. */
    /* DIELETTRICA, E QUESTA E' LA CORREZIONE PIU' IMPORTANTE DEL FILE.
       Era metallo 0,85 con una tinta gunmetal blu, e l'ho messa io stamattina
       seguendo una revisione che chiedeva «Metallic 0.8-1». E' sbagliato, e la
       ragione e' fisica, non di gusto:

         UN METALLO TINGE IL RIFLESSO SPECULARE COL PROPRIO COLORE.
         UN DIELETTRICO LO RESTITUISCE BIANCO.

       Con metallicita' effettiva 0,83 (0,85 per il canale blu della ORM, che
       misurato sui texel mappati sta a 0,973) ogni sorgente ambra della corte
       — le gole dell'architrave, il PANNELLO_TAGLIO a 0xffc98a, le vetrate
       della villa — arrivava sulla lamiera e usciva moltiplicata per un blu.
       Non era l'ambiente a essere freddo: era la carrozzeria a ricolorare di
       blu tutto cio' che rifletteva, compreso il caldo. E nessuna quantita' di
       grading ambra puo' raddrizzarlo, perche' il colore lo decide il
       materiale prima che la luce arrivi al tone mapping.
       Spiega anche i cerchi azzurrati che §9 del documento attribuiva
       all'ambiente: stessa fisica, stessa causa.

       Una vernice nera vera e' un DIELETTRICO: base quasi nera (3-4% di
       riflettanza diffusa), scaglie metalliche SOSPESE in un legante, e sopra
       un trasparente. Non e' un blocco di alluminio verniciato. */
    tinta: [0.014, 0.014, 0.017],
    /* QUASI METALLO PIENO, e la ragione e' la ruvidita' qui sotto.
       Di notte un metallo puro e' NERO: restituisce solo cio' che specchia, e
       se non ha niente da specchiare non ha niente da restituire. Era il
       motivo per cui l'avevo tenuto a 0,55, e in una vettura che usciva verde
       petrolio sembrava una cura. Non lo era: il metallo era nero perche' a
       0,80 di ruvidita' effettiva non specchiava niente NEMMENO il cromo. Con
       0,26 la villa illuminata gli finisce addosso, e quella si vede. */
    /* RISALITO A 0,85: il revisore chiede metallico 0,8-1. Era sceso a 0,30
       quando la tinta era quasi nera, perche' un metallo puro nero non ha
       niente da restituire. Con una tinta gunmetal il metallo torna a fare il
       suo mestiere — e la scaglia sotto il trasparente e' cio' che distingue
       una vernice metallizzata da una plastica colorata. */
    /* 0,06 E NON 0,85: la scaglia sta sospesa nel legante, non e' la
       superficie. Questo lascia il Fresnel bianco a fare il suo mestiere —
       ed e' il Fresnel a disegnare la forma di notte, proprio dove la base
       scura non restituisce niente. */
    metallo: 0.06,
    /* TRENTADUE, ED ERA UNO — l'errore che ha fatto sembrare l'automobile di
       creta per due giri interi.
       Avevo scritto 1,0 credendo fosse il valore neutro «decida la mappa». Non
       lo e': three MOLTIPLICA lo scalare per la mappa, e la mappa ha mediana
       0,80. La ruvidita' effettiva era 0,80, cioe' argilla — e una revisione
       esterna ha scritto «legge come un modello di studio in clay», con
       ragione sul sintomo. 0,32 per 0,80 fa 0,26, che e' la ruvidita' di una
       carrozzeria vera. */
    ruvidita: 0.30,
    /* IL TRASPARENTE E' L'ALTRA META' DI CIO' CHE FA LEGGERE «LAMIERA».
       Un metallo nudo restituisce un riflesso solo, della propria tinta; una
       carrozzeria ne restituisce due — quello colorato del metallo sotto e
       quello BIANCO del trasparente sopra — e sono i due riflessi
       sovrapposti, con nitidezza diversa, a dire che c'e' uno strato. */
    /* 0,88 E NON 0,62 — LA SEQUENZA ACCOPPIATA, seconda mossa.
       La skill del fotorealismo WebGL lo mette in tre passi legati: prima si
       raddrizzano le normali, poi si puo' alzare lo specchio, solo allora le
       strisce disegnano una riga vera invece di una macchia. Il primo passo
       e' fatto stanotte — la carrozzeria levigata con Taubin, 95esimo
       percentile della curvatura da 194,3 a 162,1 rad/m, misurato contro una
       sfera di raggio noto (vedi «scene/Sottoscocca.ts» e la memoria
       `metriche-vanno-verificate`).
       Con lo specchio piu' netto (0,88/0,045, contro 0,62/0,09 di prima) si
       rischiava di scoprire le increspature che restano: confrontato lo
       stesso fianco negli stessi due valori (`docs/provini/ab_clearcoat2.jpeg`)
       e il risultato e' pulito — le fughe di lamiera piu' definite, nessuna
       nuova ondulazione rivelata. La carrozzeria non e' ancora perfettamente
       liscia (il 95esimo percentile resta sopra il riferimento di una
       fiancata vera), ma regge uno specchio piu' netto di prima. */
    trasparente: 1.0,
    ruviditaTrasparente: 0.028,
  },
  /* LE QUATTRO TINTE QUI SOTTO SONO DIVISE PER LA MAPPA, e senza quella
     divisione il configuratore mostrava quattro sfumature di nero.
     Misurata sui pixel della carrozzeria (scartando lo sfondo dell'atlante),
     «auto2_col.webp» ha mediana lineare R 0,584 G 0,558 B 0,651. three
     moltiplica: una tinta 0,012 pensata come «il livello finale» diventava
     0,007, cioe' carbone, e il bianco perla usciva grigio scuro.
     Quindi la tinta non e' piu' il livello: e' il livello DIVISO la mediana
     del canale. Sopra l'uno non e' un errore — e' un moltiplicatore, e serve
     proprio a schiarire una mappa che nasce a meta' strada. Il vantaggio di
     moltiplicare invece di sostituire e' che le fughe, lo sporco e i segni
     dipinti nella mappa restano visibili sotto OGNI colore: se il colore
     cancellasse la mappa, ogni finitura diversa dalla prima tornerebbe a
     essere una carrozzeria liscia. */
  {
    nome: 'NERO SATINATO',
    campione: '#15171c',
    tinta: [0.077, 0.082, 0.080],
    metallo: 0.0,
    ruvidita: 0.48,
    trasparente: 0.70,
    ruviditaTrasparente: 0.15,
  },
  {
    // la perla non e' bianca: e' un grigio chiarissimo con il trasparente quasi
    // a specchio. Una perla dipinta di bianco pieno perde il modellato e legge
    // come plastica.
    nome: 'BIANCO PERLA',
    campione: '#e6e3dc',
    tinta: [1.06, 1.07, 0.86],
    ruvidita: 0.30,
    trasparente: 0.92,
    ruviditaTrasparente: 0.06,
  },
  {
    // l'arancione e' l'unico dove la tinta conta piu' del riflesso: un colore
    // saturo su una superficie curva costruisce il volume da solo
    nome: 'ARANCIO',
    campione: '#c8551a',
    tinta: [0.72, 0.16, 0.023],
    ruvidita: 0.38,
    trasparente: 0.85,
    ruviditaTrasparente: 0.10,
  },
  {
    // il carbonio a vista non e' una vernice: e' una trama sotto un trasparente
    // spesso. Ruvidita' bassissima e tinta quasi nera, ed e' il riflesso lungo
    // e nitido a raccontarlo.
    nome: 'CARBONIO',
    campione: '#23262b',
    tinta: [0.031, 0.034, 0.034],
    ruvidita: 0.14,
    trasparente: 1.0,
    ruviditaTrasparente: 0.03,
  },
]

/**
 * IL MATERIALE DELLA CARROZZERIA, tenuto da parte per poterlo cambiare.
 *
 * Uno solo per tutta la vettura: e' gia' cosi' che «vestiAuto» lo assegna, e
 * quindi cambiarne i parametri cambia ogni pannello nello stesso istante senza
 * dover ricorrere a nessuna lista.
 */
let verniceViva: MeshPhysicalMaterial | null = null

/** applica una finitura. Il numero e' l'indice dentro `FINITURE`. */
export function applicaFinitura(quale: number) {
  const f = FINITURE[Math.min(Math.max(quale, 0), FINITURE.length - 1)]
  const m = verniceViva
  if (!m || !f) return
  m.color.setRGB(f.tinta[0], f.tinta[1], f.tinta[2])
  // il metallo e' un uniform come gli altri: si cambia senza ricompilare
  m.metalness = f.metallo ?? 0
  m.roughness = f.ruvidita
  m.clearcoat = f.trasparente
  m.clearcoatRoughness = f.ruviditaTrasparente
  // NIENTE `needsUpdate`. Colore, ruvidita' e trasparente sono uniform, non
  // define: cambiarli non ricompila niente. Alzare la bandiera farebbe
  // ricompilare lo shader a ogni clic, con il blocco di qualche decimo che ne
  // consegue — ed e' l'errore che rende «lenti» meta' dei configuratori.
}

export function vestiAuto(radice: Object3D) {
  const M = {
    vernice: vernice(),
    vetro: vetro(),
    carbonio: carbonio(),
    gomma: gomma(),
    cerchio: cerchio(),
    cromo: cromo(),
    /* AZZURRO LASER, e a una forza che nel sito non ha nessun altro.
       E' una richiesta esplicita del committente, e ha una ragione che regge
       da sola: su una carrozzeria di alluminio grigio, sotto un crepuscolo
       cobalto, l'ambra di casa si confonderebbe con i riflessi caldi della
       villa. Un ciano puro no — non esiste da nessun'altra parte nella scena,
       quindi quella riga e' l'unica cosa che la vettura EMETTE.
       Sette e mezzo, contro il due e mezzo del fanale: e' molto sopra la
       soglia del bagliore, ed e' voluto. Una lama lunga tre metri che sfonda
       di poco si legge come una superficie chiara; una che sfonda di molto
       diventa una LUCE, con l'alone intorno. */
    lama: filamento(0.30, 0.86, 1.00, 2.3),
    /* L'ANELLO E' PIU' BIANCO DELLA LAMA E PIU' FORTE DI TUTTO.
       La lama e' un segno grafico, l'anello e' un FARO: illumina, quindi il
       suo bianco non e' ciano puro ma un bianco appena freddo — e' cosi' che
       si distingue una luce di servizio da una di segnalazione, su una vettura
       vera come in questo fotogramma. Undici: e' il valore piu' alto del sito,
       e deve esserlo, perche' quell'anello e' la cosa che si guarda per prima
       e la porta da cui si entra. */
    /* E I TRE VALORI SONO STATI TAGLIATI DI TRE VOLTE dopo il primo provino.
       Undici, sette e mezzo e quattro erano numeri scelti a tavolino sul
       ragionamento «deve sfondare la soglia del bagliore». Sfondavano: nel
       fotogramma l'anello era una palla bianca grande come mezza vettura e la
       lama una saldatura. Un faro non e' una sorgente che si guarda, e' una
       sorgente che ILLUMINA: appena sopra il bianco, con l'alone corto.
       Il conto giusto lo da' il provino, non la teoria del bloom. */
    anello: filamento(0.86, 0.94, 1.00, 3.4),
    ghiera: (() => {
      const g = cromo(0.30)
      /* PIU' CHIARA DI QUANTO SEMBRI GIUSTO. Al primo giro era a 0,085 —
         il valore di un alluminio anodizzato scuro, corretto sulla carta — e
         nel provino era un CERCHIO NERO davanti all'ottica: in una corte
         notturna un metallo scuro non ha niente da specchiare e collassa.
         Una ghiera si legge perche' prende la luce di striscio sui suoi
         spigoli, e per prenderla deve partire piu' alta. */
      g.color.setRGB(0.30, 0.31, 0.33)
      g.envMapIntensity = 1.6
      g.name = 'GHIERA'
      return g
    })(),
    canopy: (() => {
      const v = vetro()
      // 0,985: resta un filo di trasparenza, quel tanto che basta perche' il
      // bordo si legga come uno SPESSORE di vetro e non come un taglio
      v.opacity = 0.985
      v.color.setRGB(0.0026, 0.0034, 0.0052)
      // e specchia di piu' della carrozzeria: e' l'unica superficie della
      // vettura piu' liscia della lamiera, ed e' quel salto a dire «vetro»
      v.roughness = 0.030
      v.envMapIntensity = 1.9
      return v
    })(),
    fondo: (() => {
      const f = vernice()
      f.color.multiplyScalar(0.34)
      f.roughness = Math.min(1, f.roughness * 1.7)
      f.clearcoat *= 0.4
      f.name = 'FONDO'
      return f
    })(),
    /* E LA CODA E' DELLO STESSO AZZURRO, non rossa.
       Il rosso e' la convenzione — un fanale posteriore rosso e' cosi' da
       sempre — ma questa vettura non ha nessun'altra convenzione addosso: non
       ha marchi, non ha maniglie, non ha passaruota. Un rosso normativo in
       mezzo a un oggetto che ha rinunciato a tutte le altre norme si legge
       come una dimenticanza.
       Un filo solo, dello stesso ciano, che gira dal fianco alla coda: e' cosi'
       che l'oggetto si tiene insieme. Piu' basso della lama — quattro contro
       sette e mezzo — perche' la coda non deve rubare il muso. */
    fanale: filamento(0.30, 0.86, 1.00, 2.0),
  }
  const conteggio = new Map<string, number>()

  const laScocca = scocca()
  radice.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    const n = (mesh.name || '').toUpperCase()
    let quale = 'vernice'

    if (n === 'OTTICA_BORDO') {
      /* IL CONTORNO DELL'OTTICA — l'unico pezzo aggiunto a mano alla vettura.
         Non passa dalla scocca perche' non ha le sue UV: e' geometria nuova, e
         le quattro mappe che vestono la carrozzeria sono nate con la forma
         generata. Un pezzo senza UV che le campiona prende colori a caso.
         Prende invece un metallo lavorato scuro: e' una ghiera intorno a una
         lente, non lamiera verniciata, e la differenza di finitura fra i due e'
         proprio cio' che fa leggere «pezzo montato» invece che «rilievo». */
      mesh.material = M.ghiera
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.layers.enable(LIVELLO_SOGGETTO)
      conteggio.set('ghiera', (conteggio.get('ghiera') ?? 0) + 1)
      return
    }

    if (n.startsWith('AUTO')) {
      /* LA VETTURA NUOVA E' UN PEZZO SOLO, e non passa da nessuna delle regole
         qui sotto: quelle dividono per NOME, e qui non c'e' niente da
         dividere. Vedi `scocca()` per il perche' — in due parole, tagliare la
         geometria per assegnare i materiali distruggeva le fughe. */
      mesh.material = laScocca
      /* LE QUOTE DELLA CARROZZERIA, per la maschera del canopy.
         La maschera adesso si chiava sull'ALTEZZA e non sul colore (vedi
         `scocca()`), e un'altezza normalizzata ha bisogno di sapere dove
         comincia e dove finisce il corpo. Si misura qui, sulla mesh vera e
         gia' trasformata: scrivere due numeri a mano nello shader vorrebbe
         dire che al prossimo modello i vetri finiscono sul cofano senza che
         niente dia errore.
         Attenzione a misurare la MESH e non il gruppo: `OTTICA_BORDO` scende
         sotto la carrozzeria, e la scatola del gruppo darebbe un fondo
         sbagliato di quasi trenta centimetri — cioe' la cintura fuori posto
         di un terzo dell'altezza. */
      mesh.updateWorldMatrix(true, false)
      const scatola = new Box3().setFromObject(mesh)
      laScocca.userData.quote = { min: scatola.min.y, max: scatola.max.y }
      const sh = laScocca.userData.shader
      if (sh) {
        sh.uniforms.uYmin.value = scatola.min.y
        sh.uniforms.uYmax.value = scatola.max.y
      }
      console.log('[scocca] quote carrozzeria',
        +scatola.min.y.toFixed(3), '..', +scatola.max.y.toFixed(3),
        '-> cintura a', +(scatola.min.y + (scatola.max.y - scatola.min.y) * 0.72).toFixed(3))
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.layers.enable(LIVELLO_SOGGETTO)
      conteggio.set('scocca', (conteggio.get('scocca') ?? 0) + 1)
      return
    }

    if (n.startsWith('RUOTA')) {
      dividiRuota(mesh, M.gomma, M.cerchio)
      quale = 'ruota'
    } else if (n.startsWith('VETRO') || n === 'PARABREZZA') {
      /* IL CANOPY E' UN VETRO FUME', e la ragione e' che dietro non c'e'
         niente.
         Sulla vettura di prima il vetro poteva essere un vetro: c'era un
         abitacolo modellato dietro, e guardarci dentro mostrava qualcosa.
         Questa e' un guscio vuoto — il generatore ha fatto la calotta e basta
         — quindi un vetro trasparente lascia vedere il PANORAMA attraverso
         l'automobile. E' il difetto che il committente ha visto per primo:
         «mancano i finestrini».
         La cura non e' murarlo. Un canopy scuro di una vettura da concorso e'
         un vetro FUME' vero: di notte, sotto un cielo, specchia molto piu' di
         quanto lasci passare, e cio' che si vede dentro e' un'ombra, non il
         mondo di dietro. Si alza l'opacita' quasi al pieno e si tinge di
         azzurro freddissimo, che e' cio' che fa leggere «vetro» invece che
         «pannello nero». */
      mesh.material = M.canopy
      quale = 'canopy'
    } else if (
      n === 'DIFFUSORE' || n === 'SPLITTER' || n === 'ALA' ||
      n.startsWith('MINIGONNA') || n === 'PRESA'
    ) {
      mesh.material = M.carbonio
      quale = 'carbonio'
    } else if (n.startsWith('SPECCHIO')) {
      // gli specchietti prendono il carbonio come l'ala: e' cosi' su
      // qualunque vettura di questa categoria, ed e' anche l'unico modo
      // perche' smettano di essere due lampadine ai lati del parabrezza
      mesh.material = M.carbonio
      quale = 'carbonio'
    } else if (n === 'LAMA' || n === 'FANALE') {
      /* LA LAMA DI LUCE E IL FANALE — i due pezzi che l'automobile nuova ha e
         la vecchia non aveva.
         Sono FILAMENTI: una riga di luce lunga tre metri sul fianco e una
         barra in coda. Non si illuminano, EMETTONO — e per questo non passano
         da `vernice` ma da un materiale che non ha bisogno di nessuna
         sorgente. E' la stessa scelta del quadro strumenti e dei pannelli del
         carosello, per la stessa ragione: una cosa che emette e che si spegne
         insieme alla notte e' la cosa meno credibile che ci sia.
         L'ambra e non il bianco: e' la tinta di casa, quella della rotaia e
         della spina, e su una carrozzeria scura e' l'unico accento del sito. */
      mesh.material = n === 'LAMA' ? M.lama : M.fanale
      quale = 'luce'
    } else if (n === 'SOTTO') {
      /* IL FONDO NON E' CARBONIO OPACO, E' LA STESSA LAMIERA PIU' SCURA.
         Al primo giro prendeva `carbonio`, per analogia con l'ala e le
         minigonne della vettura di prima. Nel provino il risultato erano
         LACERAZIONI: il confine fra il fondo e la carrozzeria e' stato
         ricavato dal colore cotto nella texture, quindi e' frastagliato di un
         paio di facce, e fra due materiali molto diversi quel bordo seghettato
         diventa uno strappo nero lungo tutta la fiancata.
         Fra due materiali VICINI lo stesso bordo non si vede. E' anche piu'
         vero: su una carrozzeria monoscocca il sottoscocca non e' un pezzo
         riportato, e' la stessa superficie che gira sotto e prende meno luce.
         Si tiene la vernice, scurita e resa piu' opaca — un fondo lucido come
         il fianco non esiste su nessuna automobile. */
      mesh.material = M.fondo
      quale = 'fondo'
    } else if (n.startsWith('FARO')) {
      /* L'ANELLO E' ACCESO, e non e' una scelta estetica: e' l'unica cosa che
         dice DOVE STA IL MUSO.
         Sulla vettura di prima il faro era vetro scuro, e aveva ragione di
         esserlo: era una lente spenta dentro una carrozzeria piena di segni —
         passaruota, prese d'aria, specchietti, ala — e il davanti si capiva
         da quelli. Questa non ha nessuno di quei segni: e' una goccia continua
         con le ruote carenate, e vista di tre quarti il muso e la coda si
         somigliano. Il committente l'ha detto nel modo piu' utile possibile:
         «non capisco dov'e' davanti e dov'e' dietro».
         Un anello acceso lo risolve in un fotogramma, ed e' anche l'unico
         momento in cui questo sito puo' permetterselo: il faro qui e' la
         PORTA — e' da li' che si entra nell'automobile. Una porta spenta non
         si vede. */
      mesh.material = M.anello
      quale = 'anello'
    } else {
      mesh.material = M.vernice
    }

    mesh.castShadow = true
    mesh.receiveShadow = true
    // la vettura e' l'unico oggetto che i pannelli da studio illuminano
    mesh.layers.enable(LIVELLO_SOGGETTO)
    conteggio.set(quale, (conteggio.get(quale) ?? 0) + 1)
  })

  /* IL COMANDO FINITURA PUNTAVA A UN MATERIALE MORTO, e per questo non
     funzionava: il committente ha cliccato i campioni e l'automobile e'
     rimasta grigia.
     Qui c'era `M.vernice`. Ma dal cambio di vettura la carrozzeria indossa
     `laScocca` — un pezzo solo con le sue quattro mappe — e `M.vernice` non
     veste piu' NIENTE. `applicaFinitura` continuava a scrivere colore,
     ruvidita' e trasparente, senza errori e senza effetto: uno strumento
     verde che non tocca niente e' peggio di uno rotto, perche' non si lamenta.
     E' il guasto piu' grave che potesse restare, perche' il configuratore e'
     l'unica cosa di questo sito che un video non saprebbe fare. */
  verniceViva = laScocca
  return conteggio
}
