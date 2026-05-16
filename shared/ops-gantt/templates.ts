import { v4 as uuidv4 } from "uuid";
import type {
  OpsArtifactKey,
  OpsDepartment,
  OpsEvent,
  OpsMilestone,
  OpsMilestoneKey,
  OpsTask,
  OpsTaskScope,
  OpsTaskStatus,
  UUID,
} from "../types/ops-gantt";
import { formatMsToIso, parseIsoToMs } from "./time";

export type EventTypeTemplateKey =
  | "conference_meeting"
  | "plated_dinner"
  | "cocktail_stations"
  | "multi_day_program";

export interface InstantiateTemplateInput {
  event: OpsEvent;
  /**
   * If true, include production-scope tasks in the output.
   * Echo Events should always set this to false.
   */
  includeProductionScope: boolean;
}

export interface InstantiateTemplateOutput {
  tasks: OpsTask[];
  milestones: OpsMilestone[];
}

function id(): UUID {
  return uuidv4();
}

function minutes(n: number): number {
  return n;
}

function hours(n: number): number {
  return n * 60;
}

function days(n: number): number {
  return n * 24 * 60;
}

function clampGuestCount(event: OpsEvent): number {
  const v = Number.isFinite(event.guestCountExpected) ? event.guestCountExpected : 0;
  return Math.max(0, Math.round(v));
}

function defaultTaskStatus(event: OpsEvent): OpsTaskStatus {
  if (event.status === "completed") return "done";
  if (event.status === "canceled") return "blocked";
  return "not_started";
}

function buildTask(params: {
  eventId: UUID;
  scope: OpsTaskScope;
  department: OpsDepartment;
  title: string;
  startMs: number;
  durationMinutes: number;
  status: OpsTaskStatus;
  percentComplete?: number;
  requiredArtifacts?: OpsArtifactKey[];
  tags?: string[];
  dependencies?: OpsTask["dependencies"];
}): OpsTask {
  const durationMinutes = Math.max(0, Math.round(params.durationMinutes));
  const start = formatMsToIso(params.startMs);
  const end = formatMsToIso(params.startMs + durationMinutes * 60_000);
  return {
    taskId: id(),
    eventId: params.eventId,
    scope: params.scope,
    department: params.department,
    title: params.title,
    start,
    end,
    durationMinutes,
    percentComplete: params.percentComplete ?? 0,
    status: params.status,
    dependencies: params.dependencies ?? [],
    requiredArtifacts: params.requiredArtifacts ?? [],
    tags: params.tags ?? [],
    riskScore: 0,
  };
}

function milestone(params: {
  eventId: UUID;
  key: OpsMilestoneKey;
  title: string;
  atMs: number;
  completed?: boolean;
  completedAtMs?: number;
}): OpsMilestone {
  return {
    milestoneId: id(),
    eventId: params.eventId,
    key: params.key,
    title: params.title,
    at: formatMsToIso(params.atMs),
    completed: params.completed ?? false,
    completedAt: params.completedAtMs ? formatMsToIso(params.completedAtMs) : undefined,
  };
}

/**
 * Select an event type template based on eventType + serviceStyle heuristics.
 * This is deterministic and can be overridden later by explicit event metadata.
 */
export function inferTemplateKey(event: OpsEvent): EventTypeTemplateKey {
  const type = (event.eventType || "").toLowerCase();
  const style = (event.serviceStyle || "").toLowerCase();

  if (type.includes("multi") || type.includes("summit") || type.includes("conference") && type.includes("day")) {
    return "multi_day_program";
  }

  if (style.includes("plated") || type.includes("wedding") || type.includes("gala") || type.includes("vip")) {
    return "plated_dinner";
  }

  if (style.includes("stations") || type.includes("reception") || type.includes("cocktail")) {
    return "cocktail_stations";
  }

  return "conference_meeting";
}

/**
 * Instantiate a full, production-usable default task network for a banquet event.
 *
 * This creates:
 * - Planning chain (BEO scope)
 * - Purchasing/receiving chain (BEO scope)
 * - Execution chain (Production scope when enabled)
 * - Milestones aligned to the chain
 *
 * Scheduling: back-scheduled from event.startDateTime by default.
 */
