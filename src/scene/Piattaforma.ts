import {
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Matrix4,
  Texture,
  RingGeometry,
} from 'three'
import { marmo } from './Esterno'

/**
 * LA PIATTAFORMA GIREVOLE — quella che rende SENSATA la rotazione.
 *
 * PERCHE' SERVE, e non e' scenografia.
 *
 * Da quando il luogo e' una fotografia a 360 gradi, la camera non puo' piu'
 * orbitare: una fotografia e' esatta sotto rotazione e sbagliata sotto
 * traslazione, e spostandosi il fondale resta incollato dov'e'. Il giudizio
 * e' stato preciso — «l'auto si sposta, sembra volare».
 *
 * La soluzione e' quella dello studio: la macchina fotografica sta sul
 * cavalletto e gira il SOGGETTO. Ma un'automobile che ruota su se stessa in
 * mezzo a un piazzale, senza niente sotto, resta un oggetto che si comporta in
 * modo impossibile — e l'occhio se ne accorge anche se non sa dire perche'.
 *
 * Basta una piattaforma. Non spiega la rotazione: la RENDE VERA. E' lo stesso
 * principio dell'ombra di contatto — non aggiunge realismo, toglie
 * un'impossibilita'.
 *
 * PERCHE' UNA COSA COSI' SEMPLICE.
 *
 * Un disco, una fascia di bordo, una gola di luce, un gradino. Cinque volumi
 * di rivoluzione, nessuna curva difficile, e tutti dentro la categoria in cui
 * la geometria costruita regge il confronto con una fotografia: superfici
 * grandi, lisce, con un solo materiale ciascuna.
 *
 * E' anche l'unico pezzo costruito che resta accanto al fondale fotografico —
 * tutti gli altri sono stati tolti proprio perche' lo denunciavano. Questo
 * puo' restare per una ragione precisa: e' l'unico che sta ALLA STESSA
 * DISTANZA dell'auto, quindi si muove come lei, e la parallasse che manca al
 * fondale non lo riguarda.
 *
 * LE MISURE.
 *
 * Diametro 7,2 metri: una supercar e' lunga 4,52, e una piattaforma girevole
 * vera ha almeno un metro di franco per lato — se il muso sporge, la
 * rotazione torna a sembrare impossibile. Alta 24 centimetri: un gradino,
 * non un palco. Piu' alta diventa un monumento e ruba la scena; a filo del
 * pavimento non si vedrebbe, e allora tanto varrebbe non metterla.
 */

export const RAGGIO_PIATTAFORMA = 2.62

/**
 * UNDICI CENTIMETRI, ed erano ventiquattro.
 *
 * La sa la piattaforma, che ci mette sopra il piano. La sa il riflesso, che
 * deve specchiare a quell'altezza e non per terra. La sapra' chiunque appoggi
 * qualcosa qui sopra. Finche' era un 0.24 scritto tre volte in tre file, il
 * riflesso e' rimasto per terra per un giro intero senza che nessuno se ne
 * accorgesse — perche' non c'era niente che dicesse che quei tre numeri
 * dovevano essere lo stesso numero.
 */
export const ALTEZZA_PIATTAFORMA = 0.11

/* PERCHE' E' SCESO A MENO DELLA META'.
 *
 * Il fianco di questo disco e' alto quanto dice questa costante e largo sette
 * metri: da una camera bassa proietta una FASCIA che attraversa tutto il
 * fotogramma. Misurata sul provino della hero, sul profilo verticale a
 * sinistra dell'automobile:
 *
 *     y     360   380   400   420   440   460   480   500
 *     lum   173    97    27    19    18    18    95   174
 *
 * Sessanta pixel di scuro pieno in mezzo alla piscina, che sta a 174. Non e'
 * grigia — e' NERA — e taglia il fotogramma in due con un bordo netto. Il
 * committente l'ha portata come critica di art direction («il basamento e' la
 * cosa che abbassa di piu' il livello percepito»), io avevo risposto che quel
 * difetto parlava di un fotomontaggio e non di questo sito, e mi sbagliavo:
 * la piattaforma c'e', ed e' esattamente quella fascia.
 *
 * Undici centimetri sono ancora uno spessore — a filo del pavimento il disco
 * tornerebbe a essere un adesivo, che e' la ragione per cui il fianco esiste —
 * ma la fascia si dimezza e smette di essere un elemento del fotogramma.
 *
 * La quota la sanno in tre (la piattaforma, il riflesso, e chiunque appoggi
 * qualcosa qui sopra) ed e' per questo che sta scritta UNA volta: finche' era
 * un 0,24 ripetuto in tre file, il riflesso e' rimasto per terra per un giro
 * intero senza che nessuno se ne accorgesse. */

