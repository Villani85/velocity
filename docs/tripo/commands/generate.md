# tripo generate — deterministic endpoint access

Use `tripo make` unless you need exact endpoint control. All subcommands accept the shared task options (`--json --yes -o --no-wait --no-download --timeout --name -p key=value`).

## 3D

```bash
tripo generate text-to-model "a ceramic teapot" [--model tripo-v3.1|tripo-p1] [-p face_limit=15000] ...
tripo generate image-to-model photo.png [-p texture_alignment=original_image] [-p orientation=align_image]
tripo generate multiview-to-model front.png back.png [left.png right.png]
```

Key params (hard rules enforced locally):
- `pbr=true` implies `texture=true`
- `generate_parts=true` excludes texture/pbr/quad (bare geometry; re-texture afterwards)
- `quad=true` forces FBX output (quads cannot be stored in GLB)
- P1: `face_limit` 50–20000; `quad`/`smart_low_poly`/`generate_parts`/`geometry_quality` unsupported
- model aliases (`tripo-v3.1`/`tripo-p1`/`v3.0`/`v2.5`) are normalized to server wire versions automatically
- `smart_low_poly=true`: face_limit 500–20000 (500–10000 with quad)
- seeds: `image_seed` / `model_seed` / `texture_seed` — record them for reproducibility (task.json does this automatically)

## Images (2D pipeline before 3D)

```bash
tripo generate text-to-image "front view of a knight, T-pose" [-p template=t_pose] [--model seedream_v4]
tripo generate image-to-image sketch.png --prompt "make it look like clay" [--model seedream_v5]
tripo generate image-to-multiview photo.png     # 1 image → 4-view sheet
tripo generate edit-multiview <multiview-task-id> -p 'prompts=[{"view":"front","prompt":"add a sword"}]'
tripo generate image-to-splat photo.png         # gaussian splat
```

- image models: `seedream_v4` (t2i default) `seedream_v5` (i2i default) `banana` `banana_pro` `banana2` `chat_image_1` `chat_image_1.5` `chat_image_2`
- templates — text-to-image: `asset_extraction character_completion t_pose variants figure`; image-to-image: `t_pose character_completion 3d_enhance variants figure`
- `template=t_pose` is the golden pre-step for the animation pipeline