export function instantiateTemplate(input: InstantiateTemplateInput): InstantiateTemplateOutput {
  const { event, includeProductionScope } = input;

  const eventStartMs = parseIsoToMs(event.startDateTime);
  const setupStartMs = parseIsoToMs(event.setupStart) ?? eventStartMs;
  const strikeEndMs = parseIsoToMs(event.strikeEnd) ?? eventStartMs;
  const endMs = parseIsoToMs(event.endDateTime) ?? eventStartMs;

  if (eventStartMs === null) {
    // Fail-safe: return empty; UI should surface data error rather than crash.
    return { tasks: [], milestones: [] };
  }

  const guests = clampGuestCount(event);
  const status = defaultTaskStatus(event);
  const templateKey = inferTemplateKey(event);

  // Heuristics (tunable, deterministic).
  const planningWindowDays = templateKey === "plated_dinner" ? 21 : templateKey === "cocktail_stations" ? 14 : 10;
  const menuLockDays = templateKey === "plated_dinner" ? 7 : 5;
  const guaranteeDays = templateKey === "plated_dinner" ? 5 : 3;

  const basePrepHours =
    templateKey === "plated_dinner" ? 6 : templateKey === "cocktail_stations" ? 5 : 4;
  const perGuestPrepMinutes =
    templateKey === "plated_dinner" ? 1.6 : templateKey === "cocktail_stations" ? 1.2 : 1.0;
  const prepDuration = hours(basePrepHours) + minutes(guests * perGuestPrepMinutes);

  const setupDuration = hours(2) + minutes(Math.max(0, guests - 100) * 0.2);
  const strikeDuration = hours(1.5) + minutes(Math.max(0, guests - 100) * 0.1);

  // Anchor times (relative to event start).
  const tPlanningStart = eventStartMs - days(planningWindowDays) * 60_000;
  const tMenuLock = eventStartMs - days(menuLockDays) * 60_000;
  const tGuarantee = eventStartMs - days(guaranteeDays) * 60_000;
  const tPoSend = eventStartMs - days(guaranteeDays + 2) * 60_000;
  const tReceivingStart = eventStartMs - days(2) * 60_000;
  const tPreBrief = eventStartMs - hours(3) * 60_000;

  const tasks: OpsTask[] = [];
  const milestones: OpsMilestone[] = [];

  // --- Sales & Planning (BEO scope)
  const captureReq = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Sales",
    title: "Capture client requirements",
    startMs: tPlanningStart,
    durationMinutes: hours(2),
    status,
  });
  const draftBeo = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Events",
    title: "Draft initial BEO",
    startMs: tPlanningStart + days(1) * 60_000,
    durationMinutes: hours(3),
    status,
    dependencies: [{ dependsOnTaskId: captureReq.taskId, type: "FS", lagMinutes: 0 }],
  });
  const internalReview = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Events",
    title: "Internal review + pricing approval",
    startMs: tPlanningStart + days(2) * 60_000,
    durationMinutes: hours(2),
    status,
    dependencies: [{ dependsOnTaskId: draftBeo.taskId, type: "FS" }],
  });
  const clientApproval = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Events",
    title: "Client approval / signatures",
    startMs: tPlanningStart + days(3) * 60_000,
    durationMinutes: hours(1),
    status,
    requiredArtifacts: ["beo_signed"],
    dependencies: [{ dependsOnTaskId: internalReview.taskId, type: "FS" }],
  });
  milestones.push(
    milestone({
      eventId: event.eventId,
      key: "contract_signed",
      title: "Contract signed",
      atMs: tPlanningStart + days(3) * 60_000 + hours(1) * 60_000,
      completed: false,
    }),
  );

  const floorplanDraft = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Events",
    title: "Floorplan draft",
    startMs: tMenuLock - days(2) * 60_000,
    durationMinutes: hours(2),
    status,
    requiredArtifacts: ["floorplan_approved"],
    dependencies: [{ dependsOnTaskId: draftBeo.taskId, type: "FS" }],
  });

  const publishBeo = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Events",
    title: "Final BEO revision + publish",
    startMs: tMenuLock - hours(6) * 60_000,
    durationMinutes: hours(1),
    status,
    dependencies: [
      { dependsOnTaskId: clientApproval.taskId, type: "FS" },
      { dependsOnTaskId: floorplanDraft.taskId, type: "FS" },
    ],
  });
  milestones.push(
    milestone({
      eventId: event.eventId,
      key: "beo_distributed",
      title: "BEO approved + distributed",
      atMs: tMenuLock - hours(5) * 60_000,
      completed: false,
    }),
  );

  tasks.push(captureReq, draftBeo, internalReview, clientApproval, floorplanDraft, publishBeo);

  // --- Culinary (BEO scope)
  const menuFinalize = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Culinary",
    title: "Menu proposal finalized",
    startMs: tMenuLock - days(2) * 60_000,
    durationMinutes: hours(2),
    status,
    dependencies: [{ dependsOnTaskId: draftBeo.taskId, type: "FS" }],
  });
  const allergenPlan = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Culinary",
    title: "Allergen/dietary plan confirmed",
    startMs: tMenuLock - days(1) * 60_000,
    durationMinutes: hours(1),
    status,
    tags: ["allergen"],
    dependencies: [{ dependsOnTaskId: menuFinalize.taskId, type: "FS" }],
  });
  const menuLocked = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Culinary",
    title: "Menu locked",
    startMs: tMenuLock,
    durationMinutes: minutes(30),
    status,
    requiredArtifacts: ["menu_locked"],
    dependencies: [
      { dependsOnTaskId: publishBeo.taskId, type: "FS" },
      { dependsOnTaskId: allergenPlan.taskId, type: "FS" },
    ],
  });
  milestones.push(
    milestone({
      eventId: event.eventId,
      key: "menu_locked",
      title: "Menu locked",
      atMs: tMenuLock + minutes(30) * 60_000,
      completed: false,
    }),
  );
  tasks.push(menuFinalize, allergenPlan, menuLocked);

  // --- Purchasing/Receiving (BEO scope)
  const requisitions = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Purchasing",
    title: "Generate requisitions from menu",
    startMs: tMenuLock + hours(1) * 60_000,
    durationMinutes: hours(1.5),
    status,
    dependencies: [{ dependsOnTaskId: menuLocked.taskId, type: "FS" }],
  });
  const vendorQuotes = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Purchasing",
    title: "Vendor quotes / substitutions",
    startMs: tPoSend - days(1) * 60_000,
    durationMinutes: hours(2),
    status,
    dependencies: [{ dependsOnTaskId: requisitions.taskId, type: "FS" }],
  });
  const placeOrders = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Purchasing",
    title: "Place orders",
    startMs: tPoSend,
    durationMinutes: hours(1),
    status,
    requiredArtifacts: ["po_sent", "vendor_confirmed"],
    dependencies: [{ dependsOnTaskId: vendorQuotes.taskId, type: "FS" }],
  });
  milestones.push(
    milestone({
      eventId: event.eventId,
      key: "po_sent",
      title: "Purchase order sent",
      atMs: tPoSend + hours(1) * 60_000,
      completed: false,
    }),
  );
  const deliveryWindows = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Receiving",
    title: "Delivery window schedule",
    startMs: tReceivingStart,
    durationMinutes: hours(1),
    status,
    dependencies: [{ dependsOnTaskId: placeOrders.taskId, type: "FS" }],
  });
  const receiveVerify = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Receiving",
    title: "Receive & verify",
    startMs: tReceivingStart + hours(4) * 60_000,
    durationMinutes: hours(2),
    status,
    requiredArtifacts: ["deliveries_received_complete"],
    dependencies: [{ dependsOnTaskId: deliveryWindows.taskId, type: "FS" }],
  });
  milestones.push(
    milestone({
      eventId: event.eventId,
      key: "receiving_complete",
      title: "Deliveries received complete",
      atMs: tReceivingStart + hours(6) * 60_000,
      completed: false,
    }),
  );
  tasks.push(requisitions, vendorQuotes, placeOrders, deliveryWindows, receiveVerify);

  // --- Labor (BEO scope)
  const forecastStaff = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "BanquetOps",
    title: "Forecast staffing needs",
    startMs: tMenuLock + hours(2) * 60_000,
    durationMinutes: hours(1),
    status,
    dependencies: [{ dependsOnTaskId: publishBeo.taskId, type: "FS" }],
  });
  const publishSchedule = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "BanquetOps",
    title: "Publish schedule",
    startMs: tGuarantee - days(1) * 60_000,
    durationMinutes: hours(1),
    status,
    dependencies: [{ dependsOnTaskId: forecastStaff.taskId, type: "FS" }],
  });
  const confirmStaff = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "BanquetOps",
    title: "Confirm staffing",
    startMs: tGuarantee,
    durationMinutes: minutes(30),
    status,
    requiredArtifacts: ["staffing_confirmed"],
    dependencies: [{ dependsOnTaskId: publishSchedule.taskId, type: "FS" }],
  });
  tasks.push(forecastStaff, publishSchedule, confirmStaff);

  milestones.push(
    milestone({
      eventId: event.eventId,
      key: "guarantee_received",
      title: "Guarantee received",
      atMs: tGuarantee,
      completed: false,
    }),
  );

  // --- Execution chain (Production scope)
  if (includeProductionScope) {
    const preBrief = buildTask({
      eventId: event.eventId,
      scope: "production",
      department: "BanquetOps",
      title: "Pre-event briefing",
      startMs: tPreBrief,
      durationMinutes: minutes(30),
      status,
      dependencies: [
        { dependsOnTaskId: publishBeo.taskId, type: "FS" },
        { dependsOnTaskId: confirmStaff.taskId, type: "FS" },
      ],
    });
    const setup = buildTask({
      eventId: event.eventId,
      scope: "production",
      department: "BanquetOps",
      title: "Setup room + stations",
      startMs: (setupStartMs ?? eventStartMs) - setupDuration * 60_000,
      durationMinutes: setupDuration,
      status,
      dependencies: [{ dependsOnTaskId: preBrief.taskId, type: "FS" }],
    });
    const productionPrep = buildTask({
      eventId: event.eventId,
      scope: "production",
      department: "Culinary",
      title: "Production / prep execution",
      startMs: eventStartMs - prepDuration * 60_000,
      durationMinutes: prepDuration,
      status,
      dependencies: [
        { dependsOnTaskId: menuLocked.taskId, type: "FS" },
        { dependsOnTaskId: receiveVerify.taskId, type: "FS" },
      ],
    });
    const service = buildTask({
      eventId: event.eventId,
      scope: "production",
      department: "BanquetOps",
      title: "Service execution",
      startMs: eventStartMs,
      durationMinutes: Math.max(30, Math.round((endMs - eventStartMs) / 60_000)),
      status,
      dependencies: [
        { dependsOnTaskId: setup.taskId, type: "FS" },
        { dependsOnTaskId: productionPrep.taskId, type: "FS" },
      ],
    });
    const strike = buildTask({
      eventId: event.eventId,
      scope: "production",
      department: "Stewarding",
      title: "Strike + reset",
      startMs: (strikeEndMs ?? endMs) - strikeDuration * 60_000,
      durationMinutes: strikeDuration,
      status,
      dependencies: [{ dependsOnTaskId: service.taskId, type: "FS" }],
    });
    tasks.push(preBrief, setup, productionPrep, service, strike);

    milestones.push(
      milestone({
        eventId: event.eventId,
        key: "production_complete",
        title: "Production complete",
        atMs: eventStartMs,
        completed: false,
      }),
    );
    milestones.push(
      milestone({
        eventId: event.eventId,
        key: "event_executed",
        title: "Event executed",
        atMs: endMs ?? eventStartMs,
        completed: false,
      }),
    );
  }

  // --- Closeout (BEO scope)
  const postNotes = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Events",
    title: "Post-event notes + incident log",
    startMs: (endMs ?? eventStartMs) + hours(1) * 60_000,
    durationMinutes: hours(1),
    status,
    dependencies: [],
  });
  const billingReview = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Finance",
    title: "Final billing review",
    startMs: (endMs ?? eventStartMs) + days(1) * 60_000,
    durationMinutes: hours(2),
    status,
    dependencies: [{ dependsOnTaskId: postNotes.taskId, type: "FS" }],
  });
  const invoiceClose = buildTask({
    eventId: event.eventId,
    scope: "beo",
    department: "Finance",
    title: "Invoice sent + close",
    startMs: (endMs ?? eventStartMs) + days(2) * 60_000,
    durationMinutes: hours(1),
    status,
    dependencies: [{ dependsOnTaskId: billingReview.taskId, type: "FS" }],
  });
  tasks.push(postNotes, billingReview, invoiceClose);
  milestones.push(
    milestone({
      eventId: event.eventId,
      key: "billing_closed",
      title: "Billing closed",
      atMs: (endMs ?? eventStartMs) + days(2) * 60_000 + hours(1) * 60_000,
      completed: false,
    }),
  );

  return { tasks, milestones };
}

