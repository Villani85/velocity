/**
 * SCOMPORRE L'AUTO IN PARTI VERE.
 *
 * DA DOVE VIENE QUESTO FILE, e perche' cambia tutto.
 *
 * Per due giorni ho generato l'auto come un SOLIDO UNICO con una tessitura
 * dipinta sopra dall'intelligenza artificiale, e ho provato a farla sembrare
 * vera alzando la risoluzione di quella tessitura: da 2k a 4k a 8k, fino a
 * un passaggio «extreme» da trenta crediti. Non si e' mosso niente, e il
 * giudizio e' stato «cartapesta».
 *
 * La diagnosi giusta e' l'opposta di quella che stavo seguendo: NON MANCAVA
 * RISOLUZIONE, AVANZAVA TESSITURA. Una mappa generata da un'immagine ha la
 * luce COTTA DENTRO — l'ombra sotto lo specchietto, il riflesso sul cofano,
 * il riverbero del pavimento dello studio in cui e' stata immaginata. Quella
 * luce finta si somma alla luce vera della scena e non risponde a niente: se
 * la camera gira, resta ferma; se il pannello si sposta, non si sposta. E'
 * esattamente la definizione di cartapesta — una fotografia incollata su un
 * volume.
 *
 * E la stessa mappa dipinge di nero i finestrini, di grigio i cerchi e di
 * rosso i fanali, cioe' finge quattro materiali diversi su un solo
 * materiale. Nessuno dei quattro puo' comportarsi come deve: il vetro non
 * rifrange, il metallo non riflette, la vernice non ha trasparente.
 *
 * LA STRADA GIUSTA: `generate_parts=true`.
 *
 * Restituisce GEOMETRIA NUDA divisa in parti — trenta, in questo caso, che
 * si riconoscono una per una dalle loro misure. Niente tessitura, e va bene
 * cosi': una carrozzeria nera lucida non ha NIENTE da mostrare in una mappa
 * di colore. E' un colore solo, e tutto quello che si vede sono riflessi. Il
 * materiale batte la tessitura, e costa anche meno.
 *
 * E' anche la ragione per cui The Watch funziona: non ha una tessitura
 * fotorealistica, ha QUATTRO FINITURE. Sono materiali.
 *
 * COSA FA QUESTO STRUMENTO.
 *
 * 1. da' un nome a ogni parte, riconoscendola dalla posizione e
 *    dall'ingombro — non dall'ordine, che cambia a ogni rigenerazione
 * 2. butta i frammenti degenerati (parti da due triangoli: rumore)
 * 3. semplifica OGNI PARTE CON UN BUDGET SUO
 * 4. riscrive un GLB con i nomi che il sito si aspetta
 *
 * IL BUDGET PER PARTE E' IL PUNTO, e non e' una micro-ottimizzazione.
 *
 * 1,9 milioni di triangoli non stanno sul web; ma tagliare tutto alla stessa
 * frazione e' sbagliato in due modi insieme. La carrozzeria vista da sei
 * metri non ha bisogno di 790.000 triangoli — a quella distanza ne bastano
 * centomila e non si distingue. Il FARO invece, che nel nuovo percorso viene
 * attraversato da vicinissimo e riempie lo schermo, va tenuto alto: e'
 * l'unico oggetto che si guarda da dieci centimetri.
 *
 * La regola e' sempre la stessa del progetto precedente: la densita' che
 * serve non e' un numero assoluto, e' quanti pixel di schermo l'oggetto
 * occupa alla distanza a cui vive davvero.
 *
 *   node strumenti/scomponi.mjs <ingresso.glb> <uscita.glb>
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { weld, prune, dedup } from '@gltf-transform/functions'
import { MeshoptSimplifier, MeshoptDecoder } from 'meshoptimizer'
import { statSync } from 'node:fs'

const ingresso = process.argv[2]
const uscita = process.argv[3]
if (!ingresso || !uscita) {
  console.error('uso: node strumenti/scomponi.mjs <ingresso.glb> <uscita.glb>')
  process.exit(1)
}

await MeshoptSimplifier.ready
await MeshoptDecoder.ready

/**
 * IL RICONOSCITORE.
 *
 * Ogni voce dice dove sta la parte e quanto e' grande, in FRAZIONI
 * dell'ingombro totale — mai in metri. Cosi' funziona anche se il
 * generatore restituisce l'auto a una scala diversa, che succede a ogni
 * rigenerazione ed e' la trappola classica di questi asset.
 *
 * L'asse Z e' la lunghezza, e Z POSITIVO E' IL DAVANTI: si deduce dal fatto
 * che l'ala e il diffusore stanno entrambi a z negativo, e un'ala non sta
 * mai sul muso.
 *
 * `budget` e' il tetto di triangoli, ed e' scelto sulla distanza minima a
 * cui la camera arriva a quella parte nel percorso.
 */
