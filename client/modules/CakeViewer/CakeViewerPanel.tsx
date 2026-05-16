/**
 * CakeViewerPanel (iter151 — premier build · refactored iter152)
 * ------------------------------------------------------------------
 * Tabs: Design | Client Intake | Cut Guide | Portions & Cost | Templates
 *
 * Decomposed into small modules for maintainability:
 *  - types.ts          → shared types & design tokens
 *  - CakeScene3D.tsx   → Three.js scene
 *  - DesignTab.tsx     → tier/Mad-Hatter/fillings/toppers/scene
 *  - CakeViewerTabs.tsx→ Intake, CutGuide, Portions, Templates tabs
 */
import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Lightformer, Environment } from "@react-three/drei";
import * as THREE from "three";
import {
  RotateCw, Save, Share2, Sparkles, Scissors, FileText, DollarSign, Wand2,
} from "lucide-react";

import type { Tier, Topper, Intake, FlowerDeco } from "./types";
import { ACCENT, BORDER, blankTier } from "./types";
import { CakeScene3D } from "./CakeScene3D";
import DesignTab from "./DesignTab";
import { IntakeTab, CutGuideTab, PortionsTab, TemplatesTab } from "./CakeViewerTabs";
import AIStudioTab from "./AIStudioTab";
import DesktopOnlyGate from "../../components/DesktopOnlyGate";

const API = typeof window !== "undefined" ? window.location.origin : "";

const DEFAULT_TIERS: Tier[] = [
  blankTier({ height: 0.6, radius: 1.2, color: "#fff8f2",
    fillings: [
      { name: "Vanilla Génoise", color: "#f5d9a7", height: 0.14, cost_per_serving_usd: 0.55, kind: "genoise", flavor: "Madagascar vanilla" },
      { name: "Raspberry Gelée", color: "#c73a5b", height: 0.05, cost_per_serving_usd: 0.30, kind: "gelee", flavor: "fresh raspberry" },
      { name: "Swiss Buttercream", color: "#fff2d8", height: 0.08, cost_per_serving_usd: 0.45, kind: "cremeux" },
      { name: "Vanilla Génoise", color: "#f5d9a7", height: 0.14, cost_per_serving_usd: 0.55, kind: "genoise" },
      { name: "Raspberry Gelée", color: "#c73a5b", height: 0.05, cost_per_serving_usd: 0.30, kind: "gelee" },
      { name: "Vanilla Génoise", color: "#f5d9a7", height: 0.12, cost_per_serving_usd: 0.55, kind: "genoise" },
    ],
  }),
  blankTier({
    height: 0.5, radius: 0.9, color: "#f5e5d3",
    fillings: [
      { name: "Chocolate Joconde", color: "#3d2414", height: 0.12, cost_per_serving_usd: 0.60, kind: "joconde", flavor: "Valrhona 70%" },
      { name: "Dark Ganache", color: "#2a1408", height: 0.06, cost_per_serving_usd: 0.72, kind: "ganache", aeration: 0.3 },
      { name: "Praliné Feuilletine", color: "#a0622a", height: 0.04, cost_per_serving_usd: 0.95, kind: "feuilletine", flavor: "Piedmont hazelnut" },
      { name: "Chocolate Joconde", color: "#3d2414", height: 0.12, cost_per_serving_usd: 0.60, kind: "joconde" },
      { name: "Chocolate Mousse", color: "#5a3420", height: 0.12, cost_per_serving_usd: 0.75, kind: "mousse", aeration: 0.6 },
      { name: "Mirror Glaze", color: "#1a0e06", height: 0.02, cost_per_serving_usd: 0.50, kind: "glaze" },
    ],
  }),
  blankTier({
    height: 0.4, radius: 0.6, color: "#e8c9a8",
    fillings: [
      { name: "Lemon Dacquoise", color: "#fce486", height: 0.12, cost_per_serving_usd: 0.55, kind: "dacquoise", flavor: "Sicilian lemon" },
      { name: "Yuzu Crémeux", color: "#ffe066", height: 0.06, cost_per_serving_usd: 0.60, kind: "cremeux" },
      { name: "Lemon Curd Insert", color: "#f6b73c", height: 0.05, cost_per_serving_usd: 0.48, kind: "curd" },
      { name: "Lemon Dacquoise", color: "#fce486", height: 0.1, cost_per_serving_usd: 0.55, kind: "dacquoise" },
      { name: "Yuzu Mousse", color: "#fff2b3", height: 0.07, cost_per_serving_usd: 0.68, kind: "mousse", aeration: 0.75 },
    ],
  }),
];

