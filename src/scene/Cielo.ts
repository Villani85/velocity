import {
  BackSide,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Texture,
  type WebGLRenderer,
} from 'three'

/**
 * IL CIELO E' COSTRUITO, non fotografato.
 *
 * PERCHE' HO BUTTATO L'HDRI, dopo averlo difeso per due giorni.
 *
 * Una mappa equirettangolare fa tre mestieri con un file solo — illumina, si
 * riflette, fa da fondo — e questo l'aveva resa la scelta ovvia. Ma le tre
 * cose che mi hanno bloccato per una settimana venivano tutte da li':
 *
 *   IL LAMPIONE BRUCIATO. In quella fotografia c'e' una sorgente con valori
 *   enormi. Ho abbassato la forza del bloom da 0,42 a 0,12, alzato la soglia
 *   da 1,04 a 2,6, ruotato la mappa di 112 gradi, e nel provino c'era ancora
 *   una bolla bianca dietro l'auto. Non era un difetto della taratura: era un
 *   difetto del FILE, e un file non si tara.
 *
 *   IL LUOGO SBAGLIATO. Una fotografia porta con se' un posto intero, con la
 *   sua ora, il suo tempo atmosferico e la sua storia. Puo' essere bellissima
 *   e raccontare la cosa sbagliata — e la si puo' solo cambiare per intero,
 *   mai correggere.
 *
 *   CINQUE MEGABYTE. Su un obiettivo di quattro-cinque per il primo blocco,
 *   il cielo da solo era il fondo.
 *
 * Costruito, invece: pesa ZERO, non ha sorgenti impreviste, e ogni valore e'
 * una manopola. Il cielo di una campagna automobilistica non e' quasi mai un
 * cielo vero — e' un gradiente scelto.
 *
 * COS'E' UN CREPUSCOLO, in tre numeri.
 *
 * Un'ora dopo il tramonto il cielo non e' «blu»: e' tre fasce che si
 * innestano. All'orizzonte resta l'ambra della luce che passa attraverso il
 * massimo spessore d'atmosfera; sopra c'e' una fascia di transizione
 * rosata-grigia; allo zenit c'e' un indaco profondo, gia' quasi notte. Il
 * salto fra la prima e la terza e' enorme — un fattore venti — ed e' proprio
 * quel salto a dare a una carrozzeria nera un riflesso che CAMBIA lungo la
 * fiancata invece di essere una tinta unita.
 *
 * E' anche il motivo per cui le fotografie di automobili si fanno a
 * quest'ora: e' l'unico momento in cui il cielo e' insieme una sorgente
 * grande e morbida (quindi riflessi puliti) e scuro abbastanza perche' le
 * luci artificiali dell'architettura contino qualcosa.
 *
 * IL SOLE E' SOTTO L'ORIZZONTE, e non e' un dettaglio.
 *
 * Se il disco si vede, il cielo diventa la cosa piu' luminosa del fotogramma
 * e siamo di nuovo al lampione. Qui c'e' solo il suo ALONE, che sale da sotto
 * la linea di terra: si vede da dove viene la luce, e non c'e' niente da
 * bruciare. E' la stessa ragione per cui i fotografi aspettano che il sole
 * sia sceso.
 */

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/**
 * LE NUVOLE VENGONO DA `Lastra.ts`, E NON E' UNA COPIA PER PIGRIZIA.
 *
 * I due cieli di questo sito sono due shader diversi in due file diversi — uno
 * su una sfera per la corte, uno dentro il ray-marching della strada — ma sono
 * lo stesso cielo, e la docstring di `Lastra.ts` lo dichiara da prima che
 * questo blocco esistesse: «non e' che si somigliano, e' che sono la stessa
 * cosa». Una fascia di nuvole disegnata qui con un'altra funzione, un'altra
 * scala o un altro modo di attaccarsi all'orizzonte staccherebbe i due
 * capitoli — e il difetto si presenterebbe come «il sito cambia luogo a meta'»,
 * che e' il piu' caro da diagnosticare e il piu' facile da evitare.
 *
 * Quindi: stesso rumore di valore a due dimensioni, stessa quintica al posto
 * della cubica, stessa proiezione su un piano a quota fissa
 * (`d.xz / (d.y + 0,05)`), stessa fascia angolare, stessa soglia, stessa forza,
 * fino all'ultima cifra dei numeri. L'unica cosa che cambia e' il colore
 * verso cui si mescola, perche' i due cieli hanno palette diverse — e anche
 * quella cambia nello stesso MODO: si scurisce il cielo del trentaquattro per
 * cento e ci si mette dentro un filo di caldo.
 *
 * PERCHE' NON UN FILE CONDIVISO. Le due stringhe GLSL non sono importabili
 * l'una nell'altra senza inventare un impianto di frammenti che questo
 * progetto non ha e che costerebbe piu' di quello che risolve. La cucitura
 * vera sono i NUMERI, e i numeri sono scritti qui accanto e la' accanto: se un
 * giorno divergono, il posto dove si vede e' questo commento.
 */
