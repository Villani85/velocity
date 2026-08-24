# tripo-cli

Turn a sentence or an image into an engine-ready 3D asset from your terminal, powered by the [Tripo](https://www.tripo3d.ai) V3 API.

```bash
npx tripo-cli make "a cute low poly fox"
# → generates, polls, downloads: ./tripo-out/a-cute-low-poly-fox-xxxxxxxx/{model.glb, preview.png, task.json}
```

The binary is `tripo` once installed:

```bash
npm install -g tripo-cli
tripo login          # browser approves, key arrives automatically; or --paste / TRIPO_API_KEY
tripo make knight.png --for game-mobile --then texture,rig,convert:fbx
```

Works with both Tripo regions from the same install — international (`openapi.tripo3d.ai`, console `developers.tripo3d.ai`, email login + Stripe) and China mainland (`openapi.tripo3d.com`, console `developers.tripo3d.com`, SMS login + Alipay). `tripo login` runs an RFC 8628 device flow: the terminal shows a short code, the browser signs in (each console's own method) and approves, and the key lands in the CLI automatically — with graceful fallback to open-the-keys-page-and-paste when the device-auth backend is unavailable. You never pick a region when a key is in hand: the key is probed against both regions and whichever accepts it wins; `tripo topup` then opens the matching billing page (`/billing` on ov, `/billing/recharge` on cn). If a config was moved between machines, `tripo doctor` detects the mismatch and prints the one-line fix.

## Why this CLI

- **One magic command.** `tripo make <anything>` detects what you gave it — prompt text, an image, 2–4 view images, a model file, a URL, a task id, or `@last` — picks the right endpoint, model, and parameters, then waits and downloads the artifacts. No file_token, no polling loops.
- **A 3D domain brain, not a thin API wrapper.** Model choice is a fixed rule (low-poly intent or face budget ≤ 20000 → `tripo-p1`, everything else → `tripo-v3.1`), P1's illegal parameters are stripped locally, quad + GLB is rejected before it costs you credits, and 7 scenario presets (`--for game-mobile|game-pc|film|print|ar-web|anim|toy`) encode sane parameters + processing chains + delivery formats.
- **Agent-native.** Non-TTY runs are automatically headless (`--json --yes --no-open`), stdout carries exactly one JSON line per command, progress goes to stderr, exit codes are stable, and NDJSON pipes compose: `tripo make cat.png | tripo model texture | tripo anim rig`. An LLM-facing skill package ships inside the npm package (`tripo docs --llm`).

## Commands

| command | what it does |
| --- | --- |
| `tripo make <input...>` | the magic command: generate → chain → download |
| `tripo ai [description]` | plan with a wizard (no LLM needed) or multi-expert conversation (BYO LLM), confirm a plan card, execute |
| `tripo view [task\|file]` | interactive 3D preview in your browser (local server, model-viewer) |
| `tripo redo [task]` | re-run with a fresh seed |
| `tripo login / logout / whoami / use` | device flow: browser approves, key arrives automatically (paste fallback); stored 0600 in `~/.tripo/config.json`; `use` switches accounts |
| `tripo topup / balance / usage` | open the billing page + detect the credits arriving; check spend |
| `tripo generate <endpoint>` | deterministic access to all 8 generation endpoints |
| `tripo model / anim / mesh <step>` | refine, texture, stylize, convert, import, rig-check, rig, retarget, segment, complete, decimate, smartsegment |
| `tripo task get/list/watch` | query and stream task progress (NDJSON in `--json` mode) |
| `tripo files upload` | upload a file, print the `file_token` |
| `tripo batch run <manifest.yaml>` | bulk pipelines with concurrency, retries, and resume |
| `tripo config / doctor` | settings (global + per-directory `.tripo/context.json`) and self-diagnosis |
| `tripo docs [--topic t]` | print the bundled agent/skill docs |
| `tripo mcp` | run as an MCP server (Cursor / Claude Desktop) |
| `tripo completion <shell>` | bash/zsh/fish completion |

Every task-producing command supports `-o/--out`, `--no-wait`, `--no-download`, `--name`, `--timeout`, `--notify`, and repeatable `--param key=value` passthrough. Global flags: `--json`, `--yes`, `--quiet`, `--no-open`, `--profile`.

## Multiple accounts

Credentials live in named profiles (one per account — e.g. a cn account and an ov account, or personal + work). Logging in never overwrites another profile's key:

```bash
tripo login                     # first account → profile "default"
tripo login --profile work-cn   # second account, kept separately, becomes active
tripo use                       # switch interactively (or: tripo use default)
tripo whoami                    # shows the active profile and lists the others
tripo make "a fox" --profile work-cn   # one-shot override, nothing sticky
tripo logout                    # removes the *active* profile only
```

Each profile carries its own key + region, so switching accounts switches regions automatically. `TRIPO_PROFILE=work-cn` does the same as `--profile work-cn`; `TRIPO_API_KEY` bypasses profiles entirely (CI/agents). Configs written by older versions are read as the `default` profile — no migration step, nothing breaks.

## Scenario presets

```bash
tripo make "sci-fi crate" --for game-mobile   # P1 low-poly → texture → FBX
tripo make hero.png --for film                # v3.1, quad topology, 4K PBR → USDZ/OBJ
tripo make "chess knight" --for print         # no textures, watertight → STL, flat bottom
tripo make sofa.jpg --for ar-web              # decimate to mobile budget → GLB + USDZ
tripo make "orc warrior" --for anim           # rig-check gate → rig → FBX
```

## Pipelines

```bash
# human shorthand
tripo make cat.png --then texture,rig,convert:fbx

# shell pipes (each stage reads the upstream task from stdin)
tripo make cat.png --json | tripo model texture --json | tripo anim rig --json

# batch with resume
tripo batch run assets.yaml --concurrency 2
```

`@last`, `@2`, and `@name` reference your task history everywhere a task id is accepted (history lives in `~/.tripo/history.jsonl`; every artifact directory gets a reproducible `task.json`).

## For AI coding agents

- `make`/`watch` are blocking: run them, wait for exit, read the single JSON line on stdout. Do not poll yourself.
- Exit codes: `0` ok · `2` usage · `3` auth · `4` insufficient credits · `5` content policy · `6` task failed (credits auto-refunded) · `7` network · `8` not found · `9` rate limit.
- `preview.png` in every output directory is your eyes: look at it, then decide to `tripo redo` or continue the chain.
- Full behavior rules: `tripo docs --llm`, per-command docs via `tripo docs --topic commands/make`.

## Environment variables

| var | meaning |
| --- | --- |
| `TRIPO_API_KEY` | API key (`tsk_...`), highest precedence (bypasses profiles) |
| `TRIPO_PROFILE` | account profile to use, same as the global `--profile` flag |
| `TRIPO_REGION` | `ov` or `cn` — normally unnecessary: `tripo login` probes both regions with your key and stores the right one automatically |
| `TRIPO_API_BASE_URL` / `TRIPO_PLATFORM_BASE_URL` | endpoint overrides |
| `TRIPO_HOME` | config/history directory (default `~/.tripo`) |
| `TRIPO_LLM_BASE_URL` / `TRIPO_LLM_API_KEY` / `TRIPO_LLM_MODEL` | optional OpenAI-compatible LLM for `tripo ai` conversation mode |

## Development

```bash
npm install
npm run dev -- make "a cat" --no-wait   # run from source (tsx)
npm test                                # vitest (mock API, no credits spent)
npm run typecheck && npm run lint
npm run build && npm run pack:check     # dist + tarball self-check
TRIPO_API_KEY=tsk_... npm run e2e       # real-API smoke (spends ~10 credits)
```

Node.js ≥ 20. Issues & source: [vast-enterprise/Tripo-API-CLI](https://github.com/vast-enterprise/Tripo-API-CLI).

## License

MIT
