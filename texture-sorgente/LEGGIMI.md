# `texture-sorgente/` — cio' che serve per COSTRUIRE, non per spedire

Questa cartella esiste per una distinzione che avevo perso: **`public/` e' cio'
che spedisci, non cio' che ti serve per costruire.**

Tutto quello che sta in `public/` finisce nel pacchetto di consegna, che qualcuno
lo chieda o no. Dentro c'erano 1,4 MB di file che nessuna pagina chiede mai e
7 MB in tutto fra provini di diagnosi, tessiture pre-remesh e modelli sostituiti:
non rallentano il primo fotogramma — nessuno li richiede — ma stanno
nell'artefatto, nella cache, e nella cifra che un giurato vede se apre la rete e
guarda il totale trasferito.

Trovato da `strumenti/zavorra.mjs`, segnalato due volte dalla revisione esterna
prima che lo guardassi.

## Cosa c'e' dentro, e perche' non poteva stare altrove

| file | chi lo legge |
|---|---|
| `auto2r_nor.webp` | `canarino.mjs` (la maschera d'isola indipendente), `passaalto.mjs`, `orm_nuova.mjs`, `arco_maschera.mjs`, `leviga_arco.mjs` |
| `auto2r_orm.webp` | `orm_nuova.mjs` (da qui recupera vetro e cromo), `scala_uv.mjs` |
| `auto2r_col.webp` | `canopy.mjs`, `vetro.mjs`, `leviga_arco_col.mjs` |
| `_maschera_arco.png` | `leviga_arco.mjs`, `leviga_arco_col.mjs` |
| `_ao.png` | `orm_nuova.mjs` (l'occlusione cotta entra nel canale R) |
| `auto2_col/nor/orm/emi.webp` | nessuno strumento: sono le mappe **pre-remesh**, e servono a rifare le misure che stanno citate nei commenti di `Materiali.ts` (l'istogramma di `auto2_col`, la valle al 4,5%). |

**Perche' non in `assets-source/`**: quella e' in `.gitignore`, quindi da un
clone questi file non ci sarebbero e meta' degli strumenti smetterebbe di
funzionare senza dire perche'.

**Perche' non in `docs/provini/`**: anche quella e' ignorata, ed e' giusto — li'
stanno gli INTERMEDI rigenerabili (`_nor_passaalto.png`, `_maschera_col.png`),
non gli ingressi.

Questa cartella e' **tracciata da git e non copiata dal build**: Vite copia solo
`public/`. E' l'unico posto che soddisfa tutte e due le condizioni.

## Cosa e' stato cancellato invece che spostato

Tre file dichiarati morti **dai loro stessi commenti**, e rimasti li' lo stesso:

- `public/modelli/ruota.glb` (297 kB) — sostituito da `scene/RuotaVera.ts`.
  `Esperienza.ts:1039` dice gia' «le ruote si costruiscono, e `ruota.glb` non si
  carica piu'».
- `public/lastra/strada.mp4` (320 kB) — `scene/Lastra.ts:3038` dice testualmente
  «NON SERVE PIU' A NESSUNO. Sono 327 kB che...».
- `public/modelli/turbina.glb` (201 kB) — non nominato da nessuna parte.

Stanno nella storia di git, che e' il posto dove le cose tolte si ritrovano.

**La lezione che vale piu' dei kilobyte:** un commento che dichiara morto un file
non lo cancella. Per due volte la diagnosi era scritta nel codice, per esteso,
con il peso in cifre — e il file era ancora li'. La storia va nel commento, il
file va tolto.
