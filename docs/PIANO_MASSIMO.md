# Piano massimo — velocity

> ## Stato dell'esecuzione — notte del 25 agosto
>
> Questo piano e' stato eseguito nella parte che si poteva fare senza il
> committente. Cosa e' cambiato rispetto a com'e' scritto qui sotto:
>
> **Fatto:** §2.1 contatto · §2.2 metadati (erano gia' iniettati dal plugin Vite:
> il `grep` su `index.html` dava 0 perche' li scrive a build time — nel documento
> generato sono 18) · §2.3 pallino della finitura · §3.1 ORM rifatta · §3.2
> occlusione cotta · §3.3 sigma del passa-alto · §4.1 STUDIO.
>
> **Corretto rispetto al piano:**
> - §3.1 diceva di cuocere le tre ottave nella mappa. Non si fa: sommarle in un
>   canale a 8 bit sopra valori vicini al massimo le schiaccia contro il tetto —
>   che e' il difetto stesso che il §1 esiste per trovare. Restano nello shader,
>   dove sono moltiplicative e non clippano.
> - §3.3 diceva «se le fughe sono sbiadite scendi a sigma 4-5». E' il verso
>   sbagliato: un passa-alto e' «originale meno sfocato», quindi un sigma
>   PICCOLO toglie di piu'. Il valore che supera il cancello e' **34**.
> - §3.4 il panorama sfocato era gia' fatto meglio con `backgroundBlurriness`
>   (zero byte invece di un secondo file).
> - §3.5 l'impronta a terra e' fatta AFFONDANDO la ruota di 11 mm, non
>   schiacciando i vertici: queste ruote girano, e un appiattimento cotto nella
>   geometria girerebbe con loro.
> - §5.1 i numeri inventati del quadro **erano gia' stati tolti**.
>
> **Due cancelli non passano, e la ragione e' che i cancelli hanno torto:**
> - §3.1 «dev.std >= 0,05 sulla carrozzeria»: la variazione sta nello shader,
>   non nella mappa. Nella mappa la deviazione SCENDE, ed e' voluto.
> - §3.2 «mediana dell'occlusione <= 235»: una carrozzeria e' quasi tutta
>   convessa, quindi con un raggio corto il 74% dei texel STA a 1,0. Allungare
>   il raggio farebbe passare il numero e scurirebbe tutto senza dire niente.
>
> **Aperto:** il dominio per `VITE_SITO`; §4.2 accessibilita' e strato
> semantico; una traccia tenue dell'arco sopra la ruota (vive nella stessa banda
> che porta le fughe, e le due non si separano con un filtro solo).


**Data:** 25 agosto 2026 · **Orizzonte:** due settimane, poi si candida
**Compagni:** [`CARROZZERIA_FAIRNESS.md`](CARROZZERIA_FAIRNESS.md) ·
[`PIANO_FOTOREALISMO.md`](PIANO_FOTOREALISMO.md) · [`COSTRUZIONE.md`](../COSTRUZIONE.md)

Questo documento è una **lista chiusa**. Quello che sta fuori, per due
settimane, non si tocca. Non perché non valga: perché il vincolo non è più la
qualità delle idee, è il tempo, e ogni ora spesa fuori da questa lista è un'ora
tolta a qualcosa che sta dentro.

Ogni voce porta il comando che la riproduce, il numero misurato, e un **cancello**
— la condizione che dice se è finita. Dove una misura mi ha smentito, sta scritto.

---

## 0. Lo stato, misurato oggi

### Come si riproduce

Le misure sotto sono state fatte con una maschera indipendente da qualunque
strumento del repo, per non ereditarne gli errori:

```python
# maschera = «non è il riempimento neutro della normal map NON passa-altata»
nor = leggi('auto2r_nor.webp')          # NON nor2: vedi §3.3
M = ~((|R-128|<4) & (|G-128|<4) & (B>250))
# copertura risultante: 28,6% dell'atlante
```

Concorda al 95% con la maschera costruita dal riempimento rosso della ORM.
Due criteri che non si parlano, ricavati da due file diversi, selezionano la
stessa regione: è il canarino, e suona pulito.

### Output

