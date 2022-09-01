import css from "../css/main.css";
console.debug(`Using Three.js revision ${THREE.REVISION}`);
// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import ImmersiveControls from '@depasquale/three-immersive-controls';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Lut } from 'three/examples/jsm/math/Lut.js';
// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

import * as PHYSICS from './physics.js';
import * as CONTROLLERS from './controllers.js';

import manifest from '../manifest.webmanifest';
import beach from '../resources/beach-1.jpeg';

// import * as VRGUI from './datguivr/datguivr.min.js';
// import * as VRGUI from './guivr.js';

let group = new THREE.Group();
let beam;
let left_support, right_support;
let load_position_gui;
let font;
export let BMD, SFD, box;

let urlParams = new URLSearchParams(window.location.search);

export let params = {
    length: 20, // beam length (m)
    depth: 0.2,
    height: 1.5,
    left: 'Pin',
    right: 'Pin',
    applied_load: 0,
    load_position: 10,
    youngs_modulus: 215,
    colour_by: 'Bending Moment',
    np: 100, // number of points along beam
    displacement_control: true,
    displacement: new THREE.Vector3(0, 0.25, 0),
}

// let VR = false;
// if ( urlParams.has('VR') || urlParams.has('vr') ) {
// VR = true;
// }

// let beam_offset = new THREE.Vector3(0,1,-0.4);
let beam_offset = new THREE.Vector3(0, 0, 0);

let lut;
let rainbow = new Lut("rainbow", 512); // options are rainbow, cooltowarm and blackbody
let cooltowarm = new Lut("cooltowarm", 512); // options are rainbow, cooltowarm and blackbody

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);
const background_geometry = new THREE.SphereGeometry(500, 60, 40);
// // invert the geometry on the x-axis so that all of the faces point inward
background_geometry.scale(- 1, 1, 1);

const background_texture = new THREE.TextureLoader().load(beach);
const background_material = new THREE.MeshBasicMaterial({ map: background_texture });

const background = new THREE.Mesh(background_geometry, background_material);

scene.add(background);

// const gridHelper = new THREE.GridHelper(100, 100);
// scene.add(gridHelper);


const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

scene.add(group);

export const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild( renderer.domElement );
const container = document.createElement('container');
container.id = 'container';
document.body.appendChild(container);
container.appendChild(renderer.domElement);
const style = document.createElement('style');
style.innerHTML = `
html, body {
    background-color: #000;
    margin: 0;
    height: 100%;
    overscroll-behavior: none;
    touch-action: none;
    overflow: hidden;
}`;
document.head.appendChild(style);
// if ( VR ) {
// document.body.appendChild( VRButton.createButton( renderer ) );
renderer.xr.enabled = true;
// let use_hands;
// if ( urlParams.has('use_hands') ) { use_hands = true; }
// else { use_hands = false; }
// CONTROLLERS.add_controllers(renderer, scene, use_hands);
// params.displacement_control = true;
// }

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);


const light = new THREE.AmbientLight(0xAAAAAA);
scene.add(light);

const light2 = new THREE.PointLight(0xAAAAAA);
light2.position.set(10, 5, 10);
scene.add(light2);

let pin_radius;
let gui;

// const tt = (o, c) => {
//     console.log(o)
// }

export const controls = new ImmersiveControls(camera, renderer, scene, {
    initialPosition: new THREE.Vector3(0, 1.6, 8)
});
// controls.interaction.intersectionHandlers['beam'] = tt;

// console.log(controls)
// if ( VR ) {
pin_radius = 1;
// VRGUI.create('Parameters').then((gui) => {
//     scene.add( gui );

//     VRGUI.add_button('test')
// } );
// add_gui();
// gui.position.x = 2;
// gui.position.z = -2;
// gui.rotation.y = -Math.PI/2.;
// gui.position.y = 2;


// set up interactions with the beam
// controls.interaction.intersectionHandlers[type] = CONTROLLERS.handleIntersection;
// }
// else {

// pin_radius = Math.min(params.height,params.depth)/2.;

gui = new GUI();


gui.add(params, 'length', 1, 100, 0.1)
    .name('Beam length (m)').onChange(update_beam_size);
gui.add(params, 'height', 0.1, 1, 0.01)
    .name('Beam height (m)').onChange(update_beam_size);
gui.add(params, 'depth', 0.1, 1, 0.01)
    .name('Beam depth (m)').onChange(update_beam_size);
if (params.displacement_control) {
    gui.add(params.displacement, 'y', 0, 0.5)
        .name('Applied displacement (m)').onChange(redraw_beam);
} else {
    gui.add(params, 'applied_load', 0, 1000)
        .name('Applied load (kN)').onChange(redraw_beam);
}
load_position_gui = gui.add(params, 'load_position', 0, params.length)
    .name('Load position (m)').onChange(redraw_beam).listen();
