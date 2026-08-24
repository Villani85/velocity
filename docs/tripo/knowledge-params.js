/**
 * Parameter linkage rules distilled from server-side validation
 * (TextImageModelValidation / ModelPostProcessValidation / handlers).
 *
 * Every rule here prevents a guaranteed 400 or a silently wasted credit.
 * Rules marked [hard] mirror server enforcement; [soft] are CLI smart defaults.
 */
import { CONVERT_FORMATS, EXPORT_ORIENTATIONS, FBX_PRESETS, P1_FACE_LIMIT, P1_FORBIDDEN_PARAMS, TEXTURE_FORMATS, TEXTURE_QUALITIES, isP1, } from './models.js';
const PROMPT_MAX = 1024;
const NEGATIVE_PROMPT_MAX = 255;
/** Validate + auto-fix parameters for 3D generation (text/image/multiview-to-model). */
export function validateGenerationParams(model, input) {
    const params = { ...input };
    const warnings = [];
    const errors = [];
    if (typeof params.prompt === 'string' && params.prompt.length > PROMPT_MAX) {
        errors.push(`prompt exceeds ${PROMPT_MAX} characters (${params.prompt.length})`);
    }
    if (typeof params.negative_prompt === 'string' && params.negative_prompt.length > NEGATIVE_PROMPT_MAX) {
        errors.push(`negative_prompt exceeds ${NEGATIVE_PROMPT_MAX} characters`);
    }
    // [hard] pbr=true forces texture=true (PBR is a superset of texturing).
    if (params.pbr === true && params.texture === false) {
        params.texture = true;
        warnings.push('pbr=true forces texture=true (adjusted)');
    }
    // [hard] generate_parts outputs bare geometry: texture/pbr/quad must be off.
    if (params.generate_parts === true) {
        for (const key of ['texture', 'pbr', 'quad']) {
            if (params[key] === true) {
                params[key] = false;
                warnings.push(`generate_parts=true disables ${key} (adjusted; run "tripo model texture" afterwards)`);
            }
        }
    }
    // [hard] P1 constraints: strip forbidden params, enforce face_limit range.
    if (isP1(model)) {
        for (const key of P1_FORBIDDEN_PARAMS) {
            if (params[key] !== undefined) {
                delete params[key];
                warnings.push(`P1 does not support ${key} (removed)`);
            }
        }
        const face = params.face_limit;
        if (typeof face === 'number') {
            if (face < P1_FACE_LIMIT.min || face > P1_FACE_LIMIT.max) {
                errors.push(`P1 face_limit must be within ${P1_FACE_LIMIT.min}–${P1_FACE_LIMIT.max} (got ${face}); ` +
                    `use tripo-v3.1 for higher budgets`);
            }
        }
    }
    else {
        // [hard] smart_low_poly face_limit windows: 500–20000 tri / 500–10000 quad.
        if (params.smart_low_poly === true && typeof params.face_limit === 'number') {
            const max = params.quad === true ? 10000 : 20000;
            if (params.face_limit < 500 || params.face_limit > max) {
                errors.push(`smart_low_poly requires face_limit 500–${max}${params.quad === true ? ' (quad halves the budget)' : ''}`);
            }
        }
    }
    if (params.texture_quality !== undefined &&
        !TEXTURE_QUALITIES.includes(params.texture_quality)) {
        errors.push(`texture_quality must be one of ${TEXTURE_QUALITIES.join('/')}`);
    }
    // [hard] quad topology cannot be stored in GLB → output will be FBX.
    if (params.quad === true) {
        warnings.push('quad=true forces FBX output (quad topology cannot be stored in GLB)');
    }
    return { params, warnings, errors };
}
/** Validate parameters for models/convert. */
export function validateConvertParams(input) {
    const params = { ...input };
    const warnings = [];
    const errors = [];
    const format = typeof params.format === 'string' ? params.format.toUpperCase() : undefined;
    if (!format) {
        errors.push(`convert requires format (${CONVERT_FORMATS.join('/')})`);
    }
    else if (!CONVERT_FORMATS.includes(format)) {
        errors.push(`unsupported format "${params.format}" (${CONVERT_FORMATS.join('/')})`);
    }
    else {
        params.format = format;
    }
    // [hard] quad topology cannot live in GLTF/GLB.
    if (params.quad === true && format === 'GLTF') {
        errors.push('quad=true cannot export GLTF (quad topology is not storable in glTF); use FBX/OBJ/USDZ');
    }
    if (params.force_symmetry === true && params.quad !== true) {
        delete params.force_symmetry;
        warnings.push('force_symmetry only applies with quad=true (removed)');
    }
    if (params.texture_format !== undefined &&
        !TEXTURE_FORMATS.includes(String(params.texture_format).toUpperCase())) {
        errors.push(`texture_format must be one of ${TEXTURE_FORMATS.join('/')}`);
    }
    else if (typeof params.texture_format === 'string') {
        params.texture_format = params.texture_format.toUpperCase();
    }
    // [hard] vertex colors only survive in OBJ/GLTF exports.
    if (params.export_vertex_colors === true && format && !['OBJ', 'GLTF'].includes(format)) {
        delete params.export_vertex_colors;
        warnings.push(`export_vertex_colors only applies to OBJ/GLTF (removed for ${format})`);
    }
    if (params.fbx_preset !== undefined) {
        if (!FBX_PRESETS.includes(params.fbx_preset)) {
            errors.push(`fbx_preset must be one of ${FBX_PRESETS.join('/')}`);
        }
        else if (format !== 'FBX') {
            delete params.fbx_preset;
            warnings.push('fbx_preset only applies to FBX exports (removed)');
        }
    }
    if (params.export_orientation !== undefined &&
        !EXPORT_ORIENTATIONS.includes(params.export_orientation)) {
        errors.push(`export_orientation must be one of ${EXPORT_ORIENTATIONS.join('/')}`);
    }
    // [soft] cost transparency: any non-default option upgrades billing to
    // convert_model_complex.
    const defaults = {
        texture_size: 4096,
        texture_format: 'JPEG',
        bake: true,
        pack_uv: false,
        export_vertex_colors: false,
        pivot_to_center_bottom: false,
        scale_factor: 1,
        with_animation: true,
        animate_in_place: false,
        export_orientation: '+x',
        fbx_preset: 'blender',
        quad: false,
        flatten_bottom: false,
        force_symmetry: false,
    };
    const complex = Object.entries(defaults).some(([k, dv]) => params[k] !== undefined && params[k] !== dv) || params.face_limit !== undefined || params.part_names !== undefined;
    if (complex) {
        warnings.push('non-default convert options use the "complex convert" price tier');
    }
    return { params, warnings, errors };
}
/**
 * Validate parameters for mesh/decimate (ModelPostProcessValidation):
 * v2.0 (default): face_limit 500–20000 tri / 500–10000 quad.
 * v1.0: face_limit REQUIRED, 500–2,000,000 tri / 500–150,000 quad; no bake/part_names.
 */
