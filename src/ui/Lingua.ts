/**
 * LE DUE LINGUE.
 *
 * PERCHE' UN DIZIONARIO E NON DUE COPIE DEI FILE.
 *
 * La strada rapida sarebbe stata duplicare `Voci.ts` in `Voci.en.ts`. Dura
 * finche' non si tocca niente: alla prima riscrittura di una frase le due
 * copie divergono, e la seconda la rilegge solo chi non parla la prima —
 * cioe' nessuno di quelli che potevano accorgersene. E' lo stesso motivo per
 * cui il documento del ripiego e' UN blocco di contenuto usato in due stati e
 * non due blocchi.
 *
 * Qui c'e' un dizionario con una chiave per frase e due valori. Aggiungere una
 * frase senza la sua traduzione e' un errore di tipo, non una dimenticanza che
 * si scopre in produzione.
 *
 * LA SCELTA A MANO VINCE, E RESTA.
 *
 * `Accept-Language` decide la PRIMA volta e basta. Chi ha un browser in
 * inglese ma preferisce leggere in italiano lo dice una volta sola: da li' in
 * poi comanda `localStorage`, e ricaricando non gli si cambia la lingua sotto
 * il naso perche' il browser continua a suggerirne un'altra. E' il difetto
 * piu' comune dei siti multilingua, e si corregge con tre righe.
 *
 * SI RICARICA, E LO SCORRIMENTO SI RIMETTE DOV'ERA.
 *
 * Cambiare lingua senza ricaricare vorrebbe dire che ogni componente sappia
 * ricostruirsi su richiesta: sono sei classi, e il testo di cinque di loro si
 * riscrive solo quando cambia il tempo — quindi cambiando lingua a meta' di un
 * beat non cambierebbe niente finche' non si scorre. Un ricaricamento e'
 * onesto e istantaneo, perche' a quel punto tutto e' in cache; quello che va
 * conservato e' il POSTO in cui si era, e si conserva in frazione di corsa
 * invece che in pixel, cosi' regge anche un cambio di formato.
 */

export type Lingua = 'it' | 'en'

const CHIAVE = 'velocity:lingua'
const POSTO = 'velocity:posto'

/** quale lingua si sta leggendo */
export function lingua(): Lingua {
  const salvata = leggi(CHIAVE)
  if (salvata === 'it' || salvata === 'en') return salvata
  // `languages` e non `language`: il primo e' l'elenco ordinato di preferenza,
  // il secondo e' solo la lingua dell'interfaccia del browser — che su un
  // computer aziendale e' spesso l'inglese anche per chi non lo preferisce
  const preferite = navigator.languages ?? [navigator.language]
  for (const l of preferite) {
    if (l.toLowerCase().startsWith('it')) return 'it'
    if (l.toLowerCase().startsWith('en')) return 'en'
  }
  // l'italiano e' la lingua di casa: chi arriva da una terza lingua legge
  // quella dell'autore, non una traduzione della traduzione
  return 'it'
}

/** cambia lingua: si ricorda la scelta e il punto in cui si era */
export function imposta(l: Lingua) {
  if (l === lingua()) return
  scrivi(CHIAVE, l)
  const corsa = document.documentElement.scrollHeight - innerHeight
  if (corsa > 0) scrivi(POSTO, String(scrollY / corsa))
  location.reload()
}

/**
 * RIMETTE LO SCORRIMENTO DOV'ERA, e va chiamato quando la scena e' pronta.
 *
 * Chiamandolo subito non servirebbe a niente: l'altezza della pagina la da'
 * `#corsa`, che c'e' da subito, ma la scena no — e atterrare al 78% di una
 * scena che sta ancora caricando significa vedere il primo fotogramma buono
 * gia' a meta' di un beat, senza lo smorzamento che ci avrebbe portati.
 */
export function rimettiIlPosto() {
  const p = leggi(POSTO)
  if (!p) return
  scrivi(POSTO, '')
  const q = Number(p)
  if (!(q > 0)) return
  const corsa = document.documentElement.scrollHeight - innerHeight
  scrollTo({ top: corsa * q, behavior: 'instant' as ScrollBehavior })
}

/* `localStorage` puo' lanciare: in navigazione privata su qualche browser, e
   dentro un iframe di terze parti. Un sito che si rompe perche' non puo'
   ricordare una preferenza e' peggio di un sito che non la ricorda. */
function leggi(k: string): string | null {
  try { return localStorage.getItem(k) } catch { return null }
}
function scrivi(k: string, v: string) {
  try { localStorage.setItem(k, v) } catch { /* pazienza */ }
}

