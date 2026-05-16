import React from "react";
export const WeeklyReports: React.FC<{
  org_id: string;
  outlet_id: string;
  dept_id: string;
}> = ({ org_id, outlet_id, dept_id }) => {
  const [week, setWeek] = React.useState<string>("");
  const [downloading, setDownloading] = React.useState(false);
  const dl = async (path: string, name: string) => {
    setDownloading(true);
    try {
      const r = await fetch(path);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
    } catch (e) {
      console.error("Download error:", e);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="bg-gray-900 text-white p-4 rounded-2xl">
      {" "}
      <div className="text-lg font-semibold mb-2">Weekly Reports</div>{" "}
      <div className="flex gap-3 items-center mb-3">
        {" "}
        <label>Week start:</label>{" "}
        <input
          type="date"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          className="text-foreground rounded px-2 py-1"
          disabled={downloading}
        />{" "}
      </div>{" "}
      <div className="flex flex-wrap gap-2">
        {" "}
        <button
          className="bg-primary rounded px-3 py-1 disabled:opacity-50"
          disabled={!week || downloading}
          onClick={() =>
            dl(
              `/api/reports/payroll?outlet_id=${outlet_id}&dept_id=${dept_id}&week_start=${week}`,
              `payroll_${week}.csv`,
            )
          }
        >
          {" "}
          Payroll Register CSV{" "}
        </button>{" "}
        <button
          className="bg-teal-600 rounded px-3 py-1 disabled:opacity-50"
          disabled={!week || downloading}
          onClick={() =>
            dl(
              `/api/reports/tips?dept_id=${dept_id}&start=${week}&end=${week}`,
              `tips_${week}.csv`,
            )
          }
        >
          {" "}
          Tip Runs CSV{" "}
        </button>{" "}
        <button
          className="bg-purple-600 rounded px-3 py-1 disabled:opacity-50"
          disabled={!week || downloading}
          onClick={() =>
            dl(
              `/api/reports/pnl-lite?org_id=${org_id}&week_start=${week}`,
              `pnl_${week}.csv`,
            )
          }
        >
          {" "}
          P&amp;L Lite CSV{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
