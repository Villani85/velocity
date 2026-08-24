import * as Ripiego from './core/Ripiego'
import { applicaLingua, imposta, lingua, rimettiIlPosto, D } from './ui/Lingua'
import { scritto, collegamento } from './ui/Contatto'

/**
 * LA LINGUA SI APPLICA PRIMA DI TUTTO, ANCHE PRIMA DELL'ESAME DEL RIPIEGO.
 *
 * Non e' una questione di ordine estetico: chi finisce nella pagina statica —
 * per movimento ridotto, per rete, per assenza di WebGL — deve trovarla nella
 * SUA lingua. Applicandola dopo, per quelle persone il sito sarebbe rimasto in
 * italiano per sempre, e sono esattamente quelle a cui il sito si riduce al
 * testo.
 */
applicaLingua()
{
  const l = lingua()
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lingua]')) {
    const suo = b.dataset.lingua === l
    b.setAttribute('aria-current', String(suo))
    b.setAttribute('aria-label', b.dataset.lingua === 'it' ? 'Italiano' : 'English')
    if (!suo) b.addEventListener('click', () => imposta(b.dataset.lingua === 'en' ? 'en' : 'it'))
  }
  // l'indirizzo, se c'e', accende il collegamento nella pagina statica. Vedi
  // `ui/Contatto.ts`: finche' e' vuoto qui non compare niente di cliccabile,
  // perche' un indirizzo inventato e' l'unica cosa finta che qualcuno
  // proverebbe davvero a usare.
  const dove = document.querySelector('[data-contatto]')
  if (dove && scritto()) {
    dove.innerHTML = '<a href="' + collegamento() + '">' + scritto() + '</a>'
    dove.removeAttribute('data-t')
  }
}

const tela = document.getElementById('tela') as HTMLCanvasElement

/**
 * LA PRIMA DECISIONE DEL SITO, E SI PRENDE PRIMA DI SCARICARE QUALUNQUE COSA.
 *
 * `esamina()` guarda quattro cose — la preferenza di movimento ridotto, il
 * risparmio dati, la classe di rete, l'esistenza di WebGL — e se una di
 * quelle dice no, `new Esperienza` non viene MAI chiamato.
 *
 * E' li' che sta il guadagno vero, e non e' grafico: chi ha
 * `prefers-reduced-motion` acceso non scarica il modello da 2,9 MB, non
 * scarica il panorama da 500 kB, non compila nessuno shader e non tiene un
 * contesto WebGL aperto. Riceve una pagina e un'immagine da cinquantun
 * chilobyte. Il modo in cui quella preferenza viene implementata quasi
 * ovunque — costruire tutto e poi non animarlo — fa pagare l'intero conto per
 * non ricevere niente in cambio, ed e' la ragione per cui accenderla di solito
 * non serve a niente.
 */
/* IL RIENTRO SCAVALCA L'ESAME, e vale per questa scheda soltanto.
   `sessionStorage` e non `localStorage`: chi ha chiesto una volta di vedere
   l'esperienza completa non sta cambiando la sua preferenza di sistema — la
   sta sospendendo per questa visita. Alla prossima si torna a chiederglielo,
   che e' quello che una preferenza merita. */
const forzata = sessionStorage.getItem('velocity:forza') === '1'
if (forzata) sessionStorage.removeItem('velocity:forza')

/* L'ESPERIENZA PARTE SEMPRE. Punto.
 *
 * `Ripiego.esamina()` leggeva `data-ripiego` dalla radice, che lo script in
 * testa a `index.html` scriveva quando una tela di prova non otteneva un
 * contesto WebGL. Quella riga non c'e' piu' — la ragione sta scritta li' — e
 * qui resta solo la lettura, che ormai non trova mai niente.
 *
 * Il controllo che c'era ha bocciato la macchina del committente mentre io
 * tenevo aperta una dozzina di Chromium per misurare: Chrome tiene in vita una
 * sedicina di contesti WebGL, e in quell'istante non ce n'erano liberi. Il
 * controllo ha risposto bene a una domanda mal posta — «c'e' WebGL adesso?» —
 * quando quella giusta e' «riesco a partire?», a cui si risponde partendo.
 *
 * La riga resta qui e non viene cancellata perche' `esamina()` e' anche il
 * punto in cui qualcuno, un giorno, potrebbe rimettere una condizione. Che la
 * trovi con accanto la ragione per cui non ce n'e' nessuna. */
