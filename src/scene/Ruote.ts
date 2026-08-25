import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  RingGeometry,
  Vector3,
} from 'three'

import { ALTEZZA_PIATTAFORMA } from './Piattaforma'
import { costruisciRuota, materialiRuota, LARGHEZZA_RUOTA, RAGGIO_RUOTA } from './RuotaVera'

/**
 * IL SEGNALE DI RUOTA — un accenno di gomma e di rotazione, dentro carenature
 * volute.
 *
 * PERCHE' ESISTE, E PERCHE' NON RIMETTE LE RUOTE. Le gomme nascoste sono una
 * richiesta esplicita del committente, ribadita quando ha chiesto il cambio
 * auto: «piu' futuristico ma con le gomme nascoste». Non e' un difetto da
 * correggere. Ma due revisioni esterne indipendenti, senza parlarsi, hanno
 * isolato lo stesso punto sotto quella scelta: niente dice che sotto la carena
 * c'e' una ruota che tocca terra e gira — e il tachimetro che segna 99 km/h su
 * una carrozzeria che non da' nessun segno di rotazione e' una contraddizione
 * che si vede.
 *
 * LA CURA NON E' UN MODELLO DI RUOTA. Sarebbe il lavoro sbagliato: la carena
 * esiste apposta per non mostrarla, e infilarci dentro un cerchio e una gomma
 * interi vorrebbe dire disegnare qualcosa che la carrozzeria e' fatta apposta
 * per coprire. Basta molto meno — la stessa economia di mezzi della scena
 * intera, dove un anello acceso fa il lavoro di un intero faro.
 *
 * DOVE STANNO LE QUATTRO CARENE NON E' DECISO, E' MISURATO. Si cercano i punti
 * piu' larghi della carrozzeria nella fascia bassa del fianco, divisi in
 * quattro quadranti (avanti/dietro, sinistra/destra): sono esattamente i
 * bulbi delle carene, perche' un bulbo e' per definizione il punto piu' largo
 * lì intorno. Misurato: davanti a x=-1,25 e dietro a x=1,28, con la carreggiata
 * a ±0,89 m — numeri plausibili per una vettura di 4,52 m, e nessuno scritto a
 * mano.
 *
 * DUE COSE, UNA FERMA E UNA CHE GIRA.
 *
 *   IL CONTATTO: una piccola sezione di gomma scura che sporge di pochi
 *   centimetri oltre il bordo della carena, all'altezza del suolo. Non e' un
 *   pneumatico — e' la prova che ce n'e' uno.
 *
 *   LA ROTAZIONE: un anello sottile con un segmento piu' chiaro, che gira
 *   davvero — non un effetto disegnato, una rotazione vera legata alla
 *   velocita' di scorrimento. E' visibile solo dove la carena lo permette,
 *   cioe' appena, ma e' quel poco a dire che sotto qualcosa si muove.
 */

/**
 * RAGGIO DELLA GOMMA — 0,30 e non 0,19, perche' 0,19 non era congruente con
 * l'arco che dovrebbe riempire.
 *
 * IL DIFETTO, MISURATO DUE VOLTE. Il committente ha scritto «le ruote non
 * sono congruenti», e la misura ha dato ragione a lui contro il mio numero:
 * l'apertura della carena, campionata sui pixel del provino e convertita in
 * metri con la scala vera della camera a quella posa (164,9 px/m), e' larga
 * circa 0,88 m. Un pneumatico da 0,19 m di raggio — 0,38 m di diametro —
 * riempie meno di meta' di quell'apertura: nel foro sembrava un sassolino,
 * non una ruota. 0,30 m di raggio (0,60 m di diametro, circa il settanta per
 * cento dell'apertura) e' la misura di un pneumatico vero per un'auto di
 * questa taglia, ed e' quella che riempie l'arco in modo credibile.
 *
 * E C'ERA UN SECONDO DIFETTO, PIU' GRAVE DELLA MISURA: NON SI VEDEVA PROPRIO.
 * Campionato il pixel esatto sotto cui doveva stare il segno (proiettando la
 * sua posizione mondo sullo schermo): colore uniforme, nessuna traccia
 * dell'oggetto. La cavita' della carena non riceve luce da nessun pannello da
 * studio — sono tutti esterni e non possono piegarsi dentro un incavo — quindi
 * una gomma e un cerchio illuminati normalmente diventano NERO SU NERO,
 * indistinguibili dall'ombra della carena stessa. E' lo stesso principio gia'
 * pagato sul cromo della ruota: un metallo (o una plastica scura) senza niente
 * da riflettere e' invisibile, non scuro.
 * La cura e' la stessa del faro: il cerchio non aspetta la luce, la EMETTE.
 */
