import {
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderTarget,
  LinearFilter,
  LinearMipmapLinearFilter,
  AdditiveBlending,
  type Camera,
  type Scene,
  type WebGLRenderer,
  type Texture,
} from 'three'

/**
 * IL RIFLESSO A TERRA.
 *
 * PERCHE' E' LA COSA CHE MANCAVA DI PIU', misurata sul provino: sotto
 * l'auto non c'e' l'auto. C'e' del marmo, c'e' un'ombra, e sopra il marmo
 * non si specchia niente. Nella fotografia di riferimento il riflesso
 * allungato pesa quanto la vettura — e' meta' dell'immagine.
 *
 * E fa due mestieri, non uno:
 *
 *   ANCORA. Un oggetto che si specchia sta appoggiato per forza: il
 *   riflesso parte esattamente dal punto di contatto, e finche' parte da li'
 *   non c'e' modo che l'occhio lo legga come sovrapposto. E' un rimedio piu'
 *   forte dell'ombra, perche' l'ombra dice DOVE tocca e il riflesso dice
 *   anche COM'E' fatto sotto.
 *
 *   RADDOPPIA LA LUCE. Un pannello acceso da una parte sola illumina meta'
 *   scena; lo stesso pannello sopra un pavimento lucido illumina anche da
 *   sotto, perche' il pavimento lo rimanda su. E' il motivo per cui gli
 *   studi di still-life automobilistico hanno il pavimento nero lucido: non
 *   e' scenografia, e' un quinto pannello.
 *
 * COME FUNZIONA, in tre righe.
 *
 * Si costruisce una camera VIRTUALE, che sta sotto il pavimento nella
 * posizione speculare di quella vera, e si renderizza la scena da li' in una
 * tessitura. Poi il pavimento campiona quella tessitura usando la propria
 * posizione sullo schermo. Non e' un trucco: e' la definizione geometrica di
 * specchio.
 *
 * IL PIANO DI TAGLIO OBLIQUO E' LA PARTE CHE NON SI INDOVINA.
 *
 * Senza, la camera virtuale vede anche quello che sta SOPRA il pavimento nel
 * mondo vero — cioe' le ruote, il sotto-scocca, il muro — e li disegna nel
 * riflesso a rovescio: compaiono oggetti che spuntano da sotto il pavimento
 * e non si capisce da dove vengano. Si deforma la matrice di proiezione
 * perche' il suo piano vicino coincida col pavimento: cosi' tutto cio' che
 * sta sotto e' tagliato via dall'hardware, gratis.
 *
 * PERCHE' NON E' UNO SPECCHIO PERFETTO.
 *
 * Un pavimento in marmo lucidato non e' un lago. Tre correzioni, e sono le
 * tre che separano «riflesso» da «specchio da bagno»:
 *
 *   1. LA PIETRA SPEZZA. Si sposta la lettura con la stessa mappa di
 *      normali del marmo. Le venature e le imperfezioni della lastra
 *      spostano il riflesso di poco e in modo irregolare — ed e' proprio
 *      quell'irregolarita' a farlo leggere come pietra invece che come
 *      vetro.
 *
 *   2. SI SFOCA CON LA DISTANZA. Piu' un oggetto e' lontano dal punto di
 *      contatto, piu' il suo riflesso e' sfocato: e' la ruvidita' che
 *      allarga il cono di riflessione, e su venti metri diventa una
 *      strisciata. Qui si ottiene chiedendo alla tessitura un livello di
 *      dettaglio piu' grezzo — costa zero perche' le mipmap ci sono gia'.
 *
 *   3. FRESNEL. Di striscio uno specchio riflette quasi tutto, dall'alto
 *      quasi niente. E' la ragione fisica per cui la camera bassa e il
 *      riflesso lungo vanno insieme: l'inquadratura da novanta centimetri
 *      non e' solo piu' bella, e' anche quella che ACCENDE il pavimento.
 *
 * SI SOMMA, NON SI MESCOLA. Il riflesso e' luce che arriva in piu' da sotto,
 * quindi additivo sopra il marmo. Mescolarlo cancellerebbe le venature
 * proprio dove il riflesso e' forte, che e' l'opposto di quel che succede.
 */

const VERT = /* glsl */ `
uniform mat4 matriceTessitura;
varying vec4 vProiezione;
varying vec2 vUv;
varying vec3 vMondo;
void main() {
  vUv = uv;
  vec4 mondo = modelMatrix * vec4(position, 1.0);
  vMondo = mondo.xyz;
  vProiezione = matriceTessitura * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * mondo;
}
`

