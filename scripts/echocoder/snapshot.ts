import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const SNAPSHOT_DIR = ".echocoder-snapshots";
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const name = process.argv[2] || "manual";

const snapshotPath = path.join(SNAPSHOT_DIR, `${ts}-${name}`);

fs.mkdirSync(snapshotPath, { recursive: true });

console.log("📸 Creating EchoCoder snapshot:", snapshotPath);

// Save git state
execSync(`git status --short > ${snapshotPath}/git-status.txt`);
execSync(`git diff > ${snapshotPath}/git-diff.patch`);

// Save critical folders
const targets = [
  "client/developer/EchoCoder",
  "client/lib/panel-registry.ts",
  "client/components/dev",
];

for (const t of targets) {
  if (fs.existsSync(t)) {
    execSync(`cp -R ${t} ${snapshotPath}/`);
  }
}

console.log("✅ Snapshot complete");
console.log("🕒 Timestamp:", ts);

