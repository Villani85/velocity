# Carrozzeria di VELOCITY — perché i riflessi erano "a macchia" e cosa è stato fatto

> **CORREZIONE, 25 agosto.** Il numero «0,341 mm (−59%)» che compare qui sotto
> **non si riproduce** con lo strumento del progetto sul file che si spedisce:
>
> ```
> node strumenti/fairness.mjs public/modelli/auto2.glb 0.025
>   residuo_mediano_mm 0.424   residuo_p95_mm 1.51
> node strumenti/fairness.mjs asset/auto/auto2_PRIMA_DEL_REMESH.glb 0.025
>   residuo_mediano_mm 0.84    residuo_p95_mm 4.165
> ```
>
> Il «prima» si riproduce **esatto** — 0,840 e 4,165, gli stessi numeri scritti
> qui — quindi il metro e' quello giusto e il difetto sta nel «dopo». Il salto
> vero e' **0,840 → 0,424 mm, cioe' −49%** (e p95 4,165 → 1,51, −64%), non −59%
> e −70%. Probabilmente lo 0,341 era misurato su un candidato intermedio che non
> e' quello poi esportato.
>
> Il sito e' stato corretto. Le righe qui sotto restano come sono, perche' questo
> documento e' anche la storia di come si e' arrivati a quei numeri — ma il
> numero da citare e' 0,424.


> Documento per chi arriva dopo (persona o altra AI). Scritto il 2026-08-24.
> Riguarda `public/modelli/auto2.glb`, la vernice e il modo in cui si **misura**
> se una carrozzeria è fatta bene. Contiene anche quattro metri sbagliati, perché
> sapere cosa NON misurare vale quanto sapere cosa misurare.

---

## 1. Il problema, detto bene

Una carrozzeria **non ha texture**: è una superficie continua e lucida. L'unica cosa
che ne racconta la forma è **come si deforma un riflesso lungo mentre ci scorre sopra**.
Per questo negli studi fotografici le auto si illuminano con **strisce softbox da 3–9 m**
e non con pannelli quadrati: la striscia lunga produce un riflesso che percorre tutta la
fiancata e ne rivela ogni curvatura. Un pannello quadrato dà una **macchia molle**, che
non porta informazione di forma.

Sul sito il difetto si vedeva così: **riflessi a macchia, non righe che corrono**.

Il committente l'aveva già detto dopo il confronto con The Watch:
> «quando vai molto vicino, il livello di fedeltà non ha ancora la stessa qualità product-film»

## 2. Cosa NON era il problema (già risolto prima)

**L'esposizione.** Il metro `strumenti/carrozzeria.mjs` misura quanta luce ha addosso la
sola automobile (per differenza fra due scatti, uno con la vettura nascosta). All'epoca la
carrozzeria stava a **50** mentre la villa era a 141 e la piscina a 156: era quasi solo
profilo. Oggi misura **mediana 95–121 con scuri sotto il 7%**: la silhouette non c'è più.
Quel capitolo è chiuso, non riaprirlo.

## 3. Cosa ERA il problema

**Le normali della mesh ondeggiano.** Il modello nasce da Tripo a partire da poche viste:
la superficie ha un'increspatura di **circa 1 mm di ampiezza con lunghezza d'onda di 2–5 cm**.
È esattamente la banda che l'industria dell'auto chiama *orange peel* (BYK wave-scan, bande
Wd/We) e che l'occhio legge a 2–3 metri di distanza — cioè proprio nell'inquadratura hero.

Conseguenza a catena, ed è il punto che spiega tutto:

> **La vernice è un sistema ACCOPPIATO.** Clearcoat nitido + normali pulite + strisce
> luminose nell'ambiente sono **una cosa sola**. Cambiarne una sola non serve.

Il progetto era partito con `clearcoat 1 / clearcoatRoughness 0.028` (specchio) ed era
**arretrato a 0.62 / 0.09 ("satinata")**: comprensibile, perché uno specchio su normali
ondulate mostra ogni increspatura. Ma così si perde la riga che corre. L'ordine giusto è:
**prima si raddrizzano le normali, poi si può alzare il clearcoat, e allora le strisce danno
la riga**.

## 4. Il metro giusto (dopo quattro sbagliati)

