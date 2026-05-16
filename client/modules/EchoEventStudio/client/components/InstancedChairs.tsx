import React, { useMemo, useRef, useEffect } from "react";
import { InstancedMesh, Matrix4, Object3D } from "three";
import { useThree } from "@react-three/fiber";
export interface InstancedChairsProps {
  positions: [number, number, number][];
  color?: string;
}
export function InstancedChairs({
  positions,
  color = "#8b7355",
}: InstancedChairsProps) {
  const ref = useRef<InstancedMesh>(null);
  const { scene } = useThree();
  const count = positions.length; // Update instance matrices when positions change useEffect(() => { if (!ref.current || count === 0) return; const dummy = new Object3D(); const matrix = new Matrix4(); positions.forEach((pos, i) => { dummy.position.set(pos[0], pos[1], pos[2]); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); ref.current!.setMatrixAt(i, dummy.matrix); }); ref.current.instanceMatrix.needsUpdate = true; }, [positions, count]); if (count === 0) return null; return ( <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow > <boxGeometry args={[0.45, 0.9, 0.45]} /> <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} /> </instancedMesh> );
}
