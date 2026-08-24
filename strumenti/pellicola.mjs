/**
 * LA PELLICOLA — misura le tre cose che separano un render da una fotografia.
 *
 * PERCHE' ESISTE. Due revisioni esterne hanno detto che la strada «sembra una
 * tech demo». Le parole di una revisione non sono un numero, e su questo
 * progetto e' gia' successo tre volte che uno strumento restituisse un numero
 * plausibile e sbagliato invece di un errore. Quindi prima di toccare uno
 * shader servono i numeri di partenza, e devono essere gli stessi numeri dopo.
 *
 * Misura cinque grandezze, tutte in unita' leggibili (1/255, pixel, rapporti):
 *
 * 1. GRANA — la deviazione standard del residuo ad alta frequenza, presa SOLO
 *    dove l'immagine e' piatta. Un render pulito da' 0,1-0,3 su 255 (cioe'
 *    niente, solo l'arrotondamento a otto bit); una pellicola scansionata sta
 *    fra 1,5 e 4. E' l'unica misura che DEVE girare su PNG: un JPEG a qualita'
 *    88 cancella proprio la banda che si sta misurando, e lo strumento
 *    restituirebbe «niente grana» anche dopo averla aggiunta. Trappola pagata:
 *    il primo giro misurava i .jpeg di `uno.mjs` e dava 0,35 prima e 0,38 dopo.
 *
 * 2. ABERRAZIONE CROMATICA — in PIXEL di scarto fra il rosso e il blu, non in
 *    una scala inventata. Il modello e' quello vero: un'aberrazione laterale
 *    sposta i canali lungo il RAGGIO, quindi R(x) = L(x + a*r) e B(x) =
 *    L(x - a*r). Sottraendo, R - B = (2*a*r) * dL/dr. Cioe' la differenza fra
 *    i canali e' PROPORZIONALE alla derivata radiale della luminanza, e il
 *    coefficiente di proporzionalita' e' lo scarto in pixel. Si regredisce
 *    (R-B) su dL/dr sui pixel di bordo e si legge la pendenza.
 *
 *    E si toglie prima la CROMA LOCALE (la media 9x9 di R-B): senza, un bordo
 *    fra due cose di colore diverso — una feritoia ambra su pietra scura —
 *    entra nel conto come se fosse un'aberrazione. Il primo giro senza questa
 *    sottrazione dava 1,9 px su un fotogramma che non ne aveva nessuna.
 *
 * 3. VIGNETTATURA — con `--vignetta` si scatta DUE volte lo stesso fotogramma,
 *    la seconda con le manopole di `Grado` azzerate dalla pagina, e si dividono
 *    i due pixel per pixel. Il contenuto si semplifica e quel che resta e'
 *    letteralmente la curva di caduta, letta per fasce di raggio. E' l'unico
 *    modo onesto: il rapporto angoli/centro, che pure si stampa, dipende da
 *    cosa c'e' negli angoli, e sul fotogramma del beat `velocita` meta' della
 *    corona esterna e' il quadro strumenti, che e' HTML sopra la tela e la
 *    vignettatura dello shader non lo tocca. Con quel rapporto la vignettatura
 *    sembrava assente e invece c'era: cambiava del due per cento.
 *
 * 4. DETTAGLIO — l'energia passa-alto dentro un rettangolo, in 1/255. Dice
 *    quanto e' POVERA una superficie. ATTENZIONE AL LIMITE: non risolve le
 *    differenze piccole, perche' il rumore fra due scatti della STESSA
 *    versione (vibrazione della camera, fase della strada) e' dello stesso
 *    ordine. Misurato: fra due scatti identici la differenza mediana di
 *    luminanza sulla banchina vale 2,9 su 255, e una modifica che ne produce
 *    2,3 non si distingue. Serve per i salti grossi, non per le rifiniture.
 *
 * 5. SCALINO DEI PILASTRI — quanto e' variegato il profilo ORIZZONTALE di un
 *    pilastro, cioe' se dentro la sagoma c'e' un volume o una campitura. Vedi
 *    il commento sul posto, che racconta anche la versione sbagliata di questa
 *    misura e perche' peggiorava quando l'immagine migliorava.
 *
 *   node strumenti/pellicola.mjs 0.78 nome      cattura in PNG e misura
 *   node strumenti/pellicola.mjs docs/provini/x.png   misura e basta
 *   node strumenti/pellicola.mjs 0.78 nome --vignetta  con il confronto a manopole spente
 */
