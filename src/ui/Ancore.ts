/**
 * LE ANCORE — i collegamenti della testata portano dove dicono.
 *
 * IL DIFETTO, ed e' grosso.
 *
 * `LAVORI`, `STUDIO`, `CONTATTO` nella testata e `SEE THE WORK` sotto il titolo
 * sono `<a href="#lavori">` veri, e puntano a sezioni che esistono davvero: le
 * tre `<section>` del documento semantico in fondo a `index.html`.
 *
 * Solo che quel documento e' NASCOSTO. Sta in `.documento`, che il foglio di
 * stile riduce a un pixel per un pixel con `clip-path: inset(50%)` — la tecnica
 * classica per dare a un lettore di schermo un contenuto che l'occhio non deve
 * vedere. Per una sintesi vocale quei collegamenti funzionano benissimo. Per
 * chi guarda, invece, **non fanno niente**: il browser sposta il fuoco su un
 * elemento invisibile e la pagina resta dov'era.
 *
 * Quattro collegamenti morti, di cui uno e' la chiamata all'azione della prima
 * schermata. Ed e' un difetto invisibile a chiunque non ci clicchi sopra: nei
 * provini non si vede, nei filmati non si vede, e nemmeno un controllo di
 * accessibilita' lo segnala — perche' dal suo punto di vista e' corretto.
 *
 * LA CURA NON E' MOSTRARE IL DOCUMENTO.
 *
 * Quel documento e' l'equivalente testuale del sito, e il suo posto e' dove
 * sta. La cura e' che qui i posti esistono davvero, ma non sono ancore: sono
 * ISTANTI. «I lavori» non e' una sezione della pagina, e' il momento in cui la
 * pattuglia li sta guardando; «il contatto» e' l'ultimo fotogramma.
 *
 * Quindi un click su un'ancora si traduce in una POSIZIONE DI SCORRIMENTO, e
 * la pagina ci va scorrendo. Non e' un salto: attraversa tutto quello che c'e'
 * in mezzo, in fretta, e chi arriva ha visto la strada che ha fatto — che e'
 * anche l'unico modo di non tradire un sito il cui contenuto E' il percorso.
 *
 * E quando l'esperienza non c'e' — il ripiego — non si intercetta niente:
 * li' il documento e' visibile per davvero e le ancore funzionano da sole,
 * come devono.
 */

/**
 * DOVE PORTA OGNI NOME, in progresso di pagina.
 *
 * I numeri vengono dai confini dei tempi (`core/Regia.ts`): il settimo comincia
 * a 0,815 e occupa l'ultimo 18,5% della corsa.
 *
 *   `lavori`   0,952 — la pattuglia ha gia' controllato i documenti e il
 *              carosello e' al massimo della sua presenza
 *   `contatto` 1,000 — l'ultimo fotogramma, dove c'e' la domanda e SCRIVIMI
 *   `studio`   0,000 — la cima, dove sta la frase che dice cosa faccio. Non e'
 *              un ripiego: quella riga E' lo studio, e mandare «STUDIO» a
 *              meta' racconto vorrebbe dire inventare una sezione che il sito
 *              non ha.
 */
const DOVE: Record<string, number> = {
  lavori: 0.952,
  contatto: 1.0,
}

/**
 * STUDIO NON E' PIU' UN PUNTO DELLA CORSA, E' UN DOCUMENTO CHE SI APRE.
 *
 * Era `studio: 0`, cioe' la cima della pagina, e il commento lo difendeva:
 * «quella riga E' lo studio, e mandare STUDIO a meta' racconto vorrebbe dire
 * inventare una sezione che il sito non ha». Il ragionamento era onesto e la
 * conclusione sbagliata: la sezione non andava inventata, andava SCRITTA — e
 * il materiale c'era gia' tutto, in `docs/`, dove non lo apriva nessuno.
 *
 * IL CONTENUTO NON SI DUPLICA. Sta dentro `<main class="documento">`, che
 * esiste da sempre per i motori di ricerca, per i lettori di schermo e per chi
 * arriva senza WebGL. Scriverne una seconda copia dentro l'esperienza sarebbe
 * stato l'errore che questo progetto ha gia' fatto e gia' pagato con la lista
 * dei lavori: due copie divergono al primo ritocco e nessuno se ne accorge.
 * Quindi si apre QUELLO, e chi legge senza WebGL lo trova senza fare niente.
 */
