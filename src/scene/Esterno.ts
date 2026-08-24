import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  type Texture,
} from 'three'
import { anisotropiaMassima } from '../core/Anisotropia'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * IL GREY BOX DELL'ESTERNO.
 *
 * PERCHE' SI COMINCIA DA QUI E NON DALL'AUTO.
 *
 * Questo e' il punto 1 del piano, ed e' un cancello: se la coreografia non
 * emoziona con delle scatole grigie, non la salvera' nessun modello da 400
 * MB. Il contrario invece succede spesso — si passano giorni a rifinire una
 * carrozzeria e poi ci si accorge che l'inquadratura non regge, e a quel
 * punto rifare la regia costa il triplo perche' bisogna ri-verificare tutto.
 *
 * LE MISURE SONO VERE, e questa e' l'unica cosa che qui non e' finta.
 *
 * Una supercar sta in 4,5 x 2,0 x 1,15 metri, e sono quelle proporzioni a
 * decidere dove puo' passare la camera, quanto e' stretto il varco fra
 * montante e specchietto, quanto in basso bisogna scendere per arrivare
 * all'altezza degli occhi del guidatore. Con una scatola sbagliata di
 * mezzo metro la coreografia funziona qui e si rompe con l'auto vera.
 *
 * IL MONTANTE E' IL PEZZO IMPORTANTE.
 *
 * Non e' decorazione: e' l'occlusore. Tutta la transizione esterno→interno
 * (decisione D2) sta sul fatto che quel pilastro attraversi l'obiettivo e
 * per due decimi riempia il fotogramma. Quindi ha una posizione, uno
 * spessore e un'inclinazione dichiarate, e la camera gli passa accanto per
 * costruzione — non per fortuna.
 */

export const AUTO = {
  lunghezza: 4.52,
  larghezza: 1.98,
  altezza: 1.16,
  passo: 2.70,
  /** dove stanno gli occhi del guidatore: e' li' che finisce la camera */
  occhi: { x: -0.28, y: 1.02, z: 0.38 },
  /** il montante anteriore lato guida */
  montante: { x: 0.62, z: 0.74, spessore: 0.11, inclinazione: 0.62 },
}

/**
 * LE TESSITURE DEL MARMO STANNO IN UN POSTO SOLO.
 *
 * Non e' pulizia: il riflesso a terra usa la STESSA mappa di normali del
 * pavimento per spostare cio' che specchia. Se le due mappe fossero due
 * caricamenti distinti, prima o poi diventerebbero due file diversi e la
 * venatura del riflesso non combacerebbe piu' con quella della pietra — un
 * difetto che si vede subito e che non si sa da dove venga.
 */
const caricatore = new TextureLoader()
const cache = new Map<string, Texture>()
export function marmo(file: string, srgb = false) {
  const gia = cache.get(file)
  if (gia) return gia
  const t = caricatore.load(file)
  t.wrapS = t.wrapT = RepeatWrapping
  // 14 ripetizioni su 90 metri: una lastra ogni 6,4 metri e' la misura di
  // un pavimento monumentale, non di un bagno
  t.repeat.set(14, 14)
  t.anisotropy = anisotropiaMassima()
  if (srgb) t.colorSpace = SRGBColorSpace
  cache.set(file, t)
  return t
}
export const normaliMarmo = () => marmo('/texture/nero_nor.webp')