const FRAG = /* glsl */ `
uniform vec3 zenit;
uniform vec3 mezzo;
uniform vec3 orizzonte;
uniform vec3 caldo;
uniform vec3 versoSole;
uniform float forzaAlone;
varying vec3 vDir;

// Quattro angoli e la QUINTICA: la cubica lascia discontinua la derivata
// seconda al confine fra due celle, e passando dentro una smoothstep con soglia
// stretta quella diventa una banda di Mach — una riga dritta in cielo dove
// cambia la cella. In «Lastra.ts» il primo provino ne aveva disegnato un
// rettangolo intero sopra il punto di fuga.
// E i quattro angoli escono da un prodotto scalare solo: differiscono di uno in
// x o in y, e dentro un dot quello e' una somma di costanti. Un dot invece di
// quattro, e un seno su vec4 invece di quattro seni su scalare.
float rum2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float b = dot(i, vec2(127.1, 311.7));
  vec4 h = fract(sin(vec4(b, b + 127.1, b + 311.7, b + 438.8)) * 43758.5453123);
  return mix(mix(h.x, h.y, f.x), mix(h.z, h.w, f.x), f.y);
}

// LA FASCIA DI NUVOLE BASSE. Il ponte e' un PIANO a quota fissa: la direzione
// ci si proietta dividendo per il seno dell'elevazione, ed e' quella divisione
// a dare la prospettiva — le nuvole si stringono avvicinandosi all'orizzonte,
// come le mattonelle di un pavimento visto di striscio. Senza la divisione e'
// un rumore steso sulla volta, e si riconosce subito.
//
// LA DIVISIONE SI FERMA CON UN FONDO E NON CON UN TAPPO: all'orizzonte il
// denominatore tende a zero e il rumore diventerebbe piu' fitto del pixel,
// cioe' formicolio, ma un «max» secco farebbe smettere la coordinata di
// dipendere dall'altezza e le nuvole diventerebbero strisce verticali con i
// bordi dritti. «d.y + 0,05» e' monotono e senza ginocchio.
// E la fascia si apre SOPRA la riga e non sulla riga, perche' li' sotto
// comincia l'architettura della corte e una nuvola che vale qualcosa a quota
// zero ci lascerebbe uno scalino contro.
float nuvole(vec3 d) {
  // il confronto secco prima delle due curve: fuori dalla fascia ci sta piu' di
  // meta' della volta, e quei pixel non devono pagare nemmeno per scoprirlo
  if (d.y <= 0.0120 || d.y >= 0.3000) return 0.0;
  float banda = smoothstep(0.0120, 0.0600, d.y) * (1.0 - smoothstep(0.0900, 0.3000, d.y));
  if (banda <= 0.002) return 0.0;
  vec2 p = d.xz * (0.9000 / (d.y + 0.0500));
  float n = rum2(p) * 0.62 + rum2(p * 2.4 + 31.0) * 0.38;
  return smoothstep(0.5400, 0.8000, n) * banda;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;

  // LE TRE FASCE. L'esponente basso sulla prima tiene l'ambra schiacciata
  // sull'orizzonte — se sale troppo il crepuscolo diventa un tramonto da
  // cartolina, che e' un'altra cosa e legge come finto.
  float basso = pow(clamp(1.0 - h * 2.4, 0.0, 1.0), 2.6);
  float alto  = pow(clamp(h * 1.35, 0.0, 1.0), 0.75);

  vec3 c = mix(mezzo, zenit, alto);
  c = mix(c, orizzonte, basso);

  // L'ALONE DEL SOLE, che sta sotto la linea di terra. Largo e debole: e' la
  // luce diffusa dall'atmosfera, non il disco.
  float vicino = max(dot(d, normalize(versoSole)), 0.0);
  c += caldo * forzaAlone * pow(vicino, 3.0) * clamp(1.0 - h * 1.8, 0.0, 1.0);

  // LE NUVOLE BASSE, e sono l'unica cosa che sta DENTRO il gradiente.
  //
  // Tre fasce interpolate bene restano tre fasce interpolate bene: un occhio
  // allenato legge «cielo calcolato» in mezzo secondo, e non perche' i colori
  // siano sbagliati — sono misurati sul panorama, riga per riga — ma perche' in
  // natura non esiste un cielo con dentro NIENTE. E le nuvole fanno anche il
  // secondo mestiere: sono l'unica cosa di cui si conosca la misura vera senza
  // pensarci, quindi danno una SCALA al fondo. Senza scala, l'orizzonte e' una
  // linea; con la scala, e' una distanza.
  //
  // Si SCURISCE il cielo dove passano, non lo si schiarisce: a quest'ora la
  // sorgente e' la volta e la nuvola la vede di sotto. E' anche l'unico modo di
  // non farle fiorire, visto che qui sotto i valori vanno sopra uno e la soglia
  // del bagliore e' a 2,6. Il massimo che questa riga puo' fare e' togliere il
  // diciotto per cento, che e' esattamente quanto ne toglie la stessa riga in
  // «Lastra.ts».
  c = mix(c, c * 0.66 + caldo * 0.10, nuvole(d) * 0.55);

  // SOTTO LA LINEA DI TERRA il cielo si spegne verso il buio. Non serve a
  // vedersi — il pavimento lo copre — serve alla mappa d'ambiente: senza,
  // l'emisfero inferiore illumina il sotto-scocca come se ci fosse un
  // pavimento luminoso, e l'auto perde il peso.
  c *= mix(0.10, 1.0, smoothstep(-0.16, 0.02, h));

  // DISTURBO ORDINATO contro le fasce. Un gradiente cosi' lungo su otto bit
  // si vede a strisce; mezzo valore di rumore le rompe e non si nota.
  float g = fract(sin(dot(d.xy + d.z, vec2(12.9898, 78.233))) * 43758.5453);
  c += (g - 0.5) * 0.004;

  gl_FragColor = vec4(max(c, 0.0), 1.0);
}
`

