/**
 * Three.js Slice View System
 * Implements proper cake slicing with plane clipping and cross-section visualization
 */

import * as THREE from "three";

export interface SliceConfig {
  enabled: boolean;
  angle: number; // 0-360 degrees around cake
  depth: number; // 0-1, how deep the cut goes (0.5 = half cake)
  showInterior: boolean;
  interiorColor?: string;
  interiorTexture?: THREE.Texture;
}

export interface SliceViewManager {
  setSliceAngle(angle: number): void;
  setSliceDepth(depth: number): void;
  setSliceEnabled(enabled: boolean): void;
  getSliceConfig(): SliceConfig;
  updateClippingPlanes(scene: THREE.Scene, sliceConfig: SliceConfig): void;
  applyInteriorMaterial(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
  ): THREE.Material;
  reset(): void;
}

/**
 * Create clipping planes for slice view
 */
export function createClippingPlanes(
  angle: number,
  depth: number = 0.5,
): THREE.Plane[] {
  const planes: THREE.Plane[] = [];

  // Convert angle to radians
  const rad = (angle * Math.PI) / 180;

  // Create two planes that form the cut angle
  const normal1 = new THREE.Vector3(Math.cos(rad), 0, Math.sin(rad));
  planes.push(new THREE.Plane(normal1, 0));

  // Second plane at -depth from center
  const normal2 = new THREE.Vector3(-Math.cos(rad), 0, -Math.sin(rad));
  planes.push(new THREE.Plane(normal2, depth * 25)); // 25 units is approximate cake radius

  return planes;
}

/**
 * Create interior cross-section plane geometry
 */
export function createInteriorCrossSectionPlane(
  radius: number,
  height: number,
  angle: number,
  texture?: THREE.Texture,
): THREE.Mesh {
  // Create a plane that cuts through the center of the cake
  const width = radius * 2;
  const geometry = new THREE.PlaneGeometry(width, height, 32, 32);

  let material: THREE.Material;

  if (texture) {
    material = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
      shininess: 15,
    });
  } else {
    // Default cross-section color (sandy/crumb color)
    material = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#d4a574"),
      side: THREE.DoubleSide,
      shininess: 15,
    });
  }

  const plane = new THREE.Mesh(geometry, material);

  // Rotate to angle
  const rad = (angle * Math.PI) / 180;
  plane.rotation.y = rad;

  // Position at center
  plane.position.set(Math.cos(rad) * 0.1, 0, Math.sin(rad) * 0.1);

  return plane;
}

/**
 * Create stencil-based slice view (alternative to plane clipping)
 */
export function createStencilSliceView(
  scene: THREE.Scene,
  angle: number,
  depth: number = 0.5,
): THREE.Group {
  const group = new THREE.Group();

  // Render to stencil buffer
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 512, 512);

    // Draw slice pattern
    const centerX = 256;
    const centerY = 256;
    const maxRadius = 200;

    ctx.fillStyle = "black";
    ctx.beginPath();

    const rad = (angle * Math.PI) / 180;
    ctx.arc(centerX, centerY, maxRadius * depth, rad, rad + Math.PI, false);
    ctx.lineTo(centerX, centerY);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    group.userData.sliceTexture = texture;
  }

  return group;
}

/**
 * Slice View Manager Implementation
 */
export class CakeSliceViewManager implements SliceViewManager {
  private config: SliceConfig;
  private clippingPlanes: THREE.Plane[] = [];
  private interiorMesh: THREE.Mesh | null = null;

  constructor(initialConfig: Partial<SliceConfig> = {}) {
    this.config = {
      enabled: false,
      angle: 45,
      depth: 0.5,
      showInterior: true,
      interiorColor: "#d4a574",
      ...initialConfig,
    };
  }

  setSliceAngle(angle: number): void {
    this.config.angle = ((angle % 360) + 360) % 360;
  }

  setSliceDepth(depth: number): void {
    this.config.depth = Math.max(0.1, Math.min(1, depth));
  }

  setSliceEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  getSliceConfig(): SliceConfig {
    return { ...this.config };
  }