const RICONOSCI = [
  // nome            test sul centro (c) e sull'ingombro (d), entrambi normalizzati
  // 340.000 E NON 140.000, e il numero viene da una fotografia ravvicinata.
  //
  // A 140k, da otto metri, la carrozzeria e' perfetta. A un metro — che e' la
  // distanza a cui il nuovo percorso porta la camera per entrare nel faro —
  // ogni triangolo occupa una decina di pixel, e sotto un trasparente lucido
  // le facce piatte si vedono UNA PER UNA: il giudizio e' stato «il
  // parabrezza e' a quadratini».
  //
  // Il conto e' lo stesso texel/mm del progetto precedente, applicato alla
  // geometria: quanti triangoli servono non e' un numero assoluto, e' quanti
  // PIXEL ne occupa uno alla distanza a cui l'oggetto vive davvero. A un
  // metro, con 1200 px di larghezza e un campo di 40 gradi, un triangolo da
  // 3 mm sta sotto i due pixel — e sotto i due pixel non si vede piu'.
  { nome: 'CARROZZERIA', budget: 340000, test: (c, d) => d[0] > 0.8 && d[1] > 0.8 && d[2] > 0.9 },
  { nome: 'FARO_DX',     budget: 30000,  test: (c, d) => c[2] > 0.33 && c[1] > -0.1 && c[1] < 0.12 && c[0] > 0.18 && d[0] < 0.25 },
  { nome: 'FARO_SX',     budget: 30000,  test: (c, d) => c[2] > 0.33 && c[1] > -0.1 && c[1] < 0.12 && c[0] < -0.18 && d[0] < 0.25 },
  { nome: 'RUOTA_POST_DX', budget: 30000, test: (c, d) => c[2] < -0.18 && c[0] > 0.28 && d[1] > 0.4 },
  { nome: 'RUOTA_POST_SX', budget: 30000, test: (c, d) => c[2] < -0.18 && c[0] < -0.28 && d[1] > 0.4 },
  { nome: 'RUOTA_ANT_DX',  budget: 30000, test: (c, d) => c[2] > 0.18 && c[0] > 0.28 && d[1] > 0.4 },
  { nome: 'RUOTA_ANT_SX',  budget: 30000, test: (c, d) => c[2] > 0.18 && c[0] < -0.28 && d[1] > 0.4 },
  { nome: 'PARABREZZA',  budget: 40000,  test: (c, d) => c[1] > 0.2 && Math.abs(c[0]) < 0.1 && d[0] > 0.5 && c[2] > 0.05 },
  { nome: 'VETRO_DX',    budget: 30000,  test: (c, d) => c[1] > 0.2 && c[0] > 0.2 && d[2] > 0.25 },
  { nome: 'VETRO_SX',    budget: 30000,  test: (c, d) => c[1] > 0.2 && c[0] < -0.2 && d[2] > 0.25 },
  { nome: 'ALA',         budget: 16000,  test: (c, d) => c[1] > 0.25 && c[2] < -0.3 && d[0] > 0.5 },
  { nome: 'DIFFUSORE',   budget: 20000,  test: (c, d) => c[1] < -0.2 && c[2] < -0.3 && d[0] > 0.6 },
  { nome: 'SPLITTER',    budget: 22000,  test: (c, d) => c[1] < -0.2 && c[2] > 0.3 && d[0] > 0.6 },
  { nome: 'MINIGONNA_DX', budget: 9000,  test: (c, d) => Math.abs(c[0]) > 0.33 && c[1] < -0.2 && d[2] > 0.3 && c[0] > 0 },
  { nome: 'MINIGONNA_SX', budget: 9000,  test: (c, d) => Math.abs(c[0]) > 0.33 && c[1] < -0.2 && d[2] > 0.3 && c[0] < 0 },
  { nome: 'SPECCHIO_DX', budget: 14000,   test: (c, d) => Math.abs(c[0]) > 0.4 && c[1] > 0.1 && d[2] < 0.1 && c[0] > 0 },
  { nome: 'SPECCHIO_SX', budget: 14000,   test: (c, d) => Math.abs(c[0]) > 0.4 && c[1] > 0.1 && d[2] < 0.1 && c[0] < 0 },
  { nome: 'PRESA',       budget: 12000,  test: (c, d) => c[1] > 0.05 && c[1] < 0.25 && d[0] > 0.5 },
]

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(ingresso)

// SI SALDANO I VERTICI PRIMA DI SEMPLIFICARE, e senza questo passaggio la
// semplificazione non fa quasi niente. Un mesh esportato ha i vertici
// duplicati a ogni faccia per via delle normali; il semplificatore vede
// milioni di isole staccate di tre vertici l'una e non puo' fondere niente,
// perche' fondere significa collassare uno spigolo CONDIVISO.
// E' la stessa categoria dell'errore gia' pagato sul mobile del CRT: due
// superfici che sembrano una sola e non lo sono.
await doc.transform(dedup(), weld({ tolerance: 0.00005 }), prune())

