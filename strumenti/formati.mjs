/**
 * LA TENUTA AI FORMATI.
 *
 * Lo stesso errore l'ho gia' pagato: un'inquadratura tarata su un asse
 * solo funziona finche' non cambia il rapporto della finestra, e poi
 * sbaglia in silenzio. Qui si misura quanto SOGGETTO resta in campo su
 * quattro formati veri, a ogni beat.
 *
 * La misura e' la frazione dei vertici dell'auto che cadono dentro il
 * fotogramma: non "sembra giusto", ma "il 96% del soggetto e' in campo".
 */
import { chromium } from 'file:///C:/Users/Giuseppe/hce-audio-rec/node_modules/playwright/index.mjs'

const FORMATI = [
  ['16:10 desktop', 1600, 1000],
  ['16:9  desktop', 1600, 900],
  ['21:9  ultrawide', 1720, 720],
  ['9:19.5 telefono', 390, 844],
]
const TAPPE = [['hero',0.06],['orbita',0.28],['lato',0.55],['accensione',0.81],['velocita',0.95]]

const b = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--force-device-scale-factor=1'] })
console.log('\n  formato            beat        soggetto in campo')
for (const [nome, L, A] of FORMATI) {
  const p = await b.newPage({ viewport:{width:L,height:A}, deviceScaleFactor:1 })
  await p.goto('http://localhost:5174/', { waitUntil:'load' })
  await p.waitForFunction(() => window.esperienza?.autoPronta && window.esperienza?.planciaPronta, null, { timeout:150000 })
  await p.waitForTimeout(700)
  const corsa = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  let da = 0
  for (const [beat, q] of TAPPE) {
    for (let i=1;i<=40;i++){ await p.evaluate(([c,v])=>window.scrollTo(0,c*v),[corsa, da+(q-da)*(i/40)]); await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r))) }
    for (let i=0;i<40;i++) await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))
    da = q
    const dentro = await p.evaluate(() => {
      const e = window.esperienza
      const dentroAbitacolo = e.regia.beat === 'accensione' || e.regia.beat === 'velocita'
      // il SOGGETTO e' l'auto vera fuori, la plancia dentro: misurare tutto
      // il gruppo includerebbe il suolo, che sta sempre in campo e falserebbe
      const g = dentroAbitacolo ? e.planciaVera : e.autoVera
      if (!g) return -1
      const cam = e.camera
      cam.updateMatrixWorld(true); cam.updateProjectionMatrix()
      let tot = 0, ok = 0
      const V = window.__V3
      g.traverse((o) => {
        if (!o.isMesh) return
        const pos = o.geometry.attributes.position
        const passo = Math.max(1, Math.floor(pos.count / 400))
        for (let i = 0; i < pos.count; i += passo) {
          const v = new V(pos.getX(i), pos.getY(i), pos.getZ(i))
          v.applyMatrix4(o.matrixWorld).project(cam)
          tot++
          if (Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z < 1) ok++
        }
      })
      return tot ? Math.round(ok / tot * 100) : -1
    })
    console.log(`  ${nome.padEnd(18)} ${beat.padEnd(11)} ${String(dentro).padStart(3)}%`)
  }
  await p.close()
}
await b.close()
