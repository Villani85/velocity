import { FINITURE, applicaFinitura } from '../scene/Materiali'
import type { Beat, Regia } from '../core/Regia'
import { t } from './Lingua'

/**
 * I COMANDI — la prova che questo non e' un filmato.
 *
 * L'OBIEZIONE A CUI RISPONDONO.
 *
 * A un sito come questo si puo' obiettare, con ragione, che tutto cio' che si e'
 * visto finora si poteva ottenere registrando una volta e agganciando il
 * filmato allo scorrimento: la camera che gira, la lamiera che riflette la
 * villa, l'attraversamento del faro. Sono cose bellissime e sono tutte
 * RIPRODUCIBILI.
 *
 * Cio' che un filmato non puo' fare e' rispondere. Due comandi bastano a
 * dimostrarlo, e devono essere due comandi VERI — non un cursore disegnato o
 * una scheda che si inclina col puntatore, che dimostrano solo che si sa
 * ascoltare il mouse.
 *
 *   LA FINITURA cambia colore, ruvidita' e trasparente insieme. Guardando la
 *   villa riflessa sulla fiancata si vede che e' un'altra SUPERFICIE, non
 *   un'altra tinta — ed e' quella differenza a essere impossibile da filmare,
 *   perche' il riflesso dipende da dove sta la camera in quel momento.
 *
 *   L'ORA gira la fotografia a 360 gradi intorno alla scena. Cambia il luogo
 *   dietro l'automobile e, insieme, la luce che le arriva addosso: sono la
 *   stessa immagine, una fa da fondo e una da mappa d'ambiente. E' la
 *   dimostrazione piu' economica che esista di che cosa sia un ambiente
 *   calcolato.
 *
 * SI COMANDANO CON UN TOCCO, non con un trascinamento.
 *
 * Un configuratore che si gira trascinando e' la scelta ovvia e qui sarebbe
 * sbagliata due volte: litiga con lo scorrimento, che e' il comando di tutto il
 * resto, e su un telefono e' indistinguibile da un tentativo di scorrere. Dei
 * pulsanti funzionano ovunque e non rubano niente.
 *
 * VIVONO SOLO NELLA PRIMA SCHERMATA.
 *
 * E' li' che serve la prova — chi arriva decide nei primi secondi — e da li' in
 * poi il racconto ha bisogno di attenzione, non di manopole. Un pannello di
 * comandi che segue per tutto il sito diventa arredamento, ed e' esattamente il
 * difetto che ho gia' tolto due volte da questa pagina.
 */

/**
 * LE ORE, e non sono un orologio: sono quattro orientamenti misurati della
 * fotografia.
 *
 * I gradi vengono da `strumenti/orienta.mjs`, che gira la manopola e rende un
 * fotogramma per posizione. 225 e' quello scelto per la scena — la villa dietro
 * l'automobile e la piscina che ne stacca la sagoma. Gli altri tre sono i punti
 * in cui la stessa fotografia racconta una luce diversa: il tramonto sul mare,
 * il colonnato in ombra, la facciata di taglio.
 *
 * I nomi non dichiarano un'ora del giorno che non c'e': dichiarano dove si sta
 * guardando. Una fotografia sola non puo' cambiare ora, e scriverlo sarebbe la
 * stessa bugia dei numeri inventati.
 */
const VISTE: Array<{ nome: string; gradi: number }> = [
  { nome: t('vistaVilla'), gradi: 225 },
  { nome: t('vistaPiscina'), gradi: 135 },
  { nome: t('vistaTramonto'), gradi: 90 },
  { nome: t('vistaCorte'), gradi: 315 },
]

export class Comandi {
  private radice: HTMLElement
  private finitura = 0
  private vista = 0
  private gira: (gradi: number) => void