// --- misure globali, per normalizzare ---------------------------------
function scatola(nodo) {
  const m = nodo.getMesh()
  const t = nodo.getTranslation()
  const s = nodo.getScale()
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
  let tri = 0
  for (const p of m.listPrimitives()) {
    tri += (p.getIndices()?.getCount() ?? 0) / 3
    const pos = p.getAttribute('POSITION')
    const mn = pos.getMin([])
    const mx = pos.getMax([])
    for (let k = 0; k < 3; k++) {
      // con scala negativa min e max si scambiano: si prendono entrambi
      const a = mn[k] * s[k] + t[k]
      const c = mx[k] * s[k] + t[k]
      b[k] = Math.min(b[k], a, c)
      b[k + 3] = Math.max(b[k + 3], a, c)
    }
  }
  return { b, tri }
}

const nodi = doc.getRoot().listNodes().filter((n) => n.getMesh())
const G = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]
const info = new Map()
for (const n of nodi) {
  const s = scatola(n)
  info.set(n, s)
  for (let k = 0; k < 3; k++) {
    G[k] = Math.min(G[k], s.b[k])
    G[k + 3] = Math.max(G[k + 3], s.b[k + 3])
  }
}
const S = [G[3] - G[0], G[4] - G[1], G[5] - G[2]]
const C = [(G[0] + G[3]) / 2, (G[1] + G[4]) / 2, (G[2] + G[5]) / 2]

// --- riconoscimento ----------------------------------------------------
const presi = new Set()
const assegnati = []
for (const n of nodi) {
  const { b, tri } = info.get(n)
  // FRAMMENTI DEGENERATI: due o quattro triangoli. Non sono parti, sono
  // rumore del segmentatore, e portati in scena diventano schegge nere che
  // appaiono e spariscono. Si buttano qui, dove si vedono.
  if (tri < 200) { n.dispose(); continue }
  const c = [0, 1, 2].map((i) => ((b[i] + b[i + 3]) / 2 - C[i]) / S[i])
  const d = [0, 1, 2].map((i) => (b[i + 3] - b[i]) / S[i])
  const voce = RICONOSCI.find((v) => !presi.has(v.nome) && v.test(c, d))
  if (voce) presi.add(voce.nome)
  assegnati.push({ nodo: n, tri, nome: voce?.nome ?? null, budget: voce?.budget ?? 6000, c, d })
}

// cio' che nessuna regola ha riconosciuto resta, ma numerato e dichiarato:
// buttarlo significherebbe perdere pezzi veri per colpa di una regola
// scritta male, e in scena si vedrebbe un buco
let ignoti = 0
for (const a of assegnati) if (!a.nome) a.nome = `PEZZO_${String(ignoti++).padStart(2, '0')}`

// --- semplificazione, una parte per volta ------------------------------
console.log('parte              tri prima   ->   tri dopo    errore')
let prima = 0
let dopo = 0
for (const a of assegnati.sort((x, y) => y.tri - x.tri)) {
  const mesh = a.nodo.getMesh()
  a.nodo.setName(a.nome)
  mesh.setName(a.nome)
  let t0 = 0
  let t1 = 0
  let errMax = 0
  for (const p of mesh.listPrimitives()) {
    const idx = p.getIndices()
    const pos = p.getAttribute('POSITION')
    if (!idx) continue
    const n0 = idx.getCount()
    t0 += n0 / 3
    const bersaglio = Math.min(n0, Math.max(300, Math.round(a.budget * 3 * (n0 / 3 / a.tri))))
    if (bersaglio >= n0) { t1 += n0 / 3; continue }
    const [nuovi, err] = MeshoptSimplifier.simplify(
      idx.getArray(),
      pos.getArray(),
      3,
      bersaglio,
      // 1% DI ERRORE, e non e' poco: e' il massimo scostamento consentito
      // in frazione dell'ingombro. Su un'auto lunga 4,5 metri fa 4,5 cm, che
      // e' invisibile a sei metri e sarebbe grave a dieci centimetri —
      // ecco perche' il faro ha un budget alto invece di un errore basso.
      0.01,
      ['LockBorder'],
    )
    errMax = Math.max(errMax, err)
    idx.setArray(nuovi.constructor === Uint32Array ? nuovi : new Uint32Array(nuovi))
    t1 += nuovi.length / 3
  }
  prima += t0
  dopo += t1
  console.log(
    `${a.nome.padEnd(16)} ${String(Math.round(t0)).padStart(9)}   ->  ${String(Math.round(t1)).padStart(9)}    ${(errMax * 100).toFixed(2)}%`,
  )
}

await doc.transform(prune())
await io.write(uscita, doc)
console.log(
  `\n${Math.round(prima).toLocaleString('it')} -> ${Math.round(dopo).toLocaleString('it')} triangoli   ` +
  `${(statSync(ingresso).size / 1048576).toFixed(1)}MB -> ${(statSync(uscita).size / 1048576).toFixed(2)}MB`,
)
console.log('\nparti riconosciute:', [...presi].join(', '))
const mancano = RICONOSCI.filter((v) => !presi.has(v.nome)).map((v) => v.nome)
if (mancano.length) console.log('NON riconosciute:', mancano.join(', '))
