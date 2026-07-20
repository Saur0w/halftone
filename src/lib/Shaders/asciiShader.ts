export const AsciiFragment = `precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_dotScale;
uniform float u_jitter;
uniform vec3 u_inkColor;
uniform vec3 u_canvasColor;
uniform float u_invertPalette;

out vec4 fragColor;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

int getCharBitmap(int density) {
    if (density == 0) return 0;          // ' '
    if (density == 1) return 4096;       // '.'
    if (density == 2) return 131200;     // ':'
    if (density == 3) return 14336;      // '-'
    if (density == 4) return 145536;     // '+'
    if (density == 5) return 18415150;   // 'a'
    if (density == 6) return 11512810;   // '#'
    return 33554431;                     // block
}

void main() {
    float charSize = max(5.0, u_dotScale * 2.5); // Ensure cell is large enough
    vec2 cells = u_resolution / charSize;
    
    vec2 cellUv = floor(v_texCoord * cells) / cells;
    vec2 sampleUv = cellUv + (0.5 / cells);
    
    vec2 noiseOffset = vec2(random(sampleUv), random(sampleUv + 1.0)) * 2.0 - 1.0;
    vec2 jitteredUv = clamp(sampleUv + noiseOffset * (u_jitter * 0.05), 0.0, 1.0);
    
    vec4 texColor = texture(u_texture, jitteredUv);
    
    vec3 color = texColor.rgb;
    color = (color - 0.5) * u_contrast + 0.5;
    color = color + (u_brightness / 100.0);
    
    float luma = clamp(dot(color, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    
    // Invert luma so that dark areas (low luma) get high character density (ink)
    int density = int(round((1.0 - luma) * 7.0));
    int bitmap = getCharBitmap(density);
    
    vec2 charUv = fract(v_texCoord * cells);
    int x = int(floor(charUv.x * 5.0));
    int y = int(floor((1.0 - charUv.y) * 5.0)); // Invert y so character draws top-to-bottom
    
    int bitIndex = y * 5 + x;
    float pixel = float((bitmap >> bitIndex) & 1);
    
    vec3 cInk = u_inkColor;
    vec3 cPaper = u_canvasColor;
    if (u_invertPalette > 0.5) {
        cInk = u_canvasColor;
        cPaper = u_inkColor;
    }
    
    // pixel is 1.0 for the character (foreground) and 0.0 for empty space (background)
    fragColor = vec4(mix(cPaper, cInk, pixel), 1.0);
}
`;