Questa è la parte da leggere con più attenzione, perché tre di quei metri davano numeri
plausibili e sbagliati.

| metro | perché fallisce |
|---|---|
| conteggio "ondulazioni" su normali per-vertice binnate | **pavimento di rumore**: dava ~45 su TUTTI i glb (grezzo, liscio, l40) e non scendeva nemmeno applicando un fairing che sposta i vertici di 14 cm. Il segnale è quasi-zero, i cambi di segno sono jitter di binning |
| energia ad alta frequenza sul render | misura i **bordi delle bande zebra**, che sono nettissimi in ogni variante. Differenza fra varianti: 1,3% |
| frammentazione delle bande per scanline | il **numero** di bande lo decide l'ambiente, non la superficie |
| smoothing valutato "a occhio" sul render dell'app | la regia ri-applica l'ambiente ogni frame e la vernice satinata nasconde tutto |

**Quello che funziona: residuo da fit quadrico locale sulla GEOMETRIA.**
`strumenti/fairness.mjs`. Per ogni vertice campionato prende i vicini entro un raggio R in
metri reali, costruisce un piano tangente e adatta `w = a + bu + cv + du² + euv + fv²`;
riporta il **RMS dei residui in millimetri**.

Perché è giusto: la quadrica **assorbe la curvatura legittima** (un pannello *deve* essere
curvo), il raggio R sceglie la banda di lunghezza d'onda che ti interessa (come le bande
BYK), e non ha pavimento di rumore. E soprattutto: **concorda con l'occhio**.

```bash
node strumenti/fairness.mjs public/modelli/auto2.glb 0.025      # R = 25 mm
```

Bersaglio "product film": **sotto 0,1 mm a R=25 mm**.

**Il collaudo visivo che lo accompagna** è la *zebra analysis*, lo stesso strumento che si
usa nel design automobilistico: ambiente a bande, vernice messa a specchio, normal map
azzerata per isolare le normali del **modello**. Pagina isolata `collaudo.html` +
`src/collaudo.ts`, screenshot con `strumenti/zebra_glb.mjs`:

```bash
MSYS_NO_PATHCONV=1 node strumenti/zebra_glb.mjs /modelli/auto2.glb nome_provino tre-quarti
```

Se le bande riflesse **si spezzano e si arricciano**, la superficie non è fair. Se **corrono
continue**, lo è.

## 5. Cosa è stato provato, con i numeri

Tutte le misure a **R = 25 mm**, residuo mediano, sulla carrozzeria.

| intervento | residuo | p95 | esito |
|---|---|---|---|
| **modello attuale** (65k triangoli) | **0,840 mm** | 4,165 mm | punto di partenza |
| fairing Taubin (`leviga.mjs`, 25 iter) | migliora visibilmente alla zebra, forma intatta | | **non basta** |
| normali oct8 → 12 bit (`gltfpack -vn 12`) | differenza misurata **1,3%** | | reale ma **marginale** |
| **shrinkwrap + corrective smooth** (ciclo canonico dei manuali) | **2,608 mm** | 7,155 mm | **SCARTATO: 6× peggio** |
| quad remesh 13k + subdivision | 0,404 mm | 1,389 mm | buono |
| **quad remesh + subdiv + UV** | **0,341 mm (−59%)** | **1,231 mm (−70%)** | **candidato** |

