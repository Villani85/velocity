import { Camera, HalfFloatType, Object3D, Scene, WebGLRenderer, WebGLRenderTarget } from 'three'

/**
 * IL RISCALDAMENTO — compilare gli shader prima che servano, e a piccoli morsi.
 *
 * IL DIFETTO E' IL PIU' GRAVE DI TUTTO IL PROGETTO, ed e' rimasto invisibile
 * per settimane a una decina di strumenti di misura.
 *
 * Il committente ha portato l'analisi di un revisore: nel filmato, fra il
 * secondo 54,08 e il 54,16, il faro diventa strada di colpo. Nessun fotogramma
 * con la strada dentro il faro. E `strumenti/raccordo.mjs` diceva che la
 * transizione era continua — e diceva il vero.
 *
 * Tutti e due avevano ragione, e la differenza e' il METODO. Ogni strumento di
 * questo repo porta la pagina a una posizione, ASPETTA venti fotogrammi, e
 * misura. E' corretto per misurare uno stato, e nasconde per costruzione
 * l'unica cosa che chi guarda vede davvero: il movimento. La compilazione
 * avviene durante l'attesa, e nell'attesa non la vede nessuno.
 *
 * `strumenti/salti.mjs` fa scorrere la pagina a tempo reale, come farebbe un
 * dito, e conta di quanto avanza il racconto a ogni fotogramma:
 *
 *     venticinque salti, il peggiore scavalca il 6,74% della pagina in un
 *     fotogramma solo, durato 2021 ms; quello sul faro→strada dura 1622 ms
 *     e ne scavalca il 5,41%. Su 1800 fotogrammi attesi ne arrivano 665.
 *
 * PERCHE' UNO SCORRIMENTO A TEMPO REALE SALTA E UNO A PASSI NO.
 *
 * Il registratore, come un dito, muove la pagina in funzione dell'OROLOGIO. Se
 * un fotogramma dura due secondi, il successivo trova l'orologio molto piu'
 * avanti e la pagina salta di li'. Chi guarda non vede una transizione lenta:
 * non la vede proprio.
 *
 * E un fotogramma dura due secondi perche' li' si compila. Compilare uno shader
 * BLOCCA il thread: non c'e' modo di spezzarlo a meta'.
 *
 * LA CURA NON E' CAMBIARE I TEMPI. E' COMPILARE PRIMA — E A MORSI.
 *
 * Al primo tentativo ho compilato tutto insieme, subito dopo il caricamento. Il
 * salto sul faro e' sceso da 1622 ms a 558 — e ne e' comparso uno nuovo da 2065
 * ms al dieci per cento della pagina, cioe' il riscaldamento stesso. Avevo
 * spostato lo stallo, non tolto.
 *
 * Quindi si compila un gruppo alla volta, cedendo il turno fra l'uno e l'altro.
 * Ogni morso e' corto abbastanza da stare dentro un fotogramma o poco piu', e
 * fra un morso e l'altro il sito respira. Il totale e' lo stesso lavoro; quello
 * che cambia e' che non arriva tutto insieme.
 *
 * PERCHE' BISOGNA ACCENDERE PER COMPILARE.
 *
 * `compileAsync` guarda cosa e' VISIBILE: un gruppo spento non ha materiali da
 * preparare, e il corridoio sta spento fino al quarto tempo per definizione.
 * Si accende per un istante, si compila, e si rimette ogni cosa esattamente
 * com'era — con lo stato salvato prima, non ricostruito a mano. Dentro un
 * gruppo acceso ci sono figli spenti (le luci della pattuglia, i pannelli del
 * carosello) e riaccendere il padre senza ricordarsi dei figli li lascerebbe
 * accesi per sempre.
 */

/** quanto si aspetta prima del primo morso */
const ATTESA = 400
/** e quanto si respira fra un gruppo e il successivo */
const RESPIRO = 130

