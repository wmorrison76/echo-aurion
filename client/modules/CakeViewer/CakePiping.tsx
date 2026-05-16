/**
 * CakePiping — procedural 3D piping/icing decoration meshes (iter153 · A2).
 *
 * Renders 12 piping patterns as small repeating meshes around a tier's
 * circumference (bead, shell, rope, rosette, basket-weave, drop-strings,
 * cornelli-lace, ruffle, leaf, star, scroll, zigzag).
 *
 * Each piping is placed on a "band" — a position on the tier:
 *   - top     — pipes on the top edge
 *   - bottom  — pipes on the base edge (most common)
 *   - middle  — pipes a horizontal stripe mid-tier
 *
 * Piping is purely decorative, rendered above the tier mesh and sized by
 * `scale`. Color comes from the session's piping_color.
 */
import React, { useMemo } from "react";
import * as THREE from "three";

export type PipingKind =
  | "bead" | "shell" | "rope" | "rosette" | "basket_weave" | "drop_strings"
  | "cornelli_lace" | "ruffle" | "leaf" | "star" | "scroll" | "zigzag";

export interface Piping {
  kind: PipingKind;
  band: "top" | "bottom" | "middle";
  tier_index: number;       // which tier this piping goes on
  color: string;
  scale?: number;           // 0.5–2.0
  density?: number;         // number of elements around circumference (defaults per kind)
}

export const PIPING_CATALOG: { kind: PipingKind; label: string; description: string; defaultDensity: number }[] = [
  { kind: "bead",          label: "Bead",           description: "Uniform pearl-dot chain",                  defaultDensity: 48 },
  { kind: "shell",         label: "Shell",          description: "Classic fluted shell border",               defaultDensity: 32 },
  { kind: "rope",          label: "Rope",           description: "Twisted rope braid",                        defaultDensity: 60 },
  { kind: "rosette",       label: "Rosette",        description: "Star-tip swirled rosettes",                 defaultDensity: 20 },
  { kind: "basket_weave",  label: "Basket Weave",   description: "Crossed basket lattice",                    defaultDensity: 36 },
  { kind: "drop_strings",  label: "Drop Strings",   description: "Suspended looped strings",                  defaultDensity: 16 },
  { kind: "cornelli_lace", label: "Cornelli Lace",  description: "Random scribble lace — 120min / complex",   defaultDensity: 200 },
  { kind: "ruffle",        label: "Ruffle",         description: "Maggie Austin–style ruffle / frill",        defaultDensity: 40 },
  { kind: "leaf",          label: "Leaf",           description: "Pointed leaf tip fronds",                   defaultDensity: 28 },
  { kind: "star",          label: "Star",           description: "Star tip bursts",                           defaultDensity: 24 },
  { kind: "scroll",        label: "Scroll",         description: "S-scroll flourish",                         defaultDensity: 18 },
  { kind: "zigzag",        label: "Zigzag",         description: "Continuous zigzag stripe",                  defaultDensity: 80 },
];

// ─────────────────────────────────────────────
// Individual element mesh builders (reusable geometries cached via useMemo)
// ─────────────────────────────────────────────
function BeadMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <mesh>
      <sphereGeometry args={[0.035 * scale, 10, 10]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

function ShellMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <coneGeometry args={[0.05 * scale, 0.09 * scale, 12]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  );
}

function RopeMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 4]}>
      <capsuleGeometry args={[0.022 * scale, 0.05 * scale, 6, 8]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

function RosetteMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.028 * scale, 0, Math.sin((i / 5) * Math.PI * 2) * 0.028 * scale]}>
          <sphereGeometry args={[0.032 * scale, 8, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.035 * scale, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

function BasketWeaveMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group>
      <mesh><boxGeometry args={[0.08 * scale, 0.04 * scale, 0.04 * scale]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.08 * scale, 0.04 * scale, 0.04 * scale]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
    </group>
  );
}

function DropStringMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <mesh position={[0, -0.06 * scale, 0]}>
      <torusGeometry args={[0.07 * scale, 0.008 * scale, 6, 16, Math.PI]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

function CornelliLaceMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  // random tiny squiggles
  return (
    <mesh>
      <sphereGeometry args={[0.009 * scale, 6, 6]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function RuffleMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 6]}>
      <torusGeometry args={[0.04 * scale, 0.01 * scale, 6, 20, Math.PI * 1.6]} />
      <meshStandardMaterial color={color} roughness={0.55} side={THREE.DoubleSide} />
    </mesh>
  );
}

function LeafMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <coneGeometry args={[0.025 * scale, 0.075 * scale, 4]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

function StarMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <coneGeometry args={[0.02 * scale, 0.05 * scale, 4]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function ScrollMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <mesh>
      <torusGeometry args={[0.035 * scale, 0.012 * scale, 6, 16, Math.PI * 1.3]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

function ZigzagMesh({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 4]}>
      <boxGeometry args={[0.045 * scale, 0.01 * scale, 0.01 * scale]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

const KIND_ELEMENT: Record<PipingKind, React.FC<{ color: string; scale?: number }>> = {
  bead: BeadMesh, shell: ShellMesh, rope: RopeMesh, rosette: RosetteMesh,
  basket_weave: BasketWeaveMesh, drop_strings: DropStringMesh,
  cornelli_lace: CornelliLaceMesh, ruffle: RuffleMesh, leaf: LeafMesh,
  star: StarMesh, scroll: ScrollMesh, zigzag: ZigzagMesh,
};

// ─────────────────────────────────────────────
// Circumferential placer — places N element copies around a circle
// ─────────────────────────────────────────────
export function PipingBand({
  piping, radius, yPosition,
}: {
  piping: Piping; radius: number; yPosition: number;
}) {
  const entry = PIPING_CATALOG.find(p => p.kind === piping.kind);
  const density = piping.density ?? entry?.defaultDensity ?? 32;
  const Element = KIND_ELEMENT[piping.kind];
  const scale = piping.scale ?? 1;
  const color = piping.color;

  // Cornelli lace is non-uniform: jitter placement
  const positions = useMemo(() => {
    const arr: Array<{ angle: number; radialOffset: number; yOffset: number; rotY: number }> = [];
    for (let i = 0; i < density; i++) {
      const baseAngle = (i / density) * Math.PI * 2;
      if (piping.kind === "cornelli_lace") {
        arr.push({
          angle: baseAngle + (Math.random() - 0.5) * 0.15,
          radialOffset: (Math.random() - 0.5) * 0.04,
          yOffset: (Math.random() - 0.5) * 0.08,
          rotY: Math.random() * Math.PI * 2,
        });
      } else {
        arr.push({ angle: baseAngle, radialOffset: 0, yOffset: 0, rotY: baseAngle });
      }
    }
    return arr;
  }, [density, piping.kind]);

  return (
    <group position={[0, yPosition, 0]}>
      {positions.map((p, i) => {
        const r = radius + p.radialOffset;
        const x = Math.cos(p.angle) * r;
        const z = Math.sin(p.angle) * r;
        return (
          <group key={i} position={[x, p.yOffset, z]} rotation={[0, -p.rotY + Math.PI / 2, 0]}>
            <Element color={color} scale={scale} />
          </group>
        );
      })}
    </group>
  );
}
