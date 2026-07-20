export const DitherFragment = `precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_dotScale;
uniform float u_matrixSize;
uniform float u_jitter;
uniform vec3 u_dotColor;
uniform vec3 u_bgColor;

out vec4 fragColor;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float bayer2(vec2 a) {
    a = floor(a);
    return fract(dot(a, vec2(0.5, a.y * 0.75)));
}

#define bayer4(a)   (bayer2 (0.5 * (a)) * 0.25 + bayer2(a))
#define bayer8(a)   (bayer4 (0.5 * (a)) * 0.25 + bayer2(a))
#define bayer16(a)  (bayer8 (0.5 * (a)) * 0.25 + bayer2(a))

float getBayer(vec2 pos, int size) {
    if (size == 2) return bayer2(pos);
    if (size == 4) return bayer4(pos);
    if (size == 8) return bayer8(pos);
    if (size == 16) return bayer16(pos);
    return bayer8(pos);
}

void main() {
    vec2 noiseOffset = vec2(random(gl_FragCoord.xy), random(gl_FragCoord.xy + 1.0)) * 2.0 - 1.0;
    vec2 uvJitter = (noiseOffset * u_jitter * 15.0) / u_resolution;
    vec2 texCoord = clamp(v_texCoord + uvJitter, 0.0, 1.0);
    
    vec4 texColor = texture(u_texture, texCoord);
    
    // Apply contrast and brightness
    // contrast: (0 to 3)
    // brightness: (-100 to 100), map to -1.0 to 1.0
    vec3 color = texColor.rgb;
    color = (color - 0.5) * u_contrast + 0.5;
    color = color + (u_brightness / 100.0);
    
    // Convert to grayscale
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    
    // Coordinate for dithering, utilizing dotScale
    vec2 pos = gl_FragCoord.xy / u_dotScale;
    
    float threshold = getBayer(pos, int(u_matrixSize));
    
    // Compare luminance with the Bayer matrix threshold
    float dithered = luma > threshold ? 1.0 : 0.0;
    
    // dithered is 1.0 for background (light) and 0.0 for foreground (dark)
    fragColor = vec4(mix(u_dotColor, u_bgColor, dithered), 1.0);
}
`;