```
CANARINO — mediana della normal map dentro la maschera
  nor  vecchia   (132, 129, 232)     ← non neutra: la maschera è buona
  nor2 nuova     (129, 129, 254)     ← quasi neutra: vedi §3.3

SCARTO ANGOLARE DELLA NORMALE (gradi, sui texel della vettura)
  nor  vecchia   mediana 22,39   p75 43,89   p95 67,04
  nor2 nuova     mediana  4,55   p75 12,80   p95 28,54

RUVIDITÀ (canale G)
                 mediana   dev.std   <0,25     a 255 esatto
  orm  vecchia    0,875     0,367    17,9%        37,6%
  orm2 nuova      0,882     0,239     4,0%        35,3%

RUVIDITÀ SOLO SULLA CARROZZERIA (G > 0,5)
                 mediana   dev.std   a 1,000 esatto
  orm  vecchia    1,0000    0,152        55,3%
  orm2 nuova      0,9922    0,143        43,5%

OCCLUSIONE (canale R)
  orm  vecchia    mediana 1,000   a 255 esatto 73,3%
  orm2 nuova      mediana 1,000   a 255 esatto 76,7%

COLORE (auto2r_col.webp, dentro la maschera)
  luma sRGB mediana 0,980   →   lineare 0,956
```

### Cosa significa

Tre letture, in ordine di gravità.

**Il passa-alto ha funzionato.** Lo scarto mediano della normale è passato da
22,39° a 4,55°: l'ondulazione a bassa frequenza — quella che il §3 di
`CARROZZERIA_FAIRNESS` aveva identificato nella banda 2–5 cm — non c'è più.
Era il reperto giusto e l'intervento giusto.

**Il cancello 1.2 non è passato.** Sulla carrozzeria la deviazione standard
della ruvidità è *scesa* (0,152 → 0,143), non salita, e il **43,5% dei texel sta
esattamente a 1,000**. Le tre ottave sono state sommate sopra valori già al
massimo: in un canale a 8 bit sommare ±0,04 a 1,000 non produce variazione,
produce saturazione. Metà dell'ampiezza è finita contro il soffitto.

E il 18% a bassa ruvidità — vetro e cromo — non è stato conservato: è passato
da 17,9% a 4,0%. Il canopy e gli inserti sono stati murati.

**L'occlusione non esiste.** Il canale R ha mediana 1,000 e il 76,7% dei texel
al massimo, e `aoMap` non compare in `Materiali.ts`. Con `GTAOPass` a raggio
0,9 m — tarato sulla corte, non sulla vettura — il soggetto non ha *nessuna*
occlusione ambientale, da nessuna delle due vie.

---

## 1. La regola nuova: il cancello dell'ultimo bin

Il difetto di stanotte non è stato trovato da nessuno dei 108 strumenti, e la
ragione è che tutti misurano mediane e percentili. Una mediana non vede il
clipping: 43,5% di texel appiattiti contro 255 danno una mediana
perfettamente plausibile.

**Da adesso, ogni mappa generata passa da qui.** Venti righe, e vale per tutti
i canali di tutte le mappe future:

```js
/** IL CANCELLO DELL'ULTIMO BIN.
 *  Una mediana non vede la saturazione. Un istogramma con un picco sul primo
 *  o sull'ultimo bin è SEMPRE un errore: significa che il segnale è stato
 *  schiacciato contro il fondo del contenitore e una parte dell'ampiezza è
 *  stata buttata. Si controlla prima di salvare, non dopo.  */
export function cancelloBin(dati, maschera, nome, soglia = 0.02) {
  const canali = ['R', 'G', 'B']
  let passa = true
  for (let c = 0; c < 3; c++) {
    let alto = 0, basso = 0, n = 0
    for (let i = 0; i < maschera.length; i++) {
      if (!maschera[i]) continue
      const v = dati[i * 3 + c]; n++
      if (v >= 255) alto++
      if (v <= 0) basso++
    }
    const a = alto / n, b = basso / n
    const ko = a > soglia || b > soglia
    if (ko) passa = false
    console.log(
      `  ${nome} ${canali[c]}  a 255: ${(a * 100).toFixed(1)}%  ` +
      `a 0: ${(b * 100).toFixed(1)}%  ${ko ? '❌ SATURO' : '✓'}`
    )
  }
  if (!passa) throw new Error(
    `[${nome}] canale saturo oltre il ${soglia * 100}%. La mappa non si salva. ` +
    `Se la saturazione è voluta va dichiarata alzando la soglia QUI, con la ragione.`
  )
}
```

