/** CHI E' PIU' LUMINOSO, e quindi dove va l'occhio per primo.
 *
 *  LA DOMANDA, posta dalla revisione esterna: «i tre montanti verticali sono
 *  ancora luminosi quanto la parte piu' chiara della vettura, e sono tre linee
 *  parallele nette in una zona dove l'occhio dovrebbe gia' essere sceso
 *  sull'automobile».
 *
 *  E' una domanda di GERARCHIA, e la gerarchia percettiva la decide il fatto
 *  che l'occhio va sulla cosa piu' chiara prima di andare su quella importante.
 *  In tre secondi non fa in tempo a correggersi.
 *
 *  ===========================================================================
 *  LA PRIMA VERSIONE MISURAVA RETTANGOLI SCELTI A MANO, ED ERA SBAGLIATA.
 *
 *  Avevo fissato otto riquadri in frazioni del poster — «montante 2» sta al
 *  29% della larghezza — e ne leggevo media, mediana e picco. Sembrava
 *  ragionevole e ha dato un numero falso: quel riquadro contiene il montante E
 *  il pannello chiaro che gli sta dietro, quindi la sua mediana (128) misurava
 *  la fotografia del sito, non la barra di ottone. Con quel numero avrei
 *  continuato ad abbassare l'emissione di un oggetto che era gia' a posto.
 *
 *  E' la stessa famiglia di difetto che questo progetto ha gia' pagato quattro
 *  volte: un riquadro che contiene due popolazioni non e' la misura di nessuna
 *  delle due.
 *
 *  LA VERSIONE GIUSTA non sceglie riquadri: SPEGNE i montanti e guarda cosa
 *  cambia. I pixel che cambiano SONO i montanti, per definizione, senza che
 *  nessuno debba dire dove stanno. E' la stessa tecnica di
 *  `strumenti/carrozzeria.mjs`, che isola la vettura fotografando la scena con
 *  e senza — e li' funziona da mesi.
 *  ===========================================================================
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'

/* IL BERSAGLIO, e lo detta la revisione: la mediana dei montanti sotto il 70%
   di quella della spalla. Non e' un gusto — sotto quella soglia il primo
   sguardo va sul soggetto, sopra va su tre linee parallele. */
const QUOTA_MASSIMA = 0.70

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ' + e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.evaluate(() => window.fissaQualita('alto'))
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 180000 }).catch(() => {})
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, 0.06 * (i / 40)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}
/* LA SCENA DEVE ESSERE FERMA fra i due scatti, o la differenza prende dentro
   tutto quello che si e' mosso: e' il difetto che ha reso non ripetibile
   `carrozzeria.mjs` per settimane. Si aspetta che lo scorrimento sia fermo. */
