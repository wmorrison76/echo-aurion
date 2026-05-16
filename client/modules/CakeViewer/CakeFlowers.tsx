/**
 * CakeFlowers — procedural 3D flower arrangements for cake decoration (iter153 · A3).
 *
 * 10 flower species (rose, peony, orchid, ranunculus, dahlia, calla lily, sweet pea,
 * hydrangea, eucalyptus leaf, dogwood) + 8 arrangement styles (cascading, sugar peonies,
 * orchid spray, tropical, garden mix, ranunculus cluster, dahlia crown, eucalyptus greenery).
 *
 * Inspired by Ron Ben-Israel's 10+ species library, Sylvia Weinstock's cascading
 * roses, and Maggie Austin's rosette variation.
 *
 * Each flower is a small React component rendering layered petals (sphere/cone
 * primitives). Arrangement positions placed in a curve/cluster pattern around
 * a tier or as a topper.
 */
import React, { useMemo } from "react";
import * as THREE from "three";

export type FlowerSpecies =
  | "rose" | "peony" | "orchid" | "ranunculus" | "dahlia"
  | "calla_lily" | "sweet_pea" | "hydrangea" | "eucalyptus" | "dogwood";

export interface FlowerArrangement {
  id: string;
  title: string;
  species: FlowerSpecies[];     // which species to mix
  count: number;                 // total blooms
  style: "cascading" | "cluster" | "crown" | "spray" | "sideways";
  palette: string[];             // fallback colors if not overriding
}

export const FLOWER_ARRANGEMENTS: FlowerArrangement[] = [
  { id: "cascading_roses",   title: "Cascading Roses",             species: ["rose", "eucalyptus"],            count: 22, style: "cascading", palette: ["#fff2f2","#ffb3b3","#c73a5b","#5a7d4a"] },
  { id: "sugar_peonies",     title: "Sugar Peonies (Weinstock)",   species: ["peony", "eucalyptus"],           count: 14, style: "crown",     palette: ["#fff2e7","#fdc1c5","#f8a4b8","#6b8e57"] },
  { id: "orchid_spray",      title: "Orchid Spray (Ben-Israel)",   species: ["orchid", "eucalyptus"],          count: 12, style: "spray",     palette: ["#ffffff","#f5e7ff","#d4afff","#557845"] },
  { id: "tropical_mix",      title: "Tropical Mix",                species: ["calla_lily", "orchid"],          count: 16, style: "sideways",  palette: ["#ff7e5f","#feb47b","#ffd166","#06aed5"] },
  { id: "garden_mix",        title: "Garden Mix",                  species: ["rose", "ranunculus", "sweet_pea", "eucalyptus"], count: 28, style: "cluster", palette: ["#ffe1e1","#f9c784","#c8d5b9","#a0622a","#fff"] },
  { id: "ranunculus_cluster",title: "Ranunculus Cluster",          species: ["ranunculus"],                    count: 18, style: "cluster",   palette: ["#ffffff","#fff5ca","#ffc7c7","#ffb4a2"] },
  { id: "dahlia_crown",      title: "Dahlia Crown",                species: ["dahlia", "eucalyptus"],          count: 10, style: "crown",     palette: ["#8b0000","#d90429","#f4a261","#2a9d8f"] },
  { id: "eucalyptus_greenery", title: "Eucalyptus Greenery",       species: ["eucalyptus"],                    count: 26, style: "cascading", palette: ["#3f6b4a","#5a7d4a","#87a76f","#c8d5b9"] },
];

// ─────────────────────────────────────────────
// Flower species primitives
// ─────────────────────────────────────────────
function Rose({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      {/* Outer petals */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 6) * Math.PI * 2) * 0.05, 0, Math.sin((i / 6) * Math.PI * 2) * 0.05]} rotation={[0, (i / 6) * Math.PI * 2, Math.PI / 6]}>
          <sphereGeometry args={[0.055, 10, 6, 0, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Inner bud */}
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
    </group>
  );
}

function Peony({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 10) * Math.PI * 2) * 0.055, 0.01, Math.sin((i / 10) * Math.PI * 2) * 0.055]} rotation={[Math.PI / 5, (i / 10) * Math.PI * 2, 0]}>
          <sphereGeometry args={[0.065, 10, 6, 0, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
    </group>
  );
}

function Orchid({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      {/* 5-petal butterfly shape */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.06, 0, Math.sin((i / 5) * Math.PI * 2) * 0.06]} rotation={[Math.PI / 2.5, (i / 5) * Math.PI * 2, 0]}>
          <sphereGeometry args={[0.04, 10, 6, 0, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* throat */}
      <mesh>
        <sphereGeometry args={[0.02, 10, 8]} />
        <meshStandardMaterial color="#c49b4f" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Ranunculus({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 14) * Math.PI * 2) * 0.045, 0.005, Math.sin((i / 14) * Math.PI * 2) * 0.045]}>
          <sphereGeometry args={[0.022, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.015, 0]}>
        <sphereGeometry args={[0.025, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Dahlia({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 14) * Math.PI * 2) * 0.06, 0, Math.sin((i / 14) * Math.PI * 2) * 0.06]} rotation={[0, (i / 14) * Math.PI * 2, Math.PI / 3]}>
          <coneGeometry args={[0.014, 0.055, 5]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial color="#facc15" roughness={0.5} />
      </mesh>
    </group>
  );
}

