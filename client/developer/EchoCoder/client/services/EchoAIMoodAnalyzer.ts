import * as Sentry from "@sentry/react";
import type { OrbMood } from "./EchoAIOrbService";

/**
 * Context for AI mood analysis
 */
export interface MoodAnalysisContext {
  workloadLevel: number; // 0-1
  currentMood: OrbMood;
  errorRate: number; // 0-1
  requestCount: number;
  activeUsers: number;
  systemUptime: number; // milliseconds
  timestamp: number;
  recentEvents?: string[]; // e.g., ["high_error_rate", "traffic_spike"]
}

/**
 * AI mood analysis result
 */
export interface MoodAnalysisResult {
  suggestedMood: OrbMood;
  confidence: number; // 0-1
  reasoning: string;
  personality: string; // e.g., "anxious", "creative", "focused"
}

/**
 * Optional GPT-4 powered mood analyzer
 * Provides nuanced mood determination based on system context and AI understanding
 */
class EchoAIMoodAnalyzer {
  private lastAnalysis: {
    timestamp: number;
    result: MoodAnalysisResult;
  } | null = null;

  private analysisCooldown = 10000; // 10 second minimum between analyses to avoid API spam

  /**
   * Analyze context and determine mood using GPT-4
   */
  async analyzeMood(context: MoodAnalysisContext): Promise<MoodAnalysisResult> {
    // Check cooldown to avoid excessive API calls
    if (
      this.lastAnalysis &&
      Date.now() - this.lastAnalysis.timestamp < this.analysisCooldown
    ) {
      return this.lastAnalysis.result;
    }

    try {
      const prompt = this.buildPrompt(context);
      const response = await fetch("/api/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          context: "mood_analysis",
          maxTokens: 100,
        }),
      });

      if (!response.ok) {
        // Fall back to workload-based determination if API fails
        return this.defaultMoodDetermination(context);
      }

      const data = await response.json();
      const result = this.parseAIResponse(data.response, context);

      this.lastAnalysis = {
        timestamp: Date.now(),
        result,
      };

      return result;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: "EchoAIMoodAnalyzer" },
      });
      // Gracefully fall back to workload-based determination
      return this.defaultMoodDetermination(context);
    }
  }

  /**
   * Build prompt for GPT-4
   */
  private buildPrompt(context: MoodAnalysisContext): string {
    const recentEvents = context.recentEvents?.join(", ") || "none";

    return `You are EchoAI, an intelligent orb that reflects system state through mood.

Current system context:
- Workload level: ${(context.workloadLevel * 100).toFixed(1)}%
- Error rate: ${(context.errorRate * 100).toFixed(1)}%
- Active requests: ${context.requestCount}
- Active users: ${context.activeUsers}
- System uptime: ${(context.systemUptime / 1000 / 60).toFixed(1)} minutes
- Recent events: ${recentEvents}
- Current mood: ${context.currentMood}

Determine the most appropriate mood for EchoAI. Choose ONE mood that best captures the system personality:
- idle: Calm, nothing happening
- thinking: Processing, analyzing
- focused: Steady work, concentrated
- creative: Generating, problem-solving
- excited: Fast activity, high energy
- stressed: High load, errors, struggling
- calm: Peaceful, optimized state

Respond in this JSON format ONLY:
{
  "mood": "the_mood_name",
  "confidence": 0.85,
  "personality": "one-word-personality",
  "reasoning": "brief explanation"
}`;
  }

  /**
   * Parse GPT-4 response
   */
  private parseAIResponse(
    response: string,
    context: MoodAnalysisContext,
  ): MoodAnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.defaultMoodDetermination(context);
      }

      const data = JSON.parse(jsonMatch[0]);

      const moodMapping: Record<string, OrbMood> = {
        idle: "idle",
        thinking: "thinking",
        focused: "focused",
        creative: "creative",
        excited: "excited",
        stressed: "stressed",
        calm: "calm",
      };

      const mood = moodMapping[data.mood] || context.currentMood;
      const confidence = Math.min(1, Math.max(0, data.confidence || 0.5));

      return {
        suggestedMood: mood,
        confidence,
        reasoning: data.reasoning || "AI analysis",
        personality: data.personality || mood,
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return this.defaultMoodDetermination(context);
    }
  }

  /**
   * Default workload-based mood determination (fallback)
   */
  private defaultMoodDetermination(
    context: MoodAnalysisContext,
  ): MoodAnalysisResult {
    const workload = context.workloadLevel;

    let mood: OrbMood = "idle";
    let reasoning = "";

    if (workload < 0.05) {
      mood = "idle";
      reasoning = "No activity detected";
    } else if (workload < 0.2) {
      mood = "thinking";
      reasoning = "Light processing activity";
    } else if (workload < 0.4) {
      mood = "focused";
      reasoning = "Steady work in progress";
    } else if (workload < 0.5) {
      mood = "creative";
      reasoning = "Active generation mode";
    } else if (workload < 0.65) {
      mood = "excited";
      reasoning = "High activity level";
    } else if (workload < 0.85) {
      mood = "excited";
      reasoning = "Very high load";
    } else {
      mood = "stressed";
      reasoning = "System under heavy stress";
    }

    // Adjust based on error rate
    if (context.errorRate > 0.1 && mood !== "stressed") {
      mood = "stressed";
      reasoning = `System experiencing ${(context.errorRate * 100).toFixed(0)}% errors`;
    }

    return {
      suggestedMood: mood,
      confidence: 0.8,
      reasoning,
      personality: mood,
    };
  }

  /**
   * Clear cached analysis
   */
  clearCache(): void {
    this.lastAnalysis = null;
  }
}

// Singleton instance
let instance: EchoAIMoodAnalyzer | null = null;

/**
 * Get or create mood analyzer singleton
 */
export function getEchoAIMoodAnalyzer(): EchoAIMoodAnalyzer {
  if (!instance) {
    instance = new EchoAIMoodAnalyzer();
  }
  return instance;
}

export default EchoAIMoodAnalyzer;
