/**
 * Three.js Performance Optimization Utilities
 * Handles memory management, LOD, and rendering optimizations
 */

import * as THREE from "three";

export interface PerformanceConfig {
  maxGeometries: number;
  useLOD: boolean;
  enableShadows: boolean;
  shadowMapResolution: "low" | "medium" | "high";
  enablePostProcessing: boolean;
  targetFrameRate: number;
}

const defaultConfig: PerformanceConfig = {
  maxGeometries: 100,
  useLOD: true,
  enableShadows: true,
  shadowMapResolution: "medium",
  enablePostProcessing: false,
  targetFrameRate: 60,
};

/**
 * Detect device performance tier
 */
export function detectPerformanceTier(): "low" | "medium" | "high" {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");

  if (!gl) return "low";

  const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

  if (maxTextures >= 16 && maxRenderBufferSize >= 4096) {
    return "high";
  } else if (maxTextures >= 8 && maxRenderBufferSize >= 2048) {
    return "medium";
  }

  return "low";
}

/**
 * Get optimized config based on performance tier
 */
export function getOptimizedConfig(
  tier: "low" | "medium" | "high" = "medium"
): PerformanceConfig {
  if (tier === "low") {
    return {
      maxGeometries: 20,
      useLOD: false,
      enableShadows: false,
      shadowMapResolution: "low",
      enablePostProcessing: false,
      targetFrameRate: 30,
    };
  }

  if (tier === "high") {
    return {
      maxGeometries: 200,
      useLOD: true,
      enableShadows: true,
      shadowMapResolution: "high",
      enablePostProcessing: true,
      targetFrameRate: 60,
    };
  }

  return defaultConfig;
}

/**
 * Geometry pooling for memory efficiency
 */
export class GeometryPool {
  private geometries: Map<string, THREE.BufferGeometry[]> = new Map();
  private maxPerType: number;

  constructor(maxPerType: number = 20) {
    this.maxPerType = maxPerType;
  }

  /**
   * Acquire geometry from pool or create new
   */
  acquire(
    key: string,
    factory: () => THREE.BufferGeometry
  ): THREE.BufferGeometry {
    if (!this.geometries.has(key)) {
      this.geometries.set(key, []);
    }

    const pool = this.geometries.get(key)!;
    if (pool.length > 0) {
      return pool.pop()!;
    }

    return factory();
  }

  /**
   * Release geometry back to pool
   */
  release(key: string, geometry: THREE.BufferGeometry): void {
    if (!this.geometries.has(key)) {
      this.geometries.set(key, []);
    }

    const pool = this.geometries.get(key)!;
    if (pool.length < this.maxPerType) {
      pool.push(geometry);
    } else {
      geometry.dispose();
    }
  }

  /**
   * Clear all pooled geometries
   */
  clear(): void {
    this.geometries.forEach((pool) => {
      pool.forEach((geometry) => geometry.dispose());
    });
    this.geometries.clear();
  }
}

/**
 * Material pooling for memory efficiency
 */
export class MaterialPool {
  private materials: Map<string, THREE.Material[]> = new Map();
  private maxPerType: number;

  constructor(maxPerType: number = 20) {
    this.maxPerType = maxPerType;
  }

  /**
   * Acquire material from pool or create new
   */
  acquire(
    key: string,
    factory: () => THREE.Material
  ): THREE.Material {
    if (!this.materials.has(key)) {
      this.materials.set(key, []);
    }

    const pool = this.materials.get(key)!;
    if (pool.length > 0) {
      return pool.pop()!;
    }

    return factory();
  }

  /**
   * Release material back to pool
   */
  release(key: string, material: THREE.Material): void {
    if (!this.materials.has(key)) {
      this.materials.set(key, []);
    }

    const pool = this.materials.get(key)!;
    if (pool.length < this.maxPerType) {
      pool.push(material);
    } else {
      material.dispose();
    }
  }

  /**
   * Clear all pooled materials
   */
  clear(): void {
    this.materials.forEach((pool) => {
      pool.forEach((material) => material.dispose());
    });
    this.materials.clear();
  }
}

/**
 * LOD (Level of Detail) manager
 */
export class LODManager {
  private lods: Map<string, THREE.LOD> = new Map();

  /**
   * Create LOD for mesh
   */
  createLOD(
    key: string,
    meshes: Array<{ mesh: THREE.Mesh; distance: number }>
  ): THREE.LOD {
    const lod = new THREE.LOD();

    meshes.forEach(({ mesh, distance }) => {
      lod.addLevel(mesh, distance);
    });

    this.lods.set(key, lod);
    return lod;
  }

  /**
   * Get LOD by key
   */
  getLOD(key: string): THREE.LOD | undefined {
    return this.lods.get(key);
  }

  /**
   * Clear all LODs
   */
  clear(): void {
    this.lods.clear();
  }
}

/**
 * Renderer stats for monitoring
 */
export class RendererStats {
  private frameTime: number[] = [];
  private maxFrames: number = 120;

  /**
   * Record frame time
   */
  recordFrame(deltaTime: number): void {
    this.frameTime.push(deltaTime);
    if (this.frameTime.length > this.maxFrames) {
      this.frameTime.shift();
    }
  }

  /**
   * Get average FPS
   */
  getAverageFPS(): number {
    if (this.frameTime.length === 0) return 0;
    const avgTime = this.frameTime.reduce((a, b) => a + b) / this.frameTime.length;
    return 1 / avgTime;
  }

  /**
   * Get peak FPS
   */
  getPeakFPS(): number {
    if (this.frameTime.length === 0) return 0;
    const minTime = Math.min(...this.frameTime);
    return 1 / minTime;
  }

  /**
   * Get lowest FPS
   */
  getLowestFPS(): number {
    if (this.frameTime.length === 0) return 0;
    const maxTime = Math.max(...this.frameTime);
    return 1 / maxTime;
  }

  /**
   * Clear stats
   */
  clear(): void {
    this.frameTime = [];
  }
}

/**
 * Request animation frame with target FPS
 */
export function createThrottledAnimationFrame(
  callback: (deltaTime: number) => void,
  targetFPS: number = 60
): () => void {
  let lastTime = performance.now();
  const frameTime = 1000 / targetFPS;
  let requestId: number | null = null;

  const animate = (currentTime: number) => {
    const deltaTime = currentTime - lastTime;

    if (deltaTime >= frameTime) {
      callback(deltaTime / 1000);
      lastTime = currentTime;
    }

    requestId = requestAnimationFrame(animate);
  };

  requestId = requestAnimationFrame(animate);

  return () => {
    if (requestId !== null) {
      cancelAnimationFrame(requestId);
    }
  };
}

/**
 * Cleanup helper for Three.js resources
 */
export function cleanupThreeResources(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer
): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  });

  renderer.dispose();
}
