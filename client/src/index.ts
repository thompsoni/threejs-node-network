// three.js
import * as THREE from 'three';
import OrbitControls from 'orbit-controls-es6';
import $ from 'jquery-ts';
import * as Colyseus from 'colyseus.js';
import { MainController } from './controllers/main';
import { gameStateObj as gameState } from './classes/state';
import { BufferGeometryUtils } from './dependencies/utils/BufferGeometryUtils';
import { mapJsonToMapPacket, MapPacket } from './classes/map';
const Perlin = require('./functions/perlinNoise').Perlin;


export const mainCtrl = new MainController();

// CREATE TERRAIN MODEL
/*let terrainGeometry = new THREE.PlaneBufferGeometry( 10000, 10000, 256, 256 );
BufferGeometryUtils.computeTangents( terrainGeometry );

const material = new THREE.MeshBasicMaterial({
	color: 0xffffff,
	wireframe: true,
})

this.terrainMesh = new THREE.Mesh( terrainGeometry, material);
// this.terrainMesh.position.set( 0, - 125, 0 );
// this.terrainMesh.rotation.x = - Math.PI / 2;
// this.terrainMesh.visible = false;
let perlin = new Perlin();
let vertices = this.terrainMesh.geometry.attributes.position.array;
for (let i = 0; i <= vertices.length; i += 3) {

	let peak = 1;
	let smoothing = 1;
	vertices[i+2] = peak * perlin.noise(
		vertices[i]/smoothing, 
		vertices[i+1]/smoothing
	);
}
this.terrainMesh.geometry.attributes.position.needsUpdate = true;
this.terrainMesh.geometry.computeVertexNormals();

console.log('TERRAIN GENERATED', this.terrainMesh );
clientScene.add(this.terrainMesh);*/

// set size
/*renderer.setSize(window.innerWidth, window.innerHeight)

// add canvas to dom
document.body.appendChild(renderer.domElement)

// add axis to the scene
let axis = new THREE.AxesHelper(10)

scene.add(axis)

// add lights
let light = new THREE.DirectionalLight(0xffffff, 1.0)

light.position.set(100, 100, 100)

scene.add(light)

let light2 = new THREE.DirectionalLight(0xffffff, 1.0)

light2.position.set(-100, 100, -100)

scene.add(light2)

let material = new THREE.MeshBasicMaterial({
	color: 0xaaaaaa,
	wireframe: true
})

// create a box and add it to the scene
let box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)

scene.add(box)

box.position.x = 0.5
box.rotation.y = 0.5

camera.position.x = 5
camera.position.y = 5
camera.position.z = 5

camera.lookAt(scene.position)*/
let now, delta, then = Date.now();
let interval = 1000/60;

function animate(): void {

	requestAnimationFrame(animate);

	now = Date.now();
	delta = now - then;

    //update time dependent animations here at fixed fps
    if (delta > interval) {
		
		if ( gameState.screen === 0 ) {
			// LOGIN
			if ( !gameState.loginLoaded ) {
				$.get('./src/html/login.html', function(result) {
					$('#container').html(result);
					$('#playbtn').click(() => {
						mainCtrl.joinGame();
					});
				});
				console.log('ADDED LOGIN');
				gameState.loginLoaded = true;
			}
		} else if ( gameState.screen === 1 ) {
			// INGAME
			mainCtrl.logic();
		} else if ( gameState.screen === 2 ) {
			// REGISTER
		}

		then = now - (delta % interval);
	}

	mainCtrl.updateCamera();
	mainCtrl.render();
}

animate();