await p.waitForFunction(() => {
  const y = scrollY
  return new Promise((r) => setTimeout(() => r(Math.abs(scrollY - y) < 0.5), 220))
}, null, { timeout: 30000 }).catch(() => {})
for (let i = 0; i < 30; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

async function scatta() {
  for (let i = 0; i < 8; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const png = await p.screenshot({ type: 'png', timeout: 120000 })
  return await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
}

const acceso = await scatta()

/* DUE SPEGNIMENTI SEPARATI, e la prima versione li aveva messi insieme.
   Spegnendo profilo e alone in un colpo solo, i tre giri di manopole sul
   METALLO non muovevano il numero — 111,3 poi 112,5 — e sembrava che il
   materiale non arrivasse. Arrivava: era l'ALONE additivo a fare il grosso di
   quella luce, e stavo misurando i due insieme.
   Sono due cose diverse con due cure diverse: il profilo si abbassa con la
   ruvidita' e l'ambiente, l'alone con l'opacita'. Un solo numero per due
   manopole non dice quale girare. */
const spegni = async (nome) => {
  await p.evaluate((n) => {
    window.__spenti = []
    esperienza.scena.traverse((o) => {
      if (o.name === n) { window.__spenti.push(o); o.visible = false }
    })
  }, nome)
  const foto = await scatta()
  const n = await p.evaluate(() => {
    for (const o of window.__spenti) o.visible = true
    return window.__spenti.length
  })
  return { foto, n }
}
const soloProfilo = await spegni('INSEGNA_PROFILO')
const soloAlone = await spegni('INSEGNA_ALONE_BORDO')
const spento = soloProfilo.foto
const quanti = soloProfilo.n

/* e poi la vettura, per avere il termine di paragone con lo stesso metodo */
await p.evaluate(() => { esperienza.autoVera.visible = false })
const senzAuto = await scatta()
await p.evaluate(() => { esperienza.autoVera.visible = true })

await b.close()

function differenza(a, c) {
  const punti = []
  const d = a.data
  const e = c.data
  const L = a.info.width
  for (let i = 0, k = 0; i < d.length; i += 3, k++) {
    const ya = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    const yb = 0.2126 * e[i] + 0.7152 * e[i + 1] + 0.0722 * e[i + 2]
    /* SOGLIA 10 e non 1: la compressione e il rumore del disegno fanno ballare
       un paio di livelli su tutto il fotogramma, e senza soglia la differenza
       raccoglierebbe mezzo schermo di niente. */
    if (Math.abs(ya - yb) > 10) punti.push({ y: Math.floor(k / L), luce: ya })
  }
  return punti
}

const ordinate = (v) => v.map((x) => x.luce).sort((u, w) => u - w)

/* LA SPALLA, non tutta la vettura — e la differenza fra le due decide la
   risposta, quindi va detta.
   La mediana di TUTTA la carrozzeria e' 44: ma quella cifra e' dominata dalla
   fiancata, che su una vernice nera DEVE stare scura. Confrontarci i montanti
   direbbe che qualunque cosa piu' chiara del nero ruba la scena, e per stare
   sotto dovrebbero spegnersi del tutto.
   Quello che compete con una linea chiara e' la parte chiara della vettura: la
   spalla e il tetto, cioe' le facce rivolte al cielo. Si isolano per posizione
   — il terzo alto della sagoma — e non per soglia di luminanza, che
   selezionerebbe i pixel chiari per costruzione e renderebbe il confronto una
   tautologia. */
function spalla(punti) {
  if (!punti.length) return []
  /* L'ESTENSIONE SI PRENDE AI PERCENTILI, NON AGLI ESTREMI — e questa riga e'
     una cicatrice fresca.
     Con `min` e `max` la banda della spalla e' passata, fra corse identiche,
     da 9.608 pixel a 182: basta UN pixel di differenza in alto (un riflesso
     che si sposta, un bordo che sfarfalla) perche' `alto` salti in cima al
     fotogramma e il terzo superiore diventi aria vuota. Il rapporto e' andato
     da 1,09 a 1,52 senza che la scena cambiasse, e stavo per girare le
     manopole del materiale contro quel numero.
     Un estremo e' la statistica meno robusta che esista: dipende da un
     campione solo. Al 2esimo e al 98esimo percentile un pixel isolato non
     sposta niente, e la banda resta quella della carrozzeria. */
  const ys = punti.map((q) => q.y).sort((u, w) => u - w)
  const alto = ys[Math.floor(ys.length * 0.02)]
  const basso = ys[Math.floor(ys.length * 0.98)]
  const limite = alto + (basso - alto) / 3
  return punti.filter((q) => q.y <= limite).map((q) => q.luce).sort((u, w) => u - w)
}

const montantiP = differenza(acceso, spento)
const vetturaP = differenza(acceso, senzAuto)
const montanti = ordinate(montantiP)
const vettura = ordinate(vetturaP)
const laSpalla = spalla(vetturaP)
const aloni = ordinate(differenza(acceso, soloAlone.foto))
const q = (l, f) => (l.length ? l[Math.min(l.length - 1, Math.floor(l.length * f))] : 0)

console.log('GERARCHIA, misurata per differenza (niente riquadri a mano)')
console.log('')
console.log('  soggetto        pixel   mediana     p95')
console.log('  montanti  ' + String(montanti.length).padStart(9) + '   ' +
  q(montanti, 0.5).toFixed(1).padStart(6) + '  ' + q(montanti, 0.95).toFixed(1).padStart(6) +
  '   (' + quanti + ' oggetti spenti)')
console.log('  vettura   ' + String(vettura.length).padStart(9) + '   ' +
  q(vettura, 0.5).toFixed(1).padStart(6) + '  ' + q(vettura, 0.95).toFixed(1).padStart(6))
console.log('  alone     ' + String(aloni.length).padStart(9) + '   ' +
  q(aloni, 0.5).toFixed(1).padStart(6) + '  ' + q(aloni, 0.95).toFixed(1).padStart(6) +
  '   (' + soloAlone.n + ' oggetti, additivi)')
console.log('  spalla    ' + String(laSpalla.length).padStart(9) + '   ' +
  q(laSpalla, 0.5).toFixed(1).padStart(6) + '  ' + q(laSpalla, 0.95).toFixed(1).padStart(6) +
  '   (il terzo alto della sagoma)')

const rapporto = q(laSpalla, 0.5) > 0 ? q(montanti, 0.5) / q(laSpalla, 0.5) : 99
console.log('')
console.log('  mediana montanti / mediana SPALLA  : ' + rapporto.toFixed(2) +
  '   (massimo ' + QUOTA_MASSIMA.toFixed(2) + ')')
if (!montanti.length) {
  console.log('')
  console.log('BOCCIATO: spegnendo i profili non e cambiato niente. O non sono in')
  console.log('scena, o i nomi sono cambiati: lo strumento cerca INSEGNA_PROFILO')
  console.log('e INSEGNA_ALONE_BORDO.')
  process.exit(1)
}
if (rapporto > QUOTA_MASSIMA) {
  console.log('')
  console.log('BOCCIATO: i montanti tengono il primo sguardo al posto del soggetto.')
  console.log('Si abbassano, in `scene/Insegne.ts`: la ruvidita e l ambiente del')
  console.log('profilo se e lui a pesare, l opacita dell alone se e l alone.')
  process.exit(1)
}
console.log('')
console.log('passa: la vettura tiene il primo sguardo.')
