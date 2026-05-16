const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const projectRoot = process.cwd();
const backupDir = path.join(projectRoot, "zelda_backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupName = `LUCCCA_${timestamp}.zip`;
const outputPath = path.join(backupDir, backupName);

if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

const output = fs.createWriteStream(outputPath);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`📦 Zelda Backup Complete: ${backupName} (${archive.pointer()} total bytes)`);
});

archive.on("error", (err) => { throw err; });

archive.glob("**/*", {
  cwd: projectRoot,
  ignore: ["node_modules/**", ".git/**", "zelda_backups/**", ".DS_Store"]
});

archive.pipe(output);
archive.finalize();