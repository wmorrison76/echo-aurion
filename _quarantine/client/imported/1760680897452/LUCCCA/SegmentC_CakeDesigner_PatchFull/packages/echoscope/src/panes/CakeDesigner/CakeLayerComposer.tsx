/**
 * LUCCCA | SEG-C-CD-03
 * File: packages/echoscope/src/panes/CakeDesigner/CakeLayerComposer.tsx
 * Created: 2025-07-27 by ChatGPT
 * Depends On: react, @react-three/fiber, three
 * Exposes: React component <CakeLayerComposer /> + hooks
 * Location Notes: Consumed by CakeDesigner pane & sub-tools
 * Tests: __tests__/cake-designer/cakeLayerComposer.test.tsx
 * ADR: docs/rfc/RFC-cake-designer-costing-and-rendering.md
 */

import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getMaterial, FrostingType } from './MaterialManager';

export interface CakeLayer {
  id: string;
  radius: number;   // in cm
  height: number;   // in cm
  frosting: FrostingType;
  color?: string;
  y: number;        // cumulative height offset
}

export interface CakeLayerComposerProps {
  layers: CakeLayer[];
  wireframe?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

const CM_TO_M = 0.01;

export const CakeLayerComposer: React.FC<CakeLayerComposerProps> = ({
  layers,
  wireframe = false,
  castShadow = true,
  receiveShadow = true
}) => {
  const meshes = useMemo(() => {
    return layers.map(layer => ({
      layer,
      geometry: new THREE.CylinderGeometry(layer.radius * CM_TO_M, layer.radius * CM_TO_M, layer.height * CM_TO_M, 64, 1, false),
      material: getMaterial(layer.frosting, { color: layer.color })
    }));
  }, [layers]);

  useFrame(() => {
    // could animate subtle breathing/shimmer if desired
  });

  return (
    <group name="cake-layer-composer">
      {meshes.map(({ layer, geometry, material }) => (
        <mesh
          key={layer.id}
          geometry={geometry}
          material={material}
          position={[0, (layer.y + layer.height / 2) * CM_TO_M, 0]}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          renderOrder={layers.indexOf(layer)}
        >
          {wireframe && <meshBasicMaterial wireframe color="black" />}
        </mesh>
      ))}
    </group>
  );
};
