#!/usr/bin/env node
// Adds `export { default } from "..."` to index barrels that only had `export * from "..."`
// when their targets actually have a default export (directly or via one hop).
const fs = require("fs");
const path = require("path");

const EXTS = [".ts", ".tsx", ".js", ".jsx"];
const WRITE = process.argv.includes("--write");
const scopeIdx = process.argv.indexOf("--scope");
const SCOPE = scopeIdx > -1 ? process.argv[scopeIdx + 1] : ".";

const root = process.cwd();
const startDir = path.resolve(root, SCOPE);

let tsBase = root, tsPaths = [];
try {
  const ts = JSON.parse(fs.readFileSync(path.join(root, "tsconfig.json"), "utf8"));
  const c = ts.compilerOptions || {};
  tsBase = path.resolve(root, c.baseUrl || ".");
  const paths = c.paths || {};
  tsPaths = Object.entries(paths).map(([alias, arr]) => ({
    alias: alias.replace(/\*$/, ""),
    targets: arr.map(p => p.replace(/\*$/, "")),
  }));
} catch {}

const starLine = /^\s*export\s*\*\s*from\s*['"](.+?)['"]\s*;?\s*$/gm;
const hasDefaultReExport = (src, spec) =>
  new RegExp(`export\\s*\\{\\s*default\\s*(?:as\\s+\\w+)?\\s*\\}\\s*from\\s*['"]${spec}['"]`).test(src);

function resolveWithAliases(spec) {
  for (const m of tsPaths) {
    if (spec.startsWith(m.alias)) {
      const tail = spec.slice(m.alias.length);
      for (const t of m.targets) {
        const found = resolveFile(path.join(tsBase, t + tail));
        if (found) return found;
      }
    }
  }
  return null;
}
function resolveFile(baseNoExt) {
  for (const ext of EXTS) {
    const f = baseNoExt + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  for (const ext of EXTS) {
    const f = path.join(baseNoExt, "index" + ext);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}
function resolveTarget(fromFile, spec) {
  if (spec.startsWith(".")) return resolveFile(path.resolve(path.dirname(fromFile), spec));
  const aliased = resolveWithAliases(spec);
  return aliased || null;
}
const fileHasDefault = f => { try { return /export\s+default\b/.test(fs.readFileSync(f,"utf8")); } catch { return false; } };

function findDefaultByOneHop(file) {
  try {
    const src = fs.readFileSync(file, "utf8"); let m;
    while ((m = starLine.exec(src))) {
      const spec = m[1];
      const t = resolveTarget(file, spec);
      if (t && fileHasDefault(t)) return { spec, file: t };
    }
  } catch {}
  return null;
}

const changed = [];
function processBarrel(file) {
  const src = fs.readFileSync(file, "utf8");
  if (/export\s+default\b/.test(src) || /export\s*\{\s*default\b/.test(src)) return;

  const specs = [...src.matchAll(starLine)].map(m => m[1]);
  if (specs.length === 0) return;

  let patchLines = [];
  for (const spec of specs) {
    if (hasDefaultReExport(src, spec)) continue;
    const target = resolveTarget(file, spec);
    if (!target) continue;

    if (fileHasDefault(target)) {
      patchLines.push(`export { default } from "${spec}";`);
    } else {
      const hop = findDefaultByOneHop(target);
      if (hop) patchLines.push(`export { default } from "${spec}";`);
    }
  }
  if (patchLines.length === 0) return;

  const out = patchLines.join("\n") + "\n" + src;
  if (WRITE) fs.writeFileSync(file, out, "utf8");
  changed.push(file);
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    if (["node_modules","dist",".next","build","out"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (EXTS.includes(path.extname(ent.name)) && /^index\.(t|j)sx?$/.test(ent.name)) {
      processBarrel(p);
    }
  }
}

console.log(`Scanning ${startDir} … (write=${WRITE ? "yes" : "no"})`);
walk(startDir);
if (changed.length) {
  console.log((WRITE ? "Updated" : "Would update") + " barrels:");
  changed.forEach(f => console.log(" - " + path.relative(root, f)));
} else {
  console.log("No barrels needed patching ✅");
}
