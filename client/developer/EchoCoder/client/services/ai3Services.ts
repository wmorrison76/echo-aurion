/**
 * AI³ Seed Generator - Complete Services Barrel Export
 * 
 * This module exports all AI³ services and utilities for comprehensive
 * AI-driven module generation, analytics, feedback, and collaboration.
 */

// Main Analytics Service
export { getAI3AnalyticsService } from "./ai3AnalyticsService";
export type {
  AI3Session,
  SessionRating,
  DomainStat,
  QuestionAnalytic,
  AnalyticsDashboardData,
} from "./ai3AnalyticsService";

// Existing Seed Generator Service (if available)
export { getAI3SeedGeneratorService } from "./echocoderAI";

// API Service for direct HTTP calls
export const getAPI3Service = {
  /**
   * Submit feedback/rating for a session
   */
  async submitRating(
    sessionId: string,
    rating: {
      accuracy?: number;
      codeQuality?: number;
      requirementsClarity?: number;
      usefulness?: number;
      comments?: string;
    },
  ) {
    const response = await fetch("/api/ai3/feedback/submit-rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...rating }),
    });

    if (!response.ok) throw new Error("Failed to submit rating");
    return response.json();
  },

  /**
   * Track question effectiveness
   */
  async trackQuestion(question: {
    question: string;
    domain: string;
    detailLevel: string;
    effectiveness: "helpful" | "neutral" | "unhelpful" | "skipped";
    responseLength?: number;
  }) {
    const response = await fetch("/api/ai3/feedback/track-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(question),
    });

    if (!response.ok) throw new Error("Failed to track question");
    return response.json();
  },

  /**
   * Learn from successful sessions in a domain
   */
  async learnDomain(domain: string, successfulSessions: string[]) {
    const response = await fetch("/api/ai3/feedback/learn-domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, successfulSessions }),
    });

    if (!response.ok) throw new Error("Failed to learn domain");
    return response.json();
  },

  /**
   * Get domain statistics and templates
   */
  async getDomainStats(domain: string) {
    const response = await fetch(`/api/ai3/feedback/domain-stats/${domain}`);

    if (!response.ok) throw new Error("Failed to get domain stats");
    return response.json();
  },

  /**
   * Create a shareable link for a session
   */
  async shareSession(
    sessionId: string,
    shareType: "view" | "comment" | "edit",
    options?: {
      sharedWithEmail?: string;
      isPublic?: boolean;
      expiresAt?: string;
    },
  ) {
    const response = await fetch("/api/ai3/collab/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, shareType, ...options }),
    });

    if (!response.ok) throw new Error("Failed to share session");
    return response.json();
  },

  /**
   * Access a shared session
   */
  async getSharedSession(shareToken: string) {
    const response = await fetch(`/api/ai3/collab/share/${shareToken}`);

    if (!response.ok) throw new Error("Failed to access shared session");
    return response.json();
  },

  /**
   * Create a version/snapshot of a session
   */
  async createVersion(sessionId: string, snapshotName?: string) {
    const response = await fetch("/api/ai3/collab/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, snapshotName }),
    });

    if (!response.ok) throw new Error("Failed to create version");
    return response.json();
  },

  /**
   * Get all versions of a session
   */
  async getVersions(sessionId: string) {
    const response = await fetch(`/api/ai3/collab/versions/${sessionId}`);

    if (!response.ok) throw new Error("Failed to get versions");
    return response.json();
  },

  /**
   * Restore a session to a previous version
   */
  async restoreVersion(sessionId: string, snapshotId: string) {
    const response = await fetch("/api/ai3/collab/restore-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, snapshotId }),
    });

    if (!response.ok) throw new Error("Failed to restore version");
    return response.json();
  },

  /**
   * Export session to Jira
   */
  async exportToJira(sessionId: string, projectKey: string, issueType: string) {
    const response = await fetch("/api/ai3/collab/export-jira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, projectKey, issueType }),
    });

    if (!response.ok) throw new Error("Failed to export to Jira");
    return response.json();
  },

  /**
   * Export session to Linear
   */
  async exportToLinear(sessionId: string, teamId: string) {
    const response = await fetch("/api/ai3/collab/export-linear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, teamId }),
    });

    if (!response.ok) throw new Error("Failed to export to Linear");
    return response.json();
  },

  /**
   * Get all exports for a session
   */
  async getExports(sessionId: string) {
    const response = await fetch(`/api/ai3/collab/exports/${sessionId}`);

    if (!response.ok) throw new Error("Failed to get exports");
    return response.json();
  },

  /**
   * Generate documentation for a session
   */
  async generateDocumentation(
    sessionId: string,
    type: "readme" | "api" | "deployment" | "erd" | "all",
  ) {
    const response = await fetch("/api/ai3/docs/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, type }),
    });

    if (!response.ok) throw new Error("Failed to generate documentation");
    return response.json();
  },

  /**
   * Generate tests for a session
   */
  async generateTests(
    sessionId: string,
    type: "unit" | "e2e" | "a11y",
  ) {
    const response = await fetch("/api/ai3/testing/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, type }),
    });

    if (!response.ok) throw new Error("Failed to generate tests");
    return response.json();
  },

  /**
   * Get integration suggestions for a session
   */
  async getIntegrationSuggestions(sessionId: string) {
    const response = await fetch("/api/ai3/integrations/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) throw new Error("Failed to get integration suggestions");
    return response.json();
  },

  /**
   * Get scope analysis and recommendations
   */
  async getScopeAnalysis(sessionId: string) {
    const response = await fetch("/api/ai3/scope/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) throw new Error("Failed to get scope analysis");
    return response.json();
  },

  /**
   * Get advanced AI analysis for a session
   */
  async getAdvancedAnalysis(sessionId: string) {
    const response = await fetch("/api/ai3/advanced/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) throw new Error("Failed to get advanced analysis");
    return response.json();
  },
};

// Utility types
export interface AI3SessionData {
  id: string;
  userId: string;
  domain: string;
  detailLevel: "concise" | "detailed" | "comprehensive";
  initialProblem: string;
  status: "in_progress" | "completed" | "abandoned";
  createdAt: string;
  completedAt?: string;
  sessionDuration?: number;
  conversationTurns: number;
}

export interface AI3FeedbackData {
  sessionId: string;
  accuracy?: number;
  codeQuality?: number;
  requirementsClarity?: number;
  usefulness?: number;
  comments?: string;
}

export interface AI3ShareData {
  sessionId: string;
  shareType: "view" | "comment" | "edit";
  sharedWithEmail?: string;
  isPublic?: boolean;
  expiresAt?: string;
}

// Workflow constants
export const AI3_DETAIL_LEVELS = ["concise", "detailed", "comprehensive"] as const;
export const AI3_SHARE_TYPES = ["view", "comment", "edit"] as const;
export const AI3_EXPORT_PLATFORMS = ["jira", "linear", "github", "asana"] as const;

// Default ratings for validation
export const RATING_CONSTRAINTS = {
  MIN: 1,
  MAX: 5,
} as const;

/**
 * Utility: Validate a rating value
 */
export function isValidRating(value: any): value is number {
  return Number.isInteger(value) && value >= RATING_CONSTRAINTS.MIN && value <= RATING_CONSTRAINTS.MAX;
}

/**
 * Utility: Format session duration for display
 */
export function formatSessionDuration(seconds?: number): string {
  if (!seconds) return "N/A";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Utility: Get trend indicator
 */
export function getTrendIndicator(
  trend: "up" | "down" | "stable",
): { icon: string; color: string; label: string } {
  switch (trend) {
    case "up":
      return { icon: "📈", color: "text-green-600", label: "Improving" };
    case "down":
      return { icon: "📉", color: "text-red-600", label: "Declining" };
    default:
      return { icon: "➡️", color: "text-gray-600", label: "Stable" };
  }
}

/**
 * Utility: Calculate average rating
 */
export function calculateAverageRating(ratings: (number | undefined)[]): number {
  const validRatings = ratings.filter((r) => r !== undefined) as number[];
  if (validRatings.length === 0) return 0;
  return (validRatings.reduce((a, b) => a + b, 0) / validRatings.length);
}

/**
 * Utility: Format completion percentage
 */
export function formatCompletionRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
