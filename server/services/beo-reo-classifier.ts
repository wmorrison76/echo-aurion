import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "BEO/REO classifier requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface OutletOperatingHours {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  opensAt: string | null; // HH:MM:SS format
  closesAt: string | null;
  lunchOpen?: string;
  lunchClose?: string;
  dinnerOpen?: string;
  dinnerClose?: string;
  isClosed: boolean;
}

export interface BEOREOClassification {
  eventId: string;
  outletId: string;
  classification: "BEO" | "REO";
  classificationReason: string;
  ruleId: string | null;
  isOverridden: boolean;
  overrideReason?: string;
  guestCount?: number;
}

export interface ClassificationRule {
  id: string;
  outletId: string;
  ruleName: string;
  ruleType: string;
  conditionJson: Record<string, any>;
  resultsInClassification: "BEO" | "REO";
  priority: number;
  isActive: boolean;
  canOverride: boolean;
}

class BEOREOClassifier {
  /**
   * Classify an event as BEO or REO based on outlet hours and rules
   */
  async classifyEvent(
    eventId: string,
    outletId: string,
    orgId: string,
    eventStart: Date,
    eventEnd: Date,
    guestCount?: number,
  ): Promise<BEOREOClassification> {
    try {
      // Check if outlet is open during event times
      const isOpenAtStart = await this.isOutletOpenAt(outletId, eventStart);
      const isOpenAtEnd = await this.isOutletOpenAt(outletId, eventEnd);

      let classification: "BEO" | "REO";
      let reason = "";
      let ruleId: string | null = null;

      // Check explicit rules first
      const applicableRule = await this.getApplicableRule(
        outletId,
        eventStart,
        eventEnd,
        guestCount,
      );

      if (applicableRule) {
        classification = applicableRule.resultsInClassification;
        reason = applicableRule.ruleType;
        ruleId = applicableRule.id;
      } else if (!isOpenAtStart || !isOpenAtEnd) {
        // Event is outside operating hours = BEO
        classification = "BEO";
        reason = "outside_operating_hours";
      } else {
        // Event is within operating hours = REO
        classification = "REO";
        reason = "within_operating_hours";
      }

      // Store classification
      const result = await sql`
        INSERT INTO event_beo_reo_classification (
          id,
          event_id,
          outlet_id,
          org_id,
          classification,
          classification_reason,
          rule_id,
          is_overridden,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${eventId},
          ${outletId},
          ${orgId},
          ${classification},
          ${reason},
          ${ruleId},
          FALSE,
          NOW(),
          NOW()
        )
        RETURNING id;
      `;

      logger.info("[BEOREOClassifier] Event classified", {
        eventId,
        outletId,
        classification,
        reason,
        ruleId,
      });

      return {
        eventId,
        outletId,
        classification,
        classificationReason: reason,
        ruleId,
        isOverridden: false,
        guestCount,
      };
    } catch (error) {
      logger.error("[BEOREOClassifier] Error classifying event:", error);
      throw error;
    }
  }

  /**
   * Check if outlet is open at a given time
   */
  async isOutletOpenAt(outletId: string, dateTime: Date): Promise<boolean> {
    try {
      const result = await sql`
        SELECT is_outlet_open_at(${outletId}::UUID, ${dateTime.toISOString()}::TIMESTAMP WITH TIME ZONE) as is_open;
      `;

      return result.rows[0]?.is_open === true;
    } catch (error) {
      logger.error("[BEOREOClassifier] Error checking outlet hours:", error);
      throw error;
    }
  }