### Perché lo shrinkwrap va scartato (contro-intuitivo, ma misurato)
Il ciclo che tutti i tutorial insegnano — cage quad → shrinkwrap `PROJECT` sull'originale →
corrective smooth → subdivision — **recupera la silhouette** (dimensioni tornate
1.0×0.409×0.219 contro 1.0×0.411×0.219 dell'originale) **ma distrugge la fairness**: lo
shrinkwrap ririporta la cage sulle increspature dell'originale e il corrective smooth non
le toglie.

> Su una mesh generata da poche viste **non c'è dettaglio buono da recuperare: c'è rumore.**

Il dettaglio si rimette con una **normal map cotta**, non con la geometria. E funziona
perché in three.js il **clearcoat usa `clearcoatNormalMap` separato** e, in sua assenza, la
**normale geometrica**: quindi il dettaglio nella normal map si vede sul materiale base
**ma non sporca il riflesso della vernice**. Geometria fair per i riflessi, dettaglio in
mappa per la materia.

## 6. La pipeline che produce il modello buono

```bash
# 1. quad remesh (Tripo, 10 crediti) — PARTIRE DALLA SORGENTE FLOAT, non dal glb compresso
tripo model import asset/auto/auto2_intera.glb
tripo model convert <task-id> --format FBX --quad --face-limit 14000
#    -> 13.339 quad puliti, solo 4 triangoli

# 2. in Blender: import FBX -> Subdivision Catmull-Clark 1 livello -> export glb
#    (NIENTE shrinkwrap, vedi sopra)

# 3. compressione
npx gltfpack -i in.glb -o out.glb -cc -vp 16 -vn 12 -vt 12 -kv -kn -km
```

## 7. Le trappole già pagate — leggere prima di rifare qualsiasi cosa

1. **`MSYS_NO_PATHCONV=1`** — Git Bash converte un argomento che inizia con `/` in un
   percorso Windows: `/modelli/auto2.glb` diventava `C:/Program Files/Git/modelli/auto2.glb`
   e il loader diceva `TypeError: Failed to fetch`. **Sette tentativi buttati a incolpare Vite.**
2. **`gltfpack` scarta le UV** se nessun materiale le usa → serve **`-kv`**. Senza, il file
   esce con solo POSITION+NORMAL e le texture si spalmano a caso. **Verificare sempre gli
   attributi dopo la compressione.**
3. **`gltfpack` scarta anche i NOMI** di mesh e nodi, anche con `-kn`. E `Materiali.ts:1487`
   assegna la vernice cercando `n.startsWith('AUTO')`: senza nome, l'auto esce senza materiale.
   I nomi stanno **solo nel chunk JSON del glb**: si possono reiniettare riscrivendo quel chunk
   senza toccare il binario, così la compressione resta intatta (vedi §8).
4. **`gltf-transform` cabla le normali a octaedrico 8 bit** e non è configurabile: 0,28° di
   errore medio, che uno specchio raddoppia nel riflesso. `gltfpack -vn 12` lo risolve.
5. **La levigatura NON si fa sulla scena viva**: `auto2.glb` usa `KHR_mesh_quantization`;
   scrivere posizioni float in un buffer quantizzato **corrompe la mesh** (l'auto sparisce, e
   la waviness misura "0" — un successo apparente che è un disastro).
6. **`liscia.mjs` parte dal file già compresso** (`public/modelli/auto2.glb`) invece che dalla
   sorgente float `asset/auto/auto2_intera.glb`: ogni giro di levigatura **accumula** errore
   di quantizzazione. Partire sempre dal float.
7. **`optimizeDeps.include`** in `vite.config.ts` con gli import profondi di three, e gli
   strumenti servono vuoto `@vite/client`: senza, Vite manda un «optimized dependencies
   changed. reloading» che riparte la pagina a metà caricamento e uccide il fetch del modello.
   **Un retry dentro la pagina non può funzionare**: il reload distrugge l'intero contesto JS.
8. **Il trasferimento UV per interpolazione NON basta**: `Data Transfer` con
   `POLYINTERP_NEAREST` dà UV geometricamente valide (zero loop non mappati) ma sulle texture
   produce **macchie scure** — la topologia è diversa e l'interpolazione rompe le isole.
   Servono **UV nuove + bake** delle mappe dall'originale.

## 8. Reiniettare i nomi senza rompere la compressione

```js
// GLB: header 12B | chunk JSON | chunk BIN. I nomi stanno solo nel JSON.
const b = fs.readFileSync(file)
const jsonLen = b.readUInt32LE(12)
const json = JSON.parse(b.slice(20, 20 + jsonLen).toString('utf8'))
json.meshes.forEach(m => m.name = 'AUTO')
json.nodes.forEach(n => { if (n.mesh !== undefined) n.name = 'AUTO' })
let s = Buffer.from(JSON.stringify(json), 'utf8')
while (s.length % 4) s = Buffer.concat([s, Buffer.from(' ')])
const rest = b.slice(20 + jsonLen)                      // binario intatto
const head = Buffer.alloc(20)
head.write('glTF', 0); head.writeUInt32LE(2, 4)
head.writeUInt32LE(12 + 8 + s.length + rest.length, 8)
head.writeUInt32LE(s.length, 12); head.writeUInt32LE(0x4E4F534A, 16)
fs.writeFileSync(file, Buffer.concat([head, s, rest]))
```

## 9. Stato al 2026-08-24 — SOSTITUITO IN PRODUZIONE

Su richiesta del committente (che preferiva il modello remeshato dopo averlo visto), in
produzione ora c'e' il **remesh**, con tre cambiamenti:

1. **Carrozzeria remeshata** — `public/modelli/auto2.glb`, 627 kB, fairness **0,341 mm** contro
   0,840 (−59%). Contiene `AUTO`, `FARO_DX`, `OTTICA_BORDO`: i pezzi del faro **devono** esserci,
   perche' l'elemento luminoso davanti e' il meccanismo della transizione «La via dentro non e' la
   porta». Esportando la sola carrozzeria sparivano, ed e' un difetto che si vede subito.
   Backup dell'originale: `asset/auto/auto2_PRIMA_DEL_REMESH.glb`.
2. **Texture cotte** — `public/texture/auto2r_*.webp`, con UV nuove. `Materiali.ts` le referenzia.
   Le originali `auto2_*.webp` restano intatte accanto: per tornare indietro bastano il backup del
   modello e un sed sui nomi.
3. **Strisce nell'ambiente** — `Panorama.ts`, funzione `ambienteConStrisce`: il panorama diventa
   una sfera rovesciata e ci si aggiungono tre pannelli emissivi lunghi (12 x 0,55 sui fianchi,
   7 x 0,4 sopra), cotti insieme nel PMREM. E' il terzo passo della sequenza accoppiata, e ora
   sulla fiancata c'e' una riga che corre invece di una macchia.
4. **Ruote vere** — `public/modelli/ruota.glb` (304 kB, 28,7k triangoli), generata con Tripo e
   montata da `Ruote.vestiConModello`. Sostituisce l'astrazione `*_SEGNALE` (cilindro a venti
   segmenti + anello piatto + cinque razze) che il codice stesso ammetteva leggersi come «una
   moneta con un'asta».

