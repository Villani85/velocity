import {
  Box3,
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
export function trovaArchi(auto: Object3D): Arco[] {
  auto.updateWorldMatrix(true, true)
  const v = new Vector3()
  let fondo = Infinity
  const pezzi: Array<{ o: Object3D; pos: BufferAttribute }> = []
  auto.traverse((o) => {
    const m = o as unknown as { isMesh?: boolean; geometry?: BufferGeometry; material?: { name?: string } }
    if (!m.isMesh || !m.geometry || m.material?.name !== 'SCOCCA') return
    const pos = m.geometry.attributes.position as BufferAttribute
    pezzi.push({ o, pos })
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      if (v.y < fondo) fondo = v.y
    }
  })
  if (!pezzi.length || !isFinite(fondo)) return []

  // quattro quadranti: avanti/dietro per x, sinistra/destra per z
  const gruppi: Array<Array<[number, number]>> = [[], [], [], []]
  for (const { o, pos } of pezzi) {
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      const h = v.y - fondo
      if (h < 0.10 || h > 0.45) continue
      const k = (v.x < 0 ? 0 : 2) + (v.z < 0 ? 0 : 1)
      gruppi[k].push([v.x, v.z])
    }
  }

  return gruppi.map((g) => {
    if (!g.length) return null
    // i dodici punti piu' larghi: la media riduce il rumore di un singolo
    // vertice isolato, che su una maglia generata capita
    g.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    const top = g.slice(0, 12)
    const x = top.reduce((s, p) => s + p[0], 0) / top.length
    const z = top.reduce((s, p) => s + p[1], 0) / top.length
    return { x, z }
  }).filter((a): a is Arco => a !== null)
}

export class Ruote {
  readonly gruppo: Group
  private cerchi: Mesh[] = []
  /** le ruote vere, quando il modello arriva: sostituiscono i segnali */
  private ruoteVere: Group[] = []
  /** la gomma di segnale appesa a ogni cerchio, per poterla nascondere */
  private gomme = new Map<Mesh, Mesh>()
  private materialeCerchio!: MeshPhysicalMaterial
  private materialeGomma!: MeshStandardMaterial
  private gommaCorrente: Mesh | null = null
  /** radianti percorsi: si accumula, non si azzera, o la rotazione scatta
   *  a ogni fotogramma invece di scorrere */
  private angolo = 0

