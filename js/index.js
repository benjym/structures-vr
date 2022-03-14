import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const light = new THREE.AmbientLight( 0xAAAAAA );
scene.add(light);

const light2 = new THREE.PointLight( 0xAAAAAA );
light2.position.set( 10, 5, 10);
scene.add(light2);


const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );


const L = 10; // beam length (m)
var config = {
    'left' : 'pin',
    'right' : 'pin'
}


const beam = new THREE.Mesh( geometry, material );
beam.scale.set( L, 1, 1);
scene.add( beam );

camera.position.y = L/8;
camera.position.z = L/2;

const controls = new OrbitControls( camera, renderer.domElement );


function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
};

animate();