/** l'azimut del sole, in gradi: da dove viene la luce calda */
export const AZIMUT_SOLE = 208
/** quanto sta SOTTO l'orizzonte, in gradi. Negativo = tramontato */
export const ALTEZZA_SOLE = -4.5

export function versoSole() {
  const a = (AZIMUT_SOLE * Math.PI) / 180
  const e = (ALTEZZA_SOLE * Math.PI) / 180
  return new Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e))
}

/**
 * IL CIELO FOTOGRAFICO E' STATO TOLTO — la seconda volta, e definitiva.
 *
 * Era tornato in forma di `qwantani_dusk_2_puresky`: un crepuscolo vero,
 * senza terreno e senza edifici, un megabyte. Serviva a portare i VALORI —
 * il rapporto esatto fra zenit e orizzonte, la gradazione dal blu all'ambra —
 * che un gradiente costruito non ha.
 *
 * Poi il luogo e' diventato una fotografia a 360 gradi intera, e quella
 * fotografia porta gli stessi valori piu' il posto: e' insieme fondo e mappa
 * d'ambiente (vedi `Panorama.ts`). Due cieli sovrapposti non fanno un cielo
 * migliore, fanno due orizzonti che non combaciano.
 *
 * Il gradiente costruito qui sotto RESTA, e non e' un residuo: e' la rete di
 * sicurezza. Se il panorama non arriva — rete lenta, file mancante — la scena
 * parte lo stesso con un cielo plausibile invece che nera. Costa zero byte e
 * si vede solo quando serve.
 */
