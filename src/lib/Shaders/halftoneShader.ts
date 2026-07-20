export const HalftoneFragment = `precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_dotScale;
uniform float u_angle;
uniform float u_shape;
uniform float u_jitter;
uniform vec3 u_dotColor;
uniform vec3 u_bgColor;

out vec4 fragColor;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    // 1. Calculate Jittered Coordinates
    // Jitter creates an organic noisy offset. At max jitter, it bleeds up to a few pixels.
    vec2 noiseOffset = vec2(random(gl_FragCoord.xy), random(gl_FragCoord.xy + 1.0)) * 2.0 - 1.0;
    
    // UV space jitter
    vec2 uvJitter = (noiseOffset * u_jitter * 15.0) / u_resolution;
    vec2 texCoord = clamp(v_texCoord + uvJitter, 0.0, 1.0);
    
    // For the halftone grid calculation below, we still use screen space
    vec2 samplePos = gl_FragCoord.xy + (noiseOffset * u_jitter * 15.0);
    
    // 2. Sample Image & Adjust
    vec4 texColor = texture(u_texture, texCoord);
    
    vec3 color = texColor.rgb;
    color = (color - 0.5) * u_contrast + 0.5;
    color = color + (u_brightness / 100.0);
    
    float luma = clamp(dot(color, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    
    // 3. Setup Halftone Grid
    float angleRad = radians(u_angle);
    float s = sin(angleRad);
    float c = cos(angleRad);
    mat2 rotMat = mat2(c, -s, s, c);
    
    vec2 rotatedPos = rotMat * samplePos;
    
    float cellSize = max(2.0, u_dotScale);
    vec2 cellPos = fract(rotatedPos / cellSize);
    
    // Map cell position to -1.0 .. 1.0
    vec2 gridPos = cellPos * 2.0 - 1.0;
    
    // 4. Evaluate SDF based on Shape
    float d = 0.0;
    float radius = 0.0;
    
    if (u_shape < 0.5) {
        // DOT (Circle SDF)
        d = length(gridPos);
        // Map luma so that luma=0 => radius=sqrt(2) (full cell coverage)
        radius = (1.0 - luma) * 1.414;
    } else if (u_shape < 1.5) {
        // LINE (1D distance)
        d = abs(gridPos.y);
        radius = 1.0 - luma;
    } else {
        // CROSS (Square/diamond SDF)
        // Combine x and y for an intersecting or cross-hatch look
        // Actually, a classic 'cross' halftone usually implies intersecting lines.
        // max(abs(x), abs(y)) gives a square dot which grows to fill the cell.
        d = max(abs(gridPos.x), abs(gridPos.y));
        radius = 1.0 - luma;
    }
    
    // 5. Anti-aliased thresholding
    // The smoothing factor depends on cell size to look consistent.
    float aa = 1.5 / cellSize; 
    
    float outputColor = smoothstep(radius - aa, radius + aa, d);
    
    // outputColor is 0 inside the shape (foreground) and 1 outside (background)
    fragColor = vec4(mix(u_dotColor, u_bgColor, outputColor), 1.0);
}
`;
