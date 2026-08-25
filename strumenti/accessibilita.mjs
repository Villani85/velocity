/** IL CONTROLLO CHE FA UNA GIURIA, fatto prima che lo faccia lei.
 *
 *  PRIMA STESURA SBAGLIATA, E VALE LA PENA TENERLO SCRITTO.
 *  Controllava che `prefers-reduced-motion` mandasse alla pagina statica, e
 *  bocciava il sito perche' non lo fa. Ma non farlo e' una DECISIONE del
 *  committente, presa dopo due versioni sbagliate di fila e documentata in
 *  testa a `index.html`:
 *
 *    - la prima spegneva l'intero sito: l'ha trovata lui aprendo la pagina su
 *      Windows con gli effetti spenti, e vedendo una fotografia al posto del
 *      sito;
 *    - la seconda era un «modo quieto» che fermava le tre cose che si muovono
 *      da sole. Rifiutata con una ragione migliore della mia: qui
 *      l'accelerazione NON e' un'animazione che parte da sola, e' la cosa che
 *      l'utente fa. Toglierla non e' rispettare una preferenza, e' togliere il
 *      sito.
 *
 *  Uno strumento che boccia una decisione presa non misura: fa politica. Va
 *  cambiato lo strumento, non il sito.
 *
 *  QUINDI QUI SI VERIFICA CIO' CHE IL SITO PROMETTE DAVVERO:
 *    - il documento statico esiste, e' completo e leggibile dai motori e dai
 *      lettori di schermo, con la stessa lista dei lavori dell'esperienza;
 *    - il movimento ridotto non rompe niente e spegne le transizioni
 *      DECORATIVE (quelle si', sono animazioni che partono da sole);
 *    - la modalita' lettura si apre, si chiude con Esc e non perde il fuoco;
 *    - ogni testo ha la sua traduzione.
 *
 *  E RESTA UN'ESPOSIZIONE, che va detta e non nascosta: chi apre con
 *  `prefers-reduced-motion` riceve comunque l'esperienza in movimento. E' una
 *  scelta consapevole, non una svista — ma su una scheda di candidatura e'
 *  esattamente il controllo che si fa per primo.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const esiti = []
const dice = (nome, ok, dettaglio) => {
  esiti.push({ nome, ok })
  console.log(`  ${ok ? 'ok  ' : 'NO  '}${nome}${dettaglio ? '  — ' + dettaglio : ''}`)
}
const nuovo = async (opz = {}) => {
  const ctx = await b.newContext({ viewport: { width: 1200, height: 800 }, ...opz })
  const p = await ctx.newPage()
  await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
  return { ctx, p }
}

// ------------------------------------------------- 1. lo strato semantico
{
  const { ctx, p } = await nuovo({ javaScriptEnabled: false })
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  const s = await p.evaluate(() => ({
    titoli: document.querySelectorAll('.documento h1, .documento h2').length,
    paragrafi: document.querySelectorAll('.documento p').length,
    lavori: document.querySelectorAll('.documento .statica__ottiche li').length,
    contatto: (document.querySelector('.statica__contatto')?.textContent ?? '').trim().length,
    lingua: document.documentElement.lang,
  }))
  console.log('\nSTRATO SEMANTICO (senza JavaScript)')
  dice('c e un titolo e dei sottotitoli', s.titoli >= 2, s.titoli + ' fra h1 e h2')
  dice('c e del testo vero', s.paragrafi >= 6, s.paragrafi + ' paragrafi')
  dice('la lista dei lavori e completa', s.lavori >= 8, s.lavori + ' voci')
  dice('il contatto c e', s.contatto > 8, s.contatto + ' caratteri')
  dice('la pagina dichiara la lingua', !!s.lingua, 'lang = ' + s.lingua)
  await ctx.close()
}

// ------------------------------------------------- 2. movimento ridotto
{
  const { ctx, p } = await nuovo({ reducedMotion: 'reduce' })
  const errori = []
  p.on('pageerror', (e) => errori.push(e.message))
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 }).catch(() => {})
  await p.waitForTimeout(4000)
  const s = await p.evaluate(() => {
    const voci = document.querySelector('.voci')
    return {
      viva: !!window.esperienza,
      transizioniSpente: voci ? getComputedStyle(voci).transitionDuration : '(niente)',
    }
  })
  console.log('\nMOVIMENTO RIDOTTO')
  dice('la scena parte lo stesso (scelta del committente)', s.viva === true)
  /* SI LEGGE IL NUMERO, non la stringa. Il valore tornava `1e-05s` — dieci
     microsecondi, cioe' la regola FUNZIONA — e il confronto testuale lo
     bocciava perche' cercava «0s» o «0ms». Un controllo che non sa leggere il
     formato che il browser gli da' non misura il sito: misura se stesso. */
  const durata = parseFloat(s.transizioniSpente) || 0
  const unita = /ms\s*$/.test(s.transizioniSpente) ? 0.001 : 1
  dice('le transizioni decorative sono spente', durata * unita < 0.02, s.transizioniSpente)
  dice('nessun errore di pagina', errori.length === 0, errori[0] ?? '')
  await ctx.close()
}

