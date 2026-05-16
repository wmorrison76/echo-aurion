import React, { useState, useEffect, useCallback } from "react";
import { View, Plus, Trash2, MapPin, Image, Settings, Eye, RefreshCw, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BACKEND}/api/vr-walkthrough${path}`, {
    headers: { "Content-Type": "application/json" }, ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "tours" | "viewer" | "configs";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "tours", label: "Virtual Tours", icon: View },
  { id: "viewer", label: "360 Viewer", icon: Eye },
  { id: "configs", label: "Room Configs", icon: Layout },
];

const ROOM_TYPE_COLORS: Record<string, string> = {
  ballroom: "text-amber-400", terrace: "text-cyan-400", boardroom: "text-blue-400",
  pavilion: "text-emerald-400", restaurant: "text-rose-400", conference: "text-violet-400",
};

export default function VrWalkthroughPanel() {
  const [tab, setTab] = useState<TabId>("tours");
  const [activeTour, setActiveTour] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="vr-walkthrough-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(168,85,247,0.15))", border: "1px solid rgba(6,182,212,0.25)" }}>
          <View className="w-[18px] h-[18px] text-cyan-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">VR / 360 Walkthrough</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Panoramic Room Preview & Virtual Tours</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`vr-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#06b6d4" : "transparent", color: tab === t.id ? "#67e8f9" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "tours" && <ToursTab onSelect={(id) => { setActiveTour(id); setTab("viewer"); }} />}
        {tab === "viewer" && <ViewerTab tourId={activeTour} />}
        {tab === "configs" && <ConfigsTab />}
      </div>
    </div>
  );
}

function ToursTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [tours, setTours] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => { api("/tours").then(d => setTours(d.tours)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const createTour = async () => {
    setCreating(true);
    try {
      const result = await api("/tours", { method: "POST", body: JSON.stringify({ name: `Tour ${tours.length + 1}`, venue: "Main Resort", room_type: "ballroom", capacity: 300 }) });
      load();
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-3" data-testid="vr-tours-tab">
      <button data-testid="create-tour-btn" onClick={createTour} disabled={creating}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/20 text-cyan-300 text-xs font-mono uppercase tracking-wider disabled:opacity-50">
        <Plus className="w-3.5 h-3.5" /> {creating ? "Creating..." : "New Virtual Tour"}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tours.map(tour => (
          <div key={tour.tour_id} data-testid={`tour-card-${tour.tour_id}`}
            className="rounded-lg border border-slate-700/30 bg-slate-800/40 overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-colors"
            onClick={() => onSelect(tour.tour_id)}>
            {/* Placeholder panorama preview */}
            <div className="h-28 bg-gradient-to-br from-slate-700/50 to-slate-800/80 flex items-center justify-center relative">
              <View className="w-8 h-8 text-slate-600" />
              <span className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded bg-black/40 text-white font-mono">{tour.scene_count} scenes</span>
              <span className={cn("absolute bottom-2 left-2 text-[8px] px-1.5 py-0.5 rounded font-mono",
                tour.status === "published" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
              )}>{tour.status}</span>
            </div>
            <div className="p-3">
              <div className="text-xs font-semibold text-white mb-0.5">{tour.name}</div>
              <div className="text-[10px] text-slate-400">{tour.venue}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[9px]">
                <span className={ROOM_TYPE_COLORS[tour.room_type] || "text-slate-400"}>{tour.room_type}</span>
                {tour.capacity > 0 && <span className="text-slate-500">{tour.capacity} pax</span>}
              </div>
              {tour.description && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{tour.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewerTab({ tourId }: { tourId: string | null }) {
  const [tour, setTour] = useState<any>(null);
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    if (!tourId) return;
    api(`/tours/${tourId}`).then(setTour).catch(() => {});
  }, [tourId]);

  if (!tourId) return <div className="text-xs text-slate-500 text-center py-8">Select a tour to preview.</div>;
  if (!tour) return <Loading />;

  return (
    <div className="space-y-4" data-testid="vr-viewer-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">{tour.name}</span>
        <span className="text-[9px] font-mono text-slate-500">{tour.scene_count} scenes</span>
      </div>

      {/* 360 Viewer Placeholder */}
      <div className="relative bg-slate-900/60 rounded-lg border border-cyan-500/20 h-72 overflow-hidden">
        {/* Simulated 360 panorama with gradient */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, 
            rgba(6,182,212,0.08) 0%, 
            rgba(168,85,247,0.05) 25%, 
            rgba(245,158,11,0.08) 50%, 
            rgba(16,185,129,0.05) 75%, 
            rgba(59,130,246,0.08) 100%)`
        }} />

        {/* Grid overlay for spatial reference */}
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />

        {/* Center point indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-cyan-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
          </div>
        </div>

        {/* Simulated hotspots */}
        <div className="absolute top-8 left-1/4 flex flex-col items-center gap-1 cursor-pointer group">
          <MapPin className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">Stage Area</span>
        </div>
        <div className="absolute bottom-12 right-1/4 flex flex-col items-center gap-1 cursor-pointer group">
          <MapPin className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">Bar Station</span>
        </div>
        <div className="absolute top-1/3 right-1/6 flex flex-col items-center gap-1 cursor-pointer group">
          <MapPin className="w-5 h-5 text-violet-400 group-hover:text-violet-300 transition-colors" />
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">Dance Floor</span>
        </div>

        {/* View controls */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span className="text-[9px] text-slate-500 font-mono">360° Panoramic View</span>
          <div className="flex items-center gap-1">
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/40 text-slate-400 font-mono">YAW: 0° | PITCH: 0° | FOV: 90°</span>
          </div>
        </div>
      </div>

      {/* Scene Selector */}
      {tour.scenes?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Scenes</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tour.scenes.map((scene: any, i: number) => (
              <button key={scene.scene_id} onClick={() => setActiveScene(i)}
                className={cn("flex-shrink-0 rounded-lg border p-2 w-32 text-left transition-colors",
                  i === activeScene ? "border-cyan-500/30 bg-cyan-500/10" : "border-slate-700/30 bg-slate-800/40 hover:border-slate-600/30"
                )}>
                <div className="h-12 bg-slate-700/30 rounded mb-1.5 flex items-center justify-center">
                  <Image className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-[10px] text-white truncate">{scene.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-[10px] text-slate-500 bg-slate-800/30 rounded-lg border border-slate-700/20 p-3">
        <strong className="text-slate-400">Note:</strong> Full Three.js 3D rendering requires uploading 360° photos or equirectangular panoramas. This viewer shows the room configuration framework with hotspot navigation. Upload panoramic images to enable immersive walkthroughs.
      </div>
    </div>
  );
}

function ConfigsTab() {
  const [configs, setConfigs] = useState<any[]>([]);
  useEffect(() => { api("/room-configs").then(d => setConfigs(d.configs)).catch(() => {}); }, []);

  return (
    <div className="space-y-3" data-testid="vr-configs-tab">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{configs.length} Room Configurations</span>
      {configs.map(cfg => (
        <div key={cfg.config_id} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">{cfg.name}</span>
            <span className="text-xs font-mono text-cyan-400">{cfg.total_capacity} pax</span>
          </div>
          <div className="flex gap-3 text-[10px] text-slate-400 mb-2">
            <span>Layout: <span className="text-white">{cfg.layout}</span></span>
            {cfg.tables && <span>Tables: <span className="text-white">{cfg.tables}</span></span>}
            {cfg.rows && <span>Rows: <span className="text-white">{cfg.rows}</span></span>}
            <span>Size: <span className="text-white font-mono">{cfg.dimensions.width}×{cfg.dimensions.depth}×{cfg.dimensions.height}ft</span></span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cfg.elements.map((el: any, i: number) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/30 text-slate-400 font-mono">
                {el.type} ({el.width}×{el.depth})
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }
