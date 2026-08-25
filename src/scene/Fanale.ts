import {
  CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, Color,
} from 'three'

/**
 * IL FANALE POSTERIORE — che fino a ieri era un colore, non un oggetto.
 *
 * IL REPERTO. Tre revisioni di fila hanno scritto la stessa frase: «resta una
 * barra rossa dipinta al centro esatto della composizione». Sondando la scena
 * si scopre che avevano ragione ALLA LETTERA: fra le 108 mesh dell'automobile
 * non esisteva nessun fanale. Il rosso vive dentro `auto2r_col2.webp` — e' un
 * pixel della carrozzeria, e come tale non ha spessore, non rifrange, non
 * cambia guardandolo da un altro angolo, e non e' piu' luminoso di quello che
 * gli sta intorno. Ha tutte le proprieta' della vernice e nessuna di una luce.
 *
 * DOVE STA, misurato e non stimato (`strumenti/dovilrosso.mjs`). Non si puo'
 * leggere dalla tessitura: quella sa dove sta il rosso in UV, non dove quel
 * pezzo di superficie finisce nello spazio. Il ponte sono i vertici — si
 * campiona la mappa colore alle UV di ognuno e si tengono quelli rossi. Ne
 * escono 555 punti, di cui 544 in un gruppo solo:
 *
 *     x  2,015 .. 2,258     profondita'   0,243 m
 *     y  0,583 .. 0,820     altezza       0,237 m
 *     z -0,729 .. 0,733     larghezza     1,463 m
 *
 * E QUALE ESTREMITA' E', perche' costruire un fanale rosso sul muso sarebbe il
 * genere di errore che nessuno controlla. `FARO_DX` e la bocca da cui la camera
 * entra stanno a x = -2,26 e -2,40: il MUSO E' A -X. Quindi il gruppo rosso a
 * +2,16 e' la coda.
 * (Nota per chi passa di qui: `scene/Ruote.ts` chiama «bauletto posteriore»
 * quello a -1,83 e «anteriore» quello a +1,29, cioe' il contrario. Non cambia
 * niente nel comportamento — tutte e quattro le ruote si posano uguali — ma i
 * due nomi sono invertiti rispetto alla vettura vera.)
 *
 * COM'E' FATTO UN FANALE VERO, e perche' ci vogliono tre strati.
 *
 * Quello che si vede guardando un fanale moderno spento non e' il led: e' la
 * LENTE, un pezzo di plastica spesso che rifrange. Dentro c'e' una guida di
 * luce — un filo acceso e sottile — e dietro un riflettore metallico che
 * raccoglie e rimanda. I tre strati sono la ragione per cui un fanale ha
 * PROFONDITA': muovendo la testa, il filo acceso si sposta rispetto al bordo
 * della lente, e quel disallineamento e' la parallasse che dice «dentro».
 * Un solo strato — comunque sia colorato — non puo' avere parallasse, e per
 * questo un fanale dipinto si riconosce anche senza sapere perche'.
 *
 * E' la stessa lezione del profilo delle insegne, che ho impiegato quattro giri
 * a imparare: un disegno dentro una tessitura vive nel piano di quella
 * tessitura. Qui la lezione arriva gia' imparata.
 */

/* LA CODA E' UN ARCO, non un piano.
   La barra e' larga 1,463 e avvolge l'estremita' per 0,243 di profondita': con
   quella freccia il raggio del cerchio che ci passa e'
       R = (0,7315^2 + 0,243^2) / (2 x 0,243) = 1,22 m
   e l'arco sottende +/- 36,8 gradi. Sono i numeri della carrozzeria, non una
   forma scelta: un fanale che non segue la coda si stacca da lei al primo
   grado di rotazione, ed e' il difetto piu' visibile che possa avere. */
const RAGGIO = 1.22
const MEZZO_ARCO = Math.asin(0.7315 / RAGGIO)
/** dove sta il centro dell'arco: rientrato di un raggio dal punto piu' esterno */
const CENTRO_X = 2.258 - RAGGIO
const QUOTA = 0.702
const ALTEZZA = 0.225

function arco(raggio: number, altezza: number) {
  /* 64 SEGMENTI su settantatre gradi: uno ogni grado abbondante. Su una
     superficie che riflette una sorgente lunga, una corda mal approssimata si
     vede come una piega dritta proprio dove passa il riflesso — la stessa
     ragione dei ventiquattro segmenti delle carte del carosello. */
  const g = new CylinderGeometry(
    raggio, raggio, altezza, 64, 1, true,
    Math.PI / 2 - MEZZO_ARCO, MEZZO_ARCO * 2,
  )
  return g
}

export function fanale() {
  const g = new Group()
  g.name = 'FANALE_CODA'

  /* IL RIFLETTORE, dietro a tutto. Metallo lucido e chiaro: il suo mestiere e'
     restituire, e un metallo scuro dentro una scatola chiusa non ha niente da
     restituire — e' lo stesso errore gia' pagato con la ghiera dell'ottica, che
     al primo giro era un cerchio nero.
     Ruvidita' 0,28 e non zero: un riflettore vero e' satinato, perche' deve
     SPARGERE la luce del led invece di specchiarla. A specchio si vedrebbe il
     led una volta sola, in un punto. */
  const riflettore = new Mesh(
    arco(RAGGIO - 0.075, ALTEZZA * 0.92),
    new MeshStandardMaterial({
      color: new Color(0.62, 0.60, 0.60),
      metalness: 1.0,
      roughness: 0.28,
      side: 2,
    }),
  )
  riflettore.name = 'FANALE_RIFLETTORE'
  g.add(riflettore)

  /* LA GUIDA DI LUCE — il filo acceso, e la sua altezza e' tutto.
     Un fanale a guida di luce si riconosce perche' la parte accesa e' MOLTO
     piu' sottile della lente: e' un filo dentro un vetro spesso. Alta 22 mm
     dentro una lente da 225: un decimo.
     `toneMapped: false` perche' e' una sorgente dichiarata, e una sorgente non
     si spegne con l'esposizione della sera: e' la stessa regola delle insegne
     e del quadro strumenti. */
  const guida = new Mesh(
    arco(RAGGIO - 0.030, 0.022),
    new MeshBasicMaterial({
      color: new Color(1.0, 0.16, 0.10),
      toneMapped: false,
      side: 2,
    }),
  )
  guida.name = 'FANALE_GUIDA'
  g.add(guida)

  /* LA LENTE, davanti. Trasmissiva e non trasparente: `transmission` fa
     RIFRANGERE, cioe' piega quello che c'e' dietro, ed e' quella deformazione a
     dire «plastica spessa». Un materiale semplicemente trasparente lascia
     vedere il dietro dritto, e legge come pellicola colorata.
     `thickness` 0,05 governa quanto tinge cio' che attraversa: e' lo spessore
     vero della plastica, e da li' viene il rosso profondo dei bordi contro il
     rosso chiaro dove c'e' la guida sotto.
     `ior` 1,55 e' quello del policarbonato, che e' di cosa sono fatte le lenti
     dei fanali — non 1,5 del vetro. */
  const lente = new Mesh(
    arco(RAGGIO, ALTEZZA),
    new MeshPhysicalMaterial({
      color: new Color(0.42, 0.02, 0.02),
      transmission: 1.0,
      ior: 1.55,
      thickness: 0.05,
      roughness: 0.055,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      transparent: true,
      side: 2,
    }),
  )
  lente.name = 'FANALE_LENTE'
  g.add(lente)

  g.position.set(CENTRO_X, QUOTA, 0)
  return g
}
