import { RIDOTTO } from './Moto'
import { fermo } from './Banco'

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
   * PUBBLICA, e la ragione originale era «perche' il livello di qualita' la
   * spegne». Vale ancora per gli strumenti di misura, che devono poter
   * togliere lo smorzamento per fotografare una scena ripetibile.
   *
   * IL RAGIONAMENTO CHE C'ERA SCRITTO QUI ERA GIUSTO E RESTA, PAROLA PER
   * PAROLA: chi ha `prefers-reduced-motion: reduce` non deve ricevere meno
   * sito, deve ricevere meno movimento AUTOMATICO — la scena segue il dito uno
   * a uno invece di scivolargli dietro, spariscono le code di movimento che
   * partono da sole, restano tutti i beat e tutte le pose.
   *
   * Cio' che mancava e' che nessuno lo faceva. L'unico posto che scriveva
   * questo campo era `Esperienza.applicaQualita()`, che gira SOLO al cambio di
   * livello di qualita': su una macchina che non cala mai — cioe' su una
   * macchina buona — la preferenza non arrivava mai fin qui, e chi l'aveva
   * accesa riceveva l'inerzia come tutti gli altri.
   *
   * Adesso la lettura sta in `aggiorna`, dove il valore serve, e viene da
   * `core/Moto.ts`, che e' l'unico posto del progetto che interroga il
   * sistema. Costa un confronto per fotogramma e toglie di mezzo un'intera
   * classe di casi in cui la promessa vale «di solito».
   */
  constructor(public inerzia = 0.14) {}

  aggiorna(dt: number) {
    const corsa = document.documentElement.scrollHeight - window.innerHeight
    this.crudo = corsa > 0 ? Math.min(Math.max(window.scrollY / corsa, 0), 1) : 0

    /* CON IL MOVIMENTO RIDOTTO L'INERZIA VALE 1, cioe' la camera SEGUE la
       posizione invece di INSEGUIRLA.
       E' il punto piu' importante di tutto il capitolo: quello che fa star male
       chi ha un disturbo vestibolare non e' che ci sia un oggetto in tre
       dimensioni sullo schermo, e' che l'immagine continui a muoversi dopo che
       la mano si e' fermata. Un movimento che finisce esattamente quando
       finisce il gesto e' un movimento che chi guarda comanda, e un movimento
       comandato non e' quello che la preferenza chiede di togliere.
       Il valore 1 non e' un caso speciale scritto a parte: la formula qui sotto
       lo accetta e produce `k = 1`, cioe' l'inseguimento istantaneo. */
    const inerzia = RIDOTTO ? 1 : this.inerzia
    // il passo dello smorzamento si corregge con il tempo trascorso, se no
    // la scena si muove piu' in fretta sui monitor a 144 Hz che a 60
    const k = 1 - Math.pow(1 - inerzia, dt * 60)
    this.morbido += (this.crudo - this.morbido) * k

    const delta = Math.abs(this.morbido - this.precedente)
    this.precedente = this.morbido
    /* E ANCHE LA VELOCITA' PERDE LA SUA CODA, che e' la seconda meta' della
       stessa cosa e la meta' piu' facile da dimenticare.
       Lo smorzamento a 0,12 esiste per una buona ragione — senza, questo
       numero e' rumore e non un segnale, e comanda il campo visivo, la spinta
       della strada e il tachimetro — ma e' un filtro che IMPIEGA CIRCA UN
       SECONDO a scendere a zero. Con `morbido` ormai istantaneo, sarebbe
       rimasto lui l'unico pezzo di scena che continua a cambiare dopo che ci
       si e' fermati: il campo visivo che si richiude da solo, la strada che
       decelera da sola. Cioe' esattamente il difetto, spostato di un file. */
    const grezza = delta / Math.max(dt, 1 / 240)
    /* Lo smorzamento a 0,12 impiega circa un secondo a scendere a zero, e
       quel secondo e' un'altra coda che il banco non puo' aspettare: e' lei ad
       alimentare la spinta della strada, quindi finche' non arriva a zero la
       carreggiata continua a decelerare fra un fotogramma e l'altro. */
    if (fermo(RIDOTTO)) this.velocita = grezza
    else this.velocita += (grezza - this.velocita) * 0.12
  }
}