import sharp from 'sharp'
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'
import { existsSync } from 'node:fs'

const RADICE = 'C:/Users/Giuseppe/Webingegno/velocity'

/* I RETTANGOLI, in frazione di schermo cosi' non dipendono dal formato.
 *
 * Sono scelti per ESCLUDERE la sovrimpressione: il titolo, il quadro, la
 * barra in alto sono HTML nitidissimo, e un rettangolo che ne prende un pezzo
 * misura la tipografia invece della scena. Il primo giro prendeva l'asfalto
 * fino a x 0,80 e il numero saliva del quaranta per cento per via della «E» di
 * «E adesso guidi tu.» */
const ZONE = {
  /** l'asfalto a sinistra della mezzeria, sotto l'orizzonte e sopra il cofano */
  manto: [0.12, 0.42, 0.36, 0.56],
  /** il cielo sopra il colonnato: e' li' che si vedono le fasce a otto bit */
  cielo: [0.10, 0.17, 0.32, 0.25],
  /** il fondo strada intorno al punto di fuga: quanta STRUTTURA sopravvive
   *  nella foschia. Un numero basso qui e' il «lenzuolo» che le revisioni
   *  hanno chiamato «piano grigio piatto» */
  lontano: [0.44, 0.395, 0.56, 0.44],
  /** la banchina di pietrisco fra il cordolo e i pilastri: e' la campitura
   *  piu' grande del fotogramma e finche' e' stata una tinta unita e' stata
   *  anche il «piano grigio piatto» delle revisioni */
  /* Il rettangolo e' stato spostato una volta e vale la pena dire perche':
     il primo (x 0,08-0,34, y 0,395-0,428) prendeva i piedi dei pilastri e la
     riga di margine della carreggiata, cioe' due cose che si spostano da uno
     scatto all'altro e sono cento volte piu' contrastate della ghiaia. Il
     numero oscillava fra 7,5 e 10,1 su fotogrammi identici e non distingueva
     niente. Questo sta interamente fra il margine e i piedi. */
  banchina: [0.21, 0.428, 0.40, 0.455],
}

function luminanza(d, i) {
  return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
}

async function carica(via) {
  const im = sharp(via)
  const { data, info } = await im.raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: C } = info
  const L = new Float32Array(W * H)
  const R = new Float32Array(W * H)
  const B = new Float32Array(W * H)
  for (let i = 0, p = 0; p < W * H; p++, i += C) {
    L[p] = luminanza(data, i)
    R[p] = data[i]
    B[p] = data[i + 2]
  }
  return { W, H, L, R, B }
}

/** media su una finestra quadrata (2k+1), con i bordi ripiegati */
function media(A, W, H, k) {
  const t = new Float32Array(W * H)
  const o = new Float32Array(W * H)
  const n = 2 * k + 1
  for (let y = 0; y < H; y++) {
    let s = 0
    for (let x = -k; x <= k; x++) s += A[y * W + Math.min(W - 1, Math.max(0, x))]
    for (let x = 0; x < W; x++) {
      t[y * W + x] = s / n
      const fuori = Math.min(W - 1, Math.max(0, x - k))
      const dentro = Math.min(W - 1, Math.max(0, x + k + 1))
      s += A[y * W + dentro] - A[y * W + fuori]
    }
  }
  for (let x = 0; x < W; x++) {
    let s = 0
    for (let y = -k; y <= k; y++) s += t[Math.min(H - 1, Math.max(0, y)) * W + x]
    for (let y = 0; y < H; y++) {
      o[y * W + x] = s / n
      const fuori = Math.min(H - 1, Math.max(0, y - k))
      const dentro = Math.min(H - 1, Math.max(0, y + k + 1))
      s += t[dentro * W + x] - t[fuori * W + x]
    }
  }
  return o
}

function mediana(a) {
  const b = Float64Array.from(a).sort()
  return b.length ? b[b.length >> 1] : 0
}

