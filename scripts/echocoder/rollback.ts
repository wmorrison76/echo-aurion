import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const SNAPSHOT_DIR = ".echocoder-snapshots";
const target = process.argv[2];

if (!target) {
  console.error("❌ Provide snapshot folder name");
  process.exit(1);
}

const snapshotPath = path.join(SNAPSHOT_DIR, target);
if (!fs.existsSync(snapshotPath)) {
  console.error("❌ Snapshot not found:", snapshotPath);
  process.exit(1);
}

console.log("⏪ Rolling back to snapshot:", snapshotPath);

// Restore files
execSync(`cp -R ${snapshotPath}/client ./`, { stdio: "inherit" });

// Restore git diff (optional)
if (fs.existsSync(`${snapshotPath}/git-diff.patch`)) {
  execSync(`git apply ${snapshotPath}/git-diff.patch || true`);
}

console.log("✅ Rollback complete");

