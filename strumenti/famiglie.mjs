/**
 * QUANTE FAMIGLIE DI CARATTERI CI SONO DAVVERO — contate sullo schermo.
 *
 * Una revisione esterna ha scritto: «tre famiglie tipografiche: il grotesque
 * dell'headline, il sans piu' morbido di "Dentro gira davvero", e il didone oro
 * di SCRIVIMI e TUTTO IN REGOLA. Scendi a due.» E' un rilievo che pesa, perche'
 * la tipografia sta dentro il quaranta per cento del voto.
 *
 * Ma un difetto va MISURATO prima di curarlo, e curarne uno che non esiste
 * costa il doppio: si perde il tempo e si rompe qualcosa che stava bene.
 * Qui non si guarda il foglio di stile — dove i nomi delle variabili possono
 * mentire, e infatti `--tipoRacconto` e `--tipoMisura` sono due nomi per lo
 * stesso carattere — si chiede al browser, elemento per elemento, quale font
 * ha effettivamente RISOLTO. E si guarda a piu' punti della corsa, perche' i
 * testi cambiano insieme ai capitoli.
 *
 * COSA RISPONDE, E COSA NO. Si leggono due cose separate: il primo nome della
 * pila DICHIARATA su ogni pezzo di testo in campo, e — a parte — quali file di
 * carattere il browser ha davvero caricato. Insieme dicono tutto quello che
 * serve; da sole nessuna delle due basta.
 * Il primo tentativo cercava di indovinare quale nome della pila avesse VINTO,
 * misurando la larghezza di un campione con e senza il primo nome. Non
 * funziona su questo sito, e non per un errore: i ripieghi qui sono
 * METRICAMENTE COMPATIBILI, costruiti apposta perche' le larghezze coincidano.
 * Il metodo rispondeva sempre «ripiego» e Clash Display non compariva mai, pur
 * essendo il carattere di tutti i titoli.
 *
 * IL VERDETTO: due famiglie, Switzer e Clash Display. La revisione ne contava
 * tre perche' leggeva come terza lo Switzer maiuscolo spaziato delle etichette
 * — che e' lo stesso carattere in un altro registro. Il difetto non c'era.
 * Ha pero' fatto emergerne un altro vero: «Clash Display 500 — unloaded»,
 * cioe' un peso dichiarato che nessuno usava piu'. Vedi `src/stile.css`.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 } })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 })
await p.evaluate(() => document.fonts.ready)

const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
const conto = new Map()

for (const q of [0.004, 0.10, 0.30, 0.50, 0.68, 0.78, 0.90, 0.955, 0.99]) {
  await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, q])
  for (let i = 0; i < 60; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const righe = await p.evaluate(() => {
    /* NON SI PROVA A INDOVINARE QUALE NOME DELLA PILA HA VINTO.
       Il primo tentativo lo faceva misurando la larghezza di un campione con
       la pila intera e senza il primo nome: se non cambiava, il primo non era
       in uso. Sembra solido e non lo e' — i ripieghi di questo sito sono
       METRICAMENTE COMPATIBILI, cioe' costruiti apposta perche' le larghezze
       coincidano al decimo di pixel. Il metodo attribuiva tutto al ripiego, e
       Clash Display non compariva nemmeno una volta pur essendo il carattere
       di tutti i titoli. Un metro che risponde sempre «ripiego».
       Si leggono invece due cose separate, e tutt'e due vere: il primo nome
       della pila DICHIARATA su ogni pezzo di testo, e — a parte — quali file
       di carattere il browser ha davvero caricato. */
    const fuori = []
    const guarda = (e) => {
      let suo = ''
      for (const n of e.childNodes) if (n.nodeType === 3) suo += n.textContent
      const t = suo.trim()
      if (t.length < 2) return
      const r = e.getBoundingClientRect()
      if (r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > innerHeight) return
      const st = getComputedStyle(e)
      if (st.visibility === 'hidden' || +st.opacity < 0.06) return
      const primo = st.fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
      fuori.push({ f: primo, t: t.slice(0, 26), c: st.fontSize, p: st.fontWeight })
    }
    for (const e of document.querySelectorAll('body *')) guarda(e)
    return fuori
  })

  for (const r of righe) {
    if (!conto.has(r.f)) conto.set(r.f, [])
    const l = conto.get(r.f)
    if (l.length < 6 && !l.some((x) => x.t === r.t)) l.push(r)
  }
}

const caricati = await p.evaluate(() => {
  const f = []
  document.fonts.forEach((x) => f.push(x.family + ' ' + x.weight + '  ' + x.status))
  return f.sort()
})
console.log('i file di carattere che il browser ha caricato:')
for (const c of caricati) console.log('  ' + c)
console.log('')
console.log('le famiglie dichiarate sui testi in campo, con qualche esempio:')
console.log('')
for (const [f, es] of conto) {
  console.log('  ' + f)
  for (const e of es) console.log('      ' + e.c.padStart(7) + '   «' + e.t + '»')
}
console.log('')
console.log('famiglie distinte: ' + conto.size)
await b.close()
