import React from "react";
export const AuditViewer: React.FC<{
  org_id: string;
  outlet_id?: string;
  dept_id?: string;
}> = ({ org_id, outlet_id, dept_id }) => {
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams({
      org_id,
      outlet_id: outlet_id || "",
      dept_id: dept_id || "",
      limit: "200",
    });
    fetch(`/api/audit?${q.toString()}`)
      .then((r) => r.json())
      .then(setRows)
      .catch((e) => console.error("Audit fetch error:", e))
      .finally(() => setLoading(false));
  }, [org_id, outlet_id, dept_id]);
  return (
    <div className="bg-gray-900 text-white p-4 rounded-2xl">
      {" "}
      <div className="text-lg font-semibold mb-2">
        Audit Log (latest 200)
      </div>{" "}
      <div className="max-h-80 overflow-auto text-sm">
        {" "}
        {loading && <div className="text-gray-400">Loading...</div>}{" "}
        {!loading &&
          rows.map((r, i) => (
            <div key={i} className="border-b border-gray-700 py-2">
              {" "}
              <div className="text-gray-400 text-xs">
                {" "}
                {new Date(r.created_at).toLocaleString()}{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="font-semibold">{r.action}</span> • {r.entity}#
                {r.entity_id}{" "}
              </div>{" "}
              <div className="text-xs text-gray-300">
                {" "}
                {r.details ? JSON.stringify(JSON.parse(r.details)) : "{}"}{" "}
              </div>{" "}
            </div>
          ))}{" "}
        {!loading && rows.length === 0 && (
          <div className="text-sm text-gray-400">No audit entries yet.</div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
