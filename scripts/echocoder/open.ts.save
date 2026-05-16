import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const LOCK_FILE = path.join(ROOT, ".echocoder-lock.json");

function isLocked() {
  if (!fs.existsSync(LOCK_FILE)) return false;
  const data = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
  return Date.now() > data.expiresAt;
}

console.log("🧠 EchoCoder Open Script");

if (isLocked()) {
  console.log("🔓 EchoCoder locked or expired — unlocking...");

  execSync(
    `pnpm echocoder:unlock -- --reason "Local dev open" --duration 10 --confirm`,
    { stdio: "inherit" }
  );
} else {
  console.log("✅ EchoCoder already unlocked");
}

console.log("🚀 Starting dev server (if not already running)…");

try {
  execSync("pnpm dev", { stdio: "inherit" });
} catch {
  // dev may already be running
}

console.log("");
console.log("🧩 EchoCoder ready");
console.log("⌨️  Hotkey: ⌘ + ⌥ + ⇧ + E");
console.log("🌐 URL: http://localhost:8080");

