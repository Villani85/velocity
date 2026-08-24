import type { Beat, Regia } from '../core/Regia'
import { t } from './Lingua'
import { scriviCustom, scriviNumero } from '../core/Custom'

/**
 * LE VOCI — la narrazione.
 *
 * PERCHE' IL SITO NE HA BISOGNO.
 *
 * Senza, questo e' una demo: un'auto, una camera che gira, un effetto.
 * Bello e muto. Un pezzo di portfolio deve dire che cosa sai fare, e
 * dirlo con la cosa stessa che sta facendo — non in una pagina "chi sono"
 * dall'altra parte del menu.
 *
 * LA TESI, e si regge sull'arco che c'e' gia':
 *
 *   Un sito non e' l'immagine di una cosa.
 *   E' una macchina in cui si entra e che si guida.
 *
 * Il percorso la dimostra invece di enunciarla: si gira intorno a una
 * superficie finche' non si capisce che la superficie non basta, si entra,
 * si accende, si guida. Le voci non spiegano quello che si vede — dicono
 * l'altra meta', quella sul mestiere.
 *
 * STANNO NEL DOM, NON IN WEBGL.
 *
 * Il documento resta un documento: si legge con uno screen reader, lo
 * indicizza un motore di ricerca, si seleziona con il mouse, si traduce.
 * Il WebGL e' l'esperienza, non il contenuto. E' la separazione che ha
 * retto nel progetto precedente, ed e' anche l'unica onesta: un sito il
 * cui testo esiste solo dentro una texture non e' un sito, e' un video.
 *
 * LA TIPOGRAFIA E' GRANDE PER UN MOTIVO PRECISO.
 *
 * Il riferimento che mi hai dato — una landing di ville — ha impatto non
 * per la fotografia ma per il RAPPORTO: immagine a tutto campo, titolo
 * enorme che non chiede permesso, e una riga fitta di dati che fa da
 * contrappeso. Sono tre pesi diversi nello stesso fotogramma. Un titolo
 * timido sopra una scena 3D produce l'effetto opposto: sembra una
 * didascalia appiccicata a un salvaschermo.
 *
 * SUL TELEFONO IL PROBLEMA NON ERA IL CORPO. E l'ho scoperto misurando.
 *
 * La convinzione di partenza era che il titolo fosse tarato sul desktop e
 * andasse rimpicciolito. `strumenti/tipografia.mjs` dice un'altra cosa: a
 * 390x844 il titolo sta a 41px, due righe, il 10,5% dell'altezza. Non e'
 * grande. Grande era il BLOCCO, e per una ragione che non ha niente a che
 * fare con la tipografia: la fila dei dati resta in flusso e fuori dalla
 * hero veniva solo portata a opacita' 0, lasciando ~110px di ingombro
 * vuoto che spingevano titolo e riga verso l'alto, cioe' addosso al
 * soggetto. Nel provino di `accensione` il titolo cadeva sul volante
 * mentre gli ultimi 200px dello schermo erano neri e vuoti.
 *
 * Da qui la sola cosa che questo file deve fare per l'impaginato del
 * telefono: DIRE IN CHE TEMPO SIAMO, con `data-tempo` sulla radice. Il
 * resto e' in `stile.css`, dov'e' il suo posto.
 */

