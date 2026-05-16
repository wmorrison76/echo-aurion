/**
 * Bulk checksum/verify for directories.
 * Usage:
 *   node src/safety/RedPhoenix/cli/commands/bulk.js checksum ./src
 *   node src/safety/RedPhoenix/cli/commands/bulk.js verify ./src
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createVault } from "../../ChecksumVault.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [,,cmd, dir="."] = process.argv;
const vault = createVault();

function walk(dirPath){
  const out = [];
  for (const entry of fs.readdirSync(dirPath)){
    const p = path.join(dirPath, entry);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (st.isFile()) out.push(p);
  }
  return out;
}

if (!fs.existsSync(dir)) {
  console.error("Missing dir:", dir);
  process.exit(1);
}

const files = walk(dir).filter(f => /\.(js|jsx|ts|tsx|json|css|md)$/.test(f));
if (cmd === "checksum"){
  const results = files.map(f => {
    const data = fs.readFileSync(f, "utf8");
    return vault.snapshot(f, data);
  });
  fs.writeFileSync(path.join(__dirname, "checksums.json"), JSON.stringify(results, null, 2));
  console.log("Wrote checksums.json with", results.length, "entries");
} else if (cmd === "verify"){
  const dbPath = path.join(__dirname, "checksums.json");
  if (!fs.existsSync(dbPath)) { console.error("checksums.json not found"); process.exit(1); }
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  let ok = 0, bad = 0;
  for (const entry of db){
    const file = entry.key;
    if (!fs.existsSync(file)){ bad++; console.log("MISSING", file); continue; }
    const data = fs.readFileSync(file, "utf8");
    const res = vault.verify(file, data);
    if (res.ok) ok++; else { bad++; console.log("DRIFT", file, res); }
  }
  console.log("verify complete — ok:", ok, "bad:", bad);
  process.exit(bad ? 2 : 0);
} else {
  console.log("Usage: node bulk.js <checksum|verify> <dir>");
}
