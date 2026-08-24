import { Material } from 'three'

/**
 * L'ANTIALIASING SPECULARE — contro le righe di luce piu' sottili di un pixel.
 *
 * IL DIFETTO, indicato dal committente su due ritagli del bordo del tetto: una
 * riga chiara e frastagliata lungo la cucitura fra lamiera e vetro.
 *
 * L'HO CERCATA IN QUATTRO POSTI SBAGLIATI, e vale la pena scriverli tutti e
 * quattro perche' ognuno sembrava quello giusto:
 *
 *   1. «e' aliasing di geometria» — ma il campionamento multiplo c'e' gia' da
 *      ieri, e la riga e' rimasta identica;
 *   2. «e' il bordo del vetro» — costruita la fascia ceramica sul perimetro
 *      (`scene/Guarnizione.ts`) e portata a trenta centimetri per prova: il
 *      vetro e' diventato tutto nero opaco e la riga era ancora li';
 *   3. «e' z-fighting» — provato lo scostamento di poligono a -2, 0 e +2:
 *      luminanza media della fascia 39,2 in tutti e tre i casi, cifra per
 *      cifra;
 *   4. «e' il vetro che sporge» — nascondendo i vetri la riga sparisce, ma
 *      nascondendo la carrozzeria il bordo del vetro e' pulito. Serve che ci
 *      siano tutti e due.
 *
 * E' la quarta prova a dire cos'e'. Dove due superfici lucide si incontrano
 * lungo uno spigolo vivo, in quella striscia la NORMALE gira di novanta gradi
 * nello spazio di un pixel. Il campionamento multiplo non serve a niente: non
 * e' il bordo del triangolo a essere frastagliato, e' la LUCE calcolata dentro
 * il triangolo. Ogni pixel prende una normale sola, quella del suo centro, e
 * sopra uno spigolo quella scelta e' un caso — un pixel becca il riflesso
 * speculare pieno, il suo vicino no. Da qui la riga di puntini.
 *
 * LA CURA E' NOTA E SI CHIAMA ANTIALIASING SPECULARE.
 *
 * Dove la normale varia in fretta rispetto al pixel, si alza la ruvidita': una
 * superficie piu' ruvida ha un riflesso piu' largo, quindi meno sensibile a
 * quale normale gli capiti. E' il rimedio classico (Toksvig, e le varianti piu'
 * recenti), e la sua versione economica sta in quattro righe: le derivate della
 * normale interpolata dicono quanto quella normale cambia da un pixel al
 * successivo, e quel numero diventa ruvidita' in piu'.
 *
 * Non e' un trucco: e' la stessa cosa che fa il filtraggio delle tessiture con
 * i livelli di dettaglio, applicata alla geometria invece che al colore.
 *
 * E vale per tutta l'automobile, non solo per quella cucitura: ogni spigolo
 * vivo di una carrozzeria lucida ha lo stesso difetto, e in un'inquadratura
 * ravvicinata sono quelli a dire «CG» prima di qualunque altra cosa.
 */

/** quanto pesa la variazione della normale */
const FORZA = 0.55
/** e il tetto, perche' su uno spigolo estremo la superficie non diventi opaca */
const TETTO = 0.28

const CODICE = [
  '  {',
  '    vec3 dnx = dFdx( normal );',
  '    vec3 dny = dFdy( normal );',
  '    float varia = max( dot( dnx, dnx ), dot( dny, dny ) );',
  // la radice quarta: la varianza cresce col quadrato della pendenza, e senza
  // smorzarla un solo spigolo vivo renderebbe opaca mezza fiancata
  '    float extra = min( ' + TETTO.toFixed(3) + ', ' + FORZA.toFixed(3) + ' * sqrt( sqrt( varia ) ) );',
  '    material.roughness = clamp( material.roughness + extra, 0.0, 1.0 );',
  '    #ifdef USE_CLEARCOAT',
  '    material.clearcoatRoughness = clamp( material.clearcoatRoughness + extra, 0.0, 1.0 );',
  '    #endif',
  '  }',
].join('\n')

export function antialiasSpeculare(m: Material, chiave: string) {
  const q = m as Material & { __nitidezza?: boolean }
  if (q.__nitidezza) return
  q.__nitidezza = true

  const prima = m.onBeforeCompile
  m.onBeforeCompile = (s, r) => {
    prima?.call(m, s, r)
    /* SI AGGANCIA A `lights_physical_fragment`, E LA PRIMA VOLTA HO SBAGLIATO
       PUNTO.
       Avevo scelto `roughnessmap_fragment`, che sembra il posto naturale: e'
       li' che nasce `roughnessFactor`. Solo che li' la normale geometrica NON
       ESISTE ancora — `normal_fragment_begin`, che la calcola, viene dopo.
       Lo shader non compilava, e il risultato non e' stato un errore leggibile:
       e' stata un'automobile INVISIBILE. Tre materiali su quattro spariti dalla
       scena, nessun messaggio, solo il piazzale vuoto.
       E' il modo peggiore in cui puo' fallire una modifica agli shader, ed e'
       anche il piu' comune: un innesto nel punto sbagliato non da' un errore di
       sintassi, da' un simbolo non dichiarato dentro un file che nessuno stampa.
       `lights_physical_fragment` viene dopo tutti e due — la normale c'e', e
       `material.roughness` e' appena stato riempito. E' il primo istante in cui
       si puo' correggere, e l'ultimo in cui serve ancora.

       E LA NORMALE SI CHIAMA `normal`, non `geometryNormal`. Anche il secondo
       tentativo non compilava: «'geometryNormal' : undeclared identifier», tre
       materiali su quattro spariti di nuovo. In questa versione di three quel
       nome vive solo dentro il pezzo che lo calcola; quello che resta in scena
       dopo e' `normal`, cioe' la normale di ombreggiatura — che poi e' anche
       quella giusta, perche' e' quella con cui la luce viene davvero calcolata,
       mappa delle normali compresa.

       E LA GUARDIA NON L'HA VISTO. `strumenti/guardia.mjs` guarda la console al
       caricamento; questi errori arrivano al primo disegno di quel materiale,
       che succede dopo. Due volte di fila ho avuto «tutto a posto» con
       l'automobile invisibile. Il metro va allungato. */
    if (!s.fragmentShader.includes('#include <lights_physical_fragment>')) return
    s.fragmentShader = s.fragmentShader.replace(
      '#include <lights_physical_fragment>',
      '#include <lights_physical_fragment>\n' + CODICE,
    )
  }
  /* LA CHIAVE E' OBBLIGATORIA. Due materiali con gli stessi parametri
     condividono il programma compilato: senza una chiave diversa, il primo che
     compila decide per tutti. Su questo progetto e' gia' costata una serata. */
  const vecchia = m.customProgramCacheKey
  m.customProgramCacheKey = () => (vecchia ? vecchia.call(m) : '') + '|nitido_' + chiave
  m.needsUpdate = true
}
