/**
 * Three.js Cake Texture Loader
 * Loads and applies AI-generated images as textures to cake geometry
 * Handles proper UV mapping and material creation
 */

import * as THREE from "three";

interface TextureConfig {
  imageUrl: string;
  type: "top" | "side" | "ring"; // top for tier top, side for frosting, ring for filling
  metalness?: number;
  roughness?: number;
  normalScale?: number;
}

interface CakeMaterialSet {
  topMaterial: THREE.Material;
  sideMaterial: THREE.Material;
}

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

/**
 * Load texture from URL with caching
 */
export async function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    // Check cache first
    if (textureCache.has(url)) {
      resolve(textureCache.get(url)!);
      return;
    }

    textureLoader.load(
      url,
      (texture) => {
        // Configure texture for optimal appearance and quality
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.encoding = THREE.sRGBColorSpace;
        // Use high-quality filtering
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        // Enable anisotropic filtering for better quality at angles
        texture.anisotropy = 16;
        // Set wrapping
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        // Cache for future use
        textureCache.set(url, texture);
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error(`Failed to load texture: ${url}`, error);
        reject(error);
      },
    );
  });
}

/**
 * Create UV coordinates for circular cake top (radial mapping)
 */
export function createCircularUVAttribute(
  geometry: THREE.BufferGeometry,
): void {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uvs = new Float32Array(positions.count * 2);

  const posArray = positions.array as Float32Array;

  for (let i = 0; i < positions.count; i++) {
    const x = posArray[i * 3];
    const z = posArray[i * 3 + 2];

    // Calculate radius and angle from center
    const radius = Math.sqrt(x * x + z * z);
    const angle = Math.atan2(z, x);

    // Map to UV coordinates (0-1)
    // Normalize radius to fit texture
    const maxRadius = 20; // Approximate cylinder radius
    const u = 0.5 + (radius / maxRadius) * 0.5 * Math.cos(angle);
    const v = 0.5 + (radius / maxRadius) * 0.5 * Math.sin(angle);

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

/**
 * Create UV coordinates for cylindrical sides (regular mapping)
 */
export function createCylindricalUVAttribute(
  geometry: THREE.BufferGeometry,
): void {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uvs = new Float32Array(positions.count * 2);

  const posArray = positions.array as Float32Array;

  for (let i = 0; i < positions.count; i++) {
    const x = posArray[i * 3];
    const y = posArray[i * 3 + 1];
    const z = posArray[i * 3 + 2];

    // Angle around cylinder
    const angle = Math.atan2(z, x);
    const u = (angle + Math.PI) / (2 * Math.PI); // 0-1 around cylinder

    // Height mapping
    const maxHeight = 10; // Approximate cylinder height
    const v = (y + maxHeight / 2) / maxHeight; // 0-1 from bottom to top

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

/**
 * Create UV coordinates for filling ring (radial ring mapping)
 */
function createRingUVAttribute(
  geometry: THREE.BufferGeometry,
  innerRadius: number,
  outerRadius: number,
): void {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const uvs = new Float32Array(positions.count * 2);

  const posArray = positions.array as Float32Array;

  for (let i = 0; i < positions.count; i++) {
    const x = posArray[i * 3];
    const z = posArray[i * 3 + 2];

    // Calculate radius and angle
    const radius = Math.sqrt(x * x + z * z);
    const angle = Math.atan2(z, x);

    // Map radius to 0-1 (inner to outer)
    const normalizedRadius =
      (radius - innerRadius) / (outerRadius - innerRadius);
    const u = 0.5 + normalizedRadius * 0.5 * Math.cos(angle);
    const v = 0.5 + normalizedRadius * 0.5 * Math.sin(angle);

    uvs[i * 2] = Math.max(0, Math.min(1, u));
    uvs[i * 2 + 1] = Math.max(0, Math.min(1, v));
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

/**
 * Create material for cake tier (top and sides)
 */
export async function createTierMaterial(
  topImageUrl: string | undefined,
  sideImageUrl: string | undefined,
  baseColor: string = "#c7a16d",
): Promise<CakeMaterialSet> {
  const topMaterial = await (async () => {
    if (topImageUrl) {
      const texture = await loadTexture(topImageUrl);
      return new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 50,
        reflectivity: 0.3,
        side: THREE.FrontSide,
        flatShading: false,
      });
    } else {
      return new THREE.MeshPhongMaterial({
        color: new THREE.Color(baseColor),
        shininess: 50,
        reflectivity: 0.2,
        side: THREE.FrontSide,
      });
    }
  })();

  const sideMaterial = await (async () => {
    if (sideImageUrl) {
      const texture = await loadTexture(sideImageUrl);
      return new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 40,
        reflectivity: 0.25,
        side: THREE.FrontSide,
        flatShading: false,
      });
    } else {
      return new THREE.MeshPhongMaterial({
        color: new THREE.Color(baseColor),
        shininess: 40,
        reflectivity: 0.15,
        side: THREE.FrontSide,
      });
    }
  })();

  return { topMaterial, sideMaterial };
}

/**
 * Create material for frosting layer
 */
export async function createFrostingMaterial(
  imageUrl: string | undefined,
  frostingType: string = "buttercream",
  color: string = "#ffffff",
): Promise<THREE.Material> {
  if (imageUrl) {
    const texture = await loadTexture(imageUrl);

    // Different roughness/shininess based on frosting type
    const shininessMap: Record<string, number> = {
      buttercream: 60,
      fondant: 100,
      ganache: 80,
      "cream-cheese": 40,
    };

    const reflectivityMap: Record<string, number> = {
      buttercream: 0.4,
      fondant: 0.6,
      ganache: 0.5,
      "cream-cheese": 0.2,
    };

    return new THREE.MeshPhongMaterial({
      map: texture,
      shininess: shininessMap[frostingType] || 60,
      reflectivity: reflectivityMap[frostingType] || 0.4,
      side: THREE.FrontSide,
      flatShading: false,
    });
  } else {
    const shininessMap: Record<string, number> = {
      buttercream: 60,
      fondant: 100,
      ganache: 80,
      "cream-cheese": 40,
    };

    const reflectivityMap: Record<string, number> = {
      buttercream: 0.4,
      fondant: 0.6,
      ganache: 0.5,
      "cream-cheese": 0.2,
    };

    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      shininess: shininessMap[frostingType] || 60,
      reflectivity: reflectivityMap[frostingType] || 0.4,
      side: THREE.FrontSide,
    });
  }
}