  constructor(auto: Object3D, quotaPiano = ALTEZZA_PIATTAFORMA) {
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
    /* IL METALLO DELLA RUOTA VERA — usato solo da `vestiConModello`.
       Non e' il `MeshBasic` del segnale: quello e' piatto per essere sempre
       visibile, questo deve SPECCHIARE l'ambiente come una lega lucidata,
       perche' e' proprio il riflesso che dice «cerchio in metallo». */
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
    this.materialeGomma = gomma
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
  vestiConModello(scena: Object3D) {
    /* SI CLONA LA SCENA, NON LE GEOMETRIE.
       Il primo tentativo copiava `m.geometry` e ci cuoceva dentro `matrixWorld`:
       con una geometria QUANTIZZATA (`KHR_mesh_quantization`, che gltfpack usa)
       la scatola d'ingombro tornava vuota — diametro zero — mentre i vertici
       c'erano tutti, ventunmila. Clonare l'oggetto invece della geometria si
       porta dietro le trasformazioni come sono, senza toccare i vertici, e la
       misura torna quella vera. */
    const base = scena.clone(true)
    base.updateWorldMatrix(true, true)
    const box = new Box3().setFromObject(base)
    const dim = new Vector3(); box.getSize(dim)
    const diametro = Math.max(dim.x, dim.y, dim.z)
    if (!(diametro > 0)) return false

    /* LA MISURA DECIDE LA SCALA: il modello arriva a diametro qualunque e deve
       diventare la gomma che c'era. A occhio si finisce con una ruota che
       affonda nel piano o galleggia sopra. */
    /* +18% DI DIAMETRO, e il revisore ha ragione sul perche'.
       La ruota tarata sul raggio della gomma di SEGNALE risultava piccola
       rispetto alla carena: su una hypercar la ruota riempie il passaruota, e
       una ruota piccola dentro un arco grande e' il segnale piu' immediato di
       "modello 3D non finito". `RAGGIO_GOMMA` restava buono per un anello
       piatto, non per una ruota vera con spessore. */
    const fattore = (RAGGIO_GOMMA * 2 * 1.18) / diametro
    const centro = new Vector3(); box.getCenter(centro)

    /* GOMMA E CERCHIO SONO LA STESSA MESH e si dividono per RAGGIO: oltre il
       78% c'e' la spalla del pneumatico, dentro razze, disco e mozzo. Senza la
       divisione si ottiene o un pneumatico cromato o un cerchio di gomma. */
    const SOGLIA = 0.78
    /* SI RACCOLGONO PRIMA, POI SI MODIFICA.
       Aggiungere un figlio DENTRO `traverse` significa modificare l'albero che
       si sta percorrendo: three lo visita a sua volta, la divisione gira sul
       pezzo appena creato e il risultato e' che non si divide niente — tutta
       la ruota restava metallo, centoquattordicimila triangoli in un materiale
       solo, mentre la stessa soglia provata a freddo sullo stesso file separa
       9.597 triangoli di pneumatico da 19.085 di cerchio. */
    const daDividere: Mesh[] = []
    base.traverse((o) => { if ((o as Mesh).isMesh) daDividere.push(o as Mesh) })
    for (const m of daDividere) {
      m.castShadow = true
      const g = m.geometry
      const pos = g.getAttribute('position')
      const idx = g.getIndex()
      if (!pos || !idx) { m.material = this.materialeCerchio; continue }
      const dentro: number[] = []
      const fuori: number[] = []
      const c = new Vector3()
      g.computeBoundingBox()
      g.boundingBox!.getCenter(c)
      /* IL RAGGIO SI PRENDE DALLA GEOMETRIA, NON DALLA SCATOLA DEL MONDO.
         Prima usavo l'ingombro mondiale diviso per la scala del nodo, mentre i
         vertici li leggo in coordinate LOCALI: due sistemi diversi, la soglia
         non veniva mai superata e TUTTA la ruota finiva metallo — pneumatico
         cromato, centoquattordicimila triangoli in un materiale solo. E' lo
         stesso errore del montaggio, in piccolo: si misura dove si legge. */
      const bs = new Vector3()
      g.boundingBox!.getSize(bs)
      const raggioMax = Math.max(bs.y, bs.z) / 2
      for (let t = 0; t < idx.count; t += 3) {
        const a0 = idx.getX(t), a1 = idx.getX(t + 1), a2 = idx.getX(t + 2)
        let r = 0
        for (const v of [a0, a1, a2]) {
          const y = pos.getY(v) - c.y
          const z = pos.getZ(v) - c.z
          r += Math.sqrt(y * y + z * z)
        }
        r /= 3
        ;(r > raggioMax * SOGLIA ? fuori : dentro).push(a0, a1, a2)
      }
      if (!fuori.length || !dentro.length) { m.material = this.materialeCerchio; continue }
      const g2 = g.clone(); g2.setIndex(fuori)
      const gomma = new Mesh(g2, this.materialeGomma)
      gomma.castShadow = true
      m.add(gomma)
      const g1 = g.clone(); g1.setIndex(dentro)
      m.geometry = g1
      m.material = this.materialeCerchio
    }

    /* LA LARGHEZZA VA RIPORTATA A QUELLA CHE C'ERA, e non e' un dettaglio.
       Il modello e' largo 0,353 su un diametro di 0,997: portato al diametro
       della gomma diventa largo ventun centimetri, DUE VOLTE gli undici del
       pneumatico di segnale. Un pneumatico due volte piu' largo, per giunta
       centrato dove stava un anello PIATTO, esce dalla carena — ed e' quello
       che si vedeva: le ruote sporgevano oltre il fianco. */
    const larghezzaModello = Math.min(dim.x, dim.y, dim.z) * fattore
    /* PNEUMATICO PIU' SPESSO: 0,145 dava una ruota sottile, "senza massa".
       Una gomma da hypercar e' larga, ed e' la larghezza che le da' peso. */
    const LARGHEZZA_VOLUTA = 0.205
    const schiaccia = LARGHEZZA_VOLUTA / larghezzaModello

    for (const vecchio of this.cerchi) {
      const copia = base.clone(true)
      copia.position.sub(centro)
      /* si stringe lungo il MOZZO (l'asse X del modello), non in altezza:
         il diametro deve restare quello della gomma che c'era */
      copia.scale.x = schiaccia
      const contenitore = new Group()
      /* L'ASSE SI MISURA, NON SI INDOVINA: la scatola dice 0,353 x 0,997 x
         0,995, quindi il mozzo del modello e' X mentre nella scena gira
         attorno a Z. Un quarto di giro attorno a Y porta X su Z; con la
         rotazione sbagliata la ruota compariva di taglio, una lama nera. */
      contenitore.rotation.y = Math.PI / 2
      contenitore.scale.setScalar(fattore)
      contenitore.add(copia)
      const perno = new Group()
      /* SI CENTRA SULLA GOMMA, NON SULL'ANELLO. L'anello di segnale e' una
         superficie piatta appoggiata al BORDO ESTERNO della ruota: mettere li'
         il centro di un pneumatico che ha spessore vero lo spinge fuori di
         mezza larghezza. Il riferimento giusto e' il cilindro della gomma, che
         un centro ce l'ha davvero. */
      const gommaVecchia = this.gomme.get(vecchio)
      perno.position.copy(gommaVecchia ? gommaVecchia.position : vecchio.position)
      /* LA RUOTA RIENTRA NELL'ARCO, e non e' una rifinitura: e' cio' che la
         attacca alla vettura.
         Le ruote di segnale erano spinte in FUORI di dodici centimetri
         (`SPORGENZA`) apposta, perche' un anello piatto si vede solo se sporge
         dal fianco. Una ruota vera messa nello stesso punto sporge per intero e
         legge come un pezzo appiccicato accanto alla carrozzeria: questa e' una
         streamliner a ruote CARENATE, la carena deve coprirne una parte.
         Si rientra della sporgenza e di mezza larghezza, cosi' il fianco della
         carena passa sopra al pneumatico invece di finirgli accanto. */
      const verso = perno.position.z < 0 ? -1 : 1
      /* SI RIENTRA DELLA SOLA SPORGENZA, non di piu'.
         Rientrando anche di mezza larghezza la ruota finiva SOTTO il fianco e
         il disegno delle razze spariva: restava un anello scuro. Rientrando
         della sola sporgenza il centro torna sull'arco — che e' dove sta la
         ruota di un'automobile — e la faccia del cerchio resta in vista. */
      /* PIU' VERSO L'ESTERNO, quasi a filo carena.
         Rientrando dell'intera sporgenza la ruota finiva sotto il fianco e
         sembrava staccata dall'altro lato: su una hypercar la ruota sta quasi
         A FILO della carrozzeria. Si rientra di due terzi, non di tutto. */
      perno.position.z -= verso * SPORGENZA * 0.62
      /* L'IMPRONTA A TERRA, ottenuta AFFONDANDO invece che schiacciando.
         Un pneumatico perfettamente circolare che tocca il suolo in UN PUNTO
         e' la firma piu' riconoscibile del render amatoriale: una gomma vera
         si deforma sotto il peso e appoggia su una superficie.
         La cura ovvia — schiacciare i vertici bassi di 8-12 mm — qui sarebbe
         SBAGLIATA, e la ragione e' che queste ruote GIRANO: un appiattimento
         cotto nella geometria girerebbe con loro, e si vedrebbe una gomma
         ovale che rotola. Affondare la ruota di 11 mm nel piano da' la stessa
         lettura — il pavimento taglia il pneumatico e l'appoggio diventa una
         superficie — e resta corretta a ruota ferma e a ruota in moto.
         Undici millimetri e non venti: e' la deflessione di un pneumatico
         ribassato sotto il peso di una vettura, non una gomma a terra. */
      perno.position.y -= 0.011
      perno.add(contenitore)
      this.gruppo.add(perno)
      this.ruoteVere.push(perno)
      vecchio.visible = false
      if (gommaVecchia) gommaVecchia.visible = false
    }
    return true
  }

  /** @param velocita 0..1: la stessa che guida il tachimetro */
  aggiorna(velocita: number, dt: number) {
    if (velocita <= 0.002) return
    // un raggio di 0,095 m che percorre un giro ogni terra della carreggiata
    // simulata: la costante e' scelta perche' SI VEDA, non perche' sia esatta
    // — l'obiettivo e' il segnale «gira», non un tachimetro delle ruote
    this.angolo += velocita * dt * 14
    // Z e' l'asse del mozzo: e' l'unico giro che non deforma il cerchio,
    // perche' e' perpendicolare al suo piano
    for (const c of this.cerchi) c.rotation.z = this.angolo
    for (const r of this.ruoteVere) r.rotation.z = this.angolo
  }
}