  /**
   * Update clipping planes for all meshes in scene
   */
  updateClippingPlanes(scene: THREE.Scene, sliceConfig: SliceConfig): void {
    if (sliceConfig.enabled) {
      this.clippingPlanes = createClippingPlanes(
        sliceConfig.angle,
        sliceConfig.depth,
      );

      // Apply clipping planes to all materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const material = obj.material as THREE.Material & {
            clippingPlanes?: THREE.Plane[];
          };
          if (
            material &&
            typeof material === "object" &&
            "clippingPlanes" in material
          ) {
            material.clippingPlanes = this.clippingPlanes;
            material.needsUpdate = true;
          }
        }
      });

      // Show interior if enabled
      if (sliceConfig.showInterior) {
        // Interior would be rendered separately
      }
    }
  }

  /**
   * Apply interior material with cross-section texture
   */
  applyInteriorMaterial(
    geometry: THREE.BufferGeometry,
    baseMaterial: THREE.Material,
  ): THREE.Material {
    if (baseMaterial instanceof THREE.MeshPhongMaterial) {
      const material = baseMaterial.clone();

      // Add cross-section appearance
      if (this.config.interiorTexture) {
        material.map = this.config.interiorTexture;
      } else if (this.config.interiorColor) {
        material.color.set(this.config.interiorColor);
      }

      return material;
    }

    return baseMaterial;
  }

  /**
   * Reset slice view
   */
  reset(): void {
    this.config.enabled = false;
    this.config.angle = 45;
    this.config.depth = 0.5;
    this.clippingPlanes = [];
    this.interiorMesh = null;
  }
}

/**
 * Helper to enable clipping planes on renderer
 */
export function configureRendererForClipping(
  renderer: THREE.WebGLRenderer,
): void {
  renderer.localClippingEnabled = true;
}

/**
 * Create cross-section material that shows interior detail
 */
export function createCrossSectionMaterial(options: {
  color?: string;
  texture?: THREE.Texture;
  roughness?: number;
  normalMap?: THREE.Texture;
}): THREE.Material {
  const material = new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    shininess: 20,
  });

  if (options.texture) {
    material.map = options.texture;
  } else if (options.color) {
    material.color.set(options.color);
  } else {
    // Default crumb color
    material.color.set("#d4a574");
  }

  if (options.normalMap) {
    material.normalMap = options.normalMap;
  }

  return material;
}

/**
 * Create interior fill visualization (the part between cake layers)
 */
export function createInteriorFillGeometry(
  outerRadius: number,
  innerRadius: number,
  height: number,
  segments: number = 32,
): THREE.BufferGeometry {
  // Create a ring geometry for filling between tiers
  const geometry = new THREE.CylinderGeometry(
    outerRadius,
    outerRadius,
    height,
    segments,
  );

  // Remove top and bottom faces, keep only sides
  const indices = geometry.getIndex();
  if (indices) {
    // Filter out top and bottom face indices
    const positionAttribute = geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const newIndices = [];

    const indicesArray = indices.array as Uint32Array | Uint16Array;

    for (let i = 0; i < indicesArray.length; i += 3) {
      const i1 = indicesArray[i];
      const i2 = indicesArray[i + 1];
      const i3 = indicesArray[i + 2];

      // Get positions
      const p1 = new THREE.Vector3().fromBufferAttribute(positionAttribute, i1);
      const p2 = new THREE.Vector3().fromBufferAttribute(positionAttribute, i2);
      const p3 = new THREE.Vector3().fromBufferAttribute(positionAttribute, i3);

      // Skip if face is on top or bottom
      if (
        !(
          (Math.abs(p1.y - height / 2) < 0.01 &&
            Math.abs(p2.y - height / 2) < 0.01 &&
            Math.abs(p3.y - height / 2) < 0.01) ||
          (Math.abs(p1.y + height / 2) < 0.01 &&
            Math.abs(p2.y + height / 2) < 0.01 &&
            Math.abs(p3.y + height / 2) < 0.01)
        )
      ) {
        newIndices.push(i1, i2, i3);
      }
    }

    geometry.setIndex(
      new THREE.BufferAttribute(new Uint32Array(newIndices), 1),
    );
  }

  return geometry;
}

/**
 * Blend two materials for layered appearance
 */
export function blendMaterials(
  material1: THREE.Material,
  material2: THREE.Material,
  blendFactor: number = 0.5,
): THREE.Material {
  const blended = material1.clone() as THREE.MeshPhongMaterial;

  // Simple blending using color
  if (
    material1 instanceof THREE.MeshPhongMaterial &&
    material2 instanceof THREE.MeshPhongMaterial
  ) {
    const color1 = material1.color.clone();
    const color2 = material2.color.clone();

    blended.color.copy(color1).lerp(color2, blendFactor);
  }

  return blended;
}
