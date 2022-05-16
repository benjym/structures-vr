import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

let controller1, controller2;
let controllerGrip1, controllerGrip2;
let controllers = [];
const box = new THREE.Box3();

function onSelectStart(evt) {
    const index = controllers.findIndex( o => o.controller === evt.target );
    controllers[index].squeezing = true;
}

function onSelectEnd(evt) {
    const index = controllers.findIndex( o => o.controller === evt.target );
    controllers[index].squeezing = false;
}

export function add_controllers(renderer, scene, use_hands) {

    controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    controllerGrip1.addEventListener( 'connected', controllerConnected );
    controllerGrip1.addEventListener( 'disconnected', controllerDisconnected );
    scene.add( controllerGrip1 );

    controllerGrip2 = renderer.xr.getControllerGrip( 1 );
    controllerGrip2.addEventListener( 'connected', controllerConnected );
    controllerGrip2.addEventListener( 'disconnected', controllerDisconnected );
    scene.add( controllerGrip2 );

    if ( use_hands ) {
        const handModelFactory = new XRHandModelFactory();

        controller1 = renderer.xr.getHand( 0 );
        controllerGrip1.add ( handModelFactory.createHandModel( controller1, 'mesh' ) );
        controller1.addEventListener( 'squeezestart', onSelectStart );
        controller1.addEventListener( 'squeezeend', onSelectEnd );
        scene.add( controller1 );

        controller2 = renderer.xr.getHand( 1 );
        controllerGrip2.add ( handModelFactory.createHandModel( controller2, 'mesh' ) );
        controller2.addEventListener( 'squeezestart', onSelectStart );
        controller2.addEventListener( 'squeezeend', onSelectEnd );
        scene.add( controller2 );
    }
    else {
        const controllerModelFactory = new XRControllerModelFactory();

        controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
        controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );

        controller1 = renderer.xr.getController( 0 );
        controller1.addEventListener( 'selectstart', onSelectStart );
        controller1.addEventListener( 'selectend', onSelectEnd );
        scene.add( controller1 );

        controller2 = renderer.xr.getController( 1 );
        controller2.addEventListener( 'selectstart', onSelectStart );
        controller2.addEventListener( 'selectend', onSelectEnd );
        scene.add( controller2 );
    }




}

function controllerConnected( evt ) {

	controllers.push( {
		gamepad: evt.data.gamepad,
		grip: evt.target,
		colliding: false,
		playing: false,
        squeezing: false
	} );

}

function controllerDisconnected( evt ) {

	const index = controllers.findIndex( o => o.controller === evt.target );
	if ( index !== - 1 ) {

		controllers.splice( index, 1 );

	}

}

export function handleCollisions(params, group) {

	for ( let i = 0; i < group.children.length; i ++ ) {

		group.children[ i ].collided = false;

	}

	for ( let g = 0; g < controllers.length; g ++ ) {

		const controller = controllers[ g ];
		controller.colliding = false;

		const { grip, gamepad } = controller;
		const sphere = {
			radius: 0.03,
			center: grip.position
		};

		const supportHaptic = 'hapticActuators' in gamepad && gamepad.hapticActuators != null && gamepad.hapticActuators.length > 0;

		for ( let i = 0; i < group.children.length; i ++ ) {

			const child = group.children[ i ];
			box.setFromObject( child );
			if ( box.intersectsSphere( sphere ) ) {
                if ( controller.squeezing ) {
                    params.load_position = grip.position.x + params.length/2.;;
                    params.displacement = -grip.position.y;
                    // console.log(params.load_position, params.applied_load);

                    child.material.emissive.b = 1;
                    const intensity = child.userData.index / group.children.length;
                    // child.scale.setScalar( 1 + Math.random() * 0.1 * intensity );

                    if ( supportHaptic ) {

                        gamepad.hapticActuators[ 0 ].pulse( intensity, 100 );

                    }

                    // const musicInterval = musicScale[ child.userData.index % musicScale.length ] + 12 * Math.floor( child.userData.index / musicScale.length );
                    // oscillators[ g ].frequency.value = 110 * Math.pow( 2, musicInterval / 12 );
                    controller.colliding = true;
                    // group.children[ i ].collided = true;    
                }

			}

		}



		// if ( controller.colliding ) {
        //
		// 	if ( ! controller.playing ) {
        //
		// 		controller.playing = true;
		// 		oscillators[ g ].connect( audioCtx.destination );
        //
		// 	}
        //
		// } else {
        //
		// 	if ( controller.playing ) {
        //
		// 		controller.playing = false;
		// 		oscillators[ g ].disconnect( audioCtx.destination );
        //
		// 	}
        //
		// }

	}

	for ( let i = 0; i < group.children.length; i ++ ) {

		let child = group.children[ i ];
		if ( ! child.collided ) {

			// reset uncollided boxes
			child.material.emissive.b = 0;
			child.scale.setScalar( 1 );
            params.applied_load = 0;

		}

	}

    return params;

}
