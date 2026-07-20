export const PencilFragment = `precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_dotScale; // Controls hatch spacing/stroke size
uniform float u_angle; // Base angle for the sketch lines
uniform float u_jitter;
uniform vec3 u_inkColor;
uniform vec3 u_canvasColor;
uniform float u_invertPalette;

out vec4 fragColor;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        v += amp * noise(p);
        p *= 2.02;
        amp *= 0.5;
    }
    return v;
}

float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

float getEdge(vec2 uv) {
    vec2 texel = 1.0 / u_resolution;

    float s00 = luma(texture(u_texture, uv + texel * vec2(-1.0, -1.0)).rgb);
    float s10 = luma(texture(u_texture, uv + texel * vec2(0.0, -1.0)).rgb);
    float s20 = luma(texture(u_texture, uv + texel * vec2(1.0, -1.0)).rgb);

    float s01 = luma(texture(u_texture, uv + texel * vec2(-1.0, 0.0)).rgb);
    float s21 = luma(texture(u_texture, uv + texel * vec2(1.0, 0.0)).rgb);

    float s02 = luma(texture(u_texture, uv + texel * vec2(-1.0, 1.0)).rgb);
    float s12 = luma(texture(u_texture, uv + texel * vec2(0.0, 1.0)).rgb);
    float s22 = luma(texture(u_texture, uv + texel * vec2(1.0, 1.0)).rgb);

    float gx = s00 + 2.0 * s01 + s02 - s20 - 2.0 * s21 - s22;
    float gy = s00 + 2.0 * s10 + s20 - s02 - 2.0 * s12 - s22;

    return length(vec2(gx, gy));
}

float hatchLayer(vec2 fragPos, float angleRad, float freq, float widthFactor, float wobble) {
    float s = sin(angleRad);
    float c = cos(angleRad);
    mat2 rot = mat2(c, -s, s, c);
    vec2 p = rot * fragPos;
    p.x += wobble;

    float coord = p.y / freq;
    float tri = abs(fract(coord) - 0.5) * 2.0; 

    float aa = fwidth(coord) * 1.5 + 0.001;
    float halfWidth = clamp(widthFactor, 0.0, 1.0);
    return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, tri);
}

void main() {
    vec2 texel = 1.0 / u_resolution;
    vec2 warp = vec2(
        noise(v_texCoord * u_resolution * 0.06),
        noise(v_texCoord * u_resolution * 0.06 + 9.2)
    ) * 2.0 - 1.0;
    vec2 texCoord = clamp(v_texCoord + warp * u_jitter * 4.0 * texel, 0.0, 1.0);

    vec4 texColor = texture(u_texture, texCoord);
    vec3 color = texColor.rgb;

    color = (color - 0.5) * u_contrast + 0.5;
    color = color + (u_brightness / 100.0);
    float baseLuma = clamp(luma(color), 0.0, 1.0);

    float edge = getEdge(texCoord);
    edge = smoothstep(0.05, 0.5, edge); 

    float darkness = clamp((1.0 - baseLuma) + edge * 0.6, 0.0, 1.0);

    float freq = max(2.0, u_dotScale * 2.2);
    float angleRad = radians(u_angle);
    float wobbleAmt = (noise(gl_FragCoord.xy * 0.05) * 2.0 - 1.0) * u_jitter * freq * 0.4;
    float layer1 = hatchLayer(gl_FragCoord.xy, angleRad, freq, smoothstep(0.08, 0.85, darkness) * 0.85, wobbleAmt);
    float layer2 = hatchLayer(gl_FragCoord.xy, angleRad + radians(90.0), freq, smoothstep(0.35, 0.95, darkness) * 0.85, wobbleAmt * 0.8);
    float layer3 = hatchLayer(gl_FragCoord.xy, angleRad + radians(45.0), freq * 0.6, smoothstep(0.6, 1.0, darkness) * 0.9, wobbleAmt * 1.2);

    float strokeCoverage = max(layer1, max(layer2, layer3));

    float grain = fbm(gl_FragCoord.xy * 0.9) * 0.15;
    strokeCoverage = clamp(strokeCoverage + grain * strokeCoverage, 0.0, 1.0);

    float paperTexture = fbm(gl_FragCoord.xy * 0.35) * 0.04;

    vec3 cInk = u_inkColor;
    vec3 cPaper = u_canvasColor;

    if (u_invertPalette > 0.5) {
        cInk = u_canvasColor;
        cPaper = u_inkColor;
    }

    vec3 paperWithTexture = cPaper - paperTexture;
    vec3 finalColor = mix(paperWithTexture, cInk, strokeCoverage);

    fragColor = vec4(finalColor, 1.0);
}
`;