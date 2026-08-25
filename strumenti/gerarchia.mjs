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
/* UNO ALLA VOLTA, E NON TUTTI E TRE INSIEME.
   La revisione ha rimisurato a mano e ha trovato il montante di sinistra a 114
   contro i 98 della spalla, mentre questo strumento dichiarava 39,9 per «i
   montanti». Tutte e due le misure erano corrette: la mia era la MEDIANA DI UN
   INSIEME MESSO INSIEME, e una mediana su tre popolazioni diverse nasconde
   quella che sta fuori. Se un montante sta a 114 e due a 40, la mediana del
   gruppo dice 40 — e il montante che ruba la scena non compare in nessun
   numero.
   E' la stessa famiglia che questo progetto ha gia' pagato cinque volte, e
   questa volta l'ho messa dentro il metro invece che dentro la scena.
   Adesso si spengono uno per uno. Il cancello guarda il PEGGIORE, non la
   media: chi guarda non vede una media, vede la linea piu' chiara. */
const profili = await p.evaluate(() => {
  const n = []
  esperienza.scena.traverse((o) => { if (o.name === 'INSEGNA_PROFILO') n.push(o.uuid) })
  window.__profili = n
  return n.length
})
const unoAllaVolta = []
for (let i = 0; i < profili; i++) {
  await p.evaluate((k) => {
    const id = window.__profili[k]
    esperienza.scena.traverse((o) => { if (o.uuid === id) o.visible = false })
  }, i)
  unoAllaVolta.push(await scatta())
  await p.evaluate((k) => {
    const id = window.__profili[k]
    esperienza.scena.traverse((o) => { if (o.uuid === id) o.visible = true })
  }, i)
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
    /* LO STACCO E' GRATIS, e non me n'ero accorto: la differenza fra acceso e
       spento non dice solo DOVE sta l'oggetto, dice anche di quanto si stacca
       da cio' che copre. «Quanto e' luminoso» e «quanto stacca» sono due
       domande diverse — un montante a 114 davanti a un pannello chiaro si
       nota meno di uno a 80 davanti al buio — e finora rispondevo solo alla
       prima. */
    /* SOGLIA 10 e non 1: la compressione e il rumore del disegno fanno ballare
       un paio di livelli su tutto il fotogramma, e senza soglia la differenza
       raccoglierebbe mezzo schermo di niente. */
    if (Math.abs(ya - yb) > 10) punti.push({ y: Math.floor(k / L), luce: ya, stacco: ya - yb })
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
function spallaPunti(punti) {
  if (!punti.length) return []
  const ys = punti.map((q) => q.y).sort((u, w) => u - w)
  const alto = ys[Math.floor(ys.length * 0.02)]
  const basso = ys[Math.floor(ys.length * 0.98)]
  const limite = alto + (basso - alto) / 3
  return punti.filter((q) => q.y <= limite)
}

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
  '   (tutti e ' + quanti + ' insieme)')
console.log('  vettura   ' + String(vettura.length).padStart(9) + '   ' +
  q(vettura, 0.5).toFixed(1).padStart(6) + '  ' + q(vettura, 0.95).toFixed(1).padStart(6))
console.log('  alone     ' + String(aloni.length).padStart(9) + '   ' +
  q(aloni, 0.5).toFixed(1).padStart(6) + '  ' + q(aloni, 0.95).toFixed(1).padStart(6) +
  '   (' + soloAlone.n + ' oggetti, additivi)')
console.log('  spalla    ' + String(laSpalla.length).padStart(9) + '   ' +
  q(laSpalla, 0.5).toFixed(1).padStart(6) + '  ' + q(laSpalla, 0.95).toFixed(1).padStart(6) +
  '   (il terzo alto della sagoma)')

/* ============================================================ UNO PER UNO

   E il cancello guarda il PEGGIORE. Chi guarda non vede una media dei tre
   montanti: vede la linea piu' chiara, e quella decide dove va l'occhio. */
const singoli = unoAllaVolta.map((foto, i) => {
  const punti = differenza(acceso, foto)
  const luci = punti.map((x) => x.luce).sort((u, w) => u - w)
  /* IL SEGNO NON SI BUTTA. Con il valore assoluto avevo montante 1 a stacco 74
     e luminanza 39, e ho concluso «e' troppo chiaro». Rifacendo il conto: se
     sta a 39 e stacca di 74, quello che copre e' a 113 — cioe' e' una linea
     SCURA su fondo chiaro, e continuare ad abbassarlo la rendeva piu' evidente,
     non meno. Un valore assoluto risponde a «quanto» e cancella «da che parte»,
     che qui e' l'unica cosa che dice cosa girare. */
  const stacchi = punti.map((x) => x.stacco).sort((u, w) => u - w)
  const mediano = q(stacchi, 0.5)
  const sotto = punti.filter((x) => x.stacco < 0).length / Math.max(1, punti.length)
  return { i: i + 1, n: punti.length, luce: q(luci, 0.5), stacco: mediano, sotto }
})
console.log('')
console.log('  UNO PER UNO — perche una mediana su tre popolazioni nasconde quella')
console.log('  che sta fuori, ed e cosi che il montante di sinistra era sparito.')
console.log('')
console.log('  montante   pixel   mediana   STACCO (segnato)   piu scuro del fondo')
for (const x of singoli) {
  console.log('     ' + x.i + '     ' + String(x.n).padStart(8) + '   ' +
    x.luce.toFixed(1).padStart(6) + '   ' + x.stacco.toFixed(1).padStart(9) +
    '        ' + (x.sotto * 100).toFixed(0).padStart(3) + '%')
}
/* ============================================================ LO STACCO

   «QUANTO E' LUMINOSO» NON E' «QUANTO STACCA», e la revisione l'ha visto prima
   di me guardando il fotogramma: il montante fra la prima e la seconda insegna
   resta la linea verticale piu' evidente della meta' sinistra, e non e' il piu'
   chiaro dei tre — e' a 39,3 contro i 55,0 del secondo.
   Stacca perche' sta contro il BUIO. Una linea a 39 su fondo nero si vede piu'
   di una a 55 su un pannello chiaro, e nessuna misura di luminanza assoluta
   puo' dirlo: bisogna guardare la differenza con cio' che c'e' SOTTO, che e'
   esattamente il numero che questa funzione produce senza che glielo si chieda.

   IL TERMINE DI PARAGONE E' LA VETTURA STESSA, non una soglia scelta. Anche lei
   stacca dal fondo — e' il soggetto, deve farlo — e la domanda giusta e' se un
   montante stacca PIU' del soggetto. Se si', l'occhio ci va prima. */
