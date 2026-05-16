import type { PurchasingSnapshot } from "@shared/purchasing";
interface SummaryCardsProps {
  snapshot: {
    varianceText: string;
    openOrdersText: string;
    awaitingReceivingText: string;
    spendText: string;
  } & PurchasingSnapshot;
}
const LABEL_STYLES =
  "text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground";
export function SummaryCards({ snapshot }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {" "}
      <div className="rounded-3xl border border-border/40 bg-surface-variant/70 p-6">
        {" "}
        <p className={LABEL_STYLES}>Monthly spend</p>{" "}
        <p className="mt-3 text-2xl font-semibold text-foreground">
          {" "}
          {snapshot.spendText}{" "}
        </p>{" "}
        <p className="mt-2 text-xs text-muted-foreground">
          {" "}
          Open PO commitments across LUCCCA entities{" "}
        </p>{" "}
      </div>{" "}
      <div className="rounded-3xl border border-border/40 bg-surface-variant/70 p-6">
        {" "}
        <p className={LABEL_STYLES}>Open orders</p>{" "}
        <p className="mt-3 text-2xl font-semibold text-foreground">
          {" "}
          {snapshot.openOrders}{" "}
        </p>{" "}
        <p className="mt-2 text-xs text-muted-foreground">
          {" "}
          {snapshot.openOrdersText}{" "}
        </p>{" "}
      </div>{" "}
      <div className="rounded-3xl border border-border/40 bg-surface-variant/70 p-6">
        {" "}
        <p className={LABEL_STYLES}>Awaiting receiving</p>{" "}
        <p className="mt-3 text-2xl font-semibold text-foreground">
          {" "}
          {snapshot.awaitingReceiving}{" "}
        </p>{" "}
        <p className="mt-2 text-xs text-muted-foreground">
          {" "}
          {snapshot.awaitingReceivingText}{" "}
        </p>{" "}
      </div>{" "}
      <div className="rounded-3xl border border-border/40 bg-surface-variant/70 p-6">
        {" "}
        <p className={LABEL_STYLES}>Variance rate</p>{" "}
        <p className="mt-3 text-2xl font-semibold text-foreground">
          {" "}
          {Math.round(snapshot.varianceRate * 100)}%{" "}
        </p>{" "}
        <p className="mt-2 text-xs text-muted-foreground">
          {" "}
          {snapshot.varianceText}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