/**
 * Create material for filling layer
 */
export async function createFillingMaterial(
  imageUrl: string | undefined,
  color: string = "#c41e3a",
): Promise<THREE.Material> {
  if (imageUrl) {
    const texture = await loadTexture(imageUrl);
    return new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 35,
      reflectivity: 0.3,
      side: THREE.DoubleSide,
      flatShading: false,
    });
  } else {
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      shininess: 35,
      reflectivity: 0.3,
      side: THREE.DoubleSide,
    });
  }
}

/**
 * Apply texture to existing geometry with proper UV mapping
 */
export async function applyTextureToGeometry(
  geometry: THREE.BufferGeometry,
  config: TextureConfig,
): Promise<THREE.Texture> {
  const texture = await loadTexture(config.imageUrl);

  // Apply appropriate UV mapping based on type
  switch (config.type) {
    case "top":
      createCircularUVAttribute(geometry);
      break;
    case "side":
      createCylindricalUVAttribute(geometry);
      break;
    case "ring":
      // For rings, use radial mapping (would need more params in real usage)
      createCircularUVAttribute(geometry);
      break;
  }

  return texture;
}

/**
 * Update material map texture dynamically
 */
export async function updateMaterialTexture(
  material: THREE.Material,
  imageUrl: string,
): Promise<void> {
  if (material instanceof THREE.MeshPhongMaterial) {
    const texture = await loadTexture(imageUrl);
    material.map = texture;
    material.needsUpdate = true;
  }
}

/**
 * Clear all cached textures (for memory management)
 */
export function clearTextureCache(): void {
  textureCache.forEach((texture) => {
    texture.dispose();
  });
  textureCache.clear();
}

/**
 * Get cache size for debugging
 */
export function getTextureCacheSize(): number {
  return textureCache.size;
}

/**
 * Dispose individual texture from cache
 */
export function disposeTexture(url: string): void {
  const texture = textureCache.get(url);
  if (texture) {
    texture.dispose();
    textureCache.delete(url);
  }
}

/**
 * Create material group for a tier with top and side textures
 */
export async function createTierMaterialGroup(
  topImageUrl: string | undefined,
  sideImageUrl: string | undefined,
  tierConfig: {
    baseColor?: string;
    roughness?: number;
    metalness?: number;
  } = {},
): Promise<THREE.Material[]> {
  const materials: THREE.Material[] = [];

  // Top material
  const topMaterial = await createTierMaterial(
    topImageUrl,
    undefined,
    tierConfig.baseColor,
  );
  materials.push(topMaterial.topMaterial);

  // Side material
  if (sideImageUrl) {
    const sideMaterial = await createTierMaterial(
      undefined,
      sideImageUrl,
      tierConfig.baseColor,
    );
    materials.push(sideMaterial.sideMaterial);
  } else {
    materials.push(topMaterial.sideMaterial);
  }

  return materials;
}

/**
 * Preload multiple textures in parallel
 */
export async function preloadTextures(
  urls: string[],
): Promise<THREE.Texture[]> {
  return Promise.all(urls.map((url) => loadTexture(url)));
}
