import type { OrderAgingRow } from "@/modules/purchRec/services/metrics";
interface OrderAgingPanelProps {
  aging: OrderAgingRow[];
}
function buildDueDescriptor(daysUntilDue: number) {
  if (daysUntilDue < 0) {
    return {
      label: `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}`,
      className: "text-rose-200",
    };
  }
  if (daysUntilDue === 0) {
    return { label: "Due today", className: "text-aurum-200" };
  }
  if (daysUntilDue <= 2) {
    return {
      label: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
      className: "text-amber-200",
    };
  }
  return {
    label: `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`,
    className: "text-muted-foreground",
  };
}
function getProgress(elapsedDays: number, daysUntilDue: number) {
  if (daysUntilDue < 0) {
    return 100;
  }
  const denominator = Math.max(1, elapsedDays + daysUntilDue);
  return Math.min(100, Math.round((elapsedDays / denominator) * 100));
}
export function OrderAgingPanel({ aging }: OrderAgingPanelProps) {
  const sorted = [...aging].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  return (
    <div className="rounded-3xl border border-border/40 bg-surface/90 p-6 shadow-[0_35px_90px_-50px_rgba(9,12,21,0.65)]">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {" "}
            Order aging{" "}
          </p>{" "}
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {" "}
            Cycle time vs receiving windows{" "}
          </h2>{" "}
        </div>{" "}
      </div>{" "}
      <ul className="mt-6 space-y-4">
        {" "}
        {sorted.map((row) => {
          const descriptor = buildDueDescriptor(row.daysUntilDue);
          const progress = getProgress(row.elapsedDays, row.daysUntilDue);
          return (
            <li
              key={row.id}
              className="rounded-2xl border border-border/40 bg-surface-variant/60 p-4"
            >
              {" "}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {" "}
                    {row.reference}{" "}
                  </p>{" "}
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    {" "}
                    {row.status}{" "}
                  </p>{" "}
                </div>{" "}
                <p className={`text-sm font-semibold ${descriptor.className}`}>
                  {" "}
                  {descriptor.label}{" "}
                </p>{" "}
              </div>{" "}
              <div className="mt-3 text-xs text-muted-foreground">
                {" "}
                <span className="font-semibold text-foreground">
                  {" "}
                  {row.elapsedDays}{" "}
                </span>
                {""} days since creation • {""}{" "}
                {row.daysUntilDue < 0 ? (
                  <span>
                    {" "}
                    {Math.abs(row.daysUntilDue)} day{" "}
                    {Math.abs(row.daysUntilDue) === 1 ? "" : "s"} past expected
                    receiving window{" "}
                  </span>
                ) : (
                  <span>
                    {" "}
                    {row.daysUntilDue} day {row.daysUntilDue === 1 ? "" : "s"}{" "}
                    until the expected dock slot{" "}
                  </span>
                )}{" "}
              </div>{" "}
              <div className="mt-3 h-2 rounded-full bg-surface-variant/80">
                {" "}
                <div
                  className="h-full rounded-full bg-aurum-500/70"
                  style={{ width: `${progress}%` }}
                />{" "}
              </div>{" "}
            </li>
          );
        })}{" "}
      </ul>{" "}
    </div>
  );
}