if (!params.displacement_control) {
    gui.add(params, 'youngs_modulus', 10, 1000, 1)
        .name('Youngs Modulus (GPa)').onChange(redraw_beam);
}
gui.add(params, 'left', ['Free', 'Pin', 'Fixed'])
    .name('Left Support').onChange(redraw_supports).listen();
gui.add(params, 'right', ['Free', 'Pin', 'Fixed'])
    .name('Right Support').onChange(redraw_supports).listen();
gui.add(params, 'colour_by', ['None', 'Shear Force', 'Bending Moment'])
    .name('Colour by').onChange(redraw_beam);
// }

export function make_new_beam() {
    make_square_beam();
}

export function update_beam_size() {
    beam.scale.set(params.length, params.height, params.depth);
    redraw_supports();
}

make_new_beam();

function make_square_beam() {
    if (beam !== undefined) {
        group.remove(beam)
    }
    // load_position_gui.max(params.length);
    if (params.load_position > params.length) {
        params.load_position = params.length;
    }

    let geometry = new THREE.BoxGeometry(1, 1, 1, params.np, 1, 1);
    let beam_material = new THREE.MeshStandardMaterial({ color: 0xcccccc, vertexColors: true });

    // beam_material.wireframe = true;

    beam = new THREE.Mesh(geometry, beam_material);
    beam.scale.set(params.length, params.height, params.depth);
    beam.position.add(beam_offset); // move the beam away from the start location

    const type = 'beam';
    beam.userData.type = type; // this sets up interaction group for controllers
    // if ( VR ) {
    controls.interaction.selectStartHandlers[type] = CONTROLLERS.handleBeamSelectStart;
    controls.interaction.selectEndHandlers[type] = CONTROLLERS.handleBeamSelectEnd;
    controls.interaction.intersectionHandlers[type] = CONTROLLERS.handleBeamIntersection;
    controls.interaction.selectableObjects.push(beam);
    // }

    group.add(beam);
    group.position.y = 2 * pin_radius + params.height / 2.;
    // scene.add( beam );
    PHYSICS.set_initial_position(beam.geometry.attributes.position.array);

    camera.position.y = params.length / 8;
    camera.position.z = params.length / 2.5;

    redraw_supports();
    redraw_beam();
}

function add_color_changer() {
    let loader = new FontLoader();

    // loader.load( 'fonts/helvetiker_regular.typeface.json', function ( f ) {
    loader.load('https://unpkg.com/three@0.143.0/examples/fonts/helvetiker_regular.typeface.json', function (f) {

        font = f;

        let geometry = new THREE.BoxGeometry(2, 1, 0.1);
        let material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        box = new THREE.Mesh(geometry, material);

        let text_geometry_BMD = new TextGeometry('BMD', {
            font: font,
            size: 0.5,
            height: 0.2,
            curveSegments: 120,
            bevelEnabled: false,
            // bevelThickness: 0.001,
            // bevelSize: 8,
            // bevelOffset: 0,
            // bevelSegments: 5
        });
        let text_material = new THREE.MeshStandardMaterial({ color: 0x222222 });
        BMD = new THREE.Mesh(text_geometry_BMD, text_material);
        BMD.position.set(-0.7, -0.2, 0);

        let text_geometry_SFD = new TextGeometry('SFD', {
            font: font,
            size: 0.5,
            height: 0.2,
            curveSegments: 120,
            bevelEnabled: false,
            // bevelThickness: 0.001,
            // bevelSize: 8,
            // bevelOffset: 0,
            // bevelSegments: 5
        });
        SFD = new THREE.Mesh(text_geometry_SFD, text_material);
        SFD.position.set(-0.7, -0.2, 0);


        box.add(BMD);

        box.position.set(-5, 0.5, 5)
        box.rotateY(Math.PI / 4.);

        scene.add(box)

        const type = 'colors';
        box.userData.type = type; // this sets up interaction group for controllers
        SFD.userData.type = type; // this sets up interaction group for controllers
        BMD.userData.type = type; // this sets up interaction group for controllers
        // if ( VR ) {
        controls.interaction.selectStartHandlers[type] = CONTROLLERS.handleColorSelectStart;
        controls.interaction.selectEndHandlers[type] = CONTROLLERS.handleColorSelectEnd;
        controls.interaction.selectableObjects.push(box);
        controls.interaction.selectableObjects.push(SFD);
        controls.interaction.selectableObjects.push(BMD);
    });

}

add_color_changer();

