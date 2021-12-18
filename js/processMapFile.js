// ProcessMapFile
//
// input:  Takes the text from a DxLandmarkGeo File
// returns:  a Three.js Group Object containing all the volumes as meshes
//

import * as THREE from './three.module.js'
//import * as THREE from "../node_modules/three/build/three.module.js"

export async function processMapFile(fileText) {
    
    // return geometry
    var node;

    try {
        const parser = new DOMParser();
        const xmlDom = parser.parseFromString(fileText, "text/xml");
        const volumesElem = xmlDom.getElementsByTagName("Volumes")[0];
        const volumesCount = parseInt(volumesElem.attributes.number.value)
        console.log(`${volumesCount} Total Volumes`)
        node = new THREE.Group()
        for (const volumeElem of volumesElem.getElementsByTagName("Volume")) {
            const volume = await makeVolumeMesh(volumeElem)
            node.add( volume )
        }
    } catch (error) {
        console.log(error)
        node = makeErrorNode(error)
    }
    console.log(node)
    return node;
}

function makeErrorNode(error) {
    console.log("Invalid XML file");
    console.log(error);
    var vertices = new Float32Array([
        0, 0, 0, // triangle 1
        1, 0, 0,
        1, 1, 0,

        0, 0, 0, // triangle 2
        1, 1, 0,
        0, 1, 0
    ]);

    // create position property
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshNormalMaterial({
            side: THREE.DoubleSide
        }))
}

async function makeVolumeMesh(volumeElement) {

    // const vertexNumber = parseInt(volumeElement.getElementsByTagName("Vertices")[0].attributes.number.value)
    // const normalsNumber = parseInt(volumeElement.getElementsByTagName("Normals")[0].attributes.number.value)
    // const polygonNumber = parseInt(volumeElement.getElementsByTagName("Polygons")[0].attributes.number.value)

    //Parse Vertices.  We use flat map since Float32Array is just a vector
    const vertexArray = new Float32Array(volumeElement.getElementsByTagName("Vertices")[0]
        .childNodes[0].nodeValue
        .trim().split("\n")
        .flatMap( 
            x => x.trim().split("  ").map( x => parseFloat(x))
        ));

    //Parse Normals
    const normalsArray = new Float32Array(volumeElement.getElementsByTagName("Normals")[0]
        .childNodes[0].nodeValue
        .trim().split("\n")
        .flatMap( 
            x => x.trim().split("  ").map( x => parseFloat(x))
        ));

    //Parse the Polygons
    const polygonArray = volumeElement.getElementsByTagName("Polygons")[0]
        .childNodes[0].nodeValue
        .trim().split("\n")
        .flatMap( 
            x => x.trim().split(" ").map( x => parseInt(x) - 1)     // To make zero based
        );

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normalsArray, 3));
    geometry.setIndex(polygonArray);

    //Parse the Name and Color
    const volumeName = volumeElement.attributes.name.value
    console.log(volumeName)

    let material; 

    //Map_data, Map_status and surface of origin if present (map files)
    if ( volumeElement.getElementsByTagName("Map_data").length > 0 ) {

        const mapDataArray = volumeElement.getElementsByTagName("Map_data")[0]
            .childNodes[0].nodeValue
            .trim().split("\n")
            .map( x => parseFloat(x) );   

        const mapStatusArray = volumeElement.getElementsByTagName("Map_status")[0]
            .childNodes[0].nodeValue
            .trim().split("\n")
            .map( x => parseInt(x) );   

        const mapHighLow = volumeElement.getElementsByTagName("Color_high_low")[0]
            .childNodes[0].nodeValue
            .trim().split("  ")
            .map( x => parseFloat(x))
        const colorLow = mapHighLow[0]
        const colorHigh = mapHighLow[1]

        const sufaceOfOriginArray = volumeElement.getElementsByTagName("Surface_of_origin")[0]
            .childNodes[0].nodeValue
            .trim().split("\n")
            .map( x => parseInt(x) );   

        //Zip the mapDataArray and mapStatusArray into uv coordinates for our shader
        const uvArray = new Float32Array(mapDataArray.flatMap( (x, i) => [x, mapStatusArray[i]] ));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2))

        var customUniforms = {
            colorHigh: { value: colorHigh },
            colorLow: { value: colorLow },
            time: { value: 0.0 },
            texture1: { type: 't', value: makeTexture() }
        }

        const fragmentShader = await fetch('../shaders/fragment.glsl').then(response => response.text())
        const vertexShader = await fetch('../shaders/vertex.glsl').then(response => response.text())
        material = new THREE.ShaderMaterial( {
            uniforms: { ...THREE.ShaderLib.phong.uniforms, ...customUniforms},
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            lights: true,
            side: THREE.DoubleSide
        })
        console.log(`${mapHighLow} Color High Low`)

    } else {               // This means it is not a Map file
        var volumeColor = parseInt(volumeElement.attributes.color.value, 16) || 0x00ffff
        material = new THREE.MeshPhongMaterial({
            color: volumeColor,
            side: THREE.DoubleSide
        })
    }

    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = volumeName
    return mesh
}


// The following 2 functions are now unused
// We use a buffer texture technique instead
function makeTexture(offset=0.0, boxes=8) {
    const width = 2048;
    const height = 1;       // all we need a single pixel

    let index = 0
    const data = new Uint8Array( 4 * width * height );
    for ( let j = 0; j < height; j++ ) 
        for ( let i =0; i < width; i++ ) {
            const adjValue = offset + i/width
            var color = makeColor(adjValue-Math.floor(adjValue), boxes)
            data[ index ] = color[0]; 
            data[ index + 1 ] = color[1]; 
            data[ index + 2 ] = color[2]; 
            data[ index + 3 ] = 1.0;
            index += 4;
    }

    // used the buffer to create a DataTexture 
    return new THREE.DataTexture( data, width, height, THREE.RGBAFormat );    
}

function makeColor(x, blocks) {
    const colors = [
        [255, 255, 255],
        [255, 0, 0],
        [255, 128, 0],
        [255, 255, 0],
        [128, 255, 0],
        [0, 255, 255],
        [0, 0, 255],
        [128,0,128],
        [0,0,0]         // dummy should not be used but need it for multiplying by remainder of 0
    ]

    const discreteX = Math.trunc(x*(blocks)+0.5)/blocks          // high and low are half sized
    const colorBlock = discreteX * 7.0
    
    const lowColorBlock = Math.trunc(colorBlock)
    const remainder = colorBlock - lowColorBlock
    return [
        (1-remainder)*colors[lowColorBlock][0] + remainder*colors[lowColorBlock+1][0],
        (1-remainder)*colors[lowColorBlock][1] + remainder*colors[lowColorBlock+1][1],
        (1-remainder)*colors[lowColorBlock][2] + remainder*colors[lowColorBlock+1][2]
    ]
}