function misura(im) {
  const { W, H, L, R, B } = im
  const fuoriCampo = (x, y) => {
    // UN MARGINE SOTTILE E BASTA. La sovrimpressione adesso e' spenta prima
    // dello scatto (vedi la corsa in fondo), quindi non c'e' piu' niente da
    // ritagliare se non i due pixel di bordo, dove il filtro della media non
    // ha vicini veri.
    const m = 0.01
    return x < m * W || x > W - m * W || y < m * H || y > H - m * H
  }

  // ---------------------------------------------------------------- GRANA
  // Il residuo rispetto alla media 3x3 e' la banda piu' alta. Si prende solo
  // dove la varianza 9x9 e' bassa, cioe' dove NON c'e' dettaglio vero: se no
  // si misura lo spigolo di un pilastro e si chiama grana.
  const m3 = media(L, W, H, 1)
  const res = new Float32Array(W * H)
  for (let p = 0; p < W * H; p++) res[p] = L[p] - m3[p]
  const q = new Float32Array(W * H)
  for (let p = 0; p < W * H; p++) q[p] = L[p] * L[p]
  const m9 = media(L, W, H, 4)
  const q9 = media(q, W, H, 4)
  const varianza = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (fuoriCampo(x, y)) continue
      const p = y * W + x
      varianza.push([Math.max(0, q9[p] - m9[p] * m9[p]), p])
    }
  }
  varianza.sort((a, b) => a[0] - b[0])
  const piatti = varianza.slice(0, Math.max(1, Math.floor(varianza.length * 0.15)))
  let s2 = 0
  for (const [, p] of piatti) s2 += res[p] * res[p]
  // il residuo di una media 3x3 su rumore bianco conserva 8/9 della varianza:
  // si riporta indietro, se no si sottostima del sei per cento
  const grana = Math.sqrt(s2 / piatti.length) / Math.sqrt(8 / 9)

  /* E LA STESSA COSA CONTRO UNA MEDIA PIU' LARGA, perche' UNA SOLA MISURA QUI
     MENTE.
     Il residuo rispetto a 3x3 vede solo cio' che cambia da un pixel al
     successivo. Una grana di PELLICOLA non e' cosi': il grano sta intorno al
     pixel e mezzo, quindi due pixel vicini si somigliano, la media 3x3 li
     segue, e il residuo si annulla. Misurata solo con 3x3, una grana vera
     restituisce meta' della propria ampiezza e si e' tentati di raddoppiarla
     finche' il numero torna — cioe' di stendere sul fotogramma il doppio della
     grana che serviva. Il residuo contro 9x9 la vede tutta. Il DIVARIO fra i
     due numeri e' anche la misura di quanto e' GROSSO il grano: uguali vuol
     dire disturbo digitale da un pixel, doppio vuol dire pellicola. */
  let s2l = 0
  for (const [, p] of piatti) { const r = L[p] - m9[p]; s2l += r * r }
  const granaLarga = Math.sqrt(s2l / piatti.length)

  // -------------------------------------------------- ABERRAZIONE, IN PIXEL
  const D = new Float32Array(W * H)
  for (let p = 0; p < W * H; p++) D[p] = R[p] - B[p]
  const croma = media(D, W, H, 4)
  let sxy = 0, sxx = 0, n = 0
  const cx = W / 2, cy = H / 2
  const scala = Math.hypot(W / 2 * (W / H) / (W / H), H / 2) // meta' altezza
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (fuoriCampo(x, y)) continue
      const p = y * W + x
      // versore radiale, e derivata della luminanza lungo di esso
      const dx = x - cx, dy = y - cy
      const r = Math.hypot(dx, dy)
      if (r < 0.35 * scala) continue // al centro l'aberrazione e' zero: non porta informazione
      const ux = dx / r, uy = dy / r
      const gx = (L[p + 1] - L[p - 1]) * 0.5
      const gy = (L[p + W] - L[p - W]) * 0.5
      const dl = gx * ux + gy * uy
      if (Math.abs(dl) < 6) continue // solo bordi veri
      const y0 = D[p] - croma[p]
      sxy += dl * y0
      sxx += dl * dl
      n++
    }
  }
  // pendenza = 2*a*r mediato sui pixel usati; si normalizza a r = meta' altezza
  const aberrazione = sxx > 0 ? sxy / sxx : 0

  // ---------------------------------------------------------- VIGNETTATURA
  const centro = [], angoli = []
  const asp = W / H
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W - 0.5, v = y / H - 0.5
      const r = Math.hypot(u * asp, v)
      const p = y * W + x
      if (r < 0.12) centro.push(L[p])
      else if (r > 0.62 && !fuoriCampo(x, y)) angoli.push(L[p])
    }
  }
  const vig = mediana(angoli) / Math.max(1e-6, mediana(centro))

  // -------------------------------------------------------------- DETTAGLIO
  const m2 = media(L, W, H, 2)
  const dettaglio = {}
  for (const [nome, [x0, y0, x1, y1]] of Object.entries(ZONE)) {
    let s = 0, c = 0, lm = 0
    for (let y = Math.round(y0 * H); y < Math.round(y1 * H); y++) {
      for (let x = Math.round(x0 * W); x < Math.round(x1 * W); x++) {
        const p = y * W + x
        const d = L[p] - m2[p]
        s += d * d; lm += L[p]; c++
      }
    }
    dettaglio[nome] = { hf: Math.sqrt(s / c), luce: lm / c }
  }

  /* ------------------------------------- LO SCALINO DENTRO IL PILASTRO
   *
   * La critica precisa era «paletti neri come parallelepipedi». Un
   * parallelepipedo di colore uniforme si misura, ma NON come veniva in mente
   * per primo, e vale la pena scrivere il tentativo fallito perche' e' il
   * modo in cui questa misura si sbaglia.
   *
   * PRIMO TENTATIVO, SBAGLIATO: prendere il cinque per cento piu' scuro della
   * fascia dei pilastri e misurarne lo scarto. Sembra ragionevole e da' un
   * numero, e il numero PEGGIORA quando il pilastro migliora. La ragione e'
   * che quel gruppo e' definito da una soglia: appena una delle due facce
   * diventa piu' chiara ESCE dal gruppo, e dentro resta solo la faccia scura —
   * cioe' una popolazione piu' omogenea di prima. La misura registrava la
   * propria selezione, non l'oggetto.
   *
   * QUELLO CHE FUNZIONA e' guardare il PROFILO ORIZZONTALE, cioe' misurare il
   * pilastro attraverso, come lo si guarda. Su ogni riga della fascia si
   * cercano i tratti contigui di pixel scuri lunghi almeno dieci — ogni tratto
   * e' un pilastro, dovunque sia finito in questo scatto, e cosi' la misura non
   * ha bisogno di un rettangolo che lo insegua. Dentro il tratto si butta via
   * il 18 per cento piu' chiaro (e' la feritoia, che e' una sorgente e non una
   * faccia) e si legge quanto e' distante il chiaro dallo scuro rispetto al
   * mezzo. Una lastra di colore unico da' un numero basso; due facce con luci
   * diverse e uno spigolo in mezzo lo alzano. */
  const scal = (() => {
    const y0 = Math.round(0.27 * H), y1 = Math.round(0.39 * H)
    const banda = []
    for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) banda.push(L[y * W + x])
    banda.sort((a, b) => a - b)
    const soglia = banda[banda.length >> 1] * 0.62
    let somma = 0, peso = 0, quanti = 0
    for (let y = y0; y < y1; y++) {
      let x = 0
      while (x < W) {
        if (L[y * W + x] >= soglia) { x++; continue }
        let j = x
        while (j < W && L[y * W + j] < soglia) j++
        const larg = j - x
        if (larg >= 10) {
          const v = []
          for (let k = x; k < j; k++) v.push(L[y * W + k])
          v.sort((a, b) => a - b)
          const u = v.slice(0, Math.max(3, Math.floor(v.length * 0.82)))
          const q = (f) => u[Math.floor((u.length - 1) * f)]
          somma += ((q(0.85) - q(0.15)) / Math.max(1e-6, q(0.5))) * larg
          peso += larg
          quanti++
        }
        x = j
      }
    }
    return { rap: somma / Math.max(peso, 1), tratti: quanti }
  })()

  return { grana, granaLarga, aberrazione, vig, dettaglio, scal, n }
}

