export const LightroomUniforms = `
uniform float u_temperature;
uniform float u_tint;
uniform float u_saturation;
uniform float u_vibrance;
uniform float u_highlights;
uniform float u_shadows;
uniform vec3 u_gradeShadows;
uniform vec3 u_gradeMidtones;
uniform vec3 u_gradeHighlights;
uniform float u_gradeIntensity;
uniform float u_grainAmount;
uniform float u_grainSize;
uniform float u_grainSpeed;
uniform float u_toneCurve[32];
`;

export const LightroomHelper = `
float lrLuma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

float lrHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float lrApplyToneCurve(float x) {
    x = clamp(x, 0.0, 1.0);
    float idx = x * 31.0;
    int i = int(floor(idx));
    int j = min(i + 1, 31);
    float f = fract(idx);
    return mix(u_toneCurve[i], u_toneCurve[j], f);
}

vec3 applyLightroom(vec3 color, vec2 uv, vec2 resolution) {
    float temp = u_temperature / 100.0;
    color.r += temp * 0.06;
    color.b -= temp * 0.06;
    color.g += temp * 0.015;

    float tint = u_tint / 100.0;
    color.g -= tint * 0.05;
    color.r += tint * 0.03;
    color.b += tint * 0.03;

    float luma = lrLuma(color);
    float curvedLuma = lrApplyToneCurve(luma);
    color *= curvedLuma / max(luma, 0.001);

    luma = lrLuma(color);
    float shadowMask = 1.0 - smoothstep(0.0, 0.5, luma);
    float highlightMask = smoothstep(0.5, 1.0, luma);
    float midtoneMask = clamp(1.0 - shadowMask - highlightMask, 0.0, 1.0);

    color += (u_shadows / 100.0) * shadowMask;
    color -= (u_highlights / 100.0) * highlightMask;

    color += u_gradeShadows * shadowMask * u_gradeIntensity;
    color += u_gradeMidtones * midtoneMask * u_gradeIntensity;
    color += u_gradeHighlights * highlightMask * u_gradeIntensity;

    luma = lrLuma(color);
    float sat = 1.0 + u_saturation / 100.0;
    color = mix(vec3(luma), color, sat);

    float maxC = max(max(color.r, color.g), color.b);
    float minC = min(min(color.r, color.g), color.b);
    float colorSat = maxC - minC;
    float vibranceBoost = (1.0 - colorSat) * (u_vibrance / 100.0);
    color = mix(vec3(lrLuma(color)), color, 1.0 + vibranceBoost);

    if (u_grainAmount > 0.001) {
        vec2 grainCoord = gl_FragCoord.xy / max(u_grainSize, 1.0);
        grainCoord += u_time * u_grainSpeed * 0.5;
        float grain = lrHash(grainCoord);
        grain += lrHash(grainCoord + 13.7);
        grain = (grain * 0.5 - 0.5) * (u_grainAmount / 100.0) * 0.18;
        color += grain;
    }

    return clamp(color, 0.0, 1.0);
}
`;

const TEXTURE_SAMPLE_PATTERN =
    /(vec4 texColor = texture\(u_texture, ([^)]+)\);)/;

export function withLightroom(fragmentShader: string): string {
    let shader = fragmentShader;

    if (!shader.includes("u_temperature")) {
        shader = shader.replace(/out vec4 fragColor;/, `${LightroomUniforms}\nout vec4 fragColor;`);
    }

    if (!shader.includes("uniform vec2 u_resolution")) {
        shader = shader.replace(
            /uniform sampler2D u_texture;/,
            "uniform sampler2D u_texture;\nuniform vec2 u_resolution;"
        );
    }

    if (!shader.includes("uniform float u_time")) {
        shader = shader.replace(
            /uniform vec2 u_resolution;/,
            "uniform vec2 u_resolution;\nuniform float u_time;"
        );
    }

    if (!shader.includes("applyLightroom")) {
        shader = shader.replace(/void main\(\) \{/, `${LightroomHelper}\nvoid main() {`);

        shader = shader.replace(TEXTURE_SAMPLE_PATTERN, (match, _full, uvCoord) => {
            return `${match}\n    texColor.rgb = applyLightroom(texColor.rgb, ${uvCoord.trim()}, u_resolution);`;
        });
    }

    return shader;
}

export const DEFAULT_TONE_CURVE = Array.from({ length: 32 }, (_, i) => i / 31);

export type GradeColorId =
    | "neutral"
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "cyan"
    | "blue"
    | "violet"
    | "magenta";

export const GRADE_COLOR_RGB: Record<GradeColorId, [number, number, number]> = {
    neutral: [0, 0, 0],
    red: [0.1, -0.02, -0.03],
    orange: [0.08, 0.03, -0.05],
    yellow: [0.06, 0.05, -0.07],
    green: [-0.05, 0.08, -0.02],
    cyan: [-0.04, 0.04, 0.08],
    blue: [-0.03, -0.02, 0.1],
    violet: [0.04, -0.05, 0.08],
    magenta: [0.08, -0.05, 0.05],
};

export type CropRatio = "free" | "1:1" | "4:3" | "16:9" | "9:16";

export const CROP_RATIOS: { id: CropRatio; label: string; value?: string }[] = [
    { id: "free", label: "FREE" },
    { id: "1:1", label: "1:1", value: "1 / 1" },
    { id: "4:3", label: "4:3", value: "4 / 3" },
    { id: "16:9", label: "16:9", value: "16 / 9" },
    { id: "9:16", label: "9:16", value: "9 / 16" },
];

export interface LightroomAdjustments {
    temperature: number;
    tint: number;
    saturation: number;
    vibrance: number;
    highlights: number;
    shadows: number;
    gradeShadows: GradeColorId;
    gradeMidtones: GradeColorId;
    gradeHighlights: GradeColorId;
    gradeIntensity: number;
    grainAmount: number;
    grainSize: number;
    grainSpeed: number;
    toneCurve: number[];
    cropRatio: CropRatio;
}

export const DEFAULT_LIGHTROOM: LightroomAdjustments = {
    temperature: 0,
    tint: 0,
    saturation: 0,
    vibrance: 0,
    highlights: 0,
    shadows: 0,
    gradeShadows: "neutral",
    gradeMidtones: "neutral",
    gradeHighlights: "neutral",
    gradeIntensity: 0.5,
    grainAmount: 0,
    grainSize: 2,
    grainSpeed: 0,
    toneCurve: [...DEFAULT_TONE_CURVE],
    cropRatio: "free",
};
