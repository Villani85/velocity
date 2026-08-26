# Come il gestore della qualita' e' stato collegato

Queste sono le istruzioni di integrazione che stavano in coda a
`src/core/Qualita.ts`, dentro un commento da centotrentaquattro righe.

**Sono state eseguite.** Il collegamento c'e' da tempo: `Esperienza` costruisce
il gestore, gli chiede le impostazioni e le applica al motore. Il blocco era
rimasto li' come un ponteggio dimenticato dentro la casa finita — e un ponteggio
dentro un file di lavoro non e' documentazione, e' rumore: chi apre `Qualita.ts`
per capire come funziona trova per un ottavo del file istruzioni su come
costruire qualcosa che esiste gia'.

Sta qui perche' la storia di una decisione vale, e perche' il giorno in cui
qualcuno dovesse rifare quel collegamento — un altro progetto, una riscrittura —
questo e' esattamente il testo che gli serve. Nel sorgente non serviva piu' a
nessuno.

---

/* ------------------------------------------------------------------ *\
 * DA AGGIUNGERE A `core/Esperienza.ts` — righe esatte.
 * ------------------------------------------------------------------
 *
 * (1) IN TESTA, fra gli altri import:
 *
 *     import { PointLight, DirectionalLight } from 'three'   // aggiungerli alla lista che c'e' gia'
 *     import { Qualita, applicaLuciCorte, type Impostazioni } from './Qualita'
 *
 * (2) FRA I CAMPI della classe, accanto a `readonly scorrimento`:
 *
 *     readonly qualita: Qualita
 *     private luciCorte: PointLight[] = []
 *     private forzeCorte: number[] = []
 *     private ombraLuce: DirectionalLight | null = null
 *
 * (3) NEL COSTRUTTORE, subito dopo `this.renderer = new WebGLRenderer(...)`,
 *     al posto della riga `this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`:
 *
 *     // il livello si decide PRIMA di qualunque altra cosa: il rapporto di
 *     // pixel, la risoluzione del riflesso e lo stato delle ombre sono tutte
 *     // decisioni che a caldo costano care o non si possono piu' prendere
 *     this.qualita = new Qualita(this.renderer.getContext())
 *     console.log(this.qualita.descrivi())
 *     this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.qualita.impostazioni.pixelRatio))
 *     // LE OMBRE SI ACCENDONO O NO QUI E BASTA: `shadowMap.enabled` e'
 *     // un define, cambiarlo a caldo ricompila tutta la scena
 *     this.renderer.shadowMap.enabled = this.qualita.impostazioni.ombra > 0
 *
 * (4) NEL COSTRUTTORE, al posto di `this.riflesso = new Riflesso(60, normaliMarmo())`:
 *
 *     this.riflesso = new Riflesso(60, normaliMarmo(), this.qualita.impostazioni.riflessoRisoluzione)
 *
 * (5) NEL COSTRUTTORE, subito dopo `this.scena.add(costruisciLuci())`:
 *
 *     // le dodici della corte e la direzionale si raccolgono UNA VOLTA, con
 *     // le loro intensita' vere: dopo il primo spegnimento non sarebbero
 *     // piu' leggibili dalle luci stesse
 *     this.scena.getObjectByName('CORTE')?.traverse((o) => {
 *       if ((o as PointLight).isPointLight) this.luciCorte.push(o as PointLight)
 *     })
 *     this.forzeCorte = this.luciCorte.map((l) => l.intensity)
 *     this.ombraLuce = this.scena.getObjectByName('OMBRA') as DirectionalLight | null
 *
 * (6) NEL COSTRUTTORE, come ULTIMA riga (dopo `addEventListener('resize', ...)`):
 *
 *     this.applicaQualita()
 *
 * (7) UN METODO NUOVO, accanto a `tara`:
 *
 *     / **
 *      * Riporta sul motore cio' che il livello ha deciso. Si chiama solo al
 *      * cambio di livello, mai per fotogramma: ognuna di queste righe rialloca
 *      * qualcosa o ricompila un materiale, e farlo sessanta volte al secondo
 *      * costerebbe piu' di tutto quello che sta risparmiando.
 *      * /
 *     private applicaQualita() {
 *       const q: Impostazioni = this.qualita.impostazioni
 *
 *       this.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio))
 *       this.composer?.setPixelRatio(this.renderer.getPixelRatio())
 *
 *       if (this.bloom) this.bloom.enabled = q.bloom
 *       if (this.ao) {
 *         this.ao.enabled = q.occlusione
 *         // cambiare i campioni ricompila UN materiale a schermo intero, non
 *         // la scena: e' un intoppo da pochi millisecondi ed e' il motivo per
 *         // cui si tocca solo qui
 *         if (q.occlusione) this.ao.updateGtaoMaterial({ samples: q.campioniOcclusione })
 *       }
 *
 *       // il riflesso si spegne dal ciclo (vedi punto 8): qui basta il caso in
 *       // cui il livello lo vieta del tutto
 *       this.riflesso.attivo = this.riflesso.attivo && q.riflesso
 *
 *       if (this.ombraLuce && q.ombra > 0) {
 *         if (this.ombraLuce.shadow.mapSize.x !== q.ombra) {
 *           this.ombraLuce.shadow.mapSize.set(q.ombra, q.ombra)
 *           // la mappa vecchia va buttata a mano: `mapSize` da sola non la
 *           // rialloca, e three continuerebbe a disegnare nella vecchia
 *           this.ombraLuce.shadow.map?.dispose()
 *           this.ombraLuce.shadow.map = null
 *         }
 *         // congelata: la direzionale e l'auto non si muovono, quindi la mappa
 *         // e' identica a se stessa ogni fotogramma. Si chiede un aggiornamento
 *         // solo quando la scena cambia davvero.
 *         this.ombraLuce.shadow.autoUpdate = q.ombraViva
 *         this.ombraLuce.shadow.needsUpdate = true
 *       }
 *
 *       applicaLuciCorte(this.luciCorte, this.forzeCorte, q.luciCorte)
 *       this.ridimensiona()
 *     }
 *
 * (8) IN `fotogramma()`, al posto di
 *     `this.riflesso.attivo = !dentro && !corridoio`:
 *
 *     this.riflesso.attivo = this.qualita.impostazioni.riflesso && !dentro && !corridoio
 *
 * (9) IN `fotogramma()`, subito dopo `this.ultimo = ora`:
 *
 *     if (this.qualita.aggiorna(dt)) {
 *       console.log('[qualita] ->', this.qualita.livello,
 *         this.qualita.millisecondi.toFixed(1), 'ms')
 *       this.applicaQualita()
 *     }
 *
 * (10) E DUE PUNTI IN CUI SERVE UN AGGIORNAMENTO D'OMBRA quando e' congelata,
 *      perche' la scena cambia davvero: in fondo a `caricaAuto()` e nel
 *      fotogramma in cui `dentro` cambia valore —
 *
 *      if (this.ombraLuce) this.ombraLuce.shadow.needsUpdate = true
 *
 * (11) DOVE SI COSTRUISCE L'ABITACOLO (`scene/Abitacolo.ts` lo accetta come
 *      opzione `mobile`), passare la decisione del livello:
 *
 *      new Abitacolo({ mobile: this.qualita.impostazioni.abitacoloMobile })
 *
 * (12) E per `prefers-reduced-motion`, QUESTO PASSO NON VA PIU' FATTO QUI.
 *
 *      Diceva: `this.scorrimento.inerzia = this.qualita.motoRidotto ? 0 : 1`.
 *      La frase che lo accompagnava — «si spegne l'inerzia e la deriva
 *      automatica della camera, NON i beat» — era ed e' la cosa giusta, ed e'
 *      il cuore di tutto il capitolo. Sbagliati erano i due numeri (in
 *      `core/Scorrimento.ts` inerzia 1 vuol dire ISTANTANEO e 0 vuol dire
 *      fermo: erano al contrario, e cosi' scritto avrebbe congelato la camera
 *      invece di toglierle il ritardo) e soprattutto il POSTO: questa lista
 *      descrive `applicaQualita()`, che gira solo al cambio di livello.
 *
 *      Adesso lo scorrimento legge da se' `RIDOTTO` da `core/Moto.ts` a ogni
 *      fotogramma, quindi non c'e' niente da riportargli e la preferenza vale
 *      anche se il livello non cambia mai.
\* ------------------------------------------------------------------ */
