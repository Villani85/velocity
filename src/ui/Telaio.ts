import { Box3, Matrix4, Mesh, Object3D, PerspectiveCamera, Vector3 } from 'three'
import { rincorsa } from '../core/Moto'
import type { Regia } from '../core/Regia'

/**
 * IL TELAIO TECNICO — la scatola vera dell'asset, quotata.
 *
 * PERCHE' ESISTE, e da dove viene.
 *
 * Il committente ha portato un fotomontaggio come riferimento: la stessa
 * automobile con intorno finestre di browser, un pannello di codice, un
 * grafico a onde e una scatola in filo di ferro. La richiesta era chiara —
 * «deve capirsi all'atterraggio che e' il sito di uno che costruisce siti».
 *
 * IL FOTOMONTAGGIO PERO' NON SI PUO' COPIARE, e non per pigrizia. Quei
 * pannelli sono chrome di interfaccia scura: barre del titolo, angoli tondi,
 * riempimenti. Appoggiati su una scena fotografica sono UN ALTRO MATERIALE, ed
 * e' esattamente la critica che questo sito si e' gia' preso — «si percepiscono
 * tre mondi». Copiarla vorrebbe dire aggiungerne un quarto.
 *
 * Congruente vuol dire fatto della materia che il sito ha gia', e quella
 * materia e' precisa: filetti ambra sottili, monospazio maiuscolo a spaziatura
 * larga, nessun riempimento, nessun bordo chiuso. E' la rotaia verticale, e' la
 * linea che va da «2.9 MB» al gruppo ottico, e' il filetto sotto VILLA.
 *
 * E SOPRATTUTTO: E' UNA MISURA VERA.
 *
 * Nel fotomontaggio la scatola in filo di ferro e' un disegnino decorativo in
 * un angolo, con dentro una silhouette di automobile. Qui e' il RIQUADRO DI
 * INGOMBRO del modello che si sta guardando, calcolato una volta sola dalla
 * geometria caricata, e le tre quote sono i metri veri letti dal GLB. Se un
 * giorno l'asset cambia, cambiano da sole.
 *
 * E' la differenza fra dire «questo e' 3D» e mostrarne la prova. Un direttore
 * tecnico che apre gli strumenti del browser trova esattamente quei numeri.
 *
 * PERCHE' IN SVG E NON IN TRE DIMENSIONI.
 *
 * Una `LineSegments` in scena sarebbe la strada ovvia e darebbe un filo di
 * spessore variabile, soggetto alla prospettiva, al bloom e al grading: cioe'
 * un filo che non somiglia a nessun altro filo del sito. Proiettando gli otto
 * vertici e disegnandoli in SVG, il tratto e' spesso un pixel come quello
 * della spina, e i due si leggono come lo stesso strumento. E' la stessa
 * scelta gia' fatta per la linea di `ui/Spina.ts`, per la stessa ragione.
 *
 * Otto proiezioni per fotogramma. Il resto e' aritmetica.
 */

/** quanto e' lungo il gancio d'angolo, in frazione dello spigolo */
const GANCIO = 0.16

export class Telaio {
  private radice: SVGSVGElement
  private spigoli: SVGPathElement
  private ganci: SVGPathElement
  private quote: SVGGElement
  private testi: SVGTextElement[] = []
  private linee: SVGPathElement[] = []

  /** il riquadro d'ingombro nello spazio LOCALE del perno: si misura una volta */
  private scatola: Box3 | null = null
  private soggetto: Object3D | null = null
  private presenza = 0

  private vertici: Vector3[] = []
  private piani: { x: number; y: number }[] = []

