import React from "react";
import { useEventFinancials } from "../../hooks/useEventFinancials";
interface Props {
  eventId: string;
  beoId: string;
}
export const EventFinancialSummaryPanel: React.FC<Props> = ({
  eventId,
  beoId,
}) => {
  const { summary, loading, error } = useEventFinancials(eventId);
  if (loading) {
    return (
      <div className="border rounded-lg p-3 text-xs">
        {" "}
        Loading financial summary…{" "}
      </div>
    );
  }
  if (error || !summary) {
    return (
      <div className="border rounded-lg p-3 text-xs text-muted-foreground">
        {" "}
        Financial data not available.{" "}
      </div>
    );
  }
  const marginPct =
    summary.forecastRevenueTotal > 0
      ? (summary.grossMargin / summary.forecastRevenueTotal) * 100
      : 0;
  return (
    <div className="border rounded-lg p-3 text-xs space-y-2">
      {" "}
      <div className="flex justify-between">
        {" "}
        <span>Forecast Revenue</span>{" "}
        <span>
          {" "}
          {summary.currency} {summary.forecastRevenueTotal.toFixed(2)}{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex justify-between">
        {" "}
        <span>Billed Revenue</span>{" "}
        <span>
          {" "}
          {summary.currency} {summary.billedRevenueTotal.toFixed(2)}{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex justify-between">
        {" "}
        <span>Amount Paid</span>{" "}
        <span>
          {" "}
          {summary.currency} {summary.amountPaidTotal.toFixed(2)}{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex justify-between">
        {" "}
        <span>Outstanding</span>{" "}
        <span>
          {" "}
          {summary.currency} {summary.outstandingBalance.toFixed(2)}{" "}
        </span>{" "}
      </div>{" "}
      <hr className="my-2" />{" "}
      <div className="flex justify-between">
        {" "}
        <span>Total COGS (from P&amp;R)</span>{" "}
        <span>
          {" "}
          {summary.currency} {summary.cogsTotal.toFixed(2)}{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex justify-between">
        {" "}
        <span>Gross Margin</span>{" "}
        <span>
          {" "}
          {summary.currency} {summary.grossMargin.toFixed(2)}
          {""}{" "}
          <span className="ml-1 text-[0.65rem] text-muted-foreground">
            {" "}
            ({marginPct.toFixed(1)}%){" "}
          </span>{" "}
        </span>{" "}
      </div>{" "}
      <div className="flex justify-between">
        {" "}
        <span>COGS / Cover</span>{" "}
        <span>
          {" "}
          {summary.currency} {summary.cogsPerCover.toFixed(2)}{" "}
        </span>{" "}
      </div>{" "}
      {summary.lastCostUpdatedAt && (
        <p className="mt-2 text-[0.65rem] text-muted-foreground">
          {" "}
          Last cost update:{""}{" "}
          {new Date(summary.lastCostUpdatedAt).toLocaleString()}{" "}
        </p>
      )}{" "}
      <p className="text-[0.65rem] text-muted-foreground">
        {" "}
        BEO #{beoId} • Event #{summary.eventId}{" "}
      </p>{" "}
    </div>
  );
};
