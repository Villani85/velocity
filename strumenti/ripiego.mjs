/**
 * IL RIPIEGO, PROVATO INVECE CHE DICHIARATO.
 *
 * Un ripiego e' la parte di un sito che non guarda mai nessuno, ed e' per
 * questo che quasi sempre e' rotto: si scrive, si dichiara fatto, e la prima
 * persona che ci finisce dentro e' un utente vero. Questo strumento ci finisce
 * dentro per primo.
 *
 * MISURA DUE COSE, e la seconda e' quella che conta davvero:
 *
 *   1. che la pagina statica ci sia e sia leggibile — titolo, sezioni,
 *      immagine, nessun testo tagliato;
 *   2. QUANTO SI SCARICA. E' il punto di tutto: se chi ha chiesto meno
 *      movimento riceve lo stesso i tre megabyte del modello, la preferenza e'
 *      stata onorata a parole e non nei fatti.
 *
 *   node strumenti/ripiego.mjs
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const PROVE = [
  { nome: 'normale', motoRidotto: false, larghezza: 1280, altezza: 800 },
  { nome: 'moto ridotto', motoRidotto: true, larghezza: 1280, altezza: 800 },
  { nome: 'moto ridotto, telefono', motoRidotto: true, larghezza: 390, altezza: 844 },
]

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })

for (const prova of PROVE) {
  const ctx = await b.newContext({
    viewport: { width: prova.larghezza, height: prova.altezza },
    deviceScaleFactor: 2,
    reducedMotion: prova.motoRidotto ? 'reduce' : 'no-preference',
  })
  const p = await ctx.newPage()
  p.setDefaultTimeout(120000)

  // OGNI BYTE CHE PASSA, e da dove viene. Non basta contare le richieste:
  // quello che interessa e' il peso, ed e' il peso che distingue una
  // preferenza onorata da una dichiarata.
  let peso = 0
  const pesanti = []
  p.on('response', async (r) => {
    const l = Number(r.headers()['content-length'] || 0)
    if (!l) return
    peso += l
    if (l > 60000) pesanti.push([r.url().split('/').pop(), Math.round(l / 1024)])
  })

  await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
  await p.goto('http://localhost:5174/', { waitUntil: 'load' })
  // otto secondi di grazia: nel caso normale la scena sta ancora scaricando, e
  // il confronto ha senso solo a parita' di tempo trascorso
  await p.waitForTimeout(8000)

  const esito = await p.evaluate(() => {
    const r = document.documentElement.dataset.ripiego ?? null
    const doc = document.getElementById('documento')
    const stile = doc ? getComputedStyle(doc) : null
    const h1 = document.querySelector('h1')
    // IL CONTROLLO DEL TAGLIO SI FA SUL TESTO, non sulla scatola. E' la
    // lezione gia' pagata sul telefono: un elemento puo' stare dentro la
    // finestra mentre il suo contenuto esce, e misurare il riquadro dice di
    // si' mentre lo schermo dice di no.
    let esce = []
    for (const e of document.querySelectorAll('#documento h1, #documento h2, #documento p, #documento li')) {
      const b = e.getBoundingClientRect()
      if (b.width === 0) continue
      if (b.right > innerWidth + 1 || b.left < -1) esce.push(e.textContent.slice(0, 34))
    }
    return {
      ripiego: r,
      visibile: stile ? stile.clipPath === 'none' : false,
      titolo: h1 ? h1.textContent.trim().slice(0, 46) : null,
      sezioni: document.querySelectorAll('#documento section').length,
      // la scena c'e' o no: se il ripiego e' acceso `window.esperienza` non
      // deve nemmeno esistere, perche' `new Esperienza` non e' stato chiamato
      scenaCostruita: !!window.esperienza,
      altezzaPagina: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10,
      esce,
    }
  })

  console.log('\n— ' + prova.nome + ' (' + prova.larghezza + 'x' + prova.altezza + ')')
  console.log('  ripiego          ', esito.ripiego ?? 'no')
  console.log('  documento visibile', esito.visibile)
  console.log('  scena costruita  ', esito.scenaCostruita)
  console.log('  titolo           ', esito.titolo)
  console.log('  sezioni          ', esito.sezioni, ' altezza', esito.altezzaPagina + ' schermate')
  console.log('  SCARICATO        ', Math.round(peso / 1024) + ' kB')
  if (pesanti.length) console.log('    sopra 60 kB    ', pesanti.map((x) => x[0] + ' ' + x[1] + 'k').join(', '))
  if (esito.esce.length) console.log('  ESCE DAL BORDO   ', esito.esce)

  if (esito.ripiego) await p.screenshot({ path: `.tmp/ripiego_${prova.larghezza}.png`, fullPage: true })
  await ctx.close()
}
await b.close()
