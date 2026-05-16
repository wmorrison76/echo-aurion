/**
 * Generate repair/correction/upgrade TODO list from run failures.
 * Writes REPAIR_TODO_*.md and .json for follow-up fixes.
 */

import fs from "fs";
import path from "path";
import { PATHS, TODO_PREFIX } from "./config.ts";
import type { TestFailure } from "./runner.ts";

export interface TodoItem {
  category: "repair" | "correction" | "upgrade";
  module?: string;
  file?: string;
  suite?: string;
  test?: string;
  description: string;
  suggestedAction: string;
}

function reportDir(): string {
  const d = PATHS.reportDir;
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function todoBasename(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "-");
  return `${TODO_PREFIX}_${date}_${time}`;
}

/** Map failure to TODO item with suggested action. */
function failureToTodo(f: TestFailure): TodoItem {
  const module = f.file?.split("/").find((_, i, a) => a[i - 1] === "modules") ?? f.file?.split("/")[0];
  let suggested = "Fix assertion or implementation.";
  if (f.category === "repair") suggested = "Fix broken behavior (bug).";
  if (f.category === "correction") suggested = "Correct test expectation or code under test.";
  if (f.category === "upgrade") suggested = "Upgrade implementation to meet contract or performance.";
  return {
    category: f.category,
    module,
    file: f.file,
    suite: f.suite,
    test: f.test,
    description: f.message,
    suggestedAction: suggested,
  };
}

export function generateTodo(failures: TestFailure[]): TodoItem[] {
  return failures.map(failureToTodo);
}

export function writeTodoList(items: TodoItem[]): { mdPath: string; jsonPath: string } {
  const dir = reportDir();
  const base = todoBasename();
  const mdPath = path.join(dir, `${base}.md`);
  const jsonPath = path.join(dir, `${base}.json`);

  const byCategory = { repair: [] as TodoItem[], correction: [] as TodoItem[], upgrade: [] as TodoItem[] };
  for (const i of items) byCategory[i.category].push(i);

  const md = [
    "# Repair / Correction / Upgrade TODO",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Total items: ${items.length}`,
    "",
    "## Repair (broken behavior)",
    ...byCategory.repair.map((i) => `- [ ] **${i.module ?? i.file ?? "?"}** ${i.description}\n  - ${i.suggestedAction}`),
    "",
    "## Correction (wrong expectation or implementation)",
    ...byCategory.correction.map((i) => `- [ ] **${i.module ?? i.file ?? "?"}** ${i.suite ?? ""} ${i.test ?? ""}: ${i.description}\n  - ${i.suggestedAction}`),
    "",
    "## Upgrade (improve to meet contract/performance)",
    ...byCategory.upgrade.map((i) => `- [ ] **${i.module ?? i.file ?? "?"}** ${i.description}\n  - ${i.suggestedAction}`),
    "",
  ].join("\n");

  fs.writeFileSync(mdPath, md, "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2), "utf-8");

  process.stdout.write(`\n📋 TODO list: ${mdPath}\n`);
  return { mdPath, jsonPath };
}
