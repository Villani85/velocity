/**
 * STIRARE LA LAMIERA — togliere le ammaccature da una carrozzeria generata.
 *
 * IL DIFETTO, misurato e non descritto.
 *
 * `ondulazione.mjs` dice che sulla CARROZZERIA la curvatura mediana e' 34,8
 * radianti al metro. Un raggio di curvatura di due centimetri e NOVE
 * millimetri: la superficie tipica di questa fiancata e' curva come una
 * pallina da golf. Su una fiancata vera il raggio sta fra mezzo metro e tre.
 *
 * Ecco perche' nessuna taratura della vernice ha mai risolto: non era la
 * vernice. Una vernice scura fa una cosa sola — rimanda quello che ha
 * intorno — e su una superficie accartocciata rimanda un mondo accartocciato.
 * Piu' la vernice diventa realistica, PIU' l'ammaccatura si vede. E' per
 * questo che il difetto e' peggiorato ogni volta che il materiale migliorava.
 *
 * TAUBIN, NON LAPLACE.
 *
 * Lo smorzamento laplaciano — sposta ogni vertice verso la media dei vicini —
 * liscia benissimo e RESTRINGE: applicato abbastanza volte, una sfera diventa
 * un punto. Su un'auto si vedrebbe come una carrozzeria che si sgonfia.
 *
 * Taubin alterna due passate: una in avanti con peso positivo (lambda) e una
 * all'indietro con peso negativo leggermente piu' grande (mu). La seconda
 * rigonfia esattamente cio' che la prima ha ristretto alle basse frequenze,
 * e lascia sgonfio solo il rumore ad alta frequenza. Il volume resta.
 *
 * I PESI SONO COTANGENTI, e questa e' la scoperta che ha sbloccato tutto.
 *
 * La prima stesura usava il laplaciano UNIFORME: la media semplice dei
 * vicini. E' quello che sta su tutti i tutorial, ed e' inutile qui. Portava la
 * mediana da 34,8 a 22 con dodici passate, a 19,5 con quaranta, a 17,3 con
 * duecentoquaranta. Si e' fermato. Non era filtro debole: era un PUNTO FISSO.
 *
 * La media semplice porta ogni vertice nel baricentro dei suoi vicini. Su una
 * maglia regolare quel baricentro sta sulla superficie liscia. Su una maglia
 * irregolare — vicini a distanze diverse, valenze da 4 a 9, che e' esattamente
 * come esce una maglia generata — NON ci sta: il baricentro e' spostato verso
 * il lato dove i vicini sono piu' fitti. Quindi il filtro converge a una
 * configurazione in cui i vertici sono ridistribuiti ma la superficie e'
 * ancora ondulata, e da li' non si muove piu' per quante passate si facciano.
 *
 * I pesi cotangenti tolgono di mezzo l'irregolarita'. Il peso di uno spigolo
 * e' la somma delle cotangenti dei due angoli che gli stanno di fronte nei
 * triangoli che lo condividono. Con quei pesi l'operatore non e' piu' una
 * media di vicini: e' la vera curvatura media della superficie, e non gliene
 * importa niente di come sono distribuiti i vertici. Il suo punto fisso e' la
 * superficie liscia, che e' quello che si sta cercando.
 *
 * Le cotangenti si RICALCOLANO a ogni passata, perche' dipendono dalla forma
 * dei triangoli e i triangoli si deformano mentre la superficie si liscia.
 * Congelandole al valore iniziale si liscia la forma di partenza, non quella
 * che si sta ottenendo.
 *
 * Le cotangenti negative — che nascono sui triangoli ottusi — si azzerano. Un
 * peso negativo tira il vertice DALLA PARTE OPPOSTA ai vicini, e su una maglia
 * generata di triangoli ottusi ce ne sono abbastanza da far esplodere il
 * filtro in una decina di passate.
 *
 * SI SALDA PRIMA DI LISCIARE, ed e' la parte che si sbaglia.
 *
 * In un GLB lo stesso punto dello spazio compare piu' volte: una per ogni
 * cucitura di UV e per ogni spigolo vivo. Sono vertici distinti con la stessa
 * posizione. Lisciando la maglia com'e', ogni copia si muove per conto suo
 * seguendo solo i vicini del suo pezzo — e le cuciture si aprono. Il modello
 * si spacca lungo le cuciture, che e' un difetto peggiore di quello di
 * partenza.
 *
 * Quindi si costruisce il grafo dei vicini sulle posizioni SALDATE, si liscia
 * quello, e si riporta la posizione nuova su tutte le copie.
 *
 * LE NORMALI SI RIFANNO SULLA MAGLIA ORIGINALE, non su quella saldata.
 *
 * La divisione dei vertici e' l'unico posto dove il GLB scrive quali spigoli
 * sono vivi e quali morbidi. Accumulando le normali sui vertici saldati si
 * perderebbe quell'informazione e ogni spigolo diventerebbe morbido: le
 * fessure fra i pannelli sparirebbero in una sbavatura.
 *
 *   node strumenti/stira.mjs <ingresso.glb> <uscita.glb> [passate]
 */
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

