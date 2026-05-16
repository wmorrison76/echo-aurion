import type { PurchaseOrder, PurchaseOrderStatus } from "@shared/purchasing";
import { formatCurrency } from "@/modules/purchRec/services/metrics";
interface OrderStatusBoardProps {
  grouped: Record<PurchaseOrderStatus, PurchaseOrder[]>;
}
const STATUS_SEQUENCE: PurchaseOrderStatus[] = [
  "Pending",
  "Approved",
  "Receiving",
  "Closed",
];
const STATUS_META: Record<
  PurchaseOrderStatus,
  { title: string; detail: string; accentBorder: string; accentBadge: string }
> = {
  Pending: {
    title: "Pending approval",
    detail: "Awaiting policy sign-off before routing to vendors.",
    accentBorder: "border-amber-400/50",
    accentBadge: "bg-amber-500/15 text-amber-200 border-amber-300/60",
  },
  Approved: {
    title: "Approved",
    detail: "Cleared by guardrails and ready for receiving windows.",
    accentBorder: "border-sky-400/50",
    accentBadge: "bg-sky-500/15 text-sky-200 border-sky-300/60",
  },
  Receiving: {
    title: "In receiving",
    detail: "Live on docks with Zelda and Argus capturing exceptions.",
    accentBorder: "border-aurum-400/60",
    accentBadge: "bg-aurum-500/20 text-aurum-100 border-aurum-300/70",
  },
  Closed: {
    title: "Closed",
    detail: "Matched to invoices and synced with ledger postings.",
    accentBorder: "border-emerald-400/50",
    accentBadge: "bg-emerald-500/15 text-emerald-200 border-emerald-300/60",
  },
};
function summarizeOrders(orders: PurchaseOrder[]) {
  if (orders.length === 0) {
    return {
      count: 0,
      total: 0,
      currency: "USD",
      earliest: null as Date | null,
      latest: null as Date | null,
    };
  }
  const [currency] = [orders[0]?.currency ?? "USD"];
  const { earliest, latest, total } = orders.reduce(
    (acc, order) => {
      const expectedTime = new Date(order.expectedAt).getTime();
      if (!Number.isNaN(expectedTime)) {
        if (acc.earliest === null || expectedTime < acc.earliest) {
          acc.earliest = expectedTime;
        }
        if (acc.latest === null || expectedTime > acc.latest) {
          acc.latest = expectedTime;
        }
      }
      acc.total += order.total;
      return acc;
    },
    {
      earliest: null as number | null,
      latest: null as number | null,
      total: 0,
    },
  );
  return {
    count: orders.length,
    total,
    currency,
    earliest: earliest === null ? null : new Date(earliest),
    latest: latest === null ? null : new Date(latest),
  };
}
function formatMilestone(
  status: PurchaseOrderStatus,
  earliest: Date | null,
  latest: Date | null,
) {
  const targetDate = status === "Closed" ? latest : earliest;
  if (!targetDate) {
    return status === "Closed" ? "No recent closures" : "Not yet scheduled";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(targetDate);
}
export function OrderStatusBoard({ grouped }: OrderStatusBoardProps) {
  return (
    <div className="rounded-3xl border border-border/40 bg-surface/90 p-6 shadow-[0_35px_90px_-50px_rgba(9,12,21,0.65)]">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {" "}
            Order pipeline{" "}
          </p>{" "}
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {" "}
            Guardrail stages across entities{" "}
          </h2>{" "}
        </div>{" "}
      </div>{" "}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {" "}
        {STATUS_SEQUENCE.map((status) => {
          const orders = grouped[status] ?? [];
          const summary = summarizeOrders(orders);
          const meta = STATUS_META[status];
          return (
            <div
              key={status}
              className={`rounded-2xl border border-border/40 bg-surface-variant/60 p-5 shadow-inner shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${meta.accentBorder}`}
            >
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <div>
                  {" "}
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {" "}
                    {status}{" "}
                  </p>{" "}
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {" "}
                    {meta.title}{" "}
                  </p>{" "}
                </div>{" "}
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${meta.accentBadge}`}
                >
                  {" "}
                  {summary.count}{" "}
                  {summary.count === 1 ? "order" : "orders"}{" "}
                </span>{" "}
              </div>{" "}
              <p className="mt-3 text-xs text-muted-foreground">
                {meta.detail}
              </p>{" "}
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3 text-sm">
                {" "}
                <div>
                  {" "}
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {" "}
                    Total value{" "}
                  </p>{" "}
                  <p className="mt-1 font-semibold text-foreground">
                    {" "}
                    {formatCurrency(summary.total, summary.currency)}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {" "}
                    {status === "Closed"
                      ? "Last completion"
                      : "Next milestone"}{" "}
                  </p>{" "}
                  <p className="mt-1 font-semibold text-foreground">
                    {" "}
                    {formatMilestone(
                      status,
                      summary.earliest,
                      summary.latest,
                    )}{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </div>
  );
}
