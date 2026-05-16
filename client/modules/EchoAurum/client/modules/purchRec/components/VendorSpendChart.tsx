import type { VendorSpend } from "@shared/purchasing";
import type { VendorSpendSummary } from "@/modules/purchRec/services/metrics";
import { formatCurrency } from "@/modules/purchRec/services/metrics";
interface VendorSpendChartProps {
  vendors: VendorSpend[];
  summary?: VendorSpendSummary;
}
function getMaxSpend(vendors: VendorSpend[]) {
  return vendors.reduce((max, vendor) => Math.max(max, vendor.total), 0);
}
export function VendorSpendChart({ vendors, summary }: VendorSpendChartProps) {
  const max = getMaxSpend(vendors) || 1;
  return (
    <div className="rounded-3xl border border-border/40 bg-surface/90 p-6 shadow-[0_35px_90px_-50px_rgba(9,12,21,0.65)]">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {" "}
            Vendor spend{" "}
          </p>{" "}
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {" "}
            Top vendors by month{" "}
          </h2>{" "}
        </div>{" "}
        {summary && (
          <div className="rounded-full border border-border/40 bg-surface-variant/50 px-4 py-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {" "}
            {formatCurrency(summary.totalSpend)} total YTD{" "}
          </div>
        )}{" "}
      </div>{" "}
      {summary && (
        <div className="mt-4 rounded-2xl border border-border/40 bg-surface-variant/60 p-4">
          {" "}
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {" "}
            Top partners{" "}
          </p>{" "}
          <div className="mt-3 flex flex-wrap gap-2">
            {" "}
            {summary.topVendors.map((vendor) => (
              <span
                key={vendor.name}
                className="inline-flex items-center gap-2 rounded-full border border-aurum-400/40 bg-aurum-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-foreground"
              >
                {" "}
                {vendor.name}{" "}
                <span className="text-muted-foreground/80">
                  {" "}
                  {formatCurrency(vendor.total, vendor.currency)}{" "}
                </span>{" "}
              </span>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      <div className="mt-6 space-y-4">
        {" "}
        {vendors.map((vendor) => (
          <div key={vendor.vendor} className="space-y-2">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <p className="text-sm font-semibold text-foreground">
                {" "}
                {vendor.vendor}{" "}
              </p>{" "}
              <p className="text-sm text-muted-foreground">
                {" "}
                {formatCurrency(vendor.total, vendor.currency)}{" "}
              </p>{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              {vendor.costCenters.map((center) => {
                const width = `${Math.max(12, Math.round((center.amount / max) * 100))}%`;
                return (
                  <div key={center.label}>
                    {" "}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {" "}
                      <span>{center.label}</span>{" "}
                      <span>
                        {formatCurrency(center.amount, vendor.currency)}
                      </span>{" "}
                    </div>{" "}
                    <div className="mt-1 h-2 rounded-full bg-surface-variant/70">
                      {" "}
                      <div
                        className="h-full rounded-full bg-aurum-500/60"
                        style={{ width }}
                      />{" "}
                    </div>{" "}
                  </div>
                );
              })}{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