const causaIniziale = forzata ? null : Ripiego.esamina()

/**
 * L'IMPORT E' DINAMICO, ed e' la seconda meta' della stessa cura.
 *
 * Scritto come import statico in testa al file, `Esperienza` tirava dentro
 * three.js, il caricatore GLTF, la catena degli effetti e ogni modulo della
 * scena — un megabyte e due di JavaScript compresso — PRIMA che qualcuno
 * avesse deciso se servivano. Misurato con `strumenti/ripiego.mjs`: la pagina
 * di ripiego scaricava dodici megabyte e mezzo in sviluppo per poi non
 * costruire niente.
 *
 * Con `await import()` quel codice diventa un pezzo a parte che si chiede solo
 * dopo il quarto controllo. Chi legge la pagina statica riceve il documento,
 * il foglio di stile e cinquantun chilobyte di poster.
 *
 * E ci guadagna anche chi l'esperienza la vede: il primo disegno della pagina
 * non aspetta piu' la compilazione di un megabyte di libreria.
 */
/**
 * QUI SI PAGA, E SOLO QUI.
 *
 * `await import('./avvio')` e' l'unico punto di tutto il sito in cui si
 * chiedono three.js, la scena e l'interfaccia — un megabyte e due di
 * JavaScript compresso — e ci si arriva solo dopo che i quattro controlli
 * hanno detto di si'.
 *
 * Chi legge la pagina statica riceve il documento, il foglio di stile e
 * cinquantun chilobyte di poster. E ci guadagna anche chi l'esperienza la
 * vede: il primo disegno della pagina non aspetta piu' la compilazione della
 * libreria.
 */
const esp = causaIniziale ? null : (await import('./avvio')).avvia(tela)
if (esp) {
  /* E QUANDO IL CONTESTO TORNA, SI RICARICA. Non e' elegante quanto
     ricostruire la scena pezzo per pezzo, ed e' l'unica cosa onesta: dopo un
     contesto perso ogni tessitura, ogni programma e ogni buffer sul lato della
     scheda non esistono piu', e ricostruirli a mano vorrebbe dire riscrivere
     meta' di `Esperienza` in una strada che nessuno percorre quasi mai.
     Un ricaricamento riporta il sito dov'era — la posizione nello scorrimento
     la ritrova da sola — e soprattutto riporta il SITO, non un documento. */
  Ripiego.sorvegliaContesto(tela, () => location.reload())
  // e si torna dove si era prima di cambiare lingua, quando la scena e' pronta
  const attendi = () => {
    if (esp.autoPronta && esp.ambientePronto) rimettiIlPosto()
    else setTimeout(attendi, 250)
  }
  attendi()
}

/**
 * IL RIENTRO, ed esiste solo per chi e' finito nel ripiego SENZA chiederlo.
 *
 * A chi ha `prefers-reduced-motion` non si offre: gli e' gia' stato chiesto
 * una volta cosa preferisce, a livello di sistema operativo, e richiederglielo
 * su ogni sito e' esattamente il motivo per cui quella preferenza non la
 * accende quasi nessuno.
 */
{
  const causa = Ripiego.causa()
  const forza = document.getElementById('forzaEsperienza')
  const perche = document.querySelector('[data-perche]')
  if (causa && perche) perche.textContent = D.docVersioneStatica[lingua()] + Ripiego.MOTIVI[causa] + '.'
  if (causa && forza?.parentElement) {
    forza.parentElement.hidden = false
    forza.addEventListener('click', () => {
      // si ricarica invece di costruire al volo: costruire vorrebbe dire
      // avere due strade d'avvio da tenere in piedi per sempre, e la seconda
      // la proverebbe una persona su mille
      sessionStorage.setItem('velocity:forza', '1')
      location.reload()
    })
  }
}
