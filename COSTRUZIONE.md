# VELOCITY — dall'oggetto alla macchina alla velocità

Documento di costruzione. Sostituisce `every-interface`, che resta dov'è e
non si tocca: quello che vale se ne porta via (capitolo 9).

Il nome della cartella è provvisorio — `velocity` è la parola dell'ultimo
beat, e finché non c'è un nome vero è meglio di `sito-auto`.

---

## 0. Le tre regole, che restano

Sono le tue, e non parlavano di televisori: parlano di come si lavora.
Valgono qui identiche, e stanno in testa perché valgono anche per le parti
che non ho ancora costruito.

1. **Si deve capire tutto.** Se una scena non si capisce è sbagliata anche
   se è bella.
2. **Se non si capisce, si rifà da capo.** Non si rattoppa.
3. **Nessuno stacco.** Tutto deve sembrare che si trasformi.

La terza, qui, è più difficile che nel progetto precedente e insieme più
importante: il racconto passa attraverso **tre tecnologie diverse**
(immagine, 3D realtime, video) e l'utente non deve accorgersene mai. È
esattamente il punto su cui il progetto riesce o fallisce.

---

## 1. La tesi

```
EXTERIOR  →  OBJECT  →  INTERIOR  →  MACHINE  →  VELOCITY
```

Prima guardi l'auto. Poi l'auto diventa uno spazio. Poi quello spazio
diventa un'interfaccia. Poi l'interfaccia diventa movimento.

Non è «ho messo una supercar 3D nel sito», che fanno in molti. È una
trasformazione continua governata dallo scroll — la stessa idea del progetto
precedente, applicata a un soggetto che regge il fotorealismo molto meglio
di un televisore costruito a mano.

---

## 2. I cinque beat

| scroll | cosa vede | come è fatto |
|---|---|---|
| 0 – 15% | dimora di lusso, la macchina ferma in primo piano | backplate 2D + auto 3D allineata alla prospettiva |
| 15 – 40% | la macchina si rivela, la camera le gira intorno | 3D realtime, **camera in orbita** |
| 40 – 62% | la camera scende verso il lato guida | 3D realtime |
| 62 – 75% | si entra nell'abitacolo | **taglio in occlusione** |
| 75 – 85% | il cruscotto si accende | interno 3D, materiali emissivi |
| 85 – 100% | l'auto parte | cockpit 3D + **lastra** oltre il parabrezza (§3.4) |
| oltre | sezione successiva del sito | la velocità stessa fa da transizione |

---

## 3. Le tre decisioni che reggono tutto

### 3.1 Ruota la camera, non l'auto

`auto.rotation.y += scroll` produce un configuratore. La camera che percorre
un oggetto fermo produce uno spot. La differenza non è tecnica, è di
**punto di vista**: nel primo caso l'oggetto si esibisce, nel secondo sei tu
che ti muovi — e il sito parla di movimento.

Con la camera in orbita si ottengono gratis le cose che fanno la
differenza: i riflessi che scorrono sulla carrozzeria, la parallasse fra
auto e ambiente, il cambio di focale.

### 3.2 Il taglio in occlusione è il perno

Da esterno a interno non si passa con una dissolvenza: si passa **dietro il
montante**. La camera scende, si avvicina, la carrozzeria riempie il campo,
il montante attraversa l'obiettivo, per uno o due decimi il fotogramma è
quasi nero — e quando il montante esce, siamo dentro.

Questo permette di sostituire *tutta* la scena 3D senza che si veda. È
anche l'unico modo di non caricare esterno e interno insieme.

**È il perno, quindi si prototipa per primo** — capitolo 8. Il blueprint da
cui parto lo mette al passo 6, dopo gli asset. È l'ordine sbagliato: se la
coreografia non funziona con due scatole grigie, non la salverà nessun
modello da 400 MB.

### 3.3 Il beat finale: dove i due piani si contraddicono

I due blueprint che mi hai passato dicono cose diverse, e la contraddizione
è sul punto più costoso:

- il primo dice: cockpit 3D + **video** dietro una maschera del parabrezza,
  con lo scroll che governa l'accelerazione
- il secondo dice: forse prerenderizza tutto il beat finale, e offre tre
  opzioni fra cui una «stilizzata» con solo scie di luce

Vanno decise insieme perché non sono la stessa cosa, e la scelta cambia
tutto il lavoro a valle. **Il problema vero che nessuno dei due nomina è il
raccordo**: un video generato ha una sua altezza da terra, una sua focale e
un suo moto. Il tuo cockpit ne ha altri. Se non combaciano, il parabrezza
diventa una finestra su un altro film — ed è uno stacco, cioè la regola 3
violata nel momento più visibile del sito.

Tre risposte oneste, in ordine di rischio:

**A — l'esterno è astratto** (scie di luce, tunnel, bagliori). Non c'è
niente da raccordare perché non c'è prospettiva da sbagliare. Costo basso,
rischio quasi nullo, e cinematograficamente regge benissimo alle alte
velocità, che è proprio dove siamo.

**B — la strada la renderizzo io** in Blender, con la camera **presa dal
cockpit**: stessa altezza, stessa focale, stesso moto. Combacia per
costruzione, non per fortuna. Costa un render, ma è controllabile.

**C — video generato**. Massimo fotorealismo, e l'unico in cui il raccordo
è un problema aperto.

Comincerei da **A**, con il codice scritto in modo che l'esterno sia una
sorgente sostituibile: se poi B o C funzionano, si sostituisce la texture e
basta. Il contrario — partire da C e ripiegare — costa il triplo.

---

## 3.4 Il raccordo: lo scambio avviene a scena ferma

Questa è la parte che mancava, ed è quella che fa funzionare tutto il beat
finale.

Non si fa uno stacco fra realtime e prerender. Si renderizza in Blender il
**primo fotogramma della strada dalla stessa identica camera**, lo si mostra
mentre l'auto e' ancora ferma, e si fa partire il movimento dopo. Lo scambio
di livello avviene in un momento in cui non cambia niente — quindi non c'è
niente da vedere.

### La correzione: fuori non è mai realtime

L'idea nella sua prima forma dice: per alcuni fotogrammi video e scena
realtime sono *visivamente identici*, poi il render comincia a muoversi.
Non lo saranno mai. Cycles e WebGL non producono gli stessi pixel nemmeno
con la stessa camera: cambiano il tone mapping, l'antialiasing, il modo in
cui nascono le ombre e i riflessi. Lo scambio si vedrebbe come un piccolo
scatto di colore — e proprio nell'istante di quiete, cioè quando l'occhio
ha più tempo per accorgersene.

La forma che elimina il problema invece di sperare che due renderer vadano
d'accordo: **da dentro l'abitacolo, l'esterno non è MAI realtime.**

```
fotogramma fermo (render Blender)  →  video (stesso render, stessa camera)
```

Fermo e video vengono dalla stessa sorgente, quindi il primo fotogramma del
video **è** l'immagine ferma. Identici per costruzione, non per
approssimazione. Non c'è nessun momento in cui due sistemi di rendering
devono somigliarsi.

E diventa un principio unico per tutto il sito: **l'ambiente e' sempre una
lastra, il 3D e' l'auto.** Vale nel primo beat (backplate della dimora) e
vale nell'ultimo (lastra della strada). Una regola sola, applicata due
volte, invece di due tecniche da far combaciare.

### L'eccezione, e perché non è un'eccezione

Durante l'orbita esterna (15–40%) la camera si muove davvero, e una lastra
ferma non regge il movimento: mancherebbe la parallasse. Qui vale una cosa
che va saputa prima e non scoperta dopo:

> un ambiente equirettangolare è corretto sotto **rotazione** della camera
> e sbagliato sotto **traslazione**, perché non ha profondità.

Un'orbita è rotazione più traslazione. Quindi la parallasse la portano i
**pochi elementi 3D davanti** — pavimento, una colonna, un muro — che il
capitolo 7.3 mette lì per ragioni di costo e che in realtà servono a
questo. Sono loro a dire all'occhio che lo spazio ha profondità; il fondo
può restare piatto perché è lontano, ed è esattamente così che si
comporta la realtà.

### Le quattro cose che mordono

**1. Lo scrubbing di un video è una trappola.** Guidare `currentTime` con
lo scroll sembra ovvio e va a scatti su quasi tutti i browser: il seek non
è accurato al fotogramma, e a comandare è la distanza fra i keyframe. Le
uscite sono tre — codificare tutto intra (pesantissimo), una sequenza di
immagini (pesante), oppure **non scrubbare affatto**: lo scroll governa
`playbackRate`, non la posizione. La terza è fluida, leggera, e coincide
con la decisione D5: lo scroll governa l'intensità, non la riproduzione.

**2. Cosa resta allo scroll, allora.** La lastra scorre; ma vibrazione,
campo visivo, scie, esposizione, volante, giri e suono restano **realtime
sul cockpit** e rispondono alla velocità dello scroll. È lì che vive la
sensazione di guidare la scena — non nella strada, che potrebbe anche
essere sempre la stessa.

**3. La lastra va nel mondo 3D, non sullo schermo.** Se è un fondo in CSS
o un livello fisso, la micro-vibrazione della camera la lascia incollata e
tutto si smaschera in un istante. Va su un piano grande, a una distanza
dichiarata davanti alla camera, dentro la scena: così la vibrazione produce
il movimento relativo giusto, e il parabrezza continua a essere un vetro.

**4. La luce dell'abitacolo deve venire dalla strada.** Se la lastra è
renderizzata con una certa esposizione e il cockpit è illuminato da un
altro ambiente, dentro e fuori sembrano due fotografie accostate. Quindi
dallo stesso set di Blender si esporta **anche l'HDRI**, e il cockpit si
illumina con quello. Stessa sorgente, stessa luce, stessa dominante.

---

## 4. La maschera del parabrezza

Qualunque sia la sorgente, non si mostra un rettangolo di video.
L'esterno esiste **solo dietro il vetro**. Davanti restano 3D veri:
plancia, volante, montanti, specchietto, cristallo e i suoi riflessi.

È quella stratificazione a produrre la sensazione di essere dentro, e a
permettere le cose che rendono credibile la velocità:

- micro-vibrazione della camera
- movimento del volante
- oscillazione lenta della scocca
- variazione di esposizione
- riflessi che scorrono sul cruscotto

Tutte cose che su un video piatto non si possono fare.

---

## 5. Lo scroll governa la velocità, non la riproduzione

Non `scroll → play`. Ma:

```
velocità dello scroll → intensità percepita dell'accelerazione
```

Scorri piano: accelera piano. Scorri deciso: salgono giri, vibrazione,
scie, campo visivo, suono. Chi guarda capisce di **guidare la scena** invece
di subire un filmato — ed è la differenza fra un sito e un video incorporato
in un sito.

**Regola dura, già pagata:** mai soglie in pixel. Il progresso di scena si
legge da `getBoundingClientRect()` a ogni fotogramma dentro il ticker, non
da `start`/`end` di ScrollTrigger, che mentono appena un `pin` inserisce
pixel dopo la creazione del trigger.

---

## 6. Il suono

Pochi eventi, non musica continua:

```
click portiera → silenzio → START → accensione → minimo → giri → partenza
```

