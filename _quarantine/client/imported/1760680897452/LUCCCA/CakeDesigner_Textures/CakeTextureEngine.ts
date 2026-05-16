/**
 * LUCCCA | CD-02
 * 3D texture rendering engine for cake surfaces using Three.js and shaders.
 */
import * as THREE from 'three';
import { TextureLibrary } from './TextureLibrary';

export class CakeTextureEngine {
  constructor(scene) {
    this.scene = scene;
  }

  applyTexture(mesh, textureKey) {
    const loader = new THREE.TextureLoader();
    loader.load(TextureLibrary[textureKey], (texture) => {
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
    });
  }
}
