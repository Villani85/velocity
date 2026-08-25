/** APICI INVERSI DENTRO IL GLSL — il cancello di un errore che ho fatto tre
 *  volte in una sessione, dopo averlo gia' scritto nelle mie note.
 *
 *  Gli shader di questo progetto sono innestati con sostituzioni di stringa su
 *  template literal. Un apice inverso dentro un COMMENTO GLSL chiude il
 *  literal: il modulo smette di compilare, e l'errore esce a una riga che non
 *  c'entra niente con quella scritta. Costa ogni volta lo stesso quarto d'ora,
 *  perche' il sintomo non assomiglia alla causa.
 *
 *  Qui si scorrono i sorgenti, si isola cio' che sta dentro i literal che
 *  contengono GLSL, e si segnala ogni apice inverso che ci sia finito dentro.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const file = []
const cerca = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) cerca(p)
    else if (n.endsWith('.ts')) file.push(p)
  }
}
cerca('src')

let guai = 0
for (const f of file) {
  const t = readFileSync(f, 'utf8')
  // i literal che contengono un innesto GLSL: cominciano con #include o con
  // una dichiarazione di shader
  const re = /`(#include[\s\S]*?)`/g
  let m
  while ((m = re.exec(t)) !== null) {
    // il literal e' gia' terminato dal primo apice inverso, quindi il segnale
    // non e' un apice DENTRO: e' che il pezzo catturato finisca dove non deve.
    // Si guarda cio' che segue: un literal GLSL sano finisce con `)` o `,`
    const dopo = t.slice(m.index + m[0].length, m.index + m[0].length + 3)
    if (!/^\s*[),;]/.test(dopo)) {
      const riga = t.slice(0, m.index + m[0].length).split('\n').length
      console.log('  ' + f + ':' + riga + '  il literal GLSL finisce dove non dovrebbe')
      console.log('    prosegue con: ' + JSON.stringify(dopo))
      guai++
    }
  }
}
console.log(guai ? '\n  ' + guai + ' punti da guardare.' : '  nessun apice inverso dentro il GLSL.')
process.exit(guai ? 1 : 0)
