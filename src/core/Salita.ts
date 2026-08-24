import type { Texture, WebGLRenderer } from 'three'

/**
 * LA SALITA SULLA SCHEDA — una coda di tessiture da caricare quando non
 * disturbano.
 *
 * IL DIFETTO, MISURATO. Una tessitura non sale sulla scheda video quando
 * arriva dalla rete: sale al PRIMO FOTOGRAMMA CHE LA DISEGNA. Su questo sito
 * le fotografie dei lavori arrivano apposta in ritardo — dieci file che
 * altrimenti ruberebbero banda al modello dell'automobile — quindi quel primo
 * fotogramma e' esattamente quello in cui il carosello entra in scena, o in cui
 * le tre insegne compaiono nella hero.
 *
 * `strumenti/amano.mjs`, che scorre a raffiche come una persona e distingue i
 * fotogrammi in movimento da quelli a pagina ferma, lo trovava sempre nello
 * stesso posto e sempre con la stessa annotazione:
 *
 *     1144 ms   hero       +1 programmi, +3 tessiture, +1 geometrie
 *      626 ms   contatto   +1 programmi, +3 tessiture, +1 geometrie
 *
 * Tre tessiture per volta, fra sei decimi e un secondo e due, in movimento.
 *
 * LA CURA SBAGLIATA, PROVATA PRIMA. Far disegnare l'oggetto in quattro pixel
 * appena tutte le sue fotografie sono arrivate — la stessa tecnica che sulla
 * fotografia dell'abitacolo funziona benissimo. Qui non cambia niente, e la
 * ragione e' aritmetica: una bandiera che si alza quando sono arrivate TUTTE
 * si alza dopo l'ultima, e le prime sono gia' salite nel frattempo. Non si puo'
 * arrivare prima di un evento aspettando che finisca.
 *
 * LA CURA GIUSTA. Ogni fotografia, appena e' pronta, mette la sua tessitura in
 * questa coda. Chi possiede il renderer ne smaltisce UNA per fotogramma, e solo
 * quando la pagina e' ferma: `initTexture` la carica sulla scheda senza
 * disegnare niente, quindi il costo si paga li' — in un istante in cui non si
 * muove nulla e nessuno lo sente — invece che nel fotogramma in cui serve.
 *
 * UNA PER FOTOGRAMMA, e non tutte insieme: dieci caricamenti nello stesso
 * istante sarebbero dieci stalli sommati, cioe' esattamente il difetto che
 * questa coda esiste per togliere, spostato di qualche secondo.
 *
 * E SE NESSUNO SI FERMA MAI, non succede niente di male: la coda resta piena e
 * le tessiture salgono quando servono, cioe' come facevano prima. Questa e' una
 * cura che puo' solo migliorare, mai peggiorare.
 */

const coda: Texture[] = []

/** mette una tessitura in fila per salire sulla scheda al primo momento buono */
export function inCoda(t: Texture) {
  if (!coda.includes(t)) coda.push(t)
}

/**
 * Ne carica una, se ce n'e'. Torna vero se ha lavorato, cosi' chi chiama sa che
 * quel fotogramma e' gia' stato speso e non ci mette dentro altro.
 */
export function smaltisci(renderer: WebGLRenderer): boolean {
  const t = coda.shift()
  if (!t) return false
  try {
    renderer.initTexture(t)
  } catch {
    /* se fallisce non succede niente di grave: la tessitura salira' quando
       verra' disegnata, cioe' come prima di questa coda */
  }
  return true
}

/** quante ne restano: serve solo agli strumenti di misura */
export function quanteInCoda(): number {
  return coda.length
}
