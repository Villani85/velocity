import { PerspectiveCamera, Vector3 } from 'three'

import { morbido, type Regia } from '../core/Regia'
import { AUTO } from '../scene/Esterno'
import { Attraversamento, SOGLIA } from './Attraversamento'

/**
 * LA COREOGRAFIA.
 *
 * RUOTA LA CAMERA, NON L'AUTO (decisione D1). `auto.rotation.y += scroll`
 * produce un configuratore: l'oggetto si esibisce e tu stai fermo. La
 * camera che percorre un oggetto immobile produce uno spot: sei tu che ti
 * muovi. E' la stessa scena e sono due film diversi.
 *
 * Ne vengono gratis tre cose che altrimenti andrebbero finte: i riflessi
 * che scorrono sulla carrozzeria, la parallasse fra auto e ambiente, e il
 * fatto che l'auto abbia un davanti e un dietro invece di essere un
 * oggetto che ruota.
 *
 * OGNI BEAT PARTE DA DOVE IL PRECEDENTE HA LASCIATO.
 *
 * Le pose sono una catena, non sei calcoli indipendenti. Nel progetto
 * precedente ogni scena ricalcolava la propria posa da zero, e ai confini
 * la camera SALTAVA: era quello a far sembrare il racconto una sequenza di
 * scene invece che un movimento solo. Qui la posa finale di un beat e' per
 * costruzione la posa iniziale del successivo.
 */

const _a = new Vector3()
const _b = new Vector3()

/** le pose chiave, in metri. Cambiare qui cambia il film. */
export const POSE = {
  /**
   * L'ALTEZZA DELLA CAMERA E' LA COSA PIU' IMPORTANTE DI QUESTO FILE.
   *
   * Erano 2,15 e 1,98 metri: l'altezza di una persona in piedi. Da li'
   * un'auto la si guarda DALL'ALTO, si vede il tetto, e qualunque
   * carrozzeria — anche fotografata benissimo — sembra un modellino su un
   * tavolo. E' il difetto che rende «render» tutte le scene 3D di auto
   * fatte senza pensarci.
   *
   * Le fotografie di automobili si fanno a 90 centimetri, cioe' poco sopra
   * il tetto della vettura: l'orizzonte cade sul parabrezza, il cofano si
   * allunga, e l'oggetto guarda in faccia chi lo guarda. Non e' un vezzo
   * da fotografo — e' l'unica altezza da cui un'auto sembra grande.
   *
   * Costa zero e cambia piu' di quanto abbia cambiato raddoppiare le
   * tessiture.
   */
  /**
   * L'AUTOMOBILE DEVE RIEMPIRE IL FOTOGRAMMA.
   *
   * Il raggio scende da 8,15 metri a 6,70. Alla prima prova ero andato a 5,55 e
   * l'automobile usciva dal fotogramma da tutte e due le parti — il muso
   * tagliato a sinistra, la coda a destra. Non e' «piu' vicino e' meglio»: e'
   * che il soggetto deve arrivare a occupare circa la meta' della larghezza e
   * avere ancora aria intorno. A 6,70 ci sta, e sullo schermo passa dal
   * trentadue al quarantotto per cento della larghezza. Non e' un ritocco — e' la differenza fra «c'e' un'automobile
   * nella scena» e «questa e' un'automobile».
   *
   * Il committente l'ha detto mostrando un fotomontaggio: la stessa scena, la
   * stessa luce, la stessa composizione, e l'auto grande. La prima cosa che si
   * nota non e' nessuno dei dettagli su cui ho lavorato per giorni: e' quanto
   * spazio occupa il soggetto.
   *
   * L'ALTEZZA SCENDE ANCORA, da 0,92 a 0,80. La regola resta quella di §5 — si
   * fotografa un'automobile poco sopra il tetto — ma avvicinandosi l'angolo di
   * scorcio si apre, e per tenere l'orizzonte sul parabrezza bisogna scendere
   * insieme. Restando a 0,92 da cinque metri e mezzo si tornerebbe a guardarla
   * dall'alto, che e' esattamente il difetto da cui quella regola nasce.
   */
  heroDa: new Vector3(5.609, 0.9, 4.434),
  heroA: new Vector3(5.256, 0.84, 4.155),
  /**
   * L'orbita in coordinate polari: angolo, raggio, altezza.
   *
   * IL PUNTO DI PARTENZA NON E' SCELTO: E' `heroA` RISCRITTO IN POLARI.
   *
   * Prima era (0,72 · 8,6), che cade a 41 cm da dove la hero lascia la
   * camera. Quei 41 cm la camera doveva recuperarli mentre gia' orbitava, e
   * il misuratore di continuita' li ha visti come uno strappo: 9,5 volte la
   * mediana dei fotogrammi vicini, proprio sul confine fra i due beat.
   *
   * Il file dice da sempre che «ogni beat parte da dove il precedente ha
   * lasciato». Lo dicevo e non lo facevo: c'era un rattoppo — una fusione
   * verso heroA nel primo 18% — che mascherava lo scarto invece di
   * toglierlo. Adesso i due punti COINCIDONO, e non c'e' niente da fondere.
   */
  orbitaDa: { ang: 0.6690, raggio: 6.7000, alt: 0.84 },
  orbitaA: { ang: 2.62, raggio: 5.1, alt: 1.02 },
  latoA: new Vector3(0.98, 1.30, 2.42),
  /**
   * Il punto in cui il montante riempie l'obiettivo. NON e' scelto a
   * occhio, si misura con strumenti/occlusione.mjs.
   *
   * TROVATO SCANDAGLIANDO, e il risultato smentisce il nome che ho dato
   * a questa transizione.
   *
   * Ero partito da (0.68, 1.00, 0.88): 95% di copertura, restava un cuneo
   * chiaro in basso. Ho dedotto che il montante fosse fuori campo — a 14 cm
   * di lato e 6 avanti sono sessantasette gradi fuori asse — e l'ho
   * spostato "sull'asse dello sguardo", a (0.74, 0.99, 0.74). La copertura
   * e' SCESA al 66%. Il ragionamento era pulito e la conclusione sbagliata.
   *
   * Allora ho provato sedici posizioni invece di dedurne una
   * (strumenti/scandaglio.mjs), e il quadro e' chiaro: conta la z, non la
   * x. A z 0,86-0,92 si sta sopra il 98% qualunque sia la x; a z 0,74 non
   * si supera il 72%.
   *
   * E z 0,92 e' FUORI dalla carrozzeria, che a meta' e' larga 0,99. Quindi
   * a chiudere il fotogramma non e' il montante: e' il FIANCO dell'auto,
   * che la camera sfiora passandogli accanto. Il montante ci mette la sua
   * parte, ma il grosso lo fa la lamiera — ed e' un'informazione che vale,
   * perche' vuol dire che la transizione reggera' anche con un'auto vera
   * che il montante ce l'ha in un altro posto.
   */
  tagliMezzo: new Vector3(0.70, 0.99, 0.90),
  occhi: new Vector3(AUTO.occhi.x, AUTO.occhi.y, AUTO.occhi.z),
}

