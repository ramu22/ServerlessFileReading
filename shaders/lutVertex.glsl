// Vertex Shader to just pass along texture coordinates

varying vec2 vuv;

void main() {
    // Pass the coord to the fragment shader.
    vuv = uv;
    gl_Position = projectionMatrix *
                    modelViewMatrix *
                    vec4(position,1.0);
}