import React, { useState } from "react";
import { useUnderperformingSpaces } from "../../hooks/useUnderperformingSpaces";
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
export const UnderperformingSpacesPanel: React.FC<Props> = ({ propertyId }) => {
  const defaultRange = getDefaultRange();
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [minEvents, setMinEvents] = useState(5);
  const [gapThresholdPct, setGapThresholdPct] = useState(0.05);
  const { rows, loading, error } = useUnderperformingSpaces({
    startDate,
    endDate,
    propertyId,
    minEvents,
    gapThresholdPct,
  });
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
  return (
    <div className="border rounded-lg p-4 text-xs space-y-3">
      {" "}
      <div className="flex justify-between items-center">
        {" "}
        <div>
          {" "}
          <div className="text-sm font-semibold">
            {" "}
            Underperforming Spaces Alert{" "}
          </div>{" "}
          <div className="text-[0.65rem] text-muted-foreground">
            {" "}
            Spaces with margin below benchmark. Click any space to
            investigate.{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid grid-cols-4 gap-2 text-[0.65rem]">
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
            Min Events ({minEvents}){" "}
          </label>{" "}
          <input
            type="range"
            className="w-full"
            min="1"
            max="20"
            value={minEvents}
            onChange={(e) => setMinEvents(Number(e.target.value))}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-[0.6rem] font-semibold mb-1">
            {" "}
            Gap Threshold ({fmtPct(gapThresholdPct)}){" "}
          </label>{" "}
          <input
            type="range"
            className="w-full"
            min="0.01"
            max="0.2"
            step="0.01"
            value={gapThresholdPct}
            onChange={(e) => setGapThresholdPct(Number(e.target.value))}
          />{" "}
        </div>{" "}
      </div>{" "}
      {loading && (
        <div className="text-[0.65rem] text-muted-foreground">
          {" "}
          Loading underperforming spaces…{" "}
        </div>
      )}{" "}
      {error && <div className="text-[0.65rem] text-red-600">{error}</div>}{" "}
      {!loading && rows.length === 0 && !error && (
        <div className="text-[0.65rem] text-muted-foreground">
          {" "}
          No underperforming spaces found.{" "}
        </div>
      )}{" "}
      {!loading && rows.length > 0 && (
        <div className="overflow-auto border rounded">
          {" "}
          <table className="w-full text-[0.65rem]">
            {" "}
            <thead>
              {" "}
              <tr className="bg-muted">
                {" "}
                <th className="text-left px-2 py-1">Space</th>{" "}
                <th className="text-left px-2 py-1">Property</th>{" "}
                <th className="text-right px-2 py-1">Events</th>{" "}
                <th className="text-right px-2 py-1">Avg Margin %</th>{" "}
                <th className="text-right px-2 py-1">Benchmark %</th>{" "}
                <th className="text-right px-2 py-1">Gap</th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody>
              {" "}
              {rows.map((row) => (
                <tr key={row.spaceId} className="border-t hover:bg-muted/50">
                  {" "}
                  <td className="px-2 py-1">
                    {" "}
                    <div className="font-semibold">
                      {" "}
                      {row.spaceName || "Unknown"}{" "}
                    </div>{" "}
                    <div className="text-[0.6rem] text-muted-foreground">
                      {" "}
                      {row.spaceType || "—"}{" "}
                    </div>{" "}
                  </td>{" "}
                  <td className="px-2 py-1">{row.propertyName || "—"}</td>{" "}
                  <td className="px-2 py-1 text-right">{row.eventsCount}</td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {fmtPct(row.avgMarginPct)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right">
                    {" "}
                    {fmtPct(row.benchmarkMarginPct)}{" "}
                  </td>{" "}
                  <td className="px-2 py-1 text-right font-semibold text-red-600">
                    {" "}
                    {fmtPct(row.marginGapPct)}{" "}
                  </td>{" "}
                </tr>
              ))}{" "}
            </tbody>{" "}
          </table>{" "}
        </div>
      )}{" "}
    </div>
  );
};