  constructor(dentro: HTMLElement = document.body) {
    const NS = 'http://www.w3.org/2000/svg'
    this.radice = document.createElementNS(NS, 'svg')
    this.radice.setAttribute('class', 'telaio')
    this.radice.setAttribute('aria-hidden', 'true')
    this.spigoli = document.createElementNS(NS, 'path')
    this.spigoli.setAttribute('class', 'telaio__spigoli')
    this.ganci = document.createElementNS(NS, 'path')
    this.ganci.setAttribute('class', 'telaio__ganci')
    this.quote = document.createElementNS(NS, 'g')
    this.quote.setAttribute('class', 'telaio__quote')
    this.radice.append(this.spigoli, this.ganci, this.quote)

    // tre quote: lunghezza, larghezza, altezza. Ognuna e' una linea e un testo
    for (let i = 0; i < 3; i++) {
      const l = document.createElementNS(NS, 'path')
      l.setAttribute('class', 'telaio__quota')
      const t = document.createElementNS(NS, 'text')
      t.setAttribute('class', 'telaio__misura')
      this.quote.append(l, t)
      this.linee.push(l)
      this.testi.push(t)
    }

    for (let i = 0; i < 8; i++) this.vertici.push(new Vector3())
    for (let i = 0; i < 8; i++) this.piani.push({ x: 0, y: 0 })

    dentro.appendChild(this.radice)
  }

