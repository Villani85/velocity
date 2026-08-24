/**
 * CHI DISEGNA GLI ALONI — bisezione automatica, non tentativi.
 *
 * IL DIFETTO. Nei due tempi interni compaiono due artefatti: una catena
 * diagonale di schegge azzurre con dei punti luminosi che taglia il cielo da
 * sinistra verso il centro, e una macchia calda color mattone incollata al
 * bordo sinistro.
 *
 * PERCHE' UNO STRUMENTO E NON UNA PROVA A OCCHIO. Su questo difetto ho gia'
 * sbagliato due deduzioni plausibili:
 *
 *   «e' la maschera del parabrezza» — rifatta tre volte, gli aloni sono rimasti
 *   identici;
 *
 *   «non e' la lastra» — dedotto spegnendo `lastra.mesh.visible` dalla console e
 *   vedendo che non cambiava niente. Il test non valeva nulla: `dentro()`
 *   riscrive quel campo A OGNI FOTOGRAMMA, quindi lo spegnimento durava un giro
 *   di ciclo. Il fatto che «la strada resta visibile anche spegnendola» avrebbe
 *   dovuto insospettirmi subito.
 *
 * Da qui la regola che questo strumento incarna: OGNI INTERRUTTORE DEVE
 * SOPRAVVIVERE AL CICLO. Si spegne il MATERIALE e non l'oggetto, perche' il
 * ciclo riscrive `visible` e non tocca `material.visible`.
 *
 * E si misura al formato del committente, 1920x540, non al mio: gli aloni si
 * vedono li' e sui provini 1200x750 quasi no. E' lo stesso errore gia' pagato
 * con la fascia vuota — misurare dove guardo io invece che dove guarda chi si
 * lamenta.
 *
 *   node strumenti/aloni.mjs
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const L = 1920, A = 540
const U = 'C:/Users/Giuseppe/Webingegno/velocity/.tmp/aloni'
mkdirSync(U, { recursive: true })

/**
 * I DUE RIQUADRI D'INTERESSE, in coordinate relative.
 *
 * Il primo prende la banda diagonale, il secondo la macchia sul bordo. Sono
 * dichiarati e non trovati automaticamente: cercare «cose strane» in
 * un'immagine e' un problema aperto, sapere DOVE guardare no.
 */
const ZONE = [
  // il cielo sopra il cofano: liscio per definizione. Tutto cio' che ci ha
  // dentro un contrasto locale e' un artefatto.
  { nome: 'schegge nel cielo', x0: 0.03, x1: 0.52, y0: 0.04, y1: 0.30, metro: 'contrasto' },
  // il bordo sinistro: qui e' tutto azzurro, quindi il caldo e' l'artefatto
  { nome: 'macchia calda', x0: 0.00, x1: 0.09, y0: 0.15, y1: 0.80, metro: 'caldo' },
]

/**
 * DUE METRI DIVERSI, perche' i due artefatti sono due cose diverse.
 *
 * Il primo punteggio contava la SATURAZIONE dentro riquadri larghi, e non ha
 * separato niente: nessuna prova scendeva sotto il novanta per cento. Il motivo
 * e' che dentro quei riquadri c'era anche mezza scena legittima — la strada, i
 * pali, il cielo — e la sua saturazione sommergeva quella degli artefatti.
 * Un punteggio che misura anche cio' che va bene non distingue niente.
 *
 * CONTRASTO. Il cielo dell'abitacolo e' una sfumatura liscia: fra un pixel e i
 * suoi vicini non c'e' quasi differenza. Le schegge invece hanno bordi netti.
 * Si confronta ogni pixel con una versione molto sfocata di se stesso e si
 * somma lo scarto: la sfumatura da' zero, una scheggia da' molto. E' lo stesso
 * principio di un filtro passa-alto, e isola esattamente cio' che non
 * appartiene a un cielo.
 *
 * CALDO. Sul bordo sinistro la scena e' azzurra dappertutto — cielo, asfalto,
 * barriere. La macchia e' arancione. Quindi si contano i pixel in cui il rosso
 * supera il blu: nella scena sana non ce n'e' nessuno, nell'artefatto ce ne
 * sono migliaia. Un metro binario dove la differenza e' binaria.
 */
