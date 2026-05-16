import React from "react";
export const TenantAdmin: React.FC<{ org_id: string }> = ({ org_id }) => {
  const [outletName, setOutletName] = React.useState("");
  const [depts, setDepts] = React.useState<string>("Banquets, FOH, Pastry");
  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  async function bootstrap() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id,
          outlet_name: outletName,
          dept_names: depts.split(",").map((s) => s.trim()),
        }),
      });
      await res.json();
      await refresh();
      setOutletName("");
    } catch (e) {
      console.error("Bootstrap error:", e);
    } finally {
      setLoading(false);
    }
  }
  async function refresh() {
    try {
      const r = await fetch("/api/admin/tenants");
      setRows(await r.json());
    } catch (e) {
      console.error("Refresh error:", e);
    }
  }
  React.useEffect(() => {
    refresh();
  }, []);
  return (
    <div className="bg-gray-900 text-white p-4 rounded-2xl">
      {" "}
      <div className="text-lg font-semibold mb-2">Tenant Admin</div>{" "}
      <div className="flex gap-2 mb-3">
        {" "}
        <input
          className="text-foreground rounded px-2 py-1"
          placeholder="Outlet Name"
          value={outletName}
          onChange={(e) => setOutletName(e.target.value)}
          disabled={loading}
        />{" "}
        <input
          className="text-foreground rounded px-2 py-1 flex-1"
          placeholder="Departments (comma-separated)"
          value={depts}
          onChange={(e) => setDepts(e.target.value)}
          disabled={loading}
        />{" "}
        <button
          className="bg-primary rounded px-3 py-1 disabled:opacity-50"
          onClick={bootstrap}
          disabled={loading || !outletName}
        >
          {" "}
          {loading ? "Creating..." : "Create"}{" "}
        </button>{" "}
      </div>{" "}
      <table className="w-full text-sm">
        {" "}
        <thead>
          {" "}
          <tr className="text-gray-400">
            {" "}
            <th align="left">Org</th> <th>Outlet</th> <th>Dept</th>{" "}
          </tr>{" "}
        </thead>{" "}
        <tbody>
          {" "}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-700">
              {" "}
              <td>{r.org}</td> <td>{r.outlet}</td> <td>{r.dept}</td>{" "}
            </tr>
          ))}{" "}
        </tbody>{" "}
      </table>{" "}
      {rows.length === 0 && (
        <div className="text-sm text-gray-400 mt-2">No tenants yet.</div>
      )}{" "}
    </div>
  );
};
