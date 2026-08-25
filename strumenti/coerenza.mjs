/** COERENZA — che i documenti non dicano cose che il codice smentisce.
 *
 *  `public/llms.txt` e' un file statico: non lo genera nessuno, quindi nessuno
 *  si accorge quando invecchia. E aveva invecchiato male. Diceva:
 *
 *    «Lavori: un progetto solo, VELOCITY»          → erano DIECI
 *    «l'indirizzo e' da definire, e finche' non
 *     c'e' il sito non ne mostra uno finto»        → l'indirizzo c'era da tempo
 *    «dentro una corte al crepuscolo»              → e' una villa, e la corte
 *                                                    e' una delle quattro viste
 *
 *  Tre affermazioni su tre sbagliate, in un file scritto apposta perche' un
 *  modello linguistico capisca il progetto. Un documento che mente e' peggio di
 *  un documento che manca: chi lo legge non ha modo di sapere che e' vecchio.
 *
 *  PERCHE' UN CANCELLO E NON UNA RILETTURA. Rileggerlo e' quello che non e'
 *  successo per settimane. Il file e' invecchiato perche' NESSUNO LO
 *  CONTROLLAVA, e la cura per «nessuno lo controllava» non e' «adesso lo
 *  ricontrollo»: e' qualcosa che lo controlla da solo a ogni giro.
 *
 *  Qui si confrontano le affermazioni con la loro sorgente nel codice. Non
 *  tutte — solo quelle che sono NUMERI o NOMI, cioe' quelle che possono
 *  divergere in silenzio. Il resto e' prosa e resta responsabilita' di chi
 *  scrive.
 */
import { readFileSync } from 'node:fs'

const doc = readFileSync('public/llms.txt', 'utf8')
const lavori = readFileSync('src/ui/Lavori.ts', 'utf8')
const contatto = readFileSync('src/ui/Contatto.ts', 'utf8')
const comandi = readFileSync('src/ui/Comandi.ts', 'utf8')
const lingua = readFileSync('src/ui/Lingua.ts', 'utf8')

const guai = []
const bene = []

/* QUANTI LAVORI. Si contano i `codice:` in `Lavori.ts`, che e' l'unico posto in
   cui esistono, e si pretende che il documento dica quel numero — a lettere o in
   cifre, perche' in italiano si scrive in tutti e due i modi e non spetta a un
   cancello decidere lo stile. */
const NUMERI = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette',
  'otto', 'nove', 'dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici',
  'sedici', 'diciassette', 'diciotto', 'diciannove', 'venti']
const quanti = (lavori.match(/codice: '/g) || []).length
if (quanti === 0) {
  guai.push('non riesco a contare i lavori in Lavori.ts: e cambiato il modo di scriverli')
} else {
  const aLettere = NUMERI[quanti]
  const dice = new RegExp('(\\b' + quanti + '\\b|\\b' + aLettere + '\\b)\\s+lavori', 'i').test(doc)
  if (dice) bene.push('llms.txt dice il numero giusto di lavori (' + quanti + ')')
  else guai.push('llms.txt non dice che i lavori sono ' + quanti +
    ' — cercavo "' + quanti + ' lavori" oppure "' + aLettere + ' lavori"')
}

/* L'INDIRIZZO. Due difetti opposti, e tutti e due gravi:
   - il documento dice che non c'e' mentre c'e' (era il caso vero)
   - il documento ne pubblica uno mentre il codice non ne ha (peggio: e' un
     indirizzo inventato che finisce in pasto a un modello linguistico) */
const m = contatto.match(/export const INDIRIZZO = '([^']*)'/)
const indirizzo = m ? m[1].trim() : ''
const nega = /indirizzo e' da definire|indirizzo da definire/i.test(doc)
if (indirizzo) {
  if (nega) guai.push('llms.txt dice che l indirizzo e da definire, ma Contatto.ts ne ha uno: ' + indirizzo)
  else if (!doc.includes(indirizzo)) guai.push('llms.txt non riporta l indirizzo vero (' + indirizzo + ')')
  else bene.push('llms.txt riporta l indirizzo vero')
} else {
  const finto = doc.match(/[\w.+-]+@[\w.-]+\.\w+/)
  if (finto) guai.push('llms.txt pubblica un indirizzo (' + finto[0] + ') che il codice NON ha')
  else bene.push('nessun indirizzo nel codice, nessuno nel documento')
}

/* I NOMI DELLE VISTE. Stanno in `Comandi.ts` come chiavi di traduzione e i loro
   testi in `Lingua.ts`. Se qualcuno ne aggiunge una o la rinomina, il documento
   resta indietro senza che niente lo dica. */
const chiavi = [...comandi.matchAll(/t\('(vista\w+)'\)/g)].map((k) => k[1])
if (!chiavi.length) {
  guai.push('non riesco a leggere le viste da Comandi.ts')
} else {
  const mancanti = []
  for (const k of chiavi) {
    const v = lingua.match(new RegExp(k + ":\\s*\\{\\s*it:\\s*'([^']*)'"))
    if (!v) { mancanti.push(k + ' (non ha testo in Lingua.ts)'); continue }
    if (!doc.toLowerCase().includes(v[1].toLowerCase())) mancanti.push(v[1].toLowerCase())
  }
  if (mancanti.length) guai.push('llms.txt non nomina queste viste: ' + mancanti.join(', '))
  else bene.push('llms.txt nomina tutte e ' + chiavi.length + ' le viste')
}

console.log('')
for (const b of bene) console.log('  ok   ' + b)
for (const g of guai) console.log('  NO   ' + g)
console.log('')
console.log(guai.length
  ? '  ' + guai.length + ' affermazioni che il codice smentisce.'
  : '  i documenti dicono quello che il codice fa.')
process.exit(guai.length ? 1 : 0)
