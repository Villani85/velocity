/** COLLAUDO ISOLATO della fairness della carrozzeria (zebra + specchio).
 *  Carica QUALSIASI glb (?glb=/modelli/x.glb) in una scena controllata: env a
 *  bande, vernice a specchio, normal map azzerata -> il riflesso rivela solo le
 *  normali del MODELLO. Se le bande scorrono lisce la fiancata e' fair; se si
 *  spezzano/ondeggiano, la geometria ondeggia. Isolato dalla regia dell'app. */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const par = new URLSearchParams(location.search)
const URL_GLB = par.get('glb') || '/modelli/auto2.glb'
const FREQ = Number(par.get('freq') || 26)
const VISTA = par.get('vista') || 'lato'   // lato | tre-quarti | alto

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(1200, 750); renderer.setPixelRatio(1)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0c0c0e)
const camera = new THREE.PerspectiveCamera(35, 1200/750, 0.01, 1000)

// ENV a bande orizzontali (zebra), via PMREM cosi' il mirror la campiona nitida
function zebra(freq: number) {
  const W = 1024, H = 512, d = new Uint8Array(W*H*4)
  for (let y=0;y<H;y++){ const on = Math.floor(y/H*freq)%2; const v = on?250:8
    for (let x=0;x<W;x++){ const i=(y*W+x)*4; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255 } }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat)
  t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true
  return t
}
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromEquirectangular(zebra(FREQ)).texture

const specchio = new THREE.MeshPhysicalMaterial({
  color: 0x0a0a0c, metalness: 0.0, roughness: 0.06, clearcoat: 1.0, clearcoatRoughness: 0.02, envMapIntensity: 1.6,
})

const controls = new OrbitControls(camera, renderer.domElement)
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
;(window as any).__pronto = false

function contaVertici(m: THREE.Mesh) { return (m.geometry as any)?.attributes?.position?.count ?? 0 }
function onCaricato(gltf: any) {
  const root = gltf.scene
  // mostra SOLO la carrozzeria (AUTO*), a specchio; nasconde ruote/vetri/fari
  // La carrozzeria si chiama `AUTO*` nei file di produzione, ma nei sorgenti
  // generati porta ancora il nome del generatore: se il nome non c'e', si
  // prende la mesh PIU' GRANDE. Filtrare per nome e basta faceva uscire
  // fotogrammi neri, che sembravano un difetto del modello e non del filtro.
  const mesh: THREE.Mesh[] = []
  root.traverse((o: THREE.Object3D) => { if ((o as any).isMesh) mesh.push(o as THREE.Mesh) })
  const conNome = mesh.filter((m) => m.name && m.name.startsWith('AUTO'))
  const scelti = conNome.length
    ? conNome
    : [mesh.reduce((a, b) => (contaVertici(b) > contaVertici(a) ? b : a))]
  const corpi: THREE.Object3D[] = []
  for (const m of mesh) {
    if (scelti.includes(m)) { m.material = specchio; corpi.push(m) } else { m.visible = false }
  }
  scene.add(root)
  // inquadratura dalla bounding box dei corpi
  const box = new THREE.Box3()
  corpi.forEach(c => box.expandByObject(c))
  const size = new THREE.Vector3(); box.getSize(size)
  const centro = new THREE.Vector3(); box.getCenter(centro)
  const r = Math.max(size.x, size.y, size.z)
  const dist = r * 1.9
  const pos: Record<string, THREE.Vector3> = {
    'lato': new THREE.Vector3(centro.x - dist*0.15, centro.y + r*0.15, centro.z + dist),
    'tre-quarti': new THREE.Vector3(centro.x + dist*0.8, centro.y + r*0.25, centro.z + dist*0.7),
    'alto': new THREE.Vector3(centro.x, centro.y + dist, centro.z + dist*0.2),
  }
  camera.position.copy(pos[VISTA] || pos['lato'])
  camera.lookAt(centro); controls.target.copy(centro); controls.update()
  ;(window as any).__box = { size: size.toArray(), r }
  ;(window as any).__pronto = true
}
// NIENTE retry qui: se Vite ricarica la pagina il contesto JS muore per intero
// (setTimeout compreso), quindi il rimedio sta nella CONFIGURAZIONE
// (`optimizeDeps.include`) e nello strumento che serve vuoto `@vite/client`.
loader.load(URL_GLB, (gltf) => onCaricato(gltf), undefined, (e) => { (window as any).__errore = String(e) })

function loop(){ requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera) }
loop()
