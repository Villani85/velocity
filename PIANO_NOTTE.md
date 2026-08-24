# VELOCITY — il piano della notte

Scritto perché il committente si è allontanato dal PC dopo aver chiesto `/plan`.
Fermarsi ad aspettare l'approvazione avrebbe sprecato la notte, che è esattamente
la cosa che ha chiesto di non fare. Quindi il piano sta qui, si legge al
risveglio, e intanto il lavoro va avanti.

## L'ordine, e perché è questo

1. **Il quadro, definito estremamente bene.** Ultima istruzione ricevuta, e
   punto più basso della valutazione (7,0 desktop / 6,8 mobile).
2. **Movimento ridotto e ripiego statico.** Sale al secondo posto su
   indicazione del committente, e la ragione è giusta: è il dettaglio che
   nessuno applaude e che separa un esperimento da una build matura.
3. **Strato semantico vero** — titolo, navigazione, contatto e testi nel DOM,
   raggiungibili da tastiera e da un lettore di schermo anche se il WebGL non
   parte. Si fa insieme al punto 4, perché toccano gli stessi file.
4. **La seconda lingua.** La scelta manuale vince sull'`Accept-Language` e
   sopravvive al ricaricamento.
5. **Il finale: la strada diventa il contatto**, reversibile allo scorrimento.
6. **L'iride come maschera** fra due render invece che come schermata bianca.
7. **Hero mobile** più leggera, automobile più grande.
8. **Strategia di caricamento** con un budget d'attesa dichiarato: oltre quello
   non si aspetta, si degrada.
9. **Cancello prestazioni** — p50/p95/p99, chiamate, triangoli, memoria delle
   tessiture, peso iniziale e totale, e le prove che rompono le esperienze
   agganciate allo scorrimento: indietro veloce, ridimensionamento, scheda
   lasciata aperta.
10. **Il caso di studio**, che è anche la prova di paternità. Le fondamenta ci
    sono già: `COSTRUZIONE.md` sono millecento righe di decisioni misurate.
11. **UI che evita la silhouette proiettata** dell'automobile.

### Due correzioni accettate

- **Non riempire per forza tutte e quattro le zone del quadro.** Meglio due
  zone forti con dati veri che quattro mezze inventate. Una supercar non è
  interessante perché ha tante cifre: è interessante perché ogni cifra serve.
- **La lingua scelta a mano vince e resta.** `Accept-Language` decide solo la
  prima volta.

## 1. Il quadro

Il difetto strutturale è già chiuso stanotte: la pista spenta era invisibile
(20%), l'alone era due volte e mezzo più largo della pista, la testa dell'arco
era più grande dei numeri, e il quadrante era fuori centro nella sua zona di
17 px. Restava «non intero» perché al minimo si vedeva solo il pezzo acceso.

Quello che resta da fare è di natura diversa: **i numeri sono inventati**.
87%, autonomia 406 km, TRIP A 128,4, ODO 14208, il Bluetooth. È la stessa cosa
che ho tolto dalla hero — le statistiche finte — e che qui è rimasta.

La cura non è svuotare il pannello, che è quello che il committente ha chiesto
tre volte di non fare («come una vera supercar», «l'importante che sia
spettacolare»). È **cambiare cosa ci scrivo dentro**: il quadrante dei giri e
la marcia restano, perché sono legati allo scorrimento e quindi sono veri; le
quattro zone di servizio passano a dati misurati.

## 2. Il finale

Negli ultimi 10-15% dello scorrimento il mondo rallenta, l'HUD si spegne un
pezzo per volta, la geometria laterale scende nel nero, la prospettiva della
strada si appiattisce fino a **una sola linea orizzontale**, e quella linea è
la sottolineatura dell'indirizzo di posta.

Il vincolo che rende la cosa una dimostrazione invece che un effetto:
**dev'essere reversibile allo scorrimento**. Tornando su, la linea ridiventa
strada e il cockpit riappare. Una sequenza pre-renderizzata imiterebbe
l'immagine; non può imitare l'inversione in tempo reale.

## 3. La seconda lingua

Tutti i testi vivono già in tre file (`Voci.ts`, `Spina.ts`, `Rotaia.ts`,
`Comandi.ts`). Diventano un dizionario a due chiavi, con la lingua scelta
dall'`Accept-Language` e un interruttore nella testata.

## Verifica, per ogni punto

