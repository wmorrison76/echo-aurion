/**
 * CakeDesigner3D v2 — Full Professional Cake Design Studio
 * Three.js R3F with orbit controls, studio lighting, PBR materials
 * Features: Gallery, versioning, decorations, mad hatter shapes,
 * production view toggle, AI generation, print-ready export
 */
import React, { useState, useRef, useCallback, Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import {
  Plus, Minus, RotateCw, Camera, Layers, Palette, DollarSign,
  ChevronDown, ChevronRight, Eye, EyeOff, Printer, Save, Image,
  Sparkles, Upload, X, Maximize2, ChevronLeft, Copy, Flower2,
  Star, Droplets, PenTool, Type, ZoomIn,
  Wrench, Wind, Grid as GridIcon, Gem, Hammer, Brush, Image as ImageIcon, Droplet,
} from "lucide-react";
import AirbrushTool3D, { SprayStroke } from "./AirbrushTool3D";
import CreateCakeOrderModal from "./CreateCakeOrderModal";

// ─── Types ───────────────────────────────────────────
type CakeShape = "round" | "square" | "sheet" | "heart" | "hexagon" | "madHatter" | "topsy";
type FrostingStyle = "buttercream" | "fondant" | "ganache" | "naked" | "rustic" | "metallic" | "drip" | "ombre";
type DesignTab = "design" | "gallery" | "decorations" | "ai";

interface CakeTier {
  id: string; shape: CakeShape; diameter: number; height: number;
  flavor: string; color: string; frostingStyle: FrostingStyle;
  frostingColor: string; fillingFlavor: string; fillingColor: string;
  fillingLayers: number; visible: boolean; tiltAngle: number; offset: number;
}

interface Decoration {
  id: string; type: string; name: string; color: string; position: [number, number, number]; scale: number;
}

interface SavedDesign {
  id: string; name: string; version: string; tiers: CakeTier[];
  decorations: Decoration[]; created_at: string; thumbnail?: string;
  photo?: string; stand: string; standColor: string;
}

interface CakeDesign {
  name: string; tiers: CakeTier[]; decorations: Decoration[];
  stand: string; standColor: string; bgColor: string;
  autoRotate: boolean; showProduction: boolean; version: string;
}

// ─── Constants ───────────────────────────────────────
const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d"; const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)"; const ACCENT = "#c8a97e";
const API = typeof window !== "undefined" ? window.location.origin : "";

const FLAVORS = ["Vanilla Bean", "Chocolate", "Red Velvet", "Lemon", "Carrot", "Marble", "Funfetti", "Coconut", "Almond", "Strawberry", "Champagne", "Earl Grey", "Matcha", "Pistachio"];
const FILLINGS = ["Raspberry Jam", "Lemon Curd", "Chocolate Ganache", "Vanilla Custard", "Cream Cheese", "Salted Caramel", "Passionfruit", "Strawberry Mousse", "Hazelnut Praline", "Swiss Meringue", "None"];
const FROSTING_STYLES: { id: FrostingStyle; label: string; r: number; m: number }[] = [
  { id: "buttercream", label: "Buttercream", r: 0.55, m: 0.02 },
  { id: "fondant", label: "Fondant", r: 0.3, m: 0.05 },
  { id: "ganache", label: "Ganache", r: 0.2, m: 0.15 },
  { id: "naked", label: "Naked", r: 0.9, m: 0 },
  { id: "rustic", label: "Rustic", r: 0.7, m: 0.01 },
  { id: "metallic", label: "Metallic", r: 0.15, m: 0.6 },
  { id: "drip", label: "Drip", r: 0.35, m: 0.1 },
  { id: "ombre", label: "Ombre", r: 0.5, m: 0.02 },
];
const SHAPES: { id: CakeShape; label: string }[] = [
  { id: "round", label: "Round" }, { id: "square", label: "Square" },
  { id: "heart", label: "Heart" }, { id: "hexagon", label: "Hex" },
  { id: "sheet", label: "Sheet" }, { id: "madHatter", label: "Mad Hatter" },
  { id: "topsy", label: "Topsy" },
];
const DECORATION_LIBRARY = [
  { type: "flower", name: "Rose", color: "#e8555a", icon: Flower2 },
  { type: "flower", name: "Peony", color: "#f0a0b0", icon: Flower2 },
  { type: "flower", name: "Orchid", color: "#d0a0e0", icon: Flower2 },
  { type: "topper", name: "Gold Star", color: "#ffd700", icon: Star },
  { type: "topper", name: "Silver Star", color: "#c0c0c0", icon: Star },
  { type: "topper", name: "Pearl Cluster", color: "#f5f0e8", icon: Sparkles },
  { type: "drip", name: "Choc Drip", color: "#3d1c0a", icon: Droplets },
  { type: "drip", name: "Caramel Drip", color: "#c67c30", icon: Droplets },
  { type: "drip", name: "White Drip", color: "#f5f0e8", icon: Droplets },
  { type: "piping", name: "Shell Border", color: "#ffffff", icon: PenTool },
  { type: "piping", name: "Rope Border", color: "#c8a97e", icon: PenTool },
  { type: "piping", name: "Bead Border", color: "#ffd700", icon: PenTool },
  { type: "text", name: "Custom Text", color: "#c8a97e", icon: Type },
  { type: "sprinkle", name: "Rainbow", color: "#ff6b6b", icon: Sparkles },
  { type: "sprinkle", name: "Gold Leaf", color: "#ffd700", icon: Sparkles },
];

// ─── Advanced pro tool library (10 items) ────────────
type AdvancedTool = {
  id: string; name: string; category: string; icon: any;
  description: string; consumables: number; labor_min: number;
  action: "airbrush" | "picker" | "upload" | "simple";
  options?: string[];
};
const ADVANCED_TOOLS: AdvancedTool[] = [
  { id: "tool-airbrush", name: "Airbrush System", category: "coloring", icon: Wind,
    description: "3D airbrush with interchangeable nozzles. Stylus or mouse. Pressure, flow, opacity.",
    consumables: 1.25, labor_min: 12, action: "airbrush" },
  { id: "tool-fondant-drape", name: "Fondant Draping & Mats", category: "sculpting", icon: Layers,
    description: "Lace, damask, quilt, basketweave, linen, botanical impression mats.",
    consumables: 4.5, labor_min: 35, action: "picker",
    options: ["Lace", "Damask", "Quilt Diamond", "Basketweave", "Linen", "Botanical"] },
  { id: "tool-silicone-molds", name: "Silicone Detail Molds", category: "sculpting", icon: Flower2,
    description: "Peony, open rose, cameo, baroque scroll, jewel cluster, butterfly, feather.",
    consumables: 2.25, labor_min: 18, action: "picker",
    options: ["Peony", "Open Rose", "Lace Medallion", "Cameo Oval", "Baroque Scroll", "Jewel Cluster", "Butterfly", "Feather"] },
  { id: "tool-isomalt", name: "Isomalt Sugar Structures", category: "showpiece", icon: Gem,
    description: "Geodes, shards, ribbons, stained glass panels, bubble cages.",
    consumables: 6.0, labor_min: 45, action: "picker",
    options: ["Amethyst Geode", "Citrine Geode", "Crystal Shards", "Ribbon Bow", "Stained Glass", "Bubble Cage"] },
  { id: "tool-stencils", name: "Pattern Stencils", category: "coloring", icon: GridIcon,
    description: "Monogram, floral vine, geometric hex, damask, art-deco, Moroccan tile, quatrefoil.",
    consumables: 1.0, labor_min: 10, action: "picker",
    options: ["Monogram", "Floral Vine", "Geometric Hex", "Damask", "Art Deco", "Moroccan Tile", "Quatrefoil"] },
  { id: "tool-modeling-chocolate", name: "Modeling Chocolate Sculpt", category: "sculpting", icon: Hammer,
    description: "Figurines, ruffle drape, bows, sculpted roses, leaves.",
    consumables: 4.25, labor_min: 40, action: "picker",
    options: ["Figurine", "Ruffle Drape", "Bow", "Sculpted Rose", "Leaves"] },
  { id: "tool-luster-dust", name: "Luster & Pearl Metallic Dust", category: "coloring", icon: Sparkles,
    description: "Super gold, sterling silver, rose gold, pearl, iridescent, antique bronze.",
    consumables: 2.75, labor_min: 8, action: "picker",
    options: ["Super Gold", "Sterling Silver", "Rose Gold", "Pearl White", "Iridescent", "Antique Bronze", "Champagne", "Platinum"] },
  { id: "tool-edible-image", name: "Edible Image Print", category: "print", icon: ImageIcon,
    description: "Upload client photos / logos. Sugar sheet, frosting sheet, or wafer paper.",
    consumables: 3.5, labor_min: 5, action: "upload" },
  { id: "tool-buttercream-brush", name: "Buttercream Palette Brushes", category: "painting", icon: Brush,
    description: "Palette-knife, flat, fan, detail, stippling — paint direct on buttercream.",
    consumables: 0.5, labor_min: 25, action: "picker",
    options: ["Palette Knife", "Flat Brush", "Fan Brush", "Round Detail", "Stippling"] },
  { id: "tool-drip-control", name: "Drip Effects (Viscosity)", category: "finishing", icon: Droplet,
    description: "Fine-tuned drip viscosity. Dark choc, white choc, salted caramel, ruby, metallic gold, watercolor.",
    consumables: 1.75, labor_min: 10, action: "picker",
    options: ["Dark Chocolate", "White Chocolate", "Salted Caramel", "Ruby Chocolate", "Metallic Gold", "Watercolor"] },
];
const UNIT = 0.15;

const defaultTier = (idx: number): CakeTier => ({
  id: `tier-${Date.now()}-${idx}`, shape: "round",
  diameter: idx === 0 ? 10 : idx === 1 ? 8 : idx === 2 ? 6 : 5,
  height: 4, flavor: "Vanilla Bean", color: "#f5e6c8",
  frostingStyle: "buttercream", frostingColor: "#ffffff",
  fillingFlavor: "Raspberry Jam", fillingColor: "#c41e3a",
  fillingLayers: 1, visible: true, tiltAngle: 0, offset: 0,
});

// ─── 3D Components ──────────────────────────────────
function CakeTierMesh({ tier, yOffset }: { tier: CakeTier; yOffset: number }) {
  const h = tier.height * UNIT; const d = tier.diameter * UNIT; const r = d / 2;
  const fs = FROSTING_STYLES.find(f => f.id === tier.frostingStyle) || FROSTING_STYLES[0];
  const geo = React.useMemo(() => {
    const s = tier.shape;
    if (s === "round") return new THREE.CylinderGeometry(r, r, h, 64);
    if (s === "square") return new THREE.BoxGeometry(d, h, d);
    if (s === "hexagon") return new THREE.CylinderGeometry(r, r, h, 6);
    if (s === "sheet") return new THREE.BoxGeometry(d * 1.5, h, d);
    if (s === "madHatter") return new THREE.CylinderGeometry(r * 0.7, r, h, 64);
    if (s === "topsy") return new THREE.CylinderGeometry(r, r * 0.85, h, 64);
    if (s === "heart") {
      const hs = new THREE.Shape(); const sc = r * 0.6;
      hs.moveTo(0, sc * 0.3); hs.bezierCurveTo(0, sc, -sc * 1.5, sc * 1.2, -sc * 1.5, sc * 0.3);
      hs.bezierCurveTo(-sc * 1.5, -sc * 0.5, 0, -sc * 1.2, 0, -sc * 1.5);
      hs.bezierCurveTo(0, -sc * 1.2, sc * 1.5, -sc * 0.5, sc * 1.5, sc * 0.3);
      hs.bezierCurveTo(sc * 1.5, sc * 1.2, 0, sc, 0, sc * 0.3);
      const g = new THREE.ExtrudeGeometry(hs, { depth: h, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 6 });
      g.rotateX(-Math.PI / 2); g.translate(0, -h / 2, 0); return g;
    }
    return new THREE.CylinderGeometry(r, r, h, 64);
  }, [tier.shape, r, d, h]);

  const frostGeo = React.useMemo(() => {
    const ft = 0.04; const s = tier.shape;
    if (s === "round" || s === "hexagon" || s === "madHatter" || s === "topsy") {
      const segs = s === "hexagon" ? 6 : 64;
      const topR = s === "madHatter" ? r * 0.7 + ft : r + ft;
      const botR = s === "topsy" ? r * 0.85 + ft : r + ft;
      return new THREE.CylinderGeometry(topR, botR, h + ft * 2, segs);
    }
    const w = s === "sheet" ? d * 1.5 : d;
    return new THREE.BoxGeometry(w + ft * 2, h + ft * 2, d + ft * 2);
  }, [tier.shape, r, d, h]);

  const fillGeo = React.useMemo(() => {
    if (tier.shape === "round" || tier.shape === "hexagon" || tier.shape === "madHatter" || tier.shape === "topsy")
      return new THREE.CylinderGeometry(r - 0.02, r - 0.02, 0.03, tier.shape === "hexagon" ? 6 : 64);
    return new THREE.BoxGeometry(d - 0.04, 0.03, d - 0.04);
  }, [tier.shape, r, d]);

  if (!tier.visible) return null;
  const tiltRad = (tier.tiltAngle || 0) * Math.PI / 180;
  const ox = (tier.offset || 0) * UNIT;

  return (
    <group position={[ox, yOffset + h / 2, 0]} rotation={[0, 0, tiltRad]}>
      {tier.frostingStyle !== "naked" && (
        <mesh geometry={frostGeo}>
          <meshStandardMaterial color={tier.frostingColor} roughness={fs.r} metalness={fs.m} transparent opacity={0.92} />
        </mesh>
      )}
      <mesh geometry={geo}>
        <meshStandardMaterial color={tier.color} roughness={0.85} metalness={0.01} />
      </mesh>
      {tier.fillingFlavor !== "None" && Array.from({ length: tier.fillingLayers }).map((_, i) => (
        <mesh key={i} geometry={fillGeo} position={[0, -h / 2 + (h / (tier.fillingLayers + 1)) * (i + 1), 0]}>
          <meshStandardMaterial color={tier.fillingColor} roughness={0.5} transparent opacity={0.85} />
        </mesh>
      ))}
      {/* Drip effect */}
      {tier.frostingStyle === "drip" && Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const dripH = 0.08 + Math.random() * 0.12;
        return (
          <mesh key={`drip-${i}`} position={[Math.cos(angle) * r, -h / 2 - dripH / 2, Math.sin(angle) * r]}>
            <cylinderGeometry args={[0.015, 0.008, dripH, 8]} />
            <meshStandardMaterial color={tier.frostingColor} roughness={0.2} metalness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
}

function DecorationMesh({ dec }: { dec: Decoration }) {
  const color = dec.color || "#ffffff";
  if (dec.type === "flower") {
    return (
      <group position={dec.position} scale={dec.scale}>
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04]} rotation={[0, a, Math.PI / 6]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color={color} roughness={0.4} />
            </mesh>
          );
        })}
        <mesh><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#ffd700" roughness={0.3} /></mesh>
      </group>
    );
  }
  if (dec.type === "topper") {
    return (
      <group position={dec.position} scale={dec.scale}>
        <mesh><octahedronGeometry args={[0.05, 0]} /><meshStandardMaterial color={color} roughness={0.15} metalness={0.6} /></mesh>
      </group>
    );
  }
  return (
    <mesh position={dec.position} scale={[dec.scale, dec.scale, dec.scale]}>
      <sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function CakeStand({ color, radius }: { color: string; radius: number }) {
  return (
    <group position={[0, -0.08, 0]}>
      <mesh><cylinderGeometry args={[radius + 0.15, radius + 0.15, 0.04, 64]} /><meshStandardMaterial color={color} roughness={0.15} metalness={0.6} /></mesh>
      <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.12, 0.18, 0.35, 32]} /><meshStandardMaterial color={color} roughness={0.2} metalness={0.5} /></mesh>
      <mesh position={[0, -0.39, 0]}><cylinderGeometry args={[radius * 0.6, radius * 0.6, 0.04, 64]} /><meshStandardMaterial color={color} roughness={0.15} metalness={0.6} /></mesh>
    </group>
  );
}

