import React from "react";
import { useLeaderboard } from "../../hooks/useLeaderboard";
interface Props {
  period: string; // e.g."this-month","q1-2026"
}
export const SalesLeaderboard: React.FC<Props> = ({ period }) => {
  const { stats, loading, error } = useLeaderboard(period);
  if (loading) {
    return (
      <div className="border rounded-lg p-3 text-xs">
        {" "}
        Loading leaderboard…{" "}
      </div>
    );
  }
  if (error) {
    return (
      <div className="border rounded-lg p-3 text-xs text-red-600">
        {" "}
        {error}{" "}
      </div>
    );
  }
  return (
    <div className="border rounded-lg p-3 text-xs space-y-2">
      {" "}
      <div className="flex justify-between items-center mb-1">
        {" "}
        <h3 className="text-sm font-medium">Sales Leaderboard</h3>{" "}
        <span className="text-[0.65rem] text-muted-foreground">
          {period}
        </span>{" "}
      </div>{" "}
      {stats.map((s, index) => (
        <div
          key={s.userId}
          className="flex items-center justify-between border-b last:border-0 pb-1 last:pb-0"
        >
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="font-semibold text-xs w-4 text-right">
              {" "}
              {index + 1}{" "}
            </span>{" "}
            <span>{s.userName}</span>{" "}
          </div>{" "}
          <div className="flex gap-4 text-[0.65rem] text-muted-foreground">
            {" "}
            <span>Rev: ${s.totalRevenue.toFixed(0)}</span>{" "}
            <span>Profit: ${s.totalProfit.toFixed(0)}</span>{" "}
            <span>Margin: {(s.avgMarginPct * 100).toFixed(1)}%</span>{" "}
            <span>Score: {s.overallScore.toFixed(0)}</span>{" "}
          </div>{" "}
        </div>
      ))}{" "}
      {stats.length === 0 && (
        <p className="text-[0.65rem] text-muted-foreground">
          {" "}
          No events found for this period.{" "}
        </p>
      )}{" "}
    </div>
  );
};
