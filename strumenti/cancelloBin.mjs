/** IL CANCELLO DELL'ULTIMO BIN.
 *
 *  PERCHE' ESISTE. Il difetto piu' grosso di questa sessione non l'ha visto
 *  nessuno dei centotto strumenti del repo, e la ragione e' che misurano tutti
 *  MEDIANE E PERCENTILI. Una mediana non vede la saturazione: una mappa con
 *  meta' dei texel schiacciati contro 255 restituisce una mediana
 *  perfettamente plausibile, e la parte di ampiezza finita contro il soffitto
 *  non compare da nessuna parte.
 *
 *  Un istogramma con un picco sul primo o sull'ultimo bin e' SEMPRE un errore:
 *  vuol dire che il segnale e' stato schiacciato contro il fondo del
 *  contenitore e una parte e' stata buttata. Si controlla PRIMA di salvare.
 *
 *  E LANCIA, non avvisa. Non e' pedanteria: e' la stessa lezione di
 *  `vite-documento.ts`. Un generatore che in silenzio produce un risultato
 *  sbagliato e' peggio del valore scritto a mano, perche' quello almeno si
 *  vede. Se la saturazione e' voluta, va DICHIARATA alzando la soglia nel
 *  punto della chiamata, con la ragione accanto.
 */
/* ---------------------------------------------------------------------------
   UNA CORREZIONE ALLA REGOLA, TROVATA APPLICANDOLA.

   La prima stesura diceva: «un picco sul primo o sull'ultimo bin e' SEMPRE un
   errore». E' vero per un canale che porta un CAMPO CONTINUO — una ruvidita'
   variabile, un'altezza, un'occlusione: li' il fondo scala e' il segno che
   qualcosa e' stato schiacciato.
   E' FALSO per un canale che porta CLASSI DI MATERIALE. Ruvidita' 0 non e'
   un valore schiacciato: e' uno specchio, ed e' esattamente cosa deve valere
   un vetro. Metallico 0 non e' un errore: e' un dielettrico, cioe' quasi tutto
   quello che esiste.
   Applicandolo per la prima volta il cancello ha bocciato una mappa GIUSTA
   proprio sui texel di canopy e cromature che questa versione esiste per
   salvare. Se l'unico modo di farlo passare fosse stato alzare la soglia per
   tutti, lo strumento sarebbe stato zittito del tutto — e uno strumento che
   si puo' solo spegnere viene spento.
   Quindi le soglie sono separate per ALTO e per BASSO, e per canale. Cosi' su
   una ruvidita' si puo' dire «a 255 quasi niente, a 0 quanto serve», che e'
   la frase vera.
   --------------------------------------------------------------------------- */

export function cancelloBin(dati, maschera, nome, soglia = 0.02, canali = ['R', 'G', 'B']) {
  /* LA SOGLIA PUO' ESSERE PER CANALE, e serve. Il canale rosso di una ORM
     porta l'occlusione ambientale, e finche' non e' cotta vale 1,000
     dappertutto per costruzione: e' saturo, ed e' GIUSTO che lo sia. Se il
     cancello non potesse distinguerlo, l'unico modo di farlo passare sarebbe
     alzare la soglia per tutti — cioe' spegnerlo dove serve. Uno strumento
     che si puo' zittire solo del tutto viene zittito del tutto. */
  const uno = (v) => (typeof v === 'number' ? { alto: v, basso: v } : { alto: v.alto ?? 0.02, basso: v.basso ?? 0.02 })
  const soglie = (Array.isArray(soglia) ? soglia : [soglia, soglia, soglia]).map(uno)
  let passa = true
  const righe = []
  for (let c = 0; c < 3; c++) {
    let alto = 0, basso = 0, n = 0
    for (let i = 0; i < maschera.length; i++) {
      if (!maschera[i]) continue
      const v = dati[i * 3 + c]
      n++
      if (v >= 255) alto++
      if (v <= 0) basso++
    }
    if (!n) continue
    const a = alto / n, b = basso / n
    const ko = a > soglie[c].alto || b > soglie[c].basso
    if (ko) passa = false
    righe.push(
      `  ${nome} ${canali[c]}  a 255: ${(a * 100).toFixed(1)}% (max ${(soglie[c].alto * 100).toFixed(0)}%)` +
      `   a 0: ${(b * 100).toFixed(1)}% (max ${(soglie[c].basso * 100).toFixed(0)}%)   ${ko ? 'SATURO' : 'ok'}`)
  }
  console.log(righe.join('\n'))
  if (!passa) {
    throw new Error(
      `[${nome}] un canale e' saturo oltre il ${(soglia * 100).toFixed(0)}%. La mappa NON si salva.\n` +
      `Se la saturazione e' voluta va dichiarata alzando la soglia nel punto della chiamata, con la ragione.`,
    )
  }
}
