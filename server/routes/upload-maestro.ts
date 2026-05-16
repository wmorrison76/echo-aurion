import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const router = Router();

// Save uploaded files directly to Maestro module folder
const uploadsDir = path.join(process.cwd(), "client", "modules", "Maestro");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Handle JSON file uploads (FileDropZone sends base64 encoded files as JSON)
const handleMaestroUpload = async (req: Request, res: Response) => {
  try {
    console.log(`\n[UPLOAD-MAESTRO] ===== UPLOAD BATCH RECEIVED =====`);
    console.log(
      `[UPLOAD-MAESTRO] Content-Type: ${req.headers["content-type"]}`,
    );
    console.log(`[UPLOAD-MAESTRO] Request method: ${req.method}`);

    // Body should already be parsed by express.json() middleware
    const { files: jsonFiles } = req.body || {};

    console.log(
      `[UPLOAD-MAESTRO] Files received: ${Array.isArray(jsonFiles) ? jsonFiles.length : 0}`,
    );

    if (!Array.isArray(jsonFiles) || jsonFiles.length === 0) {
      console.log(`[UPLOAD-MAESTRO] ERROR: No files provided`);
      return res.status(400).json({
        success: false,
        count: 0,
        error: "No files provided",
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
    }> = [];

    const failed: Array<{ name: string; error: string }> = [];

    console.log(`[UPLOAD-MAESTRO] Processing ${jsonFiles.length} files...`);

    for (let fileIdx = 0; fileIdx < jsonFiles.length; fileIdx++) {
      const file = jsonFiles[fileIdx];

      if (!file.name) {
        failed.push({
          name: "unknown",
          error: "Missing file name",
        });
        continue;
      }

      try {
        console.log(
          `[UPLOAD-MAESTRO] [${fileIdx + 1}/${jsonFiles.length}] Processing: ${file.name}`,
        );

        // Decode base64 data
        let buffer: Buffer;
        if (file.data) {
          // Remove data URI prefix if present
          const base64Data = file.data.includes(",")
            ? file.data.split(",")[1]
            : file.data;
          buffer = Buffer.from(base64Data, "base64");
          console.log(
            `[UPLOAD-MAESTRO]   → Decoded base64: ${buffer.length} bytes`,
          );
        } else {
          failed.push({
            name: file.name,
            error: "Missing file data",
          });
          console.log(`[UPLOAD-MAESTRO]   → ERROR: No data field`);
          continue;
        }

        // Generate unique ID
        const fileId = uuidv4();

        // Handle folder structure from filename
        const filePathParts = file.name.split("/");
        const filename = filePathParts[filePathParts.length - 1];
        const folderPath =
          filePathParts.length > 1
            ? path.join(uploadsDir, ...filePathParts.slice(0, -1))
            : uploadsDir;
        const filepath = path.join(folderPath, filename);

        console.log(`[UPLOAD-MAESTRO]   → Target path: ${filepath}`);

        // Check for duplicates
        if (fs.existsSync(filepath)) {
          console.log(
            `[UPLOAD-MAESTRO]   → WARNING: Duplicate file, appending UUID`,
          );
          // Append UUID to filename to avoid duplicates
          const ext = path.extname(filename);
          const baseName = path.basename(filename, ext);
          const newFilename = `${baseName}-${fileId}${ext}`;
          const newFilepath = path.join(folderPath, newFilename);

          // Create directories if needed
          fs.mkdirSync(folderPath, { recursive: true });

          // Write file
          await new Promise<void>((resolve, reject) => {
            fs.writeFile(newFilepath, buffer, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          uploads.push({
            id: fileId,
            filename: `${path.dirname(file.name)}/${newFilename}`.replace(
              /^\//,
              "",
            ),
            displayName: newFilename,
            path: path.dirname(file.name),
            size: buffer.length,
            uploadedAt: new Date().toISOString(),
          });

          console.log(
            `[UPLOAD-MAESTRO]   ✓ Saved with UUID: ${newFilename} (${buffer.length} bytes)`,
          );
        } else {
          // Create directories if needed
          fs.mkdirSync(folderPath, { recursive: true });

          // Write file
          await new Promise<void>((resolve, reject) => {
            fs.writeFile(filepath, buffer, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          uploads.push({
            id: fileId,
            filename: file.name,
            displayName: filename,
            path: path.dirname(file.name),
            size: buffer.length,
            uploadedAt: new Date().toISOString(),
          });

          console.log(
            `[UPLOAD-MAESTRO]   ✓ Saved: ${file.name} (${buffer.length} bytes)`,
          );
        }
      } catch (fileError) {
        console.error(
          `[UPLOAD-MAESTRO] Error processing ${file.name}:`,
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

    console.log(`[UPLOAD-MAESTRO] ===== BATCH COMPLETE =====`);
    console.log(
      `[UPLOAD-MAESTRO] Summary: ${successCount} successful, ${failureCount} failed`,
    );
    console.log(`[UPLOAD-MAESTRO] Files saved to: ${uploadsDir}`);

    if (successCount > 0) {
      console.log(`[UPLOAD-MAESTRO] Successfully saved files:`);
      uploads.slice(0, 5).forEach((u, i) => {
        console.log(`  [${i + 1}] ${u.filename} (ID: ${u.id})`);
      });
      if (uploads.length > 5) {
        console.log(`  ... and ${uploads.length - 5} more files`);
      }
    }

    if (failureCount > 0) {
      console.log(`[UPLOAD-MAESTRO] Failed files:`);
      failed.slice(0, 5).forEach((f, i) => {
        console.log(`  [${i + 1}] ${f.name}: ${f.error}`);
      });
      if (failed.length > 5) {
        console.log(`  ... and ${failed.length - 5} more failures`);
      }
    }

    console.log(`[UPLOAD-MAESTRO] ===== END BATCH =====\n`);

    return res.status(successCount > 0 ? 200 : 400).json({
      success: successCount > 0,
      count: successCount,
      message: `Successfully uploaded ${successCount} file(s) to Maestro${
        failureCount > 0 ? `, ${failureCount} failed` : ""
      }`,
      uploads: uploads || [],
      failed: failed || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[UPLOAD-MAESTRO] Unhandled error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        count: 0,
        error: "Failed to process maestro uploads",
        details: errorMsg,
        uploads: [],
        failed: [],
      });
    }
  }
};

// List all uploaded files
const handleListMaestroFiles = async (_req: Request, res: Response) => {
  try {
    console.log("[UPLOAD-MAESTRO-LIST] Reading uploaded files directory");

    if (!fs.existsSync(uploadsDir)) {
      console.log("[UPLOAD-MAESTRO-LIST] Directory doesn't exist yet");
      return res.status(200).json({
        uploads: [],
        message: "No files uploaded yet",
      });
    }

    const getAllFiles = (dir: string, baseDir: string = dir) => {
      const files: Array<{ filename: string; filepath: string }> = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(baseDir, fullPath);

          if (entry.isDirectory()) {
            files.push(...getAllFiles(fullPath, baseDir));
          } else if (entry.isFile()) {
            files.push({
              filename: relativePath.replace(/\\/g, "/"),
              filepath: fullPath,
            });
          }
        }
      } catch (err) {
        console.error(`[UPLOAD-MAESTRO-LIST] Error reading directory:`, err);
      }

      return files;
    };

    const fileList = getAllFiles(uploadsDir);
    console.log(`[UPLOAD-MAESTRO-LIST] Found ${fileList.length} files`);

    const uploads = fileList.map((file) => {
      const stats = fs.statSync(file.filepath);
      return {
        id: file.filename,
        filename: file.filename,
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
    console.error("[UPLOAD-MAESTRO-LIST] Error:", error);
    return res.status(500).json({
      error: "Failed to list maestro uploads",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Routes
router.post("/", (req, res, next) => {
  handleMaestroUpload(req, res).catch((err) => {
    console.error("[UPLOAD-MAESTRO] Unhandled error in handler:", err);
    if (!res.headersSent) {
      res.status(500).json({
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
  handleListMaestroFiles(req, res).catch((err) => {
    console.error("[UPLOAD-MAESTRO-LIST] Unhandled error in handler:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });
});

export const uploadMaestroRouter = router;
