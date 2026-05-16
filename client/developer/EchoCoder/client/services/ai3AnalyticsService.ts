import { createClient } from "@supabase/supabase-js";

interface AI3Session {
  id: string;
  user_id: string;
  project_id?: string;
  session_type: string;
  domain?: string;
  detail_level: "concise" | "detailed" | "comprehensive";
  initial_problem: string;
  status: "in_progress" | "completed" | "abandoned";
  created_at: string;
  completed_at?: string;
  session_duration_seconds?: number;
  conversation_turns: number;
}

interface SessionRating {
  id: string;
  session_id: string;
  accuracy_rating?: number;
  code_quality_rating?: number;
  requirements_clarity_rating?: number;
  usefulness_rating?: number;
  comments?: string;
  created_at: string;
}

interface DomainStat {
  domain: string;
  total_sessions: number;
  completed_sessions: number;
  avg_accuracy_rating?: number;
  avg_code_quality?: number;
  avg_requirements_clarity?: number;
  completion_rate: number;
  trending: "up" | "down" | "stable";
  is_recommended: boolean;
}

interface QuestionAnalytic {
  id: string;
  question_text: string;
  domain?: string;
  detail_level?: string;
  times_asked: number;
  times_skipped: number;
  times_helpful: number;
  effectiveness_score: number;
}

interface AnalyticsDashboardData {
  totalSessions: number;
  completedSessions: number;
  averageAccuracyRating: number;
  averageCodeQuality: number;
  topDomains: DomainStat[];
  recentSessions: AI3Session[];
  topQuestions: QuestionAnalytic[];
  performanceMetrics: {
    avgSessionDuration: number;
    avgConversationTurns: number;
    completionRate: number;
  };
}

