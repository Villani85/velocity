/**
 * L'AVVIO — tutto cio' che esiste solo se l'esperienza parte.
 *
 * PERCHE' E' UN FILE A PARTE, e non e' una questione di ordine.
 *
 * Finche' questa roba stava in `main.ts`, ogni suo import era un import del
 * punto d'ingresso: three.js, il caricatore GLTF, la catena degli effetti,
 * ogni modulo della scena, e — attraverso `ui/Comandi` — anche i materiali.
 * Il browser li scaricava tutti PRIMA che qualcuno avesse deciso se
 * servivano.
 *
 * Misurato con `strumenti/ripiego.mjs`, in sviluppo: la pagina statica
 * scaricava 12,6 MB per poi non costruire niente. Rendendo dinamico il solo
 * `Esperienza` si scendeva a 8,0 — il resto entrava lo stesso, da un
 * `Vector3` importato per la spina e da un `import * as THREE` messo li' per
 * gli strumenti di diagnosi. Un solo import statico di three basta a tirare
 * dentro three.
 *
 * Quindi il confine non passa fra «scena» e «interfaccia»: passa fra CIO' CHE
 * SERVE PER DECIDERE e cio' che serve dopo aver deciso. Di qua c'e' tutto il
 * secondo gruppo, e `main.ts` lo chiede con un `import()` quando ha deciso.
 */
import { Esperienza } from './core/Esperienza'
import { Voci } from './ui/Voci'
import { Rotaia } from './ui/Rotaia'
import { Spina } from './ui/Spina'
import { Comandi } from './ui/Comandi'
import { montaAncore } from './ui/Ancore'
import { Controllo } from './ui/Controllo'
import { Vector3 } from 'three'
import { applicaLuogo, giraPanorama } from './scene/Panorama'
import { POSE } from './transizioni/Camera'
import { SCALA } from './core/Qualita'
import * as THREE from 'three'

/** costruisce la scena, la avvia, e le mette intorno l'interfaccia */
export function avvia(tela: HTMLCanvasElement): Esperienza {
  const esp = new Esperienza(tela)
  requestAnimationFrame(esp.fotogramma)
  avviaInterfaccia(esp)
  seguiLAttesa(esp)
  return esp
}

/**
 * L'ATTESA SI CHIUDE SUI TRAGUARDI VERI, non su un orologio.
 *
 * I tre passi sono gli stessi che `strumenti/apertura.mjs` misura da mesi —
 * il luogo, il soggetto, il resto — ed e' l'unica ragione per cui questa riga
 * puo' dire QUANTO MANCA invece di limitarsi a pulsare. Una barra che pulsa
 * dice «sto lavorando»; una che avanza dice a che punto e'.
 *
 * E si chiude sul LUOGO, non sull'automobile. Il panorama arriva a un quinto
 * del tempo che ci mette il modello, e con il luogo in scena il fotogramma e'
 * gia' quello giusto: una piattaforma vuota dentro una villa vera si legge
 * come un'attesa voluta, e l'automobile che compare dopo si legge come
 * qualcosa che ARRIVA. Tenere il sipario chiuso fino al modello vorrebbe dire
 * nascondere il momento migliore per mostrare un rettangolo nero.
 *
 * IL TETTO E' LO STESSO DI `core/Ordine.ts`, e per la stessa ragione: se il
 * luogo non arriva — un file mancante, una rete che cade — il sipario si apre
 * lo stesso. Meglio una scena a meta' che una pagina che non comincia mai.
 */
