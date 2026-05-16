/***
 * LUCCCA — BUILD 42
 * Risk-Triggered Auto-Actions
 *
 * PURPOSE:
 *  - Automatically correct operational risk when detected
 *  - Rule-driven (now) and ML-ready (future)
 *  - Turn LUCCCA from reactive to proactive
 ***/

export type AutoAction = {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  params?: Record<string, any>;
  autoExecute: boolean;
  notification?: {
    to: string[];
    title: string;
    body: string;
  };
};

/**
 * Apply automatic corrective actions based on event risk
 */
export function applyAutoActions(event: any): AutoAction[] {
  const actions: AutoAction[] = [];
  const score = event.score || 0;
  const severity = event.severity || "low";

  // ============================================
  // STAFFING AUTO-ACTIONS
  // ============================================

  // Rule 1: Increase staffing for high-risk events
  if (severity === "high") {
    actions.push({
      type: "increaseStaffing",
      severity: "high",
      reason: "High-risk event requires additional coverage",
      params: {
        roleIncrease: "Server,Cook",
        percentIncrease: 15,
        eventId: event.id,
      },
      autoExecute: false,
      notification: {
        to: ["dept:culinary", "dept:foh"],
        title: "Staffing Boost Recommended",
        body: `Event ${event.name} has elevated risk. Consider increasing staffing by 15%.`,
      },
    });
  }

  if (severity === "critical") {
    actions.push({
      type: "increaseStaffing",
      severity: "critical",
      reason: "Critical event - immediate staffing escalation",
      params: {
        roleIncrease: "Server,Cook,Steward,Captain",
        percentIncrease: 25,
        eventId: event.id,
      },
      autoExecute: true,
      notification: {
        to: ["role:ec", "role:chef", "role:banquet-manager"],
        title: "🚨 CRITICAL: Staffing Escalated",
        body: `Event ${event.name} (Score: ${score}) has critical risk. Staffing increased by 25%.`,
      },
    });
  }

  // ============================================
  // SPACE/CONFLICT AUTO-ACTIONS
  // ============================================

  // Rule 2: Lock space early if conflicts exist
  if (event.spaceConflicts) {
    actions.push({
      type: "lockSpace",
      severity: "high",
      reason: "Space conflict detected - locking early to prevent double-booking",
      params: {
        spaceId: event.space,
        lockMinutesBefore: 120,
        eventId: event.id,
      },
      autoExecute: true,
      notification: {
        to: ["dept:engineering", "dept:setup"],
        title: "Space Lock Applied",
        body: `${event.space} locked 2 hours before event to prevent conflicts.`,
      },
    });
  }

  // ============================================
  // INVENTORY AUTO-ACTIONS
  // ============================================

  // Rule 3: Advance ordering for inventory gaps
  if (event.inventoryGaps && event.inventoryGaps > 3) {
    actions.push({
      type: "advanceOrdering",
      severity: "high",
      reason: "Multiple inventory gaps detected - advance supplier orders",
      params: {
        gapCount: event.inventoryGaps,
        advanceDays: 3,
        eventId: event.id,
        categories: ["proteins", "produce", "specialty"],
      },
      autoExecute: true,
      notification: {
        to: ["dept:purchasing", "role:chef"],
        title: "Advance Order Triggered",
        body: `${event.inventoryGaps} inventory gaps for ${event.name}. Orders advanced by 3 days.`,
      },
    });
  }

  // ============================================
  // BUFFER/TIMING AUTO-ACTIONS
  // ============================================

  // Rule 4: Increase buffer time for complex events
  if (event.complexity === "high" || severity === "high") {
    actions.push({
      type: "increaseBuffer",
      severity: "medium",
      reason: "Complex event requires extended setup/breakdown",
      params: {
        setupBufferAddMinutes: 45,
        strikeBufferAddMinutes: 60,
        eventId: event.id,
      },
      autoExecute: false,
      notification: {
        to: ["dept:setup"],
        title: "Buffer Time Recommended",
        body: `Event complexity warrants +45min setup, +60min breakdown buffer.`,
      },
    });
  }

  // ============================================
  // ESCALATION AUTO-ACTIONS
  // ============================================

  // Rule 5: Notify Executive Committee for critical events
  if (severity === "critical") {
    actions.push({
      type: "escalateToEC",
      severity: "critical",
      reason: "Critical-risk event requires executive oversight",
      params: {
        eventId: event.id,
        escalationLevel: 4,
        requiresApproval: true,
      },
      autoExecute: true,
      notification: {
        to: ["role:ec", "role:gm"],
        title: "🚨 CRITICAL EVENT ALERT",
        body: `${event.name} (Risk: ${score}/100, Severity: ${severity}). 
Triggers: ${event.spaceConflicts ? "Conflicts, " : ""}${event.staffingIssues ? "Staffing gaps, " : ""}${event.inventoryGaps ? "Inventory gaps, " : ""}
Required Action: Review and approve by EC.`,
      },
    });
  }

  // ============================================
  // MAINTENANCE AUTO-ACTIONS
  // ============================================

  // Rule 6: Block maintenance if event is high-risk
  if ((severity === "high" || severity === "critical") && event.hasEngineeringWork) {
    actions.push({
      type: "blockMaintenance",
      severity: "high",
      reason: "High-risk event with engineering work - prevent conflicts",
      params: {
        eventId: event.id,
        blockEngineeringHours: 4,
      },
      autoExecute: true,
      notification: {
        to: ["dept:engineering"],
        title: "Maintenance Blackout Applied",
        body: `Maintenance blackout applied during high-risk event ${event.name}.`,
      },
    });
  }

  // ============================================
  // VENDOR/DEPENDENCY AUTO-ACTIONS
  // ============================================

  // Rule 7: Increase supplier communication for events with many dependencies
  if (event.vendorDependencies && event.vendorDependencies > 3) {
    actions.push({
      type: "increaseVendorComm",
      severity: "medium",
      reason: "Multiple external dependencies - increase supplier coordination",
      params: {
        vendorCount: event.vendorDependencies,
        checkInIntervalHours: 6,
        eventId: event.id,
      },
      autoExecute: true,
      notification: {
        to: ["dept:purchasing"],
        title: "Vendor Coordination Enhanced",
        body: `${event.vendorDependencies} external dependencies for ${event.name}. Check-ins scheduled every 6 hours.`,
      },
    });
  }

  // ============================================
  // FINANCIAL AUTO-ACTIONS
  // ============================================

  // Rule 8: Monitor labor cost exposure for high-labor events
  if (event.totalHours && event.totalHours > 300) {
    actions.push({
      type: "monitorLaborCost",
      severity: "medium",
      reason: "High labor hour exposure - risk of cost overrun",
      params: {
        totalHours: event.totalHours,
        costThreshold: event.laborCost * 1.2, // 20% overrun threshold
        eventId: event.id,
      },
      autoExecute: false,
      notification: {
        to: ["role:finance", "role:ec"],
        title: "Labor Cost Alert",
        body: `High labor exposure for ${event.name}: ${event.totalHours} hours. Monitoring for cost overrun.`,
      },
    });
  }

  return actions;
}

