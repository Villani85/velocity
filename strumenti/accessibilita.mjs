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
 *  RESTAVA UN'ESPOSIZIONE, ed e' stata chiusa. La riga qui sopra diceva: «chi
 *  apre con `prefers-reduced-motion` riceve comunque l'esperienza in
 *  movimento; e' una scelta consapevole, non una svista — ma su una scheda di
 *  candidatura e' esattamente il controllo che si fa per primo». Era onesta e
 *  aveva ragione a due terzi: la scelta di NON mandare alla pagina statica e'
 *  consapevole, e resta. Cio' che mancava e' che «l'esperienza» e «l'esperienza
 *  IN MOVIMENTO» non sono la stessa cosa, e il sito le trattava come tali.
 *
 *  Adesso la preferenza si onora DENTRO l'esperienza — la scena, il modello e i
 *  materiali restano, il movimento autonomo si ferma, lo scorrimento perde
 *  l'inerzia — e a leggerla e' un posto solo, `src/core/Moto.ts`.
 *
 *  Questo strumento continua a controllare le transizioni decorative, che sono
 *  la meta' che si vede dal foglio di stile. L'altra meta' si vede solo
 *  fotografando la scena, e la misura `strumenti/fermo.mjs`: quanti pixel
 *  cambiano fra due fotogrammi lontani due secondi, a pagina ferma.
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
      ridotto: window.esperienza?.ridotto ?? null,
      transizioniSpente: voci ? getComputedStyle(voci).transitionDuration : '(niente)',
    }
  })
  console.log('\nMOVIMENTO RIDOTTO')
  dice('la scena parte lo stesso (scelta del committente)', s.viva === true)
  /* E LA PREFERENZA ARRIVA FINO ALLA SCENA — il controllo che mancava.
     `esperienza.ridotto` e' la finestra su `src/core/Moto.ts`, cioe' sull'unico
     posto del progetto che interroga il sistema. Se qui e' falso, tutto cio'
     che il sito fa per onorare la preferenza semplicemente non viene eseguito
     — e nessuno degli altri controlli se ne accorgerebbe, perche' guardano il
     foglio di stile, che continuerebbe a rispondere giusto.
     QUANTO movimento resta davvero lo misura `strumenti/fermo.mjs`. Qui si
     verifica solo che il filo sia collegato. */
  dice('la preferenza arriva fino alla scena', s.ridotto === true, 'esperienza.ridotto = ' + s.ridotto)
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

// ------------------------------------------------- 3bis. la tabulazione
{
  const { ctx, p } = await nuovo()
  await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
  await p.waitForTimeout(3500)
  console.log('')
  console.log('TABULAZIONE')
  /* IL CONTROLLO CHE MANCAVA, ed e' il motivo per cui il difetto e' arrivato
     fino a stanotte. Il documento statico e' fuori campo ma NON inerte:
     contiene collegamenti veri, e da `position: absolute` cadeva dopo la
     corsa. Alla sesta pressione di TAB il fuoco ci entrava e il browser
     portava l'elemento in vista, cioe' scaraventava la pagina al finale —
     scavalcando tutti e sette i tempi — su un elemento che per giunta
     `clip-path` non dipinge.
     Due cose si misurano insieme: che nessun TAB sposti la pagina di piu' di
     mezza finestra, e che il fuoco sia DIPINTO — se `elementFromPoint` al
     centro del suo rettangolo non torna l'elemento stesso, quell'elemento non
     si vede, contorno compreso. */
  let saltoMax = 0, dettaglio = ''
  const ciechi = []
  for (let i = 1; i <= 8; i++) {
    const prima = await p.evaluate(() => window.scrollY)
    await p.keyboard.press('Tab')
    await p.waitForTimeout(220)
    /* SI PROTEGGE, e la ragione e' misurata: questa sequenza si e' rivelata
       INSTABILE — corse identiche si fermavano dopo tre, cinque o otto passi,
       perche' il server di sviluppo cade e la pagina sparisce sotto la sonda.
       Un controllo che muore a meta' senza dirlo e' peggio di un controllo
       assente: sembra passato. Se la pagina se ne va, lo si dichiara. */
    let st
    try {
      st = await p.evaluate(() => {
        const a = document.activeElement
        if (!a || a === document.body) return null
        const r = a.getBoundingClientRect()
        const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2)
        const sotto = document.elementFromPoint(cx, cy)
        return {
          y: window.scrollY,
          etichetta: (a.textContent || a.getAttribute('aria-label') || a.tagName).trim().slice(0, 34),
          dipinto: sotto === a || a.contains(sotto) || (sotto && sotto.contains(a)),
          sotto: sotto ? (sotto.tagName + (sotto.className ? '.' + String(sotto.className).split(' ')[0] : '')) : 'niente',
          lettura: document.documentElement.dataset.lettura ?? '-',
          inerte: (() => { let x = a; while (x) { if (x.hasAttribute?.('inert')) return 'si'; x = x.parentElement } return 'no' })(),
          dentroSchermo: r.top >= -2 && r.bottom <= innerHeight + 2,
        }
      })
    } catch (e) {
      dettaglio = 'la pagina e sparita al TAB ' + i
      break
    }
    if (!st) continue
    const salto = Math.abs(st.y - prima)
    if (salto > saltoMax) { saltoMax = salto; dettaglio = 'TAB ' + i + ' -> ' + st.etichetta }
    if (!st.dipinto && st.dentroSchermo) ciechi.push(st.etichetta + ' [' + st.sotto + ']')
  }
  const mezza = await p.evaluate(() => innerHeight / 2)
  dice('nessun TAB scaraventa la pagina', saltoMax < mezza,
    'salto massimo ' + Math.round(saltoMax) + ' px' + (dettaglio ? ' (' + dettaglio + ')' : ''))
  dice('il fuoco e sempre dipinto', ciechi.length === 0,
    ciechi.length ? ciechi.join(' · ') : 'tutti visibili')
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
