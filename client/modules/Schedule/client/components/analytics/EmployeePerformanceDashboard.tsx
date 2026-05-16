import React from "react";

type Perf = {
  employee_id: string;
  rating_avg: number;
  attendance_pct: number;
  shift_difficulty_score: number;
  tip_effectiveness?: number;
  readiness_score: number;
  focus_areas: string[];
};

type Emp = { id: string; first_name: string; last_name: string; role_title: string };

export const EmployeePerformanceDashboard: React.FC<{
  dept_id: string;
  start: string;
  end: string;
  includeTips?: boolean;
}> = ({ dept_id, start, end, includeTips = false }) => {
  const [rows, setRows] = React.useState<Perf[]>([]);
  const [people, setPeople] = React.useState<Record<string, Emp>>({});
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        dept_id,
        start,
        end,
        includeTips: includeTips ? "1" : "0",
      });
      const r = await fetch(`/api/analytics/performance?${q.toString()}`).then((res) => res.json());
      setRows(r.rows || []);
      setPeople(Object.fromEntries((r.employees || []).map((e: Emp) => [e.id, e])));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept_id, start, end, includeTips]);

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4">
      <div className="font-semibold mb-2">Employee Performance</div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((p) => {
            const e = people[p.employee_id];
            const nm = e ? `${e.first_name} ${e.last_name}` : p.employee_id;
            return (
              <div key={p.employee_id} className="border border-gray-800 rounded p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{nm}</div>
                  <div className="text-gray-400">{e?.role_title || ""}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Metric label="Rating" value={p.rating_avg} />
                  <Metric label="Attendance" value={p.attendance_pct} suffix="%" />
                  <Metric label="Difficulty" value={p.shift_difficulty_score} />
                  {includeTips && <Metric label="Tip Effectiveness" value={p.tip_effectiveness ?? 0} />}
                </div>
                <div className="text-xs">
                  Readiness: <b>{p.readiness_score}</b>/100
                </div>
                {p.focus_areas.length > 0 && (
                  <div className="text-xs text-gray-300">Focus: {p.focus_areas.join(" • ")}</div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <div className="text-gray-400">No data.</div>}
        </div>
      )}
    </div>
  );
};

function Metric({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-gray-800 rounded p-2 flex items-center justify-between">
      <div className="text-gray-300">{label}</div>
      <div className="font-semibold">
        {value.toFixed(0)} {suffix || ""}
      </div>
    </div>
  );
}

if (typeof window !== "undefined") {
  try {
    (window as any)?.LUCCCA?.registerWidget?.("EmployeePerformanceDashboard", EmployeePerformanceDashboard);
  } catch {
    // ignore
  }
}
