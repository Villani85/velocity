import {
  Box3,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/**
 * I MODELLI GENERATI, e come si domano.
 *
 * Un modello che esce da un generatore arriva con scala arbitraria,
 * orientamento arbitrario e origine arbitraria. Non e' un difetto: e' che
 * non c'e' nessuno a decidere quelle cose. Fidarsi di quello che arriva
 * significa avere un'auto lunga 0,98 unita' girata di lato e sospesa, e
 * accorgersene ogni volta da capo.
 *
 * Quindi si NORMALIZZA per misura: si legge l'ingombro, si porta l'asse
 * piu' lungo alla lunghezza vera, si appoggia a terra. Cosi' rigenerare
 * l'asset non richiede di ritoccare niente — ed e' importante, perche' con
 * i generatori si rigenera spesso.
 */

const caricatore = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)

export type Normalizzazione = {
  /** quanto deve essere lungo l'asse maggiore, in metri */
  lunghezza: number
  /** rotazioni in radianti, applicate prima di misurare l'appoggio */
  rotY?: number
  rotX?: number
  /** dove va messo il centro, a terra */
  posa?: [number, number, number]
  /** true = si appoggia il fondo a y=0; false = si centra */
  aTerra?: boolean
  /**
   * SU CHE QUOTA SI APPOGGIA, in metri sopra il pavimento.
   *
   * Esisteva come `0.24` scritto a mano qui dentro, con accanto il commento
   * «la piattaforma e' alta ventiquattro centimetri e l'auto ci sta SOPRA».
   * La piattaforma poi e' stata rifatta e adesso e' alta UNDICI: il commento
   * era rimasto giusto, il numero no, e l'automobile e' rimasta sospesa tredici
   * centimetri sopra il suo basamento per tutto il tempo.
   * Il committente l'ha vista subito — «l'auto non e' sulla piattaforma ma
   * sembra troppo sospesa» — e una revisione esterna l'aveva letta come
   * «niente contact shadow, galleggia», attribuendola alle ruote mancanti.
   * Non erano le ruote: erano tredici centimetri di aria.
   * Adesso la quota non e' piu' una costante di questo file, la passa chi sa
   * dove sta il pavimento — cosi' se la piattaforma cambia ancora, cambia una
   * cosa sola.
   */
  appoggio?: number
}

/**
 * IL MODELLO COM'E', senza normalizzare.
 *
 * `caricaNormalizzato` misura e riscala per portare l'asse maggiore a una
 * lunghezza data: e' cio' che serve per l'automobile, che deve stare in una
 * scena a misure reali. Per un pezzo che va montato DENTRO un altro oggetto —
 * una ruota nel suo arco — quella normalizzazione e' di troppo: chi lo monta
 * conosce gia' la misura che vuole e se la calcola dalla scatola d'ingombro.
 * Passandoci comunque la ruota il fattore usciva ZERO e il pezzo collassava in
 * un punto, invisibile e senza errori.
 */
export async function caricaGrezzo(url: string) {
  const gltf = await caricatore.loadAsync(url)
  gltf.scene.updateWorldMatrix(true, true)
  return gltf.scene
}

