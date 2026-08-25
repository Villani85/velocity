# La notte del 25 agosto — diario

Aggiornato a ogni tornata. Se il mio contesto viene riassunto, riparto da qui.

**Regola delle corsie.** CORSIA A = un cancello, provocato, diventa rosso →
si spedisce. CORSIA B = decide l'occhio → si prepara la patch e i due provini,
NON si applica.

---

## Passo zero — fatto

- `C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright` **esiste**. Senza,
  81 strumenti su 128 morirebbero all'import, cioe' in silenzio.
- Server di sviluppo su 5174: **200**.
- `guardia.mjs` avviata in sottofondo, esce al primo guasto.
  Registro in `docs/notte/guardia.log`.

---

## Tornata 0 — i cancelli prima di usarli

### `punteggiatura.mjs` — era un cartello, adesso e' un cancello

Tre difetti, tutti miei, tutti trovati provocandolo invece di leggendolo:

1. **Usciva sempre zero.** L'intestazione dichiarava di essere un cancello e
   stampava `NON PASSA`, ma dentro una catena con `&&` non fermava niente.
2. **Bocciava il tempo piu' fermo dei sette.** La soglia e' il 5% della corsa
   massima; `accensione` non muove la camera di un millimetro, quindi la sua
   soglia era ZERO e bastava un valore in virgola mobile all'ultima cifra.
   Adesso c'e' un fondo assoluto a 1e-4.
3. **Era BALLERINO.** A passo 0,005 passava, a passo 0,02 bocciava, sugli stessi
   identici sorgenti. Un tempo lungo 0,13 di scorrimento campionato ogni 0,02 da'
   sei letture, e in sei letture una tenuta di un sesto non ci sta. Adesso, se un
   tempo ha meno di 15 letture, il cancello **rifiuta di decidere** ed esce 2
   («metro inadeguato»), distinto dall'1 («la scena e' rotta»).

Provato in tutti e tre gli stati:

| stato | esito | uscita |
|---|---|---|
| `PAUSA = 0.001` (provocazione) | NON PASSA | **1** |
| passo 0,02 | METRO INADEGUATO | **2** |
| passo 0,005, sorgenti veri | ogni tempo ha la sua pausa | **0** |

### Restano cartelli, fuori dalla catena di verifica

`abitacolo_prova.mjs`, `canarino.mjs`, `pellicola.mjs`, `qualita.mjs` stampano un
verdetto e escono zero. Non sono nella catena di §8, quindi non ho speso rese per
provocarli. **Da fare se avanza tempo** — e finche' non e' fatto, i loro verdetti
si leggono a occhio e non si concatenano.

---

## Tornata 1a — i documenti che mentivano (corsia A, spedito)

`public/llms.txt` e' un file statico che non genera nessuno, quindi nessuno si
accorgeva che invecchiava. Tre affermazioni su tre erano false:

| diceva | era |
|---|---|
| «Lavori: un progetto solo, VELOCITY» | **dieci** |
| «l'indirizzo e' da definire… non ne mostra uno finto» | c'e' da tempo |
| «dentro una corte al crepuscolo» | una **villa**; la corte e' una delle 4 viste |

Verificate una per una contro il codice, non prese dall'inventario.

E soprattutto: **`strumenti/coerenza.mjs`**, il cancello che mancava. Confronta
cio' che il documento DICHIARA con cio' che il codice FA — numero dei lavori,
indirizzo (nei due sensi: negarlo quando c'e', e pubblicarne uno inventato
quando non c'e'), nomi delle viste. Provocato su tutti e tre i controlli, rosso
su tutti e tre, verde sul file vero.

La cura per «nessuno lo controllava» non e' «adesso lo ricontrollo»: e' qualcosa
che lo controlla da solo a ogni giro.

**Da aggiungere alla catena di §8:** `node strumenti/coerenza.mjs`.

---

## Coperto finora

| | |
|---|---|
| tempi | nessuno ancora, per la caccia |
| finestre | nessuna |
| qualita' | nessuna |

## Corsia B — in attesa del tuo occhio

(vuota)

## Difetti visti e scartati

(vuoto — serve a non riproporre gli stessi ogni tornata)

## Che cosa NON ho coperto

Tutto: la caccia comincia adesso.