Parte solo dopo un'interazione, per le regole dei browser sull'autoplay. E
si può disattivare: un sito che suona senza permesso è un sito che si
chiude.

---

## 7. Gli asset, e il punto su cui essere severi

### 7.1 Il marchio

Va detto subito perché cambia da dove si prendono i modelli: **Lamborghini è
un marchio registrato**, e un pezzo di portfolio pubblico che lo usa —
logo, nome, silhouette riconoscibile — è un'esposizione legale reale, non
teorica. Le case automobilistiche fanno rispettare i marchi anche sui
progetti non commerciali.

La via pulita è una **hypercar originale**: stessa classe di forme, stessa
funzione narrativa, nessun logo e nessuna linea copiata. Per l'effetto che
vuoi ottenere non cambia niente — chi guarda vede «supercar», non «modello
esatto» — e toglie di mezzo il problema.

Se invece vuoi il marchio vero, va deciso consapevolmente adesso, non
scoperto dopo.

### 7.2 Come si sceglie un modello, misurando

Nel progetto precedente ho perso mezza giornata su modelli scelti dalle
anteprime. Da lì la regola: **prima di scaricare qualunque cosa, si contano
due numeri.**

| controllo | soglia | perché |
|---|---|---|
| triangoli dell'esterno | > 300k | sotto, le curve si sfaccettano ai primi piani |
| **texel per millimetro** | > 4 | è il numero che decide i primi piani, e non lo dichiara mai nessuno |
| vetri separabili | obbligatorio | senza, non si entra e non si maschera il parabrezza |
| interni presenti e dettagliati | obbligatorio | il 90% dei modelli da marketplace ha un interno finto |
| UV su ogni pezzo | obbligatorio | senza UV una superficie campiona un texel solo, e ogni tessitura diventa una tinta piatta |
| `metalness` dei materiali | da correggere | i modelli arrivano quasi sempre a 1, che azzera la componente diffusa |

Il texel/mm si misura così: area UV totale / area in metri quadri, radice,
per il lato della texture. Su un'auto lunga 4,5 m con atlas 4K si vuole
almeno 4 texel/mm. **Per confronto, misurati davvero:** una scansione
fotogrammetrica da 500.000 facce che sembrava splendida dava 0,82 texel/mm
— poltiglia a schermo pieno.

### 7.3 L'ambiente non si modella

Backplate ad altissima definizione + pochi elementi 3D davanti (pavimento,
una colonna, una parete, la luce). Sembra ricco e pesa niente. Modellare una
villa intera è il modo migliore di spendere due settimane per un fondale.

L'unica cosa che deve essere vera è l'**HDRI**: i riflessi su una carrozzeria
sono il 70% della sua credibilità, e si vede subito se l'ambiente riflesso è
finto. Un capannone o un piazzale fotografati a 360° battono qualunque
studio costruito a mano, perché le cose vere sono sporche e quelle costruite
sono troppo pulite.

---

## 8. L'ordine di lavoro

Il criterio è uno solo: **prima si toglie il rischio, poi si fa la
bellezza.** Non si comincia dall'auto.

1. **Grey box.** Due scatole grigie, la coreografia completa della camera,
   il taglio in occlusione, lo scroll che la governa. Nessun asset, nessun
   materiale. Se questo non emoziona con le scatole, non emozionerà mai.
2. Storyboard di 5–6 fotogrammi, disegnati dopo il grey box e non prima:
   servono a fissare quello che ha già funzionato.
3. Backplate dell'ambiente + HDRI, e allineamento prospettico dell'auto
   segnaposto.
4. Scroll completo dei cinque beat, ancora con il segnaposto.
5. Interno segnaposto e taglio in occlusione **con due asset separati**,
   per verificare il caricamento differito.
6. Accensione del cruscotto.
7. Beat finale, opzione A (astratta) — **e lo scambio fermo→video provato
   subito con due immagini qualsiasi**, perché è il secondo cancello del
   progetto dopo il taglio in occlusione.
8. **Solo adesso** l'auto definitiva, esterno e interno.
9. Materiali, riflessi, rifiniture.
10. Suono.
11. Mobile.
12. Eventuale passaggio del beat finale da A a B.

I punti 1 e 4 sono i cancelli veri. Se il grey box non tiene, si cambia
regia — non si cerca un modello migliore.

---

## 9. Cosa mi porto da `every-interface`

Strumenti che riscriverei identici, perché servono a non ripagare le stesse
cose:

- **misuratore di continuità.** Percorre lo scroll a passi minuscoli,
  fotografa ogni passo, e segnala dove l'immagine cambia troppo rispetto ai
  suoi vicini. Gli stacchi non si cercano a occhio: passano troppo in fretta
  per accorgersene e troppo lentamente per rivederli. Qui serve ancora di
  più, perché il taglio in occlusione **deve** produrre un picco — e va
  guardato che sia l'unico.
- **provini a stato**, non a tempo: un fotogramma per tappa, aspettando che
  la scena sia pronta invece di un timeout. In headless l'avvio è molto più
  lento che sul desktop.
- **verifica di contenimento**: nessun pezzo interno deve uscire dalla
  sagoma. Su un'auto vale ancora di più (ruote, sospensioni, interni).
- **alleggerimento asset**: texture in WebP/KTX2, geometria in
  Meshopt/Draco, come passaggio scritto in uno script e non in una chat.

E tre lezioni che sono costate ore, tutte ancora valide qui:

- **L'inquadratura si vincola su due assi, e sull'ingombro dell'oggetto —
  non su una sua parte.** Il difetto di ieri: la macchina si dimensionava
  sulla sola larghezza, e su una finestra larga e bassa usciva dal
  fotogramma del 49%. Corretto una prima volta vincolando il vetro, il conto
  tornava esatto e a schermo non cambiava niente, perché il mobile era 1,7
  volte più alto del suo schermo. Su un'auto lunga 4,5 m e alta 1,2 il
  rapporto è ancora più violento.
- **La soglia del bloom sta sopra 1.** Lavora prima del tone mapping, su
  valori lineari in cui una superficie bianca comune sta già a 0,9: con la
  soglia a 0,86 una pagina chiara sbiancava il fotogramma intero. Su
  un'auto, con la carrozzeria che rimanda i neon, il rischio è identico.
- **Le luci non sono watt.** Sopra la decina ogni materiale satura allo
  stesso bianco. Conta il rapporto fra le sorgenti, non la quantità.

---

## 10. Peso

Obiettivo, da misurare e non da assumere:

| quando | cosa | budget |
|---|---|---|
| primo impatto | backplate + HDRI + esterno auto | **10–20 MB** |
| dopo, in sottofondo | interno auto | 10–20 MB |
| all'occorrenza | esterno del beat finale | in streaming |

Regola: **non si carica mai tutto prima di mostrare la pagina**, e il
caricamento dell'interno comincia mentre si sta ancora guardando l'esterno.
I numeri qui sopra sono ottimistici per una supercar con interni visti da
vicino: vanno verificati al punto 8, e se non ci si sta si taglia geometria
o si accetta un secondo di attesa dichiarato — non si carica di nascosto.

---

## 11. Stack

- **Three.js** + **GSAP ScrollTrigger**
- **Blender** come *director tool*: percorsi camera, inquadrature, luci,
  materiali, prove di transizione — e poi export GLB, animazioni comprese
- **GLSL** solo dove serve davvero

Su React Three Fiber: è ottimo, ma introduce una regola in più da
rispettare (non far passare gli aggiornamenti a 60 fps dallo state React).
Per una scena a regia unica come questa, Three puro con GSAP è più diretto e
ha meno modi di andare storto. Se preferisci React lo si fa, ma è una scelta
di ecosistema, non di prestazioni.

Su Lenis: non è obbligatorio. ScrollTrigger oggi gestisce già progresso e
ricalcolo. Lo aggiungerei solo se lo scroll nativo risulta ruvido **dopo
averlo provato**, non prima.

---

## 12. Registro delle decisioni

| # | decisione | perché |
|---|---|---|
| D1 | Ruota la **camera**, non l'auto | l'oggetto che gira è un configuratore; la camera che percorre è uno spot |
| D2 | Il passaggio esterno→interno è un **taglio in occlusione** | è l'unico modo di sostituire tutta la scena senza che si veda, e permette di caricare i due asset separati |
| D3 | Il beat finale comincia **astratto** (scie), con l'esterno sostituibile | un video generato non combacia per costruzione con il cockpit, e il raccordo sbagliato è uno stacco proprio dove il sito è più visibile |
| D3-bis | Da dentro l'abitacolo l'esterno **non è mai realtime**: fermo → video, stessa sorgente | due renderer diversi non danno gli stessi pixel nemmeno con la stessa camera. Lo scambio a scena ferma è invisibile solo se non c'è nessun renderer da far combaciare |
| D3-ter | Lo scambio avviene **mentre non si muove niente** | è il raccordo che mancava: il livello cambia in un istante in cui non c'è nulla da vedere |
| D11 | La lastra della strada vive **dentro la scena 3D**, non sullo schermo | altrimenti la micro-vibrazione la lascia incollata e il parabrezza smette di essere un vetro |
| D12 | Lo scroll governa **`playbackRate`**, mai `currentTime` | lo scrubbing di un video va a scatti: il seek non è accurato al fotogramma e comanda la distanza fra keyframe |
| D13 | L'HDRI del cockpit esce **dallo stesso set** della lastra | luce e dominante diverse fanno sembrare dentro e fuori due fotografie accostate |
| D14 | La parallasse dell'orbita la portano i **pochi elementi 3D davanti** | un ambiente equirettangolare è corretto in rotazione e sbagliato in traslazione |
| D4 | L'esterno esiste **solo dietro la maschera del parabrezza** | la stratificazione è ciò che produce la sensazione di essere dentro |
| D5 | Lo scroll governa **l'intensità**, non la riproduzione | è la differenza fra guidare la scena e subire un filmato |
| D6 | **Hypercar originale**, non il marchio | un portfolio pubblico con un marchio registrato è un'esposizione reale; per l'effetto non cambia nulla |
| D7 | Si comincia dal **grey box** | se la coreografia non regge con due scatole, nessun modello la salva |
| D8 | Un modello si sceglie **contando triangoli e texel/mm** | le anteprime mentono: una scansione da 500k facce dava 0,82 texel/mm |
| D9 | L'ambiente è **backplate + pochi elementi 3D** | modellare una villa costa settimane per un fondale |
| D10 | **Mai soglie in pixel** nello scroll | il pin sposta la pagina dopo il calcolo del trigger |

---

## 13. Cosa serve da te

1. **Il marchio**: hypercar originale o Lamborghini vera? Cambia da dove si
   prendono gli asset, quindi va deciso prima del punto 8.
2. **Il luogo**: villa brutalista al tramonto, resort mediterraneo, garage
   con vetrate sul mare, città di notte? Determina il backplate e l'HDRI, e
   quindi tutta la luce.
3. **Dove porta**: il beat finale deve sfociare in qualcosa. Nel progetto
   precedente il problema era lo stesso e non l'abbiamo mai chiuso — i
   quattro progetti veri sono ancora segnaposto. Qui la velocità serve
   *narrativamente* a cambiare pagina: va saputo verso cosa.

---

# 14. IL CAMBIO DI ROTTA — 20 agosto 2026

