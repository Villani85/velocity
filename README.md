# velocity

Hypercar in **three.js r0.185 puro** (niente React Three Fiber), Vite 8, TypeScript.
Scena notturna: vettura su podio di marmo con anello LED, pavimento riflettente,
panorama blue-hour. L'obiettivo dichiarato e' il fotorealismo in tempo reale.

Questo ramo (`sorgenti`) contiene **solo il codice**: fuori restano gli FBX Tripo,
gli HDRI e i video, che pesano 300 MB e non si leggono.

## Da dove partire

| File | Perche' |
|---|---|
| `docs/CARROZZERIA_FAIRNESS.md` | **Leggilo per primo.** Tredici sezioni su come la carrozzeria e' stata misurata e corretta, con i numeri e gli errori. |
| `src/scene/Materiali.ts` | La vernice: ORM, normal, clearcoat con buccia d'arancia, e l'elenco `FINITURE`. |
| `src/scene/Panorama.ts` | L'ambiente: panorama su sfera + strisce emissive cotte in PMREM con `fromScene`. |
| `src/core/Esperienza.ts` | Il montaggio: renderer, composer, ordine delle passate. |
| `src/transizioni/Camera.ts` | Le pose. I commenti spiegano perche' l'altezza e' 0,84 m e non 2,15. |

## La regola di questo progetto

**Non si dichiara niente che non sia stato misurato.** Gli strumenti stanno in
`strumenti/` e stampano numeri, non impressioni:

    node strumenti/fairness.mjs public/modelli/auto2.glb 0.025   # residuo da fit quadrico, in mm
    node strumenti/carrozzeria.mjs                               # mediana/90esimo/scuri della sola vettura
    node strumenti/uno.mjs 0.06 nome                             # un provino al punto 0.06 del film
    node strumenti/zone.mjs                                      # dove tagliare la mesh in zone di materiale

Quattro metri sono stati costruiti e **buttati** perche' misuravano rumore
(il conteggio delle ondulazioni per-vertice dava ~45 su qualunque modello, e non
scendeva applicando un fairing che spostava i vertici di 9 mm). La storia sta in
`CARROZZERIA_FAIRNESS.md`, ed e' la parte piu' utile del documento.

## Trappole gia' pagate, per non ripagarle

- **`gltfpack` mangia i nomi delle mesh** anche con `-kn`, e senza `-kv` butta le UV.
  Con `-vt 12` mette la scala in `KHR_texture_transform` sul materiale del glb: se
  l'applicazione sostituisce quel materiale, il modello campiona **1/16** di ogni
  tessitura e nessuno se ne accorge.
- **Non si modifica l'albero dentro `traverse()`**: la divisione cerchio/gomma non
  faceva niente e non dava errore.
- **La mesh non si taglia per assegnare i materiali**: distrugge le fughe. Le zone
  vanno fatte per pixel (`roughnessMap`, `metalnessMap`, `clearcoatMap`).
- **Chromium headless disegna in software** se non si verifica la GPU: i provini
  escono degradati e nessuno lo segnala.
