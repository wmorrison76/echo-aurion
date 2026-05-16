export type AutomationTaskStatus =
  | "queued"
  | "placeholder"
  | "running"
  | "completed"
  | "failed";

export interface AutomationTask {
  id: string;
  title: string;
  description?: string;
  slug: string;
  status: AutomationTaskStatus;
  route: string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown> | null;
}

const VALID_STATUSES: ReadonlySet<AutomationTaskStatus> = new Set([
  "queued",
  "placeholder",
  "running",
  "completed",
  "failed",
]);

type FetchOptions = {
  signal?: AbortSignal;
};

function normalizeAutomationTask(raw: unknown): AutomationTask | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  const statusRaw = typeof value.status === "string" ? value.status.trim() : "placeholder";
  const status = (VALID_STATUSES.has(statusRaw as AutomationTaskStatus)
    ? statusRaw
    : "placeholder") as AutomationTaskStatus;
  const routeCandidate = typeof value.route === "string" ? value.route.trim() : "";
  const route = routeCandidate || (slug ? `/automation/${slug}` : "");

  if (!id || !title || !slug || !route) {
    return null;
  }

  const description = typeof value.description === "string" ? value.description : undefined;
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : undefined;
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : undefined;
  const metadata =
    value.metadata && typeof value.metadata === "object"
      ? (value.metadata as Record<string, unknown>)
      : null;

  return {
    id,
    title,
    description,
    slug,
    status,
    route,
    createdAt,
    updatedAt,
    metadata,
  };
}

export async function fetchAutomationTasks(options: FetchOptions = {}): Promise<AutomationTask[]> {
  const response = await fetch("/api/automation/tasks", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: options.signal,
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Failed to load automation tasks (${response.status})`;
    throw new Error(message);
  }

  const rawTasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  const tasks: AutomationTask[] = [];

  for (const entry of rawTasks) {
    const normalized = normalizeAutomationTask(entry);
    if (normalized) {
      tasks.push(normalized);
    }
  }

  return tasks;
}

export const automationTasksQueryKey = ["automation", "tasks"] as const;
