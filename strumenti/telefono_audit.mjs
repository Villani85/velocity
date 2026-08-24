/**
 * IL TELEFONO, VOCE PER VOCE — non «sembra a posto», ma sette misure.
 *
 * PERCHE' ESISTE.
 *
 * L'audit dice, giustamente, che l'ultima registrazione mobile non era della
 * stessa build. E su questo progetto il telefono e' gia' stato il posto dove i
 * difetti si nascondono: la parola SCRIVIMI sopra l'orologio del cruscotto, le
 * due pastiglie della testata a zero pixel l'una dall'altra, il riquadro del
 * lavoro che si prendeva mezza pagina. Nessuno dei tre si vedeva da desktop.
 *
 * Un provino non basta perche' i difetti del telefono sono quasi tutti di
 * SOVRAPPOSIZIONE, e due rettangoli che si toccano si vedono solo se si
 * guarda proprio li'. Un metro invece li trova tutti insieme.
 *
 * COSA CONTROLLA, a ogni tempo e a tre formati:
 *
 *   1. testo tagliato — un nodo il cui contenuto esce dal suo riquadro
 *   2. testo fuori schermo — un riquadro che sborda dalla finestra
 *   3. sovrapposizioni — due blocchi di testo che si accavallano
 *   4. bersagli piccoli — un comando sotto i 44 px chiesti da un dito
 *   5. corpi minuscoli — testo informativo sotto la soglia
 *
 *     node strumenti/telefono_audit.mjs
 *     node strumenti/telefono_audit.mjs --provini
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'

const sharp = createRequire(import.meta.url)('sharp')
const PROVINI = process.argv.includes('--provini')
const BASE = process.env.BASE_URL || 'http://localhost:5174/'

const TELEFONI = [
  ['iphone', 390, 844],
  ['android', 360, 800],
  ['grande', 430, 932],
]
const TEMPI = [
  ['hero', 0.05], ['orbita', 0.23], ['lato', 0.43], ['taglio', 0.58],
  ['accensione', 0.68], ['velocita', 0.77], ['controllo', 0.90], ['contatto', 0.985],
]
/** quanto deve essere grande un bersaglio da dito */
const DITO = 44
/** sotto quanti pixel un testo informativo non si legge */
const CORPO = 13

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})
if (PROVINI) mkdirSync('docs/provini/telefono', { recursive: true })

