import fs from "fs";
import path from "path";

const STATE_PATH = path.resolve("scripts/echocoder/echocoder.state.json");

if (!fs.existsSync(STATE_PATH)) {
  console.log("❌ EchoCoder state missing");
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

if (!state.enabled) {
  console.log("🔒 EchoCoder is LOCKED");
  process.exit(0);
}

if (Date.now() > state.expiresAt) {
  console.log("⏱ EchoCoder EXPIRED — locking");
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify(
      { enabled: false, expiresAt: null, reason: null, by: null },
      null,
      2
    )
  );
  process.exit(0);
}

console.log("🟢 EchoCoder is ACTIVE");
console.log("⏱ Expires:", new Date(state.expiresAt).toLocaleString());
console.log("📝 Reason:", state.reason);
console.log("👤 By:", state.by);
