# tripo login / balance / usage / topup / config / doctor

## Auth

```bash
export TRIPO_API_KEY=tsk_...     # best for agents/CI — zero interaction, bypasses profiles
tripo login                      # humans: browser flow (or --paste / --key tsk_...)
tripo login --key tsk_... --region ov|cn
tripo whoami                     # masked key + active profile + region + balance
tripo logout                     # removes the local key of the active profile only
```

Region decides the API host: ov → `openapi.tripo3d.ai`, cn → `openapi.tripo3d.com`.

## Multiple accounts (profiles)

```bash
tripo login --profile work-cn    # log a second account into its own profile (becomes active)
tripo use work-cn                # switch the active profile (no arg = interactive picker)
tripo balance --profile work-cn  # one-shot override on any command; TRIPO_PROFILE env works too
```

One profile = one account (key + region). Unknown `--profile` fails with exit 3 and the fix in the message — do not retry blindly.

## Credits

```bash
tripo balance      # {"balance":1000,"frozen":50} — frozen = running tasks' holds
tripo usage        # recent per-task spend
tripo topup        # opens the billing page, then polls until credits arrive
```

Exit code 4 anywhere = insufficient credits → tell the human to run `tripo topup`.
Failed tasks refund their frozen credits automatically.

## Config

```bash
tripo config list
tripo config set region cn
tripo config set llm.base_url https://api.openai.com/v1     # enables `tripo ai` conversation mode
tripo config set llm.api_key sk-...
tripo config set llm.model gpt-4o-mini
tripo config context default_scenario=game-mobile output_dir=./assets   # per-directory .tripo/context.json
```

Env overrides: `TRIPO_API_KEY` `TRIPO_PROFILE` `TRIPO_REGION` `TRIPO_API_BASE_URL` `TRIPO_LLM_BASE_URL` `TRIPO_LLM_API_KEY` `TRIPO_LLM_MODEL`.
`region`/`api_base_url`/`platform_base_url` are stored per profile; `language`/`llm.*`/`default_output_dir` are shared.

## tripo doctor

Checks node version, key, API reachability, balance, config permissions, terminal capabilities. Exit 1 when a critical check fails. Run this first when anything misbehaves.