const FRAG = /* glsl */ `
uniform sampler2D specchio;
uniform sampler2D normaliPietra;
uniform vec2 ripetizionePietra;
uniform float forza;
uniform float disturbo;
uniform float sfocatura;
uniform float raggioDisco;
varying vec4 vProiezione;
varying vec2 vUv;
varying vec3 vMondo;

void main() {
  // la pietra sposta la lettura: e' cio' che distingue marmo da vetro
  vec3 n = texture2D(normaliPietra, vUv * ripetizionePietra).xyz * 2.0 - 1.0;
  vec2 scarto = n.xy * disturbo;

  vec2 uv = (vProiezione.xy / vProiezione.w) * 0.5 + 0.5 + scarto;

  // FRESNEL. L'angolo fra lo sguardo e il pavimento decide quanto si
  // specchia: di striscio quasi tutto, a piombo quasi niente.
  vec3 verso = normalize(cameraPosition - vMondo);
  float radente = 1.0 - clamp(verso.y, 0.0, 1.0);
  // ESPONENTE 4,2 E NON 3,2: il riflesso si concentra sul radente vero.
  //
  // Con 3,2 il pavimento restituiva parecchio anche a quaranta gradi
  // d'incidenza, e su un piano che occupa mezzo fotogramma quel «parecchio»
  // diventa un velo chiaro dappertutto. La riflettanza di Fresnel di un
  // dielettrico e' molto piu' brusca: resta bassa fino a sessanta gradi e poi
  // sale in fretta. Un esponente piu' alto la avvicina, e in cambio il
  // riflesso lungo — quello che si allunga verso l'orizzonte — resta intatto.
  float fresnel = pow(radente, 2.1);

  // LA DISTANZA SFOCA. Il livello di dettaglio richiesto cresce con la
  // lontananza: da vicino il riflesso e' netto, in fondo e' una strisciata.
  float lontano = clamp(length(cameraPosition.xz - vMondo.xz) / 26.0, 0.0, 1.0);
  float livello = sfocatura * (0.35 + lontano * 3.2);

  vec3 c = texture2D(specchio, uv, livello).rgb;

  // SI LIMITA CIO' CHE SI SPECCHIA, e non e' un trucco: e' quello che fa la
  // pietra.
  //
  // Il riflesso e' additivo e sfocato. Una sorgente molto luminosa — una gola
  // di luce, un faro — entra nel campione con un valore altissimo, la
  // sfocatura lo spalma su decine di pixel, e sul pavimento compare una
  // colonna chiara che non ha nessuna sorgente visibile che la giustifichi.
  // Nel provino e' una striscia di luce davanti all'auto che sembra un
  // difetto del motore.
  //
  // Un marmo lucidato non e' uno specchio da telescopio: la sua riflettivita'
  // e' limitata (attorno al 6-8% a incidenza normale) e la microstruttura
  // della pietra disperde i valori estremi. Limitare a 1,4 e' l'espressione
  // numerica di quel comportamento, e toglie di colpo l'unico artefatto che
  // rendeva il pavimento poco credibile.
  c = min(c, vec3(1.4));

  // e in fondo svanisce del tutto, se no il pavimento diventa un lago fino
  // all'orizzonte e la scena perde il suo peso
  float sfuma = 1.0 - smoothstep(0.35, 1.0, lontano);

  // IL RITAGLIO AL DISCO. Sfuma sugli ultimi dodici centimetri: un bordo
  // netto su un riflesso e' un taglio che si vede, perche' nella realta' la
  // riflettivita' di una pietra non finisce mai su una linea.
  float disco = raggioDisco > 0.0
    ? 1.0 - smoothstep(raggioDisco - 0.12, raggioDisco, length(vMondo.xz))
    : 1.0;

  gl_FragColor = vec4(c * forza * fresnel * sfuma * disco, 1.0);
}
`

export class Riflesso {
  readonly mesh: Mesh
  private bersaglio: WebGLRenderTarget
  private cameraFinta = new PerspectiveCamera()
  private materiale: ShaderMaterial

