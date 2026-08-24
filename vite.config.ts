import { documento } from './strumenti/vite-documento.ts'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

/**
 * VITE NON DEVE GUARDARE LE CARTELLE DI LAVORAZIONE.
 *
 * TRE DIFETTI, LA STESSA CAUSA, E IL TERZO NON SI VEDEVA AFFATTO.
 *
 * 1. `asset/` — Tripo ci scrive dentro mentre scarica un modello, e il
 *    controllore apriva i file a meta' scrittura: il server moriva con EBUSY.
 *
 * 2. `.tmp/` e `docs/` — ci finiscono modelli intermedi, provini e registri.
 *    Ogni riga scritta li' dentro faceva ricaricare la pagina; e siccome gli
 *    strumenti scrivono MENTRE misurano, il sito si ricaricava sotto la
 *    misura in corso. Il sintomo non somigliava per niente alla causa: gli
 *    screenshot andavano in timeout e la scena sembrava diventata lentissima.
 *
 * 3. E LA CORREZIONE AL PUNTO 2 NON FUNZIONAVA. Era scritta con motivi glob
 *    (`'**' + '/docs/**'`), che e' la forma documentata da anni. Vite 8 monta
 *    chokidar 4, che i glob NON li accetta piu': li interpreta come nomi di
 *    file veri, quindi il motivo non corrisponde a niente e la cartella resta
 *    sorvegliata.
 *
 *    Nessun errore, nessun avviso, e la configurazione a leggerla sembra
 *    giusta. Se ne sono accorti gli strumenti di misura, notando che il
 *    PRIMO provino scritto faceva navigare la pagina — cioe' misurando il
 *    difetto, non leggendo il file.
 *
 * Quindi qui non ci sono piu' motivi: c'e' una FUNZIONE, che chokidar accetta
 * e che non puo' essere fraintesa. Il criterio e' letterale, e si legge.
 */
/**
 * I PERCORSI SI NORMALIZZANO PRIMA DI CONFRONTARLI.
 *
 * Su Windows `resolve()` restituisce barre ROVESCIATE mentre chokidar passa
 * percorsi con barre normali. Confrontarli con `startsWith` non fallisce: da'
 * sempre falso, quindi la funzione dichiara di ignorare quelle cartelle e non
 * ne ignora nessuna. E' lo stesso difetto del motivo glob di prima, con un
 * travestimento diverso — una configurazione che a leggerla sembra giusta.
 *
 * Il sintomo lo ha visto un altro strumento prima di me: «il primo strumento
 * lanciato dopo aver scritto un file ricade sempre in Execution context was
 * destroyed, e basta rilanciarlo». E' esattamente il ricaricamento che questa
 * riga doveva impedire.
 */
// si divide e si ricompone invece di usare un'espressione regolare: una barra
// rovesciata dentro una regex e' il carattere che si perde piu' facilmente
// passando da uno strumento all'altro, e qui perderlo significa un criterio
// che non corrisponde mai — cioe' di nuovo una configurazione che dichiara di
// proteggere e non protegge.
const normalizza = (p: string) => p.split('\\').join('/').toLowerCase()
const FUORI = ['asset', 'tripo-out', '.tmp', 'docs', 'strumenti']
  .map((d) => normalizza(resolve(__dirname, d)))

export default defineConfig({
  plugins: [documento()],
  /**
   * LE DIPENDENZE SI DICHIARANO, non si fanno scoprire a caldo.
   *
   * Quando Vite incontra un import profondo che non aveva ancora ottimizzato
   * (`three/examples/jsm/...`), lo pre-impacchetta e manda alla pagina un
   * «optimized dependencies changed. reloading»: la pagina RIPARTE a meta'
   * caricamento e la richiesta del modello muore con `Failed to fetch`. Non e'
   * rete: e' il contesto che viene buttato giu' sotto i piedi.
   *
   * Elencarli qui li fa ottimizzare all'avvio, una volta, e il ricaricamento
   * non ha piu' ragione di esistere. `warmup` li trasforma gia' a server
   * acceso, cosi' il primo strumento che misura non paga l'attesa.
   */
  optimizeDeps: {
    entries: ['index.html', 'collaudo.html'],
    include: [
      'three',
      'three/examples/jsm/loaders/GLTFLoader.js',
      'three/examples/jsm/libs/meshopt_decoder.module.js',
      'three/examples/jsm/controls/OrbitControls.js',
      'three/examples/jsm/lights/RectAreaLightUniformsLib.js',
      'three/examples/jsm/postprocessing/EffectComposer.js',
      'three/examples/jsm/postprocessing/RenderPass.js',
      'three/examples/jsm/postprocessing/ShaderPass.js',
      'three/examples/jsm/postprocessing/OutputPass.js',
      'three/examples/jsm/postprocessing/UnrealBloomPass.js',
      'three/examples/jsm/postprocessing/GTAOPass.js',
      'three/examples/jsm/postprocessing/SMAAPass.js',
    ],
  },
  server: {
    port: 5174,
    warmup: { clientFiles: ['./src/main.ts', './src/collaudo.ts'] },
    watch: {
      ignored: (percorso: string) => {
        const p = normalizza(percorso)
        return FUORI.some((d) => p.startsWith(d))
      },
    },
  },
})