Il `throw` non è pedanteria: è la stessa lezione di `vite-documento.ts`. Un
generatore che in silenzio produce un risultato sbagliato è peggio del valore
scritto a mano, perché quello almeno si vede.

---

## 2. TIER 0 — quaranta minuti, oggi

Senza questi il resto non viene valutato. Non è una figura retorica: un giurato
che arriva in fondo a sette minuti di esperienza e non trova un contatto,
chiude la scheda.

### 2.1 Il contatto

```ts
// src/ui/Contatto.ts:27
export const INDIRIZZO = 'servizi.villani@gmail.com'
```

Il commento che difendeva la stringa vuota — «un indirizzo inventato manda le
mail nel vuoto» — era giusto nel merito e sbagliato nell'esito: il risultato
non era prudenza, era un sito senza modo di essere contattato. Sostituisci il
commento con la ragione vera: *l'indirizzo è reale e la casella si legge.*

Verifica che si propaghi in tutti e tre i posti: la sezione `#contatto` del
documento statico, il finale dell'esperienza, e — se esiste — il `ld+json`
di §2.2.

### 2.2 I metadati sociali

```
grep -c "og:\|twitter:\|canonical\|application/ld" index.html   →   0
```

Zero. Quando il link finisce su LinkedIn, X, Slack, o nella scheda di
candidatura, esce un rettangolo grigio col dominio. Per un sito il cui unico
argomento è visivo è autolesionismo, e l'immagine giusta è già renderizzata
dalla scena stessa.

```html
<link rel="canonical" href="https://DOMINIO/" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://DOMINIO/" />
<meta property="og:title" content="Giuseppe Villani — Freelance Creative Developer" />
<meta property="og:description" content="Siti che non si guardano. Si attraversano." />
<meta property="og:image" content="https://DOMINIO/poster/hero_orizzontale.webp" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="it_IT" />
<meta property="og:locale:alternate" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Giuseppe Villani",
  "jobTitle": "Freelance Creative Developer",
  "email": "servizi.villani@gmail.com",
  "url": "https://DOMINIO/",
  "knowsAbout": ["WebGL", "Three.js", "Creative Development", "Real-time 3D"]
}
</script>
```

⚠️ **Verifica che `hero_orizzontale.webp` sia 1200×630 o vicino.** Alcune
piattaforme scartano immagini con proporzioni molto diverse e tornano al
rettangolo grigio: se il poster ha un altro formato, serve una seconda
esportazione dedicata.

⚠️ **WebP nelle anteprime social è supportato in modo disomogeneo.** Se la
verifica su LinkedIn fallisce, esporta anche un JPEG e usa quello per `og:image`:
è l'unico formato accettato ovunque senza eccezioni.

### 2.3 Il pallino della finitura

```ts
// src/scene/Materiali.ts:1363
campione: '#8d9095',   →   campione: '#0d0f14'
```

Il selettore FINITURA mostra un **grigio chiaro** per una vernice che si chiama
NERO LIQUIDO. È il primo elemento interattivo che un giurato tocca, ed è
visibilmente rotto. `#8d9095` è il residuo di GRAFITE SPAZZOLATO, la finitura
che quella voce era due giri fa.

### 2.4 Cancello TIER 0

```
✓ INDIRIZZO non vuoto, e la mail arriva davvero (mandane una)
✓ grep -c "og:\|twitter:\|canonical\|application/ld" index.html  ≥ 10
✓ l'anteprima si vede: incolla il link in una bozza LinkedIn e guarda
✓ il pallino della prima finitura è scuro
```

L'ultimo punto non è ironico. È la regola di `PIANO_FOTOREALISMO §5`: si guarda
il provino, non solo la statistica.

---

## 3. TIER 1 — il render

In ordine di guadagno per ora, non di eleganza.

### 3.1 Rifare `orm_nuova.mjs` — il maggiore guadagno rimasto (2–3 h)

**Perché è il primo.** Questa è una streamliner a carena continua: non ha
nervature, non ha spigoli, non ha sottosquadri. Su una hypercar a facce piane
la geometria rompe il riflesso da sola; qui non c'è niente che lo faccia. La
micro-variazione della ruvidità è **l'unico strumento disponibile**. Finché il
43,5% della superficie ha ruvidità matematicamente identica, il fianco resta
una macchia e nessun intervento a valle lo raddrizza.

