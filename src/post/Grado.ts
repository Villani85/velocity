import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { Vector2, Vector4 } from 'three'

/**
 * IL GRADING — l'ultimo passaggio, quello che fa la differenza fra «render»
 * e «fotografia».
 *
 * PERCHE' SERVE, anche con luci e materiali giusti.
 *
 * Nessuna immagine pubblicata esce dalla macchina fotografica come si vede.
 * Fra il sensore e la pagina c'e' sempre un passaggio in cui si decide dove
 * cade il nero, quanto e' duro il contrasto, quanto si spinge la nitidezza.
 * Saltarlo non lascia l'immagine «neutra»: la lascia PIATTA, ed e' uno dei
 * modi in cui un fotogramma si smaschera da solo.
 *
 * Fa sei cose, tutte piccole. La regola qui e' che se una si nota da
 * sola, e' troppo forte.
 *
 * 1. IL PUNTO DI NERO.
 *    Il nero di una scena notturna 3D non e' mai nero: e' un grigio-blu
 *    intorno a 8/255, perche' l'ambiente illumina anche dove non dovrebbe
 *    arrivare niente. Un'immagine senza un vero nero non ha profondita': e'
 *    quella patina sopra tutto che si legge come «velato». Si taglia il
 *    fondo e si riscala il resto, che e' esattamente cio' che fa il cursore
 *    dei livelli.
 *
 * 2. IL CONTRASTO INTORNO A UN PERNO.
 *    Non moltiplicato — moltiplicare schiarisce anche i toni alti e brucia.
 *    Si apre attorno a un perno basso (0,22, che e' il grigio medio di una
 *    scena notturna): sotto scende, sopra sale, e i toni chiari restano
 *    dove sono.
 *
 * 3. IL MICROCONTRASTO, che e' la nitidezza vera.
 *    Non il «sharpen» che disegna aloni bianchi sui bordi. Si toglie dalla
 *    versione sfocata di se stessa: cio' che resta e' il dettaglio fine —
 *    gli spigoli della carrozzeria, il disegno dei cerchi, la grana della
 *    pietra. E' la cosa che nel confronto con una campagna vera manca
 *    sempre, e nessuno sa nominarla: si dice «e' meno definito» e in realta'
 *    e' meno CONTRASTATO alla scala del millimetro.
 *
 * 4. LA VIGNETTATURA, e il disturbo fine.
 *    Un obiettivo vero perde luce ai bordi. Un render no, ed e' una delle
 *    voci della griglia: «assenza di difetti ottici». Il disturbo serve a
 *    un'altra cosa ancora — un cielo notturno che va da 0,02 a 0,04 su otto
 *    bit ha quattro valori disponibili e si vede a fasce. Un disturbo da
 *    mezzo valore le rompe. E' l'unico rumore che si aggiunge per PULIRE.
 *
 * 5. L'ABERRAZIONE CROMATICA.
 * 6. LA GRANA DI PELLICOLA.
 *    Le ultime due sono arrivate dopo, e il perche' e' scritto qui sotto.
 *
 * =====================================================================
 * TERZO GIRO — «LA SECONDA META' SEMBRA UNA TECH DEMO»
 * =====================================================================
 *
 * Due revisioni esterne indipendenti hanno detto la stessa cosa con parole
 * diverse: villa e automobile leggono come una campagna, la strada come un
 * videogioco. La diagnosi che gira sempre in questi casi e' «l'esposizione»,
 * e su questo fotogramma e' FALSA e si puo' dimostrare: misurata sul beat
 * `velocita`, bruciati 0,037% e schiacciati 0,755%, p05 0,029 / p50 0,315 /
 * p95 0,670. Un istogramma cosi' e' quello di una fotografia ben esposta.
 *
 * Quello che mancava era altrove, e l'ho misurato con `strumenti/pellicola.mjs`
 * prima di scrivere una riga. Sul fotogramma di partenza:
 *
 *     grana (residuo contro 9x9, zone piatte)   0,45 su 255
 *     aberrazione (scarto R-B sui bordi)        0,015 px
 *     vignettatura (profilo radiale misurato)   0,93 a r 0,80
 *
 * Cioe': niente grana — quello 0,45 non e' grana, e' esattamente il `disturbo`
 * a 0,006 che c'era gia' (rumore uniforme di ampiezza 0,006 ha scarto
 * 0,006/radice(12) = 0,0017, che su 255 fa 0,44: il conto torna al centesimo,
 * ed e' anche la prova che lo strumento misura quello che dice) — e ZERO
 * aberrazione. La vignettatura invece C'ERA, contro quel che dicevano le
 * revisioni: solo, toglieva il sette per cento e non si vedeva.
 *
 * Sono le tre voci che una macchina fotografica mette e un rasterizzatore no.
 * Nessuna delle tre aggiunge informazione all'immagine: aggiungono i DIFETTI
 * dello strumento con cui l'immagine sarebbe stata presa, ed e' per la
 * presenza di quei difetti che l'occhio decide se sta guardando una ripresa o
 * un calcolo. E' anche il motivo per cui vanno in questa passata e non nella
 * scena: sono dell'obiettivo, non del mondo.
 *
 * PERCHE' PROPRIO SU QUESTA META' DEL SITO SI VEDE DI PIU'.
 *
 * La corte e' illuminata da una fotografia a 360 gradi: si porta dentro la
 * grana, la dominante e le imperfezioni di chi l'ha scattata. La strada e'
 * interamente calcolata — non c'e' un solo pixel che venga da un sensore — e
 * quindi e' l'unica meta' del sito dove la pulizia digitale e' TOTALE. Le due
 * revisioni non hanno visto un difetto della strada: hanno visto che la villa
 * aveva qualcosa che alla strada mancava.
 *
 * L'ORDINE E' QUELLO DELLA CATENA VERA, non uno a caso: grade, poi ottica
 * (aberrazione), poi vignettatura, poi grana. La grana va per ULTIMA perche'
 * sulla pellicola sta nell'emulsione, cioe' a valle di tutto quello che
 * l'obiettivo ha fatto: metterla prima della vignettatura vorrebbe dire che
 * agli angoli si attenua anche il grano, che e' l'unica cosa che agli angoli
 * non si attenua mai.
 */

