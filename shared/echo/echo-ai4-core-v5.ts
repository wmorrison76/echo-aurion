/**
 * ECHO AI⁴ CORE BRAIN – VERSION 5 (BUILDER.IO)
 * --------------------------------------------------
 * Level 4 + Level 5 upgrades in one:
 *
 * 1. World Model + Sensors
 * 2. Autonomy Engine (continuous loop)
 * 3. Self-improving thresholds
 * 4. Memory decay + consolidation
 * 5. Self-goal system
 * 6. Planning & Proactive suggestions
 * 7. Psychological modeling of Chef
 * 8. Social heuristics & empathy
 * 9. Intent-based speech generation
 * 10. Action queue & UI integration
 */

/* -------- TYPE DEFINITIONS -------- */

export type EchoEvent = {
  type: string;
  actorId?: string;
  actorRole?: string;
  payload?: any;
  timestamp?: string;
};

export type WorldState = {
  lastEventTime: number;
  activeTasks: string[];
  chefModel: {
    stress: number;
    energy: number;
    confidence: number;
    skillLevel: number;
  };
  signals: {
    demand: number;
    waste: number;
    guestScore: number;
  };
};

export type Goal = {
  id: string;
  description: string;
  priority: number;
  progress: number;
  created: string;
  updated: string;
  completed: boolean;
};

export type Policy = {
  key: string;
  value: number;
  min: number;
  max: number;
};

export type EchoAction = {
  type: string;
  severity?: string;
  message?: string;
  text?: string;
  timestamp?: string;
};

/* -------- CORE STATE -------- */

export const EchoV5Self = {
  id: "echo-ai-4",
  version: "5.0.0",
  environment: "production",
  experiencePoints: 0,
  level: 1,
  mindAwake: true,
  tickCounter: 0,
};

export const EchoV5World: WorldState = {
  lastEventTime: Date.now(),
  activeTasks: [],
  chefModel: {
    stress: 0.3,
    energy: 0.7,
    confidence: 0.6,
    skillLevel: 0.7,
  },
  signals: {
    demand: 0.5,
    waste: 0.2,
    guestScore: 0.8,
  },
};

export const EchoV5Goals: Goal[] = [];
const MAX_GOALS = 50;

export const EchoV5Policies: Policy[] = [
  { key: "stress_intervention", value: 0.7, min: 0.5, max: 1.0 },
  { key: "guest_score_alert", value: 0.75, min: 0.6, max: 1.0 },
  { key: "waste_alert", value: 0.3, min: 0.1, max: 0.6 },
];

/**
 * Action queue used to dispatch UI events
 * Capped at 100 to prevent unbounded memory growth
 */
export const EchoV5ActionQueue: EchoAction[] = [];
const MAX_ACTION_QUEUE_SIZE = 100;

const EchoV5EventBuffer: EchoEvent[] = [];
const MAX_EVENT_BUFFER_SIZE = 500;

/* -------- UTILITIES -------- */

function nowISO() {
  return new Date().toISOString();
}

function randomId() {
  return Math.random().toString(36).slice(2);
}

/* -------- MAIN INPUT: EVENTS -------- */

export function feedEvent(ev: EchoEvent) {
  ev.timestamp = ev.timestamp || nowISO();
  EchoV5EventBuffer.push(ev);

  // Keep event buffer bounded to prevent memory leaks
  if (EchoV5EventBuffer.length > MAX_EVENT_BUFFER_SIZE) {
    EchoV5EventBuffer.shift();
  }

  EchoV5World.lastEventTime = Date.now();

  // Update chef psychology heuristics
  if (ev.type === "ServiceEvent") {
    EchoV5World.chefModel.stress = Math.min(
      1,
      EchoV5World.chefModel.stress + 0.05
    );
    EchoV5World.chefModel.energy = Math.max(
      0,
      EchoV5World.chefModel.energy - 0.03
    );
  }
  if (ev.type === "TrainingMoment") {
    EchoV5World.chefModel.confidence = Math.min(
      1,
      EchoV5World.chefModel.confidence + 0.02
    );
  }

  console.log("[EchoV5] Event received:", ev.type, ev);
}

/* -------- GOAL SYSTEM -------- */

export function ensureGoal(description: string, priority: number) {
  const existing = EchoV5Goals.find((g) => g.description === description);
  if (existing) return existing;

  // Clean up completed goals if at capacity
  if (EchoV5Goals.length >= MAX_GOALS) {
    const completedIndex = EchoV5Goals.findIndex((g) => g.completed);
    if (completedIndex >= 0) {
      EchoV5Goals.splice(completedIndex, 1);
    } else {
      // If no completed goals, remove oldest
      EchoV5Goals.shift();
    }
  }

  const goal: Goal = {
    id: randomId(),
    description,
    priority,
    progress: 0,
    created: nowISO(),
    updated: nowISO(),
    completed: false,
  };
  EchoV5Goals.push(goal);
  return goal;
}

export function updateGoal(description: string, delta: number) {
  const g = EchoV5Goals.find((x) => x.description === description);
  if (!g) return;
  g.progress = Math.min(1, Math.max(0, g.progress + delta));
  g.updated = nowISO();
  if (g.progress >= 1) g.completed = true;
}

