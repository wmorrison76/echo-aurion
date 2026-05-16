import * as THREE from "three";
export type Viewport = { width: number; height: number };
export function screenPointToNDC(x: number, y: number, vp: Viewport) {
  const nx = (x / vp.width) * 2 - 1;
  const ny = -(y / vp.height) * 2 + 1;
  return new THREE.Vector2(nx, ny);
}
export function rayFromScreen(
  x: number,
  y: number,
  vp: Viewport,
  camera: THREE.Camera,
) {
  const ndc = screenPointToNDC(x, y, vp);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.clone();
}
export function intersectGround(ray: THREE.Ray, y = 0) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
  const hit = new THREE.Vector3();
  const ok = ray.intersectPlane(plane, hit);
  return ok ? hit : null;
}
export function snapToGrid(v: THREE.Vector3, grid = 0.1) {
  const out = v.clone();
  out.x = Math.round(out.x / grid) * grid;
  out.z = Math.round(out.z / grid) * grid;
  return out;
}
export function raycastPick(
  x: number,
  y: number,
  vp: Viewport,
  camera: THREE.Camera,
  roots: THREE.Object3D[],
) {
  const ndc = screenPointToNDC(x, y, vp);
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true as any;
  raycaster.setFromCamera(ndc, camera);
  const pickables: THREE.Object3D[] = [];
  for (const r of roots) {
    r.traverse((obj) => {
      const pickable = (obj as any).isMesh && (obj.userData?.pickable ?? true);
      if (pickable) pickables.push(obj);
    });
  }
  const hits = raycaster.intersectObjects(pickables, true);
  return hits[0] ?? null;
}
export function deepCloneObject3D<T extends THREE.Object3D>(source: T): T {
  const clone = source.clone(true) as T;
  const sourceBones: Record<string, THREE.Bone> = {};
  const sourceSkinned: Record<string, THREE.SkinnedMesh> = {};
  source.traverse((n) => {
    const anyN = n as any;
    if (anyN.isBone) sourceBones[n.name] = n as THREE.Bone;
    if (anyN.isSkinnedMesh) sourceSkinned[n.name] = n as THREE.SkinnedMesh;
  });
  const cloneBones: Record<string, THREE.Bone> = {};
  const cloneSkinned: Record<string, THREE.SkinnedMesh> = {};
  clone.traverse((n) => {
    const anyN = n as any;
    if (anyN.material && typeof anyN.material.clone === "function")
      anyN.material = anyN.material.clone();
    if (anyN.geometry && typeof anyN.geometry.clone === "function")
      anyN.geometry = anyN.geometry.clone();
    if (anyN.isBone) cloneBones[n.name] = n as THREE.Bone;
    if (anyN.isSkinnedMesh) cloneSkinned[n.name] = n as THREE.SkinnedMesh;
  });
  for (const name of Object.keys(sourceSkinned)) {
    const src = sourceSkinned[name];
    const dst = cloneSkinned[name];
    if (!src || !dst) continue;
    const orderedCloneBones = src.skeleton.bones.map((b) => cloneBones[b.name]);
    if (orderedCloneBones.every(Boolean)) {
      dst.bind(
        new THREE.Skeleton(orderedCloneBones, src.skeleton.boneInverses),
        dst.matrixWorld,
      );
    }
  }
  return clone;
}
