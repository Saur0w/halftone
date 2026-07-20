export const OriginalFragment = `precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;

out vec4 fragColor;

void main() {
    vec4 texColor = texture(u_texture, v_texCoord);
    
    // Apply contrast and brightness even on original if we want, or strictly passthrough?
    // User requested "Original", like Lightroom, it usually has no adjustments.
    fragColor = texColor;
}
`;
