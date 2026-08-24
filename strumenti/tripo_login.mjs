/**
 * LOGIN A TRIPO SENZA TERMINALE.
 *
 * PERCHE' ESISTE.
 *
 * `tripo login` rifiuta di partire se non trova un terminale interattivo:
 * il controllo e' `Boolean(process.stderr.isTTY)` in cima al comando. Ma il
 * cancello sta nel COMANDO, non nel flusso: il device flow sottostante e'
 * fatto di due chiamate HTTP e non ha bisogno di nessuna console.
 *
 * Quindi qui si chiamano direttamente `requestDeviceCode` e
 * `waitForDeviceApproval` — gli stessi moduli della CLI ufficiale, gli
 * stessi endpoint. Non e' un aggiramento di sicurezza: e' saltare un
 * controllo di comodita' che serviva solo a decidere come stampare le cose.
 *
 * LA CHIAVE NON SI VEDE MAI.
 *
 * A approvazione avvenuta il processo NON stampa la chiave e non la scrive
 * da nessuna parte: la passa a `tripo login --key` da solo, come argomento
 * di un sottoprocesso, e sullo schermo finisce solo la conferma mascherata.
 * Cosi' nessuno la legge — ne' nei log, ne' nella cronologia dei comandi.
 *
 *   node strumenti/tripo_login.mjs [ov|cn]
 */
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const RADICE = 'C:/Users/Giuseppe/AppData/Roaming/npm/node_modules/tripo-cli/dist'
const REGIONE = process.argv[2] === 'cn' ? 'cn' : 'ov'

const { requestDeviceCode, waitForDeviceApproval } = await import(
  pathToFileURL(`${RADICE}/core/device-auth.js`).href
)

const grant = await requestDeviceCode(REGIONE, undefined)

// Il codice e l'indirizzo vanno stampati SUBITO e su una riga sola ciascuno:
// li deve poter leggere un altro processo mentre questo aspetta.
console.log(`CODICE ${grant.user_code}`)
console.log(`URL ${grant.verification_url_complete}`)
console.log(`SCADE ${grant.expires_in ?? '?'}s`)

const esito = await waitForDeviceApproval(REGIONE, grant)

if (esito.status !== 'approved') {
  console.log(`ESITO ${esito.status}`)
  process.exit(1)
}

// la chiave esiste solo qui dentro, e da qui va dritta alla CLI
const chiave = esito.apikey
const mascherata = `${chiave.slice(0, 7)}…${chiave.slice(-4)}`

const cli = spawn(
  process.execPath,
  [`${RADICE}/cli.js`, 'login', '--key', chiave, '--json'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)
let uscita = ''
cli.stdout.on('data', (d) => (uscita += d))
cli.stderr.on('data', (d) => (uscita += d))
cli.on('close', (codice) => {
  console.log(`APPROVATA ${mascherata}`)
  console.log(`SALVATA exit=${codice}`)
  // si ristampa l'esito della CLI, ma con la chiave oscurata a ogni evenienza
  console.log(uscita.split(chiave).join(mascherata).trim().slice(0, 600))
  process.exit(codice ?? 0)
})