  /**
   * Get applicable classification rule for event
   */
  private async getApplicableRule(
    outletId: string,
    eventStart: Date,
    eventEnd: Date,
    guestCount?: number,
  ): Promise<ClassificationRule | null> {
    try {
      const result = await sql`
        SELECT
          id,
          outlet_id,
          rule_name,
          rule_type,
          condition_json,
          results_in_classification,
          priority,
          is_active,
          can_override
        FROM beo_reo_classification_rules
        WHERE outlet_id = ${outletId}
          AND is_active = TRUE
        ORDER BY priority DESC, created_at DESC
        LIMIT 1;
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        outletId: row.outlet_id,
        ruleName: row.rule_name,
        ruleType: row.rule_type,
        conditionJson: row.condition_json,
        resultsInClassification: row.results_in_classification,
        priority: row.priority,
        isActive: row.is_active,
        canOverride: row.can_override,
      };
    } catch (error) {
      logger.error("[BEOREOClassifier] Error getting applicable rule:", error);
      return null;
    }
  }

  /**
   * Get classification for event
   */
  async getEventClassification(
    eventId: string,
  ): Promise<BEOREOClassification | null> {
    try {
      const result = await sql`
        SELECT
          event_id,
          outlet_id,
          classification,
          classification_reason,
          rule_id,
          is_overridden,
          override_reason,
          guest_count
        FROM event_beo_reo_classification
        WHERE event_id = ${eventId}
        LIMIT 1;
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        eventId: row.event_id,
        outletId: row.outlet_id,
        classification: row.classification,
        classificationReason: row.classification_reason,
        ruleId: row.rule_id,
        isOverridden: row.is_overridden,
        overrideReason: row.override_reason,
        guestCount: row.guest_count,
      };
    } catch (error) {
      logger.error(
        "[BEOREOClassifier] Error getting event classification:",
        error,
      );
      return null;
    }
  }

  /**
   * Override event classification
   */
  async overrideClassification(
    eventId: string,
    newClassification: "BEO" | "REO",
    userId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE event_beo_reo_classification
        SET classification = ${newClassification},
            is_overridden = TRUE,
            override_reason = ${reason},
            overridden_by = ${userId},
            overridden_at = NOW(),
            updated_at = NOW()
        WHERE event_id = ${eventId}
        RETURNING event_id;
      `;

      if (result.rows.length === 0) {
        return false;
      }

      logger.info("[BEOREOClassifier] Classification overridden", {
        eventId,
        newClassification,
        reason,
      });

      return true;
    } catch (error) {
      logger.error(
        "[BEOREOClassifier] Error overriding classification:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get operating hours for outlet
   */
  async getOutletOperatingHours(
    outletId: string,
  ): Promise<OutletOperatingHours[]> {
    try {
      const result = await sql`
        SELECT
          day_of_week,
          opens_at,
          closes_at,
          lunch_open,
          lunch_close,
          dinner_open,
          dinner_close,
          is_closed
        FROM outlet_operating_hours
        WHERE outlet_id = ${outletId}
        ORDER BY day_of_week ASC;
      `;

      return result.rows.map((row) => ({
        dayOfWeek: row.day_of_week,
        opensAt: row.opens_at,
        closesAt: row.closes_at,
        lunchOpen: row.lunch_open,
        lunchClose: row.lunch_close,
        dinnerOpen: row.dinner_open,
        dinnerClose: row.dinner_close,
        isClosed: row.is_closed,
      }));
    } catch (error) {
      logger.error("[BEOREOClassifier] Error getting outlet hours:", error);
      throw error;
    }
  }

  /**
   * Set outlet operating hours
   */
  async setOutletOperatingHours(
    outletId: string,
    orgId: string,
    dayOfWeek: number,
    opensAt: string | null,
    closesAt: string | null,
  ): Promise<boolean> {
    try {
      await sql`
        INSERT INTO outlet_operating_hours (
          id,
          outlet_id,
          org_id,
          day_of_week,
          opens_at,
          closes_at,
          is_closed,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${outletId},
          ${orgId},
          ${dayOfWeek},
          ${opensAt ? opensAt + "::TIME" : null},
          ${closesAt ? closesAt + "::TIME" : null},
          ${opensAt === null && closesAt === null},
          NOW(),
          NOW()
        )
        ON CONFLICT (outlet_id, day_of_week) DO UPDATE SET
          opens_at = EXCLUDED.opens_at,
          closes_at = EXCLUDED.closes_at,
          is_closed = EXCLUDED.is_closed,
          updated_at = NOW();
      `;

      logger.info("[BEOREOClassifier] Operating hours set", {
        outletId,
        dayOfWeek,
        opensAt,
        closesAt,
      });

      return true;
    } catch (error) {
      logger.error("[BEOREOClassifier] Error setting operating hours:", error);
      throw error;
    }
  }

  /**
   * Create BEO/REO classification rule
   */
  async createRule(
    outletId: string,
    orgId: string,
    ruleName: string,
    ruleType: string,
    conditionJson: Record<string, any>,
    resultsInClassification: "BEO" | "REO",
    priority: number = 100,
    createdBy: string,
  ): Promise<string> {
    try {
      const result = await sql`
        INSERT INTO beo_reo_classification_rules (
          id,
          outlet_id,
          org_id,
          rule_name,
          rule_type,
          condition_json,
          results_in_classification,
          priority,
          is_active,
          created_by,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${outletId},
          ${orgId},
          ${ruleName},
          ${ruleType},
          ${JSON.stringify(conditionJson)}::JSONB,
          ${resultsInClassification},
          ${priority},
          TRUE,
          ${createdBy},
          NOW(),
          NOW()
        )
        RETURNING id;
      `;

      const ruleId = result.rows[0].id;

      logger.info("[BEOREOClassifier] Rule created", {
        ruleId,
        outletId,
        ruleType,
        resultsInClassification,
      });

      return ruleId;
    } catch (error) {
      logger.error("[BEOREOClassifier] Error creating rule:", error);
      throw error;
    }
  }

  /**
   * Get all departments
   */
  async getAllDepartments(orgId: string): Promise<any[]> {
    try {
      const result = await sql`
        SELECT
          id,
          org_id,
          name,
          slug,
          description,
          department_type,
          manager_user_id,
          email,
          phone,
          is_active
        FROM departments
        WHERE org_id = ${orgId}
        ORDER BY name ASC;
      `;

      return result.rows;
    } catch (error) {
      logger.error("[BEOREOClassifier] Error getting departments:", error);
      throw error;
    }
  }

  /**
   * Create department
   */
  async createDepartment(
    orgId: string,
    name: string,
    slug: string,
    departmentType: string,
    createdBy: string,
  ): Promise<string> {
    try {
      const result = await sql`
        INSERT INTO departments (
          id,
          org_id,
          name,
          slug,
          department_type,
          created_by,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${orgId},
          ${name},
          ${slug},
          ${departmentType},
          ${createdBy},
          NOW(),
          NOW()
        )
        RETURNING id;
      `;

      const deptId = result.rows[0].id;

      logger.info("[BEOREOClassifier] Department created", {
        deptId,
        name,
        slug,
      });

      return deptId;
    } catch (error) {
      logger.error("[BEOREOClassifier] Error creating department:", error);
      throw error;
    }
  }

  /**
   * Assign department to outlet
   */
  async assignDepartmentToOutlet(
    outletId: string,
    departmentId: string,
    orgId: string,
    assignmentType: "primary" | "support" | "required" | "optional",
    appliesTo?: "BEO" | "REO",
  ): Promise<string> {
    try {
      const result = await sql`
        INSERT INTO outlet_department_assignments (
          id,
          outlet_id,
          department_id,
          org_id,
          assignment_type,
          applies_to_beo_only,
          applies_to_reo_only,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${outletId},
          ${departmentId},
          ${orgId},
          ${assignmentType},
          ${appliesTo === "BEO"},
          ${appliesTo === "REO"},
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id;
      `;

      const assignmentId = result.rows[0].id;

      logger.info("[BEOREOClassifier] Department assigned to outlet", {
        assignmentId,
        outletId,
        departmentId,
        assignmentType,
      });

      return assignmentId;
    } catch (error) {
      logger.error("[BEOREOClassifier] Error assigning department:", error);
      throw error;
    }
  }

  /**
   * Get departments for outlet and event type
   */
  async getOutletDepartments(
    outletId: string,
    classification?: "BEO" | "REO",
  ): Promise<any[]> {
    try {
      let query = `
        SELECT
          oda.id,
          oda.outlet_id,
          d.id as department_id,
          d.name,
          d.slug,
          d.department_type,
          d.email,
          oda.assignment_type,
          oda.applies_to_beo_only,
          oda.applies_to_reo_only
        FROM outlet_department_assignments oda
        JOIN departments d ON oda.department_id = d.id
        WHERE oda.outlet_id = $1
          AND oda.is_active = TRUE
      `;

      const params: any[] = [outletId];

      if (classification) {
        if (classification === "BEO") {
          query += ` AND (oda.applies_to_beo_only = TRUE OR (oda.applies_to_beo_only = FALSE AND oda.applies_to_reo_only = FALSE))`;
        } else {
          query += ` AND (oda.applies_to_reo_only = TRUE OR (oda.applies_to_beo_only = FALSE AND oda.applies_to_reo_only = FALSE))`;
        }
      }

      query += ` ORDER BY oda.assignment_type, d.name;`;

      const result = await sql.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(
        "[BEOREOClassifier] Error getting outlet departments:",
        error,
      );
      throw error;
    }
  }
}

export const beoReoClassifier = new BEOREOClassifier();
