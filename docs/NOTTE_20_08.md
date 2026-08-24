# Ordine di lavoro — notte del 19→20 agosto

Scritto prima di cominciare, non dopo. Se domani qualcosa non ti torna,
qui c'è cosa ho deciso di fare e perché ho messo le cose in quest'ordine.

## Da dove parto

Fatto ieri sera:

- grey box completo, sei beat percorribili
- **cancello 1** superato: il taglio in occlusione copre il 98,9% del
  fotogramma (e ho scoperto che a coprirlo è il fianco dell'auto, non il
  montante)
- **cancello 2** superato: la partenza della strada non produce stacco
  (picco 2,73× la mediana, soglia 4)
- HDRI notturno reale, esposizione tarata misurando
- una colonna generata con Tripo, in scena
- 1420 crediti

## Il criterio con cui ho ordinato le cose

Prima quello che può **invalidare** il lavoro fatto, poi quello che lo
migliora. Un difetto di regia scoperto dopo aver messo i materiali costa
il triplo, perché bisogna ri-verificare tutto.

E ogni passo si chiude con una **misura**, non con un'occhiata. Ieri ho
sbagliato due volte deducendo invece di misurare, e in entrambi i casi il
ragionamento era pulito e la conclusione sbagliata.

---

## 1. La continuità su TUTTI i confini

Ho verificato due passaggi su cinque. La regola 3 — nessuno stacco — vale
ovunque, e i confini che non ho guardato sono esattamente quelli dove nel
progetto precedente la camera saltava.

Serve il misuratore di continuità: percorre l'intero scorrimento a passi
minuscoli, confronta ogni fotogramma con il precedente, e segnala i punti
in cui la differenza è molto maggiore di quella dei vicini. Poi si
correggono i picchi.

**Perché per primo:** se un confine salta, la regia va cambiata — e tutto
ciò che viene dopo va rifatto.

## 2. La tenuta ai formati di finestra

È la lezione già pagata sul progetto precedente, dove l'inquadratura si
tarava sulla sola larghezza e su una finestra larga e bassa l'oggetto
usciva dal fotogramma del 49%. Qui la camera è in prospettiva e il campo
è verticale, quindi il difetto è diverso ma esiste lo stesso: su un
16:9 basso l'auto può uscire di lato durante l'orbita.

Si misura su quattro formati — 16:10, 16:9, 21:9 e verticale — e si
vincola quello che serve.

## 3. L'auto deve riflettere, e deve fare ombra

Adesso è opaca al 75% e non tocca terra: galleggia. Sono due difetti che
tolgono senso al beat più importante.

- **i riflessi** sono la ragione per cui si è deciso di ruotare la camera
  invece dell'auto (decisione D1). Con una carrozzeria opaca quell'idea
  non si vede: la promessa è nel codice ma non sullo schermo
- **l'ombra di contatto** è ciò che appoggia un oggetto per terra. Senza,
  qualunque materiale sembra finto

## 4. Il bloom, con la soglia sopra 1

Nel codice ci sono già i commenti che ne parlano, ma **non esiste**: non
c'è nessun composer. Va aggiunto, e con la soglia sopra 1 — la lezione
del progetto precedente, dove a 0,86 in spazio lineare qualunque
superficie chiara fioriva e sbiancava il fotogramma.

Serve al beat dell'accensione, che senza è un rettangolo che cambia
colore.

## 5. L'accensione vera

Adesso è un piano che passa da scuro a chiaro. Deve diventare una
sequenza: display centrale, poi quadro, poi luce d'ambiente, poi le
lancette. Una cosa alla volta, non tutto insieme — è la differenza fra
un'accensione e un interruttore.

## 6. Il caricamento differito dell'interno

È metà della decisione D2 e non è ancora fatto: oggi esterno e interno si
costruiscono entrambi all'avvio. Deve caricarsi mentre si guarda
l'esterno, e va **misurato** che sia pronto prima del taglio — se arriva
tardi, dietro il montante non c'è niente.

## 7. Qualche altro pezzo d'ambiente da Tripo

Con parsimonia: un muro o una barriera, non di più. Le colonne hanno
insegnato che la risoluzione va rapportata alla distanza, e ora so
misurarla prima di spendere.

## 8. Documentazione e video

Il registro delle decisioni aggiornato con quello che le misure hanno
smentito, e un filmato dello stato per la mattina.

---

## Cosa NON farò, e perché

