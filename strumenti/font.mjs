/**
 * I CARATTERI IN LOCALE, DA UNA FONDERIA INDIPENDENTE.
 *
 * DUE DIFETTI, IN DUE GIRI.
 *
 * Il primo: `index.html` caricava Inter da `fonts.googleapis.com`. Il sito
 * mostrava davvero Arial per un istante e poi saltava, servivano due
 * connessioni nuove su due domini prima che si vedesse una lettera, e un sito
 * senza nessun altro servizio di terzi ne aveva uno proprio sulla cosa che si
 * guarda per prima. Risolto portandolo in casa.
 *
 * Il secondo, piu' importante, e' arrivato da una revisione: «nessun carattere
 * caratterizzante, nessun sistema tipografico — e' il segnale piu' veloce che
 * un giurato usa per separare un professionista da un dilettante».
 *
 * Inter e' un carattere ottimo e non caratterizza. E' stato disegnato per
 * essere invisibile nelle interfacce, ci riesce benissimo, e su un sito il cui
 * argomento e' il craft l'invisibilita' e' esattamente cio' che non serve.
 *
 * LA SCELTA: DUE FACCE, UNA FONDERIA SOLA.
 *
 * `Clash Display` e `Switzer`, tutte e due della Indian Type Foundry, libere
 * per uso commerciale e servite da Fontshare. Vengono dalla stessa mano e dalla
 * stessa idea di grotesk, quindi non e' un accostamento: e' una famiglia.
 *
 *   Clash Display   solo i titoli. Ha un carattere netto — le aste tagliate
 *                   dritte, le contro-forme strette — e a corpo grande
 *                   diventa un'insegna. A corpo piccolo sarebbe illeggibile,
 *                   ed e' il motivo per cui fa un mestiere solo.
 *   Switzer         tutto il resto: righe, etichette, menu, cruscotto,
 *                   credenziali. Neo-grotesk con i numeri tabulari, che
 *                   servono davvero — un tachimetro con le cifre di larghezza
 *                   diversa balla a ogni aggiornamento.
 *
 * E IL MONOSPAZIO SPARISCE. La stessa revisione nota che «la dashboard usa un
 * font tecnico completamente diverso che non dialoga con nient'altro», ed e'
 * vero: un monospazio in mezzo a un grotesk e' una terza voce. Switzer in
 * maiuscolo, spaziato largo e con le cifre tabulari fa lo stesso mestiere —
 * dice «strumento» — parlando la lingua del resto della pagina.
 *
 *     node strumenti/font.mjs
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs'

const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

/** quali facce e quali pesi: pochi, e ognuno con un mestiere */
const VOLUTI = [
  ['clash-display', ['500', '600']],
  ['switzer', ['400', '500', '600', '700']],
]

mkdirSync('public/font', { recursive: true })

let totale = 0
const regole = []
for (const [faccia, pesi] of VOLUTI) {
  const css = await (await fetch(
    'https://api.fontshare.com/v2/css?f[]=' + faccia + '@' + pesi.join(','),
    { headers: { 'User-Agent': AGENTE } },
  )).text()

  /* SI LEGGE IL BLOCCO, non il nome del file: Fontshare serve i file con nomi
     numerati e l'unico modo di sapere quale peso e' quale e' la regola. */
  for (const b of css.split('@font-face').slice(1)) {
    /* GLI INDIRIZZI SONO SENZA PROTOCOLLO — `//cdn.fontshare.com/...` — ed e'
       la ragione per cui il primo giro ha scaricato zero file senza dire
       niente: cercavo `https:` e non c'era. Peggio: prima di scaricare
       cancellavo i vecchi, quindi il sito e' rimasto per un minuto senza
       nessun carattere. Un'operazione che cancella prima di aver verificato di
       poter sostituire e' scritta nell'ordine sbagliato — vedi la riga in
       fondo, dove adesso si cancella solo a scaricamento riuscito. */
    const grezzo = /url\(['"]?((?:https:)?\/\/[^)'"]+\.woff2)/.exec(b)?.[1]
    const url = grezzo ? (grezzo.startsWith('//') ? 'https:' + grezzo : grezzo) : undefined
    const famiglia = /font-family:\s*['"]([^'"]+)['"]/.exec(b)?.[1]
    const peso = /font-weight:\s*(\d+)/.exec(b)?.[1]
    const stile = /font-style:\s*(\w+)/.exec(b)?.[1] ?? 'normal'
    // NIENTE CORSIVO: su questo sito non c'e' un solo corsivo, e portarselo in
    // casa vorrebbe dire raddoppiare il peso per non usarlo mai
    if (!url || !famiglia || !peso || stile !== 'normal') continue
    if (!pesi.includes(peso)) continue

    const file = faccia + '-' + peso + '.woff2'
    if (!existsSync('public/font/' + file)) {
      const dati = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': AGENTE } })).arrayBuffer())
      writeFileSync('public/font/' + file, dati)
      totale += dati.length
      console.log(file.padEnd(24), Math.round(dati.length / 1024) + ' kB')
    }
    regole.push({ famiglia, peso, file })
  }
}

/* E SOLO ADESSO si cancellano i vecchi: se il download fallisce, il sito resta
   con i caratteri che aveva. Cancellare prima e' l'ordine che mi ha lasciato
   `public/font/` vuoto al primo tentativo. */
if (regole.length >= 4) {
  for (const f of readdirSync('public/font')) {
    if (f.startsWith('inter-') || f.startsWith('jetbrains')) unlinkSync('public/font/' + f)
  }
} else {
  console.log('scaricati troppo pochi file: i vecchi restano dove sono')
}

console.log('')
console.log((totale / 1024).toFixed(0) + ' kB in tutto')
console.log('')
for (const r of regole) {
  console.log("@font-face { font-family: '" + r.famiglia + "'; font-style: normal; font-weight: " +
    r.peso + "; font-display: swap; src: url('/font/" + r.file + "') format('woff2'); }")
}