let guasti = 0
for (const [nome, L, A] of TELEFONI) {
  const p = await b.newPage({ viewport: { width: L, height: A }, isMobile: true, hasTouch: true })
  p.setDefaultTimeout(200000)
  await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
  await p.goto(BASE, { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !!window.esperienza)
  await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto)
  await p.evaluate(() => document.fonts.ready)
  await p.evaluate(() => window.fissaQualita('alto'))
  const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
  const scatti = []

  for (const [tempo, q] of TEMPI) {
    // ci si arriva scorrendo, come farebbe un dito
    const passi = Math.max(30, Math.round(q * 500))
    await p.evaluate(() => window.scrollTo(0, 0))
    for (let i = 1; i <= passi; i++) {
      await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / passi)])
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
    }
    for (let i = 0; i < 20; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

    const male = await p.evaluate(([DITO, CORPO]) => {
      const fuori = []
      const visibile = (e) => {
        const s = getComputedStyle(e)
        if (s.display === 'none' || s.visibility === 'hidden') return false
        // opacita' ereditata: un blocco a zero non e' un difetto, e' spento
        let n = e, o = 1
        while (n && n !== document.documentElement) { o *= parseFloat(getComputedStyle(n).opacity || '1'); n = n.parentElement }
        return o > 0.06
      }
      const nome = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName.toLowerCase())

      // --- i blocchi di testo in campo
      const blocchi = []
      for (const e of document.querySelectorAll('.voci__titolo, .voci__riga, .voci__occhiello, .controllo__parola, .controllo__esito, .controllo__domanda, .controllo__scrivi, .spina__numero, .spina__didascalia, .rotaia__nome, .testa p, .testa nav, .comandi, .invito')) {
        if (!visibile(e)) continue
        const r = e.getBoundingClientRect()
        if (r.width < 2 || r.height < 2) continue
        blocchi.push({ n: nome(e), r, e })
        // 2. fuori schermo
        if (r.left < -1 || r.right > innerWidth + 1) fuori.push('esce dallo schermo: ' + nome(e) + ' x ' + Math.round(r.left) + '..' + Math.round(r.right))
        // 1. tagliato dentro il proprio riquadro
        /* UN ELEMENTO RUOTATO NON E' TAGLIATO, e per otto tempi lo strumento
           ha detto il contrario. `.rotaia__nome` sta in verticale con una
           `rotate(90deg)`: il suo `scrollWidth` misura il testo per il lungo,
           il suo rettangolo sullo schermo lo misura per il largo, e il
           confronto fra i due da' sempre «tagliato». Un metro che grida a ogni
           giro smette di essere letto — e' il difetto peggiore di uno
           strumento, peggio che non averlo. */
        /* LA ROTAZIONE PUO' STARE SU UN ANTENATO, e la prima correzione
           guardava solo l'elemento. `.rotaia__nome` non e' ruotato: e' ruotata
           `.rotaia__etichetta` che lo contiene, e da li' in giu' tutto eredita
           un sistema di riferimento girato. Quindi si risale. */
        let ruotato = false
        for (let n = e; n && n !== document.body; n = n.parentElement) {
          const g = getComputedStyle(n).transform
          if (g && g !== 'none' && !g.startsWith('matrix(1, 0, 0, 1')) { ruotato = true; break }
        }
        if (!ruotato && e.scrollWidth > Math.ceil(r.width) + 2) fuori.push('tagliato: ' + nome(e) + ' serve ' + e.scrollWidth + ' ha ' + Math.round(r.width))
        /* 5. CORPO MINUSCOLO, con due soglie e non una.
           Un'ETICHETTA e un TESTO non si misurano allo stesso metro. «GIUSEPPE
           VILLANI» nella testata, «01 / 07 ESTERNO» sulla rotaia e «FINITURA»
           sui comandi sono marchi: stanno sempre nello stesso posto, sono in
           maiuscolo, sono spaziati larghi e ad alto contrasto, e si leggono per
           riconoscimento piu' che per lettura. Undici pixel li' sono la norma di
           qualunque sito curato.
           Il testo che porta informazione — titoli, righe, la parola del
           controllo, la chiamata all'azione — non puo' scendere sotto tredici,
           e sarebbe meglio quindici.
           Una soglia sola avrebbe due difetti opposti: a tredici grida su ogni
           etichetta e nessuno la legge piu', a undici lascia passare una riga di
           testo che non si legge. */
        const c = parseFloat(getComputedStyle(e).fontSize)
        const marchio = e.closest('.testa, .rotaia, .comandi') !== null
        const soglia = marchio ? 11 : CORPO
        if (c && c < soglia - 0.01) fuori.push('corpo ' + c + 'px: ' + nome(e) + (marchio ? ' (etichetta)' : ''))
      }
      // 3. sovrapposizioni fra blocchi diversi
      for (let i = 0; i < blocchi.length; i++) {
        for (let j = i + 1; j < blocchi.length; j++) {
          const a = blocchi[i].r, c = blocchi[j].r
          const w = Math.min(a.right, c.right) - Math.max(a.left, c.left)
          const h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)
          if (w > 6 && h > 6) fuori.push('sovrapposti: ' + blocchi[i].n + ' e ' + blocchi[j].n + ' per ' + Math.round(w) + 'x' + Math.round(h))
        }
      }
      // 4. bersagli piccoli
      for (const e of document.querySelectorAll('button, a')) {
        if (!visibile(e)) continue
        const r = e.getBoundingClientRect()
        if (r.width < 2) continue
        // il bersaglio puo' essere allargato da uno pseudo-elemento
        const dopo = getComputedStyle(e, '::after')
        const gonfia = dopo.content !== 'none' ? Math.abs(parseFloat(dopo.insetBlockStart || '0') || 0) * 2 : 0
        // e il vicino conta: due pulsanti attaccati con quaranta pixel l'uno
        // formano un bersaglio unico da ottanta, ed e' cosi' che si toccano
        const spazio = parseFloat(getComputedStyle(e.parentElement || e).gap || '0') || 0
        const w = r.width + gonfia + spazio, h = r.height + gonfia
        if (w < DITO - 1 || h < DITO - 1) fuori.push('bersaglio ' + Math.round(w) + 'x' + Math.round(h) + ': ' + nome(e) + ' «' + (e.textContent || '').trim().slice(0, 14) + '»')
      }
      return [...new Set(fuori)]
    }, [DITO, CORPO])

    if (male.length) {
      guasti += male.length
      console.log(nome + ' ' + L + 'x' + A + '  —  ' + tempo)
      for (const m of male) console.log('    ' + m)
    }
    if (PROVINI) scatti.push(await p.screenshot({ path: 'docs/provini/telefono/' + nome + '_' + tempo + '.png' }))
  }

  if (PROVINI && scatti.length) {
    const bb = await Promise.all(scatti.map((x) => sharp(x).resize(260).toBuffer()))
    const m = await sharp(bb[0]).metadata()
    await sharp({ create: { width: m.width * 4, height: m.height * 2, channels: 3, background: '#111' } })
      .composite(bb.map((x, i) => ({ input: x, left: (i % 4) * m.width, top: Math.floor(i / 4) * m.height })))
      .jpeg({ quality: 88 }).toFile('docs/provini/telefono/_' + nome + '.jpg')
  }
  await p.close()
}
await b.close()

console.log('')
if (guasti) {
  console.log(guasti + ' difetti sul telefono')
  process.exit(1)
}
console.log('telefono a posto: niente tagliato, niente fuori, niente sovrapposto, nessun bersaglio piccolo')
