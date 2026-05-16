import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Advanced labor management requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface StaffSkill {
  id: string;
  employeeId: string;
  skillCode: string;
  skillName: string;
  proficiencyLevel: string;
  certified: boolean;
  yearsExperience: number;
}

export interface AvailabilityConstraint {
  id: string;
  employeeId: string;
  constraintType: string;
  constraintValue: string;
  notes?: string;
  isActive: boolean;
}

export interface LaborRate {
  id: string;
  departmentId: string;
  positionCode: string;
  positionName: string;
  baseHourlyRate: number;
  overtimeMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
}

class AdvancedLaborManagementService {
  /**
   * Add a skill to an employee
   */
  async addEmployeeSkill(
    orgId: string,
    employeeId: string,
    skillCode: string,
    skillName: string,
    proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert",
    yearsExperience: number,
    certified: boolean = false,
    certifiedDate?: Date,
  ): Promise<StaffSkill> {
    try {
      logger.info("[LaborMgmt] Adding employee skill", {
        employeeId,
        skillCode,
        proficiencyLevel,
      });

      const result = await sql`
        INSERT INTO staff_skills (
          id,
          org_id,
          employee_id,
          skill_code,
          skill_name,
          proficiency_level,
          years_experience,
          certified,
          certified_date,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${employeeId}::UUID,
          ${skillCode},
          ${skillName},
          ${proficiencyLevel},
          ${yearsExperience}::NUMERIC,
          ${certified},
          ${certifiedDate ? certifiedDate.toISOString() : null}::DATE,
          NOW()
        )
        ON CONFLICT (org_id, employee_id, skill_code) DO UPDATE
        SET
          skill_name = ${skillName},
          proficiency_level = ${proficiencyLevel},
          years_experience = ${yearsExperience}::NUMERIC,
          certified = ${certified},
          certified_date = ${certifiedDate ? certifiedDate.toISOString() : null}::DATE,
          updated_at = NOW()
        RETURNING *
      `;

      const row = result.rows[0];

      return {
        id: row.id,
        employeeId: row.employee_id,
        skillCode: row.skill_code,
        skillName: row.skill_name,
        proficiencyLevel: row.proficiency_level,
        certified: row.certified,
        yearsExperience: parseFloat(row.years_experience),
      };
    } catch (error) {
      logger.error("[LaborMgmt] Error adding employee skill:", error);
      throw error;
    }
  }

