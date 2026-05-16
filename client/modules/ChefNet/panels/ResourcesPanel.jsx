import React from "react";

const EMERGENCY_PLACEHOLDERS = [
  "Local crisis hotline",
  "Employee Assistance Program (EAP)",
  "HR representative",
  "Trusted senior leader",
];

export default function ResourcesPanel() {
  return (
    <div className="space-y-3 text-xs">
      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white/90 dark:bg-slate-900/90">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200 mb-1">
          Critical support
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
          Replace the items below with property‑specific resources. These should always be easy to find
          and the first things someone sees when they open this panel.
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300">
          {EMERGENCY_PLACEHOLDERS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/80 dark:bg-slate-900/90">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200 mb-1">
          Policies & guardrails
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          This is the anchor point for your respectful‑use policy, anti‑harassment commitments, and
          boundaries for ChefNet usage. Keeping this visible keeps the space safe and predictable.
        </p>
      </section>
    </div>
  );
}