const INGRESSO = process.argv[2] || 'public/modelli/auto_parti.glb'
const USCITA = process.argv[3] || '.tmp/auto_stirata.glb'
const PASSATE = Number(process.argv[4] || 12)
/** quante volte si media il campo delle normali, dopo aver stirato le posizioni */
const NORMALI = Number(process.argv[5] || 6)

/**
 * I PESI COTANGENTI RESTANO NEL CODICE MA SPENTI, e vale la pena dire perche'
 * invece di cancellarli.
 *
 * Sono l'operatore GIUSTO — il laplaciano uniforme ha un punto fisso che non
 * e' la superficie liscia, e i cotangenti si' — e infatti lisciano meglio. Ma
 * il flusso di curvatura media, applicato senza redistribuire i vertici,
 * schiaccia i triangoli: a venti passate l'uno per cento degli spigoli e' gia'
 * degenerato, a cinquanta il due e mezzo, e la coda della misura esplode da
 * 837 a cinquemila radianti al metro. La superficie diventa piu' liscia E
 * PEGGIORE, che e' il tipo di risultato che un numero solo non fa vedere.
 *
 * Per usarli davvero servirebbe rifare la maglia a ogni passata. Non ne vale
 * la pena, perche' la parte che si vede la fa il campo delle normali.
 */
const COTANGENTI = process.argv[6] === 'cot'

/**
 * I PARAMETRI DI TAUBIN, e cosa succede a muoverli.
 *
 * lambda 0,60 e' quanto ogni passata in avanti tira il vertice verso i
 * vicini. mu -0,63 e' il rigonfiamento. La regola e' che 1/lambda + 1/mu stia
 * poco sopra zero: qui vale 0,079, cioe' il filtro comincia a tagliare
 * intorno a una lunghezza d'onda di ottanta millesimi della maglia. Sotto,
 * taglia. Sopra, lascia stare.
 *
 * Con mu troppo vicino a -lambda il filtro non taglia piu' niente. Con mu
 * troppo lontano rigonfia piu' di quanto ha ristretto e la carrozzeria si
 * gonfia a bolle.
 */
const LAMBDA = 0.60
const MU = -0.63

/**
 * QUALI PEZZI SI STIRANO: quelli VERNICIATI, cioe' quelli su cui una
 * ammaccatura si legge come un danno.
 *
 * Sui cerchi no: un cerchio ha razze vive, e' fatto di spigoli, e lisciandolo
 * si scioglie. Sui fari no: un'ottica e' fatta di sfaccettature, ed e' proprio
 * quello il suo aspetto. Sul parabrezza no: misura gia' 2,9 rad/m, cioe' e'
 * gia' liscio quanto deve essere un vetro.
 */
const VERNICIATI = /^(CARROZZERIA|MINIGONNA|SPLITTER|DIFFUSORE|PRESA|ALA|PEZZO_0[1-3]|PARABREZZA)/

const doc = await io.read(INGRESSO)
const GRIGLIA = 1e4       // 0,1 mm: due punti piu' vicini di cosi' sono lo stesso punto

