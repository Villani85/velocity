import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three'

import { ALTEZZA_PIATTAFORMA } from './Piattaforma'

/**
 * L'OMBRA DI CONTATTO — cio' che dice «questa cosa TOCCA quella».
 *
 * PERCHE' ESISTE, E CHI L'HA CHIESTA.
 *
 * Tre osservatori indipendenti hanno inciampato nello stesso punto. Il
 * committente: «l'auto non e' sulla piattaforma ma sembra troppo sospesa». Una
 * revisione esterna: «niente contact shadow, l'auto galleggia», attribuendolo
 * pero' alle ruote mancanti. Una seconda revisione: «manca il contatto a
 * terra». Quando tre persone che non si parlano indicano lo stesso punto,
 * quello e' il punto.
 *
 * META' DEL DIFETTO ERA UN NUMERO SBAGLIATO, e si e' curata altrove: la
 * vettura stava tredici centimetri sopra il suo basamento perche' `Modelli.ts`
 * la appoggiava a quota 0,24 con accanto il commento «la piattaforma e' alta
 * ventiquattro centimetri», e la piattaforma nel frattempo era diventata alta
 * undici. Adesso la quota la passa chi la conosce.
 *
 * L'ALTRA META' E' QUESTA, ed e' un difetto che resterebbe anche con la
 * geometria perfetta. Una direzionale con la sua mappa d'ombra c'e' gia' e fa
 * il suo mestiere, ma un'ombra proiettata da UNA sorgente non e' cio' che
 * racconta il contatto: sotto un'automobile vera l'aria e' chiusa, e nessuna
 * luce dell'ambiente ci arriva da nessuna direzione. E' un'occlusione, non
 * un'ombra — e in un motore in tempo reale, senza calcolarla per davvero, la
 * si posa.
 *
 * PERCHE' NON BASTAVA L'OCCLUSIONE DELLO SCHERMO. Il progetto ha gia' una
 * passata GTAO, e non risolve questo caso: l'occlusione in spazio schermo
 * legge le profondita' che VEDE, e sotto la vettura non vede niente — quella
 * e' la zona nascosta per definizione. E' il limite noto della tecnica, non
 * una sua taratura sbagliata.
 *
 * LE TRE COSE CHE LA TENGONO ONESTA.
 *
 *   NON E' UN CERCHIO SFOCATO. Un alone radiale sotto un'automobile e' il
 *   segno con cui si riconosce un configuratore fatto in fretta: le
 *   automobili non sono rotonde. Qui la macchia e' composta da due strati —
 *   una campata larga e debole, che e' la luce d'ambiente che manca in tutta
 *   l'area sotto la vettura, e due chiazze strette e forti alle estremita',
 *   dove le carene scendono quasi a toccare. Sono quelle due, non l'alone, a
 *   dire dove l'oggetto poggia.
 *
 *   GIRA INSIEME ALLA SCENA. Nella hero e' la vettura a girare, non la
 *   camera: un'ombra ferma resterebbe indietro di novanta gradi nel giro di
 *   due beat, ed e' il tipo di difetto che nessuno sa nominare ma che toglie
 *   credibilita' a tutto il resto. Sta nel gruppo `esterno` — che e' quello
 *   che ruota, e che porta con se' anche la piattaforma — e non appesa al
 *   perno della vettura, dove la rotazione si sarebbe sommata due volte.
 *
 *   SPARISCE QUANDO NON SERVE PIU'. Vive nel gruppo dell'esterno, quindi si
 *   spegne insieme a lui quando la camera entra nel faro: un'ombra di contatto
 *   dentro un abitacolo non ha nessun senso, e sarebbe una superficie in piu'
 *   da comporre nel momento in cui il fotogramma costa di piu'.
 */

/** quanto sopra il piano sta la macchia: abbastanza da non lottare con lui */
const STACCO = 0.004

/**
 * LA MACCHIA, disegnata su tela una volta sola.
 *
 * Non e' una texture da scaricare: sono quattro chiamate a un contesto 2D e
 * pesa zero sulla rete, che su questo progetto e' un criterio e non un
 * dettaglio — il percorso critico dell'automobile e' gia' il collo di
 * bottiglia misurato in `strumenti/carico.mjs`.
 *
 * 512 per 256 e non di piu': e' una macchia sfumata, non un disegno. Un
 * gradiente non ha frequenze alte da conservare, quindi la risoluzione in
 * eccesso e' solo memoria video buttata.
 */
