interface DiagnosticsPanelProps {
  status: string;
  error: string | null;
}
export function DiagnosticsPanel({ status, error }: DiagnosticsPanelProps) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-slate-100 shadow-inner">
      {" "}
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-300">
        {" "}
        <span>Planner → Studio status</span>{" "}
        <span className="font-semibold text-emerald-300">{status}</span>{" "}
      </div>{" "}
      {error && (
        <div className="mt-2 rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {" "}
          Error: {error}{" "}
        </div>
      )}{" "}
      <ul className="mt-3 space-y-1 text-xs leading-relaxed text-slate-300">
        {" "}
        <li>• Room dimensions (w/d) and items[] are required.</li>{" "}
        <li>• Provide modelUrl for GLB assets or rely on primitives.</li>{" "}
        <li>• Bridge falls back to parametric geometry on load failures.</li>{" "}
        <li>
          • Default camera loads at (4, 4, 6) with soft ambient lighting.
        </li>{" "}
      </ul>{" "}
    </div>
  );
}
export default DiagnosticsPanel;
