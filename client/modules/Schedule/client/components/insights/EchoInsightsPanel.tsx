import React from "react";

type Insight = { ts: string; message: string; severity:"info" |"warn" |"critical";
}; export const EchoInsightsPanel: React.FC<{ org_id: string; outlet_id: string; dept_id: string; start: string; end: string;
}> = ({ org_id, outlet_id, dept_id, start, end }) => { const [rows, setRows] = React.useState<Insight[]>([]); const [loading, setLoading] = React.useState(false); async function load() { setLoading(true); try { const q = new URLSearchParams({ org_id, outlet_id, dept_id, start, end, }); const r = await fetch(`/api/analytics/echo-insights?${q.toString()}`).then( (r) => r.json() ); setRows(r.rows || []); } finally { setLoading(false); } } React.useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps }, [org_id, outlet_id, dept_id, start, end]); const chip = (s: Insight["severity"]) => s ==="critical" ?"bg-red-700" : s ==="warn" ?"bg-amber-600" :"bg-blue-700"; return ( <div className="bg-gray-900 text-white rounded-2xl p-4"> <div className="font-semibold mb-2">Echo AI Insights</div> {loading ? ("Loading…" ) : ( <div className="space-y-2 text-sm"> {rows.map((x, i) => ( <div key={i} className="border border-gray-800 rounded p-2 flex items-center gap-2" > <span className={`text-xs px-2 py-1 rounded ${chip(x.severity)}`}> {x.severity} </span> <span className="text-gray-300">{x.message}</span> <span className="ml-auto text-xs text-muted-foreground"> {new Date(x.ts).toLocaleString()} </span> </div> ))} {rows.length === 0 && ( <div className="text-gray-400">No insights for this range.</div> )} </div> )} </div> );
};

// Builder widget registration (no hooks at module scope)
if (typeof window !== "undefined") {
  try {
    (window as any)?.LUCCCA?.registerWidget?.("EchoInsightsPanel", EchoInsightsPanel);
  } catch {
    // ignore
  }
}
