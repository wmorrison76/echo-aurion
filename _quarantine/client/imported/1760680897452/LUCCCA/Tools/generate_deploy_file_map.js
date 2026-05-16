const fs = require("fs");
const path = require("path");

const deployPath = path.resolve(__dirname, "../Deploy");
const baseTargetPath = "src/modules"; // Adjust as needed for LUCCCA core

const fileMap = {};

function walkDeploy(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(deployPath, fullPath);

    if (entry.isDirectory()) {
      walkDeploy(fullPath);
    } else {
      // Map deploy file → LUCCCA core modules folder
      fileMap[`Deploy/${relativePath}`] = `${baseTargetPath}/${relativePath}`;
    }
  });
}

walkDeploy(deployPath);

const outputPath = path.resolve(__dirname, "deploy_file_map.json");
fs.writeFileSync(outputPath, JSON.stringify(fileMap, null, 2));

console.log(`deploy_file_map.json created with ${Object.keys(fileMap).length} entries.`);