  /**
   * Get all skills for an employee
   */
  async getEmployeeSkills(employeeId: string): Promise<StaffSkill[]> {
    try {
      const result = await sql`
        SELECT *
        FROM staff_skills
        WHERE employee_id = ${employeeId}::UUID
        ORDER BY proficiency_level DESC, years_experience DESC
      `;

      return result.rows.map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id,
        skillCode: row.skill_code,
        skillName: row.skill_name,
        proficiencyLevel: row.proficiency_level,
        certified: row.certified,
        yearsExperience: parseFloat(row.years_experience),
      }));
    } catch (error) {
      logger.error("[LaborMgmt] Error fetching employee skills:", error);
      throw error;
    }
  }

  /**
   * Add availability constraint
   */
  async addAvailabilityConstraint(
    orgId: string,
    employeeId: string,
    constraintType: string,
    constraintValue: string,
    notes?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AvailabilityConstraint> {
    try {
      logger.info("[LaborMgmt] Adding availability constraint", {
        employeeId,
        constraintType,
      });

      const result = await sql`
        INSERT INTO staff_availability_constraints (
          id,
          org_id,
          employee_id,
          constraint_type,
          constraint_value,
          notes,
          is_active,
          start_date,
          end_date,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${employeeId}::UUID,
          ${constraintType},
          ${constraintValue},
          ${notes || null},
          true,
          ${startDate ? startDate.toISOString() : null}::DATE,
          ${endDate ? endDate.toISOString() : null}::DATE,
          NOW()
        )
        RETURNING *
      `;

      const row = result.rows[0];

      return {
        id: row.id,
        employeeId: row.employee_id,
        constraintType: row.constraint_type,
        constraintValue: row.constraint_value,
        notes: row.notes,
        isActive: row.is_active,
      };
    } catch (error) {
      logger.error("[LaborMgmt] Error adding constraint:", error);
      throw error;
    }
  }

  /**
   * Get availability constraints for an employee
   */
  async getEmployeeConstraints(
    employeeId: string,
  ): Promise<AvailabilityConstraint[]> {
    try {
      const result = await sql`
        SELECT *
        FROM staff_availability_constraints
        WHERE employee_id = ${employeeId}::UUID
          AND is_active = TRUE
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      `;

      return result.rows.map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id,
        constraintType: row.constraint_type,
        constraintValue: row.constraint_value,
        notes: row.notes,
        isActive: row.is_active,
      }));
    } catch (error) {
      logger.error("[LaborMgmt] Error fetching constraints:", error);
      throw error;
    }
  }

  /**
   * Check if employee is available for a specific time
   */
  async isEmployeeAvailable(
    employeeId: string,
    date: Date,
    startTime?: Date,
    endTime?: Date,
  ): Promise<boolean> {
    try {
      const constraints = await this.getEmployeeConstraints(employeeId);

      for (const constraint of constraints) {
        switch (constraint.constraintType) {
          case "unavailable_date":
            if (
              constraint.constraintValue === date.toISOString().split("T")[0]
            ) {
              return false;
            }
            break;

          case "max_hours_per_day":
            const maxHours = parseInt(constraint.constraintValue, 10);
            // Would need to check scheduled hours for this day
            break;

          case "prefers_no_nights":
            if (startTime && startTime.getHours() >= 22) {
              return false;
            }
            break;
        }
      }

      return true;
    } catch (error) {
      logger.error("[LaborMgmt] Error checking availability:", error);
      return false;
    }
  }

  /**
   * Set custom labor rate for a position
   */
  async setLaborRate(
    orgId: string,
    departmentId: string,
    positionCode: string,
    positionName: string,
    baseHourlyRate: number,
    overtimeMultiplier: number = 1.5,
    weekendMultiplier: number = 1.0,
    holidayMultiplier: number = 2.0,
  ): Promise<LaborRate> {
    try {
      logger.info("[LaborMgmt] Setting labor rate", {
        departmentId,
        positionCode,
        baseHourlyRate,
      });

      const result = await sql`
        INSERT INTO department_labor_rates (
          id,
          org_id,
          department_id,
          position_code,
          position_name,
          base_hourly_rate,
          overtime_multiplier,
          weekend_multiplier,
          holiday_multiplier,
          effective_from,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${departmentId}::UUID,
          ${positionCode},
          ${positionName},
          ${baseHourlyRate}::NUMERIC,
          ${overtimeMultiplier}::NUMERIC,
          ${weekendMultiplier}::NUMERIC,
          ${holidayMultiplier}::NUMERIC,
          CURRENT_DATE,
          NOW()
        )
        ON CONFLICT (org_id, department_id, position_code, effective_from) DO UPDATE
        SET
          position_name = ${positionName},
          base_hourly_rate = ${baseHourlyRate}::NUMERIC,
          overtime_multiplier = ${overtimeMultiplier}::NUMERIC,
          weekend_multiplier = ${weekendMultiplier}::NUMERIC,
          holiday_multiplier = ${holidayMultiplier}::NUMERIC,
          updated_at = NOW()
        RETURNING *
      `;

      const row = result.rows[0];

      return {
        id: row.id,
        departmentId: row.department_id,
        positionCode: row.position_code,
        positionName: row.position_name,
        baseHourlyRate: parseFloat(row.base_hourly_rate),
        overtimeMultiplier: parseFloat(row.overtime_multiplier),
        weekendMultiplier: parseFloat(row.weekend_multiplier),
        holidayMultiplier: parseFloat(row.holiday_multiplier),
      };
    } catch (error) {
      logger.error("[LaborMgmt] Error setting labor rate:", error);
      throw error;
    }
  }

  /**
   * Get effective labor rate for a position and date
   */
  async getEffectiveRate(
    departmentId: string,
    positionCode: string,
    date: Date = new Date(),
    isOvertime: boolean = false,
    isWeekend: boolean = false,
    isHoliday: boolean = false,
  ): Promise<number> {
    try {
      const result = await sql`
        SELECT base_hourly_rate, overtime_multiplier, weekend_multiplier, holiday_multiplier
        FROM department_labor_rates
        WHERE department_id = ${departmentId}::UUID
          AND position_code = ${positionCode}
          AND effective_from <= ${date.toISOString()}::DATE
          AND (effective_to IS NULL OR effective_to >= ${date.toISOString()}::DATE)
        ORDER BY effective_from DESC
        LIMIT 1
      `;

      if (result.rows.length === 0) {
        // Return default rate
        return 20.0;
      }

      const row = result.rows[0];
      let rate = parseFloat(row.base_hourly_rate);

      if (isHoliday) {
        rate *= parseFloat(row.holiday_multiplier);
      } else if (isOvertime) {
        rate *= parseFloat(row.overtime_multiplier);
      } else if (isWeekend) {
        rate *= parseFloat(row.weekend_multiplier);
      }

      return rate;
    } catch (error) {
      logger.error("[LaborMgmt] Error getting effective rate:", error);
      return 20.0; // Default fallback
    }
  }

  /**
   * Get all labor rates for a department
   */
  async getDepartmentRates(departmentId: string): Promise<LaborRate[]> {
    try {
      const result = await sql`
        SELECT *
        FROM department_labor_rates
        WHERE department_id = ${departmentId}::UUID
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY position_name
      `;

      return result.rows.map((row: any) => ({
        id: row.id,
        departmentId: row.department_id,
        positionCode: row.position_code,
        positionName: row.position_name,
        baseHourlyRate: parseFloat(row.base_hourly_rate),
        overtimeMultiplier: parseFloat(row.overtime_multiplier),
        weekendMultiplier: parseFloat(row.weekend_multiplier),
        holidayMultiplier: parseFloat(row.holiday_multiplier),
      }));
    } catch (error) {
      logger.error("[LaborMgmt] Error fetching department rates:", error);
      throw error;
    }
  }

  /**
   * Find skilled staff for a task
   */
  async findSkilledStaff(
    orgId: string,
    departmentId: string,
    requiredSkills: string[],
    minProficiency: string = "intermediate",
  ): Promise<any[]> {
    try {
      const result = await sql`
        SELECT DISTINCT
          ss.employee_id,
          COALESCE(u.user_metadata ->> 'full_name', u.email) as name,
          COUNT(DISTINCT ss.skill_code) as skills_matched,
          STRING_AGG(ss.skill_code, ', ') as matched_skills,
          AVG(
            CASE 
              WHEN ss.proficiency_level = 'expert' THEN 4
              WHEN ss.proficiency_level = 'advanced' THEN 3
              WHEN ss.proficiency_level = 'intermediate' THEN 2
              WHEN ss.proficiency_level = 'beginner' THEN 1
              ELSE 0
            END
          )::NUMERIC as avg_proficiency
        FROM staff_skills ss
        LEFT JOIN auth.users u ON u.id = ss.employee_id
        WHERE ss.org_id = ${orgId}::UUID
          AND ss.skill_code = ANY(${requiredSkills}::TEXT[])
          AND ss.proficiency_level IN ('expert', 'advanced', 'intermediate')
        GROUP BY ss.employee_id, u.id
        ORDER BY skills_matched DESC, avg_proficiency DESC
      `;

      return result.rows.map((row: any) => ({
        employeeId: row.employee_id,
        name: row.name,
        skillsMatched: parseInt(row.skills_matched, 10),
        matchedSkills: row.matched_skills.split(", "),
        avgProficiency: parseFloat(row.avg_proficiency),
      }));
    } catch (error) {
      logger.error("[LaborMgmt] Error finding skilled staff:", error);
      throw error;
    }
  }
}

export const advancedLaborManagement = new AdvancedLaborManagementService();