const MIRA_AUTO = new Vector3(0, 0.62, 0)

/**
 * QUANTO LA MIRA SI SPOSTA DI LATO NELLA HERO, e perche' e' un metro e sette.
 *
 * MISURATO, non deciso. `strumenti/collisioni.mjs` ricava la sagoma vera
 * dell'automobile nascondendola e guardando quali pixel cambiano — quindi
 * segue la forma, non un riquadro disegnato a mano — e poi conta quanta parte
 * di ogni testo ci cade sopra. Il verdetto era: il TRENTUNO virgola quattro
 * per cento del titolo sta sopra la carrozzeria.
 *
 * E' il numero che sta sotto a due giudizi esterni indipendenti — «la fascia
 * taglia la carrozzeria e collide con l'headline», «l'occhio non sa quale sia
 * il protagonista» — e sotto al fatto, misurato anche quello, che il blocco
 * dei testi e' ancorato al margine destro (bordo a 1122) mentre la coda
 * dell'automobile arriva a 941: fra i due restano 181 px, e nessuna riduzione
 * di corpo tipografico ci fa stare tre righe di titolo. Rimpicciolire il testo
 * non poteva funzionare, e infatti provato non funzionava: il blocco si
 * stringe verso destra ma il suo bordo sinistro resta dentro l'automobile.
 *
 * Quindi si sposta il SOGGETTO. Spostare la mira verso destra fa scorrere
 * l'automobile verso sinistra, e apre la colonna dove il testo gia' vive.
 * Il conto: campo orizzontale 57,7 gradi su 1200 px fa 20,8 px per grado, i
 * 178 px che servono sono 8,56 gradi, e a 7,15 m di distanza sono 1,076 m.
 *
 * E SI RIASSORBE GIRANDO. Nel beat `orbita` il soggetto e' l'automobile e
 * basta, i testi si accorciano, e una vettura fuori asse mentre gira non ha
 * piu' nessuna ragione di esserlo: lo scostamento scende a zero lungo tutto
 * quel tempo, cosi' il ritorno al centro e' un movimento della scena e non uno
 * scatto al cambio di beat.
 */
const SCOSTA_HERO = 1.48

/**
 * QUANTO L'AUTO SCENDE NEL FOTOGRAMMA — richiesta ripetuta piu' volte: «devi
 * spostarla piu' a centro ovvero verso l'angolo in basso a sinistra».
 *
 * MISURATO PRIMA DI TOCCARE NIENTE. Il centro proiettato dell'automobile
 * stava a y=366 su un'altezza di 750, cioe' NOVE pixel sopra il centro
 * geometrico dello schermo (375): visivamente centrata in verticale, non in
 * basso. Lo spostamento orizzontale (`SCOSTA_HERO`) l'aveva gia' portata a
 * sinistra per liberare il titolo, ma in verticale non si era mai toccato
 * niente: da qui il giudizio «non e' al centro della piattaforma», che era
 * la lettura giusta di un fatto vero — mancava meta' dello spostamento.
 *
 * SI ALZA IL PUNTO GUARDATO, non si abbassa la camera. Il punto che la camera
 * guarda finisce (circa) al centro dello schermo per costruzione: se quel
 * punto sta piu' in alto dell'automobile, l'automobile scende sotto il centro.
 * E' lo stesso principio di `SCOSTA_HERO` applicato all'asse verticale invece
 * che a quello orizzontale.
 */
const ALZA_HERO = 0.62

/**
 * Sposta la mira di `quanto` metri lungo il versore «destra» dell'inquadratura.
 * Si ricava dalla direzione di vista vera invece che da una costante, cosi'
 * resta giusto anche se un giorno la posa della hero cambia angolo.
 */
/**
 * QUANTO VALE LO SCOSTAMENTO SU QUESTO SCHERMO — zero su un telefono.
 *
 * Lo scostamento esiste per una ragione sola: sul desktop il blocco dei testi
 * sta A FIANCO dell'automobile, ancorato al margine destro, e le due cose si
 * pestavano. Su uno schermo verticale quel blocco non sta a fianco: sta SOTTO.
 * Non c'e' nessuna colonna da liberare, e spostare il soggetto di un metro e
 * mezzo su un campo orizzontale stretto — il campo verticale e' fisso, quindi
 * piu' lo schermo e' stretto piu' quel metro pesa in gradi — porta il muso
 * fuori dall'inquadratura. Misurato guardando la tavola di
 * `strumenti/telefono_giro.mjs`: a 390 di larghezza l'automobile usciva dal
 * bordo sinistro. E' un difetto che ho introdotto io correggendone un altro,
 * ed e' il motivo per cui una correzione va sempre riguardata su tutti e due i
 * formati e non solo su quello dove nasce.
 */
export function quantoDiLato(aspetto: number) {
  return Math.min(Math.max((aspetto - 1.05) / 0.45, 0), 1)
}

function diLato(camera: PerspectiveCamera, mira: Vector3, quanto: number) {
  quanto *= quantoDiLato(camera.aspect)
  if (quanto === 0) return
  const dx = mira.x - camera.position.x
  const dz = mira.z - camera.position.z
  const n = Math.hypot(dx, dz) || 1
  mira.x += (-dz / n) * quanto
  mira.z += (dx / n) * quanto
}
const MIRA_GUIDA = new Vector3(-0.30, 1.00, 0.42)
/** la mira dell'interno: la esporta anche `core/Esperienza` per posare la
 *  camera del bersaglio dell'iride esattamente come sara' un istante dopo */
export const MIRA_AVANTI = new Vector3(AUTO.occhi.x + 12, 1.6, AUTO.occhi.z * 0.2)

function polare(ang: number, raggio: number, alt: number, out: Vector3) {
  return out.set(Math.cos(ang) * raggio, alt, Math.sin(ang) * raggio)
}

/**
 * L'attraversamento, quando c'e'. Lo inietta `Esperienza` appena l'ottica e'
 * innestata: la regia non lo costruisce e non lo possiede, perche' dipende
 * da dove il modello ha messo il faro — cioe' da un asset che si rigenera.
 */