/**
 * IL PAVIMENTO SI POSA A LASTRE, non si tappezza.
 *
 * IL PROBLEMA CHE RISOLVE.
 *
 * Una tessitura ripetuta su novanta metri mostra il suo timbro: si riconosce
 * la stessa venatura ogni tot, e il marmo e' il materiale peggiore con cui
 * provarci, perche' l'occhio memorizza le venature come memorizza i volti.
 * E' anche il motivo per cui avevo cominciato a generarne una procedurale —
 * quella era continua ma troppo regolare, e la generata dall'IA e' molto piu'
 * bella ma non e' continua per niente.
 *
 * LA SOLUZIONE E' QUELLA DELL'EDILIZIA, non quella della grafica.
 *
 * Un pavimento in marmo non e' un rotolo di carta da parati: e' fatto di
 * LASTRE, tagliate dallo stesso blocco, posate ognuna con il suo verso. Due
 * lastre adiacenti hanno la stessa pietra e un disegno diverso, perche' sono
 * state girate. Ed e' proprio quel «stessa pietra, disegno diverso» a dire
 * che e' un materiale naturale.
 *
 * Quindi: si divide il pavimento in lastre da 1,2 x 2,4 metri (la misura
 * commerciale vera del grande formato), e a ogni lastra si assegna una delle
 * OTTO possibili orientazioni — quattro rotazioni per due ribaltamenti — con
 * un sorteggio che dipende solo dalla posizione della lastra, quindi sempre
 * uguale a se stesso.
 *
 * Il bello e' che la tessitura non ha piu' bisogno di essere continua: ogni
 * lastra la mostra tutta, dentro i propri bordi, e i bordi sono FUGHE — che
 * ci devono essere comunque.
 *
 * SI SCRIVE NELLO SHADER DEL MATERIALE ESISTENTE, con `onBeforeCompile`, e
 * non in uno shader nuovo: cosi' la lastra continua a essere illuminata dal
 * motore come qualunque altra superficie — ombre, occlusione ambientale,
 * mappa d'ambiente, tutto. Riscrivere il materiale da zero avrebbe voluto
 * dire rifare anche quello.
 */
