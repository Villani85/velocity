/**
 * LE PROPRIETA' PERSONALIZZATE, SCRITTE SOLO QUANDO CAMBIANO.
 *
 * IL DIFETTO, e ci sono voluti tre strumenti per arrivarci.
 *
 * `strumenti/salti.mjs` fa scorrere la pagina a tempo reale, come farebbe un
 * dito, e conta di quanto avanza il racconto a ogni fotogramma. Il risultato e'
 * brutto e si ripete identico a ogni corsa:
 *
 *     seicentoquaranta fotogrammi su milleottocento attesi,
 *     e salti da due secondi sempre negli stessi punti
 *     — 82% velocita, 62% taglio, 34% orbita, 7,8% hero
 *
 * Le posizioni che si ripetono escludono la contesa con altri programmi: e' il
 * sito. E `renderer.info` dice «niente di nuovo» — nessun programma, nessuna
 * tessitura, nessuna geometria — quindi non e' nemmeno compilazione.
 *
 * Restava una cosa sola: non e' il disegno, e' la PAGINA.
 *
 * Il sito scrive sette proprieta' personalizzate sulla radice del documento a
 * ogni fotogramma: la quota del quadro, l'orizzonte, la presenza del testo, i
 * due veli, il lampo della pattuglia. Ognuna di quelle scritture invalida lo
 * stile di TUTTO l'albero, perche' una proprieta' sulla radice si eredita
 * dappertutto. Il browser deve ricalcolare lo stile di ogni elemento e
 * rifare l'impaginazione, e lo fa sessanta volte al secondo per dei numeri che
 * quasi sempre sono identici a quelli del fotogramma prima.
 *
 * E' anche il motivo per cui `strumenti/dovecosta.mjs` non l'ha mai visto:
 * misura la scena a pagina FERMA, e a pagina ferma quei numeri non cambiano.
 *
 * LA CURA E' UNA RIGA: si scrive solo se il valore e' cambiato davvero.
 *
 * «Davvero» vuol dire dopo l'arrotondamento con cui verra' usato. `--presenza`
 * finisce in un'opacita' e tre decimali sono piu' che sufficienti; la quota del
 * quadro finisce in una percentuale e due decimali sono gia' un decimo di pixel.
 * Sotto quella soglia la differenza non esiste per nessuno tranne che per il
 * ricalcolo dello stile, a cui costa tutto.
 */

const RADICE = document.documentElement
const ultime = new Map<string, string>()

/**
 * Scrive una proprieta' sulla radice, ma solo se e' cambiata.
 *
 * @param nome  il nome della proprieta', compresi i due trattini
 * @param valore  gia' formattato come lo vuole il foglio di stile
 */
export function scriviCustom(nome: string, valore: string): void {
  if (ultime.get(nome) === valore) return
  ultime.set(nome, valore)
  RADICE.style.setProperty(nome, valore)
}

/**
 * Comodita' per i numeri: arrotonda e scrive.
 *
 * L'arrotondamento non e' un dettaglio di formattazione, e' la soglia sotto la
 * quale si smette di scrivere. Chiamarla con troppe cifre vanifica tutto:
 * `0.4712389` e `0.4712390` sono due stringhe diverse e due ricalcoli di stile,
 * per una differenza che non esiste.
 */
export function scriviNumero(nome: string, valore: number, cifre = 3, coda = ''): void {
  scriviCustom(nome, valore.toFixed(cifre) + coda)
}

/** dimentica tutto: serve quando la pagina cambia stato da capo */
export function scordaCustom(): void {
  ultime.clear()
}
