// Zelda Argus CLI 2.0 - Move + Check + Exclude Logic
// Paste into: zelda_argus_move_and_check.js inside /LUCCCA/Tools

const fs = require("fs");
const path = require("path");

const EXCLUDE_FOLDERS = ["Echo_Knowledge", "node_modules", "Tools"];
const LOST_AND_FOUND_FOLDER = path.resolve(__dirname, "../Lost_and_Found");

function walkAndCheck(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            const relativePath = path.relative(__dirname, filePath);
            if (!EXCLUDE_FOLDERS.some(folder => relativePath.includes(folder))) {
                walkAndCheck(filePath, fileList);
            }
        } else {
            fileList.push({
                path: filePath,
                size: stat.size,
                created: stat.birthtime
            });
        }
    });
    return fileList;
}

function moveUnusedFiles(fileList) {
    if (!fs.existsSync(LOST_AND_FOUND_FOLDER)) {
        fs.mkdirSync(LOST_AND_FOUND_FOLDER);
    }
    fileList.forEach(file => {
        const newLocation = path.join(LOST_AND_FOUND_FOLDER, path.basename(file.path));
        fs.renameSync(file.path, newLocation);
        console.log(`Moved: ${file.path} → ${newLocation}`);
    });
}

// CLI Logic
const LUCCCA_PATH = path.resolve(__dirname, "../..")
console.log("Scanning LUCCCA system...");

const checkedFiles = walkAndCheck(LUCCCA_PATH);
fs.writeFileSync("argus_checked_manifest.json", JSON.stringify(checkedFiles, null, 2), "utf-8");

console.log(`Scan complete: ${checkedFiles.length} files checked.`);
console.log("Ready to move unused files manually.");
moveUnusedFiles(checkedFiles); // enabled 