const dormi = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * L'ALTRA INQUADRATURA DA SCALDARE — e senza di lei il riscaldamento era
 * incompleto, con un numero a dimostrarlo.
 *
 * Three non compila un programma per MATERIALE: ne compila uno per
 * CONFIGURAZIONE. Lo stesso materiale disegnato dentro un bersaglio diverso, o
 * con un'altra camera, e' un altro programma da collegare e — sui driver che
 * rimandano — da finalizzare al primo disegno.
 *
 * Questo sito disegna in DUE configurazioni: il fotogramma vero, che passa dal
 * composer, e la passata dell'iride, che rende la scena dentro
 * `bersaglioIride` con una camera sua. Il riscaldamento le ignorava tutte e
 * due e disegnava in un bersaglio semplice da quattro pixel: una terza
 * configurazione, che nel sito non esiste.
 *
 * MISURATO PRIMA DI SCRIVERE QUESTA RIGA. Spegnendo del tutto il riscaldamento
 * (`?senzariscaldamento`) i picchi sopra 45 ms restano 21 su 415, identici a
 * quando e' acceso: quindi non era lui a bloccare, e non era nemmeno roba
 * dimenticata — di tutta la scena gli sfuggivano quattro mesh, due delle quali
 * spente. Quello che gli sfuggiva erano le CONFIGURAZIONI.
 */
export type AltraPosa = { bersaglio: WebGLRenderTarget; camera: Camera }

