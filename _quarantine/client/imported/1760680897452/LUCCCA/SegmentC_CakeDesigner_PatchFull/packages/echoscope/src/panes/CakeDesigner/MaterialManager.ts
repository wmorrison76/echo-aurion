/**
 * LUCCCA | SEG-C-CD-02
 * File: packages/echoscope/src/panes/CakeDesigner/MaterialManager.ts
 * Created: 2025-07-27 by ChatGPT
 * Depends On: three, @react-three/fiber
 * Exposes: createFondantMaterial, createGanacheMaterial, createChocolateGlossMaterial
 * Location Notes: Consumed by CakeDesigner pane & sub-tools
 * Tests: __tests__/cake-designer/materialManager.test.ts
 * ADR: docs/rfc/RFC-cake-designer-costing-and-rendering.md
 */

import * as THREE from 'three';

export type FrostingType = 'fondant' | 'ganache' | 'chocolate_gloss';

export interface FrostingOptions {
  color?: string;
  roughness?: number;
  metalness?: number;
  sheen?: number;
  clearcoat?: number;
  normalScale?: number;
}

export function createFondantMaterial(opts: FrostingOptions = {}): THREE.MeshPhysicalMaterial {
  const {
    color = '#fff4f0',
    roughness = 0.85,
    metalness = 0.0,
    sheen = 0.25,
    clearcoat = 0.1
  } = opts;
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    sheen,
    clearcoat,
    thickness: 0.5,
    transmission: 0.0
  });
}

export function createGanacheMaterial(opts: FrostingOptions = {}): THREE.MeshPhysicalMaterial {
  const {
    color = '#3e1f0d',
    roughness = 0.6,
    metalness = 0.05,
    clearcoat = 0.2
  } = opts;
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat
  });
}

export function createChocolateGlossMaterial(opts: FrostingOptions = {}): THREE.MeshPhysicalMaterial {
  const {
    color = '#2b1208',
    roughness = 0.2,
    metalness = 0.1,
    clearcoat = 0.6
  } = opts;
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat
  });
}

export function getMaterial(type: FrostingType, opts?: FrostingOptions): THREE.Material {
  switch (type) {
    case 'fondant': return createFondantMaterial(opts);
    case 'ganache': return createGanacheMaterial(opts);
    case 'chocolate_gloss': return createChocolateGlossMaterial(opts);
    default: return createFondantMaterial(opts);
  }
}
