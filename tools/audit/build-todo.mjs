import fs from "node:fs";
import path from "node:path";

function pickTopErrors(report) {
  const items = [];
  const panels = report?.panels ?? {};
  for (const [key, v] of Object.entries(panels)) {
    const loader = v?.loader;
    const render = v?.render;
    if (loader && loader.ok === false) {
      items.push({ p: 0, key, kind: "loader", msg: loader.error?.message ?? "Loader failed", stack: loader.error?.stack });
      continue;
    }
    if (render && render.ok === false) {
      items.push({ p: 0, key, kind: "render", msg: render.error?.message ?? "Render failed", stack: render.error?.stack, componentStack: render.error?.componentStack });
      continue;
    }
    if (v?.notes?.length) {
      items.push({ p: 1, key, kind: "note", msg: v.notes.join(", ") });
    }
  }
  items.sort((a, b) => a.p - b.p || a.key.localeCompare(b.key));
  return items;
}

function mdEscape(s = "") {
  return String(s).replace(/\r/g, "");
}

export function writeTodoFromDiagJson(diagJsonPath, outDir = "audit") {
  const raw = fs.readFileSync(diagJsonPath, "utf8");
  const report = JSON.parse(raw);

  const items = pickTopErrors(report);

  const lines = [];
  lines.push(`# LUCCCA Diagnostic TODO`);
  lines.push(``);
  lines.push(`Run href: ${mdEscape(report.href ?? "")}`);
  lines.push(`Started: ${new Date(report.startedAt).toISOString()}`);
  if (report.finishedAt) lines.push(`Finished: ${new Date(report.finishedAt).toISOString()}`);
  lines.push(``);
  lines.push(`## Failures / Actions`);
  lines.push(``);

  if (!items.length) {
    lines.push(`✅ No failures detected in this run.`);
  } else {
    for (const it of items) {
      const prio = it.p === 0 ? "P0" : it.p === 1 ? "P1" : "P2";
      lines.push(`- **${prio}** **${it.key}** (${it.kind}) — ${mdEscape(it.msg)}`);
      if (it.componentStack) {
        lines.push(`  - Component stack:`);
        lines.push(``);
        lines.push("```");
        lines.push(mdEscape(it.componentStack));
        lines.push("```");
      }
      if (it.stack) {
        lines.push(`  - Stack:`);
        lines.push(``);
        lines.push("```");
        lines.push(mdEscape(it.stack));
        lines.push("```");
      }
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "TODO.md"), lines.join("\n"), "utf8");
  fs.writeFileSync(path.join(outDir, "diag-report.json"), JSON.stringify(report, null, 2), "utf8");
}

if (process.argv[1] && process.argv[1].endsWith("build-todo.mjs")) {
  const diagPath = process.argv[2];
  if (!diagPath) {
    console.error("Usage: node tools/audit/build-todo.mjs <path-to-diag-report.json>");
    process.exit(1);
  }
  writeTodoFromDiagJson(diagPath);
  console.log("Wrote audit/TODO.md and audit/diag-report.json");
}