export function costruisciPiattaforma() {
  const g = new Group()
  g.name = 'PIATTAFORMA'

  /**
   * IL PIANO E' PIETRA SCURA LUCIDATA, non metallo.
   *
   * Un disco metallico sotto un'automobile la fa sembrare in esposizione a
   * una fiera. La pietra la fa sembrare a casa sua — ed e' anche coerente col
   * pavimento della fotografia, che e' lastricato scuro: la piattaforma legge
   * come un pezzo dello stesso progetto, non come un attrezzo appoggiato
   * sopra.
   *
   * Ruvidita' 0,22: piu' lucida del piazzale intorno, perche' e' un piano
   * lavorato e protetto. Quella differenza di finitura e' cio' che la fa
   * leggere come un elemento a se' anche quando i due colori quasi
   * coincidono.
   */
  /* IL MARMO C'ERA GIA' E IL PODIO NON LO USAVA.
     `nero_col/nor/rgh.webp` sono il marmo nero lucido del progetto: li carica
     `marmo()` in `Esterno.ts` (che sa gia' di ripetizione e anisotropia) e li
     usa il riflesso planare per le sue venature. Il podio invece era un colore
     piatto senza mappe — una pietra che a mezzo metro dalla camera non aveva
     niente da mostrare. Con le tre mappe la venatura c'e' davvero, e la
     ruvidita' la porta la mappa (com'e' gia' per il suolo). */
  const pietra = new MeshStandardMaterial({ roughness: 1.0, metalness: 0.0, envMapIntensity: 1.0 })
  pietra.color.setRGB(0.62, 0.62, 0.64)
  pietra.map = marmo('/texture/nero_col.webp', true)
  pietra.normalMap = marmo('/texture/nero_nor.webp')
  pietra.roughnessMap = marmo('/texture/nero_rgh.webp')
  pietra.normalScale.set(0.45, 0.45)

  /**
   * IL PIANO HA UN MATERIALE SUO, uguale al fianco tranne che per una cosa:
   * l'ambiente conta un ottavo.
   *
   * Sembra un errore e non lo e'. Il piano riceve il riflesso VERO — la scena
   * risperchiata da sotto, automobile compresa — e quel riflesso contiene gia'
   * la villa, il cielo e la piscina. Lasciando anche la mappa d'ambiente al
   * massimo si avrebbero due volte le stesse vetrate accese, e soprattutto la
   * meta' che l'automobile non puo' coprire: perche' una mappa d'ambiente non
   * sa che c'e' un'automobile sopra, e continua a mandare su la villa anche
   * da sotto il pianale.
   *
   * Era esattamente questo il difetto: il piano restava grigio uniforme, e
   * sembrava un materiale sbagliato.
   */
  const pietraPiano = pietra.clone()
  /* ALZATO DA 0,12: con un colore piatto un ottavo bastava (il riflesso vero
     faceva tutto), ma un marmo con venatura ha bisogno di ambiente per non
     restare carta. Resta comunque sotto il fianco, per la ragione scritta
     qui sopra: il riflesso planare porta gia' la villa. */
  pietraPiano.envMapIntensity = 0.55
  pietraPiano.name = 'PIATTAFORMA_PIETRA_PIANO'

  /* IL PIANO RIENTRA DI DUE CENTIMETRI E MEZZO rispetto al bordo, e serve a
     FAR VEDERE la gola. Piano e gola arrivavano tutti e due a 2,62: il disco
     copriva l'anello luminoso in modo esatto, e dall'alto non ne restava
     niente. Rientrando il piano, la gola sporge di un labbro sottile tutto
     intorno — che e' esattamente come si legge un LED incassato in un podio. */
  const piano = new Mesh(new CircleGeometry(RAGGIO_PIATTAFORMA - 0.025, 96), pietraPiano)
  piano.rotation.x = -Math.PI / 2
  piano.position.y = ALTEZZA_PIATTAFORMA
  piano.receiveShadow = true
  piano.name = 'PIATTAFORMA_PIANO'
  g.add(piano)

  // il fianco: un cilindro basso. Sta in ombra quasi sempre, ed e' proprio la
  // sua ombra a dare lo spessore — senza fianco il disco sarebbe un adesivo
  /* E IL FIANCO E' PIU' LUCIDO DEL PIANO, non uguale.
     Dimezzarlo toglie meta' del problema; l'altra meta' e' che era nero pieno
     in mezzo a una piscina a 174, cioe' un salto che nessuna superficie vera
     fa. Una pietra lucidata quasi verticale, sotto un cielo e accanto a
     dell'acqua illuminata, ne raccoglie sempre un po': ruvidita' 0,10 e
     ambiente pieno gliela restituiscono, e il fianco passa da fascia nera a
     bordo scuro con dentro un riflesso. E' anche la finitura giusta per il
     pezzo — un fianco a vista di un elemento tecnico e' lucidato, non
     bocciardato come il piano calpestabile. */
  const pietraFianco = pietra.clone()
  pietraFianco.roughness = 0.10
  pietraFianco.envMapIntensity = 1.35
  pietraFianco.name = 'PIATTAFORMA_PIETRA_FIANCO'
  const fianco = new Mesh(
    new CylinderGeometry(RAGGIO_PIATTAFORMA, RAGGIO_PIATTAFORMA, ALTEZZA_PIATTAFORMA, 96, 1, true),
    pietraFianco,
  )
  fianco.position.y = ALTEZZA_PIATTAFORMA / 2
  fianco.name = 'PIATTAFORMA_FIANCO'
  g.add(fianco)

  /**
   * LA GOLA DI LUCE sotto il bordo — il dettaglio che fa il lavoro.
   *
   * E' un anello luminoso incassato sotto lo strapiombo del piano, che lava
   * il pavimento tutt'intorno. Fa tre cose insieme:
   *
   *   dice che la piattaforma e' un OGGETTO TECNICO, non un basamento;
   *   stacca il disco dal piazzale, che altrimenti hanno lo stesso valore;
   *   e da' alla carrozzeria nera un anello da riflettere sui fianchi bassi,
   *   cioe' proprio dove una vernice scura non ha nient'altro da specchiare.
   *
   * 1,7 di intensita': sopra il bianco medio perche' e' una sorgente, ma
   * sotto la soglia del bloom (2,6). Una gola che fiorisce perde i bordi, e
   * sono i bordi a farla leggere come una riga di luce invece che come una
   * macchia.
   */
  /**
   * LA GOLA E' AMBRA, NON AZZURRA, e regge da sola meta' del contrasto della
   * scena.
   *
   * Era 0xdfe9ff: un bianco freddo, cioe' lo stesso colore di tutto il resto —
   * il cielo, la piscina, il lastricato. Un accento dello stesso colore di
   * quello che ha intorno non e' un accento: e' un pezzo di fondo piu' chiaro.
   *
   * Le fotografie di automobili premiate si reggono quasi tutte sullo stesso
   * meccanismo: un fondo FREDDO e una sorgente CALDA che striscia sul soggetto.
   * L'occhio legge quella coppia come volume prima ancora di riconoscere
   * l'oggetto — e' lo stesso motivo per cui un tramonto e' bello e un
   * mezzogiorno no.
   *
   * Qui il caldo c'e' gia' nella fotografia — le vetrate accese della villa —
   * ma sta a trenta metri e sulla carrozzeria non arriva. La gola lo porta a
   * quaranta centimetri dalle ruote, e da li' risale sul sottoporta, sui cerchi
   * e sotto il diffusore: le tre superfici che nel fotomontaggio del
   * committente sono quelle che accendono l'automobile.
   *
   * 2,6 e non 1,7: sopra la soglia del bagliore. Una gola che sta sotto e'
   * una riga chiara; una che la supera diventa una sorgente, e il bloom le
   * costruisce intorno l'alone che si vede rimbalzare sulla pietra.
   */
  /* DUE DIFETTI CHE TENEVANO SPENTA QUESTA GOLA, e nessuno dei due dava errore.
   *
   * IL PRIMO: `toneMapped` non era spento. Ogni altra sorgente dichiarata del
   * progetto lo spegne — il filamento della lama, i pannelli delle luci, le
   * strisce del panorama — perche' altrimenti ACES ricomprime il moltiplicatore
   * e la sorgente torna sotto la soglia. Il commento qui sopra dice «2,6 e non
   * 1,7: sopra la soglia del bagliore»: era vero nell'intenzione e falso nei
   * fatti, perche' il tone mapping se lo riprendeva. In lineare 0xffbe72 x 2,6
   * fa circa (2,60 / 1,30 / 0,42): solo il rosso SFIORA la soglia del bloom, e
   * l'anello non fioriva mai. A 3,4 la supera su rosso e verde ed e' una luce.
   *
   * IL SECONDO, peggiore: la gola guardava IN BASSO. `RingGeometry` nasce con
   * la normale lungo +Z; ruotare di +90 gradi attorno a X la porta a (0,-1,0).
   * Con `FrontSide` — il valore di serie — dalla camera dell'hero l'anello
   * veniva ELIMINATO DAL CULLING: l'unica camera che ne vedeva la faccia buona
   * era quella del riflesso planare, che sta sotto il piano e guarda in su.
   * Ecco perche' l'anello si intravedeva nel riflesso a terra e non sul podio.
   * `DoubleSide` lo tiene giusto per entrambe. */
  const luce = new MeshBasicMaterial({ color: 0xffbe72, toneMapped: false, side: DoubleSide })
  /* ALZATO ANCORA, da 3,4, ADESSO che lo sfondo e' sceso a 0,62 e
     l'esposizione a 0,82. La gola non e' toccata da nessuna delle due
     (`toneMapped: false`), quindi ogni passo che scurisce la scena la fa
     risaltare di piu' — ed e' cio' che si vuole: in una notte l'anello di un
     podio e' una delle poche cose che DEVE bruciare. A 5,2 supera la soglia
     del bloom (1,75) su rosso e verde e si porta dietro l'alone. */
  luce.color.multiplyScalar(5.2)
  const gola = new Mesh(new RingGeometry(RAGGIO_PIATTAFORMA - 0.075, RAGGIO_PIATTAFORMA, 96), luce)
  gola.rotation.x = Math.PI / 2
  // TRE CENTIMETRI E MEZZO SOTTO IL PIANO, e non piu' un numero fisso: la gola
  // sta incassata sotto lo strapiombo, quindi la sua quota e' una DIFFERENZA
  // dal piano e non una posizione. Scritta come 0,205 era giusta finche' il
  // piano stava a 0,24 — al primo ritocco dell'altezza sarebbe finita sopra.
  gola.position.y = ALTEZZA_PIATTAFORMA - 0.035
  gola.name = 'PIATTAFORMA_GOLA'
  g.add(gola)

  /**
   * IL GRADINO ESTERNO, largo trenta centimetri e alto sei.
   *
   * E' quello che trasforma un disco appoggiato in una cosa COSTRUITA: un
   * elemento tecnico vero non finisce mai a filo, ha sempre un raccordo con
   * cio' che lo circonda. Ed e' anche la superficie su cui la gola di luce
   * cade — senza, la luce si perderebbe sul lastricato e non si vedrebbe.
   */
  const bordo = new MeshStandardMaterial({ roughness: 0.34, metalness: 0.0, envMapIntensity: 0.9 })
  bordo.color.setRGB(0.075, 0.075, 0.082)
  /* E ANCHE IL GRADINO SI ASSOTTIGLIA — era la SECONDA fascia scura.
     Sullo stesso profilo, piu' in basso: y 620 e 640 valgono 1 e 1, cioe' nero
     assoluto, dentro un intorno che sta fra 100 e 146. Due fasce nere parallele
     che attraversano il fotogramma sono la firma di un fotomontaggio, ed e'
     precisamente l'impressione che questa scena non si puo' permettere.
     Da sei centimetri a due e mezzo, e da trenta di sporgenza a diciotto: fa
     ancora il suo mestiere — raccordare il disco al piazzale e raccogliere la
     luce della gola — senza essere una seconda riga. */
  const gradino = new Mesh(
    new CylinderGeometry(RAGGIO_PIATTAFORMA + 0.18, RAGGIO_PIATTAFORMA + 0.18, 0.025, 96),
    bordo,
  )
  gradino.position.y = 0.0125
  gradino.receiveShadow = true
  gradino.name = 'PIATTAFORMA_GRADINO'
  g.add(gradino)

  return g
}

