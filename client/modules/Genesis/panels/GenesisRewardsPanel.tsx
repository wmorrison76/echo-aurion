/** * Genesis Rewards Panel (Phase 4) * User/team scoring, achievements, and leaderboards */ import React, {
  useEffect,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type {
  UserScore,
  TeamScore,
  RewardIssue,
} from "@/../shared/types/genesis-rewards";
import {
  getLeaderboard,
  getTeamLeaderboard,
  getRewardHistory,
  getRewardsStats,
} from "@/stores/genesisRewardsStore";
import { getCurrentUser } from "@/stores/genesisAuthStore";
import {
  getRewardTierName,
  formatPoints,
  getNextTierThreshold,
} from "@/lib/genesis/rewards/rewardsEngine";
export default function GenesisRewardsPanel() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<UserScore[]>([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamScore[]>([]);
  const [rewardHistory, setRewardHistory] = useState<RewardIssue[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [currentUserScore, setCurrentUserScore] = useState<UserScore | null>(
    null,
  );
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const leaders = getLeaderboard(20);
    setLeaderboard(leaders);
    const teamLeaders = getTeamLeaderboard(10);
    setTeamLeaderboard(teamLeaders);
    const history = getRewardHistory(undefined, 20);
    setRewardHistory(history);
    const s = getRewardsStats();
    setStats(s);
    if (user) {
      const myScore = leaders.find((l) => l.userId === user.userId);
      setCurrentUserScore(myScore || null);
    }
  }, []);
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold text-foreground">
              {" "}
              Genesis Rewards{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              User & team scoring, achievements, and operational excellence{" "}
            </div>{" "}
          </div>{" "}
          {stats && (
            <Badge>
              {" "}
              {stats.totalUsers} users • {stats.totalRewardsIssued} rewards{" "}
            </Badge>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Current User Score Banner */}{" "}
      {currentUserScore && (
        <div className="flex-shrink-0 bg-blue-900/20 border-b border-primary/30 p-4">
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <div className="font-semibold">{currentUser?.name}</div>{" "}
              <div className="text-sm text-primary">
                {" "}
                Tier: {getRewardTierName(currentUserScore.totalPoints)}{" "}
              </div>{" "}
            </div>{" "}
            <div className="text-right">
              {" "}
              <div className="text-2xl font-bold">
                {" "}
                {formatPoints(currentUserScore.totalPoints)}{" "}
              </div>{" "}
              <div className="text-xs text-foreground/70">
                {" "}
                Next tier:{" "}
                {getNextTierThreshold(currentUserScore.totalPoints)}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {currentUserScore.achievements.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {" "}
              {currentUserScore.achievements.slice(0, 5).map((ach) => (
                <Badge key={ach.achievementId} className="text-xs">
                  {" "}
                  {ach.icon} {ach.title}{" "}
                </Badge>
              ))}{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
      {/* Tabs */}{" "}
      <Tabs
        defaultValue="leaderboard"
        className="flex-1 flex flex-col overflow-hidden"
      >
        {" "}
        <TabsList className="flex-shrink-0 ml-4 mt-4 w-fit">
          {" "}
          <TabsTrigger value="leaderboard">User Leaderboard</TabsTrigger>{" "}
          <TabsTrigger value="teams">Team Leaderboard</TabsTrigger>{" "}
          <TabsTrigger value="history">Reward History</TabsTrigger>{" "}
          <TabsTrigger value="rules">Earning Rules</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Tab: User Leaderboard */}{" "}
        <TabsContent value="leaderboard" className="flex-1 overflow-auto p-4">
          {" "}
          <div className="space-y-2">
            {" "}
            {leaderboard.map((user, idx) => (
              <Card key={user.userId} className="p-3">
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <div className="text-lg font-bold text-foreground/70 w-6 text-center">
                      {" "}
                      #{idx + 1}{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <div className="font-semibold text-sm">
                        {" "}
                        {user.userName}{" "}
                      </div>{" "}
                      <div className="text-xs text-foreground/70 mt-1">
                        {" "}
                        Tier: {getRewardTierName(user.totalPoints)} • Streak:
                        {""} {user.currentStreak} days{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <div className="text-lg font-bold">
                      {" "}
                      {formatPoints(user.totalPoints)}{" "}
                    </div>{" "}
                    <div className="text-xs text-foreground/70">
                      {" "}
                      Accuracy: {user.inventoryAccuracy.toFixed(1)}%{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </TabsContent>{" "}
        {/* Tab: Team Leaderboard */}{" "}
        <TabsContent value="teams" className="flex-1 overflow-auto p-4">
          {" "}
          <div className="space-y-2">
            {" "}
            {teamLeaderboard.map((team, idx) => (
              <Card key={team.teamId} className="p-3">
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <div className="text-lg font-bold text-foreground/70 w-6 text-center">
                      {" "}
                      #{idx + 1}{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <div className="font-semibold text-sm">
                        {" "}
                        {team.teamName}{" "}
                      </div>{" "}
                      <div className="text-xs text-foreground/70 mt-1">
                        {" "}
                        {team.memberCount} members • {team.totalAchievements}
                        {""} achievements{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <div className="text-lg font-bold">
                      {" "}
                      {formatPoints(team.totalPoints)}{" "}
                    </div>{" "}
                    <div className="text-xs text-foreground/70">
                      {" "}
                      Avg Accuracy: {team.avgAccuracy.toFixed(1)}%{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </TabsContent>{" "}
        {/* Tab: Reward History */}{" "}
        <TabsContent value="history" className="flex-1 overflow-auto p-4">
          {" "}
          <div className="space-y-2">
            {" "}
            {rewardHistory.length > 0 ? (
              rewardHistory.map((reward) => (
                <Card key={reward.issueId} className="p-3">
                  {" "}
                  <div className="flex items-start justify-between gap-2">
                    {" "}
                    <div className="flex-1">
                      {" "}
                      <div className="font-semibold text-sm">
                        {reward.kind}
                      </div>{" "}
                      <div className="text-xs text-foreground/70 mt-1">
                        {" "}
                        {reward.reasoning}{" "}
                      </div>{" "}
                      <div className="text-xs text-foreground/70">
                        {" "}
                        {new Date(reward.issuedAt).toLocaleString()}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <div className="text-lg font-bold text-green-400">
                        {" "}
                        +{reward.points}{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </Card>
              ))
            ) : (
              <Card className="p-4 text-center text-foreground/70">
                {" "}
                No reward history yet{" "}
              </Card>
            )}{" "}
          </div>{" "}
        </TabsContent>{" "}
        {/* Tab: Earning Rules */}{" "}
        <TabsContent value="rules" className="flex-1 overflow-auto p-4">
          {" "}
          <div className="space-y-3">
            {" "}
            <Card className="p-4">
              {" "}
              <h3 className="font-semibold mb-2">⭐ Accuracy Bonus</h3>{" "}
              <p className="text-xs text-foreground/70 mb-2">
                {" "}
                Awarded for high inventory accuracy scores{" "}
              </p>{" "}
              <ul className="text-xs space-y-1 text-foreground/70">
                {" "}
                <li>✓ 95%+ accuracy: 5-10 points</li>{" "}
                <li>
                  ✓ 98%+ accuracy: +20 bonus (Perfect Accuracy badge)
                </li>{" "}
              </ul>{" "}
            </Card>{" "}
            <Card className="p-4">
              {" "}
              <h3 className="font-semibold mb-2">💰 Cost Savings</h3>{" "}
              <p className="text-xs text-foreground/70 mb-2">
                {" "}
                Awarded for procurement optimization and cost reduction{" "}
              </p>{" "}
              <ul className="text-xs space-y-1 text-foreground/70">
                {" "}
                <li>✓ 10%+ savings: 10+ points (2 points per %)</li>{" "}
                <li>✓ 20%+ savings: +20 bonus (Major Cost Saver badge)</li>{" "}
              </ul>{" "}
            </Card>{" "}
            <Card className="p-4">
              {" "}
              <h3 className="font-semibold mb-2">🔥 Streak Milestones</h3>{" "}
              <p className="text-xs text-foreground/70 mb-2">
                {" "}
                Awarded for consistent daily accuracy{" "}
              </p>{" "}
              <ul className="text-xs space-y-1 text-foreground/70">
                {" "}
                <li>
                  ✓ 7-day streak: 35+ points (One Week Warrior badge)
                </li>{" "}
                <li>✓ 30-day streak: 150+ points (Month Master badge)</li>{" "}
                <li>
                  ✓ 5 points per day in streak (max 50 per milestone)
                </li>{" "}
              </ul>{" "}
            </Card>{" "}
            <Card className="p-4">
              {" "}
              <h3 className="font-semibold mb-2">
                🏆 Operational Excellence
              </h3>{" "}
              <p className="text-xs text-foreground/70 mb-2">
                {" "}
                Awarded for completing complex procurement cycles
                flawlessly{" "}
              </p>{" "}
              <ul className="text-xs space-y-1 text-foreground/70">
                {" "}
                <li>✓ Zero warnings: +20 bonus</li>{" "}
                <li>✓ Fast execution (&lt;1s): +15 bonus</li>{" "}
                <li>✓ Base: 5-50 points depending on plan value</li>{" "}
              </ul>{" "}
            </Card>{" "}
          </div>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