type Tab = "design" | "intake" | "cut" | "portions" | "templates" | "ai";

export default function CakeViewerPanel() {
  const [tab, setTab] = useState<Tab>("design");
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [toppers, setToppers] = useState<Topper[]>([]);
  const [flowers, setFlowers] = useState<FlowerDeco[]>([]);
  const [intake, setIntake] = useState<Intake>({ slice_size: "wedding" });
  const [spin, setSpin] = useState(true);
  const [cutaway, setCutaway] = useState(false);
  const [standColor, setStandColor] = useState("#2a2115");
  const [standKind, setStandKind] = useState<string>("gold_ornate");
  const [bg, setBg] = useState("#0b1628");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingFillingsFor, setEditingFillingsFor] = useState<number | null>(null);
  const [editingMadHatterFor, setEditingMadHatterFor] = useState<number | null>(null);
  const [sizing, setSizing] = useState<any>(null);
  const [cutGuide, setCutGuide] = useState<any>(null);
  const [portions, setPortions] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    const m = window.location.hash.match(/cake-view=([^&]+)/);
    if (m) loadSession(m[1]);
    fetch(`${API}/api/cake-viewer/templates`)
      .then(r => r.json())
      .then(d => setTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadSession = async (sid: string) => {
    try {
      const r = await fetch(`${API}/api/cake-viewer/sessions/${sid}`).then(r => r.json());
      if (r?.tiers) {
        setTiers(r.tiers.map((t: any) => ({ ...blankTier(), ...t })));
        setToppers(r.toppers || []);
        setFlowers(r.flowers || []);
        setIntake(r.intake || { slice_size: "wedding" });
        setStandColor(r.stand_color || "#2a2115");
        setBg(r.background || "#0b1628");
        setSessionId(sid);
      }
    } catch {}
  };

  const applyTemplate = async (id: string) => {
    try {
      const t = await fetch(`${API}/api/cake-viewer/templates/${id}`).then(r => r.json());
      setTiers((t.tiers || []).map((tr: any) => ({ ...blankTier(), ...tr })));
      setToppers(t.toppers || []);
      setFlowers(t.flowers || []);
      if (t.background) setBg(t.background);
      if (t.stand_kind) setStandKind(t.stand_kind);
      setTab("design");
      setCutaway(false);
      flashToast(`Applied · ${t.title}`);
    } catch {
      flashToast("Template load failed");
    }
  };

  const fetchSizing = async () => {
    if (!intake.guest_count) return setSizing(null);
    const r = await fetch(`${API}/api/cake-viewer/sizing-calculator?guests=${intake.guest_count}&slice_size=${intake.slice_size || "wedding"}`)
      .then(r => r.json()).catch(() => null);
    setSizing(r);
  };

  const fetchCutGuide = async () => {
    if (!tiers[0]) return;
    const diameter_in = tiers[0].radius * 2 * 5;
    const r = await fetch(`${API}/api/cake-viewer/cut-guide?diameter_in=${diameter_in}&slice_size=${intake.slice_size || "wedding"}`)
      .then(r => r.json()).catch(() => null);
    setCutGuide(r);
  };

  const fetchPortions = async () => {
    if (!sessionId) return flashToast("Save the cake first to estimate portions");
    const priceParam = intake.price_quote_usd ? `&price_per_serving_usd=${intake.price_quote_usd / 100}` : "";
    const r = await fetch(`${API}/api/cake-viewer/portion-estimator?session_id=${sessionId}&slice_size=${intake.slice_size || "wedding"}${priceParam}`)
      .then(r => r.json()).catch(() => null);
    setPortions(r);
  };

  useEffect(() => { if (tab === "intake") fetchSizing(); /* eslint-disable-next-line */ }, [tab, intake.guest_count, intake.slice_size]);
  useEffect(() => { if (tab === "cut") fetchCutGuide(); /* eslint-disable-next-line */ }, [tab, tiers, intake.slice_size]);
  useEffect(() => { if (tab === "portions") fetchPortions(); /* eslint-disable-next-line */ }, [tab]);

  const saveSession = async () => {
    setSaving(true);
    try {
      const payload = {
        title: intake.client_name ? `${intake.client_name} · ${intake.event_type || "Cake"}` : "Cake Preview",
        tiers, toppers, flowers, intake, background: bg, stand_color: standColor,
      };
      const url = sessionId
        ? `${API}/api/cake-viewer/sessions/${sessionId}`
        : `${API}/api/cake-viewer/sessions`;
      const method = sessionId ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(r => r.json());
      if (r?.session_id) {
        setSessionId(r.session_id);
        window.location.hash = `cake-view=${r.session_id}`;
      }
      flashToast(sessionId ? "Updated" : `Saved · ${r.session_id || ""}`);
    } catch {
      flashToast("Save failed");
    }
    setSaving(false);
  };

  const share = () => {
    if (!sessionId) return flashToast("Save first to get a link");
    const url = `${window.location.origin}${window.location.pathname}#cake-view=${sessionId}`;
    navigator.clipboard?.writeText(url).then(() => flashToast("Share link copied"));
  };

  const [posRouting, setPosRouting] = useState(false);
  const sendToPOS = async () => {
    if (!sessionId) return flashToast("Save the cake first");
    const clientName = prompt("Client name for POS order?");
    if (!clientName) return;
    const pickupDate = prompt("Pickup date (YYYY-MM-DD)?");
    if (!pickupDate) return;
    setPosRouting(true);
    try {
      const pricePerServing = 12; // sensible default; real pricing comes from costing engine
      const totalServings = tiers.reduce((s, t) => s + Math.round((t.radius * 10) ** 2 * 0.3), 0);
      const body = {
        design_name: `CakeView ${sessionId.slice(-6)}`,
        version: "V001",
        client: { name: clientName, email: "", phone: "" },
        pickup_date: pickupDate,
        pickup_time: "14:00",
        tiers: tiers.map((t, i) => ({
          tier: i + 1,
          diameter_in: Math.round(t.radius * 20),
          height_in: Math.round(t.height * 10),
          flavor: (t.fillings?.[0]?.flavor) || "Vanilla",
          filling: (t.fillings?.[1]?.name) || "Buttercream",
          servings: Math.round((t.radius * 10) ** 2 * 0.3),
        })),
        decorations: [],
        total_servings: totalServings,
        costing: { suggested_price: totalServings * pricePerServing, total_cost: totalServings * pricePerServing * 0.4 },
        notes: `Created from 3D Cake Viewer session ${sessionId}`,
        create_deposit_link: true,
      };
      const r = await fetch(`${API}/api/cake-orders/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      const ord = d?.order || d;
      if (r.ok && ord?.order_number) {
        flashToast(`POS Order ${ord.order_number} created${ord.deposit_link ? " · deposit link ready" : ""}`);
      } else {
        flashToast(`POS failed: ${(d?.detail || "error").toString().slice(0, 40)}`);
      }
    } catch (e: any) {
      flashToast(`POS error: ${(e.message || "").slice(0, 40)}`);
    } finally {
      setPosRouting(false);
    }
  };

  const addTier = () => {
    if (tiers.length >= 6) return;
    const last = tiers[tiers.length - 1];
    setTiers([...tiers, blankTier({ radius: Math.max(0.3, last.radius - 0.3), color: last.color })]);
  };
  const removeTier = (i: number) => setTiers(tiers.filter((_, idx) => idx !== i));

  const addTopper = (kind: Topper["kind"]) => {
    const label = kind === "number" ? "25" : kind === "monogram" ? "M&J" : undefined;
    setToppers([...toppers, {
      kind, label, color: ACCENT,
      x: (Math.random() - 0.5) * 0.6,
      z: (Math.random() - 0.5) * 0.6,
      scale: 1,
    }]);
  };

  const applySizingRecommendation = () => {
    if (!sizing?.recommended?.tiers_in) return;
    const newTiers = sizing.recommended.tiers_in.slice().reverse().map((diam_in: number, idx: number) => {
      const base = tiers[tiers.length - 1 - idx] || tiers[0];
      return { ...blankTier(), ...base, radius: diam_in / 10, height: 0.45 + idx * 0.05 };
    });
    setTiers(newTiers);
    flashToast(`Sized for ${sizing.guests} guests`);
  };

  const tabCls = (t: Tab) => `px-3 py-1.5 rounded text-[10px] cursor-pointer flex items-center gap-1.5 ${tab === t ? "font-semibold" : ""}`;
  const tabStyle = (t: Tab) => ({
    background: tab === t ? `${ACCENT}28` : "transparent",
    color: tab === t ? ACCENT : "var(--foreground, #cbd5e1)",
    border: `1px solid ${tab === t ? ACCENT + "60" : "transparent"}`,
  });

  return (
    <DesktopOnlyGate panelName="3D Cake Designer">
    <div className="w-full h-full flex flex-col" style={{ background: "var(--background, #0b1020)", color: "var(--foreground, #ffffff)" }} data-testid="cake-viewer-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b flex-wrap gap-2" style={{ borderColor: "var(--border, " + BORDER + ")", background: "var(--surface, #0b1020)" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>EchoCanvas · 3D Cake Studio</div>
          <div className="text-[16px] font-semibold" style={{ color: "var(--foreground, #fff)" }}>
            {intake.client_name ? `${intake.client_name} · ${intake.event_type || "Cake"}` : "Cake Viewer"}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSpin(!spin)} className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px]" style={{ background: spin ? `${ACCENT}22` : "transparent", color: ACCENT, border: `1px solid ${ACCENT}40` }} data-testid="spin-toggle">
            <RotateCw size={11} className={spin ? "animate-spin" : ""} /> {spin ? "Rotating" : "Paused"}
          </button>
          <button onClick={() => setCutaway(!cutaway)} className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px]" style={{ background: cutaway ? `${ACCENT}44` : "transparent", color: ACCENT, border: `1px solid ${ACCENT}40`, fontWeight: cutaway ? "bold" : "normal" }} data-testid="cutaway-toggle">
            <Scissors size={11} /> {cutaway ? "Cutaway ON" : "Cutaway OFF"}
          </button>
          <button onClick={saveSession} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px]" style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}40`, opacity: saving ? 0.6 : 1 }} data-testid="save-session">
            <Save size={11} /> {saving ? "Saving…" : sessionId ? "Update" : "Save"}
          </button>
          <button onClick={share} className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px]" style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT}40` }} data-testid="share-session">
            <Share2 size={11} /> Share
          </button>
          <button onClick={sendToPOS} disabled={posRouting || !sessionId} className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px]" style={{ background: `${ACCENT}`, color: "#0b1020", border: 0, fontWeight: 700, opacity: posRouting || !sessionId ? 0.5 : 1 }} data-testid="send-to-pos">
            <DollarSign size={11} /> {posRouting ? "Routing…" : "Send to POS"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b flex-wrap" style={{ borderColor: "var(--border, " + BORDER + ")" }}>
        <button onClick={() => setTab("design")} className={tabCls("design")} style={tabStyle("design")} data-testid="tab-design"><Sparkles size={10} /> Design</button>
        <button onClick={() => setTab("intake")} className={tabCls("intake")} style={tabStyle("intake")} data-testid="tab-intake"><FileText size={10} /> Client Intake</button>
        <button onClick={() => setTab("cut")} className={tabCls("cut")} style={tabStyle("cut")} data-testid="tab-cut"><Scissors size={10} /> Cut Guide</button>
        <button onClick={() => setTab("portions")} className={tabCls("portions")} style={tabStyle("portions")} data-testid="tab-portions"><DollarSign size={10} /> Portions & Cost</button>
        <button onClick={() => setTab("templates")} className={tabCls("templates")} style={tabStyle("templates")} data-testid="tab-templates"><Wand2 size={10} /> Templates</button>
        <button onClick={() => setTab("ai")} className={tabCls("ai")} style={tabStyle("ai")} data-testid="tab-ai"><Sparkles size={10} /> AI Studio</button>
        {intake.beo_number && (
          <span className="ml-auto text-[10px] px-2 py-1 rounded" style={{ background: `${ACCENT}18`, color: ACCENT }}>BEO {intake.beo_number}</span>
        )}
      </div>

      {/* Split: 3D canvas | tab content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] overflow-hidden">
        <div className="relative" style={{ background: bg }} data-testid="cake-canvas-wrap">
          <Canvas shadows camera={{ position: [3.5, 2.5, 4], fov: 38 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08, outputColorSpace: THREE.SRGBColorSpace }} dpr={[1, 2]}>
            <color attach="background" args={[bg]} />
            {/* Self-contained studio environment (no external HDRI fetch) */}
            <Environment resolution={256} background={false}>
              <Lightformer intensity={6} position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[12, 12, 1]} color="#fff6e6" />
              <Lightformer intensity={3} position={[-5, 3, 4]} rotation={[0, -Math.PI / 4, 0]} scale={[4, 6, 1]} color="#ffefd6" />
              <Lightformer intensity={2} position={[5, 3, -3]} rotation={[0, Math.PI / 3, 0]} scale={[4, 6, 1]} color="#fce6ff" />
              <Lightformer intensity={1} position={[0, 2, 6]} rotation={[0, 0, 0]} scale={[6, 4, 1]} color="#dfeaff" />
              <Lightformer form="ring" intensity={2} position={[0, 4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={5} color="#ffffff" />
            </Environment>
            <ContactShadows position={[0, -0.12, 0]} opacity={0.7} scale={8} blur={2.6} far={4} resolution={1024} color="#000000" />
            <CakeScene3D tiers={tiers} toppers={toppers} spin={spin} standColor={standColor} cutaway={cutaway} flowers={flowers} standKind={standKind as any} />
            <OrbitControls enablePan enableZoom minDistance={2} maxDistance={10} maxPolarAngle={Math.PI / 2 - 0.05} />
          </Canvas>
          {toast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded text-[11px]" style={{ background: "rgba(0,0,0,0.8)", color: ACCENT, border: `1px solid ${ACCENT}60` }} data-testid="cake-toast">{toast}</div>
          )}
          <div className="absolute bottom-3 left-3 text-[9px]" style={{ color: "#64748b" }}>Drag to orbit · Scroll to zoom</div>
        </div>

        <div className="border-l overflow-y-auto" style={{ borderColor: "var(--border, " + BORDER + ")", background: "var(--surface, transparent)" }}>
          {tab === "design" && (
            <DesignTab
              tiers={tiers} setTiers={setTiers}
              toppers={toppers} setToppers={setToppers}
              flowers={flowers} setFlowers={setFlowers}
              addTier={addTier} removeTier={removeTier} addTopper={addTopper}
              editingFillingsFor={editingFillingsFor} setEditingFillingsFor={setEditingFillingsFor}
              editingMadHatterFor={editingMadHatterFor} setEditingMadHatterFor={setEditingMadHatterFor}
              bg={bg} setBg={setBg} standColor={standColor} setStandColor={setStandColor}
              standKind={standKind} setStandKind={setStandKind}
            />
          )}
          {tab === "intake" && <IntakeTab intake={intake} setIntake={setIntake} sizing={sizing} applySizing={applySizingRecommendation} />}
          {tab === "cut" && <CutGuideTab cutGuide={cutGuide} tiers={tiers} />}
          {tab === "portions" && <PortionsTab portions={portions} sessionId={sessionId} refresh={fetchPortions} />}
          {tab === "templates" && <TemplatesTab templates={templates} apply={applyTemplate} />}
          {tab === "ai" && (
            <AIStudioTab
              sessionId={sessionId}
              tiers={tiers}
              toppers={toppers}
              flowers={flowers}
              intake={intake}
              standKind={standKind}
              background={bg}
              saveFirst={async () => {
                if (sessionId) return sessionId;
                await saveSession();
                return sessionId;
              }}
              applyPalette={(hexes) => {
                // Apply first N hex colors to tiers; remaining to flowers
                setTiers(prev => prev.map((t, i) => ({ ...t, color: hexes[i] || t.color })));
                flashToast("Palette applied to tiers");
              }}
              applyDescription={(text) => {
                setIntake({ ...intake, theme: text });
                flashToast("Description attached");
              }}
            />
          )}
        </div>
      </div>
    </div>
    </DesktopOnlyGate>
  );
}
