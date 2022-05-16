import css from "../css/main.css";

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Lut } from 'three/examples/jsm/math/Lut.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

import * as PHYSICS from './physics.js';
import * as CONTROLLERS from './controllers.js';

let group = new THREE.Group();
let beam;
let left_support, right_support;
let load_position_gui;

let urlParams = new URLSearchParams(window.location.search);

let params = {
    length : 5, // beam length (m)
    depth : 0.2,
    height : 1,
    left : 'pin',
    right : 'pin',
    applied_load : 0,
    load_position: 5,
    youngs_modulus : 215,
    colour_by : 'Bending Moment',
    np : 100, // number of points along beam
    displacement_control : false,
    displacement: 0
}

let beam_z_offset = -0.5;

let lut;
let rainbow = new Lut("rainbow", 512); // options are rainbow, cooltowarm and blackbody
let cooltowarm = new Lut("cooltowarm", 512); // options are rainbow, cooltowarm and blackbody
// lut.setMin(0);
// lut.setMax(100);

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x333333 );

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

scene.add( group );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
if ( urlParams.has('VR') ) {
    document.body.appendChild( VRButton.createButton( renderer ) );
    renderer.xr.enabled = true;
    CONTROLLERS.add_controllers(renderer, scene);
    params.displacement_control = true;
}

const gridHelper = new THREE.GridHelper( 100, 100 );
scene.add( gridHelper );

const light = new THREE.AmbientLight( 0xAAAAAA );
scene.add(light);

const light2 = new THREE.PointLight( 0xAAAAAA );
light2.position.set( 10, 5, 10);
scene.add(light2);

const controls = new OrbitControls( camera, renderer.domElement );

let gui = new GUI();

gui.add( params, 'length', 1, 100, 0.1 )
    .name( 'Beam length (m)' ).onChange( make_new_beam );
gui.add( params, 'height', 0.1, 1, 0.01 )
    .name( 'Beam height (m)' ).onChange( make_new_beam );
gui.add( params, 'depth', 0.1, 1, 0.01 )
    .name( 'Beam depth (m)' ).onChange( make_new_beam );
gui.add( params, 'applied_load', 0, 100 )
    .name( 'Applied load (kN)' ).onChange( redraw_beam );
load_position_gui = gui.add( params, 'load_position', 0, params.length )
    .name( 'Load position (m)' ).onChange( redraw_beam ).listen();
gui.add( params, 'youngs_modulus', 10, 1000, 1 )
    .name( 'Youngs Modulus (GPa)' ).onChange( redraw_beam );
gui.add( params, 'colour_by', ['None','Shear Force','Bending Moment'] )
    .name( 'Colour by' ).onChange( redraw_beam );

make_new_beam();

function make_new_beam() {
    if ( beam !== undefined ) {
        group.remove(beam)
    }
    load_position_gui.max(params.length);
    if ( params.load_position > params.length ) {
        params.load_position = params.length;
    }

    let geometry = new THREE.BoxGeometry(params.length,params.height,params.depth,params.np, 1, 1);
    let beam_material = new THREE.MeshStandardMaterial( { color: 0xcccccc, vertexColors: true } );
    let material = new THREE.MeshStandardMaterial( { color: 0xcccccc, vertexColors: false } );
    // material.wireframe = true;

    beam = new THREE.Mesh( geometry, beam_material );
    beam.position.z = beam_z_offset; // move the beam away from the start location
    group.add ( beam );
    // scene.add( beam );
    PHYSICS.set_initial_position(beam.geometry.attributes.position.array);

    camera.position.y = params.length/8;
    camera.position.z = params.length/1.5;

    let pin_radius;

    if  ( urlParams.has('VR') ) {
        pin_radius = 0.5;
    }
    else {
        pin_radius = Math.min(params.height,params.depth)/2.;
    }

    if ( params.left === 'pin' ) {
        if ( left_support !== undefined ) {
            scene.remove(left_support)
        }
        let geometry = new THREE.CylinderGeometry(pin_radius,pin_radius,params.depth,20,32);
        left_support = new THREE.Mesh( geometry, material );
        left_support.position.set(-params.length/2.,-params.height/2-pin_radius,beam_z_offset);
        left_support.rotation.x = Math.PI/2.;
        scene.add( left_support );
    }
    if ( params.right === 'pin' ) {
        if ( right_support !== undefined ) {
            scene.remove(right_support)
        }
        let geometry = new THREE.CylinderGeometry(pin_radius,pin_radius,params.depth,20,32);
        right_support = new THREE.Mesh( geometry, material );
        right_support.position.set(params.length/2.,-params.height/2-pin_radius,beam_z_offset);
        right_support.rotation.x = Math.PI/2.;
        scene.add( right_support );
    }

    gridHelper.position.y = -2*pin_radius-params.height/2.;
    redraw_beam();
}

function redraw_beam() {
    PHYSICS.updateDeformation(params);
    beam.geometry.setAttribute( 'position', new THREE.BufferAttribute( PHYSICS.positions, 3 ) );
    beam.geometry.attributes.position.needsUpdate = true;

    if ( params.colour_by === 'None' ) {
        let colors = [];
        for ( let i = 0; i < PHYSICS.shear_force.length; i ++ ) {
        	colors.push(1,1,1);
        }
        // console.log(colors)
        beam.geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        beam.geometry.attributes.color.needsUpdate = true;
        beam.material.needsUpdate = true;
    } else {
        let arr;
        if ( params.colour_by === 'Bending Moment' ) { arr = PHYSICS.bending_moment; lut = rainbow; }
        else if ( params.colour_by === 'Shear Force') { arr = PHYSICS.shear_force; lut = cooltowarm; }
        let min_val = Math.min(...arr);
        let max_val = Math.max(...arr);
        if ( max_val > min_val ) {
            lut.setMin(min_val);
            lut.setMax(max_val);
            // console.log(arr)
            const colors = [];
            for ( let i = 0; i < arr.length; i ++ ) {
            	const colorValue = arr[ i ];
            	const color = lut.getColor( colorValue );
            	colors.push(color.r, color.g, color.b);
            }
            // colors.needsUpdate = true;
            // console.log(colors)
            beam.geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
            beam.geometry.attributes.color.needsUpdate = true;
            beam.material.needsUpdate = true;
        }
    }


}

function animate() {
    if ( urlParams.has('VR') ) {
        renderer.setAnimationLoop( function () {
            params = CONTROLLERS.handleCollisions( params, group );
            // if ( params.applied_load !== 0 ) { console.log('redrawing...'); redraw_beam() }
            redraw_beam();
            console.log(params.load_position, params.applied_load);
            renderer.render( scene, camera );
        } );
    } else {
        requestAnimationFrame( animate );
    	renderer.render( scene, camera );
    }

};

animate();
