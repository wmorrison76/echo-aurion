import type { Request, Response } from "express";
import type { RequestHandler } from "express";
import fs from "fs";
import path from "path";
const ROOT = process.cwd();
const INCLUDE_DIRS = ["client", "server", "shared"];
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".vercel",
  ".netlify",
]);
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".md",
  ".html",
  ".htm",
  ".txt",
  ".toml",
  ".yml",
  ".yaml",
]);
function walk(dir: string, out: string[] = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (IGNORE_DIRS.has(name)) continue;
      walk(full, out);
    } else {
      const ext = path.extname(name).toLowerCase();
      if (TEXT_EXT.has(ext)) out.push("/" + rel);
    }
  }
  return out;
}
const ALL_FILES = (() => {
  const files: string[] = [];
  for (const d of INCLUDE_DIRS) {
    const dir = path.join(ROOT, d);
    if (fs.existsSync(dir)) walk(dir, files);
  }
  const extra = [
    "README.md",
    "readme.md",
    "package.json",
    "tsconfig.json",
    "tailwind.config.ts",
    "postcss.config.js",
    "netlify.toml",
    "vite.config.ts",
    "vite.config.server.ts",
    "index.html",
  ];
  for (const f of extra) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) files.push("/" + f);
  }
  return files;
})();
export const handleSearch: RequestHandler = async (req, res) => {
  const q = String(req.query.q || "");
  if (!q || q.length < 2) {
    res.json({ results: [] });
    return;
  }
  const results: {
    path: string;
    line: number;
    column: number;
    preview: string;
  }[] = [];
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  for (const rel of ALL_FILES) {
    try {
      const abs = path.join(ROOT, rel.replace(/^\//, ""));
      const text = fs.readFileSync(abs, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((ln, i) => {
        const m = ln.match(re);
        if (m) {
          results.push({
            path: rel,
            line: i + 1,
            column: (m.index || 0) + 1,
            preview: ln.trim(),
          });
        }
      });
    } catch {}
    if (results.length > 500) break;
  }
  res.json({ results: results.slice(0, 500) });
};
