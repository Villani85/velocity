/**
 * LA REGIA — quali beat esistono e dove cadono.
 *
 * I confini stanno in un posto solo. Non e' pedanteria: nel progetto
 * precedente le scene decidevano ognuna per conto proprio dove cominciare,
 * e il risultato era che ai confini l'oggetto SALTAVA — perche' la scena
 * nuova ricalcolava una posa che la precedente aveva gia' portato
 * altrove. Un elenco unico rende impossibile quell'errore.
 *
 * `locale` e' il progresso DENTRO il beat, da 0 a 1. E' quello che le scene
 * usano: cosi' una scena non sa nulla di dove sta nel percorso, e spostare
 * un confine non richiede di riscrivere niente.
 */
export type Beat =
  | 'hero'      // la macchina ferma nella dimora
  | 'orbita'    // la camera le gira intorno
  | 'lato'      // scende verso il lato guida
  | 'taglio'    // il montante attraversa l'obiettivo
  | 'accensione'
  | 'velocita'
  | 'contatto'  // la strada si appiattisce e diventa il contatto

/** dove finisce ogni beat, in progresso globale */
/**
 * I CONFINI, e perche' il settimo si e' ricavato SOLO dall'ultimo.
 *
 * Aggiungere un beat sembra un'operazione innocua: si riscala tutto e si fa
 * spazio. Non lo e', e la ragione sta in `scene/Accensione.ts`, che usa
 * `tratto(0.775, 0.815)` e altri tre intervalli scritti in progresso GLOBALE.
 * Sono numeri tarati guardando l'autotest del quadro accendersi; riscalando i
 * confini si sarebbero trovati a cavallo di beat diversi e la sequenza
 * d'accensione si sarebbe scomposta — in un punto lontano da dove avrei
 * cercato.
 *
 * Quindi i primi cinque confini sono rimasti IDENTICI e il nuovo si e'
 * ricavato tagliando `velocita`, che era l'unico beat lungo un settimo del
 * percorso e con dentro una cosa sola. La corsa sale da 700 a 850 schermate
 * per restituirgli parte di quello che gli si e' tolto.
 *
 * E' la stessa disciplina del commento qui sopra, applicata a se stessa: un
 * elenco unico rende impossibile che due scene litighino su un confine, ma non
 * protegge da chi scrive numeri assoluti altrove.
 *
 * POI I NUMERI ASSOLUTI SONO STATI SPOSTATI LO STESSO, e valeva la pena.
 *
 * Il settimo beat aveva il sette per cento della corsa: cinquantanove
 * schermate su ottocentocinquanta. Dentro ci sono nove atti — la pattuglia che
 * arriva, sorpassa, taglia la strada, la parola, la scheda dei lavori, lo
 * scanner, l'esito, l'invito, il congedo — e in cinquantanove schermate durano
 * un paio di secondi. Il committente l'ha detto in cinque parole: «e' troppo
 * veloce, non si capisce niente».
 *
 * Non era un problema di curve o di soglie: era che il racconto non aveva
 * abbastanza spazio in cui succedere. Quindi si e' riscalato tutto — i sette
 * confini e i quattro intervalli assoluti di `scene/Accensione.ts`, che sono
 * gli unici numeri globali scritti fuori da qui — e il beat del contatto e'
 * passato dal 7 al 18,5 per cento.
 *
 * Con la corsa a mille schermate ogni altro beat resta lungo quanto prima, a
 * qualche schermata di scarto: il tempo in piu' e' tutto in coda, dov'era
 * l'unico posto che ne aveva bisogno.
 */
export const CONFINI: Array<[Beat, number]> = [
  ['hero', 0.13],
  ['orbita', 0.34],
  ['lato', 0.53],
  ['taglio', 0.645],
  ['accensione', 0.725],
  ['velocita', 0.815],
  ['contatto', 1.00],
]

export class Regia {
  beat: Beat = 'hero'
  locale = 0
  globale = 0

  aggiorna(globale: number) {
    this.globale = globale
    let inizio = 0
    for (const [beat, fine] of CONFINI) {
      if (globale <= fine || fine === 1) {
        this.beat = beat
        this.locale = fine > inizio ? (globale - inizio) / (fine - inizio) : 0
        this.locale = Math.min(Math.max(this.locale, 0), 1)
        return
      }
      inizio = fine
    }
  }

  /** progresso 0..1 su un intervallo globale qualsiasi, per le cose che
   *  attraversano piu' beat (l'ambiente, la luce, il suono) */
  tratto(da: number, a: number) {
    return Math.min(Math.max((this.globale - da) / (a - da), 0), 1)
  }
}

/** accelerazione e decelerazione morbide: il movimento di una camera, non
 *  di un cursore */
export function morbido(t: number) {
  return t * t * (3 - 2 * t)
}

export function mescola(a: number, b: number, t: number) {
  return a + (b - a) * t
}