**La correzione, in tre passaggi ordinati:**

```js
// 1. LA BASE SI SCRIVE, NON SI SOMMA.
//    Era il difetto: le ottave sommate sopra valori già a 1,000 si sono
//    schiacciate contro il tetto degli 8 bit.
G[i] = 0.85

// 2. LE TRE OTTAVE, sopra la base scritta
G[i] += ottava(p, 0.28) * 0.040   // macchie   15–40 cm  disomogeneità della verniciatura
G[i] += ottava(p, 0.055) * 0.025  // velatura   3–8 cm   polvere sottile, aloni
G[i] += ottava(p, 0.0035) * 0.015 // micro      2–5 mm   struttura del clearcoat

// 3. RIPRISTINA VETRO E CROMO dalla mappa vecchia.
//    `G_vecchia < 0,25` È la definizione di dove stanno: erano 17,9% dell'area
//    e sono scesi al 4,0%. Sono stati murati, non conservati.
if (Gvecchia[i] < 0.25) G[i] = Gvecchia[i]
```

Le ampiezze sono piccole **apposta**: 0,85 ± 0,08 al massimo assoluto, con le
tre ottave scorrelate. Il punto non è vedere la variazione — a ±0,10 diventa
una macchina sporca, non una lucida. Il punto è che il riflesso **smetta di
essere matematicamente uniforme**.

Nota sulle scale: `ottava(p, s)` prende `p` in **metri veri sulla superficie**,
non in UV. Le UV ora sono a scala piena (§12 di `CARROZZERIA_FAIRNESS`), quindi
la conversione è diretta — ma va scritta esplicitamente, altrimenti «15–40 cm»
diventa un numero senza unità che fra due mesi nessuno sa più interpretare.

**Cancello 3.1:**

```
✓ cancelloBin(orm2, maschera, 'ORM')  passa su tutti e tre i canali
✓ G sulla carrozzeria (G>0,5):  dev.std ≥ 0,05  e  a 1,000 esatto ≤ 2%
✓ G < 0,25 torna a ~18% dell'area, e CADE DOVE CI SONO VETRO E CROMO
  (si verifica guardando la maschera scritta su file, non contando)
✓ carrozzeria.mjs non perde mediana rispetto a prima
✓ si guarda il provino: le forme devono ricomparire sul fianco
```

⚠️ Il secondo cancello va letto **sulla sola popolazione della carrozzeria**,
non su tutta la maschera: includendo vetro e cromo la deviazione standard sale
per il motivo sbagliato — la bimodalità — e il cancello passa senza che le
ottave siano arrivate. È esattamente come il difetto è passato la prima volta.

### 3.2 L'occlusione cotta nel canale rosso (mezza giornata)

Il canale R ha **mediana 1,000 e il 76,7% dei texel a 255**: sono 2048×2048 di
spazio già pagato, già caricato e già trasferito, che non porta niente. E
`GTAOPass` ha raggio 0,9 m, tarato sulla corte: su una vettura di 4,4 m non
tocca né i passaruota, né le fughe, né il sottosquadro del fondo.

Risultato: **zero occlusione sul soggetto, da entrambe le vie.** È il contributo
maggiore all'effetto «pezzo appoggiato sopra» dopo il materiale.

Cottura in Blender, raggio corto — 5–8 cm, non i raggi da architettura:

- passaruota, dove il labbro incontra la carena
- sottosquadro del fondo e del diffusore
- fughe di cofano, portiere, sportello motore
- dietro le carenature delle ruote, dove la luce non arriva mai

```ts
const g = mesh.geometry
if (!g.attributes.uv1) g.setAttribute('uv1', g.attributes.uv)
m.aoMap = orm
m.aoMapIntensity = 0.85
```

⚠️ **`aoMap` legge `uv1`, non `uv`.** Con un glb a un solo set di UV
l'occlusione non compare **e non dà nessun errore**. È la stessa famiglia
dell'`anisotropy` senza tangenti che ha spento la scena intera in silenzio
(`PIANO_FOTOREALISMO §3.1`): un guasto che restituisce un risultato
plausibile invece di gridare.

**Il modo per accorgersene subito:** metti `aoMapIntensity = 3.0`, guarda il
provino, e solo dopo scendi a 0,85. Se a 3,0 non cambia niente, `uv1` non c'è.

