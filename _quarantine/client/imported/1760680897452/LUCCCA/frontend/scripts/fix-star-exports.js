#!/usr/bin/env node
// Fix star re-exports that hide default exports.
// Usage:
//   node scripts/fix-star-exports.js          # dry run
//   node scripts/fix-star-exports.js --write  # apply fixes
//   node scripts/fix-star-exports.js --scope src/modules/CustomCakeStudio

const fs = require("fs");
const path = require("path");

const EXTS = [".ts", ".tsx", ".js", ".jsx"];
const WRITE = process.argv.includes("--write");
const scopeIdx = process.argv.indexOf("--scope");
const SCOPE = scopeIdx > -1 ? process.argv[scopeIdx + 1] : "src";

const projectRoot = process.cwd();
const startDir = path.resolve(projectRoot, SCOPE);

let tsPaths = [];
let tsBase = projectRoot;
// Try to read tsconfig baseUrl/paths for alias resolution (e.g. "@/foo")
try {
  const ts = JSON.parse(fs.readFileSync(path.join(projectRoot, "tsconfig.json"), "utf8"));
  const c = ts.compilerOptions || {};
  tsBase = path.resolve(projectRoot, c.baseUrl || ".");
  const paths = c.paths || {};
  tsPaths = Object.entries(paths).map(([alias, arr]) => ({
    alias: alias.replace(/\*$/, ""),
    targets: arr.map(p => p.replace(/\*$/, "")),
  }));
} catch {}

const filesChanged = [];
const starRe = /^\s*export\s*\*\s*from\s*['"](.+?)['"]\s*;?\s*$/gm;

function pascalAlias(p) {
  const base = path.basename(p).replace(/\.[^.]+$/, "") || "Module";
  return base.replace(/[^a-zA-Z0-9]+/g, " ")
             .split(" ").filter(Boolean)
             .map(s => s[0].toUpperCase() + s.slice(1))
             .join("");
}

function resolveWithAliases(spec) {
  for (const m of tsPaths) {
    if (spec.startsWith(m.alias)) {
      const tail = spec.slice(m.alias.length);
      for (const t of m.targets) {
        const guess = path.join(tsBase, t + tail);
        const f = resolveFile(guess);
        if (f) return f;
      }
    }
  }
  return null;
}

function resolveFile(baseNoExt) {
  for (const ext of EXTS) {
    const cand = baseNoExt + ext;
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  for (const ext of EXTS) {
    const cand = path.join(baseNoExt, "index" + ext);
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

function resolveTarget(fromFile, spec) {
  // relative
  if (spec.startsWith(".")) {
    const base = path.resolve(path.dirname(fromFile), spec);
    return resolveFile(base);
  }
  // tsconfig alias
  const viaAlias = resolveWithAliases(spec);
  if (viaAlias) return viaAlias;
  return null;
}

function hasDefaultExport(file) {
  try {
    const src = fs.readFileSync(file, "utf8");
    return /export\s+default\b/.test(src);
  } catch { return false; }
}

function alreadyReexportsDefault(source, spec) {
  const re = new RegExp(`export\\s*\\{\\s*default\\s+as\\s+[^}]+\\}\\s*from\\s*['"]${spec}['"]`);
  return re.test(source);
}

function processFile(file) {
  let src = fs.readFileSync(file, "utf8");
  let changed = false;

  src = src.replace(starRe, (full, spec) => {
    const target = resolveTarget(file, spec);
    if (!target) return full;
    if (!hasDefaultExport(target)) return full;
    if (alreadyReexportsDefault(src, spec)) return full;

    const alias = pascalAlias(spec);
    changed = true;
    return `export { default as ${alias} } from "${spec}";\nexport * from "${spec}";`;
  });

  if (changed) {
    filesChanged.push(file);
    if (WRITE) fs.writeFileSync(file, src, "utf8");
  }
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    if (["node_modules", "dist", ".next", "build", "out"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (EXTS.includes(path.extname(ent.name))) processFile(p);
  }
}

console.log(`Scanning ${startDir} … (write=${WRITE ? "yes" : "no"})`);
walk(startDir);

if (filesChanged.length === 0) {
  console.log("No changes needed ✅");
} else {
  console.log((WRITE ? "Updated" : "Would update") + " files:");
  for (const f of filesChanged) console.log(" - " + path.relative(projectRoot, f));
  if (!WRITE) console.log("\nRun again with --write to apply changes.");
}
