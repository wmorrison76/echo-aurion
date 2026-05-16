const fs = require("fs");
const path = require("path");

const mapFile = path.resolve(__dirname, "deploy_file_map.json");

if (!fs.existsSync(mapFile)) {
  console.error("deploy_file_map.json missing. Exiting.");
  process.exit(1);
}

const fileMap = JSON.parse(fs.readFileSync(mapFile, "utf-8"));
const logStream = fs.createWriteStream("argus_file_check_log.txt", { flags: 'w' });

let missingCount = 0;
let foundCount = 0;

Object.entries(fileMap).forEach(([sourceRel, targetRel]) => {
  const targetPath = path.resolve(__dirname, "../", targetRel);

  if (fs.existsSync(targetPath)) {
    logStream.write(`✔ Found: ${targetRel}\n`);
    foundCount++;
  } else {
    logStream.write(`✘ Missing: ${targetRel}\n`);
    missingCount++;
  }
});

logStream.write(`\nSummary:\nFound: ${foundCount}\nMissing: ${missingCount}\n`);
logStream.end();

console.log("Argus file check complete. Check argus_file_check_log.txt for details.");