export type Voce = {
  occhiello: string
  titolo: string
  riga?: string
  /** da 0 a 1 dentro il beat: quando compare e quando se ne va */
  entra?: number
  esce?: number

  /**
   * DA CHE PARTE STA IL TESTO, e perche' e' un dato del racconto e non del
   * foglio di stile.
   *
   * Il testo deve stare dove non c'e' il soggetto, e dove non c'e' il soggetto
   * cambia a ogni tempo: nella hero l'automobile e' al centro-destra e la meta'
   * libera e' la sinistra — ma la piscina arriva fin li' e la scheda ci finiva
   * sopra, quindi il posto vero e' la terrazza a destra. Nell'orbita la
   * vettura e' frontale e centrale e le meta' si equivalgono.
   *
   * Non e' automatizzabile in modo onesto: si potrebbe misurare il riquadro del
   * soggetto sullo schermo e scegliere la meta' piu' vuota, ma il risultato
   * sarebbe un blocco di testo che SALTA da una parte all'altra durante lo
   * scorrimento, che e' peggio di qualunque sovrapposizione. Si dichiara.
   */
  lato?: 'sinistra' | 'destra'

  /**
   * SE IL TESTO HA UN RIQUADRO SOTTO.
   *
   * Ce l'ha solo la hero, e la ragione la ha detta il committente guardando il
   * sito: «i riquadri vanno bene solo nella parte iniziale, poi coprono».
   *
   * E' giusto, e il motivo e' che i due momenti chiedono cose opposte. La hero
   * e' un ARRIVO: si guarda un'immagine ferma, il titolo e' il primo testo del
   * sito, e un riquadro di vetro gli da' peso e lo separa dalla fotografia —
   * e' il «doppio bordo» dei riferimenti. Da li' in poi ci si MUOVE: la scena
   * cambia a ogni fotogramma, e un rettangolo fermo sopra una cosa che si
   * muove diventa un ostacolo, un pezzo di interfaccia appiccicato davanti al
   * racconto.
   *
   * Senza riquadro il testo si regge sui suoi mezzi — l'ombra portata, il
   * filetto che cresce, le righe che salgono da dietro la mascherina — che
   * sono tutti effetti di MOVIMENTO, cioe' della stessa natura di cio' che
   * c'e' sotto.
   */
  riquadro?: boolean

  /**
   * COME ENTRA IL TESTO — uno diverso per ogni voce.
   *
   * «Ogni testo che appare, un effetto differente». La richiesta e' giusta e
   * la ragione e' che questi cinque momenti non dicono la stessa cosa: uno
   * apre, uno gira intorno, uno risucchia dentro, uno accende, uno corre. Un
   * unico modo di entrare li appiattirebbe tutti sullo stesso tono, e a quel
   * punto tanto varrebbe non animarli.
   *
   * La regola che tiene insieme i cinque: OGNUNO IMITA QUELLO CHE FA LA
   * CAMERA in quel tempo. Non sono cinque effetti scelti da un elenco, sono la
   * stessa cosa che succede alla scena, applicata alle lettere. E' anche il
   * motivo per cui nessuno di loro e' legato al puntatore — si muovono tutti
   * sullo scorrimento, come tutto il resto.
   *
   *   taglio      un taglio di luce attraversa le lettere e le accende: e' il
   *               faro, che e' il soggetto di tutto il sito
   *   giro        le righe arrivano ruotate e si mettono in piano, mentre la
   *               vettura gira
   *   risucchio   il testo arriva da lontano e viene tirato dentro, come la
   *               camera dentro l'ottica
   *   avvio       si accende a scatti, come una strumentazione all'avviamento
   *   scia        arriva sfilacciato dalla velocita' e si ricompone
   */
  effetto?: 'taglio' | 'giro' | 'risucchio' | 'avvio' | 'scia'
}

/**
 * I TESTI SONO DA RISCRIVERE, e lo dico qui perche' resti scritto.
 * Servono a fissare il ritmo, la lunghezza e i punti d'appoggio: quante
 * parole regge un beat, dove cade il silenzio, quale frase deve arrivare
 * mentre la camera fa cosa. La sostanza e' quella; le parole sono tue.
 */
