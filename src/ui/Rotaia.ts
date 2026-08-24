import type { Beat, Regia } from '../core/Regia'
import { t } from './Lingua'

/**
 * LA ROTAIA — dove si e' arrivati dentro il viaggio.
 *
 * PERCHE' QUESTA E NON UNA BARRA DI SCORRIMENTO.
 *
 * Una barra dice quanta pagina resta. Questa dice DOVE SI E'. E' una differenza
 * che conta solo su un sito in cui i posti esistono davvero — qui esistono:
 * fuori dall'automobile, in avvicinamento, dentro l'ottica, nell'abitacolo, in
 * corsa. Cinque stati, non cinque schermate.
 *
 * E' anche l'unica interfaccia del sito che ha una FUNZIONE invece di un
 * mestiere decorativo. Il resto — il nome, il menu, la fascia tecnica — dice
 * cose che si potrebbero leggere altrove. Questa dice una cosa che non e'
 * scritta da nessun'altra parte.
 *
 * SI VEDE UN NOME SOLO, quello dello stato corrente.
 *
 * Cinque nomi tutti insieme sono un indice, e un indice su una sola schermata
 * e' rumore: chi guarda non deve scegliere fra cinque posti, ne sta
 * attraversando uno. Gli altri quattro restano come nodi — presenti, muti — e
 * il loro mestiere e' far capire quanti ne mancano.
 *
 * IL NODO ATTIVO SI MUOVE CON LA SCENA, non con lo scorrimento della pagina.
 *
 * Sono due cose diverse e vengono scambiate di continuo. Lo scorrimento e'
 * quanto e' stata trascinata la pagina; la scena ha il suo progresso smorzato,
 * che e' quello che si sta guardando. Legando il nodo al primo, il nodo arriva
 * PRIMA di quello che mostra il fotogramma — e quel disallineamento di qualche
 * decimo si legge come un difetto anche da chi non saprebbe dire cosa non va.
 */

/** i cinque stati, nell'ordine in cui si attraversano */
const TAPPE: Array<{ beat: Beat; nome: string }> = [
  { beat: 'hero', nome: t('tappaEsterno') },
  { beat: 'orbita', nome: t('tappaSuperficie') },
  { beat: 'lato', nome: t('tappaAvvicinamento') },
  { beat: 'taglio', nome: t('tappaOttica') },
  { beat: 'accensione', nome: t('tappaAbitacolo') },
  { beat: 'velocita', nome: t('tappaCorsa') },
  // la settima e ultima. «CONTATTO» e non «FINE»: la rotaia dice dove si e',
  // e alla fine di questo percorso non si e' alla fine — si e' arrivati da
  // qualche parte.
  { beat: 'contatto', nome: t('tappaContatto') },
]

export class Rotaia {
  private corsaScritta = ''
  private radice: HTMLElement
  private nodi: HTMLElement[] = []
  private nome: HTMLElement
  private indice: HTMLElement
  private ultima = -1

  constructor(dentro: HTMLElement = document.body) {
    this.radice = document.createElement('nav')
    this.radice.className = 'rotaia'
    this.radice.setAttribute('aria-label', 'Percorso')

    const pista = document.createElement('div')
    pista.className = 'rotaia__pista'
    // il segno che avanza: e' un elemento a parte e non un bordo colorato,
    // perche' deve poter crescere con continuita' invece che saltare da un
    // nodo all'altro
    const corsa = document.createElement('span')
    corsa.className = 'rotaia__corsa'
    pista.appendChild(corsa)
    this.radice.appendChild(pista)

    for (let i = 0; i < TAPPE.length; i++) {
      const n = document.createElement('span')
      n.className = 'rotaia__nodo'
      // i nodi si posizionano in percentuale invece che con una griglia: la
      // rotaia cambia altezza col viewport, e una griglia li terrebbe
      // equidistanti in pixel invece che lungo la pista
      n.style.top = `${(i / (TAPPE.length - 1)) * 100}%`
      this.radice.appendChild(n)
      this.nodi.push(n)
    }

    const eti = document.createElement('p')
    eti.className = 'rotaia__etichetta'
    this.indice = document.createElement('span')
    this.indice.className = 'rotaia__indice'
    this.nome = document.createElement('span')
    this.nome.className = 'rotaia__nome'
    eti.append(this.indice, this.nome)
    this.radice.appendChild(eti)

    dentro.appendChild(this.radice)
    this.aggiorna({ beat: 'hero', locale: 0, globale: 0 } as Regia)
  }

  aggiorna(regia: Regia) {
    const i = TAPPE.findIndex((t) => t.beat === regia.beat)
    const tappa = i < 0 ? 0 : i

    // LA CORSA E' CONTINUA, i nodi sono discreti.
    //
    // Il segno cresce con il progresso vero — tappa piu' quanto se ne e' fatto
    // — cosi' fra un nodo e l'altro c'e' comunque movimento. Senza, la rotaia
    // sta ferma per un quinto di sito e poi scatta, e uno scatto ogni tanto e'
    // il modo piu' rapido di far sembrare finto un indicatore.
    const avanzamento = (tappa + Math.min(Math.max(regia.locale, 0), 1)) / (TAPPE.length - 1)
    // tre decimali: e' una frazione che finisce in una scala, e la quarta
    // cifra non sposta un pixel ma costa un ricalcolo di stile
    const c = Math.min(avanzamento, 1).toFixed(3)
    if (c !== this.corsaScritta) {
      this.corsaScritta = c
      this.radice.style.setProperty('--corsa', c)
    }

    if (tappa === this.ultima) return
    this.ultima = tappa
    for (let k = 0; k < this.nodi.length; k++) {
      this.nodi[k].classList.toggle('e-attivo', k === tappa)
      this.nodi[k].classList.toggle('e-passato', k < tappa)
    }
    this.indice.textContent = String(tappa + 1).padStart(2, '0') + ' / ' + String(TAPPE.length).padStart(2, '0')
    this.nome.textContent = TAPPE[tappa].nome
  }
}
