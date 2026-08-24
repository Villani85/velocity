import { BufferAttribute, BufferGeometry, Material, Mesh } from 'three'

/**
 * LA GUARNIZIONE — la fascia nera sul bordo dei vetri.
 *
 * IL DIFETTO, indicato dal committente su due ritagli: lungo il bordo alto dei
 * finestrini e del parabrezza corre una riga chiara e frastagliata. «Definisci
 * meglio qui, magari con delle guarnizioni.»
 *
 * Ha ragione due volte. La riga chiara e' vera — il bordo di un guscio di vetro
 * quasi a specchio, visto di taglio, rimanda l'ambiente in una striscia sottile
 * — ed e' frastagliata perche' quel bordo e' una spezzata con pochi segmenti.
 * Ma soprattutto: su un'automobile vera quella riga NON C'E', ed e' proprio
 * questo il motivo per cui salta all'occhio.
 *
 * QUELLO CHE MANCA HA UN NOME. Ogni vetro d'auto ha una FASCIA CERAMICA
 * serigrafata sul bordo: nera, opaca, larga due o tre centimetri, con una
 * sfumatura a puntini verso il centro. Serve a proteggere l'adesivo dai raggi
 * ultravioletti e a nascondere la colla. E' il segno che, senza saperlo
 * nominare, distingue il vetro di un'automobile da un pezzo di specchio.
 *
 * PERCHE' NON GEOMETRIA NUOVA.
 *
 * La strada ovvia era costruire un cordolo attorno al bordo: un nastro di
 * triangoli lungo il perimetro. Costa geometria, costa una chiamata di disegno
 * per vetro, e soprattutto va cucito su un bordo che e' gia' frastagliato —
 * quindi il risultato sarebbe frastagliato pure lui.
 *
 * La fascia ceramica non e' un oggetto: e' una PROPRIETA' DELLA SUPERFICIE.
 * Quindi si calcola, una volta sola al caricamento, quanto ogni vertice dista
 * dal bordo del guscio, e da li' in poi ci pensa il materiale. Zero triangoli,
 * zero chiamate in piu', e il risultato segue il bordo qualunque forma abbia.
 *
 * COME SI TROVA IL BORDO DI UN GUSCIO.
 *
 * Uno spigolo interno appartiene a DUE triangoli; uno di bordo a uno solo. Si
 * contano, e quelli contati una volta sola sono il perimetro. Poi per ogni
 * vertice si cerca la distanza al vertice di bordo piu' vicino: e' una ricerca
 * a forza bruta, ma i vertici sono quattordicimila e quelli di bordo qualche
 * centinaio, e succede una volta sola mentre il modello si carica.
 */

/** quanto e' larga la fascia, in metri: due centimetri e mezzo, come sul vero */
const LARGA = 0.025
/** e quanto e' ruvida la ceramica: opaca, l'opposto del vetro */
const RUVIDA = 0.62

/**
 * LA MICROVARIAZIONE DI RUVIDITA' SUL BORDO — dieci centimetri, quattro
 * centesimi, e si nota.
 *
 * E' un punto d'audit sul vetro, ed e' vero anche fuori dallo schermo: un
 * cristallo d'automobile e' curvato a caldo su uno stampo, e la curvatura non
 * e' uniforme — verso il perimetro il raggio si stringe, il vetro si appoggia
 * allo stampo e la faccia esterna resta un po' meno piana che al centro. Chi
 * ha guardato un parabrezza di taglio contro un lampione l'ha visto: al centro
 * il riflesso e' netto, sui bordi si stira e si sfoca appena.
 *
 * A cosa serve QUI: la superficie ha una ruvidita' sola su tutto il guscio,
 * quindi il riflesso ha ovunque la stessa nitidezza, e una nitidezza costante
 * su una superficie curva e' uno dei segnali che l'occhio legge come
 * «generato». Quattro centesimi non si vedono come sfocatura — si vedono come
 * il riflesso che perde il filo avvicinandosi al montante, cioe' come vetro
 * vero.
 *
 * La fascia e' larga quattro volte la serigrafia apposta: la serigrafia e'
 * un bordo NETTO e questa deve essere un gradiente lungo, se no diventa un
 * secondo anello visibile — cioe' esattamente il difetto che la guarnizione
 * era venuta a togliere.
 */
const MICRO = 0.045
const LARGA_MICRO = LARGA * 4

/**
 * Calcola per ogni vertice la distanza dal bordo del guscio e la scrive
 * nell'attributo `bordo`. Ritorna false se la geometria non ha un bordo — cioe'
 * se e' un solido chiuso, dove una fascia non avrebbe senso.
 */
