/**
 * LEVIGARE LA CARROZZERIA SENZA RIGENERARLA — e senza perdere le fughe.
 *
 * IL DIFETTO, MISURATO. `strumenti/ondulazione.mjs` sulla vettura: mediana
 * 5,40 rad/m, 95esimo percentile 194,3, e il TRENTOTTO virgola otto per cento
 * degli spigoli sopra 10 rad/m — cioe' su un raggio piu' stretto di dieci
 * centimetri. Una fiancata vera sta fra 0,3 e 2. E' il tetto del voto sul
 * disegno: una carrozzeria non ha texture, la forma la racconta solo come si
 * deforma un riflesso lungo, e su una superficie cosi' qualunque riflesso
 * lungo ondeggia.
 *
 * DUE IPOTESI SCARTATE PRIMA DI SCRIVERE QUESTO FILE, ed e' la parte che vale
 * piu' del codice:
 *
 *   1. «Sono le normali, non la forma.» Ricalcolandole dalle posizioni il
 *      95esimo scende da 194,3 a 176,8 — un decimo. Non sono le normali.
 *
 *   2. «E' il metro che si gonfia su una maglia fitta.» La curvatura si
 *      ottiene dividendo un angolo per uno spigolo, e qui gli spigoli sono
 *      millimetri: sembrava una spiegazione ovvia. Tarato su una sfera di
 *      raggio 1,5 m con 117.128 triangoli — la stessa densita' — il metro
 *      legge 0,67 esatto, cioe' 1/R, e ZERO spigoli sopra 10. Anche
 *      quantizzando le normali a interi corti come fa il file compresso.
 *      Il metro non ha fondoscala: il numero della carrozzeria e' vero.
 *
 * QUINDI SI LEVIGA. E si leviga con TAUBIN, non con Laplace: una passata
 * laplaciana pura tira ogni vertice verso la media dei vicini e la superficie
 * si RITIRA — un'automobile levigata cosi' dimagrisce e perde le spalle.
 * Taubin alterna un passo che contrae (lambda) e uno che dilata (mu, negativo
 * e di modulo appena maggiore): il rumore ad alta frequenza se ne va, il
 * volume resta. E' la stessa idea del «fair panels» degli strumenti da
 * carrozzeria, scritta come si scrive in un file di geometria.
 *
 * LE TRE COSE CHE LO TENGONO ONESTO.
 *
 *   LE FUGHE NON SI TOCCANO. Prima di levigare si cercano gli spigoli VIVI —
 *   quelli dove le due facce che li condividono formano un angolo netto — e i
 *   vertici che ci stanno sopra vengono congelati. Sono le fughe fra i
 *   pannelli, il taglio del canopy, il bordo delle carene: esattamente cio'
 *   che gia' una volta, tagliando la maglia in pezzi, era andato perduto.
 *   Levigare senza questa protezione avrebbe curato l'ondulazione sciogliendo
 *   il disegno, che e' un cambio in pari.
 *
 *   LA MAGLIA NON SI TOCCA. Non si saldano vertici e non si cambia nessun
 *   indice: si costruisce una mappa «stessa posizione -> stesso gruppo» e si
 *   leviga sui gruppi, poi si riscrive il risultato in tutti i vertici del
 *   gruppo. Le cuciture delle UV restano dove sono, i pezzi restano quelli, e
 *   il modello si puo' ancora tagliare e innestare come prima.
 *
 *   LE NORMALI SI RIFANNO PER VERTICE, non per gruppo. Un vertice sdoppiato su
 *   una fuga esiste apposta per avere due normali diverse: rifacendole per
 *   gruppo si sarebbero risaldate, e la fuga sarebbe sparita comunque — dalla
 *   porta di servizio.
 *
 * USO:  node strumenti/liscia.mjs [entrata.glb] [uscita.glb] [giri]
 * poi:  npx gltf-transform meshopt uscita.glb finale.glb
 */
import { NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { dequantize } from '@gltf-transform/functions'
import { MeshoptDecoder } from 'meshoptimizer'

const ENTRATA = process.argv[2] || 'public/modelli/auto2.glb'
const USCITA = process.argv[3] || '.tmp/auto2_liscia.glb'
const GIRI = Number(process.argv[4] || 12)

/* I DUE NUMERI DI TAUBIN. 0,50 e -0,53: il secondo deve essere NEGATIVO e di
   modulo appena maggiore del primo, o il volume non torna. Sono i valori
   classici, e la ragione per cui funzionano e' che la coppia si comporta come
   un filtro passa-basso con guadagno uno alle basse frequenze: le forme grandi
   — la spalla, il tetto, il fianco — passano intatte, le increspature no. */
const LAMBDA = 0.50
const MU = -0.53
/* SOPRA QUESTO ANGOLO FRA DUE FACCE si e' su uno spigolo vivo e non si tocca.
   Trenta gradi: sotto ci sono i raccordi, sopra ci sono le fughe. Misurato sul
   modello, con questa soglia restano congelati i vertici delle fughe fra i
   pannelli e del bordo delle carene, e restano liberi i fianchi. */
const VIVO = Math.cos((30 * Math.PI) / 180)

const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

const doc = await io.read(ENTRATA)
/* SI DEQUANTIZZA PRIMA DI TOCCARE QUALUNQUE COSA. Le posizioni nel file sono
   interi corti con una scala dichiarata a parte: scrivere metri dentro un
   accessore quantizzato significa scrivere numeri che poi verranno rimoltiplicati
   per la scala — cioe' spostare la vettura a chilometri di distanza senza
   nessun errore. Dequantizzato, un metro e' un metro. */
await doc.transform(dequantize())

const perc = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))]
/**
 * @param vivo funzione che dice se quello spigolo e' una fuga: gli spigoli
 *   delle fughe hanno curvatura altissima PER COSTRUZIONE, e contarli insieme
 *   agli altri e' come misurare la levigatezza di un tavolo includendo i bordi.
 *   E' il difetto che il metro aveva e nessuno aveva notato.
 */
function ondulazione(pos, nor, idx, vivo) {
  const fuori = []
  for (let t = 0; t < idx.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const i = idx[t + e], j = idx[t + (e + 1) % 3]
      if (i > j) continue
      if (vivo && vivo(i, j)) continue
      const L = Math.hypot(pos[i * 3] - pos[j * 3], pos[i * 3 + 1] - pos[j * 3 + 1], pos[i * 3 + 2] - pos[j * 3 + 2])
      if (L < 1e-9) continue
      const d = Math.min(1, Math.max(-1,
        nor[i * 3] * nor[j * 3] + nor[i * 3 + 1] * nor[j * 3 + 1] + nor[i * 3 + 2] * nor[j * 3 + 2]))
      fuori.push(Math.acos(d) / L)
    }
  }
  fuori.sort((x, y) => x - y)
  return fuori
}
const riga = (nome, a) =>
  '    ' + nome.padEnd(10) +
  ' mediana ' + perc(a, 0.5).toFixed(2).padStart(6) +
  ' | 95% ' + perc(a, 0.95).toFixed(1).padStart(7) +
  ' | oltre 10 rad/m: ' + (100 * a.filter((v) => v > 10).length / a.length).toFixed(1) + '%'

