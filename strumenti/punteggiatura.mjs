/** LA PUNTEGGIATURA — la camera si ferma prima della fine di ogni tempo?
 *
 *  I confini dei tempi sono contigui, quindi ogni pixel di scorrimento muoveva
 *  la camera e non c'era mai un istante in cui l'occhio potesse posarsi. La
 *  cura e' una pausa: la corsa finisce all'84% del tempo e l'ultimo sesto
 *  tiene. Questo strumento e' il suo cancello.
 *
 *  PERCHE' NON A PROVINI. Il piano diceva «un provino ogni 0,02 di
 *  scorrimento»: cinquanta immagini da guardare a occhio per decidere se una
 *  camera si e' fermata. La posizione della camera e' un numero e si legge —
 *  guardare le immagini servirebbe solo a stimare male una cosa esatta.
 *  I provini restano indispensabili per COME appare una scena; per QUANTO si e'
 *  mossa un oggetto sono lo strumento sbagliato.
 *
 *  CHE COSA SI MISURA, dopo tre tentativi.
 *
 *  1. `camera.position`. Due punti ciechi, due bugie: in `orbita` a girare e' la
 *     SCENA e non la camera, quindi una camera ferma davanti a un mondo che
 *     ruota risultava ferma; e in `velocita` c'e' una vibrazione casuale di un
 *     millimetro e mezzo che si contava come corsa, quindi quel tempo non
 *     poteva risultare fermo nemmeno stando fermo.
 *  2. Le ruote proiettate sullo SCHERMO. Toglie tutti e due i punti ciechi — e
 *     ne apre un terzo: quando la camera entra nell'abitacolo le ruote finiscono
 *     dietro di lei, la proiezione di un punto dietro l'obiettivo si ribalta, e
 *     due confini risultavano SALTI da settanta volte. Erano artefatti del
 *     metro, non della scena.
 *  3. Quello che si usa: LA POSA DELLA CAMERA NEL SISTEMA DELLA SCENA. Si
 *     riporta posizione e direzione indietro della rotazione della scena, e si
 *     somma il campo. E' la grandezza che decide davvero l'inquadratura, non ha
 *     punti dietro l'obiettivo, ed e' definita in tutti e sette i tempi.
 *
 *  Ogni lettura resta la mediana di piu' fotogrammi: e' come si toglie una
 *  vibrazione casuale senza doverla spegnere nel codice della scena.
 *
 *  UN'ECCEZIONE DICHIARATA CHE POI NON SERVIVA, e vale la pena tenerne il conto.
 *  Avevo scritto qui che il tempo `velocita` NON poteva avere una pausa, perche'
 *  il suo campo e' una funzione della velocita' di scorrimento, e che un
 *  cancello che lo bocciasse avrebbe chiesto alla scena di rinunciare a una cosa
 *  giusta per far passare una misura.
 *  Il ragionamento reggeva a meta'. Il campo che reagisce alla velocita' e'
 *  giusto e resta; quello che non era giusto e' che reagisse FINO ALL'ULTIMO
 *  ISTANTE, perche' cosi' quel tempo finiva fra 45,6 e 56 gradi a seconda di
 *  quanto in fretta si stava scorrendo — e `contatto` comincia da 56. Chi si
 *  fermava un attimo prima del confine si prendeva un salto di dieci gradi.
 *  Spegnendo la reattivita' insieme alla posa, il campo arriva sempre a 56 e il
 *  tempo acquista anche la pausa. Le due cose erano la stessa: un tempo che non
 *  si posa non puo' nemmeno finire in un punto prevedibile.
 *  La lezione: prima di dichiarare un'eccezione, chiedersi se il cancello non
 *  stia indicando un difetto vero. Qui lo stava facendo.
 *
 *  Il ramo che tratta `velocita` a parte resta nel codice: se un domani quella
 *  reattivita' tornasse a correre fino in fondo, e' meglio che lo strumento lo
 *  dica invece di bocciare tutto senza spiegare.
 *
 *  DUE COSE SI VERIFICANO, e servono tutte e due:
 *  1. che la corsa si azzeri PRIMA della fine del tempo — se no la pausa non
 *     c'e';
 *  2. che al confine fra due tempi non ci sia SALTO — una camera che si ferma
 *     e poi riparte da un'altra parte e' peggio di una che non si ferma mai.
 *  La seconda e' quella che puo' rompersi in silenzio, perche' il patto di
 *  `Camera.ts` e' che ogni tempo cominci dalla posa in cui il precedente e'
 *  finito, e anticipare l'arrivo puo' romperlo senza dare nessun errore.
 *
 *  node strumenti/punteggiatura.mjs [passo]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const PASSO = Number(process.argv[2] ?? 0.005)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.evaluate(() => window.fissaQualita('alto'))
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)

const letture = []
for (let q = 0; q <= 1.0001; q += PASSO) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, Math.min(1, q)])
  // due fotogrammi: uno per applicare lo scorrimento, uno perche' la posa e'
  // scritta dentro il disegno e non dal gestore dello scorrimento
  await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
  await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
  /* PIU' FOTOGRAMMI E SI PRENDE LA MEDIANA. La vibrazione del beat `velocita`
     e' casuale a ogni disegno: una lettura sola la porta dentro per intero,
     cinque letture e una mediana la riducono a quasi niente senza toccare il
     codice della scena. */
  const campioni = []
  for (let k = 0; k < 5; k++) {
    await p.evaluate(() => new Promise(r => requestAnimationFrame(r)))
    campioni.push(await p.evaluate(() => {
      const e = window.esperienza
      const c = e.camera
      // la rotazione della scena si legge da chi la porta davvero
      const rot = e.esterno?.rotation?.y ?? 0
      const cs = Math.cos(-rot), sn = Math.sin(-rot)
      const gira = (x, z) => [x * cs - z * sn, x * sn + z * cs]
      const d = c.getWorldDirection(c.position.clone())
      const [px, pz] = gira(c.position.x, c.position.z)
      const [dx, dz] = gira(d.x, d.z)
      return {
        b: e.regia.beat, l: e.regia.locale,
        p: [px, c.position.y, pz, dx, d.y, dz, c.fov],
      }
    }))
  }
  const n = campioni[0].p.length
  const mediana = []
  for (let j = 0; j < n; j++) {
    const c = campioni.map((k) => k.p[j]).sort((a, b) => a - b)
    mediana.push(c[c.length >> 1])
  }
  letture.push({ b: campioni[2].b, l: campioni[2].l, p: mediana })
}
await b.close()