export let ATTRAVERSAMENTO: Attraversamento | null = null
export function collegaAttraversamento(a: Attraversamento) { ATTRAVERSAMENTO = a }

/** dove finisce l'avvicinamento e comincia il risucchio, dentro il beat */
const AVVICINA = 0.38
/**
 * Quanti raggi di bocca si percorrono dentro il corridoio.
 *
 * 2,45 e non 3,1, e il numero viene dalla lunghezza VERA della canna: 0,304
 * metri di ottica diviso 0,107 di raggio fanno 2,84 raggi. A 3,1 la camera
 * usciva dal fondo dell'abside e l'ultimo fotogramma del beat era NERO
 * PIENO — nel provino si vede, ed e' il difetto peggiore possibile proprio
 * li', perche' un nero e' esattamente cio' che il progetto ha giurato di non
 * fare mai (regola 3).
 *
 * A 2,45 la corsa si ferma all'86% della canna, con l'abside che riempie il
 * fotogramma. Ed e' anche il posto giusto per il secondo scambio: quando una
 * superficie copre tutto il quadro, dietro si puo' cambiare il mondo.
 *
 * PER UN GIRO IL VALORE E' STATO 2,10 mentre il commento diceva 2,45: avevo
 * abbassato il numero per allontanarmi dal fondo nero e non avevo toccato le
 * quattordici righe che spiegavano l'altro. Un commento che contraddice la
 * riga sotto e' peggio di nessun commento — perche' il prossimo che rimette
 * mano ai numeri crede al commento. Il valore giusto era quello scritto qui:
 * il fotogramma nero veniva da 3,10, non da 2,45.
 */
// 3,40 E NON 2,45, e il numero viene da un conto sull'occlusione.
//
// A 2,45 la corsa si fermava al 63% della canna, con l'abside ancora a
// SEDICI METRI: non copriva il fotogramma, quindi lo scambio con l'abitacolo
// avveniva su un'immagine ricca di dettaglio e si vedeva — differenza 49 su
// una mediana di 3.
//
// Ho provato anche 3,40, per arrivare DENTRO la parabola e usarla come
// superficie che copre. E' andata peggio: entrando nella calotta il
// fotogramma cambia in fretta — una superficie curva a specchio vista da
// dentro si trasforma a ogni centimetro — e la differenza e' salita a 76.
//
// La risposta giusta non era una superficie che copre: e' cio' che succede
// davvero avanzando in un'ottica. La lampada sta al 70% della canna, e oltre
// quel punto SI E' DIETRO LA LUCE: la parte finale del riflettore non e'
// illuminata da niente, perche' non c'e' niente che possa illuminarla.
//
// Quindi il fotogramma si spegne da solo, per una ragione fisica, e non
// perche' qualcuno abbia messo una dissolvenza. E si arriva nell'abitacolo al
// buio — che e' anche il posto giusto da cui far cominciare un'accensione.
// 2,90 e' la corsa che porta appena oltre la lampada.
/**
 * QUANTO SI ENTRA DENTRO LA GALLERIA, in raggi di bocca.
 *
 * 1,55 e non 2,90. A 2,90 la camera arrivava a ridosso del fondo, e il fondo di
 * un tubo e' una parete: nel filmato erano tre secondi di campo beige uniforme,
 * il difetto peggiore di tutto il sito perche' cadeva subito dopo il momento
 * migliore.
 *
 * A 1,55 la camera resta nel tratto dove le coste scorrono ai lati — che e'
 * l'unica cosa che dice «sto attraversando» — e da li' in poi a chiudere il
 * fotogramma ci pensa l'iride di luce (vedi `Attraversamento.iride`) invece
 * della geometria.
 *
 * E' la stessa lezione di sempre in questo progetto: quando un'inquadratura non
 * ha piu' niente da mostrare, la risposta non e' illuminarla meglio. E' non
 * farci arrivare la camera.
 */
const PROFONDO = 1.55

const _d = new Vector3()
const _e = new Vector3()

/**
 * QUANTO E' GIRATO IL SOGGETTO, in radianti.
 *
 * Il motore la legge dopo `inquadra` e la applica al gruppo dell'esterno —
 * auto, ottiche, ruote insieme. Sta qui e non nella scena perche' e' una
 * decisione di REGIA: e' il movimento che sostituisce l'orbita della camera.
 */
export let rotazioneScena = 0

/** quanto ha girato alla fine dell'orbita, e quanto alla fine del lato */
/* IL VERSO DELL'AUTOMOBILE NON SI TOCCA DA QUI, e c'e' voluto un metro
   sbagliato per impararlo.
   Ho provato a spostare qui la rotazione del modello — mezza rotazione alla
   hero, tolta dall'orbita — convinto da una misura che diceva che il muso e la
   coda erano dalla parte sbagliata. Quella misura leggeva `AUTO_VERA`, che e'
   il PERNO: la rotazione del modello (`rotY` in `scene/Modelli.ts`) sta su un
   nodo figlio, quindi il perno non la porta e la matrice che leggevo non
   cambiava mai. Misuravo un nodo che non ruota.
   Il verso giusto lo stabilisce `rotazioneAuto` in `core/Esperienza.ts`, e si
   verifica guardando quale pezzo e' piu' vicino alla camera nei beat in cui si
   ENTRA — perche' da li' si entra. */
const ROTAZIONE_ORBITA = 1.951
const ROTAZIONE_FINE = 2.34

