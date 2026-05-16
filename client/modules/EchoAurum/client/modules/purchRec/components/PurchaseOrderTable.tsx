import type { PurchaseOrder } from "@shared/purchasing";
interface PurchaseOrderTableProps {
  orders: PurchaseOrder[];
}
const statusColors: Record<PurchaseOrder["status"], string> = {
  Pending: "bg-amber-500/10 text-amber-200 border-amber-400/40",
  Approved: "bg-sky-500/10 text-sky-200 border-sky-400/40",
  Receiving: "bg-aurum-500/15 text-aurum-100 border-aurum-400/50",
  Closed: "bg-emerald-500/10 text-emerald-200 border-emerald-400/40",
};
export function PurchaseOrderTable({ orders }: PurchaseOrderTableProps) {
  return (
    <div className="rounded-3xl border border-border/40 bg-surface/90 p-6 shadow-[0_35px_90px_-50px_rgba(9,12,21,0.65)]">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {" "}
            Purchase orders{" "}
          </p>{" "}
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {" "}
            Live purchasing queue{" "}
          </h2>{" "}
        </div>{" "}
      </div>{" "}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/40">
        {" "}
        <table className="min-w-full divide-y divide-border/40 text-left text-sm">
          {" "}
          <thead className="bg-surface-variant/60 text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {" "}
            <tr>
              {" "}
              <th className="px-5 py-3">Reference</th>{" "}
              <th className="px-5 py-3">Property</th>{" "}
              <th className="px-5 py-3">Vendor</th>{" "}
              <th className="px-5 py-3">Status</th>{" "}
              <th className="px-5 py-3 text-right">Total</th>{" "}
              <th className="px-5 py-3">Expected</th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody className="divide-y divide-border/40 text-muted-foreground">
            {" "}
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-surface-variant/40">
                {" "}
                <td className="px-5 py-4 text-foreground">
                  {order.reference}
                </td>{" "}
                <td className="px-5 py-4">{order.property}</td>{" "}
                <td className="px-5 py-4">{order.vendor}</td>{" "}
                <td className="px-5 py-4">
                  {" "}
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${statusColors[order.status]}`}
                  >
                    {" "}
                    {order.status}{" "}
                  </span>{" "}
                </td>{" "}
                <td className="px-5 py-4 text-right text-foreground">
                  {" "}
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency,
                    maximumFractionDigits: 0,
                  }).format(order.total)}{" "}
                </td>{" "}
                <td className="px-5 py-4 text-foreground">
                  {" "}
                  {new Date(order.expectedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                </td>{" "}
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
    </div>
  );
}
