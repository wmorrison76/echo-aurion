/**
 * AirbrushTool3D v2 — Paint directly on the 3D cake
 * --------------------------------------------------
 * The modal now shows the actual cake the user is designing. Hovering
 * or click-dragging with mouse or stylus sprays paint onto the selected
 * tier's surface. Strokes become a spray overlay bound to that tier and
 * propagate back to the main cake designer view.
 *
 * Architecture:
 *   - We receive the full cake `tiers` list + `selectedTier` index.
 *   - R3F Canvas renders the cake.
 *   - A raycast onPointerMove (while spraying) lands the spray point on
 *     the selected tier's mesh. We store world-space hit points in the
 *     stroke and re-render a transient particle cloud along those points
 *     so the user sees paint building up in real time.
 *   - On "Apply to Cake", the stroke is emitted to the parent where it
 *     is stored as `tier.sprayOverlay` → the main 3D preview renders the
 *     same spray as semi-transparent particles hugging the tier surface.
 */
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { X, Wind } from "lucide-react";

const ACCENT = "#c8a97e";
const BORDER = "rgba(255,255,255,0.08)";
const API = typeof window !== "undefined" ? window.location.origin : "";
const UNIT = 0.15;

export interface AirbrushNozzle {
  id: string; name: string;
  spread: number; falloff: number; opacity: number;
  best_for: string; splatter?: boolean;
}

export interface SpraySample {
  x: number; y: number; z: number;
  r: number; a: number;
}
export interface SprayStroke {
  id: string;
  tier_id: string;
  nozzle_id: string;
  color: string;
  opacity: number;
  spread: number;
  falloff: number;
  splatter: boolean;
  samples: SpraySample[];
  created_at: string;
}

interface TierLite {
  id: string;
  shape: string;
  diameter: number;
  height: number;
  frostingColor: string;
  frostingStyle: string;
  visible: boolean;
  tiltAngle?: number;
  offset?: number;
  color: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (stroke: SprayStroke) => void;
  tiers: TierLite[];
  selectedTierIdx: number;
  existingSprays?: Record<string, SpraySample[]>; // tier_id → samples (from prior strokes)
}

const FALLBACK_NOZZLES: AirbrushNozzle[] = [
  { id: "noz-fine",     name: "Fine Detail (0.2mm)",   spread: 0.04, falloff: 0.85, opacity: 0.75, best_for: "Lettering, fine veining, eye detail" },
  { id: "noz-medium",   name: "Medium (0.3mm)",         spread: 0.09, falloff: 0.70, opacity: 0.80, best_for: "General shading, gradients, wash" },
  { id: "noz-broad",    name: "Broad Coverage (0.5mm)", spread: 0.16, falloff: 0.55, opacity: 0.85, best_for: "Full-tier color, ombré bases" },
  { id: "noz-splatter", name: "Splatter / Stipple",     spread: 0.14, falloff: 0.40, opacity: 0.95, best_for: "Galaxy, speckle, texture", splatter: true },
];