export const VOCI: Partial<Record<Beat, Voce>> = {
  hero: {
    occhiello: t('heroOcchiello'),
    // TRE RIGHE MAIUSCOLE, e la terza e' quella che porta il senso.
    //
    // «Non progetto pagine» diceva cosa NON si fa, e per capire cosa si fa
    // bisognava arrivare al sommario. Questa dice la stessa tesi in positivo e
    // la chiude sull'unica parola che descrive il sito: attraversare. E' anche
    // la parola che il sito poi esegue, entrando dentro il faro.
    titolo: t('heroTitolo'),
    effetto: 'taglio',
    riga: t('heroRiga'),
    // a destra c'e' la terrazza vuota; a sinistra la piscina arriva sotto la
    // vettura e la scheda le finiva sul muso
    lato: 'destra',
    riquadro: true,
    esce: 0.74,
  },
  orbita: {
    occhiello: t('orbitaOcchiello'),
    // A DESTRA: l'angolo in basso a sinistra e' della spina tecnica, che ci
    // sta in tutti i tempi in cui l'automobile e' in campo. Due blocchi nello
    // stesso angolo si pestano, e nel provino «27.6 MS» finiva dentro «Puoi
    // girarci intorno».
    lato: 'destra',
    titolo: t('orbitaTitolo'),
    effetto: 'giro',
    riga: t('orbitaRiga'),
    entra: 0.08,
    esce: 0.70,
  },
  lato: {
    occhiello: t('latoOcchiello'),
    // A DESTRA: l'angolo in basso a sinistra e' della spina tecnica, che ci
    // sta in tutti i tempi in cui l'automobile e' in campo. Due blocchi nello
    // stesso angolo si pestano, e nel provino «27.6 MS» finiva dentro «Puoi
    // girarci intorno».
    lato: 'destra',
    titolo: t('latoTitolo'),
    effetto: 'risucchio',
    riga: t('latoRiga'),
    entra: 0.10,
    esce: 0.64,
  },
  // 'taglio' non ha voce, ed e' una scelta: il fotogramma li' e' chiuso e
  // il racconto deve tacere. Una scritta su un nero e' l'unica cosa che
  // farebbe accorgere del taglio.
  accensione: {
    occhiello: t('accensioneOcchiello'),
    // A DESTRA: il quadro sta a sinistra del centro, dov'e' il posto di
    // guida, e il testo in basso a sinistra ci finiva sopra
    lato: 'destra',
    titolo: t('accensioneTitolo'),
    effetto: 'avvio',
    riga: t('accensioneRiga'),
    entra: 0.12,
    esce: 0.72,
  },
  velocita: {
    occhiello: t('velocitaOcchiello'),
    // A DESTRA: il quadro sta a sinistra del centro, dov'e' il posto di
    // guida, e il testo in basso a sinistra ci finiva sopra
    lato: 'destra',
    titolo: t('velocitaTitolo'),
    effetto: 'scia',
    riga: t('velocitaRiga'),
    entra: 0.12,
  },
  /* IL SETTIMO TEMPO NON HA UNA VOCE QUI, e per la seconda volta.
     Prima aveva un blocco centrato a corpo enorme, bocciato. Poi e' tornato
     in questa forma, come gli altri sei. Adesso non c'e' di nuovo, e stavolta
     non e' un ripensamento: e' che il finale ha una regia sua — la volante
     ferma l'automobile e chiede i documenti — e parla con la sua voce, che
     alterna l'intimazione monospaziata alla voce di casa. Vedi
     `ui/Controllo.ts`. Due blocchi di testo nello stesso istante si
     dimezzerebbero, come la fascia tecnica e la spina prima di loro. */
}

/** i dati in basso: il contrappeso al titolo, come nel riferimento */
/**
 * I DATI IN BASSO — e uno era FALSO.
 *
 * Diceva «ASSET 1,2 MB». Il primo blocco vero pesa circa cinque megabyte:
 * l'auto a parti fa 3,0, il faro 64 kB, il cielo HDR 1,1, piu' le pietre e il
 * marmo. Il numero era rimasto da quando in scena c'erano due scatole grigie.
 *
 * E' la firma d'apertura di un portfolio da sviluppatore, letta da gente che
 * apre il pannello di rete per vedere se e' vero. Su un sito che mette la
 * PRESTAZIONE dentro la dimostrazione — e' il terreno su cui si sfida
 * `thewatch.60fps.fr`, che dichiara nove megabyte nel dominio — un dato di
 * prestazione falso fa piu' danno che nessun dato.
 *
 * Quindi si dichiara cio' che si puo' difendere: i sessanta fotogrammi al
 * secondo sono misurati (`strumenti/fps.mjs`), il peso e' arrotondato per
 * eccesso, e nessuno dei due e' un'aspirazione.
 */
