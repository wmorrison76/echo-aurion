import { getSupabaseClient } from "../lib/supabase";
import { logger } from "../lib/logger";

export interface ProductionTimeline {
  id: string;
  prospectId: string;
  eventDate: string;
  prepStartDate: string;
  prepDays: ProductionDay[];
  eventDay: EventDayProduction;
  estimatedTotalHours: number;
  departmentBreakdown: DepartmentWorkload[];
  riskFlags: string[];
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  lastUpdated: string;
}

export interface ProductionDay {
  date: string;
  dayNumber: number; // 1=first prep day, 2=second prep day, 3=day before event
  tasks: ProductionTask[];
  estimatedHoursNeeded: number;
}

export interface ProductionTask {
  id: string;
  title: string;
  description: string;
  department: string;
  estimatedMinutes: number;
  assignedEmployees?: string[];
  status: "pending" | "in_progress" | "completed";
  completionTarget: string; // ISO date string
}

export interface EventDayProduction {
  date: string;
  setupTime: number; // minutes
  executionTime: number; // minutes
  teardownTime: number; // minutes
  departments: Array<{
    code: string;
    name: string;
    requiredStaff: number;
    estimatedMinutes: number;
  }>;
}

export interface DepartmentWorkload {
  code: string;
  name: string;
  totalMinutes: number;
  totalHours: number;
  daysInvolved: number;
  riskLevel: "low" | "medium" | "high";
}