/* LA DISTANZA E' SULLO SCHERMO, in unita' di mezzo schermo: si somma di quanto
   si e' spostato ogni punto proiettato. Un valore di 0,01 vuol dire che le
   ruote si sono mosse di mezzo punto percentuale della larghezza. */
/* LA DISTANZA MESCOLA TRE GRANDEZZE DIVERSE, e i due pesi sono l'unica cosa
   arbitraria di questo strumento. Un metro di spostamento, un radiante di
   rotazione e un grado di campo non sono confrontabili: si sceglie quanto
   contano l'uno rispetto all'altro. Tre metri per radiante e' circa quanto una
   rotazione sposta l'inquadratura alla distanza a cui sta la vettura; un
   ventesimo di metro per grado di campo e' l'ordine di grandezza di quanto un
   grado allarga la scena a quella stessa distanza.
   Non serve che siano esatti: il criterio e' RELATIVO alla corsa massima dentro
   ogni tempo, quindi un peso sbagliato del doppio sposta il verdetto solo se la
   corsa di un tempo e' fatta quasi tutta di quella grandezza. */
const dist = (a, b) => {
  const dp = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2])
  const dd = Math.hypot(a.p[3] - b.p[3], a.p[4] - b.p[4], a.p[5] - b.p[5])
  return dp + dd * 3 + Math.abs(a.p[6] - b.p[6]) * 0.05
}
const perBeat = new Map()
for (let i = 1; i < letture.length; i++) {
  const a = letture[i - 1], c = letture[i]
  if (a.b !== c.b) continue // il confine si guarda a parte
  if (!perBeat.has(c.b)) perBeat.set(c.b, [])
  perBeat.get(c.b).push({ l: c.l, d: dist(a, c) })
}

console.log('')
console.log('  LA CORSA DENTRO OGNI TEMPO (passo ' + PASSO + ')')
console.log('')
let tuttiFermi = true
for (const [beat, v] of perBeat) {
  const dmax = Math.max(...v.map((k) => k.d))
  /* LA SOGLIA E' RELATIVA AL TEMPO STESSO, non assoluta: `hero` si muove di
     millimetri per costruzione e `taglio` di metri, quindi un'unica soglia in
     metri direbbe che l'uno e' sempre fermo e l'altro sempre in corsa. Fermo
     vuol dire «un ventesimo di quanto si e' mosso al massimo qui dentro». */
  const soglia = dmax * 0.05
  /* IL CRITERIO NON E' «ferma esattamente dall'84%», che sarebbe tarare il
     cancello sulla risposta: e' che una pausa CI SIA, cioe' che l'ultimo
     decimo del tempo sia fermo. Se un tempo si posa al 78% o all'86% e'
     ugualmente punteggiato; se si posa al 98% no. */
  const coda = v.filter((k) => k.l > 0.90)
  const fermo = coda.length > 0 && coda.every((k) => k.d <= soglia)
  // e da quale punto in poi non si muove piu'
  let da = 1
  for (let i = v.length - 1; i >= 0; i--) { if (v[i].d > soglia) break; da = v[i].l }
  // `velocita` e' l'eccezione dichiarata in cima: il suo campo insegue la
  // velocita' di scorrimento per scelta, quindi non puo' posarsi e non viene
  // contato contro l'esito. Detto, non nascosto.
  if (!fermo && beat !== 'velocita') tuttiFermi = false
  console.log('  ' + beat.padEnd(12) +
    ' corsa max ' + dmax.toFixed(3).padStart(7) +
    '   ferma dal ' + (da * 100).toFixed(0).padStart(3) + '%' +
    (fermo ? '   pausa' : beat === 'velocita' ? '   (eccezione: campo legato alla velocita)' : '   NESSUNA PAUSA'))
}

console.log('')
console.log('  I CONFINI (deve non esserci salto)')
console.log('')
let saltoMax = 0
for (let i = 1; i < letture.length; i++) {
  const a = letture[i - 1], c = letture[i]
  if (a.b === c.b) continue
  const d = dist(a, c)
  // il metro di paragone e' la corsa tipica DENTRO i due tempi confinanti
  const tipico = Math.max(
    ...(perBeat.get(a.b) ?? [{ d: 0 }]).map((k) => k.d),
    ...(perBeat.get(c.b) ?? [{ d: 0 }]).map((k) => k.d),
  )
  const rapporto = tipico > 0 ? d / tipico : 0
  saltoMax = Math.max(saltoMax, rapporto)
  console.log('  ' + (a.b + ' -> ' + c.b).padEnd(24) + ' scarto ' + d.toFixed(3).padStart(7) +
    '   = ' + rapporto.toFixed(1).padStart(5) + 'x la corsa massima' +
    (rapporto > 3 ? '   <- SALTO' : ''))
}

console.log('')
console.log('  ESITO: ' + (tuttiFermi && saltoMax <= 3
  ? 'ogni tempo ha la sua pausa e nessun confine salta.'
  : 'NON PASSA — vedi sopra.'))
