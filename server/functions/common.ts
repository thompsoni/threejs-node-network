export function distance2(x1, y1, x2, y2) {
    let a = x1 - x2;
    let b = y1 - y2;
    return Math.sqrt( a*a + b*b );
}

export function angle2(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}