- **l'auto vera.** Serve un modello professionale e va comprato: non
  compro niente al posto tuo. Il segnaposto resta, ed è il motivo per cui
  tutto il resto è tarato su misure reali.
- **il suono.** Ha bisogno di file che non ho e di una tua scelta sul
  registro. Inoltre un sito che suona senza permesso è un sito che si
  chiude.
- **la strada renderizzata "vera"** (opzione B del capitolo 3.3). L'attuale
  galleria astratta è l'opzione A, ed è quella giusta finché non c'è
  l'auto vera: la camera del cockpit definitivo cambierà.

---

## Aggiunte tue, arrivate a lavoro cominciato

### A. La narrazione — e diventa la cosa più importante

> «il sito deve avere una narrazione, deve spiegare il fatto che faccio
> siti web creativi»

Questo cambia il peso delle cose. Finora la tesi era
`EXTERIOR → OBJECT → INTERIOR → MACHINE → VELOCITY`: un arco bello che
però non dice niente di **te**. Un pezzo di portfolio che non dice cosa
fai è una demo.

La saldatura che propongo — e che si regge sull'arco che già c'è, senza
inventarne un altro:

> **Un sito non è l'immagine di una cosa. È una macchina in cui si entra
> e che si guida.**

È una tesi vera sul creative development, ed è esattamente quello che il
percorso già fa vedere: si gira intorno a una superficie finché si
capisce che la superficie non basta, si entra, si accende, si guida.

Ogni beat prende una riga:

| beat | cosa dice |
|---|---|
| hero | l'oggetto è lì, fermo. Lo stai guardando da fuori |
| orbita | puoi girarci intorno quanto vuoi: resta una superficie |
| lato | la via d'ingresso non è mai la porta principale |
| taglio | *(silenzio: il fotogramma è chiuso)* |
| accensione | qui dentro c'è una macchina, e si accende |
| velocità | e adesso la guidi tu |

**Le voci stanno nel DOM, non in WebGL.** Il documento resta un documento:
si legge con uno screen reader, lo indicizza un motore di ricerca, si
seleziona con il mouse. Il WebGL è l'esperienza, non il contenuto — è la
lezione del progetto precedente, dove questa separazione ha retto.

I testi sono miei e sono da riscrivere: servono a fissare il ritmo e i
punti d'appoggio, non a essere definitivi.

### B. Responsive, e sul serio

> «deve andare bene anche per dispositivi mobili»

Non è una rifinitura da mettere in fondo: è un vincolo che cambia
l'inquadratura. Su uno schermo verticale l'auto è larga 4,5 metri in un
fotogramma alto — o si arretra o esce dai lati. E la tipografia di un
racconto a schermo intero non si «riduce», si ricompone.

Va misurato su quattro formati veri: 16:10, 16:9, 21:9 e 9:19,5 (un
telefono). Lo stesso errore l'ho già pagato una volta: l'inquadratura
tarata su un asse solo funziona finché non cambia il rapporto.

### C. Crediti

Il CLI riporta **1420 crediti API**. I 3035 che vedi su
`studio.tripo3d.ai` sono quasi certamente di **Tripo Studio**, che ha un
borsellino separato: sono due prodotti diversi e i crediti non passano da
uno all'altro. Da verificare, ma non blocca niente — 1420 sono trentacinque
generazioni.

---

## Ordine aggiornato

1. ~~continuità su tutti i confini~~ **fatto: nessuno stacco**
2. **le voci** e la narrazione (nuovo, ed è la cosa che rende il sito un
   portfolio invece di una demo)
3. **responsive** su quattro formati (nuovo, vincolo duro)
4. riflessi sulla carrozzeria e ombra di contatto
5. bloom con soglia sopra 1, e l'accensione vera
6. caricamento differito dell'interno
7. documentazione e video

## Cosa ha già trovato la misura di continuità

Nessuno stacco sopra soglia su tutto il percorso — l'unico picco è il
taglio in occlusione, che è voluto e dichiarato.

Ma ha trovato un difetto diverso: **fra q=0,80 e q=0,86 il delta è ZERO.**
Il beat dell'accensione è completamente immobile per il 6% dello
scorrimento. Non è uno stacco, è un buco: si scorre e non succede niente.
Lo chiude il punto 5.

---

# Resoconto della notte

## Il cambio di rotta: l'auto la genero io

