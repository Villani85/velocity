import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Vector2,
} from 'three'

/**
 * LA RUOTA SI COSTRUISCE, NON SI SCARICA.
 *
 * IL DIFETTO, guardato ingrandito. `ruota.glb` arriva da un generatore e sono
 * 28.700 triangoli di RUMORE: il bordo del pneumatico e' frastagliato invece
 * che circolare, la spalla ondeggia, e il cerchio e' un grumo in cui non si
 * distingue una razza. Il committente: «le ruote fanno schifo». Ingrandendo il
 * provino non c'e' niente da discutere — sembra un sasso, non una gomma.
 * E non e' un problema di materiale: nessuna ruvidita' raddrizza una
 * circonferenza storta. Ci avevo provato tre volte.
 *
 * PERCHE' COSTRUIRLA E' LA SCELTA GIUSTA QUI, e non lo e' quasi mai altrove.
 * Una carrozzeria non si costruisce a mano: e' una superficie libera, e
 * scriverla in codice vorrebbe dire modellare col compilatore. Una RUOTA e'
 * l'opposto — e' un solido di rivoluzione con dentro una simmetria a raggiera.
 * E' fatta di cerchi. Un cerchio scritto in codice e' esatto per costruzione,
 * mentre un cerchio generato da un'intelligenza artificiale e' un poligono
 * che gli somiglia. Su una silhouette contro un fondo chiaro la differenza si
 * vede subito, perche' il bordo di una ruota e' la cosa piu' facile da leggere
 * di tutta l'automobile.
 *
 * E COSTA MENO DI NIENTE: toglie 297 kB dal percorso critico e scende da
 * 28.700 triangoli a poche migliaia. Quattro ruote istanziate facevano da sole
 * 114.000 triangoli contro i 106.000 della carrozzeria — sproporzionato di
 * dieci volte, come aveva notato una revisione esterna.
 *
 * COSA DEVE AVERE, dalla revisione, e adesso c'e':
 *   - razze VERE con profondita', non un disco con una tessitura;
 *   - disco freno e pinza dietro le razze: e' la parallasse fra i due piani a
 *     dare profondita' quando la ruota gira;
 *   - spalla del pneumatico BOMBATA, non cilindrica — una gomma vera si gonfia
 *     fra il cerchio e il battistrada, e quel rigonfiamento e' cio' che la fa
 *     leggere gonfia d'aria invece che tornita nel pieno;
 *   - un dado centrale.
 *
 * GLI ASSI. L'asse del mozzo e' orizzontale e punta verso l'ESTERNO della
 * vettura, cioe' lungo Z; la ruota rotola nel piano X-Y. `LatheGeometry` nasce
 * con l'asse lungo Y, quindi il gruppo va ruotato di 90 gradi intorno a X, e
 * quella e' l'unica rotazione che serve. Sbagliarla non da' errore: da' una
 * ruota di taglio.
 */

/** raggio esterno del pneumatico, in metri veri */
export const RAGGIO_RUOTA = 0.354
/** larghezza del pneumatico da spalla a spalla */
export const LARGHEZZA_RUOTA = 0.215
const LARGHEZZA = LARGHEZZA_RUOTA
/** dove finisce il cerchio e comincia la gomma */
const RAGGIO_CERCHIO = 0.248

const meta = LARGHEZZA / 2

/**
 * IL PROFILO DEL PNEUMATICO, in coordinate (raggio, posizione lungo l'asse).
 *
 * Non e' un rettangolo. Da dentro verso fuori: il tallone stringe sul cerchio,
 * la spalla si GONFIA oltre la larghezza del battistrada, il fianco rientra
 * verso il battistrada, e il battistrada e' quasi piatto. E' quella pancia a
 * meta' altezza a dire «gomma»: un cilindro dice «tornito».
 */
const PROFILO_GOMMA = [
  [RAGGIO_CERCHIO, -meta * 0.86],
  [0.272, -meta * 0.94],
  [0.298, -meta * 1.00],
  [0.322, -meta * 0.99],
  [0.340, -meta * 0.92],
  [0.350, -meta * 0.80],
  [RAGGIO_RUOTA, -meta * 0.62],
  [RAGGIO_RUOTA, meta * 0.62],
  [0.350, meta * 0.80],
  [0.340, meta * 0.92],
  [0.322, meta * 0.99],
  [0.298, meta * 1.00],
  [0.272, meta * 0.94],
  [RAGGIO_CERCHIO, meta * 0.86],
].map(([r, a]) => new Vector2(r, a))