**Cancello 3.2:**

```
✓ R sulla carrozzeria:  mediana ≤ 0,92  e  a 255 esatto ≤ 20%
✓ a intensità 3,0 l'occlusione si VEDE nel provino (prova del uv1)
✓ a 0,85 i passaruota sono più scuri della fiancata, e il fondo del
  diffusore è più scuro dei passaruota
```

### 3.3 Il σ del passa-alto, e il canarino da ri-chiavare (1 h)

Il `p95` dello scarto angolare è sceso da **67,04° a 28,54°**: meno 57% sulla
coda. La coda è dove vivono fughe, prese d'aria e griglie — l'unico contenuto
per cui la mappa esiste. Un passa-alto a σ ≈ 8 px su 2048 non dovrebbe toccarle.

Guarda `docs/provini/_nor_passaalto.png`. Se le fughe sono sbiadite rispetto
alla mappa originale, scendi a **σ 4–5 px** e rimisura: la banda bassa va tolta,
la banda alta va lasciata intatta.

**E c'è un effetto collaterale sul canarino che va chiuso adesso.** La mediana
di `nor2` dentro la maschera è `(129, 129, 254)` — a un punto dalla normale
neutra. Non è un difetto: **è la definizione di passa-alto**, che centra la
distribuzione su zero. Ma significa che `nor2` non può più fare da sorgente per
la maschera B: il canarino suonerebbe un falso allarme per sempre.

```js
/* IL CANARINO SI CHIAVA SULLA MAPPA NON PASSA-ALTATA, E NON È UN DETTAGLIO.
 * La maschera B ha come regola «se la mediana è (128,128,255) stai misurando
 * il vuoto». Un passa-alto centra la distribuzione su zero PER COSTRUZIONE:
 * la mediana di `nor2` dentro la maschera è (129,129,254). Se il canarino
 * puntasse lì suonerebbe sempre, e uno strumento che suona sempre è uno
 * strumento spento.
 * `auto2r_nor.webp` resta su disco APPOSTA per questo. Non si cancella. */
const nor = await leggi('auto2r_nor')   // ← non nor2
```

**Cancello 3.3:**

```
✓ le fughe si vedono in _nor_passaalto.png, affiancate all'originale
✓ p95 dello scarto ≥ 40° (la coda sopravvive), mediana ≤ 8° (la banda bassa no)
✓ canarino.mjs legge auto2r_nor.webp, con il commento sopra
✓ canarino.mjs passa
```

### 3.4 Il panorama di fondo sfocato (1 h) — il miglior rapporto della lista

Nella catena di post non c'è **nessuna profondità di campo**:
`RenderPass → GTAO → Bloom → OutputPass → SMAA → Grado`. Il colonnato della
corte è nitido quanto la lamiera, e i tre mockup del carosello leggono come
adesivi incollati su una fotografia invece che come oggetti a una distanza.

Non serve un `BokehPass`, che qui sarebbe anche dannoso: fa artefatti proprio
sui bordi speculari, che su una carrozzeria nera sono la cosa più preziosa che
hai.

```
1. esporta corte_pano_sfocato.webp — gaussiana σ 6–8 px alla risoluzione piena
2. scene.background = quella
3. la PMREM continua a cuocere da corte_pano.webp, l'originale
```

Costo a runtime: **zero**. La PMREM non ne risente perché si guarda comunque
sfocata per costruzione, e il peso aggiuntivo è basso — un'immagine sfocata si
comprime molto meglio dell'originale.

Per i mockup del carosello, la sfocatura va per **beat**, non per profondità:
hanno già la loro `z` in `Vetrina3D`, quindi basta una funzione della distanza
dal fuoco della regia.

**Cancello 3.4:**

```
✓ il peso totale non sale di più di 150 kB
✓ la PMREM è invariata (i riflessi sulla carrozzeria non cambiano)
✓ nel provino della hero il colonnato è morbido e la lamiera è tagliente
```

### 3.5 L'impronta a terra (30 min)

`Ruote.ts` ruota, scala e rientra, ma non schiaccia nulla. **Un pneumatico
perfettamente circolare che tocca il suolo in un punto è la firma più
riconoscibile del render amatoriale** — e con `PCFSoftShadowMap` il contatto è
anche morbido, quindi non c'è niente che lo compensi.

