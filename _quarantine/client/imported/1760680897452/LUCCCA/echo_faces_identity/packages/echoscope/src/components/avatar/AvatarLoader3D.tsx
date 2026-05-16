/**
* LUCCCA | EF
* File: <absolute path from repo root>
* Created: 2025-07-27 by AI
* Depends On: react, tailwindcss, framer-motion, @react-three/fiber
* Exposes: AvatarSelector, AvatarLoader3D, AvatarAnimator
* Location Notes: Used in Echo Assistant for avatar identity management
* Tests: packages/echoscope/tests/avatar
* ADR: ADR-echo-avatars.md
*/


import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useAvatarStore } from '../../hooks/useAvatarStore';

/**
 * AvatarLoader3D Component
 * Loads and displays 3D GLTF/GLB avatar model.
 */
const AvatarModel: React.FC<{ modelPath: string }> = ({ modelPath }) => {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} scale={1.2} />;
};

export const AvatarLoader3D: React.FC = () => {
  const { selected } = useAvatarStore();
  const modelPath = `/avatars/${selected}.glb`; // Placeholder

  return (
    <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />
      <AvatarModel modelPath={modelPath} />
      <OrbitControls />
    </Canvas>
  );
};
