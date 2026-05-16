import React from "react";
export const MySchedule: React.FC<{
  employee_id: string;
  week_start: string;
}> = ({ employee_id, week_start }) => {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    fetch(
      `/api/self/shifts?employee_id=${employee_id}&week_start=${week_start}`,
    )
      .then((r) => r.json())
      .then(setRows)
      .catch((e) => console.error("Schedule fetch error:", e))
      .finally(() => setLoading(false));
  }, [employee_id, week_start]);
  return (
    <div className="bg-gray-900 text-white p-4 rounded-2xl">
      {" "}
      <div className="text-lg font-semibold mb-2">My Schedule</div>{" "}
      {loading && <div className="text-sm text-gray-400">Loading...</div>}{" "}
      {!loading && rows.length === 0 && (
        <div className="text-sm text-gray-400">No shifts scheduled.</div>
      )}{" "}
      {rows.map((s) => (
        <div
          key={s.id}
          className="border-b border-gray-700 py-2 text-sm flex justify-between"
        >
          {" "}
          <div>
            {" "}
            {new Date(s.starts_at).toLocaleDateString()} •{" "}
            {s.position_name || "Unknown"}{" "}
          </div>{" "}
          <div>
            {" "}
            {new Date(s.starts_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            {" –"}{" "}
            {new Date(s.ends_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
          </div>{" "}
        </div>
      ))}{" "}
    </div>
  );
};
