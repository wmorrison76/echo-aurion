const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");

const backupDir = path.join(process.cwd(), "zelda_backups");
const [,, backupName] = process.argv;

async function restoreBackup(name) {
  const backupPath = path.join(backupDir, name);
  if (!fs.existsSync(backupPath)) {
    console.error("❌ Backup not found:", backupPath);
    process.exit(1);
  }

  console.log(`🛠 Restoring backup: ${name}`);
  fs.createReadStream(backupPath)
    .pipe(unzipper.Extract({ path: process.cwd() }))
    .on("close", () => {
      console.log("✅ Restore complete.");
    });
}

if (!backupName) {
  const backups = fs.readdirSync(backupDir).filter(f => f.endsWith(".zip")).sort().reverse();
  if (!backups.length) {
    console.log("⚠️ No backups found.");
    process.exit(0);
  }
  restoreBackup(backups[0]);
} else {
  restoreBackup(backupName);
}