Il benchmark non è più generico. È **`thewatch.60fps.fr`**: Website of the Day
su CSS Design Awards con 8,34, FWA of the Day, Site of the Day su Awwwards.
Modello dichiarato da 9 MB, quattro finiture, 60 fps su desktop e mobile.
Va trattato come **soglia minima**, non come traguardo.

## 14.1 La cosa che non facciamo più

**Niente esploso come momento principale.** The Watch ha appena piantato la
bandiera esattamente lì: oggetto premium → zoom → esplosione dei componenti →
ricomposizione. Rifarlo con un'automobile, anche meglio, produce una sola
frase nella testa di chi guarda: *«The Watch, però con una macchina.»*

Il confronto va spostato su un terreno dove un orologio non può seguirci.

## 14.2 L'idea che regge tutto, una sola

> **L'automobile smette progressivamente di essere un oggetto e diventa un
> luogo in cui si entra.**

The Watch permette di guardare *dentro* un oggetto. Questo permette di
**andarci dentro**. È la differenza fra un configuratore e un'architettura.

| | The Watch | qui |
|---|---|---|
| oggetto | orologio | automobile **+ ambiente** |
| movimento | l'oggetto reagisce allo scroll | la **camera vive dentro** l'oggetto |
| smontaggio | esploso meccanico | **attraversamento** della materia |
| scala | sempre prodotto | da auto reale ad **architettura monumentale** |
| momento | il movimento aperto | **entrare** senza un solo stacco |
| portfolio | prodotto unico | **i componenti sono i progetti** |

## 14.3 Il momento — l'ingresso dal faro

La camera arriva al faro anteriore. La lente riempie il quadro. Si continua a
scorrere: il riflesso dell'architettura sulla lente comincia a deformarsi, le
rifrazioni diventano enormi, **la camera supera il vetro**. E invece di
trovare lampade e plastica, la geometria ottica si apre in un **corridoio
monumentale**. Si avanza: le superfici del faro diventano metallo, il metallo
diventa telaio, e a quel punto si è dentro la macchina.

Zero dissolvenze. Zero schermata nera. Zero cambio di pagina percepito.

E la frase che c'era già — *«La via dentro non è la porta»* — smette di essere
copy e diventa una cosa che il visitatore ha appena vissuto.

## 14.4 Dentro: il cambio di scala

Niente componenti che galleggiano. **Cambia la scala.** Una turbina diventa
grande come una stanza; una canalizzazione diventa un tunnel; un pistone
diventa una torre; una superficie in carbonio diventa un ambiente.

**Un componente = un progetto.** Entrando nel componente il materiale muta
fino a diventare il case study; uscendo, il progetto rientra fisicamente
nella macchina. Così il portfolio non è sovrapposto al 3D: **nasce dal suo
mondo**.

## 14.5 Le decisioni

| # | decisione | perché |
|---|---|---|
| **D15** | **Geometria costruita, non generata**, per tutto ciò che la camera avvicina | un generatore produce una forma *plausibile*: non sa cosa sia uno spigolo dritto, una faccia planare, un cerchio concentrico. Colonne e plancia generate sono state giudicate «cartapesta» e «a malapena riconoscibile». Regolare e meccanico → costruito; irregolare e organico → generato |
| **D16** | **`generate_parts=true`**: l'auto arriva divisa in parti, senza tessitura | 30 parti riconoscibili una per una — carrozzeria, quattro ruote, due fari, tre vetri, ala, diffusore, splitter, minigonne, specchietti. È la condizione necessaria del §14.3: senza un faro che esista come oggetto, non c'è niente da attraversare |
| **D17** | **Nessuna mappa di colore generata dall'IA, da nessuna parte** | ha la luce COTTA dentro: ombre e riflessi di uno studio immaginario, che non rispondono alla scena e non si muovono con la camera. *È* la cartapesta. Sei materiali con sei comportamenti battono otto megabyte di fotografia, e pesano 32 kB |
| **D18** | **L'ambiente è costruito**: cielo procedurale + corte modellata | l'HDRI portava tre difetti insieme — un lampione bruciato che nessuna taratura di bloom ha domato, il luogo sbagliato, cinque megabyte. E metteva tre linguaggi diversi nello stesso fotogramma: fotografia, generato, scatole |
| **D19** | **Ciò che illumina e ciò che si specchia sono oggetti diversi** | il pannello che modella sta vicino, è grande e non si vede MAI; ciò che si specchia sta lontano, è stretto ed è architettura. Averli messi nello stesso oggetto ha prodotto una barra bianca in mezzo al fotogramma |
| **D20** | **Ogni manopola passa da una misura** | il montante, il bloom e l'esposizione sono stati tre deduzioni pulite e sbagliate. `strumenti/tara_luce.mjs`, `livelli.mjs`, `colpevole.mjs`, `chiedi.mjs`: si spegne una sorgente e si misura, si lancia un raggio e si chiede alla scena |

## 14.6 I target tecnici, presi da 60fps

Loro hanno trasformato la prestazione in parte della dimostrazione (è nel
dominio). Quindi diventano requisiti, non aspirazioni:

- desktop **60 fps sostenuti**, budget ≤ 16,7 ms
- mobile premium: 60 fps come obiettivo; telefono medio: degrado automatico
  **senza cambiare la storia**
- **primo visivo immediato**, senza aspettare il mondo 3D
- primo blocco 3D **4–5 MB** — oggi l'auto sta a 3,33 MB per 461k triangoli e
  18 parti, contro i 6,45 MB del vecchio solido unico con tessitura 8K
- tessiture KTX2/Basis, mesh Meshopt + LOD veri
- riflessi **selettivi**: probe e baked dove il realtime non aggiunge nulla
- il telefono ha **camera e asset propri**, non è il desktop rimpicciolito

## 14.7 La soglia per dire che è pronto

Non «sembra bello». Tre fotogrammi che reggono **da fermi**:

1. sembra una campagna automobilistica vera
2. si sta attraversando qualcosa che un sito non dovrebbe permettere di
   attraversare
3. si è dentro la macchina e si capisce subito che quell'ambiente **è anche
   il portfolio**

Più l'inizio sembra vero, più l'ingresso impossibile nel faro pesa. Per questo
il §14.3 dipende dalla qualità del §14.6 e non viceversa.

---

# 15. COSA E' CAMBIATO DAVVERO — 20 agosto, sera

Il capitolo 14 dichiarava la rotta. Questo dice cosa e' stato costruito, e
soprattutto **cosa si e' imparato sbagliando**, che e' la parte che non si
ricostruisce leggendo il codice.

## 15.1 Le decisioni nuove

| # | decisione | perché |
|---|---|---|
| **D21** | **Si costruisce ciò che la camera attraversa, si fotografa ciò davanti a cui la camera si ferma** | è la regola che ha risolto l'abitacolo. Lì la camera è ferma su `POSE.occhi` per tutto l'ultimo quarto: davanti a una camera ferma un'immagine e una geometria danno gli stessi pixel. Il modello generato era un ammasso di schegge da 3,1 MB; la fotografia è fotorealistica e pesa 337 kB |
| **D22** | **Ma ciò che deve rispondere allo scorrimento resta vivo**, anche dentro una fotografia | il quadro strumenti è WebGL su una tela 2D, agganciato al riquadro che la fotografia dichiara. Un filmato avrebbe un tempo suo: chi scorre piano lo vedrebbe correre lo stesso. Sarebbe l'unica cosa del sito che non risponde alla mano, e si noterebbe perché è anche l'unica che in quel momento si guarda |
| **D23** | **Radialmente simmetrico → costruito.** Ruote, ottica del faro, corridoio | è la categoria in cui la geometria costruita batte quella ricostruita da un'immagine senza discussione. Un generatore vede la ruota da fuori e ne ricostruisce l'ombra: le razze diventano un rilievo sul disco, il canale del cerchio si chiude. Ruota vera: 105 kB, misure di un 255/30 R21 |
| **D24** | **Ogni manopola passa da una misura, e la misura si stampa nell'unità in cui si sa giudicarla** | «raggio 0 → galleria 0 metri» salta all'occhio; un gruppo vuoto no. Tre difetti muti sono stati stanati da una riga di diagnostica, non da un controllo |
| **D25** | **Una guardia sorveglia il sito e avvisa nell'istante in cui si rompe** | `strumenti/guardia.mjs` resta in ascolto ed **esce con errore** appena trova un guasto: errore di pagina, modulo non partito, richiesta fallita, ciclo di disegno fermo. L'uscita produce la notifica. Non devo chiedere se è tutto a posto: me lo dice lei quando non lo è |
| **D26** | **Il controllo dei tipi gira PRIMA del build** | non esisteva un `tsconfig.json`. Vite traspila senza controllare, quindi per tutta la costruzione nessuno ha mai verificato niente: un import mancante si manifestava come pagina bianca, un file da 537 righe mai collegato non diceva una parola. `npm run build` ora fa `tsc --noEmit && vite build`, con `strict` e `noUnusedLocals` |

## 15.2 I difetti che hanno insegnato qualcosa

Sono elencati perché la lezione vale più della correzione.

**La scena poteva restare completamente vuota.** La condizione che accende il
corridoio non controllava che il corridoio esistesse. Con la rete lenta, dal
70% al 75% dello scorrimento non si vedeva niente. *Non compare mai su questa
macchina, dove tutto carica in due secondi: è il tipo di difetto che si vede
solo dagli altri.*

**Il raggio del corridoio era gonfio del 40%.** Misurato con una scatola
allineata agli assi del mondo, su un oggetto ruotato di 18°. E il raggio è
l'unità di misura di tutto l'attraversamento: con un raggio sbagliato lo
scambio «matematicamente esatto» smetteva di esserlo. *Una misura presa nel
sistema di riferimento sbagliato non dà errore: dà un numero.*

**La nebbia rompeva l'invarianza di scala.** Una camera prospettica misura
angoli, quindi 200r a 200d dà la stessa immagine di r a d. Vero per la
prospettiva, **falso per la nebbia**, che dipende dai metri. *Un'affermazione
giusta ha sempre un dominio di validità, e il difetto sta fuori da quel
dominio.*

**`add()` sposta, non copia.** Tolto il doppio scaricamento del faro, il
secondo innesto rubava la geometria al primo. *Un'ottimizzazione corretta può
introdurre un difetto in un punto che non stava guardando.*

**In Vite 8 i motivi glob nella sorveglianza non funzionano più.** chokidar 4
li ha rimossi: la configurazione sembra giusta e non protegge niente. Ogni
provino scritto in `docs/` ricaricava la pagina **sotto la misura in corso**.
*Il sintomo — «gli screenshot vanno in timeout» — non somigliava per niente
alla causa.*

**«Una volta sola» era sbagliato sulla mappa d'ambiente.** Generarla al primo
momento utile significa generarla quando il cielo non è ancora arrivato: la
carrozzeria rifletteva il buio. Soggetto a media **11 su 255**, il 64% in nero
pieno. *Un'ottimizzazione che anticipa un lavoro lo fa fare a un mondo
diverso.*

## 15.3 Il conto, oggi

