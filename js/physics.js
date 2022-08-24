export let positions, shear_force, bending_moment;
let initial_positions;
let P, EI;
let P_max;
export let M_max = 0;
export let SF_max = 0;
let max_displacement = 0.5;

export function set_initial_position(p) {
    positions = p.map((x)=> x); // deep copy
    initial_positions = p;
}

export function updateDeformation(params) {
    let l = params.length;
    let a = params.load_position; // distance from left to load point
    let b = l - a; // distance from right to load point

    if ( params.displacement_control ) {
        EI = 1;
        if ( (params.left === 'Pin') && (params.right === 'Pin') ) {
            P = (3 * params.displacement.y * l)/( a*a * b*b ) || 0;
            P_max = (3 * max_displacement * l)/( a*a * b*b ) || 0;
            M_max = Math.abs(P_max*a*b/l);
            SF_max = Math.max( P_max*b/l, P_max*a/l);
        } else if ( (params.left === 'Fixed') && (params.right === 'Fixed') ) {
            P = (3 * EI * l*l*l * params.displacement.y )/( a*a*a * b*b*b ) || 0;
            P_max = (3 * EI * l*l*l * max_displacement )/( a*a*a * b*b*b ) || 0;
            let R1 = P_max*b*b*(3*a+b)/l/l/l;
            let R2 = P_max*a*a*(3*b+a)/l/l/l;
            let M1 = P_max*a*b*b/l/l;
            let M2 = P_max*a*a*b/l/l;
            M_max = Math.max(Math.abs(M1), Math.abs(M2));
            SF_max = Math.max(Math.abs(R1), Math.abs(R2));
        }  else if ( (params.left === 'Pin') && (params.right === 'Fixed') ) {
            P = (12 * EI * l*l*l * params.displacement.y * (3*l + a))/( a*a * b*b*b ) || 0;
            P_max = (12 * EI * l*l*l * max_displacement * (3*l + a))/( a*a * b*b*b ) || 0;
            let R1 = P_max*b*b*(a+2*l)/(2*l*l*l);
            let R2 = P_max*a*(3*l*l - a*a)/(2*l*l*l);
            let M1 = R1*a; // moment at point of load
            let M2 = P_max*a*b*(a+l)/(2*l*l); // moment at fixed end
            M_max = Math.max(Math.abs(M1),Math.abs(M2));
            SF_max = Math.max(Math.abs(R1),Math.abs(R2));
        }  else if ( (params.left === 'Fixed') && (params.right === 'Pin') ) {
            P = (12 * EI * l*l*l * params.displacement.y * (3*l + b))/( a*a*a * b*b ) || 0;
            P_max = (12 * EI * l*l*l * max_displacement * (3*l + b))/( a*a*a * b*b ) || 0;
            let R1 = P_max*a*a*(b+2*l)/(2*l*l*l);
            let R2 = P_max*b*(3*l*l - b*b)/(2*l*l*l);
            let M1 = R1*b; // moment at point of load
            let M2 = P_max*b*a*(b+l)/(2*l*l); // moment at fixed end
            M_max = Math.max(Math.abs(M1),Math.abs(M2));
            SF_max = Math.max(Math.abs(R1),Math.abs(R2));
        }  else if ( (params.left === 'Fixed') && (params.right === 'Free') ) {
            P = (3 * EI * params.displacement.y)/( a*a*a ) || 0;
            P_max = (3 * EI * max_displacement)/( a*a*a ) || 0;
            M_max = Math.abs(P_max*a);
            SF_max = Math.abs(P_max);
        }  else if ( (params.left === 'Free') && (params.right === 'Fixed') ) {
            P = (3 * EI * params.displacement.y)/( b*b*b ) || 0;
            P_max = (3 * EI * max_displacement)/( b*b*b ) || 0;
            M_max = Math.abs(P_max*b);
            SF_max = Math.abs(P_max);
        }  else {
            P = 0;
            P_max = 0;
            M_max = 0;
            SF_max = 0;
        }
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
    
    for ( let i = 0; i < positions.length/3; i ++ ) {
        let x = l*positions[i*3 + 0] + l/2; // distance along beam
    
        if ( (params.left === 'Pin') && (params.right === 'Pin') ) {
            // SIMPLY SUPPORTED BEAM --- IMPLEMENTED AND WORKING
            if ( x < a ) {
                deflection = P * b * x * (l*l - b*b - x*x )/(6*EI*l);
                bending_moment.push(P * b * x / l);
                shear_force.push(P * b / l);
            } else {
                deflection = P * a * (l - x) * (2*l*x - x*x - a*a )/(6*EI*l);
                bending_moment.push(P * a / l * ( l - x));
                shear_force.push(-P * a / l);
            }
        } else if ( (params.left === 'Fixed') && (params.right === 'Fixed') ) {
            // IMPLEMENTED AND PROBABLY WORKING
            let R1 = P*b*b*(3*a+b)/l/l/l;
            let R2 = P*a*a*(3*b+a)/l/l/l;
            if ( x < a ) {
                deflection = P * b*b * x*x * (3*a*l - 3*a*x - b*x )/(6*EI*l*l*l);
                bending_moment.push(R1*x - P*a*b*b/l/l);
                shear_force.push(R1);
            } else {
                deflection = P * a*a * (l-x)*(l-x) * (3*b*l - 3*b*(l-x) - a*x )/(6*EI*l*l*l);
                bending_moment.push(R2*(l-x) - P*a*a*b/l/l);
                shear_force.push(-R2);
            }
        } else if ( (params.left === 'Pin') && (params.right === 'Fixed') ) {
            // IMPLEMENTED AND PROBABLY WORKING
            let R1 = P*b*b*(a+2*l)/(2*l*l*l);
            let R2 = P*a*(3*l*l - a*a)/(2*l*l*l);
            if ( x < a ) {
                deflection = P*b*b*x*(3*a*l*l - 2*l*x*x - a*x*x)/(12*EI*l*l*l);
                bending_moment.push(R1*x);
                shear_force.push(R1);
            } else {
                deflection = P*a*((l-x)**2*(3*l*l*x - a*a*x - 2*a*a*l))/(12*EI*l*l*l);
                bending_moment.push(R1*x - P*(x-a));
                shear_force.push(-R2);
            }
        } else if ( (params.left === 'Fixed') && (params.right === 'Pin') ) {
            // IMPLEMENTED AND PROBABLY WORKING
            let R1 = P*a*a*(b+2*l)/(2*l*l*l);
            let R2 = P*b*(3*l*l - b*b)/(2*l*l*l);
            if ( x > a ) {
                deflection = P*a*a*(l-x)*(3*b*l*l - 2*l*(l-x)*(l-x) - b*(l-x)*(l-x))/(12*EI*l*l*l);
                bending_moment.push(R2*(l-x));
                shear_force.push(-R2);
            } else {
                deflection = P*b*(x**2*(3*l*l*(l-x) - b*b*(l-x) - 2*b*b*l))/(12*EI*l*l*l);
                bending_moment.push(R2*(l-x) - P*((l-x)-b));
                shear_force.push(R2);
            }
        } else if ( (params.left === 'Fixed') && (params.right === 'Free') ) {
            // IMPLEMENTED AND PROBABLY WORKING
            if ( x > a ) {
                deflection = P * a*a * (3*l - 3*(l-x) - a )/(6*EI);
                bending_moment.push(0);
                shear_force.push(0);
            } else {
                deflection = P * x**2 * (3*a -x )/(6*EI);
                bending_moment.push(P * (l-x- a));
                shear_force.push(-P);
            }
        } else if ( (params.left === 'Free') && (params.right === 'Fixed') ) {
            // IMPLEMENTED AND PROBABLY WORKING
            if ( x < a ) {
                deflection = P * b*b * (3*l - 3*x - b )/(6*EI);
                bending_moment.push(0);
                shear_force.push(0);
            } else {
                deflection = P * (l - x)**2 * (3*b - l +x )/(6*EI);
                bending_moment.push(P * (x- a));
                shear_force.push(-P);
            }
        } else {
            deflection = 0;
            bending_moment.push(0);
            shear_force.push(0);
        }
      positions[ i*3+1 ] = initial_positions[i*3+1] - deflection;

    }
    // console.log(deflection)
}
