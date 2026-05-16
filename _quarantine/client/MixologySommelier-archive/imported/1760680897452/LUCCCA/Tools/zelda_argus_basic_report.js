const fs = require("fs");
const path = require("path");

function walkDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            fileList.push({ type: "folder", path: filePath });
            walkDirectory(filePath, fileList);
        } else {
            fileList.push({
                type: "file",
                path: filePath,
                size: stat.size,
                created: stat.birthtime
            });
        }
    });
    return fileList;
}

const targetFolder = path.resolve(__dirname, "../.."); // Adjust path as needed
const report = walkDirectory(targetFolder);

fs.writeFileSync("argus_manifest.json", JSON.stringify(report, null, 2), "utf-8");

console.log("Argus Manifest generated successfully.");
