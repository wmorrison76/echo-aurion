/** * Optional variant of your Event Profit Explorer that uses getEventDetailPath * to deep-link into EchoEventStudio's event detail view. * * This assumes you already have a `useOpsEvents` or `useEventListWithFinancials` * style hook that returns event id + name + margin numbers. * * You can either: * - Adapt this to your existing hook structure, or * - Copy the link rendering into your current explorer component. */ import React from "react";
import { getEventDetailPath } from "../../lib/eventDeepLink";
import { useOpsEvents } from "../../hooks/useOpsEvents";
export const EventProfitExplorerWithLinks: React.FC = () => {
  const { events, loading, error } = useOpsEvents();
  const fmtMoney = (v: number | undefined | null) =>
    typeof v === "number"
      ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : "—";
  const fmtPct = (v: number | undefined | null) =>
    typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—";
  if (loading) {
    return <div className="border rounded-lg p-4 text-xs">Loading events…</div>;
  }
  if (error) {
    return (
      <div className="border rounded-lg p-4 text-xs text-red-600">{error}</div>
    );
  }
  if (!events || events.length === 0) {
    return (
      <div className="border rounded-lg p-4 text-xs text-muted-foreground">
        {" "}
        No events found.{" "}
      </div>
    );
  }
  return (
    <div className="border rounded-lg p-4 text-xs space-y-3">
      {" "}
      <div className="flex justify-between items-center">
        {" "}
        <div>
          {" "}
          <div className="text-sm font-semibold">
            {" "}
            Event Profit Explorer (with Deep Links){" "}
          </div>{" "}
          <div className="text-[0.65rem] text-muted-foreground">
            {" "}
            Click into any event to open the full EchoEventStudio detail
            view.{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="overflow-auto border rounded">
        {" "}
        <table className="w-full text-[0.65rem]">
          {" "}
          <thead>
            {" "}
            <tr className="bg-muted">
              {" "}
              <th className="text-left px-2 py-1">Event</th>{" "}
              <th className="text-right px-2 py-1">Date</th>{" "}
              <th className="text-right px-2 py-1">Revenue</th>{" "}
              <th className="text-right px-2 py-1">Margin</th>{" "}
              <th className="text-right px-2 py-1">Margin %</th>{" "}
              <th className="text-right px-2 py-1">Outlet / Space</th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody>
            {" "}
            {events.map((ev: any) => {
              const href = getEventDetailPath(ev.id);
              return (
                <tr key={ev.id} className="border-t">
                  {" "}
                  <td className="px-2 py-1">
                    {" "}
                    <a
                      href={href}
                      className="text-[0.7rem] font-semibold underline"
                    >
                      {" "}
                      {ev.name || ev.code || ev.id}{" "}
                    </a>{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {ev.startDate
                      ? new Date(ev.startDate).toLocaleDateString()
                      : "—"}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {fmtMoney(ev.billedRevenueTotal)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {fmtMoney(ev.grossMargin)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {fmtPct(ev.marginPct)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {ev.outletName || ev.spaceName || "—"}{" "}
                  </td>{" "}
                </tr>
              );
            })}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
    </div>
  );
};
