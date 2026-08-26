/** CHI COMPILA — il nome dei programmi shader che nascono DURANTE l'esperienza.
 *
 *  `salti.mjs` dice che gli stalli portano «+39 programmi» e non dice di chi
 *  sono. `Riscalda.ts` compila prima, a morsi piccoli, e disegna quattro pixel
 *  per costringere il driver a finalizzare — eppure ne restano fuori decine.
 *
 *  Senza il NOME non si puo' curare: si puo' solo aggiungere roba al
 *  riscaldamento a caso e rimisurare, che e' il modo piu' lento di imparare.
 *
 *  three tiene `renderer.info.programs`, e ogni programma ha un `name` e una
 *  `cacheKey`. Si fotografa l'elenco dopo il riscaldamento e lo si riguarda a
 *  ogni fotogramma: chi compare in mezzo alla corsa e' un programma che il
 *  riscaldamento non ha toccato.
 *
 *  node strumenti/chicompila.mjs [secondi]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const SECONDI = Number(process.argv[2] ?? 26)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(180000)
p.on('pageerror', (e) => console.log('!! ERRORE DI PAGINA:', e.message))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.waitForFunction(() => (window.esperienza?.ruote?.ruoteVere?.length ?? 0) >= 4, null, { timeout: 120000 }).catch(() => {})
/* SI ASPETTA CHE IL RISCALDAMENTO ABBIA FINITO. Misurare mentre sta ancora
   compilando vorrebbe dire attribuirgli i suoi stessi programmi. Non c'e' una
   bandiera, quindi si aspetta che il conto stia fermo per un secondo intero. */
await p.evaluate(async () => {
  let ultimo = -1, fermo = 0
  while (fermo < 60) {
    await new Promise((r) => requestAnimationFrame(r))
    const n = window.esperienza.renderer.info.programs.length
    if (n === ultimo) fermo++
    else { fermo = 0; ultimo = n }
  }
})

const r = await p.evaluate(async ([secondi]) => {
  const e = window.esperienza
  const chiavi = () => e.renderer.info.programs.map((x) => (x.name || '?') + ' | ' + String(x.cacheKey || '').slice(0, 60))
  const dopoRiscaldo = new Set(chiavi())
  const nati = []
  const corsa = document.documentElement.scrollHeight - innerHeight
  const t0 = performance.now()
  await new Promise((fine) => {
    const passo = () => {
      const t = (performance.now() - t0) / (secondi * 1000)
      const ora = chiavi()
      for (const k of ora) {
        if (!dopoRiscaldo.has(k)) {
          dopoRiscaldo.add(k)
          nati.push({ q: +(t * 100).toFixed(1), beat: e.regia.beat, k })
        }
      }
      if (t >= 1) return fine()
      window.scrollTo(0, corsa * t)
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
  return { nati, totale: e.renderer.info.programs.length, dopo: dopoRiscaldo.size }
}, [SECONDI])
await b.close()

console.log('')
console.log('  programmi dopo il riscaldamento: ' + (r.dopo - r.nati.length))
console.log('  NATI DURANTE LA CORSA: ' + r.nati.length)
console.log('')
const perNome = new Map()
for (const n of r.nati) {
  const nome = n.k.split(' | ')[0]
  if (!perNome.has(nome)) perNome.set(nome, [])
  perNome.get(nome).push(n)
}
for (const [nome, v] of [...perNome].sort((a, b) => b[1].length - a[1].length)) {
  const dove = [...new Set(v.map((x) => x.beat))].join(', ')
  console.log('  ' + String(v.length).padStart(3) + '  ' + nome.padEnd(28) + ' a ' +
    v.map((x) => x.q + '%').slice(0, 5).join(' ') + (v.length > 5 ? ' ...' : '') + '   [' + dove + ']')
}