export function redraw_supports() {
    // gridHelper.position.y = -2*pin_radius-params.height/2.;
    let pin_geometry = new THREE.CylinderGeometry(pin_radius, pin_radius, params.depth + 2 * pin_radius, 20, 32);
    let fixed_geometry = new THREE.BoxGeometry(pin_radius, params.height + 2 * pin_radius, params.depth + 2 * pin_radius);
    let left_geometry, right_geometry;
    let support_material = new THREE.MeshStandardMaterial({ color: 0xcccccc, vertexColors: false });

    if (left_support !== undefined) {
        group.remove(left_support)
    }
    if (right_support !== undefined) {
        group.remove(right_support)
    }
    if (params.left === 'Pin') {
        left_geometry = pin_geometry;
        left_support = new THREE.Mesh(left_geometry, support_material);

        left_support.position.set(-params.length / 2., -params.height / 2 - pin_radius, 0);
        left_support.position.add(beam_offset);
        left_support.rotation.x = Math.PI / 2.;
        group.add(left_support);
    }
    else if (params.left === 'Fixed') {
        left_geometry = fixed_geometry;
        left_support = new THREE.Mesh(left_geometry, support_material);

        left_support.position.set(-params.length / 2. - pin_radius / 2., 0, 0);
        left_support.position.add(beam_offset);
        group.add(left_support);
    }

    left_support.name = 'Left support'
    left_support.userData.type = 'left_support'; // this sets up interaction group for controllers
    controls.interaction.selectStartHandlers['left_support'] = CONTROLLERS.handleLeftSupportSelectStart;
    controls.interaction.selectEndHandlers['left_support'] = CONTROLLERS.handleSupportSelectEnd;
    controls.interaction.selectableObjects.push(left_support);


    if (params.right === 'Pin') {
        right_geometry = pin_geometry;
        right_support = new THREE.Mesh(right_geometry, support_material.clone());

        right_support.position.set(params.length / 2., -params.height / 2 - pin_radius, 0);
        right_support.position.add(beam_offset);
        right_support.rotation.x = Math.PI / 2.;

        group.add(right_support);
    }
    else if (params.right === 'Fixed') {
        right_geometry = fixed_geometry;
        right_support = new THREE.Mesh(right_geometry, support_material);

        right_support.position.set(params.length / 2. + pin_radius / 2., 0, 0);
        right_support.position.add(beam_offset);
        group.add(right_support);
    }

    right_support.name = 'Right support'
    right_support.userData.type = 'right_support'; // this sets up interaction group for controllers
    controls.interaction.selectStartHandlers['right_support'] = CONTROLLERS.handleRightSupportSelectStart;
    controls.interaction.selectEndHandlers['right_support'] = CONTROLLERS.handleSupportSelectEnd;
    controls.interaction.selectableObjects.push(right_support);
    redraw_beam();

}

export function redraw_beam() {
    PHYSICS.updateDeformation(params);
    beam.geometry.setAttribute('position', new THREE.BufferAttribute(PHYSICS.positions, 3));
    beam.geometry.attributes.position.needsUpdate = true;

    if (params.colour_by === 'None') {
        let colors = [];
        for (let i = 0; i < PHYSICS.shear_force.length; i++) {
            colors.push(1, 1, 1);
        }
        // console.log(colors)
        beam.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        beam.geometry.attributes.color.needsUpdate = true;
        beam.material.needsUpdate = true;
    } else {
        let arr, max_val;
        if (params.colour_by === 'Bending Moment') {
            arr = PHYSICS.bending_moment;
            lut = cooltowarm;
            max_val = PHYSICS.M_max;
        }
        else if (params.colour_by === 'Shear Force') {
            arr = PHYSICS.shear_force;
            lut = cooltowarm;
            max_val = PHYSICS.SF_max;
        }
        const colors = [];

        // console.log(max_val)
        if (max_val > 0) {
            lut.setMin(-max_val);
            lut.setMax(max_val);
            // console.log(max_val)
            for (let i = 0; i < arr.length; i++) {
                const colorValue = arr[i];
                const color = lut.getColor(colorValue);
                colors.push(color.r, color.g, color.b);
            }
            // colors.needsUpdate = true;
            // console.log(colors)
        } else {
            for (let i = 0; i < arr.length; i++) {
                colors.push(0, 0, 0);
            }
        }
        beam.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        beam.geometry.attributes.color.needsUpdate = true;
        beam.material.needsUpdate = true;

    }


}
// console.log(controls)
function animate() {
    // console.debug(controls.interaction)
    // console.debug(renderer.xr)
    // if ( renderer.xr.isPresenting ) {
    renderer.setAnimationLoop(function () {
        controls.update();
        // params = CONTROLLERS.handleCollisions( params, group );
        // if ( params.applied_load !== 0 ) { console.log('redrawing...'); redraw_beam() }
        redraw_beam();
        // console.log(params.load_position, params.applied_load);
        renderer.render(scene, camera);
    });
    // } else {
    // controls.update();
    // requestAnimationFrame( animate );
    // renderer.render( scene, camera );
    // }

};

animate();