/**
 * IL PROFILO DEL CANALE DEL CERCHIO. Rientra verso il centro e torna a
 * salire: e' quella gola a far leggere «cerchio dentro la gomma» invece che
 * «disco appoggiato sopra».
 */
const PROFILO_CERCHIO = [
  [RAGGIO_CERCHIO, meta * 0.86],
  [RAGGIO_CERCHIO - 0.006, meta * 0.72],
  [0.222, meta * 0.30],
  [0.216, -meta * 0.10],
  [0.224, -meta * 0.55],
  [RAGGIO_CERCHIO - 0.004, -meta * 0.80],
  [RAGGIO_CERCHIO, -meta * 0.86],
].map(([r, a]) => new Vector2(r, a))

export type MaterialiRuota = {
  gomma: MeshStandardMaterial
  cerchio: MeshPhysicalMaterial
  disco: MeshStandardMaterial
  cavita: MeshStandardMaterial
  pinza: MeshStandardMaterial
}

/**
 * Materiali della ruota, in un posto solo.
 *
 * LA GOMMA NON E' NERO PIENO. Un nero assoluto sparisce dentro l'ombra della
 * carena e la ruota perde il bordo; una gomma vera sta intorno al 3-4% di
 * riflettanza. E ha `sheen`, che e' il riflesso radente e morbido del
 * caucciu': senza, la sola ruvidita' alta da' una plastica opaca.
 */
export function materialiRuota(): MaterialiRuota {
  const gomma = new MeshStandardMaterial({ roughness: 0.92, metalness: 0 })
  gomma.color.setRGB(0.030, 0.030, 0.032)
  gomma.envMapIntensity = 0.22
  gomma.name = 'GOMMA_VERA'

  /* IL CERCHIO — alluminio, non cromo. Sul metallo il colore base E' la
     riflettanza: 0,55 e' una lega scura lavorata, 0,90 sarebbe argento
     lucidato. E la ruvidita' resta alta apposta: le sorgenti di questa scena
     sono `RectAreaLight` forti e fredde, e un metallo troppo liscio le
     restituisce come un colpo concentrato — che nel provino leggeva come un
     disco ciano acceso, non come un cerchio. */
  /* METALLICO 0,82 E NON 1,0 — ed e' la ragione per cui i raggi si vedono.
     Dentro il passaruota non arriva nessuna luce diretta, e un metallo PURO
     li' e' nero su nero: non ha componente diffusa, quindi puo' solo
     restituire un ambiente che li' non c'e'. E' lo stesso muro contro cui
     questo file aveva sbattuto la prima volta, e la cura di allora — un
     `MeshBasicMaterial` che emette — dava quattro dischi ciano luminosi.
     Lasciando un 18% di dielettrico il cerchio raccoglie la luce ambiente
     come qualunque superficie opaca, e le razze tornano a leggersi anche in
     ombra. Non e' un trucco: un cerchio verniciato o anodizzato NON e' un
     metallo puro, e il modello a strati di Filament lo tratta cosi'. */
  const cerchio = new MeshPhysicalMaterial({ roughness: 0.45, metalness: 0.82 })
  /* APPENA CALDA, non neutra. Un metallo non ha colore proprio: restituisce
     quello che riceve, e le sorgenti di questa scena sono `RectAreaLight`
     fredde — quindi una lega neutra usciva AZZURRA, e un cerchio azzurro
     legge come plastica verniciata, non come alluminio.
     Non e' un trucco: l'alluminio lavorato ha davvero una punta calda
     (0,91/0,92/0,92 nelle tabelle di Filament, cioe' rosso appena piu' alto
     del blu). Qui la si accentua quel tanto che basta a bilanciare la
     temperatura della chiave. */
  cerchio.color.setRGB(0.655, 0.640, 0.612)
  /* 0,50: dentro il passaruota della vettura NERA la ruota posteriore restava
     un disco senza disegno — «mancano i raggi». L'ambiente e' l'unica luce che
     arriva li' dentro, e la sua intensita' e' il solo modo di farla entrare
     senza tornare a un materiale che emette. */
  cerchio.envMapIntensity = 0.50
  cerchio.name = 'CERCHIO_VERO'

  /* IL DISCO FRENO sta in ombra dietro le razze e non deve competere con
     loro: ghisa scura, quasi opaca. Serve a dare PROFONDITA', non a farsi
     guardare — e' la parallasse fra il piano delle razze e il suo a dire che
     la ruota e' cava. */
  /* IL DISCO NON PUO' ESSERE METALLO PURO, per la stessa ragione del cerchio
     e in modo ancora piu' netto: sta piu' in fondo, quindi di luce diretta ne
     riceve ancora meno. Con metallico 0,90 dentro il passaruota il disco
     diventava un buco nero — c'era, e non si vedeva. Un disco freno in uso e'
     acciaio levigato dalle pastiglie ma coperto di polvere di frenata: circa
     meta' metallo, che e' esattamente cio' che serve perche' raccolga la luce
     ambiente e si legga anche in ombra. */
/* IL DISCO SCENDE A 0,145, e la ragione e' un errore che avevo appena fatto.
     L'avevo schiarito a 0,345 perche' «non si vedeva», e il risultato e' che
     fra le razze e' comparsa una superficie chiara e piatta: il committente
     l'ha letta come vernice bianca, non come un freno. Aveva ragione — un
     disco freno non e' chiaro, e' acciaio sporco di polvere di frenata, e
     quello che lo fa RICONOSCERE non e' la luminosita': e' lo scalino di buio
     fra il suo bordo e il cerchio, e le gole sulla pista.
     Un pezzo dentro una cavita' si legge per CONTRASTO CON CIO' CHE HA
     INTORNO, non per quanto e' acceso. Schiarirlo finche' non si vede vuol
     dire trasformarlo in un tappo chiaro. */
  const disco = new MeshStandardMaterial({ roughness: 0.38, metalness: 0.55 })
  disco.color.setRGB(0.145, 0.148, 0.155)
  disco.envMapIntensity = 0.55
  disco.name = 'DISCO_FRENO'

  /* IL BUIO DEL PASSARUOTA. Quasi nero e completamente opaco: e' l'unica
     superficie di tutta la scena che deve restituire il meno possibile,
     perche' e' cio' che sta dietro a dare profondita' a cio' che sta davanti.
     `side: DoubleSide` perche' la si guarda da tutte e due le parti quando la
     vettura gira. */
  const cavita = new MeshStandardMaterial({ roughness: 0.95, metalness: 0.0, side: DoubleSide })
  cavita.color.setRGB(0.012, 0.012, 0.014)
  cavita.envMapIntensity = 0.05
  cavita.name = 'CAVITA_RUOTA'

  /* LA PINZA e' l'unico pezzo colorato di tutta la vettura, e basta un
     accenno: un rosso scuro che a sessanta pixel legge come «c'e' qualcosa
     di meccanico li' dentro» senza diventare un adesivo. */
  const pinza = new MeshStandardMaterial({ roughness: 0.42, metalness: 0.25 })
  pinza.color.setRGB(0.235, 0.038, 0.030)
  pinza.envMapIntensity = 0.55
  pinza.name = 'PINZA'

  return { gomma, cerchio, disco, cavita, pinza }
}