export function inquadra(camera: PerspectiveCamera, regia: Regia, velocita: number) {
  rotazioneScena = 0
  const t = morbido(regia.locale)
  const mira = _b.copy(MIRA_AUTO)

  switch (regia.beat) {
    case 'hero':
      // fermo, quasi. Il movimento c'e' ma non si nota: serve a dire che la
      // scena e' viva prima ancora che succeda qualcosa.
      camera.position.lerpVectors(POSE.heroDa, POSE.heroA, t)
      camera.fov = 38
      diLato(camera, mira, SCOSTA_HERO)
      mira.y += ALZA_HERO
      break

    case 'orbita': {
      // LA CAMERA NON GIRA PIU' INTORNO ALL'AUTO: E' L'AUTO CHE GIRA.
      //
      // E' il rovesciamento della decisione D1, ed e' la fotografia a
      // imporlo. Il luogo adesso e' uno scatto a 360 gradi, e una fotografia
      // e' esatta sotto ROTAZIONE della camera e sbagliata sotto
      // TRASLAZIONE: non ha profondita', quindi non puo' mostrare parallasse.
      //
      // Spostando la camera di tre metri, il fondale restava incollato dov'era
      // mentre l'auto si spostava — e il giudizio e' stato preciso: «l'auto si
      // sposta, sembra volare». Non era un difetto dell'auto: era il fondale
      // che non la seguiva.
      //
      // Tenendo ferma la camera e girando il soggetto, la parallasse mancante
      // non esiste piu' come problema: non c'e' nessuna traslazione da
      // rappresentare. Ed e' esattamente come si fotografano le automobili in
      // studio — la macchina su una piattaforma girevole, l'obiettivo sul
      // cavalletto. Non e' un ripiego: e' il gesto di mestiere che
      // corrisponde a questa scelta di fondale.
      //
      // Il timore che sia «un configuratore» — la ragione per cui avevo
      // deciso il contrario — resta valido solo se l'oggetto gira e basta.
      // Qui la camera non e' immobile: scende, si avvicina, allunga la
      // focale. E' un movimento di macchina, e ne conserva il peso.
      // si parte ESATTAMENTE dove finiva la hero e si arriva
      // esattamente dove comincia il lato: le due giunzioni non si vedono
      // perche' non esistono.
      // L'ANGOLO NON MUOVE PIU' LA CAMERA: alimenta `rotazioneScena`, che il
      // motore applica al gruppo dell'esterno. La camera conserva solo il
      // raggio e la quota, cioe' l'avvicinamento e la discesa.
      const rag = POSE.orbitaDa.raggio + (POSE.orbitaA.raggio - POSE.orbitaDa.raggio) * t
      const alt = POSE.orbitaDa.alt + (POSE.orbitaA.alt - POSE.orbitaDa.alt) * t
      polare(POSE.orbitaDa.ang, rag, alt, _a)
      camera.position.copy(_a)
      rotazioneScena = (POSE.orbitaA.ang - POSE.orbitaDa.ang) * morbido(t)
      // la focale si allunga mentre ci si avvicina: e' il modo in cui uno
      // spot fa sembrare un'auto piu' bassa e piu' larga di quanto sia
      camera.fov = 38 - 6 * t
      // e lo scostamento della hero si riassorbe girando: vedi `SCOSTA_HERO`
      diLato(camera, mira, SCOSTA_HERO * (1 - morbido(t)))
      mira.y += ALZA_HERO * (1 - morbido(t))
      break
    }

    case 'lato': {
      // la rotazione del soggetto CONTINUA da dove l'orbita l'ha lasciata e
      // si ferma qui: da `taglio` in poi la camera entra nell'ottica, e li'
      // ogni millimetro conta — l'auto deve stare ferma.
      // LA ROTAZIONE FINISCE A META' BEAT, non alla fine.
      //
      // Da li' in poi la camera comincia a puntare il faro, e il faro deve
      // stare fermo: se il soggetto ruota ancora mentre ci si avvicina, il
      // bersaglio scivola e l'avvicinamento diventa un inseguimento.
      rotazioneScena = ROTAZIONE_ORBITA
        + (ROTAZIONE_FINE - ROTAZIONE_ORBITA) * morbido(Math.min(t / 0.5, 1))
      polare(POSE.orbitaDa.ang, POSE.orbitaA.raggio, POSE.orbitaA.alt, _a)

      // E IL BEAT FINISCE DOVE COMINCIA L'AVVICINAMENTO, non su una posa
      // scritta a mano.
      //
      // `POSE.latoA` era stata trovata quando la camera orbitava: adesso che
      // gira il soggetto, quella posizione cade sul fianco sbagliato e il
      // fotogramma e' una massa scura senza soggetto riconoscibile — si vede
      // nel provino del terzo tempo.
      //
      // Facendo finire il beat esattamente sulla posa da cui `taglio`
      // comincia, la giunzione non si vede perche' non esiste: e' lo stesso
      // principio con cui l'orbita parte dove finisce la hero. E in piu' la
      // posa non e' piu' un numero da ritarare a ogni cambio di coreografia —
      // e' calcolata dall'ottica, quindi segue il faro dovunque vada.
      if (ATTRAVERSAMENTO?.pronto) {
        ATTRAVERSAMENTO.posa(camera, 8.0, false, _d)
        _e.copy(camera.position)
        // L'AVVICINAMENTO STA INDIETRO E POI CROLLA, e non e' un vezzo.
        //
        // Con `morbido(t)` la corsa era distribuita: a meta' beat la camera
        // stava gia' a due metri dalla bocca, e negli ultimi tre decimi
        // arrivava a cinquanta centimetri. Cioe' per un terzo del beat il
        // fotogramma era lamiera fuori fuoco a distanza di braccio — nel
        // provino si legge come una macchia azzurra, non come un'automobile.
        //
        // Elevando al cubo, la camera resta a distanza leggibile fino al
        // settanta per cento — si vede la fiancata, il muso, il faro che
        // diventa il punto verso cui si va — e crolla dentro alla fine.
        //
        // E' anche piu' vero: un risucchio non e' un avvicinamento uniforme.
        // Quello che si vuole raccontare qui e' che la forma ti PORTA dentro,
        // e portare vuol dire prima mostrare dove, poi andarci.
        const dentro = morbido(t)
        camera.position.lerpVectors(_a, _e, dentro * dentro * dentro)
        mira.lerp(_d, morbido(Math.max((t - 0.35) / 0.65, 0)))
        camera.fov = 32 - 4 * t
        break
      }
      camera.position.lerpVectors(_a, POSE.latoA, t)
      // lo sguardo si sposta dall'auto intera al posto di guida: e' lo
      // sguardo a dichiarare dove stiamo andando, prima che ci si arrivi
      mira.lerp(MIRA_GUIDA, morbido(Math.min(t * 1.4, 1)))
      camera.fov = 32 - 4 * t
      break
    }

    case 'taglio': {
      rotazioneScena = ROTAZIONE_FINE
      // L'ATTRAVERSAMENTO. Tre tratti, e il secondo e' il momento del sito.
      //
      //   0,000 - 0,380   ci si porta davanti alla lente e la si punta
      //   0,380 - 0,625   la lente riempie il quadro; a 0,625 lo scambio
      //   0,625 - 1,000   si percorre il corridoio, che e' la stessa ottica
      //                   moltiplicata per centoquindici
      //
      // La mappa diceva «a 0,50 lo scambio» ed era rimasta dalla prima
      // stesura: 0,50 e' proprio il valore che una misura ha poi scartato
      // (vedi in fondo al file). Un commento superato messo dove uno lo legge
      // per primo e' peggio di nessun commento.
      //
      // Qui la camera NON viene piu' posata per interpolazione fra due punti
      // scritti a mano: la posa la calcola `Attraversamento`, in raggi di
      // bocca, perche' e' quella l'unita' in cui le due scale coincidono.
      // Vedi `transizioni/Attraversamento.ts`.
      if (!ATTRAVERSAMENTO || !ATTRAVERSAMENTO.pronto) {
        // ripiego finche' l'ottica non e' caricata: si resta fermi sul lato
        // invece di saltare al posto di guida, che sarebbe uno stacco
        camera.position.copy(POSE.latoA)
        mira.copy(MIRA_GUIDA)
        // anche il ripiego parte da 28, per la stessa ragione
        camera.fov = 28
        break
      }
      const A = ATTRAVERSAMENTO
      camera.fov = 40
      if (t < SCAMBIO_A) {
        // TUTTO IL TRATTO E' RISUCCHIO, non c'e' piu' un avvicinamento.
        //
        // Prima il beat cominciava con una curva che portava la camera dal
        // fianco fino all'asse dell'ottica. Adesso ci arriva gia' il beat
        // precedente — `lato` finisce esattamente su `posa(8.0)` — quindi
        // quella curva sarebbe un movimento che parte da dove e' gia'
        // arrivato: nel migliore dei casi non fa niente, nel peggiore
        // introduce uno scarto proprio sulla giunzione.
        //
        // Togliendola si guadagna anche tempo di scena: il risucchio, che e'
        // la parte che conta, ha tutto il beat invece di sei decimi.
        //
        // La velocita' cresce col quadrato: un avvicinamento a velocita'
        // costante legge come uno zoom meccanico, mentre quello che serve e'
        // la sensazione di essere tirati dentro.
        const q = t / SCAMBIO_A
        A.posa(camera, 8.0 + (SOGLIA - 8.0) * (q * q), false, mira)
        camera.fov = 28 + 12 * q
        // prima di entrare l'iride e' spenta: senza questo azzeramento
        // esplicito si porta dietro il valore dell'ultimo passaggio, e chi
        // torna indietro con lo scorrimento si ritrova il fotogramma bianco
        A.agganciaIride(camera)
        A.iride(0)
        break
      }
      // OLTRE LO SCAMBIO: stesso conto, altro mondo. La `u` prosegue senza
      // salti da SOGLIA verso l'interno; e' solo la scala a essere cambiata,
      // e la scala non si vede.
      const q = (t - SCAMBIO_A) / (1 - SCAMBIO_A)
      // LA CORSA RALLENTA, non accelera.
      //
      // `morbido` (uno smoothstep) parte piano, corre e frena: dentro il
      // corridoio il tratto veloce cade a meta', dove le coste sono piu'
      // fitte, e si perdono. Con l'esponente 0,72 la camera entra decisa —
      // porta con se' la velocita' dell'avvicinamento, che e' quello che
      // serve perche' l'ingresso non sembri una frenata — e poi rallenta
      // progressivamente man mano che l'abside si avvicina.
      //
      // E' anche la regola di regia gia' pagata sul progetto precedente:
      // l'aggancio finale vuole una curva che frena in fondo, non
      // simmetrica.
      const dentro = SOGLIA - (SOGLIA + PROFONDO) * Math.pow(q, 0.72)
      A.posa(camera, dentro, true, mira)
      // L'IRIDE COMINCIA A UN TERZO DELLA GALLERIA, non a due.
      //
      // Alla prima taratura partiva a 0,66 e non faceva in tempo: lo scambio
      // con l'interno arriva a 0,96 del beat, e l'iride a quel punto era
      // ancora al sessanta per cento. Il fotogramma non si chiudeva mai, e il
      // mondo cambiava lo stesso — cioe' il taglio si vedeva, che e'
      // esattamente quello che l'iride doveva impedire.
      //
      // Adesso ha due terzi di corsa per crescere. Al quadrato e non alla
      // quarta: la quarta concentrava tutto negli ultimi istanti, e con una
      // corsa breve «tutto negli ultimi istanti» vuol dire «mai».
      A.agganciaIride(camera)
      A.iride(IRIDE_ATTIVA ? progressoIride(regia.locale) : 0)
      break
    }

    case 'accensione':
      rotazioneScena = ROTAZIONE_FINE
      // L'IRIDE SI RIAPRE, ed e' qui che il raccordo si chiude.
      //
      // Il fotogramma arriva BIANCO dal beat precedente: il disco si e'
      // mangiato tutto. Riaprendolo nei primi dodici centesimi di questo beat,
      // l'abitacolo non COMPARE — viene scoperto, da dentro la stessa forma
      // circolare che un attimo prima era la lente del faro.
      //
      // E' la differenza fra una dissolvenza e un raccordo: la dissolvenza
      // mescola due immagini, il raccordo fa continuare la prima dentro la
      // seconda. Chi guarda non trova il fotogramma in cui e' cambiato tutto,
      // perche' non c'e'.
      if (ATTRAVERSAMENTO?.pronto) {
        ATTRAVERSAMENTO.agganciaIride(camera)
        // anche qui il grezzo: nel beat dell'accensione `t` vale gia' 0,30
        // quando `regia.locale` vale 0,12, e l'iride si riaprirebbe di scatto
        ATTRAVERSAMENTO.iride(
          IRIDE_ATTIVA ? Math.max(1 - regia.locale / 0.085, 0) : 0,
        )
      }
      camera.position.copy(POSE.occhi)
      mira.copy(MIRA_AVANTI)
      camera.fov = 40
      break

    case 'velocita': {
      rotazioneScena = ROTAZIONE_FINE
      camera.position.copy(POSE.occhi)
      mira.copy(MIRA_AVANTI)
      // IL CAMPO VISIVO SI APRE CON LA VELOCITA', non con il tempo.
      // E' la decisione D5 resa concreta: chi scorre piano accelera piano.
      // Un campo che si apre da solo sarebbe un'animazione; uno che
      // risponde alla mano dice che stai guidando tu.
      const spinta = Math.min(velocita * 2.2, 1)
      camera.fov = 40 + 16 * morbido(t) * (0.35 + 0.65 * spinta)
      // micro-vibrazione: e' la cosa che rende credibile la lastra, perche'
      // il piano fuori si muove di conseguenza mentre l'abitacolo trema
      const s = 0.0016 * t * (0.3 + 0.7 * spinta)
      camera.position.x += (Math.random() - 0.5) * s
      camera.position.y += (Math.random() - 0.5) * s
      break
    }

    /**
     * IL FINALE — la camera si mette in bolla, e non e' un vezzo di regia:
     * e' quello che rende possibile tutto il resto.
     *
     * PERCHE' LA CAMERA DEVE ESSERE ESATTAMENTE ORIZZONTALE.
     *
     * Il finale trasforma la strada in una riga, e quella riga deve andare a
     * coincidere con la sottolineatura di un indirizzo scritto nel documento.
     * Perche' la coincidenza sia esatta bisogna sapere A QUALE ALTEZZA DELLO
     * SCHERMO cade l'orizzonte, e la risposta e' semplice a una condizione
     * sola: se la camera non ha inclinazione, l'orizzonte cade a META'
     * schermo. Esattamente. Qualunque sia il campo visivo, qualunque sia il
     * formato.
     *
     * Con la camera inclinata bisognerebbe ricavare quell'altezza dalla
     * proiezione a ogni fotogramma e passarla al foglio di stile — si puo'
     * fare, ed e' un ponte fra tre dimensioni e CSS che si romperebbe al primo
     * ritocco della posa. Mettere la camera in bolla toglie il problema invece
     * di risolverlo.
     *
     * Durante la guida la mira sta a 1,60 con l'occhio a 1,02: due gradi e
     * otto di muso in su, che e' quello che fa un guidatore. Qui quei due
     * gradi si spengono, e insieme si spegne anche lo scarto laterale — la
     * mira e' leggermente a sinistra perche' il posto di guida e' a sinistra
     * della mezzeria — cosi' alla fine si guarda esattamente lungo l'asse
     * della strada e il punto di fuga sta al centro del fotogramma.
     *
     * IL CAMPO VISIVO SI CHIUDE, da 56 a 30 gradi.
     *
     * E' la seconda meta' dell'appiattimento, ed e' ottica vera: un
     * teleobiettivo comprime la profondita'. Le stesse due file di lampioni,
     * viste a trenta gradi invece che a cinquantasei, convergono molto piu' in
     * fretta — la strada si chiude su se stessa senza che nessuna geometria si
     * muova. E' la differenza fra appiattire una scena e FOTOGRAFARLA piatta.
     */
    case 'contatto': {
      rotazioneScena = ROTAZIONE_FINE
      camera.position.copy(POSE.occhi)
      const q = morbido(t)
      // si parte da dove `velocita` ha lasciato, che e' il patto di questo
      // file: ogni beat comincia dalla posa in cui il precedente e' finito
      mira.set(
        MIRA_AVANTI.x,
        MIRA_AVANTI.y + (POSE.occhi.y - MIRA_AVANTI.y) * q,
        MIRA_AVANTI.z + (POSE.occhi.z - MIRA_AVANTI.z) * q,
      )
      camera.fov = 56 - 26 * q
      // la vibrazione si spegne prima di tutto il resto: e' l'unica cosa del
      // fotogramma che non e' una funzione dello scorrimento, e in un finale
      // che deve poter stare FERMO sarebbe l'unico rumore rimasto
      const s2 = 0.0016 * (1 - Math.min(q / 0.35, 1))
      camera.position.x += (Math.random() - 0.5) * s2
      camera.position.y += (Math.random() - 0.5) * s2
      break
    }
  }

  adattaAlFormato(camera, mira, regia.beat, regia.locale)
  camera.lookAt(mira)
  camera.updateProjectionMatrix()
}

