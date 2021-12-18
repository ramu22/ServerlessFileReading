
let lastX;
let lastY;

let object
let domElement
let zoomSpeed = 1.0

let minScale = 0.01
let maxScale = 100

// Set to true to enable damping (inertia)
// If damping is enabled, you must call controls.update() in your animation loop
let enableDamping = false;
let dampingFactor = 0.05;

import * as THREE from './three.module.js'
//import * as THREE from "../node_modules/three/build/three.module.js"

export function controlObjectWithMouse(anObject, aDomElement) {
    object = anObject;
    domElement = aDomElement;
    console.log(domElement)
    domElement.addEventListener( 'contextmenu', onContextMenu, false );
    domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    domElement.addEventListener( 'wheel', onMouseWheel, false );

    domElement.addEventListener( 'touchstart', onTouchStart, false );
	domElement.addEventListener( 'touchend', onTouchEnd, false );
	domElement.addEventListener( 'touchmove', onTouchMove, false );
}
export function dispose() {
    domElement.removeEventListener( 'contextmenu', onContextMenu, false );
    domElement.removeEventListener( 'mousedown', onDocumentMouseDown, false );
    domElement.removeEventListener( 'wheel', onMouseWheel, false );

    domElement.removeEventListener( 'touchstart', onTouchStart, false );
	domElement.removeEventListener( 'touchend', onTouchEnd, false );
	domElement.removeEventListener( 'touchmove', onTouchMove, false );
    removeListeners()
}
export function update() {

}

function onContextMenu(event) {
 //  event.preventDefault()
}

function onDocumentMouseDown( event ) {
    event.preventDefault();
    switch(event.button) {
        case 0:
            domElement.addEventListener( 'mousemove', onDocumentMouseMoveToRotate, false );
            domElement.addEventListener( 'mouseup', onMouseUp, false );
            domElement.addEventListener('mouseenter', onMouseEnter, false);
            //domElement.addEventListener( 'mouseout', onMouseOut, false );
            break;
        case 1:
            if (event.shiftKey) {
                domElement.addEventListener( 'mousemove', onDocumentMouseMoveToPan, false );
            } else {
                domElement.addEventListener( 'mousemove', onDocumentMouseMoveToRotate, false );
            }
            domElement.addEventListener( 'mouseup', onMouseUp, false );
            domElement.addEventListener('mouseenter', onMouseEnter, false);
            break;
        case 2:
            domElement.addEventListener( 'mousemove', onDocumentMouseMoveToPan, false );
            domElement.addEventListener( 'mouseup', onMouseUp, false );
            domElement.addEventListener('mouseenter', onMouseEnter, false);
            //domElement.addEventListener( 'mouseout', onMouseOut, false ); 
            break;   
    }
    lastX = event.clientX;
    lastY = event.clientY;
}

function onMouseOut(event) {
    console.log("mouse out")
    removeListeners()
    domElement.addEventListener('mouseenter', onMouseEnter, false);
}
function onMouseEnter(event) {
    // if we re-enter with button still down, continue moving
    if (event.buttons == 0) {
        removeListeners()
    }
}
function onMouseUp(event) {
    removeListeners()
}

function onDocumentMouseMoveToRotate( event ) {
    let rotationX = ( event.clientX - lastX ) * 0.01;
    let rotationY = ( event.clientY - lastY ) * 0.01;
    rotateObjectBy(rotationX, rotationY)
    lastX = event.clientX;
    lastY = event.clientY;
}

function onDocumentMouseMoveToPan( event ) {
    let scaling = Math.min(domElement.clientWidth, domElement.clientHeight)/2.0        // 2 because of camera (-1,1,1,-1)
    let panX = ( event.clientX - lastX ) / scaling;
    let panY = ( event.clientY - lastY ) / scaling;
    panObjectBy(panX, panY)
    lastX = event.clientX;
    lastY = event.clientY;
}

function onMouseWheel( event ) { 
    event.preventDefault();
    event.stopPropagation();
    let scale = Math.pow( 0.95, zoomSpeed );
    if (event.deltaY < 0) scale = 1/scale
    scaleObjectBy(scale)
}

//MARK:  Touch events

var TOUCHSTATE = {
    NONE: - 1,
    ROTATE: 3,
    PAN: 4,
    ZOOM: 5,
    PAN2: 6
};
var state = TOUCHSTATE.NONE;
let startTime;  // Check for long touch (time since document started)

