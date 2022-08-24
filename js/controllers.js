// import * as THREE from 'three';
import * as PHYSICS from './physics.js';
import { params, redraw_supports, redraw_beam, controls, box, SFD, BMD, renderer } from './index.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

let controller1, controller2;
let controllerGrip1, controllerGrip2;
let controllers = [];
let squeeze = [0,0];
let grip_location = new THREE.Vector3();

// const box = new THREE.Box3();

export function add_controllers(renderer, scene, use_hands) {


    // if ( use_hands ) {

        // controllers
        console.log(renderer.xr)
		const controller1 = renderer.xr.getController( 0 );
        // const primaryInputSource = xrSession.inputSources.find((src) => src.handedness === user.handedness) ?? xrSession.inputSources[0]; // HOW TO MAKE A PARTICULAR HAND CONTROLLER 1 WITH FALLBACK TO JUST THE FIRST CONNECTED
        // console.log(controller1)
		scene.add( controller1 );

		const controller2 = renderer.xr.getController( 1 );
		scene.add( controller2 );

		const controllerModelFactory = new XRControllerModelFactory();

		// Hand 1
		const controllerGrip1 = renderer.xr.getControllerGrip( 0 );
		controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
		controller1.add( controllerGrip1 );

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

        // console.log(hand2)
        // let cs = [controllerGrip1,controllerGrip2,hand1,hand2];
        let cs = [controllerGrip1,controllerGrip2];
        cs.forEach( c => {
            c.addEventListener( 'connected', controllerConnected );
            c.addEventListener( 'disconnected', controllerDisconnected );
            c.addEventListener( 'squeezestart', onSqueezeStart );
            c.addEventListener( 'squeezeend', onSqueezeEnd );
            c.addEventListener( 'selectstart', onSelectStart );
            c.addEventListener( 'selectend', onSelectEnd );
        })

    // }
    // else {
    //     controller1 = renderer.xr.getController( 0 );
    //     scene.add( controller1 );
    //
    //     controller2 = renderer.xr.getController( 1 );
    //     scene.add( controller2 );
    //
    //     const controllerModelFactory = new XRControllerModelFactory();
    //
    //     controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    //     controllerGrip1.addEventListener( 'connected', controllerConnected );
    //     controllerGrip1.addEventListener( 'disconnected', controllerDisconnected );
    //     controllerGrip1.addEventListener( 'squeezestart', () => { squeeze[0] = 1} );
    //     controllerGrip1.addEventListener( 'squeezeend', () => { squeeze[0] = 0} );
    //     controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    //     scene.add( controllerGrip1 );
    //
    //     controllerGrip2 = renderer.xr.getControllerGrip( 1 );
    //     controllerGrip2.addEventListener( 'connected', controllerConnected );
    //     controllerGrip2.addEventListener( 'disconnected', controllerDisconnected );
    //     controllerGrip2.addEventListener( 'squeezestart', () => { squeeze[1] = 1} );
    //     controllerGrip2.addEventListener( 'squeezeend', () => { squeeze[1] = 0} );
    //     controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
    //     scene.add( controllerGrip2 );
    //
    // }




}

function onSelectStart( evt ) {
    evt.target.userData.selected = true;
    evt.target.userData.select_start_position = evt.target.position.clone();
    // console.log('select on')
}

function onSelectEnd( evt ) {
    evt.target.userData.selected = false;
    evt.target.userData.select_start_position = evt.target.position.clone();
    // params.displacement = new Vector3(0,0,0);
    // console.log('select off')
}

function onSqueezeStart( evt ) {
    evt.target.userData.squeezed = true;
    evt.target.userData.squeeze_start_position = evt.target.position.clone();
    console.log('squeeze on')
}

function onSqueezeEnd( evt ) {
    evt.target.userData.squeezed = false;
    evt.target.userData.select_start_position = evt.target.position.clone();
    console.log('squeeze off')
}

function controllerConnected( evt ) {

    evt.target.userData.selected = false;
    evt.target.userData.squeezed = false;
	controllers.push( {
		gamepad: evt.data.gamepad,
		grip: evt.target,
		// colliding: false,
		// playing: false,
        // select: false,
        // squeeze: false,
	} );

}

function controllerDisconnected( evt ) {

	const index = controllers.findIndex( o => o.controller === evt.target );
	if ( index !== - 1 ) {

		controllers.splice( index, 1 );

	}

}

