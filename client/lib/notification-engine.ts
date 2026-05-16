export interface StaffMember {
  id: string;
  name: string;
  shiftStart: Date;
  role: string;
  hoursWorked?: number;
  lastBreakTime?: Date;
  breaksTaken?: number;
}

export interface NotificationRule {
  id: string;
  type: "overtime" | "break" | "overstaffing" | "delivery" | "order";
  enabled: boolean;
  threshold?: number;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface NotificationAlert {
  id: string;
  ruleId: string;
  type: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  staffId?: string;
  actionRequired?: boolean;
  context?: Record<string, any>;
}

// Overtime notification - 5 hours before hitting OT
export const createOvertimeNotification = (
  staff: StaffMember,
  overtimeThreshold: number = 40,
): NotificationAlert | null => {
  const hoursWorked = staff.hoursWorked || 0;
  const hoursUntilOT = overtimeThreshold - hoursWorked;

  // Alert if 5 hours or less remaining before OT
  if (hoursUntilOT > 0 && hoursUntilOT <= 5) {
    return {
      id: `ot-${staff.id}-${Date.now()}`,
      ruleId: "overtime-5h",
      type: "overtime",
      title: "⏰ Overtime Alert",
      message: `${staff.name} will hit overtime in ~${Math.round(hoursUntilOT)}h. Consider adjusting schedule.`,
      severity: hoursUntilOT <= 2 ? "high" : "medium",
      timestamp: new Date(),
      staffId: staff.id,
      actionRequired: hoursUntilOT <= 2,
      context: {
        staffName: staff.name,
        hoursWorked,
        hoursUntilOT,
        role: staff.role,
      },
    };
  }

  return null;
};

// Break notification - staff hasn't taken break in 5+ hours
export const createBreakNotification = (
  staff: StaffMember,
  breakInterval: number = 5 * 60 * 60 * 1000, // 5 hours
): NotificationAlert | null => {
  if (!staff.lastBreakTime) {
    // If no break recorded, check if worked more than interval
    const shiftDuration = Date.now() - staff.shiftStart.getTime();
    if (shiftDuration > breakInterval) {
      return {
        id: `break-${staff.id}-${Date.now()}`,
        ruleId: "break-5h",
        type: "break",
        title: "☕ Break Required",
        message: `${staff.name} has been working for ${Math.round(shiftDuration / 3600000)}h without a break.`,
        severity: "high",
        timestamp: new Date(),
        staffId: staff.id,
        actionRequired: true,
        context: {
          staffName: staff.name,
          hoursSinceStart: Math.round(shiftDuration / 3600000),
          role: staff.role,
        },
      };
    }
  } else {
    const timeSinceBreak = Date.now() - staff.lastBreakTime.getTime();
    if (timeSinceBreak > breakInterval) {
      return {
        id: `break-${staff.id}-${Date.now()}`,
        ruleId: "break-5h",
        type: "break",
        title: "☕ Break Required",
        message: `${staff.name} hasn't taken a break in ${Math.round(timeSinceBreak / 3600000)}h.`,
        severity: "high",
        timestamp: new Date(),
        staffId: staff.id,
        actionRequired: true,
        context: {
          staffName: staff.name,
          hoursSinceBreak: Math.round(timeSinceBreak / 3600000),
          breaksTaken: staff.breaksTaken || 0,
          role: staff.role,
        },
      };
    }
  }

  return null;
};

// Overstaffing notification - too many staff during slow period
export const createOverstaffingNotification = (
  staffOnDuty: number,
  avgCovers: number,
  ratioDanger: number = 1, // 1 staff per 1 cover is overstaffed
): NotificationAlert | null => {
  const currentRatio = staffOnDuty / (avgCovers || 1);

  // If more staff than covers, it's overstaffed
  if (currentRatio > ratioDanger && avgCovers < 50) {
    return {
      id: `overstaff-${Date.now()}`,
      ruleId: "overstaffing-ratio",
      type: "overstaffing",
      title: "👥 Overstaffed Alert",
      message: `Current ratio ${staffOnDuty} staff for ${avgCovers} covers. Consider dismissing staff.`,
      severity: "medium",
      timestamp: new Date(),
      actionRequired: true,
      context: {
        staffOnDuty,
        avgCovers,
        ratio: currentRatio.toFixed(2),
        suggestedReduction: Math.ceil(staffOnDuty - avgCovers),
      },
    };
  }

  return null;
};

// System learning - manager provided context
export interface ManagerNote {
  id: string;
  staffId?: string;
  timestamp: Date;
  note: string;
  context: string; // e.g., "event-prep", "sick-leave", "training", "maintenance"
  date: Date;
}

// Create predictive alerts based on learned patterns
export const createPredictiveAlert = (
  staffOnDuty: number,
  ordersQueuedCount: number,
  managerNotes: ManagerNote[],
): NotificationAlert | null => {
  // If orders are building up and no manager note for reason, alert
  if (ordersQueuedCount > 10 && staffOnDuty < 5) {
    // Check if there's a note explaining high order volume
    const hasExplanation = managerNotes.some(
      (note) =>
        note.context === "event-prep" ||
        note.context === "promotion" ||
        new Date(note.date).toDateString() === new Date().toDateString(),
    );

    if (!hasExplanation) {
      return {
        id: `predictive-orders-${Date.now()}`,
        ruleId: "predictive-queue",
        type: "order",
        title: "📋 Order Queue Alert",
        message: `${ordersQueuedCount} orders queued with only ${staffOnDuty} staff. High volume detected.`,
        severity: "high",
        timestamp: new Date(),
        actionRequired: true,
        context: {
          ordersQueued: ordersQueuedCount,
          staffOnDuty,
          trend: "increasing",
        },
      };
    }
  }

  return null;
};

// Notification scheduler - check conditions at intervals
export class NotificationEngine {
  private staffMembers: StaffMember[] = [];
  private managerNotes: ManagerNote[] = [];
  private alerts: NotificationAlert[] = [];
  private rules: NotificationRule[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    initialRules: NotificationRule[] = [
      {
        id: "overtime-5h",
        type: "overtime",
        enabled: true,
        threshold: 5,
        message: "Staff overtime alert",
        severity: "high",
      },
      {
        id: "break-5h",
        type: "break",
        enabled: true,
        threshold: 5 * 60 * 60 * 1000,
        message: "Break required",
        severity: "high",
      },
      {
        id: "overstaffing-ratio",
        type: "overstaffing",
        enabled: true,
        threshold: 1,
        message: "Overstaffing detected",
        severity: "medium",
      },
    ],
  ) {
    this.rules = initialRules;
    this.alerts = [];
  }