A metà notte mi hai chiesto se l'auto potessi generarla con l'API. La mia
risposta di ieri — «due ordini di grandezza sotto» — era **basata su una
misura che non copriva il caso migliore**: avevo misurato il P1, che ha il
tetto a 20.000 facce. Con la serie H e image-to-3D è un'altra cosa.

| | P1 (ieri) | serie H, image-to-3D (stanotte) |
|---|---|---|
| triangoli | 4.909 | **194.552** |
| proporzioni | — | **4,52 × 2,24 × 1,21 m**, da supercar vera |
| texel/mm | 0,65 | 0,43 (texture 4K) |
| costo | 40 crediti | 65 crediti (immagine + modello) |

**Regge dove serve e crolla dove serve saperlo.** Nella hero, a 6,6 metri,
servono 0,29 texel/mm e ne ha 0,43: è un'auto vera. A un metro dal montante
ne servono 1,74 e ne ha 0,43 — i bordi si sfrangiano, il tetto ha bave.

E c'è un limite che nessuna risoluzione risolve: **una mesh sola, un
materiale solo.** Niente vetri separabili, niente interno, niente montante
isolabile. Non è un difetto di qualità: è di struttura.

**La via d'uscita era già nel piano.** La decisione D2 dice che esterno e
interno sono due asset distinti che si scambiano dietro l'occlusione, e lì
il fotogramma è nero al 98,9%: nessuno può accorgersi che i due pezzi non
sono la stessa auto. Quindi:

- **esterno**: hypercar generata, 194k triangoli → 81.710 dopo
  l'ottimizzazione, 2,63 MB
- **abitacolo**: plancia generata come oggetto separato, 64.788 triangoli,
  2,98 MB

Totale **5,6 MB** contro le centinaia di euro di un modello professionale.

Due marchi tolti prima di generare: uno stemma sul muso dell'auto e un logo
McLaren sul mozzo del volante. Il secondo l'ho rimosso con un passaggio di
image-to-image (5 crediti) prima di fare il 3D.

## Cosa hanno trovato le misure

**La plancia era specchiata.** Il quadro strumenti finiva dalla parte
opposta al guidatore. Specchiata sulla geometria in Blender, non in scena:
uno specchio applicato alla scala inverte le normali, e una plancia
illuminata al contrario si vede subito.

**E la sua postazione di guida sta 37 cm a sinistra del centro** — trovato
spostandola e guardando dove cadeva il volante, non leggendo la texture.

**Il responsive aveva un difetto invisibile sul desktop.** Fuori
l'adattamento funziona: l'auto resta in campo al 100% su tutti e quattro i
formati, telefono compreso. Dentro l'abitacolo faceva il danno opposto —
arretrando, su un 9:19,5 finiva in campo il **100% della plancia**, cioè si
vedeva tutto il cruscotto da un capo all'altro. Nessuno seduto al posto di
guida vede tutto il cruscotto. Ora là non si arretra, e il telefono mostra
il 16–22%: un ritaglio da guidatore.

**Il bloom mi ha fatto perdere tre giri, e la causa era altrove.** Il
fotogramma usciva slavato; ho dato la colpa all'alone e l'ho inseguito —
forza da 0,42 a 0,12, soglia da 1,04 a 2,6 — senza risolvere. Misurando con
il bloom spento: 56 di luce senza, 143 con. Il difetto c'era **anche sul
desktop**, solo che lì passava per atmosfera.

La causa vera era un **lampione dell'HDRI** piazzato dietro l'auto, con un
valore enorme, che fioriva su mezzo fotogramma. Si è risolto con due righe:
raggio dell'alone da 0,62 a 0,20 — un alone deve restare attaccato alla
sorgente — e una **rotazione dell'ambiente** che porta quella lampada dove
serve. Adesso fa da controluce dietro l'auto, che è quello che si sarebbe
fatto in studio: si sposta la lampada, non si rifà l'esposizione.

## Cosa c'è adesso

- narrazione in sei voci, DOM (leggibile, indicizzabile, traducibile), con
  la tesi «un sito non è l'immagine di una cosa: è una macchina in cui si
  entra e che si guida»
- tipografia che si **ricompone** sul telefono, non si rimpicciolisce
- suolo scuro e riflettente, ombra di contatto, controluce
- accensione in quattro tempi: autotest del quadro, stabilizzazione,
  consolle, motore — chiude il buco del 6% che la misura aveva trovato
- bloom con soglia a 2,6: fiorisce solo ciò che si **dichiara** sorgente