const RAGGIO_GOMMA = 0.30
/** di quanto sporge oltre il bordo misurato della carena: doveva bastare a
 *  liberarsi dalla sagoma della carrozzeria vista da un'angolazione qualunque,
 *  non solo da quella in cui e' stato controllato l'ultima volta */
const SPORGENZA = 0.12
/** raggio del cerchietto che gira — settanta per cento della gomma, come su
 *  un cerchio vero */
const RAGGIO_CERCHIO = 0.21

export type Arco = { x: number; z: number }

/* PUBBLICA, perche' le stesse quattro posizioni servono anche all'ombra di
   contatto: se le ruote stanno in un posto e le macchie scure in un altro,
   il contatto non lo legge nessuno. Una fonte sola, misurata una volta. */
export function trovaArchi(auto: Object3D, zitto = false): Arco[] {
  /* DOVE STANNO LE RUOTE — RISCRITTO, perche' il criterio vecchio sbagliava e
     si vedeva.
     Cercava «i dodici punti piu' larghi di ogni quadrante» e ne faceva la
     media. Su una carena continua quello non e' il passaruota: e' il punto in
     cui la fiancata gonfia di piu', che sui due lati puo' cadere in posti
     diversi. Misurato sul modello vero: ruota posteriore destra a x -0,883,
     sinistra a x -1,148. VENTISEI CENTIMETRI DI SFASAMENTO SULLO STESSO ASSE.
     Il committente l'ha visto subito — «non sono al posto della carrozzeria
     che dovrebbero essere» — ed era esatto.

     Due cambiamenti.

     PRIMO, il criterio. Questa vettura ha le ruote CARENATE e il fondo chiuso:
     non esiste nessun passaruota aperto da trovare (verificato con
     `strumenti/archi.mjs`: il profilo della quota minima lungo il fianco e'
     una riga piatta). La ruota sta dentro un bauletto, e un bauletto sul
     fianco e' un RIGONFIAMENTO. Quindi si scandisce la lunghezza e si legge la
     SEMILARGHEZZA in una fascia di quota — sopra il fondo, sotto la cintura —
     e i massimi davanti e dietro sono i due assi.

     SECONDO, e conta di piu': SI IMPONE LA SIMMETRIA. Gli assi di
     un'automobile sono perpendicolari alla direzione di marcia, punto. Anche
     se la maglia generata e' un po' storta — e questa lo e' — le due ruote di
     un asse devono stare alla stessa x. Non e' una taratura: e' una legge
     della cosa che sto rappresentando, e va imposta invece che sperata. */
  auto.updateWorldMatrix(true, true)
  const v = new Vector3()
  const punti: Vector3[] = []
  auto.traverse((o) => {
    const m = o as unknown as { isMesh?: boolean; geometry?: BufferGeometry; material?: { name?: string } }
    if (!m.isMesh || !m.geometry || m.material?.name !== 'SCOCCA') return
    const pos = m.geometry.attributes.position as BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      punti.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone())
    }
  })
  if (punti.length < 100) return []

  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const p of punti) {
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y
    if (p.z < z0) z0 = p.z; if (p.z > z1) z1 = p.z
  }
  const L = x1 - x0, H = y1 - y0, cz = (z0 + z1) / 2
  if (!(L > 0) || !(H > 0)) return []

  const N = 86
  /* IL VANO RUOTA SI VEDE SOLO NELLA FASCIA BASSA, e questa e' la chiave che
     mi era sfuggita per due tentativi.
     A meta' altezza e in alto la carrozzeria e' larga DAPPERTUTTO — e' un
     siluro, ha una sezione piena — quindi qualunque cercatore di massimi o di
     minimi la' sopra restituisce un punto qualunque di un altopiano. Vicino
     al SUOLO invece la fiancata si allarga in due punti soli, e solo in quei
     due: sono i bauletti che devono contenere una ruota. Fra loro il corpo si
     strozza, perche' li' non c'e' niente da contenere.
     Misurato con `strumenti/incavi.mjs` sul modello vero:
        bauletto posteriore  x -1,830 .. -0,730   (centro -1,280)
        bauletto anteriore   x  0,920 ..  1,670   (centro  1,295)
        passo 2,575 m = 60% della lunghezza, sbalzi 0,93 e 0,80 m
     Sessanta per cento di passo con quegli sbalzi sono le proporzioni di
     un'automobile vera — che e' anche la conferma che stavolta il segnale e'
     quello giusto: il criterio precedente dava 57% con le due ruote
     posteriori sfasate di ventisei centimetri fra destra e sinistra.
     E il bauletto anteriore e' lungo 0,750 m contro un diametro di ruota di
     0,708: coincide, e una coincidenza del genere non capita per caso. */
  const semi: [number[], number[]] = [new Array(N).fill(0), new Array(N).fill(0)]
  for (const p of punti) {
    const q = (p.y - y0) / H
    // SOLO la fascia bassa: sopra, la sezione piena nasconde i bauletti
    if (q < 0.03 || q > 0.12) continue
    const d = p.z - cz
    const lato = d < 0 ? 0 : 1
    const dd = Math.abs(d)
    const f = Math.min(N - 1, Math.max(0, Math.floor((p.x - x0) / L * N)))
    if (dd > semi[lato][f]) semi[lato][f] = dd
  }
  // sommando i due lati una fiancata storta non sposta piu' l'asse
  const insieme = semi[0].map((a, i) => a + semi[1][i])
  const largo = Math.max(...insieme)
  const dentro = insieme.map((v) => v / largo > 0.93)
  const blocchi: Array<{ da: number; a: number }> = []
  for (let i = 0; i < N;) {
    if (!dentro[i]) { i++; continue }
    let j = i
    while (j < N && dentro[j]) j++
    blocchi.push({ da: i, a: j - 1 })
    i = j
  }
  const xa = (i: number) => x0 + (i + 0.5) / N * L
  /* `zitto` serve a un secondo chiamante: la minigonna (vedi
     «scene/Sottoscocca.ts») ha bisogno degli stessi archi per aprirci i
     passaruota, e due righe [archi] identiche in console farebbero credere a
     due misure diverse quando invece e' la stessa fatta due volte. */
  if (!zitto) {
    console.log('[archi] L', +L.toFixed(3), 'H', +H.toFixed(3), 'punti', punti.length,
      'blocchi', JSON.stringify(blocchi.map((b) => [+xa(b.da).toFixed(2), +xa(b.a).toFixed(2)])), 'largo', +largo.toFixed(3))
  }
  const grandi = blocchi.filter((b) => xa(b.a) - xa(b.da) > 0.25)
  if (grandi.length < 2) return []
  const primo = grandi[0], ultimo = grandi[grandi.length - 1]
  const xDietro = (xa(primo.da) + xa(primo.a)) / 2
  const xDavanti = (xa(ultimo.da) + xa(ultimo.a)) / 2

  // la carreggiata: quanto sporge il fianco all'altezza di quell'asse
  const mezzaLarghezza = (xa: number, lato: number) => {
    const f = Math.min(N - 1, Math.max(0, Math.floor((xa - x0) / L * N)))
    let m = 0
    for (let i = Math.max(0, f - 2); i <= Math.min(N - 1, f + 2); i++) m = Math.max(m, semi[lato][i])
    return m
  }
  const archi: Arco[] = []
  for (const xa of [xDietro, xDavanti]) {
    for (const lato of [0, 1]) {
      const z = cz + (lato === 0 ? -1 : 1) * mezzaLarghezza(xa, lato)
      archi.push({ x: xa, z })
    }
  }
  return archi
}

