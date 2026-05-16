import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { post } from "@/lib/api-client";
import { DashboardWidget } from "./DashboardWidgets";
import { storage } from "@/lib/storage";
import { safeFetchJson } from "@/lib/safe-fetch";

type GoalCategory = "personal" | "work" | "team";

type CompactSection =
  | "coach-quote"
  | "focus-goal"
  | "top-goals"
  | "progress"
  | "actions";

type GoalMetricKind = "binary" | "numeric";

type GoalCadence = "daily" | "weekly";

type CoachStyle = "direct" | "encouraging" | "tactical";

type FocusMode = "focus" | "top";

type Density = "compact" | "medium" | "full";

interface GoalMetricBinary {
  kind: "binary";
  cadence: GoalCadence;
}

interface GoalMetricNumeric {
  kind: "numeric";
  unit: string;
  startValue: number;
  targetValue: number;
  cadence: GoalCadence;
}

type GoalMetric = GoalMetricBinary | GoalMetricNumeric;

interface GoalV2 {
  id: string;
  title: string;
  category: GoalCategory;
  createdAt: number;
  targetDate?: string; // YYYY-MM-DD
  notes?: string;
  archived?: boolean;
  metric: GoalMetric;
}

interface DailyGoalLog {
  done?: boolean;
  value?: number;
  minutes?: number;
  note?: string;
}

interface DailyJournal {
  win?: string;
  blocker?: string;
  gratitude?: string;
}

interface DailyLog {
  goals: Record<string, DailyGoalLog>;
  journal?: DailyJournal;
}

interface CoachContentV2 {
  quote: string;
  focus: string;
  microLesson: string;
  actions: string[];
  mindsetShift?: string;
  ifThenPlan?: string;
  accountabilityPrompt?: string;
}

interface CoachEntryV2 {
  signature: string;
  generatedAt: number;
  source: "ai" | "fallback";
  content: CoachContentV2;
}

interface GoalsDataV2 {
  version: 2;
  goals: GoalV2[];
  logsByDate: Record<string, DailyLog>;
  coachByDate: Record<string, CoachEntryV2>;
  preferences: {
    compactSections: CompactSection[];
    primaryCategory: GoalCategory | "all";
    focusGoalId?: string;
    focusMode: FocusMode;
    coachStyle: CoachStyle;
  };
}

type GoalsDataAny = any;

const DEFAULT_DATA_V2: GoalsDataV2 = {
  version: 2,
  goals: [],
  logsByDate: {},
  coachByDate: {},
  preferences: {
    compactSections: ["coach-quote", "focus-goal"],
    primaryCategory: "all",
    focusMode: "focus",
    coachStyle: "tactical",
  },
};

const EMPTY_GOALS_LOG: Record<string, DailyGoalLog> = {};
const EMPTY_JOURNAL: DailyJournal = {};
const EMPTY_DAILY_LOG: DailyLog = {
  goals: EMPTY_GOALS_LOG,
  journal: EMPTY_JOURNAL,
};

function getTodayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function clampText(s: string, max = 280): string {
  const trimmed = String(s || "").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toFiniteNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeUnit(unit: string): string {
  const u = String(unit || "").trim();
  if (!u) return "units";
  return u.slice(0, 16);
}

function getStorageKey(userId: string, widgetId: string) {
  return `daily-goals-tracker:${userId}:${widgetId}`;
}

function getOrgIdForRequest(): string {
  if (typeof window === "undefined") return "default";

  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }

  const alt = String(localStorage.getItem("orgId") || "").trim();
  if (alt) return alt;

  return "default";
}

function migrateToV2(saved: GoalsDataAny | null): GoalsDataV2 {
  if (!saved || typeof saved !== "object") return DEFAULT_DATA_V2;

  if (saved.version === 2) {
    const merged: GoalsDataV2 = {
      ...DEFAULT_DATA_V2,
      ...saved,
      preferences: {
        ...DEFAULT_DATA_V2.preferences,
        ...(saved.preferences || {}),
      },
    };

    merged.preferences.compactSections = Array.isArray(
      merged.preferences.compactSections,
    )
      ? merged.preferences.compactSections
      : DEFAULT_DATA_V2.preferences.compactSections;

    merged.preferences.primaryCategory =
      merged.preferences.primaryCategory ||
      DEFAULT_DATA_V2.preferences.primaryCategory;

    merged.preferences.focusMode =
      merged.preferences.focusMode || DEFAULT_DATA_V2.preferences.focusMode;

    merged.preferences.coachStyle =
      merged.preferences.coachStyle || DEFAULT_DATA_V2.preferences.coachStyle;

    return merged;
  }

  // v1 → v2 migration
  const goalsRaw = Array.isArray(saved.goals) ? saved.goals : [];
  const goals: GoalV2[] = goalsRaw
    .map((g: any): GoalV2 | null => {
      const id = String(g?.id || "");
      const title = String(g?.title || "").trim();
      if (!id || !title) return null;
      const category =
        (String(g?.category || "personal") as GoalCategory) || "personal";
      return {
        id,
        title,
        category,
        createdAt: toFiniteNumber(g?.createdAt, Date.now()),
        targetDate:
          typeof g?.targetDate === "string" ? g.targetDate : undefined,
        notes: typeof g?.notes === "string" ? g.notes : undefined,
        archived: !!g?.archived,
        metric: { kind: "binary", cadence: "daily" },
      };
    })
    .filter(Boolean) as GoalV2[];

  const logsByDateV1 =
    saved.logsByDate && typeof saved.logsByDate === "object"
      ? saved.logsByDate
      : {};
  const logsByDate: GoalsDataV2["logsByDate"] = {};

  Object.entries(logsByDateV1).forEach(([date, perGoal]) => {
    const goalsLog: Record<string, DailyGoalLog> = {};
    if (perGoal && typeof perGoal === "object") {
      Object.entries(perGoal as Record<string, any>).forEach(
        ([goalId, entry]) => {
          const done = !!entry?.done;
          const note = typeof entry?.note === "string" ? entry.note : undefined;
          goalsLog[goalId] = { done, note };
        },
      );
    }
    logsByDate[String(date)] = { goals: goalsLog };
  });

  const coachByDateV1 =
    saved.coachByDate && typeof saved.coachByDate === "object"
      ? saved.coachByDate
      : {};
  const coachByDate: GoalsDataV2["coachByDate"] = {};
  Object.entries(coachByDateV1).forEach(([date, c]) => {
    const quote = clampText(String((c as any)?.quote || ""), 240);
    const focus = clampText(String((c as any)?.focus || "Today's focus"), 120);
    const microLesson = clampText(String((c as any)?.microLesson || ""), 320);
    const actions = Array.isArray((c as any)?.actions)
      ? (c as any).actions
          .map((a: any) => clampText(String(a || ""), 140))
          .filter(Boolean)
      : [];

    if (!quote || !microLesson) return;

    const signature = String(
      hashString(
        `${date}:${quote}:${focus}:${microLesson}:${actions.join("|")}`,
      ),
    );
    coachByDate[String(date)] = {
      signature,
      generatedAt: Date.now(),
      source: "fallback",
      content: {
        quote,
        focus,
        microLesson,
        actions: actions.slice(0, 5),
      },
    };
  });

  return {
    version: 2,
    goals,
    logsByDate,
    coachByDate,
    preferences: {
      ...DEFAULT_DATA_V2.preferences,
      ...(saved.preferences || {}),
      compactSections: Array.isArray(saved.preferences?.compactSections)
        ? saved.preferences.compactSections
        : DEFAULT_DATA_V2.preferences.compactSections,
      primaryCategory: saved.preferences?.primaryCategory || "all",
      focusMode: saved.preferences?.focusMode || "focus",
      coachStyle: saved.preferences?.coachStyle || "tactical",
    },
  };
}

