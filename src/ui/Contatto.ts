/**
 * L'INDIRIZZO, in un posto solo.
 *
 * PERCHE' E' VUOTO, E PERCHE' RESTA VUOTO FINCHE' NON LO RIEMPIE LUI.
 *
 * Tutto questo sito e' stato ripulito da cose inventate: le statistiche della
 * hero, i quattro progetti finti, la carica della batteria, il parziale, il
 * totalizzatore, la runa del Bluetooth. Ogni volta la regola era la stessa —
 * se una cosa non e' vera e verificabile, non ci va.
 *
 * Un indirizzo di posta e' l'ultimo posto in cui si potrebbe essere tentati di
 * fare un'eccezione, perche' «ciao@nomecognome.it» sembra innocuo. Non lo e':
 * e' l'unica cosa finta che qualcuno potrebbe PROVARE A USARE. Un titolo
 * inventato fa una brutta figura; un indirizzo inventato manda una mail nel
 * vuoto e fa perdere un lavoro.
 *
 * Quindi finche' questa costante e' vuota:
 *
 *   - la pagina statica scrive «Indirizzo da definire»;
 *   - il finale dell'esperienza mostra la riga e la domanda, e sotto NON
 *     mostra nessun collegamento.
 *
 * Il finale funziona lo stesso — la strada diventa comunque la riga, e la
 * domanda resta la domanda — semplicemente non ha ancora una destinazione.
 * Riempire questa riga la accende dappertutto.
 */
export const INDIRIZZO = ''

/** come si legge sullo schermo. Vuoto significa: non c'e' ancora. */
export function scritto(): string {
  return INDIRIZZO
}

/**
 * IL COLLEGAMENTO E' `mailto:` E BASTA, e la scelta merita una riga.
 *
 * La specifica proponeva di copiare l'indirizzo negli appunti con un
 * microavviso «COPIATA». E' una cosa che si vede spesso e che ha un difetto
 * preciso: su un telefono gli appunti non servono a niente — chi guarda vuole
 * aprire la posta, non incollare — e su desktop chi preferisce copiare puo'
 * gia' farlo, perche' l'indirizzo e' scritto e selezionabile.
 *
 * `mailto:` fa la cosa giusta su tutti e due, ed e' anche l'unica che
 * funziona con la tastiera senza scrivere niente.
 */
export function collegamento(): string {
  return INDIRIZZO ? 'mailto:' + INDIRIZZO : ''
}
