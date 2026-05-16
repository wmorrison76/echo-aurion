/**
 * Three.js Cake Texture Loader & Material Factory
 * Creates PBR materials for cake tiers, frosting, and fillings
 */
import * as THREE from "three";

const textureCache = new Map<string, THREE.Texture>();

export function clearTextureCache() {
  textureCache.forEach((t) => t.dispose());
  textureCache.clear();
}

export function loadTexture(url: string): Promise<THREE.Texture> {
  if (textureCache.has(url)) return Promise.resolve(textureCache.get(url)!);
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => { textureCache.set(url, tex); resolve(tex); },
      undefined,
      () => resolve(new THREE.Texture()),
    );
  });
}

export function createTierMaterial(color: string = "#f5e6c8", textureUrl?: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.85,
    metalness: 0.02,
  });
  if (textureUrl) {
    loadTexture(textureUrl).then((tex) => { mat.map = tex; mat.needsUpdate = true; });
  }
  return mat;
}

export function createFrostingMaterial(color: string = "#ffffff"): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.4,
    metalness: 0.05,
    transparent: true,
    opacity: 0.95,
  });
}

export function createFillingMaterial(color: string = "#e88b8b"): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.6,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
  });
}

export function createCircularUVAttribute(geometry: THREE.BufferGeometry, diameter: number): void {
  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = (pos.getX(i) / diameter) + 0.5;
    uvs[i * 2 + 1] = (pos.getZ(i) / diameter) + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

export function createCylindricalUVAttribute(geometry: THREE.BufferGeometry, diameter: number, height: number): void {
  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    uvs[i * 2] = (angle + Math.PI) / (2 * Math.PI);
    uvs[i * 2 + 1] = y / height;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}
