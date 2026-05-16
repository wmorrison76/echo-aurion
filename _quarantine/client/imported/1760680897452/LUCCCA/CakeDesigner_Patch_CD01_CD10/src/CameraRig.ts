/**
 * LUCCCA | CD-06 (PATCH V1)
 */
import * as THREE from 'three';
export type CameraMode = 'front' | 'side' | 'top' | 'iso' | 'overview';

export class CameraRig {
  constructor(private camera: THREE.PerspectiveCamera) {}

  public goTo(mode: CameraMode, radius = 8) {
    const y = 2;
    switch (mode) {
      case 'front': this.camera.position.set(0, y, radius); break;
      case 'side': this.camera.position.set(radius, y, 0); break;
      case 'top': this.camera.position.set(0, radius, 0.001); break;
      case 'iso': this.camera.position.set(radius * 0.7, radius * 0.9, radius * 0.7); break;
      case 'overview': this.camera.position.set(radius * 1.5, radius * 1.2, radius * 1.5); break;
    }
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }
}