export function passaggioGrado(larghezza: number, altezza: number) {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      misura: { value: new Vector2(larghezza, altezza) },
      // 0,010 e non 0,028. Il punto di nero serviva a togliere il velo
      // dell'HDRI, che illuminava anche dove non doveva arrivare niente.
      // Adesso il buio della corte e' buio VERO — geometria che non riceve
      // luce — e un taglio a 0,028 non toglieva piu' un velo: schiacciava
      // informazione che c'era.
      nero: { value: 0.010 },
      contrasto: { value: 1.20 },
      /* NOTTE CALDA: +8% sul rosso, -8% sul blu, guadagno incrociato che
         non sposta la luminanza. Sotto 0,05 non si vede, sopra 0,14 la
         villa diventa arancione finta. */
      temperatura: { value: 0.085 },
      /* 0,88 e non 1,0: un filo di colore in meno ovunque, perche' di notte
         l'occhio lo perde. Cosi' l'ambra della gola risalta per contrasto. */
      saturazione: { value: 0.88 },
      microcontrasto: { value: 0.42 },
      /* 0,38 e non piu' 0,30, e la rampa comincia prima.
       *
       * La vignettatura c'era gia' e non si vedeva. Misurata col profilo
       * radiale di `strumenti/pellicola.mjs` — che divide il fotogramma acceso
       * per lo stesso fotogramma a vignettatura spenta, cosi' il contenuto si
       * semplifica e resta solo il fattore — toglieva il 7% a tre quarti di
       * raggio. Sette per cento e' sotto la soglia in cui un occhio distingue
       * un bordo scuro da un bordo che finisce.
       *
       * Il CENTRO NON SI TOCCA, ed e' una scelta e non un dettaglio: la rampa
       * parte a 0,38 di raggio, che sta fuori dal soggetto in tutti i beat.
       * Una caduta alla cos^4, che e' quella fisica, comincerebbe dal centro e
       * SPOSTEREBBE L'ESPOSIZIONE — e l'esposizione qui e' gia' misurata
       * giusta, quindi qualunque cosa la muova e' un peggioramento anche se
       * sembra piu' corretta. */
      vignetta: { value: 0.38 },
      disturbo: { value: 0.006 },
      /* L'AMPIEZZA DELLA GRANA, e questo numero e' stato TARATO, non scelto.
       *
       * Il bersaglio era uno scarto di circa 1,8 su 255 nelle zone piatte:
       * sotto 1 non si vede, sopra 3 si vede da sola e diventa «effetto». Ma
       * l'ampiezza da scrivere qui non e' 1,8/255: fra la manopola e la misura
       * ci sono due fattori che non si indovinano — il rumore a valore
       * interpolato ha scarto circa 0,22 invece di 0,29 (l'interpolazione
       * morbida toglie varianza) e il peso sulla luminanza vale circa 0,55
       * nelle zone dove la misura guarda. Si e' scritto un numero, misurato,
       * e corretto una volta: 0,045 dava 1,3 e 0,062 da' 1,79. */
      grana: { value: 0.062 },
      /* LO SCARTO FRA ROSSO E BLU ALL'ANGOLO, IN PIXEL.
       *
       * Un obiettivo vero non mette a fuoco i tre colori nello stesso punto:
       * il rosso cade un filo piu' fuori del blu, e lo scarto cresce dal
       * centro verso il bordo. E' il difetto ottico piu' facile da riconoscere
       * e il piu' facile da esagerare.
       *
       * 1,3 px all'angolo di un fotogramma da 1200 e' generoso rispetto a un
       * obiettivo buono (che ne farebbe 0,3) e giusto rispetto a come si vede
       * una pellicola stampata. Al centro vale ESATTAMENTE zero, che e' il
       * motivo per cui non sporca ne' il volante ne' il quadro: sono al
       * centro, ed e' li' che l'occhio va a cercare la nitidezza.
       *
       * Non tocca la tipografia: il testo e il quadro sono HTML sopra la tela,
       * e questa passata lavora sulla tela. */
      aberrazione: { value: 1.3 },
      tempo: { value: 0 },
      /* IL RIQUADRO DEL TESTO, in coordinate di tessitura: x0, y0, x1, y1.
         Lo scrive `Esperienza` a ogni fotogramma leggendolo da `ui/Voci.ts`,
         che lo misura solo quando cambia il tempo o la finestra. */
      testo: { value: new Vector4(0, 0, 0, 0) },
      /** quanto si comprime la' sotto: zero = niente */
      veloTesto: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 misura;
      uniform float nero;
      uniform float contrasto;
      uniform float microcontrasto;
      uniform float vignetta;
        uniform float temperatura;
        uniform float saturazione;
      uniform float disturbo;
      uniform float grana;
      uniform float aberrazione;
      uniform float tempo;
      uniform vec4 testo;
      uniform float veloTesto;
      varying vec2 vUv;

      float sporco(vec2 q) {
        return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453);
      }

      /* IL GRANO, e la ragione per cui NON e' un rumore per pixel.
       *
       * Un rumore che cambia a ogni pixel non e' grana: e' disturbo di un
       * sensore digitale, e l'occhio lo riconosce come «video», che e'
       * esattamente il contrario di quello che si vuole ottenere. Il grano di
       * una pellicola stampata sta intorno al pixel e mezzo, quindi due pixel
       * vicini si somigliano. Qui si campiona su una griglia piu' larga del
       * pixel e si interpola morbido: costa quattro seni e produce macchie
       * invece che sale e pepe. */
      float fiocco(vec2 q) {
        vec2 i = floor(q), f = fract(q);
        f = f * f * (3.0 - 2.0 * f);
        float a = sporco(i);
        float b = sporco(i + vec2(1.0, 0.0));
        float c = sporco(i + vec2(0.0, 1.0));
        float d = sporco(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 p = 1.0 / misura;

        /* L'ABERRAZIONE CROMATICA — tre prelievi invece di uno.
         *
         * Il verde resta dov'e' e fa da riferimento (e' anche il canale su cui
         * un obiettivo si mette a fuoco); il rosso si legge un filo piu' fuori
         * dal centro e il blu un filo piu' dentro. Lo scarto cresce col raggio
         * perche' e' cosi' che si comporta: e' un errore di INGRANDIMENTO fra
         * i tre colori, quindi al centro, dove non c'e' ingrandimento da
         * sbagliare, e' zero per costruzione.
         *
         * «aberrazione» e' lo scarto totale fra rosso e blu ALL'ANGOLO in
         * pixel. La mezza diagonale vale length(misura)/2, e lo scarto totale
         * a raggio pieno e' 2*e*length(misura)/2 = e*length(misura): da cui
         * e = aberrazione / length(misura), senza costanti magiche. */
        vec2 d = vUv - 0.5;
        float e = aberrazione / max(length(misura), 1.0);
        vec3 c;
        c.g = texture2D(tDiffuse, vUv).g;
        c.r = texture2D(tDiffuse, clamp(0.5 + d * (1.0 + e), 0.0, 1.0)).r;
        c.b = texture2D(tDiffuse, clamp(0.5 + d * (1.0 - e), 0.0, 1.0)).b;

        // MICROCONTRASTO: quattro campioni a croce fanno la versione
        // sfocata; la differenza e' il dettaglio fine. Il raggio e' UN
        // pixel e mezzo — piu' largo e diventa un alone.
        //
        // I QUATTRO CAMPIONI RESTANO SENZA ABERRAZIONE, ed e' voluto. Farli
        // seguire i tre canali costerebbe dodici prelievi invece di quattro
        // per guadagnare una frazione di pixel; e la conseguenza di non farlo
        // e' che agli angoli il dettaglio si calcola contro una sfocatura
        // leggermente disallineata, cioe' la frangia colorata li' si accentua
        // di poco. E' la direzione giusta: agli angoli l'aberrazione DEVE
        // essere piu' evidente. Provato anche l'opposto — applicare
        // l'aberrazione dopo il microcontrasto, su una copia — e non ha
        // funzionato: e' una risuddivisione dell'immagine, non un colore, e
        // dopo non c'e' piu' niente da spostare.
        vec3 morbido = (
          texture2D(tDiffuse, vUv + vec2( 1.5, 0.0) * p).rgb +
          texture2D(tDiffuse, vUv + vec2(-1.5, 0.0) * p).rgb +
          texture2D(tDiffuse, vUv + vec2( 0.0, 1.5) * p).rgb +
          texture2D(tDiffuse, vUv + vec2( 0.0,-1.5) * p).rgb
        ) * 0.25;
        c += (c - morbido) * microcontrasto;

        // PUNTO DI NERO: si taglia il velo e si riscala
        c = max(c - nero, 0.0) / max(1.0 - nero, 0.001);

        // CONTRASTO intorno al perno basso della notte
        c = (c - 0.22) * contrasto + 0.22;

        /* TEMPERATURA — l'ultima cosa che separava questa scena dalla notte.
         *
         * Il progetto non aveva NESSUN controllo di colore: solo nero,
         * contrasto, microcontrasto, vignetta, grana, aberrazione. E una
         * scena si porta sulla notte calda con due manopole, non con
         * l'esposizione: l'esposizione la spegne e basta.
         *
         * Il guadagno e' INCROCIATO — si alza il rosso e si abbassa il blu
         * della stessa quantita' — cosi' la luminanza media non si sposta:
         * la scena diventa calda senza diventare piu' chiara o piu' scura.
         * Il verde si muove di meta', se no le luci ambra virano al giallo
         * acido invece che all'oro. */
        c.r *= 1.0 + temperatura;
        c.g *= 1.0 + temperatura * 0.5;
        c.b *= 1.0 - temperatura;

        /* SATURAZIONE attorno alla luminanza percettiva (Rec.709).
         * Di notte l'occhio perde colore: una notte con la saturazione del
         * giorno sembra un giorno filtrato. Si toglie un filo di colore
         * OVUNQUE, e cio' che resta acceso — la gola ambra, le vetrate —
         * risalta di piu' proprio perche' intorno c'e' meno. */
        float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(luma), c, saturazione);

        // VIGNETTATURA: dolce, e mai fino al nero. La rampa parte a 0,38
        // (era 0,45) e chiude a 1,05 (era 1,15): il centro resta intatto e
        // l'angolo scende. Il perche' dei numeri sta sull'uniform.
        float r = length((vUv - 0.5) * vec2(misura.x / misura.y, 1.0));
        c *= 1.0 - vignetta * smoothstep(0.38, 1.05, r);

        /* IL FONDO SOTTO IL TESTO — e non e' un velo, e' una compressione.
         *
         * IL DIFETTO, misurato da strumenti/stacco.mjs. Il contrasto medio
         * fra il testo bianco e il suo fondo e' buono, circa sette a uno. Ma
         * il fondo non e' uno: lungo una riga sola cambia, e tanto.
         *
         *     hero        90  80  72  76  65  51    1,8 volte
         *     lato        87  77  65  50  38  34    2,6 volte
         *     velocita   119   2   2   3   3   6     63 volte
         *
         * L'ultima e' la piu' grave e si vede a occhio nudo nel provino: «E
         * adesso guidi tu.» sta a cavallo del bordo del montante, e le prime
         * lettere sono sul cielo chiaro mentre il resto e' sul nero del
         * padiglione. L'occhio non legge «testo su fondo», legge «testo su DUE
         * fondi» — e due fondi vogliono dire che il testo non appartiene a
         * nessuno dei due, cioe' che e' stato appoggiato sopra. E' il difetto
         * che il committente ha continuato a chiamare «non sembra congruente».
         *
         * PERCHE' UN VELO NON LO CHIUDE, e ce n'era gia' uno.
         *
         * .velo--destra era una sfumatura in CSS dal margine: moltiplica
         * tutto per lo stesso fattore, quindi 119 e 2 restano nello stesso
         * RAPPORTO. Schiacciava il bordo, dove il fondo era gia' scuro, e
         * lasciava scoperta proprio la fascia chiara in mezzo. Ed era anche un
         * foglio grigio appoggiato sopra l'immagine, cioe' un elemento in piu'
         * — la stessa cosa che era stata tolta quando e' sparita la scheda.
         *
         * QUESTO INVECE COMPRIME SOLO L'ALTO.
         *
         * compressione cresce con la luce del pixel: quello a 2 non lo tocca
         * nessuno, quello a 119 scende. Il fondo scuro resta dov'e' e quello
         * chiaro scende VERSO di lui — che e' l'unico modo di avvicinare due
         * fondi senza annerire la scena. Ed e' un'operazione sull'immagine
         * finita, non un oggetto: una sfumatura senza bordi l'occhio non la
         * conta fra le cose sullo schermo, la legge come esposizione.
         *
         * La sfumatura del riquadro e' larga (0,12 di schermo): quello che si
         * deve evitare e' che si veda dove comincia. */
        if (veloTesto > 0.001) {
          /* 0,075 e non 0,12, e a deciderlo e' stato il secondo criterio
             dello strumento. Con 0,12 lo sbalzo sotto il testo crollava — da
             117 punti a 44 — ma la meta' LIBERA dello schermo perdeva il dieci
             per cento: la sfumatura era cosi' larga da traboccare dall'altra
             parte, cioe' stavo annerendo la scena invece di schermare il testo.
             E' esattamente la cura peggiore della malattia che quel criterio
             esiste per intercettare. */
          vec2 sfuma = vec2(0.075);
          vec2 dentro = smoothstep(testo.xy - sfuma, testo.xy + sfuma, vUv)
                      * (1.0 - smoothstep(testo.zw - sfuma, testo.zw + sfuma, vUv));
          float luce = max(max(c.r, c.g), c.b);
          /* LA SOGLIA STA IN BASSO, e il primo giro l'aveva messa troppo su.
             Con smoothstep(0,10 - 0,60) un pixel a 60 su 255 riceveva solo un
             quinto della compressione: misurato, lo sbalzo peggiore scendeva da
             117 a 59 e li' si fermava. Il fondo chiaro di questa scena non e'
             bianco — e' cielo notturno e asfalto bagnato, cioe' proprio i
             valori intorno a un quarto di scala, che restavano fuori.
             Con 0,05 - 0,42 la compressione lavora dove sta davvero il fondo, e
             sotto 0,05 continua a non toccare niente: il nero del padiglione
             resta nero, che e' l'unico modo di avvicinare due fondi senza
             annerire la scena. */
          float compressione = smoothstep(0.05, 0.42, luce);
          c *= 1.0 - veloTesto * dentro.x * dentro.y * compressione;
        }

        /* LA GRANA — per ultima, come nell'emulsione, e pesata sulla luce.
         *
         * TRE COSE CHE NON SONO ARBITRARIE.
         *
         * 1. IL PESO SULLA LUMINANZA. Una grana di ampiezza costante e' una
         *    velina stesa sopra: si vede nel nero pieno, dove sulla pellicola
         *    non c'e' nulla da granire perche' non c'e' argento sviluppato, e
         *    infatti sporca. Il peso sale in fretta appena si esce dal nero
         *    (esponente 0,35) e cala dolcemente nelle alte luci. Il nero
         *    ASSOLUTO resta assoluto: e' il punto su cui questa passata ha gia'
         *    lavorato al punto 1, e granirlo sarebbe rimetterci il velo che si
         *    e' appena tolto.
         *
         * 2. LA SCALA E' 1,7 PIXEL. A un pixel il risultato e' rumore digitale
         *    e non pellicola: provato, e il fotogramma sembrava una webcam al
         *    buio. Oltre i due e mezzo diventano macchie e si vedono.
         *
         * 3. IL TEMPO VA A GRADINI DI VENTIQUATTRO AL SECONDO, non continuo.
         *    Una grana che cambia a ogni fotogramma a sessanta hertz e' rumore
         *    di sensore in video; a ventiquattro e' il passo del proiettore, ed
         *    e' quello che l'occhio associa alla pellicola. Costa un floor. */
        float luceGrana = clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
        float peso = pow(luceGrana, 0.35) * (1.0 - 0.55 * luceGrana);
        vec2 cella = vUv * misura * ${(1 / 1.7).toFixed(4)} + floor(tempo * 24.0) * 71.7;
        c += (fiocco(cella) - 0.5) * grana * peso;

        // DISTURBO: mezzo valore su 255, contro le fasce nei cieli. RESTA
        // anche adesso che c'e' la grana, e non e' un doppione: la grana e'
        // larga 1,7 px e pesata sulla luce, quindi nelle ombre profonde —
        // che e' dove le fasce si vedono — vale quasi zero. Questo invece
        // e' bianco, per pixel, e non guarda in faccia nessuno.
        float g = fract(sin(dot(vUv * misura + tempo, vec2(12.9898, 78.233))) * 43758.5453);
        c += (g - 0.5) * disturbo;

        gl_FragColor = vec4(max(c, 0.0), 1.0);
      }
    `,
  })
}