/**
 * L'INQUADRATURA SI ADATTA AL FORMATO ARRETRANDO, NON ALLARGANDO.
 *
 * Il campo visivo di Three e' VERTICALE: tenendolo fisso, su uno schermo
 * stretto il campo orizzontale si stringe insieme al formato, e un'auto
 * lunga quattro metri e mezzo esce dai lati. Su un telefono in verticale —
 * formato 0,46 contro 1,6 — resta in campo un terzo scarso della macchina.
 *
 * La correzione ovvia sarebbe allargare il campo verticale finche' quello
 * orizzontale torna quello di prima. Non va bene: a formato 0,46 servirebbe
 * un campo verticale di oltre cento gradi, e a cento gradi la prospettiva
 * si deforma — le ruote vicine diventano enormi e l'auto sembra un
 * grandangolo da videocitofono. Si guadagna l'inquadratura e si perde
 * l'oggetto.
 *
 * Quindi si ARRETRA. La camera si allontana dal punto che guarda quel
 * tanto che serve a rimettere in campo la stessa larghezza, e la focale
 * resta quella. L'auto diventa piu' piccola — inevitabile, su un telefono
 * lo schermo e' piccolo davvero — ma resta la stessa auto, con le stesse
 * proporzioni.
 *
 * L'esponente 0,78 e non 1: compensare per intero lascia il soggetto
 * minuscolo, perche' su uno schermo verticale l'occhio accetta un
 * ritaglio piu' stretto di quanto suggerisca la geometria. E' l'unico
 * numero qui dentro che viene dal gusto e non da un conto, e lo dichiaro.
 */
