#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_temperature;
uniform float u_tint;

uniform float u_exposure;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;

uniform bool u_useCurves;
uniform sampler2D u_curveMaster;
uniform sampler2D u_curveR;
uniform sampler2D u_curveG;
uniform sampler2D u_curveB;

uniform float u_vibrance;
uniform float u_saturation;
uniform float u_clarity;
uniform float u_textureAmt;
uniform float u_dehaze;

uniform float u_hueMix[8];
uniform float u_satMix[8];
uniform float u_lumMix[8];

uniform vec3 u_gradeShadows;
uniform vec3 u_gradeMidtones;
uniform vec3 u_gradeHighlights;
uniform float u_gradeBlending;
uniform float u_gradeBalance;
uniform float u_vignetteAmount;
uniform float u_vignetteMidpoint;
uniform float u_vignetteFeather;
uniform float u_vignetteRoundness;
uniform float u_grainAmount;
uniform float u_grainSize;
uniform float u_grainRoughness;
uniform float u_sharpenAmount;
uniform float u_sharpenRadius;
uniform int u_outputMode;
uniform float u_dotSize;
uniform float u_dotGap;
uniform int u_matrixSize;

#define PI 3.14159265359

float getLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

vec3 rgb2hsl(vec3 c) {
    float maxV = max(c.r, max(c.g, c.b));
    float minV = min(c.r, min(c.g, c.b));
    float diff = maxV - minV;

    float l = (maxV + minV) * 0.5;
    float h = 0.0;
    float s = 0.0;

    if (diff > 0.0) {
        s = l < 0.5 ? diff / (maxV + minV) : diff / (2.0 - maxV - minV);
        if (maxV == c.r) {
            h = (c.g - c.b) / diff + (c.g < c.b ? 6.0 : 0.0);
        } else if (maxV == c.g) {
            h = (c.b - c.r) / diff + 2.0;
        } else {
            h = (c.r - c.g) / diff + 4.0;
        }
        h /= 6.0;
    }
    return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
    if(t < 0.0) t += 1.0;
    if(t > 1.0) t -= 1.0;
    if(t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if(t < 1.0/2.0) return q;
    if(t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
}

vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb;
    if(hsl.y == 0.0) {
        rgb = vec3(hsl.z);
    } else {
        float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
        float p = 2.0 * hsl.z - q;
        rgb.r = hue2rgb(p, q, hsl.x + 1.0/3.0);
        rgb.g = hue2rgb(p, q, hsl.x);
        rgb.b = hue2rgb(p, q, hsl.x - 1.0/3.0);
    }
    return rgb;
}

vec3 applyColorWheel(float luma, vec3 color, vec3 gradeParams, float weight) {
    if (gradeParams.y <= 0.0) return color;
    vec3 tintColor = hsl2rgb(vec3(gradeParams.x, gradeParams.y, 0.5));
    float lumaFactor = 1.0 + gradeParams.z * weight;
    return mix(color, color * tintColor * lumaFactor, weight);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float getBayer8x8(ivec2 p) {
    int x = p.x % 8;
    int y = p.y % 8;
    int m[64] = int[](
            0, 48, 12, 60,  3, 51, 15, 63,
            32, 16, 44, 28, 35, 19, 47, 31,
            8, 56,  4, 52, 11, 59,  7, 55,
            40, 24, 36, 20, 43, 27, 39, 23,
            2, 50, 14, 62,  1, 49, 13, 61,
            34, 18, 46, 30, 33, 17, 45, 29,
            10, 58,  6, 54,  9, 57,  5, 53,
            42, 26, 38, 22, 41, 25, 37, 21
    );
    return float(m[y * 8 + x]) / 64.0;
}

void main() {
    vec3 rgb = texture(u_texture, v_texCoord).rgb;
    if (u_sharpenAmount > 0.0) {
        vec2 offset = u_sharpenRadius / u_resolution;
        vec3 blur = texture(u_texture, v_texCoord + vec2(0.0, offset.y)).rgb +
        texture(u_texture, v_texCoord - vec2(0.0, offset.y)).rgb +
        texture(u_texture, v_texCoord + vec2(offset.x, 0.0)).rgb +
        texture(u_texture, v_texCoord - vec2(offset.x, 0.0)).rgb;
        blur *= 0.25;
        rgb = mix(rgb, rgb + (rgb - blur) * 2.0, u_sharpenAmount);
    }

    rgb.r += u_temperature * 0.05 - u_tint * 0.02;
    rgb.g += u_tint * 0.05;
    rgb.b -= u_temperature * 0.05 + u_tint * 0.02;
    rgb *= exp2(u_exposure);
    rgb += u_brightness;
    rgb = (rgb - 0.5) * u_contrast + 0.5;
    rgb = clamp(rgb, 0.0, 1.0);

    float luma = getLuminance(rgb);
    float shadowMask = smoothstep(0.5, 0.0, luma);
    float highlightMask = smoothstep(0.5, 1.0, luma);
    float blackMask = smoothstep(0.2, 0.0, luma);
    float whiteMask = smoothstep(0.8, 1.0, luma);

    rgb += u_shadows * shadowMask * 0.2;
    rgb += u_highlights * highlightMask * 0.2;
    rgb += u_blacks * blackMask * 0.15;
    rgb += u_whites * whiteMask * 0.15;
    rgb = clamp(rgb, 0.0, 1.0);

    if (abs(u_clarity) > 0.0 || abs(u_textureAmt) > 0.0 || abs(u_dehaze) > 0.0) {
        vec3 midMip = textureLod(u_texture, v_texCoord, 2.5).rgb;
        vec3 highMip = textureLod(u_texture, v_texCoord, 5.0).rgb;

        rgb += (rgb - midMip) * u_clarity * 0.3;
        rgb += (rgb - textureLod(u_texture, v_texCoord, 1.0).rgb) * u_textureAmt * 0.4;
        rgb += (rgb - highMip) * u_dehaze * 0.2;
        rgb = clamp(rgb, 0.0, 1.0);
    }

    if (u_useCurves) {
        rgb.r = texture(u_curveR, vec2(rgb.r, 0.5)).r;
        rgb.g = texture(u_curveG, vec2(rgb.g, 0.5)).r;
        rgb.b = texture(u_curveB, vec2(rgb.b, 0.5)).r;

        float masterR = texture(u_curveMaster, vec2(rgb.r, 0.5)).r;
        float masterG = texture(u_curveMaster, vec2(rgb.g, 0.5)).r;
        float masterB = texture(u_curveMaster, vec2(rgb.b, 0.5)).r;
        rgb = vec3(masterR, masterG, masterB);
    }

    vec3 hsl = rgb2hsl(rgb);
    int bandIndex = int(floor(hsl.x * 8.0)) % 8;

    hsl.x += u_hueMix[bandIndex] * 0.125;
    hsl.y += u_satMix[bandIndex] * 0.5;
    hsl.z += u_lumMix[bandIndex] * 0.3;
    hsl = clamp(hsl, 0.0, 1.0);
    rgb = hsl2rgb(hsl);

    luma = getLuminance(rgb);

    float midSplit = 0.5 + u_gradeBalance * 0.25;
    float sWeight = smoothstep(midSplit, 0.0, luma);
    float hWeight = smoothstep(midSplit, 1.0, luma);
    float mWeight = 1.0 - sWeight - hWeight;

    sWeight = pow(sWeight, u_gradeBlending * 2.0);
    hWeight = pow(hWeight, u_gradeBlending * 2.0);

    rgb = applyColorWheel(luma, rgb, u_gradeShadows, sWeight);
    rgb = applyColorWheel(luma, rgb, u_gradeMidtones, mWeight);
    rgb = applyColorWheel(luma, rgb, u_gradeHighlights, hWeight);
    rgb = clamp(rgb, 0.0, 1.0);

    if (u_grainAmount > 0.0) {
        vec2 grainUV = gl_FragCoord.xy / (u_grainSize + 0.01);
        float noise = hash(grainUV + vec2(u_time * 0.01));
        float grainLumaFactor = mix(1.0, noise, u_grainRoughness);
        rgb = mix(rgb, rgb * grainLumaFactor, u_grainAmount * (1.0 - luma * 0.5));
    }

    if (u_vignetteAmount != 0.0) {
        vec2 d = abs(v_texCoord - 0.5) * u_vignetteMidpoint * 2.0;
        float dist = u_vignetteRoundness == 0.0 ? max(d.x, d.y) : length(d);
        float vignette = smoothstep(1.0, 1.0 - u_vignetteFeather, dist);
        rgb = mix(rgb, rgb * vignette, clamp(u_vignetteAmount, 0.0, 1.0));
    }

    luma = getLuminance(rgb);
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 st = v_texCoord * (u_resolution.y / u_dotGap) * aspect;
    vec2 cell = fract(st) - 0.5;
    float r = length(cell);

    if (u_outputMode == 0) {
        fragColor = vec4(rgb, 1.0);
    }
    else if (u_outputMode == 1) {
        float radius = (1.0 - luma) * u_dotSize * 0.08;
        float smoothEdge = 1.5 / (u_resolution.y / u_dotGap);
        float c = smoothstep(radius + smoothEdge, radius - smoothEdge, r);
        fragColor = vec4(vec3(c), 1.0);
    }
    else if (u_outputMode == 2) {
        vec3 cmy = 1.0 - rgb;

        vec2 uvC = mat2(cos(0.26), -sin(0.26), sin(0.26), cos(0.26)) * cell;
        vec2 uvM = mat2(cos(1.31), -sin(1.31), sin(1.31), cos(1.31)) * cell;
        vec2 uvY = mat2(cos(0.0),  -sin(0.0),  sin(0.0),  cos(0.0))  * cell;

        float dotC = smoothstep(cmy.x * u_dotSize * 0.08, 0.0, length(uvC));
        float dotM = smoothstep(cmy.y * u_dotSize * 0.08, 0.0, length(uvM));
        float dotY = smoothstep(cmy.z * u_dotSize * 0.08, 0.0, length(uvY));

        vec3 compositeCMY = vec3(1.0) - vec3(dotC, dotM, dotY);
        fragColor = vec4(compositeCMY, 1.0);
    }
    else if (u_outputMode == 3) {
        float ditherThresh = getBayer8x8(ivec2(gl_FragCoord.xy));
        vec3 bitColor = step(vec3(ditherThresh), rgb);
        fragColor = vec4(bitColor, 1.0);
    }
}