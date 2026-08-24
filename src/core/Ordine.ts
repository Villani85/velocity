/**
 * L'ORDINE IN CUI ARRIVANO LE COSE — una porta sola, aperta una volta sola.
 *
 * PERCHE' ESISTE, e la ragione e' una misura di `strumenti/carico.mjs`.
 *
 * Su una rete da telefono, a cache vuota:
 *
 *     prima pittura            3,5 s     113 kB
 *     primo fotogramma          7,3 s     502 kB
 *     ambiente pronto          21,3 s    2,00 MB
 *     AUTOMOBILE PRONTA        47,1 s    9,07 MB
 *
 * Il primo fotogramma e' organizzato bene: centotredici kilobyte, e sono
 * l'HTML, il foglio di stile, due pezzi di codice e i caratteri. Il secondo
 * no. Il modello dell'automobile e' **preannunciato per primo — parte a 213
 * millisecondi — e finisce per ultimo, a 42,8 secondi**, perche' nel frattempo
 * altri trentaquattro file gli mangiano la banda.
 *
 * Quei file non servono a nessuno in quel momento. Sono la strada, la
 * fotografia dell'abitacolo, la pattuglia della polizia e le miniature dei
 * lavori: **capitoli che cominciano decine di secondi di scorrimento piu'
 * tardi**, e che partono subito solo perche' il loro oggetto viene costruito
 * nel costruttore di `Esperienza` insieme a tutto il resto.
 *
 * IL MECCANISMO NON E' NUOVO, ED E' QUESTO IL PUNTO. Carbonio, buccia, faro e
 * ruota partono gia' dopo il GLB, ma ognuno se lo gestisce per conto suo. Qui
 * non si inventa una strategia: si da' un nome a quella che c'e' gia', cosi'
 * la si puo' applicare al resto invece di riscriverla ogni volta.
 *
 * COME SI USA. Chi carica qualcosa che non serve al primo fotogramma aspetta:
 *
 *     await dopoAuto
 *     new TextureLoader().load(...)
 *
 * e chi porta in scena l'automobile chiama `apriLaCoda()` quando ha finito.
 *
 * DUE COSE CHE NON DEVONO SUCCEDERE, e sono tutte e due gia' capitate su
 * questo progetto in altre forme:
 *
 *   LA PORTA NON SI DEVE POTER CHIUDERE. Se l'automobile non arriva — un
 *   errore di rete, un file mancante — tutto il resto del sito resterebbe
 *   fermo per sempre dietro una promessa che non si risolve, e il committente
 *   ha dato una regola netta e due volte: NIENTE SITO STATICO, PER NESSUN
 *   MOTIVO. Per questo c'e' un TETTO: passato quello la porta si apre da sola,
 *   qualunque cosa sia successo. Meglio scaricare in disordine che non
 *   scaricare.
 *
 *   E NON DEVE ESSERE UN'ATTESA DA FERMO. Chi aspetta qui non blocca niente:
 *   sono caricatori, e finche' non hanno il loro file l'oggetto a cui
 *   servono disegna il proprio ripiego — un pixel per la strada, opacita'
 *   zero per l'abitacolo. E' la stessa scelta che c'e' gia' dentro `Lastra`,
 *   dove le tre tessiture dell'asfalto partono da un pixel del colore medio.
 */

/**
 * OLTRE QUESTO NON SI ASPETTA PIU' NESSUNO — e i primi dodici secondi che
 * avevo scritto qui rendevano tutto il file inutile.
 *
 * E' l'errore piu' istruttivo di questa giornata, e l'ha trovato la misura
 * subito dopo, non un ragionamento.
 *
 * Avevo messo dodici secondi pensando «se in dodici secondi l'automobile non
 * c'e', qualcosa e' andato storto». Sbagliato: su 4G lento l'automobile
 * arriva a QUARANTATRE secondi, e non perche' qualcosa e' andato storto — e'
 * un modello da 2,9 MB su un collegamento da 1,6 Mbit, e sono i suoi tempi.
 * Quindi la valvola scattava sempre, apriva la porta al dodicesimo secondo, e
 * gli altri tre megabyte e mezzo ripartivano contro la vettura esattamente
 * come prima.
 *
 * Il risultato e' la peggior specie di taratura: **una difesa tarata sulla
 * rete veloce che spara sulla rete lenta**, cioe' sull'unico caso in cui
 * serviva la cosa che difende. Su rete piena non si notava niente, perche' li'
 * l'automobile arriva prima dei dodici secondi e la valvola non scatta mai.
 *
 * Adesso la valvola fa il mestiere per cui esiste — un caricamento appeso, non
 * un caricamento lento — e il caso normale del fallimento non passa nemmeno di
 * qui: chi carica l'automobile chiama `apriLaCoda()` anche quando FALLISCE,
 * quindi un file mancante o un errore di rete aprono la porta subito. Questo
 * numero copre solo cio' che non finisce ne' bene ne' male, che e' la sola
 * cosa da cui un tempo massimo puo' davvero difendere.
 */
const TETTO = 60000

let apri: (() => void) | null = null

/**
 * Si risolve quando l'automobile e' in scena, o comunque entro il tetto.
 *
 * E' una promessa sola per tutta la vita della pagina: chi la aspetta due
 * volte aspetta lo stesso oggetto, e chi la aspetta dopo che si e' gia'
 * risolta riparte subito.
 */
export const dopoAuto: Promise<void> = new Promise<void>((risolvi) => {
  apri = risolvi
  // LA VALVOLA DI SICUREZZA. Non e' pessimismo: e' che l'alternativa al suo
  // fallimento e' un sito che non finisce mai di caricarsi, cioe' il difetto
  // peggiore fra quelli possibili.
  setTimeout(() => {
    if (!apri) return
    console.warn('[ordine] l\'automobile non e\'arrivata entro ' + TETTO + ' ms: apro lo stesso')
    apri()
    apri = null
  }, TETTO)
})

/** la chiama chi porta l'automobile in scena. Chiamarla due volte non fa nulla. */
export function apriLaCoda(): void {
  if (!apri) return
  apri()
  apri = null
}

/** vero se la porta e' gia' aperta: serve agli strumenti di misura */
export function codaAperta(): boolean {
  return apri === null
}
