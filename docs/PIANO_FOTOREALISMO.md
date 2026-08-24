# Piano fotorealismo — velocity

**Data:** 24 agosto 2026 · **Stato:** fasi 0–4 da eseguire, 1.1 già fatta

Questo documento è scritto per essere **verificato**, non creduto. Ogni
affermazione porta con sé il comando che la riproduce, il file e la riga, e
l'output grezzo. Dove una misura mi ha smentito, sta scritto.

Compagno di questo file: [`CARROZZERIA_FAIRNESS.md`](CARROZZERIA_FAIRNESS.md),
che racconta il lavoro sulla geometria e i quattro metri costruiti e buttati.

---

## 0. Il reperto principale — e la sua smentita

> **Questa sezione e' stata riscritta.** La prima versione affermava che il 66%
> della carrozzeria fosse a specchio, e che questo spiegasse tutte le critiche
> ricevute. **Era falso.** La storia resta qui invece di essere cancellata,
> perche' e' il **quinto metro rotto** di questo progetto e il piu' insidioso:
> gli altri quattro davano numeri assurdi, questo ne dava di **plausibili**.

### Cosa avevo misurato, e perche' era sbagliato

`strumenti/orm_area.mjs` pesava per area tutta la mesh e riportava:

```
ruvidita mappata sotto 0,25 (SPECCHIO): 66,1%
area rivolta verso l alto             : 42,1%  di cui a specchio 74,8%
```

Ne avevo concluso: `ruvidita 0,30 x mappa 0,004 = 0,001`, la vettura e' uno
specchio nero, e uno specchio mostra l'ambiente invece della forma.

**Il difetto:** la mesh contiene sottoscocca, interni e cavita' delle carene —
superfici mappate ma **mai cotte**, che campionano il riempimento dell'atlante.
Pesate per area sono tantissime. Non si vedono mai.

### L'argomento che lo ha smontato, in una riga

Una revisione esterna ha fatto notare una cosa che avevo scritto **io stesso**,
come prova a favore:

> «Misurata sui texel mappati: la mediana e' esattamente la normale neutra
> `(128,128,255)`.»

`(128,128,255)` **e' il colore con cui ogni baker riempie i texel non mappati**,
per costruzione. Se una maschera «texel mappati» ha quella mediana, sta
selezionando il riempimento. Non c'e' altra spiegazione possibile.
Era la prova contraria, ed e' definitiva.

### La verifica: tre maschere fatte litigare

```bash
node strumenti/canarino.mjs
```

```
A (non-rosso nella ORM)     26.7%      <- costruita dall'immagine ORM
B (non-neutra nella NOR)    27.6%      <- costruita dall'immagine NOR
C (rasterizzazione UV)      56.7%      <- costruita dalla geometria (la mia)

accordo A/B  79.4%      accordo A/C  30.7%      accordo B/C  29.8%

dentro A:  ORM G 252   ORM B 247   COL luma 253
dentro B:  ORM G 215   ORM B 240   COL luma 248
dentro C:  ORM G   1   ORM B   0   COL luma   0     <- il riempimento
```

Due criteri che non si parlano, ricavati da due file diversi, selezionano la
stessa regione. La mia no.

E la scala non c'entra (`strumenti/scala_uv.mjs`): le UV sono `Float32Array`
non normalizzato, intervallo esatto 0..1, e la scala 1,0 e' gia' la migliore.
Il 73% delle isole vere **sta dentro** la mia copertura — semplicemente la mia
copre anche tutto cio' che non e' stato cotto.

### Il quadro vero

Dentro le isole: `G` mediana **0,84-0,99**, `p75 = 1,000`, con un ~18% sotto
0,25 che e' **canopy e cromature** — dove lo specchio ci va. Quindi
`ruvidita 0,30 x ~0,87 = 0,26`: **il commento nel sorgente aveva ragione.**

La mappa non e' rotta. E' **piatta**: su meta' della carrozzeria non varia
affatto. Che e' il difetto che il commento di `Materiali.ts` descrive senza
accorgersi di averlo addosso —

> «una superficie a ruvidita' costante non esiste in natura: e' il segno piu'
> riconoscibile della computer grafica, prima ancora della geometria troppo
> perfetta»

— e resta un difetto vero, solo con una cura diversa (vedi 1.2).

### La regola nuova, gratis