function CallaLily({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale} rotation={[-Math.PI / 4, 0, 0]}>
      <mesh>
        <coneGeometry args={[0.04, 0.11, 6, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.006, 0.09, 6]} />
        <meshStandardMaterial color="#e8c84f" roughness={0.4} />
      </mesh>
    </group>
  );
}

function SweetPea({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.015, 0]} rotation={[0, 0, Math.PI / 8]}>
        <sphereGeometry args={[0.03, 10, 8, 0, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.015, 0, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <sphereGeometry args={[0.022, 10, 6, 0, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Hydrangea({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.04, (i % 2) * 0.015, Math.sin(a) * 0.04]}>
            <boxGeometry args={[0.025, 0.005, 0.025]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function Eucalyptus({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[i * 0.04 - 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2 + (i % 2 === 0 ? 0.25 : -0.25)]}>
          <sphereGeometry args={[0.022, 8, 6]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Dogwood({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 4) * Math.PI * 2) * 0.045, 0, Math.sin((i / 4) * Math.PI * 2) * 0.045]} rotation={[Math.PI / 2.5, (i / 4) * Math.PI * 2, 0]}>
          <sphereGeometry args={[0.035, 10, 6, 0, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.015, 10, 8]} />
        <meshStandardMaterial color="#f4d35e" roughness={0.5} />
      </mesh>
    </group>
  );
}

const SPECIES_COMPONENT: Record<FlowerSpecies, React.FC<{ color: string; scale?: number }>> = {
  rose: Rose, peony: Peony, orchid: Orchid, ranunculus: Ranunculus, dahlia: Dahlia,
  calla_lily: CallaLily, sweet_pea: SweetPea, hydrangea: Hydrangea, eucalyptus: Eucalyptus, dogwood: Dogwood,
};

// ─────────────────────────────────────────────
// Arrangement placement logic
// ─────────────────────────────────────────────
export interface PlacedFlower {
  species: FlowerSpecies;
  x: number;
  y: number;
  z: number;
  scale: number;
  color: string;
  rot: number;
}

export function placeArrangement(arr: FlowerArrangement, baseRadius: number, topY: number): PlacedFlower[] {
  const results: PlacedFlower[] = [];
  for (let i = 0; i < arr.count; i++) {
    const species = arr.species[i % arr.species.length];
    const color = arr.palette[i % arr.palette.length];
    let x = 0, y = topY, z = 0, rot = 0, s = 1;
    switch (arr.style) {
      case "cascading": {
        // spiral from top drape to side
        const t = i / arr.count;
        const angle = t * Math.PI * 3;
        const r = baseRadius * (0.5 + t * 0.9);
        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;
        y = topY - t * 1.8;
        s = 0.7 + Math.random() * 0.5;
        rot = angle;
        break;
      }
      case "cluster": {
        // tight cluster on top surface
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * baseRadius * 0.75;
        x = Math.cos(theta) * r;
        z = Math.sin(theta) * r;
        y = topY + 0.04 + Math.random() * 0.06;
        s = 0.8 + Math.random() * 0.5;
        rot = Math.random() * Math.PI * 2;
        break;
      }
      case "crown": {
        const a = (i / arr.count) * Math.PI * 2;
        x = Math.cos(a) * baseRadius * 0.85;
        z = Math.sin(a) * baseRadius * 0.85;
        y = topY + 0.05;
        s = 0.9 + (i % 3) * 0.15;
        rot = a;
        break;
      }
      case "spray": {
        // one-sided horizontal spray
        const t = i / arr.count;
        x = -baseRadius * 0.7 + t * baseRadius * 1.3;
        z = baseRadius * 0.45 - t * 0.9;
        y = topY + 0.12 - t * 0.25;
        s = 0.7 + Math.random() * 0.4;
        rot = Math.random() * Math.PI * 2;
        break;
      }
      case "sideways": {
        // horizontal band around tier side
        const a = (i / arr.count) * Math.PI * 2;
        x = Math.cos(a) * (baseRadius + 0.02);
        z = Math.sin(a) * (baseRadius + 0.02);
        y = topY - 0.2;
        s = 0.8;
        rot = a;
        break;
      }
    }
    results.push({ species, x, y, z, scale: s * 0.9, color, rot });
  }
  return results;
}

export function FlowerArrangementMesh({ arrangement, baseRadius, topY }: { arrangement: FlowerArrangement; baseRadius: number; topY: number }) {
  // Guard: don't render flowers when tier context is invalid (e.g., template cleared,
  // baseRadius NaN/0, or arrangement has no species). This prevents the "stray
  // flower state arc" artifact reported in iter155.
  const valid = (
    arrangement &&
    Array.isArray(arrangement.species) && arrangement.species.length > 0 &&
    Number.isFinite(baseRadius) && baseRadius > 0.05 &&
    Number.isFinite(topY) &&
    (arrangement.count || 0) > 0
  );
  const placed = useMemo(
    () => (valid ? placeArrangement(arrangement, baseRadius, topY) : []),
    [valid, arrangement, baseRadius, topY]
  );
  if (!valid || placed.length === 0) return null;
  return (
    <group>
      {placed.map((f, i) => {
        const C = SPECIES_COMPONENT[f.species];
        if (!C) return null;
        return (
          <group key={i} position={[f.x, f.y, f.z]} rotation={[0, f.rot, 0]}>
            <C color={f.color} scale={f.scale} />
          </group>
        );
      })}
    </group>
  );
}

export function FlowerSingleMesh({ species, color, scale = 1 }: { species: FlowerSpecies; color: string; scale?: number }) {
  const C = SPECIES_COMPONENT[species];
  return <C color={color} scale={scale} />;
}