/**
 * IL DIZIONARIO.
 *
 * LE TRADUZIONI NON SONO TRADUZIONI, e questa e' la parte che conta.
 *
 * «Siti che non si guardano. Si attraversano.» tradotto parola per parola fa
 * «Sites you don't look at. You go through them.», che in inglese e' una frase
 * goffa e piu' lunga della riga che deve stare. In inglese la stessa idea si
 * dice piu' corta e piu' secca — ed e' cosi' che va detta, perche' quello che
 * deve sopravvivere e' il RITMO, non le parole.
 *
 * La regola che ho seguito su tutte: stessa lunghezza a occhio, stesso numero
 * di righe, stesso posto dove cade l'accento. Un titolo tradotto che occupa
 * una riga in piu' non e' una traduzione: e' un'impaginazione diversa.
 */
type Voce = Record<Lingua, string>

export const D: Record<string, Voce> = {
  // ---------------------------------------------------------------- testata
  /* FREELANCE, ed e' la parola con il miglior rapporto costo/beneficio di
     tutta la pagina.
     Chi apre un sito come questo si fa una domanda sola prima di qualunque
     altra: agenzia o persona? Da quella dipendono il preventivo che immagina,
     il tono con cui scrive e se scrive. «Creative Developer» la lascia aperta —
     e chi guarda, in dubbio, di solito immagina la risposta piu' cara.
     Nove parole in meno di ogni pagina «chi sono»: una sola, nell'occhiello,
     letta in mezzo secondo insieme al nome. */
  ruolo: { it: 'Freelance Creative Developer', en: 'Freelance Creative Developer' },
  navLavori: { it: 'Lavori', en: 'Work' },
  navStudio: { it: 'Studio', en: 'About' },
  navContatto: { it: 'Contatto', en: 'Contact' },

  // ------------------------------------------------------------------- voci
  heroOcchiello: { it: 'CREATIVE DEVELOPMENT / WEBGL / 3D', en: 'CREATIVE DEVELOPMENT / WEBGL / 3D' },
  // tre righe di maiuscolo in tutte e due, e la terza porta il senso
  heroTitolo: {
    it: 'SITI CHE NON\nSI GUARDANO.\nSI ATTRAVERSANO.',
    /* TRE RIGHE COME IN ITALIANO, E LA MISURA E' UN VINCOLO.
       La prima versione era «SITES YOU DO NOT / LOOK AT. / YOU DRIVE
       THROUGH.»: giusta di senso e sbagliata di misura. L'ultima riga fa
       diciotto caratteri contro i sedici della piu' lunga in italiano, e il
       corpo del titolo e' tarato su quei sedici — nel provino andava a capo
       e il titolo diventava di QUATTRO righe, cioe' un'altra impaginazione
       e non un'altra lingua.
       Questa sta in quindici caratteri per riga. «Go through» e' meno
       automobilistico di «drive through» e va bene lo stesso: la metafora
       dell'automobile la porta la scena, non il titolo. Il titolo deve
       stare. */
    en: 'SITES YOU DON’T\nLOOK AT.\nYOU GO THROUGH.',
  },
  /* DICE COSA SI STA GUARDANDO, non che mestiere faccio.
     «Progetto esperienze digitali in cui immagine, movimento e codice
     diventano un unico ambiente» e' scritta bene e potrebbe essere la frase di
     cento studi: non nomina niente di cio' che c'e' sullo schermo in quel
     momento. Questa nomina il progetto e dice cosa sta esplorando — ed e'
     verificabile guardando, che e' l'unico tipo di affermazione che questo
     sito si permette. */
  heroRiga: {
    it: 'VELOCITY esplora come 3D realtime, movimento e interfaccia possano vivere nello stesso spazio.',
    en: 'VELOCITY explores how real-time 3D, motion and interface can live in the same space.',
  },
  heroInvito: { it: 'ESPLORA I LAVORI', en: 'SEE THE WORK' },
  /* la riga in fondo alle tre insegne della hero: vedi «scene/Insegne.ts».
     Non e' un pulsante e non pretende di esserlo — e' la didascalia che dice
     che quello che si sta guardando e' un progetto, non una fotografia. */
  insegnaScopri: { it: 'SCOPRI IL PROGETTO', en: 'EXPLORE THE PROJECT' },

  /* UNA NUMERAZIONE SOLA, E PRIMA CE N'ERANO TRE.
     La rotaia contava in settimi — 06/07 CORSA, 07/07 CONTATTO — gli occhielli
     dei capitoli contavano da 01 a 05, e il finale diceva 05 / PROSSIMO subito
     dopo un 07/07. Tre sistemi nello stesso sito, e due di loro visibili nello
     stesso fotogramma.
     Un visitatore normale non ci ragiona ma sente che qualcosa non torna; un
     art director lo legge come un errore di sistema, che e' peggio di un
     errore di gusto — un errore di gusto e' una scelta, un errore di sistema
     e' disattenzione. E' il genere di dettaglio che separa «molto curato» da
     «curato fino all'ultima cifra».
     Adesso il numero e' uno: quello della rotaia, che e' l'unico che ha una
     base vera (sette tempi, e sono sette).

     IL NOME PERO' RESTA DIVERSO, e non e' una svista. La rotaia dice DOVE si
     e' — ESTERNO, OTTICA, ABITACOLO: sono posti. L'occhiello dice DI COSA
     parla il capitolo — LA SUPERFICIE, L'INGRESSO, IL COMANDO: sono temi. Due
     mestieri diversi con lo stesso indirizzo, come il numero civico e il nome
     della famiglia che ci abita. */
  orbitaOcchiello: { it: '02 / 07 — LA SUPERFICIE', en: '02 / 07 — THE SURFACE' },
  orbitaTitolo: { it: 'Puoi girarci\nintorno.', en: 'You can walk\naround it.' },
  /* VIA IL PARAGONE CON GLI ALTRI SITI.
     «E' qui che finiscono quasi tutti i siti» e' una frecciata gratuita: dice
     che gli altri sono inferiori invece di lasciare che ci si arrivi da soli,
     e sposta l'attenzione da quello che sta succedendo a quanto sarei bravo io.
     Questa parla della scena — c'e' un oggetto che gira e non ci si e' ancora
     entrati — e la stessa conclusione la tira chi guarda. */
  orbitaRiga: {
    it: 'Finché resti fuori, è ancora una superficie.',
    en: 'As long as you stay outside, it is still a surface.',
  },

  latoOcchiello: { it: '03 / 07 — L’INGRESSO', en: '03 / 07 — THE WAY IN' },
  latoTitolo: { it: 'La via dentro\nnon è la porta.', en: 'The way in\nis not the door.' },
  /* SI ANCORA A QUELLO CHE E' IN CAMPO IN QUELL'ISTANTE.
     «Si entra dove la forma lo permette» e' una massima, e una massima si puo'
     solo credere. Questa e' una constatazione: in quel momento sullo schermo
     c'e' il gruppo ottico che riempie meta' fotogramma, e la frase indica
     proprio quello. Viene provata davanti agli occhi mentre la si legge. */
  latoRiga: {
    it: 'Il dettaglio che stavi osservando diventa l’ingresso.',
    en: 'The detail you were looking at becomes the way in.',
  },

  accensioneOcchiello: { it: '05 / 07 — IL MOTORE', en: '05 / 07 — THE ENGINE' },
  /* «DENTRO GIRA DAVVERO», e non piu' «dentro c'e' un motore».
     Macchina → motore era la coppia piu' prevedibile di tutto il testo: la
     metafora arriva prima della frase. E soprattutto non si teneva con la riga
     sotto, che parla di rendering — occhiello, titolo e sommario dicevano tre
     cose che non si guardavano in faccia.
     Tre parole si agganciano alla riga tecnica e dicono la cosa che un
     direttore tecnico vuole sapere per prima: che non e' un video. */
  accensioneTitolo: { it: 'Dentro\ngira davvero.', en: 'It really\nruns inside.' },
  /* I SESSANTA FOTOGRAMMI AL SECONDO SONO STATI TOLTI, ED E' LA CORREZIONE
     PIU' IMPORTANTE DI TUTTO IL TESTO.
     Era una promessa che non posso mantenere: il tempo per fotogramma dipende
     dalla macchina di chi guarda, e su una integrata o su un portatile in
     risparmio energetico sessanta non ci sono. E' la stessa ragione per cui
     quel numero e' sparito dal quadro strumenti e dalla spina — dichiararlo a
     parole dopo averlo tolto dai pannelli sarebbe stato peggio, perche' una
     frase non si puo' nemmeno verificare guardando.
     Quello che resta e' vero per costruzione e risponde alla domanda che fa un
     tecnico: perche' WebGL e non una sequenza di fotogrammi? Perche' la scena
     continua a essere calcolata mentre la si attraversa. */
  accensioneRiga: {
    it: 'La scena continua a essere renderizzata mentre la attraversi.',
    en: 'The scene keeps being rendered while you go through it.',
  },

  velocitaOcchiello: { it: '06 / 07 — IL COMANDO', en: '06 / 07 — THE CONTROL' },
  velocitaTitolo: { it: 'E adesso\nguidi tu.', en: 'And now\nyou’re driving.' },
  /* VIA IL «NON E' X, E' Y».
     E' la costruzione piu' prevedibile del copy pubblicitario, e la si
     riconosce prima di averla finita di leggere: appena si incontra «non e'
     un effetto» si sa gia' che segue «e' qualcos'altro». Detta dritta, la
     stessa cosa e' piu' corta e si crede di piu' — e la prima meta' della
     frase, che era gia' la parte forte, resta identica. */
  velocitaRiga: {
    it: 'Più forte scorri, più forte va. Ogni movimento risponde al tuo gesto.',
    en: 'The harder you scroll, the harder it goes. Every movement answers your hand.',
  },

  contattoOcchiello: { it: '07 / 07 — IL CONTATTO', en: '07 / 07 — CONTACT' },
  contattoTitolo: { it: 'Forse conviene\naccostare.', en: 'Maybe time\nto pull over.' },
  contattoRiga: {
    it: 'Il prossimo tratto lo facciamo insieme: scrivimi.',
    en: 'Let us do the next stretch together: write to me.',
  },

  // --------------------------------------------------------- il controllo
  //
  /* «COSA TRASPORTA?» E NON PIU' «DOCUMENTI», e il cambio e' di sostanza.
   *
   * «DOCUMENTI» era la parola giusta per la scena — una pattuglia ferma
   * un'automobile e chiede le carte — ed era quella sbagliata per cio' che
   * succede subito dopo. Perche' quello che il sito tira fuori non sono
   * documenti d'identita': sono i LAVORI. A una richiesta di documenti si
   * risponde con una patente; a «cosa trasporta?» si risponde con dieci
   * progetti, ed e' esattamente la risposta che il sito ha in mano.
   *
   * Il committente l'ha detto meglio di come l'avevo pensato io: «fammi vedere
   * cosa trasporti, come direbbero gli americani». E' la frase che un agente
   * dice davvero quando quello che gli interessa non e' chi sei ma cosa hai
   * dietro — ed e' anche il modo piu' naturale di trasformare un controllo in
   * un portfolio senza che si veda la cerniera.
   *
   * IN ITALIANO SI DA' DEL LEI, e non e' un dettaglio di cortesia: un agente
   * italiano dice «cosa trasporta», mai «cosa trasporti». Il «lei» e' proprio
   * cio' che rende la frase un'intimazione invece di una domanda fra amici.
   *
   * IN INGLESE la frase da film e' «WHAT ARE YOU CARRYING?». E' lunga — ventuno
   * caratteri contro i quattordici dell'italiano — e questa parola vive di
   * spaziatura larghissima in mezzo allo schermo. Per questo il corpo adesso si
   * adatta alla frase invece di essere fisso: vedi `ui/Controllo.ts`. */
  documenti: { it: 'COSA TRASPORTA?', en: 'WHAT ARE YOU CARRYING?' },
  inRegola: { it: 'TUTTO IN REGOLA', en: 'ALL IN ORDER' },
  nextOcchiello: { it: '07 / 07 — PROSSIMO', en: '07 / 07 — NEXT' },
  nextDomanda: { it: 'Il prossimo\nprogetto?', en: 'The next\nproject?' },
  nextInvito: { it: 'SCRIVIMI', en: 'WRITE TO ME' },

  inArrivo: { it: 'IN ARRIVO', en: 'COMING' },

  /* LE PAROLE DELLA CARTA DEL METODO. Sono poche apposta: quella carta deve
     mostrare due immagini e tre numeri, e ogni parola in piu' toglie spazio
     alla cosa che sta li' per essere guardata.
     «IL METODO» sta dove sulle altre carte sta il genere — R&D o SITO — e la
     sostituzione e' voluta: quella carta non e' un lavoro, e' il come. */
  studioCarta: { it: 'IL METODO', en: 'THE METHOD' },
  studioPrima: { it: 'PRIMA', en: 'BEFORE' },
  studioDopo: { it: 'DOPO', en: 'AFTER' },
  /* LA DIDASCALIA DICE CHE COSA SI STA GUARDANDO, se no due fiancate quasi
     uguali sono due fiancate quasi uguali. E dice anche la cosa piu' utile
     imparata li': il segno non era un rilievo, era dipinto nell'albedo. */
  studioDidascalia: {
    it: 'LA FIANCATA, PRIMA E DOPO IL PASSA-ALTO',
    en: 'THE FLANK, BEFORE AND AFTER THE HIGH-PASS',
  },
  studioCifra1: { it: 'FAIRNESS, mm', en: 'FAIRNESS, mm' },
  studioCifra2: { it: 'LA CARROZZERIA', en: 'THE BODY' },
  studioCifra3: { it: 'METRICHE BUTTATE', en: 'METRICS BINNED' },
  lavoroPrima: { it: 'Lavoro precedente', en: 'Previous work' },
  lavoroDopo: { it: 'Lavoro successivo', en: 'Next work' },
  /* L'AVVISO DELLA PRESA — adesso dice cosa fare, prima diceva cosa era
     successo.
     Diceva «I lavori si sfogliano con le frecce», e il ragionamento che lo
     difendeva aveva ragione su una cosa vera: «Usa le frecce» e' un ordine, e
     un ordine a chi non ha sbagliato niente suona come un rimprovero — mentre
     spiegare quello che e' appena successo risponde a una domanda invece di
     assegnare un compito. Quella parte resta, e infatti nemmeno la frase nuova
     comincia con un verbo che accusa.
     Cio' che mancava e' che le domande erano due. «Perche' la pagina si e'
     fermata?» aveva risposta; «e adesso come ne esco?» no. In una pastiglia che
     vive due secondi e mezzo pesa la seconda, perche' e' la sola che si
     trasforma in un gesto — e nel frattempo la frase mandava a cercare con gli
     occhi due frecce, mentre la mano era gia' appoggiata sul comando giusto.
     Adesso sono due istruzioni brevi separate da un punto in mezzo: cosa fa il
     gesto che si sta gia' facendo, e cosa fare per andarsene (vedi `insiste()`
     in `ui/Vetrina.ts`). Resta corta perche' la pastiglia e' `white-space:
     nowrap` e non ha una regola per lo schermo stretto: una riga che non va a
     capo, se cresce, esce dallo schermo da tutte e due le parti.
     Sta in un elemento con `role="status"`, quindi un lettore di schermo lo
     annuncia quando compare senza rubare il fuoco. */
  frecceAvviso: { it: 'Scorri per sfogliare · due volte per uscire', en: 'Scroll to browse · twice to move on' },

  // ----------------------------------------------------------------- rotaia
  tappaEsterno: { it: 'ESTERNO', en: 'OUTSIDE' },
  tappaSuperficie: { it: 'SUPERFICIE', en: 'SURFACE' },
  tappaAvvicinamento: { it: 'AVVICINAMENTO', en: 'APPROACH' },
  tappaOttica: { it: 'OTTICA', en: 'OPTIC' },
  tappaAbitacolo: { it: 'ABITACOLO', en: 'COCKPIT' },
  tappaCorsa: { it: 'CORSA', en: 'DRIVE' },
  tappaContatto: { it: 'CONTATTO', en: 'CONTACT' },

  // ----------------------------------------------------------------- comandi

  vociFinitura: { it: 'FINITURA', en: 'FINISH' },
  vociLuogo: { it: 'LUOGO', en: 'PLACE' },
  finituraNero: { it: 'NERO SATINATO', en: 'SATIN BLACK' },
  finituraBianco: { it: 'BIANCO PERLA', en: 'PEARL WHITE' },
  finituraArancio: { it: 'ARANCIO', en: 'ORANGE' },
  finituraCarbonio: { it: 'CARBONIO', en: 'CARBON' },
  vistaVilla: { it: 'VILLA', en: 'VILLA' },
  vistaPiscina: { it: 'PISCINA', en: 'POOL' },
  vistaTramonto: { it: 'TRAMONTO', en: 'SUNSET' },
  vistaCorte: { it: 'CORTE', en: 'COURT' },
  comandiEtichetta: { it: 'Finitura e inquadratura', en: 'Finish and framing' },

  // ------------------------------------------------------------------ spina
  spinaHero: { it: 'REAL-TIME / 01', en: 'REAL-TIME / 01' },
  spinaHeroDida: { it: 'CAR ASSET', en: 'CAR ASSET' },
  spinaOrbita: { it: 'SUPERFICIE / 02', en: 'SURFACE / 02' },
  spinaOrbitaDida: { it: 'SUPERFICIE', en: 'SURFACE' },
  spinaOrbitaCoda: { it: 'CALCOLATA, NON FILMATA', en: 'COMPUTED, NOT FILMED' },
  spinaLato: { it: 'ENTRY / 03', en: 'ENTRY / 03' },
  spinaLatoCoda: { it: 'IL PUNTO DA CUI SI ENTRA', en: 'THE POINT YOU ENTER FROM' },
  spinaTaglio: { it: 'DEPTH / 04', en: 'DEPTH / 04' },

  // ------------------------------------------------- il documento e il ripiego
  //
  // Sono le stesse parole della pagina statica. Stanno qui e non in due file
  // HTML perche' la pagina di ripiego e quella dell'esperienza sono UN blocco
  // di contenuto usato in due stati: duplicarlo per la lingua avrebbe
  // riportato dentro esattamente il problema che quel blocco esiste per non
  // avere.
  docTitolo: {
    it: 'Siti che non si guardano. Si attraversano.',
    en: 'Sites you don’t look at. You go through.',
  },
  docOcchiello: {
    it: 'Giuseppe Villani — Freelance Creative Developer',
    en: 'Giuseppe Villani — Freelance Creative Developer',
  },
  docStudio1: {
    it: 'VELOCITY esplora come 3D realtime, movimento e interfaccia possano vivere nello stesso spazio: non una pagina con delle animazioni sopra, ma uno spazio in cui si entra, governato dallo scorrimento di chi guarda.',
    en: 'VELOCITY explores how real-time 3D, motion and interface can live in the same space: not a page with animations on top, but a space you enter, driven by the reader\u2019s own scrolling.',
  },
  docStudio2: {
    it: 'Questa pagina esiste in due forme. Quella completa \u00e8 una scena in tre dimensioni calcolata mentre la si guarda — si gira intorno a un\u2019automobile, si entra dentro un gruppo ottico, si esce dall\u2019altra parte alla guida. Quella che stai leggendo \u00e8 la stessa cosa detta a parole, e c\u2019\u00e8 perch\u00e9 un\u2019esperienza che si pu\u00f2 avere in un modo solo non \u00e8 un lavoro finito.',
    en: 'This page exists in two forms. The full one is a three-dimensional scene computed while you watch it — you circle a car, you go inside a headlight, you come out the other side driving. The one you are reading is the same thing said in words, and it exists because an experience you can only have one way is not finished work.',
  },
  /* IL METODO — le voci della sezione STUDIO.
     Vanno qui e non nel solo HTML per la ragione di sempre: `applica()` scrive
     `textContent` su ogni `[data-t]`, quindi un paragrafo senza chiave in
     inglese resta in italiano e nessuno se ne accorge finche' non lo legge un
     inglese. */
  docMetodoTitolo: { it: 'Il metodo', en: 'The method' },
  docMetodo1: {
    it: 'Non si dichiara niente che non sia stato misurato.',
    en: 'Nothing is claimed here that has not been measured.',
  },
  docCifra1t: { it: 'Fairness della carrozzeria', en: 'Body surface fairness' },
  docCifra1d: { it: 'residuo da fit quadrico locale, −49%', en: 'local quadric-fit residual, −49%' },
  docCifra2t: { it: 'La carrozzeria completa', en: 'The complete body' },
  docCifra2d: { it: '106.736 triangoli, compressi con meshopt', en: '106,736 triangles, meshopt-compressed' },
  docCifra3t: { it: 'Metriche costruite e buttate', en: 'Metrics built and thrown away' },
  docCifra3d: { it: 'perché misuravano rumore, non forma', en: 'because they measured noise, not shape' },
  /* IL DIFETTO CHE TORNA — vedi «#studio» in `index.html`. Il testo italiano
     sta in due posti (qui e nel documento) ed e' la stessa famiglia di difetto
     della lista dei lavori: due copie della stessa frase da tenere allineate a
     mano finche' non sara' generata. */
  docFamigliaTitolo: {
    it: 'Un criterio non separa due popolazioni che condividono un valore',
    en: 'A criterion cannot separate two populations that share a value',
  },
  docFamiglia1: {
    it: 'Una maschera doveva distinguere la carrozzeria dal riempimento delle isole di texture. Il riempimento è rosso pieno; il vetro ha ruvidità zero e metallico zero — cioè la stessa identica firma. La maschera li ha scambiati e ha murato vetro e cromo, portando la frazione a bassa ruvidità dal 17,9 al 4,0 per cento. Il criterio era corretto per il novanta per cento dei texel e falso per quelli che contavano.',
    en: 'A mask had to tell bodywork apart from the padding that fills texture islands. The padding is pure red; glass has zero roughness and zero metalness — the very same signature. The mask confused them and walled up glass and chrome, dropping the low-roughness fraction from 17.9 to 4.0 per cent. The criterion was right for ninety per cent of the texels and false for the ones that mattered.',
  },
  docFamiglia2: {
    it: 'Cercando il sole dentro il panorama per il pulsante «tramonto», due misure indipendenti hanno dato due risposte precise e diverse: 74 gradi e 45 gradi. Poi ho guardato la striscia dell’orizzonte, dieci secondi di lavoro, e non aveva ragione nessuna delle due: il caldo che stavo misurando era l’interno illuminato della villa. In quella fotografia un sole non c’è. «Caldo» non distingue un tramonto da una lampadina.',
    en: 'Hunting for the sun inside the panorama for the “sunset” button, two independent measurements gave two precise and different answers: 74 degrees and 45 degrees. Then I looked at the horizon strip — ten seconds of work — and neither was right: the warmth I was measuring was the villa’s lit interior. That photograph has no sun in it. “Warm” does not tell a sunset from a light bulb.',
  },
  docFamiglia3: {
    it: 'Uno strumento che cerca il peso morto dentro la cartella pubblica dava 7.824 kB e stava per farmi cancellare l’immagine delle anteprime sociali: quella non la chiede mai la pagina, la leggono i crawler. «Mai chiesto» non vuol dire «inutile». Adesso i criteri sono due, indipendenti, e lo strumento dichiara quello che non sa invece di decidere.',
    en: 'A tool looking for dead weight inside the public folder reported 7,824 kB and was about to make me delete the social preview image: the page never requests that one, crawlers read it. “Never requested” does not mean “useless”. Now there are two independent criteria, and the tool declares what it does not know instead of deciding.',
  },
  docNumeroGiusto: {
    it: 'Una misura giusta può portare a una conclusione sbagliata, e non se ne accorge nessuno perché il numero è vero.',
    en: 'A correct measurement can lead to a wrong conclusion, and nobody notices because the number is true.',
  },
  docNumeroGiusto2: {
    it: 'I cerchi della ruota anteriore non si vedevano; quelli posteriori sì. Ho misurato la luminanza dei due riquadri — 25 contro 50 — e concluso che davanti mancava luce. Ho speso quattro giri a cercarla: rifatto il materiale, contate le razze, cambiato il raggio della cavità, spenta una sorgente per volta. Era la minigonna del sottoscocca, che passava davanti al passaruota e copriva mezza ruota. Nell’ingrandimento c’è un taglio orizzontale netto: un bordo dritto non è un’ombra, è un poligono. La misura aveva finito il suo lavoro dicendo CHE le due erano diverse; il PERCHÉ si vedeva, e vedere costava dieci secondi.',
    en: 'The front wheel’s spokes were invisible; the rear ones were not. I measured the luminance of both areas — 25 against 50 — and concluded the front was short of light. I spent four rounds looking for it: remade the material, counted the spokes, changed the cavity radius, switched off one source at a time. It was the underbody skirt, running across the wheel arch and covering half the wheel. In the close-up there is a hard horizontal cut: a straight edge is not a shadow, it is a polygon. The measurement had done its job by saying THAT the two were different; the WHY was visible, and looking cost ten seconds.',
  },
  docMetodo2: {
    it: 'Chiunque può costruire una metrica. La parte difficile è buttarla quando smette di reggere. Il conteggio delle ondulazioni per vertice dava sempre lo stesso numero su qualunque modello, anche dopo aver spostato i vertici di nove millimetri: era un pavimento di rumore, non una misura. Una maschera che doveva leggere i pixel della vettura leggeva il vuoto intorno, e dava numeri plausibili per ore. Un misuratore non era ripetibile: tre esecuzioni identiche davano scuri al 27, al 57 e al 37 per cento.',
    en: 'Anyone can build a metric. The hard part is throwing it away when it stops holding. Counting normal ripples per vertex returned the same number on every model, even after moving the vertices by nine millimetres: it was a noise floor, not a measurement. A mask meant to read the car’s pixels was reading the empty space around them, and gave plausible numbers for hours. One measuring tool was not repeatable: three identical runs reported 27%, 57% and 37% dark pixels.',
  },
  docFig1: {
    it: 'A sinistra, la fiancata con le mappe come sono uscite dal generatore: un arco che disegna il passaruota, una macchia a metà fianco, una cucitura dietro. A destra, le stesse mappe dopo un passa-alto e una maschera locale. Il segno non era un rilievo: era dipinto nell’albedo, e l’ho scoperto solo spegnendo una mappa alla volta.',
    en: 'Left, the flank with the maps as the generator produced them: an arc drawing the wheel arch, a blotch mid-panel, a seam behind. Right, the same maps after a high-pass and a local mask. The mark was not relief — it was painted into the albedo, and I only found that by switching off one map at a time.',
  },
  docFig2: {
    it: 'A sinistra la ruota generata: 28.700 triangoli, e una circonferenza che non è una circonferenza. A destra la ruota costruita in codice. Una carrozzeria è superficie libera e non si scrive a mano; una ruota è un solido di rivoluzione — è fatta di cerchi, e un cerchio scritto in codice è esatto per costruzione. Pesa 297 kB in meno.',
    en: 'Left, the generated wheel: 28,700 triangles, and a circle that is not a circle. Right, the wheel built in code. A car body is free-form surface and you do not write it by hand; a wheel is a solid of revolution — it is made of circles, and a circle written in code is exact by construction. It weighs 297 kB less.',
  },
  docMetodo3: {
    it: 'Le trappole che costano davvero non danno errore. Un materiale con anisotropia senza tangenti compila e non disegna: la scena diventa nera in silenzio, e il primo sintomo è una statistica perfettamente formata. Una mappa di occlusione legge un secondo insieme di coordinate che il modello non ha, e semplicemente non compare. Un compressore di geometrie butta i nomi delle mesh anche quando gli si chiede di tenerli. Ognuna di queste è costata ore, e ognuna è scritta nel repository con il numero che l’ha smascherata.',
    en: 'The traps that really cost you do not raise errors. A material with anisotropy but no tangents compiles and draws nothing: the scene goes black in silence, and the first symptom is a perfectly formed statistic. An occlusion map reads a second UV set the model does not have, and simply never appears. A geometry compressor drops mesh names even when told to keep them. Each of these cost hours, and each is written down in the repository together with the number that exposed it.',
  },
  docLavori: { it: 'Lavori', en: 'Work' },
  /* LA FRASE NON CONTA PIU', E NON E' UNA RINUNCIA.
     Diceva «Un lavoro solo, e ci sei dentro» quando il portfolio ne aveva uno.
     Poi ne ha avuti dieci e la frase e' rimasta li' a mentire — la stessa
     divergenza della lista, che infatti si e' risolta generandola.
     Il primo rimedio e' stato far generare anche QUESTA frase al plugin, con
     il conteggio dentro. Sbagliato due volte: la sostituzione prendeva il
     primo `statica__forte` che capitava — cioe' il motto del progetto, in
     tutt'altra sezione — e una frase generata non puo' avere una chiave di
     traduzione, perche' `applica()` la riscriverebbe dal dizionario
     annullando la generazione.
     La cura giusta e' togliere il numero dalla frase. Il conteggio sta gia'
     nell'elenco sotto, che e' generato: una frase che non conta non puo'
     divergere da niente. */
  docLavoriForte: {
    it: 'Ogni lavoro è una macchina diversa: la meccanica cambia con quello che deve raccontare.',
    en: 'Each piece of work is a different machine: the mechanics change with what it has to tell.',
  },
  docQuestoSito: { it: '2026 — questo sito', en: '2026 — this site' },
  docInLavorazione: { it: 'in lavorazione', en: 'in progress' },
  /* LA CODA NON PARLA PIU' DI «TRE OTTICHE», che erano tre quando i lavori
     erano uno. Adesso sono dieci e l'elenco sopra e' generato da `Lavori.ts`,
     quindi una frase che conta le cose si rompe da sola al primo lavoro nuovo.
     Questa non conta niente e dice la cosa che serve sapere. */
  docLavoriCoda: {
    it: 'Quasi tutti sono dimostrazioni, e lo dichiarano: mostrarli senza dirlo sarebbe l\u2019unica cosa non vera del sito.',
    en: 'Almost all of them are demonstrations, and they say so: showing them without saying it would be the only untrue thing on this site.',
  },
  docContatto: { it: 'Contatto', en: 'Contact' },
  docDomanda: { it: 'Dove andiamo da qui?', en: 'Where do we go from here?' },
  docIndirizzoVuoto: { it: 'Indirizzo da definire.', en: 'Address to be defined.' },
  docDidascalia: {
    it: 'La prima inquadratura dell\u2019esperienza, renderizzata dalla stessa scena in tre dimensioni.',
    en: 'The opening shot of the experience, rendered from the same three-dimensional scene.',
  },
  docForza: { it: 'Carica comunque l\u2019esperienza completa', en: 'Load the full experience anyway' },
  docVersioneStatica: { it: 'Versione statica: ', en: 'Static version: ' },
  descrizione: {
    it: 'Siti che non si guardano: si attraversano. Esperienze WebGL in tempo reale, movimento e codice come un unico ambiente.',
    en: 'Sites you do not look at: you drive through them. Real-time WebGL experiences where motion and code are a single environment.',
  },

  // ----------------------------------------------------------------- finale
  }

