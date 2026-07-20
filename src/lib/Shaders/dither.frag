#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;

uniform float u_brightness;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;

uniform vec3 u_shadowsTint;
uniform vec3 u_midtonesTint;
uniform vec3 u_highlightsTint;

uniform float u_dotSize;
uniform float u_dotGap;

float getLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
    vec4 texColor = texture(u_texture, v_texCoord);
    vec3 rgb = texColor.rgb;
    rgb += u_brightness;
    rgb = (rgb - 0.5) * u_contrast + 0.5;
    rgb = clamp(rgb, 0.0, 1.0);

    float baseLuminance = getLuminance(rgb);
    float shadowMask    = smoothstep(0.5, 0.0, baseLuminance);
    float highlightMask = smoothstep(0.5, 1.0, baseLuminance);
    float blackMask     = smoothstep(0.2, 0.0, baseLuminance);
    float whiteMask     = smoothstep(0.8, 1.0, baseLuminance);
    float midtoneMask   = 1.0 - shadowMask - highlightMask;

    rgb += u_shadows * shadowMask * 0.15;
    rgb += u_highlights * highlightMask * 0.15;
    rgb += u_blacks * blackMask * 0.10;
    rgb += u_whites * whiteMask * 0.10;
    rgb = clamp(rgb, 0.0, 1.0);
    rgb += u_shadowsTint * shadowMask * 0.2;
    rgb += u_midtonesTint * midtoneMask * 0.2;
    rgb += u_highlightsTint * highlightMask * 0.2;
    rgb = clamp(rgb, 0.0, 1.0);

    float finalLuminance = getLuminance(rgb);
    vec2 aspectCorrection = vec2(u_resolution.x / u_resolution.y, 1.0);
    vec2 dotGridCoords = v_texCoord * (u_resolution.y / u_dotGap) * aspectCorrection;
    vec2 cellCenter = fract(dotGridCoords) - 0.5;
    float pixelDistFromCenter = length(cellCenter);
    float dotTargetRadius = (1.0 - finalLuminance) * u_dotSize * 0.5;
    float edgeSmoothness = 1.5 / (u_resolution.y / u_dotGap);
    float dotFactor = smoothstep(dotTargetRadius + edgeSmoothness, dotTargetRadius - edgeSmoothness, pixelDistFromCenter);

    vec3 compositeOutput = mix(vec3(1.0), vec3(0.0), dotFactor);

    fragColor = vec4(compositeOutput, texColor.a);
}