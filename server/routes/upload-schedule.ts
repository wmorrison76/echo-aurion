import { Router, Request, Response } from "express";
import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import busboy from "busboy";

const router = Router();

// Save uploaded files directly to Schedule module (no subfolder)
const uploadsDir = path.join(process.cwd(), "client", "modules", "Schedule");

// Note: Directory creation is now done per-request, not at module load time
// to avoid crashes on systems with ephemeral file systems (like fly.dev)

// Helper to handle file uploads - supports both JSON and FormData
const handleScheduleUpload = async (req: Request, res: Response) => {
  try {
    const contentType = req.headers["content-type"] || "";
    console.log(`\n[UPLOAD-SCHEDULE] ===== UPLOAD BATCH RECEIVED =====`);
    console.log(
      `[UPLOAD-SCHEDULE] Handler called - content-type: ${contentType}`,
    );
    console.log(`[UPLOAD-SCHEDULE] Request URL: ${req.originalUrl}`);
    console.log(`[UPLOAD-SCHEDULE] Request method: ${req.method}`);
    let files: Array<{ name: string; data?: string; buffer?: Buffer }> = [];

    // Handle FormData (multipart/form-data) from RecipeSearch.tsx
    if (contentType.includes("multipart/form-data")) {
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
          `[UPLOAD-SCHEDULE] File ${fileCount} detected: ${fileInfo.filename}`,
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
            `[UPLOAD-SCHEDULE] File ${fileCount} complete: ${fileInfo.filename} (${buffer.length} bytes)`,
          );
        });
      });

      bb.on("close", () => {
        console.log(
          `[UPLOAD-SCHEDULE] Busboy close event: ${fileCount} files detected, ${uploadedFiles.length} files processed`,
        );
      });

      await new Promise((resolve, reject) => {
        bb.on("close", resolve);
        bb.on("error", (err) => {
          console.error(`[UPLOAD-SCHEDULE] Busboy error:`, err);
          reject(err);
        });

        // Handle request stream errors (e.g., premature close, body locked)
        req.on("error", (err) => {
          console.error(`[UPLOAD-SCHEDULE] Request stream error:`, err);
          reject(new Error(`Request stream error: ${err.message}`));
        });

        console.log(`[UPLOAD-SCHEDULE] Starting busboy parsing...`);
        try {
          req.pipe(bb);
        } catch (pipeErr) {
          console.error(
            `[UPLOAD-SCHEDULE] Failed to pipe request to busboy:`,
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
        `[UPLOAD-SCHEDULE] FormData parsing complete: ${files.length} files ready to save`,
      );
    } else {
      // Handle JSON with base64 (from RecipeSearch.tsx)
      const { files: jsonFiles } = req.body;
      console.log(`[UPLOAD-SCHEDULE] JSON request received`);
      console.log(
        `[UPLOAD-SCHEDULE] Request body keys:`,
        Object.keys(req.body || {}),
      );
      console.log(`[UPLOAD-SCHEDULE] jsonFiles type:`, typeof jsonFiles);
      console.log(
        `[UPLOAD-SCHEDULE] jsonFiles is array:`,
        Array.isArray(jsonFiles),
      );
      console.log(
        `[UPLOAD-SCHEDULE] jsonFiles length:`,
        Array.isArray(jsonFiles) ? jsonFiles.length : "N/A",
      );

      if (!Array.isArray(jsonFiles) || jsonFiles.length === 0) {
        console.log(
          `[UPLOAD-SCHEDULE] ERROR: No JSON files or not an array. Full body length:`,
          JSON.stringify(req.body).length,
        );
        return res.status(400).json({
          error: "No files provided",
          uploads: [],
        });
      }

      files = jsonFiles;
      console.log(
        `[UPLOAD-SCHEDULE] ✓ Successfully parsed ${files.length} JSON files from request`,
      );

      // Log first file to verify structure
      if (files.length > 0) {
        const firstFile = files[0];
        console.log(
          `[UPLOAD-SCHEDULE] First file name: ${firstFile.name}, data length: ${firstFile.data?.length || 0}`,
        );
      }
    }

    // Check if files were provided
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: "No files provided",
        uploads: [],
      });
    }

    const uploads: Array<{
      id: string;
      filename: string;
      size: number;
      uploadedAt: string;
    }> = [];

    const failed: Array<{ name: string; error: string }> = [];

    console.log(`[UPLOAD-SCHEDULE] Processing ${files.length} files...`);
    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
      const file = files[fileIdx];
      if (!file.name) {
        failed.push({
          name: "unknown",
          error: "Missing file name",
        });
        continue;
      }

      try {
        // Preserve original folder structure and filename
        const originalFilename = file.name;
        const fileId = uuidv4();

        // Create subdirectories if file has a path (e.g., "scheduler-ui/blocks/TimesheetReview.tsx")
        const filePathParts = originalFilename.split("/");
        const filename = filePathParts[filePathParts.length - 1]; // Just the filename, no folders
        const folderPath =
          filePathParts.length > 1
            ? path.join(uploadsDir, ...filePathParts.slice(0, -1))
            : uploadsDir;
        const filepath = path.join(folderPath, filename);

        console.log(
          `[UPLOAD-SCHEDULE] [${fileIdx + 1}/${files.length}] Saving: ${originalFilename}`,
        );
        console.log(
          `[UPLOAD-SCHEDULE]   → Creating directories: ${folderPath}`,
        );
        console.log(`[UPLOAD-SCHEDULE]   → Full path: ${filepath}`);

        // Handle both buffer (from FormData) and base64 (from JSON)
        let buffer: Buffer;
        if (file.buffer instanceof Buffer) {
          // From FormData via busboy
          buffer = file.buffer;
        } else if (file.data) {
          // From FileDropZone JSON with base64
          const base64Data = file.data.split(",")[1] || file.data;
          buffer = Buffer.from(base64Data, "base64");
        } else {
          failed.push({
            name: file.name,
            error: "Missing file data or buffer",
          });
          continue;
        }

        // Check for duplicate file (prevent overwriting existing files with same name/path)
        if (fs.existsSync(filepath)) {
          console.log(
            `[UPLOAD-SCHEDULE] ⚠ DUPLICATE DETECTED: ${originalFilename}`,
          );
          failed.push({
            name: file.name,
            error: `File already exists (duplicate filename): ${filename}`,
          });
          continue;
        }

        // Create all necessary directories (recursive)
        try {
          fs.mkdirSync(folderPath, { recursive: true });
          console.log(`[UPLOAD-SCHEDULE] ✓ Directories created: ${folderPath}`);
        } catch (dirErr) {
          failed.push({
            name: file.name,
            error: `Failed to create directories: ${dirErr instanceof Error ? dirErr.message : String(dirErr)}`,
          });
          console.error(
            `[UPLOAD-SCHEDULE] ✗ Failed to create directories: ${dirErr}`,
          );
          continue;
        }

        // Save file to disk
        await new Promise<void>((resolve, reject) => {
          fs.writeFile(filepath, buffer, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        uploads.push({
          id: fileId,
          filename: originalFilename, // Full path with folder structure
          displayName: filename, // Just the filename
          path: filePathParts.slice(0, -1).join("/"), // Folder path
          size: buffer.length,
          uploadedAt: new Date().toISOString(),
        });

        console.log(
          `[UPLOAD-SCHEDULE] ✓ File saved: ${originalFilename} (${buffer.length} bytes)`,
        );

        // Verify file was actually written
        if (fs.existsSync(filepath)) {
          const stats = fs.statSync(filepath);
          console.log(
            `[UPLOAD-SCHEDULE] ✓ File verified on disk: ${stats.size} bytes`,
          );
        } else {
          console.warn(
            `[UPLOAD-SCHEDULE] ⚠ File not found after write: ${filepath}`,
          );
        }
      } catch (fileError) {
        console.error(
          `[UPLOAD-SCHEDULE] File save error for ${file.name}:`,
          fileError,
        );
        failed.push({
          name: file.name,
          error:
            fileError instanceof Error ? fileError.message : "Unknown error",
        });
      }
    }

    const successCount = uploads.length;
    const failureCount = failed.length;

    console.log(`[UPLOAD-SCHEDULE] ===== BATCH COMPLETE =====`);
    console.log(
      `[UPLOAD-SCHEDULE] Summary: ${successCount} successful, ${failureCount} failed`,
    );
    console.log(`[UPLOAD-SCHEDULE] Files saved to: ${uploadsDir}`);
    if (successCount > 0) {
      console.log(`[UPLOAD-SCHEDULE] Successfully saved files:`);
      uploads.slice(0, 5).forEach((u, i) => {
        console.log(`  [${i + 1}] ${u.filename} (ID: ${u.id})`);
      });
      if (uploads.length > 5) {
        console.log(`  ... and ${uploads.length - 5} more files`);
      }
    }
    console.log(`[UPLOAD-SCHEDULE] ===== END BATCH =====\n`);

    return res.status(successCount > 0 ? 200 : 400).json({
      success: successCount > 0,
      count: successCount,
      message: `Successfully uploaded ${successCount} file(s) to Schedule${
        failureCount > 0 ? `, ${failureCount} failed` : ""
      }`,
      uploads: uploads || [],
      failed: failed || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[UPLOAD-SCHEDULE] Error:", error);

    // Provide helpful error messages for common issues
    let details = errorMsg;
    if (
      errorMsg.includes("body") ||
      errorMsg.includes("stream") ||
      errorMsg.includes("locked")
    ) {
      details =
        "Request body error: The request stream was not properly available. Try uploading again.";
    } else if (errorMsg.includes("ENOSPC")) {
      details = "Disk space error: Not enough space to save files.";
    } else if (errorMsg.includes("EACCES")) {
      details = "Permission error: Cannot write to upload directory.";
    }

    // Ensure response headers are set before sending body
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json");
      // Return 200 OK with error details instead of 500
      res.status(200).json({
        success: false,
        error: "Failed to process schedule uploads",
        details: details,
        message: errorMsg,
        count: 0,
        uploads: [],
        failed: [],
      });
    }
  }
};

// Recursively read all files from a directory
const getAllFilesRecursive = (
  dir: string,
  baseDir: string = dir,
): Array<{ filename: string; filepath: string }> => {
  const files: Array<{ filename: string; filepath: string }> = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        // Recursively read subdirectory
        files.push(...getAllFilesRecursive(fullPath, baseDir));
      } else if (entry.isFile()) {
        // Add file with relative path
        files.push({
          filename: relativePath.replace(/\\/g, "/"), // Convert Windows paths to forward slashes
          filepath: fullPath,
        });
      }
    }
  } catch (err) {
    console.error(
      `[UPLOAD-SCHEDULE-LIST] Error reading directory ${dir}:`,
      err,
    );
  }

  return files;
};

