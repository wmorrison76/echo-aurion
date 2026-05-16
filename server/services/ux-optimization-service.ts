/**
 * UX Optimization Service
 * Provides click reduction analysis, navigation optimization, and onboarding improvements
 * 
 * Features:
 * - Click reduction analysis
 * - Navigation optimization
 * - Onboarding optimization
 * - User behavior tracking
 * - Optimization recommendations
 */

import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * UX Optimization Types
 */
export interface ClickAnalysis {
  taskId: string;
  taskName: string;
  currentClicks: number;
  targetClicks: number;
  reductionPercent: number;
  userCount: number;
  averageTime: number; // seconds
  optimizationOpportunity: "high" | "medium" | "low";
}

export interface NavigationAnalysis {
  route: string;
  routeName: string;
  accessCount: number;
  averageDepth: number; // How many clicks to reach
  bounceRate: number; // Users who leave immediately
  optimizationRecommendations: string[];
}

export interface OnboardingMetrics {
  userId: string;
  orgId: string;
  completedSteps: number;
  totalSteps: number;
  completionPercent: number;
  timeToComplete: number; // minutes
  dropoffPoints: string[];
  completedAt?: string;
}

export interface UXOptimizationRecommendation {
  category: "click_reduction" | "navigation" | "onboarding" | "performance";
  priority: "high" | "medium" | "low";
  issue: string;
  recommendation: string;
  expectedImpact: string;
  implementationEffort: "low" | "medium" | "high";
}

/**
 * UX Optimization Service
 */
export class UXOptimizationService {
  /**
   * Analyze click reduction opportunities
   */
  async analyzeClickReduction(orgId: string): Promise<ClickAnalysis[]> {
    try {
      // Fetch user task analytics
      const { data, error } = await supabase
        .from("user_task_analytics")
        .select("*")
        .eq("org_id", orgId)
        .order("access_count", { ascending: false })
        .limit(100);

      if (error) throw error;

      const analyses: ClickAnalysis[] = [];

      // Define target clicks for common tasks
      const targetClicks: Record<string, number> = {
        "get_recommendation": 2,
        "view_details": 2,
        "check_inventory": 2,
        "create_purchase_order": 3,
        "transfer_inventory": 3,
        "update_quantity": 1,
        "add_to_order": 1,
        "view_pairing": 1,
        "generate_recipe": 2,
        "view_analytics": 2,
      };

      for (const task of data || []) {
        const currentClicks = task.average_clicks || 5;
        const target = targetClicks[task.task_name] || Math.max(1, Math.floor(currentClicks * 0.5));
        const reductionPercent = ((currentClicks - target) / currentClicks) * 100;
        const opportunity =
          reductionPercent > 50 ? "high" : reductionPercent > 25 ? "medium" : "low";

        analyses.push({
          taskId: task.id,
          taskName: task.task_name,
          currentClicks,
          targetClicks: target,
          reductionPercent,
          userCount: task.user_count || 0,
          averageTime: task.average_time || 0,
          optimizationOpportunity: opportunity,
        });
      }

      logger.info("[UXOptimization] Click reduction analysis complete", {
        orgId,
        tasksAnalyzed: analyses.length,
      });

      return analyses;
    } catch (error) {
      logger.error("[UXOptimization] Click reduction analysis failed", { error, orgId });
      return [];
    }
  }

  /**
   * Analyze navigation patterns
   */
  async analyzeNavigation(orgId: string): Promise<NavigationAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from("navigation_analytics")
        .select("*")
        .eq("org_id", orgId)
        .order("access_count", { ascending: false })
        .limit(100);

      if (error) throw error;

      const analyses: NavigationAnalysis[] = [];

      for (const route of data || []) {
        const recommendations: string[] = [];

        // High bounce rate recommendation
        if (route.bounce_rate > 0.5) {
          recommendations.push("High bounce rate detected. Improve route content or accessibility.");
        }

        // Deep navigation recommendation
        if (route.average_depth > 3) {
          recommendations.push("Route requires too many clicks. Add direct navigation or quick links.");
        }

        // Low access recommendation
        if (route.access_count < 10) {
          recommendations.push("Route rarely accessed. Consider removing or consolidating with similar routes.");
        }

        analyses.push({
          route: route.route_path,
          routeName: route.route_name,
          accessCount: route.access_count || 0,
          averageDepth: route.average_depth || 0,
          bounceRate: route.bounce_rate || 0,
          optimizationRecommendations: recommendations,
        });
      }

      logger.info("[UXOptimization] Navigation analysis complete", {
        orgId,
        routesAnalyzed: analyses.length,
      });

