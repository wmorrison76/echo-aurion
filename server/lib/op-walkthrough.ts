/********************************************************************
 * LUCCCA — BUILD 24
 * Operational Walkthrough Generator
 *
 * PURPOSE:
 *  - Automatically generate full operational plan for an event
 *  - Based on: headcount, menu, setup, duration, space, staffing
 *
 * OUTPUT:
 *  - Step-by-step plan for: setup, culinary, pastry, stewarding, engineering, FOH
 *********************************************************************/

export interface OperationalStep {
  sequence: number;
  timeOffset: number; // minutes before event start
  department: string;
  task: string;
  estimatedDuration: number; // minutes
  priority: "critical" | "high" | "normal" | "low";
  dependencies?: string[]; // other task sequences this depends on
}

export interface OperationalWalkthrough {
  eventId: string;
  eventTitle: string;
  startTime: string;
  headcount: number;
  space: string;
  steps: OperationalStep[];
  timeline: WalkthroughTimeline;
}

export interface WalkthroughTimeline {
  preEvent: string[]; // before event
  duringEvent: string[]; // during event
  postEvent: string[]; // after event
}

/**
 * Generate a complete operational walkthrough for an event
 */
export function generateOperationalWalkthrough(event: {
  id: string;
  title: string;
  start: string; // HH:MM
  end: string; // HH:MM
  headcount: number;
  space: string;
  menuItems?: string[];
  hasBarService?: boolean;
  hasAVRequirement?: boolean;
  setupType?: "cocktail" | "seated-dinner" | "buffet" | "classroom";
}): OperationalWalkthrough {
  const steps: OperationalStep[] = [];
  let sequence = 1;

  // Get time offsets
  const { setupStartOffset, culinaryPrepOffset, serviceOffset, strikeOffset } =
    getTimeOffsets(event.start, event.end, event.headcount);

  // === SETUP PHASE ===
  steps.push({
    sequence: sequence++,
    timeOffset: setupStartOffset,
    department: "Setup",
    task: `Unlock and access ${event.space}`,
    estimatedDuration: 15,
    priority: "critical",
  });

  if (event.setupType === "seated-dinner") {
    steps.push({
      sequence: sequence++,
      timeOffset: setupStartOffset + 15,
      department: "Setup",
      task: `Place tables for ${Math.ceil(event.headcount / 10)} tables`,
      estimatedDuration: 45,
      priority: "high",
      dependencies: ["1"],
    });

    steps.push({
      sequence: sequence++,
      timeOffset: setupStartOffset + 60,
      department: "Setup",
      task: "Set linens, chargers, and place settings",
      estimatedDuration: 30,
      priority: "high",
      dependencies: ["2"],
    });
  } else if (event.setupType === "buffet") {
    steps.push({
      sequence: sequence++,
      timeOffset: setupStartOffset + 15,
      department: "Setup",
      task: "Position buffet stations and serving tables",
      estimatedDuration: 30,
      priority: "high",
      dependencies: ["1"],
    });

    steps.push({
      sequence: sequence++,
      timeOffset: setupStartOffset + 45,
      department: "Setup",
      task: "Set up standing tables and seating areas",
      estimatedDuration: 30,
      priority: "normal",
      dependencies: ["2"],
    });
  } else {
    steps.push({
      sequence: sequence++,
      timeOffset: setupStartOffset + 15,
      department: "Setup",
      task: `Configure space for ${event.setupType || "event"} setup`,
      estimatedDuration: 45,
      priority: "high",
      dependencies: ["1"],
    });
  }

  steps.push({
    sequence: sequence++,
    timeOffset: setupStartOffset + 90,
    department: "Setup",
    task: "Place centerpieces, floral, and decor",
    estimatedDuration: 30,
    priority: "normal",
  });

  // === CULINARY PHASE ===
  steps.push({
    sequence: sequence++,
    timeOffset: culinaryPrepOffset,
    department: "Culinary",
    task: `Begin prep for ${event.headcount} guests`,
    estimatedDuration: 120,
    priority: "critical",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: culinaryPrepOffset + 60,
    department: "Culinary",
    task: `Mise en place and component prep`,
    estimatedDuration: 60,
    priority: "critical",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: serviceOffset - 120,
    department: "Culinary",
    task: "Hot line fire - begin cooking hot items",
    estimatedDuration: 90,
    priority: "critical",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: serviceOffset - 30,
    department: "Culinary",
    task: "Cold line plating begins",
    estimatedDuration: 60,
    priority: "critical",
  });

  // === PASTRY PHASE ===
  steps.push({
    sequence: sequence++,
    timeOffset: culinaryPrepOffset + 30,
    department: "Pastry",
    task: `Prepare desserts for ${event.headcount} guests`,
    estimatedDuration: 90,
    priority: "high",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: serviceOffset - 45,
    department: "Pastry",
    task: "Plate and finish desserts",
    estimatedDuration: 45,
    priority: "high",
  });

  // === BEVERAGE PHASE ===
  if (event.hasBarService) {
    steps.push({
      sequence: sequence++,
      timeOffset: setupStartOffset + 120,
      department: "Bar",
      task: "Stock bar with bottles and glassware",
      estimatedDuration: 45,
      priority: "high",
    });

    steps.push({
      sequence: sequence++,
      timeOffset: serviceOffset - 30,
      department: "Bar",
      task: "Station bartenders and test POS",
      estimatedDuration: 30,
      priority: "high",
    });
  }

  // === STEWARDING PHASE ===
  steps.push({
    sequence: sequence++,
    timeOffset: setupStartOffset + 60,
    department: "Stewarding",
    task: "Pull and inspect dishware and glassware",
    estimatedDuration: 45,
    priority: "high",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: serviceOffset + 30,
    department: "Stewarding",
    task: "Begin running dish service",
    estimatedDuration: 120,
    priority: "normal",
  });

  // === ENGINEERING PHASE ===
  if (event.hasAVRequirement) {
    steps.push({
      sequence: sequence++,
      timeOffset: setupStartOffset,
      department: "Engineering",
      task: "Install AV equipment and test",
      estimatedDuration: 60,
      priority: "critical",
    });

    steps.push({
      sequence: sequence++,
      timeOffset: serviceOffset - 30,
      department: "Engineering",
      task: "Final sound check and system test",
      estimatedDuration: 15,
      priority: "critical",
    });
  }

  steps.push({
    sequence: sequence++,
    timeOffset: setupStartOffset + 30,
    department: "Engineering",
    task: "Confirm HVAC schedule and temperature",
    estimatedDuration: 15,
    priority: "high",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: setupStartOffset + 45,
    department: "Engineering",
    task: "Verify power distribution and lighting",
    estimatedDuration: 15,
    priority: "high",
  });

  // === FOH PHASE ===
  steps.push({
    sequence: sequence++,
    timeOffset: serviceOffset - 60,
    department: "FOH",
    task: "Brief front-of-house team",
    estimatedDuration: 30,
    priority: "high",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: serviceOffset - 15,
    department: "FOH",
    task: "Final walkthrough and station check",
    estimatedDuration: 15,
    priority: "critical",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: serviceOffset,
    department: "FOH",
    task: "Opening sequence - greet guests",
    estimatedDuration: 30,
    priority: "critical",
  });

  // === STRIKE PHASE ===
  steps.push({
    sequence: sequence++,
    timeOffset: strikeOffset,
    department: "Strike",
    task: "Begin clearing and breaking down",
    estimatedDuration: 120,
    priority: "normal",
  });

  steps.push({
    sequence: sequence++,
    timeOffset: strikeOffset + 120,
    department: "Strike",
    task: "Return space to baseline",
    estimatedDuration: 60,
    priority: "normal",
  });

  // Build timeline summary
  const timeline: WalkthroughTimeline = {
    preEvent: buildPhaseTimeline(steps, "Setup", "Culinary", "Pastry", "Bar", "Stewarding", "Engineering", "FOH"),
    duringEvent: buildPhaseTimeline(steps, "FOH", "Stewarding", "Bar"),
    postEvent: buildPhaseTimeline(steps, "Strike"),
  };

  return {
    eventId: event.id,
    eventTitle: event.title,
    startTime: event.start,
    headcount: event.headcount,
    space: event.space,
    steps,
    timeline,
  };
}