/**
 * INNESTARE IL RIFLESSO VERO DENTRO IL MATERIALE DEL PIANO.
 *
 * PERCHE' NON BASTAVA IL PIANO ADDITIVO.
 *
 * `Riflesso` disegna il mondo risperchiato su un piano trasparente in somma.
 * Su un pavimento di marmo chiaro funziona: il riflesso e' luce che torna su,
 * e sommarla e' proprio cio' che fa la pietra.
 *
 * Sulla piattaforma no, e la ragione e' che qui il riflesso deve anche
 * TOGLIERE. Il piano guarda in su e vede la villa con le vetrate accese: e'
 * chiaro. In mezzo c'e' un'automobile nera, che quella villa la nasconde.
 * Una somma non nasconde niente — puo' solo aggiungere — quindi la sagoma
 * dell'auto restava un disco grigio uniforme, e sembrava un materiale
 * sbagliato. Ho perfino cominciato a ritoccare ruvidita' e colore.
 *
 * La correzione e' spostare il riflesso da SOPRA il piano a DENTRO il piano:
 * la mappa d'ambiente scende a un ottavo e al suo posto arriva l'immagine
 * risperchiata, che l'automobile ce l'ha gia' dentro, nera dov'e' nera.
 *
 * SI ENTRA CON `onBeforeCompile` E NON CON UNO SHADER SCRITTO A MANO, perche'
 * il piano deve continuare a ricevere l'ombra, i pannelli e la gola di luce.
 * Un ShaderMaterial li perderebbe tutti e resterebbe uno specchio sospeso.
 */
