/**
 * IL MASSIMO DI ANISOTROPIA VERO, letto dalla scheda invece che scritto a
 * mano.
 *
 * IL DIFETTO. Cinque punti diversi del progetto (`Materiali.ts`, `Corte.ts`,
 * `Esterno.ts`, `Lastra.ts`) scrivevano `t.anisotropy = 8` — un numero
 * plausibile, preso a occhio. Ma l'anisotropia massima e' una proprieta' della
 * SCHEDA VIDEO, non un valore universale: molte GPU recenti arrivano a 16, e
 * chiedendo 8 si butta via meta' della nitidezza che il proprio hardware
 * potrebbe dare sulle superfici viste di taglio — l'asfalto che si allontana,
 * il pavimento della corte, ogni tessitura vista con un angolo basso.
 *
 * LA CURA. Il valore vero si legge una volta sola da
 * `renderer.capabilities.getMaxAnisotropy()`, appena il renderer esiste — e
 * SOLO li' esiste quel numero, perche' dipende dal driver. Da quel momento
 * ogni funzione che carica una tessitura lo legge da qui invece di scriverlo.
 *
 * PERCHE' UN MODULO A PARTE. Le funzioni che caricano le tessiture (`sua`,
 * `micro`, `tessitura`, `marmo`, il caricatore di `Lastra`) non hanno in mano
 * il renderer: sono funzioni di modulo, chiamate da punti diversi del
 * progetto, e passare il renderer a ognuna avrebbe voluto dire cambiare la
 * firma di dieci funzioni per un numero solo. Un valore condiviso, scritto una
 * volta all'avvio e letto ovunque, costa una riga per file.
 */
let massimo = 8

/** va chiamata una volta, appena il renderer esiste — vedi «core/Esperienza.ts» */
export function impostaAnisotropiaMassima(renderer: { capabilities: { getMaxAnisotropy(): number } }) {
  massimo = renderer.capabilities.getMaxAnisotropy() || 8
}

export function anisotropiaMassima(): number {
  return massimo
}
