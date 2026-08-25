import {
  BufferAttribute,
  CanvasTexture,
  LinearFilter,
  SRGBColorSpace,
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'

import { ALTEZZA_PIATTAFORMA } from './Piattaforma'

import { trovaArchi } from './Ruote'
import { RAGGIO_RUOTA } from './RuotaVera'

/**
 * IL SOTTOSCOCCA — cio' che chiude la sagoma fino a terra.
 *
 * PERCHE' L'OMBRA DI CONTATTO NON BASTAVA, e il committente l'ha visto subito:
 * «a me sembra ancora sospesa sulla piattaforma». Aveva ragione contro la mia
 * misura, ed e' istruttivo come.
 *
 * Avevo appoggiato la vettura sul suo punto piu' basso letto da `Box3`: 0,110,
 * esattamente il piano della pedana. Numero giusto, conclusione sbagliata.
 * Misurando fetta per fetta lungo i 4,52 metri — venti sezioni — viene fuori
 * che la scocca ha il fondo PIATTO a 0,291 per tutta la lunghezza, e che a
 * scendere fino a 0,110 e' un pezzo solo: `OTTICA_BORDO`, l'anello del muso,
 * spesso due centimetri. Su 65.333 vertici della carrozzeria, ZERO stanno
 * sotto 0,25.
 *
 * Cioe': toccava l'anello, e la vettura restava diciotto centimetri in aria.
 * `Box3.min.y` aveva misurato un vertice isolato e me l'aveva restituito come
 * se fosse il ventre. E' la quinta volta in questo progetto che un metro rotto
 * da' un numero invece di un errore, ed e' sempre lo stesso errore: chiedere a
 * un aggregato una cosa che riguarda una parte.
 *
 * E PERCHE' SI VEDE COSI' TANTO: la pedana e' uno SPECCHIO. Un oggetto alto
 * diciotto centimetri sopra uno specchio non mostra diciotto centimetri di
 * aria, ne mostra TRENTASEI — la sua distanza dal piano piu' quella del suo
 * riflesso. E' il segnale piu' forte che esista di una cosa che non poggia, e
 * nessuna ombra dipinta lo cancella: l'ombra sta sul piano, il buco sta fra
 * l'oggetto e il piano.
 *
 * PERCHE' NON SI ABBASSA E BASTA. Abbassare la vettura di dodici centimetri
 * porterebbe la scocca alla quota giusta e infilerebbe l'anello del muso dentro
 * il basamento: quell'anello e' alto settantasette centimetri ed e' la PORTA da
 * cui la camera entra nell'automobile, cioe' il momento migliore del sito. Si
 * guadagnerebbe una hero e si romperebbe un attraversamento.
 *
 * QUINDI SI CHIUDE LA SAGOMA. Un sottoscocca vero: una fascia scura che parte
 * dal fondo della carrozzeria e scende quasi a terra, come le minigonne di
 * un'automobile bassa. Non e' un trucco — e' il pezzo che a questo modello
 * manca davvero, perche' e' nato senza ruote e senza pianale.
 *
 * E IL PROFILO NON E' DISEGNATO, E' MISURATO. Si leggono i vertici della
 * carrozzeria nella fascia bassa del fianco e si prende, per ogni settore
 * angolare, il raggio massimo: viene fuori la pianta vera della vettura, muso
 * appuntito e coda larga compresi. Un ovale disegnato a mano si sarebbe visto
 * sbucare da sotto le carene al primo giro dell'automobile — ed e' il genere di
 * difetto che si scopre solo quando qualcuno gira il modello.
 */

/** da che quota sopra il fondo si legge il profilo: la fascia bassa del fianco */
const FASCIA: [number, number] = [0.02, 0.20]
/** quanto la minigonna rientra rispetto al fianco: un pezzo che sporge non e'
 *  un sottoscocca, e' un paraurti */
const RIENTRO = 0.955
/**
 * QUANTO RESTA FRA IL BORDO BASSO E IL PIANO — dodici millimetri, ed erano
 * quarantacinque.
 *
 * Quarantacinque millimetri sono l'aria di un'automobile molto bassa, e su una
 * pedana a specchio bastavano: il riflesso parte dal punto di contatto e
 * l'occhio lo legge come appoggio. Ma il riflesso e' pieno solo a qualita'
 * ALTA. A qualita' media — quella che la maggior parte delle macchine scelgono
 * da sola — la pedana riflette a 0,34 di risoluzione, cioe' diventa una
 * macchia, e il basamento legge come un disco opaco. Li' non c'e' piu' nessun
 * riflesso a raccontare il contatto, e quei quarantacinque millimetri tornano a
 * essere quello che sono: aria sotto una macchina.
 *
 * E' un difetto che ho verificato per una notte intera senza vederlo, perche'
 * tutti i provini forzavano la qualita' alta. Il committente l'ha visto al
 * primo sguardo sulla sua macchina.
 *
 * Dodici millimetri sono la fessura di un'automobile da corsa con lo splitter
 * quasi a terra — e su questa vettura, che ha le ruote carenate e non mostra
 * nessuna gomma, non c'e' nulla che chieda piu' spazio di cosi'.
 */
const LUCE_A_TERRA = 0.012
/** quanti settori: a 128 l'errore sul profilo sta sotto il centimetro */
const SETTORI = 128

export function sottoscocca(auto: Object3D, quotaPiano = ALTEZZA_PIATTAFORMA): Mesh | null {
  auto.updateWorldMatrix(true, true)

  /* IL FONDO VERO E' QUELLO DELLA SCOCCA, non della scatola di tutto l'insieme.
     Si filtra per nome del materiale invece che per nome dell'oggetto: il
     generatore consegna i nomi degli oggetti come gli pare — e' gia' costato
     un giro — mentre il materiale glielo assegniamo noi in `vestiAuto`. */
  let fondo = Infinity
  const v = new Vector3()
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
  if (!pezzi.length || !isFinite(fondo)) return null

  // il raggio massimo per settore, letto nella fascia bassa del fianco
  const raggi = new Float32Array(SETTORI)
  for (const { o, pos } of pezzi) {
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      const h = v.y - fondo
      if (h < FASCIA[0] || h > FASCIA[1]) continue
      const r = Math.hypot(v.x, v.z)
      let k = Math.floor(((Math.atan2(v.z, v.x) + Math.PI) / (Math.PI * 2)) * SETTORI)
      k = Math.min(SETTORI - 1, Math.max(0, k))
      if (r > raggi[k]) raggi[k] = r
    }
  }

  /* I SETTORI VUOTI SI RIEMPIONO DAI VICINI. Sul muso appuntito qualche settore
     non contiene nessun vertice dentro la fascia, e lasciarlo a zero aprirebbe
     uno spicchio fino all'asse: un buco a cuneo dentro la sagoma, cioe'
     precisamente il difetto che questa costruzione esiste per evitare. */
  for (let giro = 0; giro < 6; giro++) {
    for (let k = 0; k < SETTORI; k++) {
      if (raggi[k] > 0) continue
      const a = raggi[(k - 1 + SETTORI) % SETTORI]
      const b = raggi[(k + 1) % SETTORI]
      if (a > 0 || b > 0) raggi[k] = a > 0 && b > 0 ? (a + b) / 2 : Math.max(a, b)
    }
  }
  // e si lisciano: il campionamento e' irregolare, e un profilo a dentelli si
  // vede sul bordo controluce — che e' l'unico posto dove questo pezzo si guarda
  const lisci = new Float32Array(SETTORI)
  for (let k = 0; k < SETTORI; k++) {
    lisci[k] = (raggi[(k - 1 + SETTORI) % SETTORI] + raggi[k] * 2 + raggi[(k + 1) % SETTORI]) / 4
  }

  const cima = fondo + 0.012
  const orlo = Math.max(quotaPiano + LUCE_A_TERRA, cima - 0.34)

  /* E SI FERMA PRIMA DEL MUSO E DELLA CODA, che al primo giro non faceva — con
     un difetto che si e' visto solo guardando il provino ravvicinato del beat
     `lato`, non nei numeri: la minigonna correva fino in punta e TAGLIAVA IN
     DUE L'ANELLO DEL FARO con una riga nera orizzontale. Quell'anello scende
     fino a 0,110, cioe' molto piu' in basso del ventre, ed e' la porta da cui
     la camera entra nell'automobile: una barra scura attraverso quella e'
     l'ultima cosa che ci puo' stare.
     La cura non e' una toppa: e' come sono fatte le automobili. Una minigonna
     corre FRA LE RUOTE e si spegne prima del paraurti, perche' davanti e
     dietro ci sono lo splitter e il diffusore, che hanno un'altra forma e
     un'altra altezza. Qui si spegne con una finestra morbida sulla coordinata
     lunga: piena dentro il cinquantadue per cento centrale, nulla oltre
     l'ottantotto. L'anello sta al novantaquattro, quindi non lo tocca. */
  let lungo = 0
  for (let k = 0; k < SETTORI; k++) {
    const a = (k / SETTORI) * Math.PI * 2 - Math.PI
    lungo = Math.max(lungo, Math.abs(Math.cos(a) * lisci[k]))
  }
  /* ============================================================ I PASSARUOTA

     LA MINIGONNA PASSAVA DAVANTI ALLE RUOTE, e il commento qui sopra diceva
     gia' com'e' fatta un'automobile — «una minigonna corre FRA LE RUOTE» — ma
     nel codice non c'era NESSUNA nozione di ruota. La finestra qui sotto
     lavora sulla sola coordinata lunga e vale 0,95 proprio dove stanno i mozzi:
     la fascia scura correva ininterrotta per tutti e 128 i settori e copriva la
     meta' bassa del cerchio.

     E' il difetto che ho inseguito piu' a lungo di tutti in questo progetto. Ho
     rifatto il materiale del cerchio quattro volte, contato e ricontato le
     razze, cambiato il raggio della canna, misurato la luminanza dei due
     cerchi — e il numero diceva la verita' senza che io la leggessi: anteriore
     25, posteriore 50. Ho concluso «manca luce davanti» e ho cercato la luce.
     L'ha risolto il committente mandando un ingrandimento: nella sua immagine
     c'e' un TAGLIO ORIZZONTALE NETTO a meta' ruota, con sotto nero pieno. Un
     bordo dritto non e' un'ombra, e' un poligono. «Le copre la luce sotto
     l'auto secondo me» — ed era esattamente quello.
     La lezione e' vecchia e me l'ero dimenticata: una differenza di luminanza
     dice CHE due cose sono diverse, non PERCHE'. Guardare il provino
     ingrandito, che costa dieci secondi, l'avrebbe detto la prima notte.

     LA CURA e' quella vera: si aprono i passaruota. Il raggio si legge dalla
     ruota che c'e' davvero (`RAGGIO_RUOTA`) e i centri dagli stessi archi che
     usa `scene/Ruote.ts` per posarle — non da due numeri scritti a mano in due
     file, che e' l'errore gia' pagato due volte qui dentro.

     APERTURA = raggio + 5 cm. Un passaruota a filo del pneumatico lascerebbe
     la fascia esattamente tangente alla gomma: basta un millimetro di
     disallineamento e torna a mordere il cerchio. Cinque centimetri sono
     l'aria che ha un passaruota vero. */
  const archi = trovaArchi(auto, true)
  /* i due assi, non i quattro archi: destra e sinistra hanno la stessa
     coordinata lunga, e aprire due volte la stessa apertura non serve */
  const assi: number[] = []
  for (const a of archi) {
    if (!assi.some((x) => Math.abs(x - a.x) < 0.20)) assi.push(a.x)
  }
  const APERTURA_ARCO = RAGGIO_RUOTA + 0.05
  const SFUMA_ARCO = 0.10
  const passaruota = (x: number) => {
    let f = 1
    for (const xc of assi) {
      const d = Math.abs(x - xc)
      if (d <= APERTURA_ARCO) return 0
      if (d < APERTURA_ARCO + SFUMA_ARCO) {
        const u = (d - APERTURA_ARCO) / SFUMA_ARCO
        f = Math.min(f, u * u * (3 - 2 * u))
      }
    }
    return f
  }
  /* E SE GLI ARCHI NON SI TROVANO, la minigonna resta intera invece di sparire.
     `trovaArchi` puo' restituire un elenco vuoto su un modello diverso, e in
     quel caso `assi` e' vuoto e `passaruota` vale sempre 1: si torna
     esattamente al comportamento di prima. Un pezzo che si degrada al
     precedente e' meglio di uno che si degrada al niente. */

  const finestra = (x: number) => {
    const t = Math.abs(x) / (lungo || 1)
    if (t <= 0.52) return 1
    if (t >= 0.88) return 0
    const u = (t - 0.52) / 0.36
    // caduta liscia: uno spigolo qui si vedrebbe come un gradino sulla fiancata
    return 1 - u * u * (3 - 2 * u)
  }

  const punti: number[] = []
  const norm: number[] = []
  /* IL GRADIENTE STA NEI COLORI DEI VERTICI, e ci sono arrivato dopo aver
     provato — e buttato — uno shader.
     La strada ovvia era `onBeforeCompile`: un varying con la quota dentro la
     fascia, e nel frammento un termine che scalda verso il basso. L'ho scritta
     e la scena e' diventata NERA. Non un oggetto: tutta. Nessun errore in
     console, nessuna eccezione, nessun avviso di compilazione — il guasto
     silenzioso classico di questo progetto, il terzo.
     Il colpevole l'ha isolato una prova A/B in tre passi: solo frammento -> il
     fotogramma misura 61,4 (sano); frammento piu' varying -> 7,1 (nero). Non
     erano le uniform, non era il rapporto di pixel che un'altra modifica stava
     cambiando in parallelo: era il varying, e non ho la spiegazione.
     E quando non si ha la spiegazione, la cosa giusta non e' insistere: e'
     prendere la strada che non ha bisogno di quella spiegazione. Un gradiente
     verticale su una fascia costruita a mano non ha nessun bisogno di uno
     shader — sono due vertici per settore, e il colore per vertice three lo
     interpola da solo. Zero righe di GLSL, zero programmi da ricompilare, zero
     modi di sbagliare in silenzio. */
  const colori: number[] = []
  const uv: number[] = []
  const indici: number[] = []
  const n = new Vector3()
  for (let k = 0; k < SETTORI; k++) {
    const a = (k / SETTORI) * Math.PI * 2 - Math.PI
    const cx = Math.cos(a)
    const cz = Math.sin(a)
    const r = lisci[k]
    const f = finestra(cx * r) * passaruota(cx * r)
    const giu = cima - (cima - orlo) * f
    // dove la finestra e' chiusa la minigonna ha altezza zero e il rientro non
    // ha piu' senso: si riporta a uno, o il bordo alto si stringerebbe da solo
    const rientro = 1 - (1 - RIENTRO) * f
    punti.push(cx * r, cima, cz * r)
    punti.push(cx * r * rientro, giu, cz * r * rientro)
    /* IL COLORE MOLTIPLICA, quindi il gradiente si fa AL CONTRARIO di come
       verrebbe da pensarlo: la tinta del materiale e' quella dell'ORLO — la
       parte piu' chiara — e il colore del vertice la SPEGNE salendo.
       Uno per vertice: 1 in basso, 0,13 in cima. Fra i due three interpola. */
    /* 0,38 IN CIMA E NON 0,13, e il difetto era il SALTO, non il buio.
       La revisione ha misurato il profilo verticale: bordo della scocca a 49,6,
       poi dodici pixel piu' sotto 1,3. Un salto di trentotto volte, e sotto di
       li' il gradiente sale pulito — quindi il gradiente funziona e comincia
       nel posto sbagliato.
       Il bordo chiaro NON e' questo pezzo: e' l'orlo della carrozzeria, una
       superficie quasi orizzontale che prende la pedana. Verificato spegnendo
       un oggetto per volta. Quello sta bene dov'e' — su un'automobile vera il
       brancardo prende luce.
       Quello che manca e' cio' che sta FRA i due. Su un'auto vera, sotto il
       brancardo, l'ombra si approfondisce per qualche centimetro invece di
       spegnersi in un pixel: e' il raccordo che dice che i due pezzi si
       toccano. A 0,13 la cima era gia' buio pieno e il raccordo non esisteva.
       Resta comunque molto piu' scura dell'orlo (0,38 contro 1), quindi la
       direzione della luce non cambia e il vecchio avvertimento — «mettere
       luce in cima direbbe che sotto c'e' spazio» — continua a essere onorato:
       li' non si mette luce, si toglie il gradino. */
    colori.push(0.38, 0.38, 0.38)
    colori.push(1, 1, 1)
    /* E LE UV, che questa geometria non aveva: v = 1 in cima, 0 all'orlo.
       Servono alla mappa di emissione qui sotto — e' l'unico modo di sagomare
       l'emissione con three di serie, perche' `vertexColors` moltiplica il
       DIFFUSO e non l'emissione. */
    uv.push(0.5, 1)
    uv.push(0.5, 0)
    // la normale punta in fuori e un po' in basso, come la parete che descrive
    n.set(cx, -0.32 * f, cz).normalize()
    norm.push(n.x, n.y, n.z, n.x, n.y, n.z)
  }
  for (let k = 0; k < SETTORI; k++) {
    const a = k * 2
    const b = ((k + 1) % SETTORI) * 2
    indici.push(a, b, a + 1, b, b + 1, a + 1)
  }

  /* E IL FONDO SI CHIUDE con un ventaglio fino al centro. Senza, guardando da
     davanti e dal basso — che e' esattamente dove va la camera nel beat `lato`
     — si vedrebbe dentro la minigonna, cioe' dentro il vuoto. */
  const centro = punti.length / 3
  punti.push(0, orlo, 0)
  norm.push(0, -1, 0)
  // il vertice del fondo sta all'orlo, quindi prende il colore dell'orlo
  colori.push(1, 1, 1)
  uv.push(0.5, 0)
  for (let k = 0; k < SETTORI; k++) {
    indici.push(centro, ((k + 1) % SETTORI) * 2 + 1, k * 2 + 1)
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(punti), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array(norm), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(colori), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
  g.setIndex(indici)
  g.computeBoundingSphere()

  /* SCURO E OPACO, e non e' pigrizia: sotto un'automobile non arriva luce da
     nessuna direzione, e una minigonna che riflettesse qualcosa direbbe che
     sotto c'e' spazio — cioe' l'esatto contrario di quello che questo pezzo
     serve a dire. Ruvidita' quasi piena e nessun metallo: e' plastica opaca,
     come su una vettura vera. */
  const m = new MeshStandardMaterial({
    roughness: 0.92, metalness: 0.0,
    /* 0,95 E NON 0,18, ed e' la meta' che mancava.
       Col gradiente cotto nei vertici la minigonna passava da 0,5 a 1,5 su
       255: un gradiente c'era, e non si vedeva. Il motivo e' che a 0,18
       d'ambiente questo pezzo non RICEVE quasi niente — la tinta puo' essere
       quella che si vuole, se non c'e' luce non torna indietro nulla.
       E il rimando da terra esiste gia': `Panorama.ambienteConStrisce` ha due
       piani caldi a quota 0,12 che servono ai cerchi, che stanno esattamente
       qui sotto. Non serviva inventare una sorgente: serviva smettere di
       chiudere la porta a quella che c'era. */
    envMapIntensity: 0.95,
    vertexColors: true,
  })
  /* ============================================================ IL RIMANDO

     UNA ZONA COMPLETAMENTE NERA LEGGE COME UN BUCO, non come un'ombra.

     Il committente ha mandato un ingrandimento di sotto l'automobile: una lama
     chiara e piatta, e sotto il vuoto. Diagnosi spegnendo un oggetto per volta
     su quella fascia:

         con tutto            media 24,8   max 156
         senza SOTTOSCOCCA    media 86,3   max 253   <- il nero e' la minigonna
         senza AUTO           media 14,6

     E il profilo verticale diceva il resto: 32, poi 89 di lama, poi ZERO VIRGOLA
     CINQUE per tutta l'altezza della fascia. Non scuro: spento.

     Il commento che stava qui sbagliava nel merito. Diceva «sotto un'automobile
     non arriva luce da nessuna direzione»: non e' vero, e su questa scena meno
     che mai. La vettura sta su una pedana di pietra chiara e lucida, e una
     pedana chiara RIMANDA. E' lo stesso motivo per cui `ambienteConStrisce` ha
     gia' un rimando da terra per i cerchi, che stanno nello stesso posto.

     LA LUCE VIENE DAL BASSO, e va messa dove sta davvero: sull'ORLO. La cima e'
     la parte piu' incassata e resta la piu' scura — mettere luce li' direbbe che
     sotto c'e' spazio, che e' l'errore che il vecchio commento temeva, e su
     quello aveva ragione. Con il gradiente giusto la successione diventa: bordo
     scocca acceso, ombra profonda, un filo di pietra riflessa al contatto.
     Quella e' un'ombra. Il nero pieno era un ritaglio.

     FREDDO: la pietra della pedana e' grigio-azzurra, non ambra. Il rimando
     prende il suo colore, non quello delle gole calde. */
  m.color.setRGB(0.105, 0.120, 0.145)

  /* ============================================================ LA LUCE PROPRIA

     MOLTIPLICARE ZERO PER QUALUNQUE COSA DA' ZERO, ed e' la terza volta che
     questo progetto paga la stessa frase.

     Il gradiente cotto nei vertici c'era e non si vedeva: misurato, il bordo
     della scocca sta a 112 e dodici pixel piu' sotto la minigonna sta a 0,8 —
     un gradino di centoquaranta volte. Ho alzato il colore in cima da 0,13 a
     0,38 e il gradino non si e' mosso di un livello, perche' `vertexColors`
     moltiplica il DIFFUSO e il diffuso li' e' nullo: la minigonna non riceve
     luce da nessuna direzione, e l'avevo gia' verificato aprendole l'ambiente
     da 0,18 a 0,95 senza nessun effetto.

     Quindi la luce gliela si da'. Non e' un trucco: la pedana e' pietra chiara
     e lucida e MANDA SU davvero — quello che manca e' che la PMREM non ha
     parallasse, quindi non sa che sotto la vettura c'e' un piano vicino che
     rimanda. E' esattamente il caso in cui una sorgente dichiarata dice il vero
     meglio di una calcolata.

     SAGOMATA CON UNA MAPPA, non uniforme: `vertexColors` non tocca
     l'emissione, quindi il gradiente si rifa' come tessitura di 1x64 letta
     dalle UV appena aggiunte. Un'emissione piatta accenderebbe anche la cima,
     che deve restare la parte piu' scura — e direbbe che sotto c'e' spazio,
     che e' l'errore contro cui il primo commento di questo file metteva in
     guardia, e su quello aveva ragione.

     FREDDA: e' pietra grigio-azzurra riflessa, non le gole ambra della corte.
     E `toneMapped` resta acceso, al contrario delle insegne: quella e' una
     sorgente dichiarata che non deve spegnersi con la sera, questa e' una
     superficie illuminata e deve seguire l'esposizione come tutto il resto. */
  const gradino = document.createElement('canvas')
  gradino.width = 1
  gradino.height = 64
  const gc = gradino.getContext('2d')!
  for (let i = 0; i < 64; i++) {
    /* v = 0 e' l'ORLO e sta in fondo alla tessitura: la riga 63 e' v vicino a 1,
       cioe' la cima. La quarta potenza fa morire il rimando in fretta salendo,
       come fa la luce riflessa da un pavimento — lineare darebbe una fascia. */
    const v = i / 63
    /* SESTA POTENZA E NON QUARTA: con l'emissione bassa serve che quel poco
       stia tutto sull'ORLO invece di essere spalmato su tutta la fascia. Una
       caduta piu' ripida da' una riga di contatto, una piu' dolce da' un
       pannello — ed e' il pannello il difetto. */
    const f = Math.pow(1 - v, 6.0)
    const c = Math.round(f * 255)
    gc.fillStyle = 'rgb(' + c + ',' + c + ',' + c + ')'
    gc.fillRect(0, 63 - i, 1, 1)
  }
  const mappaRimando = new CanvasTexture(gradino)
  mappaRimando.colorSpace = SRGBColorSpace
  mappaRimando.minFilter = LinearFilter
  mappaRimando.magFilter = LinearFilter
  mappaRimando.generateMipmaps = false
  m.emissive.setRGB(0.62, 0.70, 0.86)
  m.emissiveMap = mappaRimando
  /* 0,12 E NON 0,95, ED E' UNA REGRESSIONE MIA CORRETTA DAL COMMITTENTE.
     A 0,95 la minigonna e' diventata un CUNEO CHIARO E PIATTO sotto
     l'automobile — «sembra un cartoncino incollato», e nel suo ingrandimento e'
     la cosa piu' evidente del fotogramma.
     L'errore non e' il numero: e' che l'ho tarato guardando UN TEMPO SOLO.
     Nell'orbita quella superficie e' quasi di taglio, quindi occupa pochi pixel
     e ne serve tanta per vederla; nel tre quarti basso e' di FACCIA, e la
     stessa quantita' si sfonda. Una luce PROPRIA si comporta cosi' per
     costruzione — non cambia con l'angolo, quindi e' fioca di taglio e violenta
     di faccia. E' esattamente il contrario di una superficie illuminata, che
     invece cala con il coseno.
     La lezione, e vale oltre questo pezzo: una manopola tarata su una sola
     inquadratura e' tarata sul caso in cui la si stava guardando. Da qui in poi
     questa si verifica su due tempi, e uno dei due dev'essere quello in cui il
     pezzo si vede di faccia.
     Resta acceso un filo — 0,12 — perche' il difetto di partenza era vero: a
     zero la fascia era 0,5 su 255, cioe' un ritaglio nero. Un filo sull'orlo
     racconta il contatto senza costruire un pannello. */
  m.emissiveIntensity = 0.12
  m.name = 'SOTTOSCOCCA'

  /* ============================================================ IL RIMANDO

     UNA ZONA COMPLETAMENTE NERA LEGGE COME UN BUCO, non come un'ombra.

     Il committente ha mandato un ingrandimento di sotto l'automobile: una lama
     chiara e piatta, e sotto il vuoto. Diagnosi spegnendo un oggetto per volta
     sulla fascia interessata:

         con tutto            media 24,8   max 156
         senza SOTTOSCOCCA    media 86,3   max 253   <- il nero e' la minigonna
         senza AUTO           media 14,6

     Il nero e' questo pezzo; la lama chiara e' il bordo inferiore della scocca,
     una superficie quasi orizzontale che prende la piattaforma. Il difetto non
     e' ne' l'uno ne' l'altra: e' la GIUNZIONE. Bordo acceso, poi zero, senza
     niente in mezzo.

     E il commento qui sopra sbagliava nel merito. Dice «sotto un'automobile non
     arriva luce da nessuna direzione»: non e' vero, e su questa scena meno che
     mai. La vettura sta su una pedana di pietra chiara e lucida, e una pedana
     chiara RIMANDA. Sotto un'auto vera si vede il pavimento illuminare il bordo
     basso della minigonna — e' il motivo per cui `ambienteConStrisce` ha gia'
     un rimando da terra per i cerchi, che stanno nello stesso posto.

     QUINDI LA LUCE VIENE DAL BASSO, e va messa dove sta davvero: sull'ORLO,
     non sulla cima. La cima e' la parte piu' incassata e deve restare la piu'
     scura — mettere luce li' direbbe che sotto c'e' spazio, che e' l'errore che
     il commento originale temeva. Con il gradiente giusto la successione
     diventa: bordo scocca acceso, ombra profonda, e un filo di pietra riflessa
     al contatto. Quella e' un'ombra. Il nero pieno era un ritaglio.

     FREDDO E BASSISSIMO. La pietra della pedana e' grigio-azzurra, non ambra:
     il rimando prende il suo colore, non quello delle gole calde. E sta a
     0,055, cioe' appena sopra la soglia di visibilita' — deve dire che li'
     c'e' una superficie, non illuminarla. */
  const mesh = new Mesh(g, m)
  mesh.name = 'SOTTOSCOCCA'
  mesh.castShadow = true
  mesh.receiveShadow = false
  return mesh
}
