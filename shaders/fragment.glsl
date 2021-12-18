
#define PHONG

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

#include <common>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>

// This is the added code to make our map
uniform float numBlocks;
uniform float time;
uniform sampler2D texture1;
varying vec3 xys;           // from geometry, normalzing map values

void main() {

    #include <clipping_planes_fragment>

    // Replace standard PHONG diffuse with ours
    //vec4 diffuseColor = vec4( diffuse, opacity );     
    //float x = fract(xys.x+time);
    vec4 diffuseColor = texture2D(texture1, vec2(xys.x, xys.y));
    float mapStatus = xys[2];
    if (mapStatus > 2.5) {       
        diffuseColor = vec4(1.0,0,0,1.0);
    } else if (mapStatus >1.0) {        // unsampled
        diffuseColor = vec4(0.6,0.6,0.6,1.0);
    } else if (mapStatus > 0.0) {                            // scar
        diffuseColor = vec4(0.8, 0.8, 0.8, 1.0);
    }

    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    vec3 totalEmissiveRadiance = emissive;

    #include <specularmap_fragment>
    #include <normal_fragment_begin>

    // accumulation
    #include <lights_phong_fragment>
    #include <lights_fragment_begin>
    #include <lights_fragment_maps>
    #include <lights_fragment_end>

    vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

    gl_FragColor = vec4( outgoingLight, 1.0 );
}

