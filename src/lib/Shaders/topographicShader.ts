import { withLightroom } from "./lightroomHelper";

export const TopographicFragment = withLightroom(`precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_jitter;
uniform float u_dotScale;
uniform vec3 u_inkColor;
uniform vec3 u_canvasColor;
uniform float u_invertPalette;

out vec4 fragColor;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 noiseOffset = vec2(random(gl_FragCoord.xy), random(gl_FragCoord.xy + 1.0)) * 2.0 - 1.0;
    vec2 uvJitter = (noiseOffset * u_jitter * 15.0) / u_resolution;
    vec2 texCoord = clamp(v_texCoord + uvJitter, 0.0, 1.0);
    
    vec4 texColor = texture(u_texture, texCoord);
    vec3 color = texColor.rgb;
    color = (color - 0.5) * u_contrast + 0.5;
    color = color + (u_brightness / 100.0);
    
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    luma = clamp(luma, 0.0, 1.0);
    
    float frequency = u_dotScale > 0.0 ? u_dotScale : 10.0;
    float level = luma * frequency;
    float diff = abs(level - round(level));
    
    float lineThickness = 0.08;
    float contour = smoothstep(lineThickness, 0.0, diff / fwidth(level));
    
    vec3 cInk = u_inkColor;
    vec3 cPaper = u_canvasColor;
    if (u_invertPalette > 0.5) {
        cInk = u_canvasColor;
        cPaper = u_inkColor;
    }
    
    fragColor = vec4(mix(cPaper, cInk, contour), 1.0);
}
`);
