/**
 * CakeStands — 10 procedural 3D cake stand designs (iter153 · A4).
 *
 * Each stand rendered as a small scene of primitives.
 * Used in place of the default circular disc to elevate the cake.
 */
import React from "react";
import * as THREE from "three";

export type StandKind =
  | "classic_silver" | "gold_ornate" | "rose_gold_modern" | "crystal_pedestal"
  | "rustic_wood" | "clear_acrylic" | "tiered_metal" | "floating_illusion"
  | "marble_platform" | "black_matte";

export const STAND_CATALOG: { kind: StandKind; title: string; palette: string }[] = [
  { kind: "classic_silver",    title: "Classic Silver",      palette: "#c9cbce" },
  { kind: "gold_ornate",       title: "Gold Ornate",         palette: "#d4af37" },
  { kind: "rose_gold_modern",  title: "Rose Gold Modern",    palette: "#c48a72" },
  { kind: "crystal_pedestal",  title: "Crystal Pedestal",    palette: "#e0f1ff" },
  { kind: "rustic_wood",       title: "Rustic Wood",         palette: "#8b6a4a" },
  { kind: "clear_acrylic",     title: "Clear Acrylic",       palette: "#e8f6ff" },
  { kind: "tiered_metal",      title: "Tiered Metal",        palette: "#8a8d91" },
  { kind: "floating_illusion", title: "Floating Illusion",   palette: "#14131b" },
  { kind: "marble_platform",   title: "Marble Platform",     palette: "#f5f0eb" },
  { kind: "black_matte",       title: "Black Matte",         palette: "#1a1a1a" },
];

interface StandProps { kind: StandKind; color?: string; }

