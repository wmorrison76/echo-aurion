import fs from "fs";
import path from "path";
import readline from "readline";

const STATE_PATH = path.resolve("scripts/echocoder/echocoder.state.json");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q: string): Promise<string> {
  return new Promise((res) => rl.question(q, res));
}

(async () => {
  const reason = await ask("Reason (min 10 chars): ");
  if (reason.trim().length < 10) {
    console.error("❌ Reason too short");
    process.exit(1);
  }

  const mins = Number(await ask("Duration (10–60 min): "));
  if (!Number.isFinite(mins) || mins < 10 || mins > 60) {
    console.error("❌ Invalid duration");
    process.exit(1);
  }

  const confirm = await ask('Type "CONFIRM": ');
  if (confirm !== "CONFIRM") {
    console.error("❌ Confirmation failed");
    process.exit(1);
  }

  const expiresAt = Date.now() + mins * 60 * 1000;

  const state = {
    enabled: true,
    expiresAt,
    reason,
    by: process.env.USER || "unknown",
  };

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

  console.log("\n🧠 EchoCoder UNLOCKED");
  console.log("⏱ Expires:", new Date(expiresAt).toLocaleString());
  console.log("📝 Reason:", reason);
  rl.close();
})();
