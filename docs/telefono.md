# Il telefono — cosa si vede e cosa no

26 agosto 2026. Il committente: «da mobile tante cose non sono visibili».
Provini in `docs/provini/telefono/`, resi sulla build pubblicata a 390x844 con
densita' 2, agente utente di un Pixel 8.

## Quello che NON e' il difetto

**La tela riempie tutta la finestra**, a ogni tempo:

```
  tappa          tela        quota dell altezza   margine sopra/sotto
  hero          390 x 844          100%                 0 / 0
  orbita        390 x 844          100%                 0 / 0
  lato          390 x 844          100%                 0 / 0
  taglio        390 x 844          100%                 0 / 0
  accensione    390 x 844          100%                 0 / 0
  guida         390 x 844          100%                 0 / 0
  pattuglia     390 x 844          100%                 0 / 0
```

Quindi la scena non e' schiacciata in una fascia: il telaio e le zone scure che
si vedono nel provino sono DENTRO il disegno, non un errore di misura della
pagina.

**E l'abitacolo su telefono funziona.** `accensione.png`: strada leggibile,
quadrante nitido, testo del capitolo chiaro. Non e' «il telefono» in generale.

**E una cosa che sembrava rotta e non lo era.** Il primo provino del settimo
tempo mostrava «COSA TRASPORTA?» quasi invisibile. Era una TRANSIZIONE: la
finestra di quella parola e' 0,44-0,64 del tempo locale, e a q=0,90 il locale
vale 0,459, cioe' la parola sta appena entrando. A q=0,93 (`finale_093.png`) si
legge benissimo. Dichiarare rotto un fotogramma di passaggio e' lo stesso
errore che questo progetto rimprovera agli altri.

## Il difetto vero: la scheda delle credenziali e' illeggibile

`finale_099.png`. Nell'ultimo tempo il pannello mostra la scheda del lavoro —
«Profilo di una Salesforce architect», l'anno, il genere, i collegamenti. Su
desktop si legge. **Sul telefono no**: sono pochi pixel di altezza per lettera.

E' il contenuto piu' importante del sito, quello che dice chi sei e cosa hai
fatto, ed e' l'ultima cosa che un giurato vede.

### Perche', e il file lo dice quasi

`Quadro.ts:173` porta la misura che ha guidato tutta la taratura:

> «Proiettando i quattro angoli del piano `QUADRO_VIVO` dentro l'abitacolo a
> 1600x900, il quadro occupa 936 pixel di larghezza e 275 di altezza.»

La tela e' 1024 di larghezza, fissa. A 1600x900 il pannello ne occupa 936: il
testo esce quasi a grandezza naturale, e su quel rapporto sono stati scelti
tutti i corpi.

Sul telefono lo stesso pannello ne occupa circa 285. **Lo stesso testo esce tre
volte e mezzo piu' piccolo**, e il caso stretto non l'ha guardato nessuno: ogni
nota sulla leggibilita' dentro `Quadro.ts` e' stata scritta a 1600 di larghezza.

Non e' un difetto di taratura di un corpo: e' che la leggibilita' di questo
pannello e' legata alla LARGHEZZA DELLA FINESTRA, e nessuna misura lo diceva.

### Perche' non l'ho gia' corretto

Alzare i corpi non basta: le posizioni dentro la tela sono fisse e tarate una
per una, e un testo piu' grande in una griglia ferma si sovrappone al vicino —
`strumenti/nonsisovrappone.mjs` esiste proprio per quello.

La cura giusta e' un impaginato per lo schermo stretto: **meno campi, corpi piu'
grandi**. Quali campi tenere e quali togliere e' una decisione di contenuto, non
di misura, e la prende il committente.

## E due cose che spariscono per decisione, da confermare

- `stile.css:1888` toglie `.comandi__nome` («NERO LIQUIDO») sotto i 640
- `stile.css:1941` toglie l'ultima `.comandi__voce` («LUOGO»)

Sono scelte prese, non incidenti. Vanno confermate o disfatte sapendo che ci
sono, invece di riscoprirle.
