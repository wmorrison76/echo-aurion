import React, { useState } from "react";
import { useProfitExplorer } from "../../hooks/useProfitExplorer";
function getDefaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: toISO(start), endDate: toISO(end) };
}
interface Props {
  propertyId?: string;
}
export const EventProfitExplorer: React.FC<Props> = ({ propertyId }) => {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [outletId, setOutletId] = useState<string>("");
  const [salesUserId, setSalesUserId] = useState<string>("");
  const [minMarginPct, setMinMarginPct] = useState<number | undefined>();
  const [maxMarginPct, setMaxMarginPct] = useState<number | undefined>();
  const { events, loading, error } = useProfitExplorer({
    startDate,
    endDate,
    outletId: outletId || undefined,
    salesUserId: salesUserId || undefined,
    minMarginPct,
    maxMarginPct,
  });
  const fmtMoney = (v: number) =>
    `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const totalRevenue = events.reduce((sum, e) => sum + e.billedRevenue, 0);
  const totalMargin = events.reduce((sum, e) => sum + e.margin, 0);
  const totalMarginPct = totalRevenue > 0 ? totalMargin / totalRevenue : 0;
  return (
    <div className="border rounded-lg p-4 text-xs space-y-3">
      {" "}
      <div className="flex justify-between items-center">
        {" "}
        <div>
          {" "}
          <div className="text-sm font-semibold">
            Event Profit Explorer
          </div>{" "}
          <div className="text-[0.65rem] text-muted-foreground">
            {" "}
            Filterable view of events with financial metrics.{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid grid-cols-6 gap-2 text-[0.65rem]">
        {" "}
        <div>
          {" "}
          <label className="block text-[0.6rem] font-semibold mb-1">
            {" "}
            Start Date{" "}
          </label>{" "}
          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-[0.6rem] font-semibold mb-1">
            {" "}
            End Date{" "}
          </label>{" "}
          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-[0.6rem] font-semibold mb-1">
            {" "}
            Outlet ID{" "}
          </label>{" "}
          <input
            type="text"
            className="border rounded px-2 py-1 w-full text-[0.65rem]"
            placeholder="(optional)"
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-[0.6rem] font-semibold mb-1">
            {" "}
            Sales User ID{" "}
          </label>{" "}
          <input
            type="text"
            className="border rounded px-2 py-1 w-full text-[0.65rem]"
            placeholder="(optional)"
            value={salesUserId}
            onChange={(e) => setSalesUserId(e.target.value)}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-[0.6rem] font-semibold mb-1">
            {" "}
            Min Margin %{" "}
          </label>{" "}
          <input
            type="number"
            className="border rounded px-2 py-1 w-full text-[0.65rem]"
            placeholder="0.00"
            step="0.01"
            value={minMarginPct ?? ""}
            onChange={(e) =>
              setMinMarginPct(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-[0.6rem] font-semibold mb-1">
            {" "}
            Max Margin %{" "}
          </label>{" "}
          <input
            type="number"
            className="border rounded px-2 py-1 w-full text-[0.65rem]"
            placeholder="1.00"
            step="0.01"
            value={maxMarginPct ?? ""}
            onChange={(e) =>
              setMaxMarginPct(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />{" "}
        </div>{" "}
      </div>{" "}
      {loading && (
        <div className="text-[0.65rem] text-muted-foreground">
          {" "}
          Loading events…{" "}
        </div>
      )}{" "}
      {error && <div className="text-[0.65rem] text-red-600">{error}</div>}{" "}
      {!loading && !error && (
        <div className="bg-muted/50 rounded p-2 flex justify-between text-[0.65rem]">
          {" "}
          <div>
            {" "}
            <span className="font-semibold">Events:</span> {events.length}{" "}
          </div>{" "}
          <div>
            {" "}
            <span className="font-semibold">Total Revenue:</span>
            {""} {fmtMoney(totalRevenue)}{" "}
          </div>{" "}
          <div>
            {" "}
            <span className="font-semibold">Total Margin:</span>
            {""} {fmtMoney(totalMargin)}{" "}
          </div>{" "}
          <div>
            {" "}
            <span className="font-semibold">Margin %:</span>
            {""} {fmtPct(totalMarginPct)}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {!loading && events.length === 0 && !error && (
        <div className="text-[0.65rem] text-muted-foreground">
          {" "}
          No events found for this period.{" "}
        </div>
      )}{" "}
      {!loading && events.length > 0 && (
        <div className="overflow-auto border rounded">
          {" "}
          <table className="w-full text-[0.65rem]">
            {" "}
            <thead>
              {" "}
              <tr className="bg-muted">
                {" "}
                <th className="text-left px-2 py-1">Date</th>{" "}
                <th className="text-left px-2 py-1">Event</th>{" "}
                <th className="text-left px-2 py-1">Sales Rep</th>{" "}
                <th className="text-right px-2 py-1">Revenue</th>{" "}
                <th className="text-right px-2 py-1">COGS</th>{" "}
                <th className="text-right px-2 py-1">Margin</th>{" "}
                <th className="text-right px-2 py-1">Margin %</th>{" "}
                <th className="text-right px-2 py-1">Covers</th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody>
              {" "}
              {events.map((ev) => (
                <tr key={ev.eventId} className="border-t hover:bg-muted/50">
                  {" "}
                  <td className="px-2 py-1">
                    {" "}
                    {new Date(ev.startDatetime).toLocaleDateString()}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 font-semibold">{ev.name}</td>{" "}
                  <td className="px-2 py-1">{ev.salesUserName || "—"}</td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {fmtMoney(ev.billedRevenue)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {fmtMoney(ev.cogsTotal)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right font-semibold">
                    {" "}
                    {fmtMoney(ev.margin)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right font-semibold">
                    {" "}
                    {fmtPct(ev.marginPct)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right">{ev.headcount}</td>{" "}
                </tr>
              ))}{" "}
            </tbody>{" "}
          </table>{" "}
        </div>
      )}{" "}
    </div>
  );
};