function stampa(titolo, m) {
  console.log(`\n--- ${titolo}`)
  console.log(`  grana fine     ${m.grana.toFixed(3)} su 255   (residuo contro 3x3)`)
  console.log(`  grana larga    ${m.granaLarga.toFixed(3)} su 255   (residuo contro 9x9: e' questa l'ampiezza vera)`)
  console.log(`  aberrazione    ${m.aberrazione.toFixed(3)} px di scarto R-B sui bordi radiali (${m.n} pixel usati)`)
  console.log(`  vignettatura   angoli/centro = ${m.vig.toFixed(3)}`)
  for (const [k, v] of Object.entries(m.dettaglio)) {
    console.log(`  dettaglio ${k.padEnd(7)} hf ${v.hf.toFixed(2)}   luce media ${v.luce.toFixed(1)}`)
  }
  console.log(`  scalino pilastri  ${m.scal.rap.toFixed(3)}   (profilo orizzontale, ${m.scal.tratti} tratti trovati)`)
}

// ------------------------------------------------------------------- corsa
const arg = process.argv[2]
const nome = process.argv[3] ?? 'pellicola'
const ancheVignetta = process.argv.includes('--vignetta')

if (arg && !Number.isFinite(Number(arg))) {
  const via = existsSync(arg) ? arg : `${RADICE}/${arg}`
  stampa(via, misura(await carica(via)))
  process.exit(0)
}