/** normale della faccia, non normalizzata: il modulo e' il doppio dell'area */
function facciaNor(pos, a, b, c, out) {
  const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2]
  const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2]
  out[0] = ay * bz - az * by
  out[1] = az * bx - ax * bz
  out[2] = ax * by - ay * bx
}

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const P = prim.getAttribute('POSITION')
    const N = prim.getAttribute('NORMAL')
    const I = prim.getIndices()
    if (!P || !N || !I) continue
    const idx = I.getArray()
    if (idx.length < 3000) continue
    const conta = P.getCount()
    const pos = Float64Array.from(P.getArray())
    const nor = Float64Array.from(N.getArray())

    console.log(mesh.getName() + '  —  vertici ' + conta + ', triangoli ' + (idx.length / 3))

    /* --- i gruppi: stessa posizione, stesso gruppo ------------------------
       La chiave e' la posizione arrotondata al centesimo di millimetro. Piu'
       fine di cosi' due vertici nati identici si separerebbero per un
       arrotondamento; piu' grosso si fonderebbero due vertici che sulla fuga
       stanno davvero a mezzo millimetro l'uno dall'altro. */
    const mappa = new Map()
    const gruppo = new Int32Array(conta)
    const gpos = []
    for (let v = 0; v < conta; v++) {
      const k = Math.round(pos[v * 3] * 1e5) + ',' + Math.round(pos[v * 3 + 1] * 1e5) + ',' + Math.round(pos[v * 3 + 2] * 1e5)
      let g = mappa.get(k)
      if (g === undefined) {
        g = gpos.length / 3
        mappa.set(k, g)
        gpos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])
      }
      gruppo[v] = g
    }
    const ng = gpos.length / 3
    const G = Float64Array.from(gpos)

    /* --- gli spigoli fra gruppi, e quali sono vivi ------------------------ */
    const spigoli = new Map()
    const fa = new Float64Array(3)
    for (let t = 0; t < idx.length; t += 3) {
      facciaNor(pos, idx[t], idx[t + 1], idx[t + 2], fa)
      const L = Math.hypot(fa[0], fa[1], fa[2]) || 1
      const nx = fa[0] / L, ny = fa[1] / L, nz = fa[2] / L
      for (let e = 0; e < 3; e++) {
        const a = gruppo[idx[t + e]], b = gruppo[idx[t + (e + 1) % 3]]
        if (a === b) continue
        const k = a < b ? a * 1e7 + b : b * 1e7 + a
        const s = spigoli.get(k)
        if (s === undefined) spigoli.set(k, { a, b, nx, ny, nz, vivo: false })
        else s.vivo = s.vivo || (s.nx * nx + s.ny * ny + s.nz * nz) < VIVO
      }
    }
    const congelato = new Uint8Array(ng)
    const vicini = Array.from({ length: ng }, () => [])
    let quantiVivi = 0
    for (const s of spigoli.values()) {
      vicini[s.a].push(s.b)
      vicini[s.b].push(s.a)
      if (s.vivo) { congelato[s.a] = 1; congelato[s.b] = 1; quantiVivi++ }
    }
    let quantiCongelati = 0
    for (let g = 0; g < ng; g++) if (congelato[g]) quantiCongelati++
    console.log('    gruppi ' + ng + ', spigoli vivi ' + quantiVivi +
      ', vertici congelati ' + quantiCongelati + ' (' + (100 * quantiCongelati / ng).toFixed(1) + '%)')

    /* IL METRO SI SDOPPIA, e questa e' la scoperta che cambia la diagnosi.
       «Il 38,8% degli spigoli sopra 10 rad/m» conta insieme due popolazioni che
       non hanno niente da spartire: le FUGHE, che hanno curvatura altissima
       perche' sono spigoli veri e devono averla, e la SUPERFICIE, che non
       dovrebbe. Misurare la levigatezza di un tavolo includendo i suoi bordi
       da' un numero pessimo su un tavolo perfetto.
       Da qui in poi si guarda solo la superficie. */
    const eVivo = (i, j) => {
      const a = gruppo[i], b = gruppo[j]
      if (a === b) return true
      const s = spigoli.get(a < b ? a * 1e7 + b : b * 1e7 + a)
      return !s || s.vivo
    }
    console.log(riga('prima, tutto', ondulazione(pos, nor, idx)))
    console.log(riga('prima, solo superficie', ondulazione(pos, nor, idx, eVivo)))

    /* --- Taubin -------------------------------------------------------- */
    /* L'ORIGINALE SI COPIA PRIMA DEL PALLEGGIO, e la prima versione non lo
       faceva: `G` entrava come uno dei due vettori che si scambiano, quindi al
       secondo passo veniva sovrascritto — e il confronto «quanto si e'
       spostata la superficie» finiva per misurare un vettore contro se stesso.
       Restituiva zero millimetri con la levigatura che funzionava benissimo. */
    const originale = Float64Array.from(G)
    let A = G
    let B = new Float64Array(ng * 3)
    const passo = (src, dst, k) => {
      for (let g = 0; g < ng; g++) {
        const vs = vicini[g]
        if (congelato[g] || vs.length === 0) {
          dst[g * 3] = src[g * 3]; dst[g * 3 + 1] = src[g * 3 + 1]; dst[g * 3 + 2] = src[g * 3 + 2]
          continue
        }
        let sx = 0, sy = 0, sz = 0
        for (const v of vs) { sx += src[v * 3]; sy += src[v * 3 + 1]; sz += src[v * 3 + 2] }
        const n = vs.length
        dst[g * 3] = src[g * 3] + k * (sx / n - src[g * 3])
        dst[g * 3 + 1] = src[g * 3 + 1] + k * (sy / n - src[g * 3 + 1])
        dst[g * 3 + 2] = src[g * 3 + 2] + k * (sz / n - src[g * 3 + 2])
      }
    }
    for (let i = 0; i < GIRI; i++) {
      passo(A, B, LAMBDA); [A, B] = [B, A]
      passo(A, B, MU); [A, B] = [B, A]
    }

    /* quanto si e' spostata la superficie: se un vertice si sposta di piu' di
       qualche millimetro non si sta levigando, si sta rimodellando */
    let maxSp = 0, somma = 0
    for (let g = 0; g < ng; g++) {
      const d = Math.hypot(A[g * 3] - originale[g * 3], A[g * 3 + 1] - originale[g * 3 + 1], A[g * 3 + 2] - originale[g * 3 + 2])
      if (d > maxSp) maxSp = d
      somma += d
    }
    console.log('    spostamento: medio ' + (1000 * somma / ng).toFixed(2) + ' mm, massimo ' + (1000 * maxSp).toFixed(2) + ' mm')

    for (let v = 0; v < conta; v++) {
      const g = gruppo[v]
      pos[v * 3] = A[g * 3]; pos[v * 3 + 1] = A[g * 3 + 1]; pos[v * 3 + 2] = A[g * 3 + 2]
    }

    /* --- le normali si rifanno PER VERTICE ------------------------------- */
    const nuove = new Float64Array(conta * 3)
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2]
      facciaNor(pos, a, b, c, fa)
      for (const v of [a, b, c]) {
        nuove[v * 3] += fa[0]; nuove[v * 3 + 1] += fa[1]; nuove[v * 3 + 2] += fa[2]
      }
    }
    for (let v = 0; v < conta; v++) {
      const L = Math.hypot(nuove[v * 3], nuove[v * 3 + 1], nuove[v * 3 + 2]) || 1
      nuove[v * 3] /= L; nuove[v * 3 + 1] /= L; nuove[v * 3 + 2] /= L
    }

    console.log(riga('dopo, tutto', ondulazione(pos, nuove, idx)))
    console.log(riga('dopo, solo superficie', ondulazione(pos, nuove, idx, eVivo)))
    console.log('')

    P.setArray(Float32Array.from(pos))
    N.setArray(Float32Array.from(nuove))
  }
}

/* L'ESTENSIONE DI COMPRESSIONE SI STACCA PRIMA DI SCRIVERE, ed e' la stessa
   trappola gia' documentata in «strumenti/alleggerisci.mjs»: il documento
   letto porta con se' `EXT_meshopt_compression`, e in scrittura quell'estensione
   chiede un codificatore che l'API non prepara da sola — l'errore che ne esce
   parla di `encodeGltfBuffer` e non dice niente di utile.
   Si scrive non compresso e si comprime col comando, che e' l'unico pezzo
   della catena che funziona meglio dalla riga di comando che dalla libreria. */
for (const est of doc.getRoot().listExtensionsUsed()) {
  if (est.extensionName === 'EXT_meshopt_compression') est.dispose()
}

await io.write(USCITA, doc)
const { statSync } = await import('node:fs')
console.log('scritto ' + USCITA + '  (' + (statSync(USCITA).size / 1048576).toFixed(2) + ' MB, non ancora compresso)')