export class Ruote {
  readonly gruppo: Group
  private cerchi: Mesh[] = []
  /** le ruote vere, quando il modello arriva: sostituiscono i segnali */
  private ruoteVere: Group[] = []
  /** la gomma di segnale appesa a ogni cerchio, per poterla nascondere */
  private gomme = new Map<Mesh, Mesh>()
  private materialeCerchio!: MeshPhysicalMaterial
  private gommaCorrente: Mesh | null = null
  /** radianti percorsi: si accumula, non si azzera, o la rotazione scatta
   *  a ogni fotogramma invece di scorrere */
  private angolo = 0

  /** la quota del pavimento su cui la vettura appoggia, in metri del mondo */
  private readonly quotaPiano: number

  constructor(auto: Object3D, quotaPiano = ALTEZZA_PIATTAFORMA) {
    this.quotaPiano = quotaPiano
    this.gruppo = new Group()
    this.gruppo.name = 'RUOTE_SEGNALE'

    const archi = trovaArchi(auto)
    const fondo = quotaPiano

    // un filo piu' chiara del nero pieno: una gomma vera non e' mai nera
    // assoluta, e nera assoluta si perde contro l'ombra della carena
    const gomma = new MeshStandardMaterial({ roughness: 0.88, metalness: 0.0 })
    // stessa ragione del cerchio: l'ambiente e' sette volte piu' forte
    gomma.envMapIntensity = 0.28
    gomma.color.setRGB(0.028, 0.028, 0.03)
    /* IL METALLO DEL CERCHIO. Il commento diceva «usato solo da
       `vestiConModello`», che non esiste piu': adesso lo usa il ripiego, che
       vive il tempo che ci mette la ruota vera a costruirsi. Il ragionamento
       qui sotto resta buono — e' costato quattro giri e una prova decisiva —
       ma va letto sapendo che riguarda un pezzo che dura due secondi. */
    /* IL CERCHIO DEVE CATTURARE LA LUCE, non solo specchiare il buio.
       Con metallo puro e ruvidita' 0,34 la lega restituiva soltanto l'ambiente
       notturno: un anello scuro in cui le razze non si leggevano. Un cerchio in
       vista ha bisogno di due cose — una lega piu' CHIARA (una lega lucidata
       riflette intorno al 90% e non al 62%) e una ruvidita' bassa che le dia un
       colpo di luce netto sugli spigoli delle razze, che e' cio' che disegna il
       raggio. L'intensita' d'ambiente alzata fa il resto: e' la stessa leva che
       serve al cromo, e per la stessa ragione. */
    /* MA UNA LEGA NON E' UN CROMO, e il provino l'ha mostrato senza scampo.
       Con ruvidita' 0,20 e intensita' d'ambiente 1,7 il cerchio e' uno
       SPECCHIO: appena e' comparsa la lama fredda che deve staccare la
       silhouette, le quattro ruote se la sono rimandata in faccia e sono
       diventate dischi ciano luminosi. Un cerchio che emette luce propria
       urla «computer grafica» piu' di qualunque altro difetto in quel
       fotogramma — e non era un problema della lama, era il cerchio che si
       comportava da lente.
       La revisione esterna dice cosa deve essere: alluminio SPAZZOLATO,
       metallico pieno, ruvidita' 0,25-0,28, con l'anisotropia allineata alle
       razze. Spazzolato vuol dire che il riflesso si stira lungo una
       direzione invece di restituire l'ambiente puntuale: e' quello a dire
       «lega lavorata» invece di «metallo cromato».
       E la lega scende da 0,90 a 0,74: 0,90 e' argento lucidato, un cerchio in
       alluminio non arriva li'. */
    this.materialeCerchio = new MeshPhysicalMaterial({ roughness: 0.55, metalness: 1.0 })
    /* NON E' L'AMBIENTE CHE LI ACCENDE: SONO LE LUCI DIRETTE.
       Prova decisiva: dipinti di rosso pieno con `metalness 0`, la zona ruota
       nel provino misura (42, 1, 4). Quindi il materiale e' questo e le
       modifiche arrivano — ma con `metalness 1` e `envMapIntensity 0,07` i
       cerchi restavano ciano luminosi, e un metallo con l'ambiente quasi
       spento puo' prendere luce solo dalle `RectAreaLight`. Sono loro, e sono
       fredde: da qui il ciano.
       Ne segue che la cura non e' l'intensita' d'ambiente — che avevo
       abbassato quattro volte inutilmente — ma la RUVIDITA', che allarga il
       colpo speculare invece di concentrarlo, e la RIFLETTANZA: su un metallo
       il colore base E' la riflettanza, e 0,74 e' argento lucidato. Un cerchio
       in alluminio scuro sta intorno a 0,55. */
    this.materialeCerchio.color.setRGB(0.55, 0.56, 0.585)
    /* 0,28 E NON 1,0, e il numero da solo non dice niente: e' RELATIVO
       all'ambiente. Le strisce sono passate da forza 7,6 a 55 per recuperare
       l'esposizione dopo la vernice dielettrica, cioe' l'ambiente e' sette
       volte piu' forte. Un metallo che lo specchia con intensita' 1,0 sotto
       quell'ambiente non e' un cerchio: e' una lampada. Nel provino le quattro
       ruote erano dischi ciano luminosi — due volte di seguito, per due cause
       diverse, ed e' il difetto che salta all'occhio prima di ogni altro.
       Regola: quando si cambia la forza dell'ambiente si ricontrollano TUTTI
       i materiali che lo specchiano, perche' la loro intensita' e' un
       rapporto, non un valore. */
    this.materialeCerchio.envMapIntensity = 0.07
    /* LA REGOLA CHE MI E' COSTATA TRE GIRI: `forza` DELLE STRISCE E' IL
       DENOMINATORE DI OGNI `envMapIntensity` DEL PROGETTO.
       Non e' una manopola libera. Portandola da 7,6 a 55 per recuperare
       l'esposizione dopo la vernice dielettrica ho invalidato in un colpo la
       taratura di TUTTI i materiali che specchiano — e il primo a gridarlo
       sono stati i cerchi, che sono metallo pieno. Ho abbassato la loro
       intensita' tre volte (1,7 -> 1,0 -> 0,28 -> 0,07) senza capire perche'
       non bastasse mai: perche' 0,28 di un ambiente sette volte piu' forte
       vale ancora piu' di 1,7 di prima.
       Quando si tocca `forza`, si ricontrollano tutti gli `envMapIntensity`.
       Il numero da guardare non e' l'intensita': e' il PRODOTTO. */
    /* L'ANISOTROPIA NON SI PUO' AVERE, E NON E' UNA RINUNCIA DI GUSTO.
       La revisione la chiede («anisotropy 0.7 allineata alle razze ->
       alluminio spazzolato») ed e' giusta: un riflesso stirato lungo una
       direzione e' cio' che distingue una lega lavorata da un cromo. Ma
       `MeshPhysicalMaterial.anisotropy` lavora nello spazio tangente, e
       `ruota.glb` porta SOLO `position` e `normal`: senza UV non si possono
       calcolare le tangenti (`computeTangents` le pretende), e senza tangenti
       three compila un materiale che NON DISEGNA.
       E non lo dice: nessuna eccezione, nessun console.error. La scena intera
       e' diventata nera — luminanza media della vettura da 28,2 a 0,6 — e il
       primo sintomo e' stato il misuratore che restituiva mediana 0,0 come se
       fosse una taratura sbagliata. Per questo `strumenti/uno.mjs` adesso
       ascolta `pageerror` e `console.error`: un guasto deve gridare.
       Per riaverla servirebbe generare le UV della ruota e ricalcolare le
       tangenti. Finche' non c'e' quello, il verso spazzolato lo fa la sola
       ruvidita', e va detto invece che lasciato credere. */
    this.materialeCerchio.name = 'CERCHIO_VERO'
    gomma.name = 'GOMMA_SEGNALE'

    /* IL CERCHIO EMETTE, NON RIFLETTE — ed e' la correzione piu' importante di
       questo file. Un `MeshStandardMaterial` metallico dentro una carena, dove
       nessun pannello da studio arriva, e' un metallo con niente da
       specchiare: nero su nero, e infatti non si vedeva — verificato
       campionando il pixel esatto, colore uniforme, nessuna traccia
       dell'oggetto. E' lo stesso principio del faro: «un anello acceso lo
       risolve in un fotogramma, ed e' anche l'unico momento in cui questo
       sito puo' permetterselo». Qui vale lo stesso, in scala piu' piccola: un
       filo di luce fredda basta a dire «cerchio», e non dipende da nessuna
       luce che debba raggiungerlo. `toneMapped: false` come tutte le luci
       proprie della scena — un'emissione passata per la curva ACES si
       schiaccia, e questa deve restare un filo netto anche dentro un'ombra
       piena. */
    const cromo = new MeshBasicMaterial({ toneMapped: false })
    cromo.color.setRGB(0.085, 0.115, 0.145)
    cromo.name = 'CERCHIO_SEGNALE'

    /* GLI ASSI, PERCHE' NON SONO OVVI E SBAGLIARLI NON DA' ERRORE.
       In questa scena X e' la lunghezza, Z e' la larghezza (la carreggiata),
       Y e' l'alto. L'asse di un mozzo vero e' orizzontale e punta verso
       l'ESTERNO della vettura, cioe' lungo Z: la ruota rotola nel piano X-Y,
       che e' il piano in cui la si vede di profilo.
       `CylinderGeometry` nasce con l'asse lungo Y: una rotazione di 90 gradi
       intorno a X lo porta lungo Z, ed e' l'unica delle tre che serve.
       `RingGeometry` nasce gia' nel piano X-Y (normale lungo Z): non va
       ruotata affatto, o il suo profilo finirebbe di taglio e sparirebbe. */
    // la razza emette anche lei, per la stessa ragione del cerchio: e' quella
    // a dire «gira», e deve restare visibile in qualunque punto del giro
    const spoke = new MeshBasicMaterial({ toneMapped: false })
    spoke.color.setRGB(0.5, 0.62, 0.72)
    spoke.name = 'SPOKE_SEGNALE'

    for (const a of archi) {
      const verso = a.z < 0 ? -1 : 1
      const zBordo = a.z + verso * SPORGENZA

      /* LA GOMMA TOCCA IL SUOLO, e non e' un dettaglio: e' cio' che la rende
         VISIBILE da qualunque angolo, non solo da quello in cui e' stata
         controllata l'ultima volta.
         A mezza altezza della carena un punto puo' restare nascosto dalla
         curva del parafango a seconda di dove sta la camera — verificato:
         proiettata la posizione e campionato il pixel esatto, e in una delle
         quattro carene c'era ancora il colore uniforme della cavita', nessuna
         traccia dell'oggetto. Vicino al suolo questo non succede: la
         carrozzeria si allontana dal terreno per lasciare passare la ruota, e
         quell'apertura verso il basso e' visibile da qualunque angolo di
         ripresa ragionevole — e' la stessa ragione per cui il sottoscocca
         funziona da qualunque lato lo si guardi. */
      const t = new Mesh(new CylinderGeometry(RAGGIO_GOMMA, RAGGIO_GOMMA, 0.11, 20, 1, true), gomma)
      t.rotation.x = Math.PI / 2
      t.position.set(a.x, fondo + RAGGIO_GOMMA, zBordo)
      t.name = 'GOMMA_SEGNALE'
      t.castShadow = true
      this.gruppo.add(t)
      this.gommaCorrente = t

      /* IL CERCHIO: un anello davanti alla gomma, RECESSO rispetto al suo
         bordo esterno (- verso * 0.02, non +) — su una ruota vera il
         battistrada sporge oltre il cerchio, non il contrario; con il segno
         invertito il cerchio galleggiava davanti alla gomma come un disco
         posticcio, ed e' li' che nasceva la lettura «moneta», non «ruota».

         E UN ANELLO SOLO NON BASTAVA A DIRE «RUOTE» — misurato guardando il
         fotogramma vero, non il pixel: un anello pieno con una sola razza
         letta da fermo e' un disco con un'asta, non un cerchio automobilistico.
         Un cerchio vero si riconosce SENZA bisogno che giri, dalle razze
         multiple che si irradiano da un mozzo scuro. Cinque razze e un mozzo
         (la stessa gomma quasi nera del pneumatico, che nella cavita' in ombra
         resta comunque scuro) danno quella lettura in un solo fotogramma; la
         rotazione vera, sopra, resta il segno che qualcosa si muove davvero. */
      const c = new Mesh(new RingGeometry(RAGGIO_CERCHIO * 0.42, RAGGIO_CERCHIO, 24), cromo)
      c.position.set(a.x, fondo + RAGGIO_GOMMA, zBordo - verso * 0.02)
      c.name = 'CERCHIO_SEGNALE'

      const mozzo = new Mesh(new CircleGeometry(RAGGIO_CERCHIO * 0.42 * 0.6, 16), gomma)
      mozzo.name = 'MOZZO_SEGNALE'
      c.add(mozzo)

      const RAZZE = 5
      for (let i = 0; i < RAZZE; i++) {
        const razza = new Mesh(new CylinderGeometry(0.010, 0.010, RAGGIO_CERCHIO * 1.7, 6), spoke)
        razza.rotation.z = (i * Math.PI * 2) / RAZZE
        razza.name = 'RAZZA_SEGNALE'
        c.add(razza)
      }
      this.gruppo.add(c)
      this.cerchi.push(c)
      if (this.gommaCorrente) this.gomme.set(c, this.gommaCorrente)
    }
  }

