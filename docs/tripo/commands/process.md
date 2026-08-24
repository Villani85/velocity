# tripo model / anim / mesh — processing steps

All subcommands take input as: explicit argument (task id / @last / @name / file / URL) > piped stdin JSON > `@last`.
Shared options: `--json --yes -o --no-wait --no-download --timeout --name -p key=value`.

## tripo model

```bash
tripo model refine [input]                  # only accepts text_to_model tasks
tripo model texture [input] --texture-quality detailed --texture-alignment geometry [-p pbr=true]
tripo model stylize [input] --style lego|voxel|voronoi|minecraft [--block-size 80]
tripo model convert [input] --format GLTF|USDZ|FBX|OBJ|STL|3MF \
    [--texture-size 2048] [--texture-format JPEG|PNG|OPEN_EXR|...] [--face-limit N] \
    [--quad] [--flatten-bottom] [--fbx-preset blender|3dsmax|mixamo] \
    [--export-orientation +x|-x|+y|-y] [--scale-factor 1.5] [--auto-size] \
    [--pivot-to-center-bottom] [--export-vertex-colors]
tripo model import <file-or-url>            # GLB/GLTF/FBX/OBJ/STL ≤150MB
```

Notes: quad cannot export GLTF; vertex colors only in OBJ/GLTF; any non-default convert option bills as "complex convert".

## tripo anim

```bash
tripo anim check [input]                    # rig-check: {"riggable":true,"rig_type":"biped"}; GLB input only
tripo anim rig [input] [--rig-type biped|quadruped|hexapod|octopod|avian|serpentine|aquatic] \
    [--spec tripo|mixamo] [--out-format glb|fbx]      # CLI defaults model=v2.5-20260210 (all body types)
tripo anim retarget [input] --animation preset:walk [preset:run ...] \
    [--out-format glb|fbx] [--animate-in-place]
```

- retarget only accepts a rig task id; ≤5 animations, billed per animation
- rig model wire versions: `v2.5-20260210` (CLI default) / `v1.0-20240301`; marketing names `rig-v1.0`/`rig-v2.0` are normalized automatically
- v2.5 rig presets (all body types): `preset:idle walk run dive climb jump slash shoot hurt fall turn` (+ body-specific like `preset:quadruped:*`)
- v1.0 rig presets (biped only): `preset:biped:idle` etc. (90+)
- Mixamo/Unity Humanoid → `--spec mixamo` (+ `--fbx-preset mixamo` at convert time)
- game code drives movement → `--animate-in-place`

## tripo mesh

```bash
tripo mesh segment [input] [--model v1.0-20250506|v2.0-20260430]
tripo mesh complete [input] [--completion-mode ai_completion|quick_cap]   # needs a segment task
tripo mesh decimate [input] --face-limit 5000 [--quad] [--no-bake]        # 500–20000 tri / 500–10000 quad
tripo mesh smartsegment <file-or-url> [--seg-type image|model] [--granularity coarse|medium|fine] [--hint "..."]
```

- decimate bakes textures onto the low-poly by default (right for LODs); `-p model=v1.0` allows up to 2M faces but requires `face_limit` and does not support bake/part_names
- `mesh complete` only accepts segmentation tasks
- smartsegment takes a file/URL only (no task ids); `--seg-type model` needs a GLB and a 4×4 transform — the CLI auto-fills the identity matrix