/**
 * Get time offsets based on event duration and headcount
 */
function getTimeOffsets(
  startTime: string,
  endTime: string,
  headcount: number
) {
  // Parse times and calculate duration
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const durationMinutes = endMinutes - startMinutes;

  // Scale prep time based on headcount
  const prepScaleFactor = Math.max(1, headcount / 100);

  return {
    setupStartOffset: -180 * prepScaleFactor, // 3 hours before
    culinaryPrepOffset: -150 * prepScaleFactor, // 2.5 hours before
    serviceOffset: 0, // at start time
    strikeOffset: durationMinutes, // at end time
  };
}

/**
 * Build a summary of tasks for a phase
 */
function buildPhaseTimeline(
  steps: OperationalStep[],
  ...departments: string[]
): string[] {
  return steps
    .filter((s) => departments.includes(s.department))
    .map((s) => `${s.task} (${s.estimatedDuration} min)`)
    .slice(0, 5); // Show top 5 tasks per phase
}

/**
 * Calculate critical path (longest chain of dependent tasks)
 */
export function calculateCriticalPath(steps: OperationalStep[]): number {
  let maxDuration = 0;

  const visited = new Set<number>();

  function traverse(stepIndex: number, duration: number) {
    if (visited.has(stepIndex)) return;
    visited.add(stepIndex);

    const step = steps[stepIndex];
    duration += step.estimatedDuration;
    maxDuration = Math.max(maxDuration, duration);

    // Find dependent steps
    steps.forEach((s, i) => {
      if (s.dependencies?.includes(step.sequence.toString())) {
        traverse(i, duration);
      }
    });
  }

  steps.forEach((_, i) => {
    if (steps[i].dependencies?.length === 0) {
      traverse(i, 0);
    }
  });

  return maxDuration;
}
