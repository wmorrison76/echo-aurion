/**
 * Genesis Rewards Store
 * Persists user/team scores, achievements, and reward history
 * Storage key: luccca:genesis:rewards:v1
 */

import type {
  UserScore,
  TeamScore,
  RewardIssue,
  Achievement,
} from "@/../shared/types/genesis-rewards";

const STORAGE_KEY = "luccca:genesis:rewards:v1";
const MAX_REWARD_ISSUES = 1000;

interface RewardsData {
  userScores: Record<string, UserScore>;
  teamScores: Record<string, TeamScore>;
  rewardIssues: RewardIssue[];
  updatedAt: string;
}

/**
 * Load rewards data from storage
 */
function loadRewardsData(): RewardsData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        userScores: {},
        teamScores: {},
        rewardIssues: [],
        updatedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load rewards data:", e);
    return {
      userScores: {},
      teamScores: {},
      rewardIssues: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Save rewards data to storage
 */
function saveRewardsData(data: RewardsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save rewards data:", e);
    // Fallback: trim history
    try {
      data.rewardIssues = data.rewardIssues.slice(0, 100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e2) {
      console.error("Failed to save trimmed rewards data:", e2);
    }
  }
}

/**
 * Get user score
 */
export function getUserScore(userId: string): UserScore | null {
  const data = loadRewardsData();
  return data.userScores[userId] || null;
}

/**
 * Update user score
 */
export function updateUserScore(
  userId: string,
  updates: Partial<UserScore>,
): void {
  const data = loadRewardsData();

  if (!data.userScores[userId]) {
    data.userScores[userId] = {
      userId,
      userName: "Unknown User",
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      inventoryAccuracy: 0,
      lastUpdated: new Date().toISOString(),
      achievements: [],
    };
  }

  Object.assign(data.userScores[userId], updates, {
    lastUpdated: new Date().toISOString(),
  });
  data.updatedAt = new Date().toISOString();

  saveRewardsData(data);
}

/**
 * Get team score
 */
export function getTeamScore(teamId: string): TeamScore | null {
  const data = loadRewardsData();
  return data.teamScores[teamId] || null;
}

/**
 * Update team score
 */
export function updateTeamScore(
  teamId: string,
  updates: Partial<TeamScore>,
): void {
  const data = loadRewardsData();

  if (!data.teamScores[teamId]) {
    data.teamScores[teamId] = {
      teamId,
      teamName: "Unknown Team",
      totalPoints: 0,
      memberCount: 0,
      avgAccuracy: 0,
      totalAchievements: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  Object.assign(data.teamScores[teamId], updates, {
    lastUpdated: new Date().toISOString(),
  });
  data.updatedAt = new Date().toISOString();

  saveRewardsData(data);
}

/**
 * Issue a reward
 */
export function issueReward(reward: RewardIssue): void {
  const data = loadRewardsData();

  data.rewardIssues.unshift(reward);
  data.rewardIssues = data.rewardIssues.slice(0, MAX_REWARD_ISSUES);
  data.updatedAt = new Date().toISOString();

  // Update user score
  const userScore = data.userScores[reward.userId];
  if (userScore) {
    userScore.totalPoints += reward.points;
    userScore.lastUpdated = new Date().toISOString();
  }

  saveRewardsData(data);
}

/**
 * Get reward history
 */
export function getRewardHistory(
  userId?: string,
  limit: number = 50,
): RewardIssue[] {
  const data = loadRewardsData();

  let filtered = data.rewardIssues;
  if (userId) {
    filtered = filtered.filter((r) => r.userId === userId);
  }

  return filtered.slice(0, limit);
}

/**
 * Add achievement to user
 */
export function addUserAchievement(
  userId: string,
  achievement: Achievement,
): void {
  const data = loadRewardsData();

  if (!data.userScores[userId]) {
    return;
  }

  const userScore = data.userScores[userId];

  // Check if achievement already exists
  if (
    !userScore.achievements.find(
      (a) => a.achievementId === achievement.achievementId,
    )
  ) {
    userScore.achievements.push(achievement);
    userScore.lastUpdated = new Date().toISOString();
  }

  data.updatedAt = new Date().toISOString();
  saveRewardsData(data);
}

/**
 * Get user achievements
 */
export function getUserAchievements(userId: string): Achievement[] {
  const data = loadRewardsData();
  return data.userScores[userId]?.achievements || [];
}

/**
 * Get leaderboard (top users by points)
 */
export function getLeaderboard(limit: number = 10): UserScore[] {
  const data = loadRewardsData();

  return Object.values(data.userScores)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);
}

/**
 * Get team leaderboard
 */
export function getTeamLeaderboard(limit: number = 10): TeamScore[] {
  const data = loadRewardsData();

  return Object.values(data.teamScores)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);
}

/**
 * Clear all rewards (dev only)
 */
export function clearRewards(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear rewards:", e);
  }
}

/**
 * Get rewards statistics
 */
export function getRewardsStats(): {
  totalUsers: number;
  totalRewardsIssued: number;
  totalPointsAwarded: number;
  lastUpdated: string;
} {
  const data = loadRewardsData();
  const totalPointsAwarded = Object.values(data.userScores).reduce(
    (sum, s) => sum + s.totalPoints,
    0,
  );

  return {
    totalUsers: Object.keys(data.userScores).length,
    totalRewardsIssued: data.rewardIssues.length,
    totalPointsAwarded,
    lastUpdated: data.updatedAt,
  };
}