export async function riscalda(
  renderer: WebGLRenderer,
  scena: Scene,
  camera: Camera,
  gruppi: Object3D[],
  anche?: AltraPosa | null,
) {
  /* SI PUO' SPEGNERE, e serve a rispondere a una domanda che altrimenti resta
     un'opinione: i picchi da secondi che `strumenti/dovecosta.mjs` trova — e
     che cambiano capitolo a ogni corsa — sono shader che si compilano da soli
     al primo disegno, oppure e' QUESTO riscaldamento che blocca il thread
     mentre qualcuno sta gia' scorrendo?
     Le due cause chiedono cure opposte: nel primo caso si riscalda di piu',
     nel secondo si riscalda piu' piano. Senza un interruttore non si distingue,
     e senza distinguere si tira a indovinare. */
  if (location.search.includes('senzariscaldamento')) {
    console.log('[riscalda] spento su richiesta')
    return
  }
  await dormi(ATTESA)

  /* UN BERSAGLIO MINUSCOLO SU CUI DISEGNARE PER FINTA.
     Quattro pixel per quattro: non deve produrre un'immagine, deve solo far
     passare ogni materiale attraverso un disegno VERO. Vedi il commento qui
     sotto sul perche' collegare non basta. */
  /* IL BERSAGLIO FINTO E' FATTO COME QUELLO VERO — e prima non lo era, che e'
     l'errore che teneva in piedi tutto il difetto.
     Three non compila un programma per materiale: ne compila uno per
     CONFIGURAZIONE, e nella chiave ci finiscono il TIPO del bersaglio e il suo
     campionamento multiplo. Il composer di questo sito disegna dentro un
     bersaglio `HalfFloatType` con `samples: 4`; il riscaldamento disegnava in
     un bersaglio di serie a otto bit senza multicampionamento. Stessi
     materiali, chiavi diverse, programmi diversi: si scaldava una cosa e se ne
     usava un'altra.
     Nella misura si vedeva cosi': `strumenti/amano.mjs` trovava «+1 programmi»
     dentro stalli da mezzo secondo e da due secondi in `taglio`, `accensione` e
     `contatto` — cioe' compilazioni che avvenivano lo stesso, con il
     riscaldamento acceso e passato da un pezzo.
     La misura resta quattro pixel: la dimensione non entra nella chiave, entra
     solo nel costo di riempimento. */
  const finto = new WebGLRenderTarget(4, 4, { type: HalfFloatType, samples: 4 })

  /* IL BERSAGLIO DELL'ALTRA POSA SI RIMPICCIOLISCE PER LA DURATA, e si rimette
     com'era alla fine — anche se qualcosa va storto, per questo c'e' il
     `finally` in fondo. Lasciarlo piccolo vorrebbe dire un attraversamento a
     otto pixel, cioe' rompere il momento migliore del sito per curare uno
     stallo. */
  const eraLargo = anche ? anche.bersaglio.width : 0
  const eraAlto = anche ? anche.bersaglio.height : 0
  if (anche) anche.bersaglio.setSize(8, 8)

  /* SI SCENDE DI UN LIVELLO NEI GRUPPI GROSSI.
     Compilando un gruppo per volta, quello dell'esterno da solo portava tredici
     programmi in un morso: 2227 ms, cioe' lo stallo piu' grosso rimasto di tutta
     la corsa. Un morso deve essere piccolo abbastanza da stare dentro un
     fotogramma o poco piu', e la misura di «piccolo» non e' il gruppo, e' quanti
     figli ha. Sopra i tre si scende ai figli e si respira fra l'uno e l'altro. */
  const morsi: Object3D[] = []
  for (const g of gruppi) {
    if (g.children.length > 3) morsi.push(...g.children)
    else morsi.push(g)
  }

  for (const g of morsi) {
    const prima = new Map<Object3D, boolean>()
    g.traverse((o) => prima.set(o, o.visible))
    g.traverse((o) => { o.visible = true })
    try {
      await renderer.compileAsync(scena, camera, g as unknown as Scene)
      /* E POI SI DISEGNA DAVVERO, UNA VOLTA, IN QUATTRO PIXEL.
       *
       * `compileAsync` collega i programmi, e per settimane ho creduto che
       * bastasse. Il metro dice di no. Dopo averlo messo, `strumenti/salti.mjs`
       * continuava a trovare stalli da due secondi in punti che si ripetono, e
       * in quei fotogrammi `renderer.info` diceva: nessun programma nuovo,
       * nessuna tessitura nuova, quarantuno chiamate di disegno, mille
       * triangoli, mucchio della memoria fermo a 45 MB.
       *
       * Un fotogramma che non crea niente, non disegna quasi niente e non
       * alloca niente, e dura due secondi, sta aspettando qualcun altro: il
       * DRIVER. Molti driver rimandano la compilazione vera al primo disegno
       * che usa quel programma — collegarlo non li costringe a niente.
       *
       * Quindi si disegna. Quattro pixel bastano: il costo di riempimento e'
       * nullo e il percorso e' quello completo, quindi il driver deve
       * finalizzare tutto quello che serve a quel materiale. E' la stessa
       * ragione per cui i motori di gioco fanno passare le pipeline davanti a
       * una telecamera finta prima di far entrare qualcuno nel livello. */
      const dove = renderer.getRenderTarget()
      renderer.setRenderTarget(finto)
      renderer.render(scena, camera)
      /* E UNA SECONDA VOLTA NELL'ALTRA INQUADRATURA — vedi `AltraPosa`.
         Il bersaglio dell'iride viene rimpicciolito per tutta la durata del
         riscaldamento e rimesso a misura alla fine: la dimensione non cambia
         quali programmi si compilano, cambia solo quanti pixel si riempiono, e
         riempirne mezzo schermo a ogni morso sarebbe stato pagare due volte
         per la stessa cosa. Cio' che finisce dentro quel bersaglio adesso e'
         spazzatura, e non importa: e' invisibile fino al `taglio` e da li' in
         poi viene riscritto a ogni fotogramma. */
      if (anche) {
        renderer.setRenderTarget(anche.bersaglio)
        renderer.render(scena, anche.camera)
      }
      renderer.setRenderTarget(dove)
      /* PROVATO E TOLTO: far girare qui l'intera catena del composer, fuori
         schermo, per compilare esattamente i programmi che il sito usera'.
         Funzionava — l'ultima passata smette per un istante di dichiararsi
         «disegno a schermo» e il fotogramma finisce nel bersaglio interno,
         invisibile senza bisogno di nessun velo — ma su tre corse di
         `strumenti/amano.mjs` i fotogrammi sopra soglia erano 22, 14 e 16
         contro 14, 16 e 18 senza: rumore. In cambio costava un fotogramma
         intero, a piena risoluzione e con tutte le passate, per ogni boccone.
         Un pezzo di complessita' che il metro non giustifica non si spedisce,
         anche quando la teoria dice che dovrebbe funzionare. */
    } catch {
      /* SE FALLISCE, NON SUCCEDE NIENTE DI GRAVE: si torna al comportamento di
         prima, cioe' si compila quando serve. Un riscaldamento che fa cadere il
         sito sarebbe molto peggio del difetto che cura. */
    } finally {
      for (const [o, v] of prima) o.visible = v
    }
    await dormi(RESPIRO)
  }
  finto.dispose()

  if (anche && eraLargo > 0) anche.bersaglio.setSize(eraLargo, eraAlto)
}