### Le ruote: due correzioni gia' fatte
1. **Larghezza.** Il modello e' largo 0,353 su un diametro di 0,997: portato al diametro della gomma
   diventava largo 21 cm, DUE VOLTE gli 11 del pneumatico di segnale. Si stringe lungo il mozzo
   (`copia.scale.x`) a 14,5 cm, tenendo il diametro.
2. **Rientro nell'arco — e' cio' che le attacca alla vettura.** Le ruote di segnale erano spinte in
   FUORI di 12 cm (`SPORGENZA`) apposta, perche' un anello piatto si vede solo se sporge. Una ruota
   vera nello stesso punto sporge per intero e legge come un pezzo appiccicato di fianco: questa e'
   una streamliner a ruote **carenate**, la carena deve coprirne una parte. Si rientra di
   `SPORGENZA + meta' larghezza`.

3. **Divisione gomma/cerchio — RISOLTA, ed e' la trappola piu' istruttiva.**
   La soglia sul raggio non scattava in app (tutta la ruota restava metallo, 114.728 triangoli in
   un materiale solo) mentre a freddo, sullo STESSO file, separava 9.597 triangoli di pneumatico da
   19.085 di cerchio. Causa: **si aggiungeva un figlio dentro `traverse`**. Modificare l'albero
   mentre lo si percorre fa visitare a three anche il pezzo appena creato, e la divisione gira su
   se stessa. Cura: **raccogliere prima in un array, modificare dopo.** Verificato in scena:
   4 pneumatici (38.612 tri) + 4 cerchi (76.340 tri), esattamente i numeri previsti.
4. **Il cerchio deve catturare la luce, non solo specchiare il buio.** Con metallo puro, ruvidita'
   0,34 e colore 0,62 la lega restituiva solo l'ambiente notturno: un anello scuro senza razze
   leggibili. Una lega lucidata riflette intorno al **90%**: colore 0,90 / ruvidita' **0,20** /
   `envMapIntensity` **1,7** danno il colpo di luce sugli spigoli, che e' cio' che disegna il raggio.
