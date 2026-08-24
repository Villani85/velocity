/**
 * IL PROGRESSO DELLO SCORRIMENTO.
 *
 * REGOLA DURA, GIA' PAGATA SUL PROGETTO PRECEDENTE: mai soglie in pixel.
 *
 * La tentazione e' scrivere `if (scrollY > 1200) beat = 2`. Non funziona, e
 * non funziona in un modo insidioso: funziona finche' non cambia l'altezza
 * della finestra, il numero di sezioni, o finche' qualcosa non inserisce
 * pixel DOPO che il numero e' stato deciso. Da quel momento le soglie
 * mentono, e mentono in silenzio.
 *
 * Qui il progresso si LEGGE a ogni fotogramma dalla posizione vera del
 * documento. Non e' un valore memorizzato: e' una misura, ripetuta.
 *
 * E si smorza. Lo scorrimento del sistema operativo arriva a scatti — il
 * trackpad manda pacchetti, la rotella manda gradini — e una camera che
 * segue quei gradini si vede tremare. Lo smorzamento non e' un effetto:
 * e' il filtro che trasforma una misura discreta in un movimento.
 */
export class Scorrimento {
  /** 0..1 grezzo, cosi' com'e' nel documento */
  crudo = 0
  /** 0..1 smorzato: e' questo che pilota la scena */
  morbido = 0
  /** quanto si sta scorrendo, in progresso al secondo: governa l'intensita' */
  velocita = 0

  private precedente = 0

  /**
   * @param inerzia quanto insegue. 1 = istantaneo (a scatti), 0,1 = molto
   *   morbido ma in ritardo. 0,14 e' il punto in cui il movimento sembra
   *   una camera e non un cursore.
   */
  /**
   * PUBBLICA, perche' il livello di qualita' la spegne.
   *
   * Chi ha `prefers-reduced-motion: reduce` non deve ricevere meno sito: deve
   * ricevere meno movimento AUTOMATICO. Portando l'inerzia a 1 la scena segue
   * il dito uno a uno invece di scivolargli dietro — spariscono le code di
   * movimento che partono da sole, restano tutti i beat e tutte le pose.
   *
   * E' l'unico caso in cui questo numero cambia dopo la costruzione, quindi
   * resta un campo semplice e non una proprieta' con setter.
   */
  constructor(public inerzia = 0.14) {}

  aggiorna(dt: number) {
    const corsa = document.documentElement.scrollHeight - window.innerHeight
    this.crudo = corsa > 0 ? Math.min(Math.max(window.scrollY / corsa, 0), 1) : 0

    // il passo dello smorzamento si corregge con il tempo trascorso, se no
    // la scena si muove piu' in fretta sui monitor a 144 Hz che a 60
    const k = 1 - Math.pow(1 - this.inerzia, dt * 60)
    this.morbido += (this.crudo - this.morbido) * k

    const delta = Math.abs(this.morbido - this.precedente)
    this.precedente = this.morbido
    // anche la velocita' si smorza: altrimenti e' rumore, non un segnale
    this.velocita += (delta / Math.max(dt, 1 / 240) - this.velocita) * 0.12
  }
}
