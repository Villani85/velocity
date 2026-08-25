/** RICOSTRUISCE IL CANALE DELLA RUVIDITA'.
 *
 *  IL DIFETTO CHE QUESTA VERSIONE RIPARA, ed era mio.
 *  La versione precedente decideva cosa fosse isola e cosa riempimento
 *  guardando la ORM stessa: `isola = G > 8 || B > 8`. Sembra ovvio, e non lo
 *  e' — un texel di VETRO ha ruvidita' ~0 (specchio) e metallico 0
 *  (dielettrico), cioe' ESATTAMENTE la stessa firma del riempimento rosso
 *  `(255, 0, 0)`. Li ho scambiati per vuoto e portati a 0,87: canopy e
 *  cromature murati.
 *  Misurato: la frazione a bassa ruvidita' dentro le isole e' passata dal
 *  17,9% al 4,0%, con il 24,7% dei texel d'isola alterati.
 *
 *  LA REGOLA CHE NE ESCE: un criterio non puo' distinguere due popolazioni
 *  che hanno lo stesso valore. Se servono distinte, il criterio deve venire da
 *  UN'ALTRA FONTE.
 *  Qui viene dalla normal map: «non e' la normale neutra (128,128,255)». E'
 *  la maschera indipendente gia' usata da `canarino.mjs`, e concorda al 95%
 *  con quella costruita dal rosso della ORM — due criteri che non si parlano,
 *  ricavati da due file diversi, che selezionano la stessa regione.
 *
 *  COSA FA, in tre regole:
 *
 *  1. FUORI DALLE ISOLE porta il riempimento a 0,87 invece di lasciarlo a
 *     zero. Il riempimento SBAVA dentro le isole attraverso i mipmap e il
 *     filtro anisotropo, e a zero trascina la ruvidita' verso lo specchio
 *     proprio sui bordi dei pannelli; e le superfici mappate ma mai cotte
 *     (sottoscocca, interni) smettono di essere specchi neri.
 *  2. DENTRO LE ISOLE, dove la ruvidita' e' BASSA, non tocca niente. Quel
 *     18% sono canopy e cromature ed e' giusto che siano a specchio:
 *     appiattirle mura i vetri. E' il difetto che questa versione ripara.
 *  3. DENTRO LE ISOLE, dove la ruvidita' e' ALTA, SCRIVE la base a 0,85
 *     invece di lasciare quello che c'e'. La vecchia mappa aveva il 43,5%
 *     dei texel della carrozzeria esattamente a 1,000: saturi. Scrivere la
 *     base li' stacca dal soffitto degli 8 bit.
 *
 *  E LE TRE OTTAVE NON SI CUOCIONO QUI. Stanno nello shader di `scocca()`
 *  (grano a 22, 61 e 420 cicli = 30 cm, 11 cm e 1,6 cm sulla superficie), e ci
 *  restano per due ragioni misurate: cuocerle vorrebbe dire passare la ORM a
 *  webp senza perdita — da 236 a 730 kB su un percorso critico gia' da 2,2 MB
 *  — e sommarle in un canale a 8 bit sopra valori vicini al massimo le
 *  schiaccerebbe contro il tetto, che e' esattamente l'errore appena
 *  descritto. Nello shader la variazione e' MOLTIPLICATIVA su un valore gia'
 *  staccato dal soffitto, quindi non clippa: 0,30 x 0,85 x (1 +- 0,31) sta
 *  fra 0,176 e 0,328.
 */
import sharp from 'sharp'
import { cancelloBin } from './cancelloBin.mjs'

const N = 2048
const BASE = 0.87            // il livello del riempimento
const BASE_ISOLA = 0.85      // la base scritta sulla carrozzeria

const src = 'public/texture/auto2r_orm.webp'
const dst = 'public/texture/auto2r_orm2.webp'
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true })
const CH = info.channels
if (info.width !== N) throw new Error(`attesa ${N}, trovata ${info.width}`)

/* LA MASCHERA VIENE DA UN ALTRO FILE, ed e' tutto il punto di questa versione.
   `auto2r_nor.webp` e non `nor2`: un passa-alto centra la distribuzione su
   zero per costruzione, quindi sulla mappa passa-altata «non e' la normale
   neutra» non seleziona piu' niente. La mappa originale resta su disco
   apposta per questo. */
