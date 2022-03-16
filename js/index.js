import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Lut } from 'three/examples/jsm/math/Lut.js';

let beam, initial_positions;
let left_support, right_support;
let load_position_gui;
let EI;

let params = {
    length : 10, // beam length (m)
    depth : 0.2,
    height : 0.2,
    left : 'pin',
    right : 'pin',
    applied_load : 0,
    load_position: 5,
    youngs_modulus : 215,
    colour_by : 'None',
    np : 100, // number of points along beam
}

let lut;
let rainbow = new Lut("rainbow", 512); // options are rainbow, cooltowarm and blackbody
let cooltowarm = new Lut("rainbow", 512); // options are rainbow, cooltowarm and blackbody
// lut.setMin(0);
// lut.setMax(100);

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
        scene.remove(beam)
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
    scene.add( beam );
    initial_positions = beam.geometry.attributes.position.array.map((x)=> x);

    camera.position.y = params.length/8;
    camera.position.z = params.length/1.5;

    let pin_radius = Math.min(params.height,params.depth)/2.;
    if ( params.left === 'pin' ) {
        if ( left_support !== undefined ) {
            scene.remove(left_support)
        }
        let geometry = new THREE.CylinderGeometry(pin_radius,pin_radius,params.depth,20,32);
        left_support = new THREE.Mesh( geometry, material );
        left_support.position.set(-params.length/2.,-params.height/2-pin_radius,0);
        left_support.rotation.x = Math.PI/2.;
        scene.add( left_support );
    }
    if ( params.right === 'pin' ) {
        if ( right_support !== undefined ) {
            scene.remove(right_support)
        }
        let geometry = new THREE.CylinderGeometry(pin_radius,pin_radius,params.depth,20,32);
        right_support = new THREE.Mesh( geometry, material );
        right_support.position.set(params.length/2.,-params.height/2-pin_radius,0);
        right_support.rotation.x = Math.PI/2.;
        scene.add( right_support );
    }

    redraw_beam();
}

function redraw_beam() {
    EI = params.youngs_modulus * 1e9 * params.depth * Math.pow(params.height, 3) / 12; // convert from GPa to Pa

    // stolen from https://www.linsgroup.com/MECHANICAL_DESIGN/Beam/beam_formula.htm
    const positions = beam.geometry.attributes.position.array;
    let deflection;
    let bending_moment = [];
    let shear_force = [];
    let a = params.load_position; // distance from left to load point
    let b = params.length - a; // distance from right to load point
    let P = params.applied_load * 1e3; // applied load in N
    // console.log(a,b,params.length);
    for ( let i = 0, l = positions.length/3; i < l; i ++ ) {
    let x = positions[i*3 + 0] + params.length/2; // distance along beam
    // console.log(x)
    if ( x < a ) {
        deflection = P * b * x * (params.length*params.length - b*b - x*x )/(6*EI*params.length);
        bending_moment.push(P * b * x / params.length);
        shear_force.push(P * b / l);
    } else {
        deflection = P * a * (params.length - x) * (2*params.length*x - x*x - a*a )/(6*EI*params.length);
        bending_moment.push(P * a / params.length * ( params.length - x));
        shear_force.push(-P * a / l);
    }

      positions[ i*3+1 ] = initial_positions[i*3+1] - deflection;

    }
    beam.geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    beam.geometry.attributes.position.needsUpdate = true;

    if ( params.colour_by === 'None' ) {
        let colors = [];
        for ( let i = 0; i < shear_force.length; i ++ ) {
        	colors.push(1,1,1);
        }
        // console.log(colors)
        beam.geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        beam.geometry.attributes.color.needsUpdate = true;
        beam.material.needsUpdate = true;
    } else {
        let arr;
        if ( params.colour_by === 'Bending Moment' ) { arr = bending_moment; lut = rainbow; }
        else if ( params.colour_by === 'Shear Force') { arr = shear_force; lut = cooltowarm; }
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
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
};

animate();
