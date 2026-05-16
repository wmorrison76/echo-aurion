/**
 * LUCCCA | SEG-C-CD-04
 * File: packages/echoscope/src/panes/CakeDesigner/DecorationToolkit.tsx
 * Created: 2025-07-27 by ChatGPT
 * Depends On: react, @react-three/fiber, three
 * Exposes: React component <DecorationToolkit />
 * Location Notes: Consumed by CakeDesigner pane & sub-tools
 * Tests: __tests__/cake-designer/decorationToolkit.test.tsx
 * ADR: docs/rfc/RFC-cake-designer-costing-and-rendering.md
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface PipingPath {
  id: string;
  points: [number, number, number][]; // meters
  radius: number; // meters
  color?: string;
}

export interface DecorationToolkitProps {
  piping: PipingPath[];
}

export const DecorationToolkit: React.FC<DecorationToolkitProps> = ({ piping }) => {
  const tubes = useMemo(() => {
    return piping.map(p => {
      const curve = new THREE.CatmullRomCurve3(p.points.map(x => new THREE.Vector3(...x)));
      const geometry = new THREE.TubeGeometry(curve, 100, p.radius, 16, false);
      const material = new THREE.MeshStandardMaterial({ color: p.color || '#fff' });
      return { p, geometry, material };
    });
  }, [piping]);

  return (
    <group name="decoration-toolkit">
      {tubes.map(({ p, geometry, material }) => (
        <mesh key={p.id} geometry={geometry} material={material} castShadow receiveShadow />
      ))}
    </group>
  );
};
