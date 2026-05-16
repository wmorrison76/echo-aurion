/** * Inventory Health Leaderboard Panel * Displays ranked locations by inventory data quality and responsiveness * Supports DAILY / WEEKLY / MONTHLY cadences with trend tracking */ import React, {
  useMemo,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import type { HealthCadence } from "@/../shared/types/inventory-health";
import { useInventoryLeaderboard } from "@/lib/hooks/useInventoryLeaderboard";
import {
  formatTrendArrow,
  formatScorePercent,
  formatTrendDelta,
  healthLabelToColorClass,
  healthLabelToBgClass,
} from "@/lib/inventory-health-scorer";
type MedalEmoji = "🥇" | "🥈" | "🥉";
function getMedalForRank(rank: number): MedalEmoji | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}
export default function InventoryHealthLeaderboardPanel() {
  const [cadence, setCadence] = useState<HealthCadence>("DAILY");
  const [showFinanceMetrics, setShowFinanceMetrics] = useState(false);
  const { leaderboard, loading, refresh } = useInventoryLeaderboard(cadence);
  const entries = useMemo(() => {
    return leaderboard?.entries ?? [];
  }, [leaderboard]);
  return (
    <div className="w-full h-full flex flex-col bg-black/40 overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="flex-shrink-0 border-b border-white/10 p-3">
        {" "}
        <div className="flex items-center justify-between gap-3 mb-3">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold text-white">
              {" "}
              Inventory Health Leaderboard{" "}
            </div>{" "}
            <div className="text-xs text-white/60">
              {" "}
              Location rankings by data quality &amp; responsiveness{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              {" "}
              {loading ? "Refreshing..." : "Refresh"}{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Controls */}{" "}
        <div className="flex items-center justify-between gap-3">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((c) => (
              <Button
                key={c}
                variant={cadence === c ? "default" : "outline"}
                size="sm"
                onClick={() => setCadence(c)}
              >
                {" "}
                {c}{" "}
              </Button>
            ))}{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <label className="flex items-center gap-2 text-xs text-white/70">
              {" "}
              <input
                type="checkbox"
                checked={showFinanceMetrics}
                onChange={(e) => setShowFinanceMetrics(e.target.checked)}
                className="rounded"
              />{" "}
              Finance Metrics{" "}
            </label>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Leaderboard Table */}{" "}
      <div className="flex-1 overflow-auto">
        {" "}
        <Card className="bg-black/30 border-white/10 m-3 h-full">
          {" "}
          {entries.length === 0 ? (
            <div className="p-6 text-center text-white/60 text-sm">
              {" "}
              No inventory data yet. Open Inventory Mini Panel to add
              snapshots.{" "}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {" "}
              <table className="w-full text-sm">
                {" "}
                <thead className="bg-black/40 border-b border-white/10 sticky top-0">
                  {" "}
                  <tr>
                    {" "}
                    <th className="px-4 py-2 text-left text-white/80 font-semibold">
                      {" "}
                      Rank{" "}
                    </th>{" "}
                    <th className="px-4 py-2 text-left text-white/80 font-semibold">
                      {" "}
                      Location{" "}
                    </th>{" "}
                    <th className="px-4 py-2 text-left text-white/80 font-semibold">
                      {" "}
                      Health Score{" "}
                    </th>{" "}
                    <th className="px-4 py-2 text-left text-white/80 font-semibold">
                      {" "}
                      Trend{" "}
                    </th>{" "}
                    <th className="px-4 py-2 text-left text-white/80 font-semibold">
                      {" "}
                      Last Count{" "}
                    </th>{" "}
                    <th className="px-4 py-2 text-left text-white/80 font-semibold">
                      {" "}
                      Recent Item{" "}
                    </th>{" "}
                    {showFinanceMetrics && (
                      <th className="px-4 py-2 text-left text-white/80 font-semibold">
                        {" "}
                        Variance{" "}
                      </th>
                    )}{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {entries.map((entry, idx) => {
                    const medal = getMedalForRank(entry.rank);
                    const bgClass = healthLabelToBgClass(entry.healthLabel);
                    const colorClass = healthLabelToColorClass(
                      entry.healthLabel,
                    );
                    const isTop3 = entry.rank <= 3;
                    return (
                      <tr
                        key={entry.locationId}
                        className={cn(
                          "border-b border-white/10 hover:bg-background transition-colors",
                          isTop3 && `${bgClass} border-white/20`,
                        )}
                      >
                        {" "}
                        {/* Rank */}{" "}
                        <td className="px-4 py-3 text-white/80 font-semibold">
                          {" "}
                          <span className="flex items-center gap-2">
                            {" "}
                            {medal && <span>{medal}</span>}{" "}
                            <span>#{entry.rank}</span>{" "}
                          </span>{" "}
                        </td>{" "}
                        {/* Location Name */}{" "}
                        <td className="px-4 py-3 text-white/90">
                          {" "}
                          {entry.locationName}{" "}
                        </td>{" "}
                        {/* Health Score */}{" "}
                        <td className="px-4 py-3">
                          {" "}
                          <div className="flex items-center gap-2">
                            {" "}
                            <div className="w-24 h-6 bg-black/40 rounded-full overflow-hidden border border-white/10">
                              {" "}
                              <div
                                className={cn(
                                  "h-full flex items-center justify-center text-xs font-semibold",
                                  colorClass,
                                )}
                                style={{
                                  width: `${entry.healthScore * 100}%`,
                                  backgroundColor:
                                    entry.healthLabel === "EXCELLENT"
                                      ? "rgb(16, 185, 129)"
                                      : entry.healthLabel === "GOOD"
                                        ? "rgb(59, 130, 246)"
                                        : entry.healthLabel === "OK"
                                          ? "rgb(245, 158, 11)"
                                          : "rgb(239, 68, 68)",
                                }}
                              />{" "}
                            </div>{" "}
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                colorClass,
                              )}
                            >
                              {" "}
                              {formatScorePercent(entry.healthScore)}{" "}
                            </span>{" "}
                          </div>{" "}
                        </td>{" "}
                        {/* Trend */}{" "}
                        <td className="px-4 py-3">
                          {" "}
                          <div className="flex items-center gap-1">
                            {" "}
                            <span
                              className={cn(
                                "text-lg",
                                entry.trendLabel === "UP"
                                  ? "text-emerald-400"
                                  : entry.trendLabel === "DOWN"
                                    ? "text-red-400"
                                    : "text-white/50",
                              )}
                            >
                              {" "}
                              {formatTrendArrow(entry.trendLabel)}{" "}
                            </span>{" "}
                            <span className="text-xs text-white/70">
                              {" "}
                              {formatTrendDelta(entry.trendDelta)}{" "}
                            </span>{" "}
                          </div>{" "}
                        </td>{" "}
                        {/* Last Count */}{" "}
                        <td className="px-4 py-3 text-white/70 text-xs">
                          {" "}
                          {entry.lastCountMinutesAgo < 60
                            ? `${entry.lastCountMinutesAgo}m ago`
                            : entry.lastCountMinutesAgo < 1440
                              ? `${Math.floor(entry.lastCountMinutesAgo / 60)}h ago`
                              : `${Math.floor(entry.lastCountMinutesAgo / 1440)}d ago`}{" "}
                        </td>{" "}
                        {/* Recent Item */}{" "}
                        <td className="px-4 py-3">
                          {" "}
                          {entry.recentCount ? (
                            <div className="text-xs">
                              {" "}
                              <div className="text-white/80">
                                {" "}
                                {entry.recentCount.name}{" "}
                              </div>{" "}
                              <div className="text-white/60">
                                {" "}
                                {entry.recentCount.onHand}
                                {""} {entry.recentCount.uom}{" "}
                              </div>{" "}
                            </div>
                          ) : (
                            <span className="text-white/40 text-xs">—</span>
                          )}{" "}
                        </td>{" "}
                        {/* Finance Metrics (conditional) */}{" "}
                        {showFinanceMetrics && (
                          <td className="px-4 py-3 text-white/70 text-xs">—</td>
                        )}{" "}
                      </tr>
                    );
                  })}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>
          )}{" "}
        </Card>{" "}
      </div>{" "}
      {/* Footer Info */}{" "}
      <div className="flex-shrink-0 border-t border-white/10 p-3 bg-black/60 text-xs text-white/60">
        {" "}
        <div>
          {" "}
          Showing {entries.length} location{entries.length !== 1 ? "s" : ""} •
          {""}{" "}
          {leaderboard?.asOfISO
            ? new Date(leaderboard.asOfISO).toLocaleString()
            : "Loading..."}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
