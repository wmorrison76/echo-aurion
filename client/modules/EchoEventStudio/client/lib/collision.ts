import type { Obj } from"@/store/sceneStore"; export type BBox = { min: [number, number, number]; max: [number, number, number];
}; export function bboxOf(obj: Obj): BBox { const [w, h, d] = obj.size || [1, 1, 1]; const [x, y, z] = obj.position; return { min: [x - w / 2, y - h / 2, z - d / 2], max: [x + w / 2, y + h / 2, z + d / 2], };
} export function overlap(a: BBox, b: BBox): boolean { return !( a.max[0] < b.min[0] || a.min[0] > b.max[0] || a.max[2] < b.min[2] || a.min[2] > b.max[2] );
} export function autoNudge( obj: Obj, others: Obj[], step = 0.1, maxDistance = 1.0
): Obj { let moved = { ...obj }; const directions: [number, number][] = [ [step, 0], [-step, 0], [0, step], [0, -step], ]; let distance = 0; const hasCollision = () => { return others.some( (other) => other.id !== moved.id && overlap(bboxOf(moved), bboxOf(other)) ); }; while (hasCollision() && distance < maxDistance) { for (const [dx, dz] of directions) { moved.position = [ moved.position[0] + dx, moved.position[1], moved.position[2] + dz, ]; if (!hasCollision()) { return moved; } // Revert position for next direction attempt moved.position = [ moved.position[0] - dx, moved.position[1], moved.position[2] - dz, ]; } distance += step; } return moved;
} export function checkCollision(obj: Obj, others: Obj[]): boolean { return others.some( (other) => other.id !== obj.id && overlap(bboxOf(obj), bboxOf(other)) );
}
