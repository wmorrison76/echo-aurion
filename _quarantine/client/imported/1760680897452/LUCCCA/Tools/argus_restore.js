const fs = require("fs");
const path = require("path");

const manifestPath = path.resolve(__dirname, "argus_checked_manifest.json");
const lostAndFoundFolder = path.resolve(__dirname, "../Lost_and_Found");

if (!fs.existsSync(manifestPath)) {
    console.error("Manifest file not found. Exiting.");
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

manifest.forEach(fileEntry => {
    const originalPath = fileEntry.path;
    const fileName = path.basename(originalPath);
    const lostFilePath = path.join(lostAndFoundFolder, fileName);

    if (fs.existsSync(lostFilePath)) {
        const targetDir = path.dirname(originalPath);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
            fs.renameSync(lostFilePath, originalPath);
            console.log(`Restored: ${fileName} → ${originalPath}`);
        } catch (error) {
            console.error(`Failed to move ${fileName}: ${error.message}`);
        }
    } else {
        console.warn(`File missing from Lost_and_Found: ${fileName}`);
    }
});

console.log("Argus restore process complete.");
