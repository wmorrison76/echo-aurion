/**
 * LUCCCA | CD-09 (PATCH V1)
 * React Three Fiber + drei OrbitControls wrapper.
 */
import React, { useMemo } from 'react';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';

export const OrbitControls: React.FC<{ enableDamping?: boolean }> = ({ enableDamping = true }) => {
  const props = useMemo(() => ({ enableDamping }), [enableDamping]);
  return <DreiOrbitControls {...props} />;
};
