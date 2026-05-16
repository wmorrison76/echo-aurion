import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import busboy from "busboy";
import { getOrgContext, enforceOrgId } from "../lib/multi-tenant";

const router = Router();

// Define uploads directory path
// In production (fly.dev), use /tmp which is writable but ephemeral
// In development, use client/modules/PurchasingReceiving/data
const uploadsDir =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "purchasing")
    : path.join(
        process.cwd(),
        "client",
        "modules",
        "PurchasingReceiving",
        "data",
      );

// Handle JSON file uploads (FileDropZone sends base64 encoded files as JSON)
const handlePurchasingUpload = async (req: Request, res: Response) => {
  console.log(`\n[UPLOAD-PURCHASING] ===== UPLOAD BATCH RECEIVED =====`);
  console.log(
    `[UPLOAD-PURCHASING] Content-Type: ${req.headers["content-type"]}`,
  );
  console.log(`[UPLOAD-PURCHASING] Request method: ${req.method}`);
  console.log(`[UPLOAD-PURCHASING] Query params:`, req.query);

  try {
    // Extract and enforce organization ID
    const requestOrgId = req.query.org_id as string | undefined;
    const orgContext = getOrgContext(req);
    console.log(
      `[UPLOAD-PURCHASING] Org validation: requestOrgId=${requestOrgId}, userOrgId=${orgContext.orgId}`,
    );
    enforceOrgId(requestOrgId, orgContext.orgId);

    // Try to create uploads directory
    let canWriteToDisk = false;
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(
          `[UPLOAD-PURCHASING] Created uploads directory: ${uploadsDir}`,
        );
      }
      canWriteToDisk = true;
    } catch (mkdirError) {
      console.warn(
        `[UPLOAD-PURCHASING] Warning: Could not create directory ${uploadsDir}:`,
        mkdirError instanceof Error ? mkdirError.message : String(mkdirError),
      );
      console.warn(
        `[UPLOAD-PURCHASING] Will store file metadata only (no disk persistence)`,
      );
    }

    const contentType = req.headers["content-type"] || "";
    let files: Array<{ name: string; buffer: Buffer }> = [];

    // Handle FormData (multipart/form-data) from RecipeSearch.tsx
    if (contentType.includes("multipart/form-data")) {
      console.log(`[UPLOAD-PURCHASING] Handling FormData upload...`);
      const bb = busboy({
        headers: req.headers,
        limits: {
          fileSize: 50 * 1024 * 1024, // 50MB per file
          files: 1000, // Allow up to 1000 files per request
          fields: 1000,
        },
      });
      const uploadedFiles: Array<{
        name: string;
        buffer: Buffer;
      }> = [];

      let fileCount = 0;
      bb.on("file", (_fieldname: string, file: any, fileInfo: any) => {
        fileCount++;
        console.log(
          `[UPLOAD-PURCHASING] File ${fileCount} detected: ${fileInfo.filename}`,
        );
        const chunks: Buffer[] = [];
        file.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        file.on("end", () => {
          const buffer = Buffer.concat(chunks);
          uploadedFiles.push({
            name: fileInfo.filename,
            buffer: buffer,
          });
          console.log(
            `[UPLOAD-PURCHASING] File ${fileCount} complete: ${fileInfo.filename} (${buffer.length} bytes)`,
          );
        });
      });

      bb.on("close", () => {
        console.log(
          `[UPLOAD-PURCHASING] Busboy close event: ${fileCount} files detected, ${uploadedFiles.length} files processed`,
        );
      });

      await new Promise((resolve, reject) => {
        bb.on("close", resolve);
        bb.on("error", (err) => {
          console.error(`[UPLOAD-PURCHASING] Busboy error:`, err);
          reject(err);
        });

        req.on("error", (err) => {
          console.error(`[UPLOAD-PURCHASING] Request stream error:`, err);
          reject(new Error(`Request stream error: ${err.message}`));
        });

        console.log(`[UPLOAD-PURCHASING] Starting busboy parsing...`);
        try {
          req.pipe(bb);
        } catch (pipeErr) {
          console.error(
            `[UPLOAD-PURCHASING] Failed to pipe request to busboy:`,
            pipeErr,
          );
          reject(
            new Error(
              `Failed to pipe request: ${pipeErr instanceof Error ? pipeErr.message : String(pipeErr)}`,
            ),
          );
        }
      });

      files = uploadedFiles.map((f) => ({
        name: f.name,
        buffer: f.buffer,
      }));
      console.log(
        `[UPLOAD-PURCHASING] FormData parsing complete: ${files.length} files ready to save`,
      );
    } else {
      // Handle JSON with base64 (legacy support)
      console.log(`[UPLOAD-PURCHASING] Handling JSON upload...`);
      const { files: jsonFiles } = req.body || {};

      if (!Array.isArray(jsonFiles) || jsonFiles.length === 0) {
        console.error(`[UPLOAD-PURCHASING] ERROR: No JSON files or not an array`);
        return res.status(400).json({
          success: false,
          count: 0,
          error: "No files provided",
          uploads: [],
          failed: [],
        });
      }

      files = jsonFiles.map((file: any) => {
        if (!file.data || typeof file.data !== "string") {
          throw new Error("Invalid file data format");
        }

        // Extract base64 data - remove data:mime/type prefix if present
        const matches = file.data.match(/^data:[^;]*;base64,(.*)$|^(.*)$/);
        const base64Data = matches?.[1] || matches?.[2] || file.data;

        // Decode base64 to binary
        const buffer = Buffer.from(base64Data, "base64");

        return {
          name: file.name || `file_${Date.now()}`,
          buffer: buffer,
        };
      });

      console.log(
        `[UPLOAD-PURCHASING] ✓ Successfully parsed ${files.length} JSON files from request`,
      );
    }

    if (files.length === 0) {
      console.warn(`[UPLOAD-PURCHASING] Warning: No files provided in request`);
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No files to upload",
        uploads: [],
        failed: [],
      });
    }

    const uploads: Array<{
      id: string;
      filename: string;
      displayName?: string;
      path?: string;
      size: number;
      uploadedAt: string;
      stored?: string;
    }> = [];

    const failed: Array<{ name: string; error: string }> = [];

    console.log(`[UPLOAD-PURCHASING] Processing ${files.length} files...`);

    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
      const file = files[fileIdx];

      try {
        const buffer = file.buffer;
        const originalName = file.name || `file_${Date.now()}`;
        const fileName = path.basename(originalName);

        // Build the directory structure from the file path
        const dirPath = path.dirname(originalName);

        // Preserve full folder structure - all files go to their original paths
        const fileSubDir =
          dirPath && dirPath !== "."
            ? path.join(uploadsDir, dirPath)
            : uploadsDir;
        const savePath = path.join(fileSubDir, fileName);
        const displayPath =
          dirPath && dirPath !== "." ? dirPath : "root";

        console.log(
          `[UPLOAD-PURCHASING] File ${fileIdx + 1}: Processing ${originalName}`,
        );

        // Create subdirectory for this file
        if (canWriteToDisk && !fs.existsSync(fileSubDir)) {
          fs.mkdirSync(fileSubDir, { recursive: true });
        }

        // For unique ID, use original name
        const fileId = originalName.replace(/[^a-z0-9._/-]/gi, "_");

        // Try to save file to disk
        let fileSaved = false;

        if (canWriteToDisk) {
          try {
            fs.writeFileSync(savePath, buffer);
            console.log(
              `[UPLOAD-PURCHASING] File ${fileIdx + 1}: Saved to ${displayPath}/${fileName} (${buffer.length} bytes)`,
            );
            fileSaved = true;
          } catch (writeError) {
            const writeErrorMsg =
              writeError instanceof Error
                ? writeError.message
                : String(writeError);
            console.warn(
              `[UPLOAD-PURCHASING] File write error for ${originalName}: ${writeErrorMsg}`,
            );
          }
        } else {
          console.log(
            `[UPLOAD-PURCHASING] File ${fileIdx + 1}: Metadata stored (no disk persistence) - ${originalName} (${buffer.length} bytes)`,
          );
        }

        // Always track the file metadata (even if not saved to disk)
        uploads.push({
          id: fileId,
          filename: originalName,
          displayName: originalName,
          path: fileSaved ? savePath : `memory://${fileId}`,
          size: buffer.length,
          uploadedAt: new Date().toISOString(),
          stored: fileSaved ? "disk" : "memory",
        });
      } catch (fileError) {
        const errorMsg =
          fileError instanceof Error ? fileError.message : "Unknown error";
        console.error(
          `[UPLOAD-PURCHASING] File ${fileIdx + 1} error: ${errorMsg}`,
        );
        failed.push({
          name: file.name || `File ${fileIdx + 1}`,
          error: errorMsg,
        });
      }
    }

    console.log(
      `[UPLOAD-PURCHASING] Batch complete: ${uploads.length} successful, ${failed.length} failed`,
    );
    if (uploads.length > 0) {
      console.log(
        `[UPLOAD-PURCHASING] Files saved:`,
        uploads.slice(0, 3).map((u) => u.filename),
        uploads.length > 3 ? `... and ${uploads.length - 3} more` : "",
      );
    }

    // Always return success response
    const storageStatus = canWriteToDisk
      ? "persisted to disk"
      : "stored in memory only";
    return res.status(200).json({
      success: uploads.length > 0,
      count: uploads.length,
      message: `${uploads.length} files received and ${storageStatus}${failed.length > 0 ? ` (${failed.length} failed)` : ""}`,
      uploads: uploads,
      failed: failed,
      metadata: {
        persistedToDisk: canWriteToDisk,
        uploadPath: uploadsDir,
        environment: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "No stack trace";
    const errorType =
      error instanceof Error ? error.constructor.name : typeof error;

    console.error("[UPLOAD-PURCHASING] Fatal error:", errorMsg);
    console.error("[UPLOAD-PURCHASING] Error type:", errorType);
    console.error("[UPLOAD-PURCHASING] Stack trace:", errorStack);

    // Return 200 OK with error details instead of 500, since we may have partially uploaded files
    return res.status(200).json({
      success: false,
      count: 0,
      error: "Upload handler error",
      message: errorMsg,
      errorType: errorType,
      stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      uploads: [],
      failed: [],
    });
  }
};

// POST endpoint for file uploads
router.post("/", handlePurchasingUpload);

// GET endpoint to list uploaded files
router.get("/", (_req: Request, res: Response) => {
  try {
    console.log("[UPLOAD-PURCHASING] Listing files");

    // Return empty list if directory doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      console.log("[UPLOAD-PURCHASING] Upload directory does not exist");
      return res.json({
        files: [],
        total: 0,
        message: "No uploaded files (directory not persisted)",
      });
    }

    try {
      const files = fs
        .readdirSync(uploadsDir)
        .map((filename) => {
          try {
            const filePath = path.join(uploadsDir, filename);
            const stats = fs.statSync(filePath);
            return {
              filename: filename,
              size: stats.size,
              uploadedAt: stats.birthtime.toISOString(),
            };
          } catch (err) {
            console.warn(
              `[UPLOAD-PURCHASING] Could not stat ${filename}:`,
              err,
            );
            return null;
          }
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      return res.json({ files, total: files.length });
    } catch (readdirErr) {
      console.warn("[UPLOAD-PURCHASING] Could not read directory:", readdirErr);
      return res.json({
        files: [],
        total: 0,
        message: "Could not read uploaded files from disk",
      });
    }
  } catch (error) {
    console.error("[UPLOAD-PURCHASING] Error listing files:", error);
    return res.status(200).json({
      files: [],
      total: 0,
      error: "Could not list files",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET endpoint to fetch index.html content
router.get("/index.html", (_req: Request, res: Response) => {
  try {
    console.log("[UPLOAD-PURCHASING] Fetching index.html");

    const indexPath = path.join(uploadsDir, "index.html");

    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, "utf-8");
      res.setHeader("Content-Type", "text/html");
      return res.send(content);
    } else {
      console.log("[UPLOAD-PURCHASING] index.html not found");
      return res.status(404).json({
        error: "index.html not found",
        path: indexPath,
      });
    }
  } catch (error) {
    console.error("[UPLOAD-PURCHASING] Error fetching index.html:", error);
    return res.status(500).json({
      error: "Could not fetch index.html",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
