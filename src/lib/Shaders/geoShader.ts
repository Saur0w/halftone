export const VertexFragment = `out vec2 v_texCoord;

void main() {
    v_texCoord = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
