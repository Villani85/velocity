/**
 * IL BANCO DI PROVA — rendere due volte lo stesso fotogramma.
 *
 * PERCHE' ESISTE, e non e' un pannello da sviluppatore.
 *
 * In una giornata sola ho preso quattro decisioni sbagliate perche' stavo
 * confrontando due immagini che NON erano confrontabili:
 *
 *   - la velocita' di scorrimento decade appena si smette di scorrere, quindi
 *     due provini «allo stesso punto» avevano due andature diverse e il
 *     tachimetro segnava nove chilometri all'ora;
 *   - la vibrazione della camera e la grana della pellicola sono fatte con
 *     `Math.random()`, quindi due rese identiche differiscono comunque;
 *   - l'orologio del quadro mostra l'ora vera, quindi ogni provino ha una
 *     cifra diversa in mezzo allo schermo;
 *   - il gestore della qualita' si adatta al carico della macchina, quindi la
 *     stessa pagina rende con impostazioni diverse a seconda di cosa sta
 *     girando accanto. Ho attribuito a un difetto della scena quarantasette
 *     programmi shader che a macchina scarica erano due.
 *
 * Un banco che toglie queste quattro cose non e' una comodita': e' la
 * differenza fra misurare il sito e misurare il rumore.
 *
 * COME SI ACCENDE
 *
 *   ?qa=1              qualita' alta e ferma, niente rumore casuale, orologio
 *                      congelato
 *   ?ridotto=1         forza `prefers-reduced-motion` acceso
 *   ?ridotto=0         lo forza spento anche se il sistema lo chiede
 *   ?bloom=0           spegne il bagliore, per giudicare la vernice senza post
 *
 * PERCHE' `ridotto` E' SEPARATO DA `qa`. Perche' sono due domande diverse. Il
 * banco chiede «rendimi due volte la stessa cosa»; la preferenza chiede «fammi
 * vedere il sito come lo vede chi ha spento le animazioni». Legarle vorrebbe
 * dire non poter piu' misurare la seconda — ed e' esattamente il buco in cui e'
 * vissuto per settimane il difetto della strada ferma: nessuno strumento
 * accendeva quella preferenza, quindi meta' del mondo non l'ha mai vista
 * nessuno.
 *
 * PERCHE' NON SI SPEGNE IL MOVIMENTO INVECE DI CONGELARE IL RUMORE. Perche'
 * il movimento E' il soggetto. Un banco che ferma la scena misura una
 * fotografia di un sito che si attraversa: toglie il rumore e con lui la cosa
 * da giudicare. Qui si toglie soltanto cio' che cambia SENZA che nessuno lo
 * abbia chiesto.
 */

/* LA GUARDIA E' PER GLI STRUMENTI, non per il browser. Alcuni banchi importano
   pezzi di questo progetto dentro Node, dove `location` non esiste: senza,
   morirebbero qui e con un messaggio che non parla di banchi di prova. E' la
   stessa ragione per cui `core/Moto.ts` protegge `matchMedia`. */
function query(): URLSearchParams {
  try {
    if (typeof location === 'undefined') return new URLSearchParams()
    return new URLSearchParams(location.search)
  } catch {
    return new URLSearchParams()
  }
}

const Q = query()

/** il banco e' acceso: si rende due volte la stessa cosa */
export const QA = Q.get('qa') === '1'

/**
 * la preferenza del movimento ridotto, forzata da fuori.
 * `null` vuol dire «non forzata»: decide il sistema operativo.
 */
export const RIDOTTO_FORZATO: boolean | null =
  Q.get('ridotto') === '1' ? true : Q.get('ridotto') === '0' ? false : null

/** il bagliore si puo' spegnere: una vernice che senza post sembra plastica,
 *  con il post diventa plastica luminosa */
export const BLOOM = Q.get('bloom') !== '0'

/**
 * FERMO — la somma delle due ragioni per cui una cosa non deve muoversi.
 *
 * Il rumore casuale, la grana e l'orologio erano gia' tutti agganciati a
 * `RIDOTTO`, e la cosa non e' un caso: sono esattamente le cose che si muovono
 * senza che nessuno le abbia chieste. Il banco vuole spegnere le stesse, per
 * un'altra ragione. Quindi non si duplica la logica: si somma un secondo
 * motivo a quello che c'e' gia'.
 *
 * Si legge cosi', nei punti che gia' guardavano la preferenza:
 *     const s = fermo(RIDOTTO) ? 0 : ...
 */
export function fermo(ridotto: boolean): boolean {
  return ridotto || QA
}

/** che cosa e' acceso, in una riga, per finire nei provini e nei diari */
export function descriviBanco(): string {
  if (!QA && RIDOTTO_FORZATO === null && BLOOM) return 'banco spento'
  return [
    QA ? 'qa' : '',
    RIDOTTO_FORZATO === true ? 'ridotto' : RIDOTTO_FORZATO === false ? 'non-ridotto' : '',
    BLOOM ? '' : 'senza-bloom',
  ].filter(Boolean).join(' + ')
}