export function posaALastre(m: MeshStandardMaterial, lastra = [1.5, 2.0], fuga = 0.010) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uLastra = { value: new Vector2(lastra[0], lastra[1]) }
    shader.uniforms.uFuga = { value: fuga }

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vMondoLastra;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vMondoLastra = (modelMatrix * vec4(transformed, 1.0)).xyz;`)

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vMondoLastra;
        uniform vec2 uLastra;
        uniform float uFuga;

        // sorteggio stabile: dipende SOLO da quale lastra e'. Non usa il
        // tempo ne' la posizione sullo schermo, quindi non sfarfalla e resta
        // identico fra un fotogramma e l'altro — che e' l'unico modo perche'
        // un pavimento sembri POSATO invece che generato.
        float sorteLastra(vec2 c) {
          return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453);
        }

        vec2 uvLastra(out float fugaOut) {
          vec2 p = vMondoLastra.xz / uLastra;
          vec2 cella = floor(p);
          vec2 f = fract(p);
          float r = sorteLastra(cella);

          // OTTO ORIENTAMENTI: quattro rotazioni per due ribaltamenti.
          // E' cosi' che si posa la pietra naturale — lastre tagliate dallo
          // stesso blocco, girate una per una, perche' la stessa venatura non
          // compaia mai due volte nello stesso verso. Ed e' anche il motivo
          // per cui la tessitura non ha bisogno di essere continua: ogni
          // lastra la mostra tutta, dentro i propri bordi, e i bordi sono
          // fughe.
          int giro = int(floor(r * 4.0));
          if (giro == 1) f = vec2(f.y, 1.0 - f.x);
          else if (giro == 2) f = vec2(1.0) - f;
          else if (giro == 3) f = vec2(1.0 - f.y, f.x);
          if (sorteLastra(cella + vec2(17.3, 4.1)) > 0.5) f.x = 1.0 - f.x;

          // LA FUGA SI MISURA IN METRI, non in frazione di lastra: su una
          // lastra rettangolare le due misure sono diverse, e una fuga
          // espressa in frazione uscirebbe piu' larga sul lato corto.
          vec2 bordo = vec2(uFuga) / uLastra;
          vec2 d = min(fract(p), vec2(1.0) - fract(p));
          fugaOut = 1.0 - smoothstep(0.0, 1.0, min(d.x / bordo.x, d.y / bordo.y));
          return f;
        }`)
      .replace('void main() {', `void main() {
        float fugaQui;
        vec2 uvLastraQui = uvLastra(fugaQui);`)

    // POI SI DIROTTANO LE COORDINATE DELLE MAPPE.
    //
    // Three legge ogni tessitura da una varying dedicata — `vMapUv`,
    // `vNormalMapUv`, `vRoughnessMapUv` — e in GLSL una varying non si puo'
    // riscrivere. Ma se ne puo' sostituire il NOME ovunque compaia, e il
    // risultato e' che tutte le mappe vengono lette alle coordinate della
    // lastra senza toccare una riga della catena di illuminazione: ombre,
    // occlusione ambientale e mappa d'ambiente continuano a funzionare come
    // se il materiale fosse quello di prima.
    //
    // E' anche la ragione per cui questo si fa con `onBeforeCompile` e non
    // con uno shader scritto da zero: uno shader nuovo avrebbe voluto dire
    // riscrivere anche tutto quello che gia' funziona.
    for (const v of ['vMapUv', 'vNormalMapUv', 'vRoughnessMapUv']) {
      shader.fragmentShader = shader.fragmentShader.split(v).join('uvLastraQui')
    }

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb *= 1.0 - fugaQui * 0.86;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.94, fugaQui);`)
  }
  // uno shader modificato vuole una chiave sua, se no three riusa il
  // programma gia' compilato del materiale non modificato
  m.customProgramCacheKey = () => 'lastre'
  return m
}


function grigio(chiaro: number, ruvido = 0.75) {
  const m = new MeshStandardMaterial({ roughness: ruvido, metalness: 0 })
  m.color.setRGB(chiaro, chiaro, chiaro)
  return m
}

export function costruisciEsterno() {
  const gruppo = new Group()
  gruppo.name = 'ESTERNO'

  // IL GREY BOX NASCE INVISIBILE, e non e' un dettaglio di pulizia.
  //
  // Queste scatole servono a UNA cosa sola: dire dove sta l'auto e quanto e'
  // grande, cosi' che il modello vero possa incastrarcisi dentro e le ottiche
  // e le ruote costruite trovino il loro posto misurando invece di leggere
  // coordinate scritte a mano.
  //
  // Finche' erano accese, pero', chiunque aprisse il sito vedeva per due
  // secondi UN PARALLELEPIPEDO GRIGIO al posto della vettura — il modello
  // pesa tre megabyte e arriva quando arriva. E i primi due secondi sono
  // esattamente quelli su cui si gioca tutto: e' li' che si decide se chi
  // guarda pensa «campagna automobilistica» o «demo tecnica non finita».
  //
  // Meglio nessuna automobile che una scatola: un porticato vuoto con il
  // titolo sopra e' un fotogramma legittimo, un cubo grigio no. Il gruppo
  // resta in scena, misurabile, e semplicemente non si disegna.

  // GRIGI DIVERSI PER PEZZI DIVERSI, anche se sono tutte scatole.
  // Un grey box monocromo non si legge: senza stacchi di valore non si
  // capisce dove finisce un volume e comincia l'altro, e si finisce per
  // giudicare la coreografia su una macchia. Tre grigi bastano.
  const carrozzeria = grigio(0.34)
  const vetri = grigio(0.13, 0.35)
  const gomma = grigio(0.06, 0.95)

  const corpo = new Mesh(
    new BoxGeometry(AUTO.lunghezza, 0.74, AUTO.larghezza),
    carrozzeria,
  )
  corpo.position.y = 0.52
  corpo.name = 'CORPO'
  gruppo.add(corpo)

  // l'abitacolo: piu' corto e piu' stretto del corpo, e spostato indietro.
  // E' questo arretramento a creare il varco davanti al montante, cioe' lo
  // spazio in cui la camera si infila.
  const abitacolo = new Mesh(new BoxGeometry(2.05, 0.46, 1.62), vetri)
  abitacolo.position.set(-0.34, 1.06, 0)
  abitacolo.name = 'ABITACOLO'
  gruppo.add(abitacolo)

  for (const lato of [1, -1]) {
    const m = new Mesh(
      new BoxGeometry(AUTO.montante.spessore, 0.72, AUTO.montante.spessore * 1.6),
      carrozzeria,
    )
    m.position.set(AUTO.montante.x, 0.94, AUTO.montante.z * lato)
    m.rotation.z = AUTO.montante.inclinazione
    m.name = lato > 0 ? 'MONTANTE_GUIDA' : 'MONTANTE_PASSEGGERO'
    gruppo.add(m)
  }

  const ruota = new CylinderGeometry(0.36, 0.36, 0.30, 24)
  for (const x of [AUTO.passo / 2, -AUTO.passo / 2]) {
    for (const z of [AUTO.larghezza / 2 - 0.16, -AUTO.larghezza / 2 + 0.16]) {
      const r = new Mesh(ruota, gomma)
      r.position.set(x, 0.36, z)
      r.rotation.x = Math.PI / 2
      gruppo.add(r)
    }
  }

  // MARCATI COME RIFERIMENTO, non solo spenti.
  //
  // Questi volumi servono a una cosa sola: dire dove sta l'auto e quanto e'
  // grande, cosi' che ottiche e ruote costruite trovino il loro posto
  // misurando invece di leggere coordinate scritte a mano. Non si vedono mai.
  //
  // La marcatura serve al motore, che deve poter distinguere «cio' che era
  // qui prima» da «cio' che e' arrivato dopo»: nel gruppo dell'esterno
  // entrano anche la piattaforma girevole, le ottiche e le ruote, e quelle
  // devono restare accese.
  for (const o of gruppo.children) {
    o.visible = false
    o.userData.riferimento = true
  }
  return gruppo
}

/**
 * L'AMBIENTE, e perche' esiste gia' adesso.
 *
 * Non serve a fare scena: serve a portare la PARALLASSE. Durante l'orbita
 * la camera trasla davvero, e un fondo piatto — che sia un'immagine o una
 * mappa equirettangolare — resta immobile perche' non ha profondita'. Sono
 * questi pochi volumi vicini a dire all'occhio che lo spazio e' spazio.
 *
 * Senza, l'orbita sembra un oggetto che gira su una scatola da fotografo, e
 * il difetto non si sa nominare: si sente solo che e' finto.
 */
export function costruisciAmbiente() {
  const gruppo = new Group()
  gruppo.name = 'AMBIENTE'

  // IL SUOLO E' SCURO E LUCIDO, e non e' una scelta di gusto.
  //
  // Con un grigio opaco al 20% il pavimento restava una superficie piatta
  // e uniforme: leggeva come il fondale di uno studio fotografico, e su un
  // fondale l'auto non appoggia da nessuna parte. Un tetto di notte e'
  // scuro e umido, e sull'umido si riflettono le luci della citta' — sono
  // quei riflessi allungati a dire che c'e' una superficie orizzontale
  // vera, molto piu' di quanto lo dica il colore.
  //
  // Riflettente ma non a specchio: 0,18 di ruvidita' allunga le sorgenti
  // in strisce invece di copiarle, che e' cio' che fa il cemento bagnato.
  // IL PAVIMENTO E' MARMO VERO, non un grigio scuro.
  //
  // Un piano di colore uniforme, per quanto lucido, non ha niente da
  // riflettere di suo: restituisce solo l'ambiente, e l'occhio lo legge
  // come un fondale da studio. Il marmo ha venature, fughe, e una
  // ruvidita' che cambia da lastra a lastra — sono quelle variazioni a
  // spezzare il riflesso e a farlo leggere come una superficie su cui si
  // cammina invece che come uno specchio.
  //
  // E' meta' della fotografia di riferimento: li' l'auto sta su lastre di
  // marmo scuro lucidato, e il suo riflesso allungato sul pavimento pesa
  // quanto l'auto stessa.
  const materialeSuolo = new MeshStandardMaterial({
    map: marmo('/texture/nero_col.webp', true),
    normalMap: marmo('/texture/nero_nor.webp'),
    roughnessMap: marmo('/texture/nero_rgh.webp'),
    // 1,0 perche' il valore vero lo porta la mappa: 0,52 sul fondo e 0,72
    // sulle vene. Un marmo LEVIGATO, non lucidato a specchio — che e' cio'
    // che era stato chiesto, ed e' anche cio' che si posa davvero in un
    // porticato, perche' uno specchio all'aperto e' impraticabile appena
    // piove.
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.45,
  })
  materialeSuolo.color.setRGB(0.85, 0.85, 0.87)
  materialeSuolo.normalScale = new Vector2(0.5, 0.5)
  posaALastre(materialeSuolo)

  // IL SUOLO DI MARMO SI SPEGNE: nella fotografia del cortile c'e' gia', ed
  // e' migliore di qualunque piano possa metterci io — riflette il colonnato
  // vero, colonna per colonna, con le sue venature e le sue pozze di luce.
  //
  // L'oggetto resta perche' serve ancora a due cose che non si vedono: il
  // riflesso planare (`scene/Riflesso.ts`) prende da lui la mappa delle
  // venature con cui spezza cio' che specchia, e il conto dell'ingombro
  // della scena continua a contarlo.
  const suolo = new Mesh(new PlaneGeometry(90, 90), materialeSuolo)
  suolo.visible = false
  suolo.rotation.x = -Math.PI / 2
  suolo.receiveShadow = true
  suolo.name = 'SUOLO'
  gruppo.add(suolo)

  // ANCHE I PARAPETTI SONO STATI TOLTI, e con loro l'ultimo pezzo di
  // ambiente costruito.
  //
  // Erano nati per dare un appiglio di profondita' sotto la linea
  // dell'orizzonte quando intorno all'auto non c'era niente. Adesso intorno
  // c'e' una fotografia, e due parallelepipedi grigi in mezzo non aggiungono
  // profondita': aggiungono una BANDA NERA che taglia il fotogramma in due —
  // ed e' esattamente cosi' che si sono manifestati.
  //
  // E' anche la lezione generale di questo passaggio: quando il fondale
  // diventa una fotografia, ogni elemento costruito che gli sta accanto
  // smette di aiutare e comincia a denunciare. Il testimone che dovrebbe
  // dare parallasse e' lo stesso che rivela che dietro non ce n'e'.

  return gruppo
}


/**
 * Dove stanno le tre colonne: x, z, altezza in metri.
 *
 * NON DOVE PASSA LA CAMERA. Le avevo messe dove capitava, e una e' finita
 * a meno di un metro dall'obiettivo nella prima inquadratura: nel provino
 * si vede una massa nera che occupa mezzo fotogramma e nasconde l'auto.
 *
 * La camera orbita fra raggio 5,4 e 8,6 e guarda verso il centro, quindi
 * vede il fondo dalla parte OPPOSTA — il settore fra -2,4 e -0,5 radianti.
 * Le colonne stanno li', oltre gli undici metri: dentro il campo visivo,
 * fuori dalla traiettoria. E' l'unica fascia in cui possono fare il loro
 * mestiere, che e' dare parallasse senza mettersi in mezzo.
 */
export const COLONNE: Array<[number, number, number]> = [
  [13.0, -6.0, 5.4],
  [6.0, -13.0, 6.2],
  [-4.5, -12.5, 4.8],
]

/**
 * LE COLONNE VERE, generate con Tripo, al posto delle scatole.
 *
 * MISURATE PRIMA DI ESSERE MESSE IN SCENA: 4.523 triangoli, 0,14 texel al
 * millimetro alla loro altezza vera. Sembra pochissimo, e la soglia che
 * avevo scritto nel piano — «piu' di 4 texel/mm» — direbbe di buttarle.
 *
 * Ma quella soglia valeva per la carrozzeria vista da mezzo metro. Quanta
 * risoluzione serva non e' un numero assoluto: e' quanti PIXEL DI SCHERMO
 * l'oggetto occupa alla distanza a cui vive davvero. A dodici metri, con un
 * campo da 34 gradi su un viewport da 1200, servono 0,16 texel/mm; a otto
 * metri 0,25; a sei 0,33.
 *
 * Quindi queste colonne reggono da dodici metri, sono appena morbide a
 * otto, e a sei si vedrebbero sfocate. Stanno fra i sei e i quattordici, il
 * che le rende accettabili e al limite — e questo si sa PRIMA di
 * scoprirlo in un video.
 */
export async function caricaColonne(dentro: Group, url = '/modelli/colonna.glb') {
  const gltf = await new GLTFLoader().loadAsync(url)
  const modello = gltf.scene
  // si normalizza sull'altezza: un modello generato arriva con una scala
  // arbitraria, e fidarsi di quella significa avere colonne di misure
  // diverse a ogni rigenerazione
  const scatola = new Box3().setFromObject(modello)
  const misura = new Vector3()
  scatola.getSize(misura)
  const centro = new Vector3()
  scatola.getCenter(centro)

  for (const [x, z, alt] of COLONNE) {
    const c = modello.clone(true)
    const k = alt / (misura.y || 1)
    c.scale.setScalar(k)
    // si appoggia a terra: il centro del modello non e' la sua base
    c.position.set(x - centro.x * k, -(centro.y - misura.y / 2) * k, z - centro.z * k)
    // ognuna girata a modo suo: tre colonne identiche e allineate sono un
    // timbro, e si notano proprio perche' dovrebbero passare inosservate
    c.rotation.y = (x * 1.7 + z) % (Math.PI * 2)
    dentro.add(c)
  }
  return modello
}