function apriLettura() {
  const doc = document.querySelector<HTMLElement>('.documento')
  if (!doc) return
  document.documentElement.dataset.lettura = 'si'
  doc.scrollTop = 0
  // il fuoco entra nel documento: chi naviga da tastiera si trova DENTRO
  // quello che ha appena aperto, non dietro
  const chiudi = doc.querySelector<HTMLElement>('.lettura__chiudi')
  chiudi?.focus()
}

function chiudiLettura() {
  delete document.documentElement.dataset.lettura
  document.querySelector<HTMLElement>('a[href="#studio"]')?.focus()
}

/** quanto dura il viaggio, in secondi */
const DURATA = 1.9

export function montaAncore() {
  let attivo = 0

  /* IL BOTTONE DI CHIUSURA SI COSTRUISCE QUI, non sta nell'HTML.
     Nel documento statico servito a un motore di ricerca o a chi non ha WebGL
     un bottone «chiudi» non ha senso: li' il documento E' la pagina, non c'e'
     niente da chiudere. Esiste solo quando esiste la modalita' lettura, cioe'
     quando c'e' del JavaScript che l'ha aperta. */
  const doc = document.querySelector<HTMLElement>('.documento')
  if (doc && !doc.querySelector('.lettura__chiudi')) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'lettura__chiudi'
    b.setAttribute('aria-label', 'Chiudi e torna all’esperienza')
    b.textContent = '✕'
    b.addEventListener('click', chiudiLettura)
    doc.prepend(b)
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.documentElement.dataset.lettura) chiudiLettura()
  })

  addEventListener('click', (e) => {
    // il ripiego ha il documento vero sotto gli occhi: li' non si tocca niente
    if (document.documentElement.dataset.ripiego) return
    const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]')
    if (!(a instanceof HTMLAnchorElement)) return
    const nome = a.getAttribute('href')?.slice(1) ?? ''
    if (nome === 'studio') { e.preventDefault(); apriLettura(); return }
    const meta = DOVE[nome]
    if (meta === undefined) return

    e.preventDefault()
    vai(meta)
  })

  /**
   * IL VIAGGIO — un'interpolazione a mano, non `behavior: 'smooth'`.
   *
   * Lo scorrimento morbido del browser ha una durata che decide lui e che
   * cambia da browser a browser; qui invece la durata deve essere quella, e
   * uguale per tutti, perche' mentre si scorre si attraversano sette tempi e
   * la scena ci mette dentro tutta la sua inerzia.
   *
   * E si interrompe se qualcuno tocca la rotella: un viaggio automatico che
   * non si lascia interrompere e' la cosa piu' fastidiosa che un sito possa
   * fare. Da qui l'ascolto su `wheel` e `touchstart`.
   */
  function vai(meta: number) {
    const corsa = document.documentElement.scrollHeight - window.innerHeight
    if (corsa <= 0) return
    const da = window.scrollY
    const a = meta * corsa
    const partenza = performance.now()
    const questo = ++attivo

    const ferma = () => { attivo++ }
    addEventListener('wheel', ferma, { once: true, passive: true })
    addEventListener('touchstart', ferma, { once: true, passive: true })

    const passo = () => {
      if (questo !== attivo) return
      const t = Math.min((performance.now() - partenza) / (DURATA * 1000), 1)
      // dolce alle due estremita': parte senza strappo e si posa senza rimbalzo
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      window.scrollTo(0, da + (a - da) * e)
      if (t < 1) requestAnimationFrame(passo)
      else {
        removeEventListener('wheel', ferma)
        removeEventListener('touchstart', ferma)
      }
    }
    requestAnimationFrame(passo)
  }
}