function macchia(ruote: Ruota[], L_m: number, A_m: number, pianta: Float32Array | null): CanvasTexture {
  const L = 512
  const A = 256
  const c = document.createElement('canvas')
  c.width = L
  c.height = A
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, L, A)

  // si disegna in BIANCO su nero e si usa il risultato come canale alfa: cosi'
  // il colore resta nero puro e la forma sta tutta nella trasparenza
  const alone = (cx: number, cy: number, rx: number, ry: number, forza: number) => {
    g.save()
    g.translate(cx, cy)
    g.scale(1, ry / rx)
    const r = g.createRadialGradient(0, 0, 0, 0, 0, rx)
    // la caduta non e' lineare: un'occlusione cade in fretta vicino al bordo
    // dell'oggetto e poi si trascina, ed e' quella coda a farla sembrare luce
    // che manca invece che vernice stesa
    r.addColorStop(0, 'rgba(255,255,255,' + forza + ')')
    r.addColorStop(0.45, 'rgba(255,255,255,' + (forza * 0.52).toFixed(3) + ')')
    r.addColorStop(0.78, 'rgba(255,255,255,' + (forza * 0.14).toFixed(3) + ')')
    r.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = r
    g.fillRect(-rx, -rx, rx * 2, rx * 2)
    g.restore()
  }

  g.globalCompositeOperation = 'lighter'

  /* PRIMA DI TUTTO IL RESTO: LA SAGOMA VERA DELLA MINIGONNA.
   *
   * Questo blocco nasce da un difetto che il committente ha segnalato piu'
   * volte e che io ho attribuito due volte all'oggetto sbagliato — «un blocco
   * geometrico grigio sotto la scocca». La prima volta ho abbassato
   * l'emissione della minigonna da 0,95 a 0,12, e serviva; la seconda stavo per
   * abbassarla ancora, e la misura mi ha fermato: su quel pezzo l'emissione
   * pesa 1,2 livelli su 12,9, cioe' il NOVE PER CENTO. Non era lei.
   *
   * Il difetto non e' quanto e' chiara la minigonna: e' che il suo bordo basso
   * e' una LINEA NETTA che finisce su un pavimento a mezza luce. Un profilo
   * duro contro uno sfondo piu' chiaro si legge come un ritaglio incollato, e
   * nessuna taratura del materiale lo cura — perche' il problema non sta nel
   * pezzo, sta in cio' che gli sta SOTTO.
   *
   * E il motivo per cui non stava sotto: l'ombra era un'ellisse morbida
   * disegnata a mano, la minigonna una sagoma misurata sui vertici. Due forme
   * diverse per lo stesso oggetto. Lungo il fianco l'ellisse si spegneva prima,
   * quindi proprio dove il bordo tocca terra il pavimento era ancora acceso.
   *
   * Adesso il buio ha la forma dell'oggetto che lo produce, perche' e' LA STESSA
   * ARRAY — vedi `piantaSottoscocca`. Non si possono piu' scollare.
   *
   * IL DEBORDO E LA SFOCATURA. Il poligono si gonfia del quattro per cento e si
   * sfoca: un'occlusione non finisce dove finisce l'oggetto, e un bordo netto
   * nell'ombra sarebbe lo stesso difetto spostato di dieci centimetri. La tela
   * e' 512 su 5,4 metri, cioe' 94 pixel al metro: sedici pixel di sfocatura
   * sono diciassette centimetri di raccordo.
   *
   * E NON E' NERO PIENO — 0,90. A uno la pedana sparirebbe del tutto sotto la
   * vettura e il basamento diventerebbe un buco: si perderebbe il riflesso, che
   * e' l'altra meta' di quello che dice «appoggia». */
  if (pianta && pianta.length > 2) {
    const S = pianta.length
    g.save()
    /* VENTISEI PIXEL E NON SEDICI, cioe' ventotto centimetri di raccordo.
       Con sedici il pavimento sotto il bordo scendeva da 46,8 a 40,8 — un calo
       vero ma inutile, perche' il bordo restava a 3,4 volte il pezzo che gli
       sta sopra e la linea si vedeva ancora. La coda va misurata su QUANTO
       PAVIMENTO SI VEDE, non su quanto e' larga la vettura: sotto il brancardo
       l'occhio ne prende una trentina di centimetri, e una coda piu' corta di
       quella lascia scoperto proprio il pezzo che conta. */
    g.filter = 'blur(26px)'
    g.beginPath()
    for (let k = 0; k <= S; k++) {
      const j = k % S
      const ang = (j / S) * Math.PI * 2 - Math.PI
      const r = pianta[j] * 1.10
      const px = ((Math.cos(ang) * r + L_m / 2) / L_m) * L
      const py = ((Math.sin(ang) * r + A_m / 2) / A_m) * A
      if (k === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.closePath()
    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.fill()
    g.restore()
  }

  // la campata: tutta l'aria chiusa sotto la vettura
  /* PIU' FITTA E PIU' STRETTA DI PRIMA, e la ragione e' la stessa del
     sottoscocca: a qualita' media la pedana non riflette quasi niente, e questa
     macchia resta l'UNICA cosa che dice «tocca». Quando c'era anche il riflesso
     poteva essere discreta; da sola deve fare tutto il lavoro. */
  alone(L * 0.5, A * 0.5, L * 0.42, A * 0.26, 0.82)
  // e i due appoggi, dove le carene scendono: sono queste a dire «tocca»
  alone(L * 0.255, A * 0.5, L * 0.115, A * 0.145, 0.98)
  alone(L * 0.745, A * 0.5, L * 0.115, A * 0.145, 0.98)

  /* L'IMPRONTA, UNA PER GOMMA — ed e' una cosa diversa dagli aloni qui sopra.
     Quelli sono l'aria chiusa sotto la vettura: larghi, morbidi, sulla
     mezzeria. La revisione esterna chiede l'opposto e ha ragione: «non una
     grande ombra sfocata, una piccola zona quasi nera immediatamente sotto le
     gomme». E' il gradiente stretto a dire «appoggia»; quello largo dice solo
     «c'e' qualcosa sopra».
     Le posizioni non sono scelte: arrivano da `trovaArchi`, le stesse su cui
     sono montate le ruote. Se le due cose divergessero il contatto sarebbe
     peggio che assente — sarebbe SBAGLIATO, e un'ombra fuori posto si nota
     molto piu' di un'ombra che manca.
     La mappatura dal mondo alla tela: il piano e' ruotato di -90 gradi intorno
     a X, quindi la sua x locale e' la lunghezza (X del mondo) e la riga 0
     della tela cade sul bordo a Z negativo. */
  for (const r of ruote) {
    const cx = ((r.x + L_m / 2) / L_m) * L
    const cy = ((r.z + A_m / 2) / A_m) * A
    if (cx < 0 || cx > L || cy < 0 || cy > A) continue
    // il nucleo: quasi nero, grande quanto l'impronta vera di un pneumatico
    alone(cx, cy, (0.15 / L_m) * L, (0.11 / A_m) * A, 1.0)
    // e un raccordo appena piu' largo, perche' un'occlusione non ha un bordo
    alone(cx, cy, (0.34 / L_m) * L, (0.26 / A_m) * A, 0.42)
  }

  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * @param lunghezza la lunghezza vera della vettura, in metri
 * @param larghezza la sua larghezza vera, in metri
 */
export type Ruota = { x: number; z: number }

export function ombraDiContatto(
  lunghezza: number,
  larghezza: number,
  ruote: Ruota[] = [],
  /** la pianta misurata della vettura: e' la stessa che costruisce la minigonna */
  pianta: Float32Array | null = null,
): Mesh {
  const L_m = lunghezza * 1.20
  const A_m = larghezza * 1.62
  const t = macchia(ruote, L_m, A_m, pianta)
  const m = new MeshBasicMaterial({
    color: 0x000000,
    // la tela porta la forma nell'alfa: `alphaMap` legge il canale verde, che
    // qui coincide con gli altri due perche' la macchia e' disegnata in grigio
    alphaMap: t,
    transparent: true,
    // non scrive in profondita': e' un velo appoggiato, e un velo che pianta un
    // muro nel buffer si paga nelle passate che leggono le profondita'
    depthWrite: false,
    // e non riceve il tone mapping: e' una MASCHERA, non una superficie
    // illuminata. Passandola per la curva ACES la macchia si schiarirebbe
    // proprio dove deve essere piu' fitta.
    toneMapped: false,
    fog: false,
  })
  // deborda oltre l'ingombro perche' un'occlusione non finisce dove finisce
  // l'oggetto: si trascina intorno, ed e' quella coda a leggere come aria e
  // non come adesivo
  const mesh = new Mesh(new PlaneGeometry(L_m, A_m), m)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = ALTEZZA_PIATTAFORMA + STACCO
  mesh.name = 'OMBRA_CONTATTO'
  mesh.renderOrder = 2
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}
