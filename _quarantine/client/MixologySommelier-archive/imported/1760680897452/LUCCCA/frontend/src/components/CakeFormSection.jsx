import React from "react";

export default function CakeFormSection({ designData = {}, onChange }) {
  const update = (k) => (e) => onChange?.({ [k]: e.target.value });

  return (
    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-3">Design</h3>

      <div className="grid gap-3" style={{gridTemplateColumns:"1fr 1fr"}}>
        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Base</span>
          <input className="dw-input" value={designData.base || ""} onChange={update("base")} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Frosting</span>
          <input className="dw-input" value={designData.frosting || ""} onChange={update("frosting")} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Color</span>
          <input className="dw-input" value={designData.color || ""} onChange={update("color")} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm opacity-80">Notes</span>
          <input className="dw-input" value={designData.notes || ""} onChange={update("notes")} />
        </label>
      </div>
    </div>
  );
}
