/**
 * CakeScene3D — pure Three.js scene for the Cake Viewer
 * Renders tiers (with Mad Hatter tilt/offset + cutaway wedge), toppers, and stand.
 */
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Tier, Topper, FlowerDeco } from "./types";
import { useTierGeometry, shapeSupportsCutaway, approxTopRadius } from "./CakeTierGeometry";
import { PipingBand } from "./CakePiping";
import { FLOWER_ARRANGEMENTS, FlowerArrangementMesh } from "./CakeFlowers";
import { CakeStand, StandKind } from "./CakeStands";
import { FinishMaterial, InteriorMaterial } from "./CakeMaterials";

function finishRoughness(f: Tier["finish"]) {
  switch (f) {
    case "fondant": return 0.5;
    case "drip": return 0.35;
    case "mirror": return 0.08;
    case "naked": return 0.95;
    case "semi-naked": return 0.8;
    default: return 0.7;
  }
}

function CakeTierMesh({ tier, yOffset, spin, cutaway }: { tier: Tier; yOffset: number; spin: boolean; cutaway: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.2;
  });

  const texture = useMemo(() => {
    if (!tier.texture_url) return null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const tex = loader.load(tier.texture_url);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(tier.texture_repeat_x, tier.texture_repeat_y);
    return tex;
  }, [tier.texture_url, tier.texture_repeat_x, tier.texture_repeat_y]);

  const thetaStart = cutaway ? Math.PI * 0.25 : 0;
  const thetaLength = cutaway ? Math.PI * 1.5 : Math.PI * 2;
  const canCutaway = cutaway && shapeSupportsCutaway(tier.shape);
  const fillings = tier.fillings || [];
  const totalFilHeight = fillings.reduce((s, f) => s + f.height, 0);
  const scale = totalFilHeight > 0 ? (tier.height - 0.02) / totalFilHeight : 1;
  const yBottom = -tier.height / 2 + 0.01;
  const roughness = finishRoughness(tier.finish);
  const metalness = tier.finish === "mirror" ? 0.6 : tier.metalness;

  // Shape-aware primary geometry (round/hex/square/sheet/heart/mad_hatter/topsy_turvy)
  const tierGeo = useTierGeometry(tier, canCutaway);
  // Filling geometry matches the tier shape at slightly reduced radius
  const fillingRadius = Math.max(0.05, tier.radius - 0.015);

  return (
    <group ref={group} position={[tier.offset_x, yOffset, tier.offset_z]} rotation={[tier.tilt_x, 0, tier.tilt_z]}>
      {/* Main shape body */}
      <mesh castShadow receiveShadow geometry={tierGeo}>
        <FinishMaterial finish={tier.finish} color={tier.color} texture={texture} metalness={metalness} />
      </mesh>
      {/* Top/bottom caps only drawn for cylindrical shapes (they're already filled for box/heart) */}
      {(!tier.shape || tier.shape === "round" || tier.shape === "hex" || tier.shape === "mad_hatter" || tier.shape === "topsy_turvy") && (
        <>
          <mesh position={[0, tier.height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <ringGeometry args={[0, tier.shape === "mad_hatter" ? tier.radius * (1 - (tier.taper ?? 0.25)) : tier.radius, tier.shape === "hex" ? 6 : 64, 1, -thetaStart - thetaLength + Math.PI * 2, canCutaway ? thetaLength : Math.PI * 2]} />
            <FinishMaterial finish={tier.finish} color={tier.color} metalness={metalness} />
          </mesh>
          <mesh position={[0, -tier.height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0, tier.radius, tier.shape === "hex" ? 6 : 64, 1, thetaStart, canCutaway ? thetaLength : Math.PI * 2]} />
            <FinishMaterial finish={tier.finish} color={tier.color} metalness={metalness} />
          </mesh>
        </>
      )}
      {/* Fillings rendered for cylindrical shapes only */}
      {shapeSupportsCutaway(tier.shape) && fillings.map((f, i) => {
        const prior = fillings.slice(0, i).reduce((s, x) => s + x.height, 0) * scale;
        const yMid = yBottom + prior + (f.height * scale) / 2;
        const fkind = (f as any).kind || "sponge";
        return (
          <mesh key={i} position={[0, yMid, 0]}>
            <cylinderGeometry args={[fillingRadius, fillingRadius, f.height * scale, tier.shape === "hex" ? 6 : 48]} />
            <InteriorMaterial color={f.color} kind={fkind} />
          </mesh>
        );
      })}
      {canCutaway && fillings.length > 0 && [thetaStart, thetaStart + thetaLength].map((angle, idx) => (
        <group key={idx} rotation={[0, angle + Math.PI, 0]}>
          {fillings.map((f, i) => {
            const prior = fillings.slice(0, i).reduce((s, x) => s + x.height, 0) * scale;
            const yMid = yBottom + prior + (f.height * scale) / 2;
            const fkind = (f as any).kind || "sponge";
            return (
              <mesh key={i} position={[tier.radius / 2 - 0.007, yMid, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[tier.radius - 0.02, f.height * scale]} />
                <InteriorMaterial color={f.color} kind={fkind} />
              </mesh>
            );
          })}
        </group>
      ))}
      {/* Piping bands · iter153 A2 — circumferential decorations */}
      {(tier.piping || []).map((p, i) => {
        // Band positioning: top uses approx-top radius (smaller for mad_hatter/heart), bottom uses base radius
        const topR = approxTopRadius(tier) - 0.02;
        const baseR = tier.radius - 0.02;
        let y = 0, r = baseR;
        if (p.band === "top") { y = tier.height / 2 - 0.01; r = topR; }
        else if (p.band === "bottom") { y = -tier.height / 2 + 0.02; r = baseR; }
        else { y = 0; r = baseR; }
        // Only render piping for round-like shapes for now (A2 scope)
        if (!shapeSupportsCutaway(tier.shape)) return null;
        return (
          <PipingBand key={`pip-${i}`} piping={{ ...p, tier_index: 0 } as any} radius={r} yPosition={y} />
        );
      })}
    </group>
  );
}

function TopperMesh({ topper, yTop }: { topper: Topper; yTop: number }) {
  const y = yTop + 0.08;
  const pos: [number, number, number] = [topper.x, y, topper.z];
  const s = topper.scale;
  switch (topper.kind) {
    case "candle":
      return (
        <group position={pos}>
          <mesh position={[0, 0.18 * s, 0]}>
            <cylinderGeometry args={[0.04 * s, 0.04 * s, 0.3 * s, 16]} />
            <meshStandardMaterial color={topper.color} />
          </mesh>
          <mesh position={[0, 0.35 * s, 0]}>
            <coneGeometry args={[0.025 * s, 0.07 * s, 12]} />
            <meshStandardMaterial color="#ffcc33" emissive="#ff8833" emissiveIntensity={2} />
          </mesh>
        </group>
      );
    case "flower":
      return (
        <mesh position={pos} scale={s}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={topper.color} roughness={0.6} />
        </mesh>
      );
    case "number":
    case "monogram":
      return (
        <group position={pos} scale={s}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.3, 0.2, 0.05]} />
            <meshStandardMaterial color={topper.color} metalness={0.6} roughness={0.2} />
          </mesh>
        </group>
      );
    case "star":
      return (
        <group position={pos} scale={s}>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={i} position={[0, 0.1, 0]} rotation={[0, (i / 5) * Math.PI * 2, Math.PI / 2]}>
              <coneGeometry args={[0.04, 0.14, 4]} />
              <meshStandardMaterial color={topper.color} metalness={0.7} roughness={0.2} />
            </mesh>
          ))}
        </group>
      );
    case "horn":
      return (
        <group position={pos} scale={s}>
          <mesh position={[0, 0.18, 0]} rotation={[0, 0, -0.08]}>
            <coneGeometry args={[0.045, 0.32, 16]} />
            <meshStandardMaterial color={topper.color} metalness={0.5} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <torusGeometry args={[0.05, 0.015, 8, 16]} />
            <meshStandardMaterial color={topper.color} metalness={0.5} roughness={0.2} />
          </mesh>
        </group>
      );
    case "crown":
      return (
        <group position={pos} scale={s}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
            <meshStandardMaterial color={topper.color} metalness={0.9} roughness={0.15} />
          </mesh>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={i} position={[Math.cos((i / 5) * Math.PI * 2) * 0.09, 0.15, Math.sin((i / 5) * Math.PI * 2) * 0.09]}>
              <coneGeometry args={[0.018, 0.08, 6]} />
              <meshStandardMaterial color={topper.color} metalness={0.9} roughness={0.15} />
            </mesh>
          ))}
        </group>
      );
    case "dinosaur":
      return (
        <group position={pos} scale={s}>
          {/* body */}
          <mesh position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial color={topper.color} roughness={0.7} />
          </mesh>
          {/* neck + head */}
          <mesh position={[0.14, 0.28, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.05, 0.06, 0.15, 10]} />
            <meshStandardMaterial color={topper.color} roughness={0.7} />
          </mesh>
          <mesh position={[0.2, 0.33, 0]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color={topper.color} roughness={0.7} />
          </mesh>
          {/* tail */}
          <mesh position={[-0.14, 0.18, 0]} rotation={[0, 0, Math.PI / 4]}>
            <coneGeometry args={[0.04, 0.2, 8]} />
            <meshStandardMaterial color={topper.color} roughness={0.7} />
          </mesh>
          {/* spikes */}
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh key={i} position={[-0.08 + i * 0.05, 0.27, 0]}>
              <coneGeometry args={[0.02, 0.05, 4]} />
              <meshStandardMaterial color={"#3a4d23"} roughness={0.8} />
            </mesh>
          ))}
        </group>
      );
    case "tower_spire":
      return (
        <group position={pos} scale={s}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.45, 12]} />
            <meshStandardMaterial color={topper.color} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <coneGeometry args={[0.1, 0.18, 8]} />
            <meshStandardMaterial color={"#ffd966"} metalness={0.7} roughness={0.2} />
          </mesh>
          {/* little flag */}
          <mesh position={[0.09, 0.62, 0]}>
            <boxGeometry args={[0.05, 0.035, 0.005]} />
            <meshStandardMaterial color={"#ff6bb5"} />
          </mesh>
        </group>
      );
    case "balloon":
      return (
        <group position={pos} scale={s}>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color={topper.color} roughness={0.35} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <coneGeometry args={[0.015, 0.04, 6]} />
            <meshStandardMaterial color={topper.color} roughness={0.5} />
          </mesh>
          {/* string */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.18, 6]} />
            <meshStandardMaterial color={"#222"} />
          </mesh>
        </group>
      );
    case "bride":
    case "groom":
    case "figurine":
    default:
      return (
        <group position={pos} scale={s}>
          <mesh position={[0, 0.22, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color={topper.kind === "bride" ? "#ffe8d4" : topper.color} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.2, 12]} />
            <meshStandardMaterial color={topper.color} roughness={0.7} />
          </mesh>
        </group>
      );
  }
}