  private posSpecchio = new Vector3()
  private posCamera = new Vector3()
  private normale = new Vector3()
  private rotazione = new Matrix4()
  private guarda = new Vector3()
  private vista = new Vector3()
  private mira = new Vector3()
  private piano = new Plane()
  private taglio = new Vector4()
  private q = new Vector4()
  /**
   * Si aprono al pubblico perche' il riflesso non e' piu' solo un piano
   * additivo appoggiato sopra: e' anche la sorgente da cui il PIANO DELLA
   * PIATTAFORMA prende il suo specchio, dentro il proprio materiale. Vedi
   * `Piattaforma.applicaSpecchio` per il motivo — in due parole: sommare non
   * basta, un'automobile nera deve poter SPEGNERE il riflesso della villa, e
   * la somma non spegne niente.
   */
  readonly matriceTessitura = new Matrix4()

  /**
   * LA STESSA PROIEZIONE, MA PARTENDO DAL MONDO.
   *
   * `matriceTessitura` finisce moltiplicata per `mesh.matrixWorld`, perche' lo
   * shader del piano additivo le passa la posizione LOCALE del vertice. Chi
   * campiona da un altro oggetto — il piano della piattaforma — ha in mano una
   * posizione di MONDO, e passandogliela si applicherebbe due volte la matrice
   * del piano: il riflesso finisce ruotato di novanta gradi e traslato, e
   * l'effetto e' che sotto l'automobile si vede il cielo invece
   * dell'automobile.
   *
   * Sono due matrici e non una perche' sono due domande diverse: «dove cade
   * questo punto del mio piano» e «dove cade questo punto del mondo».
   */
  readonly matriceMondo = new Matrix4()

  /** si spegne dentro l'abitacolo: li' il pavimento non si vede e costa e basta */
  attivo = true

  /** l'immagine del mondo vista da sotto il piano */
  get immagine() { return this.bersaglio.texture }

