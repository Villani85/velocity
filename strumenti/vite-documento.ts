import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/**
 * IL DOCUMENTO STATICO SI GENERA, NON SI RICOPIA.
 *
 * `index.html` contiene un `<main class="documento">`: e' il sito per chi non
 * ha WebGL, per Google, per un lettore di schermo e per la scheda di
 * candidatura di un premio. Dentro c'era scritto «Un lavoro solo, e ci sei
 * dentro», con le voci 02, 03 e 04 «in lavorazione».
 *
 * Nel frattempo `Lavori.ts` e' arrivato a undici lavori con le copertine vere.
 * Le due copie sono divergute, ed e' successo esattamente quello che il
 * commento nel file stesso prevedeva: «due copie divergono al primo ritocco e
 * nessuno se ne accorge». Sul canale che non richiede WebGL il sito dichiarava
 * di essere un portfolio con un progetto solo — la cosa peggiore che potesse
 * dire di se'.
 *
 * La cura non e' aggiornare la lista: e' TOGLIERE LA SECONDA COPIA. Qui si
 * legge `Lavori.ts` e si scrive la lista al momento della compilazione, cosi'
 * la divergenza diventa impossibile invece che improbabile.
 *
 * E SE NON TROVA NIENTE, FALLISCE. Un generatore che in silenzio produce una
 * lista vuota e' peggio della lista scritta a mano: quella almeno si vede.
 */
type Voce = { codice: string; nome: string; anno: string; soggetto: string }

