import {
  Box3,
  Color,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/**
 * IL FARO COSTRUITO — l'unico pezzo che si guarda da dieci centimetri.
 *
 * PERCHE' ESISTE UN FILE SOLO PER QUESTO.
 *
 * Il momento con cui il sito prova a battere `thewatch.60fps.fr` e'
 * l'attraversamento: la camera arriva alla lente, la lente riempie il quadro,
 * si continua a scorrere e si passa DENTRO. Poi la geometria ottica si apre
 * in un corridoio monumentale, il metallo diventa telaio, e si e' dentro
 * l'abitacolo. Senza uno stacco.
 *
 * Perche' funzioni servono due cose che il faro generato non poteva dare:
 *
 *   1. DEVE ESISTERE. Nel modello generato il faro e' una bolla di 10.000
 *      triangoli senza niente dentro: la lente non e' una lente, il
 *      riflettore non c'e', e attraversarla significherebbe uscire nel vuoto
 *      dal lato opposto.
 *
 *   2. DEVE REGGERE DUE SCALE. Il corridoio non e' un altro modello — e'
 *      QUESTO, ingrandito duecento volte. Se fosse un altro modello ci
 *      sarebbe per forza un istante in cui uno sparisce e l'altro compare, e
 *      quell'istante e' un taglio. Essendo lo stesso oggetto, non succede
 *      niente: ci si avvicina, e basta.
 *
 * Le misure sono in `strumenti/faro.py` e sono state scelte perche'
 * funzionino in tutte e due: 104 mm di proiettore diventano una galleria di
 * 20,8 metri; le undici coste del riflettore diventano campate ogni 2,98
 * metri. Sono misure architettoniche vere — una campata da tre metri esiste,
 * una da quaranta centimetri no.
 *
 * I MATERIALI, e perche' il faro spento e' la cosa piu' scura dell'auto.
 *
 * Di notte, un faro che non e' acceso e' un buco nero con un bordo lucido:
 * una calotta di policarbonato quasi perfettamente trasparente davanti a una
 * cavita' scura. Non riflette come una carrozzeria — riflette MENO, perche'
 * il vetro ha un indice piu' basso della vernice laccata, ed e' proprio quel
 * salto a dire all'occhio che li' c'e' un'altra sostanza.
 *
 * L'unica cosa accesa e' la GUIDA DI LUCE, che e' la firma diurna e sta
 * accesa sempre. Ed e' anche il segnale che dice «si entra da qui» molto
 * prima che si capisca che si puo' entrare.
 */

const caricatore = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)

export const FARO_MATERIALI = {
  /** la calotta: policarbonato, quasi invisibile, e si attraversa */
  calotta() {
    const m = new MeshPhysicalMaterial({
      metalness: 0,
      roughness: 0.035,
      transparent: true,
      // 0,17 e non 0,9: e' la RIFLETTANZA di striscio che si vede, non il
      // corpo del vetro. Una calotta troppo opaca nasconde l'interno, e
      // l'interno e' tutto il punto di questo pezzo — l'occhio deve
      // intravedere le coste PRIMA che la camera entri, se no
      // l'attraversamento arriva senza preavviso e sembra un trucco.
      opacity: 0.17,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6,
      depthWrite: false,
    })
    m.color.setRGB(0.55, 0.58, 0.62)
    m.name = 'FARO_CALOTTA'
    return m
  },

  /** la canna a gradini: alluminio metallizzato sotto vuoto */
  canna() {
    const m = new MeshStandardMaterial({
      metalness: 1.0,
      // 0,14: lucido ma non specchio. Un riflettore vero e' metallizzato su
      // plastica stampata e conserva le righe dello stampo; a 0 diventa
      // cromo da rubinetto, e a 200x un corridoio cromato non e'
      // un'architettura, e' una scenografia di fantascienza.
      roughness: 0.14,
      envMapIntensity: 1.4,
    })
    m.color.setRGB(0.66, 0.67, 0.68)
    m.name = 'FARO_CANNA'
    return m
  },

  /** l'abside in fondo: la parabola, piu' lucida di tutto */
  parabola() {
    const m = new MeshStandardMaterial({ metalness: 1.0, roughness: 0.05, envMapIntensity: 1.6 })
    m.color.setRGB(0.80, 0.81, 0.82)
    m.name = 'FARO_PARABOLA'
    return m
  },

  /** l'anello asferico: vetro spesso, il portale */
  anello() {
    const m = new MeshPhysicalMaterial({
      metalness: 0, roughness: 0.02, transparent: true, opacity: 0.34,
      clearcoat: 1.0, envMapIntensity: 1.8,
    })
    m.color.setRGB(0.62, 0.68, 0.74)
    m.name = 'FARO_ANELLO'
    return m
  },

  /** la guida di luce: l'unica cosa accesa */
  guida() {
    const m = new MeshStandardMaterial({ metalness: 0, roughness: 0.25 })
    m.color.setRGB(0.02, 0.02, 0.02)
    // 2,2: SOTTO la soglia del bloom, che sta a 2,6.
    //
    // Sembra sbagliato per una firma luminosa — dovrebbe fiorire. Ma un
    // alone le mangia il disegno, e il disegno E' la firma: e' una riga
    // sottile e continua, ed e' il fatto che sia sottile e continua a farla
    // leggere come una guida di luce invece che come una lampadina. Fiorira'
    // piu' avanti, all'accensione, dove il salto e' voluto.
    // 1,15 e non 2,2. A 2,2 la firma era la cosa piu' luminosa del muso e
    // rubava la scena all'ottica, che e' il pezzo da guardare. Una guida di
    // luce di notte si vede benissimo anche appena sopra il fondo: e' il
    // CONTRASTO col nero intorno a farla leggere, non l'intensita' assoluta.
    m.emissive = new Color(0.62, 0.74, 0.95).multiplyScalar(1.15)
    m.name = 'FARO_GUIDA'
    return m
  },
}

