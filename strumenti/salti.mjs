/**
 * I SALTI — dove lo scorrimento in tempo reale scavalca dei pezzi di racconto.
 *
 * PERCHE' ESISTE, ed e' la lezione piu' importante di tutto il progetto.
 *
 * Tutti gli strumenti di misura di questo repo funzionano allo stesso modo:
 * portano la pagina a una posizione, ASPETTANO venti fotogrammi, misurano. E'
 * giusto per misurare uno stato — e nasconde per costruzione l'unica cosa che
 * chi guarda vede davvero, cioe' il MOVIMENTO.
 *
 * Il difetto trovato: nel filmato, fra il secondo 54,08 e il 54,16, il faro
 * diventa strada di colpo. Nessun fotogramma con la strada dentro il faro.
 * Eppure `strumenti/raccordo.mjs` diceva che la transizione era continua, e
 * diceva il vero: campionandola a passi, e' continua.
 *
 * La differenza e' che il registratore fa scorrere la pagina a TEMPO REALE:
 *
 *     const t = (performance.now() - t0) / durata
 *     window.scrollTo(0, corsa * t)
 *
 * Se un fotogramma dura un secondo, il successivo trova `t` molto piu' avanti e
 * la pagina SALTA. E un fotogramma dura un secondo esattamente li': il beat
 * `taglio` e' l'unico che compila sei programmi nuovi — il corridoio, l'iride,
 * il disco — e la compilazione di uno shader blocca il thread.
 *
 * Quindi non e' un difetto di regia: e' che chi arriva li' per la prima volta
 * paga la compilazione, e mentre paga la pagina gli scorre sotto. La cura non e'
 * cambiare i tempi: e' compilare prima.
 *
 * COSA MISURA. Fa scorrere la pagina come farebbe un dito — a tempo reale, non
 * a passi — e per ogni fotogramma registra quanto e' durato e di quanto e'
 * avanzato il racconto. Poi stampa i salti piu' grossi.
 *
 * IL CRITERIO: nessun fotogramma deve far avanzare il progresso di piu' di
 * quanto ne avanzerebbe a sessanta al secondo per tre fotogrammi (0,8% della
 * pagina su una corsa di 52 secondi). Sopra, e' un pezzo di racconto che chi
 * guarda non ha visto.
 *
 *     node strumenti/salti.mjs [secondi]
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const SECONDI = Number(process.argv[2] || 30)
const BASE = process.env.BASE_URL || 'http://localhost:5174/'

const b = await chromium.launch({
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'],
})
const p = await b.newPage({ viewport: { width: Number(process.env.LARGO || 1280), height: Number(process.env.ALTO || 800) } })
p.setDefaultTimeout(300000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto(BASE, { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto && esperienza.lastra?.pronta)
/* LA QUALITA' NON SI FISSA PIU', E LA RAGIONE E' UNA MISURA.
   Tutti gli strumenti di questo repo chiamano `fissaQualita('alto')`, e per una
   ragione buona: in headless Chromium disegna in software e il gestore scende
   da solo, quindi si finirebbe per misurare una scena degradata.
   Qui pero' e' sbagliato. Questo strumento misura CHI GUARDA, non la scena, e
   chi guarda ha il gestore acceso: e' proprio il suo mestiere accorgersi che i
   fotogrammi si allungano e togliere qualcosa. Fissando la qualita' misuravo
   il sito con la rete di sicurezza staccata.
   Con `PIENA=1` si torna al comportamento vecchio, per confrontare i due. */
if (process.env.PIENA) await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })
await p.waitForTimeout(1500)

