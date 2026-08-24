# Common errors & fixes

| exit | api code | meaning | fix |
| --- | --- | --- | --- |
| 3 | 1002 | authentication failed (invalid/missing API key) | set `TRIPO_API_KEY` or run `tripo login`; check the key wasn't revoked |
| 3 | 1005 | forbidden (no permission for this resource) | check account permissions |
| 2 | 1003/1004 | malformed request / invalid parameter | check spelling against `tripo docs --topic commands/<cmd>`; the CLI already strips illegal P1 params |
| 9 | 1007/2000 | rate or concurrency limit (task families share pools) | wait and retry with backoff; lower `--concurrency` in batch |
| 8 | 2001 | task not found | task ids are account-scoped — same key that created it? right region (ov/cn)? |
| 2 | 2003 | empty input file / unreachable URL | verify the file isn't empty and the URL is publicly accessible |
| 2 | 2004 | unsupported file type | images: PNG/JPEG/WebP/BMP/TIFF ≤20MB; models: GLB/FBX/OBJ/STL ≤150MB (.gltf not uploadable — use .glb or a URL) |
| 2 | 2005/2006/2007 | upstream task wrong type / not successful | the chain needs a successful task of the right type (the CLI validates locally first) |
| 5 | 2008 | content policy violation | change the prompt/image |
| 2 | 2009 | prompt contains invalid characters | remove unusual characters from the prompt |
| 4 | 2010 | insufficient credits | `tripo topup` (human action); `tripo balance` to check |
| 2 | 2011/2012 | animation chain input invalid | rig-check needs a model-producing task; retarget needs a rig task |
| 2 | 2015/2016/2017 | version/type deprecated or invalid | drop the explicit `--model`; the CLI default is current |
| 2 | 2018 | too complex to remesh | lower `face_limit` or simplify the input model |
| 8 | 2019 | file not found (token expired?) | re-upload; file tokens are short-lived |
| 2 | 2020/2021/2022 | bad image URL / file too large / image too large | fix the URL or shrink the file |
| 7 | 1000/1001 | server-side error | 1000 auto-retries; if persistent, contact support with the `request_id` |
| 6 | — | task failed server-side | frozen credits auto-refund; `tripo redo` often succeeds with a new seed |
| 7 | — | network/5xx | auto-retried 3×; check `tripo doctor`; region mismatch (ov/cn) is a common cause |

## Frequent local validations (caught before spending credits)

- `refine` only accepts a successful `text_to_model` task
- `complete` only accepts a `segment` task; `retarget` only accepts a `rig` task
- quad + GLTF export → rejected (quads cannot be stored in glTF); use FBX/OBJ/USDZ
- P1 + face_limit outside 50–20000 → rejected with a suggestion to use v3.1
- multiview without a front view → rejected (name a file "front" or pass it first)
- `-n` with `--then` needs an interactive terminal (pick the winner first, then chain)

## Weird-but-normal

- `model_url` in task output points to a file that may be named `pbr_model` etc. — normal, just download it (the CLI does).
- Output URLs expire in ~5 minutes — never cache them; re-run `tripo task get <id> --download`.
- `frozen` balance = holds for running tasks; it settles or refunds automatically.
