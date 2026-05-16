/***
 * LUCCCA — BUILD 35 (Part 2)
 * PropertyOutletSwitcher
 *
 * PURPOSE:
 *  - Dropdown selector for Property + Outlet
 *  - To be placed in global header or Exec Console
 ***/

import React from "react";
import { usePropertyContextStore } from "../stores/usePropertyContextStore";

export default function PropertyOutletSwitcher() {
  const {
    properties,
    outlets,
    currentPropertyId,
    currentOutletId,
    setCurrentProperty,
    setCurrentOutlet,
  } = usePropertyContextStore();

  const filteredOutlets = outlets.filter(
    (o) => !currentPropertyId || o.propertyId === currentPropertyId
  );

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-500">Property</span>
        <select
          className="border border-slate-200 rounded px-2 py-1 text-xs"
          value={currentPropertyId || ""}
          onChange={(e) => setCurrentProperty(e.target.value || null)}
        >
          <option value="">Select Property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] text-slate-500">Outlet</span>
        <select
          className="border border-slate-200 rounded px-2 py-1 text-xs"
          value={currentOutletId || ""}
          onChange={(e) => setCurrentOutlet(e.target.value || null)}
        >
          <option value="">All</option>
          {filteredOutlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
