/**
 * LUCCCA | CD-07
 * AutoRotateController: toggles auto-rotation of the cake mesh.
 */
import * as THREE from 'three';

export class AutoRotateController {
  private target: THREE.Object3D | null = null;
  private speed: number = 0.01;
  private enabled = false;

  constructor(target?: THREE.Object3D, speed: number = 0.01) {
    if (target) this.target = target;
    this.speed = speed;
  }

  setTarget(target: THREE.Object3D) {
    this.target = target;
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  toggle(on?: boolean) {
    if (typeof on === 'boolean') {
        this.enabled = on;
    } else {
        this.enabled = !this.enabled;
    }
  }

  tick() {
    if (!this.target || !this.enabled) return;
    this.target.rotation.y += this.speed;
  }
}