8–12 mm di schiacciamento sui vertici sotto una certa quota, applicati alla
geometria del pneumatico **dopo** la divisione per raggio che c'è già. Le
posizioni vere le hai da `trovaArchi`.

```
✓ la gomma si appiattisce, il cerchio no
✓ l'appiattimento è visibile di profilo e invisibile dall'alto
✓ le quattro ruote sono coerenti fra loro
```

---

## 4. TIER 2 — il premio, che non è il render

### 4.1 La sezione STUDIO è il tuo argomento più forte, e non esiste

```ts
// src/ui/Ancore.ts:56
studio: 0,
```

«STUDIO» rimanda alla cima della pagina. Il commento lo difende — *«quella riga
È lo studio»* — ma non regge alla prova dei fatti: `docStudio1` e `docStudio2`
sono due paragrafi generici che dicono cosa il sito esplora, non come.

Nel frattempo, in `docs/`, c'è questo:

- quattro metriche **costruite e buttate**, con la ragione per cui misuravano
  rumore invece che forma
- una fairness portata da **0,840 a 0,341 mm**, misurata, non affermata
- un bug da **1/16 di UV** risalito da un sintomo apparentemente scollegato
- un `anisotropy` senza tangenti che spegne la scena **senza dare errore**, e il
  primo sintomo che è stato *una statistica perfettamente formata*
- una maschera invertita che misurava il padding, trovata con uno strumento
  scritto apposta e chiusa con una regola che ora vale per sempre

**Non conosco portfolio che portino questo argomento.** Ed è in `docs/`, dove
nessun giurato lo aprirà mai.

**Cosa costruire.** Non un link a un markdown su GitHub — un pezzo del sito.
Tre o quattro schermate dentro `#studio`, con:

1. **I numeri veri, affiancati.** `0,840 → 0,341 mm`, con il grafico della
   fairness prima e dopo. Un numero che scende è comprensibile in un secondo.
2. **I provini zebra prima/dopo.** Sono già su disco. Sono l'immagine più
   parlante che il progetto abbia prodotto, e non li vede nessuno.
3. **La frase sui quattro metri scartati.** È l'argomento: chiunque può
   costruire una metrica, quasi nessuno la butta quando smette di reggere.
4. **Il peso.** `667 kB` è già in hero. Accanto ci va *come*: meshopt, KTX2,
   la strategia di caricamento a tre traguardi.

**Perché va prima di TIER 1 se devi scegliere.** Il render lo giudicano in tre
secondi, e in tre secondi la geometria che hai è quella che hai. Il metodo è
l'unica cosa che può spostare il giudizio *dopo* quei tre secondi, ed è
esattamente ciò che il Developer Award premia.

**Cancello 4.1:**

```
✓ #studio ha una sua ancora vera, non 0,000
✓ contiene almeno tre numeri misurati e due provini
✓ si legge in meno di novanta secondi
✓ funziona anche senza WebGL — è nel documento statico
```

### 4.2 Quello che `PIANO_NOTTE` ha già giusto

Non lo rifaccio qui, ma tre voci di quel piano stanno dentro questa lista e
vanno tenute:

- **Movimento ridotto e ripiego statico** (voce 2). Il controllo di
  accessibilità è sistematico nelle giurie, e `prefers-reduced-motion` non
  gestito è una penalità certa su un sito interamente guidato dal movimento.
- **Strato semantico vero** (voce 3). Stessa ragione, stesso costo.
- **Il caso di studio** (voce 10). È il §4.1 qui sopra, e `COSTRUZIONE.md` sono
  già 1.678 righe di fondamenta.

---

## 5. Cosa smettere di fare

La parte più scomoda, e quella che vale di più.

### 5.1 Il quadro strumenti

`PIANO_NOTTE` lo mette al **primo posto** perché è il punteggio più basso
(7,0 desktop / 6,8 mobile). È il ragionamento sbagliato: portare da 7,0 a 8,0
il pezzo più debole di un'interfaccia secondaria non sposta un premio, e costa
una notte.

E c'è un problema di natura diversa: **i numeri sono inventati.** 87%,
autonomia 406 km, TRIP A 128,4, ODO 14208, il Bluetooth. È la stessa bugia che
è stata tolta dalla hero — le statistiche finte — e che qui è sopravvissuta.