| | |
|---|---|
| auto a parti, 18 pezzi riconosciuti, 340k triangoli sulla carrozzeria | 3,0 MB |
| ottica del faro, costruita | 64 kB |
| ruota costruita, 3.930 triangoli | 105 kB |
| abitacolo fotografico + due maschere | 342 kB |
| cielo HDR puresky 1K | 1,1 MB |
| pietre, marmo nero, microsuperfici | ~1,4 MB |
| **primo blocco** | **~5 MB** — dentro il target §14.6 |

Contro i **6,45 MB** del solo vecchio solido unico con la tessitura 8K cotta.

## 15.4 Cosa resta

- collegare i componenti come case study (il §14.4 è progettato, non costruito)
- il secondo scambio, corridoio → abitacolo
- i quattro progetti veri al posto dei segnaposto in `Voci.ts`
- il telefono provato su un telefono, non su un viewport stretto

---

# 16. Lo strumento che misurava una scena diversa

Questo capitolo comincia con un difetto e finisce con un difetto degli
strumenti, ed è il secondo a valere di più.

## 16.1 «La villa si vede in minima parte»

Il committente apre il sito e dice due cose: la villa si vede poco e male, e la
carrozzeria sembra ancora rovinata.

Sulla villa, il primo sospetto era la risoluzione: il panorama è un file da
4096×2048, e nel fotogramma se ne vede una fetta di trentadue gradi, cioè
centoventiquattro pixel della sorgente stirati su milleseicento. Undici volte.
Sembrava tutto spiegato.

Poi ho estratto quella fetta e l'ho guardata: era **nitida e bella**. Una villa
moderna con la piscina a sfioro, le palme, il mare all'orizzonte.

Il difetto non era la qualità del file. Era **dove guardava la camera**.

Da quando è il soggetto a girare e non l'obiettivo (D24), la camera punta
sempre nella stessa direzione: di trecentosessanta gradi di panorama se ne
vedono novanta, sempre gli stessi. Quali novanta non l'aveva mai deciso
nessuno. Capitavano su un muretto basso con tre faretti a terra, mentre a venti
gradi di là c'era l'ala della villa con le vetrate accese e a settanta la
piscina col tramonto dentro.

**Decisione D27.** L'orientamento del panorama è un parametro di composizione, e
si sceglie guardando. `strumenti/orienta.mjs` gira la manopola di quarantacinque
gradi per volta, rende l'eroe una volta per posizione e mette tutto in una
tavola: la scelta si fa in due secondi invece che in venti prove tenute a mente.
A 225 gradi la villa occupa tutta la larghezza, la piscina passa esattamente
dietro la vettura — e quella striscia chiara è ciò che ne stacca la sagoma, che
su una carrozzeria nera è il problema principale.

Ruotano insieme fondo, mappa d'ambiente e direzionale dell'ombra. Le prime due
perché sono la stessa immagine; la terza perché sta al posto del tramonto, e
lasciandola ferma l'ombra cadrebbe da una parte e la luce dall'altra.

## 16.2 La carrozzeria: un numero al posto di un aggettivo

«Sembra ammaccata» l'ho sentito tre volte, e tre volte avevo risposto sulla
vernice: meno metallizzata, meno lucida, satinata, colore più scuro. Ogni giro
migliorava qualcosa e il difetto restava.

`strumenti/ondulazione.mjs` misura la curvatura per ogni spigolo della maglia:
angolo fra le normali dei due vertici, diviso la lunghezza. Viene un raggio di
curvatura. Sulla CARROZZERIA la mediana era **34,8 radianti al metro**: raggio
tipico due centimetri e nove millimetri. Su una fiancata vera sta fra mezzo
metro e tre.

Non era la vernice. Una vernice scura fa una cosa sola — rimanda ciò che ha
intorno — e su una superficie accartocciata rimanda un mondo accartocciato.
**Più la vernice diventava realistica, più l'ammaccatura si vedeva**: per questo
il difetto peggiorava ogni volta che il materiale migliorava.

Tre tentativi, e i primi due sono serviti a capire il terzo.

**Taubin con laplaciano uniforme.** Dodici passate: 34,8 → 22. Quaranta: 19,5.
Duecentoquaranta: 17,3. Si ferma. Non è filtro debole, è un punto fisso: la
media semplice porta ogni vertice nel baricentro dei vicini, e su una maglia
irregolare quel baricentro non sta sulla superficie liscia.

**Taubin con pesi cotangenti.** È l'operatore giusto — il suo punto fisso *è* la
superficie liscia — e infatti liscia meglio. Ma senza rifare la maglia a ogni
passata schiaccia i triangoli: a venti passate l'uno per cento degli spigoli è
degenerato, a cinquanta il due e mezzo, e la coda della misura esplode da 837 a
cinquemila. Più liscia **e peggiore**, che è il tipo di risultato che un numero
solo non fa vedere.

**Il campo delle normali.** Un'ammaccatura non si vede nella sagoma: si vede nel
riflesso, e il riflesso dipende solo da dove punta la normale. Quindi si stirano
le posizioni per quel che si può con l'operatore sicuro, e poi si liscia il
campo delle normali per conto suo — sulla maglia **originale**, non su quella
saldata, perché la divisione dei vertici è l'unico posto dove il GLB scrive
quali spigoli sono vivi, e mediandoli si perderebbero le fessure fra i pannelli.

Trenta passate di posizione e venti di normali: mediana **34,8 → 11,0**, coda al
99% **837 → 159**, e nessun triangolo perso. Dopo la quantizzazione meshopt la
mediana risale a 13,3, perché le normali si comprimono a otto bit.

Il parabrezza all'inizio l'avevo escluso col ragionamento sbagliato: 2,9 rad/m
di mediana, undici volte meglio della carrozzeria, sembrava già liscio. Ma
«liscio» non è assoluto: dipende da quanto è lucida la superficie. La vernice ha
ruvidità 0,48 e sfoca; il vetro ha 0,055 ed è quasi uno specchio, quindi
restituisce le sfaccettature una per una. Più una superficie è lucida, più
stretta è la tolleranza.

## 16.3 Il disco grigio, e cosa c'era sotto

La piattaforma leggeva come plastica: un disco grigio uniforme, senza niente
dentro. Il materiale però dichiarava pietra scura lucidata, colore 0,055.

Il primo difetto era vero e istruttivo: **lo specchio stava a un millimetro da
terra e la piattaforma è alta ventiquattro centimetri**. Giusto finché l'auto
stava per terra; poi è arrivata la piattaforma, l'auto è salita sopra, e il
riflesso ha continuato a essere disegnato *sotto*. Un oggetto nuovo aveva
scavalcato un'ipotesi vecchia di un altro file, e niente lo diceva. Da qui
`ALTEZZA_PIATTAFORMA`: la quota adesso ha un nome, e chi la usa la trova.

Il secondo: il riflesso è **additivo**, e un'automobile nera deve poter
*spegnere* il riflesso della villa. Una somma non spegne niente. Quindi lo
specchio è entrato dentro il materiale della pietra, con la mappa d'ambiente
scesa a un ottavo per non contare due volte le stesse vetrate.

E qui tre trappole in fila, tutte già scritte da qualche parte e tutte ripagate:

- **`customProgramCacheKey`**. Il piano e il fianco erano due materiali con gli
  stessi parametri: three ha compilato il fianco e al piano ha passato il
  programma del fianco. Il codice dello specchio non è mai stato compilato, e
  non c'è stato nessun errore da nessuna parte. Lo stesso avviso stava già in
  `Abitacolo.ts` e in `Esterno.ts`, segno che una nota nei commenti non serve se
  non è dove si scrive.
- **Due matrici e non una.** `matriceTessitura` finisce moltiplicata per la
  matrice del piano riflettente, perché il suo shader le passa posizioni locali.
  Chi campiona da un altro oggetto ha in mano posizioni di mondo, e gliela
  applica due volte: sotto l'automobile si vedeva il cielo.
- **Il `replace` che non trova niente non dice niente.** Ho dubitato del nome
  del chunk per mezz'ora prima di fare la prova che non si può fraintendere:
  `outgoingLight = vec3(1,0,0)`. Il disco è diventato rosso. Da lì in poi il
  problema era un altro.

## 16.4 Il difetto degli strumenti

E il disco restava grigio anche a codice giusto.

Chiedendo alla scena invece che deducendo: `riflesso.attivo` era **falso**. Il
gestore di qualità l'aveva spento. Perché?

> `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)`

**Chromium headless su questa macchina non usa la scheda video: disegna in
software con la CPU.** Il gestore di qualità fa esattamente il suo mestiere,
misura fotogrammi lentissimi, scende di livello — e ai livelli bassi il riflesso
planare si spegne.

Cioè: per settimane ho guardato provini in cui la piattaforma era un disco
piatto, e ho creduto che fosse un difetto del materiale. Ho cambiato ruvidità,
colore, intensità d'ambiente, ho scritto uno specchio dentro la pietra. Il
difetto non c'era. C'era **uno strumento che misurava una scena diversa da
quella che vede chi apre il sito**.

**Decisione D28.** Ogni strumento che guarda la scena fissa il livello di
qualità (`window.fissaQualita('alto')`), e chi legge un provino sa a che livello
sta guardando. Diciassette strumenti aggiornati in un colpo. Le due eccezioni
sono `fps.mjs` e `qualita.mjs`, che il degrado lo devono misurare.

È il tipo di errore peggiore che si possa avere in un ciclo di verifica, perché
non dà nessun segnale: l'immagine arriva, è plausibile, ed è sbagliata. Tutti i
provini di questo diario, fino a qui, vanno riletti sapendolo.

## 16.5 Cercare il colpevole invece di sospettarlo

Restava una linea puntinata lungo il tetto e il bordo del cofano. Il primo
sospetto era l'occlusione ambientale a mezza risoluzione: spenta, identica. Il
secondo era lo z-fighting fra vetro e lamiera: scostamento di poligono in tutte
e due le direzioni, `depthWrite` spento, solo facce anteriori, vetro opaco —
sette prove, punteggi da 559 a 579, cioè nessuna differenza.

A trovarlo è stato uno strumento che spegne **un pezzo per volta** e conta i
pixel isolati lungo la sagoma: con tutto acceso 572, senza parabrezza 333.
Nessun altro pezzo scendeva sotto 430. Il vetro copre un quinto del soggetto e
faceva da solo il quaranta per cento del puntinato — non perché fosse mal fatto,
ma perché a ruvidità 0,055 non perdona.

È la stessa lezione di «tutto tranne X» del §14: si smette di spegnere pezzi a
caso e si fa spegnere alla macchina, uno per uno, con un numero in fondo.

## 16.6 Il conto

| | prima | dopo |
|---|---|---|
| carrozzeria, curvatura mediana | 34,8 rad/m | 13,3 rad/m |
| carrozzeria, coda al 99% | 837 | 178 |
| triangoli persi stirando | — | 0 |
| `auto_parti.glb` | 3,04 MB | 2,92 MB |
| `public/` | 18 MB | 14 MB |
| provini a qualità vera | mai | sempre |

## 16.7 Cosa è stato tolto

- `public/modelli/plancia.glb`, 3,1 MB: veniva caricata, le si correggevano i
  materiali, le si trovava una posa misurata di 37 cm — e poi `dentro()` la
  spegneva in ogni beat senza eccezioni. L'abitacolo fotografico l'aveva
  sostituita e nessuno l'aveva staccata. Ne sopravvive un numero solo, il posto
  di guida, che adesso ha un nome che dice cosa è.
