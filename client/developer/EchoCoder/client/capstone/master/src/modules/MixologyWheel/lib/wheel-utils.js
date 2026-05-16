/** Convert polar coords to cartesian (SVG friendly). */
export function polarToCartesian(cx, cy, r, angleRad){
  return { x: cx + r * Math.cos(angleRad - Math.PI/2), y: cy + r * Math.sin(angleRad - Math.PI/2) };
}