const FORMATO_BASE = 1.6

function adattaAlFormato(camera: PerspectiveCamera, mira: Vector3, beat: string, locale = 0) {
  if (camera.aspect >= FORMATO_BASE) return

  // DENTRO L'ABITACOLO NON SI ARRETRA.
  //
  // Misurato su quattro formati: fuori l'adattamento funziona — l'auto
  // resta in campo al 100% anche su un telefono in verticale. Dentro
  // faceva il danno opposto: arretrando, su un 9:19,5 finiva in campo il
  // 100% della plancia, cioe' si vedeva TUTTO il cruscotto da un capo
  // all'altro. Nessuno seduto al posto di guida vede tutto il cruscotto.
  //
  // Arretrare, li', vuol dire uscire dall'auto. Su uno schermo stretto si
  // accetta di vederne meno — che e' quello che succede anche nella
  // realta' guardando attraverso una feritoia — perche' l'informazione
  // importante non e' quanta plancia si vede: e' che ci si e' dentro.
  // NIENTE ADATTAMENTO DURANTE L'ATTRAVERSAMENTO, e la ragione e' geometrica.
  //
  // L'adattamento arretra la camera per far stare piu' soggetto in campo su
  // uno schermo stretto. Ma tutto lo scambio si regge sul fatto che la camera
  // stia a una distanza ESATTA dalla bocca, misurata in raggi: spostarla di
  // un metro romperebbe la corrispondenza fra le due scale, e a quel punto lo
  // scambio si vedrebbe — su telefono e non su desktop, che e' il tipo di
  // difetto peggiore da trovare.
  //
  // Non serve nemmeno: dentro un corridoio non c'e' un soggetto da contenere.
  if (beat === 'accensione' || beat === 'velocita' || beat === 'contatto') return
  // IL BEAT `taglio` NON SI ESCLUDE IN BLOCCO, ed escluderlo era un difetto.
  //
  // L'adattamento arretra la camera sugli schermi stretti. Escludendo tutto
  // il beat, l'ultimo fotogramma di `lato` era arretrato e il primo di
  // `taglio` no: su un telefono in verticale, dove il fattore vale 2,06, la
  // camera faceva un BALZO IN AVANTI DI DUE METRI E MEZZO in un fotogramma.
  //
  // E' esattamente il difetto che questo file dichiara di aver eliminato —
  // «ogni beat parte da dove il precedente ha lasciato» — rientrato da una
  // porta che nessuna misura sorvegliava: il misuratore di continuita' gira a
  // formato desktop, dove il fattore vale 1 e il salto non esiste.
  //
  // Nella seconda meta' del beat l'adattamento deve pero' sparire davvero:
  // li' la camera e' dentro l'attraversamento, dove la sua distanza dalla
  // bocca si misura in raggi, e spostarla di un metro romperebbe la
  // corrispondenza fra le due scale. Quindi si SFUMA invece di escludere.

  // L'ESPONENTE SCENDE SUI FORMATI MOLTO STRETTI.
  //
  // A 0,78 fisso, su un telefono in verticale l'auto restava tutta in campo
  // ma minuscola: un oggetto lontano in mezzo a molto vuoto, che e' il
  // contrario di un'apertura d'impatto. Compensare per intero e' corretto
  // in geometria e sbagliato in composizione — su uno schermo stretto si
  // preferisce vedere BENE quasi tutto il soggetto invece di vedere male
  // tutto quanto.
  const stretto = Math.min(Math.max((FORMATO_BASE - camera.aspect) / 1.0, 0), 1)
  /* DA 0,20 A 0,32, E SI PAGA IN RITAGLIO.
   *
   * Misurato sul telefono in verticale prima della correzione: la sagoma
   * dell'automobile occupava il 104,5% della larghezza e il 14,1%
   * dell'altezza. Il primo numero dice che era gia' a filo dei due bordi; il
   * secondo dice il vero problema, ed e' un problema di geometria e non di
   * inquadratura — un'automobile lunga quattro metri e mezzo e alta uno e due
   * ha un rapporto di 3,75, e su uno schermo da 0,46 una sagoma larga quanto
   * la finestra e' per forza alta un settimo di schermo. Non esiste distanza
   * che la faccia riempire un formato verticale.
   *
   * Quello che si puo' fare e' avvicinarsi ancora e lasciare che il muso e la
   * coda escano dal fotogramma. E' esattamente cio' che chiede la regola della
   * composizione su telefono: si preferisce vedere BENE quasi tutto il
   * soggetto invece di vedere male tutto quanto — e il passo successivo di
   * quella stessa regola e' vedere benissimo tre quarti di soggetto.
   *
   * Con 0,32 il fattore scende da 2,06 a 1,81: dodici per cento piu' vicino,
   * la sagoma passa al 119% di larghezza e al 16% di altezza, e i due estremi
   * escono di una decina di pixel per parte. Sul desktop non cambia niente:
   * `stretto` vale zero e l'esponente resta 0,78. */
  const esponente = 0.78 - 0.32 * stretto
  let k = Math.pow(FORMATO_BASE / camera.aspect, esponente)
  if (beat === 'taglio') {
    // svanisce entro meta' avvicinamento: da li' in poi comanda la geometria
    // dello scambio, e nessun adattamento puo' metterci mano
    const spegni = Math.min(Math.max(locale / (AVVICINA * 0.5), 0), 1)
    k = 1 + (k - 1) * (1 - spegni)
  }
  camera.position.sub(mira).multiplyScalar(k).add(mira)
}

