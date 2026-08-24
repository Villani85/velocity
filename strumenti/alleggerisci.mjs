/**
 * ALLEGGERIRE UN MODELLO PER IL WEB.
 *
 * PERCHE' A MANO E NON CON IL COMANDO PRONTO.
 *
 * `gltf-transform webp` e `resize` qui dentro si fermano con
 * «colourspace: parameter space not set»: la sharp che si porta dietro non
 * va d'accordo con questo ambiente. Il comando pronto non funziona, la
 * libreria si'. Quindi si apre il documento con le sue API, si convertono
 * le immagini con la sharp che ho gia' verificato, e si riscrive.
 *
 * COSA SI DECIDE, TESSITURA PER TESSITURA.
 *
 * Non tutte valgono lo stesso e trattarle allo stesso modo e' lo spreco
 * piu' comune:
 *
 *   - il COLORE si guarda: merita la risoluzione piena e una compressione
 *     generosa, perche' ogni artefatto ci finisce sotto gli occhi
 *   - la NORMALE non si guarda, si SUBISCE: descrive inclinazioni, e un
 *     artefatto non si vede come sporco ma come una piega. Pero' 8192 su
 *     una carrozzeria vista da sei metri sono quattro volte i pixel che
 *     lo schermo puo' mostrare — si dimezza e non se ne accorge nessuno
 *   - METALLICITA' e RUVIDITA' sono due canali di grigio in un file a tre:
 *     arrivano in PNG da 13 MB per informazione che sta in un quinto
 *
 *   node strumenti/alleggerisci.mjs <ingresso.glb> <uscita.glb>
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { simplify, meshopt, prune, dedup } from '@gltf-transform/functions'
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

const ingresso = process.argv[2]
const uscita = process.argv[3]
if (!ingresso || !uscita) {
  console.error('uso: node strumenti/alleggerisci.mjs <ingresso.glb> <uscita.glb>')
  process.exit(1)
}

await MeshoptSimplifier.ready
await MeshoptEncoder.ready

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read(ingresso)

// --- geometria -------------------------------------------------------
await doc.transform(
  dedup(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.42, error: 0.0012 }),
  prune(),
)

// --- tessiture, una per una -------------------------------------------
const materiale = doc.getRoot().listMaterials()[0]
const ruolo = new Map()
if (materiale) {
  const c = materiale.getBaseColorTexture()
  const n = materiale.getNormalTexture()
  const m = materiale.getMetallicRoughnessTexture()
  if (c) ruolo.set(c, 'colore')
  if (n) ruolo.set(n, 'normale')
  if (m) ruolo.set(m, 'metallo')
}

for (const tex of doc.getRoot().listTextures()) {
  const dati = tex.getImage()
  if (!dati) continue
  const che = ruolo.get(tex) ?? 'ignota'
  const prima = dati.byteLength
  const meta = await sharp(Buffer.from(dati)).metadata()

  // IL COLORE TIENE GLI 8192 CHE IL PASSAGGIO «EXTREME» HA PRODOTTO.
  //
  // Dimezzarlo era il riflesso automatico e qui e' sbagliato: e' l'unica
  // tessitura che si guarda, ed e' esattamente quella che mancava. A 4096
  // la carrozzeria da' 0,43 texel al millimetro; a 8192 ne da' 0,86, e
  // sono due megabyte in piu' sull'oggetto che regge tutta la prima meta'
  // del percorso.
  let lato = Math.min(meta.width ?? 2048, 8192)
  let qualita = 84
  if (che === 'normale') {
    // meta' lato: 8192 su una carrozzeria vista da sei metri sono quattro
    // volte i pixel che lo schermo puo' mostrare
    lato = Math.min(meta.width ?? 2048, 4096)
    qualita = 90
  } else if (che === 'metallo') {
    // due canali di grigio: la meta' del lato non toglie informazione
    lato = Math.min(meta.width ?? 2048, 2048)
    qualita = 86
  }

  const fuori = await sharp(Buffer.from(dati))
    .resize(lato, lato, { fit: 'fill' })
    .webp({ quality: qualita, effort: 5 })
    .toBuffer()

  tex.setImage(new Uint8Array(fuori))
  tex.setMimeType('image/webp')
  console.log(
    `  ${che.padEnd(9)} ${meta.width}px -> ${lato}px   ` +
    `${(prima / 1048576).toFixed(2)}MB -> ${(fuori.byteLength / 1048576).toFixed(2)}MB`,
  )
}

// LA COMPRESSIONE DELLA GEOMETRIA SI FA DOPO, CON IL COMANDO.
//
// Chiamando `meshopt()` da qui l'estensione fallisce in scrittura: il
// codificatore va preparato in un modo che l'API non espone. Il comando
// `gltf-transform meshopt` lo fa e funziona — e' l'unico pezzo della
// catena che qui gira meglio dalla riga di comando che dalla libreria.
await io.write(uscita, doc)

const { statSync } = await import('node:fs')
let tri = 0
for (const mesh of doc.getRoot().listMeshes())
  for (const p of mesh.listPrimitives()) tri += (p.getIndices()?.getCount() ?? 0) / 3
console.log(
  `\n  ${(statSync(ingresso).size / 1048576).toFixed(2)}MB -> ` +
  `${(statSync(uscita).size / 1048576).toFixed(2)}MB   ${Math.round(tri).toLocaleString('it')} triangoli`,
)