async function punteggio(file, zona) {
  const meta = await sharp(file).metadata()
  const rit = {
    left: Math.round(zona.x0 * meta.width), top: Math.round(zona.y0 * meta.height),
    width: Math.round((zona.x1 - zona.x0) * meta.width),
    height: Math.round((zona.y1 - zona.y0) * meta.height),
  }
  if (zona.metro === 'caldo') {
    const { data, info } = await sharp(file).extract(rit).raw().toBuffer({ resolveWithObject: true })
    let n = 0
    for (let i = 0; i < info.width * info.height; i++) {
      const o = i * info.channels
      if (data[o] > data[o + 2] + 14 && data[o] > 26) n++
    }
    return n
  }
  const netto = await sharp(file).extract(rit).greyscale().raw().toBuffer({ resolveWithObject: true })
  const molle = await sharp(file).extract(rit).greyscale().blur(9).toColourspace('b-w')
    .raw().toBuffer({ resolveWithObject: true })
  let somma = 0
  for (let i = 0; i < netto.info.width * netto.info.height; i++) {
    const dif = Math.abs(netto.data[i] - molle.data[i])
    if (dif > 6) somma += dif
  }
  return Math.round(somma / 100)
}

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: L, height: A }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza)
await p.waitForFunction(() => window.esperienza.autoPronta).catch(() => {})
await p.evaluate(() => window.fissaQualita('alto'))

// si arriva dentro l'abitacolo scorrendo, come sempre
const corsa = await p.evaluate(() => document.body.scrollHeight - innerHeight)
for (let i = 1; i <= 60; i++) {
  await p.evaluate(([c, v]) => scrollTo(0, c * v), [corsa, 0.95 * (i / 60)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}
for (let i = 0; i < 50; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

/**
 * LE PROVE. Ognuna spegne UN ingrediente, e ognuna lo fa in un modo che il
 * ciclo non puo' disfare. Dove si spegne un materiale e non un oggetto, e'
 * esattamente per quello.
 */
const PROVE = [
  ['riferimento', () => {}],
  ['senza panorama', () => { esperienza.scena.background = null }],
  ['senza ambiente', () => { esperienza.scena.environment = null }],
  ['senza lastra', () => { esperienza.lastra.mesh.material.visible = false }],
  ['senza abitacolo', () => { esperienza.abitacolo.mesh.material.visible = false }],
  ['senza bloom', () => { if (esperienza.bloom) esperienza.bloom.enabled = false }],
  ['senza occlusione', () => { if (esperienza.ao) esperienza.ao.enabled = false }],
  ['senza quadro', () => { esperienza.quadro.mesh.material.visible = false }],
  ['senza scritta', () => { esperienza.scritta.mesh.material.visible = false }],
]

// ogni prova riparte dallo stato pulito: si rimette tutto e si spegne una cosa
const RIPRISTINA = `() => {
  const e = window.esperienza
  if (window.__fondo === undefined) { window.__fondo = e.scena.background; window.__amb = e.scena.environment }
  e.scena.background = window.__fondo
  e.scena.environment = window.__amb
  e.lastra.mesh.material.visible = true
  e.abitacolo.mesh.material.visible = true
  e.quadro.mesh.material.visible = true
  e.scritta.mesh.material.visible = true
  if (e.bloom) e.bloom.enabled = true
  if (e.ao) e.ao.enabled = true
}`

const esiti = []
for (const [nome, spegni] of PROVE) {
  await p.evaluate(new Function('return ' + RIPRISTINA)())
  await p.evaluate(spegni)
  for (let i = 0; i < 20; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
  const f = `${U}/${nome.replace(/ /g, '_')}.png`
  await p.screenshot({ path: f })
  const punti = []
  for (const z of ZONE) punti.push(await punteggio(f, z))
  esiti.push({ nome, punti })
  console.log(nome.padEnd(18), punti.map((v) => String(v).padStart(8)).join(''))
}
await b.close()

// ---- il verdetto
const rif = esiti[0].punti
console.log('\nzona'.padEnd(18) + ZONE.map((z) => z.nome.padStart(18)).join(''))
console.log('riferimento'.padEnd(18) + rif.map((v) => String(v).padStart(18)).join(''))
console.log()
for (const e of esiti.slice(1)) {
  const cali = e.punti.map((v, i) => rif[i] ? v / rif[i] : 1)
  const nomi = cali.map((c, i) => (c < 0.40 ? ZONE[i].nome : null)).filter(Boolean)
  console.log(
    e.nome.padEnd(18),
    cali.map((c) => (c * 100).toFixed(0).padStart(6) + '%').join('  '),
    nomi.length ? '  <-- COLPEVOLE di: ' + nomi.join(', ') : '',
  )
}