export type Faro = {
  gruppo: Group
  /** dove sta la bocca, in coordinate locali: il punto che la camera buca */
  bocca: Vector3
  /** l'asse dell'ottica, normalizzato, in coordinate locali */
  asse: Vector3
  /** la lunghezza utile della canna, in metri: serve alla coreografia */
  profondita: number
}

/**
 * INNESTARE L'OTTICA NEL FARO GENERATO.
 *
 * Il faro generato non si butta: resta come ZOCCOLO, cioe' come la conchiglia
 * di carrozzeria intorno all'ottica — quella parte il generatore l'ha fatta
 * bene, perche' e' superficie esterna e segue la forma del muso. Quello che
 * non poteva fare e' l'interno, e l'interno arriva da qui.
 *
 * LA POSA SI MISURA, NON SI SCRIVE.
 *
 * Scrivere a mano dove va il faro significa riscriverlo a ogni rigenerazione
 * del modello — e con `generate_parts` il modello si rigenera spesso, perche'
 * e' il modo in cui si prova un'altra silhouette. Qui si legge la scatola del
 * pezzo generato e ci si incastra dentro: se domani l'auto e' un'altra, il
 * faro ci va lo stesso.
 *
 * `avanti` e' la direzione del muso, e si deduce da dove sta il faro rispetto
 * al centro dell'auto: un faro sta sempre davanti, per definizione.
 */
export async function caricaFaro(url = '/modelli/faro.glb'): Promise<Faro> {
  const gltf = await caricatore.loadAsync(url)
  const gruppo = new Group()
  gruppo.name = 'FARO_OTTICA'
  const M = {
    FARO_CALOTTA: FARO_MATERIALI.calotta(),
    FARO_CANNA: FARO_MATERIALI.canna(),
    FARO_PARABOLA: FARO_MATERIALI.parabola(),
    FARO_ANELLO: FARO_MATERIALI.anello(),
    FARO_GUIDA: FARO_MATERIALI.guida(),
  }
  for (const o of [...gltf.scene.children]) {
    const mesh = o as Mesh
    const m = (M as Record<string, MeshStandardMaterial>)[o.name]
    if (m) mesh.material = m
    // LA CANNA SI GUARDA DA DENTRO, quindi si disegnano ENTRAMBE le facce.
    //
    // Un solido chiuso si disegna solo da fuori, ed e' giusto: risparmia
    // meta' dei pixel. Ma questa canna la camera ci passa dentro, e da
    // dentro un solido a faccia singola e' invisibile — si vedrebbe l'auto
    // da dentro, cioe' il cielo. E' il difetto che si scopre solo nel punto
    // esatto in cui il sito deve stupire.
    if (o.name === 'FARO_CANNA' || o.name === 'FARO_PARABOLA') {
      ;(mesh.material as MeshStandardMaterial).side = 2 // DoubleSide
    }
    gruppo.add(o)
  }

  const scatola = new Box3().setFromObject(gruppo)
  const misura = new Vector3()
  scatola.getSize(misura)
  // l'asse dell'ottica e' il lato LUNGO della sua scatola: la canna e' lunga
  // 250 mm e larga 150. Si trova misurando, cosi' un cambio di convenzione
  // nell'esportatore non rompe niente in silenzio.
  const i = misura.x > misura.y && misura.x > misura.z ? 0 : misura.y > misura.z ? 1 : 2
  const asse = new Vector3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0)
  const bocca = new Vector3()
  scatola.getCenter(bocca)
  bocca.setComponent(i, scatola.min.getComponent(i))

  return { gruppo, bocca, asse, profondita: misura.getComponent(i) }
}