**Dopo ogni maschera si stampa la mediana della normal map dentro.** Se e'
`(128,128,255)` (con tolleranza: la mia usciva `128,127,255` e il primo
canarino non l'ha vista), la maschera sta selezionando il vuoto. Il controllo
e' in `strumenti/canarino.mjs` e costa niente.

## 1. Cosa dei feedback esterni ho confermato, e cosa no

Ho ricevuto due revisioni. Le ho verificate una per una invece di applicarle.

### Confermato ✅

| affermazione | verifica |
|---|---|
| **`metalness` alto tinge di blu ogni riflesso caldo** | Fisica corretta. Un metallo tinge lo speculare col proprio colore, un dielettrico lo restituisce bianco. Ero stato **io** ad alzarlo a 0,85 stamattina seguendo il primo revisore («Metallic 0.8–1»): sbagliato per una vernice scura. |
| **`specularIntensity: 0.6` in `vernice()`** | `Materiali.ts` → `vernice()` → `specularIntensity`. Taglia F0 dal 4% al 2,4%, cioè ammazza il Fresnel bianco. Su un dielettrico è ciò che fa vedere la superficie. |
| **`scocca()` non ha `clearcoatNormalMap`** | Vero, mentre `vernice()` ce l'ha. E la scocca è ciò che veste `AUTO`. Il trasparente a 0,028 era uno **specchio ideale** su una mesh a 0,341 mm di residuo. |
| **Canale R della ORM piatto a 1,000** | `R p10 254 · mediana 255 · p90 255`. Zero AO cotta, 2048×2048 di spazio già pagato e vuoto. |
| **`GTAOPass radius: 0.9` m** | `Esperienza.ts` → `GTAOPass` → `radius`. Tarato sulla corte; su una vettura di 4,4 m non tocca né passaruota né fughe. |
| **`INDIRIZZO = ''`** | `Contatto.ts` → `INDIRIZZO`. Il sito non ha modo di essere contattato. |
| **Zero metadati sociali** | `grep -c "og:\|twitter:\|canonical\|application/ld" index.html` → **0** |
| **Documento statico disallineato** | il blocco `<main class="documento">` di `index.html` dichiara 02/03/04 «in lavorazione»; `Lavori.ts` ha **11** voci. |

### Non confermato al primo giro, poi **confermato** ✅

Le tre voci qui sotto le avevo contestate sulla base della maschera sbagliata.
Con la maschera giusta tornano tutte, e lo scrivo con lo stesso rilievo con cui
le avevo contestate.

| affermazione | esito |
|---|---|
| **`auto2r_col.webp` e' bianca** | **Vera.** Luma mediana 248-253 sulle isole. I 190 kB portano quasi nulla, e il divisore 0,58 delle quattro tinte appartiene a una mappa che non esiste piu'. |
| **La normal map ha dettaglio vero** | **Vera.** Il `p10/p90` che mi aveva fatto desistere era del riempimento. `passaalto.mjs` va scritto lo stesso, ma sulla maschera giusta. |
| **`metalness` effettiva ~0,80** | **Vera.** `B` mediana 0,94-0,97 sulle isole. Con `metallo: 0.85` faceva ~0,80, non «zero su due terzi». La conclusione dielettrica era giusta *e* il numero pure. |

La disciplina di 1.3 — rifiutare di toccare la mappa senza un metro che regge —
**ha funzionato lo stesso**: mi ha impedito di fare un danno mentre il metro
era rotto.

## 2. Un difetto trovato e corretto strada facendo

`scocca()` conteneva una maschera per il vetro fumé chiavata sulla **luminanza**
di `diffuseColor`, tarata sulla valle dell'istogramma di `auto2_col.webp` —
la mappa **pre-remesh**, che aveva il 4,5% dei pixel sotto 31 e solo lo 0,8%
fra 32 e 95.

Quella valle non esiste più. E `diffuseColor` a quel punto vale `colore × mappa`:
la maschera non misurava più il canopy, misurava **quanto è scura la vernice
scelta**. Con la tinta dielettrica (luma 0,015) si accendeva al **77%** ovunque
la superficie guardasse in alto — verniciando a vetro fumé un terzo della
vettura.

**Ri-chiavata sulla quota**, con la linea di cintura misurata:

```bash
node strumenti/zone.mjs
```

```
 fascia   quota     semilarghezza   % del max
    8     0.639      0.373 m        74%
    9     0.719      0.246 m        49%   ← la cintura
```

La semilarghezza crolla fra 0,64 e 0,72 m: è il punto in cui il vetro rientra
rispetto alla spalla. Normalizzata sull'altezza del corpo fa **0,67–0,75**.

Vantaggio che la vecchia chiave non aveva: **la quota non dipende dalla finitura
scelta**. Cambiare vernice non può più spostare i vetri. E le quote non sono
scritte a mano — le misura `vestiAuto` sulla mesh vera e le passa in uniform.

---

## 3. Tre trappole pagate oggi, per non ripagarle

### 3.1 `anisotropy` senza tangenti spegne l'intera scena, in silenzio

Il primo revisore chiedeva `anisotropy: 0.7` sui cerchi (alluminio spazzolato).
`MeshPhysicalMaterial.anisotropy` lavora nello spazio tangente, e `ruota.glb`
porta **solo `position` e `normal`**:

```
mesh_0 | attributi: position,normal | indicizzata: true
```

Senza UV non si calcolano le tangenti, e senza tangenti three compila un
materiale che **non disegna**. Non lo segnala: nessuna eccezione, nessun
`console.error`. La scena intera è diventata nera.

**Il primo sintomo è stato un numero perfettamente formato**: il misuratore ha
restituito `mediana 0.0` come se fosse una taratura sbagliata. Luminanza media
della vettura: **28,2 sana → 0,6 rotta**.

Conseguenza: `strumenti/uno.mjs` adesso ascolta `pageerror` e `console.error`.
Un guasto deve gridare, non restituire una statistica.

### 3.2 Campionare le mappe per vertice, su un atlante sparso, non misura niente

Il mio primo tentativo leggeva l'albedo alle UV dei vertici. I vertici stanno
sui **bordi delle isole**, e con un atlante pieno a metà il texel più vicino
cade nel padding. Le due convenzioni di V davano 23% e 39% «sul dipinto»:
nessuna delle due vicina al vero.

Il metro giusto è la **rasterizzazione dei triangoli** (o il campionamento al
centroide), e la verifica è **scrivere la maschera su file e guardarla**:

```bash
node strumenti/mappati.mjs auto2r_orm auto2r_col
# scrive docs/provini/copertura_uv.png
```

### 3.3 I backtick nei commenti rompono il GLSL

Le injection di shader in `Materiali.ts` stanno dentro template literal. Un
commento che cita `` `diffuseColor` `` con i backtick **chiude la stringa**.
Tre errori di sintassi apparentemente scollegati. Nei commenti dentro GLSL si
usano le virgolette basse « ».

---

## 4. Il piano, in fasi con cancelli di misura

**La regola: non si passa a una fase senza il cancello della precedente.** È la
regola che ha salvato questo progetto dai quattro metri sbagliati, e oggi ha già
evitato di «correggere» una normal map sulla base di un numero non riproducibile.

### FASE 0 — I tre blocchi non-render (~40 min)

Non sono di render, e valgono più di una settimana di materiali: un sito senza
contatto e senza anteprima non arriva alla valutazione tecnica.

1. **Contatto** — `Contatto.ts:27`. *Serve l'indirizzo vero: non lo invento.*
2. **Meta social** — canonical, `og:type/title/description/image`,
   `twitter:card`, `application/ld+json` con `Person`. L'immagine esiste già:
   `public/poster/hero_orizzontale.webp`.
3. **La `<ol>` dei lavori generata da `LAVORI`** a build time con un plugin
   Vite — **non ricopiata a mano**. Così la divergenza fra documento statico ed
   esperienza diventa *impossibile* invece che *improbabile*. È esattamente il
   difetto che il commento nel file prevedeva e che si è avverato.

> **Cancello:** `npm run build` pulito, e la `<ol>` generata contiene 11 voci.

---

### FASE 1 — Il materiale

#### 1.1 Vernice dielettrica — **fatto**

```ts
nome: 'NERO LIQUIDO',
tinta: [0.014, 0.014, 0.017],   // 3-4% di riflettanza diffusa
metallo: 0.06,                   // la scaglia sta SOSPESA nel legante
ruvidita: 0.30,
trasparente: 1.0,
ruviditaTrasparente: 0.028,
```

più `specularIntensity: 1.0` in `vernice()` e `clearcoatNormalMap` in `scocca()`
(ripetizione **300**, non 5: a UV in scala piena una cella da `repeat 5`
misurerebbe 90 cm — non è buccia d'arancia, è ondulazione di lamiera).

**Misurato dopo:**

```
prima   orbita  mediana 36.5   scuri 28.0%
dopo    orbita  mediana 24.7   scuri 37.8%
```

Il contraccolpo previsto («scuri sopra il 55%») **non si è verificato**: 37,8%.

> ⚠️ **Il cancello di 1.1 NON è passato, e va detto chiaramente.** Il bersaglio
> di 1.4 è mediana 90–120 con scuri sotto il 15%. Siamo a **24,8 / 37,4%**:
> 1.1 lascia la vettura in uno stato *peggiore* di prima (era 36,5 / 28,0%), ed
> è **1.4 a doverlo recuperare** — con le strisce e la rotazione dell'ambiente,
> **non** schiarendo la tinta. Scritto qui perché fra due settimane quel 24,8
> non sembri un risultato accettato.

#### 1.2 Ricostruire il canale della ruvidità — **il punto numero uno**

La mappa non è «piatta», è **rotta**: bimodale, due terzi dell'area a zero. Non
si ripara con una manopola. Si sintetizza una ORM nuova
(`strumenti/orm_nuova.mjs`), conservando ciò che nella vecchia ha senso.

- **G (ruvidità)** — base **0,85**, così `0,30 × 0,85 = 0,26`: esattamente ciò
  che il codice ha sempre creduto di avere. Sopra, tre ottave a **bassissima
  ampiezza**:

  | strato | scala reale | ampiezza | cosa simula |
  |---|---|---|---|
  | macchie | 15–40 cm | ±0,04 | disomogeneità della verniciatura |
  | velatura | 3–8 cm | ±0,025 | polvere sottile, aloni |
  | micro | 2–5 mm | ±0,015 | struttura del clearcoat |

  Le ampiezze sono piccole **apposta**. Il punto non è vedere la variazione: è
  che il riflesso smetta di essere matematicamente uniforme. Su una carena
  continua senza nervature è l'unico strumento disponibile, perché non c'è
  geometria a rompere il riflesso.

- **B (metallico)** — 0 sulla carrozzeria; conservato dove la vecchia mappa
  dichiara metallo vero (il 32,9% di area con `B > 0,5`: griglie, inserti).
- **R** — resta 1,0 finché non arriva l'AO cotta (2.1), che va esattamente lì.

> **Cancello (invertito rispetto alla prima stesura):** «sotto 0,25» deve
> **restare intorno al 18%**, e deve cadere dove ci sono vetro e cromo. Se va a
> zero ho murato i vetri. Poi si guarda il provino.

#### 1.3 La normal map — **prima misurare, poi decidere**

Scrivo `strumenti/passaalto.mjs`, che stampa lo scarto angolare **per bande di
frequenza**. Se la banda bassa (2–5 cm) porta scarto vero, la sottraggo con una
gaussiana σ≈8 px su 2048 e ricalcolo `Z = √(1 − x² − y²)`, lasciando
`normalScale` a 0,7. **Se non lo porta, non tocco niente e lo scrivo.**

Il p10/p90 misurato non giustifica ancora l'intervento, e abbassare `normalScale`
toglierebbe insieme il rumore **e** le fughe.

#### 1.4 Le strisce, e le bandiere nere

Su una carena a doppia curvatura una striscia larga 55 cm si comprime in una
macchia. Servono **più lunghe e molto più strette** — 24 × 0,18 sui fianchi,
16 × 0,14 sopra: la compressione avviene su un asse solo, quindi una striscia
sottile resta una riga sottile.

E manca del tutto la cosa che in studio è metà del mestiere: **i pannelli neri
alternati alle strisce**. Su una superficie lucida la forma la disegna il
**contrasto** fra chiaro e scuro riflessi, non il chiaro da solo. Senza spigoli,
quelle bande nere sono l'unica cosa che può dare dei bordi alla carena.

Poi `scena.environmentRotation.y`, ruotata finché la riga più luminosa **cade
sulla spalla** — dove il fianco gira verso l'alto. È lì che una riga racconta il
volume. Costa un numero.

> **Cancello:** mediana 90–120 con scuri sotto il 15%, **senza aver toccato la
> tinta**. Se per arrivarci devo schiarire la vernice, ho sbagliato strada.

---

### FASE 2 — L'appoggio

- **2.1 AO cotta nel canale R** (raggio 5–8 cm: passaruota, sottosquadri,
  fughe), `aoMapIntensity 0.85`.
  ⚠️ **`aoMap` legge `uv1`, non `uv`.** Con un glb a un solo set di UV
  l'occlusione non compare **e non dà errore**:
  ```ts
  if (!g.attributes.uv1) g.setAttribute('uv1', g.attributes.uv)
  ```
- **2.2 GTAO resta all'architettura.** Con l'AO in mappa sul soggetto non serve
  un secondo passaggio — ed è anche la soluzione più economica.
- **2.3 Ombra direzionale più stretta** (±3,2 invece di ±5,9): da 5,9 a 3,1 mm
  per texel; il contatto sotto le gomme raddoppia di definizione.
- **2.4 Impronta a terra** — 8–12 mm di schiacciamento sui vertici bassi del
  pneumatico, dopo la divisione per raggio che c'è già. Un pneumatico
  perfettamente circolare che tocca il suolo in un punto è la firma più
  riconoscibile del render amatoriale.

- **2.5 Il pavimento bagnato — verificato, non toccato.** Vale circa il 15%
  della lettura nella reference e nel piano non c'era né una riga né un
  cancello. Lo stato attuale è quello di `CARROZZERIA_FAIRNESS §13`: raggio
  5,6, forza 1,15, Fresnel `pow(radente, 2.1)`. **Da rimisurare dopo 1.4**,
  perché una vernice dielettrica riflette nel pavimento una quantità di luce
  diversa da un metallo — e la forza dello specchio era tarata sul metallo.

*Già fatto:* le **quattro macchie scure sotto le gomme**, agganciate alle
posizioni vere restituite da `trovaArchi` (`Ruote.ts`), non alla mezzeria. Se le
due cose divergessero il contatto sarebbe *peggio* che assente: sarebbe
sbagliato, e un'ombra fuori posto si nota molto più di un'ombra che manca.

---

### FASE 3 — La fotografia

- **3.1 FOV della hero da 38 a 30**, camera allontanata di ~1,27× per conservare
  l'inquadratura. **Per beat, non globale**: `POSE` in `transizioni/Camera.ts`
  contiene anche `occhi` (dentro l'abitacolo) e l'attraversamento a 56°, dove il
  grandangolo è il punto. 38° è circa un 35 mm; la fotografia d'automobile sta
  fra 70 e 135 mm, cioè 28°–18°.
- **3.2 Profondità di campo senza `BokehPass`** — un secondo panorama
  pre-sfocato (σ 6–8 px) come `scene.background`, tenendo l'originale per la
  PMREM. Costo zero a runtime. Un `BokehPass` qui sarebbe anche dannoso: fa
  artefatti proprio sui bordi speculari, che sono la cosa più preziosa.
- **3.3 Ritarare bloom e grading** dopo 1.2 e 1.4: un dielettrico nero ha
  highlight più netti e concentrati, la soglia va rimisurata, non ereditata.

---

### FASE 4 — Rifinitura

- **Ri-derivare le quattro tinte** sotto la prima: il divisore citato nel
  commento appartiene a `auto2_col.webp`, una mappa che non esiste più.
- **`ruota.glb` decimata** — 114k triangoli di ruote (28,7k × 4) contro ~13k di
  carrozzeria è sproporzionato di dieci volte.
- **`auto2r_col.webp`** ridotta a maschera, se dopo 1.2 resta senza informazione.
- **Il ramo `fetchpriority` morto** in `index.html`: nessun oggetto dell'array
  ha la chiave `pri`, quindi la strategia descritta nel commento non viene mai
  applicata. O si completa o si toglie la riga.
- **`sheen`** sulla gomma.
- **L'anisotropia dei cerchi resta impossibile** finché `ruota.glb` non ha UV
  (vedi §3.1).

---

## 4bis. Stato dei lavori

| voce | stato | numero |
|---|---|---|
| **0.1** indirizzo di contatto | BLOCCATO | `Contatto.ts` -> `INDIRIZZO` e' vuoto: non lo invento |
| **0.2** meta social + JSON-LD | fatto | 14 tag nel documento generato. Manca `VITE_SITO`: `og:image` vuole un URL **assoluto** |
| **0.3** lista lavori generata | fatto | plugin Vite: 10 lavori letti da `LAVORI`, zero «in lavorazione» |
| **1.1** vernice dielettrica | fatto | `metallo 0.85 -> 0.06`, `specularIntensity 0.6 -> 1.0` |
| **1.2** ruvidita' non piatta | fatto | tre ottave nello shader (22 / 61 / 420 cicli = 30 cm / 11 cm / 1,6 cm), ampiezze +-0,039 / +-0,026 / +-0,016 |
| **1.2b** riempimento della ORM | fatto | era `G = 0` (specchio) e sbavava nelle isole coi mipmap; ora 0,87 |
| **1.3** passa-alto sulla normal map | NON FATTO | il metro che l'avrebbe giustificato era rotto |
| **1.4** strisce + bandiere nere | fatto | 24x0,18 e 16x0,14 invece di 12x0,55 e 7x0,4, piu' quattro pannelli neri |
| **2.3** tronco d'ombra | fatto | da +-6 m a +-3,3 m: da 5,9 a 3,2 mm per texel |
| **2.4** impronta a terra | fatto | la ruota AFFONDA di 11 mm invece di essere schiacciata |
| **3.1** campo della hero | fatto | 38 -> **30 gradi**, pose x tan(19)/tan(15) = 1,285, altezza invariata |
| **3.2** profondita' di campo | fatto | `backgroundBlurriness` 0,03 -> 0,055 (a 0,14 la villa si dissolve) |
| **4** ri-derivare le tinte | fatto | x0,61. `BIANCO PERLA` era a **1,06 di albedo**, sopra il 100% |
| **RUOTE** | rifatte da zero | vedi sotto |
| **2.1** AO cotta nel canale R | NON FATTO | serve un giro in Blender |
| **3.3** ritarare bloom e grading | NON FATTO | da fare a scena assestata |

### Le ruote: due difetti diversi, confusi per mezza sessione

**POSIZIONE.** `trovaArchi` cercava «i dodici punti piu' larghi di ogni
quadrante». Su un siluro quello non e' il passaruota, ed e' un criterio che sui
due lati cade in posti diversi: **posteriore destra a x -0,883, sinistra a
-1,148 — ventisei centimetri di sfasamento sullo stesso asse.**

Due criteri sbagliati prima di quello buono, entrambi istruttivi:

- **massimi di semilarghezza** -> la fiancata a mezza altezza e' un ALTOPIANO, e
  su un altopiano un cercatore di massimi restituisce un punto qualunque;
- **minimi della quota del fondo** (il passaruota come incavo) -> questa vettura
  ha il **sottoscocca chiuso**: il profilo e' una riga piatta.

Il segnale vero e' la **fascia bassa** (3-12% dell'altezza): li' la fiancata si
allarga in due punti soli, i bauletti che contengono una ruota, e fra loro si
strozza perche' non c'e' niente da contenere.

```bash
node strumenti/incavi.mjs
```

```
bauletto posteriore  x -1,830 .. -0,730   centro -1,280
bauletto anteriore   x  0,920 ..  1,670   centro  1,295
passo 2,575 m = 60% della lunghezza - sbalzi 0,93 e 0,80 m
```

Sessanta per cento di passo con quegli sbalzi sono le proporzioni di
un'automobile vera. E il bauletto anteriore e' lungo **0,750 m** contro un
diametro di ruota di **0,708**: una coincidenza del genere non capita per caso.

E la **simmetria adesso e' imposta**, non sperata: gli assi sono perpendicolari
alla direzione di marcia, ed e' una legge della cosa rappresentata.

**QUANTO RIENTRA** non si stima. L'ancora arriva dalla ruota di segnale, spinta
in fuori di `SPORGENZA` apposta. Con un rientro di un terzo la carreggiata
veniva **1,913 su una carrozzeria larga 1,766**: il pneumatico usciva di
diciotto centimetri. Si torna indietro di tutta la sporgenza piu' mezza
larghezza della gomma, meno 65 mm — e 65 e non 30 perche' a filo esatto la ruota
posteriore **spariva dentro la carena**, e una ruota che non si vede legge come
una ruota che manca.

**QUALITA'.** `ruota.glb` erano 28.700 triangoli di RUMORE: bordo del
pneumatico frastagliato invece che circolare, spalla che ondeggia, cerchio in
cui non si distingue una razza. E **non era un problema di materiale**: ci ho
provato tre volte, nessuna ruvidita' raddrizza una circonferenza storta.

Adesso la ruota **si costruisce** (`scene/RuotaVera.ts`), ed e' la scelta giusta
qui e quasi mai altrove: una carrozzeria e' superficie libera, una **ruota e' un
solido di rivoluzione con dentro una simmetria a raggiera**. E' fatta di cerchi,
e un cerchio scritto in codice e' esatto per costruzione mentre uno generato e'
un poligono che gli somiglia.

Contiene: spalla del pneumatico **bombata** (un cilindro dice «tornito»), canale
del cerchio, dieci razze con spessore vero, **disco freno e pinza dietro** per
la parallasse, mozzo, dado, e un fondo che chiude la cavita' — senza, di tre
quarti si vedeva lo sfondo fra le razze.

**Costo: -297 kB, e da 114.000 triangoli di ruote a 11.760.** Quattro ruote
facevano piu' triangoli di tutta la carrozzeria.

### Il sesto metro rotto: il misuratore non era ripetibile

Tre esecuzioni di `carrozzeria.mjs` con impostazioni IDENTICHE:

```
mediana 41,2 / 4,3 / 25,7      scuri 27,4% / 56,8% / 37,1%
pixel   86.526 / 147.317 / 74.426
```

Lo scorrimento ha **inerzia** (Lenis frena dopo `scrollTo`), quindi «aspetta 18
fotogrammi» non e' un'attesa ma una scommessa. E fra la fotografia CON
l'automobile e quella SENZA la scena si spostava: la differenza prendeva dentro
il fondo che si era mosso.

Prima cura, anche lei sbagliata: confrontare due `p.screenshot()` finche' non
erano uguali. `screenshot()` restituisce un **PNG compresso**, e due immagini
quasi identiche danno byte diversissimi: non convergeva mai.

Ora si aspetta che scorrimento e tempo della regia stiano fermi. Ripetibilita':
**dal 100% di varianza al 2%.** E il valore vero e' peggiore di quello su cui
stavo lavorando (scuri 57%, non 37%): la previsione della revisione esterna era
**giusta**, e l'avevo scartata sulla base del metro rotto.

### `forza` e' un denominatore, non una manopola

Portandola da 7,6 a 55 ho invalidato in un colpo la taratura di TUTTI i
materiali che specchiano. Ho abbassato l'intensita' d'ambiente dei cerchi
quattro volte — 1,7, 1,0, 0,28, 0,07 — senza capire perche' non bastasse mai:
**0,28 di un ambiente sette volte piu' forte vale piu' di 1,7 di prima.** Il
numero da guardare non e' l'intensita': e' il **prodotto**.

E poi non era nemmeno l'ambiente. Prova decisiva: cerchi dipinti di rosso pieno,
la zona ruota misura `(42, 1, 4)` — il materiale e' quello e le modifiche
arrivano. Con l'ambiente quasi spento un metallo prende luce solo dalle
`RectAreaLight`, che sono fredde: il ciano veniva da li'.

### I provini ritraevano uno stato transitorio

`autoPronta && ambientePronto` non copriva `ruota.glb`. Fino al suo arrivo, al
posto delle ruote c'erano quelle **di segnale**: `MeshBasicMaterial` con
`toneMapped: false`, che emettono luce propria. **Due volte** ho creduto fossero
i cerchi veri troppo specchianti e ho corretto un materiale che nel fotogramma
non c'era.

---

## 5. Come si verifica il lavoro

```bash
node strumenti/orm_area.mjs                      # la ruvidità pesata per area
node strumenti/mappati.mjs auto2r_orm auto2r_col # le mappe sui soli texel mappati
node strumenti/zone.mjs                          # quote, linea di cintura
node strumenti/fairness.mjs public/modelli/auto2.glb 0.025
node strumenti/carrozzeria.mjs                   # mediana / 90° / scuri della sola vettura
node strumenti/uno.mjs 0.06 nome                 # un provino, con la guardia sugli errori
```

E le due regole che il progetto si è dato:

1. **Guardare sempre il provino, non solo le statistiche.** Oggi una mediana
   `0.0` perfettamente formata era una scena interamente nera.
2. **Un metro va verificato prima di crederci.** Quattro metriche sono state
   costruite e buttate su questo progetto perché misuravano rumore; oggi altre
   due (campionamento per vertice, e la mia prima lettura dell'albedo) si sono
   aggiunte alla lista.
