/**
 * Genesis Rewards Engine
 * Deterministic reward calculation based on audit events
 */

import type {
  RewardIssue,
  Achievement,
} from "@/../shared/types/genesis-rewards";
import { issueReward, addUserAchievement } from "@/stores/genesisRewardsStore";

export interface RewardContext {
  userId: string;
  eventType: string;
  eventId: string;
  accuracy?: number; // 0-100
  costSavingsPercent?: number;
  streakDays?: number;
}

/**
 * Process a Genesis event and issue rewards
 */
export function processEventForRewards(
  context: RewardContext,
): RewardIssue | null {
  if (context.accuracy && context.accuracy >= 95) {
    return issueAccuracyBonus(context);
  }

  if (context.costSavingsPercent && context.costSavingsPercent >= 10) {
    return issueCostSavingsReward(context);
  }

  if (context.streakDays && context.streakDays >= 7) {
    return issueStreakMilestone(context);
  }

  return null;
}

/**
 * Issue accuracy bonus reward
 */
function issueAccuracyBonus(context: RewardContext): RewardIssue {
  const points = Math.floor((context.accuracy || 0) / 10); // Up to 10 points
  const reward: RewardIssue = {
    issueId: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: context.userId,
    kind: "ACCURACY_BONUS",
    points: Math.max(5, points),
    reasoning: `Inventory accuracy: ${context.accuracy}%`,
    sourceEventId: context.eventId,
    issuedAt: new Date().toISOString(),
  };

  issueReward(reward);

  // Award achievement for high accuracy
  if ((context.accuracy || 0) >= 98) {
    const achievement: Achievement = {
      achievementId: `ach_perfect_accuracy_${Date.now()}`,
      title: "Perfect Accuracy",
      description: "Achieved 98%+ inventory accuracy",
      icon: "⭐",
      earnedAt: new Date().toISOString(),
      category: "ACCURACY",
    };
    addUserAchievement(context.userId, achievement);
  }

  return reward;
}

/**
 * Issue cost savings reward
 */
function issueCostSavingsReward(context: RewardContext): RewardIssue {
  const points = Math.floor((context.costSavingsPercent || 0) / 2); // 2 points per %
  const reward: RewardIssue = {
    issueId: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: context.userId,
    kind: "COST_SAVINGS",
    points: Math.max(10, points),
    reasoning: `Cost savings achieved: ${context.costSavingsPercent}%`,
    sourceEventId: context.eventId,
    issuedAt: new Date().toISOString(),
  };

  issueReward(reward);

  // Award achievement for significant savings
  if ((context.costSavingsPercent || 0) >= 20) {
    const achievement: Achievement = {
      achievementId: `ach_major_savings_${Date.now()}`,
      title: "Major Cost Saver",
      description: "Achieved 20%+ cost optimization",
      icon: "💰",
      earnedAt: new Date().toISOString(),
      category: "OPTIMIZATION",
    };
    addUserAchievement(context.userId, achievement);
  }

  return reward;
}

/**
 * Issue streak milestone reward
 */
function issueStreakMilestone(context: RewardContext): RewardIssue {
  const points = Math.min(50, (context.streakDays || 0) * 5); // 5 points per day, max 50
  const reward: RewardIssue = {
    issueId: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: context.userId,
    kind: "STREAK_MILESTONE",
    points,
    reasoning: `${context.streakDays}-day streak milestone`,
    sourceEventId: context.eventId,
    issuedAt: new Date().toISOString(),
  };

  issueReward(reward);

  // Award milestone achievements
  if (context.streakDays === 7) {
    const achievement: Achievement = {
      achievementId: `ach_7day_streak_${Date.now()}`,
      title: "One Week Warrior",
      description: "Maintained 7-day accuracy streak",
      icon: "🔥",
      earnedAt: new Date().toISOString(),
      category: "CONSISTENCY",
    };
    addUserAchievement(context.userId, achievement);
  }

  if (context.streakDays === 30) {
    const achievement: Achievement = {
      achievementId: `ach_30day_streak_${Date.now()}`,
      title: "Month Master",
      description: "Maintained 30-day accuracy streak",
      icon: "🏆",
      earnedAt: new Date().toISOString(),
      category: "CONSISTENCY",
    };
    addUserAchievement(context.userId, achievement);
  }

  return reward;
}

/**
 * Calculate operational excellence bonus
 * Awarded for completing complex procurement cycles
 */
export function calculateOperationalExcellence(
  procurementPlanValue: number,
  warningsCount: number,
  executionTimeMs: number,
): number {
  let points = 0;

  // Base points for completing procurement
  points += Math.max(5, Math.floor(procurementPlanValue / 10000));

  // Bonus for zero warnings
  if (warningsCount === 0) {
    points += 20;
  } else {
    points -= Math.min(10, warningsCount * 2);
  }

  // Bonus for fast execution
  if (executionTimeMs < 1000) {
    points += 15;
  } else if (executionTimeMs < 5000) {
    points += 10;
  }

  return Math.max(10, points);
}

/**
 * Calculate accuracy score (0-100)
 */
export function calculateAccuracyScore(
  correctItems: number,
  totalItems: number,
): number {
  if (totalItems === 0) return 100;
  return Math.round((correctItems / totalItems) * 100);
}

/**
 * Calculate cost savings percentage
 */
export function calculateCostSavings(
  originalCost: number,
  optimizedCost: number,
): number {
  if (originalCost === 0) return 0;
  return Math.round(((originalCost - optimizedCost) / originalCost) * 100);
}

/**
 * Get reward tier name
 */
export function getRewardTierName(totalPoints: number): string {
  if (totalPoints >= 1000) return "Platinum";
  if (totalPoints >= 500) return "Gold";
  if (totalPoints >= 250) return "Silver";
  if (totalPoints >= 100) return "Bronze";
  if (totalPoints >= 50) return "Iron";
  return "Rookie";
}

/**
 * Get next tier threshold
 */
export function getNextTierThreshold(currentPoints: number): number {
  const thresholds = [50, 100, 250, 500, 1000];
  for (const threshold of thresholds) {
    if (currentPoints < threshold) {
      return threshold;
    }
  }
  return currentPoints + 500; // Next custom threshold
}

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return `${points}`;
}
