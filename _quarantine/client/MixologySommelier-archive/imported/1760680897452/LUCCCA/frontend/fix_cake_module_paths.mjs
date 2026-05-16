#!/usr/bin/env node
/**
 * fix_cake_module_paths.mjs
 * 
 * Fixes (Cake-only):
 *  1) "./components/…"  -> "./componets/…"
 *  2) "@/modules/pastry/cake/components/…" -> "@/modules/pastry/cake/componets/…"
 *  3) "../utils/…" -> "./utils/…"  (from inside cake/)
 *
 * Usage:
 *   node fix_cake_module_paths.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAKE_DIR = path.join(ROOT, "src/modules/pastry/cake");
const EXTS = new Set([".js", ".jsx", ".ts", ".tsx"]);

if (!fs.existsSync(CAKE_DIR)) {
  console.error("❌ Could not find:", CAKE_DIR);
  process.exit(1);
}

const changed = [];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const files = walk(CAKE_DIR);

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  let after = before;

  // 1) local relative 'components' -> 'componets'
  after = after.replaceAll(`"./components/`, `"./componets/`);

  // 2) alias-based 'components' -> 'componets'
  after = after.replaceAll(
    `"@/modules/pastry/cake/components/`,
    `"@/modules/pastry/cake/componets/`
  );

  // 3) bump ../utils up to ./utils (we are already inside cake/)
  after = after.replaceAll(`"../utils/`, `"./utils/`);

  if (after !== before) {
    fs.writeFileSync(file + ".bak", before, "utf8");
    fs.writeFileSync(file, after, "utf8");
    changed.push(path.relative(ROOT, file));
  }
}

if (!changed.length) {
  console.log("No Cake files needed path fixes. ✅");
} else {
  console.log("Patched Cake imports in:");
  for (const f of changed) console.log(" -", f);
  console.log("\nBackups saved next to each file as *.bak");
}

// Quick verification for the common targets:
function verify(rel) {
  const p = path.join(CAKE_DIR, rel);
  const exists =
    fs.existsSync(p) ||
    fs.existsSync(p + ".js") ||
    fs.existsSync(p + ".jsx") ||
    fs.existsSync(p + ".ts") ||
    fs.existsSync(p + ".tsx") ||
    fs.existsSync(path.join(p, "index.js")) ||
    fs.existsSync(path.join(p, "index.jsx")) ||
    fs.existsSync(path.join(p, "index.ts")) ||
    fs.existsSync(path.join(p, "index.tsx"));
  console.log(exists ? `✔ ${rel}` : `✖ ${rel} (missing)`);
}

console.log("\nVerify common targets:");
verify("componets/LayerBlock");
verify("componets/DecorationPalette");
verify("componets/CakeSupportOverlay");
verify("utils/SupportMapEngine");
verify("utils/TimeEstimator");
