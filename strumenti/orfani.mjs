/**
 * GLI ORFANI — i file di `public/` che nessuno nomina.
 *
 * PERCHE' ESISTE.
 *
 * `public/` non passa dal build: Vite lo copia dentro `dist/` cosi' com'e', per
 * intero, senza guardare se qualcuno ne usi il contenuto. E' la scelta giusta
 * per un file che serve a un indirizzo fisso — un poster, un favicon — ed e'
 * anche il posto dove le cose che non servono piu' restano per sempre.
 *
 * Qui dentro c'erano sette megabyte di roba morta: tre marmi in JPEG da 3,0,
 * 1,8 e 0,7 MB, piu' `cemento_*`, `intonaco_*`, `pietra_*` — tutte tessiture
 * della corte costruita, che e' stata sostituita da una fotografia a 360 gradi
 * mesi fa. Nessuno le scarica, quindi non fanno male a chi guarda; ma sono meta'
 * del peso del pacchetto pubblicato, e chiunque apra il repository o guardi il
 * deploy le vede.
 *
 * COME LO DECIDE.
 *
 * Cerca il nome di ogni file dentro `src/`, `index.html`, `strumenti/` e
 * `*.md`. Cerca il nome COMPLETO e anche il solo gambo, perche' su questo
 * progetto piu' di un percorso si compone a pezzi — `'/texture/asfalto_' + tipo
 * + '.webp'` — e cercare solo la stringa intera darebbe tre falsi orfani.
 *
 * Un falso positivo qui costa un file cancellato che serviva: quindi in dubbio
 * NON e' orfano, e la lista si legge prima di eseguire.
 *
 *     node strumenti/orfani.mjs           elenca
 *     node strumenti/orfani.mjs --pesa    elenca con i pesi e il totale
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

const PESA = process.argv.includes('--pesa')

/** dove si cerca: tutto quello che puo' nominare un file */
const FONTI = ['src', 'strumenti', 'index.html', 'COSTRUZIONE.md']

function tutti(dove, dentro = []) {
  for (const n of readdirSync(dove)) {
    const f = join(dove, n)
    if (statSync(f).isDirectory()) tutti(f, dentro)
    else dentro.push(f)
  }
  return dentro
}

let testo = ''
for (const f of FONTI) {
  try {
    if (statSync(f).isDirectory()) {
      for (const x of tutti(f)) testo += readFileSync(x, 'utf8')
    } else testo += readFileSync(f, 'utf8')
  } catch { /* una fonte che non c'e' non e' un errore */ }
}

const orfani = []
for (const f of tutti('public')) {
  const nome = basename(f)
  // il gambo: il nome senza estensione e senza l'ultimo pezzo dopo l'underscore
  // (`asfalto_col.webp` -> `asfalto_col` e `asfalto`), perche' i percorsi
  // composti a pezzi non contengono mai il nome intero
  const senza = nome.slice(0, nome.length - extname(nome).length)
  const gambo = senza.includes('_') ? senza.slice(0, senza.lastIndexOf('_')) : senza
  if (testo.includes(nome) || testo.includes(senza) || testo.includes(gambo)) continue
  orfani.push({ f: f.replace(/\\/g, '/'), kb: Math.round(statSync(f).size / 1024) })
}

if (!orfani.length) {
  console.log('nessun orfano: ogni file di public/ e\' nominato da qualcuno')
  process.exit(0)
}

orfani.sort((a, b) => b.kb - a.kb)
let totale = 0
for (const o of orfani) {
  totale += o.kb
  console.log(PESA ? String(o.kb).padStart(7) + ' kB  ' + o.f : o.f)
}
console.log('')
console.log(orfani.length + ' file, ' + (totale / 1024).toFixed(1) + ' MB che nessun sorgente nomina')
console.log('leggi la lista PRIMA di cancellare: un percorso composto a pezzi puo\' sfuggire')