function seguiLAttesa(esp: Esperienza) {
  const velo = document.getElementById('attesa')
  const filo = document.getElementById('attesaFilo')
  const parola = document.getElementById('attesaParola')
  /**
   * `e-svelato` NON E' UNA RIFINITURA: E' LA CONDIZIONE PERCHE' IL SITO SI VEDA.
   *
   * Con lo scaglionamento d'ingresso l'interfaccia della prima schermata parte
   * INVISIBILE e si accende quando arriva quella classe. Quindi ogni strada che
   * esce da questa funzione senza aggiungerla e' una strada che lascia il
   * visitatore davanti alla scena in tre dimensioni con SOPRA il nulla —
   * senza errori in console e senza niente che lo faccia sospettare.
   *
   * Ce n'erano due: il velo assente dal documento, e il velo presente ma la
   * funzione che non arriva mai a chiuderlo. La prima si copre uscendo
   * SVELATI; la seconda con una scadenza che sveli comunque.
   */
  const svela = () => document.documentElement.classList.add('e-svelato')
  if (!velo) { svela(); return }
  // la rete di sicurezza: qualunque cosa succeda, dopo sei secondi si vede
  const rete = setTimeout(svela, 6000)
  const passi: Array<[string, () => boolean, number]> = [
    ['IL LUOGO', () => !!esp.ambientePronto, 62],
    ['L’AUTOMOBILE', () => !!esp.autoPronta, 100],
  ]
  let quale = 0
  const scaduto = performance.now() + 20000
  const chiudi = () => {
    /* E DA QUI COMINCIA LA COREOGRAFIA D'INGRESSO — vedi `.e-svelato` in
       `src/stile.css`.
       Due revisioni esterne indipendenti hanno messo per primo lo stesso
       difetto, e nessuna delle due parlava di linguaggio visivo: parlavano di
       DENSITA'. «Piu' scrolli, piu' bello diventa il sito» — cioe' il
       fotogramma migliore e' quello in cui le cose in campo sono meno. Alla
       schermata zero ce n'erano tredici insieme.
       La cura non e' un ridisegno: e' una coreografia. Le stesse cose, nello
       stesso posto, ma non tutte nello stesso istante — cosi' l'automobile ha
       il suo mezzo secondo da sola, che e' il momento in cui chi arriva decide
       se restare. */
    clearTimeout(rete)
    svela()
    velo.classList.add('e-finita')
    // e si toglie dall'albero: un velo a opacita' zero resta un rettangolo che
    // intercetta i clic, ed e' il difetto classico di questo genere di cose
    setTimeout(() => velo.remove(), 900)
  }
  const passo = () => {
    while (quale < passi.length && passi[quale][1]()) {
      if (filo) filo.style.width = passi[quale][2] + '%'
      quale++
      if (parola && quale < passi.length) parola.textContent = passi[quale][0]
    }
    if (quale > 0 || performance.now() > scaduto) return chiudi()
    requestAnimationFrame(passo)
  }
  // il filo parte gia' a un decimo, ed e' scritto nel foglio di stile perche'
  // deve valere anche prima che questo codice esista — vedi `.attesa__filo`
  requestAnimationFrame(passo)
}

/**
 * LO STRATO DI INTERFACCIA VIVE SOLO SE VIVE LA SCENA.
 *
 * Con l'esperienza spenta sarebbe rimasto acceso: la rotaia avrebbe segnato un
 * viaggio che nessuno sta facendo, la spina avrebbe indicato un faro che non
 * c'e', i comandi avrebbero cambiato la vernice di un'automobile invisibile.
 * E' esattamente il «sito mezzo vivo» per cui `core/Ripiego.ts` esiste — e
 * sarebbe stato peggio di una pagina statica, perche' una pagina statica e'
 * uno stato e mezzo sito no.
 */
