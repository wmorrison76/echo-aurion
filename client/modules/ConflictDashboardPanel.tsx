/*** * LUCCCA — BUILD 32 * Multi-Event Conflict Dashboard * * PURPOSE: * - Single pane of glass for all active conflicts * - Grouped by date and space * - Shows status + severity + type ***/ import React, {
  useEffect,
  useState,
} from "react";
type ConflictItem = {
  id: string;
  kind: "event" | "maintenance";
  space: string;
  date: string;
  severity: "warn" | "danger";
  description: string;
  status: "pending" | "auto-approved" | "approved" | "denied";
  requestedBy: string;
};
export default function ConflictDashboardPanel() {
  const [items, setItems] = useState<ConflictItem[]>([]);
  useEffect(() => {
    async function load() {
      const mock: ConflictItem[] = [
        {
          id: "c1",
          kind: "event",
          space: "Aviva Ballroom",
          date: "2025-02-07",
          severity: "danger",
          description: "Event overlaps engineering request.",
          status: "pending",
          requestedBy: "Catering Manager",
        },
        {
          id: "c2",
          kind: "maintenance",
          space: "Pool Deck",
          date: "2025-02-06",
          severity: "warn",
          description: "Buffer window violation for power testing.",
          status: "auto-approved",
          requestedBy: "Engineering",
        },
      ];
      setItems(mock);
    }
    load();
  }, []);
  const groups = items.reduce<Record<string, ConflictItem[]>>((acc, item) => {
    const key = `${item.date} – ${item.space}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const severityColor: Record<string, string> = {
    warn: "bg-amber-500",
    danger: "bg-red-600",
  };
  const statusColor: Record<string, string> = {
    pending: "bg-slate-500",
    "auto-approved": "bg-emerald-600",
    approved: "bg-emerald-600",
    denied: "bg-red-600",
  };
  const groupKeys = Object.keys(groups).sort();
  return (
    <div className="p-4 w-[540px] h-full overflow-y-auto font-sans bg-background space-y-3">
      {" "}
      <h2 className="text-lg font-semibold">Conflict Dashboard</h2>{" "}
      <p className="text-xs text-muted-foreground">
        {" "}
        View all active and recent conflicts across events and maintenance.{" "}
      </p>{" "}
      {groupKeys.length === 0 && (
        <div className="text-xs text-muted-foreground bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          {" "}
          No conflicts currently logged.{" "}
        </div>
      )}{" "}
      {groupKeys.map((groupKey) => (
        <div
          key={groupKey}
          className="border border-slate-200 rounded-lg bg-slate-50 p-3 space-y-2"
        >
          {" "}
          <div className="text-xs font-semibold text-foreground">
            {" "}
            {groupKey}{" "}
          </div>{" "}
          {groups[groupKey].map((c) => (
            <div
              key={c.id}
              className="bg-background border border-slate-200 rounded-md px-2 py-2 text-xs flex items-start gap-2"
            >
              {" "}
              <span
                className={`mt-0.5 inline-flex w-5 h-5 rounded-full items-center justify-center text-[9px] text-white ${c.kind === "event" ? "bg-primary" : "bg-fuchsia-600"}`}
              >
                {" "}
                {c.kind === "event" ? "EV" : "EN"}{" "}
              </span>{" "}
              <div className="flex-1">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-white ${severityColor[c.severity]}`}
                  >
                    {" "}
                    {c.severity.toUpperCase()}{" "}
                  </span>{" "}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-white ${statusColor[c.status]}`}
                  >
                    {" "}
                    {c.status.toUpperCase()}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="mt-1 text-foreground">{c.description}</div>{" "}
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {" "}
                  Requested by: {c.requestedBy}{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>
      ))}{" "}
    </div>
  );
}
