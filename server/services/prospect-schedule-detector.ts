import { getSupabaseClient } from "../lib/supabase";
import { logger } from "../lib/logger";

export interface ScheduleConflict {
  type: "staffing" | "pto" | "room" | "production";
  severity: "low" | "medium" | "high";
  affectedEmployees?: string[];
  affectedDepartments?: string[];
  description: string;
  recommendation: string;
}

export interface ProspectScheduleConflictReport {
  prospectId: string;
  eventDate: string;
  conflicts: ScheduleConflict[];
  overallRiskLevel: "low" | "medium" | "high";
  summary: string;
}

export class ProspectScheduleDetector {
  /**
   * Detect scheduling conflicts for a prospect (prep days + event day)
   */
  static async detectSchedulingConflicts(
    prospectId: string,
    orgId: string,
  ): Promise<ProspectScheduleConflictReport> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      // Fetch prospect details
      const { data: prospect, error: prospectError } = await supabase
        .from("prospects")
        .select("*")
        .eq("id", prospectId)
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .single();

      if (prospectError || !prospect) {
        throw new Error(`Prospect not found: ${prospectId}`);
      }

      const eventDate = new Date(prospect.event_date);
      const conflicts: ScheduleConflict[] = [];

      // Default prep period: 3 days before event
      const prepStartDate = new Date(eventDate);
      prepStartDate.setDate(prepStartDate.getDate() - 3);

      // Check for overlapping events and room conflicts
      await this.checkEventConflicts(
        supabase,
        prospect,
        prepStartDate,
        eventDate,
        conflicts,
        orgId,
      );

      // Check for PTO conflicts
      await this.checkPTOConflicts(
        supabase,
        prospect,
        prepStartDate,
        eventDate,
        conflicts,
        orgId,
      );

      // Check for room availability
      await this.checkRoomAvailability(
        supabase,
        prospect,
        prepStartDate,
        eventDate,
        conflicts,
        orgId,
      );

      // Check production timeline workload
      await this.checkProductionWorkload(
        supabase,
        prospect,
        prepStartDate,
        eventDate,
        conflicts,
        orgId,
      );

      // Calculate overall risk level
      const highSeverityCount = conflicts.filter(
        (c) => c.severity === "high",
      ).length;
      const mediumSeverityCount = conflicts.filter(
        (c) => c.severity === "medium",
      ).length;

      let overallRiskLevel: "low" | "medium" | "high" = "low";
      if (highSeverityCount > 0) {
        overallRiskLevel = "high";
      } else if (mediumSeverityCount > 0) {
        overallRiskLevel = "medium";
      }

      // Generate summary
      const summary =
        conflicts.length === 0
          ? "No conflicts detected. Event is properly staffed and scheduled."
          : `${conflicts.length} conflict(s) detected. ${highSeverityCount > 0 ? `${highSeverityCount} critical` : ""} ${mediumSeverityCount > 0 ? `${mediumSeverityCount} warnings` : ""}.`;

      const report: ProspectScheduleConflictReport = {
        prospectId,
        eventDate: prospect.event_date,
        conflicts,
        overallRiskLevel,
        summary,
      };

      // Store conflict report in database
      await supabase
        .from("prospects")
        .update({ scheduling_conflicts: report })
        .eq("id", prospectId);

      logger.info("[ScheduleDetector] Conflict detection complete", {
        prospectId,
        conflictCount: conflicts.length,
        riskLevel: overallRiskLevel,
      });

