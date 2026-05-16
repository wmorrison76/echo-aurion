const fs = require('fs');
const path = require('path');

const summary = path.join(__dirname, '../zelda-summary.txt');
const out = path.join(__dirname, 'zelda-status.json');

function runZeldaMiniScan() {
  let logs = [];
  let status = "✅ Stable";

  if (fs.existsSync(summary)) {
    const contents = fs.readFileSync(summary, 'utf-8');
    logs = contents.trim().split('\n').slice(-5);
    if (contents.includes("❌")) status = "🔴 Critical Issues";
    else if (contents.includes("⚠️")) status = "🟡 Warnings";
  } else {
    logs.push("Zelda summary not found.");
    status = "⚠️ No Summary";
  }

  fs.writeFileSync(out, JSON.stringify({ status, logs }, null, 2));
  console.log("🧪 Zelda Companion updated.");
}

runZeldaMiniScan();
