/** PROPOSTA — mette una cura in corsia B senza applicarla.
 *
 *  Di notte non posso chiedere a nessuno di guardare un provino, e tre miei
 *  cancelli su cinque oggi erano ciechi. Quindi tutto cio' che dipende
 *  dall'occhio non si spedisce: si PREPARA. La cura si scrive, si rende il
 *  dopo, si estrae il diff, e l'albero torna com'era.
 *
 *  PERCHE' UNO STRUMENTO E NON TRE COMANDI A MANO. Perche' il passo che conta
 *  e' l'ULTIMO — riportare indietro l'albero — ed e' quello che si dimentica
 *  quando sono le quattro del mattino e la cura successiva sembra piu'
 *  interessante. Se non si torna indietro, la patch dopo contiene anche questa,
 *  e da quel momento nessuna delle due si applica piu' da sola. Non e' un
 *  fastidio: e' la perdita silenziosa di tutto il lavoro della corsia B, e non
 *  se ne accorge nessuno fino alla mattina.
 *
 *  E LA SICUREZZA E' TUTTA IN UN CONTROLLO: prima di buttare via le modifiche
 *  si verifica che la patch appena scritta si RIAPPLICHI davvero, con
 *  `git apply --check`. Se non passa, l'albero non si tocca e lo strumento
 *  esce rosso. Meglio una proposta non archiviata che una cura persa.
 *
 *  node strumenti/proposta.mjs <nome-in-parole-con-trattini> ["riga di titolo"]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const nome = (process.argv[2] || '').trim()
const titolo = (process.argv[3] || '').trim()
if (!/^[a-z0-9][a-z0-9-]*$/.test(nome)) {
  console.log('  serve un nome in minuscolo con trattini, per esempio: faro-fuga-ghiera')
  process.exit(1)
}

/* NIENTE DI GIA' IN SCENA. Se qualcosa e' gia' nell'area di sosta, il diff del
   lavoro non e' quello che credo: la meta' e' li' e la meta' no, e la patch
   esce monca. Si pretende un'area pulita invece di indovinare. */
const inScena = git('diff', '--cached', '--name-only').trim()
if (inScena) {
  console.log('  ci sono modifiche gia in scena, e la patch uscirebbe monca:')
  for (const f of inScena.split('\n')) console.log('    ' + f)
  console.log('  falle uscire con `git restore --staged .` oppure committale.')
  process.exit(1)
}

const tocchi = git('diff', '--name-only').trim()
if (!tocchi) {
  console.log('  non c e niente da proporre: l albero e pulito.')
  process.exit(1)
}
const file = tocchi.split('\n')

/* IL NUMERO PROGRESSIVO viene dalla cartella, non da un contatore tenuto
   altrove: cosi' non esiste uno stato da tenere allineato, e riprendere dopo
   un'interruzione non richiede di ricordarsi niente. */
const base = 'docs/notte'
mkdirSync(base, { recursive: true })
const esistenti = readdirSync(base).filter((d) => /^\d{3}-/.test(d))
const n = String(esistenti.length + 1).padStart(3, '0')
const cartella = join(base, n + '-' + nome)
if (existsSync(cartella)) {
  console.log('  esiste gia: ' + cartella)
  process.exit(1)
}
mkdirSync(cartella, { recursive: true })

const patch = git('diff')
const dovePatch = join(cartella, 'patch')
writeFileSync(dovePatch, patch, 'utf8')

/* IL CONTROLLO CHE RENDE SICURO IL PASSO DOPO. `git apply --check --reverse`
   sull'albero ANCORA MODIFICATO dice se la patch descrive esattamente le
   modifiche presenti. Se lo dice, allora toglierle e riapplicarle riporta
   esattamente qui — e solo a quel punto si puo' buttare. */
try {
  execFileSync('git', ['apply', '--check', '--reverse', dovePatch], { stdio: 'pipe' })
} catch (e) {
  console.log('  LA PATCH NON DESCRIVE LE MODIFICHE PRESENTI: non tocco niente.')
  console.log('  ' + String(e.stderr || e.message).trim().split('\n')[0])
  console.log('  la patch resta in ' + dovePatch + ', l albero resta com e.')
  process.exit(1)
}

writeFileSync(join(cartella, 'perche.md'),
  '# ' + (titolo || nome.replace(/-/g, ' ')) + '\n\n' +
  '**Il difetto.** (che cosa si vede, e in quale tempo)\n\n' +
  '**La cura.** (che cosa cambia, e perche una cosa vera si comporta cosi)\n\n' +
  '**Che cosa NON dimostra.** (il limite di questa prova: e la parte che serve\n' +
  'davvero a chi deve dire si o no)\n\n' +
  '**File toccati**\n\n' + file.map((f) => '- `' + f + '`').join('\n') + '\n\n' +
  '**Per applicarla**\n\n```\ngit apply ' + dovePatch.replace(/\\/g, '/') + '\n```\n',
  'utf8')

// e adesso si torna indietro, che e' il passo che si dimentica
git('checkout', '--', ...file)

console.log('')
console.log('  proposta ' + n + ' archiviata in ' + cartella)
console.log('  file riportati indietro: ' + file.length)
for (const f of file) console.log('    ' + f)
console.log('')
console.log('  restano da mettere a mano: prima.jpeg, dopo.jpeg, e le tre voci di perche.md')
