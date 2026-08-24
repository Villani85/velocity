# tripo make

The magic command: input in, finished local 3D artifacts out. Blocking; exits when files are on disk.

```
tripo make <input...> [options]
```

## Inputs (auto-detected)

| you pass | it runs |
| --- | --- |
| quoted text | text-to-model |
| one image (.png/.jpg/.jpeg/.webp/.bmp) or image URL | image-to-model |
| 2–4 images | multiview-to-model (filename hints front/back/left/right win; otherwise positional front,left,back,right; front required) |
| a model file (.glb/.gltf/.fbx/.obj/.stl) | import (add --then for processing) |
| task id / `@last` / `@name` | continue processing from that task (--then required) |

## Options

- `--for <scenario>` — `game-mobile` `game-pc` `film` `print` `ar-web` `anim` `toy`. Sets model+params+chain+format from the domain knowledge base.
- `--then <steps>` — processing chain, comma-separated. Steps: `refine texture stylize convert import rig-check rig retarget segment complete decimate smartsegment`. Args: `step:key=value,...`; bare value maps to the step's primary arg (`convert:fbx` → format, `stylize:lego` → style, `decimate:5000` → face_limit, `retarget:preset:walk` → animation). Overrides the scenario chain.
- `--model <m>` — force `tripo-v3.1` (high fidelity, default) or `tripo-p1` (low-poly; face_limit 50–20000; quad/parts/geometry_quality unsupported and stripped). The CLI normalizes these aliases to the wire versions (`v3.1-20260211` / `P1-20260311`) the server actually accepts.
- `-n, --candidates <n>` — up to 4 parallel candidates with different seeds (interactive pick when chaining).
- `--seed <n>` — fixed model_seed for reproducible geometry.
- `-p, --param key=value` — extra API parameter, repeatable. Common: `texture=false pbr=false` (bare geometry, cheaper), `texture_quality=detailed`, `face_limit=15000`, `quad=true` (forces FBX), `auto_size=true`, `negative_prompt=...`.
- `-o, --out <dir>` — artifact base dir (default `./tripo-out/<name>-<id8>/`).
- `--no-wait` — submit only, print `{"task_id"}` and exit (poll later with `tripo task watch`).
- `--no-download` — wait but skip downloads.
- `--name <name>` — history name for `@name` references.
- `--notify` — desktop notification when done.
- `--timeout <seconds>` — watch timeout (default 1800).

## Output (stdout, --json)

```json
{"task_id":"...","type":"convert_model","status":"success","credits_consumed":25,
 "output_dir":"tripo-out/knight-1a2b3c4d","files":["model.fbx","preview.png","task.json"],
 "model_file":".../model.fbx","preview":".../preview.png",
 "chain":[{"task_id":"...","type":"texture_model"}]}
```

Exit codes: 0 ok · 2 params · 3 auth · 4 credits · 5 content policy · 6 task failed · 7 network · 9 rate limit.

## Cost behavior

Balance is pre-checked before submitting; failed tasks auto-refund frozen credits. `texture=false pbr=false` skips texture credits entirely (right for 3D printing).