  constructor(gira: (gradi: number) => void, dentro: HTMLElement = document.body) {
    this.gira = gira
    this.radice = document.createElement('section')
    this.radice.className = 'comandi'
    this.radice.setAttribute('aria-label', t('comandiEtichetta'))

    const finiture = document.createElement('div')
    finiture.className = 'comandi__riga'
    finiture.innerHTML = '<p class="comandi__voce">' + t('vociFinitura') + '</p>'
    for (let i = 0; i < FINITURE.length; i++) {
      const b = document.createElement('button')
      b.className = 'comandi__campione'
      b.type = 'button'
      b.style.setProperty('--tinta', FINITURE[i].campione)
      /* IL CAMPIONE MOSTRA LA FINITURA, NON LA TINTA — e il motivo e' che
         adesso le tinte sono tre neri.
         Tolti il bianco perla e l'arancio (richiesta del committente), il
         selettore e' diventato tre pallini quasi identici: 0d0f14, 15171c,
         23262b a ventisei pixel non si distinguono, e un selettore i cui
         pulsanti non si distinguono e' un selettore che non si usa.
         Quello che distingue davvero le tre finiture e' la RUVIDITA': 0,30 la
         vernice liquida, 0,48 la satinata, 0,14 il carbonio. Ed e' una cosa
         che si sa disegnare — e' l'unica cosa che si vede guardando una
         superficie lucida: la macchia di luce. Piu' e' ruvida, piu' la macchia
         e' larga e spenta; piu' e' liscia, piu' e' piccola e accesa.
         I due numeri qui sotto sono la stessa relazione della fisica messa in
         scala di pixel, non una formula: l'esponente 1,6 sull'opacita' serve a
         separare il satinato dagli altri due, che a esponente uno restavano
         vicini. */
      const rv = FINITURE[i].ruvidita
      b.style.setProperty('--macchia', (18 + rv * 55).toFixed(0) + '%')
      b.style.setProperty('--lucido', (Math.pow(1 - rv, 1.6) * 0.95).toFixed(3))
      // e la trama, per la sola finitura che ce l'ha: vedi «scene/Materiali.ts»
      if (FINITURE[i].trama) b.classList.add('e-trama')
      // il nome sta nell'etichetta accessibile e non sotto il campione: quattro
      // nomi di vernice in fila sono quattro parole da leggere per una scelta
      // che si fa guardando un colore
      b.setAttribute('aria-label', FINITURE[i].nome)
      b.title = FINITURE[i].nome
      b.addEventListener('click', () => this.scegliFinitura(i))
      finiture.appendChild(b)
    }

    const viste = document.createElement('div')
    viste.className = 'comandi__riga'
    viste.innerHTML = '<p class="comandi__voce">' + t('vociLuogo') + '</p>'
    for (let i = 0; i < VISTE.length; i++) {
      const b = document.createElement('button')
      b.className = 'comandi__vista'
      b.type = 'button'
      b.textContent = VISTE[i].nome
      b.addEventListener('click', () => this.scegliVista(i))
      viste.appendChild(b)
    }

    /* IL NOME DELLA FINITURA SCELTA, e non e' ridondanza.
       Il pallino disegna la macchia di luce con larghezza e forza prese dalla
       ruvidita' vera — 0,30 / 0,48 / 0,14 — ed e' la costruzione giusta. Ma la
       revisione esterna ha guardato il poster e ha detto la cosa che conta:
       «a 26 px il segnale non passa, leggono ancora come tre cerchi grigi
       quasi identici». Ha ragione, e il motivo e' aritmetico: la differenza fra
       due macchie larghe il 34% e il 44% di un disco di ventisei pixel sono due
       pixel e mezzo di raggio.
       Un disegno che a quella misura non arriva non si aggiusta ingrandendo il
       disegno: si nomina. «NERO LIQUIDO / NERO SATINATO / CARBONIO» sono tre
       parole che dicono in mezzo secondo quello che il pallino prova a dire con
       due pixel — e il pallino resta, perche' insieme fanno quello che nessuno
       dei due fa da solo.
       Una riga sola e solo per quella SCELTA: tre nomi in fila sotto tre
       pallini sarebbero tre parole da leggere per una scelta che si fa
       guardando. */
    const nome = document.createElement('p')
    nome.className = 'comandi__nome'
    /* `aria-hidden` perche' per chi usa un lettore di schermo il nome c'e' gia'
       ed e' migliore: ogni pallino porta la sua `aria-label`, e il pulsante
       scelto e' annunciato come premuto. Ripeterlo qui sarebbe rumore. */
    nome.setAttribute('aria-hidden', 'true')
    finiture.appendChild(nome)
    this.nome = nome

    this.radice.append(finiture, viste)
    dentro.appendChild(this.radice)
    this.segna()
    this.dichiaraAltezza()
  }

