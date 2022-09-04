// import * as THREE from 'three';
import * as PHYSICS from './physics.js';
import { params, redraw_supports, redraw_beam, controls, box, SFD, BMD, renderer } from './index.js';


export const handleBeamSelectStart = (object, controller) => {
    // console.log(controller)
    if (renderer.xr.isPresenting) {
        if (controller !== undefined) {
            controller.selected = object;
            const intersection_point = controls.raycaster.intersectObject(object)[0].point;
            controller.select_start_position = intersection_point;
        }
    }
}

export const handleBeamIntersection = (object) => {
    if (renderer.xr.isPresenting) {
        // console.log(controls.vrControls.controllers.right.selected)
        let intersection_point;
        let controller;
        if (controls.vrControls.controllers.left.selected === object) {
            intersection_point = controls.raycaster.intersectObject(object)[0].point;
            controller = controls.vrControls.controllers.left;
        } else if (controls.vrControls.controllers.right.selected === object) {
            intersection_point = controls.raycaster.intersectObject(object)[0].point;
            controller = controls.vrControls.controllers.right;
        }
        if (intersection_point !== undefined) {
            params.displacement.subVectors(controller.select_start_position, intersection_point); // 
            params.load_position = -params.displacement.x + params.length / 2.;
            params.displacement.y = Math.sign(params.displacement.y) * Math.min(Math.abs(params.displacement.y), PHYSICS.max_displacement);
            // console.log(params.displacement)

            const supportHaptic = 'hapticActuators' in controller.gamepad && controller.gamepad.hapticActuators != null && controller.gamepad.hapticActuators.length > 0;
            if ( supportHaptic ) {
                const intensity = Math.abs(PHYSICS.P/PHYSICS.P_max);
                controller.gamepad.hapticActuators[ 0 ].pulse( intensity, 100 );
            }
    
        }

    }
}

export const handleBeamSelectEnd = (object, controller) => {
    if (renderer.xr.isPresenting) {
        controller.selected = undefined;
        params.displacement = new THREE.Vector3();
    }
}

export const handleLeftSupportSelectStart = (object, controller) => {
    if (params.left == 'Pin') { params.left = 'Fixed' }
    else if (params.left == 'Fixed') { params.left = 'Free' }
    else if (params.left == 'Free') { params.left = 'Pin' }
    redraw_supports();
}
export const handleRightSupportSelectStart = (object, controller) => {
    if (params.right == 'Pin') { params.right = 'Fixed' }
    else if (params.right == 'Fixed') { params.right = 'Free' }
    else if (params.right == 'Free') { params.right = 'Pin' }
    redraw_supports();
}
export const handleSupportSelectEnd = (object, controller) => {
    // console.log(object)
    // params.displacement = 0;
}

export const handleColorSelectStart = (object, controller) => {
    if (params.colour_by == 'Bending Moment') {
        params.colour_by = 'Shear Force';
        box.remove(BMD);
        box.add(SFD);
    }
    else if (params.colour_by == 'Shear Force') {
        params.colour_by = 'Bending Moment';
        box.remove(SFD);
        box.add(BMD);
    }
    redraw_beam();
}
export const handleColorSelectEnd = (object, controller) => {
    // do nothing!
}