class AI3AnalyticsService {
  private supabase: ReturnType<typeof createClient> | null = null;
  private userId: string | null = null;

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase credentials not found");
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Get comprehensive analytics dashboard data
   */
  async getDashboardData(userId: string): Promise<AnalyticsDashboardData> {
    if (!this.supabase) throw new Error("Supabase not initialized");

    try {
      // Get all sessions for user
      const { data: sessions, error: sessionsError } = await this.supabase
        .from("ai3_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionIds = sessions?.map((s: AI3Session) => s.id) || [];

      // Get ratings
      const { data: ratings } = await this.supabase
        .from("ai3_session_ratings")
        .select("*")
        .in("session_id", sessionIds.length > 0 ? sessionIds : ["none"]);

      // Get domain stats
      const { data: domainStats } = await this.supabase
        .from("ai3_domain_analytics")
        .select("*")
        .order("total_sessions", { ascending: false })
        .limit(5);

      // Get top questions
      const { data: topQuestions } = await this.supabase
        .from("ai3_question_analytics")
        .select("*")
        .order("effectiveness_score", { ascending: false })
        .limit(10);

      // Calculate metrics
      const completedSessions = sessions?.filter((s) => s.status === "completed") || [];
      const totalDuration = sessions?.reduce((sum: number, s: AI3Session) => {
        return sum + (s.session_duration_seconds || 0);
      }, 0) || 0;

      const avgAccuracy =
        (ratings || [])
          .filter((r) => r.accuracy_rating)
          .reduce((sum: number, r: SessionRating) => sum + (r.accuracy_rating || 0), 0) /
          ((ratings || []).filter((r) => r.accuracy_rating).length || 1) || 0;

      const avgCodeQuality =
        (ratings || [])
          .filter((r) => r.code_quality_rating)
          .reduce((sum: number, r: SessionRating) => sum + (r.code_quality_rating || 0), 0) /
          ((ratings || []).filter((r) => r.code_quality_rating).length || 1) || 0;

      const avgTurns =
        (sessions || []).reduce((sum: number, s: AI3Session) => sum + s.conversation_turns, 0) /
          (sessions?.length || 1) || 0;

      return {
        totalSessions: sessions?.length || 0,
        completedSessions: completedSessions.length,
        averageAccuracyRating: Math.round(avgAccuracy * 100) / 100,
        averageCodeQuality: Math.round(avgCodeQuality * 100) / 100,
        topDomains: (domainStats || []).slice(0, 5) as DomainStat[],
        recentSessions: (sessions || []).slice(0, 10) as AI3Session[],
        topQuestions: (topQuestions || []).slice(0, 10) as QuestionAnalytic[],
        performanceMetrics: {
          avgSessionDuration: Math.round(totalDuration / (sessions?.length || 1)),
          avgConversationTurns: Math.round(avgTurns * 100) / 100,
          completionRate:
            Math.round(
              ((completedSessions.length / (sessions?.length || 1)) * 100) || 0,
            ) / 100,
        },
      };
    } catch (error) {
      console.error("Failed to get dashboard data:", error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific domain
   */
  async getDomainAnalytics(domain: string): Promise<DomainStat> {
    if (!this.supabase) throw new Error("Supabase not initialized");

    try {
      const { data, error } = await this.supabase
        .from("ai3_domain_analytics")
        .select("*")
        .eq("domain", domain)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return (
        data || {
          domain,
          total_sessions: 0,
          completed_sessions: 0,
          avg_accuracy_rating: 0,
          completion_rate: 0,
          trending: "stable",
          is_recommended: false,
        }
      );
    } catch (error) {
      console.error("Failed to get domain analytics:", error);
      throw error;
    }
  }

  /**
   * Submit session rating
   */
  async submitSessionRating(
    sessionId: string,
    rating: {
      accuracy?: number;
      codeQuality?: number;
      requirementsClarity?: number;
      usefulness?: number;
      comments?: string;
    },
  ): Promise<SessionRating> {
    if (!this.supabase) throw new Error("Supabase not initialized");

    try {
      // Check if rating exists
      const { data: existing } = await this.supabase
        .from("ai3_session_ratings")
        .select("id")
        .eq("session_id", sessionId)
        .single();

      let result;
      if (existing) {
        // Update
        result = await this.supabase
          .from("ai3_session_ratings")
          .update({
            accuracy_rating: rating.accuracy || null,
            code_quality_rating: rating.codeQuality || null,
            requirements_clarity_rating: rating.requirementsClarity || null,
            usefulness_rating: rating.usefulness || null,
            comments: rating.comments || null,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", sessionId)
          .select()
          .single();
      } else {
        // Create
        result = await this.supabase
          .from("ai3_session_ratings")
          .insert({
            session_id: sessionId,
            accuracy_rating: rating.accuracy || null,
            code_quality_rating: rating.codeQuality || null,
            requirements_clarity_rating: rating.requirementsClarity || null,
            usefulness_rating: rating.usefulness || null,
            comments: rating.comments || null,
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      return result.data;
    } catch (error) {
      console.error("Failed to submit rating:", error);
      throw error;
    }
  }

  /**
   * Get session by ID with all related data
   */
  async getSessionWithDetails(
    sessionId: string,
  ): Promise<AI3Session & { ratings?: SessionRating[]; artifacts?: any[] }> {
    if (!this.supabase) throw new Error("Supabase not initialized");

    try {
      const { data: session, error: sessionError } = await this.supabase
        .from("ai3_sessions")
        .select(
          `
          *,
          ratings:ai3_session_ratings(*),
          artifacts:ai3_artifacts(*),
          metrics:ai3_code_metrics(*)
        `,
        )
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;

      return session;
    } catch (error) {
      console.error("Failed to get session details:", error);
      throw error;
    }
  }

  /**
   * Get question effectiveness for a domain
   */
  async getQuestionEffectiveness(domain: string): Promise<QuestionAnalytic[]> {
    if (!this.supabase) throw new Error("Supabase not initialized");

    try {
      const { data, error } = await this.supabase
        .from("ai3_question_analytics")
        .select("*")
        .eq("domain", domain)
        .order("effectiveness_score", { ascending: false })
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Failed to get question effectiveness:", error);
      throw error;
    }
  }

  /**
   * Get performance metrics for a time period
   */
  async getPerformanceMetrics(
    userId: string,
    days: number = 30,
  ): Promise<{
    totalSessions: number;
    completedSessions: number;
    avgDuration: number;
    avgTurns: number;
    avgAccuracy: number;
    trend: "improving" | "stable" | "declining";
  }> {
    if (!this.supabase) throw new Error("Supabase not initialized");

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: sessions } = await this.supabase
        .from("ai3_sessions")
        .select(
          `
          *,
          ratings:ai3_session_ratings(accuracy_rating)
        `,
        )
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (!sessions || sessions.length === 0) {
        return {
          totalSessions: 0,
          completedSessions: 0,
          avgDuration: 0,
          avgTurns: 0,
          avgAccuracy: 0,
          trend: "stable",
        };
      }

      const completed = sessions.filter((s) => s.status === "completed").length;
      const totalDuration = sessions.reduce((sum: number, s) => sum + (s.session_duration_seconds || 0), 0);
      const avgTurns =
        sessions.reduce((sum: number, s) => sum + s.conversation_turns, 0) / sessions.length;

      const ratings = sessions
        .flatMap((s: any) => s.ratings || [])
        .filter((r: any) => r.accuracy_rating);
      const avgAccuracy =
        ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.accuracy_rating, 0) / ratings.length
          : 0;

      // Calculate trend (simple: compare first half to second half)
      const midpoint = Math.floor(sessions.length / 2);
      const firstHalf = sessions.slice(0, midpoint);
      const secondHalf = sessions.slice(midpoint);

      const firstHalfAvg =
        firstHalf.length > 0
          ? firstHalf.reduce((sum: number, s) => sum + (s.conversation_turns || 0), 0) /
            firstHalf.length
          : 0;
      const secondHalfAvg =
        secondHalf.length > 0
          ? secondHalf.reduce((sum: number, s) => sum + (s.conversation_turns || 0), 0) /
            secondHalf.length
          : 0;

      let trend: "improving" | "stable" | "declining" = "stable";
      if (secondHalfAvg > firstHalfAvg * 1.1) {
        trend = "improving";
      } else if (secondHalfAvg < firstHalfAvg * 0.9) {
        trend = "declining";
      }

      return {
        totalSessions: sessions.length,
        completedSessions: completed,
        avgDuration: Math.round(totalDuration / sessions.length),
        avgTurns: Math.round(avgTurns * 100) / 100,
        avgAccuracy: Math.round(avgAccuracy * 100) / 100,
        trend,
      };
    } catch (error) {
      console.error("Failed to get performance metrics:", error);
      throw error;
    }
  }

  /**
   * Export analytics as JSON
   */
  async exportAnalytics(userId: string): Promise<string> {
    try {
      const dashboardData = await this.getDashboardData(userId);

      return JSON.stringify(dashboardData, null, 2);
    } catch (error) {
      console.error("Failed to export analytics:", error);
      throw error;
    }
  }
}

// Singleton pattern
let analyticsService: AI3AnalyticsService | null = null;

export function getAI3AnalyticsService(): AI3AnalyticsService {
  if (!analyticsService) {
    analyticsService = new AI3AnalyticsService();
  }
  return analyticsService;
}

export type {
  AI3Session,
  SessionRating,
  DomainStat,
  QuestionAnalytic,
  AnalyticsDashboardData,
};
