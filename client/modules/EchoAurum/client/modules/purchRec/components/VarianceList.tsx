import type { InventoryVariance } from "@shared/purchasing";
interface VarianceListProps {
  variances: InventoryVariance[];
}
const SEVERITY_MAP: Record<
  InventoryVariance["severity"],
  { label: string; color: string }
> = {
  info: {
    label: "Info",
    color: "bg-sky-500/10 text-sky-200 border-sky-400/40",
  },
  warning: {
    label: "Warning",
    color: "bg-amber-500/10 text-amber-200 border-amber-400/40",
  },
  critical: {
    label: "Critical",
    color: "bg-rose-500/10 text-rose-200 border-rose-400/40",
  },
};
export function VarianceList({ variances }: VarianceListProps) {
  return (
    <div className="rounded-3xl border border-border/40 bg-surface/90 p-6 shadow-[0_35px_90px_-50px_rgba(9,12,21,0.65)]">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {" "}
            Inventory variances{" "}
          </p>{" "}
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {" "}
            Guardians monitoring every dock{" "}
          </h2>{" "}
        </div>{" "}
      </div>{" "}
      <ul className="mt-6 space-y-4">
        {" "}
        {variances.map((variance) => (
          <li
            key={variance.id}
            className="rounded-2xl border border-border/40 bg-surface-variant/60 p-4"
          >
            {" "}
            <div className="flex flex-wrap items-center gap-3">
              {" "}
              <span className="text-sm font-semibold text-foreground">
                {" "}
                {variance.poReference}{" "}
              </span>{" "}
              <span className="text-xs text-muted-foreground">
                {" "}
                {variance.item}{" "}
              </span>{" "}
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${SEVERITY_MAP[variance.severity].color}`}
              >
                {" "}
                {SEVERITY_MAP[variance.severity].label}{" "}
              </span>{" "}
            </div>{" "}
            <p className="mt-3 text-sm text-muted-foreground">
              {" "}
              Expected {variance.expectedQty} {variance.unit}, received{""}{" "}
              {variance.receivedQty} {variance.unit}. {variance.note}{" "}
            </p>{" "}
          </li>
        ))}{" "}
      </ul>{" "}
    </div>
  );
}