  /**
   * LA RUOTA VERA AL POSTO DEL SEGNALE.
   *
   * Quelle qui sopra sono un'astrazione dichiarata — un cilindro a venti
   * segmenti, un anello piatto e cinque razze cilindriche — e i loro nomi lo
   * dicono (`*_SEGNALE`). Da lontano bastano; da vicino si leggono per quello
   * che sono, «una moneta con un'asta», come ammette il commento del cerchio.
   *
   * Il rimedio non e' aggiungere segmenti: e' geometria vera. Questa monta un
   * modello generato (razze multiple, disco freno dietro, battistrada) e lo
   * clona sui quattro archi, tenendo POSIZIONI e ROTAZIONE gia' calcolate.
   *
   * I MATERIALI RESTANO QUELLI DEL PROGETTO: il modello arriva senza texture
   * apposta. Le sue mappe erano quaranta megabyte di fotografia con la luce
   * cotta dentro, e in una scena che ha gia' la sua luce sarebbero state due
   * illuminazioni sovrapposte. La gomma e il cerchio del progetto sono tarati
   * su QUESTA scena: si vestono con quelli.
   *
   * Se il modello non arriva (rete lenta, file mancante) non succede niente:
   * restano le ruote di segnale. Non si sostituisce cio' che non c'e'.
   */
  /**
   * LE RUOTE COSTRUITE, al posto di quelle scaricate.
   *
   * `ruota.glb` arrivava da un generatore ed erano 28.700 triangoli di rumore:
   * bordo del pneumatico frastagliato invece che circolare, spalla che
   * ondeggia, cerchio in cui non si distingue una razza. Ingrandendo il
   * provino non c'era niente da discutere. E non era un problema di
   * materiale — ci ho provato tre volte: nessuna ruvidita' raddrizza una
   * circonferenza storta.
   * Una ruota e' un solido di rivoluzione con dentro una simmetria a
   * raggiera: e' fatta di cerchi, e un cerchio scritto in codice e' esatto per
   * costruzione mentre uno generato e' un poligono che gli somiglia. Sulla
   * silhouette la differenza si vede subito. Vedi `scene/RuotaVera.ts`.
   */
  costruisci(): boolean {
    if (!this.cerchi.length) return false
    const M = materialiRuota()
    const daButtare: Object3D[] = []
    const geometrie = new Set<BufferGeometry>()
    for (const vecchio of this.cerchi) {
      const perno = new Group()
      const gommaVecchia = this.gomme.get(vecchio)
      perno.position.copy(gommaVecchia ? gommaVecchia.position : vecchio.position)
      const verso = perno.position.z < 0 ? -1 : 1
      /* QUANTO RIENTRA NON SI STIMA, SI CALCOLA.
         L'ancora arriva dalla ruota di SEGNALE, che era spinta in fuori di
         `SPORGENZA` apposta: un anello piatto si vede solo se sporge dal
         fianco. Una ruota vera in quel punto sporge per intero — misurato,
         con un rientro di un terzo la carreggiata veniva 1,913 su una
         carrozzeria larga 1,766, cioe' il pneumatico usciva di DICIOTTO
         CENTIMETRI oltre il fianco e leggeva come un pezzo appiccicato
         accanto all'automobile.
         Il bersaglio e' geometrico: la spalla esterna del pneumatico a filo
         della fiancata, appena dentro. Quindi si torna indietro di tutta la
         sporgenza PIU' mezza larghezza della gomma, meno un margine perche' su una streamliner a ruote carenate la carena deve
         passare sopra il pneumatico, non finirgli accanto.
         IL MARGINE E' 65 mm E NON 30: a filo esatto la ruota POSTERIORE
         spariva del tutto dentro la carena — se ne vedeva un mezzaluna — e una
         ruota che non si vede legge come una ruota che manca, che e' l'errore
         opposto e altrettanto brutto. Sessantacinque millimetri la fanno
         leggere senza farla sporgere. Il davanti non ne aveva bisogno: li' la
         carena e' piu' stretta e la ruota si vedeva gia'. */
      perno.position.z -= verso * (SPORGENZA + LARGHEZZA_RUOTA / 2 - 0.065)
      /* LA QUOTA SI RICALCOLA DAL RAGGIO VERO, e questo era il difetto piu'
         grosso di tutti — quello per cui le ruote «facevano schifo» anche
         dopo essere state rifatte da zero.
         L'ancora arriva dalla ruota di SEGNALE, che aveva raggio 0,30 e
         centro a `pavimento + 0,30`: cosi' toccava terra esattamente. La
         ruota costruita ha raggio 0,354, ma ereditava quel centro. Il suo
         punto piu' basso finiva a 0,045 contro un pavimento a 0,110: la ruota
         era SEPOLTA DI SEI CENTIMETRI E MEZZO nel podio.
         E il podio e' opaco, quindi non si vedeva una ruota affondata: si
         vedeva una CORDA DI CERCHIO. Una ruota tagliata sotto sembra piccola,
         sembra fuori posto, e nessun aggiustamento di posizione orizzontale o
         di materiale poteva rimediare — stavo spostando lateralmente un
         oggetto il cui difetto era verticale.
         Adesso il centro si calcola: pavimento piu' raggio VERO. Ereditare
         una quota tarata su un raggio diverso e' la stessa famiglia dei numeri
         che smettono di essere veri quando cambia cio' su cui erano tarati.

         Meno 11 mm di IMPRONTA A TERRA: la ruota affonda invece di essere
         schiacciata. Queste ruote GIRANO, e un appiattimento cotto nella
         geometria girerebbe con loro — si vedrebbe una gomma ovale che
         rotola. Affondando, il pavimento taglia il pneumatico e l'appoggio
         diventa una superficie, ferma o in moto che sia. */
      perno.position.y = this.quotaPiano + RAGGIO_RUOTA - 0.011
      perno.add(costruisciRuota(M, verso))
      this.gruppo.add(perno)
      this.ruoteVere.push(perno)
      /* IL RIPIEGO SI BUTTA, non si nasconde — ed era nascosto da sempre.
         `visible = false` toglie un oggetto dal DISEGNO e lo lascia in tutto il
         resto: nel grafo, in memoria video con la sua geometria e i suoi
         materiali, e dentro ogni ciclo che percorre la scena. Sondando le mesh
         dell'automobile ne uscivano 32 di ripiego accanto a quelle vere —
         `GOMMA_SEGNALE`, `CERCHIO_SEGNALE`, `RAZZA_SEGNALE` — e `aggiorna()`
         continuava a scrivere una rotazione su quattro cerchi che nessuno
         guarda, sessanta volte al secondo.
         Nascondere e' la mossa giusta finche' si potrebbe tornare indietro. Qui
         non si torna: la ruota vera c'e', ed e' costruita, non caricata. Quindi
         si stacca dal padre e si butta.
         Le geometrie sono CONDIVISE fra le quattro ruote (vedi `raggiera` qui
         sopra), quindi disporle nel ciclo le distruggerebbe per le altre tre:
         si raccolgono e si buttano dopo, una volta sola. */
      daButtare.push(vecchio)
      if (gommaVecchia) daButtare.push(gommaVecchia)
    }
    for (const o of daButtare) {
      o.parent?.remove(o)
      o.traverse((x) => {
        const m = x as Mesh
        if (m.isMesh) geometrie.add(m.geometry)
      })
    }
    for (const g of geometrie) g.dispose()
    /* e la lista dei ripieghi si svuota: `aggiorna()` la percorre a ogni
       fotogramma, e lasciarci dentro oggetti staccati dalla scena e' il modo
       piu' rapido di tenere in vita cio' che si e' appena buttato */
    this.cerchi.length = 0
    this.gomme.clear()
    return true
  }

