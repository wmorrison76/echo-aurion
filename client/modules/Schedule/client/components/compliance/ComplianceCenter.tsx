import React from "react";
interface Finding {
  type: "PREDICTABILITY_PAY" | "REST_VIOLATION" | "OT_RISK";
  employee_id: string;
  shift_id?: string;
  detail: string;
}
export const ComplianceCenter: React.FC<{
  outlet_id: string;
  dept_id: string;
  week_start: string;
}> = ({ outlet_id, dept_id, week_start }) => {
  const [rows, setRows] = React.useState<Finding[]>([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    fetch(
      `/api/compliance/analyze?outlet_id=${outlet_id}&dept_id=${dept_id}&week_start=${week_start}`,
    )
      .then((r) => r.json())
      .then((d) => setRows(d.findings || []))
      .catch((e) => console.error("Compliance fetch error:", e))
      .finally(() => setLoading(false));
  }, [outlet_id, dept_id, week_start]);
  const color = (t: Finding["type"]) =>
    t === "PREDICTABILITY_PAY"
      ? "text-yellow-300"
      : t === "REST_VIOLATION"
        ? "text-red-300"
        : "text-orange-300";
  return (
    <div className="bg-gray-900 text-white p-4 rounded-2xl">
      {" "}
      <div className="text-lg font-semibold mb-2">Compliance Center</div>{" "}
      {loading && <div className="text-sm text-gray-400">Loading...</div>}{" "}
      {!loading && rows.length === 0 && (
        <div className="text-sm text-gray-400">
          No issues detected for this week.
        </div>
      )}{" "}
      {rows.map((f, i) => (
        <div key={i} className="border-b border-gray-700 py-2 text-sm">
          {" "}
          <span className={`${color(f.type)} font-semibold mr-2`}>
            {f.type.replace(/_/g, "")}
          </span>{" "}
          <span className="text-gray-300">{f.detail}</span>{" "}
        </div>
      ))}{" "}
    </div>
  );
};
