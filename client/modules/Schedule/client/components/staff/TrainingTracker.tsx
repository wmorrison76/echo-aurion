import React from "react";

type Training = { id: string; training_name: string; provider: string; start_date: string; end_date?: string; completion_status:"PLANNED" |"IN_PROGRESS" |"COMPLETED" |"EXPIRED"; score?: number; certificate_url?: string;
}; export const TrainingTracker: React.FC<{ employee_id: string }> = ({ employee_id,
}) => { const [rows, setRows] = React.useState<Training[]>([]); const [loading, setLoading] = React.useState(false); async function load() { setLoading(true); try { const r = await fetch(`/api/staff/trainings/${employee_id}`).then((r) => r.json() ); setRows(r.rows || []); } finally { setLoading(false); } } React.useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps }, [employee_id]); return ( <div className="bg-gray-900 text-white rounded-2xl p-4"> <div className="font-semibold mb-2">Training & Certifications</div> {loading ? ("Loading…" ) : ( <div className="space-y-2 text-sm"> {rows.map((t) => ( <div key={t.id} className="border border-gray-800 rounded p-2 flex flex-col md:flex-row md:items-center md:justify-between" > <div> <div className="font-medium">{t.training_name}</div> <div className="text-gray-400">{t.provider}</div> <div className="text-xs text-muted-foreground"> Start {t.start_date} {t.end_date ? ` • End ${t.end_date}` :""} </div> </div> <div className="mt-2 md:mt-0"> <span className="bg-gray-800 rounded px-2 py-1 text-xs"> {t.completion_status} </span> {t.certificate_url && ( <a className="ml-2 underline text-xs" href={t.certificate_url} target="_blank" rel="noreferrer" > Certificate </a> )} </div> </div> ))} {rows.length === 0 && ( <div className="text-gray-400">No records yet.</div> )} </div> )} </div> );
};

// Builder widget registration (no hooks at module scope)
if (typeof window !== "undefined") {
  try {
    (window as any)?.LUCCCA?.registerWidget?.("TrainingTracker", TrainingTracker);
  } catch {
    // ignore
  }
}
