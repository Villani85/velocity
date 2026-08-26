# Perche' velocity e' pesante — la misura, 26 agosto 2026

Il committente, sulla build pubblicata: «non e' a scatti ma sembra
pesantissimo». Questo documento e' cosa ho trovato, comprese tre ipotesi mie
che la misura ha smentito.

La macchina su cui si giudica: **Intel Core 5 120U, una sola GPU Intel
integrata da 2 GB**. Nessuna scheda dedicata — quello che si misura e' quello
che si vede.

## 1. Gli scatti erano lo sviluppo. Il peso no.

Sulla porta 5174 il sito andava a singhiozzo, sulla build pubblicata no. Ma la
partenza resta lunga, e la rete non c'entra:

```
primo disegno (FCP)     1,38 s
il modulo e' partito    3,08 s
ambiente pronto        21,80 s
AUTOMOBILE PRONTA      23,92 s
```

La cascata delle richieste finisce a 5 secondi, poi la rete sta ferma. Quello
che riempie i venti secondi e' il filo principale:

```
compiti lunghi: 11    totale bloccato 15,32 s su 18,6 di attesa
  a 9,95s   8.674 ms      <- un blocco solo, meta' dell'attesa
  a 3,76s   2.203 ms
  a 7,30s   1.552 ms
  a 5,99s   1.306 ms
```

## 2. Il profilatore dice il nome

```
tempo PROPRIO, i piu' grossi (ms):
   14.517   onFirstUse       @three.module:45511
      938   texSubImage2D
      494   pareggia         @Insegne.ts:770
```

`onFirstUse` e' la funzione di three che **finalizza il collegamento di un
programma shader al primo disegno**, cioe' aspetta il driver. Quattordici
secondi e mezzo su diciassette: tutto il resto e' rumore.

## 3. Quanti programmi, e quando nascono

```
    8,27s     32 programmi   (il riscaldamento)
   21,59s     80             (auto pronta)
   47,66s    128
   dopo aver percorso la pagina:  320
```

**Circa 300 programmi shader distinti**, la maggior parte usati una o due
volte. Su questo driver ognuno costa intorno ai 180 ms di collegamento: sono
quasi un minuto di compilazione spalmato sull'esperienza. La partenza lenta e i
blocchi da uno a quattro secondi in mezzo ai capitoli **non sono due difetti:
sono lo stesso difetto** visto in due momenti.

E il conto non e' legato allo scorrimento: a pagina ferma, senza toccare
niente, nascono **+78 programmi in 120 fotogrammi**.

Dove nascono, in una corsa intera: 145 in `hero`, 75 in `orbita`, e appena 17
in tutti gli altri capitoli messi insieme. Il novanta per cento del costo sta
nel primo quindici per cento della pagina.

## 4. Tre ipotesi mie, tutte e tre smentite

**«E' il riscaldamento che blocca.»** `Riscalda.ts` ha gia' l'interruttore
`?senzariscaldamento`, scritto per questa domanda. Ablazione:

```
                    bloccato   il blocco grosso
con riscaldamento     12,83 s   7.295 ms  a 10,80 s
senza                 13,94 s   7.711 ms  a  7,67 s
```

Il blocco sopravvive: si sposta solo piu' presto, perche' era il riscaldamento
a ritardarlo. Il totale peggiora. **Non e' lui, e va lasciato dov'e'.**

**«E' il gestore di qualita' che commuta qualcosa su tutti i materiali.»**
Durante i salti grossi (+73, +37, +36, +36) il livello resta `medio`, le ombre
restano accese, il rapporto pixel resta 1. Scende a `basso` solo dopo che quasi
tutti i programmi sono gia' nati. **Non e' lui.**

**«E' la lente del fanale.»** Questa sembrava vinta. Le tracce dicevano
`renderTransmissionPass` — la passata che three accende per l'unico materiale
trasmissivo del sito, la lente del fanale (`Fanale.ts:132`), che essendo a
doppia faccia fa disegnare retro e fronte marcando il materiale da ricompilare
due volte a fotogramma. Provato a caldo: da +78 a +5 programmi.

Fatta nel sorgente e rimisurata con lo stesso protocollo: **+76 contro +78**,
cioe' niente. La prova a caldo era viziata da me — cambiando la faccia a
runtime avevo provocato io la raffica di ricompilazioni PRIMA di iniziare a
contare, e contavo dopo che il costo era gia' stato pagato. La modifica e'
stata tolta: un cambiamento che non guadagna non si tiene solo perche' e' gia'
scritto.

E rimessa la spia sull'interruttore dopo la cura: **+215 programmi in 120
fotogrammi e ZERO chiamate a `needsUpdate`**. I programmi non nascono da
qualcuno che marca i materiali: nascono perche' gli stessi materiali vengono
disegnati in configurazioni diverse — bersagli di resa diversi, camere diverse
— e in three ogni configurazione e' un programma a se'.

## 5. Dove si va a parare

La domanda non e' piu' «chi marca i materiali» ma **«quante configurazioni di
resa attraversa questa scena, e perche' cosi' tante»**. Il riscaldamento ne
copre 32 su 300, e sa gia' che le configurazioni contano — il suo commento lo
dice: «Three non compila un programma per MATERIALE: ne compila uno per
CONFIGURAZIONE». Il seguito e' contarle e ridurle.

## 6. Una nota sugli strumenti, che vale il documento da sola

Confrontando due serie di tappe, otto differenze su nove erano **grana**. L'ho
saputo solo perche' ho reso una terza serie SENZA modifiche: il controllo dava
gli stessi numeri (`ingresso` 8,90% contro 8,90%).

**Senza quel controllo avrei creduto a tutte e nove.**

E la nona, `abitacolo` al 2,92% — l'unica che sembrava davvero cambiata — era
l'**orologio** del cruscotto: 18:02 contro 18:05. `tappe.mjs` non usa il banco
di prova, che l'orologio lo congela. E' lo stesso difetto di `raccordo.mjs`,
che esce rosso una volta su tre: strumenti scritti prima del banco, che
misurano anche cio' che il banco serve a spegnere.