export function CakeStand({ kind, color }: StandProps) {
  const entry = STAND_CATALOG.find(s => s.kind === kind);
  const baseColor = color ?? entry?.palette ?? "#c9cbce";

  // Floor + shared shadow plane
  const Floor = (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#0b1020" roughness={1} />
    </mesh>
  );

  switch (kind) {
    case "classic_silver":
      return (
        <group>
          {Floor}
          <mesh position={[0, -0.05, 0]} receiveShadow><cylinderGeometry args={[1.7, 1.9, 0.1, 48]} /><meshStandardMaterial color={baseColor} roughness={0.28} metalness={0.9} /></mesh>
        </group>
      );

    case "gold_ornate":
      return (
        <group>
          {Floor}
          <mesh position={[0, -0.08, 0]} receiveShadow><cylinderGeometry args={[1.75, 2.05, 0.06, 48]} /><meshStandardMaterial color={baseColor} roughness={0.22} metalness={1} /></mesh>
          <mesh position={[0, -0.04, 0]} receiveShadow><torusGeometry args={[1.78, 0.035, 10, 40]} /><meshStandardMaterial color={baseColor} roughness={0.22} metalness={1} /></mesh>
          <mesh position={[0, -0.005, 0]} receiveShadow><cylinderGeometry args={[1.65, 1.7, 0.04, 48]} /><meshStandardMaterial color={baseColor} roughness={0.22} metalness={1} /></mesh>
        </group>
      );

    case "rose_gold_modern":
      return (
        <group>
          {Floor}
          <mesh position={[0, -0.05, 0]} receiveShadow><cylinderGeometry args={[1.7, 1.7, 0.08, 64]} /><meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.85} /></mesh>
          <mesh position={[0, -0.1, 0]}><torusGeometry args={[1.72, 0.02, 8, 48]} /><meshStandardMaterial color={baseColor} roughness={0.35} metalness={0.85} /></mesh>
        </group>
      );

    case "crystal_pedestal":
      return (
        <group>
          {Floor}
          <mesh position={[0, -0.05, 0]} castShadow><cylinderGeometry args={[1.6, 1.8, 0.1, 6]} /><meshPhysicalMaterial color={baseColor} roughness={0.05} metalness={0} transmission={0.9} thickness={0.1} ior={1.45} /></mesh>
          <mesh position={[0, -0.3, 0]}><cylinderGeometry args={[0.9, 1.1, 0.45, 12]} /><meshPhysicalMaterial color={baseColor} roughness={0.05} metalness={0} transmission={0.85} thickness={0.2} ior={1.45} /></mesh>
        </group>
      );

    case "rustic_wood":
      return (
        <group>
          {Floor}
          {/* Wooden slab with bark-edge effect via polygonal cylinder */}
          <mesh position={[0, -0.05, 0]} receiveShadow castShadow><cylinderGeometry args={[1.85, 1.95, 0.12, 32]} /><meshStandardMaterial color={baseColor} roughness={0.9} metalness={0} /></mesh>
          <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.1, 1.8, 48]} /><meshStandardMaterial color={"#6f5436"} roughness={0.95} side={THREE.DoubleSide} /></mesh>
        </group>
      );

    case "clear_acrylic":
      return (
        <group>
          {Floor}
          <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[1.7, 1.7, 0.1, 48]} /><meshPhysicalMaterial color={baseColor} roughness={0.03} metalness={0} transmission={0.95} thickness={0.1} ior={1.4} /></mesh>
          <mesh position={[-1.1, -0.3, 0]}><boxGeometry args={[0.08, 0.55, 0.08]} /><meshPhysicalMaterial color={baseColor} roughness={0.03} transmission={0.95} thickness={0.1} ior={1.4} /></mesh>
          <mesh position={[1.1, -0.3, 0]}><boxGeometry args={[0.08, 0.55, 0.08]} /><meshPhysicalMaterial color={baseColor} roughness={0.03} transmission={0.95} thickness={0.1} ior={1.4} /></mesh>
          <mesh position={[0, -0.3, -1.1]}><boxGeometry args={[0.08, 0.55, 0.08]} /><meshPhysicalMaterial color={baseColor} roughness={0.03} transmission={0.95} thickness={0.1} ior={1.4} /></mesh>
        </group>
      );

    case "tiered_metal":
      return (
        <group>
          {Floor}
          <mesh position={[0, -0.07, 0]}><cylinderGeometry args={[1.75, 1.9, 0.05, 48]} /><meshStandardMaterial color={baseColor} roughness={0.4} metalness={0.9} /></mesh>
          <mesh position={[0, -0.15, 0]}><cylinderGeometry args={[0.15, 0.15, 0.16, 16]} /><meshStandardMaterial color={baseColor} roughness={0.4} metalness={0.9} /></mesh>
          <mesh position={[0, -0.28, 0]}><cylinderGeometry args={[1.2, 1.4, 0.04, 48]} /><meshStandardMaterial color={baseColor} roughness={0.4} metalness={0.9} /></mesh>
        </group>
      );

    case "floating_illusion":
      return (
        <group>
          {Floor}
          {/* Tiny near-invisible base — cake appears to float */}
          <mesh position={[0, -0.095, 0]}><cylinderGeometry args={[0.1, 0.1, 0.02, 20]} /><meshStandardMaterial color={baseColor} roughness={1} metalness={0} /></mesh>
          <mesh position={[0, -0.1, 0]}><cylinderGeometry args={[1.9, 1.9, 0.005, 40]} /><meshStandardMaterial color={"#0b1020"} roughness={1} transparent opacity={0.25} /></mesh>
        </group>
      );

    case "marble_platform":
      return (
        <group>
          {Floor}
          <mesh position={[0, -0.06, 0]} receiveShadow><cylinderGeometry args={[1.95, 2.0, 0.18, 48]} /><meshStandardMaterial color={baseColor} roughness={0.15} metalness={0.08} /></mesh>
          {/* veining simulated via thin darker ring */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.3, 1.93, 48]} /><meshStandardMaterial color={"#d6cfc3"} roughness={0.2} side={THREE.DoubleSide} /></mesh>
        </group>
      );

    case "black_matte":
    default:
      return (
        <group>
          {Floor}
          <mesh position={[0, -0.05, 0]} receiveShadow><cylinderGeometry args={[1.7, 1.9, 0.1, 48]} /><meshStandardMaterial color={baseColor} roughness={0.95} metalness={0} /></mesh>
        </group>
      );
  }
}
