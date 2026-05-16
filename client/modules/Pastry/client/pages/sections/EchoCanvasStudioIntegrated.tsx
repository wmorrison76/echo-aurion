import React from "react";
import { useState } from "react";
import { Palette, Cake, Grid3x3, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type StudioTab = "canvas" | "cake-builder" | "templates";

interface EchoCanvasStudioIntegratedProps {
  initialTab?: StudioTab;
}

const LazyEditor = React.lazy(() =>
  import("@/modules/EchoCanvasStudio/client/pages/Editor").catch((err) => {
    console.error("[Pastry] Failed to load EchoCanvasStudio Editor:", err);
    return {
      default: () => (
        <div className="flex items-center justify-center h-96" style={{ color: "#c8a97e" }}>
          <p>Canvas Studio editor could not be loaded.</p>
        </div>
      ),
    };
  }),
);

const LazyCakeBuilder = React.lazy(() =>
  import("@/modules/EchoCanvasStudio/client/modules/cake-builder").catch((err) => {
    console.error("[Pastry] Failed to load CakeBuilder:", err);
    return {
      default: () => (
        <div className="flex items-center justify-center h-96" style={{ color: "#c8a97e" }}>
          <p>Cake Builder could not be loaded.</p>
        </div>
      ),
    };
  }),
);

export default function EchoCanvasStudioIntegrated({
  initialTab = "canvas",
}: EchoCanvasStudioIntegratedProps) {
  const [activeTab, setActiveTab] = React.useState<StudioTab>(initialTab);

  const tabs = [
    {
      id: "canvas" as const,
      label: "Canvas Design",
      icon: Palette,
      description: "Full design editor for pastry decoration patterns",
    },
    {
      id: "cake-builder" as const,
      label: "Cake Builder",
      icon: Cake,
      description: "3D cake design and layer customization",
    },
    {
      id: "templates" as const,
      label: "Templates",
      icon: Grid3x3,
      description: "Saved designs and reusable templates",
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "#04060d", minHeight: "calc(100vh - 140px)" }} data-testid="echo-canvas-pastry">
      {/* Tab Navigation */}
      <div className="flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0b0f1a" }}>
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`pastry-canvas-tab-${tab.id}`}
                className="px-4 py-3 font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap"
                style={{
                  borderBottom: activeTab === tab.id ? "2px solid #c8a97e" : "2px solid transparent",
                  color: activeTab === tab.id ? "#c8a97e" : "rgba(148,163,184,0.5)",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area — explicit height so children that use h-full can render */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: "calc(100vh - 200px)", height: "calc(100vh - 200px)" }}>
        {activeTab === "canvas" && (
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading Canvas Design Studio...
              </div>
            }
          >
            <LazyEditor />
          </React.Suspense>
        )}

        {activeTab === "cake-builder" && (
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-full" style={{ color: "rgba(200,169,126,0.5)" }}>
                Loading 3D Cake Designer...
              </div>
            }
          >
            <LazyCakeBuilder />
          </React.Suspense>
        )}

        {activeTab === "templates" && (
          <TemplatesGallery />
        )}
      </div>
    </div>
  );
}

function TemplatesGallery() {
  const [templates, setTemplates] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch(`${window.location.origin}/api/banquet-menus/templates`)
      .then(r => r.json()).then(d => setTemplates(d.templates || [])).catch(() => {});
  }, []);
  return (
    <div className="p-4 space-y-3" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "rgba(200,169,126,0.6)" }}>
        SAVED DESIGN TEMPLATES ({templates.length})
      </div>
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12" style={{ color: "rgba(148,163,184,0.4)" }}>
          <Grid3x3 className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No saved templates yet.</p>
          <p className="text-xs mt-1 opacity-70">Create a design in Canvas and save it as a template.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {templates.map((t: any, i: number) => (
            <div key={i} className="p-3 rounded-lg transition-all hover:scale-[1.02] cursor-pointer"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[11px] font-medium text-white">{t.name || `Template ${i + 1}`}</div>
              <div className="text-[9px] text-white/40">{t.type || "cake"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
