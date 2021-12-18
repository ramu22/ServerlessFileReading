import { controlObjectWithMouse } from "./mouseRotations.js"
import { processMapFile } from './processMapFile.js'
import * as THREE from './three.module.js'
//import * as THREE from "../node_modules/three/build/three.module.js"
import Stats from './stats.module.js'


let root 			// The root Group for the model.  Mouse rotations rotate this

// The main renderer to the canvas
let renderer	
let scene
let camera

// Texture for color lookup
let bufferTexture
let bufferScene
let bufferCamera
let bufferMaterial

// Auxillary information
let HUD
let stats
let debugX = document.querySelector("#x")
let debugY = document.querySelector("#y")
let debugZ = document.querySelector("#z")

async function main() {
	
	// Hooks to document
	window.addEventListener('resize', sizeToDisplaySize, false);
	let canvas = document.getElementById('container');

	scene = new THREE.Scene()
	renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: false});
	camera = new THREE.OrthographicCamera(-1, 1, 1, -1)
	camera.position.y = -100
	camera.rotateX(Math.PI/2.0)
	const light = new THREE.DirectionalLight(0xffffff, 0.8);
	const light2 = new THREE.AmbientLight(0xffffff, 0.2);
	camera.add(light)
	camera.add(light2)
	scene.add( camera )

	// Create our root node and control with mouse
	root = new THREE.Group()
	scene.add( root )
	controlObjectWithMouse(root, renderer.domElement)

	// Statistics
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	document.getElementById("stats").appendChild(stats.domElement)

	await makeBufferTexture()

	// Color scale display
	const geometry = new THREE.PlaneGeometry(.15,.15)
	const material = new THREE.MeshBasicMaterial()
	HUD = new THREE.Mesh(geometry,material)
	HUD.material.map = bufferTexture.texture
	camera.add(HUD)

	// mouse information on screen
	document.addEventListener('mousemove', findIntersections, false);

	setupGUI()
	setupFiles()
}

async function makeBufferTexture() {
	// Buffer Texture
	bufferTexture = new THREE.WebGLRenderTarget(1024,1024)
	bufferScene = new THREE.Scene()
	bufferCamera = new THREE.OrthographicCamera(-1, 1, 1, -1)
	const bufferMaterialUniforms = {
		blocks: { value: guiParams.boxes },
		offset: { value: 0.0 }
	}
	const textureShader = await fetch('../shaders/lutRainbowFragment.glsl').then(response => response.text())
	const textureVertexShader = await fetch('../shaders/lutVertex.glsl').then(response => response.text())
	bufferMaterial = new THREE.ShaderMaterial( {
		uniforms: bufferMaterialUniforms,
		fragmentShader: textureShader,
		vertexShader: textureVertexShader
	})
	const plane = new THREE.PlaneBufferGeometry(2,2)
	const planeObject = new THREE.Mesh(plane, bufferMaterial)
	planeObject.position.z = -1
	bufferScene.add(planeObject)
}

function setupFiles() { 
	let fileMenu = document.getElementById('file-select');
	fileMenu.files = [
		{value: '../assets/study_dwsG701994_2021_09_29_08_57_06/2021_09_29_16_44_55/DxLandmarkGeo.xml', display: 'Default Map'},
		{value: '../assets/difmultiple.xml', display: 'Whole heart'},
		{value: '../assets/dif001.xml', display: 'LA'},
		{value: '../assets/DxLandmarkGeo.xml', display: 'Map'},
		{value: 'separator', display: '--------------------'},
		{value: 'pickSingleFile', display: 'Pick a Single File'},
		{value: 'pickLocalFolder', display: 'Upload a Folder'}
	]

	let opt = document.createElement('option')
	for (let i=0; i < fileMenu.files.length; i++) {
		opt = document.createElement('option')
		opt.value = fileMenu.files[i].value
		if (opt.value == 'separator') opt.disabled = 'disabled'
		opt.innerHTML = fileMenu.files[i].display
		fileMenu.appendChild(opt)
	}

	fileMenu.onchange = fileMenuChanged
	loadAssetFile(fileMenu.files[0].value)		// default
}
function fileMenuChanged(event) {
	switch (event.target.value) {
		case "pickSingleFile":
			setTimeout(function () {
				pickLocalFile()
			}, 3000);
			break;
		case "pickLocalFolder":
			setTimeout(function () {
				pickLocalFolder()
			}, 3000);

			break;
		default:
			loadAssetFile(event.target.value)
	}
	console.log(event)
}

let dropdown;
let fileSelector;
const guiParams = {
	rotationspeed: 3,
	rotate: false,
	playspeed: 30,
	play: false,
	boxes: 8, 
	rainbow: true,
	propagation: false,
	showBoundingBox: false,
	click:function(){ updateDropdown(dropdown , ['A', 'B', 'C', 'D']) },
	pickLocalFile: pickLocalFile,
	pickFolder: pickLocalFolder
}

function setupGUI() {
	const gui = new dat.GUI({autoplace:true})
	gui.domElement.id = 'gui' 

	let folder = gui.addFolder('Rotation, etc')
	folder.add(guiParams, 'rotationspeed', 1, 50).onChange( () => {
		controls.autoRotateSpeed = guiParams.rotationspeed
	})
	folder.add(guiParams, 'rotate').onChange( () => {
		controls.autoRotate = guiParams.rotate
	})

	folder = gui.addFolder('Files')
	folder.add(guiParams, 'pickLocalFile')
	folder.add(guiParams, 'pickFolder')

	folder = gui.addFolder('Animation')
	folder.add(guiParams, 'playspeed', 1, 200)
	folder.add(guiParams, 'play').onChange( () => {
		bufferMaterial.uniforms.offset.value = 0.0
	})
	folder.add(guiParams, 'boxes', 2, 256).onChange( () => {
		bufferMaterial.uniforms.blocks.value = guiParams.boxes
	})
	folder.add(guiParams, 'rainbow').onChange( async () => {
		if (guiParams.rainbow) {
			let newShader = await fetch('../shaders/lutRainbowFragment.glsl').then(response => response.text())
			bufferMaterial.fragmentShader = newShader
			bufferMaterial.needsUpdate = true
			console.log(newShader)
		} else {
			let newShader = await fetch('../shaders/lutPropagationFragment.glsl').then(response => response.text())
			bufferMaterial.fragmentShader = newShader
			bufferMaterial.needsUpdate = true
			console.log(newShader)
		}
	})	
	folder.open()
}

function loadAssetFile(file) {
	fetch(file)
	.then(response => response.text())
	.then(data => processMapFile(data))
	.then(geometry => showModel(geometry))
	.then( () => animate() )	
}

function pickLocalFile() {
	fileSelector = document.createElement('input');
	fileSelector.setAttribute('type', 'file');
	fileSelector.onchange = loadLocalFile;
	fileSelector.click()
	console.log("tried to pick file")
}
function loadLocalFile(event) {
	console.log(event.target.files)

	var file = this.files[0];
	var reader = new FileReader();
	reader.onload = async function(progressEvent) {
		const geometry = await processMapFile(this.result);
		if (geometry) {
			showModel(geometry); 
		}
		animate()
	};
	reader.readAsText(file);
}

function pickLocalFolder() {
	fileSelector = document.createElement('input');
	fileSelector.setAttribute('type', 'file');
	fileSelector.setAttribute('webkitdirectory','')
	fileSelector.setAttribute('multiple', '')
	fileSelector.onchange = loadFolder;
	fileSelector.click()
	console.log("tried to pick folder")
}
function loadFolder(event) {
	var files = event.target.files;
	if (files.length > 100) {
		console.log(files.length)
		return
	}
	for (var i=0; i<files.length; i++) {
		console.log(files[i])
	}
}

function updateDropdown(target, list){   
    let innerHTMLStr = "";
    for(var i=0; i<list.length; i++){
        var str = "<option value='" + list[i] + "'>" + list[i] + "</option>";
        innerHTMLStr += str;        
    }
    if (innerHTMLStr != "") target.domElement.children[0].innerHTML = innerHTMLStr;
}

function showModel(node) {
	root.clear()

	// Scale the model to fit in a normalized box ( -1 to +1 in all axis)
	let helper = new THREE.BoxHelper(node, 0xff0000)
	helper.geometry.computeBoundingBox();
	const modelSize = helper.geometry.boundingBox.getSize(new THREE.Vector3())
	const targetScale = 1.6/Math.max(modelSize.x, modelSize.y, modelSize.z)
	node.scale.set(targetScale,targetScale,targetScale)

	// Center the model at origin (need to do after scaling)
	new THREE.Box3().setFromObject( node ).getCenter( node.position ).multiplyScalar( - 1 );

	// Give the model our buffer texture if it is a map
	if (node.children[0].material.uniforms) {
		node.children[0].material.uniforms.texture1.value = bufferTexture.texture
	}

	sizeToDisplaySize();
	root.add( node )
}

function sizeToDisplaySize() {
	const canvas = renderer.domElement;

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);  // False = don't resize the canvas

	//modelSize = helper.geometry.boundingBox.getSize(new THREE.Vector3())

	// For Projection camera
	//camera.aspect = canvas.clientWidth / canvas.clientHeight;

	// For Orthographic camera; -1.0 to +1.0 box, with extra as needed
	const aspect = canvas.clientWidth/canvas.clientHeight;
	const top = (aspect > 1) ? 1.0 : 1/aspect
	camera.top = top
	camera.bottom = -top
	camera.left = -top*aspect
	camera.right = top*aspect

	camera.updateProjectionMatrix();

	HUD.position.set(camera.right-0.15, camera.bottom+0.30, -10)		// bottom right
}

// mouse move and raycasing
const raycaster = new THREE.Raycaster();
function updateMousePosition(event) {
	return new THREE.Vector3(
	  (event.clientX - renderer.domElement.offsetLeft) / renderer.domElement.clientWidth * 2 - 1, 
	  (renderer.domElement.offsetTop - event.clientY) / renderer.domElement.clientHeight * 2 + 1,  0
	);
}
function findIntersections(e) {
	var mouseposition = updateMousePosition(e);
	//console.log(mouseposition)
	raycaster.setFromCamera(mouseposition, camera);
	const intersects = raycaster.intersectObjects(scene.children);
	if (intersects.length > 0) {
		const f = intersects[0].face
		const uv = intersects[0].uv
		debugX.textContent = uv ? uv.x : " "
		debugY.textContent = uv ? uv.y : " "
		debugZ.textContent = `${f.a},${f.b},${f.c}`
	}
}

const animate = function (time) {
	
	// First render our texture buffer.  Maybe only need to do if animated?
	renderer.setRenderTarget(bufferTexture)
	renderer.render(bufferScene,bufferCamera)

	// Now render the canvas
	renderer.setRenderTarget(null);			// this means the screen
	renderer.render( scene, camera );

	// controls.update()
	stats.update();
	const frameNum = requestAnimationFrame( animate );

	// make the animated texture if this is a material with a shader
	if (guiParams.play) {
		bufferMaterial.uniforms.offset.value = -(guiParams.playspeed * frameNum)/6000.0;
		bufferMaterial.uniforms.blocks.value = guiParams.boxes
	}

};

main()

