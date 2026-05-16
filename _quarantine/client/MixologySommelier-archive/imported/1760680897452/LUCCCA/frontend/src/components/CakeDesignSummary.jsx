import React from "react";

export default function CakeDesignSummary({ designData = {} }) {
  const {
    base = "",
    fillings = [],
    crumbCoat = false,
    coating = "",
    supports = "",
    decorations = [],
    notes = ""
  } = designData;

  return (
    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow">
      <h2 className="text-lg font-bold mb-2">Cake Design Summary</h2>
      <ul className="list-disc ml-5 space-y-1">
        <li>Base: {base || "—"}</li>
        <li>Fillings: {(fillings ?? []).join(", ") || "—"}</li>
        <li>Crumb Coat: {crumbCoat ? "Yes" : "No"}</li>
        <li>Final Coating: {coating || "—"}</li>
        <li>Supports: {supports || "—"}</li>
        <li>Decorations: {(decorations ?? []).join(", ") || "—"}</li>
        {notes ? <li>Notes: {notes}</li> : null}
      </ul>
    </div>
  );
}
