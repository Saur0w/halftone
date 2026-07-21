import { withLightroom } from "./lightroomHelper";

export const ThermalFragment = withLightroom(`precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_jitter;

out vec4 fragColor;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec3 thermalPalette(float t) {
    vec3 c = vec3(0.0);
    c = mix(vec3(0.0, 0.0, 0.5), vec3(0.0, 0.8, 1.0), smoothstep(0.0, 0.25, t));
    c = mix(c, vec3(0.0, 1.0, 0.0), smoothstep(0.25, 0.5, t));
    c = mix(c, vec3(1.0, 1.0, 0.0), smoothstep(0.5, 0.75, t));
    c = mix(c, vec3(1.0, 0.0, 0.0), smoothstep(0.75, 1.0, t));
    return c;
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
    
    fragColor = vec4(thermalPalette(luma), 1.0);
}
`);
