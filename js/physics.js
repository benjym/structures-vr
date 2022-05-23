export let positions, shear_force, bending_moment;
let initial_positions;
let P, EI;

export function set_initial_position(p) {
    positions = p.map((x)=> x); // deep copy
    initial_positions = p;
}

export function updateDeformation(params) {
    let a = params.load_position; // distance from left to load point
    let b = params.length - a; // distance from right to load point

    if ( params.displacement_control ) {
        EI = 1;
        P = (3 * params.displacement.y * params.length)/( a*a * b*b ) || 0;
        // console.log(P)
    }
    else {
        EI = params.youngs_modulus * 1e9 * params.depth * Math.pow(params.height, 3) / 12; // convert from GPa to Pa
        P = params.applied_load * 1e3; // applied load in N
    }

    // stolen from https://www.linsgroup.com/MECHANICAL_DESIGN/Beam/beam_formula.htm

    let deflection;
    bending_moment = [];
    shear_force = [];

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
}
