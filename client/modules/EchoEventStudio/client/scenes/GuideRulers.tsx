import React from "react";
export interface GuideRulersProps {
  x?: number;
  z?: number;
  visible?: boolean;
}
export function GuideRulers({
  x = 0,
  z = 0,
  visible = false,
}: GuideRulersProps) {
  if (!visible) return null;
  return (
    <group>
      {" "}
      {/* X guide (horizontal) */}{" "}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
        {" "}
        <planeGeometry args={[1000, 0.02]} />{" "}
        <meshBasicMaterial color="#00ffa2" transparent opacity={0.6} />{" "}
      </mesh>{" "}
      {/* Z guide (vertical) */}{" "}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
        {" "}
        <planeGeometry args={[0.02, 1000]} />{" "}
        <meshBasicMaterial color="#00a2ff" transparent opacity={0.6} />{" "}
      </mesh>{" "}
      {/* Roller intersection point */}{" "}
      <mesh position={[x, 0.06, z]}>
        {" "}
        <torusGeometry args={[0.2, 0.02, 8, 24]} />{" "}
        <meshBasicMaterial color="#ffffff" />{" "}
      </mesh>{" "}
    </group>
  );
}