export function applicaSpecchio(
  gruppo: Group,
  immagine: Texture,
  matrice: Matrix4,
  forza = 0.80,
) {
  const piano = gruppo.getObjectByName('PIATTAFORMA_PIANO') as Mesh | null
  if (!piano) return () => {}
  const m = piano.material as MeshStandardMaterial
  let uniformi: Record<string, { value: unknown }> | null = null

  m.onBeforeCompile = (s) => {
    uniformi = s.uniforms
    s.uniforms.specchioPiano = { value: immagine }
    s.uniforms.matriceSpecchio = { value: matrice }
    s.uniforms.forzaSpecchio = { value: forza }

    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
uniform mat4 matriceSpecchio;
varying vec4 vProiezioneSp;
varying vec3 vMondoSp;`)
      .replace('#include <fog_vertex>', `#include <fog_vertex>
vec4 mondoSp = modelMatrix * vec4(position, 1.0);
vMondoSp = mondoSp.xyz;
vProiezioneSp = matriceSpecchio * mondoSp;`)

    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D specchioPiano;
uniform float forzaSpecchio;
varying vec4 vProiezioneSp;
varying vec3 vMondoSp;`)
      .replace('#include <opaque_fragment>', `
// FRESNEL, con lo stesso esponente del pavimento: di striscio la pietra
// specchia quasi tutto, a piombo quasi niente. Tenerlo uguale e' cio' che
// impedisce alla piattaforma di leggersi come un materiale diverso dal
// lastricato che ha intorno.
{
  vec3 versoSp = normalize(cameraPosition - vMondoSp);
  float radenteSp = 1.0 - clamp(versoSp.y, 0.0, 1.0);
  float fresnelSp = pow(radenteSp, 2.1);
  /* IL RIFLESSO SI SFOCA, e non e' un effetto: e' la differenza fra uno
     specchio e una pietra lucidata.
     Uno specchio perfetto e' una delle firme piu' riconoscibili del calcolo:
     in natura nessuna superficie restituisce un'immagine nitida quanto
     l'originale, perche' la microruvidita' sparpaglia i raggi — e piu' e'
     lontano l'oggetto riflesso, piu' quel ventaglio si apre. E' lo stesso
     motivo per cui il riflesso di un lampione sul bagnato e' una striscia e
     non un punto.
     Cinque prelievi in croce, con il raggio che cresce quando lo sguardo si
     fa radente: a piombo la pietra e' quasi nitida, di striscio impasta. Il
     peso centrale resta il piu' alto, cosi' la forma dell'oggetto riflesso
     non si perde — si ammorbidisce.
     Cinque e non nove: e' un pezzo di schermo piccolo, ma quattro prelievi in
     piu' per pixel su una superficie a schermo intero sarebbero un altro
     conto. Misurato in banda dopo l'aggiunta. */
  float sfocaSp = 0.0052 * (0.30 + radenteSp) * vProiezioneSp.w;
  vec3 rifl = texture2DProj(specchioPiano, vProiezioneSp).rgb * 0.36;
  rifl += texture2DProj(specchioPiano, vProiezioneSp + vec4( sfocaSp,  sfocaSp, 0.0, 0.0)).rgb * 0.16;
  rifl += texture2DProj(specchioPiano, vProiezioneSp + vec4(-sfocaSp,  sfocaSp, 0.0, 0.0)).rgb * 0.16;
  rifl += texture2DProj(specchioPiano, vProiezioneSp + vec4( sfocaSp, -sfocaSp, 0.0, 0.0)).rgb * 0.16;
  rifl += texture2DProj(specchioPiano, vProiezioneSp + vec4(-sfocaSp, -sfocaSp, 0.0, 0.0)).rgb * 0.16;
  // lo stesso tetto del pavimento: una sorgente molto luminosa, sfocata,
  // diventerebbe una colonna chiara senza niente che la giustifichi
  rifl = min(rifl, vec3(1.4));
  outgoingLight += rifl * fresnelSp * forzaSpecchio;
}
#include <opaque_fragment>`)
  }
  // LA CHIAVE DI CACHE, e questa trappola l'avevo gia' pagata due volte.
  //
  // Three tiene i programmi compilati in una cache indicizzata sui PARAMETRI
  // del materiale — tipo, mappe, define. `onBeforeCompile` non ci entra.
  // Qui il piano e il fianco sono due MeshStandardMaterial con gli stessi
  // identici parametri: three compila il fianco, e quando tocca al piano
  // trova la chiave gia' in cache e gli passa il programma del fianco. Il
  // codice dello specchio non viene mai compilato, e non c'e' nessun errore
  // da nessuna parte — semplicemente non succede niente.
  //
  // E' esattamente il sintomo che avevo davanti: disco identico prima e dopo.
  // Lo stesso avviso sta gia' scritto in `Abitacolo.ts` e in `Esterno.ts`,
  // segno che una nota nei commenti non basta se non e' dove si scrive.
  m.customProgramCacheKey = () => 'piattaforma-specchio'
  m.needsUpdate = true

  /**
   * IL RIENTRO QUANDO IL RIFLESSO SI SPEGNE.
   *
   * Ai livelli di qualita' bassi il riflesso planare non si calcola: il
   * bersaglio resta com'era e lo specchio mostrerebbe un fotogramma vecchio,
   * o nero. Spegnendolo e basta, pero', il piano resterebbe quasi nero, perche'
   * la mappa d'ambiente qui e' a un ottavo apposta per non contare due volte.
   *
   * Quindi si fa il cambio completo: via lo specchio, torna l'ambiente pieno.
   * Il piano perde l'automobile riflessa — che e' proprio la cosa che non si
   * puo' avere senza pagarla — ma resta una pietra lucida illuminata, non una
   * macchia scura.
   */
  return (acceso: boolean) => {
    if (uniformi?.forzaSpecchio) uniformi.forzaSpecchio.value = acceso ? forza : 0
    m.envMapIntensity = acceso ? 0.12 : 1.0
  }
}