function Stand({ color, kind }: { color: string; kind?: StandKind }) {
  if (kind) return <CakeStand kind={kind} color={color} />;
  return (
    <group>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[1.7, 1.9, 0.1, 48]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#0b1020" roughness={1} />
      </mesh>
    </group>
  );
}

export function CakeScene3D({ tiers, toppers, spin, standColor, cutaway, flowers = [], standKind }: { tiers: Tier[]; toppers: Topper[]; spin: boolean; standColor: string; cutaway: boolean; flowers?: FlowerDeco[]; standKind?: StandKind }) {
  const positions: number[] = [];
  let y = 0;
  for (const t of tiers) { positions.push(y + t.height / 2); y += t.height + 0.02; }
  const topY = positions.length > 0 ? positions[positions.length - 1] + tiers[tiers.length - 1].height / 2 : 0;
  const topTier = tiers[tiers.length - 1];
  const topR = topTier ? approxTopRadius(topTier) : 0.5;
  const baseTier = tiers[0];
  const baseR = baseTier ? baseTier.radius : 1;
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 8, 4]} intensity={0.9} castShadow />
      <directionalLight position={[-6, 4, -2]} intensity={0.35} />
      <Stand color={standColor} kind={standKind} />
      {tiers.map((t, i) => (
        <CakeTierMesh key={i} tier={t} yOffset={positions[i]} spin={spin && !cutaway} cutaway={cutaway} />
      ))}
      {toppers.map((tp, i) => <TopperMesh key={i} topper={tp} yTop={topY} />)}
      {/* iter153 A3 · Flower arrangements — skip invalid/empty entries to avoid stray state arcs */}
      {(flowers || []).filter(fd => fd && fd.arrangement_id).map((fd, i) => {
        const arr = FLOWER_ARRANGEMENTS.find(a => a.id === fd.arrangement_id);
        if (!arr) return null;
        const override = fd.palette_override && fd.palette_override.length > 0
          ? { ...arr, palette: fd.palette_override }
          : arr;
        let anchorY = topY;
        let anchorR = topR;
        if (fd.placement === "base") { anchorY = 0.02; anchorR = baseR; }
        else if (fd.placement === "cascade") { anchorY = topY; anchorR = topR * 1.1; }
        else if (fd.placement === "tier" && typeof fd.tier_index === "number" && tiers[fd.tier_index]) {
          anchorY = positions[fd.tier_index] + tiers[fd.tier_index].height / 2;
          anchorR = tiers[fd.tier_index].radius;
        }
        return <FlowerArrangementMesh key={`fl-${i}`} arrangement={override} baseRadius={anchorR} topY={anchorY} />;
      })}
    </>
  );
}
