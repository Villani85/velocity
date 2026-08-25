import {
  BufferAttribute,
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
  for (let k = 0; k < SETTORI; k++) {
    indici.push(centro, ((k + 1) % SETTORI) * 2 + 1, k * 2 + 1)
  }

  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(punti), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array(norm), 3))
  g.setIndex(indici)
  g.computeBoundingSphere()

  /* SCURO E OPACO, e non e' pigrizia: sotto un'automobile non arriva luce da
     nessuna direzione, e una minigonna che riflettesse qualcosa direbbe che
     sotto c'e' spazio — cioe' l'esatto contrario di quello che questo pezzo
     serve a dire. Ruvidita' quasi piena e nessun metallo: e' plastica opaca,
     come su una vettura vera. */
  const m = new MeshStandardMaterial({ roughness: 0.92, metalness: 0.0, envMapIntensity: 0.18 })
  m.color.setRGB(0.016, 0.018, 0.022)
  m.name = 'SOTTOSCOCCA'
  const mesh = new Mesh(g, m)
  mesh.name = 'SOTTOSCOCCA'
  mesh.castShadow = true
  mesh.receiveShadow = false
  return mesh
}
