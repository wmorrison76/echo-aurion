/**
 * Genesis Rewards Types
 * User & team scoring, achievements, incentives
 */

/**
 * User score tracking
 */
export interface UserScore {
  userId: string;
  userName: string;
  totalPoints: number;
  currentStreak: number; // days of consecutive accuracy
  longestStreak: number; // historical best
  inventoryAccuracy: number; // 0-100 %
  lastUpdated: string; // ISO
  achievements: Achievement[];
}

/**
 * Team score aggregation
 */
export interface TeamScore {
  teamId: string;
  teamName: string;
  totalPoints: number;
  memberCount: number;
  avgAccuracy: number; // average of members
  totalAchievements: number;
  lastUpdated: string; // ISO
}

/**
 * Achievement badge
 */
export interface Achievement {
  achievementId: string;
  title: string;
  description: string;
  icon?: string; // emoji or URL
  earnedAt: string; // ISO
  category: "ACCURACY" | "OPTIMIZATION" | "CONSISTENCY" | "COLLABORATION";
}

/**
 * Reward issue record (one point award)
 */
export interface RewardIssue {
  issueId: string;
  userId: string;
  teamId?: string;
  kind:
    | "ACCURACY_BONUS"
    | "COST_SAVINGS"
    | "STREAK_MILESTONE"
    | "OPERATIONAL_EXCELLENCE";
  points: number;
  reasoning: string;
  sourceEventId: string; // ref to genesis:* event that triggered reward
  issuedAt: string; // ISO
  acknowledgedAt?: string; // ISO
}

/**
 * Reward rule configuration
 */
export interface RewardRule {
  ruleId: string;
  kind:
    | "ACCURACY_BONUS"
    | "COST_SAVINGS"
    | "STREAK_MILESTONE"
    | "OPERATIONAL_EXCELLENCE";
  description: string;
  condition: string; // e.g. "inventory_accuracy >= 95"
  pointsAward: number;
  enabled: boolean;
}

/**
 * Reward engine snapshot
 */
export interface RewardsSnapshot {
  snapshotId: string;
  propertyId: string;
  userScores: Record<string, UserScore>; // userId -> score
  teamScores: Record<string, TeamScore>; // teamId -> score
  rules: RewardRule[];
  capturedAt: string; // ISO
}
