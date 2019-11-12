export const vertexShader = `attribute vec3 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

void main () {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const terrainVertexShader =
`varying vec2 vUv;
uniform vec2 scale;
uniform vec2 offset;

void main( void ) {

    vUv = uv * scale + offset;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}`;