  /**
   * `quota` e' l'altezza del piano che specchia, `raggio` il disco fuori dal
   * quale non specchia piu' niente.
   *
   * Nascono tutti e due dallo stesso difetto, che e' istruttivo perche' non
   * si vedeva come un difetto. Lo specchio stava a un millimetro da terra —
   * giusto, finche' l'auto stava per terra. Poi e' arrivata la piattaforma,
   * alta ventiquattro centimetri, e l'auto e' salita sopra: da quel momento
   * il riflesso continuava a essere disegnato SOTTO la piattaforma, dove non
   * lo vedeva nessuno, e il piano della piattaforma restava un disco grigio
   * uniforme. Sembrava un materiale sbagliato — infatti avevo cominciato a
   * ritoccare ruvidita' e colore — ed era invece un oggetto nuovo che aveva
   * scavalcato un'ipotesi vecchia di un altro file.
   *
   * Il ritaglio serve perche' un piano solo non puo' stare a due altezze. Il
   * riflesso alzato, se non lo si ferma, diventa una mensola a specchio
   * sospesa sopra la terrazza fotografata. Oltre il bordo del disco la
   * terrazza si specchia da sola: e' una fotografia di pietra bagnata, i
   * riflessi ce li ha gia' dentro.
   */
  constructor(lato: number, normaliPietra: Texture, risoluzione = 0.5, quota = 0.001, raggio = 0) {
    // MEZZA RISOLUZIONE, e non e' un compromesso: e' corretto.
    //
    // Il riflesso e' gia' sfocato dalla ruvidita' della pietra. Renderizzarlo
    // a piena risoluzione significa calcolare dettaglio che il passaggio
    // successivo butta via. A meta' costa un quarto e non si distingue.
    this.bersaglio = new WebGLRenderTarget(1, 1, {
      minFilter: LinearMipmapLinearFilter,
      magFilter: LinearFilter,
      generateMipmaps: true,
    })
    this.risoluzione = risoluzione

    // NON SI CLONA LA TESSITURA, e il difetto era muto.
    //
    // `clone()` copia i parametri ma NON l'immagine, che al momento della
    // costruzione non e' ancora scaricata: il caricatore la deposita poi
    // sull'originale, e la copia resta vuota per sempre. Three lo dice con
    // un avviso che sembra innocuo — «Texture marked for update but no image
    // data found» — e il riflesso esce senza venatura, cioe' da specchio.
    // Si usa la stessa tessitura del pavimento: e' anche l'unico modo per
    // essere sicuri che le due venature combacino.
    const n = normaliPietra

    this.materiale = new ShaderMaterial({
      uniforms: {
        specchio: { value: this.bersaglio.texture },
        normaliPietra: { value: n },
        // la lastra si ripete meno del marmo di base: il disturbo del
        // riflesso deve leggersi come venatura larga, non come sabbia
        ripetizionePietra: { value: { x: 7, y: 7 } },
        matriceTessitura: { value: this.matriceTessitura },
        forza: { value: 1.15 },
        disturbo: { value: 0.010 },
        sfocatura: { value: 0.62 },
        raggioDisco: { value: raggio },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      // additivo: e' luce che torna su dal pavimento, non una vernice
      blending: AdditiveBlending,
      depthWrite: false,
    })

    const g = new PlaneGeometry(lato, lato)
    this.mesh = new Mesh(g, this.materiale)
    this.mesh.rotation.x = -Math.PI / 2
    // un millimetro e mezzo sopra la pietra: sullo stesso piano i due
    // z-fightano, e la superficie sfarfalla a scacchiera
    this.mesh.position.y = quota
    this.mesh.name = 'RIFLESSO'
    this.mesh.matrixAutoUpdate = true
    this.mesh.onBeforeRender = () => {}
  }

  private risoluzione: number

  ridimensiona(larghezza: number, altezza: number) {
    this.bersaglio.setSize(
      Math.max(2, Math.floor(larghezza * this.risoluzione)),
      Math.max(2, Math.floor(altezza * this.risoluzione)),
    )
  }

  /** va chiamato PRIMA del render vero, dal ciclo */
  aggiorna(renderer: WebGLRenderer, scena: Scene, camera: Camera) {
    this.mesh.visible = this.attivo
    if (!this.attivo) return

    const finta = this.cameraFinta
    this.posSpecchio.setFromMatrixPosition(this.mesh.matrixWorld)
    this.posCamera.setFromMatrixPosition(camera.matrixWorld)

    this.rotazione.extractRotation(this.mesh.matrixWorld)
    this.normale.set(0, 0, 1).applyMatrix4(this.rotazione)

    this.vista.subVectors(this.posSpecchio, this.posCamera)
    // la camera e' sotto il pavimento: non c'e' niente da specchiare
    if (this.vista.dot(this.normale) > 0) return
    this.vista.reflect(this.normale).negate().add(this.posSpecchio)

    this.rotazione.extractRotation(camera.matrixWorld)
    this.guarda.set(0, 0, -1).applyMatrix4(this.rotazione).add(this.posCamera)
    this.mira.subVectors(this.posSpecchio, this.guarda)
    this.mira.reflect(this.normale).negate().add(this.posSpecchio)

    finta.position.copy(this.vista)
    finta.up.set(0, 1, 0).applyMatrix4(this.rotazione).reflect(this.normale)
    finta.lookAt(this.mira)
    const vera = camera as PerspectiveCamera
    finta.far = vera.far
    finta.updateMatrixWorld()
    finta.projectionMatrix.copy(vera.projectionMatrix)

    this.matriceTessitura.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0,
    )
    this.matriceTessitura.multiply(finta.projectionMatrix)
    this.matriceTessitura.multiply(finta.matrixWorldInverse)
    // la versione «dal mondo» si ferma qui, prima della matrice del piano
    this.matriceMondo.copy(this.matriceTessitura)
    this.matriceTessitura.multiply(this.mesh.matrixWorld)

    // IL PIANO DI TAGLIO OBLIQUO: il piano vicino diventa il pavimento.
    this.piano.setFromNormalAndCoplanarPoint(this.normale, this.posSpecchio)
    this.piano.applyMatrix4(finta.matrixWorldInverse)
    this.taglio.set(this.piano.normal.x, this.piano.normal.y, this.piano.normal.z, this.piano.constant)
    const p = finta.projectionMatrix
    this.q.x = (Math.sign(this.taglio.x) + p.elements[8]) / p.elements[0]
    this.q.y = (Math.sign(this.taglio.y) + p.elements[9]) / p.elements[5]
    this.q.z = -1.0
    this.q.w = (1.0 + p.elements[10]) / p.elements[14]
    this.taglio.multiplyScalar(2.0 / this.taglio.dot(this.q))
    p.elements[2] = this.taglio.x
    p.elements[6] = this.taglio.y
    p.elements[10] = this.taglio.z + 1.0 - 0.003
    p.elements[14] = this.taglio.w

    const bersaglioPrec = renderer.getRenderTarget()
    const autoClearPrec = renderer.autoClear
    this.mesh.visible = false
    renderer.autoClear = true
    renderer.setRenderTarget(this.bersaglio)
    renderer.clear()
    renderer.render(scena, finta)
    renderer.setRenderTarget(bersaglioPrec)
    renderer.autoClear = autoClearPrec
    this.mesh.visible = true
  }

  forza(v: number) { this.materiale.uniforms.forza.value = v }
}
