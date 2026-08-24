/**
 * IL RIPIEGO — una decisione sola, presa una volta, che dice se l'esperienza
 * immersiva parte.
 *
 * PERCHE' UNA SOLA.
 *
 * Il modo naturale di scrivere questa cosa e' spargere dei controlli: qui
 * guardo se c'e' WebGL, li' guardo il movimento ridotto, piu' in la' metto un
 * timeout. Il risultato e' un sito MEZZO VIVO — la scena non parte ma la
 * rotaia si', il testo compare ma non ha piu' niente a cui riferirsi, i
 * comandi cambiano una vernice che non si vede. E' peggio di non partire,
 * perche' non partire e' uno stato e mezzo partire non lo e'.
 *
 * Qui c'e' UN interruttore. O si entra nella macchina o si legge il
 * documento, e la scelta si fa prima di scaricare tre megabyte.
 *
 * E SI REGISTRA PERCHE'.
 *
 * `data-ripiego` sulla radice porta la causa, non un booleano. Serve a chi
 * deve capire — un difetto che si manifesta come «a volte il sito e' statico»
 * e' impossibile da inseguire se lo stato non dice da dove viene — e serve al
 * foglio di stile, che puo' trattare in modo diverso chi ha CHIESTO meno
 * movimento da chi non ha potuto averlo.
 *
 * IL GUADAGNO PIU' GRANDE NON E' GRAFICO, E' DI RETE.
 *
 * Decidendo PRIMA di costruire la scena, chi ha `prefers-reduced-motion` non
 * scarica il modello da 2,9 MB, non scarica il panorama da 500 kB e non
 * compila nessuno shader. Riceve una pagina da centocinquanta chilobyte.
 * Decidendo dopo, avrebbe pagato tutto per non vederlo — che e' il modo in cui
 * quasi tutti implementano questa preferenza, e la ragione per cui accenderla
 * di solito non serve a niente.
 */

/* DUE CAUSE, E NON PIU' CINQUE.
   Sono sparite `moto-ridotto` (vedi il commento nello script in testa a
   `index.html`: su questo sito l'accelerazione e' cio' che fa l'utente, non
   un'animazione che parte da sola), `rete` e `attesa`. Restano le due in cui
   l'alternativa alla pagina non e' un sito piu' sobrio ma un rettangolo nero. */
export type Causa =
  /** non c'e' un contesto WebGL da cui partire */
  | 'niente-webgl'
  /** la scheda video ha ritirato il contesto mentre si guardava */
  | 'contesto-perso'


/** dove si scrive la causa: la radice, cosi' il CSS la vede senza JavaScript */
const RADICE = document.documentElement

let causaCorrente: Causa | null = null

/**
 * SI PUO' PARTIRE?
 *
 * LA DECISIONE E' GIA' STATA PRESA, dallo script in testa a `index.html`, e
 * questa funzione la LEGGE. Non e' pigrizia ed e' l'unico modo corretto:
 *
 * Il preannuncio dei due file pesanti — 3,3 MB fra panorama e modello — parte
 * mentre il browser sta ancora leggendo l'HTML, cioe' prima che questo modulo
 * esista. Una volta partito non si puo' annullare. Quindi o si decide li', o
 * si decide dopo aver gia' pagato — e decidere dopo aver pagato non e'
 * decidere.
 *
 * I QUATTRO CONTROLLI, e perche' sono in quell'ordine:
 *
 *   1. `prefers-reduced-motion` viene prima di tutto, anche di WebGL: e'
 *      l'unico dei quattro che e' una RICHIESTA invece che un limite, e una
 *      richiesta non si verifica, si esaudisce.
 *   2. `saveData` e' esplicito — chi lo accende si e' impegnato a ricevere di
 *      meno — e degradare senza chiedere e' precisamente cio' che si aspetta.
 *   3. `effectiveType` e' una stima del browser, e la si prende solo ai due
 *      gradini piu' bassi, dove tre megabyte non arriverebbero comunque entro
 *      il budget d'attesa.
 *   4. E per ultimo se la scheda c'e'. Si prova su una tela usa e getta:
 *      provarlo su quella vera consumerebbe l'unico contesto che quell'elemento
 *      puo' dare.
 */