export async function caricaNormalizzato(url: string, n: Normalizzazione) {
  const gltf = await caricatore.loadAsync(url)
  const dentro = gltf.scene

  // un gruppo esterno porta la posa; quello interno porta scala e centratura.
  // Separarli evita il pasticcio classico in cui ruotare cambia anche dove
  // l'oggetto tocca terra.
  const perno = new Group()
  const corpo = new Group()
  corpo.add(dentro)
  perno.add(corpo)

  if (n.rotX) dentro.rotation.x = n.rotX
  if (n.rotY) dentro.rotation.y = n.rotY
  dentro.updateWorldMatrix(true, true)

  const scatola = new Box3().setFromObject(dentro)
  const misura = new Vector3()
  const centro = new Vector3()
  scatola.getSize(misura)
  scatola.getCenter(centro)

  const maggiore = Math.max(misura.x, misura.y, misura.z)
  const k = n.lunghezza / (maggiore || 1)
  corpo.scale.setScalar(k)

  // si porta il centro nell'origine, poi eventualmente si appoggia
  dentro.position.sub(centro)
  if (n.aTerra !== false) perno.position.y = (misura.y / 2) * k
  // e si appoggia sul piano della piattaforma, non sul pavimento: un'auto che
  // sprofonda dentro il suo basamento — o che ci galleggia sopra — e'
  // esattamente il tipo di difetto che si nota senza saperlo nominare
  if (n.aTerra !== false) perno.position.y += n.appoggio ?? 0

  if (n.posa) perno.position.add(new Vector3(...n.posa))

  return { perno, misura: misura.clone().multiplyScalar(k) }
}

/**
 * I MATERIALI DEI GENERATI VANNO CORRETTI, sempre le stesse due cose.
 *
 * Arrivano con `metalness` alta e `roughness` alta insieme — una
 * combinazione che non esiste in natura e che produce superfici morte. E'
 * la stessa diagnosi che ho sbagliato tre volte sul progetto precedente
 * prima di impararla.
 *
 * Qui non si buttano le mappe, che sono il lavoro vero del generatore: si
 * correggono i due numeri e si lascia che le tessiture facciano il resto.
 */
export function correggiMateriali(radice: Object3D, opzioni: {
  metallo?: number
  ruvidita?: number
  riflesso?: number
  /** il trasparente sopra la vernice: solo per la carrozzeria */
  trasparente?: number
  trasparenteRuvidita?: number
} = {}) {
  radice.traverse((o) => {
    const mesh = o as Mesh
    const m = mesh.material as MeshStandardMaterial | undefined
    if (!m || !m.isMeshStandardMaterial) return

    if (opzioni.trasparente) {
      // UNA CARROZZEONERIA HA IL TRASPARENTE SOPRA, e senza quello nessuna
      // tessitura sembra vernice.
      //
      // La vernice di un'auto e' due strati: il colore, opaco e pieno, e
      // sopra una resina limpida spessa un decimo di millimetro. Il
      // riflesso nitido che si vede su una fiancata non viene dal colore —
      // viene da quella. Un materiale a strato solo puo' essere lucido, ma
      // e' lucido come una plastica: il riflesso e' dello stesso colore
      // della vernice, mentre sulla vernice vera e' bianco e ci scivola
      // sopra.
      //
      // Ed e' la ragione per cui aumentare la risoluzione delle tessiture
      // non bastava: il problema non era quanti pixel, era che mancava uno
      // strato.
      const f = new MeshPhysicalMaterial({
        map: m.map,
        normalMap: m.normalMap,
        roughnessMap: m.roughnessMap,
        metalnessMap: m.metalnessMap,
        // 1 e 1: i FATTORI moltiplicano le mappe, e abbassarli significa
        // buttare via l'informazione che il generatore ha prodotto. Prima
        // erano 0,35 e 0,28, cioe' stavo scartando due terzi della mappa
        // di metallicita' senza accorgermene.
        metalness: opzioni.metallo ?? 1.0,
        roughness: opzioni.ruvidita ?? 1.0,
        clearcoat: opzioni.trasparente,
        clearcoatRoughness: opzioni.trasparenteRuvidita ?? 0.06,
        envMapIntensity: opzioni.riflesso ?? 1.0,
      })
      f.normalScale.copy(m.normalScale)
      mesh.material = f
      return
    }

    if (opzioni.metallo !== undefined) m.metalness = opzioni.metallo
    if (opzioni.ruvidita !== undefined) m.roughness = opzioni.ruvidita
    m.envMapIntensity = opzioni.riflesso ?? 1.0
    m.needsUpdate = true
  })
}