5. **La posizione: centro sull'arco.** Rientrando di `SPORGENZA + meta' larghezza` la ruota finiva
   SOTTO il fianco e le razze sparivano; rientrando della **sola** sporgenza il centro torna
   sull'arco — dove sta la ruota di un'automobile — e la faccia del cerchio resta in vista.

### Quello che resta da rifinire
- I cerchi restano **azzurrati**: specchiano il panorama notturno della villa, che e' blu. Nel
  riferimento del committente la scena e' calda e i cerchi leggono argento. E' una questione di
  AMBIENTE (strisce calde, grading ambra), non del materiale della ruota.
- La carrozzeria e' piu' scura dell'originale (mappe cotte a 2048 con UV automatiche).
- La carrozzeria e' piu' scura dell'originale (le mappe cotte a 2048 con UV automatiche perdono
  materia rispetto a quelle disegnate a mano).

### Le trappole del montaggio ruota, tutte pagate
1. **`caricaNormalizzato` collassa un pezzo da montare**: normalizza l'asse maggiore a una
   lunghezza data e per la ruota tornava fattore ZERO, invisibile e senza errori. Per i pezzi
   interni serve `caricaGrezzo` (aggiunta in `Modelli.ts`) e la scala se la calcola chi monta.
2. **Non clonare le geometrie cuocendoci `matrixWorld`**: con geometrie **quantizzate** la scatola
   d'ingombro torna VUOTA (diametro 0) mentre i vertici ci sono tutti — ventunmila, contati. Si
   clona l'OGGETTO (`scena.clone(true)`), che si porta dietro le trasformazioni senza toccare i
   vertici.
3. **L'asse si misura**: la scatola diceva 0,353 x 0,997 x 0,995, quindi il mozzo del modello e'
   **X** mentre nella scena gira attorno a **Z** — un quarto di giro attorno a Y. Con la rotazione
   indovinata (attorno a X) la ruota compariva di taglio, come una lama nera dietro la carena.
4. **Gomma e cerchio sono una mesh sola** e si dividono per **raggio** (oltre il 78% e' pneumatico):
   senza la divisione si ottiene un pneumatico cromato.
5. **Le texture del generatore vanno buttate**: quaranta megabyte di fotografia con la luce cotta
   dentro, in una scena che ha gia' la sua luce. Si tiene la GEOMETRIA e si vestono con i materiali
   del progetto.
6. **`gltfpack -si` non basta**: 215k triangoli restavano 43k; serve `-si 0.02 -sa` (aggressivo)
   per arrivare a 28k.

## 10. Il livello successivo (dopo la geometria)

Con la geometria fair si può finalmente:
1. **rialzare il clearcoat** a `clearcoatRoughness ≤ 0.05` (oggi 0.09 per forza di cose);
2. mettere **strisce emissive lunghe nel PMREM** (`pmrem.fromScene` su piani emissivi
   stretti), che è ciò che produce la riga che corre lungo la fiancata;
3. usare `scene.environmentRotation.y` per **piazzare** quella riga sul cofano senza spostare
   le luci.

Tutto il know-how è anche nella skill `stack-sito-immersivo`, file
`references/fotorealismo-webgl.md`.

## 11. Avvicinamento al riferimento notturno (2026-08-24, secondo giro)

Il committente ha fornito un'immagine di riferimento: notte, hypercar nera lucida su podio di
marmo con anello LED ambra, pavimento bagnato, barra rossa in coda. Interventi fatti:

### Due difetti veri trovati leggendo il codice (non questioni di gusto)
1. **L'anello LED del podio non si vedeva MAI.** `Piattaforma.ts` faceva
   `gola.rotation.x = +Math.PI/2`, che porta la normale del `RingGeometry` a puntare **in basso**;
   con `FrontSide` la camera dell'hero lo eliminava dal culling. L'unica camera che ne vedeva la
   faccia buona era quella del riflesso planare (che guarda dal basso) — ecco perche' si
   intravedeva a terra e non sul podio. Cura: `DoubleSide`.
   Inoltre **mancava `toneMapped: false`** (unico caso nel progetto): ACES ricomprimeva il x2,6 e
   in lineare solo il canale rosso sfiorava la soglia di bloom. Ora x3,4 con tone mapping spento.
   E **il piano copriva l'anello in modo esatto** (entrambi a raggio 2,62): il disco rientra di
   2,5 cm e la gola sporge come un labbro di luce.
2. **Il marmo esisteva gia' e il podio non lo usava.** `nero_col/nor/rgh.webp` sono il marmo nero
   del progetto (li usa gia' `Riflesso` per le venature); il disco era un colore piatto senza
   mappe. Ora usa le tre mappe via `Esterno.marmo()`, con `envMapIntensity` da 0,12 a 0,55.

### Il resto
- **Riflesso** piu' forte: `Riflesso.forza` 0,52 → 0,70, specchio nel materiale 0,62 → 0,80.
- **Soglia bloom** 2,60 → **1,75**: a 2,60 il LED e le luci non fiorivano mai.
- **Finitura scura lucida**: tinta da 0,96/0,97/0,99 (quasi bianca) a **0,055/0,058/0,068**,
  metallo 0,92 → 0,30, ruvidita 0,32 → 0,24, trasparente 0,88 → **1,0** / 0,045 → **0,030**.
- **Strisce piu' forti**: `forza` 3,0 → **5,2**. E' il contraccolpo della vernice scura, e l'ha
  detto il metro: con la tinta nera la mediana era crollata a 17 con il **42% di pixel scuri**
  (la vettura tornava una silhouette). Con le strisce a 5,2: mediana 36, scuri **17%**.

### La barra rossa in coda: NON si fa come geometria — e' una lezione sulla FORMA
Il riferimento e' una hypercar col **posteriore verticale**: li' una barra ci sta per costruzione.
**Questa e' una streamliner e la coda va a punta**: non c'e' pannello su cui appoggiarla. Provata
come piano costruito, misurato in metri veri e posizionato sulla scatola d'ingombro (estremo,
groppa, tre quote diverse): resta sempre **dentro la carena o di taglio, invisibile da ogni
angolo** — oltre i tre quarti di lunghezza la carena e' piu' stretta della barra stessa.

La strada giusta e' la **mappa emissiva**, che dipinge la luce SULLA superficie. Bloccante da
risolvere prima: ricavare dalla geometria quali pixel UV siano «la coda» ha dato **intersezione
vuota** con i pixel accesi, da entrambi i lati dell'asse — le UV lette dall'attributo non
corrispondono a quelle con cui `auto2r_emi.webp` e' stata cotta. Finche' quel disallineamento
non si chiarisce, dipingere significa dipingere a caso.

### Il grading notturno (ultimo passo)

`Grado.ts` non aveva **nessun** controllo di colore — solo nero, contrasto, microcontrasto,
vignetta, grana, aberrazione. Aggiunte due uniform fra contrasto e vignetta:
- **`temperatura` 0,085** — guadagno **incrociato** (rosso +8%, blu -8%, verde a meta'): la scena
  diventa calda **senza** spostare la luminanza. Sotto 0,05 non si vede, sopra 0,14 la villa vira
  ad arancione finto.
- **`saturazione` 0,88** — di notte l'occhio perde colore; togliendone un filo ovunque, cio' che
  resta acceso (gola ambra, vetrate) risalta **per contrasto**.

E la manopola che fa davvero la notte: **`backgroundIntensity` 1,0 → 0,62**, tenendo
`environmentIntensity` a 1,0. Tocca solo la fotografia dietro, non cio' che ILLUMINA la lamiera:
villa e lastricato scendono e diventano notte, la vettura resta leggibile. Abbassare l'esposizione
le avrebbe abbassate tutte e due — che e' come si ottiene una foto scurita invece di una notte.
`toneMappingExposure` 1,00 → **0,82**, come secondo stop leggero.

**Il contraccolpo, misurato:** ogni passo che scurisce la scena spegne anche i **riflessi** (che
passano per il tone mapping) ma **non** le sorgenti dichiarate (`toneMapped: false`). Quindi:
strisce da 3,0 a **7,6**, gola del podio da 2,6 a **5,2**, tinta della vernice risalita da
0,055 a **0,105** perche' a 0,055 il metro dava 69% di pixel scuri — la vettura spariva.
La regola: **una sorgente dichiarata resta, un riflesso va ricompensato.**

## 12. IL BUG PIU' GRAVE DI TUTTI: le UV schiacciate a 1/16

Trovato cercando perche' la coda non si potesse dipingere. **Le UV del modello in produzione
andavano da 0 a 0,062 invece che da 0 a 1**: tutta l'automobile campionava il **6% in basso a
sinistra** delle sue quattro texture. Spiega tutto quello che sembrava inspiegabile:
- le mappe cotte che «perdevano materia» e rendevano la carrozzeria piatta;
- l'intersezione VUOTA fra i pixel accesi e la maschera della coda;
- il fatto che la lama luminosa sul fianco non si vedesse piu'.

**La causa.** `gltfpack -vt 12` quantizza le texcoord a 12 bit dentro un attributo u16
normalizzato (4095/65535 = 0,0625) e mette il fattore di scala in **`KHR_texture_transform`**
sul materiale del glb. Ma l'app **non usa il materiale del glb**: `Materiali.scocca()` costruisce
il suo e ci attacca le proprie texture — e con il materiale se ne va anche la trasformazione.
Il file e' formalmente corretto, l'app lo legge in un modo che quella correttezza non prevede.

**Il rimedio, in due parti:**
1. Riportare le UV a piena scala (in Blender: `u * 65535/4095`, e per V — che Blender ha
   capovolta rispetto a glTF — `1 - (1 - v) * 65535/4095`).
2. **Comprimere con `-vtf`** (texcoord in virgola mobile) invece di `-vt 12`: niente
   quantizzazione, niente trasformazione da perdere. Costa qualche kilobyte e toglie il problema
   alla radice.

**Regola generale, e vale per qualunque progetto three.js:** se sostituisci il materiale di un
glb con uno tuo, **verifica le UV che arrivano davvero** — `KHR_texture_transform`,
`KHR_materials_*` e ogni altra correzione appesa al materiale muore con lui. Un file valido non
garantisce un risultato valido.

**Sbloccato subito dopo:** con le UV giuste la maschera della coda ricavata dalla geometria
funziona (29.000 triangoli del quarto posteriore, 774.000 pixel di maschera, 9.132 pixel accesi
dentro) e la **coda e' stata dipinta di rossa** conservando l'intensita' di ogni pixel e
cambiandone solo la tinta: il disegno delle luci resta identico, cambia il colore. Il muso resta
freddo, come su una vettura vera.

## 13. Il pavimento bagnato

Nel riferimento meta' dell'effetto e' il **pavimento bagnato** intorno al podio, che allunga la
vettura verso chi guarda. Qui il pavimento **e' la fotografia** del panorama, e una fotografia non
riflette. Esiste un `SUOLO` di marmo vero (`Esterno.ts`) ma e' tenuto **invisibile** apposta: nella
foto del cortile il pavimento c'e' gia' ed e' migliore di qualunque piano — riflette il colonnato
vero, colonna per colonna. Accenderlo significherebbe averne due.

**Quello che si puo' fare e' far uscire il RIFLESSO dal podio.** Tre numeri:
- **raggio del disco 2,62 → 5,6**: era ritagliato esattamente sulla piattaforma, quindi la vettura
  si specchiava solo sul suo disco e finiva li'. La sfumatura del bordo (gia' dentro `Riflesso`)
  fa sparire il taglio da sola. Il **lato del piano sale da 8 a 13 m**, se no il riflesso si
  troncava di netto appena fuori dal podio.
- **`forza` 0,70 → 1,15** e **`sfocatura` 1,0 → 0,62**: un pavimento bagnato riflette forte e
  abbastanza nitido.
- **Fresnel `pow(radente, 4.2)` → `pow(radente, 2.1)`**, sia in `Riflesso.ts` che nello specchio
  dentro il materiale della piattaforma (`Piattaforma.ts`). E' la modifica che conta di piu': con
  esponente 4,2 il riflesso esiste solo a incidenza radente, e dall'inquadratura hero — che guarda
  il pavimento dall'alto — spariva. **Una superficie bagnata riflette molto piu' di una asciutta
  proprio perche' il suo Fresnel e' meno ripido.**