const q = Number(arg ?? 0.78)
const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
const p = await b.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 })
p.setDefaultTimeout(120000)
await p.route('**/@vite/client', (r) => r.fulfill({ body: 'export {}', contentType: 'application/javascript' }))
await p.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => !!window.esperienza, null, { timeout: 120000 })
await p.waitForFunction(() => window.esperienza.autoPronta && window.esperienza.ambientePronto, null, { timeout: 180000 }).catch(() => console.log('  (asset non tutti pronti)'))
await p.evaluate(() => window.fissaQualita('alto'))
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none' })

/* SI SPEGNE TUTTO CIO' CHE NON E' LA TELA, e senza questo lo strumento MENTE.
 *
 * L'ho pagato al primo giro sull'aberrazione. La misura e' una regressione sui
 * pixel di bordo, e il fotogramma intero e' pieno di bordi che l'aberrazione
 * NON ce l'hanno per costruzione: il titolo, il quadro strumenti, la cornice
 * sono HTML sopra la tela, e questa passata lavora sotto di loro. Sono anche i
 * bordi piu' CONTRASTATI del fotogramma, quindi pesano piu' di tutti nella
 * regressione e la tirano verso zero: con 1,3 px scritti nello shader lo
 * strumento ne leggeva 0,27, e la conclusione naturale sarebbe stata «lo
 * shader non funziona» invece di «lo strumento sta misurando la tipografia».
 *
 * Stessa cosa, meno grave, sulla grana: i pixel del quadro sono piattissimi e
 * puliti, quindi entrano di diritto nel quindici per cento piu' piatto e
 * abbassano la media.
 *
 * Si nasconde con la visibilita' e non con display:none: il ciclo di disegno
 * misura questi elementi (vedi `ui/Voci.ts`, che passa a `Grado` il riquadro
 * del testo), e togliergli il riflusso cambierebbe la scena invece che la
 * sovrimpressione. */
await p.evaluate(() => {
  const tela = document.getElementById('tela')
  const salva = new Set()
  for (let n = tela; n; n = n.parentElement) salva.add(n)
  const giro = (nodo) => {
    for (const f of Array.from(nodo.children)) {
      if (f === tela) continue
      if (salva.has(f)) { giro(f); continue }
      f.style.visibility = 'hidden'
    }
  }
  giro(document.body)
})
const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (let i = 1; i <= 40; i++) {
  await p.evaluate(([c, v]) => window.scrollTo(0, c * v), [corsa, q * (i / 40)])
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
}
/* LA POSA SI FISSA, se no due misure non sono confrontabili e non si sa.
 *
 * La strada avanza integrando i metri a ogni fotogramma, e l'andatura decade
 * da sola quando si smette di scorrere. Due esecuzioni dello strumento
 * arrivano quindi allo scatto con la fila di pilastri in due posti diversi e
 * l'auto a due velocita' diverse — nei primi giri il tachimetro segnava 97,
 * 103 e 95 su tre scatti che dovevano essere lo stesso fotogramma.
 *
 * La conseguenza non e' un po' di rumore: e' che un rettangolo di misura
 * piazzato sulla banchina in uno scatto cade su un pilastro nell'altro, e la
 * differenza fra i due numeri e' il CASO e non la modifica. E' esattamente il
 * modo in cui uno strumento restituisce un numero plausibile e sbagliato.
 *
 * Si riscrivono i due stati a ogni fotogramma degli ultimi sessanta: la scena
 * li reintegra di un passo solo, che e' sempre lo stesso passo. Non si tocca
 * nessun sorgente e non si ferma il ciclo di disegno — fermarlo cambierebbe
 * anche tutto il resto (la vibrazione della camera, il quadro, l'accensione),
 * cioe' si misurerebbe una scena che non esiste. */