export class ProspectProductionBridge {
  /**
   * Generate production timeline from prospect
   */
  static async generateProductionTimelineFromProspect(
    prospectId: string,
    orgId: string,
  ): Promise<ProductionTimeline> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Database connection unavailable");
      }

      // Fetch prospect
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
      const prepStartDate = new Date(eventDate);
      prepStartDate.setDate(prepStartDate.getDate() - 3); // 3 days prep

      // Estimate workload based on event type and guest count
      const workloadEstimate = this.estimateWorkload(
        prospect.event_type_code,
        prospect.guest_count || 50,
      );

      // Generate prep day timelines
      const prepDays = this.generatePrepDayTimeline(
        prepStartDate,
        eventDate,
        prospect,
        workloadEstimate,
      );

      // Generate event day breakdown
      const eventDay = this.generateEventDayBreakdown(
        prospect,
        workloadEstimate,
      );

      // Calculate department breakdowns
      const departmentBreakdown = this.calculateDepartmentBreakdown(
        prepDays,
        eventDay,
      );

      // Identify risk flags
      const riskFlags = this.identifyProductionRisks(
        departmentBreakdown,
        workloadEstimate,
      );

      const totalHours = departmentBreakdown.reduce(
        (sum, dept) => sum + dept.totalHours,
        0,
      );

      const timeline: ProductionTimeline = {
        id: `timeline-${Date.now()}`,
        prospectId,
        eventDate: prospect.event_date,
        prepStartDate: prepStartDate.toISOString().split("T")[0],
        prepDays,
        eventDay,
        estimatedTotalHours: totalHours,
        departmentBreakdown,
        riskFlags,
        status: "pending",
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      // Store timeline in Supabase
      const { data: storedTimeline, error: storeError } = await supabase
        .from("production_timelines")
        .insert([
          {
            prospect_id: prospectId,
            org_id: orgId,
            data: timeline,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (storeError) {
        logger.warn("[ProductionBridge] Failed to store timeline", {
          error: storeError.message,
        });
        // Continue without persistence for now
      }

      // Create individual maestro production tasks for each department
      await this.createProductionTasks(
        supabase,
        prospectId,
        orgId,
        prospect,
        prepDays,
        eventDay,
      );

      logger.info("[ProductionBridge] Production timeline generated", {
        prospectId,
        totalHours: Math.round(totalHours),
        departmentsInvolved: departmentBreakdown.length,
      });

      return timeline;
    } catch (error) {
      logger.error("[ProductionBridge] Generation failed", {
        error: error instanceof Error ? error.message : String(error),
        prospectId,
      });
      throw error;
    }
  }

  /**
   * Generate prep day timeline with task distribution
   */
  private static generatePrepDayTimeline(
    prepStartDate: Date,
    eventDate: Date,
    prospect: any,
    workloadEstimate: any,
  ): ProductionDay[] {
    const prepDays: ProductionDay[] = [];

    // 3 prep days before event
    for (let i = 0; i < 3; i++) {
      const dayDate = new Date(prepStartDate);
      dayDate.setDate(dayDate.getDate() + i);

      const tasks = this.generateDayTasks(
        dayDate,
        i,
        prospect,
        workloadEstimate,
      );
      const totalMinutes = tasks.reduce(
        (sum, t) => sum + t.estimatedMinutes,
        0,
      );

      prepDays.push({
        date: dayDate.toISOString().split("T")[0],
        dayNumber: i + 1,
        tasks,
        estimatedHoursNeeded: Math.ceil(totalMinutes / 60),
      });
    }

    return prepDays;
  }

  /**
   * Generate specific tasks for a prep day
   */
  private static generateDayTasks(
    dayDate: Date,
    dayIndex: number,
    prospect: any,
    workloadEstimate: any,
  ): ProductionTask[] {
    const tasks: ProductionTask[] = [];
    const eventTypeCode = prospect.event_type_code;

    // Scale workload across prep days: Day 1 (30%), Day 2 (40%), Day 3 (30%)
    const dayDistribution = [0.3, 0.4, 0.3];
    const dayWorkload =
      workloadEstimate.totalMinutes * dayDistribution[dayIndex];

    const eventDate = new Date(prospect.event_date);
    const daysUntilEvent = Math.ceil(
      (eventDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Generate tasks based on event type and day
    if (dayIndex === 0) {
      // Day 1: Planning, ingredient gathering, initial prep
      tasks.push({
        id: `task-${Date.now()}-1`,
        title: "Gather ingredients and supplies",
        description: `Procure all ingredients and supplies for ${prospect.name} event`,
        department: "Purchasing",
        estimatedMinutes: Math.round(dayWorkload * 0.3),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });

      tasks.push({
        id: `task-${Date.now()}-2`,
        title: "Initial prep work",
        description: `Begin food preparation and mise en place`,
        department: "BOH",
        estimatedMinutes: Math.round(dayWorkload * 0.4),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });

      tasks.push({
        id: `task-${Date.now()}-3`,
        title: "Setup and logistics planning",
        description: `Plan room setup and logistics for event`,
        department: "Engineering",
        estimatedMinutes: Math.round(dayWorkload * 0.3),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });
    } else if (dayIndex === 1) {
      // Day 2: Heavy prep work
      tasks.push({
        id: `task-${Date.now()}-1`,
        title: "Main food preparation",
        description: `Execute main food preparation tasks`,
        department: "BOH",
        estimatedMinutes: Math.round(dayWorkload * 0.6),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });

      tasks.push({
        id: `task-${Date.now()}-2`,
        title: "Beverage setup",
        description: `Prepare bar and beverage service`,
        department: "BOH",
        estimatedMinutes: Math.round(dayWorkload * 0.2),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });

      tasks.push({
        id: `task-${Date.now()}-3`,
        title: "Room setup",
        description: `Begin room setup and decoration`,
        department: "Engineering",
        estimatedMinutes: Math.round(dayWorkload * 0.2),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });
    } else {
      // Day 3 (day before): Final prep and checks
      tasks.push({
        id: `task-${Date.now()}-1`,
        title: "Final food preparations",
        description: `Complete final food preparations and storage`,
        department: "BOH",
        estimatedMinutes: Math.round(dayWorkload * 0.5),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });

      tasks.push({
        id: `task-${Date.now()}-2`,
        title: "Final setup and inspection",
        description: `Complete room setup and final walkthrough`,
        department: "Engineering",
        estimatedMinutes: Math.round(dayWorkload * 0.3),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });

      tasks.push({
        id: `task-${Date.now()}-3`,
        title: "Staff briefing and assignments",
        description: `Brief staff on event details and assignments`,
        department: "FOH",
        estimatedMinutes: Math.round(dayWorkload * 0.2),
        status: "pending",
        completionTarget: dayDate.toISOString().split("T")[0],
      });
    }

    return tasks;
  }

  /**
   * Generate event day breakdown with department assignments
   */
  private static generateEventDayBreakdown(
    prospect: any,
    workloadEstimate: any,
  ): EventDayProduction {
    const eventTypeCode = prospect.event_type_code;
    const guestCount = prospect.guest_count || 50;

    // Setup and teardown times vary by event type
    const setupTimes: Record<string, number> = {
      WED: 120, // 2 hours
      COR: 90, // 1.5 hours
      BAN: 60, // 1 hour
      SEM: 45, // 45 min
      OTH: 75, // 1.25 hours
    };

    const teardownTimes: Record<string, number> = {
      WED: 120,
      COR: 90,
      BAN: 60,
      SEM: 45,
      OTH: 75,
    };

    const executionTimes: Record<string, number> = {
      WED: 300, // 5 hours
      COR: 240, // 4 hours
      BAN: 180, // 3 hours
      SEM: 120, // 2 hours
      OTH: 200, // 3.3 hours
    };

    const setupTime = setupTimes[eventTypeCode] || 90;
    const teardownTime = teardownTimes[eventTypeCode] || 90;
    const executionTime = executionTimes[eventTypeCode] || 240;

    // Calculate staff requirements per department
    const bohStaff = Math.ceil(guestCount / 15); // 1 BOH per 15 guests
    const fohStaff = Math.ceil(guestCount / 10); // 1 FOH per 10 guests
    const engineeringStaff = 2; // Standard setup crew

    return {
      date: prospect.event_date,
      setupTime,
      executionTime,
      teardownTime,
      departments: [
        {
          code: "BOH",
          name: "Back of House (Kitchen)",
          requiredStaff: bohStaff,
          estimatedMinutes: executionTime,
        },
        {
          code: "FOH",
          name: "Front of House (Service)",
          requiredStaff: fohStaff,
          estimatedMinutes: setupTime + executionTime + teardownTime,
        },
        {
          code: "Engineering",
          name: "Setup & Facilities",
          requiredStaff: engineeringStaff,
          estimatedMinutes: setupTime + teardownTime,
        },
      ],
    };
  }

  /**
   * Calculate department-level workload breakdown
   */
  private static calculateDepartmentBreakdown(
    prepDays: ProductionDay[],
    eventDay: EventDayProduction,
  ): DepartmentWorkload[] {
    const departments: Map<string, DepartmentWorkload> = new Map();

    // Aggregate prep days
    prepDays.forEach((day) => {
      day.tasks.forEach((task) => {
        if (!departments.has(task.department)) {
          departments.set(task.department, {
            code: task.department,
            name: this.getDepartmentName(task.department),
            totalMinutes: 0,
            totalHours: 0,
            daysInvolved: new Set<string>(),
            riskLevel: "low",
          });
        }

        const dept = departments.get(task.department)!;
        dept.totalMinutes += task.estimatedMinutes;
        (dept.daysInvolved as any).add(day.date);
      });
    });

    // Add event day work
    eventDay.departments.forEach((dept) => {
      if (!departments.has(dept.code)) {
        departments.set(dept.code, {
          code: dept.code,
          name: dept.name,
          totalMinutes: 0,
          totalHours: 0,
          daysInvolved: new Set<string>(),
          riskLevel: "low",
        });
      }

      const d = departments.get(dept.code)!;
      d.totalMinutes += dept.estimatedMinutes;
      (d.daysInvolved as any).add(eventDay.date);
    });

    // Convert to array and calculate risk levels
    const result = Array.from(departments.values())
      .map((dept) => ({
        ...dept,
        totalHours: Math.ceil(dept.totalMinutes / 60),
        daysInvolved: (dept.daysInvolved as any).size,
        riskLevel: this.calculateDepartmentRisk(dept.totalHours),
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    return result;
  }

  /**
   * Calculate risk level based on workload hours
   */
  private static calculateDepartmentRisk(
    hours: number,
  ): "low" | "medium" | "high" {
    // Assume 8 hour workday is sustainable
    if (hours <= 8) return "low";
    if (hours <= 16) return "medium"; // Could be 2 days
    return "high"; // More than 2 days of work
  }

  /**
   * Identify production risks and flags
   */
  private static identifyProductionRisks(
    departmentBreakdown: DepartmentWorkload[],
    workloadEstimate: any,
  ): string[] {
    const risks: string[] = [];

    departmentBreakdown.forEach((dept) => {
      if (dept.riskLevel === "high") {
        risks.push(
          `${dept.name} has high workload (${Math.round(dept.totalHours)} hours)`,
        );
      } else if (dept.riskLevel === "medium") {
        risks.push(
          `${dept.name} has moderate workload (${Math.round(dept.totalHours)} hours)`,
        );
      }
    });

    if (workloadEstimate.complexity === "high") {
      risks.push("Event has complex menu requiring advanced preparation");
    }

    return risks;
  }

  /**
   * Create production tasks in maestro system
   */
  private static async createProductionTasks(
    supabase: any,
    prospectId: string,
    orgId: string,
    prospect: any,
    prepDays: ProductionDay[],
    eventDay: EventDayProduction,
  ) {
    try {
      const tasks = [];

      // Add prep day tasks
      for (const day of prepDays) {
        for (const task of day.tasks) {
          tasks.push({
            prospect_id: prospectId,
            org_id: orgId,
            title: task.title,
            description: task.description,
            department_code: task.department,
            estimated_hours: Math.ceil(task.estimatedMinutes / 60),
            scheduled_date: task.completionTarget,
            status: "pending",
            event_date: prospect.event_date,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Add event day tasks
      for (const dept of eventDay.departments) {
        tasks.push({
          prospect_id: prospectId,
          org_id: orgId,
          title: `${dept.name} - Event Execution`,
          description: `Prepare for and execute event services (${dept.requiredStaff} staff required)`,
          department_code: dept.code,
          estimated_hours: Math.ceil(dept.estimatedMinutes / 60),
          scheduled_date: eventDay.date,
          status: "pending",
          event_date: prospect.event_date,
          created_at: new Date().toISOString(),
        });
      }

      if (tasks.length > 0) {
        const { error } = await supabase
          .from("maestro_production_tasks")
          .insert(tasks);

        if (error) {
          logger.warn("[ProductionBridge] Failed to create maestro tasks", {
            error: error.message,
          });
        }
      }
    } catch (error) {
      logger.warn("[ProductionBridge] Maestro task creation error", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Estimate total workload needed for event
   */
  private static estimateWorkload(eventTypeCode: string, guestCount: number) {
    // Base workload in minutes per event type
    const baseWorkload: Record<string, number> = {
      WED: 2400, // 40 hours
      COR: 1800, // 30 hours
      BAN: 1500, // 25 hours
      SEM: 900, // 15 hours
      OTH: 1200, // 20 hours
    };

    const baseMinutes = baseWorkload[eventTypeCode] || 1200;
    const perGuestMinutes = 15; // 15 minutes per guest for prep/service

    const totalMinutes = baseMinutes + guestCount * perGuestMinutes;

    return {
      eventType: eventTypeCode,
      guestCount,
      baseWorkload: baseMinutes,
      perGuestWork: guestCount * perGuestMinutes,
      totalMinutes,
      complexity:
        guestCount > 150 && eventTypeCode === "WED" ? "high" : "medium",
    };
  }

  /**
   * Get human-readable department name
   */
  private static getDepartmentName(code: string): string {
    const names: Record<string, string> = {
      BOH: "Back of House (Kitchen)",
      FOH: "Front of House (Service)",
      Engineering: "Setup & Facilities",
      Stewarding: "Stewarding & Cleanup",
      Purchasing: "Purchasing & Receiving",
      Management: "Event Management",
    };
    return names[code] || code;
  }
}
