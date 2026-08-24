import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Vector2,
} from 'three'

/**
 * LA RUOTA SI COSTRUISCE, NON SI SCARICA.
 *
 * IL DIFETTO, guardato ingrandito. `ruota.glb` arriva da un generatore e sono
 * 28.700 triangoli di RUMORE: il bordo del pneumatico e' frastagliato invece
 * che circolare, la spalla ondeggia, e il cerchio e' un grumo in cui non si
 * distingue una razza. Il committente: «le ruote fanno schifo». Ingrandendo il
 * provino non c'e' niente da discutere — sembra un sasso, non una gomma.
 * E non e' un problema di materiale: nessuna ruvidita' raddrizza una
 * circonferenza storta. Ci avevo provato tre volte.
 *
 * PERCHE' COSTRUIRLA E' LA SCELTA GIUSTA QUI, e non lo e' quasi mai altrove.
 * Una carrozzeria non si costruisce a mano: e' una superficie libera, e
 * scriverla in codice vorrebbe dire modellare col compilatore. Una RUOTA e'
 * l'opposto — e' un solido di rivoluzione con dentro una simmetria a raggiera.
 * E' fatta di cerchi. Un cerchio scritto in codice e' esatto per costruzione,
 * mentre un cerchio generato da un'intelligenza artificiale e' un poligono
 * che gli somiglia. Su una silhouette contro un fondo chiaro la differenza si
 * vede subito, perche' il bordo di una ruota e' la cosa piu' facile da leggere
 * di tutta l'automobile.
 *
 * E COSTA MENO DI NIENTE: toglie 297 kB dal percorso critico e scende da
 * 28.700 triangoli a poche migliaia. Quattro ruote istanziate facevano da sole
 * 114.000 triangoli contro i 106.000 della carrozzeria — sproporzionato di
 * dieci volte, come aveva notato una revisione esterna.
 *
 * COSA DEVE AVERE, dalla revisione, e adesso c'e':
 *   - razze VERE con profondita', non un disco con una tessitura;
 *   - disco freno e pinza dietro le razze: e' la parallasse fra i due piani a
 *     dare profondita' quando la ruota gira;
 *   - spalla del pneumatico BOMBATA, non cilindrica — una gomma vera si gonfia
 *     fra il cerchio e il battistrada, e quel rigonfiamento e' cio' che la fa
 *     leggere gonfia d'aria invece che tornita nel pieno;
 *   - un dado centrale.
 *
 * GLI ASSI. L'asse del mozzo e' orizzontale e punta verso l'ESTERNO della
 * vettura, cioe' lungo Z; la ruota rotola nel piano X-Y. `LatheGeometry` nasce
 * con l'asse lungo Y, quindi il gruppo va ruotato di 90 gradi intorno a X, e
 * quella e' l'unica rotazione che serve. Sbagliarla non da' errore: da' una
 * ruota di taglio.
 */

/** raggio esterno del pneumatico, in metri veri */
export const RAGGIO_RUOTA = 0.354
/** larghezza del pneumatico da spalla a spalla */
export const LARGHEZZA_RUOTA = 0.215
const LARGHEZZA = LARGHEZZA_RUOTA
/** dove finisce il cerchio e comincia la gomma */
const RAGGIO_CERCHIO = 0.248

const meta = LARGHEZZA / 2

/**
 * IL PROFILO DEL PNEUMATICO, in coordinate (raggio, posizione lungo l'asse).
 *
 * Non e' un rettangolo. Da dentro verso fuori: il tallone stringe sul cerchio,
 * la spalla si GONFIA oltre la larghezza del battistrada, il fianco rientra
 * verso il battistrada, e il battistrada e' quasi piatto. E' quella pancia a
 * meta' altezza a dire «gomma»: un cilindro dice «tornito».
 */
const PROFILO_GOMMA = [
  [RAGGIO_CERCHIO, -meta * 0.86],
  [0.272, -meta * 0.94],
  [0.298, -meta * 1.00],
  [0.322, -meta * 0.99],
  [0.340, -meta * 0.92],
  [0.350, -meta * 0.80],
  [RAGGIO_RUOTA, -meta * 0.62],
  [RAGGIO_RUOTA, meta * 0.62],
  [0.350, meta * 0.80],
  [0.340, meta * 0.92],
  [0.322, meta * 0.99],
  [0.298, meta * 1.00],
  [0.272, meta * 0.94],
  [RAGGIO_CERCHIO, meta * 0.86],
].map(([r, a]) => new Vector2(r, a))

