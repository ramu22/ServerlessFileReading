// This fragment shader will create a linear rainbow lookup table in the x direction
// all the y direction will be duplicate

uniform float blocks;
uniform float offset;
varying vec2 vuv;

void main() {
 
    vec4 colors[8];
    colors[0] = vec4(1.0,1.0,1.0,1.0);      // saturation = 0
    colors[1] = vec4(1.0,0.0,0.0,1.0);      // H 0
    colors[2] = vec4(1.0,0.5,0.0,1.0);      // H 30
    colors[3] = vec4(1.0,1.0,0.0,1.0);      // H 60
    colors[4] = vec4(0.5,1.0,0.5,1.0);      // H 120
    colors[5] = vec4(0.0,1.0,1.0,1.0);      // H 180
    colors[6] = vec4(0.0,0.0,1.0,1.0);      // H 240
    colors[7] = vec4(0.6,0.3,1.0,1.0);      // H 280

    float value = atan(-vuv.y+0.5, -vuv.x+0.5) / 6.283185307179586+0.5;   // for radial map
    //float value = vuv.x;          // for linear map

    float adjValue = offset + value;
    adjValue = adjValue - floor(adjValue);   // just take decimal
    float blockNum = floor(adjValue * blocks +0.5);
    float colorBlockFloat = blockNum * 7.0 / blocks;

    int lowColorBlock = int(colorBlockFloat);
    float remainder = colorBlockFloat - float(lowColorBlock);
    vec4 color = mix(colors[lowColorBlock], colors[lowColorBlock+1], remainder); 

    gl_FragColor = color;
}