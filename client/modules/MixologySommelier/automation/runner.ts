import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
export interface AutomationTaskInput {
  title: string;
  description?: string;
}
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
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
export interface AutomationOptions {
  runTests?: boolean;
  label?: string;
}
export interface AutomationResult {
  ok: true;
  tasks: AutomationTask[];
  summary: string[];
  tests?: TestResult[];
}
export interface TestResult {
  command: string;
  status: "success" | "failed";
  output: string;
}
const DATA_DIR = path.resolve(process.cwd(), "automation");
const TASKS_PATH = path.join(DATA_DIR, "generated-tasks.json");
let automationLock = false;
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}
async function readTasksFile(): Promise<AutomationTask[]> {
  try {
    const raw = await fs.readFile(TASKS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as AutomationTask[];
    }
    return [];
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
async function writeTasksFile(tasks: AutomationTask[]) {
  await ensureDataDir();
  await fs.writeFile(TASKS_PATH, JSON.stringify(tasks, null, 2), "utf8");
}
function slugify(value: string, existing: Set<string>): string {
  const base =
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 60) || "task";
  if (!existing.has(base)) {
    existing.add(base);
    return base;
  }
  let i = 2;
  while (existing.has(`${base}-${i}`)) {
    i += 1;
  }
  const slug = `${base}-${i}`;
  existing.add(slug);
  return slug;
}
export async function listAutomationTasks(): Promise<AutomationTask[]> {
  return readTasksFile();
}
function normalizeTaskInputs(
  inputs: AutomationTaskInput[],
): AutomationTaskInput[] {
  return inputs
    .map((input) => ({
      title: input.title?.trim() ?? "",
      description: input.description?.trim() || undefined,
    }))
    .filter((item) => item.title.length > 0);
}
async function runCommand(
  command: string,
  args: string[],
): Promise<TestResult> {
  const { spawn } = await import("node:child_process");
  return new Promise<TestResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      shell: process.platform === "win32",
    });
    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({
        command: `${command} ${args.join("")}`.trim(),
        status: code === 0 ? "success" : "failed",
        output: output.trim(),
      });
    });
    child.on("error", (error) => {
      resolve({
        command: `${command} ${args.join("")}`.trim(),
        status: "failed",
        output: error?.message || String(error),
      });
    });
  });
}
export async function processAutomationTasks(
  inputs: AutomationTaskInput[],
  options: AutomationOptions = {},
): Promise<AutomationResult> {
  if (automationLock) {
    throw new Error("An automation run is already in progress");
  }
  automationLock = true;
  try {
    const normalized = normalizeTaskInputs(inputs);
    if (normalized.length === 0) {
      throw new Error("No valid tasks provided");
    }
    await ensureDataDir();
    const existing = await readTasksFile();
    const existingSlugs = new Set(existing.map((task) => task.slug));
    const timestamp = new Date().toISOString();
    const newTasks: AutomationTask[] = normalized.map((input) => {
      const slug = slugify(input.title, existingSlugs);
      return {
        id: randomUUID(),
        title: input.title,
        description: input.description,
        slug,
        status: "placeholder",
        route: `/automation/${slug}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        metadata: { label: options.label ?? null },
      };
    });
    const merged = [...existing, ...newTasks];
    await writeTasksFile(merged);
    const summary: string[] = newTasks.map(
      (task, index) =>
        `${index + 1}. ${task.title} → ${task.route} (${task.status})`,
    );
    const tests: TestResult[] = [];
    if (options.runTests) {
      tests.push(await runCommand("pnpm", ["test", "--", "--runInBand"]));
      tests.push(await runCommand("pnpm", ["typecheck"]));
    }
    return { ok: true, tasks: merged, summary, tests };
  } finally {
    automationLock = false;
  }
}
export async function parseTasksFromText(
  raw: string,
): Promise<AutomationTaskInput[]> {
  const trimmed = raw.trim();
  if (!trimmed) return []; // Support JSON array input if (trimmed.startsWith("[") && trimmed.endsWith("]")) { const parsed = JSON.parse(trimmed); if (!Array.isArray(parsed)) return []; const results: AutomationTaskInput[] = []; for (const entry of parsed) { if (typeof entry ==="string") { const title = entry.trim(); if (title) { results.push({ title }); } continue; } if (entry && typeof entry ==="object") { const title = String((entry as any).title ??"").trim(); if (!title) continue; const descriptionRaw = (entry as any).description; const description = descriptionRaw ? String(descriptionRaw).trim() || undefined : undefined; results.push({ title, description }); } } return results; } const lines = trimmed.split(/\r?\n/).map((line) => line.trim()); const tasks: AutomationTaskInput[] = []; let current: AutomationTaskInput | null = null; const taskHeader = /^(task\s*\d+|step\s*\d+|card\s*\d+)/i; const delimiter = /\s*[—\-:\u2013]\s*/; // hyphen, em dash, colon for (const line of lines) { if (!line) continue; if (taskHeader.test(line)) { if (current && current.title.trim()) { tasks.push({ title: current.title.trim(), description: current.description?.trim() || undefined, }); } const stripped = line.replace(taskHeader,"").trim(); const parts = stripped.split(delimiter); const rawTitle = parts.shift()?.trim() ?? stripped; const title = rawTitle.trim(); const descriptionValue = parts.join(" -").trim(); current = title ? { title, description: descriptionValue || undefined, } : null; continue; } if (!current) { current = { title: line }; continue; } current.description = current.description ? `${current.description}\n${line}` : line; } if (current && current.title.trim()) { tasks.push({ title: current.title.trim(), description: current.description?.trim() || undefined, }); } if (tasks.length === 0) { // fallback: treat each non-empty line as a task title return lines .filter(Boolean) .map((title) => title.trim()) .filter(Boolean) .map((title) => ({ title })); } return tasks;
}