/**
 * `apertura` E' IL FORO VERO, ED E' UN OGGETTO DIVERSO DALLO ZOCCOLO.
 *
 * IL DIFETTO CHE L'HA RESA NECESSARIA. Il committente ha fotografato il primo
 * piano del faro: «sembra un po' piu' spostato sotto, dovrebbe essere il
 * cerchio azzurro centrato». Aveva ragione, e il numero e' questo — misurato
 * con `strumenti/centro_faro.mjs` a scorrimento 0,565 su 1200x750, proiettando
 * i VERTICI dei due pezzi e non contando pixel:
 *
 *   centro dell'anello luminoso  y = 375,0 px
 *   centro della ghiera (il foro) y = 386,4 px
 *   scarto  dx = 0,0 px   dy = -11,4 px   (2,13 cm nel mondo)
 *
 * Sotto restava una mezzaluna di 50 px contro i 28 di sopra: quasi il doppio,
 * ed e' esattamente quello che si vede nella fotografia.
 *
 * LA CAUSA sta in `auto2.glb` e non nel codice. Nel muso ci sono DUE oggetti,
 * e non sono concentrici:
 *
 *   FARO_DX       y = -0,057871   l'anello di riferimento, che si spegne
 *   OTTICA_BORDO  y = -0,062700   la ghiera che DISEGNA il foro, e si vede
 *
 * Quattro millimetri e otto decimi di scarto nelle unita' del modello che, con
 * la vettura riportata alla sua lunghezza vera (fattore 4,41), diventano i 2,13
 * cm misurati. `innestaFaro` prendeva la posa dal primo — l'unico che
 * conoscesse — e il secondo e' quello che l'occhio guarda.
 *
 * COSA SI E' PROVATO PRIMA, e perche' e' stato scartato: correggere di 2,13 cm
 * con un numero scritto qui. Funzionava sul provino e sarebbe durato fino alla
 * prima rigenerazione della vettura — cioe' fino a domani, visto che il modello
 * si rigenera per provare un'altra silhouette. Vale qui la stessa regola scritta
 * sopra per la scala: la posa si MISURA sul pezzo che si vede.
 *
 * Lo zoccolo resta e serve ancora, ma solo per la MISURA: e' un anello pieno,
 * con un diametro netto da leggere, mentre la ghiera e' un'ellisse (386 px di
 * larghezza contro 408 di altezza) e prendere il suo lato corto per la scala
 * rimpicciolirebbe l'ottica del cinque per cento.
 */
