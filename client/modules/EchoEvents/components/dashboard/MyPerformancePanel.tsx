/** * MyPerformancePanel Component * Displays salesperson's performance metrics and reward information * Part of LUCCCA sales gamification system */ import React from "react";
import { useMyPerformance } from "../../hooks/useMyPerformance";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { AlertCircle, TrendingUp, Trophy, Gift } from "lucide-react";
interface Props {
  userId?: string;
  period?: "this-month" | "this-quarter" | "this-year";
  className?: string;
}
export const MyPerformancePanel: React.FC<Props> = ({
  userId,
  period = "this-month",
  className = "",
}) => {
  const { performance, reward, summary, loading, error } = useMyPerformance(
    userId,
    period,
  );
  if (loading) {
    return (
      <Card className={className}>
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">My Performance</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-xs text-muted-foreground">Loading…</div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (error) {
    return (
      <Card className={className}>
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">My Performance</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="flex gap-2 text-xs text-red-600">
            {" "}
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{" "}
            <span>{error}</span>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (!performance || !reward) {
    return (
      <Card className={className}>
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">My Performance</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            No performance data available for this period.{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  const tierColors: Record<string, { bg: string; text: string }> = {
    bronze: { bg: "bg-amber-50", text: "text-amber-700" },
    silver: { bg: "bg-slate-50", text: "text-foreground" },
    gold: { bg: "bg-yellow-50", text: "text-yellow-700" },
    platinum: { bg: "bg-purple-50", text: "text-purple-700" },
  };
  const tierColor =
    tierColors[reward.rewardTier || "bronze"] || tierColors.bronze;
  return (
    <Card className={className}>
      {" "}
      <CardHeader className="pb-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-sm">
              {performance.userName}
            </CardTitle>{" "}
            <CardDescription className="text-xs capitalize">
              {" "}
              {period.replace("-", "")}{" "}
            </CardDescription>{" "}
          </div>{" "}
          {reward.rewardTier && (
            <Badge className={`${tierColor.bg} ${tierColor.text} border-0`}>
              {" "}
              <Trophy className="w-3 h-3 mr-1" /> {reward.rewardTier}{" "}
            </Badge>
          )}{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-3">
        {" "}
        {/* Metrics Grid */}{" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          {/* Revenue */}{" "}
          <div className="border rounded-lg p-2 bg-slate-50">
            {" "}
            <div className="text-[0.65rem] text-muted-foreground mb-0.5">
              {" "}
              Revenue{" "}
            </div>{" "}
            <div className="text-sm font-semibold">
              {" "}
              $
              {performance.totalRevenue.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
          </div>{" "}
          {/* Profit */}{" "}
          <div className="border rounded-lg p-2 bg-slate-50">
            {" "}
            <div className="text-[0.65rem] text-muted-foreground mb-0.5">
              {" "}
              Profit{" "}
            </div>{" "}
            <div className="text-sm font-semibold">
              {" "}
              $
              {performance.totalProfit.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
          </div>{" "}
          {/* Margin */}{" "}
          <div className="border rounded-lg p-2 bg-slate-50">
            {" "}
            <div className="text-[0.65rem] text-muted-foreground mb-0.5">
              {" "}
              Margin{" "}
            </div>{" "}
            <div className="text-sm font-semibold">
              {" "}
              {(performance.avgMarginPct * 100).toFixed(1)}%{" "}
            </div>{" "}
          </div>{" "}
          {/* Win Rate */}{" "}
          <div className="border rounded-lg p-2 bg-slate-50">
            {" "}
            <div className="text-[0.65rem] text-muted-foreground mb-0.5">
              {" "}
              Win Rate{" "}
            </div>{" "}
            <div className="text-sm font-semibold">
              {" "}
              {(performance.winRatePct * 100).toFixed(0)}%{" "}
            </div>{" "}
          </div>{" "}
          {/* Close Time */}{" "}
          <div className="border rounded-lg p-2 bg-slate-50">
            {" "}
            <div className="text-[0.65rem] text-muted-foreground mb-0.5">
              {" "}
              Avg Close{" "}
            </div>{" "}
            <div className="text-sm font-semibold">
              {" "}
              {performance.avgCloseTimeDays.toFixed(1)}d{" "}
            </div>{" "}
          </div>{" "}
          {/* Score */}{" "}
          <div className="border rounded-lg p-2 bg-blue-50">
            {" "}
            <div className="text-[0.65rem] text-muted-foreground mb-0.5">
              {" "}
              Score{" "}
            </div>{" "}
            <div className="text-sm font-semibold text-blue-700">
              {" "}
              {performance.overallScore.toFixed(0)}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Reward Points Section */}{" "}
        <div className={`rounded-lg p-2.5 ${tierColor.bg}`}>
          {" "}
          <div className="flex items-center justify-between mb-1.5">
            {" "}
            <div className="flex items-center gap-1.5">
              {" "}
              <Gift className="w-3.5 h-3.5" />{" "}
              <span className="text-xs font-semibold">Reward Points</span>{" "}
            </div>{" "}
            <span className={`text-sm font-bold ${tierColor.text}`}>
              {" "}
              {reward.totalPoints.toFixed(0)}{" "}
            </span>{" "}
          </div>{" "}
          {/* Points Breakdown */}{" "}
          <div className="space-y-1">
            {" "}
            <div className="flex justify-between text-[0.65rem] text-muted-foreground">
              {" "}
              <span>Base Points</span>{" "}
              <span>{reward.basePoints.toFixed(0)}</span>{" "}
            </div>{" "}
            <div className="flex justify-between text-[0.65rem] text-muted-foreground">
              {" "}
              <span>Bonuses</span>{" "}
              <span>+{reward.bonusPoints.toFixed(0)}</span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Eligibility Status */}{" "}
          <div className="mt-2 pt-2 border-t border-current border-opacity-20">
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <span className="text-[0.65rem] font-medium">
                Payout Status
              </span>{" "}
              <Badge
                variant="outline"
                className={`text-[0.65rem] ${reward.eligibleForPayout ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
              >
                {" "}
                {reward.eligibleForPayout ? "✓ Eligible" : "Pending"}{" "}
              </Badge>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Event Count */}{" "}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          {" "}
          <TrendingUp className="w-3 h-3" />{" "}
          <span>{performance.eventsCount} events won</span>{" "}
        </div>{" "}
        {/* Last Updated */}{" "}
        {reward.calculationTimestamp && (
          <div className="text-[0.65rem] text-muted-foreground border-t pt-2">
            {" "}
            Updated{" "}
            {new Date(reward.calculationTimestamp).toLocaleString()}{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
};
export default MyPerformancePanel;
