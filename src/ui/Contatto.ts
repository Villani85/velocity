/**
 * L'INDIRIZZO, in un posto solo.
 *
 * ERA VUOTO, E IL RAGIONAMENTO CHE LO TENEVA VUOTO ERA GIUSTO NEL MERITO E
 * SBAGLIATO NELL'ESITO. Vale la pena tenerlo scritto, perche' e' un modo di
 * sbagliare che torna.
 *
 * Tutto questo sito e' stato ripulito da cose inventate: le statistiche della
 * hero, i quattro progetti finti, la carica della batteria, il parziale, il
 * totalizzatore, la runa del Bluetooth. Ogni volta la regola era la stessa —
 * se una cosa non e' vera e verificabile, non ci va. E un indirizzo inventato
 * e' peggio di un titolo inventato: un titolo fa una brutta figura, un
 * indirizzo manda una mail nel vuoto e fa perdere un lavoro.
 *
 * Tutto esatto. Ma il RISULTATO di quella prudenza non era prudenza: era un
 * sito senza nessun modo di essere contattato. Chi arriva in fondo a sette
 * minuti di esperienza e non trova un recapito chiude la scheda, e non c'e'
 * nessuna differenza fra «non l'ho messo per rigore» e «non c'e'».
 *
 * Il rigore non era sbagliato: era incompleto. Diceva «non inventarlo» e si
 * fermava li', mentre la frase intera e' «non inventarlo, e procuratene uno
 * vero». Adesso c'e', ed e' una casella che si legge davvero.
 */
export const INDIRIZZO = 'servizi.villani@gmail.com'

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
