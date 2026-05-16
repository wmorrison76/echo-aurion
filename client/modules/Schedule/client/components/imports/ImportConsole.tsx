import React from "react";
export const ImportConsole: React.FC<{
  outlet_id: string;
  dept_id: string;
}> = ({ outlet_id, dept_id }) => {
  const [stat, setStat] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  async function send(endpoint: string, file: File) {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("outlet_id", outlet_id);
      fd.append("dept_id", dept_id);
      const res = await fetch(`/api/imports/${endpoint}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      setStat(`${endpoint} imported: ${data.imported}`);
    } catch (e) {
      setStat(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="bg-gray-900 text-white p-4 rounded-2xl">
      {" "}
      <div className="text-lg font-semibold mb-2">Imports</div>{" "}
      <div className="space-y-3">
        {" "}
        <div>
          {" "}
          <div className="text-sm text-gray-300 mb-1">Revenue CSV</div>{" "}
          <input
            type="file"
            accept=".csv"
            disabled={loading}
            onChange={(e) =>
              e.target.files && send("revenue", e.target.files[0])
            }
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <div className="text-sm text-gray-300 mb-1">Employees CSV</div>{" "}
          <input
            type="file"
            accept=".csv"
            disabled={loading}
            onChange={(e) =>
              e.target.files && send("employees", e.target.files[0])
            }
          />{" "}
        </div>{" "}
        <div className="text-xs text-gray-400">
          {loading ? "Loading..." : stat}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
