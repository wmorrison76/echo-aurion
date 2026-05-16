import React from "react";
export const MyTips: React.FC<{
  employee_id: string;
  start: string;
  end: string;
}> = ({ employee_id, start, end }) => {
  const [rows, setRows] = React.useState<{ business_date: string; payout: number }[]>(
    [],
  );
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/self/tips?employee_id=${employee_id}&start=${start}&end=${end}`)
      .then((r) => r.json())
      .then(setRows)
      .catch((e) => console.error("Tips fetch error:", e))
      .finally(() => setLoading(false));
  }, [employee_id, start, end]);
  const total = rows.reduce((s, r) => s + Number(r.payout || 0), 0);
  return (
    <div className="bg-gray-900 text-white p-4 rounded-2xl">
      {" "}
      <div className="text-lg font-semibold mb-2">My Tips</div>{" "}
      {loading && <div className="text-sm text-gray-400">Loading...</div>}{" "}
      {!loading && rows.length === 0 && (
        <div className="text-sm text-gray-400">No tip records found.</div>
      )}{" "}
      {rows.map((r) => (
        <div
          key={r.business_date}
          className="flex justify-between text-sm border-b border-gray-700 py-1"
        >
          {" "}
          <div>{r.business_date}</div>{" "}
          <div>${Number(r.payout).toFixed(2)}</div>{" "}
        </div>
      ))}{" "}
      {rows.length > 0 && (
        <div className="text-right text-sm text-gray-300 mt-2">
          Total: ${total.toFixed(2)}
        </div>
      )}{" "}
    </div>
  );
};
