import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
} from 'three'

import { AUTO } from './Esterno'

/**
 * IL GREY BOX DELL'INTERNO.
 *
 * E' una scena SEPARATA, e deve esserlo: e' l'altra meta' della decisione
 * D2. Se l'interno fosse un dettaglio della stessa auto, andrebbe caricato
 * insieme all'esterno — e vorrebbe dire far scaricare l'abitacolo a
 * qualcuno che magari non arrivera' mai al 62% dello scorrimento. Due
 * scene distinte permettono di caricare la seconda mentre si guarda la
 * prima, e di scambiarle dietro il montante senza che si veda.
 *
 * LA LASTRA DEL PARABREZZA E' L'OGGETTO PIU' IMPORTANTE DI QUESTO FILE.
 *
 * Non e' un fondo: e' un piano nel mondo 3D, a una distanza dichiarata
 * davanti alla camera (decisione D11). La differenza si vede appena la
 * camera vibra — e vibrera', perche' e' la vibrazione a raccontare la
 * velocita'. Un fondo fissato allo schermo resterebbe incollato mentre
 * l'abitacolo trema, e in un istante si capirebbe che fuori non c'e'
 * niente. Un piano nel mondo si muove come si deve, perche' e' li'.
 *
 * E per lo stesso motivo la lastra e' l'UNICA cosa che si vede oltre il
 * vetro: nessuna geometria esterna, nessun ambiente realtime. Fermo e
 * video vengono dalla stessa sorgente, quindi non c'e' nessun momento in
 * cui due sistemi di rendering devono somigliarsi (decisione D3-bis).
 */

function grigio(chiaro: number, ruvido = 0.8) {
  const m = new MeshStandardMaterial({ roughness: ruvido, metalness: 0 })
  m.color.setRGB(chiaro, chiaro, chiaro)
  return m
}

export function costruisciInterno() {
  const gruppo = new Group()
  gruppo.name = 'INTERNO'

  const plastica = grigio(0.075)
  const scuro = grigio(0.035, 0.9)

  // la plancia: un volume davanti e sotto lo sguardo. Serve a bloccare la
  // parte bassa del fotogramma, che e' cio' che fa sentire di essere DENTRO
  // qualcosa invece che sospesi in un punto dello spazio.
  const plancia = new Mesh(new BoxGeometry(0.62, 0.30, 1.72), plastica)
  plancia.position.set(AUTO.occhi.x + 0.72, 0.86, 0)
  plancia.name = 'PLANCIA'
  gruppo.add(plancia)

  const volante = new Mesh(new TorusGeometry(0.175, 0.022, 10, 28), scuro)
  volante.position.set(AUTO.occhi.x + 0.44, 0.86, AUTO.occhi.z)
  volante.rotation.y = Math.PI / 2
  volante.rotation.x = 0.38
  volante.name = 'VOLANTE'
  gruppo.add(volante)

  // il quadro strumenti: spento adesso, si accende nel beat 'accensione'.
  // E' MeshBasic perche' e' una sorgente, non una superficie illuminata —
  // e sopra 1 ci pensera' il bloom a raccoglierlo. La soglia del bloom sta
  // sopra 1 apposta: e' la lezione pagata sul progetto precedente, dove a
  // 0,86 in spazio lineare qualunque superficie chiara fioriva.
  const quadro = new Mesh(
    new PlaneGeometry(0.34, 0.13),
    new MeshBasicMaterial({ color: 0x0a0c10 }),
  )
  quadro.position.set(AUTO.occhi.x + 0.62, 0.94, AUTO.occhi.z)
  quadro.rotation.y = -Math.PI / 2
  quadro.rotation.z = 0.22
  quadro.name = 'QUADRO'
  gruppo.add(quadro)

  // montanti e cielo: incorniciano il parabrezza. Sono loro a dire che la
  // lastra e' vista ATTRAVERSO qualcosa.
  for (const lato of [1, -1]) {
    const m = new Mesh(new BoxGeometry(0.10, 0.86, 0.12), plastica)
    m.position.set(AUTO.occhi.x + 0.66, 1.34, 0.86 * lato)
    m.rotation.z = 0.58
    gruppo.add(m)
  }
  const cielo = new Mesh(new BoxGeometry(1.5, 0.10, 1.9), plastica)
  cielo.position.set(AUTO.occhi.x - 0.1, 1.52, 0)
  gruppo.add(cielo)

  return gruppo
}
