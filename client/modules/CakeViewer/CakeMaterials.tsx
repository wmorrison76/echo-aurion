/**
 * CakeMaterials — photoreal PBR material presets for finish types (iter154 A+).
 *
 * Returns <meshPhysicalMaterial> JSX with appropriate transmission/clearcoat/
 * sheen/thickness for each finish. Works with HDRI environment for real reflections.
 */
import React from "react";
import * as THREE from "three";

export function FinishMaterial({ finish, color, texture, metalness = 0 }: {
  finish: "buttercream" | "fondant" | "drip" | "mirror" | "naked" | "semi-naked";
  color: string;
  texture?: THREE.Texture | null;
  metalness?: number;
}) {
  switch (finish) {
    case "mirror":
      // Mirror glaze — high-gloss reflective, slight transmission for depth
      return (
        <meshPhysicalMaterial
          color={color}
          map={texture || undefined}
          roughness={0.04}
          metalness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.02}
          reflectivity={1}
          envMapIntensity={1.2}
          side={THREE.DoubleSide}
        />
      );
    case "fondant":
      // Rolled fondant — satin smooth, slight sheen, subtle sub-surface
      return (
        <meshPhysicalMaterial
          color={color}
          map={texture || undefined}
          roughness={0.32}
          metalness={0.02}
          clearcoat={0.25}
          clearcoatRoughness={0.35}
          sheen={0.4}
          sheenRoughness={0.6}
          sheenColor={new THREE.Color(color).multiplyScalar(1.05)}
          envMapIntensity={0.7}
          side={THREE.DoubleSide}
        />
      );
    case "drip":
      // Chocolate ganache drip — glossy, deep, slight metal shimmer
      return (
        <meshPhysicalMaterial
          color={color}
          map={texture || undefined}
          roughness={0.22}
          metalness={0.12}
          clearcoat={0.75}
          clearcoatRoughness={0.12}
          envMapIntensity={0.9}
          side={THREE.DoubleSide}
        />
      );
    case "naked":
      // Naked — crumb-coat only — matte and slightly porous
      return (
        <meshPhysicalMaterial
          color={color}
          map={texture || undefined}
          roughness={0.94}
          metalness={0}
          sheen={0.08}
          sheenColor="#c9a97e"
          envMapIntensity={0.3}
          side={THREE.DoubleSide}
        />
      );
    case "semi-naked":
      return (
        <meshPhysicalMaterial
          color={color}
          map={texture || undefined}
          roughness={0.7}
          metalness={0}
          sheen={0.18}
          sheenColor="#e0c399"
          envMapIntensity={0.45}
          side={THREE.DoubleSide}
        />
      );
    case "buttercream":
    default:
      // Swiss buttercream — velvet, subtle sheen, slight sub-surface warmth
      return (
        <meshPhysicalMaterial
          color={color}
          map={texture || undefined}
          roughness={0.55}
          metalness={metalness || 0}
          sheen={0.35}
          sheenRoughness={0.75}
          sheenColor={new THREE.Color(color).lerp(new THREE.Color("#fff5e0"), 0.3)}
          clearcoat={0.08}
          clearcoatRoughness={0.9}
          envMapIntensity={0.55}
          side={THREE.DoubleSide}
        />
      );
  }
}

// Filling / gelée / mousse material — moderate translucency
export function InteriorMaterial({ color, kind = "sponge" }: { color: string; kind?: "sponge" | "gelee" | "mousse" | "cremeux" | "feuilletine" | "ganache" | "praline" | "curd" | "compote" | "joconde" | "dacquoise" }) {
  switch (kind) {
    case "gelee":
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.15}
          metalness={0}
          transmission={0.65}
          thickness={0.3}
          ior={1.35}
          attenuationDistance={0.4}
          attenuationColor={color}
          clearcoat={0.6}
          clearcoatRoughness={0.08}
          envMapIntensity={0.9}
        />
      );
    case "mousse":
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.78}
          metalness={0}
          sheen={0.4}
          sheenRoughness={0.85}
          sheenColor={new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.5)}
          envMapIntensity={0.5}
        />
      );
    case "cremeux":
    case "curd":
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.35}
          metalness={0}
          sheen={0.25}
          clearcoat={0.35}
          clearcoatRoughness={0.3}
          envMapIntensity={0.7}
        />
      );
    case "ganache":
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.22}
          metalness={0.1}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
          envMapIntensity={0.85}
        />
      );
    case "feuilletine":
    case "praline":
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.9}
          metalness={0}
          clearcoat={0.05}
          envMapIntensity={0.4}
        />
      );
    case "compote":
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.4}
          metalness={0}
          transmission={0.2}
          thickness={0.15}
          ior={1.3}
          clearcoat={0.35}
          envMapIntensity={0.75}
        />
      );
    case "joconde":
    case "dacquoise":
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.92}
          metalness={0}
          sheen={0.05}
          envMapIntensity={0.4}
        />
      );
    case "sponge":
    default:
      return (
        <meshPhysicalMaterial
          color={color}
          roughness={0.85}
          metalness={0}
          sheen={0.12}
          sheenColor={new THREE.Color(color).lerp(new THREE.Color("#fff5dc"), 0.3)}
          envMapIntensity={0.45}
        />
      );
  }
}
