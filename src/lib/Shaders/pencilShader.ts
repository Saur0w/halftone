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

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Simple edge detection
float getEdge(vec2 uv) {
    vec2 texel = 1.0 / u_resolution;
    
    float s00 = dot(texture(u_texture, uv + texel * vec2(-1.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));
    float s10 = dot(texture(u_texture, uv + texel * vec2(0.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));
    float s20 = dot(texture(u_texture, uv + texel * vec2(1.0, -1.0)).rgb, vec3(0.299, 0.587, 0.114));
    
    float s01 = dot(texture(u_texture, uv + texel * vec2(-1.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float s21 = dot(texture(u_texture, uv + texel * vec2(1.0, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    
    float s02 = dot(texture(u_texture, uv + texel * vec2(-1.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
    float s12 = dot(texture(u_texture, uv + texel * vec2(0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
    float s22 = dot(texture(u_texture, uv + texel * vec2(1.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
    
    float gx = s00 + 2.0 * s01 + s02 - s20 - 2.0 * s21 - s22;
    float gy = s00 + 2.0 * s10 + s20 - s02 - 2.0 * s12 - s22;
    
    return length(vec2(gx, gy));
}

void main() {
    vec2 noiseOffset = vec2(random(gl_FragCoord.xy), random(gl_FragCoord.xy + 1.0)) * 2.0 - 1.0;
    vec2 uvJitter = (noiseOffset * u_jitter * 15.0) / u_resolution;
    vec2 texCoord = clamp(v_texCoord + uvJitter, 0.0, 1.0);
    
    vec4 texColor = texture(u_texture, texCoord);
    vec3 color = texColor.rgb;
    
    color = (color - 0.5) * u_contrast + 0.5;
    color = color + (u_brightness / 100.0);
    float luma = clamp(dot(color, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    
    // Edge detection adds to darkness
    float edge = getEdge(texCoord);
    
    // Hatching calculation
    float angleRad = radians(u_angle);
    float s = sin(angleRad);
    float c = cos(angleRad);
    mat2 rotMat = mat2(c, -s, s, c);
    
    vec2 rotatedPos = rotMat * (gl_FragCoord.xy + noiseOffset * u_jitter * 10.0);
    
    // Scale stroke frequency based on dotScale (acting as stroke width)
    float hatchFreq = max(2.0, u_dotScale * 2.0);
    
    // Generate organic wavy lines
    float wave = sin(rotatedPos.x / hatchFreq + random(floor(rotatedPos.y / hatchFreq) * vec2(1.0, 0.0)) * u_jitter);
    
    // Combine luma and edges
    // Darker areas get denser strokes
    float darkness = (1.0 - luma) + edge * 2.0;
    
    // Thresholding the wave against darkness
    float stroke = wave < (darkness * 2.0 - 1.0) ? 1.0 : 0.0;
    
    // Cross hatch for very dark areas
    if (darkness > 0.6) {
        float wave2 = sin(rotatedPos.y / hatchFreq);
        stroke = max(stroke, wave2 < (darkness * 2.0 - 1.5) ? 1.0 : 0.0);
    }
    
    // Stroke = 1.0 means INK, 0.0 means PAPER
    float inkIntensity = clamp(stroke, 0.0, 1.0);
    
    vec3 cInk = u_inkColor;
    vec3 cPaper = u_canvasColor;
    
    if (u_invertPalette > 0.5) {
        cInk = u_canvasColor;
        cPaper = u_inkColor;
    }
    
    fragColor = vec4(mix(cPaper, cInk, inkIntensity), 1.0);
}
`;
