import express from "express";
import path from "path";
import fs from "fs";

export const purchasingDataRouter = express.Router();

/**
 * GET /api/purchasing/html
 * Serves the uploaded index.html file from PurchasingReceiving data
 */
purchasingDataRouter.get("/html", (req, res) => {
  const htmlPath = path.join(
    process.cwd(),
    "client/modules/PurchasingReceiving/data/index.html",
  );

  if (!fs.existsSync(htmlPath)) {
    return res.status(404).json({
      error: "HTML file not found",
      path: htmlPath,
    });
  }

  try {
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");
    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (error) {
    console.error("[PURCHASING-DATA] Error reading HTML file:", error);
    res.status(500).json({
      error: "Failed to read HTML file",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/purchasing/files
 * Lists all uploaded files in the PurchasingReceiving data folder
 */
purchasingDataRouter.get("/files", (req, res) => {
  const dataDir = path.join(
    process.cwd(),
    "client/modules/PurchasingReceiving/data",
  );

  if (!fs.existsSync(dataDir)) {
    console.log("[PURCHASING-DATA] Data directory not found:", dataDir);
    return res.status(404).json({
      error: "Data directory not found",
      path: dataDir,
      success: false,
    });
  }

  try {
    const files: Record<string, string[]> = {};
    let totalCount = 0;

    const recursiveRead = (dir: string, prefix = "") => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        entries.forEach((entry) => {
          if (entry.name.startsWith(".")) return; // Skip hidden files

          const fullPath = path.join(dir, entry.name);
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

          if (entry.isDirectory()) {
            if (!files[relativePath]) {
              files[relativePath] = [];
            }
            recursiveRead(fullPath, relativePath);
          } else {
            const ext = path.extname(entry.name) || "no-ext";
            if (!files[ext]) files[ext] = [];
            files[ext].push(relativePath);
            totalCount++;
          }
        });
      } catch (error) {
        console.error(`[PURCHASING-DATA] Error reading dir ${dir}:`, error);
      }
    };

    recursiveRead(dataDir);

    const responseData = {
      success: true,
      totalFiles: totalCount,
      filesByType: files,
      timestamp: new Date().toISOString(),
    };

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(responseData));
  } catch (error) {
    console.error("[PURCHASING-DATA] Error listing files:", error);
    res.status(500).json({
      error: "Failed to list files",
      message: error instanceof Error ? error.message : String(error),
      success: false,
    });
  }
});