**O diventano veri in dieci minuti, o spariscono.** Non c'è una terza opzione
che valga il tempo. Il quadrante dei giri e la marcia restano: sono legati allo
scorrimento, quindi sono veri.

### 5.2 Nuovi strumenti di misura

```
ls strumenti/ | wc -l   →   108
```

Il rendimento marginale è negativo. Ogni strumento nuovo è una superficie in
più su cui sbagliare, e negli ultimi due giorni **due metri hanno dato numeri
plausibili e falsi**: il campionamento per vertice su atlante sparso, e la
maschera invertita. Da adesso, l'unico strumento nuovo consentito è
`cancelloBin` di §1, che sono venti righe.

### 5.3 Nuova documentazione

```
3.093 righe fra docs/ e la radice
```

`PIANO_FOTOREALISMO` e `PIANO_NOTTE` si sovrappongono in almeno tre punti.
Fondili in questo file, o dichiara esplicitamente in testa a entrambi che sono
**storia** e che il piano in vigore è uno solo. Due piani attivi che si
contraddicono sono lo stesso difetto delle due copie della lista lavori — e
quella l'hai già risolta bene.

### 5.4 Il modello

Hai deciso di tenerlo, ed è una decisione difendibile.
**Non riaprirla a metà lavoro.** Sarebbe il modo più efficace di perdere due
settimane, e la decisione era giusta per la ragione giusta: il tempo.

---

## 6. Il calendario

| quando | cosa | perché lì |
|---|---|---|
| **oggi, 40 min** | TIER 0 (§2) | senza, il resto non viene valutato |
| **giorni 1–3** | STUDIO (§4.1) | è il moltiplicatore, e non dipende dal render |
| **giorno 4** | `orm_nuova` rifatta (§3.1) | il maggiore guadagno rimasto |
| **giorno 5** | occlusione cotta (§3.2) | l'ancoraggio che manca |
| **giorno 6** | passa-alto + canarino (§3.3), panorama sfocato (§3.4), impronta (§3.5) | tre voci brevi, un giorno |
| **giorni 7–9** | movimento ridotto, strato semantico | accessibilità, penalità certa se manca |
| **giorno 10** | **si candida** | |

---

## 7. Il tetto, detto onestamente

Con questa geometria e questa lista completata:

- **Developer Award** — realistico. L'esecuzione tecnica è già forte, il peso è
  controllato, e il caso di studio è un argomento che quasi nessuno porta. È il
  bersaglio giusto, ed è quello su cui è tarato questo piano.
- **Honorable Mention** — probabile una volta chiusi TIER 0 e TIER 1.
- **Site of the Day** — improbabile, e la ragione è la geometria, non lo
  shading. Il giudizio SOTD è visivo in tre secondi, e una carena continua
  generata da poche viste non regge quel confronto. Non è un fallimento: è il
  vincolo che è stato scelto consapevolmente, sapendo cosa costava.

**E poi ci si ferma.** Con 108 strumenti si trova sempre il ventesimo difetto
misurabile. Il momento di candidare non arriva quando non ci sono più difetti:
arriva quando i difetti che restano costano più di quello che tolgono.

---

## 8. Come si verifica tutto

```bash
node strumenti/canarino.mjs                      # le tre maschere, e la regola della normale
node strumenti/orm_area.mjs                      # la ruvidità pesata per area
node strumenti/mappati.mjs auto2r_orm2 auto2r_col
node strumenti/passaalto.mjs                     # scarto angolare per bande
node strumenti/fairness.mjs public/modelli/auto2.glb 0.025
node strumenti/carrozzeria.mjs                   # mediana / 90° / scuri della sola vettura
node strumenti/uno.mjs 0.06 nome                 # un provino, con la guardia sugli errori
npm run build                                    # la <ol> generata contiene 11 voci
```

E le tre regole che il progetto si è dato, in ordine di quanto sono costate:

1. **Guardare sempre il provino, non solo le statistiche.** Una mediana `0.0`
   perfettamente formata era una scena interamente nera.
2. **Un metro va verificato prima di crederci.** Sei metriche costruite e
   buttate, di cui due negli ultimi due giorni.
3. **Un istogramma con un picco sull'ultimo bin è sempre un errore.** È la
   regola nuova, e ha già trovato il difetto che le altre due non vedevano.
