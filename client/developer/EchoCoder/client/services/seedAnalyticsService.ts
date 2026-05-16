import { createClient } from "@supabase/supabase-js";

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
      );
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}

export interface SeedSession {
  id: string;
  user_id: string;
  domain?: string;
  detail_level: "concise" | "detailed" | "comprehensive";
  initial_problem: string;
  created_at: string;
  completed_at?: string;
  status: "in_progress" | "completed" | "abandoned";
  session_duration_seconds?: number;
  conversation_turns: number;
  accuracy_rating?: number;
  rating_comments?: string;
  generated_code_quality?: number;
  requirements_doc_quality?: number;
  usefulness_rating?: number;
}

export interface DomainAnalytics {
  domain: string;
  total_sessions: number;
  avg_accuracy_rating: number;
  avg_code_quality: number;
  avg_requirements_quality: number;
  completion_rate: number;
  trending: "up" | "down" | "stable";
  recommended: boolean;
}

export interface QuestionAnalytics {
  question_text: string;
  detail_level: string;
  domain?: string;
  times_asked: number;
  avg_accuracy_impact: number;
  effectiveness_score: number;
  skip_rate: number;
}

export class SeedAnalyticsService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Session Management
  async createSession(
    domain: string | undefined,
    detailLevel: "concise" | "detailed" | "comprehensive",
    initialProblem: string,
  ): Promise<SeedSession> {
    const { data, error } = await getSupabaseClient()
      .from("seed_sessions")
      .insert({
        user_id: this.userId,
        domain,
        detail_level: detailLevel,
        initial_problem: initialProblem,
        status: "in_progress",
        conversation_turns: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SeedSession;
  }

  async completeSession(
    sessionId: string,
    conversationTurns: number,
    sessionDurationSeconds: number,
  ): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("seed_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        conversation_turns: conversationTurns,
        session_duration_seconds: sessionDurationSeconds,
      })
      .eq("id", sessionId);

    if (error) throw error;
  }

  async abandonSession(sessionId: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("seed_sessions")
      .update({ status: "abandoned" })
      .eq("id", sessionId);

    if (error) throw error;
  }

  // Conversation Tracking
  async logConversation(
    sessionId: string,
    messageOrder: number,
    role: "user" | "ai",
    content: string,
  ): Promise<void> {
    const { error } = await getSupabaseClient().from("seed_conversations").insert({
      session_id: sessionId,
      message_order: messageOrder,
      role,
      content,
    });

    if (error) throw error;
  }

  // Rating Collection
  async submitRating(
    sessionId: string,
    accuracyRating: number,
    codeQualityRating: number,
    requirementsQualityRating: number,
    usefulnessRating: number,
    comments?: string,
  ): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("seed_sessions")
      .update({
        accuracy_rating: accuracyRating,
        generated_code_quality: codeQualityRating,
        requirements_doc_quality: requirementsQualityRating,
        usefulness_rating: usefulnessRating,
        rating_comments: comments,
      })
      .eq("id", sessionId);

    if (error) throw error;
  }

  // Domain Analytics
  async getDomainAnalytics(domain?: string): Promise<DomainAnalytics[]> {
    let query = getSupabaseClient().from("domain_analytics").select("*");

    if (domain) {
      query = query.eq("domain", domain);
    }

    const { data, error } = await query.order("avg_accuracy_rating", {
      ascending: false,
    });

    if (error) throw error;

    return (data as any[]).map((item) => ({
      ...item,
      trending: calculateTrending(item.avg_accuracy_rating),
      recommended: item.avg_accuracy_rating >= 4.0,
    }));
  }

  async updateDomainAnalytics(domain: string): Promise<void> {
    const { data: sessions, error: sessionsError } = await getSupabaseClient()
      .from("seed_sessions")
      .select(
        "accuracy_rating, generated_code_quality, requirements_doc_quality, usefulness_rating, conversation_turns, session_duration_seconds, status",
      )
      .eq("domain", domain)
      .eq("status", "completed");

    if (sessionsError) throw sessionsError;

    if (!sessions || sessions.length === 0) return;

    const stats = {
      total_sessions: sessions.length,
      avg_accuracy_rating:
        sessions.reduce(
          (sum: number, s: any) => sum + (s.accuracy_rating || 0),
          0,
        ) / sessions.length,
      avg_code_quality:
        sessions.reduce(
          (sum: number, s: any) => sum + (s.generated_code_quality || 0),
          0,
        ) / sessions.length,
      avg_requirements_quality:
        sessions.reduce(
          (sum: number, s: any) => sum + (s.requirements_doc_quality || 0),
          0,
        ) / sessions.length,
      avg_usefulness:
        sessions.reduce(
          (sum: number, s: any) => sum + (s.usefulness_rating || 0),
          0,
        ) / sessions.length,
      avg_conversation_turns:
        sessions.reduce(
          (sum: number, s: any) => sum + (s.conversation_turns || 0),
          0,
        ) / sessions.length,
      avg_duration_seconds:
        sessions.reduce(
          (sum: number, s: any) => sum + (s.session_duration_seconds || 0),
          0,
        ) / sessions.length,
    };

    const { error } = await getSupabaseClient()
      .from("domain_analytics")
      .upsert({
        domain,
        ...stats,
        last_updated: new Date().toISOString(),
      })
      .eq("domain", domain);

    if (error) throw error;
  }

  // Question Effectiveness
  async logQuestionAsked(
    question: string,
    detailLevel: string,
    domain?: string,
  ): Promise<void> {
    const { error } = await getSupabaseClient().from("question_analytics").upsert({
      question_text: question,
      detail_level: detailLevel,
      domain,
      times_asked: 1,
    });

    if (error) throw error;
  }

  async getQuestionEffectiveness(
    domain?: string,
  ): Promise<QuestionAnalytics[]> {
    let query = getSupabaseClient().from("question_analytics").select("*");

    if (domain) {
      query = query.eq("domain", domain);
    }

    const { data, error } = await query.order("effectiveness_score", {
      ascending: false,
    });

    if (error) throw error;
    return data as any[];
  }

  // Feature Suggestion Tracking
  async logFeatureSuggestion(
    sessionId: string,
    feature: string,
    category: "core" | "recommended" | "advanced",
    accepted: boolean,
  ): Promise<void> {
    const { error } = await getSupabaseClient().from("feature_suggestions").insert({
      session_id: sessionId,
      feature,
      category,
      accepted_by_user: accepted,
      implemented: false,
    });

    if (error) throw error;
  }

  async getTopFeatureSuggestions(limit: number = 10): Promise<any[]> {
    const { data, error } = await getSupabaseClient()
      .from("feature_suggestions")
      .select("feature, category, accepted_by_user")
      .limit(limit)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const featureMap = new Map<string, any>();
    (data as any[]).forEach((item) => {
      if (!featureMap.has(item.feature)) {
        featureMap.set(item.feature, {
          feature: item.feature,
          category: item.category,
          accepted_count: 0,
          total_count: 0,
        });
      }
      const entry = featureMap.get(item.feature);
      entry.total_count++;
      if (item.accepted_by_user) entry.accepted_count++;
    });

    return Array.from(featureMap.values()).sort(
      (a, b) =>
        b.accepted_count / b.total_count - a.accepted_count / a.total_count,
    );
  }

  // Code Quality Tracking
  async logCodeQuality(
    sessionId: string,
    metrics: {
      cyclomaticComplexity: number;
      linesOfCode: number;
      testCoveragePercentage: number;
      accessibilityScore: number;
      performanceScore: number;
      securityIssuesCount: number;
      lintWarningsCount: number;
    },
  ): Promise<void> {
    const { error } = await getSupabaseClient().from("code_quality_metrics").insert({
      session_id: sessionId,
      cyclomatic_complexity: metrics.cyclomaticComplexity,
      lines_of_code: metrics.linesOfCode,
      test_coverage_percentage: metrics.testCoveragePercentage,
      accessibility_score: metrics.accessibilityScore,
      performance_score: metrics.performanceScore,
      security_issues_count: metrics.securityIssuesCount,
      lint_warnings_count: metrics.lintWarningsCount,
    });

    if (error) throw error;
  }

  // User Preferences
  async getUserPreferences(): Promise<any> {
    const { data, error } = await getSupabaseClient()
      .from("user_preferences")
      .select("*")
      .eq("user_id", this.userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  async updateUserPreferences(preferences: any): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("user_preferences")
      .upsert({
        user_id: this.userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", this.userId);

    if (error) throw error;
  }

  // Performance Tracking
  async logPhasePerformance(
    sessionId: string,
    phaseName: string,
    durationMs: number,
    tokensUsed: number,
    apiCallsMade: number,
    errorsEncountered: number,
  ): Promise<void> {
    const { error } = await getSupabaseClient().from("performance_analytics").insert({
      session_id: sessionId,
      phase_name: phaseName,
      phase_duration_ms: durationMs,
      tokens_used: tokensUsed,
      api_calls_made: apiCallsMade,
      errors_encountered: errorsEncountered,
    });

    if (error) throw error;
  }

  // Dashboarding/Reporting
  async getUserStats(): Promise<{
    totalSessions: number;
    completedSessions: number;
    avgAccuracy: number;
    favoriteDomainsCount: number;
    modulesGenerated: number;
  }> {
    const { data, error } = await getSupabaseClient()
      .from("user_preferences")
      .select("total_sessions, total_modules_generated")
      .eq("user_id", this.userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    const userPrefs = data as any;
    const { data: sessions, error: sessionsError } = await getSupabaseClient()
      .from("seed_sessions")
      .select("status, accuracy_rating")
      .eq("user_id", this.userId);

    if (sessionsError) throw sessionsError;

    const completed = (sessions as any[])?.filter(
      (s) => s.status === "completed",
    );
    const avgAccuracy =
      completed && completed.length > 0
        ? completed.reduce((sum, s) => sum + (s.accuracy_rating || 0), 0) /
          completed.length
        : 0;

    return {
      totalSessions: sessions?.length || 0,
      completedSessions: completed?.length || 0,
      avgAccuracy: parseFloat(avgAccuracy.toFixed(2)),
      favoriteDomainsCount: userPrefs?.preferred_domains?.length || 0,
      modulesGenerated: userPrefs?.total_modules_generated || 0,
    };
  }
}

function calculateTrending(currentRating: number): "up" | "down" | "stable" {
  if (currentRating >= 4.5) return "up";
  if (currentRating <= 3.0) return "down";
  return "stable";
}

let analyticsService: SeedAnalyticsService | null = null;

export function getSeedAnalyticsService(userId: string = "anonymous") {
  if (!analyticsService) {
    analyticsService = new SeedAnalyticsService(userId);
  }
  return analyticsService;
}