- `public/hdri/qwantani_dusk_2_puresky_1k.hdr`, 1,1 MB: il cielo fotografico era
  tornato per portare i valori veri del crepuscolo. Poi il luogo è diventato una
  fotografia a 360 gradi intera, che quei valori ce li ha più il posto. Due
  cieli sovrapposti non fanno un cielo migliore.

---

# 17. Quattro cure da manuale, tutte sbagliate

Questo capitolo è quasi tutto fatto di tentativi falliti, ed è il più utile che
abbia scritto. Le cose riuscite si spiegano in due righe; sono le cure ovvie che
non funzionano a insegnare dov'è davvero il problema.

## 17.1 Gli aloni: tre deduzioni plausibili e tutte false

Nell'abitacolo comparivano due artefatti — una catena di schegge azzurre nel
cielo e una macchia calda sul bordo sinistro. Segnalati tre volte.

Le mie ipotesi, in ordine: **la maschera del parabrezza** (rifatta tre volte, gli
aloni identici); **la lastra della strada** (esclusa con un test che non valeva
niente — spegnevo `mesh.visible` mentre `dentro()` lo riscriveva a ogni
fotogramma; il fatto che «la strada resta visibile anche spegnendola» avrebbe
dovuto insospettirmi subito); **il fondo che passa oltre il bordo del piano**
(smentita dal conto: 44×30 m a 14 di distanza coprono il campo visivo anche a
3,55 di rapporto).

Poi ho smesso di dedurre e ho scritto `strumenti/aloni.mjs`: spegne un
ingrediente per volta, al formato del committente, e assegna un punteggio.

**Il primo punteggio non ha separato niente.** Contava la saturazione dentro
riquadri larghi, e dentro quei riquadri c'era anche mezza scena legittima:
nessuna prova scendeva sotto il novanta per cento. La regola che ne esce vale
per qualunque misura: **un metro che misura anche ciò che va bene non distingue
niente.**

Rifatto con due metri, uno per artefatto — contrasto locale in un cielo che è
liscio per definizione, e conteggio dei pixel caldi in una zona che è tutta
azzurra — la risposta è arrivata subito: spegnendo l'abitacolo la macchia crolla
al **3%**.

**Erano tutti e due la fotografia dell'abitacolo.** Oltre il parabrezza c'è un
colonnato; le colonne sono più scure del cielo, la soglia le esclude, e il
riempimento dei buchi non le recupera perché parte *da fuori* e considera buco
solo ciò che il bordo dell'immagine non raggiunge — ma le colonne arrivano fino
al bordo basso dell'apertura, quindi sono raggiungibili. La fotografia passava
attraverso una fila di fessure.

La cura è una **chiusura morfologica** da 28 px: sigilla le tacche larghe una
ventina di pixel e lascia intatto lo specchietto, che è largo duecento. Macchia
da 17411 a 567; schegge sparite.

## 17.2 Il quadro: il costo non era dove sembrava

Misurando i tempi per capitolo invece che sull'intera corsa, l'abitacolo stava a
**52 ms di mediana** contro i 17 dell'esterno. Spegnendo un pezzo per volta: il
quadro strumenti da solo ne costava 35.

Poi il numero che ha riorientato tutto:

| | |
|---|---|
| disegno della tela | 0,24 ms |
| render **con** il caricamento | 38 ms |
| render **senza** il caricamento | 0,07 ms |

Non era disegnare: era **caricare**. E 38 ms per 587 kB fanno quindici megabyte
al secondo — un ordine di grandezza sotto qualunque copia in memoria. Un tempo
così grande e così slegato dalla mole dei dati è la firma di uno **stallo**: la
scheda sta ancora leggendo quella tessitura e riscriverla la obbliga ad
aspettare.

Da lì, quattro cure da manuale e quattro misure contrarie:

| cura | esito |
|---|---|
| `willReadFrequently: true` | 53 → **111 ms**, raddoppia |
| due tessiture alternate | 83 → **106 ms**, peggiora |
| `flipY = false` | nessun cambio |
| metà dei pixel (720×204 → 512×145) | nessun cambio |

L'ultima è la più istruttiva: **se il costo non scende dimezzando i dati, non è
un costo di trasferimento.** È un'attesa, e le attese non si curano spedendo di
meno.

## 17.3 L'anello di retroazione

Il limite di frequenza era a tempo: ridisegna quando è passato 1/24 di secondo.
Sembra innocuo e ha un anello dentro — appena un fotogramma supera i 41 ms il
tempo accumulato basta *sempre*, quindi si ridisegna a ogni giro, quindi si
rallenta ancora, quindi basta di nuovo.

Si vedeva nella misura per capitolo: `accensione` a 19 ms e `velocita` a 50, con
lo stesso identico codice. Uno dei due era partito un filo più lento ed era
caduto dentro.

La cura è legare il limite al **conteggio dei fotogrammi**: uno su tre è uno su
tre qualunque cosa succeda. Degrada invece di peggiorare.

## 17.4 L'iride: non era una taratura, era un'unità di misura

Il raccordo del faro non si chiudeva. Interrogando la scena, `iridePiena` leggeva
0,70 dove il conto ne prevedeva 0,00, e ho passato mezz'ora a tarare la finestra
sui valori misurati — curando il sintomo nel sistema di riferimento sbagliato.

La causa è la prima riga di `inquadra`: `const t = morbido(regia.locale)`. Da lì
in poi ogni soglia di quella funzione vive nello spazio **addolcito**, mentre lo
scambio esterno/interno, in un altro file, è scritto sul **grezzo**. Due numeri
diversi per lo stesso istante, e tutti e due si chiamano «progresso».

`morbido(0,906) = 0,975`: esattamente lo scarto che non tornava.

La correzione non è un offset: è **una funzione sola**, `progressoIride`, che
converte il grezzo e viene usata da entrambe le estremità della transizione.
Finché la conversione ha un nome, non ci sono due verità.

## 17.5 Cosa è stato tolto

- **La galleria di pietra chiara.** Colore 0,34/0,29/0,24 con dentro una lampada
  forte: un tubo di pietra illuminato, visto da dentro, *è* un campo beige. Non
  c'era nessun errore — era quello che avevo costruito, ed era la cosa sbagliata
  da costruire. Dentro un gruppo ottico ci va metallo quasi specchio.
- **Le scritte che arrivavano dalla strada.** Due tentativi: dipinte
  sull'asfalto (illeggibili: si schiacciano contro l'orizzonte) e su un piano
  coricato che viene addosso (leggibili, e l'effetto c'era). Poi il committente
  le ha viste e non gli piacciono. Un effetto che funziona tecnicamente ma non
  convince chi ci mette la faccia è un effetto che non funziona.
- **La fascia tecnica e lo «scorri».** Dicevano le stesse cose della spina e
  della rotaia. Due elementi che dicono la stessa cosa non si rafforzano: si
  dimezzano.
- **Il riquadro sotto il dato.** Sostituito dalla spina: tipografia, una linea
  da un pixel e un rombo che arriva a toccare il faro. Un rettangolo dice «ho
  appoggiato una scheda sulla macchina»; una linea che tocca l'oggetto dice che
  il dato gli appartiene.

## 17.6 Il conto

| | prima | dopo |
|---|---|---|
| aloni, macchia calda | 17411 | 567 |
| abitacolo, mediana | 52,1 ms | 17,7 ms |
| esterno, mediana | 17 ms | 17 ms |
| fotogramma di ricarica del quadro | 53 ms | 53 ms (invariato allora; risolto in §18) |

E un'avvertenza che vale più dei numeri: questi tempi sono stati presi con la
macchina carica — Blender aperto e due agenti al lavoro. Lo stesso caricamento, a
macchina scarica, misurava 53 ms invece di 90. Prima di dichiarare quanto costa
davvero, va rimisurato in pace.


---

# 18. Il collo non era il tubo: era chi stava all'altro capo

Il difetto di §17.2 era rimasto aperto, e con una diagnosi che sembrava
chiusa: «è uno stallo, e gli stalli non si curano spedendo di meno». Vera la
prima metà, sbagliata la conseguenza che ne avevo tratto — che l'unica cura
fosse rifare lo strumento in WebGL, cioè giorni di lavoro.

## 18.1 Quanto costava davvero

Rimisurato a macchina scarica, e per capitolo:

| capitolo | p50 | p75 | p90 |
|---|---|---|---|
| accensione | 16,2 ms | 104,8 | 131,8 |
| velocita | 16,8 ms | 107,1 | 110,8 |

La mediana buona nascondeva tutto: **un fotogramma su tre costava 110 ms**. Non
53 come nella misura vecchia — il quadro nel frattempo è stato arricchito, e il
costo è cresciuto con lui.

La prova che fosse il quadro e non altro, spegnendo un pezzo per volta senza
toccare il resto:

| | p50 | p90 |
|---|---|---|
| normale | 16,0 | **118,2** |
| senza la ricarica (disegnato ma mai aggiornato) | 16,8 | 19,7 |
| senza il quadro del tutto | 16,7 | 19,8 |

Le ultime due righe sono identiche: **disegnare il quadro nella scena non costa
niente.** Costa consegnarlo.

## 18.2 Dove non era

Tre misure, ognuna delle quali toglie un sospetto:

| | |
|---|---|
| registrare il disegno sulla tela | 1,2 ms |
| costringere la tela a rasterizzare (`getImageData` di 1 px) | 3,1 ms |
| fabbricare una `ImageBitmap` dalla tela | 1,5 ms |

Cinque millisecondi in tutto. Non era il disegno; non era la rasterizzazione
differita del canvas 2D — quella che avevo sospettato per seconda, e che
sarebbe stata una spiegazione elegante; e non era la mole dei dati, che sono
297 kB.

## 18.3 Dov'era

Era `texImage2D` che prende come sorgente **l'elemento canvas**. Quel canvas
vive sulla scheda video in un contesto suo, e usarlo come sorgente di una
tessitura WebGL costringe i due contesti a mettersi d'accordo: il caricamento
aspetta che il disegno 2D sia finito *e* che la scheda abbia smesso di leggere
la tessitura di prima.

Riletta con questo in mano, la tabella delle quattro cure fallite di §17.2 dice
tutta un'altra cosa:

- `willReadFrequently` non toglieva la sincronizzazione, spostava il disegno in
  software — e questo quadro è fatto di sfumature e aloni sfocati;
- due tessiture alternate cambiavano *quale* tessitura, non *da dove* arrivava;
- dimezzare i pixel non toccava l'attesa.

**Nessuna delle quattro aveva mai toccato la sorgente.** Avevo scritto io
stesso, in §17.2, la frase che conteneva la risposta — «se il costo non scende
dimezzando i dati, non è un costo di trasferimento» — e mi ero fermato un passo
prima: se il collo non è il tubo, guarda chi sta all'altro capo.

## 18.4 La cura, che sono due righe

Si legge la tela una volta in memoria centrale e si consegna alla scheda un
vettore di byte. Una `DataTexture` non ha nessun canvas dietro: non c'è niente
da sincronizzare.

    const im = this.c.getImageData(0, 0, L, A)
    this.pixel.set(im.data)
    this.tessitura.needsUpdate = true

