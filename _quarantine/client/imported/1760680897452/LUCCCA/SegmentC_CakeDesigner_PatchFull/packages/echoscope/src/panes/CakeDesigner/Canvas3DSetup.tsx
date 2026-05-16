/**
 * LUCCCA | SEG-C-CD-01
 * File: packages/echoscope/src/panes/CakeDesigner/Canvas3DSetup.tsx
 * Created: 2025-07-27 by ChatGPT
 * Depends On: react, @react-three/fiber, @react-three/drei, three
 * Exposes: React component <Canvas3DSetup />
 * Location Notes: Consumed by CakeDesigner pane & sub-tools
 * Tests: __tests__/cake-designer/canvas3dsetup.test.tsx
 * ADR: docs/rfc/RFC-cake-designer-costing-and-rendering.md
 */

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats, Environment, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';

export interface Canvas3DSetupProps {
  children?: React.ReactNode;
  background?: string;
  shadows?: boolean;
  perfMode?: 'auto' | 'high' | 'low';
}

export const Canvas3DSetup: React.FC<Canvas3DSetupProps> = ({
  children,
  background = '#faf7f2',
  shadows = true,
  perfMode = 'auto'
}) => {
  const glProps = useMemo(() => ({
    antialias: perfMode !== 'low',
    preserveDrawingBuffer: true
  }), [perfMode]);

  return (
    <Canvas
      gl={glProps}
      dpr={perfMode === 'high' ? [1, 2] : [1, 1.5]}
      shadows={shadows}
      onCreated={({ gl, scene }) => {
        scene.background = new THREE.Color(background);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      camera={{ position: [6, 6, 6], fov: 45 }}
    >
      <color args={[background]} attach="background" />
      <ambientLight intensity={0.4} />
      <directionalLight intensity={0.9} position={[5, 10, 5]} castShadow />
      <Suspense fallback={null}>
        <Environment preset="studio" />
        {children}
      </Suspense>
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Stats showPanel={0} className="r3f-stats" />
    </Canvas>
  );
};
export default Canvas3DSetup;
