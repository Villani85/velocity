# Piano fotorealismo — velocity

**Data:** 24 agosto 2026 · **Stato:** fasi 0–4 da eseguire, 1.1 già fatta

Questo documento è scritto per essere **verificato**, non creduto. Ogni
affermazione porta con sé il comando che la riproduce, il file e la riga, e
l'output grezzo. Dove una misura mi ha smentito, sta scritto.

Compagno di questo file: [`CARROZZERIA_FAIRNESS.md`](CARROZZERIA_FAIRNESS.md),
che racconta il lavoro sulla geometria e i quattro metri costruiti e buttati.

---

## 0. Il reperto principale — la carrozzeria è uno specchio, non una vernice

Questo non era in nessuno dei due feedback esterni, ed è la scoperta più grossa
della sessione. Spiega da sola quasi tutte le critiche ricevute.

### Come si riproduce

```bash
node strumenti/orm_area.mjs
```

Lo strumento (`strumenti/orm_area.mjs`, scritto oggi) legge `auto2.glb`,
campiona `auto2r_orm.webp` al **centroide di ogni triangolo** e pesa il
risultato per l'**area vera del triangolo nel mondo**. Pesare per area e non
contare i triangoli è essenziale: sono di dimensioni diversissime, e ciò che si
vede è l'area.

### Output

```
ruvidita mappata sotto 0,25 (SPECCHIO): 66.1%
ruvidita mappata sopra 0,75 (opaca)   : 23.0%
metallico mappato sopra 0,5           : 32.9%
area rivolta verso l alto             : 42.1%  di cui a specchio 74.8%
```

### Cosa significa

In three, `roughnessFactor = material.roughness * texel.g`
([`Materiali.ts:1318`](../src/scene/Materiali.ts) per `ruvidita`, e
[`Materiali.ts`](../src/scene/Materiali.ts) `scocca()` per `m.roughnessMap = orm`).

Con `ruvidita = 0.30` e una mappa che sui texel della vettura vale ~0,004, la
ruvidità effettiva è **0,001**. Il 74,8% della superficie **rivolta verso la
camera** è un nero a specchio quasi perfetto.

Il commento nel sorgente dice:

> «0,32 per la mappa fa 0,26, che è la ruvidità di una carrozzeria vera»

Descrive un'intenzione che il file non soddisfa. È lo stesso difetto di famiglia
del §12 di `CARROZZERIA_FAIRNESS.md`: **un numero corretto rispetto a uno stato
del progetto che non esiste più.**

### Perché spiega le critiche ricevute

| critica esterna | causa vera |
|---|---|
| «carrozzeria, vetri, gomma, cerchi e trim leggono come la stessa sostanza lucida» | *sono* la stessa sostanza: uno specchio |
| «la parte centrale è quasi nera, spariscono curvature, volumi, spigoli» | uno specchio mostra l'**ambiente**, non la forma |
| «il fianco legge a macchie invece che a righe» | idem |
| «superficie senza tensione, sembra una saponetta» | idem |

Uno specchio nero sotto un cielo notturno **è** nero. Nessuna quantità di
grading, di strisce o di rim light può farne una carrozzeria, perché il
materiale decide prima che la luce arrivi al tone mapping.

### Le tre verifiche indipendenti

Non mi sono fermato al primo numero, perché il primo numero era sbagliato.

1. **Rasterizzazione delle UV** (`strumenti/mappati.mjs`) — costruisce la
   maschera di copertura rasterizzando i triangoli UV e misura solo dentro.
2. **Centroide di tutti i 106.736 triangoli** — evita i bordi delle isole, dove
   il campionamento punta su padding.
3. **Pesatura per area** (`strumenti/orm_area.mjs`) — la misura che conta.

E, decisivo, **ho guardato le mappe**:

```bash
node -e '...' # esporta docs/provini/mappe_affiancate.png
```

Nell'ORM il rosso `(255, 0, 0)` è AO 1 / ruvidità 0 / metallo 0. Le isole bianche
sono l'altra popolazione. La distribuzione è **bimodale**, non piatta.

---

## 1. Cosa dei feedback esterni ho confermato, e cosa no

Ho ricevuto due revisioni. Le ho verificate una per una invece di applicarle.

### Confermato ✅

| affermazione | verifica |
|---|---|
| **`metalness` alto tinge di blu ogni riflesso caldo** | Fisica corretta. Un metallo tinge lo speculare col proprio colore, un dielettrico lo restituisce bianco. Ero stato **io** ad alzarlo a 0,85 stamattina seguendo il primo revisore («Metallic 0.8–1»): sbagliato per una vernice scura. |
| **`specularIntensity: 0.6` in `vernice()`** | [`Materiali.ts:245`](../src/scene/Materiali.ts). Taglia F0 dal 4% al 2,4%, cioè ammazza il Fresnel bianco. Su un dielettrico è ciò che fa vedere la superficie. |
| **`scocca()` non ha `clearcoatNormalMap`** | Vero, mentre `vernice()` ce l'ha. E la scocca è ciò che veste `AUTO`. Il trasparente a 0,028 era uno **specchio ideale** su una mesh a 0,341 mm di residuo. |
| **Canale R della ORM piatto a 1,000** | `R p10 254 · mediana 255 · p90 255`. Zero AO cotta, 2048×2048 di spazio già pagato e vuoto. |
| **`GTAOPass radius: 0.9` m** | [`Esperienza.ts:755`](../src/core/Esperienza.ts). Tarato sulla corte; su una vettura di 4,4 m non tocca né passaruota né fughe. |
| **`INDIRIZZO = ''`** | [`Contatto.ts:27`](../src/ui/Contatto.ts). Il sito non ha modo di essere contattato. |
| **Zero metadati sociali** | `grep -c "og:\|twitter:\|canonical\|application/ld" index.html` → **0** |
| **Documento statico disallineato** | `index.html:319-321` dichiara 02/03/04 «in lavorazione»; `Lavori.ts` ha **11** voci. |

### Non confermato ❌ — e va detto

| affermazione | cosa dice la misura |
|---|---|
| **«`auto2r_col.webp` è bianca, mediana 0,982»** | Sui texel mappati la mediana è **0** (nera). Comando: `node strumenti/mappati.mjs auto2r_col`. Nota: anche le **mie** prime misure erano sbagliate — campionavo il padding. La versione corretta, confermata guardando l'immagine, dice nero. |
| **«normal map inclinata ~20° in mediana, ~62° al p95»** | Misurata sui texel mappati: `R 112/128/154 · G 125/127/135 · B 205/255/255`. La mediana è **esattamente la normale neutra** `(128,128,255)`. Lo scarto esiste ma è ~11°, non 20°. **Non tocco la mappa finché non ho un metro che regge.** |
| **«metalness effettiva ≈ 0,83»** | Solo il **32,9% dell'area** ha `B > 0,5` nella ORM. Su due terzi della vettura `metalness = metallo × ~0 = 0`. La conclusione (andare dielettrico) resta giusta; il numero no. |

---

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

> **Cancello:** `node strumenti/orm_area.mjs` deve dare «sotto 0,25» vicino a
> **0%**; `carrozzeria.mjs` non deve perdere mediana; e **si guarda il provino**.
> Se la vettura smette di essere uno specchio, le forme devono ricomparire.

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