| | prima | dopo |
|---|---|---|
| p90, accensione | 118,2 ms | 26,5 |
| p90, velocita | 121,7 ms | 24,4 |
| p75, accensione (giro intero) | 104,8 ms | 24,4 |
| fotogrammi sopra 45 ms | 11,3% | 4,1% |

Il disegno è rimasto identico, riga per riga. **Non si è rifatto lo strumento in
WebGL** — che era il piano, ed era un lavoro di giorni. È cambiata la strada per
cui i pixel già disegnati arrivano alla scheda.

E siccome un aggiornamento ora costa cinque millisecondi invece di centodieci,
il tetto di frequenza è salito da 24 a 30 al secondo: l'arco del contagiri ha
smesso di scattare, e non è costato niente.

L'unica differenza di comportamento fra le due tessiture va detta perché è una
trappola: `getImageData` rende le righe dall'alto in basso, una `CanvasTexture`
alza `flipY` da sola e una `DataTexture` no. Senza, il quadro esce a testa in
giù.

## 18.5 Tre difetti che il provino ha mostrato e il ragionamento no

- **Il testo dei tempi interni sopra il quadro.** Il commento in `Voci.ts` lo
  giustificava ancora così: «il quadro sta a sinistra del centro». Era vero
  quando è stato scritto; poi il quadro è stato allargato a tutto il riquadro e
  arriva al 68%. Il titolo cadeva sopra il parziale. Il testo sale in alto a
  destra, nella massa scura del padiglione — l'unica zona larga e ferma che
  resta — e l'ordine di lettura ci guadagna: parabrezza, frase, quadro.
- **I comandi che chiedevano di aver già creduto.** Comparivano a
  `regia.locale > 0.12`, cioè dopo aver cominciato a scorrere. Chi apre e sta
  fermo — che è esattamente chi va convinto — non vedeva nessun comando. Ora
  arrivano da soli dopo un secondo e mezzo: il ritardo resta, ma si misura sul
  tempo, che scorre da solo, e non su un'azione dell'altro.
- **Metà della prova tolta al telefono.** La riga dei luoghi spariva sotto i
  720 px, «perché quattro nomi non ci stanno accanto ai campioni». Non ci stanno
  *accanto*: ci stanno benissimo *sotto*. E l'obiezione a cui questi comandi
  rispondono — «tanto valeva un video» — sul telefono è più forte che altrove.

## 18.6 I filmati duravano il quintuplo

`registra_telefono.mjs` produceva 142 secondi per un percorso di 26: a ventidue
secondi si era ancora nella prima schermata. Il ciclo faceva un `page.evaluate`
per fotogramma, e ogni giro costava un viaggio di andata e ritorno sul
protocollo di Chromium — centottanta millisecondi invece di trentatré.

Due correzioni, e valgono per qualunque registrazione:

1. **il ciclo vive dentro la pagina**, mandato una volta sola, e si regola sul
   tempo vero e non sul conteggio dei fotogrammi. Così la durata è quella
   dichiarata anche quando la scena rallenta: rallentando si perdono fotogrammi,
   non secondi;
2. **si taglia l'attesa di caricamento.** Playwright filma dalla creazione della
   pagina, e questa scena ci mette dieci secondi a caricarsi. Quei secondi
   finivano nel filmato, che durava 82 secondi per trenta di sito — e sembrava
   che il sito fosse lento. Non si può dire a Playwright di cominciare dopo, ma
   si può segnare l'istante e tagliare in coda.

---

# 19. La notte in cui il sito è diventato un prodotto

Sette blocchi di lavoro in una notte, e il filo che li tiene insieme non è
tecnico: è che **quasi tutto quello che si è tolto era falso, e quasi tutto
quello che si è aggiunto era già lì e non si vedeva.**

## 19.1 Il quadro non era intero

Il committente ha mandato uno screenshot con una domanda sola: «ti sembra tutto
intero?». Non lo era, e guardando la tela nuda invece che il fotogramma
composito si capiva subito perché.

Al minimo — 900 giri su 9000 — la parte accesa del contagiri è un arco di 27
gradi, **più corto del diametro della testa luminosa che ci sta sopra**. Con la
pista spenta al 20% di opacità, cioè invisibile, quello che restava sullo
schermo era un pezzo luminoso sospeso nel nero alle sette in punto.

Tre cause, tutte misurate sul disegno:

| | prima | dopo |
|---|---|---|
| pista spenta, opacità | 0,20 | 0,42 + un filo netto sul bordo |
| alone, larghezza | 26 px (2,6× la pista) | 16 px |
| testa dell'arco, raggio | 16,7 px | 10,4 px (era più grande dei numeri) |
| quadrante, centro nella sua zona | 0,446 | 0,480 |

L'ultima riga è quella che spiega la «fascia vuota» al centro del pannello,
segnalata mesi fa e mai risolta: la zona del quadrante va da 0,320 a 0,640 —
centro 0,480 — e il quadrante stava a 0,446. Diciassette pixel su 512, che
guardati sono venticinque pixel d'aria a sinistra e centotrenta a destra.

## 19.2 Poi si è scoperto che era anche finto

Risolto il difetto di forma, restava quello di sostanza: **87% di carica, 406 km
di autonomia, TRIP A 128,4, ODO 14208, la runa del Bluetooth.** Cinque
informazioni scritte con cura — c'era perfino il consumo che sale con la
velocità — e nessuna che misurasse niente.

Era la stessa cosa che avevo tolto dalla hero mesi prima, sopravvissuta in
mezzo perché «fa vero». Non fa vero: fa videogioco. Un cruscotto che dichiara
un'autonomia che non esiste è la stessa promessa vuota di un sito che dichiara
«+300% conversioni», e su un portfolio che vende rigore tecnico è un autogol.

Al loro posto ci sono i numeri della scheda video, che chiunque può verificare
aprendo gli strumenti del browser:

- **fotogrammi al secondo** e millisecondi per fotogramma, con la barra tarata
  su un fondo scala di 20 ms — non sui 16,7 del budget, perché a fondo scala
  uguale al budget qualunque fotogramma appena sopra faceva la barra rossa: a
  59 al secondo, cioè benissimo, il pannello gridava;
- **le chiamate di disegno e i triangoli**, che sono esattamente quello che un
  altro sviluppatore andrebbe a guardare;
- **lo scorrimento**, che è l'unica grandezza del pannello a venire da chi
  guarda e non dalla scena.

Restano finte la marcia, i giri e la velocità, e va bene: sono legate allo
scorrimento, e «più forte scorri, più forte va» è la tesi dichiarata del sito,
non una bugia.

**Un difetto trovato per caso e istruttivo:** il quadro leggeva «DISEGNO 1 /
TRIANGOLI 1». `renderer.info.render` si azzera all'inizio di ogni `render()`, e
con una catena di effetti le passate sono cinque — l'ultima è un rettangolo a
pieno schermo. Spegnendo `autoReset` e azzerando una volta prima della catena,
i conteggi tornano quelli veri: 241 chiamate e 2,5 milioni di triangoli
all'esterno, 41 e mille dentro.

## 19.3 Il ripiego: una preferenza onorata a parole

Il sito non aveva nessun ripiego. Costruito quello — una decisione sola, presa
prima di scaricare qualunque cosa, con la causa scritta su `data-ripiego` — la
prima misura è stata una doccia fredda:

| | scaricato |
|---|---|
| chi ha `prefers-reduced-motion` acceso | **12,6 MB** |

La pagina statica c'era, era leggibile, e costava come l'esperienza intera. Due
cause, e la seconda l'avevo scritta io:

1. **il preannuncio** dei due file pesanti era due `<link rel="preload">` fissi
   nell'HTML, e partiva sempre. Un preannuncio non si può annullare, e nessun
   modulo arriva prima del parser: la decisione doveva scendere in uno script
   in testa alla pagina;
2. **l'import statico**. `Esperienza` tirava dentro three.js, il caricatore
   GLTF, la catena degli effetti e — attraverso `ui/Comandi` — anche i
   materiali. Rendendo dinamico il solo `Esperienza` si scendeva a 8,0 MB: il
   resto entrava lo stesso, **da un `Vector3` importato per la spina e da un
   `import * as THREE` messo lì per gli strumenti di diagnosi.** Un solo import
   statico di three basta a tirare dentro three.

Il confine giusto non passa fra «scena» e «interfaccia»: passa fra **ciò che
serve per decidere** e ciò che serve dopo aver deciso. Spostato tutto il
secondo gruppo in `src/avvio.ts`:

| | prima | dopo |
|---|---|---|
| pagina statica, scaricato | 12,6 MB | **191 kB** |
| punto d'ingresso, in produzione | 1,22 MB | **3,2 kB** (1,56 gz) |

E ci guadagna anche chi l'esperienza la vede: il primo disegno della pagina non
aspetta più la compilazione di un megabyte di libreria.

## 19.4 Il finale: la strada diventa il contatto

Negli ultimi 7% dello scorrimento — un settimo beat, `contatto`, ricavato
tagliando `velocita` — il mondo rallenta, il cruscotto si dissolve, la
carreggiata si spiana e la prospettiva si chiude finché resta **una sola riga
orizzontale**, che è la sottolineatura dell'indirizzo di posta.

**La prima idea era sbagliata e si vede disegnandola.** Doveva sopravvivere la
mezzeria — la striscia bianca al centro della carreggiata — e invece la
mezzeria corre *verso* il punto di fuga: sullo schermo è una riga verticale che
si assottiglia. Quello che diventa una riga orizzontale è **l'orizzonte**, che è
anche il posto dove la mezzeria finisce. E si calcola in una riga, perché
l'orizzonte è il luogo dei raggi con `d.y` uguale a zero.

**Poi si sono viste due righe.** Quella di WebGL al 22% dell'altezza e quella
del documento al 50%. La causa: la carreggiata ha una pendenza di 8,4 gradi,
quindi il suo orizzonte non è quello del mondo. Due correzioni, e la seconda è
quella che conta:

- la strada **si spiana** durante il finale, portando il suo orizzonte a
  coincidere con quello del mondo. Non si sposta la riga per inseguire una
  pendenza: si toglie la pendenza, che è anche ciò che la specifica chiedeva;
- l'altezza dell'orizzonte si **misura e si consegna al foglio di stile** come
  `--orizzonte`, proiettando il punto di fuga vero a ogni fotogramma. Scrivere
  50% avrebbe funzionato solo nell'ultimo fotogramma.

**Il vincolo che rende tutto questo una dimostrazione e non un effetto** è che
sia reversibile. Lo strumento `strumenti/finale.mjs` arriva in fondo, risale, e
confronta i profili luminosi sugli stessi punti:

| punto | scarto medio andata/ritorno |
|---|---|
| 0,996 | 0,0 |
| 0,984 | 0,0 |
| 0,972 | 0,0 |
| 0,960 | 0,1 |
| 0,945 | 1,3 |
| 0,915 | 1,1 |

Una sequenza pre-renderizzata potrebbe imitare l'immagine. Non può imitare
l'inversione in tempo reale.

## 19.5 Tre metriche sbagliate in una notte

È la parte più utile del capitolo, ed è tutta autocritica.

