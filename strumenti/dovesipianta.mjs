/** DOVE SI PIANTA — dentro il disegno o fuori?
 *
 *  `stalli.mjs` dice che a qualita' alta il tratto della strada gira a 117
 *  fotogrammi VERI in dieci secondi, con un fotogramma da quasi quattro
 *  secondi, e che il taglio del `dt` a 0,1 s trasforma quegli stalli in
 *  strada che non viene percorsa: il 75%.
 *
 *  Quello che non dice e' CHI se lo prende. Prima di curare bisogna sapere se
 *  il secondo se lo mangia il disegno (shader, passate, GPU) o l'aggiornamento
 *  (JavaScript, tessiture, raccolta della memoria).
 *
 *  Si avvolgono `composer.render` e `renderer.render` DA FUORI, dalla pagina,
 *  senza toccare i sorgenti: cosi' non si misura una versione strumentata
 *  diversa da quella vera. Poi si confronta la durata del fotogramma con la
 *  somma di quello che sta dentro il disegno.
 *
 *  node strumenti/dovesipianta.mjs <da> <a> <secondi> <qualita>
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const DA = Number(process.argv[2] ?? 0.70)
const A = Number(process.argv[3] ?? 0.83)
const SECONDI = Number(process.argv[4] ?? 10)
const QUAL = process.argv[5] ?? 'alto'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 120000 }).catch(() => {})
if (QUAL !== 'auto') await p.evaluate((v) => window.fissaQualita(v), QUAL)
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
await p.evaluate(([c, da]) => window.scrollTo(0, c * da), [corsa, DA])
await p.evaluate(() => new Promise((f) => { let n = 0; const g = () => (++n > 120 ? f() : requestAnimationFrame(g)); requestAnimationFrame(g) }))

const r = await p.evaluate(async ([c, da, a, secondi]) => {
  const e = window.esperienza
  const conto = { disegno: 0, chiamate: 0 }
  const avvolgi = (obj, nome) => {
    if (!obj || !obj[nome] || obj['__avvolto_' + nome]) return false
    const orig = obj[nome].bind(obj)
    obj[nome] = (...a) => { const t = performance.now(); const v = orig(...a); conto.disegno += performance.now() - t; conto.chiamate++; return v }
    obj['__avvolto_' + nome] = true
    return true
  }
  const avvolti = []
  if (avvolgi(e.composer, 'render')) avvolti.push('composer.render')
  if (avvolgi(e.renderer, 'render')) avvolti.push('renderer.render')
  if (avvolgi(e.renderer, 'compile')) avvolti.push('renderer.compile')

  /* E SI AVVOLGE ANCHE OGNI MODULO, uno per uno. Sapere che quattro secondi
     stanno «fuori dal disegno» restringe il campo e non lo chiude: fuori dal
     disegno c'e' tutto l'aggiornamento della scena. Si mette un cronometro su
     ogni `aggiorna` e si guarda chi se li prende. */
  const per = {}
  for (const nome of ['quadro', 'vetrina', 'insegne', 'lastra', 'ruote', 'abitacolo',
                      'volante', 'palpebra', 'telaio', 'attraversamento', 'contatto', 'ancore']) {
    const m = e[nome]
    if (!m || typeof m.aggiorna !== 'function' || m.__cron) continue
    const orig = m.aggiorna.bind(m)
    per[nome] = 0
    m.aggiorna = (...a) => { const t = performance.now(); const v = orig(...a); per[nome] += performance.now() - t; return v }
    m.__cron = true
    avvolti.push(nome + '.aggiorna')
  }

  const righe = []
  let prima = performance.now()
  const t0 = prima
  await new Promise((fine) => {
    const passo = () => {
      const ora = performance.now()
      const durata = ora - prima
      const chi = {}
      for (const k in per) { if (per[k] > 1) chi[k] = +per[k].toFixed(1); per[k] = 0 }
      /* E SI CONTANO I PROGRAMMI SHADER A OGNI FOTOGRAMMA. three li compila
         PIGRAMENTE, la prima volta che un materiale viene disegnato, e su
         D3D11 il collegamento di un programma puo' bloccare per secondi — e
         non blocca dentro `render`, blocca il processo grafico, cioe' proprio
         nel buco fra due fotogrammi che sto misurando. Se questo numero
         cresce mentre si guida, il riscaldamento non copre questo tempo. */
      righe.push({ q: +(ora - t0).toFixed(0), f: +durata.toFixed(1), d: +conto.disegno.toFixed(1), n: conto.chiamate, chi,
        prog: e.renderer?.info?.programs?.length ?? -1 })
      conto.disegno = 0; conto.chiamate = 0
      prima = ora
      const t = (ora - t0) / (secondi * 1000)
      if (t >= 1) return fine()
      window.scrollTo(0, c * (da + (a - da) * t))
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
  return { righe: righe.slice(1), avvolti, programmi: e.renderer?.info?.programs?.length ?? -1 }
}, [corsa, DA, A, SECONDI])
await b.close()

console.log('')
console.log('  avvolti: ' + (r.avvolti.join(', ') || 'NIENTE — i nomi non combaciano'))
console.log('  programmi compilati alla fine: ' + r.programmi)
console.log('')
const lunghi = r.righe.filter((x) => x.f > 100).sort((a, b) => b.f - a.f)
console.log('  i fotogrammi oltre 100 ms, e quanto ne sta DENTRO il disegno:')
console.log('')
for (const x of lunghi.slice(0, 12)) {
  const fuori = x.f - x.d
  console.log('  a ' + String(x.q).padStart(6) + ' ms   fotogramma ' + String(Math.round(x.f)).padStart(5) +
    ' ms   disegno ' + String(Math.round(x.d)).padStart(5) + ' ms (' + x.n + ' chiamate)   FUORI ' +
    String(Math.round(fuori)).padStart(5) + ' ms   ' + (fuori > x.d ? '<- fuori dal disegno' : '<- dentro il disegno'))
  const dentro = Object.entries(x.chi || {}).sort((a, b) => b[1] - a[1])
  if (dentro.length) console.log('        moduli: ' + dentro.map(([k, v]) => k + ' ' + Math.round(v) + 'ms').join('  '))
  const idx = r.righe.indexOf(x)
  if (idx > 0) {
    const nuovi = x.prog - r.righe[idx - 1].prog
    if (nuovi !== 0) console.log('        PROGRAMMI SHADER: ' + r.righe[idx - 1].prog + ' -> ' + x.prog + '  (' + (nuovi > 0 ? '+' : '') + nuovi + ')')
  }
}
const somma = (f) => r.righe.reduce((s, x) => s + f(x), 0)
console.log('')
console.log('')
console.log('  programmi shader: ' + r.righe[0].prog + ' all inizio del tratto -> ' + r.righe[r.righe.length - 1].prog + ' alla fine')
console.log('  su tutto il tratto: fotogrammi ' + Math.round(somma((x) => x.f)) + ' ms, di cui disegno ' +
  Math.round(somma((x) => x.d)) + ' ms (' + (100 * somma((x) => x.d) / somma((x) => x.f)).toFixed(0) + '%)')
