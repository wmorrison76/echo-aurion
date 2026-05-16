/**
 * LUCCCA Diagnostic Harness — Layer 5: Merge static + crawler into a single HTML report
 * Reads audit/static-report.json and audit/crawler-results.json.
 * Output: audit/report.html
 */

import * as path from "path";
import * as fs from "fs";

const PROJECT_ROOT = process.cwd();
const AUDIT_DIR = path.join(PROJECT_ROOT, "audit");
const STATIC_PATH = path.join(AUDIT_DIR, "static-report.json");
const CRAWLER_PATH = path.join(AUDIT_DIR, "crawler-results.json");

interface StaticFinding {
  severity: string;
  category: string;
  file: string;
  message: string;
  suggestion?: string;
}

interface StaticReport {
  timestamp?: string;
  totalPanels?: number;
  findings?: StaticFinding[];
  summary?: { P0?: number; P1?: number; P2?: number };
}

interface CrawlResult {
  id: string;
  status: string;
  cause?: string;
  suggestion?: string;
  screenshot?: string;
  eventsExcerpt?: string;
  durationMs?: number;
}

interface CrawlerReport {
  timestamp?: string;
  baseUrl?: string;
  total?: number;
  mounted?: number;
  failed?: number;
  byStatus?: Record<string, number>;
  results?: CrawlResult[];
}

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function main(): void {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const staticReport = loadJson<StaticReport>(STATIC_PATH, {
    findings: [],
    summary: { P0: 0, P1: 0, P2: 0 },
    totalPanels: 0,
  });
  const crawlerReport = loadJson<CrawlerReport>(CRAWLER_PATH, {
    results: [],
    total: 0,
    mounted: 0,
    failed: 0,
    byStatus: {},
  });

  const findings = staticReport.findings ?? [];
  const results = crawlerReport.results ?? [];
  const p0 = staticReport.summary?.P0 ?? 0;
  const mounted = crawlerReport.mounted ?? 0;
  const failed = crawlerReport.failed ?? 0;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LUCCCA Diagnostic Report</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --text: #e2e8f0; --muted: #94a3b8; --ok: #22c55e; --warn: #eab308; --err: #ef4444; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 1.5rem; line-height: 1.5; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .meta { color: var(--muted); font-size: 0.875rem; margin-bottom: 1.5rem; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--card); border-radius: 8px; padding: 1rem; text-align: center; }
    .card .value { font-size: 1.75rem; font-weight: 700; }
    .card .label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; margin-top: 0.25rem; }
    .card.ok .value { color: var(--ok); }
    .card.warn .value { color: var(--warn); }
    .card.err .value { color: var(--err); }
    section { margin-bottom: 2rem; }
    section h2 { font-size: 1.125rem; margin-bottom: 0.75rem; color: var(--muted); }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--card); }
    th { color: var(--muted); font-weight: 600; }
    .status { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
    .status.mounted { background: rgba(34,197,94,0.2); color: var(--ok); }
    .status.crashed, .status.import-failed { background: rgba(239,68,68,0.2); color: var(--err); }
    .status.hung, .status.timeout, .status.no-diag { background: rgba(234,179,8,0.2); color: var(--warn); }
    .status.invisible { background: rgba(148,163,184,0.2); color: var(--muted); }
    .module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .module-card { background: var(--card); border-radius: 8px; padding: 1rem; font-size: 0.875rem; }
    .module-card h3 { margin: 0 0 0.5rem; font-size: 1rem; }
    .module-card .cause { color: var(--muted); margin-top: 0.5rem; }
    .module-card img { max-width: 100%; border-radius: 4px; margin-top: 0.5rem; }
    .severity-P0 { color: var(--err); }
    .severity-P1 { color: var(--warn); }
    .severity-P2 { color: var(--muted); }
  </style>
</head>
<body>
  <h1>LUCCCA Diagnostic Report</h1>
  <p class="meta">Generated ${new Date().toISOString()} | Static: ${STATIC_PATH} | Crawler: ${CRAWLER_PATH}</p>

  <div class="cards">
    <div class="card ${p0 > 0 ? "err" : "ok"}"><div class="value">${staticReport.summary?.P0 ?? 0}</div><div class="label">Static P0</div></div>
    <div class="card"><div class="value">${staticReport.summary?.P1 ?? 0}</div><div class="label">Static P1</div></div>
    <div class="card"><div class="value">${staticReport.summary?.P2 ?? 0}</div><div class="label">Static P2</div></div>
    <div class="card ok"><div class="value">${mounted}</div><div class="label">Panels mounted</div></div>
    <div class="card ${failed > 0 ? "warn" : "ok"}"><div class="value">${failed}</div><div class="label">Crawl failed</div></div>
  </div>

  <section>
    <h2>Per-module crawl results</h2>
    <div class="module-grid">
`;

  for (const r of results) {
    const statusClass = r.status === "mounted" ? "mounted" : r.status;
    html += `
      <div class="module-card">
        <h3>${escapeHtml(r.id)}</h3>
        <span class="status ${statusClass}">${escapeHtml(r.status)}</span>
        ${r.cause ? `<p class="cause">${escapeHtml(r.cause)}</p>` : ""}
        ${r.screenshot ? `<img src="${escapeHtml(r.screenshot)}" alt="${escapeHtml(r.id)}" width="240" />` : ""}
      </div>`;
  }

  html += `
    </div>
  </section>

  <section>
    <h2>Static findings</h2>
    <table>
      <thead><tr><th>Severity</th><th>Category</th><th>File</th><th>Message</th><th>Suggestion</th></tr></thead>
      <tbody>`;

  for (const f of findings) {
    html += `
        <tr>
          <td class="severity-${escapeHtml(f.severity)}">${escapeHtml(f.severity)}</td>
          <td>${escapeHtml(f.category)}</td>
          <td>${escapeHtml(f.file)}</td>
          <td>${escapeHtml(f.message)}</td>
          <td>${f.suggestion ? escapeHtml(f.suggestion) : ""}</td>
        </tr>`;
  }

  html += `
      </tbody>
    </table>
  </section>
</body>
</html>`;

  const outPath = path.join(AUDIT_DIR, "report.html");
  fs.writeFileSync(outPath, html);
  console.log(`Merged report written to ${outPath}`);
}

main();