  /* `vestiConModello` NON C'E' PIU' — centosessanta righe che nessuno chiamava.
     Innestava un modello di ruota caricato da `public/modelli/ruota.glb` al
     posto del ripiego: misurava la scatola d'ingombro, ne ricavava la scala,
     clonava la scena e la posava sui quattro archi. Era codice buono e ha
     smesso di servire il giorno in cui la ruota ha cominciato a COSTRUIRSI
     (vedi `scene/RuotaVera.ts`): quel GLB erano 28.700 triangoli di rumore, e
     il file e' stato tolto da `public/` perche' nessuno lo chiedeva piu'.
     Restava la funzione, senza chiamanti e senza un file da caricare — cioe'
     una strada che non porta piu' da nessuna parte e che il prossimo che passa
     avrebbe dovuto capire prima di poterla ignorare.
     Sta nella storia di git, che e' dove le cose tolte si ritrovano davvero. */


  /** @param velocita 0..1: la stessa che guida il tachimetro */
  aggiorna(velocita: number, dt: number) {
    if (velocita <= 0.002) return
    // un raggio di 0,095 m che percorre un giro ogni terra della carreggiata
    // simulata: la costante e' scelta perche' SI VEDA, non perche' sia esatta
    // — l'obiettivo e' il segnale «gira», non un tachimetro delle ruote
    this.angolo += velocita * dt * 14
    // Z e' l'asse del mozzo: e' l'unico giro che non deforma il cerchio,
    // perche' e' perpendicolare al suo piano
    /* SOLO LE RUOTE VERE. `this.cerchi` conteneva i ripieghi, che dopo
       `costruisci()` non esistono piu' — e finche' sono esistiti questa riga
       scriveva una rotazione su quattro oggetti invisibili a ogni fotogramma. */
    for (const r of this.ruoteVere) r.rotation.z = this.angolo
  }
}