/**
 * IL PROFILO DEL CANALE DEL CERCHIO. Rientra verso il centro e torna a
 * salire: e' quella gola a far leggere «cerchio dentro la gomma» invece che
 * «disco appoggiato sopra».
 */
const PROFILO_CERCHIO = [
  [RAGGIO_CERCHIO, meta * 0.86],
  [RAGGIO_CERCHIO - 0.006, meta * 0.72],
  [0.222, meta * 0.30],
  [0.216, -meta * 0.10],
  [0.224, -meta * 0.55],
  [RAGGIO_CERCHIO - 0.004, -meta * 0.80],
  [RAGGIO_CERCHIO, -meta * 0.86],
].map(([r, a]) => new Vector2(r, a))

export type MaterialiRuota = {
  gomma: MeshStandardMaterial
  cerchio: MeshPhysicalMaterial
  disco: MeshStandardMaterial
}

/**
 * Materiali della ruota, in un posto solo.
 *
 * LA GOMMA NON E' NERO PIENO. Un nero assoluto sparisce dentro l'ombra della
 * carena e la ruota perde il bordo; una gomma vera sta intorno al 3-4% di
 * riflettanza. E ha `sheen`, che e' il riflesso radente e morbido del
 * caucciu': senza, la sola ruvidita' alta da' una plastica opaca.
 */
export function materialiRuota(): MaterialiRuota {
  const gomma = new MeshStandardMaterial({ roughness: 0.92, metalness: 0 })
  gomma.color.setRGB(0.030, 0.030, 0.032)
  gomma.envMapIntensity = 0.22
  gomma.name = 'GOMMA_VERA'

  /* IL CERCHIO — alluminio, non cromo. Sul metallo il colore base E' la
     riflettanza: 0,55 e' una lega scura lavorata, 0,90 sarebbe argento
     lucidato. E la ruvidita' resta alta apposta: le sorgenti di questa scena
     sono `RectAreaLight` forti e fredde, e un metallo troppo liscio le
     restituisce come un colpo concentrato — che nel provino leggeva come un
     disco ciano acceso, non come un cerchio. */
  const cerchio = new MeshPhysicalMaterial({ roughness: 0.42, metalness: 1.0 })
  /* APPENA CALDA, non neutra. Un metallo non ha colore proprio: restituisce
     quello che riceve, e le sorgenti di questa scena sono `RectAreaLight`
     fredde — quindi una lega neutra usciva AZZURRA, e un cerchio azzurro
     legge come plastica verniciata, non come alluminio.
     Non e' un trucco: l'alluminio lavorato ha davvero una punta calda
     (0,91/0,92/0,92 nelle tabelle di Filament, cioe' rosso appena piu' alto
     del blu). Qui la si accentua quel tanto che basta a bilanciare la
     temperatura della chiave. */
  cerchio.color.setRGB(0.575, 0.560, 0.535)
  cerchio.envMapIntensity = 0.30
  cerchio.name = 'CERCHIO_VERO'

  /* IL DISCO FRENO sta in ombra dietro le razze e non deve competere con
     loro: ghisa scura, quasi opaca. Serve a dare PROFONDITA', non a farsi
     guardare — e' la parallasse fra il piano delle razze e il suo a dire che
     la ruota e' cava. */
  const disco = new MeshStandardMaterial({ roughness: 0.62, metalness: 0.85 })
  disco.color.setRGB(0.10, 0.104, 0.112)
  disco.envMapIntensity = 0.22
  disco.name = 'DISCO_FRENO'

  return { gomma, cerchio, disco }
}

/**
 * Costruisce una ruota completa, centrata nell'origine, con l'asse lungo Z.
 *
 * @param M i materiali, condivisi fra le quattro ruote
 * @param verso -1 o +1: da che lato della vettura sta, cosi' la faccia bella
 *        del cerchio guarda verso l'esterno
 */
