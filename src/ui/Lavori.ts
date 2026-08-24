/**
 * I LAVORI — e sono l'unico posto in cui esistono.
 *
 * PERCHE' UN FILE SOLO.
 *
 * Questa lista compare in tre punti diversi del sito: dentro il quadro
 * strumenti nel finale, quando la volante chiede i documenti; nel documento
 * semantico, che e' quello che leggono un lettore di schermo e un motore di
 * ricerca; e nella navigazione. Tre copie da tenere allineate a mano sono tre
 * copie che divergono alla prima aggiunta — e la prima aggiunta e' proprio la
 * cosa che questo elenco deve rendere facile.
 *
 * Aggiungere un lavoro e' riempire una riga qui. Non c'e' nient'altro da
 * toccare.
 *
 * DA UNO SOLO A DIECI, IN UNA SERA.
 *
 * Per tutto il progetto questa lista ha avuto una riga vera — questo sito — e
 * una vuota, con scritto sopra, per esteso, il ragionamento per cui non andava
 * riempita con progetti plausibili: se una cosa non e' vera, non ci va.
 *
 * Il ragionamento era giusto e la premessa era sbagliata, e a smontarla e'
 * stato il committente in una riga: «sul pc ci dovrebbero essere altri
 * progetti». I lavori c'erano gia' tutti, sul suo disco, finiti: il panino, il
 * sito di Stefania, l'orologio, i divani, la masseria, il pianoforte, lo
 * studio. Non stavo proteggendo un portfolio onesto da un'invenzione — stavo
 * lasciando vuoto un elenco perche' non avevo guardato dove i lavori erano.
 *
 * LE ANTEPRIME NON SONO DISEGNATE, SONO I SITI.
 *
 * Ogni copertina in `public/lavori/` e' una fotografia vera di quel sito
 * mentre gira: aperto in un browser, caricato, scorso di un sesto di schermo
 * perche' quasi tutti hanno la prima schermata muta, e fotografato. Le fa
 * `.tmp/copertine.mjs` e si rifanno quando un sito cambia.
 *
 * Costano 118 KB in tutto, e sono l'unica cosa che un riquadro di vetrina
 * debba contenere: dieci rettangoli con dentro scritto il nome del progetto
 * non sono un portfolio, sono un indice.
 *
 * SONO DEMO, E LO DICONO.
 *
 * Nove di questi dieci sono dimostrazioni: siti costruiti per far vedere come
 * lavoro, non commissionati da un cliente che li ha pubblicati. Chiamarli
 * «lavori» e basta sarebbe la prima cosa non vera di tutto il sito, e in un
 * finale in cui una pattuglia controlla i documenti sarebbe anche la piu'
 * stupida da scrivere. Quindi ognuno porta la sua parola: DEMO, o SITO.
 */
export type Lavoro = {
  /** il numero d'ordine, che si vede: 01, 02… */
  codice: string
  /** vuoto = slot ancora da riempire */
  nome: string
  anno: string
  /** con che cosa e' fatto, in due o tre parole */
  tecnica: string
  /** l'indirizzo, quando esiste. Vuoto = non si collega a niente */
  dove: string
  /** l'anteprima in `public/lavori/`: una fotografia del sito che gira */
  copertina: string
  /**
   * R&D se e' ricerca, SITO se e' in linea per qualcuno.
   *
   * ERA «DEMO», ED E' STATO UN ERRORE DI PAROLA, non di sostanza. Una
   * revisione esterna l'ha detto meglio di come l'avrei detto io: «demo» si
   * legge INCOMPIUTO — una cosa a meta', un provino che non ce l'ha fatta —
   * mentre «R&D» si legge INVESTO SU DI ME. La cosa descritta e' la stessa,
   * e cambia cosa dichiara di essere.
   *
   * Il patto pero' non cambia di una virgola: quello che e' in linea per
   * qualcuno lo dice, e quello che non lo e' non finge. In un finale in cui
   * una pattuglia controlla i documenti, un documento gonfiato sarebbe la
   * cosa piu' stupida che si possa scrivere.
   */
  genere: 'R&D' | 'SITO'
  /** di che parla, in poche parole: la riga che si legge sul riquadro */
  soggetto: string
  /**
   * LE TRE CELLE DEL PANNELLO, quando la pattuglia guarda questo lavoro.
   *
   * Vuoto = si compilano da sole con tecnica, anno e genere, che ogni lavoro ha
   * gia'. Si scrivono a mano solo quando c'e' qualcosa di piu' vero da dire —
   * ed e' il caso di VELOCITY, che ha un peso misurato sul file.
   *
   * La regola resta quella di tutto il pannello: ogni cella dev'essere
   * verificabile. Una pattuglia sta chiedendo i documenti, e un documento
   * falso e' peggio di nessun documento.
   */
  dati?: Array<[string, string]>
}