/*
 * LA FASCIA TECNICA IN FONDO E' STATA TOLTA, e il giro completo vale la pena
 * di essere raccontato perche' e' finito dov'era cominciato.
 *
 * Prima diceva «SCENE 6», «ASSET ~5 MB», «60 FPS misurati». Numeri veri e
 * comunque sbagliati: dicono qualcosa solo a chi il mestiere lo fa gia'. Li ho
 * sostituiti con tre gruppi senza cifre — DISCIPLINA, STACK, FOCUS — che
 * dicevano cosa si fa invece di quanto.
 *
 * Poi e' arrivata la scheda ancorata all'automobile, che dice le stesse cose
 * ma RIFERITE A UN OGGETTO che si sta guardando: «2.9 MB · modello · WebGL ·
 * Three.js». A quel punto la fascia era la stessa informazione senza il suo
 * referente, e due elementi che dicono la stessa cosa non si rafforzano: si
 * indeboliscono a vicenda.
 *
 * La regola che ne esce: un dato vale se e' attaccato a qualcosa che si vede.
 * Staccato, e' arredamento a forma di dato.
 */

/**
 * DOVE STA IL TESTO, in coordinate di tessitura (y in su, come in OpenGL).
 *
 * PERCHE' UN OGGETTO CONDIVISO E NON UNA LETTURA A OGNI FOTOGRAMMA.
 *
 * Lo shader del grading ha bisogno di sapere dove cadono le lettere per
 * comprimere il fondo solo li' sotto (vedi `post/Grado.ts`). Chiedere il
 * rettangolo al DOM sessanta volte al secondo vorrebbe dire sessanta
 * ricalcoli di impaginazione forzati al secondo, dentro il ciclo di disegno:
 * e' il modo classico di trasformare una correzione grafica in un problema di
 * prestazioni.
 *
 * Il rettangolo pero' cambia solo quando cambia il tempo o la finestra —
 * cioe' sette volte in tutto il sito, piu' i ridimensionamenti. Si misura li',
 * si scrive qui, e chi disegna legge quattro numeri gia' pronti.
 *
 * `forza` invece cambia a ogni fotogramma, ma e' la presenza del testo, che
 * `Voci` ha gia' in mano: non costa nessuna lettura.
 */
export const RIQUADRO_TESTO = { x0: 0, y0: 0, x1: 0, y1: 0, forza: 0 }

export class Voci {
  private radice: HTMLElement
  private occhiello: HTMLElement
  private titolo: HTMLElement
  private riga: HTMLElement
  private inviti: HTMLElement
  private beatCorrente: Beat | null = null

  constructor(dentro: HTMLElement = document.body) {
    this.radice = document.createElement('div')
    this.radice.className = 'voci'
    this.radice.innerHTML =
      '<p class="voci__occhiello"></p>' +
      '<h1 class="voci__titolo"></h1>' +
      '<p class="voci__riga"></p>' +
      // I DUE INVITI STANNO NEL BLOCCO DEL TESTO e non in giro per la pagina:
      // sono la fine della stessa frase — chi ha letto il titolo e il sommario
      // sa gia' cosa fare dopo, e trovare il pulsante da un'altra parte
      // significa doverlo cercare.
      //
      // `hidden` di partenza: compaiono solo nella hero. Un invito a esplorare
      // ripetuto a ogni tempo diventa una barra fissa, cioe' arredamento.
      '<p class="voci__inviti" hidden>' +
        '<a class="invito invito--pieno" href="#lavori">' + t('heroInvito') + ' <span aria-hidden="true">&#8599;</span></a>' +
        // UN INVITO SOLO, e il secondo se n'e' andato per due ragioni che
        // vanno nella stessa direzione. La prima: due pulsanti affiancati sono
        // due prime scelte, cioe' nessuna prima scelta. La seconda: «PARLIAMO
        // DEL PROGETTO» diceva la stessa cosa che dice «CONTATTO» nella
        // navigazione, tre centimetri piu' in su. Un'azione ripetuta due volte
        // nello stesso fotogramma non raddoppia le probabilita' che venga
        // fatta: dimezza il peso di entrambe le copie.
      '</p>'
    dentro.appendChild(this.radice)

    // LA FASCIA TECNICA E LO «SCORRI» SONO STATI TOLTI, ed e' il tipo di
    // decisione che vale piu' di quella che li aveva messi.
    //
    // Non erano brutti: erano DOPPIONI. La fascia diceva «STACK — WebGL ·
    // Three.js» e la scheda ancorata all'automobile dice la stessa cosa a
    // trenta centimetri di distanza, ma riferita a un oggetto invece che
    // all'aria. Lo «scorri» diceva che si puo' scorrere, e la rotaia a sinistra
    // lo dice mostrando dove si e' arrivati — che e' la stessa informazione
    // piu' una.
    //
    // Quando due elementi dicono la stessa cosa non se ne rafforza nessuno:
    // si dimezza il peso di entrambi, e la pagina comincia a sembrare piena
    // invece che progettata.

    this.occhiello = this.radice.querySelector('.voci__occhiello')!
    this.titolo = this.radice.querySelector('.voci__titolo')!
    this.riga = this.radice.querySelector('.voci__riga')!
    this.inviti = this.radice.querySelector('.voci__inviti')!
  }