/** la frase, nella lingua corrente */
export function t(chiave: keyof typeof D): string {
  return D[chiave][lingua()]
}

/**
 * APPLICA LA LINGUA AL DOCUMENTO, e va chiamata prima di ogni altra cosa.
 *
 * Riempie ogni elemento che porta `data-t` con la frase corrispondente, mette
 * `lang` sulla radice e aggiorna la descrizione per i motori di ricerca.
 *
 * `data-t` E NON DUE BLOCCHI NASCOSTI. La strada alternativa era scrivere
 * tutte e due le versioni nell'HTML e nasconderne una con il foglio di stile.
 * Sembra piu' semplice e ha due difetti veri: un lettore di schermo che ignora
 * `display: none` legge il sito due volte, e un motore di ricerca trova la
 * stessa pagina in due lingue nello stesso indirizzo — che e' il modo classico
 * di farsi declassare per contenuto duplicato.
 *
 * `lang` SULLA RADICE NON E' UN DETTAGLIO: e' quello che dice alla sintesi
 * vocale come pronunciare. Una pagina in inglese dichiarata `lang="it"` viene
 * letta da un lettore di schermo italiano con la pronuncia italiana, ed e'
 * incomprensibile.
 */
export function applicaLingua() {
  const l = lingua()
  document.documentElement.lang = l
  for (const e of document.querySelectorAll<HTMLElement>('[data-t]')) {
    const k = e.dataset.t
    if (k && D[k]) e.textContent = D[k][l]
  }
  const meta = document.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', D.descrizione[l])
}
