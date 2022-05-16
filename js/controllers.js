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



    if ( use_hands ) {

        // controllers
		const controller1 = renderer.xr.getController( 0 );
		scene.add( controller1 );

		const controller2 = renderer.xr.getController( 1 );
		scene.add( controller2 );

		const controllerModelFactory = new XRControllerModelFactory();

		// Hand 1
		const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
		controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
		scene.add( controllerGrip1 );

        const handModelFactory = new XRHandModelFactory();

		const hand1 = renderer.xr.getHand( 0 );
		hand1.add( handModelFactory.createHandModel( hand1, 'mesh' ) );
		scene.add( hand1 );

		// Hand 2
		const controllerGrip2 = renderer.xr.getControllerGrip( 1 );
		controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
		scene.add( controllerGrip2 );

		const hand2 = renderer.xr.getHand( 1 );
		hand2.add( handModelFactory.createHandModel( hand2, 'mesh' ) );
		scene.add( hand2 );

        controllerGrip1.addEventListener( 'squeezestart', onSelectStart );
        controllerGrip1.addEventListener( 'squeezeend', onSelectEnd );

        controllerGrip2.addEventListener( 'squeezestart', onSelectStart );
        controllerGrip2.addEventListener( 'squeezeend', onSelectEnd );

    }
    else {
        controller1 = renderer.xr.getController( 0 );
        scene.add( controller1 );

        controller2 = renderer.xr.getController( 1 );
        scene.add( controller2 );

        const controllerModelFactory = new XRControllerModelFactory();

        controllerGrip1 = renderer.xr.getControllerGrip( 0 );
        controllerGrip1.addEventListener( 'connected', controllerConnected );
        controllerGrip1.addEventListener( 'disconnected', controllerDisconnected );
        controllerGrip1.addEventListener( 'selectstart', onSelectStart );
        controllerGrip1.addEventListener( 'selectend', onSelectEnd );
        controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
        scene.add( controllerGrip1 );

        controllerGrip2 = renderer.xr.getControllerGrip( 1 );
        controllerGrip2.addEventListener( 'connected', controllerConnected );
        controllerGrip2.addEventListener( 'disconnected', controllerDisconnected );
        controllerGrip2.addEventListener( 'selectstart', onSelectStart );
        controllerGrip2.addEventListener( 'selectend', onSelectEnd );
        controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
        scene.add( controllerGrip2 );

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