  private presenzaScritta = ''
  private daRimisurare = true
  private larghezzaVista = 0
  private altezzaVista = 0

  /**
   * MISURA DOVE CADONO DAVVERO LE LETTERE.
   *
   * Non la scatola del blocco: le lettere. Dal quinto tempo in poi il testo e'
   * allineato a destra e occupa un terzo della sua scatola — prendere la
   * scatola vorrebbe dire comprimere due terzi di parabrezza vuoto, che e'
   * esattamente lo sbaglio che ha fatto sbagliare anche il primo giro di
   * `strumenti/stacco.mjs`.
   *
   * Un `Range` sul contenuto da il rettangolo vero, qualunque cosa faccia
   * l'allineamento. Si prende l'unione di titolo e paragrafo, perche' il fondo
   * sotto il paragrafo conta quanto quello sotto il titolo.
   */
  private misuraRiquadro() {
    this.daRimisurare = false
    this.larghezzaVista = window.innerWidth
    this.altezzaVista = window.innerHeight
    const W = this.larghezzaVista, A = this.altezzaVista
    if (!W || !A) return

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const n of this.radice.querySelectorAll('.mascherina, .voci__riga')) {
      /* SI PRENDE L'ELEMENTO PIU' INTERNO, e non la mascherina.
         La mascherina e' `display: block`: un Range sul suo contenuto restituisce
         la LINE BOX, che e' larga quanto la colonna anche quando dentro ci sono
         tre lettere. Misurato: al beat `velocita` sia il blocco sia le due
         righe davano 861..1309, cioe' lo stesso identico rettangolo — segno che
         non stavo misurando il testo. L'elemento interno invece e' in linea, e
         il suo rettangolo e' quello delle lettere. */
      const g = document.createRange()
      g.selectNodeContents(n.querySelector('i') ?? n)
      const r = g.getBoundingClientRect()
      if (r.width < 8 || r.height < 4) continue
      x0 = Math.min(x0, r.left); x1 = Math.max(x1, r.right)
      y0 = Math.min(y0, r.top); y1 = Math.max(y1, r.bottom)
    }
    if (!(x1 > x0)) { RIQUADRO_TESTO.forza = 0; return }