      return report;
    } catch (error) {
      logger.error("[ScheduleDetector] Detection failed", {
        error: error instanceof Error ? error.message : String(error),
        prospectId,
      });
      throw error;
    }
  }

  /**
   * Check for overlapping events
   */
  private static async checkEventConflicts(
    supabase: any,
    prospect: any,
    prepStartDate: Date,
    eventDate: Date,
    conflicts: ScheduleConflict[],
    orgId: string,
  ) {
    try {
      const { data: overlappingEvents, error } = await supabase
        .from("calendar_events")
        .select("id, title, start_time, end_time")
        .eq("org_id", orgId)
        .gte("start_time", prepStartDate.toISOString())
        .lte(
          "end_time",
          new Date(eventDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        )
        .eq("outlet_id", prospect.outlet_id)
        .neq("status", "cancelled");

      if (error) {
        logger.warn("[ScheduleDetector] Event conflict check failed", {
          error: error.message,
        });
        return;
      }

      if ((overlappingEvents || []).length > 0) {
        conflicts.push({
          type: "staffing",
          severity: overlappingEvents.length > 2 ? "high" : "medium",
          description: `${overlappingEvents.length} event(s) scheduled during prep and event days`,
          recommendation: `Review staffing capacity. Consider additional staff or rescheduling prep tasks.`,
        });
      }
    } catch (error) {
      logger.warn("[ScheduleDetector] Event conflict detection error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check for PTO requests that overlap with event prep/execution
   */
  private static async checkPTOConflicts(
    supabase: any,
    prospect: any,
    prepStartDate: Date,
    eventDate: Date,
    conflicts: ScheduleConflict[],
    orgId: string,
  ) {
    try {
      const eventEnd = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);

      const { data: ptoRequests, error } = await supabase
        .from("pto_requests")
        .select(
          "id, employee_id, employees(name, department), start_date, end_date, status",
        )
        .eq("org_id", orgId)
        .gte("start_date", prepStartDate.toISOString())
        .lte("end_date", eventEnd.toISOString())
        .in("status", ["approved", "pending"]);

      if (error) {
        logger.warn("[ScheduleDetector] PTO check failed", {
          error: error.message,
        });
        return;
      }

      const ptoList = ptoRequests || [];
      if (ptoList.length > 0) {
        const affectedEmployees = ptoList.map(
          (pto: any) => pto.employees?.name || "Unknown",
        );
        const severity =
          ptoList.filter((p: any) => p.status === "approved").length > 0
            ? "high"
            : "medium";

        conflicts.push({
          type: "pto",
          severity,
          affectedEmployees,
          description: `${ptoList.length} PTO request(s) overlap with event prep/execution`,
          recommendation: `Review approved PTOs and ensure coverage. Consider denying pending PTOs or arranging replacement staff.`,
        });
      }
    } catch (error) {
      logger.warn("[ScheduleDetector] PTO detection error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check room availability
   */
  private static async checkRoomAvailability(
    supabase: any,
    prospect: any,
    prepStartDate: Date,
    eventDate: Date,
    conflicts: ScheduleConflict[],
    orgId: string,
  ) {
    try {
      const eventEnd = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);

      // Find suitable rooms by capacity
      const { data: availableRooms, error: roomError } = await supabase
        .from("rooms")
        .select("id, name, capacity")
        .eq("org_id", orgId)
        .eq("outlet_id", prospect.outlet_id)
        .gte("capacity", prospect.guest_count || 50)
        .eq("active", true);

      if (roomError) {
        logger.warn("[ScheduleDetector] Room availability check failed", {
          error: roomError.message,
        });
        return;
      }

      if (!availableRooms || availableRooms.length === 0) {
        conflicts.push({
          type: "room",
          severity: "high",
          description: `No rooms available with capacity for ${prospect.guest_count} guests`,
          recommendation: `Increase room capacity, consider splitting event, or choose alternative venue.`,
        });
        return;
      }

      // Check if preferred rooms are booked
      const { data: bookings } = await supabase
        .from("room_bookings")
        .select("room_id, booked_from, booked_until")
        .in(
          "room_id",
          availableRooms.map((r: any) => r.id),
        )
        .gte("booked_from", prepStartDate.toISOString())
        .lte("booked_until", eventEnd.toISOString())
        .eq("booking_type", "event");

      const bookedRoomIds = new Set(
        (bookings || []).map((b: any) => b.room_id),
      );
      const freeRooms = availableRooms.filter(
        (r: any) => !bookedRoomIds.has(r.id),
      );

      if (freeRooms.length === 0) {
        conflicts.push({
          type: "room",
          severity: "high",
          description: `All suitable rooms are booked for the event date`,
          recommendation: `Contact event coordinator to free up a room or reschedule event.`,
        });
      } else if (freeRooms.length < availableRooms.length) {
        conflicts.push({
          type: "room",
          severity: "medium",
          description: `Limited room availability. Only ${freeRooms.length} of ${availableRooms.length} suitable rooms available.`,
          recommendation: `Book room early to secure preferred space.`,
        });
      }
    } catch (error) {
      logger.warn("[ScheduleDetector] Room detection error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check production workload feasibility
   */
  private static async checkProductionWorkload(
    supabase: any,
    prospect: any,
    prepStartDate: Date,
    eventDate: Date,
    conflicts: ScheduleConflict[],
    orgId: string,
  ) {
    try {
      const eventEnd = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);

      // Estimate labor requirements based on event type and guest count
      const estLaborHours = this.estimateProductionHours(
        prospect.event_type_code,
        prospect.guest_count || 50,
      );

      // Fetch existing scheduled work for BOH (Kitchen) department
      const { data: scheduledWork, error } = await supabase
        .from("maestro_production_tasks")
        .select("id, estimated_hours, department_id")
        .eq("org_id", orgId)
        .gte("scheduled_date", prepStartDate.toISOString())
        .lte("scheduled_date", eventEnd.toISOString())
        .eq("department_code", "BOH"); // Back of house

      if (error) {
        logger.warn("[ScheduleDetector] Production workload check failed", {
          error: error.message,
        });
        return;
      }

      const totalScheduledHours = (scheduledWork || []).reduce(
        (sum: number, task: any) => sum + (task.estimated_hours || 0),
        0,
      );

      // Assume 8 hours per day per 1 FTE, prep days available = 3
      const availableCapacity = 3 * 8; // 24 hours over 3 prep days

      if (estLaborHours > availableCapacity) {
        const deficit = estLaborHours - availableCapacity;
        conflicts.push({
          type: "production",
          severity: deficit > availableCapacity * 0.5 ? "high" : "medium",
          description: `Production workload exceeds capacity by ${Math.round(deficit)} hours`,
          recommendation: `Increase staffing, start prep earlier, or simplify menu to reduce prep time.`,
        });
      } else if (totalScheduledHours + estLaborHours > availableCapacity) {
        conflicts.push({
          type: "production",
          severity: "medium",
          description: `Production schedule is tight with existing commitments`,
          recommendation: `Consider hiring temporary staff or extending prep period.`,
        });
      }
    } catch (error) {
      logger.warn("[ScheduleDetector] Production detection error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Estimate production hours needed based on event type and guest count
   */
  private static estimateProductionHours(
    eventTypeCode: string,
    guestCount: number,
  ): number {
    const baseHours: Record<string, number> = {
      WED: 40, // Wedding - 40 hours base
      COR: 30, // Corporate - 30 hours base
      BAN: 25, // Banquet - 25 hours base
      SEM: 15, // Seminar - 15 hours base
      OTH: 20, // Other - 20 hours base
    };

    const baseHour = baseHours[eventTypeCode] || 20;
    const perGuestMultiplier = 0.25; // 15 minutes per guest

    return baseHour + guestCount * perGuestMultiplier;
  }

  /**
   * Validate PTO request against pending prospects
   */
  static async validatePTOAgainstProspects(
    employeeId: string,
    orgId: string,
    ptoStartDate: Date,
    ptoEndDate: Date,
  ): Promise<{
    hasConflicts: boolean;
    conflicts: ScheduleConflict[];
    affectedProspects: Array<{ id: string; name: string; eventDate: string }>;
  }> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      // Fetch employee details including department
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("id, name, department")
        .eq("id", employeeId)
        .eq("org_id", orgId)
        .single();

      if (empError || !employee) {
        throw new Error(`Employee not found: ${employeeId}`);
      }

      // Find prospects with event dates during PTO
      const { data: prospects, error: prospectError } = await supabase
        .from("prospects")
        .select("id, name, event_date, event_type_code, guest_count, status")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .in("status", ["lead", "negotiation", "won"])
        .gte("event_date", ptoStartDate.toISOString())
        .lte("event_date", ptoEndDate.toISOString());

      if (prospectError) {
        logger.warn("[ScheduleDetector] PTO validation error", {
          error: prospectError.message,
        });
        return {
          hasConflicts: false,
          conflicts: [],
          affectedProspects: [],
        };
      }

      const affectedProspects = (prospects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        eventDate: p.event_date,
      }));

      const conflicts: ScheduleConflict[] = [];
      if (affectedProspects.length > 0) {
        // Estimate impact on each prospect's production
        const estimatedWorkHours = affectedProspects.reduce(
          (sum: number, p: any) => {
            const prospect = prospects.find((pr: any) => pr.id === p.id);
            return (
              sum +
              this.estimateProductionHours(
                prospect.event_type_code,
                prospect.guest_count || 50,
              )
            );
          },
          0,
        );

        conflicts.push({
          type: "pto",
          severity:
            affectedProspects.length > 2 || estimatedWorkHours > 30
              ? "high"
              : "medium",
          affectedEmployees: [employee.name],
          description: `PTO overlaps with ${affectedProspects.length} prospect event(s) requiring ~${Math.round(estimatedWorkHours)} hours of work`,
          recommendation: `Coordinate with department head to ensure coverage or consider rescheduling PTO.`,
        });
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        affectedProspects,
      };
    } catch (error) {
      logger.error("[ScheduleDetector] PTO validation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