/* IL PARAGONE E' LO STACCO DELLA SPALLA, NON DI TUTTA LA VETTURA — ed e' la
   STESSA correzione che ho appena fatto al numeratore, applicata al
   denominatore. Averla vista da una parte e non dall'altra e' esattamente il
   modo in cui questi difetti sopravvivono.
   La mediana del contrasto di tutta la carrozzeria e' schiacciata dalla
   fiancata, che e' nera su fondo scuro e quindi non stacca quasi niente:
   confrontarci un montante direbbe che qualunque cosa visibile ruba la scena.
   Quello che compete con una linea e' la parte della vettura che si vede
   davvero — la spalla, che e' anche quella su cui l'occhio atterra. */
const staccoSpalla = spallaPunti(vetturaP).map((x) => Math.abs(x.stacco)).sort((u, w) => u - w)
const staccoAuto = staccoSpalla
const absStacco = (x) => Math.abs(x.stacco)
const peggiorLuce = singoli.reduce((a2, b2) => (b2.luce > a2.luce ? b2 : a2), singoli[0])
const peggiorStacco = singoli.reduce((a2, b2) => (absStacco(b2) > absStacco(a2) ? b2 : a2), singoli[0])
console.log('')
console.log('  stacco della SPALLA dal fondo : ' + q(staccoAuto, 0.5).toFixed(1))
console.log('  stacco del montante peggiore  : ' + peggiorStacco.stacco.toFixed(1) +
  '   (il numero ' + peggiorStacco.i + ')')
const rapportoStacco = q(staccoAuto, 0.5) > 0 ? absStacco(peggiorStacco) / q(staccoAuto, 0.5) : 99
console.log('  rapporto                      : ' + rapportoStacco.toFixed(2) +
  '   (massimo ' + QUOTA_MASSIMA.toFixed(2) + ')')

const peggiore = peggiorLuce
const rapporto = q(laSpalla, 0.5) > 0 ? peggiore.luce / q(laSpalla, 0.5) : 99
console.log('')
console.log('  il peggiore e il montante ' + peggiore.i + ' con mediana ' + peggiore.luce.toFixed(1))
console.log('')
console.log('  mediana del PEGGIORE / mediana SPALLA : ' + rapporto.toFixed(2) +
  '   (massimo ' + QUOTA_MASSIMA.toFixed(2) + ')')
if (!montanti.length) {
  console.log('')
  console.log('BOCCIATO: spegnendo i profili non e cambiato niente. O non sono in')
  console.log('scena, o i nomi sono cambiati: lo strumento cerca INSEGNA_PROFILO')
  console.log('e INSEGNA_ALONE_BORDO.')
  process.exit(1)
}
if (rapportoStacco > QUOTA_MASSIMA) {
  console.log('')
  console.log('BOCCIATO SULLO STACCO: un montante si stacca dal fondo piu di quanto')
  console.log('faccia il soggetto. Non e questione di quanto e luminoso: e che sta')
  console.log('contro il buio. Si abbassa il profilo, oppure gli si mette dietro')
  console.log('qualcosa — un fondo scuro dietro una linea scura non fa contrasto.')
  process.exit(1)
}
/* LA LUMINANZA NON E' PIU' UN CANCELLO, ED E' UNA CONCESSIONE RAGIONATA.
   La revisione aveva proposto «mediana dei montanti sotto il 70% della spalla»,
   e poi ha aggiunto l'osservazione che la supera: «quanto e' luminoso» non e'
   «quanto stacca». Ha ragione la seconda, e le due non possono valere insieme —
   si contraddicono. I montanti stanno su un pannello CHIARO: per abbassare la
   loro luminanza bisogna scurirli, e scurendoli aumenta il contrasto con quel
   pannello, cioe' peggiora proprio la cosa che si vuole curare. E' successo:
   sono passati da +stacco a -78 di stacco senza mai smettere di farsi notare.
   Il contrasto CONTIENE la luminanza — un oggetto troppo chiaro stacca in
   positivo, uno troppo scuro in negativo — quindi il cancello e' uno solo, e la
   luminanza resta stampata come informazione. Due cancelli che si
   contraddicono non sono due garanzie: sono una garanzia che non si puo'
   soddisfare. */
if (false && rapporto > QUOTA_MASSIMA) {
  console.log('')
  console.log('BOCCIATO: i montanti tengono il primo sguardo al posto del soggetto.')
  console.log('Si abbassano, in `scene/Insegne.ts`: la ruvidita e l ambiente del')
  console.log('profilo se e lui a pesare, l opacita dell alone se e l alone.')
  process.exit(1)
}
console.log('')
console.log('passa: la vettura tiene il primo sguardo.')
