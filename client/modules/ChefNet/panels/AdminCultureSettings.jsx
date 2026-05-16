import React from "react";

export default function AdminCultureSettings() {
  return (
    <div className="space-y-3 text-xs">
      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white/90 dark:bg-slate-900/90">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200 mb-1">
          Admin & HR • Culture settings
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          This panel is a configuration surface for HR and senior leadership. In production,
          it should be permission‑gated and audited. For now it documents the knobs LUCCCA exposes
          around ChefNet.
        </p>
      </section>

      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/80 dark:bg-slate-900/90">
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300">
          <li>Toggle anonymous venting on/off or by department.</li>
          <li>Control what sentiment / volume metrics Echo can see (aggregated only).</li>
          <li>Configure moderation strictness levels.</li>
          <li>Define emergency escalation paths for self‑harm flags.</li>
          <li>Customize recognition "campaigns" (gratitude month, safety focus, etc.).</li>
        </ul>
      </section>
    </div>
  );
}