    /* UN MARGINE INTORNO, E LARGO QUANTO LA SFUMATURA DELLO SHADER.
     *
     * Non e' un margine estetico: e' aritmetica, e il primo giro l'aveva
     * sbagliata. Lo shader sfuma il riquadro su 0,075 di schermo (vedi
     * `post/Grado.ts`), quindi sul BORDO del riquadro la compressione vale
     * meta'. Con un margine di sei centesimi la sfumatura arrivava ancora al
     * settantanove per cento sotto la prima lettera della riga — e infatti la
     * misura non scendeva: 119 punti diventavano 68 invece dei 45 attesi.
     * Allargando il riquadro di quanto e' larga la sfumatura, la compressione
     * arriva a piena forza esattamente dove cominciano le lettere, e la
     * sfumatura sta tutta FUORI, dove non c'e' niente da schiarire. */
    const SFUMA = 0.085
    RIQUADRO_TESTO.x0 = x0 / W - SFUMA
    RIQUADRO_TESTO.x1 = x1 / W + SFUMA
    // in tessitura la y sale, sullo schermo scende: si rovescia qui, una volta
    // sola, invece che dentro lo shader a ogni pixel
    RIQUADRO_TESTO.y0 = 1 - y1 / A - SFUMA
    RIQUADRO_TESTO.y1 = 1 - y0 / A + SFUMA
  }

  aggiorna(regia: Regia) {
    const voce = VOCI[regia.beat]

    // IL TEMPO SI DICHIARA SEMPRE, anche dove non c'e' voce.
    //
    // Sul telefono la fila dei dati sta in FLUSSO sotto il titolo, e deve
    // esistere solo nella hero. Portarla a opacita' 0 non basta: l'ingombro
    // resta, e sono ~110px che spingono titolo e riga verso l'alto, cioe'
    // addosso al soggetto. Serviva quindi un `display: none`, e un
    // `display: none` e' una decisione di impaginazione: sta nel foglio di
    // stile, non qui. Qui si dichiara solo il fatto — in che tempo siamo —
    // e `stile.css` ne trae le conseguenze.
    //
    // Fuori dal blocco che segue perche' quello scatta solo al cambio di
    // beat quando c'e' una voce: con `taglio`, che voce non ha, l'attributo
    // sarebbe rimasto a 'lato' per tutto il beat.
    if (this.radice.dataset.tempo !== regia.beat) {
      this.radice.dataset.tempo = regia.beat
      // il riquadro si rimisura al prossimo fotogramma: adesso il testo nuovo
      // non e' ancora stato impaginato
      this.daRimisurare = true
    }

    if (regia.beat !== this.beatCorrente) {
      this.beatCorrente = regia.beat
      if (voce) {
        this.occhiello.textContent = voce.occhiello
        // IL TITOLO VA A CAPO DOVE LO DECIDO IO: una frase che si spezza da
        // sola cambia forma a ogni larghezza, e il ritmo di lettura con lei.
        // Qui il ritorno a capo e' contenuto, non impaginazione.
        //
        // Il che vale finche' la riga dichiarata CI STA. Se non ci sta il
        // browser la spezza comunque, e allora due righe volute ne diventano
        // tre di cui una spaiata. E' la ragione per cui il corpo sul
        // telefono e' legato anche all'altezza in `stile.css`: la riga piu'
        // lunga di questi testi — «non è la porta.» — misura 67,9% della
        // larghezza a 390px, e da li' in giu' il margine si assottiglia.
        // `text-wrap: balance` e' la rete: se una riga cede, cede in due
        // meta' invece che in una riga piena e una parola sola.
        // OGNI RIGA IN UNA MASCHERINA, e con dentro il suo numero d'ordine.
        //
        // Il `<span>` esterno taglia (`overflow: hidden`), quello interno si
        // muove. E' la comparsa piu' vecchia della tipografia in movimento e
        // resta la migliore: la riga non appare, ENTRA — sale da sotto un
        // bordo che non si vede — e la differenza fra le due cose e' che la
        // prima e' un interruttore e la seconda e' un gesto.
        //
        // `--i` e' il numero della riga, e serve al foglio di stile per farle
        // partire una dopo l'altra. Lo scaglionamento non si scrive in
        // JavaScript con dei ritardi: si ricava dalla stessa `--presenza` che
        // governa tutto il resto, cosi' tornando indietro con lo scorrimento
        // le righe rientrano nell'ordine inverso invece di sparire tutte
        // insieme. Il movimento lo comanda lo scorrimento, sempre.
        this.titolo.innerHTML = voce.titolo
          .split('\n')
          .map((r, i) => `<span class="mascherina" style="--i:${i}"><i>${r}</i></span>`)
          .join('')
        this.riga.textContent = voce.riga ?? ''
        // senza riga il paragrafo resterebbe alto zero ma con il suo
        // margine superiore: un vuoto di venti pixel che nessuno ha chiesto
        // e che sul telefono si somma a tutti gli altri
        this.riga.hidden = !voce.riga
      }
    }

    if (!voce) {
      this.radice.style.setProperty('--presenza', '0')
      this.inviti.hidden = true
      return
    }

    // OPACITA' LEGATA AL PROGRESSO, non a un tempo.
    // Una dissolvenza a tempo va per conto suo mentre lo scorrimento fa
    // altro, e chi torna indietro trova il testo che va avanti da solo.
    // Legandola al progresso il testo e' una funzione dello scorrimento
    // come tutto il resto — quindi torna indietro anche lui.
    // LE DISSOLVENZE SONO LUNGHE, e il numero viene da una misura.
    //
    // Erano 0,10 in entrata e 0,08 in uscita. Il misuratore di continuita'
    // ha segnalato uno stacco a q=0,144 — cinque volte la mediana dei
    // fotogrammi vicini — e non era la camera: era il titolo della prima
    // schermata che spariva in otto centesimi di beat. Un titolo alto cento
    // pixel che se ne va in fretta e' un lampo, e su una scena quasi ferma
    // e' l'unica cosa che si muove.
    //
    // 0,16 e 0,22: il testo se ne va mentre la scena comincia a muoversi,
    // quindi la sua sparizione non e' piu' un evento a se'.
    // CHI NON DICHIARA `entra` E' GIA' IN CAMPO, e non e' un dettaglio.
    //
    // Con entra=0 la dissolvenza d'ingresso parte comunque da zero, quindi
    // la PRIMA SCHERMATA arrivava muta: si apriva il sito e c'era una scena
    // senza una parola, finche' non si scorreva. Il difetto non poteva
    // uscire da nessuna misura — la continuita' vede i passaggi, non
    // l'istante zero — e' venuto fuori aprendo il sito e guardandolo.
    //
    // Il titolo della hero deve esserci prima che si tocchi qualcosa: e'
    // l'unica cosa che dice di che si tratta.
    const esce = voce.esce ?? 1
    const dentro = voce.entra === undefined
      ? 1
      : Math.min(Math.max((regia.locale - voce.entra) / 0.16, 0), 1)
    const fuori = 1 - Math.min(Math.max((regia.locale - esce) / 0.22, 0), 1)
    const p = Math.min(dentro, fuori)
    /* QUESTA STA SU `.voci` E NON SULLA RADICE, quindi invalida solo il blocco
       di testo: si riscrive comunque solo se e' cambiata, ma il danno era
       molto minore. */
    const pp = p.toFixed(3)
    if (pp !== this.presenzaScritta) {
      this.presenzaScritta = pp
      this.radice.style.setProperty('--presenza', pp)
    }
    // i fatti stanno solo nella prima schermata: sono la firma d'apertura,
    // e ripetuti a ogni beat diventerebbero arredamento
    this.inviti.hidden = regia.beat !== 'hero'
    // il lato e il riquadro si scrivono come attributi invece che come stili:
    // il foglio di stile e' il posto dove sta scritto COME si vedono, questo
    // e' il posto dove sta scritto QUALE dei due e'
    const lato = voce.lato ?? 'sinistra'
    this.radice.dataset.lato = lato
    // la sfumatura si accende solo dal lato dove sta il testo, e con la stessa
    // presenza: e' il fondo di quel testo, non un elemento per conto suo
    scriviNumero('--presenzaVelo', p, 3)
    scriviCustom('--veloSx', lato === 'sinistra' ? '1' : '0')
    scriviCustom('--veloDx', lato === 'destra' ? '1' : '0')
    this.radice.dataset.effetto = voce.effetto ?? 'taglio'

    /* E QUI SI PUBBLICA IL RIQUADRO PER LO SHADER.
       La misura si fa solo quando serve — cambio di tempo, cambio di finestra —
       perche' `getBoundingClientRect` dentro il ciclo di disegno costringe il
       browser a rifare l'impaginazione prima di rispondere. La presenza invece
       si scrive sempre: e' un numero che `Voci` ha gia'. */
    if (this.daRimisurare || this.larghezzaVista !== window.innerWidth
      || this.altezzaVista !== window.innerHeight) {
      this.misuraRiquadro()
    }
    RIQUADRO_TESTO.forza = p
  }
}