export function innestaFaro(
  faro: Faro,
  zoccolo: Object3D,
  centroAuto: Vector3,
  apertura?: Object3D | null,
) {
  const scatola = new Box3().setFromObject(zoccolo)
  const centro = new Vector3()
  const misura = new Vector3()
  scatola.getCenter(centro)
  scatola.getSize(misura)

  // SI RIDIMENSIONA SUL DIAMETRO, non sulla lunghezza.
  //
  // Un gruppo ottico e' sempre piu' profondo che alto: prendere il lato lungo
  // per la scala lo farebbe uscire dal muso di venti centimetri. Il vincolo
  // vero e' che la calotta stia dentro l'apertura del faro, cioe' che il suo
  // DIAMETRO stia dentro l'altezza dello zoccolo.
  //
  // 0,92 e non 1: due centimetri di conchiglia intorno. Un'ottica a filo
  // dell'apertura sembra incollata; e' il bordo scuro fra il vetro e la
  // carrozzeria a dire che sono due pezzi montati uno dentro l'altro.
  // SI CLONA, NON SI RIUSA — e la prima stesura riusava.
  //
  // Finche' `caricaFaro()` veniva chiamata una volta per faro, riusare o
  // clonare era indifferente. Poi ho tolto il doppio scaricamento (due
  // richieste di rete per lo stesso file, dieci materiali invece di cinque) e
  // ho introdotto un difetto silenzioso: `perno.add(faro.gruppo)` SPOSTA il
  // gruppo, non lo copia. Al secondo innesto la geometria veniva strappata al
  // primo perno, e l'ottica destra restava un contenitore vuoto.
  //
  // Il difetto non dava nessun errore. Si e' manifestato tre passaggi piu' in
  // la', come «raggio 0 -> galleria 0 metri» nella riga di diagnostica
  // dell'attraversamento — cioe' l'ha stanato una misura stampata, non un
  // controllo. E' la ragione per cui vale la pena stampare le grandezze
  // nell'unita' in cui uno sa giudicarle: «0 metri» salta all'occhio, un
  // gruppo vuoto no.
  const corpo = faro.gruppo.clone(true)
  const suaMisura = new Vector3()
  new Box3().setFromObject(corpo).getSize(suaMisura)
  const iAsse = faro.asse.x ? 0 : faro.asse.y ? 1 : 2
  const suoDiametro = Math.max(
    ...[0, 1, 2].filter((j) => j !== iAsse).map((j) => suaMisura.getComponent(j)),
  )
  const k = (Math.min(misura.y, misura.z) * 0.92) / Math.max(1e-6, suoDiametro)
  corpo.scale.setScalar(k)

  // L'ottica si centra su se stessa e poi si arretra: la BOCCA deve cadere
  // sulla faccia anteriore dello zoccolo, non il centro della canna. Se si
  // centrasse il pezzo, meta' ottica spunterebbe fuori dal muso.
  const suoCentro = new Vector3()
  new Box3().setFromObject(corpo).getCenter(suoCentro)
  corpo.position.sub(suoCentro)
  // SI ARRETRA, NON SI AVANZA — e al primo tentativo avevo il segno
  // sbagliato. Spostando l'ottica di mezza lunghezza NEL VERSO dell'asse, il
  // pezzo finiva tutto fuori dal muso: nel provino e' un oblo' appiccicato
  // sopra la carrozzeria invece che un gruppo ottico montato dentro.
  //
  // La bocca deve cadere sulla faccia ANTERIORE dello zoccolo e il resto
  // andare all'indietro, dentro il parafango — che e' come sta montato un
  // faro vero, e anche l'unico modo perche' l'attraversamento abbia dove
  // andare: se la canna sporge in avanti, la camera che ci entra esce subito
  // all'aperto.
  corpo.position.addScaledVector(faro.asse, -suaMisura.getComponent(iAsse) * k * 0.5)
  corpo.position.addScaledVector(faro.asse, misura.getComponent(iAsse === 0 ? 0 : 2) * 0.42)

  const perno = new Group()
  perno.name = 'FARO_INNESTO'
  perno.add(corpo)

  // LA POSA VIENE DAL FORO CHE SI VEDE, la misura dallo zoccolo.
  //
  // Sono due oggetti e due mestieri diversi: la scala di sopra ha bisogno di
  // un diametro netto, e lo da' lo zoccolo; il centro ha bisogno di stare
  // dove sta il buco, e quello lo sa solo la ghiera. Vedi il commento in
  // testa alla funzione per i due numeri che l'hanno imposto.
  const posa = centro.clone()
  if (apertura) new Box3().setFromObject(apertura).getCenter(posa)

  // L'ASSE VA PORTATO SUL MUSO, e la direzione del muso si deduce invece di
  // scriverla: un faro sta davanti al centro dell'auto per definizione, quindi
  // il vettore dal centro dell'auto al faro E' la direzione del muso. Cosi'
  // rigenerando il modello con un altro orientamento non si rompe niente.
  const avanti = posa.clone().sub(centroAuto)
  avanti.y = 0
  avanti.normalize()
  perno.quaternion.setFromUnitVectors(faro.asse, avanti)
  perno.position.copy(posa)
  return perno
}
