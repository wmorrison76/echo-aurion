// src/components/KitchenLibraryTabs/KitchenLibrary.jsx
import React, { useState, useMemo } from "react";
import DoubleTabs from "../shared/DoubleTabs.jsx";
import "../shared/DoubleTabs.css";
import { ExternalLink, Home, Settings } from "lucide-react";

/* --- Rows --- */
const BACK_ROW = [
  { id: "cake-builder",   label: "Cake Builder",         color: "#E2A23B" },
  { id: "cake-orders",    label: "Cake Orders",          color: "#36A55E" },
  { id: "echocanvas",     label: "EchoCanvas",           color: "#19A1B7" },
  { id: "chocolate",      label: "Chocolates & Candies", color: "#C84D75" },
  { id: "breads",         label: "Breads & Doughs",      color: "#7C65E6" },
];

const FRONT_ROW = [
  { id: "inventory",  label: "Inventory",   color: "#DB981E" },
  { id: "recipes",    label: "Recipes",     color: "#20A560" },
  { id: "new",        label: "New Recipe",  color: "#2787E6" },
  { id: "photos",     label: "Photo Gallery", color: "#5A66D5" },
  { id: "production", label: "Production",  color: "#E04D73" },
];

const PLACEHOLDERS = {
  "cake-builder": "Design builder for custom cakes.",
  "cake-orders": "Order intake, status and calendar.",
  echocanvas: "Canvas/workboard for compositions.",
  chocolate: "Molds, tempering, decorations, confections.",
  breads: "Preferments, doughs, shaping, baking plans.",
  inventory: "Stock, par levels, transfers.",
  recipes: "Collections, techniques and sub-recipes.",
  new: "Create a new recipe from a template.",
  photos: "Visual library of results and references.",
  production: "Batching, staging and timeline.",
};

export default function PastryLibrary() {
  const [active, setActive] = useState("recipes");

  const actions = useMemo(
    () => (
      <div className="flex items-center gap-1">
        <button className="dt-ico" title="Tear out">
          <ExternalLink size={16} />
        </button>
        <button className="dt-ico" title="Home">
          <Home size={16} />
        </button>
        <button
          className="dt-ico"
          title="Settings"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("pastry-open-settings"))
          }
        >
          <Settings size={16} />
        </button>
      </div>
    ),
    []
  );

  return (
    <div className="p-4">
      <DoubleTabs
        backRow={BACK_ROW}
        frontRow={FRONT_ROW}
        activeId={active}
        onChange={setActive}
        actions={actions}
        size="compact"
      />

      {/* Content panel */}
      <div
        className="mt-3 rounded-xl"
        style={{
          border: "1px solid rgba(66,226,225,0.45)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,.35) inset, 0 18px 70px rgba(0,255,240,.10)",
          background: "rgba(5,12,24,.78)",
        }}
      >
        <div
          className="px-4 py-3"
          style={{
            borderBottom: "1px solid rgba(66,226,225,.35)",
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          {BACK_ROW.concat(FRONT_ROW).find((t) => t.id === active)?.label ??
            "Section"}
        </div>
        <div className="px-4 py-4 text-slate-200">
          Content placeholder for{" "}
          <strong>
            {BACK_ROW.concat(FRONT_ROW).find((t) => t.id === active)?.label}
          </strong>
          . {PLACEHOLDERS[active] || "Drop in technique notes, forms, tables, embeds, or tools here."}
        </div>
      </div>

      {/* styles for the small round action icons next to the tabs */}
      <style>{`
        .dt-ico{
          display:inline-flex;align-items:center;justify-content:center;
          width:28px;height:28px;border-radius:9999px;
          border:1px solid rgba(66,226,225,.35);
          background:rgba(5,12,24,.6);color:#E6F9FB;
          box-shadow:0 0 0 1px rgba(0,0,0,.35) inset, 0 0 18px rgba(0,255,240,.18);
        }
        .dt-ico:hover{filter:brightness(1.08)}
      `}</style>
    </div>
  );
}
