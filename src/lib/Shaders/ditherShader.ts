export const DitherFragment = `precision highp float;

in vec2 v_texCoord;
uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
    vec4 texColor = texture(u_texture, v_texCoord);
    fragColor = texColor;
}
`;