**La prima.** Cercando cosa restasse acceso nel finale ho misurato con
`sharp(png).extract(...).greyscale().stats()`. Le quattro prove davano lo stesso
numero identico, e ci ho messo un giro a capire perché: **`stats()` di sharp
ignora `extract` e misura la sorgente.** Quattro volte la stessa cifra, presa
per quattro misure diverse.

**La seconda.** Ho guardato tavole di contatto in JPEG di fotogrammi quasi neri
e ho descritto «un campo blu notte con dentro la sagoma del volante che non si
spegne mai». Il campionamento diretto dei pixel diceva `(0,0,0)`. Con un'alzata
di gamma la sagoma c'era davvero — a **valore 2 su 255**, cioè sotto la soglia
di qualunque schermo. Avevo diagnosticato un difetto invisibile e stavo per
curarlo.

**La terza.** Ho ritagliato 780 pixel da uno screenshot di telefono per
guardare la testata, e ho concluso che «CORTE» usciva dal bordo. Lo strumento
diceva che i comandi finivano a 300 su 390. Il ritaglio era in unità
sbagliate: `deviceScaleFactor` vale **3**, quindi 780 pixel sono due terzi di
schermo e stavo guardando un pezzo.

La regola che ne esce, e vale più delle tre storie: **una misura va verificata
prima di credere a quello che dice, esattamente come un'ipotesi.** Un metro
rotto non dà errore — dà un numero.

E la cura è sempre la stessa: interrogare la scena invece di dedurla. La sagoma
del volante che non si spegneva l'ho attribuita all'abitacolo fotografico, poi
al quadro, poi alla strada. Un raggio lanciato dentro la scena ha risposto
`PLANCIA, VOLANTE` — il gruppo `INTERNO`, geometria vera illuminata dalle luci
della scena, che non sentiva né l'esposizione dell'abitacolo né `uLuce`: due
manopole che credevo generali e che governavano solo i loro due oggetti.

## 19.6 La seconda lingua

Un dizionario con una chiave per frase e due valori, e non due copie dei file:
alla prima riscrittura le copie divergono, e la seconda la rilegge solo chi non
parla la prima.

Due decisioni che valgono più del meccanismo:

- **la scelta a mano vince e resta.** `Accept-Language` decide la prima volta e
  basta. È il difetto più comune dei siti multilingua e si corregge con tre
  righe;
- **le traduzioni non sono traduzioni.** «SITES YOU DO NOT / LOOK AT. / YOU
  DRIVE THROUGH.» è giusta di senso e sbagliata di misura: l'ultima riga fa
  diciotto caratteri contro i sedici della più lunga in italiano, e nel provino
  il titolo andava a capo diventando di quattro righe. Un titolo tradotto che
  occupa una riga in più non è una traduzione: è un'impaginazione diversa.

## 19.7 Il conto della notte

| | prima | dopo |
|---|---|---|
| p90, tempi interni | 118 ms | 24 ms |
| p75, `accensione` | 104,8 ms | 18,1 ms |
| fotogrammi sopra 45 ms | 11,3% | **3,6%** |
| pagina statica, scaricato | 12,6 MB | **191 kB** |
| punto d'ingresso in produzione | 1,22 MB | **3,2 kB** |
| beat | 6 | 7 |
| lingue | 1 | 2 |
| numeri inventati nel quadro | 5 | **0** |

E una cosa che non è un numero: il sito adesso ha una fine. Prima si scorreva
fino in fondo e si restava dentro un'automobile che correva, senza che niente
dicesse che il racconto era finito.

---

# 20. LA NOTTE DELL'AUDIT DA ZERO

Un revisore ha smesso di guardare il delta rispetto alla build precedente e ha
rifatto un audit come se vedesse VELOCITY per la prima volta. La sua tesi: il
concept è forte e **il craft è disomogeneo**. Quando un momento come DOCUMENTI
è molto forte alza percettivamente anche una ruota o un guardrail che, isolati,
non sono allo stesso livello.

Aveva ragione, e la lista che ne è uscita ha prodotto la notte più densa di
diagnosi sbagliate di tutto il progetto.

## 20.1 La riga di luce sul tetto: quattro diagnosi, quattro smentite

Il committente indica un ritaglio: lungo la cucitura fra lamiera e vetro corre
una riga chiara e frastagliata. Sembra un difetto da niente. Ci sono volute
quattro prove, e ognuna sembrava quella giusta.

| ipotesi | prova | esito |
|---|---|---|
| aliasing di geometria | il campionamento multiplo c'era già | riga identica |
| il bordo del vetro | fascia ceramica sul perimetro, portata a 30 cm | vetro tutto nero, **riga ancora lì** |
| z-fighting | scostamento di poligono a −2, 0, +2 | luminanza 39,2 in **tutti e tre**, cifra per cifra |
| il vetro che sporge | nascosti i vetri, poi la carrozzeria | serve che ci siano **tutti e due** |

È la quarta a dire cos'è. Dove due superfici lucide si incontrano lungo uno
spigolo vivo, la normale gira di novanta gradi nello spazio di un pixel: non è
il bordo del triangolo a essere frastagliato, è **la luce calcolata dentro il
triangolo**. Ogni pixel prende la normale del proprio centro, e sopra uno
spigolo quella scelta è un caso.

La cura si chiama antialiasing speculare e sta in quattro righe
(`scene/Nitidezza.ts`). E anche lei ha sbagliato due volte prima di funzionare:

- innestata su `roughnessmap_fragment` — che sembra il posto naturale, è lì che
  nasce `roughnessFactor` — la normale geometrica **non esiste ancora**;
- con `geometryNormal` — che in questa versione di three vive solo dentro il
  pezzo che lo calcola.

E in tutti e due i casi il fallimento non è stato un errore leggibile: è stata
**un'automobile invisibile**. Tre materiali su quattro spariti dalla scena, e
`guardia.mjs` che continuava a dire «tutto a posto» — perché guarda la console
al caricamento, e questi errori arrivano al primo disegno di quel materiale.

> **Due volte di fila ho avuto una guardia verde e il soggetto sparito.**
> Il metro va allungato.

## 20.2 Le ancore che non portavano da nessuna parte

`LAVORI`, `STUDIO`, `CONTATTO` e la chiamata all'azione della hero erano
`<a href="#lavori">` veri, verso sezioni che esistono davvero — quelle del
documento semantico. Che però è nascosto: `clip-path: inset(50%)`.

Per una sintesi vocale funzionavano perfettamente. Per chi guarda, **non
facevano niente**: il fuoco si spostava su un elemento invisibile e la pagina
restava dov'era. Quattro collegamenti morti, di cui uno è il pulsante più
importante del sito.

Ed è un difetto che nessun controllo segnala, perché dal punto di vista
dell'accessibilità è corretto.

La cura non è mostrare il documento: è che qui i posti non sono ancore, sono
**istanti**. «I lavori» è il momento in cui la pattuglia li sta guardando. Un
click si traduce in una posizione di scorrimento e ci si va scorrendo — non
saltando, perché su un sito il cui contenuto è il percorso, saltarlo lo tradisce.

## 20.3 Sette megabyte che nessuno scaricava

`public/` non passa dal build: Vite lo copia in `dist/` per intero, senza
guardare se qualcuno ne usi il contenuto.

Dentro c'erano tre marmi in JPEG (3,0 + 1,8 + 0,7 MB), più `cemento_*`,
`intonaco_*` e `pietra_*`: le tessiture della corte costruita, fuori scena da
mesi. Nessuno le scaricava, quindi non facevano male a chi guarda — ma erano
**metà del peso del pacchetto pubblicato**, e le vedeva chiunque aprisse il
repository o guardasse il deploy.

`public/` da 16 MB a 8,6.

## 20.4 Il carattere arrivava da un altro dominio

`index.html` caricava Inter da `fonts.googleapis.com`. Il sito mostrava davvero
Arial per un istante e poi saltava — ed era anche la violazione di una regola
già scritta nella skill dello stack di questa agenzia, non applicata proprio sul
progetto più importante.

Cinque file, 203 kB, solo il sottoinsieme latino. E il monospazio ha smesso di
essere `ui-monospace, SF Mono, Menlo, Consolas`, che non è un carattere ma un
elenco di preferenze: su Windows usciva Consolas, ed è una delle ragioni per cui
il cruscotto sembrava progettato da un'altra mano.

## 20.5 Il telefono, voce per voce

Un provino non basta: i difetti del telefono sono quasi tutti di
sovrapposizione, e due rettangoli che si toccano si vedono solo se si guarda
proprio lì. `strumenti/telefono_audit.mjs` controlla cinque cose a tre formati e
otto tempi — tagliato, fuori schermo, sovrapposto, bersaglio piccolo, corpo
minuscolo.

Alla prima corsa: **circa cento difetti**. I tre collegamenti del menu erano
36×11, 38×11 e 55×11 contro i quarantaquattro per lato che serve un dito; quelli
della lingua 10×11, cioè un decimo dell'area necessaria.

E due lezioni sul metro, non sul sito:

- **un elemento ruotato non è tagliato.** Per otto tempi lo strumento ha gridato
  su `.rotaia__nome`, che sta in verticale: il suo `scrollWidth` misura il testo
  per il lungo e il suo rettangolo per il largo. Un metro che grida a ogni giro
  smette di essere letto, ed è il difetto peggiore di uno strumento;
- **un'etichetta e un testo non si misurano allo stesso metro.** Undici pixel
  per «GIUSEPPE VILLANI» sono la norma; undici per una riga di testo no.

## 20.6 Il bersaglio si dichiara, non si calcola

Tre volte di fila ho provato a ottenere i quarantaquattro pixel con il
riempimento, e tre volte il conto tornava sulla carta e sbagliava di sei sullo
schermo. L'altezza di riga vera di un elemento in linea non è quella che si
calcola a mano.

`min-height: 44px` più un `inline-flex` che centra: il numero è quello
dichiarato e non dipende più dal carattere, dal peso o dall'interlinea che
qualcuno cambierà fra sei mesi.

Ed è la stessa lezione, per la terza volta in questo progetto: **un numero
scritto a mano che descrive un altro elemento è una bomba a orologeria.** Non
sbaglia il giorno in cui lo scrivi, sbaglia il giorno in cui qualcun altro tocca
l'elemento che descrive. La quota dei comandi sul telefono si è rotta due volte
— 54 e poi 72 — finché la testata non ha cominciato a dichiarare la propria
altezza.

## 20.7 Il conto

| | prima | dopo |
|---|---|---|
| difetti misurati sul telefono | ~100 | verificato a tre formati |
| `public/` | 16 MB | **8,6 MB** |
| JS in brotli | — | **295 kB** |
| collegamenti della testata | 4 morti | 4 funzionanti |
| famiglie di caratteri | 1 esterna + un elenco | **2 in locale** |
| lavori nell'elenco | 1 | **10** |
| sistemi di numerazione | 3 | **1** |

## 20.8 Il difetto che nessun metro poteva trovare

`strumenti/telefono_audit.mjs` dava zero difetti a tre formati e otto tempi. Poi
ho guardato il provino e ho visto i comandi appoggiati esattamente sopra i tre
schermi dei lavori.

Il metro non sbagliava: confronta **blocchi di testo fra loro**, e lì si
sovrappongono un pannello del documento e tre oggetti della scena. Due mondi
diversi, che nessun rettangolo mette a confronto — il DOM non sa dove cadano gli
oggetti 3D, e la scena non sa dove cade il DOM.