export function costruisciCielo() {
  const m = new ShaderMaterial({
    uniforms: {
      // I VALORI SONO IN LINEARE E VANNO SOPRA 1 IN BASSO.
      //
      // L'orizzonte di un crepuscolo e' piu' luminoso del bianco medio: e'
      // una sorgente, non un colore. Tenerlo sotto 1 «per sicurezza» e'
      // l'errore che appiattisce tutti i cieli costruiti — diventano carta
      // colorata invece che aria illuminata.
      //
      // Ma resta SOTTO la soglia del bloom (2,6): un cielo che fiorisce e'
      // una nebbia, ed e' esattamente il difetto pagato tre volte.
      // I COLORI SONO CAMPIONATI DAL PANORAMA, non scelti.
      //
      // Questo cielo e' la rete di sicurezza: si vede solo nei decimi di
      // secondo prima che la fotografia arrivi. Proprio per questo deve
      // somigliarle — se somiglia, quel momento sembra la scena che si
      // schiarisce; se non somiglia, sembra un sito rotto che poi si aggiusta.
      //
      // Prima era un tramonto arancione (orizzonte 0,40/0,215/0,098) ereditato
      // da quando il luogo era un'altra cosa. Nel filmato, al secondo 1,2, il
      // fotogramma era un campo BEIGE con dentro una piattaforma nera. Non
      // sembrava un'attesa: sembrava un errore.
      //
      // I valori qui sotto sono la media in luce lineare di tre fasce di
      // `corte_pano.webp` — alta, media e all'orizzonte — misurate pixel per
      // pixel. Il caldo e' la luce che esce dalle vetrate, tenuta bassa perche'
      // qui e' un alone diffuso e non una sorgente.
      zenit: { value: [0.006, 0.075, 0.300] },
      mezzo: { value: [0.100, 0.160, 0.320] },
      orizzonte: { value: [0.151, 0.177, 0.246] },
      caldo: { value: [0.30, 0.20, 0.11] },
      versoSole: { value: versoSole() },
      forzaAlone: { value: 1.0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: BackSide,
    depthWrite: false,
    // il cielo non si tone-mappa da solo: e' la scena a farlo alla fine, e
    // trattarlo a parte lo scollerebbe dal resto
    toneMapped: true,
  })
  // 400 metri: piu' lontano del piano di taglio lontano della camera sarebbe
  // invisibile, piu' vicino entrerebbe nella nebbia
  const mesh = new Mesh(new SphereGeometry(160, 48, 24), m)
  mesh.name = 'CIELO'
  mesh.frustumCulled = false
  return mesh
}

/**
 * LA MAPPA D'AMBIENTE SI GENERA DALLA SCENA, non da un file.
 *
 * `PMREMGenerator.fromScene()` renderizza la scena in una mappa cubica e la
 * filtra per ruvidita'. Cioe': cio' che i materiali riflettono e' ESATTAMENTE
 * cio' che c'e' — il cielo costruito, e se si vuole anche l'architettura.
 * Con un file, invece, il riflesso mostra un posto e la geometria ne mostra
 * un altro, e quella discrepanza e' una delle voci della griglia diagnostica:
 * «sembra appoggiato sopra lo sfondo».
 *
 * SI RIGENERA QUANDO CAMBIA QUALCOSA, e basta. Non e' un costo per
 * fotogramma: e' un costo una volta, all'avvio, piu' una volta ogni volta che
 * si accende qualcosa di grande.
 */
export function ambienteDaScena(
  renderer: WebGLRenderer,
  scenaAmbiente: Scene,
): Texture {
  const pmrem = new PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const t = pmrem.fromScene(scenaAmbiente, 0, 0.1, 200).texture
  pmrem.dispose()
  return t
}