// ------------------------------------------------- 3. lettura e tastiera
{
  const { ctx, p } = await nuovo()
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
  await p.waitForTimeout(3500)
  console.log('\nMODALITA LETTURA')
  const alt = await p.evaluate(() => {
    const im = Array.from(document.images)
    return { t: im.length, senza: im.filter((i) => typeof i.alt !== 'string').length }
  })
  dice('ogni immagine ha un attributo alt', alt.senza === 0, alt.t + ' immagini')
  await p.evaluate(() => document.querySelector('a[href="#studio"]')?.click())
  await p.waitForTimeout(900)
  dice('STUDIO apre la lettura', (await p.evaluate(() => document.documentElement.dataset.lettura)) === 'si')
  const fuoco = await p.evaluate(() => document.activeElement?.className ?? '')
  dice('il fuoco entra nella lettura', /lettura__chiudi/.test(fuoco), 'fuoco su ' + (fuoco || '(niente)'))
  const leggibile = await p.evaluate(() => {
    const d = document.querySelector('.documento')
    const r = d.getBoundingClientRect()
    return { largo: Math.round(r.width), alto: Math.round(r.height) }
  })
  dice('il documento riempie lo schermo', leggibile.largo > 600 && leggibile.alto > 400,
    leggibile.largo + 'x' + leggibile.alto)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(500)
  dice('Esc chiude', (await p.evaluate(() => document.documentElement.dataset.lettura ?? '')) === '')
  dice('il fuoco torna sul collegamento',
    (await p.evaluate(() => document.activeElement?.getAttribute?.('href'))) === '#studio')
  await ctx.close()
}

// ------------------------------------------------- 4. le traduzioni
{
  const { ctx, p } = await nuovo()
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(3000)
  /* SI CHIEDE AL DIZIONARIO, non si confrontano i testi sullo schermo.
     Confrontandoli, ogni voce che in inglese e' UGUALE all'italiano — «Giuseppe
     Villani — Freelance Creative Developer» lo e' — risulta non tradotta. Il
     dizionario invece sa la differenza fra «manca la chiave» e «la traduzione
     coincide», che sono due cose diverse. */
  const esito = await p.evaluate(async () => {
    const chiavi = Array.from(document.querySelectorAll('[data-t]')).map((e) => e.dataset.t)
    const m = await import('/src/ui/Lingua.ts').catch(() => null)
    const D = m && (m.DIZIONARIO ?? m.D ?? m.default)
    if (!D) return { senzaDizionario: true, chiavi: chiavi.length }
    const mancanti = chiavi.filter((k) => !D[k])
    const senzaEn = chiavi.filter((k) => D[k] && !D[k].en)
    return { chiavi: chiavi.length, mancanti, senzaEn }
  })
  console.log('\nTRADUZIONI')
  if (esito.senzaDizionario) {
    dice('il dizionario e leggibile dal vivo', false, 'non esportato: controllo saltato')
  } else {
    dice('ogni data-t ha la sua chiave', esito.mancanti.length === 0,
      esito.mancanti.length ? esito.mancanti.slice(0, 5).join(', ') : esito.chiavi + ' chiavi')
    dice('ogni chiave ha l inglese', esito.senzaEn.length === 0,
      esito.senzaEn.length ? esito.senzaEn.slice(0, 5).join(', ') : 'tutte')
  }
  await ctx.close()
}

await b.close()
const rotti = esiti.filter((e) => !e.ok)
console.log('\n' + (esiti.length - rotti.length) + '/' + esiti.length + ' controlli passati')
if (rotti.length) {
  console.log('non passati: ' + rotti.map((r) => r.nome).join(' · '))
  process.exitCode = 1
}
