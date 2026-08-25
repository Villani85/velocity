/** LA ZAVORRA — cosa spedisci e nessuno chiede. E il poster che invecchia.
 *
 *  DUE DIFETTI, UNO STRUMENTO, e stanno insieme per una ragione: sono lo stesso
 *  difetto visto da due lati — un artefatto che vive in `public/` e che nessuno
 *  tiene allineato.
 *
 *  1. LA ZAVORRA. Tutto cio' che sta in `public/` finisce nel pacchetto, che
 *     qualcuno lo chieda o no. Un provino di diagnosi da 2,5 MB lasciato li'
 *     non rallenta il primo fotogramma — nessuno lo richiede — ma sta
 *     nell'artefatto di consegna, nella cache, e nella cifra che un giurato
 *     vede se apre la rete e guarda il totale trasferito.
 *
 *  2. IL POSTER VECCHIO. `public/poster/` e' un artefatto di BUILD committato a
 *     mano, e come tutti gli artefatti committati a mano deriva: alla seconda
 *     segnalazione in dodici ore precedeva otto commit, fra cui il fix delle
 *     ruote coperte dalla minigonna e tutti i giri sulle insegne. L'immagine
 *     che il mondo vede nelle anteprime era di due ore prima e di un'altra
 *     scena.
 *
 *  PERCHE' UNO STRUMENTO NUOVO, quando la regola di questo progetto e' che non
 *  se ne aggiungono. Perche' nessuno dei 109 esistenti guarda `public/`:
 *  misurano tutti la SCENA, e questi due difetti stanno fuori dalla scena — nel
 *  pacchetto. E' la stessa ragione per cui `cancelloBin` e' stato scritto: una
 *  mediana non vede la saturazione, e una misura di scena non vede il peso di
 *  consegna. Uno solo, e fa due domande, perche' hanno la stessa risposta.
 *
 *  ESCE CON ERRORE. Un avviso che si puo' ignorare l'ho gia' ignorato due volte.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { readdirSync, statSync, existsSync, readFileSync } from 'fs'
import { join, relative, sep as SEP } from 'path'
import { execSync } from 'child_process'

const CAPO = String.fromCharCode(10)
const ESTENSIONI = new RegExp('[.](ts|js|mjs|html|css|json)$', 'i')
const SOGLIA_KB = Number(process.argv[2] ?? 300)

/* ------------------------------------------------------ cosa la pagina chiede */
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const chiesti = new Set()

/* SI PERCORRE IL SITO DUE VOLTE, da scrivania e da telefono.
   Meta' di quello che questo sito carica dipende da una condizione: la
   variante dell'abitacolo cambia con la larghezza dello schermo, e misurando
   solo da scrivania quella per telefono risulterebbe zavorra. E' il modo piu'
   rapido di cancellare qualcosa che serve. */
const MISURE = [
  { width: 1440, height: 900, nome: 'scrivania' },
  { width: 390, height: 844, nome: 'telefono' },
]
for (const m of MISURE) {
  const p = await b.newPage({ viewport: { width: m.width, height: m.height } })
  p.setDefaultTimeout(120000)
  await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
  p.on('response', (r) => { try { chiesti.add(new URL(r.url()).pathname) } catch (e) { /* niente */ } })
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
  await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
  /* e si percorre TUTTO, non solo la hero: l'abitacolo, il carosello e il
     finale caricano roba che il primo fotogramma non tocca */
  const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  for (let i = 0; i <= 60; i++) {
    await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, i / 60])
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  }
  await p.waitForTimeout(3500)
  console.log('  percorso da ' + m.nome + ': ' + chiesti.size + ' file chiesti in tutto')
  await p.close()
}
await b.close()

/* ------------------------------------------------------------ cosa c'e' dentro */
const tutti = []
const cammina = (d) => {
  for (const n of readdirSync(d)) {
    const f = join(d, n)
    const st = statSync(f)
    if (st.isDirectory()) cammina(f)
    else tutti.push({ f: '/' + relative('public', f).split(SEP).join('/'), peso: st.size })
  }
}
cammina('public')