export function handleCollisions(params, group) {

	// for ( let i = 0; i < group.children.length; i ++ ) {
    //
	// 	group.children[ i ].collided = false;
    //
	// }

    // console.log(controllers.length)

	for ( let g = 0; g < controllers.length; g ++ ) {

		const controller = controllers[ g ];
		// controller.colliding = false;

        const { grip, gamepad } = controller;
        let center = new THREE.Vector3();
        grip.getWorldPosition(center);
		const sphere = {
			radius: 0.03,
			center: center,
		};

        // console.log(grip.select)

		const supportHaptic = 'hapticActuators' in gamepad && gamepad.hapticActuators != null && gamepad.hapticActuators.length > 0;

        // console.log(group.children.length)

		for ( let i = 0; i < group.children.length; i ++ ) {

			const child = group.children[ i ];
			box.setFromObject( child );
			if ( box.intersectsSphere( sphere ) ) {
                // console.log('INTERSECTING WITH ')
                // console.log(child)
                if ( grip.userData.squeezed ) {
                    // params.load_position = grip.position.x + params.length/2.;
                    grip.getWorldPosition(grip_location); // set displacement to global position
                    params.displacement.subVectors(grip.userData.select_start_position,grip_location); // set displacement to the start position - current
                    params.load_position = params.displacement.x + params.length/2.;

                    console.log('grip location: ' + grip_location.x + ' ' + grip_location.y + ' ' + grip_location.z);
                    console.log('displacement:  ' + params.displacement);
                    // params.displacement = -grip.position.y;
                    // console.log(grip.position.y);

                    // child.material.emissive.b = 1;
                    let max_length = 0.1; // max distance to have haptics increase at
                    const intensity = params.displacement.length()/max_length;
                    // child.scale.setScalar( 1 + Math.random() * 0.1 * intensity );

                    if ( supportHaptic ) {

                        gamepad.hapticActuators[ 0 ].pulse( intensity, 100 );

                    }

                    // const musicInterval = musicScale[ child.userData.index % musicScale.length ] + 12 * Math.floor( child.userData.index / musicScale.length );
                    // oscillators[ g ].frequency.value = 110 * Math.pow( 2, musicInterval / 12 );
                    // controller.colliding = true;
                    // group.children[ i ].collided = true;
                }
			}
            // else {
                // params.displacement = 0;
            // }

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

	// for ( let i = 0; i < group.children.length; i ++ ) {
    //
	// 	let child = group.children[ i ];
	// 	if ( ! child.collided ) {
    //
	// 		// reset uncollided boxes
	// 		child.material.emissive.b = 0;
	// 		child.scale.setScalar( 1 );
    //         params.applied_load = 0;
    //
	// 	}
    //
	// }

    return params;

}

export const handleBeamSelectStart = (object, controller) => {
    // console.log(controller)
    if ( renderer.xr.isPresenting ) {
        controller.selected = object;
        const intersection_point = controls.raycaster.intersectObject( object )[0].point;
        controller.select_start_position = intersection_point;
    }
}

export const handleBeamIntersection = ( object ) => {
    if ( renderer.xr.isPresenting ) {
        // console.log(controls.vrControls.controllers.right.selected)
        let intersection_point;
        let controller;
        if ( controls.vrControls.controllers.left.selected === object ) {
            intersection_point = controls.raycaster.intersectObject( object )[0].point;
            controller = controls.vrControls.controllers.left;
        } else if ( controls.vrControls.controllers.right.selected === object ) {
            intersection_point = controls.raycaster.intersectObject( object )[0].point;
            controller = controls.vrControls.controllers.right;
        }
        if ( intersection_point !== undefined ) {
            params.displacement.subVectors(controller.select_start_position,intersection_point); // 
            params.load_position = -params.displacement.x + params.length/2.;
            params.displacement.y = Math.sign(params.displacement.y)*Math.min(Math.abs(params.displacement.y),PHYSICS.max_displacement);
            console.log(params.displacement)
        }
    }
        

        // set displacement to the start position - current
    //     

    //     console.log('grip location: ' + intersection_point.x + ' ' + intersection_point.y + ' ' + intersection_point.z);
    //     console.log('displacement:  ' + params.displacement);
    //     // params.displacement = -grip.position.y;
    //     // console.log(grip.position.y);

    //     // child.material.emissive.b = 1;
    //     let max_length = 0.1; // max distance to have haptics increase at
    //     const intensity = params.displacement.length()/max_length;
    //     // child.scale.setScalar( 1 + Math.random() * 0.1 * intensity );

    //     const supportHaptic = 'hapticActuators' in gamepad && gamepad.hapticActuators != null && gamepad.hapticActuators.length > 0;
    //     if ( supportHaptic ) {
    //         gamepad.hapticActuators[ 0 ].pulse( intensity, 100 );
    //     }
    // }
}

export const handleBeamSelectEnd = (object, controller) => {
    if ( renderer.xr.isPresenting ) {
        controller.selected = undefined;
        params.displacement = new THREE.Vector3();
    }
}

export const handleLeftSupportSelectStart = (object, controller) => {
    if ( params.left == 'Pin' ) { params.left = 'Fixed' }
    else if ( params.left == 'Fixed' ) { params.left = 'Free' }
    else if ( params.left == 'Free' ) { params.left = 'Pin' }
    redraw_supports();
}
export const handleRightSupportSelectStart = (object, controller) => {
    if ( params.right == 'Pin' ) { params.right = 'Fixed' }
    else if ( params.right == 'Fixed' ) { params.right = 'Free' }
    else if ( params.right == 'Free' ) { params.right = 'Pin' }
    redraw_supports();
}
export const handleSupportSelectEnd = (object, controller) => {
    // console.log(object)
    // params.displacement = 0;
}

export const handleColorSelectStart = (object, controller) => {
    if ( params.colour_by == 'Bending Moment' ) {
        params.colour_by = 'Shear Force';
        box.remove(BMD);
        box.add(SFD);
    }
    else if ( params.colour_by == 'Shear Force' ) {
        params.colour_by = 'Bending Moment';
        box.remove(SFD);
        box.add(BMD); }
    redraw_beam();
}
export const handleColorSelectEnd = (object, controller) => {
    // do nothing!
}