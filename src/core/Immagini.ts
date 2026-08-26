/**
 * LE IMMAGINI SI CHIEDONO UNA VOLTA SOLA.
 *
 * IL DIFETTO, MISURATO. `docs/carico.json`: `/lavori/every.webp`,
 * `/lavori/masseria.webp` e `/lavori/panino.webp` scaricati DUE VOLTE ciascuno
 * — 41 kB e circa 197 millisecondi buttati. Le due richieste finiscono a
 * distanza di nove secondi l'una dall'altra: la prima intorno ai 10, la seconda
 * intorno ai 19.
 *
 * LA CAUSA NON E' QUELLA SCRITTA NEL RAPPORTO. Il rapporto le attribuiva a un
 * disallineamento del modo CORS fra preannuncio e richiesta vera — che e' la
 * causa giusta per il panorama, e infatti li' e' stata curata cosi'. Ma le
 * copertine dei lavori non sono preannunciate da nessuna parte, e i due
 * caricatori non impostano `crossOrigin` ne' l'uno ne' l'altro: sono identici.
 *
 * La causa vera e' che i caricatori sono DUE. `scene/Insegne.ts` chiede le
 * copertine subito, per i tre schermi appesi nella hero; `scene/Vetrina3D.ts`
 * le richiede per le carte del carosello, e le sue partono DOPO l'automobile.
 * Nove secondi di distanza — esattamente i nove secondi fra le due richieste.
 *
 * Due `new Image()` sullo stesso indirizzo si appoggiano alla cache del browser
 * per non duplicare. In sviluppo quella cache non c'e', e a nove secondi di
 * distanza non c'e' nemmeno la garanzia che ci sia in produzione: dipende dalle
 * intestazioni del server, cioe' da qualcosa che questo progetto non controlla.
 *
 * FIDARSI DELLA CACHE E' UNA SCOMMESSA, CHIEDERE UNA VOLTA E' UN FATTO. Qui la
 * promessa si ricorda per indirizzo: il secondo che chiede la stessa immagine
 * riceve la stessa promessa, e quindi la stessa immagine gia' scaricata. Non
 * serve nessuna cache e non c'e' niente da configurare.
 *
 * E NON SI SCARTA MAI NIENTE. Le copertine sono undici file per centotrenta
 * chilobyte in tutto e vivono quanto la pagina: una mappa che non si svuota e'
 * la cosa giusta qui, e sarebbe la cosa sbagliata su un catalogo di mille
 * immagini. Se un giorno lo diventasse, questa e' la riga da cambiare.
 */
const promesse = new Map<string, Promise<HTMLImageElement>>()

/**
 * Chiede un'immagine, o restituisce quella gia' chiesta da qualcun altro.
 *
 * @param src l'indirizzo, che e' anche la chiave
 */
export function immagine(src: string): Promise<HTMLImageElement> {
  const gia = promesse.get(src)
  if (gia) return gia

  const p = new Promise<HTMLImageElement>((risolvi, rifiuta) => {
    const im = new Image()
    im.decoding = 'async'
    im.onload = () => risolvi(im)
    /* E SE NON ARRIVA, LA PROMESSA SI TOGLIE DALLA MAPPA.
       Tenendola, un errore di rete diventerebbe definitivo: chiunque richieda
       quell'immagine dopo riceverebbe per sempre la stessa promessa fallita,
       anche quando la rete e' tornata. Un caricamento che non si puo' ritentare
       e' peggio di uno lento. */
    im.onerror = (e) => { promesse.delete(src); rifiuta(e) }
    im.src = src
  })
  promesse.set(src, p)
  return p
}

/** quante immagini sono state chieste finora: serve solo a misurare */
export function quanteImmagini(): number {
  return promesse.size
}
