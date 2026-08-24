# Tripo CLI Skill

You (an AI coding agent) can generate production-ready 3D assets with the `tripo` CLI.
One command turns a text prompt or an image into local files: a 3D model (glb/fbx/stl/...), a `preview.png` render, and a `task.json` record.

## Install & auth

```bash
npm install -g tripo-cli        # or: npx tripo-cli ...
export TRIPO_API_KEY=tsk_...    # highest-priority auth; no interaction needed
tripo doctor                    # verify key, network, balance
```

If there is no key, ask the human to run `tripo login` or to provide `TRIPO_API_KEY`.

Regions (ov = international, cn = China mainland) share one CLI: `tripo login --key tsk_...` auto-detects which region the key belongs to. On exit code 3 (auth), run `tripo doctor` — it diagnoses key-vs-region mismatches and prints the exact fix (`tripo config set region cn|ov`).

## Behavior rules (read first)

1. **`tripo make` is synchronous and blocking.** It submits the task, polls, downloads artifacts, then exits. Wait for the process to finish and read the final JSON from stdout. Do NOT re-implement polling, do NOT add your own timeout shorter than 15 minutes, do NOT stop just because you saw a task_id in the logs.
2. **stdout is the contract; stderr is commentary.** With `--json` (auto-enabled when piped), stdout carries exactly one final JSON line. Progress/logs go to stderr.
3. **Artifacts are local files.** The result JSON has `output_dir`, `model_file`, `preview`. Look at `preview.png` to judge quality; re-roll with `tripo redo` if needed.
4. **Exit codes are stable** — branch on them:
   - 0 success · 2 usage/params · 3 auth · 4 insufficient credits (tell the human to run `tripo topup`) · 5 content policy · 6 task failed (credits auto-refunded) · 7 network · 8 not found · 9 rate limit (retry with backoff)
5. **Never invent parameters.** Unknown `--param key=value` pairs pass through to the API; stick to documented ones (see `commands/`).
6. **Don't pick legacy model versions.** The CLI auto-selects `tripo-v3.1` (high fidelity) or `tripo-p1` (low-poly, face budget ≤ 20000). Only override `--model` when the human asks.

## The one command you usually need

```bash
tripo make "a medieval knight, T-pose" --for game-mobile --json --yes
tripo make concept.png --for print --json --yes
tripo make front.png back.png --json --yes                # 2-4 views → multiview
tripo make hero.glb --then texture,rig --json --yes       # import + process
tripo make @last --then convert:fbx --json --yes          # continue from last task
```

- `--for` scenario presets: `game-mobile` `game-pc` `film` `print` `ar-web` `anim` `toy`
- `--then` chain steps: `refine texture stylize convert import rig-check rig retarget segment complete decimate smartsegment`
  - step args: `convert:format=FBX,texture_size=2048` (bare value = primary arg: `convert:fbx`, `stylize:lego`, `decimate:5000`)
- Output JSON: `{"task_id","type","status","credits_consumed","output_dir","files",["model_file"],["preview"],["chain"]}`

## Pipes (composing steps yourself)

Downstream commands read the upstream task from stdin:

```bash
tripo make cat.png --json | tripo anim rig --json | tripo anim retarget --param animation=preset:walk --json
```

## Other commands

| command | purpose |
| --- | --- |
| `tripo task get/watch <id> --download` | inspect / block on / download an existing task |
| `tripo balance` / `tripo usage` | credits: `{"balance","frozen"}` / recent spend |
| `tripo redo [@last]` | same request, new seed |
| `tripo view [@last]` | (humans) open a local 3D preview; agents read `preview.png` instead |
| `tripo files upload <path>` | get a `file_token` |
| `tripo batch run manifest.yaml` | bulk jobs, resumable |
| `tripo mcp` | run as an MCP server (tools: tripo_make, tripo_task_get, tripo_task_wait, tripo_balance, tripo_history) |
| `tripo docs --topic commands/<name>` | print detailed docs for any command |

## Detailed docs in this package

- `commands/` — one file per command with every flag and parameter
- `examples/` — copy-paste recipes per scenario (game/print/animation/...)
- `common-errors.md` — error table with fixes

Print any of them: `tripo docs --topic examples/game-asset`.