/**
 * Dove avviene lo scambio fra le due scene.
 *
 * E' un numero solo, e sta qui perche' e' una decisione di regia, non un
 * dettaglio della scena. Va tarato su cio' che MISURA
 * `strumenti/occlusione.mjs`: il fotogramma piu' scuro dentro il beat.
 * Metterlo a occhio significa scambiare un istante prima o un istante dopo
 * che il montante copra l'obiettivo — e in entrambi i casi si vede.
 */
/**
 * L'IRIDE E' SPENTA, e la nota vale piu' del codice che disattiva.
 *
 * L'idea era ed e' giusta: chiudere il fotogramma su un disco di luce che
 * cresce, scambiare il mondo dentro quel bianco, riaprirlo sull'abitacolo. Un
 * raccordo geometrico invece di una dissolvenza — il cerchio della lente che
 * continua nel cerchio dello strumento.
 *
 * Il meccanismo funziona: il disco si vede, cresce, brucia. Quello che non
 * torna e' il COMANDO. Interrogando la scena mentre gira, `iridePiena` legge
 * 0,70 dove il conto ne prevede 0,00 — cioe' la frazione di corsa che passo
 * alla funzione non e' quella che credo di passare. Tarando la finestra sui
 * valori misurati il disco si chiude, ma non si riapre piu': resta bianco
 * dentro l'abitacolo.
 *
 * Finche' non ho capito DOVE si perde quella frazione, l'iride resta spenta.
 * Un raccordo che funziona a meta' e' peggio di nessun raccordo: il difetto
 * che introduce — l'abitacolo sbiancato — e' piu' grave di quello che risolve.
 *
 * Quello che invece resta acceso, ed e' il guadagno vero di questo giro, e' la
 * galleria: da pietra chiara a metallo quasi specchio. E' li' che stava la
 * «nebbia beige» di tre secondi, non nell'assenza di un raccordo.
 */
