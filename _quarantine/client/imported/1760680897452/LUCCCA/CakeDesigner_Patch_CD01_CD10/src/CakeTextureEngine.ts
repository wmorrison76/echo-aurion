/**
 * LUCCCA | CD-02 (PATCH V1)
 * Three.js-based texture engine with error handling & precision-aware updates.
 */
import * as THREE from 'three';
import { TextureLibrary } from './TextureLibrary';
import { TextureKey } from './types';

export class CakeTextureEngine {
  private loader = new THREE.TextureLoader();
  constructor(private scene: THREE.Scene) {}

  applyTexture(mesh: THREE.Mesh, textureKey: TextureKey) {
    const meta = TextureLibrary[textureKey];
    if (!meta) throw new Error(`Unknown texture key: ${textureKey}`);
    this.loader.load(
      meta.path,
      (texture) => {
        if (!mesh.material) {
          mesh.material = new THREE.MeshStandardMaterial();
        }
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.map = texture;
        mat.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.error('Texture load failed', err);
      }
    );
  }
}