function leggiLavori(radice: string): Voce[] {
  const src = readFileSync(resolve(radice, 'src/ui/Lavori.ts'), 'utf8')
  const corpo = src.slice(src.indexOf('export const LAVORI'))
  const voci: Voce[] = []
  const re = /codice:\s*'([^']+)',\s*nome:\s*'([^']+)',\s*anno:\s*'([^']*)'[\s\S]*?soggetto:\s*'([^']*)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(corpo))) voci.push({ codice: m[1], nome: m[2], anno: m[3], soggetto: m[4] })
  if (!voci.length) {
    throw new Error(
      '[documento] non ho trovato nessun lavoro in src/ui/Lavori.ts. ' +
      'Se la forma del file e cambiata va aggiornata la lettura qui: ' +
      'una lista vuota generata in silenzio e peggio di una scritta a mano.',
    )
  }
  return voci
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function documento(): Plugin {
  return {
    name: 'velocity-documento',
    transformIndexHtml: {
      /* A VALLE, NON A MONTE. Con `order: 'pre'` Vite riprocessa quello che
         inserisco — compreso lo `<script type="application/ld+json">`, che
         prova a risolvere come modulo: la compilazione moriva con «EISDIR:
         illegal operation on a directory». A valle il documento e' gia'
         stato lavorato e le mie aggiunte restano quelle che sono. */
      order: 'post',
      handler(html, ctx) {
        const radice = process.cwd()
        const voci = leggiLavori(radice)

        /* L'INDIRIZZO DEL SITO ARRIVA DALL'AMBIENTE, e se manca lo si dice.
           `og:image` funziona solo con un URL ASSOLUTO: un percorso relativo
           lo ignorano quasi tutti gli scraper. Non lo invento — un dominio
           sbagliato manda l'anteprima nel vuoto, che e' peggio di non averla.
           Si mette in `.env` come VITE_SITO=https://... */
        const sito = (process.env.VITE_SITO || '').replace(/\/$/, '')
        if (!sito && ctx.server === undefined) {
          console.warn(
            '\n[documento] VITE_SITO non e impostata: og:image restera RELATIVO\n' +
            '            e le anteprime su X, LinkedIn e Slack non funzioneranno.\n' +
            '            Gli hreflang it/en/x-default non verranno emessi affatto:\n' +
            '            vogliono un URL assoluto e non se ne inventa uno.\n' +
            '            Mettila in .env: VITE_SITO=https://iltuodominio\n',
          )
        }
        const abs = (p: string) => (sito ? sito + p : p)

        const meta = [
          `<link rel="canonical" href="${abs('/')}" />`,
          /* LE DUE LINGUE DETTE A UN MOTORE DI RICERCA, e finora non erano
             dette a nessuno. C'era solo `og:locale:alternate`, che e' un
             segnale SOCIALE: lo legge lo scraper che costruisce l'anteprima
             di un link, non chi indicizza. Per la ricerca la pagina risultava
             monolingue, cioe' meta' del testo esisteva senza che nessuno
             sapesse in che lingua fosse.

             I TRE INDIRIZZI SONO LO STESSO, ed e' vero. La lingua si cambia a
             runtime e allo stesso URL — `src/ui/Lingua.ts`: la scelta finisce
             in `localStorage` e la pagina si ricarica dov'era. L'alternativa
             era annunciare un `/en/` che non esiste: un hreflang che punta a
             un 404 e' peggio del silenzio, perche' il silenzio almeno non
             chiede di andare da nessuna parte. Quindi qui si dichiara la cosa
             che c'e' davvero — un indirizzo che serve tutte e due — e
             `x-default` dice qual e' quello a cui mandare chi non chiede ne'
             l'una ne' l'altra, che e' esattamente la regola gia' scritta in
             `Lingua.ts` (da una terza lingua si legge l'italiano).

             Non e' il sostituto di due URL veri: il giorno in cui le due
             lingue avranno due indirizzi, di queste tre righe cambia l'`href`
             e nient'altro — ed e' il motivo per cui stanno qui, generate,
             invece che scritte a mano in `index.html`.

             E SE IL DOMINIO NON C'E', NON ESCONO PROPRIO. `hreflang` vuole un
             URL assoluto: un percorso relativo non e' un'annotazione debole,
             e' un'annotazione che non vale niente. Stessa scelta di
             `og:image` qui sopra — non si inventa un dominio. */
          ...(sito
            ? [
                `<link rel="alternate" hreflang="it" href="${abs('/')}" />`,
                `<link rel="alternate" hreflang="en" href="${abs('/')}" />`,
                `<link rel="alternate" hreflang="x-default" href="${abs('/')}" />`,
              ]
            : []),
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="Giuseppe Villani" />`,
          `<meta property="og:title" content="Giuseppe Villani — Freelance Creative Developer" />`,
          `<meta property="og:description" content="Siti che non si guardano. Si attraversano." />`,
          /* IL JPEG E NON IL WEBP, e il rapporto e' 1200x630 reso apposta.
             Il WebP nelle anteprime sociali e' supportato in modo disomogeneo:
             dove non lo e', la piattaforma torna al rettangolo grigio e non lo
             dice. Il JPEG non ha eccezioni da nessuna parte, e su un'immagine
             che deve funzionare su piattaforme che non controlliamo la
             compatibilita' vale piu' dei chilobyte.
             E il rapporto e' RESO, non ritagliato: `hero_orizzontale` e' 1,60,
             le anteprime vogliono ~1,91, e ritagliare avrebbe tolto il 16%
             dell'altezza proprio dove sta l'automobile. Vedi
             `strumenti/poster.mjs`. */
          `<meta property="og:image" content="${abs('/poster/hero_social.jpeg')}" />`,
          `<meta property="og:image:type" content="image/jpeg" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="La hero di VELOCITY: una hypercar nera su un podio di marmo, dentro una corte al crepuscolo." />`,
          `<meta property="og:url" content="${abs('/')}" />`,
          `<meta property="og:locale:alternate" content="en_US" />`,
          `<meta property="og:locale" content="it_IT" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="Giuseppe Villani — Freelance Creative Developer" />`,
          `<meta name="twitter:description" content="Siti che non si guardano. Si attraversano." />`,
          `<meta name="twitter:image" content="${abs('/poster/hero_social.jpeg')}" />`,
          `<script type="application/ld+json">${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Giuseppe Villani',
            jobTitle: 'Freelance Creative Developer',
            description: 'Non progetto pagine: progetto macchine in cui si entra.',
            url: sito || undefined,
            image: abs('/poster/hero_social.jpeg'),
            email: 'servizi.villani@gmail.com',
            knowsAbout: ['WebGL', 'three.js', 'GSAP', 'Motion design', 'Creative development', 'Salesforce'],
            makesOffer: voci.map((v) => ({
              '@type': 'CreativeWork', name: v.nome, description: v.soggetto,
              ...(v.anno ? { dateCreated: v.anno } : {}),
            })),
          })}</script>`,
        ].join('\n')

        const lista = voci.map((v, i) =>
          `      <li${i === 0 ? ' class="e-acceso"' : ''}>` +
          `<span class="statica__codice">${esc(v.codice)}</span>` +
          `<span class="statica__nome">${esc(v.nome)}</span>` +
          `<span class="statica__stato">${esc([v.anno, v.soggetto].filter(Boolean).join(' — '))}</span>` +
          `</li>`,
        ).join('\n')

        return html
          .replace('</head>', meta + '\n</head>')
          .replace(
            /<ol class="statica__ottiche">[\s\S]*?<\/ol>/,
            `<ol class="statica__ottiche">\n${lista}\n    </ol>`,
          )

          .replace(
            /<p data-t="docLavoriCoda">[\s\S]*?<\/p>/,
            `<p>Ognuno e una macchina diversa: la meccanica cambia con quello che deve raccontare.</p>`,
          )
      },
    },
  }
}