export function misuraBordo(g: BufferGeometry): boolean {
  if (g.getAttribute('bordo')) return true
  const pos = g.getAttribute('position')
  const idx = g.getIndex()
  if (!pos || !idx) return false

  // --- gli spigoli usati una volta sola ---------------------------------
  const conta = new Map<string, number>()
  const chiave = (a: number, b: number) => (a < b ? a + '_' + b : b + '_' + a)
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2)
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const k = chiave(u, v)
      conta.set(k, (conta.get(k) ?? 0) + 1)
    }
  }
  const orlo = new Set<number>()
  for (const [k, n] of conta) {
    if (n !== 1) continue
    const [u, v] = k.split('_')
    orlo.add(+u)
    orlo.add(+v)
  }
  if (!orlo.size) return false

  // --- e la distanza di ogni vertice dal piu' vicino di quelli ----------
  const bordi = [...orlo]
  const d = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    let piu = Infinity
    for (const j of bordi) {
      const dx = x - pos.getX(j), dy = y - pos.getY(j), dz = z - pos.getZ(j)
      const q = dx * dx + dy * dy + dz * dz
      if (q < piu) piu = q
      // uscita anticipata: sotto il millimetro non c'e' niente di piu' vicino
      // che cambi il risultato, e su quattordicimila vertici questo taglio
      // vale piu' di meta' del tempo
      if (piu < 1e-6) break
    }
    d[i] = Math.sqrt(piu)
  }
  g.setAttribute('bordo', new BufferAttribute(d, 1))
  return true
}

/**
 * Innesta la fascia nel materiale del vetro.
 *
 * `customProgramCacheKey` NON E' FACOLTATIVO: due materiali con gli stessi
 * parametri condividono il programma compilato, e senza una chiave diversa il
 * vetro con la fascia e il vetro senza si scambierebbero lo shader. E' una
 * trappola gia' pagata su questo progetto.
 *
 * E SI INCATENA, non si sovrascrive. `onBeforeCompile` e' UNA sola funzione:
 * chi arriva dopo cancella chi c'era prima, senza dire niente. Da quando il
 * vetro porta anche il suo Fresnel sulla trasmissione (`Materiali.vetro`,
 * innestato al momento della costruzione), assegnare qui direttamente
 * `m.onBeforeCompile` avrebbe buttato via quell'innesto — e il sintomo sarebbe
 * stato «la guarnizione funziona ma il vetro e' tornato trasparente», che
 * manda a cercare il difetto nella parte sbagliata del file. Vale anche per la
 * chiave: si concatena a quella di prima, se no una delle due varianti finisce
 * per usare il programma dell'altra.
 */
export function innestaGuarnizione(m: Material) {
  const q = m as Material & { __guarnizione?: boolean }
  if (q.__guarnizione) return
  q.__guarnizione = true

  const prima = m.onBeforeCompile
  const chiavePrima = m.customProgramCacheKey

  m.onBeforeCompile = function (s, r) {
    prima?.call(this, s, r)
    s.vertexShader = 'attribute float bordo;\nvarying float vOrlo;\n' + s.vertexShader
    s.vertexShader = s.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vOrlo = bordo;',
    )
    s.fragmentShader = 'varying float vOrlo;\n' + s.fragmentShader
    // la fascia: piena sul bordo, spenta a `LARGA` dal bordo. La sfumatura non
    // e' lineare — sulla serigrafia vera e' una trama di puntini che si dirada,
    // e al quadrato somiglia molto di piu' di una rampa dritta
    s.fragmentShader = s.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n' +
      '  float frit = 1.0 - smoothstep(0.0, ' + LARGA.toFixed(4) + ', vOrlo);\n' +
      '  frit *= frit;\n' +
      '  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.004, 0.004, 0.005), frit);\n' +
      // e diventa OPACA: un vetro serigrafato non lascia passare niente, ed e'
      // anche cio' che toglie la riga chiara — sotto la fascia non c'e' piu'
      // niente da rimandare
      '  diffuseColor.a = mix(diffuseColor.a, 1.0, frit);',
    )
    s.fragmentShader = s.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\n' +
      // PRIMA la microvariazione, POI la serigrafia. Sono due cose diverse che
      // stanno nello stesso posto: la microvariazione e' il vetro che verso il
      // bordo e' curvato di piu' (vedi `MICRO`), la serigrafia e' ceramica
      // stesa sopra. Dove c'e' la ceramica il vetro sotto non conta piu',
      // quindi il `mix` della fascia deve arrivare per ultimo e vincere.
      '  float orloDolce = 1.0 - smoothstep(0.0, ' + LARGA_MICRO.toFixed(4) + ', vOrlo);\n' +
      '  roughnessFactor += ' + MICRO.toFixed(4) + ' * orloDolce;\n' +
      '  roughnessFactor = mix(roughnessFactor, ' + RUVIDA.toFixed(3) + ', frit);',
    )
  }
  m.customProgramCacheKey = function () {
    return 'guarnizione|' + (chiavePrima ? chiavePrima.call(this) : '')
  }
  m.needsUpdate = true
}

/** comodita': misura e innesta su tutti i vetri di un modello */
export function guarnisci(radice: { traverse(f: (o: object) => void): void }) {
  radice.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh || !m.geometry) return
    const mat = m.material as Material & { name?: string }
    if (mat?.name !== 'VETRO') return
    if (misuraBordo(m.geometry)) innestaGuarnizione(mat)
  })
}