function avviaInterfaccia(esp: Esperienza) {
  // IL PANNELLO E' UNO STRUMENTO DI MISURA, non un vezzo. Serve a leggere
  // beat e progresso mentre si guarda: senza, tarare un confine significa
  // indovinare.
  //
  // NASCOSTO DI PARTENZA. Aprendo il sito me lo sono ritrovato in alto a
  // destra, sopra la voce CONTATTO: uno strumento da cantiere lasciato in
  // mezzo alla stanza. Si accende con H quando serve.
  /**
   * LO STRATO DI INTERFACCIA VIVE SOLO SE VIVE LA SCENA.
   *
   * Prima stava tutto al primo livello del modulo, e con l'esperienza spenta
   * sarebbe rimasto acceso: la rotaia avrebbe segnato un viaggio che nessuno sta
   * facendo, la spina avrebbe indicato un faro che non c'e', i comandi avrebbero
   * cambiato la vernice di un'automobile invisibile. E' esattamente il «sito
   * mezzo vivo» per cui `core/Ripiego.ts` esiste — e sarebbe stato peggio di una
   * pagina statica, perche' una pagina statica e' uno stato e mezzo sito no.
   *
   * Sta dentro una funzione e non dentro un `if` per una ragione di tipi che e'
   * anche una ragione di sostanza: prendendo l'esperienza come argomento, da qui
   * in giu' non esiste il caso in cui non c'e'.
   */
  function avviaInterfaccia(esp: Esperienza) {
    const voci = new Voci()
    const hud = document.getElementById('hud')!
    hud.classList.add('is-nascosto')

    // le voci si aggiornano nel ciclo della scena, non con un timer: sono una
    // funzione dello scorrimento come la camera
    // LO STRATO INFORMATIVO: due elementi, e ognuno fa una cosa che nessun altro
    // fa. La rotaia dice DOVE si e' nel viaggio; la scheda dice COSA si sta
    // guardando, con numeri misurati. Vedi `ui/Rotaia.ts` e `ui/Scheda.ts`.
    const rotaia = new Rotaia()
    const spina = new Spina()
    // I COMANDI: l'unica cosa del sito che un filmato non potrebbe fare. Vedi
    // `ui/Comandi.ts` per il perche' sono due e non dieci.
    const comandi = new Comandi((g, i) => applicaLuogo(esp.renderer, esp.scena, i, g))
    /* E I COLLEGAMENTI DELLA TESTATA PORTANO DOVE DICONO.
       Erano quattro ancore verso il documento semantico, che e' nascosto: per
       una sintesi vocale funzionavano, per chi guarda non facevano niente. Vedi
       `ui/Ancore.ts`. */
    montaAncore()

    /* QUANTO E' ALTA LA TESTATA, misurato invece che scritto a mano.
     *
     * Sul telefono i comandi stanno SOTTO la testata — e' l'unica fascia libera
     * della colonna, e lo dice il foglio di stile nel punto dove li mette. La
     * loro quota pero' era un numero: prima 54, poi 72, e tutte e due le volte
     * misurando la testata a occhio in un provino.
     *
     * E tutte e due le volte si e' rotto. La testata e' cresciuta di una riga
     * quando l'interruttore della lingua e' andato a capo sotto i 400 pixel, e
     * di un'altra quando ogni voce del menu ha preso i quarantaquattro pixel
     * che serve un dito: adesso e' alta novantadue, e con 72 i comandi ci
     * finivano dentro — nel provino coprivano il menu per duecentosessantacinque
     * pixel per ventidue.
     *
     * Un numero scritto a mano che descrive un altro elemento e' una bomba a
     * orologeria: non sbaglia il giorno in cui lo scrivi, sbaglia il giorno in
     * cui qualcun altro tocca l'elemento che descrive. Qui la testata dichiara
     * la propria altezza e i comandi la leggono. Costa un `ResizeObserver` su
     * un elemento solo, e chiude la categoria invece del caso. */
    const testa = document.querySelector<HTMLElement>('.testa')
    if (testa) {
      const dichiara = () => {
        document.documentElement.style.setProperty(
          '--testaAltezza', Math.round(testa.getBoundingClientRect().height) + 'px',
        )
      }
      dichiara()
      new ResizeObserver(dichiara).observe(testa)
    }
  /* IL CONTROLLO: la volante, i documenti, l'esito, l'invito. Vedi
     `ui/Controllo.ts` — e in particolare il perche' la parola in mezzo allo
     schermo qui funziona mentre quella di prima era «la piu' brutta». */
  const controllo = new Controllo()
  controllo.scrivi()
  esp.controllo = controllo

    // il passo di questo ciclo, che non e' quello della scena: qui dentro c'e'
    // solo lo strato di interfaccia, e gli serve per far comparire i comandi a
    // tempo invece che allo scorrimento (vedi `ui/Comandi.ts`)
    let ultimo = performance.now()
    const ciclo = () => {
      const ora = performance.now()
      // tetto a un decimo di secondo: tornando su questa scheda dopo un minuto
      // altrove il passo varrebbe sessanta, e ogni cosa legata al tempo salterebbe
      // in avanti tutta insieme
      const dt = Math.min((ora - ultimo) / 1000, 0.1)
      ultimo = ora
      voci.aggiorna(esp.regia)
      rotaia.aggiorna(esp.regia)
      comandi.aggiorna(esp.regia, dt)
      // L'ANCORA E' LA BOCCA DEL FARO, cioe' il punto da cui piu' avanti si entra:
      // la scheda parla di quello, quindi gli sta accanto. Finche' l'ottica non e'
      // stata innestata non c'e' niente di cui parlare e la scheda resta spenta.
      const a = esp.attraversamento?.pronto ? esp.attraversamento.bocca : null
      // il tempo per fotogramma e' quello che il gestore di qualita' misura gia'
      // per decidere se degradare: e' un dato vero, non una stima
      spina.aggiorna(esp.regia, esp.camera, a, esp.qualita.tempoMedio, esp.autoVera)
      requestAnimationFrame(ciclo)
    }
    requestAnimationFrame(ciclo)

    // il pannello sparisce con il tasto H: serve a me, non a chi guarda
    addEventListener('keydown', (e) => {
      if (e.key === 'h' || e.key === 'H') hud.classList.toggle('is-nascosto')
    })
    setInterval(() => {
      const r = esp.regia
      hud.textContent =
        `${r.beat.toUpperCase().padEnd(11)}${(r.locale * 100).toFixed(0).padStart(3)}%\n` +
        `globale     ${(r.globale * 100).toFixed(1).padStart(5)}%\n` +
        `velocita    ${esp.scorrimento.velocita.toFixed(3)}`
    }, 80)

    // si espone per gli strumenti di misura, come nel progetto precedente
    ;(window as any).esperienza = esp
    // le pose si espongono perche' `strumenti/scandaglio.mjs` possa provarle
    // una per una. Tarare a mano un punto in tre dimensioni significa fare
    // venti prove a occhio e tenerne a mente i risultati: e' il tipo di cosa
    // che una macchina fa meglio e senza affezionarsi.
    ;(window as any).POSE = POSE
    // la manopola del panorama: quale fetta della fotografia sta dietro l'auto.
    // Si espone perche' e' una scelta di composizione, e una scelta di
    // composizione si fa GUARDANDO — `strumenti/orienta.mjs` gira la manopola e
    // rende un fotogramma per ogni posizione, poi si sceglie da quelli.
    ;(window as any).giraPanorama = (g: number) => giraPanorama(esp.scena, g)

    /**
     * FISSARE IL LIVELLO DI QUALITA' DAGLI STRUMENTI, e perche' e' diventato
     * indispensabile.
     *
     * I provini si rendono con Chromium headless, che su questa macchina non usa
     * la scheda video: usa SwiftShader, cioe' disegna in software con la CPU. Il
     * gestore di qualita' fa il suo mestiere, misura fotogrammi lentissimi e
     * scende di livello — e ai livelli bassi il riflesso planare si spegne.
     *
     * Il risultato e' che per settimane ho guardato provini in cui la piattaforma
     * era un disco grigio piatto e ho creduto che fosse un difetto del materiale.
     * Ho cambiato ruvidita', colore, intensita' d'ambiente, ho scritto uno
     * specchio dentro il materiale della pietra. Il difetto non c'era: c'era uno
     * STRUMENTO CHE MISURAVA UNA SCENA DIVERSA da quella che vede chi apre il
     * sito con una scheda video vera.
     *
     * E' il tipo di errore peggiore, perche' non da' nessun segnale: l'immagine
     * arriva, e' plausibile, ed e' sbagliata. Da qui in poi ogni strumento che
     * guarda la scena fissa il livello, e chi legge il provino sa a che livello
     * sta guardando.
     */
    ;(window as any).fissaQualita = (nome: string) => {
      const l = SCALA.find((x) => x === nome)
      if (!l) return SCALA.join(', ')
      esp.qualita.forza(l)
      return l
    }
    // Vector3 serve agli strumenti che proiettano i vertici sullo schermo per
    // misurare quanto soggetto resta in campo
    ;(window as any).__V3 = Vector3
  }

  if (esp) avviaInterfaccia(esp)
}

// TUTTO THREE, per gli strumenti di diagnosi: `strumenti/chiedi.mjs` lancia
// un raggio e chiede alla scena cosa c'e' sotto un pixel invece di dedurlo.
// E' la lezione della skill: si smette di spegnere pezzi a caso.
;(window as any).__THREE = THREE
