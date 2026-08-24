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

    this.radice.append(finiture, viste)
    dentro.appendChild(this.radice)
    this.segna()
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
  private segna() {
    const c = this.radice.querySelectorAll('.comandi__campione')
    for (let i = 0; i < c.length; i++) c[i].classList.toggle('e-scelto', i === this.finitura)
    const v = this.radice.querySelectorAll('.comandi__vista')
    for (let i = 0; i < v.length; i++) v[i].classList.toggle('e-scelto', i === this.vista)
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
