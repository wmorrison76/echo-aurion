import * as THREE from "three";
export type ViewPreset = "top" | "front" | "right" | "persp";
export interface CamState {
  pos: [number, number, number];
  target: [number, number, number];
}
export const CAMERA_PRESETS: Record<ViewPreset, CamState> = {
  top: { pos: [0, 30, 0], target: [0, 0, 0] },
  front: { pos: [0, 6, 18], target: [0, 0, 0] },
  right: { pos: [18, 6, 0], target: [0, 0, 0] },
  persp: { pos: [12, 12, 14], target: [0, 0, 0] },
};
export function applyCameraPreset(
  ctx: { camera: THREE.Camera; controls?: any } | null | undefined,
  state: CamState | ViewPreset | null,
): void {
  if (!ctx || !ctx.camera) return;
  let camState: CamState; // If state is a preset key, look it up if (typeof state ==="string") { camState = CAMERA_PRESETS[state as ViewPreset]; if (!camState) return; } else if (state && typeof state ==="object") { camState = state; } else { return; } const cameraObj = ctx.camera as THREE.PerspectiveCamera; cameraObj.position.set(...camState.pos); if (ctx.controls) { ctx.controls.target.set(...camState.target); ctx.controls.update?.(); }
}
export function saveCameraState(
  ctx: { camera: THREE.Camera; controls?: any } | null | undefined,
): CamState | null {
  if (!ctx || !ctx.camera) return null;
  const cameraObj = ctx.camera as THREE.PerspectiveCamera;
  const target = ctx.controls?.target
    ? [ctx.controls.target.x, ctx.controls.target.y, ctx.controls.target.z]
    : [0, 0, 0];
  return {
    pos: [cameraObj.position.x, cameraObj.position.y, cameraObj.position.z] as [
      number,
      number,
      number,
    ],
    target: target as [number, number, number],
  };
}
export function applyCameraState(
  ctx: { camera: THREE.Camera; controls?: any } | null | undefined,
  state: CamState | null,
): void {
  if (!ctx || !ctx.camera || !state) return;
  const cameraObj = ctx.camera as THREE.PerspectiveCamera;
  cameraObj.position.set(...state.pos);
  if (ctx.controls) {
    ctx.controls.target.set(...state.target);
    ctx.controls.update?.();
  }
}
export function getCameraDistance(camera: THREE.Camera): number {
  const cameraObj = camera as THREE.PerspectiveCamera;
  return cameraObj.position.length();
}
export function setCameraDistance(
  camera: THREE.Camera,
  controls: any,
  distance: number,
): void {
  const cameraObj = camera as THREE.PerspectiveCamera;
  const direction = cameraObj.position.clone().normalize();
  cameraObj.position.copy(direction.multiplyScalar(distance));
  if (controls) {
    controls.update?.();
  }
}