function getDaysUntil(targetDate?: string): number | null {
  if (!targetDate) return null;
  const d = new Date(`${targetDate}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return null;
  const today = new Date(`${getTodayKey()}T00:00:00`);
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function computeCurrentValue(
  goal: GoalV2,
  logsByDate: GoalsDataV2["logsByDate"],
): number | null {
  if (goal.metric.kind !== "numeric") return null;

  // Use the latest logged value if any; otherwise fall back to startValue
  const dates = Object.keys(logsByDate).sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    const log = logsByDate[dates[i]];
    const entry = log?.goals?.[goal.id];
    const v = entry?.value;
    if (Number.isFinite(v)) return Number(v);
  }

  return goal.metric.startValue;
}

function computeProgressPercent(
  goal: GoalV2,
  currentValue: number | null,
): number | null {
  if (goal.metric.kind !== "numeric") return null;
  const start = goal.metric.startValue;
  const target = goal.metric.targetValue;
  const current = currentValue ?? start;

  const denom = target - start;
  if (denom === 0) return 100;

  const p = ((current - start) / denom) * 100;
  return Math.max(0, Math.min(100, round2(p)));
}

function computeStreak(
  goalId: string,
  logsByDate: GoalsDataV2["logsByDate"],
  todayKey: string,
): number {
  // consecutive days with done=true OR numeric value present
  const keys = Object.keys(logsByDate)
    .filter((k) => k <= todayKey)
    .sort();

  let streak = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    const log = logsByDate[keys[i]];
    const entry = log?.goals?.[goalId];
    const ok = !!entry?.done || Number.isFinite(entry?.value);
    if (!ok) break;
    streak += 1;
  }

  return streak;
}

function compute7DayRate(
  goalId: string,
  logsByDate: GoalsDataV2["logsByDate"],
  todayKey: string,
): { done: number; total: number } {
  const keys = Object.keys(logsByDate)
    .filter((k) => k <= todayKey)
    .sort();

  const last = keys.slice(-7);
  let done = 0;
  last.forEach((k) => {
    const entry = logsByDate[k]?.goals?.[goalId];
    if (!!entry?.done || Number.isFinite(entry?.value)) done += 1;
  });

  return { done, total: last.length };
}

function fallbackCoach(seed: string, style: CoachStyle): CoachContentV2 {
  const quotes =
    style === "direct"
      ? [
          "Win the next 10 minutes.",
          "Pick one thing. Finish it.",
          "Progress requires proof — do the next rep.",
          "If it matters, schedule it.",
        ]
      : style === "encouraging"
        ? [
            "Small progress, repeated daily, becomes a big result.",
            "You’re building a stronger version of you — one action at a time.",
            "Consistency is a skill. Train it like one.",
            "Your future self is built in today’s decisions.",
          ]
        : [
            "Momentum beats motivation: do the next 2-minute action.",
            "Reduce friction, then repeat the action.",
            "Measure what matters: track the action you control today.",
            "Start small, then scale.",
          ];

  const lessons = [
    {
      focus: "Reduce friction",
      microLesson:
        "Pick one action under 5 minutes. Starting is the hardest part — once you start, you can continue.",
      actions: [
        "Choose the smallest next step for your focus goal",
        "Remove one obstacle (prep, reminder, materials)",
        "Log the win when you finish",
      ],
      mindsetShift:
        "You don’t need more motivation — you need a smaller first step.",
      ifThenPlan:
        "If I feel resistance, then I will do 2 minutes and stop if needed.",
      accountabilityPrompt:
        "What would ‘done for today’ look like in 10 minutes?",
    },
    {
      focus: "Design your environment",
      microLesson:
        "Motivation is unreliable. Build cues: a calendar block, a checklist, and a visible trigger.",
      actions: [
        "Schedule a 15-minute block for your #1 goal",
        "Write the next 3 steps (not the whole plan)",
        "Add one reminder cue (alarm, sticky note, calendar)",
      ],
      mindsetShift: "Environment beats willpower.",
      ifThenPlan:
        "If I miss the block, then I will reschedule within 24 hours.",
      accountabilityPrompt: "What cue can you put in your path today?",
    },
    {
      focus: "Stay on pace",
      microLesson:
        "Track the leading indicator: the action you control today (minutes practiced, messages sent, reps done).",
      actions: [
        "Define today’s measurable action",
        "Do it once, then repeat",
        "Record the number so you can improve",
      ],
      mindsetShift: "Actions first. Feelings follow.",
      ifThenPlan: "If I get busy, then I will do a 5-minute minimum version.",
      accountabilityPrompt: "What number will prove you showed up today?",
    },
  ];

  const idx = hashString(seed);
  const quote = quotes[idx % quotes.length];
  const lesson = lessons[idx % lessons.length];
  return {
    quote,
    focus: lesson.focus,
    microLesson: lesson.microLesson,
    actions: lesson.actions,
    mindsetShift: lesson.mindsetShift,
    ifThenPlan: lesson.ifThenPlan,
    accountabilityPrompt: lesson.accountabilityPrompt,
  };
}

function tryParseCoach(text: string): CoachContentV2 | null {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  const candidate = raw.slice(first, last + 1);
  const parsed = safeJsonParse<any>(candidate);
  if (!parsed || typeof parsed !== "object") return null;

  const quote = clampText(parsed.quote || parsed.motivationalQuote || "", 240);
  const focus = clampText(parsed.focus || parsed.theme || "", 120);
  const microLesson = clampText(parsed.microLesson || parsed.lesson || "", 420);
  const actions = Array.isArray(parsed.actions)
    ? parsed.actions
        .map((a: any) => clampText(String(a || ""), 160))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  if (!quote || !focus || !microLesson) return null;

  const mindsetShift = parsed.mindsetShift
    ? clampText(String(parsed.mindsetShift), 220)
    : undefined;
  const ifThenPlan = parsed.ifThenPlan
    ? clampText(String(parsed.ifThenPlan), 220)
    : undefined;
  const accountabilityPrompt = parsed.accountabilityPrompt
    ? clampText(String(parsed.accountabilityPrompt), 220)
    : undefined;

  return {
    quote,
    focus,
    microLesson,
    actions,
    mindsetShift,
    ifThenPlan,
    accountabilityPrompt,
  };
}

function buildCoachPrompt(args: {
  today: string;
  coachStyle: CoachStyle;
  focusGoal?: GoalV2;
  allGoals: GoalV2[];
  logsByDate: GoalsDataV2["logsByDate"];
  todayLog: DailyLog;
}): string {
  const { today, coachStyle, focusGoal, allGoals, logsByDate, todayLog } = args;

  const focusId = focusGoal?.id;
  const focusStreak = focusId ? computeStreak(focusId, logsByDate, today) : 0;
  const focus7 = focusId
    ? compute7DayRate(focusId, logsByDate, today)
    : { done: 0, total: 0 };
  const journal = todayLog.journal || {};

  const goalLines = allGoals.slice(0, 12).map((g) => {
    const days = getDaysUntil(g.targetDate);
    const entry = todayLog.goals[g.id] || {};
    const done = !!entry.done;

    if (g.metric.kind === "numeric") {
      const currentValue = computeCurrentValue(g, logsByDate);
      const pct = computeProgressPercent(g, currentValue);
      const unit = g.metric.unit;
      const due = days === null ? "" : ` (days left: ${days})`;
      const val =
        currentValue === null ? "n/a" : `${round2(currentValue)} ${unit}`;
      const p = pct === null ? "" : ` (${pct}% to target)`;
      return `- [${g.category}] ${g.title}${due} | today: ${done ? "done" : "not done"} | current: ${val}${p}`;
    }

    const due = days === null ? "" : ` (days left: ${days})`;
    return `- [${g.category}] ${g.title}${due} | today: ${done ? "done" : "not done"}`;
  });

  const styleHint =
    coachStyle === "direct"
      ? "Be direct and concise."
      : coachStyle === "encouraging"
        ? "Be warm, supportive, and motivating."
        : "Be tactical and action-oriented with clear next steps.";

  const focusBlock = focusGoal
    ? [
        `Focus goal: ${focusGoal.title} (${focusGoal.category})`,
        `Focus streak: ${focusStreak} days`,
        `Focus last-7-days: ${focus7.done}/${focus7.total} days logged`,
      ].join("\n")
    : "No focus goal selected.";

  const journalBlock = [
    journal.win ? `Win: ${journal.win}` : "Win: (none logged)",
    journal.blocker ? `Blocker: ${journal.blocker}` : "Blocker: (none logged)",
    journal.gratitude
      ? `Gratitude: ${journal.gratitude}`
      : "Gratitude: (none logged)",
  ].join("\n");

  return [
    "You are an elite daily performance coach for a hospitality executive.",
    styleHint,
    "Use the user's goals and check-ins to produce a daily coaching message.",
    "Return STRICT JSON ONLY (no markdown) with keys:",
    "quote (string), focus (string), microLesson (string), actions (string[]), mindsetShift (string), ifThenPlan (string), accountabilityPrompt (string).",
    "Keep it practical, grounded, and non-generic.",
    `Date: ${today}`,
    "",
    focusBlock,
    "",
    "Daily journal:",
    journalBlock,
    "",
    "Goals:",
    goalLines.join("\n"),
  ].join("\n");
}

function formatDeadline(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  return `${days}d left`;
}

function formatValue(n: number, unit: string): string {
  const v = round2(n);
  return `${v} ${unit}`;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
      <div
        className="h-full bg-primary/60"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function GoalsWidget(props: any) {
  const {
    minimized = false,
    showHeader = false,
    onMinimize,
    onPin,
    onDetach,
    isPinned = false,
    title,
    icon,
    widgetId = "goals",
    userId = "default",
  } = props;

  const storageKey = useMemo(
    () =>
      getStorageKey(String(userId || "default"), String(widgetId || "goals")),
    [userId, widgetId],
  );

  const [data, setData] = useState<GoalsDataV2>(() => {
    const saved = safeJsonParse<GoalsDataAny>(localStorage.getItem(storageKey));
    return migrateToV2(saved);
  });

  useEffect(() => {
    let cancelled = false;
    const loadGoals = async () => {
      const api = await safeFetchJson<{
        synced?: boolean;
        goals?: GoalV2[];
      }>("/api/dashboard/goals", {}, null);
      if (cancelled || !api?.synced || !Array.isArray(api.goals) || api.goals.length === 0) return;
      const apiGoals = api.goals.filter((g) => g && g.id);
      setData((prev) => {
        const byId = new Map(prev.goals.map((g) => [g.id, g]));
        apiGoals.forEach((g) => byId.set(g.id, g));
        return { ...prev, goals: Array.from(byId.values()) };
      });
    };
    void loadGoals().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const result = storage.set(storageKey, data);
    if (!result.success) {
      console.warn(
        `[GoalsWidget] Failed to save goals to storage: ${result.message}`,
      );
    }
  }, [data, storageKey]);

  const rootRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setDims({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const density = useMemo<Density>(() => {
    const w = dims.width;
    const h = dims.height;
    if (w > 0 && h > 0) {
      if (w <= 255 || h <= 190) return "compact";
      if (w <= 390 || h <= 270) return "medium";
    }
    return "full";
  }, [dims.height, dims.width]);

  const today = useMemo(() => getTodayKey(), []);
  const todayLog = useMemo(() => {
    return data.logsByDate[today] || EMPTY_DAILY_LOG;
  }, [data.logsByDate, today]);

  const goals = useMemo(
    () => data.goals.filter((g) => !g.archived),
    [data.goals],
  );

  const activeCategory = data.preferences.primaryCategory;
  const visibleGoals = useMemo(() => {
    if (activeCategory === "all") return goals;
    return goals.filter((g) => g.category === activeCategory);
  }, [activeCategory, goals]);

  const focusGoal = useMemo(() => {
    const focusId = data.preferences.focusGoalId;
    if (focusId) {
      const found = goals.find((g) => g.id === focusId);
      if (found) return found;
    }
    return goals[0] || null;
  }, [data.preferences.focusGoalId, goals]);

  const doneTodayCount = useMemo(() => {
    let count = 0;
    goals.forEach((g) => {
      const entry = todayLog.goals[g.id];
      if (entry?.done || Number.isFinite(entry?.value)) count += 1;
    });
    return count;
  }, [goals, todayLog.goals]);

  const progressText = useMemo(() => {
    if (goals.length === 0) return "No goals yet";
    return `${doneTodayCount}/${goals.length} completed today`;
  }, [doneTodayCount, goals.length]);

  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const coachSignature = useMemo(() => {
    const goalSig = goals
      .slice(0, 12)
      .map((g) => {
        const t = g.targetDate || "";
        const m =
          g.metric.kind === "numeric"
            ? `${g.metric.startValue}:${g.metric.targetValue}:${g.metric.unit}:${g.metric.cadence}`
            : g.metric.cadence;
        return `${g.id}:${g.category}:${g.title}:${t}:${m}`;
      })
      .join("|");

    const focusId = focusGoal?.id || "";
    const journalSig = `${todayLog.journal?.win || ""}:${todayLog.journal?.blocker || ""}:${todayLog.journal?.gratitude || ""}`;
    const todayDoneSig = goals
      .map((g) => {
        const e = todayLog.goals[g.id];
        return `${g.id}:${e?.done ? "1" : "0"}:${Number.isFinite(e?.value) ? String(e?.value) : ""}:${Number.isFinite(e?.minutes) ? String(e?.minutes) : ""}`;
      })
      .join("|");

    const seed = [
      today,
      data.preferences.coachStyle,
      focusId,
      goalSig,
      journalSig,
      todayDoneSig,
    ].join("::");

    return String(hashString(seed));
  }, [
    data.preferences.coachStyle,
    focusGoal?.id,
    goals,
    today,
    todayLog.goals,
    todayLog.journal,
  ]);

  const coachEntry = data.coachByDate[today] || null;
  const coach = coachEntry?.content || null;

  const ensureCoach = (force: boolean) => {
    if (minimized) return;

    setData((prev) => {
      const existing = prev.coachByDate[today];
      if (!force && existing && existing.signature === coachSignature)
        return prev;

      const next = { ...prev };
      if (force) {
        const copy = { ...next.coachByDate };
        delete copy[today];
        next.coachByDate = copy;
      }
      return next;
    });
  };

  useEffect(() => {
    if (minimized) return;
    if (data.coachByDate[today]?.signature === coachSignature) return;

    const seed = `${storageKey}:${today}:${coachSignature}`;

    if (goals.length === 0) {
      setData((prev) => ({
        ...prev,
        coachByDate: {
          ...prev.coachByDate,
          [today]: {
            signature: coachSignature,
            generatedAt: Date.now(),
            source: "fallback",
            content: fallbackCoach(seed, prev.preferences.coachStyle),
          },
        },
      }));
      return;
    }

    const controller = new AbortController();
    setCoachLoading(true);
    setCoachError(null);

    const prompt = buildCoachPrompt({
      today,
      coachStyle: data.preferences.coachStyle,
      focusGoal: focusGoal || undefined,
      allGoals: goals,
      logsByDate: data.logsByDate,
      todayLog,
    });

    post<{ ok: boolean; text?: string; error?: string }>(
      "/api/echo",
      { prompt },
      {
        signal: controller.signal,
        headers: { "X-Org-ID": getOrgIdForRequest() },
      },
    )
      .then((json) => {
        const text = String(json?.text || "");
        const parsed = tryParseCoach(text);
        const content =
          parsed || fallbackCoach(seed, data.preferences.coachStyle);
        setData((prev) => ({
          ...prev,
          coachByDate: {
            ...prev.coachByDate,
            [today]: {
              signature: coachSignature,
              generatedAt: Date.now(),
              source: parsed ? "ai" : "fallback",
              content,
            },
          },
        }));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setCoachError(String(err?.message || "coach_unavailable"));
        setData((prev) => ({
          ...prev,
          coachByDate: {
            ...prev.coachByDate,
            [today]: {
              signature: coachSignature,
              generatedAt: Date.now(),
              source: "fallback",
              content: fallbackCoach(seed, prev.preferences.coachStyle),
            },
          },
        }));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setCoachLoading(false);
      });

    return () => controller.abort();
  }, [
    coachSignature,
    data.coachByDate,
    data.logsByDate,
    data.preferences.coachStyle,
    focusGoal,
    goals,
    minimized,
    storageKey,
    today,
    todayLog,
  ]);

  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<GoalCategory>("personal");
  const [newTargetDate, setNewTargetDate] = useState<string>(getTodayKey());
  const [newMetricKind, setNewMetricKind] = useState<GoalMetricKind>("binary");
  const [newCadence, setNewCadence] = useState<GoalCadence>("daily");
  const [newUnit, setNewUnit] = useState("units");
  const [newStartValue, setNewStartValue] = useState("0");
  const [newTargetValue, setNewTargetValue] = useState("100");

  const addGoal = () => {
    const titleValue = newTitle.trim();
    if (!titleValue) return;

    const metric: GoalMetric =
      newMetricKind === "numeric"
        ? {
            kind: "numeric",
            unit: normalizeUnit(newUnit),
            startValue: toFiniteNumber(newStartValue, 0),
            targetValue: toFiniteNumber(newTargetValue, 100),
            cadence: newCadence,
          }
        : {
            kind: "binary",
            cadence: newCadence,
          };

    const goal: GoalV2 = {
      id: `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: titleValue,
      category: newCategory,
      createdAt: Date.now(),
      targetDate: newTargetDate || undefined,
      metric,
    };

    setData((prev) => ({
      ...prev,
      goals: [goal, ...prev.goals],
      preferences: {
        ...prev.preferences,
        focusGoalId: prev.preferences.focusGoalId || goal.id,
      },
    }));

    setNewTitle("");
    setShowAdd(false);
  };

  const archiveGoal = (goalId: string) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, archived: true } : g,
      ),
      preferences: {
        ...prev.preferences,
        focusGoalId:
          prev.preferences.focusGoalId === goalId
            ? prev.goals.find((g) => g.id !== goalId && !g.archived)?.id
            : prev.preferences.focusGoalId,
      },
    }));
  };

  const setFocusGoalId = (goalId: string) => {
    setData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        focusGoalId: goalId,
        focusMode: "focus",
      },
    }));
  };

  const updateGoalTargetDate = (goalId: string, targetDate: string) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, targetDate } : g,
      ),
    }));
  };

  const updateTodayLog = (goalId: string, patch: Partial<DailyGoalLog>) => {
    setData((prev) => {
      const current = prev.logsByDate[today] || EMPTY_DAILY_LOG;
      const entry = current.goals[goalId] || {};
      const nextEntry: DailyGoalLog = { ...entry, ...patch };

      // If toggling done false and no other content, keep it clean
      const hasAny =
        !!nextEntry.done ||
        Number.isFinite(nextEntry.value) ||
        Number.isFinite(nextEntry.minutes) ||
        (nextEntry.note && nextEntry.note.trim());

      const nextGoals = { ...current.goals };
      if (hasAny) {
        nextGoals[goalId] = nextEntry;
      } else {
        delete nextGoals[goalId];
      }

      return {
        ...prev,
        logsByDate: {
          ...prev.logsByDate,
          [today]: {
            ...current,
            goals: nextGoals,
          },
        },
      };
    });
  };

  const toggleDoneToday = (goalId: string) => {
    const current = todayLog.goals[goalId] || {};
    updateTodayLog(goalId, { done: !current.done });
  };

  const updateJournal = (patch: Partial<DailyJournal>) => {
    setData((prev) => {
      const current = prev.logsByDate[today] || EMPTY_DAILY_LOG;
      const nextJournal = { ...(current.journal || {}), ...patch };

      return {
        ...prev,
        logsByDate: {
          ...prev.logsByDate,
          [today]: {
            ...current,
            journal: nextJournal,
          },
        },
      };
    });
  };

  const setCompactSections = (section: CompactSection, enabled: boolean) => {
    setData((prev) => {
      const current = prev.preferences.compactSections;
      const next = enabled
        ? Array.from(new Set([...current, section]))
        : current.filter((s) => s !== section);

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          compactSections: next.length ? next : ["coach-quote"],
        },
      };
    });
  };

  const setPrimaryCategory = (
    cat: GoalsDataV2["preferences"]["primaryCategory"],
  ) => {
    setData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        primaryCategory: cat,
      },
    }));
  };

  const setCoachStyle = (style: CoachStyle) => {
    setData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        coachStyle: style,
      },
    }));
  };

  const setFocusMode = (mode: FocusMode) => {
    setData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        focusMode: mode,
      },
    }));
  };

  const compactSections = data.preferences.compactSections;

  const compactListGoals = useMemo(() => {
    const sorted = [...visibleGoals].sort((a, b) => b.createdAt - a.createdAt);
    return sorted.slice(0, density === "compact" ? 2 : 4);
  }, [density, visibleGoals]);

  const focusSummary = useMemo(() => {
    if (!focusGoal) return null;

    const entry = todayLog.goals[focusGoal.id] || {};
    const streak = computeStreak(focusGoal.id, data.logsByDate, today);
    const rate7 = compute7DayRate(focusGoal.id, data.logsByDate, today);
    const daysLeft = getDaysUntil(focusGoal.targetDate);

    if (focusGoal.metric.kind === "numeric") {
      const current = computeCurrentValue(focusGoal, data.logsByDate);
      const pct = computeProgressPercent(focusGoal, current);
      const unit = focusGoal.metric.unit;
      const start = focusGoal.metric.startValue;
      const target = focusGoal.metric.targetValue;

      const currentSafe = current ?? start;
      const remaining = target - currentSafe;
      const days = daysLeft ?? null;
      const perDay = days && days > 0 ? remaining / days : null;

      return {
        kind: "numeric" as const,
        done: !!entry.done,
        value: Number.isFinite(entry.value) ? Number(entry.value) : null,
        minutes: Number.isFinite(entry.minutes) ? Number(entry.minutes) : null,
        streak,
        rate7,
        daysLeft,
        pct: pct ?? 0,
        unit,
        currentValue: currentSafe,
        targetValue: target,
        pacePerDay: perDay,
      };
    }

    return {
      kind: "binary" as const,
      done: !!entry.done,
      minutes: Number.isFinite(entry.minutes) ? Number(entry.minutes) : null,
      streak,
      rate7,
      daysLeft,
    };
  }, [data.logsByDate, focusGoal, today, todayLog.goals]);

  const renderCoach = (mode: Density) => {
    const seed = `${storageKey}:${today}:${coachSignature}`;
    const content = coach || fallbackCoach(seed, data.preferences.coachStyle);

    if (mode === "compact") {
      return (
        <div className="space-y-1">
          <div className="text-[11px] text-foreground/70 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span className="font-semibold">Coach</span>
            {coachLoading && <span className="text-foreground/40">…</span>}
          </div>
          <div className="text-[11px] leading-snug text-foreground/80">
            “{content.quote}”
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI Daily Coach</span>
            </div>
            <div className="text-[11px] text-foreground/60">
              {content.focus}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {coachLoading && (
              <div className="text-[11px] text-foreground/50">Generating…</div>
            )}
            <button
              type="button"
              onClick={() => ensureCoach(true)}
              className="h-7 px-2 rounded-md border border-border/20 bg-foreground/5 text-foreground/70 hover:bg-foreground/10 text-[11px] inline-flex items-center gap-1"
              title="Regenerate coach"
            >
              <RefreshCw className="h-3 w-3" />
              New
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border/30 bg-background/40 p-2">
          <div className="text-[11px] leading-snug text-foreground/85">
            “{content.quote}”
          </div>
          <div className="mt-2 text-[11px] text-foreground/70 leading-snug">
            {content.microLesson}
          </div>
          {(content.mindsetShift || content.ifThenPlan) && (
            <div className="mt-2 grid gap-1">
              {content.mindsetShift && (
                <div className="text-[11px] text-foreground/70">
                  <span className="font-semibold text-foreground/80">
                    Mindset:
                  </span>{" "}
                  {content.mindsetShift}
                </div>
              )}
              {content.ifThenPlan && (
                <div className="text-[11px] text-foreground/70">
                  <span className="font-semibold text-foreground/80">
                    If/Then:
                  </span>{" "}
                  {content.ifThenPlan}
                </div>
              )}
            </div>
          )}
        </div>

        {content.actions?.length > 0 && (
          <div className="grid gap-1">
            {content.actions.slice(0, mode === "full" ? 6 : 3).map((a, idx) => (
              <div
                key={`${a}-${idx}`}
                className="text-[11px] text-foreground/75 flex items-start gap-2"
              >
                <span className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}

        {content.accountabilityPrompt && (
          <div className="rounded-lg border border-border/30 bg-background/40 p-2">
            <div className="text-[11px] text-foreground/80 font-semibold">
              Accountability
            </div>
            <div className="text-[11px] text-foreground/70 mt-1">
              {content.accountabilityPrompt}
            </div>
          </div>
        )}

        {coachError && (
          <div className="text-[10px] text-foreground/40">
            Coach fallback ({coachError})
          </div>
        )}
      </div>
    );
  };

  const renderFocusCard = (mode: Density) => {
    if (!focusGoal) {
      return (
        <div className="text-[11px] text-foreground/60">
          Add a goal to unlock the focus card.
        </div>
      );
    }

    const entry = todayLog.goals[focusGoal.id] || {};
    const daysLeft = getDaysUntil(focusGoal.targetDate);

    return (
      <div className="rounded-lg border border-border/30 bg-background/40 p-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="truncate">Focus: {focusGoal.title}</span>
            </div>
            <div className="text-[11px] text-foreground/60 flex items-center gap-2">
              <span className="capitalize">{focusGoal.category}</span>
              {daysLeft !== null && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDeadline(daysLeft)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="text-foreground/40 hover:text-foreground transition-colors"
            onClick={() => toggleDoneToday(focusGoal.id)}
            title={entry.done ? "Mark not done" : "Mark done"}
          >
            {entry.done ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </button>
        </div>

        {focusSummary?.kind === "numeric" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-foreground/70">
              <span>
                {formatValue(focusSummary.currentValue, focusSummary.unit)} /{" "}
                {formatValue(focusSummary.targetValue, focusSummary.unit)}
              </span>
              <span className="text-foreground/60">{focusSummary.pct}%</span>
            </div>
            <ProgressBar value={focusSummary.pct} />
            {mode !== "compact" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-foreground/60">
                  Today value
                  <input
                    inputMode="decimal"
                    value={
                      Number.isFinite(entry.value) ? String(entry.value) : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v.trim() === "" ? null : Number(v);
                      updateTodayLog(focusGoal.id, {
                        value:
                          n === null || !Number.isFinite(n) ? undefined : n,
                      });
                    }}
                    className="mt-1 w-full h-7 rounded-md border border-border/30 bg-background/60 px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
                    placeholder={focusSummary.unit}
                  />
                </label>
                <label className="text-[10px] text-foreground/60">
                  Minutes
                  <input
                    inputMode="numeric"
                    value={
                      Number.isFinite(entry.minutes)
                        ? String(entry.minutes)
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = v.trim() === "" ? null : Number(v);
                      updateTodayLog(focusGoal.id, {
                        minutes:
                          n === null || !Number.isFinite(n)
                            ? undefined
                            : Math.max(0, Math.round(n)),
                      });
                    }}
                    className="mt-1 w-full h-7 rounded-md border border-border/30 bg-background/60 px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
                    placeholder="0"
                  />
                </label>
              </div>
            )}
            {mode !== "compact" &&
              focusSummary.pacePerDay !== null &&
              daysLeft !== null &&
              daysLeft > 0 && (
                <div className="text-[11px] text-foreground/60">
                  Pace to hit target: {round2(focusSummary.pacePerDay)}{" "}
                  {focusSummary.unit}/day
                </div>
              )}
          </div>
        )}

        {focusSummary?.kind === "binary" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border/20 bg-background/60 p-2">
              <div className="text-[11px] font-semibold text-foreground">
                {focusSummary.streak}
              </div>
              <div className="text-[10px] text-foreground/60">Streak</div>
            </div>
            <div className="rounded-md border border-border/20 bg-background/60 p-2">
              <div className="text-[11px] font-semibold text-foreground">
                {focusSummary.rate7.total
                  ? `${focusSummary.rate7.done}/${focusSummary.rate7.total}`
                  : "—"}
              </div>
              <div className="text-[10px] text-foreground/60">Last 7 days</div>
            </div>
            <div className="rounded-md border border-border/20 bg-background/60 p-2">
              <div className="text-[11px] font-semibold text-foreground">
                {focusSummary.daysLeft === null
                  ? "—"
                  : formatDeadline(focusSummary.daysLeft)}
              </div>
              <div className="text-[10px] text-foreground/60">Timeline</div>
            </div>
          </div>
        )}

        {mode !== "compact" && (
          <label className="text-[10px] text-foreground/60 block">
            Today note
            <input
              value={entry.note || ""}
              onChange={(e) =>
                updateTodayLog(focusGoal.id, { note: e.target.value })
              }
              className="mt-1 w-full h-7 rounded-md border border-border/30 bg-background/60 px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
              placeholder="What did you do? What’s next?"
            />
          </label>
        )}
      </div>
    );
  };

  const renderGoalsList = (mode: Density) => {
    const list = mode === "compact" ? compactListGoals : visibleGoals;

    if (goals.length === 0) {
      return (
        <div className="text-[11px] text-foreground/60">
          Add a goal to start receiving personalized motivation and daily
          training.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-foreground">Goals</div>
          <div className="text-[11px] text-foreground/60">{progressText}</div>
        </div>

        <div className="space-y-2">
          {list.map((g) => {
            const entry = todayLog.goals[g.id] || {};
            const days = getDaysUntil(g.targetDate);
            const deadlineText = formatDeadline(days);
            const isFocus = focusGoal?.id === g.id;

            let subtitle = `${g.category}`;
            let progressPct: number | null = null;
            let rightMeta = deadlineText;

            if (g.metric.kind === "numeric") {
              const current =
                computeCurrentValue(g, data.logsByDate) ?? g.metric.startValue;
              progressPct = computeProgressPercent(g, current);
              subtitle = `${g.category} • ${formatValue(current, g.metric.unit)} → ${formatValue(g.metric.targetValue, g.metric.unit)}`;
              rightMeta =
                progressPct === null ? deadlineText : `${progressPct}%`;
            }

            return (
              <div
                key={g.id}
                className={cn(
                  "rounded-lg border border-border/30 bg-background/40 p-2",
                  (entry.done || Number.isFinite(entry.value)) &&
                    "border-primary/40 bg-primary/10",
                  isFocus && "ring-1 ring-yellow-400/40 border-yellow-400/30",
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggleDoneToday(g.id)}
                    className={cn(
                      "mt-[1px] text-foreground/60 hover:text-foreground transition-colors",
                      (entry.done || Number.isFinite(entry.value)) &&
                        "text-primary",
                    )}
                    title={
                      entry.done || Number.isFinite(entry.value)
                        ? "Mark not done"
                        : "Mark done"
                    }
                  >
                    {entry.done || Number.isFinite(entry.value) ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium text-foreground truncate">
                          {g.title}
                        </div>
                        <div className="text-[10px] text-foreground/55 truncate">
                          {subtitle}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {mode !== "compact" && (
                          <button
                            type="button"
                            onClick={() => setFocusGoalId(g.id)}
                            className={cn(
                              "text-foreground/40 hover:text-yellow-400 transition-colors",
                              isFocus && "text-yellow-400",
                            )}
                            title="Set focus goal"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}

                        {mode !== "compact" && (
                          <button
                            type="button"
                            onClick={() => archiveGoal(g.id)}
                            className="text-foreground/40 hover:text-red-500 transition-colors"
                            title="Archive goal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        {rightMeta && (
                          <div className="text-[10px] text-foreground/55 whitespace-nowrap">
                            {rightMeta}
                          </div>
                        )}
                      </div>
                    </div>

                    {progressPct !== null && (
                      <div className="mt-2">
                        <ProgressBar value={progressPct} />
                      </div>
                    )}

                    {mode === "full" && (
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-[10px] text-foreground/55">
                          Target
                        </label>
                        <input
                          type="date"
                          value={g.targetDate || ""}
                          onChange={(e) =>
                            updateGoalTargetDate(g.id, e.target.value)
                          }
                          className="h-7 rounded-md border border-border/30 bg-background/60 px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
                        />
                        {g.metric.kind === "numeric" && (
                          <div className="ml-auto text-[10px] text-foreground/55">
                            Cadence: {g.metric.cadence}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const categoryTabs = (
    <div className="flex items-center gap-1">
      {(
        [
          ["all", "All"],
          ["personal", "Personal"],
          ["work", "Work"],
          ["team", "Team"],
        ] as Array<[GoalsDataV2["preferences"]["primaryCategory"], string]>
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setPrimaryCategory(key)}
          className={cn(
            "h-7 px-2 rounded-md text-[11px] transition-colors",
            activeCategory === key
              ? "bg-primary/25 text-primary border border-primary/30"
              : "bg-foreground/5 text-foreground/65 hover:bg-foreground/10 border border-border/20",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const settingsPanel = (
    <div className="rounded-lg border border-border/30 bg-background/40 p-2 space-y-3">
      <div className="text-xs font-semibold text-foreground">Settings</div>

      <div className="grid gap-2">
        <div className="text-[11px] text-foreground/70 font-semibold">
          Coach style
        </div>
        <div className="flex gap-1">
          {(
            [
              ["tactical", "Tactical"],
              ["encouraging", "Encouraging"],
              ["direct", "Direct"],
            ] as Array<[CoachStyle, string]>
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setCoachStyle(k)}
              className={cn(
                "h-7 px-2 rounded-md text-[11px] transition-colors border",
                data.preferences.coachStyle === k
                  ? "bg-primary/25 text-primary border-primary/30"
                  : "bg-foreground/5 text-foreground/65 hover:bg-foreground/10 border-border/20",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="text-[11px] text-foreground/70 font-semibold">
          Compact view
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["coach-quote", "Coach quote"],
              ["focus-goal", "Focus goal"],
              ["top-goals", "Top goals"],
              ["progress", "Progress"],
              ["actions", "Next actions"],
            ] as Array<[CompactSection, string]>
          ).map(([key, label]) => {
            const checked = compactSections.includes(key);
            return (
              <label
                key={key}
                className="flex items-center gap-2 text-[11px] text-foreground/70"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setCompactSections(key, e.target.checked)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-foreground/70">Goal mode</div>
          <div className="flex gap-1">
            {(
              [
                ["focus", "Focus"],
                ["top", "Top"],
              ] as Array<[FocusMode, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFocusMode(k)}
                className={cn(
                  "h-7 px-2 rounded-md text-[11px] transition-colors border",
                  data.preferences.focusMode === k
                    ? "bg-primary/25 text-primary border-primary/30"
                    : "bg-foreground/5 text-foreground/65 hover:bg-foreground/10 border-border/20",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-foreground/70">Focus goal</div>
          <select
            value={data.preferences.focusGoalId || ""}
            onChange={(e) => setFocusGoalId(e.target.value)}
            className="h-7 rounded-md border border-border/30 bg-background/60 px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
          >
            <option value="" disabled>
              Select…
            </option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="text-[11px] text-foreground/70 font-semibold">
          Daily journal
        </div>
        <input
          value={todayLog.journal?.win || ""}
          onChange={(e) => updateJournal({ win: e.target.value })}
          className="h-7 rounded-md border border-border/30 bg-background/60 px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
          placeholder="Win of the day"
        />
        <input
          value={todayLog.journal?.blocker || ""}
          onChange={(e) => updateJournal({ blocker: e.target.value })}
          className="h-7 rounded-md border border-border/30 bg-background/60 px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
          placeholder="Biggest blocker"
        />
        <input
          value={todayLog.journal?.gratitude || ""}
          onChange={(e) => updateJournal({ gratitude: e.target.value })}
          className="h-7 rounded-md border border-border/30 bg-background/60 px-2 text-[11px] text-foreground outline-none focus:border-primary/50"
          placeholder="Gratitude"
        />
      </div>
    </div>
  );

  const compactBody = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-foreground">Today</div>
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="text-foreground/50 hover:text-foreground transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {showSettings && settingsPanel}

      {compactSections.includes("coach-quote") && renderCoach("compact")}

      {compactSections.includes("progress") && (
        <div className="rounded-lg border border-border/30 bg-background/40 p-2">
          <div className="text-[11px] text-foreground/70">{progressText}</div>
        </div>
      )}

      {compactSections.includes("focus-goal") &&
        data.preferences.focusMode === "focus" &&
        renderFocusCard("compact")}

      {compactSections.includes("top-goals") &&
        (data.preferences.focusMode === "top" ||
          !compactSections.includes("focus-goal")) &&
        renderGoalsList("compact")}

      {compactSections.includes("actions") && coach?.actions?.length ? (
        <div className="rounded-lg border border-border/30 bg-background/40 p-2 space-y-1">
          <div className="text-[11px] font-semibold text-foreground/80">
            Next actions
          </div>
          {coach.actions.slice(0, 3).map((a, idx) => (
            <div key={`${a}-${idx}`} className="text-[11px] text-foreground/70">
              • {a}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const addPanel = (
    <div className="rounded-lg border border-border/30 bg-background/40 p-2 space-y-2">
      <div className="text-xs font-semibold text-foreground">New goal</div>
      <div className="grid gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Example: Work-life balance"
          className="h-8 rounded-md border border-border/30 bg-background/60 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as GoalCategory)}
            className="h-8 rounded-md border border-border/30 bg-background/60 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
          >
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="team">Team</option>
          </select>

          <input
            type="date"
            value={newTargetDate}
            onChange={(e) => setNewTargetDate(e.target.value)}
            className="h-8 rounded-md border border-border/30 bg-background/60 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={newMetricKind}
            onChange={(e) => setNewMetricKind(e.target.value as GoalMetricKind)}
            className="h-8 rounded-md border border-border/30 bg-background/60 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
          >
            <option value="binary">Habit (done/not done)</option>
            <option value="numeric">Metric (number)</option>
          </select>

          <select
            value={newCadence}
            onChange={(e) => setNewCadence(e.target.value as GoalCadence)}
            className="h-8 rounded-md border border-border/30 bg-background/60 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        {newMetricKind === "numeric" && (
          <div className="grid grid-cols-3 gap-2">
            <input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="h-8 rounded-md border border-border/30 bg-background/60 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
              placeholder="units"
            />
            <input
              inputMode="decimal"
              value={newStartValue}
              onChange={(e) => setNewStartValue(e.target.value)}
              className="h-8 rounded-md border border-border/30 bg-background/60 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
              placeholder="start"
            />
            <input
              inputMode="decimal"
              value={newTargetValue}
              onChange={(e) => setNewTargetValue(e.target.value)}
              className="h-8 rounded-md border border-border/30 bg-background/60 px-2 text-[12px] text-foreground outline-none focus:border-primary/50"
              placeholder="target"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="h-8 px-3 rounded-md bg-foreground/5 text-foreground/70 hover:bg-foreground/10 border border-border/20 text-[12px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={addGoal}
            className="h-8 px-3 rounded-md bg-primary/30 text-foreground hover:bg-primary/40 border border-primary/20 text-[12px] font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  const fullBody = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {categoryTabs}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setShowAdd((v) => !v);
              setShowSettings(false);
            }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border/20 bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
            title="Add goal"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSettings((v) => !v);
              setShowAdd(false);
            }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border/20 bg-foreground/5 text-foreground/70 hover:bg-foreground/10"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showSettings && settingsPanel}
      {showAdd && addPanel}

      <div
        className={cn(
          "grid gap-3",
          density === "full" ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <div className="space-y-3">
          {renderCoach(density)}
          {renderFocusCard(density)}
        </div>
        <div className="space-y-3">{renderGoalsList(density)}</div>
      </div>
    </div>
  );

  return (
    <DashboardWidget
      showHeader={showHeader}
      minimized={minimized}
      onMinimize={onMinimize}
      onPin={onPin}
      onDetach={onDetach}
      isPinned={isPinned}
      title={title || "Daily Goals Tracker"}
      icon={icon || "🎯"}
      widgetId={widgetId}
    >
      <div ref={rootRef} className="w-full h-full">
        {density === "compact" ? compactBody : fullBody}
      </div>
    </DashboardWidget>
  );
}