const dati = await p.evaluate(async (secondi) => {
  const corsa = document.documentElement.scrollHeight - window.innerHeight
  const righe = []
  const t0 = performance.now()
  let prima = t0
  let dove = 0
  let ultimo = { p: 0, t: 0, g: 0 }
  await new Promise((fine) => {
    const passo = () => {
      const ora = performance.now()
      const t = (ora - t0) / (secondi * 1000)
      if (t >= 1) return fine()
      window.scrollTo(0, corsa * t)
      /* E SI REGISTRA COSA E' NATO IN QUEL FOTOGRAMMA.
         Sapere DOVE salta non basta a curarlo: un fotogramma da due secondi
         puo' essere una compilazione di shader, un caricamento di tessitura o
         una geometria nuova, e sono tre cure diverse. `renderer.info` tiene i
         totali di programmi, tessiture e geometrie: la differenza fra un
         fotogramma e il precedente dice chi e' arrivato. */
      const info = window.esperienza?.renderer?.info
      const conta = {
        p: info?.programs?.length ?? 0,
        t: info?.memory?.textures ?? 0,
        g: info?.memory?.geometries ?? 0,
      }
      // e quanto ha DISEGNATO: se un fotogramma da due secondi non crea niente
      // di nuovo, la risposta e' qui — o disegna molto di piu', o non disegna
      // di piu' e allora il tempo se ne va fuori dal render
      const dis = { c: info?.render?.calls ?? 0, tri: info?.render?.triangles ?? 0 }
      // e quanta memoria tiene il mucchio: una pausa lunga senza disegno e
      // senza risorse nuove ha un solo altro sospetto, ed e' la raccolta
      const mucchio = Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576)
      righe.push({
        t: +t.toFixed(4),
        // quanto e' durato il fotogramma precedente
        ms: +(ora - prima).toFixed(1),
        // e di quanto e' avanzata la pagina in quel salto
        avanzo: +((t - dove) * 100).toFixed(3),
        beat: window.esperienza?.regia?.beat ?? '',
        nato: {
          p: conta.p - ultimo.p,
          t: conta.t - ultimo.t,
          g: conta.g - ultimo.g,
        },
        dis,
        mucchio,
      })
      ultimo = conta
      prima = ora
      dove = t
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
  })
  return righe
}, SECONDI)
await b.close()

// --- il giudizio -------------------------------------------------------------
/** quanto avanza la pagina in tre fotogrammi a sessanta al secondo */
const SOGLIA = (3 / 60 / SECONDI) * 100

const brutti = dati
  .filter((r) => r.avanzo > SOGLIA)
  .sort((a, b) => b.avanzo - a.avanzo)

const chiamate = dati.map((r) => r.dis.c).sort((a, b) => a - b)
const triang = dati.map((r) => r.dis.tri).sort((a, b) => a - b)
const mediana = (v) => v[Math.floor(v.length / 2)] ?? 0
console.log('fotogrammi:', dati.length, ' attesi a 60 Hz:', Math.round(SECONDI * 60))
console.log('nel fotogramma tipico:', mediana(chiamate), 'chiamate,',
  Math.round(mediana(triang) / 1000) + 'k triangoli')
console.log('soglia del salto:', SOGLIA.toFixed(3) + '% di pagina (tre fotogrammi a 60 Hz)')
console.log('')
if (!brutti.length) {
  console.log('nessun salto: il racconto scorre senza scavalcare niente')
  process.exit(0)
}
console.log('  a che punto   durata   ha scavalcato   dove')
for (const r of brutti.slice(0, 14)) {
  console.log(
    ('   ' + (r.t * 100).toFixed(1) + '%').padStart(14),
    (r.ms.toFixed(0) + ' ms').padStart(9),
    (r.avanzo.toFixed(2) + '% di pagina').padStart(16),
    '  ' + r.beat.padEnd(11),
    [
      r.nato.p ? '+' + r.nato.p + ' programmi' : '',
      r.nato.t ? '+' + r.nato.t + ' tessiture' : '',
      r.nato.g ? '+' + r.nato.g + ' geometrie' : '',
    ].filter(Boolean).join(', ') || "niente di nuovo",
    ' ' + r.dis.c + ' chiamate, ' + Math.round(r.dis.tri / 1000) + 'k tri, mucchio ' + r.mucchio + ' MB',
  )
}
console.log('')
console.log(brutti.length + ' salti sopra la soglia, il peggiore scavalca il ' +
  brutti[0].avanzo.toFixed(2) + '% della pagina in un fotogramma solo')
process.exit(1)
