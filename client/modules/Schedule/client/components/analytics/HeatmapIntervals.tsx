import React from "react";

type Pt = { ts: string; required: number; provided?: number };

export const HeatmapIntervals: React.FC<{
  dept_id: string;
  date: string;
  interval?: 15 | 30;
}> = ({ dept_id, date, interval = 15 }) => {
  const [data, setData] = React.useState<Pt[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        dept_id,
        date,
        interval: String(interval),
      });
      const r = await fetch(`/api/analytics/interval-coverage?${q.toString()}`).then((res) => res.json());
      setData(r.rows || []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dept_id, date, interval]);

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4">
      <div className="font-semibold mb-2">Coverage Heatmap ({interval}min)</div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-8 gap-1 text-xs">
          {data.map((p, i) => {
            const need = p.required;
            const have = p.provided ?? 0;
            const delta = have - need;
            const color = delta >= 0 ? (delta <= 1 ? "bg-emerald-700" : "bg-blue-700") : "bg-red-700";
            const t = new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={i} className={`rounded p-2 ${color}`} title={`${t} need ${need} / have ${have}`}>
                {t}
                <br />
                {have}/{need}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

if (typeof window !== "undefined") {
  try {
    (window as any)?.LUCCCA?.registerWidget?.("HeatmapIntervals", HeatmapIntervals);
  } catch {
    // ignore
  }
}