/**
 * Execute an auto-action
 */
export async function executeAutoAction(
  action: AutoAction,
  context: any
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (action.type) {
      case "increaseStaffing":
        return await executeIncreaseStaffing(action.params, context);
      case "lockSpace":
        return await executeLockSpace(action.params, context);
      case "advanceOrdering":
        return await executeAdvanceOrdering(action.params, context);
      case "escalateToEC":
        return await executeEscalate(action.params, context);
      case "blockMaintenance":
        return await executeBlockMaintenance(action.params, context);
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Individual action executors (placeholders for real integration)

async function executeIncreaseStaffing(
  params: any,
  context: any
): Promise<{ success: boolean }> {
  // TODO: Call staffing optimization engine
  console.log("Auto-Action: Increasing staffing", params);
  return { success: true };
}

async function executeLockSpace(
  params: any,
  context: any
): Promise<{ success: boolean }> {
  // TODO: Call space governance engine
  console.log("Auto-Action: Locking space", params);
  return { success: true };
}

async function executeAdvanceOrdering(
  params: any,
  context: any
): Promise<{ success: boolean }> {
  // TODO: Call procurement engine
  console.log("Auto-Action: Advancing orders", params);
  return { success: true };
}

async function executeEscalate(
  params: any,
  context: any
): Promise<{ success: boolean }> {
  // TODO: Call approval workflow
  console.log("Auto-Action: Escalating to EC", params);
  return { success: true };
}

async function executeBlockMaintenance(
  params: any,
  context: any
): Promise<{ success: boolean }> {
  // TODO: Call maintenance scheduler
  console.log("Auto-Action: Blocking maintenance", params);
  return { success: true };
}
