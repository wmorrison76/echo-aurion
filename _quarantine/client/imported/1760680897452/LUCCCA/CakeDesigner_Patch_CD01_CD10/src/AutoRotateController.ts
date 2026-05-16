/**
 * LUCCCA | CD-07 (PATCH V1)
 */
import * as THREE from 'three';

export class AutoRotateController {
  private enabled = false;
  constructor(private target: THREE.Object3D | null, private speed: number = 0.01) {}

  setTarget(target: THREE.Object3D) { this.target = target; }
  setSpeed(speed: number) { this.speed = speed; }
  toggle(on?: boolean) { this.enabled = typeof on === 'boolean' ? on : !this.enabled; }
  tick() { if (this.target && this.enabled) this.target.rotation.y += this.speed; }
}