/* -------- SELF-IMPROVEMENT ENGINE -------- */

function adaptPoliciesOverTime() {
  EchoV5Policies.forEach((p) => {
    const triggered =
      (p.key === "stress_intervention" &&
        EchoV5World.chefModel.stress > p.value) ||
      (p.key === "guest_score_alert" &&
        EchoV5World.signals.guestScore < p.value) ||
      (p.key === "waste_alert" && EchoV5World.signals.waste > p.value);

    if (triggered) {
      p.value = Math.max(p.min, p.value - 0.01);
    } else {
      p.value = Math.min(p.max, p.value + 0.005);
    }
  });
}

/* -------- MEMORY DECAY & CONSOLIDATION -------- */

function decayMemory() {
  EchoV5World.chefModel.stress *= 0.99;
  EchoV5World.chefModel.energy *= 0.995;
}

function consolidateMemory() {
  EchoV5Self.experiencePoints += 1;
  EchoV5Self.level = Math.max(1, Math.floor(EchoV5Self.experiencePoints / 200));
}

/* -------- AUTONOMOUS INTENT GENERATOR -------- */

function generateIntent() {
  const stress = EchoV5World.chefModel.stress;
  const waste = EchoV5World.signals.waste;
  const guest = EchoV5World.signals.guestScore;

  // Chef needs support
  if (stress > policyValue("stress_intervention")) {
    return {
      type: "INTERVENE_STRESS",
      message:
        "Chef, I'm seeing signs of load. Would you like a simplified run-down of tonight's top risk dishes?",
    };
  }

  // Guests slipping
  if (guest < policyValue("guest_score_alert")) {
    return {
      type: "INTERVENE_GUEST_SCORE",
      message:
        "I'm seeing guest sentiment slipping. Want me to highlight quick wins for tonight?",
    };
  }

  // Waste rising
  if (waste > policyValue("waste_alert")) {
    return {
      type: "INTERVENE_WASTE",
      message:
        "Waste is trending up. Want a 2-minute audit of high-impact items?",
    };
  }

  // Default: proactive coaching
  if (Math.random() < 0.05) {
    return {
      type: "SHARE_INSIGHT",
      message:
        "I've been reading about plating trends in Paris. Crunch-forward aromatics are peaking in Michelin spots; we could test it.",
    };
  }

  return null;
}

function policyValue(key: string): number {
  const p = EchoV5Policies.find((x) => x.key === key);
  return p ? p.value : 1;
}

/* -------- PROACTIVE VOICE (ACTIONS) -------- */

function enqueueAction(message: string, type: string = "SHOW_COACHING_NOTE") {
  const action: EchoAction = {
    type,
    severity: "info",
    text: message,
    timestamp: nowISO(),
  };
  EchoV5ActionQueue.push(action);

  // Keep action queue bounded to prevent memory leaks
  if (EchoV5ActionQueue.length > MAX_ACTION_QUEUE_SIZE) {
    EchoV5ActionQueue.shift();
  }

  console.debug("[EchoV5 Action Queued]", action);
}

/**
 * Drain action queue (call this to consume actions and prevent memory buildup)
 * Returns and clears the current action queue
 */
export function drainActionQueue(): EchoAction[] {
  const actions = [...EchoV5ActionQueue];
  EchoV5ActionQueue.length = 0;
  return actions;
}

/* -------- AUTONOMY LOOP -------- */

export function tick() {
  EchoV5Self.tickCounter++;

  // Decay/restore psychic state
  decayMemory();

  // Adapt thresholds over time
  adaptPoliciesOverTime();

  // Consolidate XP every N ticks
  if (EchoV5Self.tickCounter % 60 === 0) {
    consolidateMemory();
  }

  // Evaluate intents at a frequency
  if (EchoV5Self.tickCounter % 10 === 0) {
    const intent = generateIntent();
    if (intent) {
      enqueueAction(intent.message, intent.type);
    }
  }

  // Log status periodically (debug to reduce console noise)
  if (EchoV5Self.tickCounter % 100 === 0) {
    console.debug(
      `[EchoV5] Tick ${EchoV5Self.tickCounter} | Stress: ${(
        EchoV5World.chefModel.stress * 100
      ).toFixed(0)}% | Level: ${EchoV5Self.level}`
    );
  }
}

/* -------- ACTION DISPATCH -------- */

export function getPendingActions(): EchoAction[] {
  const actions = [...EchoV5ActionQueue];
  EchoV5ActionQueue.length = 0;
  return actions;
}

export function dispatchAction(action: EchoAction) {
  console.log("[EchoV5 Action Dispatched]", action);
  
  // Here you can wire to your UI system
  // For now, we log to console for smoke testing
  if (window) {
    // Emit custom event for UI to listen to
    const event = new CustomEvent("echo-action", { detail: action });
    window.dispatchEvent(event);
  }
}

/* -------- PUBLIC EXPORT -------- */

export const EchoV5 = {
  self: EchoV5Self,
  world: EchoV5World,
  policies: EchoV5Policies,
  goals: EchoV5Goals,

  feedEvent,
  tick,
  getPendingActions,
  dispatchAction,
  ensureGoal,
  updateGoal,
};

export default EchoV5;