export default function AirbrushTool3D({
  open, onClose, onApply, tiers, selectedTierIdx, existingSprays,
}: Props) {
  const [nozzles, setNozzles] = useState<AirbrushNozzle[]>(FALLBACK_NOZZLES);
  const [nozzleId, setNozzleId] = useState("noz-medium");
  const [color, setColor] = useState("#c8a97e");
  const [pressure, setPressure] = useState(0.6);
  const [flow, setFlow] = useState(0.75);
  const [opacity, setOpacity] = useState(0.8);
  const [spraying, setSpraying] = useState(false);
  const [pendingSamples, setPendingSamples] = useState<SpraySample[]>([]);
  const nozzle = useMemo(() => nozzles.find((n) => n.id === nozzleId) || nozzles[1], [nozzleId, nozzles]);
  const tier = tiers[selectedTierIdx];

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/cake-assets/airbrush-nozzles`);
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d.nozzles) && d.nozzles.length) setNozzles(d.nozzles);
        }
      } catch { /* fall back */ }
    })();
  }, [open]);

  useEffect(() => { if (!open) setPendingSamples([]); }, [open]);

  const apply = () => {
    if (pendingSamples.length < 3) { alert("Spray onto the cake before applying."); return; }
    if (!tier) return;
    const stroke: SprayStroke = {
      id: `spray-${Date.now()}`,
      tier_id: tier.id,
      nozzle_id: nozzle.id,
      color, opacity,
      spread: nozzle.spread, falloff: nozzle.falloff,
      splatter: !!nozzle.splatter,
      samples: pendingSamples,
      created_at: new Date().toISOString(),
    };
    onApply(stroke);
    setPendingSamples([]);
  };

  if (!open || !tier) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      style={{ background: "rgba(4,6,13,0.86)", backdropFilter: "blur(10px)" }}
      data-testid="airbrush-tool-modal"
    >
      <div
        className="w-full max-w-[1200px] max-h-[94vh] grid grid-cols-[240px_1fr_280px] rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}
      >
        {/* Left — nozzles + tool preview */}
        <div className="flex flex-col border-r" style={{ borderColor: BORDER }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>Tool</div>
              <div className="text-[13px] font-semibold text-white mt-0.5 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Airbrush
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.05]" data-testid="airbrush-close">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
          <div className="flex-1 relative" style={{ background: "#05070d", minHeight: 220 }}>
            <Canvas camera={{ position: [0.6, 0.3, 1.6], fov: 32 }} dpr={[1, 2]}>
              <color attach="background" args={["#05070d"]} />
              <ambientLight intensity={0.35} />
              <directionalLight position={[3, 4, 3]} intensity={1.4} />
              <directionalLight position={[-3, 2, -1]} intensity={0.5} color="#8aa4c8" />
              <Suspense fallback={null}>
                <AirbrushGun nozzle={nozzle} color={color} spraying={spraying} />
              </Suspense>
              <OrbitControls enablePan={false} minDistance={1.2} maxDistance={3.2}
                minPolarAngle={Math.PI * 0.2} maxPolarAngle={Math.PI * 0.75}
                autoRotate autoRotateSpeed={0.6} />
            </Canvas>
          </div>
          <div className="px-3 py-3 border-t space-y-1.5" style={{ borderColor: BORDER }}>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">Nozzle Tips</div>
            {nozzles.map((n) => (
              <button
                key={n.id}
                onClick={() => setNozzleId(n.id)}
                className="w-full text-left px-2.5 py-1.5 rounded text-[10px] transition-all"
                style={{
                  background: nozzleId === n.id ? `${ACCENT}18` : "rgba(255,255,255,0.03)",
                  color: nozzleId === n.id ? ACCENT : "rgba(226,232,240,0.7)",
                  border: `1px solid ${nozzleId === n.id ? `${ACCENT}40` : BORDER}`,
                }}
                data-testid={`airbrush-nozzle-${n.id}`}
              >
                <div className="font-medium truncate">{n.name}</div>
                <div className="text-[8px] text-white/40 truncate">{n.best_for}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Center — 3D cake you paint on */}
        <div className="flex flex-col" style={{ background: "#05070d" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
            <div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>Paint directly on cake</div>
              <div className="text-[12px] font-medium text-white mt-0.5">
                Spraying <span style={{ color: ACCENT }}>Tier {selectedTierIdx + 1}</span> · click-drag or stylus · {pendingSamples.length} pts
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPendingSamples([])}
                className="px-3 py-1.5 rounded text-[10px] font-medium text-white/60"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}
                data-testid="airbrush-clear-pad"
              >
                Clear strokes
              </button>
              <button
                onClick={apply}
                className="px-4 py-1.5 rounded text-[10px] font-semibold"
                style={{ background: ACCENT, color: "#0b1020" }}
                data-testid="airbrush-apply-btn"
              >
                Apply to Cake
              </button>
            </div>
          </div>
          <div className="flex-1" style={{ minHeight: 420 }}>
            <Canvas shadows camera={{ position: [2.2, 2.2, 2.2], fov: 35 }}
              gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
              dpr={[1, 2]}>
              <color attach="background" args={["#05070d"]} />
              <ambientLight intensity={0.35} />
              <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow />
              <directionalLight position={[-3, 4, -2]} intensity={0.55} color="#e8d5b7" />
              <spotLight position={[-4, 6, 4]} intensity={0.8} angle={0.4} penumbra={0.5} color="#ffeedd" />
              <Suspense fallback={null}>
                <PaintableCake
                  tiers={tiers}
                  selectedIdx={selectedTierIdx}
                  nozzle={nozzle}
                  color={color}
                  pressure={pressure}
                  flow={flow}
                  opacity={opacity}
                  onSpray={(s) => setPendingSamples((p) => [...p, s])}
                  onSprayStart={() => setSpraying(true)}
                  onSprayEnd={() => setSpraying(false)}
                  existingSprays={existingSprays}
                  pendingSamples={pendingSamples}
                />
              </Suspense>
              <ContactShadows position={[0, -0.5, 0]} opacity={0.4} scale={8} blur={2.5} far={4} />
              <OrbitControls enablePan={false} minDistance={1.5} maxDistance={6}
                minPolarAngle={Math.PI * 0.15} maxPolarAngle={Math.PI * 0.75}
                makeDefault />
            </Canvas>
          </div>
          <div className="px-4 py-2 border-t text-[9px] font-mono text-white/30 flex items-center justify-between" style={{ borderColor: BORDER }}>
            <span>Click + drag to paint · right-drag or two-finger = orbit camera</span>
            <span style={{ color: spraying ? "#22c55e" : "rgba(255,255,255,0.25)" }}>
              {spraying ? "● SPRAYING" : "○ idle"}
            </span>
          </div>
        </div>

        {/* Right — settings */}
        <div className="flex flex-col border-l" style={{ borderColor: BORDER }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>Settings</div>
            <div className="text-[12px] text-white mt-0.5">Brush parameters</div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1.5">Color</div>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
                  data-testid="airbrush-color-input" />
                <input value={color} onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded text-[11px] text-white bg-transparent outline-none font-mono"
                  style={{ border: `1px solid ${BORDER}` }} />
              </div>
              <div className="flex gap-1 mt-2">
                {["#ffffff", "#c8a97e", "#d4a843", "#b76e79", "#e8555a", "#5b8def", "#2ecc71", "#1a1a2e"].map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className="flex-1 h-6 rounded transition-transform hover:scale-110"
                    style={{ background: c, border: color === c ? `2px solid ${ACCENT}` : `1px solid ${BORDER}` }} />
                ))}
              </div>
            </div>
            <Slider label="Pressure" value={pressure} min={0.1} max={1} step={0.05} onChange={setPressure} testid="airbrush-pressure" />
            <Slider label="Flow" value={flow} min={0.1} max={1} step={0.05} onChange={setFlow} testid="airbrush-flow" />
            <Slider label="Opacity" value={opacity} min={0.1} max={1} step={0.05} onChange={setOpacity} testid="airbrush-opacity" />
            <div className="rounded-lg p-3 space-y-1 text-[10px]" style={{ background: "rgba(200,169,126,0.05)", border: `1px solid ${ACCENT}25` }}>
              <StatRow label="Tip" value={nozzle.name} />
              <StatRow label="Spread" value={`${(nozzle.spread * 100).toFixed(1)}%`} />
              <StatRow label="Falloff" value={nozzle.falloff.toFixed(2)} />
              <StatRow label="Mode" value={nozzle.splatter ? "Stipple" : "Soft"} />
              <StatRow label="Effective α" value={(nozzle.opacity * opacity * flow).toFixed(2)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * Paintable 3D Cake — raycast+spray on tier
 * ─────────────────────────────────────────────*/
function PaintableCake({
  tiers, selectedIdx, nozzle, color, pressure, flow, opacity,
  onSpray, onSprayStart, onSprayEnd, existingSprays, pendingSamples,
}: {
  tiers: TierLite[]; selectedIdx: number;
  nozzle: AirbrushNozzle; color: string;
  pressure: number; flow: number; opacity: number;
  onSpray: (s: SpraySample) => void;
  onSprayStart: () => void; onSprayEnd: () => void;
  existingSprays?: Record<string, SpraySample[]>;
  pendingSamples: SpraySample[];
}) {
  const selectedTier = tiers[selectedIdx];
  const [isDown, setIsDown] = useState(false);
  const [tierPositions, setTierPositions] = useState<number[]>([]);
  const lastSampleTs = useRef(0);

  useEffect(() => {
    let y = 0;
    const ps: number[] = [];
    for (const t of tiers) { ps.push(y); y += t.height * UNIT + 0.02; }
    setTierPositions(ps);
  }, [tiers]);

  const handleSpray = (hit: THREE.Vector3) => {
    const now = performance.now();
    if (now - lastSampleTs.current < 16) return; // ~60Hz throttle
    lastSampleTs.current = now;
    const r = Math.max(0.02, nozzle.spread * pressure * 2.2);
    const a = Math.min(1, nozzle.opacity * opacity * flow);
    onSpray({ x: hit.x, y: hit.y, z: hit.z, r, a });
  };

  return (
    <group>
      {tiers.map((t, i) => {
        if (!t.visible) return null;
        const y = tierPositions[i] ?? 0;
        const isSelected = i === selectedIdx;
        return (
          <TierPaintable
            key={t.id}
            tier={t}
            yOffset={y}
            isSelected={isSelected}
            onDown={(hit) => { setIsDown(true); onSprayStart(); handleSpray(hit); }}
            onMove={(hit) => { if (isDown) handleSpray(hit); }}
            onUp={() => { setIsDown(false); onSprayEnd(); }}
          />
        );
      })}
      {/* Render existing applied sprays for the selected tier only */}
      {existingSprays && existingSprays[selectedTier.id] && (
        <SprayParticles samples={existingSprays[selectedTier.id]} color="#ffffff" global />
      )}
      {/* Live pending samples */}
      <SprayParticles samples={pendingSamples} color={color} />
    </group>
  );
}

function TierPaintable({
  tier, yOffset, isSelected, onDown, onMove, onUp,
}: {
  tier: TierLite; yOffset: number; isSelected: boolean;
  onDown: (hit: THREE.Vector3) => void;
  onMove: (hit: THREE.Vector3) => void;
  onUp: () => void;
}) {
  const h = tier.height * UNIT; const d = tier.diameter * UNIT; const r = d / 2;
  const geo = useMemo(() => {
    if (tier.shape === "round" || !tier.shape) return new THREE.CylinderGeometry(r, r, h, 64);
    if (tier.shape === "square") return new THREE.BoxGeometry(d, h, d);
    if (tier.shape === "hexagon") return new THREE.CylinderGeometry(r, r, h, 6);
    if (tier.shape === "sheet") return new THREE.BoxGeometry(d * 1.5, h, d);
    if (tier.shape === "madHatter") return new THREE.CylinderGeometry(r * 0.7, r, h, 64);
    if (tier.shape === "topsy") return new THREE.CylinderGeometry(r, r * 0.85, h, 64);
    return new THREE.CylinderGeometry(r, r, h, 64);
  }, [tier.shape, r, d, h]);

  const tiltRad = ((tier.tiltAngle || 0) * Math.PI) / 180;
  const ox = (tier.offset || 0) * UNIT;

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isSelected) return;
    e.stopPropagation(); (e.target as Element)?.setPointerCapture?.(e.pointerId);
    onDown(e.point.clone());
  };
  const handleMove = (e: ThreeEvent<PointerEvent>) => { if (isSelected) { e.stopPropagation(); onMove(e.point.clone()); } };
  const handleUp = (e: ThreeEvent<PointerEvent>) => { if (isSelected) { e.stopPropagation(); onUp(); } };

  return (
    <group position={[ox, yOffset + h / 2, 0]} rotation={[0, 0, tiltRad]}>
      <mesh
        geometry={geo}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
      >
        <meshStandardMaterial
          color={tier.frostingColor}
          roughness={0.5}
          metalness={tier.frostingStyle === "metallic" ? 0.55 : 0.03}
          emissive={isSelected ? "#c8a97e" : "#000000"}
          emissiveIntensity={isSelected ? 0.05 : 0}
        />
      </mesh>
      {/* Selection halo */}
      {isSelected && (
        <mesh geometry={geo} scale={1.01}>
          <meshBasicMaterial color={"#c8a97e"} transparent opacity={0.07} wireframe />
        </mesh>
      )}
    </group>
  );
}

function SprayParticles({ samples, color, global }: { samples: SpraySample[]; color: string; global?: boolean }) {
  if (!samples || !samples.length) return null;
  return (
    <group>
      {samples.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[s.r * (global ? 0.6 : 0.8), 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={Math.min(0.9, s.a * 0.85)} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ───── Airbrush gun (unchanged from v1) ───── */
function AirbrushGun({ nozzle, color, spraying }: { nozzle: AirbrushNozzle; color: string; spraying: boolean }) {
  const spray = useRef<THREE.Points>(null);
  const particleCount = 240;
  const positions = useMemo(() => new Float32Array(particleCount * 3), []);

  useFrame((_, delta) => {
    if (!spray.current) return;
    const attr = (spray.current.geometry as THREE.BufferGeometry).getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const speed = spraying ? 1.6 : 0;
    const spread = nozzle.spread * 6;
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      arr[ix] += delta * (speed + (spraying ? Math.random() * 1.2 : 0));
      if (arr[ix] > 1.2 || !spraying) {
        arr[ix] = 0.02 + Math.random() * 0.05;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.015;
        arr[ix + 1] = Math.cos(a) * r; arr[ix + 2] = Math.sin(a) * r;
      } else {
        arr[ix + 1] += (Math.random() - 0.5) * delta * spread * 0.08;
        arr[ix + 2] += (Math.random() - 0.5) * delta * spread * 0.08;
        if (Math.random() > nozzle.falloff + 0.1) arr[ix] = 1.3;
      }
    }
    attr.needsUpdate = true;
  });

  const tipColor =
    nozzle.id === "noz-fine" ? "#86efac" :
    nozzle.id === "noz-broad" ? "#fca5a5" :
    nozzle.id === "noz-splatter" ? "#fcd34d" : "#c8a97e";
  const tipLen =
    nozzle.id === "noz-fine" ? 0.14 :
    nozzle.id === "noz-broad" ? 0.06 :
    nozzle.id === "noz-splatter" ? 0.08 : 0.10;
  const tipRadius = nozzle.spread * 0.6 + 0.015;

  return (
    <group rotation={[0, -0.3, -0.1]} position={[-0.1, 0, 0]}>
      <mesh position={[-0.4, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.4, 32]} />
        <meshStandardMaterial color="#1f2937" metalness={0.75} roughness={0.25} />
      </mesh>
      {[-0.52, -0.28, -0.2].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <cylinderGeometry args={[0.095, 0.095, 0.018, 32]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}
      <mesh position={[-0.3, 0.09, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.06, 0.1, 0.03]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.35, 0.12, 0]}>
        <cylinderGeometry args={[0.055, 0.04, 0.08, 24]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.35} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-0.35, 0.165, 0]}>
        <torusGeometry args={[0.055, 0.008, 8, 20]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[-0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[tipRadius, tipLen, 24]} />
        <meshStandardMaterial color={tipColor} metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[-0.16 + tipLen / 2 + 0.002, 0, 0]}>
        <sphereGeometry args={[tipRadius * 0.4, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={spraying ? 0.95 : 0.5} />
      </mesh>
      <points ref={spray} position={[-0.16 + tipLen / 2, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={nozzle.splatter ? 0.015 : 0.009} color={color} transparent opacity={spraying ? 0.85 : 0} sizeAttenuation />
      </points>
    </group>
  );
}

function Slider({
  label, value, min, max, step, onChange, testid,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; testid: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[9px] font-mono uppercase tracking-wider text-white/40">{label}</div>
        <div className="text-[10px] font-mono text-white/70">{Math.round(value * 100)}%</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)} className="w-full h-1 accent-[#c8a97e]" data-testid={testid} />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40 uppercase text-[8px] tracking-wider">{label}</span>
      <span className="text-white/80 font-mono">{value}</span>
    </div>
  );
}
