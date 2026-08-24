/**
 * LA VOLANTE, RIDOTTA A QUELLO CHE SERVE DAVVERO.
 *
 * PERCHE' NON BASTA `alleggerisci.mjs`.
 *
 * Quello strumento e' tarato sull'automobile protagonista: un rapporto di
 * semplificazione a 0,42 e le tessiture quasi a piena risoluzione, perche'
 * quella vettura la si guarda da due metri per meta' del sito e ogni
 * imperfezione della lamiera si vede — e' il modello su cui ho passato tre
 * giorni a togliere le ammaccature.
 *
 * La volante e' l'opposto. Compare negli ultimi secondi, di notte, DIETRO la
 * camera, quasi in controluce contro il proprio lampeggiante. Di lei si
 * vedono tre cose: la sagoma, la barra sul tetto e i fari. Tutto il resto —
 * i 622 mila triangoli e i 18 megabyte che escono dal generatore — e' peso
 * che nessuno guardera' mai.
 *
 * IL CONTO CHE DECIDE IL RAPPORTO. A cinquanta metri, con un campo di trenta
 * gradi su milleduecento pixel, l'automobile occupa un centinaio di pixel di
 * larghezza. Dodicimila triangoli su centomila pixel fanno gia' piu' di un
 * triangolo ogni dieci pixel: oltre, si stanno disegnando dettagli piu'
 * piccoli di un pixel. E' quello il criterio, non «quanto posso togliere
 * senza che si veda».
 *
 *   node strumenti/volante_leggera.mjs <ingresso.glb> <uscita.glb>
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { simplify, meshopt, prune, dedup, textureCompress } from '@gltf-transform/functions'
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer'
import { createRequire } from 'node:module'
const sharp = createRequire(import.meta.url)('sharp')

const ingresso = process.argv[2]
const uscita = process.argv[3]
if (!ingresso || !uscita) { console.error('serve: ingresso.glb uscita.glb'); process.exit(2) }

await MeshoptSimplifier.ready
await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptEncoder,
  'meshopt.encoder': MeshoptEncoder,
})
const doc = await io.read(ingresso)

const conta = () => doc.getRoot().listMeshes()
  .flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0)
const prima = conta()

// IL BERSAGLIO E' IN TRIANGOLI, non in percentuale: una percentuale su un
// modello che il generatore puo' rendere con densita' diverse a ogni giro
// darebbe un risultato diverso a ogni giro.
const BERSAGLIO = Number(process.argv[4] || 12000)
await doc.transform(
  dedup(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, BERSAGLIO / prima), error: 0.008 }),
  prune(),
  // 1024 per il colore e 512 per il resto: la livrea si legge dal contrasto
  // fra il blu e la fascia bianca, non dai dettagli
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [Number(process.argv[5] || 1024), Number(process.argv[5] || 1024)], quality: 80 }),
  meshopt({ encoder: MeshoptEncoder }),
)
await io.write(uscita, doc)

const { statSync } = await import('node:fs')
console.log(
  '  ' + (statSync(ingresso).size / 1048576).toFixed(2) + ' MB -> ' +
  (statSync(uscita).size / 1048576).toFixed(2) + ' MB   ' +
  Math.round(prima).toLocaleString('it') + ' -> ' + Math.round(conta()).toLocaleString('it') + ' triangoli',
)