const nor = await sharp('public/texture/auto2r_nor.webp').raw().toBuffer({ resolveWithObject: true })
const NC = nor.info.channels
const isola = new Uint8Array(N * N)
for (let i = 0; i < N * N; i++) {
  const o = i * NC
  const neutra = Math.abs(nor.data[o] - 128) < 4 && Math.abs(nor.data[o + 1] - 128) < 4 && nor.data[o + 2] > 250
  isola[i] = neutra ? 0 : 1
}

/* L'OCCLUSIONE COTTA, se c'e'. Il canale rosso della ORM era 1,000 dappertutto
   — 2048x2048 gia' pagati e vuoti. `strumenti/occlusione.mjs` lo riempie con
   un raycast a raggio corto. Se il file non c'e' si resta a 1,000 e lo si dice,
   invece di far finta che l'occlusione ci sia. */
import { existsSync } from 'fs'
let AO = null
if (existsSync('public/texture/_ao.png')) {
  const a = await sharp('public/texture/_ao.png').raw().toBuffer({ resolveWithObject: true })
  if (a.info.width === N) AO = { d: a.data, c: a.info.channels }
}
console.log(AO ? '  occlusione: cotta, entra nel canale rosso' : '  occlusione: ASSENTE, il rosso resta a 1,000')

const out = Buffer.alloc(N * N * 3)
let specchio = 0, scritti = 0, riempimento = 0
for (let i = 0; i < N * N; i++) {
  const o = i * CH, q = i * 3
  const G = data[o + 1], B = data[o + 2]
  out[q] = AO ? AO.d[i * AO.c] : 255
  if (!isola[i]) {
    out[q + 1] = Math.round(BASE * 255); out[q + 2] = 0; riempimento++
  } else if (G < 64) {
    out[q + 1] = G; out[q + 2] = B; specchio++      // canopy e cromature
  } else {
    out[q + 1] = Math.round(BASE_ISOLA * 255); out[q + 2] = B; scritti++
  }
}

/* IL CANCELLO, PRIMA DI SALVARE.
   Il rosso ha soglia 1,0 e la ragione va detta: quel canale porta
   l'occlusione ambientale, e finche' non e' cotta in Blender vale 1,000
   dappertutto PER COSTRUZIONE. E' saturo ed e' giusto che lo sia — ma resta
   il lavoro piu' grosso che manca su questa mappa. */
cancelloBin(out, isola, 'ORM', [
  /* R: l'occlusione. Adesso e' cotta, ma resta saturata al 74% ED E' GIUSTO:
     una carrozzeria e' quasi tutta CONVESSA, e con un raggio corto — 9 cm, non
     i raggi da architettura — la maggior parte della superficie ha l'emisfero
     libero. L'occlusione vive nel 26% che sta nelle cavita': p05 a 143 su 255.
     Un raggio piu' lungo abbasserebbe la mediana e farebbe passare il cancello,
     ma scurirebbe tutto senza dire niente — che e' esattamente il difetto per
     cui `GTAOPass` a 0,9 m non serve al soggetto. */
  { alto: 0.80, basso: 0.02 },
  // G: a 255 quasi niente, ed e' il difetto che questa versione ripara.
  //    A 0 si concede: quella e' la ruvidita' di uno SPECCHIO, cioe' canopy e
  //    cromature, e portarli via e' esattamente l'errore da cui si viene.
  { alto: 0.02, basso: 0.10 },
  // B: a 0 e' la norma — un dielettrico e' quasi tutto quello che esiste, e
  //    questa vettura ha una vernice dielettrica. A 255 c'e' solo il metallo
  //    vero: griglie e inserti.
  { alto: 0.06, basso: 0.70 },
])

await sharp(out, { raw: { width: N, height: N, channels: 3 } })
  .webp({ quality: 90 }).toFile(dst)

const p = (v) => (v / (N * N) * 100).toFixed(1) + '%'
const dentro = specchio + scritti
console.log(`scritta ${dst}`)
console.log(`  isole                     ${p(dentro)} dell'atlante`)
console.log(`  di cui a specchio, INTATTE ${(specchio / dentro * 100).toFixed(1)}%  (canopy e cromature)`)
console.log(`  di cui base riscritta      ${(scritti / dentro * 100).toFixed(1)}%`)
console.log(`  riempimento portato a ${BASE}  ${p(riempimento)}`)
