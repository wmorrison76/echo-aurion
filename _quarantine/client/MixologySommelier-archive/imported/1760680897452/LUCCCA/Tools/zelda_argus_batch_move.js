const fs = require("fs");
const path = require("path");

const mapFile = path.resolve(__dirname, "deploy_file_map.json");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

console.log("Arguments received:", args);
console.log("Dry run mode?", dryRun);

if (!fs.existsSync(mapFile)) {
  console.error("deploy_file_map.json missing. Exiting.");
  process.exit(1);
}

const fileMap = JSON.parse(fs.readFileSync(mapFile, "utf-8"));
const logStream = fs.createWriteStream("argus_batch_move_log.txt", { flags: "a" });

Object.entries(fileMap).forEach(([sourceRel, targetRel]) => {
  const sourcePath = path.resolve(__dirname, "../", sourceRel);
  const targetPath = path.resolve(__dirname, "../", targetRel);

  if (!fs.existsSync(sourcePath)) {
    logStream.write(`Missing source: ${sourceRel}\n`);
    return;
  }

  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir) && !dryRun) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (dryRun) {
    logStream.write(`[DRY RUN] Would move: ${sourceRel} → ${targetRel}\n`);
    console.log(`[DRY RUN] Would move: ${sourceRel} → ${targetRel}`);
  } else {
    try {
      if (!fs.existsSync(targetPath)) {
        fs.renameSync(sourcePath, targetPath);
        logStream.write(`Moved: ${sourceRel} → ${targetRel}\n`);
        console.log(`Moved: ${sourceRel} → ${targetRel}`);
      } else {
        logStream.write(`Skipped (already exists): ${targetRel}\n`);
        console.log(`Skipped (already exists): ${targetRel}`);
      }
    } catch (error) {
      logStream.write(`Error moving ${sourceRel}: ${error.message}\n`);
      console.error(`Error moving ${sourceRel}: ${error.message}`);
    }
  }
});

logStream.end();
console.log("Argus batch move complete. Check argus_batch_move_log.txt for details.");