/**
 * DUE SPAZI DI PROGRESSO CHE SI CHIAMANO ENTRAMBI «PROGRESSO».
 *
 * E' il difetto che ha tenuto ferma l'iride per un giro intero, e vale la pena
 * scriverlo per esteso perche' non era un errore di taratura: era un errore di
 * unita' di misura.
 *
 * Dentro `inquadra` la prima riga e' `const t = morbido(regia.locale)`. Da li'
 * in poi OGNI soglia di questa funzione — dove comincia il risucchio, dove
 * cade lo scambio, dove finisce il beat — e' espressa nello spazio
 * ADDOLCITO, non in quello grezzo. Sono due numeri diversi che descrivono lo
 * stesso istante:
 *
 *     regia.locale (grezzo)   0,86    0,906   0,95
 *     t = morbido(locale)     0,939   0,975   0,993
 *
 * Io ho scritto la rampa dell'iride ragionando sul grezzo e l'ho applicata al
 * dolce. Il sintomo: interrogando la scena, `iridePiena` leggeva 0,70 dove il
 * conto ne prevedeva 0,00. Ho passato mezz'ora a tarare la finestra sui valori
 * misurati — e cosi' l'iride si chiudeva ma non si riapriva piu', perche' stavo
 * curando il sintomo in un sistema di riferimento sbagliato.
 *
 * E c'era una seconda meta' dello stesso difetto: lo scambio esterno/interno,
 * in `Esperienza`, e' scritto sul GREZZO. Quindi le due estremita' della stessa
 * transizione vivevano in due spazi diversi.
 *
 * LA CORREZIONE E' UNA FUNZIONE SOLA, e sta qui. Prende il progresso grezzo —
 * quello che tutti hanno in mano — e restituisce quello dell'iride. La usano sia
 * la camera per accenderla, sia la regia per decidere quando scambiare. Finche'
 * la conversione e' un'unica funzione con un nome, non ci sono due verita'.
 */
/**
 * LA FINESTRA DELL'IRIDE, in progresso GREZZO del beat `taglio`.
 *
 * Nove centesimi di corsa, e sono pochi apposta. Con la finestra a 0,86 il
 * fotogramma era gia' bianco pieno a 0,93 — il bagliore allarga il disco molto
 * prima che la sua geometria copra il quadro, quindi l'effetto arriva sempre
 * prima di quanto dicano i numeri dell'opacita'. Un'iride e' un evento di
 * mezzo secondo: se dura di piu' smette di essere una luce in cui si entra e
 * diventa un fotogramma che sbianca.
 */
/* L'IRIDE COMINCIA MOLTO PRIMA: 0,79 invece di 0,905.
 *
 * Il difetto che chiude e' l'ultimo rimasto sul passaggio. Dopo aver tolto il
 * bianco restava un buio: fra il fondo della galleria e la comparsa della
 * strada c'era un secondo e mezzo di cavita' scura e povera d'informazione, e
 * la strada arrivava DOPO quel buio invece che dentro.
 *
 * La causa non era il buio in se' — un'ottica finisce in una cavita' scura, ed
 * e' giusto — ma il fatto che il mondo nuovo cominciasse a esistere solo a
 * nove decimi del beat, cioe' quando gli anelli del corridoio erano gia'
 * spariti. Cominciando a 0,79 il disco nasce mentre le coste metalliche si
 * vedono ancora: un punto di strada nel punto di fuga della galleria, che si
 * allarga finche' la galleria non c'e' piu'.
 *
 * 0,68 E NON 0,79, ED E' LA SECONDA VOLTA CHE QUESTO NUMERO SCENDE.
 * Con 0,79 il buio si era ristretto ma non chiuso: le luci del corridoio
 * cominciano a calare a tre quarti del beat, quindi restava una finestra fra
 * gli anelli che si spengono e il disco che nasce. Anticipando a 0,68 il disco
 * comincia a esistere mentre le coste sono ancora piene di luce, e da li' in
 * poi i due mondi sono sempre e comunque tutti e due sullo schermo.
 * In progresso di beat sono trentadue centesimi: quasi tre secondi in cui la
 * strada e' contenuta nel faro. */
export const IRIDE_DA = 0.68
export const IRIDE_A = 0.995

/** dal progresso GREZZO del beat a quello dell'iride, da 0 a 1 */
export function progressoIride(localeGrezzo: number) {
  const v = (localeGrezzo - IRIDE_DA) / (IRIDE_A - IRIDE_DA)
  return Math.min(Math.max(v, 0), 1)
}

/**
 * L'IRIDE E' ACCESA. Restava spenta finche' non si capiva dove si perdeva la
 * frazione di corsa: adesso si sa, ed e' `morbido`.
 */
const IRIDE_ATTIVA = true

export const SCAMBIO_A = 0.625

/**
 * SI E' DENTRO IL CORRIDOIO?
 *
 * IL DIFETTO CHE QUESTA FUNZIONE CHIUDE, ed e' il piu' visibile che il sito
 * abbia avuto.
 *
 * A meta' del beat `taglio`, per sei centesimi, si vedeva l'automobile INTERA
 * di nuovo lontana sul piedistallo — fra il primo piano dentro il faro e
 * l'ingresso nella galleria. Il committente l'ha visto nella registrazione:
 * «macro faro, poi l'auto intera, poi il tunnel». Uno stacco che distrugge la
 * continuita' un attimo prima del momento migliore del percorso.
 *
 * La causa e' la stessa del capitolo 17.4, per la terza volta: DUE SPAZI DI
 * PROGRESSO per lo stesso istante.
 *
 *   `inquadra()` confrontava   morbido(regia.locale) < SCAMBIO_A
 *   `Esperienza` confrontava   regia.locale >= SCAMBIO_A
 *
 * `morbido(x)` vale 0,625 quando x vale circa 0,565. Quindi da 0,565 la camera
 * era gia' saltata nel mondo a scala 115 — dentro la galleria, che e' larga
 * decine di metri — mentre il gruppo del corridoio restava invisibile fino a
 * 0,625, e al suo posto si vedeva l'esterno: cioe' l'automobile vera, a scala
 * uno, guardata da una camera che sta a centoventi metri di distanza. Da li'
 * l'auto si vede intera e minuscola.
 *
 * Non era un problema di taratura ne' di dissolvenze. Era che due file
 * decidevano la stessa cosa con due numeri diversi. La cura e' quella di
 * allora: UNA FUNZIONE, che tutti chiamano.
 */
export function dentroCorridoio(locale: number): boolean {
  return morbido(locale) >= SCAMBIO_A
}

/*
 * MISURATO IL 2026-08-19, non scelto.
 *
 * L'avevo messo a 0,5 perche' era il punto di mezzo del percorso della
 * camera, e sembrava ovvio che li' il montante fosse davanti all'obiettivo.
 * Non lo era: a 0,50 il fotogramma ha luminosita' media 91 su 255 ed e' il
 * PIU' CHIARO di tutto il beat — la camera e' ancora fuori, in pieno
 * ambiente, e lo scambio sarebbe stato un lampo.
 *
 * Il fotogramma si chiude davvero a 0,62: luminosita' 17 su 255 e il 98,9%
 * dei pixel sotto la soglia di nero. Fra i due punti ci sono dodici
 * centesimi di beat, cioe' meno di un secondo di scorrimento — e sarebbero
 * bastati a far sembrare tutto il sito una sequenza di scene invece che un
 * movimento solo.
 */
