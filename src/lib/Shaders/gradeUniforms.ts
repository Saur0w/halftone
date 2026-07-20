
import * as THREE from "three";

export const HUE_BANDS = [
    "Red",
    "Orange",
    "Yellow",
    "Green",
    "Aqua",
    "Blue",
    "Purple",
    "Magenta",
] as const;

export type OutputMode = "color" | "halftoneMono" | "halftoneCMY" | "orderedDither";

export const OUTPUT_MODE_TO_INT: Record<OutputMode, number> = {
    color: 0,
    halftoneMono: 1,
    halftoneCMY: 2,
    orderedDither: 3,
};

export interface GradeUniformValues {
    temperature: number;
    tint: number;

    exposure: number;
    brightness: number;
    contrast: number;
    highlights: number;
    shadows: number;
    whites: number;
    blacks: number;

    vibrance: number;
    saturation: number;
    clarity: number;
    textureAmt: number;
    dehaze: number;

    /** One entry per HUE_BANDS index, range -1..1 */
    hueMix: number[];
    satMix: number[];
    lumMix: number[];

    /** [hue 0..1, saturation 0..1, luminance -1..1] */
    gradeShadows: [number, number, number];
    gradeMidtones: [number, number, number];
    gradeHighlights: [number, number, number];
    gradeBlending: number;
    gradeBalance: number;

    vignetteAmount: number;
    vignetteMidpoint: number;
    vignetteFeather: number;
    vignetteRoundness: number;

    grainAmount: number;
    grainSize: number;
    grainRoughness: number;

    sharpenAmount: number;
    sharpenRadius: number;

    outputMode: OutputMode;
    dotSize: number;
    dotGap: number;
    matrixSize: 2 | 4 | 8 | 16;
}

export const DEFAULT_GRADE_VALUES: GradeUniformValues = {
    temperature: 0,
    tint: 0,

    exposure: 0,
    brightness: 0,
    contrast: 1,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,

    vibrance: 0,
    saturation: 0,
    clarity: 0,
    textureAmt: 0,
    dehaze: 0,

    hueMix: new Array(8).fill(0),
    satMix: new Array(8).fill(0),
    lumMix: new Array(8).fill(0),

    gradeShadows: [0.6, 0, 0],
    gradeMidtones: [0.1, 0, 0],
    gradeHighlights: [0.1, 0, 0],
    gradeBlending: 0.5,
    gradeBalance: 0,

    vignetteAmount: 0,
    vignetteMidpoint: 0.6,
    vignetteFeather: 0.4,
    vignetteRoundness: 0.6,

    grainAmount: 0,
    grainSize: 2,
    grainRoughness: 0.5,

    sharpenAmount: 0,
    sharpenRadius: 1,

    outputMode: "color",
    dotSize: 6,
    dotGap: 6,
    matrixSize: 8,
};

let identityCurveCache: THREE.DataTexture | null = null;
function getIdentityCurve(): THREE.DataTexture {
    if (!identityCurveCache) {
        identityCurveCache = createCurveTexture([
            [0, 0],
            [1, 1],
        ]);
    }
    return identityCurveCache;
}

/** Builds the full THREE.js uniforms object expected by grade.frag. */
export function buildGradeUniforms(
    texture: THREE.Texture,
    resolution: THREE.Vector2,
    values: GradeUniformValues = DEFAULT_GRADE_VALUES
) {
    const identity = getIdentityCurve();

    return {
        u_texture: { value: texture },
        u_resolution: { value: resolution },
        u_time: { value: 0 },

        u_temperature: { value: values.temperature },
        u_tint: { value: values.tint },

        u_exposure: { value: values.exposure },
        u_brightness: { value: values.brightness },
        u_contrast: { value: values.contrast },
        u_highlights: { value: values.highlights },
        u_shadows: { value: values.shadows },
        u_whites: { value: values.whites },
        u_blacks: { value: values.blacks },

        u_useCurves: { value: false },
        u_curveMaster: { value: identity },
        u_curveR: { value: identity },
        u_curveG: { value: identity },
        u_curveB: { value: identity },

        u_vibrance: { value: values.vibrance },
        u_saturation: { value: values.saturation },
        u_clarity: { value: values.clarity },
        u_textureAmt: { value: values.textureAmt },
        u_dehaze: { value: values.dehaze },

        u_hueMix: { value: values.hueMix.slice() },
        u_satMix: { value: values.satMix.slice() },
        u_lumMix: { value: values.lumMix.slice() },

        u_gradeShadows: { value: new THREE.Vector3(...values.gradeShadows) },
        u_gradeMidtones: { value: new THREE.Vector3(...values.gradeMidtones) },
        u_gradeHighlights: { value: new THREE.Vector3(...values.gradeHighlights) },
        u_gradeBlending: { value: values.gradeBlending },
        u_gradeBalance: { value: values.gradeBalance },

        u_vignetteAmount: { value: values.vignetteAmount },
        u_vignetteMidpoint: { value: values.vignetteMidpoint },
        u_vignetteFeather: { value: values.vignetteFeather },
        u_vignetteRoundness: { value: values.vignetteRoundness },

        u_grainAmount: { value: values.grainAmount },
        u_grainSize: { value: values.grainSize },
        u_grainRoughness: { value: values.grainRoughness },

        u_sharpenAmount: { value: values.sharpenAmount },
        u_sharpenRadius: { value: values.sharpenRadius },

        u_outputMode: { value: OUTPUT_MODE_TO_INT[values.outputMode] },
        u_dotSize: { value: values.dotSize },
        u_dotGap: { value: values.dotGap },
        u_matrixSize: { value: values.matrixSize },
    };
}

/**
 * Builds a 256x1 tone-curve lookup texture from (x, y) control points in
 * 0..1 — x is input brightness, y is output brightness. Points should be
 * sorted by x (this function sorts defensively) and normally include
 * (0, 0) and (1, 1) endpoints. Interpolation is a smoothstep ease between
 * neighboring points: monotonic and cheap, but won't overshoot the way a
 * full Catmull-Rom spline (and Lightroom's own curve) can — swap
 * `evaluateCurve` for a spline if you need that.
 */
export function createCurveTexture(points: [number, number][]): THREE.DataTexture {
    const size = 256;
    const data = new Uint8Array(size * 4);
    const sorted = [...points].sort((a, b) => a[0] - b[0]);

    for (let i = 0; i < size; i++) {
        const x = i / (size - 1);
        const y = evaluateCurve(sorted, x);
        const v = Math.round(THREE.MathUtils.clamp(y, 0, 1) * 255);
        data[i * 4] = v;
        data[i * 4 + 1] = v;
        data[i * 4 + 2] = v;
        data[i * 4 + 3] = 255;
    }

    const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    return tex;
}

function evaluateCurve(points: [number, number][], x: number): number {
    if (points.length === 0) return x;
    if (x <= points[0][0]) return points[0][1];
    if (x >= points[points.length - 1][0]) return points[points.length - 1][1];

    let i = 0;
    while (i < points.length - 1 && points[i + 1][0] < x) i++;

    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const t = (x - x0) / (x1 - x0 || 1);
    const eased = t * t * (3 - 2 * t); // smoothstep easing

    return y0 + (y1 - y0) * eased;
}

export function enableGradeMipmaps(texture: THREE.Texture): void {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
}