function StudioScene({ design, sprayOverlays }: { design: CakeDesign; sprayOverlays?: Array<{ tierIdx: number; stroke: SprayStroke }> }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (groupRef.current && design.autoRotate) groupRef.current.rotation.y += delta * 0.3; });
  let yOffset = 0;
  const maxR = Math.max(...design.tiers.map(t => t.diameter * UNIT / 2), 0.5);
  // Flat list of all spray samples for the scene
  const allSamples = (sprayOverlays || []).flatMap(s => s.stroke.samples.map(sm => ({ ...sm, color: s.stroke.color })));
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-3, 4, -2]} intensity={0.6} color="#e8d5b7" />
      <pointLight position={[0, 6, 0]} intensity={0.4} color="#fff5e6" />
      <spotLight position={[-4, 6, 4]} intensity={0.8} angle={0.4} penumbra={0.5} color="#ffeedd" />
      <group ref={groupRef}>
        <CakeStand color={design.standColor} radius={maxR} />
        {design.tiers.map((tier) => {
          const comp = <CakeTierMesh key={tier.id} tier={tier} yOffset={yOffset} />;
          yOffset += tier.height * UNIT + 0.02; return comp;
        })}
        {design.decorations.map(dec => <DecorationMesh key={dec.id} dec={dec} />)}
        {allSamples.map((s: any, i) => (
          <mesh key={`spray-${i}`} position={[s.x, s.y, s.z]}>
            <sphereGeometry args={[(s.r || 0.04) * 0.7, 6, 6]} />
            <meshBasicMaterial color={s.color} transparent opacity={Math.min(0.85, (s.a || 0.5) * 0.8)} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <ContactShadows position={[0, -0.5, 0]} opacity={0.4} scale={8} blur={2.5} far={4} />
      <OrbitControls enablePan={false} minPolarAngle={Math.PI * 0.15} maxPolarAngle={Math.PI * 0.75} minDistance={1.5} maxDistance={6} target={[0, yOffset / 2, 0]} />
    </>
  );
}

// ─── Cost Calculator ────────────────────────────────
function calcCost(tiers: CakeTier[], decs: Decoration[]) {
  let servings = 0, foodCost = 0, laborHrs = 0;
  for (const t of tiers) {
    const vol = t.shape === "round" || t.shape === "madHatter" || t.shape === "topsy" || t.shape === "hexagon" || t.shape === "heart"
      ? Math.PI * (t.diameter / 2) ** 2 * t.height : t.diameter * t.diameter * t.height;
    const s = Math.round(vol / 12); servings += s;
    const fc = t.flavor === "Chocolate" ? 0.08 : t.flavor === "Red Velvet" ? 0.09 : t.flavor === "Matcha" ? 0.12 : 0.06;
    const frc = t.frostingStyle === "fondant" ? 0.12 : t.frostingStyle === "ganache" ? 0.10 : t.frostingStyle === "metallic" ? 0.15 : 0.05;
    foodCost += vol * (fc + frc); laborHrs += s * 0.04 + (t.fillingLayers * 0.25);
    if (t.shape === "madHatter" || t.shape === "topsy") laborHrs += 1.5;
  }
  foodCost += decs.length * 2.50; laborHrs += decs.length * 0.15;
  const laborCost = laborHrs * 28;
  return { servings, foodCost: Math.round(foodCost * 100) / 100, laborHrs: Math.round(laborHrs * 10) / 10, total: Math.round((foodCost + laborCost) * 100) / 100, laborCost: Math.round(laborCost * 100) / 100 };
}

// ─── Main Component ─────────────────────────────────
export default function CakeDesigner3D() {
  const [design, setDesign] = useState<CakeDesign>({
    name: "New Cake Design", tiers: [defaultTier(0), defaultTier(1)],
    decorations: [], stand: "pedestal", standColor: "#c0c0c0",
    bgColor: "#0a0a0a", autoRotate: true, showProduction: false, version: "V001",
  });
  const [selectedTier, setSelectedTier] = useState(0);
  const [activeTab, setActiveTab] = useState<DesignTab>("design");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ tiers: true, style: true, cost: true });
  const [gallery, setGallery] = useState<SavedDesign[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImage, setAiImage] = useState("");
  const [galleryPreview, setGalleryPreview] = useState<SavedDesign | null>(null);
  const [airbrushOpen, setAirbrushOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [sprayOverlays, setSprayOverlays] = useState<Array<{ tierIdx: number; stroke: SprayStroke }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAdvancedTool = (tool: AdvancedTool, option?: string) => {
    if (tool.action === "airbrush") {
      setAirbrushOpen(true);
      return;
    }
    if (tool.action === "upload") {
      fileInputRef.current?.click();
      return;
    }
    // picker / simple → add as a decoration on cake
    const label = option ? `${tool.name.split(" ")[0]} · ${option}` : tool.name;
    const topY = design.tiers.reduce((sum, t) => sum + t.height * UNIT + 0.02, 0);
    setDesign(prev => ({
      ...prev,
      decorations: [...prev.decorations, {
        id: `adv-${Date.now()}`, type: tool.category, name: label, color: ACCENT,
        position: [(Math.random() - 0.5) * 0.3, topY - 0.05, (Math.random() - 0.5) * 0.3], scale: 1,
      }],
    }));
  };

  const handleEdibleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const topY = design.tiers.reduce((sum, t) => sum + t.height * UNIT + 0.02, 0);
      setDesign(prev => ({
        ...prev,
        decorations: [...prev.decorations, {
          id: `edimg-${Date.now()}`, type: "edible_image",
          name: `Edible Image · ${file.name}`, color: "#ffffff",
          position: [0, topY - 0.05, 0], scale: 1,
        }],
      }));
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const applyAirbrushStroke = (stroke: SprayStroke) => {
    setSprayOverlays(prev => [...prev, { tierIdx: selectedTier, stroke }]);
    // Also add a decoration entry so it shows up in the on-cake list and costing
    const topY = design.tiers.reduce((sum, t) => sum + t.height * UNIT + 0.02, 0);
    setDesign(prev => ({
      ...prev,
      decorations: [...prev.decorations, {
        id: stroke.id, type: "airbrush", name: `Airbrush · ${stroke.nozzle_id.replace("noz-", "")}`,
        color: stroke.color,
        position: [(Math.random() - 0.5) * 0.2, topY - 0.1, (Math.random() - 0.5) * 0.2],
        scale: 1,
      }],
    }));
  };

  // Merge all applied spray samples per tier_id — used by airbrush modal to show prior strokes
  const existingSpraysByTier = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of sprayOverlays) {
      const tid = s.stroke.tier_id;
      if (!tid) continue;
      if (!map[tid]) map[tid] = [];
      map[tid].push(...(s.stroke.samples || []));
    }
    return map;
  }, [sprayOverlays]);

  useEffect(() => {
    const saved = localStorage.getItem("cake_gallery");
    if (saved) try { setGallery(JSON.parse(saved)); } catch {}
  }, []);

  const toggleSection = (s: string) => setExpanded(p => ({ ...p, [s]: !p[s] }));
  const updateTier = (idx: number, field: string, value: any) => setDesign(prev => ({ ...prev, tiers: prev.tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t) }));
  const addTier = () => setDesign(prev => ({ ...prev, tiers: [...prev.tiers, defaultTier(prev.tiers.length)] }));
  const removeTier = (idx: number) => { if (design.tiers.length <= 1) return; setDesign(prev => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== idx) })); if (selectedTier >= design.tiers.length - 1) setSelectedTier(Math.max(0, design.tiers.length - 2)); };

  const addDecoration = (lib: typeof DECORATION_LIBRARY[0]) => {
    const topY = design.tiers.reduce((sum, t) => sum + t.height * UNIT + 0.02, 0);
    setDesign(prev => ({ ...prev, decorations: [...prev.decorations, {
      id: `dec-${Date.now()}`, type: lib.type, name: lib.name, color: lib.color,
      position: [(Math.random() - 0.5) * 0.3, topY - 0.05, (Math.random() - 0.5) * 0.3], scale: 1,
    }] }));
  };
  const removeDecoration = (id: string) => setDesign(prev => ({ ...prev, decorations: prev.decorations.filter(d => d.id !== id) }));

  const saveToGallery = () => {
    const existing = gallery.filter(g => g.name === design.name);
    const verNum = existing.length + 1;
    const version = `V${String(verNum).padStart(3, "0")}`;
    const saved: SavedDesign = {
      id: `design-${Date.now()}`, name: design.name, version, tiers: [...design.tiers],
      decorations: [...design.decorations], created_at: new Date().toISOString(),
      stand: design.stand, standColor: design.standColor,
    };
    const updated = [saved, ...gallery];
    setGallery(updated);
    localStorage.setItem("cake_gallery", JSON.stringify(updated));
    setDesign(prev => ({ ...prev, version }));
  };

  const loadFromGallery = (saved: SavedDesign) => {
    setDesign(prev => ({ ...prev, name: saved.name, tiers: [...saved.tiers], decorations: [...saved.decorations], stand: saved.stand, standColor: saved.standColor, version: saved.version }));
    setActiveTab("design");
    setGalleryPreview(null);
  };

  const generateAiImage = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/api/ai-image/cake-concept`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt, tiers: design.tiers.length, style: "elegant", provider: "auto" }),
      });
      const data = await res.json();
      if (data.image_base64) setAiImage(`data:image/png;base64,${data.image_base64}`);
    } catch { /* ignore */ }
    setAiLoading(false);
  };

  const cost = calcCost(design.tiers, design.decorations);
  const tier = design.tiers[selectedTier];
  const TABS: { id: DesignTab; label: string; icon: typeof Layers }[] = [
    { id: "design", label: "Design", icon: Layers },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "decorations", label: "Decor", icon: Flower2 },
    { id: "tools", label: "Tools", icon: Wrench },
    { id: "ai", label: "AI", icon: Sparkles },
  ];

  return (
    <div data-testid="cake-designer-3d" className="flex h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}>
      {/* Left Panel */}
      <div className="w-72 shrink-0 overflow-auto scrollbar-hide border-r flex flex-col" style={{ borderColor: BORDER, background: "rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div className="px-3 py-2.5 border-b shrink-0" style={{ borderColor: BORDER }}>
          <input value={design.name} onChange={e => setDesign(p => ({ ...p, name: e.target.value }))} className="text-[11px] font-semibold text-white bg-transparent outline-none w-full" data-testid="cake-name-input" />
          <div className="flex items-center gap-2 text-[8px] mt-0.5" style={MONO}>
            <span style={{ color: `${ACCENT}80` }}>{design.version}</span>
            <span className="text-white/20">|</span>
            <span className="text-white/40">{design.tiers.length} tiers</span>
            <span className="text-white/20">|</span>
            <span className="text-white/40">{cost.servings} svgs</span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex shrink-0 border-b" style={{ borderColor: BORDER }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-medium transition-all"
              style={{ borderBottom: activeTab === t.id ? `2px solid ${ACCENT}` : "2px solid transparent", color: activeTab === t.id ? ACCENT : "rgba(148,163,184,0.4)" }}
              data-testid={`cake-tab-${t.id}`}>
              <t.icon className="w-3 h-3" />{t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto scrollbar-hide">
          {/* DESIGN TAB */}
          {activeTab === "design" && (
            <>
              <Section title="LAYERS" expanded={expanded.tiers} toggle={() => toggleSection("tiers")}>
                <div className="space-y-1">
                  {design.tiers.map((t, i) => (
                    <div key={t.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all" onClick={() => setSelectedTier(i)}
                      style={{ background: selectedTier === i ? `${ACCENT}10` : "transparent", border: selectedTier === i ? `1px solid ${ACCENT}25` : "1px solid transparent" }}>
                      <div className="w-4 h-4 rounded-sm border" style={{ background: t.frostingColor, borderColor: "rgba(255,255,255,0.1)" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-white truncate">Tier {i + 1}: {t.flavor}</div>
                        <div className="text-[8px] text-white/40">{t.diameter}" {t.shape} | {t.frostingStyle}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); updateTier(i, "visible", !t.visible); }} className="p-0.5">{t.visible ? <Eye className="w-3 h-3 text-white/40" /> : <EyeOff className="w-3 h-3 text-white/20" />}</button>
                      <button onClick={e => { e.stopPropagation(); removeTier(i); }} className="p-0.5 text-white/20 hover:text-red-400"><Minus className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={addTier} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] transition-all hover:bg-white/[0.03]" style={{ color: ACCENT }} data-testid="add-tier-btn">
                    <Plus className="w-3 h-3" /> Add Tier
                  </button>
                </div>
              </Section>

              {tier && (
                <Section title={`TIER ${selectedTier + 1}`} expanded={expanded.style} toggle={() => toggleSection("style")}>
                  <div className="space-y-2.5">
                    <div><label className="text-[9px] text-white/40 uppercase">Shape</label>
                      <div className="grid grid-cols-4 gap-1 mt-1">
                        {SHAPES.map(s => (
                          <button key={s.id} onClick={() => updateTier(selectedTier, "shape", s.id)} className="py-1 rounded text-[7px] font-medium transition-all"
                            style={{ background: tier.shape === s.id ? `${ACCENT}15` : "rgba(255,255,255,0.03)", color: tier.shape === s.id ? ACCENT : "rgba(148,163,184,0.5)", border: `1px solid ${tier.shape === s.id ? `${ACCENT}30` : BORDER}` }}>{s.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[9px] text-white/40 uppercase">Size ({tier.diameter}")</label><input type="range" min={4} max={18} value={tier.diameter} onChange={e => updateTier(selectedTier, "diameter", +e.target.value)} className="w-full h-1 mt-1 accent-[#c8a97e]" /></div>
                      <div><label className="text-[9px] text-white/40 uppercase">Height ({tier.height}")</label><input type="range" min={2} max={8} value={tier.height} onChange={e => updateTier(selectedTier, "height", +e.target.value)} className="w-full h-1 mt-1 accent-[#c8a97e]" /></div>
                    </div>
                    {(tier.shape === "madHatter" || tier.shape === "topsy") && (
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[9px] text-white/40 uppercase">Tilt ({tier.tiltAngle || 0}deg)</label><input type="range" min={-15} max={15} value={tier.tiltAngle || 0} onChange={e => updateTier(selectedTier, "tiltAngle", +e.target.value)} className="w-full h-1 mt-1 accent-[#c8a97e]" /></div>
                        <div><label className="text-[9px] text-white/40 uppercase">Offset ({tier.offset || 0})</label><input type="range" min={-3} max={3} value={tier.offset || 0} onChange={e => updateTier(selectedTier, "offset", +e.target.value)} className="w-full h-1 mt-1 accent-[#c8a97e]" /></div>
                      </div>
                    )}
                    <div><label className="text-[9px] text-white/40 uppercase">Flavor</label><select value={tier.flavor} onChange={e => updateTier(selectedTier, "flavor", e.target.value)} className="w-full mt-1 px-2 py-1 rounded text-[10px] bg-transparent outline-none text-white" style={{ border: `1px solid ${BORDER}` }}>{FLAVORS.map(f => <option key={f} value={f} style={{ background: "#111" }}>{f}</option>)}</select></div>
                    <div><label className="text-[9px] text-white/40 uppercase">Frosting</label>
                      <div className="grid grid-cols-4 gap-1 mt-1">
                        {FROSTING_STYLES.map(f => (<button key={f.id} onClick={() => updateTier(selectedTier, "frostingStyle", f.id)} className="py-1 rounded text-[7px] font-medium transition-all" style={{ background: tier.frostingStyle === f.id ? `${ACCENT}15` : "rgba(255,255,255,0.03)", color: tier.frostingStyle === f.id ? ACCENT : "rgba(148,163,184,0.5)", border: `1px solid ${tier.frostingStyle === f.id ? `${ACCENT}30` : BORDER}` }}>{f.label}</button>))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-[9px] text-white/40 uppercase">Cake</label><input type="color" value={tier.color} onChange={e => updateTier(selectedTier, "color", e.target.value)} className="w-full h-6 mt-1 rounded border-0 cursor-pointer" /></div>
                      <div><label className="text-[9px] text-white/40 uppercase">Frost</label><input type="color" value={tier.frostingColor} onChange={e => updateTier(selectedTier, "frostingColor", e.target.value)} className="w-full h-6 mt-1 rounded border-0 cursor-pointer" /></div>
                      <div><label className="text-[9px] text-white/40 uppercase">Fill</label><input type="color" value={tier.fillingColor} onChange={e => updateTier(selectedTier, "fillingColor", e.target.value)} className="w-full h-6 mt-1 rounded border-0 cursor-pointer" /></div>
                    </div>
                    <div><label className="text-[9px] text-white/40 uppercase">Filling ({tier.fillingLayers})</label><select value={tier.fillingFlavor} onChange={e => updateTier(selectedTier, "fillingFlavor", e.target.value)} className="w-full mt-1 px-2 py-1 rounded text-[10px] bg-transparent outline-none text-white" style={{ border: `1px solid ${BORDER}` }}>{FILLINGS.map(f => <option key={f} value={f} style={{ background: "#111" }}>{f}</option>)}</select>
                      <input type="range" min={0} max={3} value={tier.fillingLayers} onChange={e => updateTier(selectedTier, "fillingLayers", +e.target.value)} className="w-full h-1 mt-1.5 accent-[#c8a97e]" /></div>
                  </div>
                </Section>
              )}

              <Section title={design.showProduction ? "PRODUCTION VIEW" : "PRICING"} expanded={expanded.cost} toggle={() => toggleSection("cost")}>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]"><span className="text-white/50">Servings</span><span className="font-mono text-white">{cost.servings}</span></div>
                  {design.showProduction && (<>
                    <div className="flex justify-between text-[10px]"><span className="text-white/50">COGs</span><span className="font-mono" style={{ color: "#22c55e" }}>${cost.foodCost.toFixed(2)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-white/50">Labor ({cost.laborHrs}h)</span><span className="font-mono" style={{ color: "#3b82f6" }}>${cost.laborCost.toFixed(2)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-white/50">Total Cost</span><span className="font-mono" style={{ color: "#f59e0b" }}>${cost.total.toFixed(2)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-white/50">Cost/Serving</span><span className="font-mono text-white/60">${(cost.total / Math.max(cost.servings, 1)).toFixed(2)}</span></div>
                    <div className="flex justify-between text-[10px] pt-1" style={{ borderTop: `1px solid ${BORDER}` }}><span className="text-white/50">Suggested Price</span><span className="font-mono font-bold" style={{ color: ACCENT }}>${(cost.total * 3.2).toFixed(2)}</span></div>
                  </>)}
                  {!design.showProduction && (
                    <div className="flex justify-between text-[10px] pt-1" style={{ borderTop: `1px solid ${BORDER}` }}><span className="font-semibold text-white">Estimated Price</span><span className="font-mono font-bold text-lg" style={{ color: ACCENT }}>${(cost.total * 3.2).toFixed(0)}</span></div>
                  )}
                </div>
              </Section>
            </>
          )}

          {/* GALLERY TAB */}
          {activeTab === "gallery" && (
            <div className="p-3 space-y-2">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em]" style={{ color: `${ACCENT}60` }}>SAVED DESIGNS ({gallery.length})</div>
              {gallery.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-[10px]">No saved designs yet. Save your current design to start building your gallery.</div>
              ) : gallery.map(g => (
                <div key={g.id} className="p-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/[0.03]" onClick={() => setGalleryPreview(g)}
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={`gallery-item-${g.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-medium text-white">{g.name}</div>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${ACCENT}10`, color: ACCENT }}>{g.version}</span>
                  </div>
                  <div className="text-[8px] text-white/40 mt-0.5">{g.tiers.length} tiers | {g.decorations.length} decorations | {new Date(g.created_at).toLocaleDateString()}</div>
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={e => { e.stopPropagation(); loadFromGallery(g); }} className="flex-1 py-1 rounded text-[8px]" style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}20` }}>Load to Designer</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DECORATIONS TAB */}
          {activeTab === "decorations" && (
            <div className="p-3 space-y-3">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em]" style={{ color: `${ACCENT}60` }}>DECORATION LIBRARY</div>
              {["flower", "topper", "drip", "piping", "sprinkle", "text"].map(cat => (
                <div key={cat}>
                  <div className="text-[8px] uppercase font-semibold text-white/30 mb-1">{cat}s</div>
                  <div className="grid grid-cols-2 gap-1">
                    {DECORATION_LIBRARY.filter(d => d.type === cat).map((lib, i) => {
                      const Icon = lib.icon;
                      return (
                        <button key={i} onClick={() => addDecoration(lib)} className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[9px] transition-all hover:bg-white/[0.04]"
                          style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={`add-dec-${lib.name.toLowerCase().replace(/ /g, "-")}`}>
                          <Icon className="w-3 h-3" style={{ color: lib.color }} />
                          <span className="text-white/70">{lib.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {design.decorations.length > 0 && (
                <div>
                  <div className="text-[8px] uppercase font-semibold text-white/30 mb-1">ON CAKE ({design.decorations.length})</div>
                  {design.decorations.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-2 py-1 text-[9px]">
                      <span className="text-white/60">{d.name}</span>
                      <button onClick={() => removeDecoration(d.id)} className="text-white/20 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TOOLS TAB — 10 pro add-ons */}
          {activeTab === "tools" && (
            <div className="p-3 space-y-3">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em]" style={{ color: `${ACCENT}60` }}>
                PRO TOOL LIBRARY ({ADVANCED_TOOLS.length})
              </div>
              <div className="text-[9px] text-white/40 leading-snug">
                Advanced decorator tools — airbrush, fondant mats, isomalt, stencils, edible prints and more.
                Pick a tool to apply to <span style={{ color: ACCENT }}>Tier {selectedTier + 1}</span>.
              </div>

              {/* Category groups */}
              {["coloring", "sculpting", "showpiece", "painting", "print", "finishing"].map(cat => {
                const tools = ADVANCED_TOOLS.filter(t => t.category === cat);
                if (!tools.length) return null;
                return (
                  <div key={cat}>
                    <div className="text-[8px] uppercase font-semibold text-white/30 mb-1.5 mt-1">{cat}</div>
                    <div className="space-y-1.5">
                      {tools.map(tool => (
                        <AdvancedToolRow
                          key={tool.id}
                          tool={tool}
                          onActivate={(option) => handleAdvancedTool(tool, option)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Applied strokes summary */}
              {sprayOverlays.length > 0 && (
                <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div className="text-[8px] uppercase font-semibold text-white/30 mb-1.5">
                    AIRBRUSH STROKES ({sprayOverlays.length})
                  </div>
                  {sprayOverlays.map((s, i) => (
                    <div key={s.stroke.id} className="flex items-center justify-between px-2 py-1 text-[9px]">
                      <span className="flex items-center gap-1.5 text-white/60">
                        <span className="w-2 h-2 rounded-sm" style={{ background: s.stroke.color }} />
                        Tier {s.tierIdx + 1} · {s.stroke.nozzle_id.replace("noz-", "")}
                      </span>
                      <button
                        onClick={() => {
                          setSprayOverlays(prev => prev.filter((_, j) => j !== i));
                          setDesign(prev => ({ ...prev, decorations: prev.decorations.filter(d => d.id !== s.stroke.id) }));
                        }}
                        className="text-white/20 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI TAB */}
          {activeTab === "ai" && (
            <div className="p-3 space-y-3">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em]" style={{ color: `${ACCENT}60` }}>AI CAKE CONCEPT</div>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe your dream cake... e.g., '3-tier wedding cake with cascading roses, gold leaf, and marble fondant'" rows={4}
                className="w-full px-3 py-2 rounded-lg text-[10px] bg-transparent outline-none text-white placeholder-white/20 resize-none" style={{ border: `1px solid ${BORDER}` }} data-testid="ai-prompt-input" />
              <button onClick={generateAiImage} disabled={aiLoading || !aiPrompt.trim()} className="w-full py-2 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
                style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }} data-testid="ai-generate-btn">
                {aiLoading ? "Generating..." : "Generate Concept"}
              </button>
              {aiImage && (
                <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                  <img src={aiImage} alt="AI Cake Concept" className="w-full" />
                  <div className="p-2 text-[8px] text-white/40">AI-generated concept — use as reference for 3D design</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="px-3 py-2 space-y-1.5 shrink-0 border-t" style={{ borderColor: BORDER }}>
          <div className="flex gap-1.5">
            <button onClick={saveToGallery} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-medium" style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}20` }} data-testid="save-design-btn"><Save className="w-3 h-3" />Save</button>
            <button onClick={() => setDesign(p => ({ ...p, autoRotate: !p.autoRotate }))} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-medium" style={{ background: design.autoRotate ? `${ACCENT}10` : SURFACE, color: design.autoRotate ? ACCENT : "rgba(148,163,184,0.4)", border: `1px solid ${design.autoRotate ? `${ACCENT}20` : BORDER}` }} data-testid="auto-rotate-toggle"><RotateCw className="w-3 h-3" />Spin</button>
          </div>
          <button onClick={() => setOrderModalOpen(true)}
            className="w-full py-2 rounded-md text-[10px] font-semibold transition-all hover:brightness-110"
            style={{ background: ACCENT, color: "#0b1020" }}
            data-testid="create-order-btn">
            Create Order & Send Quote
          </button>
          <button onClick={() => setDesign(p => ({ ...p, showProduction: !p.showProduction }))}
            className="w-full py-1.5 rounded-md text-[9px] font-medium transition-all"
            style={{ background: design.showProduction ? "rgba(245,158,11,0.08)" : SURFACE, color: design.showProduction ? "#f59e0b" : "rgba(148,163,184,0.4)", border: `1px solid ${design.showProduction ? "rgba(245,158,11,0.15)" : BORDER}` }}
            data-testid="production-toggle">
            {design.showProduction ? "Production View ON" : "Client View"}
          </button>
        </div>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative" style={{ background: design.bgColor }}>
        <Canvas shadows camera={{ position: [2.5, 2, 2.5], fov: 35 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }} dpr={[1, 2]}>
          <color attach="background" args={[design.bgColor]} />
          <fog attach="fog" args={[design.bgColor, 8, 20]} />
          <Suspense fallback={null}><StudioScene design={design} sprayOverlays={sprayOverlays} /></Suspense>
        </Canvas>
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[9px] font-mono" style={{ background: "rgba(0,0,0,0.6)", color: ACCENT, backdropFilter: "blur(8px)" }}>
          {design.tiers.length} TIERS | {cost.servings} SVGS | {design.showProduction ? `$${cost.total.toFixed(0)} cost` : `$${(cost.total * 3.2).toFixed(0)}`} | {design.decorations.length} DEC
        </div>
        <div className="absolute bottom-3 left-3 text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>Drag to rotate | Scroll to zoom</div>
      </div>

      {/* Gallery Preview Modal */}
      {galleryPreview && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={() => setGalleryPreview(null)}>
          <div className="w-[500px] p-6 rounded-xl" style={{ background: "#0b0f1a", border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[14px] font-semibold text-white">{galleryPreview.name}</div>
                <div className="text-[10px] font-mono" style={{ color: ACCENT }}>{galleryPreview.version} | {new Date(galleryPreview.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => setGalleryPreview(null)}><X className="w-4 h-4 text-white/40" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {galleryPreview.tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <div className="w-3 h-3 rounded-sm" style={{ background: t.frostingColor }} />
                  <span className="text-white">Tier {i + 1}: {t.diameter}" {t.shape} {t.flavor}</span>
                  <span className="text-white/40">{t.frostingStyle}</span>
                </div>
              ))}
            </div>
            {galleryPreview.photo && <img src={galleryPreview.photo} alt="Finished" className="w-full rounded-lg mb-3" />}
            <div className="flex gap-2">
              <button onClick={() => loadFromGallery(galleryPreview)} className="flex-1 py-2 rounded-lg text-[11px] font-medium" style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>Load & Edit</button>
              <button onClick={() => setGalleryPreview(null)} className="px-4 py-2 rounded-lg text-[11px] font-medium text-white/50" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input — for Edible Image Print tool */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleEdibleImage}
        data-testid="edible-image-upload"
      />

      {/* Airbrush 3D modal */}
      <AirbrushTool3D
        open={airbrushOpen}
        onClose={() => setAirbrushOpen(false)}
        onApply={(stroke) => applyAirbrushStroke(stroke)}
        tiers={design.tiers}
        selectedTierIdx={selectedTier}
        existingSprays={existingSpraysByTier}
      />

      {/* Create Cake Order modal */}
      <CreateCakeOrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        design={{
          name: design.name,
          version: design.version,
          tiers: design.tiers,
          decorations: design.decorations,
        }}
        costing={cost}
      />
    </div>
  );
}

