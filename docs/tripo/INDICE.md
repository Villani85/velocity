# Documentazione Tripo — copia locale

Scaricata dal pacchetto `tripo-cli@0.2.0` installato globalmente, il
2026-08-19. È la documentazione *ufficiale* che il pacchetto si porta
dietro per gli agenti, non una riscrittura.

## Cosa c'è

| file | cosa contiene |
|---|---|
| `SKILL.md` | la mappa d'insieme, quella che la CLI stampa con `tripo docs` |
| `commands/make.md` | il comando principale: testo/immagini/modello → artefatti 3D |
| `commands/generate.md` | endpoint deterministici (text/image/multiview → model) |
| `commands/process.md` | texture, conversione, retopology, decimazione |
| `commands/task.md` | interrogare, elencare e seguire i task |
| `commands/batch.md` | pipeline in blocco da manifesto YAML |
| `commands/view.md` | anteprima di un risultato nel browser |
| `commands/account.md` | login, profili, saldo, ricariche |
| `common-errors.md` | errori tipici e come si sbloccano |
| `examples/` | sei scenari completi: gioco, film, stampa, AR web, animazione, pipe |
| `knowledge-models.json` | **i modelli e i loro limiti** — la tabella che conta |
| `knowledge-scenarios.json` | ricette preconfezionate per caso d'uso |
| `knowledge-chains.json` | quali passaggi si possono concatenare |
| `knowledge-error-catalog.json` | codici d'errore e codici d'uscita |
| `knowledge-params.js` | i validatori dei parametri: qui stanno gli intervalli ammessi |
| `README-cli.md` | il readme del pacchetto |

## Le cose da sapere subito, per questo progetto

Estratte da `knowledge-models.json`, perché sono vincoli veri e non
dettagli:

- **modelli 3D**: `v3.1-20260211` (alias `v3.1`) e `P1-20260311` (alias
  `p1`). Il P1 è quello a topologia pulita.
- **il P1 ha un tetto di 20.000 facce** (`P1_FACE_LIMIT` 50–20000) e
  **vieta** `quad`, `smart_low_poly`, `generate_parts`,
  `geometry_quality`. Va saputo prima: 20k facce sono adatte a un elemento
  d'ambiente, non a una carrozzeria in primo piano.
- **formati di conversione**: GLTF, USDZ, FBX, OBJ, STL, 3MF — quindi il
  GLB per il web si ottiene, ma passa da una conversione.
- **orientamento in export**: `+x -x +y -y`. Da fissare una volta e
  rispettare, altrimenti ogni asset arriva girato in modo diverso.
- **preset FBX**: `blender`, `3dsmax`, `mixamo`.
- **texture**: modello predefinito `v3.0-20250812`.

## Cosa NON c'è qui

Il riferimento completo degli endpoint HTTP (`openapi.tripo3d.ai/v3/...`)
sta online su **developers.tripo3d.ai**. Non l'ho scaricato: serve solo se
si chiama l'API a mano invece che dalla CLI, e per ora non è il caso.