  setStaffMembers(staff: StaffMember[]) {
    this.staffMembers = staff;
  }

  addManagerNote(note: ManagerNote) {
    this.managerNotes.push(note);
    // Keep notes for current day only
    this.managerNotes = this.managerNotes.filter(
      (n) => new Date(n.date).toDateString() === new Date().toDateString(),
    );
  }

  checkNotifications(): NotificationAlert[] {
    const newAlerts: NotificationAlert[] = [];

    // Check each staff member for alerts
    this.staffMembers.forEach((staff) => {
      if (this.isRuleEnabled("overtime-5h")) {
        const overtimeAlert = createOvertimeNotification(staff);
        if (overtimeAlert) newAlerts.push(overtimeAlert);
      }

      if (this.isRuleEnabled("break-5h")) {
        const breakAlert = createBreakNotification(staff);
        if (breakAlert) newAlerts.push(breakAlert);
      }
    });

    // Check for overstaffing
    if (this.isRuleEnabled("overstaffing-ratio")) {
      const staffOnDuty = this.staffMembers.length;
      // This would come from real data
      const avgCovers = 30;
      const overstaffAlert = createOverstaffingNotification(
        staffOnDuty,
        avgCovers,
      );
      if (overstaffAlert) newAlerts.push(overstaffAlert);
    }

    // Update alerts (avoid duplicates)
    this.alerts = this.deduplicateAlerts([...this.alerts, ...newAlerts]);

    return this.alerts;
  }

  private isRuleEnabled(ruleId: string): boolean {
    const rule = this.rules.find((r) => r.id === ruleId);
    return rule?.enabled ?? false;
  }

  private deduplicateAlerts(alerts: NotificationAlert[]): NotificationAlert[] {
    const seen = new Set<string>();
    return alerts.filter((alert) => {
      const key = `${alert.type}-${alert.staffId || "system"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  dismissAlert(alertId: string) {
    this.alerts = this.alerts.filter((a) => a.id !== alertId);
  }

  clearAlerts() {
    this.alerts = [];
  }

  getAlerts(): NotificationAlert[] {
    return this.alerts;
  }

  startAutoCheck(intervalMs: number = 30000) {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => {
      this.checkNotifications();
      // Dispatch event for UI to update
      window.dispatchEvent(
        new CustomEvent("notifications-updated", {
          detail: { alerts: this.alerts },
        }),
      );
    }, intervalMs);
  }

  stopAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Singleton instance
let engineInstance: NotificationEngine | null = null;

export function getNotificationEngine(): NotificationEngine {
  if (!engineInstance) {
    engineInstance = new NotificationEngine();
  }
  return engineInstance;
}