for (let i = 0; i < 60; i++) {
  await p.evaluate(() => {
    const l = window.esperienza?.lastra
    if (l) { l.andatura = 78.0; l.avanzamento = 61.0 }
    return new Promise((r) => requestAnimationFrame(r))
  })
}

// PNG E NON JPEG: vedi il commento in cima. Su JPEG la misura della grana e'
// una misura del compressore.
const via = `${RADICE}/docs/provini/${nome}.png`
await p.screenshot({ path: via, type: 'png' })
const beat = await p.evaluate(() => ({ b: esperienza.regia.beat, l: +esperienza.regia.locale.toFixed(2) }))
console.log(nome, beat)
const acceso = await carica(via)
stampa(`${nome} (${beat.b} ${beat.l}) — CATENA COMPLETA`, misura(acceso))

if (ancheVignetta) {
  /* IL CONFRONTO SI FA SULLO STESSO FOTOGRAMMA, spegnendo le manopole in
     pagina invece di ricompilare lo shader con i vecchi valori.
     Non e' una comodita': e' l'unico modo di avere due misure che differiscono
     SOLO per quello che si sta misurando. Ricaricare la pagina con i valori
     vecchi cambierebbe anche il seme del tempo, la posizione della vibrazione
     della camera e l'avanzamento della strada, e la differenza fra i due
     numeri conterrebbe anche quelli. */
  const trovata = await p.evaluate(() => {
    const u = window.esperienza?.grado?.uniforms
    if (!u) return false
    u.grana.value = 0
    u.aberrazione.value = 0
    u.vignetta.value = 0
    return true
  })
  if (!trovata) console.log('  (uniform di `Grado` non raggiungibili dalla pagina: confronto saltato)')
  else {
    for (let i = 0; i < 20; i++) await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)))
    const via2 = `${RADICE}/docs/provini/${nome}_nudo.png`
    await p.screenshot({ path: via2, type: 'png' })
    const nudo = await carica(via2)
    stampa(`${nome} — A GRANA, ABERRAZIONE E VIGNETTA SPENTE`, misura(nudo))

    /* IL PROFILO RADIALE, che e' l'unica misura ONESTA della vignettatura.
     *
     * Il rapporto angoli/centro qui sopra dipende dal contenuto: se agli
     * angoli c'e' il cielo e al centro l'asfalto, e' alto comunque.
     * Dividendo pixel per pixel i due fotogrammi il contenuto si semplifica e
     * resta SOLO il fattore moltiplicativo, cioe' letteralmente la curva della
     * vignettatura letta dal fotogramma finito. */
    const W = acceso.W, H = acceso.H, asp = W / H
    const bidoni = Array.from({ length: 10 }, () => [])
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const q = y * W + x
        if (nudo.L[q] < 12) continue // sul nero il rapporto e' rumore diviso rumore
        const u = x / W - 0.5, v = y / H - 0.5
        const r = Math.hypot(u * asp, v)
        bidoni[Math.min(9, Math.floor(r / 0.095))].push(acceso.L[q] / nudo.L[q])
      }
    }
    console.log()
    console.log('  profilo radiale della vignettatura (con/senza, mediana per fascia)')
    for (let i = 0; i < 10; i++) {
      if (bidoni[i].length < 200) continue
      console.log(`    r ${(i * 0.095).toFixed(2)}-${((i + 1) * 0.095).toFixed(2)}   ${mediana(bidoni[i]).toFixed(3)}   (${bidoni[i].length} px)`)
    }
  }
}
await b.close()