function onTouchStart( event ) {

    event.preventDefault();

    switch ( event.touches.length ) {
        case 1:
            lastX = event.touches[0].pageX;
            lastY = event.touches[0].pageY;   
            state = TOUCHSTATE.ROTATE;
            state = TOUCHSTATE.PAN;
            break;
        case 2:
            var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
            var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
            var distance = Math.sqrt( dx * dx + dy * dy );
            lastX = distance;
            state = TOUCHSTATE.ZOOM;
            break;
    }
    startTime = performance.now();
}


function onTouchMove( event ) {
    event.preventDefault();
    event.stopPropagation();
    if ( performance.now() - startTime < 500 ) {
        if (state == TOUCHSTATE.PAN ) {
            state = TOUCHSTATE.ROTATE
        } 
        else if ((state == TOUCHSTATE.ZOOM) && (Math.abs(event.scale - 1) < 0.02)) {
            console.log(event)
            state = TOUCHSTATE.PAN2
            lastX = 0.5 * (event.touches[0].pageX + event.touches[1].pageX)
            lastY = 0.5 * (event.touches[0].pageY + event.touches[1].pageY)
        }
    }
    // For panning
    const scaling = Math.min(domElement.clientWidth, domElement.clientHeight)/2.0        // 2 because of camera (-1,1,1,-1)

    switch ( state ) {
        case TOUCHSTATE.ROTATE:
            const rotationX = ( event.touches[0].pageX - lastX ) * 0.015;
            const rotationY = ( event.touches[0].pageY - lastY ) * 0.015;
            rotateObjectBy(rotationX, rotationY)
            lastX = event.touches[0].pageX;
            lastY = event.touches[0].pageY;           
            break;
        case TOUCHSTATE.PAN:
            const panX = ( event.touches[0].pageX - lastX )/scaling;
            const panY = ( event.touches[0].pageY - lastY )/scaling;
            panObjectBy( panX, panY );
            lastX = event.touches[0].pageX;
            lastY = event.touches[0].pageY;           
            break;  
        case TOUCHSTATE.PAN2:       // 2 finger pan
            const middleX = 0.5 * (event.touches[0].pageX + event.touches[1].pageX)
            const middleY = 0.5 * (event.touches[0].pageY + event.touches[1].pageY)
            const pan2X = ( middleX - lastX )/scaling;
            const pan2Y = ( middleY - lastY )/scaling;
            panObjectBy( pan2X, pan2Y );
            lastX = middleX;
            lastY = middleY;           
            break;  
        case TOUCHSTATE.ZOOM:
            const dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
            const dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
            const distance = Math.sqrt( dx * dx + dy * dy );
            const scale = Math.pow(distance/lastX, zoomSpeed)
            scaleObjectBy(scale)
            lastX = distance
            break;
        default:
            state = TOUCHSTATE.NONE;
    }
}

function onTouchEnd( event ) {
    state = TOUCHSTATE.NONE;
}


function rotateObjectBy(rotationX, rotationY) {
    // const goalRotationZ = object.rotation.z + rotationX;
    // const goalRotationX = object.rotation.x + rotationY;
    // object.rotation.z = goalRotationZ;
    // object.rotation.x = goalRotationX;
    // console.log(object.getWorldQuaternion(object._q))

    object.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), rotationX);
    object.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), rotationY);
} 
function scaleObjectBy(scale) {
    const newScale = Math.max( minScale, Math.min( maxScale, object.scale.x * scale ) );
    object.scale.set(newScale,newScale,newScale)
}
function panObjectBy(panX, panY) {
    object.position.set(object.position.x + panX, object.position.y, object.position.z - panY)
}


function removeListeners( event ) {
    domElement.removeEventListener( 'mousemove', onDocumentMouseMoveToRotate, false );
    domElement.removeEventListener( 'mousemove', onDocumentMouseMoveToPan, false );
    domElement.removeEventListener( 'mouseup', onMouseUp, false );
    domElement.removeEventListener( 'mouseout', onMouseOut, false );
    domElement.removeEventListener( 'mouseenter', onMouseEnter);
}

function rotateAroundObjectAxis(object, axis, radians) {
    var rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationAxis(axis.normalize(), radians);
    object.matrix.multiply(rotationMatrix);
    object.rotation.setFromRotationMatrix( object.matrix );

}