function AdvancedToolRow({
  tool, onActivate,
}: {
  tool: AdvancedTool;
  onActivate: (option?: string) => void;
}) {
  const Icon = tool.icon;
  const [open, setOpen] = useState(false);
  const isPicker = tool.action === "picker" && (tool.options?.length || 0) > 0;
  return (
    <div className="rounded-md transition-all" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <button
        onClick={() => (isPicker ? setOpen(o => !o) : onActivate())}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
        data-testid={`advanced-tool-${tool.id}`}
      >
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: ACCENT }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-semibold text-white truncate">{tool.name}</span>
          <span className="block text-[8px] text-white/40 truncate">{tool.description}</span>
        </span>
        <span className="text-[8px] font-mono text-white/30 shrink-0">
          +${tool.consumables.toFixed(2)} · {tool.labor_min}min
        </span>
        {isPicker && <ChevronRight className={`w-3 h-3 text-white/30 transition-transform ${open ? "rotate-90" : ""}`} />}
      </button>
      {isPicker && open && (
        <div className="px-2.5 pb-2 grid grid-cols-2 gap-1">
          {tool.options!.map(o => (
            <button
              key={o}
              onClick={() => { onActivate(o); setOpen(false); }}
              className="text-[9px] px-2 py-1 rounded text-left transition-all hover:bg-white/[0.05]"
              style={{ background: "rgba(255,255,255,0.02)", color: "rgba(226,232,240,0.8)", border: `1px solid ${BORDER}` }}
              data-testid={`advanced-tool-opt-${tool.id}-${o.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, expanded, toggle, children }: { title: string; expanded: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={toggle} className="w-full flex items-center justify-between px-3 py-2 text-[9px] font-mono uppercase tracking-[0.15em] transition-all hover:bg-white/[0.02]" style={{ color: "rgba(200,169,126,0.6)" }}>
        {title}{expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
