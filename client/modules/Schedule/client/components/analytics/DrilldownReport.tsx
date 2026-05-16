import React from "react";

type Line = {
  ts: string;
  employee_name: string;
  position: string;
  hours: number;
  cost: number;
  revenue?: number;
  tips?: number;
  notes?: string;
};

export const DrilldownReport: React.FC<{
  org_id: string;
  outlet_id: string;
  dept_id: string;
  start: string;
  end: string;
}> = ({ org_id, outlet_id, dept_id, start, end }) => {
  const [rows, setRows] = React.useState<Line[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams({ org_id, outlet_id, dept_id, start, end });
      const r = await fetch(`/api/analytics/drilldown?${q.toString()}`).then((res) => res.json());
      setRows(r.rows || []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org_id, outlet_id, dept_id, start, end]);

  const sum = (k: keyof Line) => rows.reduce((s, x) => s + (Number(x[k]) || 0), 0);

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">P&amp;L Drilldown</div>
        <a
          className="bg-emerald-600 hover:bg-emerald-700 rounded px-3 py-1 text-sm"
          href={`/api/analytics/drilldown-csv?org_id=${org_id}&outlet_id=${outlet_id}&dept_id=${dept_id}&start=${start}&end=${end}`}
        >
          Download CSV
        </a>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <table className="min-w-full text-xs">
            <thead className="text-gray-300">
              <tr>
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Employee</th>
                <th className="text-left p-2">Position</th>
                <th className="text-right p-2">Hours</th>
                <th className="text-right p-2">Labor $</th>
                <th className="text-right p-2">Revenue $</th>
                <th className="text-right p-2">Tips $</th>
                <th className="text-left p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="p-2">{new Date(r.ts).toLocaleString()}</td>
                  <td className="p-2">{r.employee_name}</td>
                  <td className="p-2">{r.position}</td>
                  <td className="p-2 text-right">{r.hours.toFixed(2)}</td>
                  <td className="p-2 text-right">{(r.cost || 0).toFixed(2)}</td>
                  <td className="p-2 text-right">{(r.revenue || 0).toFixed(2)}</td>
                  <td className="p-2 text-right">{(r.tips || 0).toFixed(2)}</td>
                  <td className="p-2">{r.notes || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-6 mt-3 text-sm">
            <div>Total Hours: {sum("hours").toFixed(2)}</div>
            <div>Labor $: {sum("cost").toFixed(2)}</div>
            <div>Revenue $: {sum("revenue").toFixed(2)}</div>
            <div>Tips $: {sum("tips").toFixed(2)}</div>
          </div>
        </>
      )}
    </div>
  );
};

if (typeof window !== "undefined") {
  try {
    (window as any)?.LUCCCA?.registerWidget?.("DrilldownReport", DrilldownReport);
  } catch {
    // ignore
  }
}
