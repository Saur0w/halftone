#version 300 es
precision highp float;

in vec2 v_textCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contast;

float getLuminane(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float getBayerThreshold(ivec2 pixelPos) {
    int x = pixelPos.x % 4;
    int y = pixelPos.y % 4;
    int index = y * 4 + x;

    float threshold = 0.0;

    if (index == 0)  threshold = 0.0;
    else if (index == 1)  threshold = 8.0;
    else if (index == 2)  threshold = 2.0;
    else if (index == 3)  threshold = 10.0;
    else if (index == 4)  threshold = 12.0;
    else if (index == 5)  threshold = 4.0;
    else if (index == 6)  threshold = 14.0;
    else if (index == 7)  threshold = 6.0;
    else if (index == 8)  threshold = 3.0;
    else if (index == 9)  threshold = 11.0;
    else if (index == 10) threshold = 1.0;
    else if (index == 11) threshold = 9.0;
    else if (index == 12) threshold = 15.0;
    else if (index == 13) threshold = 7.0;
    else if (index == 14) threshold = 13.0;
    else if (index == 15) threshold = 5.0;

    return (threshold + 0.5) / 16.0;
}

void main() {
    vec4 texColor = texture(u_texture, v_texCoord);
    vec3 rgb = texColor.rgb;

    rgb *= u_brightness;
    rgb = (rgb - 0.5) * u_contrast + 0.5;
    rgb = clamp(rgb, 0.0, 1.0);
    float luminance = getLuminance(rgb);
    ivec2 pixelPos = ivec2(gl_FragCoord.xy);
    float threshold = getBayerThreshold(pixelPos);
    float finalBit = luminance > threshold ? 1.0 : 0.0;

    fragColor = vec4(vec3(finalBit), 1.0);
}