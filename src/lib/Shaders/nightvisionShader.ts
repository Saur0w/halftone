export const NightvisionFragment = `precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_jitter;
uniform float u_time;

out vec4 fragColor;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 noiseOffset = vec2(random(gl_FragCoord.xy + u_time), random(gl_FragCoord.xy + u_time + 1.0)) * 2.0 - 1.0;
    vec2 uvJitter = (noiseOffset * (u_jitter + 0.05) * 15.0) / u_resolution;
    vec2 texCoord = clamp(v_texCoord + uvJitter, 0.0, 1.0);
    
    vec4 texColor = texture(u_texture, texCoord);
    vec3 color = texColor.rgb;
    color = (color - 0.5) * u_contrast + 0.5;
    color = color + (u_brightness / 100.0);
    
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    luma = clamp(luma, 0.0, 1.0);
    
    vec3 greenPhosphor = vec3(0.0, luma * 1.5, 0.0);
    if (luma > 0.8) {
        greenPhosphor += vec3(luma - 0.8) * 0.8;
    }
    
    float scanline = sin(v_texCoord.y * u_resolution.y * 1.5) * 0.1 + 0.9;
    greenPhosphor *= scanline;
    
    float n = random(v_texCoord + fract(u_time)) * 0.15;
    greenPhosphor += vec3(n);
    
    vec2 uv = v_texCoord - 0.5;
    float vignette = 1.0 - dot(uv, uv) * 1.5;
    greenPhosphor *= clamp(vignette, 0.0, 1.0);
    
    fragColor = vec4(greenPhosphor, 1.0);
}
`;
