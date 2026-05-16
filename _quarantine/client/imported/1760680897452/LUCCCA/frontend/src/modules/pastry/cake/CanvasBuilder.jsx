// src/modules/pastry/cake/CanvasBuilder.jsx
// Visual canvas builder for designing cake layers, fillings, and decorations
//
// ✅ Step 3 — per-layer height + torte controls (passed to LayerBlock)
// ✅ Step 4 — expand torted layers to sub-slabs for the preview
// ✅ Step 5 — 3D preview with texture (CakeHero3D), built from visualLayers

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// Local module pieces (note: folder name is "componets" in this repo)
import { LayerBlock } from "./componets/LayerBlock.jsx";
import { DecorationPalette } from "./componets/DecorationPalette.jsx";
import { CakeSupportOverlay } from "./componets/CakeSupportOverlay.jsx";

// Bakery math (torting -> visual slabs, etc.)
import { expandTorted } from "@/modules/pastry/cake/utils/servings";

// Textured 3D preview (uses matcap icing + subtle shading)
// If you don’t have this file, create src/components/CakeHero3D.jsx (we already placed one earlier).
import CakeHero3D from "@/components/CakeHero3D.jsx";

const DEFAULTS = {
  cake:    { heightIn: 1, torte: 1, flavor: "vanilla", icing: "buttercream-ivory" },
  filling: { heightIn: 0.25, flavor: "buttercream" },
  support: { notes: "3 dowels" },
};

export default function CanvasBuilder({ cakeData, onUpdate = () => {} }) {
  const [canvasLayers, setCanvasLayers] = useState(cakeData?.layers || []);
  const [selectedLayer, setSelectedLayer] = useState(null);

  /* ---------------- actions ---------------- */
  const addLayer = (type) => {
    const base = DEFAULTS[type] || {};
    const newLayer = {
      id: Date.now() + Math.random(),
      type,                // "cake" | "filling" | "support"
      ...base,
      notes: base.notes || "",
    };
    const updated = [...canvasLayers, newLayer];
    setCanvasLayers(updated);
    onUpdate(updated);
  };

  const updateLayer = (id, updatedProps) => {
    const updated = canvasLayers.map((layer) =>
      layer.id === id ? { ...layer, ...updatedProps } : layer
    );
    setCanvasLayers(updated);
    onUpdate(updated);
  };

  const removeLayer = (id) => {
    const updated = canvasLayers.filter((layer) => layer.id !== id);
    setCanvasLayers(updated);
    onUpdate(updated);
  };

  const seedDemo = () => {
    const demo = [
      { id: 1, type: "cake",    flavor: "vanilla",   icing: "buttercream-ivory", heightIn: 1,   torte: 2 },
      { id: 2, type: "filling", flavor: "strawberry",                               heightIn: 0.25 },
      { id: 3, type: "cake",    flavor: "chocolate", icing: "buttercream-ivory", heightIn: 1,   torte: 2 },
      { id: 4, type: "filling", flavor: "lemon-curd",                              heightIn: 0.25 },
      { id: 5, type: "cake",    flavor: "vanilla",   icing: "buttercream-ivory", heightIn: 1,   torte: 1 },
      { id: 6, type: "support", notes:  "3 dowels" },
    ];
    setCanvasLayers(demo);
    onUpdate(demo);
  };

  /* ---------------- preview feed ---------------- */
  // STEP 4: expand any torted cake layer into sub-slabs + thin seam,
  // so the preview shows real construction (icing between splits).
  const visualLayers = useMemo(
    () => canvasLayers.flatMap(expandTorted),
    [canvasLayers]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
      {/* Left: editor */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={() => addLayer("cake")}>+ Cake Layer</Button>
          <Button onClick={() => addLayer("filling")}>+ Filling</Button>
          <Button onClick={() => addLayer("support")}>+ Support</Button>
          <div className="grow" />
          <Button variant="secondary" onClick={seedDemo}>Demo cake</Button>
        </div>

        <div className="relative bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner p-4 min-h-[400px] border border-slate-300/60 dark:border-slate-700">
          {canvasLayers.length === 0 && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Add layers to begin. Use per-layer height (in) and “torte” (splits) to control
              how each cake bakes & is filled.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {canvasLayers.map((layer, index) => (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <LayerBlock
                  layer={layer}
                  // STEP 3: LayerBlock should surface height/torte fields; these props will capture them.
                  // If your LayerBlock doesn’t yet show those controls, you can add:
                  //  - a number input for layer.heightIn (inches)
                  //  - a select for layer.torte (1–4)
                  onUpdate={(props) => updateLayer(layer.id, props)}
                  onRemove={() => removeLayer(layer.id)}
                  isSelected={selectedLayer === layer.id}
                  onSelect={() => setSelectedLayer(layer.id)}
                />
              </motion.div>
            ))}
          </div>

          {/* Optional support overlay (notes like dowels, etc.) */}
          <CakeSupportOverlay layers={canvasLayers} />
        </div>

        <DecorationPalette
          onDecorate={(decoration) => {
            if (selectedLayer) {
              updateLayer(selectedLayer, { decoration });
            }
          }}
        />
      </div>

      {/* Right: live textured preview */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300/60 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-300/60 dark:border-slate-700">
          <div className="text-sm font-semibold">Preview</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {visualLayers.filter(l => l.type !== "support").length} visual layers
          </div>
        </div>

        {/* STEP 5: 3D hero preview with subtle texture/piping.
            CakeHero3D should read:
              - props.layers: [{type, heightIn, flavor, icing}] in stacking order
              - It will handle thickness and display icing seams for fillings.
         */}
        <div className="h-[520px]">
          <CakeHero3D
            layers={visualLayers}
            // you can pass options to tune material/lighting if your component supports it
            options={{ matcap: "buttercream-ivory", showPiping: true }}
          />
        </div>
      </div>
    </div>
  );
}
