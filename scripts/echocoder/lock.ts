import fs from "fs";
import path from "path";

const STATE_PATH = path.resolve("scripts/echocoder/echocoder.state.json");

fs.writeFileSync(
  STATE_PATH,
  JSON.stringify(
    { enabled: false, expiresAt: null, reason: null, by: null },
    null,
    2
  )
);

console.log("🔒 EchoCoder locked");