for (const mesh of doc.getRoot().listMeshes()) {
  if (!VERNICIATI.test(mesh.getName())) continue
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION')
    const N = prim.getAttribute('NORMAL')
    const I = prim.getIndices()
    if (!P || !I) continue
    const n = P.getCount()
    const idx = I.getArray()

    // ---- saldatura: ogni posizione diventa un nodo unico
    const chiave = new Map()
    const rap = new Int32Array(n)
    const xyz = []
    const v = [0, 0, 0]
    for (let i = 0; i < n; i++) {
      P.getElement(i, v)
      const k = Math.round(v[0] * GRIGLIA) + '_' +
                Math.round(v[1] * GRIGLIA) + '_' +
                Math.round(v[2] * GRIGLIA)
      let r = chiave.get(k)
      if (r === undefined) { r = xyz.length / 3; chiave.set(k, r); xyz.push(v[0], v[1], v[2]) }
      rap[i] = r
    }
    const m = xyz.length / 3
    let pos = Float64Array.from(xyz)

    // ---- vicini, in liste piatte: con mezzo milione di spigoli gli array di
    // array costano piu' della matematica che ci gira dentro
    const grado = new Int32Array(m)
    for (let t = 0; t < idx.length; t += 3) {
      const a = rap[idx[t]], b = rap[idx[t + 1]], c = rap[idx[t + 2]]
      grado[a] += 2; grado[b] += 2; grado[c] += 2
    }
    const inizio = new Int32Array(m + 1)
    for (let i = 0; i < m; i++) inizio[i + 1] = inizio[i] + grado[i]
    const vicini = new Int32Array(inizio[m])
    const cursore = Int32Array.from(inizio)
    // per ogni triangolo si tiene da parte DOVE stanno i suoi tre spigoli
    // dentro le liste piatte, nei due versi: serve a ributtarci sopra le
    // cotangenti a ogni passata senza rifare la ricerca
    const tri = new Int32Array(idx.length)
    const posto = new Int32Array(idx.length * 2)
    let nt = 0
    for (let t = 0; t < idx.length; t += 3) {
      const a = rap[idx[t]], b = rap[idx[t + 1]], c = rap[idx[t + 2]]
      tri[t] = a; tri[t + 1] = b; tri[t + 2] = c
      const coppie = [[a, b], [b, c], [c, a]]
      for (let e = 0; e < 3; e++) {
        const [u, w] = coppie[e]
        posto[(t + e) * 2] = cursore[u]; vicini[cursore[u]++] = w
        posto[(t + e) * 2 + 1] = cursore[w]; vicini[cursore[w]++] = u
      }
      nt++
    }

    const peso = new Float64Array(vicini.length)
    const somma = new Float64Array(m)

    /** cot dell'angolo in `o` fra i lati che vanno a `u` e a `w` */
    const cot = (p, o, u, w) => {
      const ax = p[u] - p[o], ay = p[u + 1] - p[o + 1], az = p[u + 2] - p[o + 2]
      const bx = p[w] - p[o], by = p[w + 1] - p[o + 1], bz = p[w + 2] - p[o + 2]
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx
      const area2 = Math.hypot(cx, cy, cz)
      if (area2 < 1e-14) return 0
      const c = (ax * bx + ay * by + az * bz) / area2
      return c > 0 ? c : 0          // le ottuse si buttano: vedi in testa
    }

    const ripesa = (p) => {
      peso.fill(0); somma.fill(0)
      if (!COTANGENTI) {
        peso.fill(1)
        for (let i = 0; i < m; i++) somma[i] = inizio[i + 1] - inizio[i]
        return
      }
      for (let t = 0; t < idx.length; t += 3) {
        const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3
        // lo spigolo a-b ha di fronte c, b-c ha a, c-a ha b
        const w0 = cot(p, c, a, b), w1 = cot(p, a, b, c), w2 = cot(p, b, c, a)
        const ws = [w0, w1, w2]
        for (let e = 0; e < 3; e++) {
          peso[posto[(t + e) * 2]] += ws[e]
          peso[posto[(t + e) * 2 + 1]] += ws[e]
        }
      }
      // il totale per vertice si ricava dai pesi appena scritti, invece di
      // accumularlo in parallelo: un solo posto dove sbagliare invece di due
      for (let i = 0; i < m; i++) {
        let S = 0
        for (let j = inizio[i]; j < inizio[i + 1]; j++) S += peso[j]
        somma[i] = S
      }
    }

    // ---- Taubin con pesi cotangenti
    const passa = (w, dentro, fuori) => {
      for (let i = 0; i < m; i++) {
        const o = i * 3
        const S = somma[i]
        if (!S) { fuori[o] = dentro[o]; fuori[o + 1] = dentro[o + 1]; fuori[o + 2] = dentro[o + 2]; continue }
        let sx = 0, sy = 0, sz = 0
        for (let j = inizio[i]; j < inizio[i + 1]; j++) {
          const k = vicini[j] * 3, q = peso[j]
          sx += q * dentro[k]; sy += q * dentro[k + 1]; sz += q * dentro[k + 2]
        }
        fuori[o] = dentro[o] + w * (sx / S - dentro[o])
        fuori[o + 1] = dentro[o + 1] + w * (sy / S - dentro[o + 1])
        fuori[o + 2] = dentro[o + 2] + w * (sz / S - dentro[o + 2])
      }
    }
    let alt = new Float64Array(m * 3)
    for (let p = 0; p < PASSATE; p++) {
      ripesa(pos)
      passa(LAMBDA, pos, alt)
      const t1 = pos; pos = alt; alt = t1
      passa(MU, pos, alt)
      const t2 = pos; pos = alt; alt = t2
    }
    void nt

    // ---- si riscrive: posizioni dal nodo saldato, normali dalla maglia vera
    const nuove = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const r = rap[i] * 3
      nuove[i * 3] = pos[r]; nuove[i * 3 + 1] = pos[r + 1]; nuove[i * 3 + 2] = pos[r + 2]
    }
    P.setArray(nuove).setNormalized(false)

    if (N) {
      const nn = new Float32Array(n * 3)
      for (let t = 0; t < idx.length; t += 3) {
        const i0 = idx[t] * 3, i1 = idx[t + 1] * 3, i2 = idx[t + 2] * 3
        const ux = nuove[i1] - nuove[i0], uy = nuove[i1 + 1] - nuove[i0 + 1], uz = nuove[i1 + 2] - nuove[i0 + 2]
        const wx = nuove[i2] - nuove[i0], wy = nuove[i2 + 1] - nuove[i0 + 1], wz = nuove[i2 + 2] - nuove[i0 + 2]
        // non normalizzata di proposito: la lunghezza del prodotto vettoriale
        // e' il doppio dell'area, e pesare per area e' cio' che impedisce a un
        // triangolo sottile di contare quanto un pannello
        const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx
        nn[i0] += fx; nn[i0 + 1] += fy; nn[i0 + 2] += fz
        nn[i1] += fx; nn[i1 + 1] += fy; nn[i1 + 2] += fz
        nn[i2] += fx; nn[i2 + 1] += fy; nn[i2 + 2] += fz
      }
      for (let i = 0; i < n; i++) {
        const o = i * 3
        const L = Math.hypot(nn[o], nn[o + 1], nn[o + 2]) || 1
        nn[o] /= L; nn[o + 1] /= L; nn[o + 2] /= L
      }
      // ---- E POI SI LISCIA IL CAMPO DELLE NORMALI, che e' cio' che si vede.
      //
      // Un'ammaccatura non si vede nella sagoma: si vede nel RIFLESSO, e il
      // riflesso dipende solo da dove punta la normale. Due superfici con la
      // stessa forma e normali diverse leggono come due materiali diversi —
      // e' su questo che si regge tutta la mappatura delle normali.
      //
      // Quindi, dopo aver stirato le posizioni per quel che si poteva, si
      // stira il campo delle normali per conto suo. Non e' un trucco: e' la
      // stessa cosa che fa il modificatore «normali pesate» di Blender, ed e'
      // uso corrente su modelli scansionati.
      //
      // SI LISCIA SULLA MAGLIA ORIGINALE, NON SU QUELLA SALDATA, e qui la
      // ragione conta: la divisione dei vertici e' l'unico posto dove il GLB
      // scrive quali spigoli sono vivi. Due copie dello stesso punto che
      // stanno su due lati di una fessura non si vedono fra loro, quindi non
      // si mediano, quindi la fessura resta netta. Sulla maglia saldata si
      // sarebbero mediate e ogni fessura fra i pannelli sarebbe diventata una
      // sbavatura.
      const vicN = new Map()
      const aggiungi = (a, b) => {
        let l = vicN.get(a); if (!l) { l = []; vicN.set(a, l) }
        if (!l.includes(b)) l.push(b)
      }
      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2]
        aggiungi(a, b); aggiungi(b, a); aggiungi(b, c)
        aggiungi(c, b); aggiungi(c, a); aggiungi(a, c)
      }
      let cur = nn, alt2 = new Float32Array(n * 3)
      for (let g = 0; g < NORMALI; g++) {
        for (let i = 0; i < n; i++) {
          const l = vicN.get(i)
          const o = i * 3
          if (!l) { alt2[o] = cur[o]; alt2[o + 1] = cur[o + 1]; alt2[o + 2] = cur[o + 2]; continue }
          let x = cur[o], y = cur[o + 1], z = cur[o + 2]
          for (const j of l) { const k = j * 3; x += cur[k]; y += cur[k + 1]; z += cur[k + 2] }
          const L = Math.hypot(x, y, z) || 1
          alt2[o] = x / L; alt2[o + 1] = y / L; alt2[o + 2] = z / L
        }
        const t3 = cur; cur = alt2; alt2 = t3
      }
      N.setArray(cur).setNormalized(false)
    }
    console.log(mesh.getName().padEnd(22), n, 'vertici ->', m, 'saldati')
  }
}

// si riscrive senza compressione: la rimette `alleggerisci.mjs`, che e' anche
// l'unico posto dove sta scritto con quali impostazioni
doc.getRoot().listExtensionsUsed().forEach((e) => e.dispose())
await io.write(USCITA, doc)
console.log('scritto', USCITA, 'con', PASSATE, 'passate di Taubin')