/* ============================================================ IL CRITERIO

   «NON CHIESTO» NON VUOL DIRE «INUTILE», e il primo giro di questo strumento
   stava per farmi cancellare l'immagine delle anteprime sociali.

   I poster non li chiede mai la pagina: li leggono i crawler, che questo giro
   non simula. Sotto un criterio solo — «mai chiesto» — la zavorra vera e gli
   asset consumati da qualcun altro finiscono nello stesso mucchio, ed e' la
   stessa famiglia di difetto della maschera che confondeva il vetro col
   riempimento rosso: un criterio non separa due popolazioni che condividono un
   valore.

   Quindi un secondo criterio, indipendente dal primo: il file e' NOMINATO da
   qualche parte nel sorgente o nel documento?

     non chiesto E non nominato  ->  zavorra: si puo' togliere
     non chiesto MA nominato     ->  lo strumento NON SA, e lo dice

   Uno strumento che dichiara la propria incertezza vale piu' di uno che sbaglia
   con sicurezza. La seconda lista si guarda a mano, ed e' corta. */
const fonti = []
const raccogli = (d) => {
  for (const n of readdirSync(d)) {
    const f = join(d, n)
    if (statSync(f).isDirectory()) { if (n !== 'node_modules') raccogli(f); continue }
    if (!ESTENSIONI.test(n)) continue
    try { fonti.push(readFileSync(f, 'utf8')) } catch (e) { /* niente */ }
  }
}
raccogli('src')
raccogli('strumenti')
fonti.push(readFileSync('index.html', 'utf8'))
const testo = fonti.join(CAPO)
const nominato = (f) => testo.includes(f.split('/').pop())

const nonChiesti = tutti.filter((x) => !chiesti.has(x.f) && x.peso > 20000)
const zavorra = nonChiesti.filter((x) => !nominato(x.f)).sort((a, c) => c.peso - a.peso)
const daGuardare = nonChiesti.filter((x) => nominato(x.f)).sort((a, c) => c.peso - a.peso)
const totale = zavorra.reduce((s, x) => s + x.peso, 0)

console.log(CAPO + 'ZAVORRA CERTA — dentro `public/`, mai chiesta e mai nominata' + CAPO)
for (const z of zavorra) console.log('  ' + (z.peso / 1024).toFixed(0).padStart(6) + ' kB   ' + z.f)
console.log(CAPO + '  totale ' + (totale / 1024).toFixed(0) + ' kB   (soglia ' + SOGLIA_KB + ' kB)')

console.log(CAPO + 'DA GUARDARE — mai chiesta in questo giro, ma qualcuno la nomina.')
console.log('(poster per i crawler, varianti condizionali, o solo una citazione in un')
console.log(' commento: lo strumento non lo sa e non decide al posto tuo.)' + CAPO)
for (const z of daGuardare) console.log('  ' + (z.peso / 1024).toFixed(0).padStart(6) + ' kB   ' + z.f)

/* ------------------------------------------------------------ il poster deriva */
let posterVecchio = false
if (existsSync('public/poster')) {
  const q = (c) => { try { return execSync(c, { encoding: 'utf8' }).trim() } catch (e) { return '' } }
  const tPoster = Number(q('git log -1 --format=%ct -- public/poster') || 0)
  const dietro = Number(q('git rev-list --count --since=' + tPoster + ' HEAD -- src/scene src/ui src/stile.css') || 0)
  console.log(CAPO + 'IL POSTER')
  console.log('  commit di scena piu recenti del poster: ' + dietro)
  if (dietro > 0) posterVecchio = true
}

let esito = 0
if (totale / 1024 > SOGLIA_KB) {
  console.log(CAPO + 'BOCCIATO: ' + (totale / 1024).toFixed(0) + ' kB spediti a chi guarda e mai chiesti.')
  console.log('I provini di diagnosi vanno in `docs/provini/`; le tessiture che servono')
  console.log('agli strumenti in `texture-sorgente/`, committata e che il build non copia.')
  console.log('`public/` e cio che spedisci, non cio che ti serve per costruire.')
  esito = 1
}
if (posterVecchio) {
  console.log(CAPO + 'BOCCIATO: il poster precede la scena. Rigeneralo con `node strumenti/poster.mjs`.')
  esito = 1
}
if (!esito) console.log(CAPO + 'passa.')
process.exit(esito)