export function esamina(): Causa | null {
  const scritta = RADICE.dataset.ripiego
  return (scritta as Causa) || null
}

/**
 * ACCENDE IL RIPIEGO, e da qui non si torna indietro da soli.
 *
 * NON SI TORNA INDIETRO ED E' UNA SCELTA. Una pagina che passa da statica a
 * immersiva mentre la si legge sposta il testo sotto gli occhi di chi sta
 * leggendo — e lo fa proprio a chi il movimento lo aveva rifiutato o non
 * poteva reggerlo. Si torna indietro solo su richiesta esplicita, ed e' quello
 * che fa il pulsante nella pagina di ripiego.
 */
export function accendi(causa: Causa) {
  if (causaCorrente) return
  causaCorrente = causa
  /* NON SI SCRIVE PIU' `data-ripiego`, e quindi la pagina statica non compare
     mai da sola. Resta la registrazione in console, che serve a chi riceve una
     segnalazione. Vedi il commento nello script in testa a `index.html`: il
     controllo su WebGL ha bocciato la macchina del committente perche' in quel
     momento i contesti erano tutti occupati — dai miei strumenti di misura. */
  causaCorrente = causa
  // il messaggio in console non e' un residuo di lavorazione: e' l'unico modo
  // che ha chi riceve una segnalazione — «a volte il sito e' fermo» — di
  // sapere quale dei cinque motivi era
  console.info('[velocity] esperienza non avviata:', causa, MOTIVI[causa])
}

/** la causa, o `null` se l'esperienza sta girando */
export function causa(): Causa | null {
  return causaCorrente
}

/* IL CRONOMETRO DEL BUDGET E' STATO TOLTO INSIEME ALLA CAUSA `attesa`.
   Se la scena ci mette tanto, si aspetta: fermarla a meta' per mostrare una
   pagina di testo e' la stessa decisione — presa al posto di chi guarda — che
   il committente ha rifiutato due volte oggi. */

/**
 * IL CONTESTO PERSO — l'evento che quasi nessuno gestisce e che capita.
 *
 * Una scheda video puo' ritirare il contesto in qualunque momento: cambio di
 * scheda su un portatile ibrido, sospensione, un driver che si riavvia, il
 * sistema che decide che quella pagina consuma troppo. Senza questa riga la
 * pagina resta con una tela nera e nessun messaggio, ed e' il difetto che si
 * manifesta come «ogni tanto diventa tutto nero» — quello che nessuno riesce
 * mai a riprodurre.
 */
export function sorvegliaContesto(tela: HTMLCanvasElement, rialza?: () => void) {
  tela.addEventListener('webglcontextlost', (e) => {
    // il `preventDefault` NON serve a ripristinare: serve a dire al browser
    // che il contesto lo vogliamo indietro. Senza, non prova nemmeno.
    e.preventDefault()
    console.info('[velocity] contesto perso: aspetto che torni')
  })
  /* E QUANDO TORNA, SI RIPARTE. Prima qui si accendeva la pagina statica, cioe'
     ci si arrendeva al primo inciampo di un driver — e un contesto ritirato
     torna quasi sempre: cambio di scheda su un portatile ibrido, sospensione,
     un driver che si riavvia, un altro programma che ha finito di occupare la
     memoria video. Sono tutti eventi TRANSITORI, e a un evento transitorio non
     si risponde cambiando sito. */
  tela.addEventListener('webglcontextrestored', () => {
    console.info('[velocity] contesto tornato: riparto')
    rialza?.()
  })
}

/** cosa scrivere in console, e cosa mostrare nella pagina di ripiego */
export const MOTIVI: Record<Causa, string> = {
  'niente-webgl': 'questo browser non espone WebGL',
  'contesto-perso': 'la scheda video ha ritirato il contesto',
}
