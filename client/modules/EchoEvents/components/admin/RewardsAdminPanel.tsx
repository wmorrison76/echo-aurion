/** * RewardsAdminPanel Component * Admin interface for managing sales rewards, seasons, and payouts * Part of LUCCCA sales gamification administration */ import React, {
  useEffect,
  useState,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AlertCircle, CheckCircle, Play, Plus } from "lucide-react";
const EVENTS_API_BASE =
  import.meta.env.VITE_EVENTS_API_BASE || "http://localhost:3000/api";
interface Season {
  id: string;
  name: string;
  seasonType: string;
  startDate: string;
  endDate: string;
  totalRewardPool?: number;
  isActive: boolean;
}
export const RewardsAdminPanel: React.FC = () => {
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fetchActiveSeason = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${EVENTS_API_BASE}/sales/current`, {
        credentials: "include",
        headers: { "x-luccca-system": "EchoEventStudio" },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch active season");
      }
      const data = await res.json();
      setActiveSeason(data.season);
    } catch (err: any) {
      console.error("[RewardsAdminPanel] Error fetching season:", err);
      setError(err.message || "Failed to load season data");
    } finally {
      setLoading(false);
    }
  };
  const handleCalculateRewards = async () => {
    if (!activeSeason) return;
    try {
      setProcessing(true);
      setMessage(null);
      setError(null);
      const res = await fetch(`${EVENTS_API_BASE}/sales/calculate`, {
        method: "POST",
        credentials: "include",
        headers: {
          "x-luccca-system": "EchoEventStudio",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: activeSeason.startDate,
          endDate: activeSeason.endDate,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to calculate rewards");
      }
      const data = await res.json();
      setMessage(
        `✓ Calculated rewards for ${data.calculated} users. ${data.eligibleForPayout} eligible for payout. ${data.totalPointsDistributed.toFixed(0)} points distributed.`,
      );
    } catch (err: any) {
      console.error("[RewardsAdminPanel] Error calculating rewards:", err);
      setError(err.message || "Failed to calculate rewards");
    } finally {
      setProcessing(false);
    }
  };
  const handleProcessRewards = async () => {
    try {
      setProcessing(true);
      setMessage(null);
      setError(null);
      const res = await fetch(`${EVENTS_API_BASE}/sales/process`, {
        method: "POST",
        credentials: "include",
        headers: {
          "x-luccca-system": "EchoEventStudio",
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to process rewards");
      }
      const data = await res.json();
      setMessage(
        `✓ Processed ${data.processed} users. Distributed ${data.totalPointsDistributed.toFixed(0)} points.`,
      );
      await fetchActiveSeason();
    } catch (err: any) {
      console.error("[RewardsAdminPanel] Error processing rewards:", err);
      setError(err.message || "Failed to process rewards");
    } finally {
      setProcessing(false);
    }
  };
  useEffect(() => {
    fetchActiveSeason();
  }, []);
  if (loading) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Rewards Administration</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-sm text-muted-foreground">Loading…</div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (!activeSeason) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Rewards Administration</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="flex gap-2 text-sm text-amber-600">
            {" "}
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{" "}
            <span>No active reward season. Create one to begin.</span>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <CardTitle>Rewards Administration</CardTitle>{" "}
            <CardDescription>
              Manage sales reward programs and payouts
            </CardDescription>{" "}
          </div>{" "}
          <Badge className="bg-green-50 text-green-700 border-green-200">
            {" "}
            Active Season{" "}
          </Badge>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        {/* Active Season Info */}{" "}
        <div className="border rounded-lg p-4 bg-slate-50">
          {" "}
          <h4 className="font-semibold text-sm mb-3">
            {activeSeason.name}
          </h4>{" "}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {" "}
            <div>
              {" "}
              <div className="text-muted-foreground text-xs mb-0.5">
                Period
              </div>{" "}
              <div className="font-mono text-xs">
                {" "}
                {activeSeason.startDate} → {activeSeason.endDate}{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <div className="text-muted-foreground text-xs mb-0.5">
                Type
              </div>{" "}
              <div className="font-semibold capitalize text-xs">
                {" "}
                {activeSeason.seasonType}{" "}
              </div>{" "}
            </div>{" "}
            {activeSeason.totalRewardPool && (
              <div className="col-span-2">
                {" "}
                <div className="text-muted-foreground text-xs mb-0.5">
                  {" "}
                  Reward Pool{" "}
                </div>{" "}
                <div className="font-semibold">
                  {" "}
                  $
                  {activeSeason.totalRewardPool.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {/* Messages */}{" "}
        {error && (
          <div className="border border-red-200 rounded-lg p-3 bg-red-50 text-sm text-red-700 flex gap-2">
            {" "}
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{" "}
            <span>{error}</span>{" "}
          </div>
        )}{" "}
        {message && (
          <div className="border border-green-200 rounded-lg p-3 bg-green-50 text-sm text-green-700 flex gap-2">
            {" "}
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{" "}
            <span>{message}</span>{" "}
          </div>
        )}{" "}
        {/* Action Buttons */}{" "}
        <div className="space-y-3">
          {" "}
          <div>
            {" "}
            <h5 className="text-sm font-semibold mb-2">
              Reward Calculation
            </h5>{" "}
            <div className="text-xs text-muted-foreground mb-3">
              {" "}
              Calculate reward points for all sales team members based on their
              performance metrics (revenue, profit, win rate, upsells, close
              time).{" "}
            </div>{" "}
            <Button
              onClick={handleCalculateRewards}
              disabled={processing}
              className="w-full"
            >
              {" "}
              <Plus className="w-4 h-4 mr-2" />{" "}
              {processing ? "Calculating…" : "Calculate Rewards"}{" "}
            </Button>{" "}
          </div>{" "}
          <div className="border-t" />{" "}
          <div>
            {" "}
            <h5 className="text-sm font-semibold mb-2">
              Reward Processing
            </h5>{" "}
            <div className="text-xs text-muted-foreground mb-3">
              {" "}
              Process eligible rewards and finalize payouts for the season. Run
              this at end-of-season or on a scheduled cadence.{" "}
            </div>{" "}
            <Button
              onClick={handleProcessRewards}
              disabled={processing}
              variant="default"
              className="w-full"
            >
              {" "}
              <Play className="w-4 h-4 mr-2" />{" "}
              {processing ? "Processing…" : "Process Active Season"}{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Info Section */}{" "}
        <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
          {" "}
          <p>
            {" "}
            💡 <strong>Tip:</strong> Set up a cron job to automatically process
            rewards on a monthly or quarterly basis.{" "}
          </p>{" "}
          <p>
            {" "}
            📊 <strong>Next:</strong> View season results and leaderboard to
            track reward eligibility and tier progression.{" "}
          </p>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
};
export default RewardsAdminPanel;