/**
 * Costruisce una ruota completa, centrata nell'origine, con l'asse lungo Z.
 *
 * @param M i materiali, condivisi fra le quattro ruote
 * @param verso -1 o +1: da che lato della vettura sta, cosi' la faccia bella
 *        del cerchio guarda verso l'esterno
 */
export function costruisciRuota(M: MaterialiRuota, verso: number): Group {
  const g = new Group()

  // il pneumatico
  const gomma = new Mesh(new LatheGeometry(PROFILO_GOMMA, 64), M.gomma)
  // `LatheGeometry` gira intorno a Y; l'asse del mozzo e' Z. Novanta gradi
  // intorno a X portano Y su Z, ed e' l'unica rotazione che serve.
  gomma.rotation.x = Math.PI / 2
  gomma.name = 'GOMMA_VERA'
  g.add(gomma)

  // il canale del cerchio
  const canale = new Mesh(new LatheGeometry(PROFILO_CERCHIO, 48), M.cerchio)
  canale.rotation.x = Math.PI / 2
  canale.name = 'CERCHIO_VERO'
  g.add(canale)

  /* LA FACCIA DEL CERCHIO, e sta INFOSSATA rispetto al bordo del pneumatico.
     Su una ruota vera il battistrada sporge oltre il cerchio: mettendola a
     filo, o peggio in fuori, si ottiene la lettura «moneta appoggiata sulla
     gomma», che e' precisamente il difetto della ruota di segnale che questa
     sostituisce. */
  const faccia = meta * 0.55 * verso

  // il cerchietto esterno, quello che prende la luce di taglio
/* IL LABBRO SI ALLARGA DA 16 A 26 mm, e la ragione e' la distanza.
     Sedici millimetri su una ruota che nel fotogramma della hero e' larga
     sessanta pixel fanno TRE PIXEL: il bordo del cerchio c'era ma non si
     leggeva, e il committente ha visto quello che si vedeva — «hai lasciato
     senza cerchi». Su una ruota vera il labbro e' la parte che prende la luce
     di taglio e disegna il bordo contro il nero della gomma: se sparisce,
     spariscono i cerchi anche se ci sono.
     Ventisei millimetri sono ancora meno del labbro di un cerchio da corsa, e
     bastano a tenere la circonferenza chiusa a questa distanza. */
  const labbro = new Mesh(new RingGeometry(0.222, RAGGIO_CERCHIO - 0.001, 64), M.cerchio)
  labbro.position.z = meta * 0.84 * verso
  labbro.rotation.y = verso < 0 ? Math.PI : 0
  labbro.name = 'CERCHIO_VERO'
  g.add(labbro)

  /* LE RAZZE: SEI SPESSE, NON DIECI SOTTILI — e la prima scelta era sbagliata.
     Avevo scritto che «cinque razze larghe leggono come una stella e su una
     ruota piccola diventano un disco con dei tagli», e ho messo dieci razze da
     26 mm. Nel fotogramma della hero la ruota e' larga SESSANTA PIXEL: dieci
     razze da 26 mm sono meno di due pixel l'una, e a due pixel non esiste
     nessun materiale che le separi dal fondo. Si impastano in un disco
     grigio — e il committente me l'ha detto quattro volte prima che
     smettessi di cercare la causa nel materiale.
     Il ragionamento giusto e' l'opposto: a sessanta pixel si legge quello che
     e' SPESSO E DISTANZIATO. Sei razze da 46 mm sono tre pixel e mezzo l'una,
     con quattro pixel di buio in mezzo — e il buio fra le razze e' cio' che
     le fa vedere, non le razze stesse.
     LEZIONE: un dettaglio non si valuta in millimetri, si valuta in PIXEL alla
     distanza a cui la camera lo mostra. Il resto e' disegno di un oggetto che
     nessuno guardera' mai da li'. */
  const RAZZE = 6
  const lung = 0.230 - 0.052
  for (let i = 0; i < RAZZE; i++) {
    const razza = new Mesh(new BoxGeometry(0.046, lung, 0.034), M.cerchio)
    const ang = (i * Math.PI * 2) / RAZZE
    razza.position.set(
      Math.cos(ang + Math.PI / 2) * (0.052 + lung / 2),
      Math.sin(ang + Math.PI / 2) * (0.052 + lung / 2),
      faccia,
    )
    razza.rotation.z = ang
    razza.name = 'CERCHIO_VERO'
    g.add(razza)
  }

  // il mozzo, e il dado centrale che ci sta sopra
  const mozzo = new Mesh(new CylinderGeometry(0.054, 0.058, 0.052, 24), M.cerchio)
  mozzo.rotation.x = Math.PI / 2
  mozzo.position.z = faccia
  mozzo.name = 'CERCHIO_VERO'
  g.add(mozzo)

  const dado = new Mesh(new CylinderGeometry(0.028, 0.030, 0.026, 6), M.disco)
  dado.rotation.x = Math.PI / 2
  dado.position.z = faccia + 0.030 * verso
  dado.name = 'DISCO_FRENO'
  g.add(dado)

  /* DENTRO LE RAZZE CI DEVE ESSERE MECCANICA, NON VERNICE.
     Il committente, guardando la vettura bianca: «dentro i raggi non si deve
     vedere la vernice ma ingranaggi». Ed era esatto — fra una razza e
     l'altra si vedeva la carrozzeria, perche' il fondo che chiudeva la
     cavita' era un disco chiaro e piatto: leggeva come un tappo, non come
     l'interno di una ruota.
     Quello che si vede dentro un cerchio vero e' una successione di piani a
     profondita' diverse: il disco freno lucido, la campana piu' scura che lo
     porta, la pinza che ne morde il bordo, e dietro tutto il buio del
     passaruota. E' quella SCALA DI PROFONDITA' a leggere «meccanica»; un
     piano solo, a qualunque colore lo si metta, legge «tappo». */

  /* 1. IL BUIO — E' UNA CANNA, NON UN TAPPO.
     Prima era un disco piatto arretrato di dodici centimetri, e chiudeva
     soltanto la vista FRONTALE: guardando la ruota di sbieco — cioe' quasi
     sempre, perche' la camera gira intorno — la linea di vista passava oltre
     il suo bordo e fra le razze ricompariva la carrozzeria. Su una vernice
     chiara era un lampo bianco dentro il cerchio.
     Un tappo chiude un buco; una ruota non e' un buco, e' un VANO. Serve la
     parete laterale: un cilindro aperto che va dal filo del cerchio fino in
     fondo, piu' il fondo stesso. Cosi' non c'e' nessun angolo da cui si veda
     attraverso. */
/* IL RAGGIO DELLA CANNA STA SOTTO IL LABBRO, e sbagliarlo cancella il
     cerchio. Le misure in gioco sono tre e vanno lette insieme: le razze
     arrivano a 0,230, il labbro e' l'anello fra 0,230 e 0,246, e il tallone
     della gomma comincia a 0,248.
     Avevo dato alla canna 0,238 — cioe' IN MEZZO al labbro. Essendo nera gli
     passava sopra e lo spegneva: nel provino le razze finivano nel vuoto e
     fra loro e il pneumatico restava un anello scuro. Il committente:
     «hai lasciato senza cerchi».
     A 0,226 la canna sta tutta dentro il vano, il labbro resta in vista e
     continua a fare il suo mestiere — prendere la luce di taglio, che e' la
     cosa che disegna il bordo del cerchio contro la gomma. */
  const canna = new Mesh(new CylinderGeometry(0.226, 0.226, 0.150, 40, 1, true), M.cavita)
  canna.rotation.x = Math.PI / 2
  canna.position.z = faccia - 0.058 * verso
  canna.name = 'CAVITA_RUOTA'
  g.add(canna)

  const buio = new Mesh(new CylinderGeometry(0.228, 0.228, 0.004, 32), M.cavita)
  buio.rotation.x = Math.PI / 2
  buio.position.z = faccia - 0.130 * verso
  buio.name = 'CAVITA_RUOTA'
  g.add(buio)

  /* 2. IL DISCO FRENO, grande quanto puo': su una vettura cosi' il disco
     riempie quasi tutto il cerchio, ed e' proprio il poco spazio fra il suo
     bordo e il cerchio a dire «freno serio». Lucido, perche' un disco in uso
     e' levigato dalle pastiglie e riflette a specchio sulla pista di
     frenata. */
  const disco = new Mesh(new CylinderGeometry(0.184, 0.184, 0.020, 48), M.disco)
  disco.rotation.x = Math.PI / 2
  disco.position.z = faccia - 0.062 * verso
  disco.name = 'DISCO_FRENO'
  g.add(disco)

  /* 3. LA FASCIA FORATA. Un disco liscio legge come una moneta. I fori non
     si modellano — a questa dimensione sarebbero decine di pezzi per niente:
     si suggeriscono con due gole concentriche, che e' cio' che l'occhio
     riconosce come «disco lavorato» a sessanta pixel di distanza. */
  for (const r of [0.128, 0.164]) {
    const gola = new Mesh(new RingGeometry(r - 0.006, r + 0.006, 48), M.cavita)
    gola.position.z = faccia - 0.062 * verso + 0.011 * verso
    gola.rotation.y = verso < 0 ? Math.PI : 0
    gola.name = 'CAVITA_RUOTA'
    g.add(gola)
  }

  /* 4. LA CAMPANA che porta il disco: piu' scura e piu' avanti, cosi' fra lei
     e il disco si legge uno scalino. */
  const campana = new Mesh(new CylinderGeometry(0.086, 0.078, 0.048, 24), M.cavita)
  campana.rotation.x = Math.PI / 2
  campana.position.z = faccia - 0.030 * verso
  campana.name = 'CAVITA_RUOTA'
  g.add(campana)

  /* 5. LA PINZA. E' il pezzo che rompe la simmetria a raggiera, ed e' per
     questo che si nota: tutto il resto dentro una ruota gira, lei sta ferma.
     Sta a ore due e MORDE il bordo del disco — una pinza che galleggia in
     mezzo non e' una pinza. */
  const pinza = new Mesh(new BoxGeometry(0.052, 0.132, 0.062), M.pinza)
  pinza.position.set(0.072, 0.158, faccia - 0.062 * verso)
  pinza.rotation.z = -0.42
  pinza.name = 'PINZA'
  g.add(pinza)

  g.name = 'RUOTA_COSTRUITA'
  return g
}
