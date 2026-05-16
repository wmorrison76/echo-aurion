const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
export interface StandingInventoryArea {
  id: string;
  label: string;
  value: number;
  quantity: number;
  items: { id: string; name: string; quantity: number; value: number }[];
}
interface StandingInventoryWidgetProps {
  areas: StandingInventoryArea[];
}
export function StandingInventoryWidget({
  areas,
}: StandingInventoryWidgetProps) {
  if (!areas.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No standing inventory metrics available. Capture receipts to populate
        the storeroom view.
      </p>
    );
  }
  const totalValue = areas.reduce((acc, area) => acc + area.value, 0);
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex flex-wrap items-center justify-between">
        {" "}
        <h3 className="text-sm font-semibold text-slate-100">
          Total on-hand value {currency.format(totalValue)}
        </h3>{" "}
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Storeroom allocation
        </p>{" "}
      </div>{" "}
      <div className="grid gap-4 lg:grid-cols-2">
        {" "}
        {areas.map((area) => (
          <div
            key={area.id}
            className="rounded-xl border border-slate-800/60 bg-card p-4 shadow-inner shadow-slate-950/30"
          >
            {" "}
            <div className="flex items-center justify-between gap-3">
              {" "}
              <div>
                {" "}
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {area.label}
                </p>{" "}
                <p className="text-lg font-semibold text-slate-100">
                  {currency.format(area.value)}
                </p>{" "}
                <p className="text-xs text-slate-400">
                  {area.quantity.toLocaleString()} units tracked
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div className="mt-3 space-y-2">
              {" "}
              {area.items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs text-slate-400"
                >
                  {" "}
                  <span className="truncate pr-2 text-slate-300">
                    {item.name}
                  </span>{" "}
                  <span className="font-medium text-slate-200">
                    {" "}
                    {item.quantity.toLocaleString()} ·{" "}
                    {currency.format(item.value)}{" "}
                  </span>{" "}
                </div>
              ))}{" "}
              {area.items.length > 4 ? (
                <p className="text-[0.7rem] text-muted-foreground">
                  +{area.items.length - 4} additional items tracked
                </p>
              ) : null}{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