> **Uno strumento verde non vuol dire che non ci sono difetti: vuol dire che non
> ce ne sono di quelli che sa cercare.** Ed è la seconda volta nella stessa
> notte, dopo la guardia che diceva «tutto a posto» con l'automobile invisibile.

Il seguito è un piccolo problema di composizione con tre vincoli che si
contendono la stessa fascia — la testata, i comandi, gli schermi — e la
soluzione è stata comprimere il più comprimibile dei tre (i quattro luoghi su
una riga sola, 162 px di pannello diventati 104) e poi far scendere e avvicinare
gli schermi, che su un telefono devono passare **davanti** all'automobile.

E le due misure sono legate: appena i comandi si sono stretti, gli schermi hanno
potuto tornare più su e più indietro. Chi ritocca l'una deve guardare l'altra, e
sta scritto in tutti e due i punti.

## 20.9 Tutti gli strumenti misuravano il sito FERMO

Il difetto piu' grave del progetto, e per settimane nessuno dei dieci strumenti
di questo repo poteva vederlo. Non perche' fossero rotti: perche' erano tutti
costruiti allo stesso modo.

> Porta la pagina a una posizione. **Aspetta venti fotogrammi.** Misura.

E' giusto per misurare uno stato, e nasconde per costruzione l'unica cosa che
chi guarda vede davvero — il **movimento**.

Un revisore ha guardato il filmato fotogramma per fotogramma: fra il secondo
54,08 e il 54,16 il faro diventa strada di colpo, senza un solo fotogramma di
sovrapposizione. E `strumenti/raccordo.mjs` diceva che la transizione era
continua. **Avevano ragione tutti e due.** Campionata a passi e' continua;
percorsa a tempo reale, la pagina la scavalca.

Perche' un registratore, come un dito, muove la pagina in funzione
dell'**orologio**: `scrollTo(corsa * (adesso - inizio) / durata)`. Se un
fotogramma dura due secondi, il successivo trova l'orologio molto piu' avanti e
salta di li'. Chi guarda non vede una transizione lenta: non la vede.

`strumenti/salti.mjs` misura esattamente questo, e la prima corsa ha detto:

    599 fotogrammi su 1800 attesi
    venticinque salti, il peggiore scavalca il 10% della pagina
    in un fotogramma solo, durato 2995 ms

### Cinque diagnosi, quattro sbagliate

| ipotesi | prova | esito |
|---|---|---|
| compilazione degli shader | riscaldamento con `compileAsync` | il salto sul faro da 1622 a 558 ms, gli altri restano |
| proprieta' CSS a ogni fotogramma | scritte solo se cambiano | **nessun cambiamento** |
| il guardiano che cammina sul disco | spento | **nessun cambiamento** |
| raccolta della memoria | mucchio misurato a ogni fotogramma | **45 MB fisso, sempre** |
| **riempimento della GPU** | finestra dimezzata | **da 599 a 1369 fotogrammi** |

La quinta. E il fotogramma che mi ha messo sulla strada giusta e' quello che
sembrava piu' assurdo: **2113 ms per disegnare 41 chiamate e mille triangoli**.
Un fotogramma che non crea niente, non alloca niente e disegna quasi niente non
sta lavorando: sta pagando i PIXEL. `renderer.info` conta quello che il codice
consegna, non quello che la scheda fa.

### E il colpevole l'avevo aggiunto io il giorno prima

Il campionamento multiplo, messo per togliere le scalette sui fili di luce — un
difetto vero, indicato sul montante:

| | fotogrammi su 1800 |
|---|---|
| senza | **1164** |
| con 4 campioni | 646 |
| con 2 campioni | 656 |

**Quasi la meta' dei fotogrammi.** E fra due campioni e quattro non cambia
niente: il costo non sta nel numero, sta nell'avere un bersaglio multicampione —
la risoluzione a ogni fotogramma e la banda passano comunque.

Quindi e' una scelta binaria, ed e' andata dov'era il suo posto fin dall'inizio:
nel gestore di qualita', accanto al bloom e all'occlusione. Al livello alto si
tiene, sotto si spegne — e chi scende non resta senza antialiasing, perche'
quello **speculare** (`scene/Nitidezza.ts`) sta dentro lo shader, non costa
niente, e cura proprio il difetto peggiore.

### E una cosa che gli strumenti facevano di sistematico

Tutti chiamano `fissaQualita('alto')`, per una ragione buona: in headless
Chromium disegna in software e il gestore scende da solo, quindi si misurerebbe
una scena degradata.

Su `salti.mjs` era sbagliato. Quello strumento misura **chi guarda**, non la
scena, e chi guarda ha il gestore acceso — e' proprio il suo mestiere accorgersi
che i fotogrammi si allungano. Misuravo il sito con la rete di sicurezza
staccata.

### Il conto

| | prima | dopo |
|---|---|---|
| fotogrammi su 1800 | **599** | **1457** |
| salti sopra la soglia | 25 | **3** |
| lo stallo peggiore | 2995 ms | **606 ms** |
| pagina scavalcata dal peggiore | 9,98% | **2,02%** |
| p50 a scena ferma | 16,3–17,0 ms | 15,7–17,0 ms |

E la regola che resta, che vale piu' dei numeri:

> **Uno strumento che aspetta prima di misurare non puo' vedere gli stalli.**
> Su un sito il cui contenuto e' il percorso, il costo va misurato mentre il
> percorso si percorre.

## 21. La strada non la usava nessuno

L'audit chiama la scena di guida «il punto visivo piu' debole» e dice che
«legge come prototipo». Aveva ragione, ma non sul motivo che dava.

I suoi due rimedi — variazione di ruvidita' sull'asfalto, vernice con una
finitura diversa dal manto — erano **gia' fatti tutti e due**: il manto prende
colore, normali e ruvidita' da una fotografia di granulato, la ruvidita' e'
letta come scarto dalla propria media e amplificata di due volte e mezzo, e la
segnaletica ha un riflesso quasi doppio perche' una pellicola stesa specchia
piu' del granulato che ha sotto.

Il difetto era un altro, e si vede solo quando si smette di guardare i
materiali: **quella strada non la usava nessuno.** Era appena stata stesa,
tutta lo stesso giorno, con i lampioni usciti dalla stessa scatola lo stesso
minuto, e nessuna gomma ci era mai passata sopra.

Sono quattro segni, e nessuno costa una geometria in piu'.

**Le tracce delle ruote.** Sotto ogni corsia corrono due bande lucidate dai
pneumatici. Il passo fra le due non e' un numero nuovo: e' `faro.semipasso`,
78 cm, la stessa mezza carreggiata da cui escono i fari — le gomme di questa
automobile passano dove passano quelle di tutte le altre. Il bitume lucidato
specchia di piu' e rimanda meno del proprio colore, e di notte, con il manto
che riflette il cobalto dell'orizzonte, i due nastri si accendono e corrono
via. Misurato sul provino: **+13 su 255 di scarto, in due picchi larghi
mezzo metro, esattamente dove passano le ruote.**

**Il manto non e' stato steso tutto lo stesso giorno.** Due onde lente, a
trentanove e cinquantadue metri, su ruvidita' ed esposizione: sono i rappezzi
e le riprese di stesa. Nessuna delle due si vede da sola; insieme, il manto a
media distanza smette di essere una campitura. La fotografia porta il singolo
sasso ma si ripete ogni metro e mezzo — nessuna tessitura puo' dare una
variazione su questa scala.

**I due passi non sono liberi, ed e' l'unico vincolo duro del lavoro.**
`uAvanzamento` si ripiega a 156 metri per non perdere precisione, e qualunque
motivo il cui passo non divida 156 **salta al ripiegamento**. 39 e 52 lo
dividono quattro e tre volte, e il loro minimo comune multiplo e' 156 stesso:
dodici combinazioni prima di ripetersi. Con 40 e 50 si vedrebbe uno scatto
del manto ogni due chilometri, cioe' un difetto che si vede e non si
diagnostica.

**I catarifrangenti**, uno ogni dodici metri sulla banchina — il passo del
tratteggio, che divide 156, ma sfasato di sei e messo in mezzo fra un tratto e
il successivo: due motivi che battono lo stesso tempo si leggono come uno.
Sono l'unica cosa della scena che rimanda la luce dritta a chi la manda, quindi
si accendono col fascio e con nient'altro, e si sommano al colore invece che
alla luce, perche' un occhio di gatto e' un prisma di vetro e cio' che torna
indietro non passa dal bitume.

E qui c'e' la cosa che ho dovuto misurare tre volte per credere.

### Un oggetto da undici centimetri, a quaranta metri, non esiste

Alla misura vera — 11 cm per 15 — i catarifrangenti erano **invisibili**. Non
poco visibili: invisibili. Ho alzato la forza a nove, poi a quaranta: niente.
Solo portandoli a ottanta centimetri per un metro e venti sono comparsi, e a
quel punto era chiaro che il codice funzionava e il problema era altrove.

Il conto lo spiega, e vale per qualunque dettaglio piccolo in una scena in
prospettiva. La copertura di un pixel e' il **prodotto** di due frazioni:

    lungo la strada   15 cm su ~2 m di impronta del pixel  =  0,075
    di traverso       11 cm su ~17 cm                      =  0,63
    insieme                                                 =  0,047

Cioe' a quaranta metri quel prisma occupa **il cinque per cento di un pixel**.
Perche' si veda deve essere venti volte piu' luminoso di cio' che gli sta
intorno — ed e' esattamente quello che un catarifrangente e': un prisma di
vetro rimanda indietro due o tre ordini di grandezza piu' della vernice.
Il numero grosso nel codice non e' un trucco: **e' il numero giusto.**

E siccome la copertura tende a uno quando il prisma arriva vicino, li' la
stessa formula darebbe centinaia — una macchia bianca che sfonda la soglia del
bagliore e riempie mezzo fotogramma di velo. Il tetto e' l'equivalente della
saturazione della pellicola, ed e' il motivo per cui nelle riprese vere quei
punti restano punti.

**Le lampade non sono tutte uguali**, e la parte che conta e' la seconda. Sei
brillantezze diverse che si ripetono ogni sei pali — sei, perche' sei pali sono
156 metri, e oltre quel numero il ripiegamento ricomincerebbe da un'altra parte
e si vedrebbe un lampo. Ma il valore va preso **a meta' strada fra due pali**,
se no nel punto in cui l'indice scatta compare una riga dritta attraverso tutta
la carreggiata: poco luminosa, e dritta, e le righe dritte si vedono sempre.

E poi i due filari hanno due forniture diverse, +7% a destra e -7% a sinistra.
Questa non ha nessun rischio di ciclo perche' non dipende da dove si e', e fa
il lavoro piu' grosso di tutti: rompe la **simmetria perfetta** del corridoio,
che e' uno dei segni piu' riconoscibili di una scena calcolata.

La media dei quattro numeri e' uno: la taratura di `pozzaPali`, che e' misurata
sul fotogramma, resta valida.

### E non e' costato niente

    velocita   p50 16,0-16,6 ms   (la banda era 15,7-17,0)
    salti      1505 fotogrammi su 1800   (erano 1457)

Quattro segni di usura, due texture fetch in meno di zero, e la strada adesso
ha una storia.
