import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

let panel;
let panel_depth = 0.1;
let panel_row_height = 0.1;
let panel_row_offset = panel_row_height/2;
let panel_width = 1;
let panel_color = new THREE.Color(0x00ff00);
let button_color = new THREE.Color(0xFF0000);
let text_color = new THREE.Color(0xFFFFFF);

const loader = new FontLoader();
let font;


export async function create(title) {
    loader.load( './fonts/helvetiker_regular.typeface.json', function ( f ) {
        font = f; console.log(font)
    } );
    
    panel = new THREE.Group();

    const geometry = new THREE.BoxGeometry( 1, 1, panel_depth );
    const material = new THREE.MeshBasicMaterial( {color: panel_color} );
    let backing = new THREE.Mesh( geometry, material );

    panel.add(backing);
    panel.width = panel_width;
    panel.height = panel_row_height;

    return panel
}

export function add_button(label) {
    const geometry = new THREE.BoxGeometry( 0.9, panel_row_height, panel_depth );
    const material = new THREE.MeshBasicMaterial( {color: button_color} );
    let obj = new THREE.Mesh( geometry, material );
    panel.add(obj);

    obj.position.y = panel_row_offset;
    obj.position.z = 0.01;

    const title_geometry = new TextGeometry( "Label", {
		font: font,
		size: 100,
		height: 0.5*panel_row_height,
		// curveSegments: 12,
		// bevelEnabled: true,
		// bevelThickness: 10,
		// bevelSize: 8,
		// bevelOffset: 0,
		// bevelSegments: 5
	} );
    console.log(title_geometry)
    const text_material = new THREE.MeshStandardMaterial( {color: text_color} );
    const title = new THREE.Mesh( title_geometry, text_material );

    panel.add(title);
    title.position.z = 0.01;
    title.position.y = panel.height;

    panel.height += panel_row_height + panel_row_offset;
    panel.children[0].scale.y = panel.height;

}

export function onclick() {

}