// Get list of uploaded files
const handleListScheduleFiles = async (_req: Request, res: Response) => {
  try {
    console.log("[UPLOAD-SCHEDULE-LIST] Reading uploaded files directory");

    if (!fs.existsSync(uploadsDir)) {
      console.log("[UPLOAD-SCHEDULE-LIST] Directory doesn't exist yet");
      return res.status(200).json({
        uploads: [],
        message: "No files uploaded yet",
      });
    }

    const fileList = getAllFilesRecursive(uploadsDir);
    console.log(
      `[UPLOAD-SCHEDULE-LIST] Found ${fileList.length} files recursively`,
    );

    const uploads = fileList.map((file) => {
      const stats = fs.statSync(file.filepath);
      return {
        id: file.filename, // Use full path as ID (unique per file)
        filename: file.filename, // Preserve folder structure
        displayName: path.basename(file.filename),
        path: path.dirname(file.filename),
        size: stats.size,
        uploadedAt: stats.mtime.toISOString(),
      };
    });

    return res.status(200).json({
      uploads: uploads.sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      ),
      message: `Found ${uploads.length} uploaded files`,
    });
  } catch (error) {
    console.error("[UPLOAD-SCHEDULE-LIST] Error:", error);
    return res.status(200).json({
      success: false,
      error: "Failed to list schedule uploads",
      details: error instanceof Error ? error.message : "Unknown error",
      uploads: [],
    });
  }
};

router.post("/", (req, res, next) => {
  // Wrap handler with error boundary to catch any synchronous errors
  Promise.resolve()
    .then(() => handleScheduleUpload(req, res))
    .catch((err) => {
      console.error("[UPLOAD-SCHEDULE] Unhandled error in handler:", err);
      if (!res.headersSent) {
        // Return 200 OK with error details instead of 500
        res.status(200).json({
          success: false,
          count: 0,
          error: "Internal server error",
          details: err instanceof Error ? err.message : String(err),
          uploads: [],
          failed: [],
        });
      }
    });
});

router.get("/", (req, res, next) => {
  // Wrap handler with error boundary
  Promise.resolve()
    .then(() => handleListScheduleFiles(req, res))
    .catch((err) => {
      console.error("[UPLOAD-SCHEDULE-LIST] Unhandled error in handler:", err);
      if (!res.headersSent) {
        // Return 200 OK with error details instead of 500
        res.status(200).json({
          success: false,
          error: "Internal server error",
          details: err instanceof Error ? err.message : String(err),
          uploads: [],
        });
      }
    });
});

export const uploadScheduleRouter = router;
