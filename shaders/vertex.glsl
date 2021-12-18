varying vec3 vViewPosition;

#include <normal_pars_vertex>
    
// This is the added code to make our map
// We normalize the uv values between 0 and 1
uniform float colorLow;
uniform float colorHigh;
uniform float numBlocks;
uniform float time;
varying vec3 xys;           // x coordinate, y coordinate (if reentrant) and status

void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <normal_vertex>

    #include <begin_vertex>
    #include <project_vertex>

    // vViewPosition = - mvPosition.xyz;

    float fract = (uv[0] - colorLow)/(colorHigh-colorLow);

    //For linear map
    // xys.x = fract;
    // xys.y = 0.0;

    // For radial map convert fract to a position on x, y plane
    float angle = fract * 6.283185307179586;
    xys.x = 0.5 * cos(angle) + 0.5;
    xys.y = 0.5 * sin(angle) + 0.5;

    xys.x = min(max(xys.x,0.0),0.999);
    xys.y = min(max(xys.y,0.0),0.999);
    xys.z = uv[1];  // Map status
} 