  /**
   * QUANTO SONO ALTI, SCRITTO DOVE IL CSS PUO' LEGGERLO.
   *
   * IL DIFETTO, e me l'ha trovato il committente due volte di fila. I comandi
   * sono `position: fixed` in basso: non occupano posto nel flusso, quindi
   * niente sa che ci sono. Il blocco del testo sta anche lui ancorato in basso,
   * e la sua distanza dal fondo era un numero scelto a mano. Finche' i comandi
   * erano due righe di testo nude i due numeri andavano d'accordo per caso; il
   * giorno in cui i comandi hanno preso una cornice — quindi riempimento,
   * quindi altezza — il testo ci e' finito sotto.
   *
   * Ho provato due volte a rimetterli d'accordo spostando pixel: la prima
   * dimezzando il riempimento, la seconda abbassando l'ancora. Tutte e due
   * hanno funzionato ALLA MIA ALTEZZA DI FINESTRA e sono fallite altrove — su
   * 1280x620 restavano otto pixel di sovrapposizione. Era prevedibile: le due
   * quote sono `clamp` con dentro una parte in `vh`, cioe' due curve diverse,
   * e due curve diverse si incontrano in un punto solo.
   *
   * LA FORMA GIUSTA e' non avere due numeri. L'altezza vera si misura e si
   * scrive in una variabile CSS; il testo la somma alla propria distanza dal
   * fondo. Da quel momento non c'e' piu' niente da tenere allineato: se la
   * cornice cambia riempimento, se il carattere cresce, se i comandi vanno a
   * capo sul telefono, il testo si sposta da solo.
   *
   * `ResizeObserver` e non un `addEventListener('resize')`: i comandi cambiano
   * altezza anche SENZA che la finestra cambi — quando le due righe vanno a
   * capo, quando cambia la lingua e «TRAMONTO» diventa «SUNSET». Un ascolto sul
   * ridimensionamento non vedrebbe niente di tutto questo.
   */
  private dichiaraAltezza() {
    const scrivi = () => {
      const h = Math.round(this.radice.getBoundingClientRect().height)
      /* ZERO NON SI SCRIVE. Prima che i comandi entrino in scena il rettangolo
         puo' essere alto zero, e scriverlo farebbe scendere il testo per poi
         rialzarlo un attimo dopo: uno scatto visibile proprio nel fotogramma
         in cui si atterra. Meglio tenere l'ultimo valore buono. */
      if (h > 0) document.documentElement.style.setProperty('--comandi-alt', h + 'px')
    }
    scrivi()
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scrivi).observe(this.radice)
  }

  private scegliFinitura(i: number) {
    this.finitura = i
    applicaFinitura(i)
    this.segna()
  }

  private scegliVista(i: number) {
    this.vista = i
    this.gira(VISTE[i].gradi)
    this.segna()
  }

  /** quale e' scelto: si legge dallo stato, non si tiene a mente nel DOM */
  /** dove si scrive il nome della finitura scelta */
  private nome!: HTMLElement

  private segna() {
    const c = this.radice.querySelectorAll('.comandi__campione')
    for (let i = 0; i < c.length; i++) c[i].classList.toggle('e-scelto', i === this.finitura)
    const v = this.radice.querySelectorAll('.comandi__vista')
    for (let i = 0; i < v.length; i++) v[i].classList.toggle('e-scelto', i === this.vista)
    if (this.nome) this.nome.textContent = FINITURE[this.finitura].nome
  }

  /** da quanto la pagina e' aperta: vedi `aggiorna` */
  private eta = 0

  aggiorna(regia: Regia, dt = 0) {
    this.eta += dt
    // SOLO NELLA PRIMA SCHERMATA, e ARRIVANO DA SOLI DOPO UN SECONDO E MEZZO.
    //
    // Prima la condizione era `regia.locale > 0.12`, cioe' «compaiono quando si
    // e' gia' cominciato a scorrere». Era sbagliata nel modo peggiore: chi
    // apre la pagina e sta fermo — che e' esattamente chi va convinto — non
    // vedeva nessun comando, e il sito tornava a essere un filmato finche' non
    // si scorreva. La prova che questa cosa risponde non puo' richiedere di
    // averle gia' creduto.
    //
    // Il ritardo resta, e la ragione resta quella: una prova arriva dopo
    // l'affermazione, e il titolo deve avere il tempo di entrare. Ma si misura
    // sul TEMPO, che scorre da solo, invece che sullo scorrimento, che e'
    // un'azione dell'altro.
    const suoTempo: Beat[] = ['hero']
    const vivi = suoTempo.includes(regia.beat) && this.eta > 1.5
    this.radice.classList.toggle('e-vivo', vivi)
    // `inert` e non solo l'opacita': un pulsante invisibile ma raggiungibile col
    // tasto di tabulazione e' una trappola per chi naviga da tastiera
    this.radice.inert = !vivi
  }
}
