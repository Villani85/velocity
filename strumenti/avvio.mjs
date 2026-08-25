/** COM'E' IL PRIMO CARICAMENTO, guardato invece che immaginato.
 *
 *  Il committente: «quando si carica il sito per la prima volta si carica in
 *  una maniera strana». Una frase cosi' non si diagnostica leggendo il codice:
 *  si guarda. Questo prende una striscia di fotogrammi dal secondo zero, con
 *  la cache VUOTA — che e' la condizione di chi arriva la prima volta e
 *  l'unica in cui il difetto puo' esistere — e insieme registra COSA succede:
 *  quali file arrivano e quando, e in che ordine si accendono le bandiere di
 *  prontezza.
 *
 *  Le due cose vanno lette insieme: un fotogramma strano da solo non dice
 *  perche', e un elenco di richieste da solo non dice come si vede.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { mkdirSync } from 'fs'

const SECONDI = Number(process.argv[2] ?? 16)
const OGNI = Number(process.argv[3] ?? 900)
const RETE = process.argv[4] ?? 'piena'   // piena | lenta

mkdirSync('docs/provini/avvio', { recursive: true })

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))

/* LA RETE LENTA NON E' UN CAPRICCIO: su una macchina da sviluppo, con il
   server in locale, tre megabyte arrivano in un battito e QUALUNQUE ordine di
   caricamento sembra giusto. I difetti di avvio si vedono solo quando la banda
   e' un vincolo — cioe' dalla parte di chi guarda. */
if (RETE === 'lenta') {
  const cdp = await ctx.newCDPSession(p)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 90,
    downloadThroughput: 1.6 * 1024 * 1024 / 8,   // 1,6 Mbit/s
    uploadThroughput: 750 * 1024 / 8,
  })
}

const errori = []
p.on('pageerror', (e) => errori.push('pageerror: ' + e.message))
p.on('console', (m) => { if (m.type() === 'error') errori.push('console: ' + m.text()) })

const rete = []
const t0 = Date.now()
p.on('response', (r) => {
  const u = new URL(r.url()).pathname
  if (!/\.(webp|avif|png|jpe?g|glb|hdr|woff2?|js|css|html)$/i.test(u) && u !== '/') return
  rete.push({ t: Date.now() - t0, u, stato: r.status() })
})

await p.goto('http://localhost:5174/', { waitUntil: 'commit' })

const passi = Math.floor((SECONDI * 1000) / OGNI)
const bandiere = []
for (let i = 0; i <= passi; i++) {
  const t = i * OGNI
  await p.screenshot({ path: `docs/provini/avvio/f${String(i).padStart(2, '0')}.jpeg`, type: 'jpeg', quality: 80 })
  const s = await p.evaluate(() => {
    const e = window.esperienza
    return {
      esperienza: !!e,
      auto: e ? !!e.autoPronta : false,
      ambiente: e ? !!e.ambientePronto : false,
      lastra: e ? !!(e.lastra && e.lastra.pronta) : false,
      attesa: !!document.querySelector('.attesa'),
      ripiego: document.documentElement.dataset.ripiego ?? null,
    }
  }).catch(() => null)
  bandiere.push({ t, s })
  if (i < passi) await p.waitForTimeout(OGNI)
}

console.log('BANDIERE DI PRONTEZZA (rete ' + RETE + ')')
for (const { t, s } of bandiere) {
  if (!s) { console.log('  ' + String(t).padStart(6) + ' ms  (pagina non interrogabile)'); continue }
  console.log('  ' + String(t).padStart(6) + ' ms   esperienza ' + (s.esperienza ? 'si' : 'no') +
    '   auto ' + (s.auto ? 'si' : 'no') +
    '   ambiente ' + (s.ambiente ? 'si' : 'no') +
    '   lastra ' + (s.lastra ? 'si' : 'no') +
    '   attesa ' + (s.attesa ? 'c e' : 'via'))
}

console.log('\nORDINE DI ARRIVO (i pesi veri)')
for (const r of rete.filter((x) => /\.(glb|hdr|webp|avif|woff2?)$/i.test(x.u)).slice(0, 22)) {
  console.log('  ' + String(r.t).padStart(6) + ' ms  ' + String(r.stato) + '  ' + r.u)
}

if (errori.length) {
  console.log('\nERRORI')
  for (const e of errori.slice(0, 8)) console.log('  ' + e)
} else {
  console.log('\nnessun errore di pagina')
}

await b.close()
