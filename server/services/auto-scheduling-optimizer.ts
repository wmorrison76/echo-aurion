import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Auto scheduling optimizer requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface StaffAssignmentSuggestion {
  employeeId: string;
  employeeName: string;
  role: string;
  estimatedHours: number;
  skillMatch: number;
  availabilityScore: number;
  costEstimate: number;
  confidence: number;
}

export interface AutoScheduleSuggestion {
  id: string;
  productionTaskId: string;
  suggestedAssignments: StaffAssignmentSuggestion[];
  algorithmUsed: string;
  optimizationCriteria: string;
  solutionQualityScore: number;
  skillMatchPercentage: number;
  coveragePercentage: number;
  estimatedTotalCost: number;
  acceptanceStatus: string;
  createdAt: string;
}

interface AvailableStaff {
  employeeId: string;
  employeeName: string;
  totalAvailableHours: number;
  totalCommittedHours: number;
  availableHours: number;
  skillMatches: Map<string, { proficiency: string; score: number }>;
  hourlyRate: number;
  constraints: Array<{ type: string; value: string }>;
}

class AutoSchedulingOptimizer {
  /**
   * Generate automated scheduling suggestions for a production task
   */
  async generateScheduleSuggestions(
    orgId: string,
    productionTaskId: string,
    eventId: string,
    departmentId: string,
    estimatedHours: number,
    requiredSkills: string[],
    optimizationMode:
      | "minimize_cost"
      | "maximize_quality"
      | "balanced" = "balanced",
    maxSuggestionsPerRole: number = 3,
  ): Promise<AutoScheduleSuggestion> {
    try {
      logger.info("[AutoScheduling] Generating schedule suggestions", {
        productionTaskId,
        estimatedHours,
        requiredSkills,
      });

      // Get available staff for the required skills
      const availableStaff = await this.getAvailableStaffForTask(
        orgId,
        departmentId,
        requiredSkills,
        estimatedHours,
      );

      if (availableStaff.length === 0) {
        logger.warn("[AutoScheduling] No available staff found", {
          productionTaskId,
        });
        throw new Error(
          `No available staff with required skills for task ${productionTaskId}`,
        );
      }

      // Generate role assignments based on task requirements
      const roleRequirements = await this.getRoleRequirements(
        orgId,
        departmentId,
        estimatedHours,
      );

      // Optimize assignments based on criteria
      const suggestions = await this.optimizeAssignments(
        availableStaff,
        roleRequirements,
        estimatedHours,
        optimizationMode,
        maxSuggestionsPerRole,
      );

      // Calculate quality metrics
      const qualityMetrics = this.calculateSolutionQuality(
        suggestions,
        estimatedHours,
        availableStaff,
      );

      // Store suggestions in database
      const result = await sql`
        INSERT INTO auto_schedule_suggestions (
          id,
          org_id,
          production_task_id,
          suggested_by_system,
          suggested_assignments,
          algorithm_used,
          optimization_criteria,
          solution_quality_score,
          skill_match_percentage,
          coverage_percentage,
          estimated_total_cost,
          acceptance_status
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${productionTaskId}::UUID,
          'auto_scheduler_v1'::VARCHAR,
          ${JSON.stringify(suggestions)}::JSONB,
          'constraint_satisfaction'::VARCHAR,
          ${optimizationMode}::VARCHAR,
          ${qualityMetrics.solutionQualityScore}::NUMERIC,
          ${qualityMetrics.skillMatchPercentage}::NUMERIC,
          ${qualityMetrics.coveragePercentage}::NUMERIC,
          ${qualityMetrics.estimatedTotalCost}::NUMERIC,
          'pending'::VARCHAR
        )
        RETURNING id, created_at
      `;

      const suggestionId = result.rows[0].id;

      return {
        id: suggestionId,
        productionTaskId,
        suggestedAssignments: suggestions,
        algorithmUsed: "constraint_satisfaction",
        optimizationCriteria: optimizationMode,
        solutionQualityScore: qualityMetrics.solutionQualityScore,
        skillMatchPercentage: qualityMetrics.skillMatchPercentage,
        coveragePercentage: qualityMetrics.coveragePercentage,
        estimatedTotalCost: qualityMetrics.estimatedTotalCost,
        acceptanceStatus: "pending",
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      logger.error("[AutoScheduling] Error generating suggestions:", error);
      throw error;
    }
  }

  /**
   * Get available staff members with skill matching
   */
  private async getAvailableStaffForTask(
    orgId: string,
    departmentId: string,
    requiredSkills: string[],
    estimatedHours: number,
  ): Promise<AvailableStaff[]> {
    try {
      // Get staff in the department
      const staffResult = await sql`
        SELECT 
          u.id as employee_id,
          COALESCE(u.user_metadata ->> 'full_name', u.email) as employee_name,
          COUNT(DISTINCT ss.skill_code) as skill_count
        FROM auth.users u
        LEFT JOIN staff_skills ss ON u.id = ss.employee_id 
          AND ss.org_id = ${orgId}::UUID
          AND ss.skill_code = ANY(${requiredSkills}::VARCHAR[])
        WHERE u.id IN (
          SELECT employee_id FROM employees 
          WHERE org_id = ${orgId}::UUID 
            AND department_id = ${departmentId}::UUID
        )
        GROUP BY u.id, u.email, u.user_metadata
        ORDER BY skill_count DESC
      `;

      const availableStaff: AvailableStaff[] = [];

      for (const staffRow of staffResult.rows) {
        // Get committed hours for this staff member
        const hoursResult = await sql`
          SELECT 
            COALESCE(SUM(CASE WHEN sta.assignment_status IN ('confirmed', 'in_progress') 
                              THEN sta.estimated_hours ELSE 0 END), 0)::NUMERIC as committed_hours
          FROM staff_task_assignments sta
          WHERE sta.employee_id = ${staffRow.employee_id}::UUID
            AND sta.assignment_status NOT IN ('cancelled', 'completed')
        `;

        const committedHours = parseFloat(
          hoursResult.rows[0]?.committed_hours || "0",
        );
        const totalAvailableHours = 40; // Assume 40 hour work week

        // Get staff skills
        const skillsResult = await sql`
          SELECT skill_code, proficiency_level
          FROM staff_skills
          WHERE employee_id = ${staffRow.employee_id}::UUID
            AND org_id = ${orgId}::UUID
        `;

        const skillMatches = new Map<
          string,
          { proficiency: string; score: number }
        >();
        for (const skill of skillsResult.rows) {
          const score = this.getSkillScore(skill.proficiency_level);
          skillMatches.set(skill.skill_code, {
            proficiency: skill.proficiency_level,
            score,
          });
        }

        // Get labor rate
        const rateResult = await sql`
          SELECT base_hourly_rate
          FROM department_labor_rates
          WHERE department_id = ${departmentId}::UUID
            AND org_id = ${orgId}::UUID
            AND effective_from <= CURRENT_DATE
            AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
          LIMIT 1
        `;

        const hourlyRate = rateResult.rows[0]?.base_hourly_rate
          ? parseFloat(rateResult.rows[0].base_hourly_rate)
          : 30;

        // Get constraints
        const constraintsResult = await sql`
          SELECT constraint_type, constraint_value
          FROM staff_availability_constraints
          WHERE employee_id = ${staffRow.employee_id}::UUID
            AND org_id = ${orgId}::UUID
            AND is_active = TRUE
        `;

        const constraints = constraintsResult.rows.map((c) => ({
          type: c.constraint_type,
          value: c.constraint_value,
        }));

        // Check if staff has sufficient available hours
        const availableHours = totalAvailableHours - committedHours;
        if (availableHours >= estimatedHours * 0.5) {
          availableStaff.push({
            employeeId: staffRow.employee_id,
            employeeName: staffRow.employee_name,
            totalAvailableHours,
            totalCommittedHours: committedHours,
            availableHours,
            skillMatches,
            hourlyRate,
            constraints,
          });
        }
      }

      return availableStaff;
    } catch (error) {
      logger.error("[AutoScheduling] Error retrieving available staff:", error);
      return [];
    }
  }

  /**
   * Get skill score based on proficiency level
   */
  private getSkillScore(proficiency: string): number {
    const scores: Record<string, number> = {
      expert: 100,
      advanced: 85,
      intermediate: 70,
      beginner: 50,
    };
    return scores[proficiency] || 0;
  }

  /**
   * Get role requirements for a task in a department
   */
  private async getRoleRequirements(
    orgId: string,
    departmentId: string,
    estimatedHours: number,
  ): Promise<Array<{ role: string; skillCode: string; hoursNeeded: number }>> {
    try {
      // For now, use a simplified role breakdown
      // In production, this would be based on department-specific templates
      const roles: Array<{
        role: string;
        skillCode: string;
        hoursNeeded: number;
      }> = [];

      if (estimatedHours >= 20) {
        roles.push(
          {
            role: "lead_chef",
            skillCode: "lead_prep",
            hoursNeeded: estimatedHours * 0.3,
          },
          {
            role: "sous_chef",
            skillCode: "sous_prep",
            hoursNeeded: estimatedHours * 0.25,
          },
          {
            role: "prep_assistant",
            skillCode: "prep_assistant",
            hoursNeeded: estimatedHours * 0.45,
          },
        );
      } else {
        roles.push({
          role: "prep_assistant",
          skillCode: "prep_assistant",
          hoursNeeded: estimatedHours,
        });
      }

      return roles;
    } catch (error) {
      logger.error(
        "[AutoScheduling] Error retrieving role requirements:",
        error,
      );
      return [];
    }
  }

  /**
   * Optimize staff assignments based on criteria
   */
  private async optimizeAssignments(
    availableStaff: AvailableStaff[],
    roleRequirements: Array<{
      role: string;
      skillCode: string;
      hoursNeeded: number;
    }>,
    totalHours: number,
    optimizationMode: string,
    maxSuggestionsPerRole: number,
  ): Promise<StaffAssignmentSuggestion[]> {
    const suggestions: StaffAssignmentSuggestion[] = [];
    const assignedStaffIds = new Set<string>();
    let remainingHours = totalHours;

    for (const requirement of roleRequirements) {
      let hoursNeeded = requirement.hoursNeeded;
      let assignmentsForRole = 0;

      // Score staff based on criteria
      const scoredStaff = availableStaff
        .filter((s) => !assignedStaffIds.has(s.employeeId))
        .map((staff) => ({
          staff,
          score: this.calculateAssignmentScore(
            staff,
            requirement.skillCode,
            optimizationMode,
          ),
        }))
        .sort((a, b) => b.score - a.score);

      for (const { staff, score } of scoredStaff) {
        if (hoursNeeded <= 0 || assignmentsForRole >= maxSuggestionsPerRole) {
          break;
        }

        const hoursToAssign = Math.min(hoursNeeded, staff.availableHours);

        if (hoursToAssign > 0) {
          const skillMatch = staff.skillMatches.get(requirement.skillCode);

          suggestions.push({
            employeeId: staff.employeeId,
            employeeName: staff.employeeName,
            role: requirement.role,
            estimatedHours: hoursToAssign,
            skillMatch: skillMatch?.score || 0,
            availabilityScore:
              (staff.availableHours / staff.totalAvailableHours) * 100,
            costEstimate: hoursToAssign * staff.hourlyRate,
            confidence: score / 100,
          });

          hoursNeeded -= hoursToAssign;
          remainingHours -= hoursToAssign;
          assignedStaffIds.add(staff.employeeId);
          assignmentsForRole++;
        }
      }
    }

    return suggestions;
  }

  /**
   * Calculate assignment score based on optimization criteria
   */
  private calculateAssignmentScore(
    staff: AvailableStaff,
    requiredSkill: string,
    optimizationMode: string,
  ): number {
    const skillMatch = staff.skillMatches.get(requiredSkill)?.score || 0;
    const availabilityScore =
      (staff.availableHours / staff.totalAvailableHours) * 100;
    const costScore = Math.max(0, 100 - staff.hourlyRate); // Lower cost is better

    let finalScore = 0;

    if (optimizationMode === "minimize_cost") {
      // 50% cost, 30% skill, 20% availability
      finalScore = skillMatch * 0.3 + availabilityScore * 0.2 + costScore * 0.5;
    } else if (optimizationMode === "maximize_quality") {
      // 60% skill, 30% availability, 10% cost
      finalScore = skillMatch * 0.6 + availabilityScore * 0.3 + costScore * 0.1;
    } else {
      // Balanced: 40% skill, 40% availability, 20% cost
      finalScore = skillMatch * 0.4 + availabilityScore * 0.4 + costScore * 0.2;
    }

    return finalScore;
  }

  /**
   * Calculate solution quality metrics
   */
  private calculateSolutionQuality(
    suggestions: StaffAssignmentSuggestion[],
    estimatedHours: number,
    availableStaff: AvailableStaff[],
  ): {
    solutionQualityScore: number;
    skillMatchPercentage: number;
    coveragePercentage: number;
    estimatedTotalCost: number;
  } {
    const totalAssignedHours = suggestions.reduce(
      (sum, s) => sum + s.estimatedHours,
      0,
    );
    const avgSkillMatch =
      suggestions.length > 0
        ? suggestions.reduce((sum, s) => sum + s.skillMatch, 0) /
          suggestions.length
        : 0;
    const avgCoveragePercentage =
      suggestions.length > 0
        ? suggestions.reduce((sum, s) => sum + s.availabilityScore, 0) /
          suggestions.length
        : 0;
    const totalCost = suggestions.reduce((sum, s) => sum + s.costEstimate, 0);

    const coveragePercentage = (totalAssignedHours / estimatedHours) * 100;
    const qualityScore = Math.min(
      100,
      avgSkillMatch * 0.5 +
        coveragePercentage * 0.3 +
        avgCoveragePercentage * 0.2,
    );

    return {
      solutionQualityScore: Math.round(qualityScore * 100) / 100,
      skillMatchPercentage: Math.round(avgSkillMatch),
      coveragePercentage: Math.round(coveragePercentage),
      estimatedTotalCost: Math.round(totalCost * 100) / 100,
    };
  }

  /**
   * Accept or partially accept auto-scheduling suggestion
   */
  async acceptSuggestion(
    suggestionId: string,
    acceptedAssignments: Array<{
      employeeId: string;
      role: string;
      estimatedHours: number;
    }>,
    managerUserId: string,
    notes?: string,
  ): Promise<boolean> {
    try {
      logger.info("[AutoScheduling] Accepting suggestion", { suggestionId });

      const updateResult = await sql`
        UPDATE auto_schedule_suggestions
        SET acceptance_status = ${
          acceptedAssignments.length > 0 ? "accepted" : "rejected"
        }::VARCHAR,
            reviewed_by_user_id = ${managerUserId}::UUID,
            acceptance_notes = ${notes || null}::TEXT,
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = ${suggestionId}::UUID
        RETURNING production_task_id
      `;

      if (updateResult.rows.length === 0) {
        return false;
      }

      // Create actual staff assignments from accepted suggestions
      const productionTaskId = updateResult.rows[0].production_task_id;

      for (const assignment of acceptedAssignments) {
        await sql`
          INSERT INTO staff_task_assignments (
            id,
            org_id,
            production_task_id,
            employee_id,
            assigned_by_user_id,
            role_in_task,
            estimated_hours,
            assignment_status
          ) VALUES (
            gen_random_uuid(),
            (SELECT org_id FROM auto_schedule_suggestions WHERE id = ${suggestionId}::UUID),
            ${productionTaskId}::UUID,
            ${assignment.employeeId}::UUID,
            ${managerUserId}::UUID,
            ${assignment.role}::VARCHAR,
            ${assignment.estimatedHours}::NUMERIC,
            'pending'::VARCHAR
          )
          ON CONFLICT (production_task_id, employee_id) DO UPDATE
          SET estimated_hours = EXCLUDED.estimated_hours,
              role_in_task = EXCLUDED.role_in_task
        `;
      }

      return true;
    } catch (error) {
      logger.error("[AutoScheduling] Error accepting suggestion:", error);
      return false;
    }
  }

  /**
   * Reject auto-scheduling suggestion
   */
  async rejectSuggestion(
    suggestionId: string,
    managerUserId: string,
    notes?: string,
  ): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE auto_schedule_suggestions
        SET acceptance_status = 'rejected'::VARCHAR,
            reviewed_by_user_id = ${managerUserId}::UUID,
            acceptance_notes = ${notes || null}::TEXT,
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = ${suggestionId}::UUID
        RETURNING id
      `;

      return result.rows.length > 0;
    } catch (error) {
      logger.error("[AutoScheduling] Error rejecting suggestion:", error);
      return false;
    }
  }

  /**
   * Record feedback on auto-scheduling suggestion
   */
  async recordFeedback(
    orgId: string,
    suggestionId: string,
    productionTaskId: string,
    predictedCost: number,
    actualCost: number,
    managerSatisfaction: number,
    qualityNotes?: string,
  ): Promise<boolean> {
    try {
      const costVariance = ((actualCost - predictedCost) / predictedCost) * 100;

      await sql`
        INSERT INTO auto_schedule_feedback (
          id,
          org_id,
          suggestion_id,
          production_task_id,
          predicted_cost,
          actual_cost,
          cost_variance_percentage,
          manager_satisfaction,
          quality_notes
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${suggestionId}::UUID,
          ${productionTaskId}::UUID,
          ${predictedCost}::NUMERIC,
          ${actualCost}::NUMERIC,
          ${costVariance}::NUMERIC,
          ${managerSatisfaction}::NUMERIC,
          ${qualityNotes || null}::TEXT
        )
      `;

      return true;
    } catch (error) {
      logger.error("[AutoScheduling] Error recording feedback:", error);
      return false;
    }
  }

  /**
   * Get suggestion details
   */
  async getSuggestion(
    suggestionId: string,
  ): Promise<AutoScheduleSuggestion | null> {
    try {
      const result = await sql`
        SELECT id, production_task_id, suggested_assignments, algorithm_used,
               optimization_criteria, solution_quality_score, skill_match_percentage,
               coverage_percentage, estimated_total_cost, acceptance_status, created_at
        FROM auto_schedule_suggestions
        WHERE id = ${suggestionId}::UUID
      `;

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        productionTaskId: row.production_task_id,
        suggestedAssignments: row.suggested_assignments,
        algorithmUsed: row.algorithm_used,
        optimizationCriteria: row.optimization_criteria,
        solutionQualityScore: parseFloat(row.solution_quality_score),
        skillMatchPercentage: parseFloat(row.skill_match_percentage),
        coveragePercentage: parseFloat(row.coverage_percentage),
        estimatedTotalCost: parseFloat(row.estimated_total_cost),
        acceptanceStatus: row.acceptance_status,
        createdAt: row.created_at,
      };
    } catch (error) {
      logger.error("[AutoScheduling] Error retrieving suggestion:", error);
      return null;
    }
  }
}

export const autoSchedulingOptimizer = new AutoSchedulingOptimizer();