/**
 * SCALDARE UN OGGETTO SOLO, ADESSO — per le tessiture che arrivano in ritardo.
 *
 * IL BUCO CHE TURA. Il riscaldamento gira una volta, all'inizio, e scalda
 * quello che in quel momento esiste. Ma su questo sito una parte degli oggetti
 * arriva DOPO, apposta: la fotografia dell'abitacolo pesa quattrocento
 * kilobyte e comparirebbe a meta' racconto, quindi si carica in ritardo per non
 * togliere banda all'automobile. Quando finalmente arriva, il riscaldamento e'
 * passato da un pezzo — e quella tessitura si carica sulla scheda video nel
 * fotogramma in cui serve.
 *
 * MISURATO. `strumenti/dovecosta.mjs` sul beat `accensione`: un fotogramma da
 * 1129 ms con l'annotazione «+1 tessiture». UNA tessitura, un secondo e un
 * decimo. E' la fotografia dell'abitacolo, 2048 per 2048: sedici megabyte una
 * volta decompressa, piu' la piramide dei mipmap.
 *
 * LA CURA E' LA STESSA DEL RISCALDAMENTO, ridotta a un morso: si disegna
 * l'oggetto una volta in quattro pixel appena il suo materiale e' pronto.
 * Il caricamento sulla scheda avviene li', in un istante in cui non se ne
 * accorge nessuno, invece che davanti a chi sta scorrendo.
 */
export function scaldaOra(
  renderer: WebGLRenderer,
  scena: Scene,
  camera: Camera,
  oggetto: Object3D,
  anche?: AltraPosa | null,
) {
  const finto = new WebGLRenderTarget(4, 4)
  const prima = new Map<Object3D, boolean>()
  oggetto.traverse((o) => prima.set(o, o.visible))
  oggetto.traverse((o) => { o.visible = true })
  const dove = renderer.getRenderTarget()
  const eraLargo = anche ? anche.bersaglio.width : 0
  const eraAlto = anche ? anche.bersaglio.height : 0
  try {
    if (anche) anche.bersaglio.setSize(8, 8)
    renderer.setRenderTarget(finto)
    renderer.render(scena, camera)
    if (anche) {
      renderer.setRenderTarget(anche.bersaglio)
      renderer.render(scena, anche.camera)
    }
  } catch {
    /* come nel riscaldamento grande: se fallisce si torna al comportamento di
       prima, cioe' si paga il caricamento quando serve. Un morso che fa cadere
       il sito sarebbe molto peggio del difetto che cura. */
  } finally {
    renderer.setRenderTarget(dove)
    if (anche && eraLargo > 0) anche.bersaglio.setSize(eraLargo, eraAlto)
    for (const [o, v] of prima) o.visible = v
    finto.dispose()
  }
}