      return analyses;
    } catch (error) {
      logger.error("[UXOptimization] Navigation analysis failed", { error, orgId });
      return [];
    }
  }

  /**
   * Track onboarding progress
   */
  async trackOnboardingProgress(
    userId: string,
    orgId: string,
    completedStep: string,
  ): Promise<OnboardingMetrics> {
    try {
      // Get onboarding configuration
      const totalSteps = 10; // Default onboarding steps
      const steps = [
        "welcome",
        "profile_setup",
        "organization_setup",
        "team_invite",
        "first_task",
        "feature_tour",
        "settings",
        "integrations",
        "tutorial",
        "completion",
      ];

      // Get current progress
      const { data: progress, error } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("org_id", orgId)
        .single();

      const completedSteps = progress
        ? new Set([...(progress.completed_steps || []), completedStep])
        : new Set([completedStep]);

      const completionPercent = (completedSteps.size / totalSteps) * 100;
      const dropoffPoints = steps.filter((step) => !completedSteps.has(step));

      // Calculate time to complete
      const startTime = progress?.started_at
        ? new Date(progress.started_at)
        : new Date();
      const timeToComplete = (Date.now() - startTime.getTime()) / (1000 * 60); // minutes

      const metrics: OnboardingMetrics = {
        userId,
        orgId,
        completedSteps: completedSteps.size,
        totalSteps,
        completionPercent,
        timeToComplete,
        dropoffPoints,
        completedAt:
          completedSteps.size === totalSteps ? new Date().toISOString() : undefined,
      };

      // Update progress
      await supabase
        .from("onboarding_progress")
        .upsert(
          {
            user_id: userId,
            org_id: orgId,
            completed_steps: Array.from(completedSteps),
            completion_percent: completionPercent,
            time_to_complete: timeToComplete,
            completed_at: metrics.completedAt || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,org_id" },
        );

      logger.info("[UXOptimization] Onboarding progress tracked", {
        userId,
        orgId,
        completionPercent: completionPercent.toFixed(1),
      });

      return metrics;
    } catch (error) {
      logger.error("[UXOptimization] Onboarding tracking failed", { error, userId, orgId });
      throw error;
    }
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(orgId: string): Promise<UXOptimizationRecommendation[]> {
    try {
      const recommendations: UXOptimizationRecommendation[] = [];

      // Click reduction recommendations
      const clickAnalysis = await this.analyzeClickReduction(orgId);
      for (const analysis of clickAnalysis) {
        if (analysis.optimizationOpportunity === "high") {
          recommendations.push({
            category: "click_reduction",
            priority: "high",
            issue: `${analysis.taskName} requires ${analysis.currentClicks} clicks (target: ${analysis.targetClicks})`,
            recommendation: `Implement quick actions, keyboard shortcuts, or direct navigation for ${analysis.taskName}`,
            expectedImpact: `Reduce clicks by ${analysis.reductionPercent.toFixed(0)}%, saving ~${(analysis.averageTime * analysis.reductionPercent / 100).toFixed(1)}s per task for ${analysis.userCount} users`,
            implementationEffort: "medium",
          });
        }
      }

      // Navigation recommendations
      const navAnalysis = await this.analyzeNavigation(orgId);
      for (const analysis of navAnalysis) {
        if (analysis.optimizationRecommendations.length > 0) {
          recommendations.push({
            category: "navigation",
            priority: analysis.bounceRate > 0.5 || analysis.averageDepth > 3 ? "high" : "medium",
            issue: `${analysis.routeName} has ${analysis.bounceRate > 0.5 ? "high bounce rate" : "deep navigation"} (${analysis.averageDepth} clicks)`,
            recommendation: analysis.optimizationRecommendations.join(". "),
            expectedImpact: `Improve ${analysis.routeName} accessibility and user engagement`,
            implementationEffort: analysis.averageDepth > 3 ? "low" : "medium",
          });
        }
      }

      // Onboarding recommendations
      const { data: onboardingData } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("org_id", orgId)
        .lt("completion_percent", 100);

      if (onboardingData && onboardingData.length > 0) {
        const averageCompletion = onboardingData.reduce(
          (sum, p) => sum + (p.completion_percent || 0),
          0,
        ) / onboardingData.length;

        if (averageCompletion < 70) {
          recommendations.push({
            category: "onboarding",
            priority: "high",
            issue: `Onboarding completion rate is ${averageCompletion.toFixed(0)}% (target: 80%+)`,
            recommendation:
              "Simplify onboarding steps, add progress indicators, provide skip options, and improve step clarity",
            expectedImpact: `Increase onboarding completion by ${(80 - averageCompletion).toFixed(0)}%, improving user activation`,
            implementationEffort: "medium",
          });
        }
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recommendations.sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
      );

      logger.info("[UXOptimization] Recommendations generated", {
        orgId,
        recommendationCount: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      logger.error("[UXOptimization] Recommendations generation failed", { error, orgId });
      return [];
    }
  }

  /**
   * Record user task completion
   */
  async recordTaskCompletion(
    userId: string,
    orgId: string,
    taskName: string,
    clicks: number,
    duration: number, // seconds
  ): Promise<void> {
    try {
      await supabase.from("user_task_analytics").insert({
        user_id: userId,
        org_id: orgId,
        task_name: taskName,
        clicks: clicks,
        duration: duration,
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn("[UXOptimization] Failed to record task completion", { error, userId, taskName });
      // Don't throw - analytics logging failure shouldn't block user actions
    }
  }

  /**
   * Record navigation event
   */
  async recordNavigation(
    userId: string,
    orgId: string,
    route: string,
    routeName: string,
    depth: number,
    bounced: boolean,
  ): Promise<void> {
    try {
      await supabase.from("navigation_analytics").insert({
        user_id: userId,
        org_id: orgId,
        route_path: route,
        route_name: routeName,
        navigation_depth: depth,
        bounced: bounced,
        accessed_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.warn("[UXOptimization] Failed to record navigation", { error, userId, route });
      // Don't throw - analytics logging failure shouldn't block navigation
    }
  }
}

// Export singleton instance
export const uxOptimizationService = new UXOptimizationService();