export function costruisciRuota(M: MaterialiRuota, verso: number): Group {
  const g = new Group()

  // il pneumatico
  const gomma = new Mesh(new LatheGeometry(PROFILO_GOMMA, 64), M.gomma)
  // `LatheGeometry` gira intorno a Y; l'asse del mozzo e' Z. Novanta gradi
  // intorno a X portano Y su Z, ed e' l'unica rotazione che serve.
  gomma.rotation.x = Math.PI / 2
  gomma.name = 'GOMMA_VERA'
  g.add(gomma)

  // il canale del cerchio
  const canale = new Mesh(new LatheGeometry(PROFILO_CERCHIO, 48), M.cerchio)
  canale.rotation.x = Math.PI / 2
  canale.name = 'CERCHIO_VERO'
  g.add(canale)

  /* LA FACCIA DEL CERCHIO, e sta INFOSSATA rispetto al bordo del pneumatico.
     Su una ruota vera il battistrada sporge oltre il cerchio: mettendola a
     filo, o peggio in fuori, si ottiene la lettura «moneta appoggiata sulla
     gomma», che e' precisamente il difetto della ruota di segnale che questa
     sostituisce. */
  const faccia = meta * 0.55 * verso

  // il cerchietto esterno, quello che prende la luce di taglio
  const labbro = new Mesh(new RingGeometry(0.230, RAGGIO_CERCHIO - 0.002, 64), M.cerchio)
  labbro.position.z = meta * 0.84 * verso
  labbro.rotation.y = verso < 0 ? Math.PI : 0
  labbro.name = 'CERCHIO_VERO'
  g.add(labbro)

  /* LE RAZZE — DIECI, A COPPIE. Cinque razze larghe leggono come una stella e
     su una ruota piccola diventano un disco con dei tagli; dieci sottili
     accoppiate danno la trama fitta delle ruote da corsa, e soprattutto
     restano leggibili anche quando la ruota e' larga sessanta pixel — che e'
     la dimensione vera nel fotogramma della hero.
     Hanno SPESSORE (0,026 x 0,030) e non sono piatte: e' lo spessore a
     prendere una luce diversa sul fianco rispetto alla faccia, ed e' quella
     differenza a dire «pezzo lavorato». */
  const RAZZE = 10
  const lung = 0.230 - 0.052
  for (let i = 0; i < RAZZE; i++) {
    const razza = new Mesh(new BoxGeometry(0.026, lung, 0.030), M.cerchio)
    const ang = (i * Math.PI * 2) / RAZZE + (i % 2 ? 0.13 : -0.13)
    razza.position.set(
      Math.cos(ang + Math.PI / 2) * (0.052 + lung / 2),
      Math.sin(ang + Math.PI / 2) * (0.052 + lung / 2),
      faccia,
    )
    razza.rotation.z = ang
    razza.name = 'CERCHIO_VERO'
    g.add(razza)
  }

  // il mozzo, e il dado centrale che ci sta sopra
  const mozzo = new Mesh(new CylinderGeometry(0.054, 0.058, 0.052, 24), M.cerchio)
  mozzo.rotation.x = Math.PI / 2
  mozzo.position.z = faccia
  mozzo.name = 'CERCHIO_VERO'
  g.add(mozzo)

  const dado = new Mesh(new CylinderGeometry(0.028, 0.030, 0.026, 6), M.disco)
  dado.rotation.x = Math.PI / 2
  dado.position.z = faccia + 0.030 * verso
  dado.name = 'DISCO_FRENO'
  g.add(dado)

  /* IL DISCO FRENO, dietro le razze e piu' dentro: la distanza fra i due
     piani e' il punto. Con disco e razze complanari non si vedrebbe nessuna
     profondita', solo un disegno piatto. */
  const disco = new Mesh(new CylinderGeometry(0.196, 0.196, 0.016, 40), M.disco)
  disco.rotation.x = Math.PI / 2
  disco.position.z = faccia - 0.052 * verso
  disco.name = 'DISCO_FRENO'
  g.add(disco)

  // la pinza: un blocco che rompe la simmetria e dice «meccanica»
  const pinza = new Mesh(new BoxGeometry(0.062, 0.115, 0.052), M.disco)
  pinza.position.set(0.055, 0.150, faccia - 0.052 * verso)
  pinza.rotation.z = -0.34
  pinza.name = 'DISCO_FRENO'
  g.add(pinza)

  /* IL FONDO DELLA CAVITA'. Senza, guardando la ruota di tre quarti si vede
     attraverso: fra le razze si intravede lo sfondo della scena, e una ruota
     trasparente e' peggio di una ruota brutta. */
  const fondo = new Mesh(new CylinderGeometry(0.235, 0.235, 0.004, 40), M.disco)
  fondo.rotation.x = Math.PI / 2
  fondo.position.z = faccia - 0.075 * verso
  fondo.material = M.disco
  fondo.name = 'DISCO_FRENO'
  const mat = fondo.material as MeshStandardMaterial
  mat.side = DoubleSide
  g.add(fondo)

  g.name = 'RUOTA_COSTRUITA'
  return g
}