  /**
   * MISURA L'INGOMBRO, una volta sola, nello spazio del perno.
   *
   * Non `Box3.setFromObject`, che da' un riquadro allineato al MONDO: mentre il
   * soggetto ruota quel riquadro cambierebbe misura a ogni fotogramma, e le
   * quote ballerebbero. Qui si vuole la scatola dell'OGGETTO, quella che ha
   * senso stampare in metri — quindi ogni pezzo si riporta nel sistema del
   * perno prima di unirlo.
   */
  misura(soggetto: Object3D) {
    soggetto.updateWorldMatrix(true, true)
    const inverso = new Matrix4().copy(soggetto.matrixWorld).invert()
    const dentro = new Matrix4()
    const parziale = new Box3()
    const totale = new Box3()
    totale.makeEmpty()
    soggetto.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh || !m.geometry) return
      // I FARI E LE RUOTE VANNO CONTATI, la piattaforma no: e' un altro
      // oggetto e non entra in scena appesa all'automobile, ma il giorno in
      // cui qualcuno ce l'appende la scatola crescerebbe di tre metri senza
      // che nessuno capisca perche'
      if (m.name.startsWith('PIATTAFORMA')) return
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
      const b = m.geometry.boundingBox
      if (!b) return
      parziale.copy(b)
      parziale.applyMatrix4(dentro.multiplyMatrices(inverso, m.matrixWorld))
      totale.union(parziale)
    })
    if (totale.isEmpty()) return
    this.scatola = totale
    this.soggetto = soggetto

    const d = totale.getSize(new Vector3())
    // L'ASSE LUNGO E' QUELLO PIU' LUNGO, e non si da' per scontato quale sia.
    // Su questo progetto un modello caricato con l'asse sbagliato e' gia'
    // costato una serata: la volante attraversava la strada di traverso perche'
    // il suo asse lungo stava su Z mentre la strada corre su X.
    const q = [d.x, d.y, d.z]
    const lungo = q.indexOf(Math.max(...q))
    this.testi[0].textContent = 'L ' + d.getComponent(lungo).toFixed(2) + ' m'
    this.testi[1].textContent = 'H ' + d.y.toFixed(2) + ' m'
    this.testi[2].textContent = 'W ' + d.getComponent(lungo === 0 ? 2 : 0).toFixed(2) + ' m'
  }

  /**
   * @param regia per sapere in che tempo si e'
   * @param camera per proiettare
   *
   * SI VEDE SOLO NEL PRIMO TEMPO, e si spegne appena si comincia a girare.
   * La scatola dice «questo e' un asset, e queste sono le sue misure»: e' una
   * dichiarazione d'apertura. Tenuta accesa mentre la camera orbita diventa
   * una gabbia intorno al soggetto, cioe' l'opposto — smette di annotare
   * l'automobile e comincia a nasconderla.
   */
  aggiorna(regia: Regia, camera: PerspectiveCamera, dt: number) {
    const vuole = regia.beat === 'hero'
      ? Math.min(Math.max((regia.locale - 0.06) / 0.18, 0), 1) * (1 - Math.min(Math.max((regia.locale - 0.72) / 0.24, 0), 1))
      : 0
    /* LA COMPARSA SEGUE LO SCORRIMENTO, IL SUO RITARDO NO. `vuole` e' gia' una
       funzione di `regia.locale`, quindi la scatola entra ed esce col dito; lo
       smorzamento serve solo a non farla apparire di scatto. Con il movimento
       ridotto quel ritardo diventa la solita coda che continua a pagina ferma,
       e la dissolvenza resta comunque — la fa `vuole`, non il filtro. */
    this.presenza += (vuole - this.presenza) * rincorsa(Math.min(dt * 3.2, 1))
    const acceso = this.presenza > 0.004
    this.radice.style.opacity = acceso ? this.presenza.toFixed(3) : '0'
    if (!acceso || !this.scatola || !this.soggetto) return

    const L = window.innerWidth, A = window.innerHeight
    this.radice.setAttribute('viewBox', '0 0 ' + L + ' ' + A)

    const b = this.scatola
    this.soggetto.updateWorldMatrix(true, false)
    const m = this.soggetto.matrixWorld
    let k = 0
    for (const x of [b.min.x, b.max.x]) {
      for (const y of [b.min.y, b.max.y]) {
        for (const z of [b.min.z, b.max.z]) {
          const v = this.vertici[k]
          v.set(x, y, z).applyMatrix4(m).project(camera)
          this.piani[k].x = (v.x * 0.5 + 0.5) * L
          this.piani[k].y = (-v.y * 0.5 + 0.5) * A
          k++
        }
      }
    }

    // l'ordine dei vertici e' xyz binario: bit 2 = x, bit 1 = y, bit 0 = z.
    // Due vertici sono adiacenti se differiscono di UN bit — cioe' se il loro
    // XOR e' una potenza di due. Dodici coppie, trovate senza tabelle.
    let spigoli = '', ganci = ''
    for (let a = 0; a < 8; a++) {
      for (let c = a + 1; c < 8; c++) {
        const d = a ^ c
        if (d !== 1 && d !== 2 && d !== 4) continue
        const p = this.piani[a], q = this.piani[c]
        spigoli += 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + 'L' + q.x.toFixed(1) + ' ' + q.y.toFixed(1)
        // e il gancio: un pezzo corto vicino a ciascuno dei due estremi. E' il
        // disegno tecnico — uno spigolo intero e' una gabbia, due ganci sono
        // una quotatura
        const gx = (q.x - p.x) * GANCIO, gy = (q.y - p.y) * GANCIO
        ganci += 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + 'L' + (p.x + gx).toFixed(1) + ' ' + (p.y + gy).toFixed(1)
        ganci += 'M' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + 'L' + (q.x - gx).toFixed(1) + ' ' + (q.y - gy).toFixed(1)
      }
    }
    this.spigoli.setAttribute('d', spigoli)
    this.ganci.setAttribute('d', ganci)

    // LE TRE QUOTE stanno sugli spigoli piu' bassi e piu' vicini: sono quelli
    // che non passano mai dietro la carrozzeria, quindi il numero non finisce
    // mai sopra un pezzo di automobile
    this.quotatura(0, 0b000, 0b100)   // lungo X
    this.quotatura(1, 0b000, 0b010)   // in su
    this.quotatura(2, 0b000, 0b001)   // lungo Z
  }

  /** una linea di quota fra due vertici, con il numero a metà e fuori */
  private quotatura(i: number, a: number, c: number) {
    const p = this.piani[a], q = this.piani[c]
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2
    // la quota sta SPOSTATA verso l'esterno rispetto alla scatola, come su un
    // disegno: sovrapposta allo spigolo sarebbe illeggibile
    const dx = q.x - p.x, dy = q.y - p.y
    const n = Math.hypot(dx, dy) || 1
    const ox = (-dy / n) * 16, oy = (dx / n) * 16
    this.linee[i].setAttribute('d',
      'M' + (p.x + ox).toFixed(1) + ' ' + (p.y + oy).toFixed(1) +
      'L' + (q.x + ox).toFixed(1) + ' ' + (q.y + oy).toFixed(1))
    this.testi[i].setAttribute('x', (mx + ox * 1.7).toFixed(1))
    this.testi[i].setAttribute('y', (my + oy * 1.7).toFixed(1))
  }
}