export const LAVORI: Lavoro[] = [
  {
    codice: '01', nome: 'STEFANIA CHIARADIA', anno: '2026',
    tecnica: 'SEQUENZA SU TELA', dove: '',
    copertina: '/lavori/stefania.webp', genere: 'SITO',
    soggetto: 'Profilo di una Salesforce architect',
  },
  {
    codice: '02', nome: 'STUDIO', anno: '2026',
    tecnica: 'SCORRIMENTO / SEQUENZA', dove: '',
    copertina: '/lavori/studio.webp', genere: 'SITO',
    soggetto: 'Siti per portare clienti',
  },
  {
    codice: '03', nome: 'FUSTO', anno: '2026',
    tecnica: '3D + SEQUENZA', dove: '',
    copertina: '/lavori/fusto.webp', genere: 'R&D',
    soggetto: 'Divani su misura, dall’interno',
  },
  {
    codice: '04', nome: 'CORTE BIANCA', anno: '2026',
    tecnica: '3D + SEQUENZA', dove: '',
    copertina: '/lavori/masseria.webp', genere: 'R&D',
    soggetto: 'Un giorno dentro un muro del Seicento',
  },
  {
    codice: '05', nome: 'EVERY INTERFACE', anno: '2026',
    tecnica: 'REAL-TIME 3D / WEBGL', dove: '',
    copertina: '/lavori/every.webp', genere: 'R&D',
    soggetto: 'Interfacce viste da dentro',
  },
  {
    codice: '06', nome: 'CHRONO_01', anno: '2026',
    tecnica: 'SEQUENZA SU TELA', dove: '',
    copertina: '/lavori/orologio.webp', genere: 'R&D',
    soggetto: 'L’architettura del tempo',
  },
  {
    codice: '07', nome: 'PIANOFORTE', anno: '2026',
    tecnica: 'REAL-TIME 3D / WEBGL', dove: '',
    copertina: '/lavori/pianoforte.webp', genere: 'R&D',
    soggetto: 'Diciotto pezzi, montati scorrendo',
  },
  {
    codice: '08', nome: 'FLOW', anno: '2026',
    tecnica: 'SCORRIMENTO / SVG', dove: '',
    copertina: '/lavori/flow.webp', genere: 'R&D',
    soggetto: 'Un processo che si disegna',
  },
  {
    codice: '09', nome: 'CÈPP', anno: '2026',
    // 240 fotogrammi WebP disegnati su tela dallo scorrimento: e' scritto nel
    // suo PROGETTO.md e si vede aprendo la rete del browser
    tecnica: 'SEQUENZA SU TELA', dove: '',
    copertina: '/lavori/panino.webp', genere: 'R&D',
    soggetto: 'L’architettura del gusto',
  },
  {
    codice: '10', nome: 'VELOCITY', anno: '2026',
    // e' vero e si puo' verificare aprendo gli strumenti del browser
    tecnica: 'REAL-TIME 3D / WEBGL', dove: '',
    copertina: '/lavori/velocity.webp', genere: 'R&D',
    soggetto: 'Una supercar che si attraversa',
    /* I tre di VELOCITY sono scritti a mano perche' sono migliori di quelli
       automatici, e sono tutti e tre verificabili:
         667 kB   il peso di `public/modelli/auto2.glb`, misurato sul file
         WEBGL    si apre la console e si vede
         DESKTOP  c'e' una versione telefono vera, non il desktop stretto:
         + MOBILE `strumenti/telefono_audit.mjs` la controlla a tre formati */
    dati: [['667 kB', 'CAR ASSET'], ['WEBGL', 'THREE.JS'], ['DESKTOP + MOBILE', 'RESPONSIVE']],
  },
]

/**
 * LE TRE CELLE DI UN LAVORO, scritte a mano o ricavate.
 *
 * Ricavate vuol dire: con che cosa e' fatto, di che anno e', ed e' un demo o un
 * sito in linea. Sono le tre cose che si vogliono sapere di un lavoro guardando
 * il documento di qualcun altro, e ogni riga di questo elenco le ha gia'.
 */
export function datiLavoro(l: Lavoro): Array<[string, string]> {
  if (l.dati && l.dati.length) return l.dati
  return [
    [l.tecnica || '—', 'TECNICA'],
    [l.anno || '—', 'ANNO'],
    [l.genere, l.genere === 'SITO' ? 'IN LINEA' : 'RICERCA'],
  ]
}

/**
 * QUANTI NE ESISTONO DAVVERO — e la domanda giusta non era quella.
 *
 * Questa contava i lavori con un nome, cioe' tutti e dieci, e il pannello
 * scriveva «10 / 10 LAVORI». Una revisione esterna l'ha bocciata con
 * l'argomento piu' difficile da ribattere: **chi guarda puo' contare.** In
 * campo se ne vedono due o tre per volta, e un numero che il visitatore puo'
 * verificare e trovare gonfiato fa piu' danno di un numero piccolo — perche'
 * non mette in dubbio quel numero, mette in dubbio tutto il resto del
 * pannello. In un finale in cui una pattuglia controlla i documenti, e' anche
 * l'ultimo posto in cui conviene arrotondare.
 *
 * Adesso ne conta due specie separate e le dichiara tutte e due: quanti sono
 * in linea per qualcuno, e quanti sono ricerca. Sono due numeri veri e la loro
 * somma e' verificabile scorrendo il carosello.
 */
export function quantiInLinea(): number {
  return LAVORI.filter((l) => l.nome && l.genere === 'SITO').length
}

/** e quanti sono ricerca: la differenza, ma detta invece che dedotta */
export function quantiRicerca(): number {
  return LAVORI.filter((l) => l.nome && l.genere !== 'SITO').length
}