export function validateDecimateParams(input) {
    const params = { ...input };
    const warnings = [];
    const errors = [];
    const model = typeof params.model === 'string' ? params.model.toLowerCase() : undefined;
    if (model !== undefined && !['v1.0', 'v2.0', 'default'].includes(model)) {
        errors.push(`decimate model must be v2.0 or v1.0 (got "${String(params.model)}")`);
    }
    const isV1 = model === 'v1.0';
    const quad = params.quad === true;
    const face = params.face_limit;
    if (isV1) {
        const max = quad ? 150_000 : 2_000_000;
        if (typeof face !== 'number') {
            errors.push(`decimate model v1.0 requires face_limit (500–${max}${quad ? ', quad' : ''})`);
        }
        else if (face < 500 || face > max) {
            errors.push(`decimate v1.0 face_limit must be within 500–${max}${quad ? ' (quad mesh)' : ''}`);
        }
        for (const key of ['bake', 'part_names']) {
            if (params[key] !== undefined) {
                delete params[key];
                warnings.push(`decimate v1.0 does not support ${key} (removed)`);
            }
        }
    }
    else {
        const max = quad ? 10_000 : 20_000;
        if (typeof face === 'number' && (face < 500 || face > max)) {
            errors.push(`decimate face_limit must be within 500–${max}${quad ? ' (quad halves the budget)' : ''}`);
        }
    }
    return { params, warnings, errors };
}
/** Validate retarget animations list. */
export function validateRetargetParams(input) {
    const params = { ...input };
    const warnings = [];
    const errors = [];
    const anims = params.animations;
    if (Array.isArray(anims)) {
        if (anims.length === 0)
            errors.push('animations must not be empty');
        if (anims.length > 5)
            errors.push(`retarget accepts at most 5 animations per task (got ${anims.length}); billing is per animation`);
        if (anims.length === 1) {
            // Server accepts either `animation` (single) or `animations` (list).
            params.animation = anims[0];
            delete params.animations;
        }
    }
    else if (typeof params.animation !== 'string') {
        errors.push('retarget requires animation (single) or animations (list)');
    }
    return { params, warnings, errors };
}
