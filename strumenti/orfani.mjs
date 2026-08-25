/** I FILE SCARICATI E MAI USATI.
 *
 *  Un materiale costruito scarica le sue tessiture ANCHE SE non veste nessuna
 *  mesh: `TextureLoader.load()` parte alla chiamata, non al primo disegno.
 *  Quindi un materiale rimasto in un elenco dopo che il modello e' cambiato
 *  continua a costare la sua banda, e non lo segnala niente — la scena e'
 *  giusta, il peso no.
 *
 *  Qui si guardano due cose insieme, ed e' l'incrocio a dare la risposta:
 *  QUALI file la pagina ha chiesto davvero (dalla rete) e QUALI materiali
 *  vestono davvero qualcosa (dalla scena). Un file chiesto il cui materiale non
 *  veste niente e' un orfano.
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const p = await b.newPage({ viewport: { width: 1200, height: 800 } })
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
p.on('pageerror', (e) => console.log('!! ERRORE:', e.message))

const chiesti = new Map()
p.on('response', async (r) => {
  const u = new URL(r.url()).pathname
  if (!/\.(webp|avif|png|jpe?g|glb|hdr|woff2?)$/i.test(u)) return
  let peso = 0
  try { peso = Number(r.headers()['content-length'] ?? 0) } catch (e) { /* niente */ }
  chiesti.set(u, peso)
})

await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => esperienza.autoPronta && esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => {})
await p.waitForTimeout(4000)

const scena = await p.evaluate(() => {
  const usati = new Set()
  const conta = {}
  const visita = (o) => {
    if (o.isMesh && o.material) {
      const mm = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mm) {
        const nome = m.name || m.type
        conta[nome] = (conta[nome] ?? 0) + 1
        for (const chiave of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'clearcoatNormalMap', 'alphaMap']) {
          const t = m[chiave]
          const src = t && (t.image?.currentSrc || t.image?.src || t.userData?.src)
          if (src) { try { usati.add(new URL(src).pathname) } catch (e) { usati.add(src) } }
        }
      }
    }
  }
  esperienza.scena.traverse(visita)
  return { usati: Array.from(usati), materiali: conta }
})

console.log('\nMATERIALI CHE VESTONO QUALCOSA')
for (const [nome, n] of Object.entries(scena.materiali).sort((a, b) => b[1] - a[1]).slice(0, 18)) {
  console.log(`  ${String(n).padStart(4)} x  ${nome}`)
}

console.log('\nFILE CHIESTI DALLA RETE, e se qualcuno li usa')
const kB = (n) => (n / 1024).toFixed(0).padStart(5) + ' kB'
let sprecati = 0
const righe = []
for (const [u, peso] of [...chiesti.entries()].sort((a, b) => b[1] - a[1])) {
  if (!/texture|modelli|hdri|poster|studio|lavori|font/.test(u)) continue
  const usato = scena.usati.some((x) => x.endsWith(u.split('/').pop()))
  if (!usato && peso > 20000) sprecati += peso
  righe.push(`  ${kB(peso)}  ${usato ? 'usato    ' : 'ORFANO?  '}${u}`)
}
console.log(righe.join('\n'))
console.log(`\ncandidati orfani sopra i 20 kB: ${(sprecati / 1024).toFixed(0)} kB`)
console.log('(«orfano?» significa che nessun MATERIALE della scena lo tiene: puo')
console.log(' essere usato altrove — sfondo, PMREM, tela 2D — quindi va confermato')
console.log(' a mano prima di toglierlo.)')

await b.close()
