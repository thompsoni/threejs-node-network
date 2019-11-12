import { Vector3 } from "three";

export function distance2(x1: number, y1: number, x2: number, y2: number): number {
    let a = x1 - x2;
    let b = y1 - y2;
    return Math.sqrt( a*a + b*b );
}

/** converts json object to array eg. stringify vertices -> return a float array */
export function jsonToArray(objJson): any[] {
    return Object.keys(objJson).map((key) => objJson[key]);
}

export function angle2(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1);
}

export function distance3( v1: Vector3, v2: Vector3 ): number
{
    let dx = v1.x - v2.x;
    let dy = v1.y - v2.y;
    let dz = v1.z - v2.z;

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}

export function shortAngleDist(a0: number, a1: number) {
    let max = Math.PI*2;
    let da = (a1 - a0) % max;
    return 2*da % max - da;
}

export function angleLerp(a0: number, a1: number, t: number) {
    return a0 + shortAngleDist(a0, a1)*t;
}

export function eulerToDeg( euler: number ) {
    return (( (euler) / (2 * Math.PI) ) * 360) + 180;
}

export function degToEuler( deg: number ) {
    return ((deg - 180) / 360) * (2 * Math.PI);
}