`npx tsc --noEmit`, `npx vite build`, `node strumenti/guardia.mjs --unavolta`,
`node strumenti/provini.mjs` a 1200x750 e `strumenti/telefono_giro.mjs` a
390x844, `node strumenti/dovecosta.mjs` per i tempi. E un video alla fine.


---

# Come è finita

Scritto all'alba, sullo stesso file, così al risveglio si legge accanto al
piano.

## Fatto

1. **Il quadro** — difetto di forma chiuso (pista invisibile, alone doppio,
   testa più grande dei numeri, quadrante fuori centro) e difetto di sostanza
   chiuso: i cinque numeri inventati sostituiti da numeri misurati.
2. **Movimento ridotto e ripiego statico** — una decisione sola, presa prima di
   scaricare, con la causa registrata. La pagina statica scarica 191 kB invece
   di 12,6 MB.
3. **Strato semantico** — un `h1` fermo, contenuto vero al posto di «In
   arrivo», il poster renderizzato dalla scena, il fuoco da tastiera visibile.
4. **Seconda lingua** — dizionario, scelta manuale che vince e resta,
   interruttore in testata, traduzioni rifatte sulla misura e non sulle parole.
5. **Il finale** — settimo beat, la strada che si spiana in una riga, la riga
   che diventa la sottolineatura del contatto, e la reversibilità misurata.
8. **Strategia di caricamento** — punto d'ingresso da 3,2 kB, tutto il resto
   dietro un `import()` che si chiede solo dopo i quattro controlli.
9. **Cancello prestazioni**, per la parte che si può fare da qui: p50/p90/p99
   per capitolo, chiamate e triangoli, indietro veloce (lo strumento del finale
   risale e confronta).

E in più, non nel piano: la hero mobile con l'automobile più grande del 17% e i
comandi leggibili sopra la villa.

## Non fatto, e perché

6. **L'iride come maschera fra due render.** È il pezzo più delicato del sito e
   l'unico punto in cui un errore rovina il momento migliore. Farlo alle
   quattro del mattino, senza poterlo mostrare a nessuno prima di consegnarlo,
   era il modo più rapido di rompere una cosa che funziona. La strada è chiara
   ed è scritta qui sotto.
10. **Il caso di studio.** Le fondamenta ci sono — `COSTRUZIONE.md` sono
    milleduecento righe di decisioni misurate — ma distillarle in una pagina è
    un lavoro di scrittura, non di codice, e va fatto insieme.
11. **UI che evita la silhouette proiettata.** Il meccanismo esiste già
    (`ui/Spina.ts` proietta un punto del mondo a ogni fotogramma); manca la
    parte di composizione, che si decide guardando.

## Le due cose che servono da te

- **L'indirizzo di posta.** Vive in un posto solo, `src/ui/Contatto.ts`, ed è
  vuoto. Finché è vuoto né la pagina statica né il finale mostrano un
  collegamento: inventarne uno era l'unica cosa finta che qualcuno avrebbe
  provato davvero a usare. Riempire quella riga lo accende dappertutto.
- **Un telefono vero.** I 57 fotogrammi al secondo «telefono» vengono da un
  viewport stretto dentro Chromium con la scheda video del portatile. Non sono
  una prova e non li conto.

## Come si farebbe l'iride, quando c'è tempo

Il difetto è quello che ha indicato la valutazione: **il fotogramma diventa
completamente bianco, e il cervello legge una separazione netta.**

La cura non è attenuare il bianco: è che il centro dell'iride diventi una
finestra sul mondo successivo invece di un tappo. Due strade, in ordine di
rischio:

1. **Il buco nel corridoio.** Il materiale del tunnel prende una maschera
   circolare in coordinate schermo e scarta i frammenti dentro il raggio.
   Quello che si vede nel buco è l'interno, già disegnato nella stessa passata,
   senza nessun render target in più. Serve che l'interno sia visibile durante
   la finestra dell'iride — oggi lo scambio cade dentro il bianco, a 0,86 —
   e serve `onBeforeCompile` con `customProgramCacheKey`, che su questo
   progetto è già una trappola pagata una volta.
2. **Il bersaglio.** Si disegna l'interno dentro un `WebGLRenderTarget` a metà
   risoluzione per la durata della transizione, e il disco lo campiona in
   coordinate schermo con l'alfa su un raggio. È letteralmente
   `mix(sceneA, sceneB, irisMask)`. Costa una passata di scena in più per circa
   un secondo di sito, ed è la strada che ha meno modi di sbagliare.

In tutti e due i casi il bianco resta, ma solo come **bordo emissivo sottile**
dell'iride: non come riempimento.
