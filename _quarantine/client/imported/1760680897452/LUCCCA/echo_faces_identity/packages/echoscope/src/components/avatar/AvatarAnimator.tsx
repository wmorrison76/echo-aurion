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


import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

/**
 * AvatarAnimator
 * Applies simple idle rotation and talking animation states.
 */
export const useAvatarAnimator = (isTalking: boolean) => {
  const ref = useRef<THREE.Object3D>(null);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.2;
      if (isTalking) {
        ref.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.02;
      }
    }
  });

  return ref;
};
