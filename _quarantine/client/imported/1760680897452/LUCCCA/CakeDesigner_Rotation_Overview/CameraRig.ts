/**
 * LUCCCA | CD-06
 * CameraRig: centralizes camera positioning & transitions (2D, 3D, overview).
 */
import * as THREE from 'three';

export type CameraMode = 'front' | 'side' | 'top' | 'iso' | 'overview';

export class CameraRig {
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public goTo(mode: CameraMode, radius = 8) {
    switch (mode) {
      case 'front':
        this.camera.position.set(0, 2, radius);
        break;
      case 'side':
        this.camera.position.set(radius, 2, 0);
        break;
      case 'top':
        this.camera.position.set(0, radius, 0.001);
        break;
      case 'iso':
        this.camera.position.set(radius * 0.7, radius * 0.9, radius * 0.7);
        break;
      case 'overview':
        this.camera.position.set(radius * 1.5, radius * 1.2, radius * 1.5);
        break;
    }
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }
}
