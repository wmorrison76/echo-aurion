import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import type { RequestHandler } from "express";

const router = Router();
const CULINARY_DIR = join(process.cwd(), "client", "modules", "Culinary");

const handleUploadCulinary: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const contentLength = req.headers["content-length"] || "unknown";
    console.log(`[UPLOAD] Request received - Content-Length: ${contentLength}`);

    const { files } = req.body as {
      files?: Array<{ name: string; data: string }>;
    };

    if (!files || files.length === 0) {
      console.warn("[UPLOAD] No files provided in request");
      return res.status(400).json({ error: "No files provided" });
    }

    console.log(`[UPLOAD] Processing ${files.length} files`);

    // Validate file count per batch
    if (files.length > 100) {
      return res.status(400).json({
        error: `Batch too large (${files.length}). Maximum 100 files per batch.`,
      });
    }

    // Ensure Culinary directory exists
    await fs.mkdir(CULINARY_DIR, { recursive: true });

    const results: string[] = [];
    const failedFiles: Array<{ name: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Handle folder structure: split path into directory and filename
        const pathParts = file.name.split("/").filter((p) => p && p !== ".");

        // Sanitize each path component to prevent traversal attacks
        const sanitizedParts = pathParts.map(
          (part) =>
            // Remove .. and other traversal attempts, keep valid chars
            part
              .replace(/\.\./g, "_")
              .replace(/^\./, "_")
              .replace(/[^a-zA-Z0-9._\-]/g, "_")
              .substring(0, 255), // Limit filename length
        );

        // Reconstruct path with sanitized components
        const relativePath = sanitizedParts.join("/");
        const filePath = join(CULINARY_DIR, relativePath);

        // Create nested directories if needed
        // Handle edge case where file has no directory separator (put in root)
        const lastSlash = filePath.lastIndexOf("/");
        const dirPath =
          lastSlash > -1 ? filePath.substring(0, lastSlash) : CULINARY_DIR;
        await fs.mkdir(dirPath, { recursive: true });

        // Prevent directory traversal
        const resolvedPath = resolve(filePath);
        const resolvedDir = resolve(CULINARY_DIR);
        if (!resolvedPath.startsWith(resolvedDir)) {
          failedFiles.push({
            name: file.name,
            error: "Invalid file path",
          });
          continue;
        }

        // Extract base64 data from data URL
        const match = file.data.match(/^data:[^;]+;base64,(.+)$/);
        if (!match) {
          failedFiles.push({
            name: file.name,
            error: "Invalid file format",
          });
          continue;
        }

        const base64 = match[1];
        const buffer = Buffer.from(base64, "base64");

        // Write file to disk
        await fs.writeFile(filePath, buffer);
        results.push(relativePath);

        if ((i + 1) % 5 === 0) {
          console.log(
            `[UPLOAD] Progress: ${i + 1}/${files.length} files processed`,
          );
        }
      } catch (fileError) {
        failedFiles.push({
          name: file.name,
          error:
            fileError instanceof Error ? fileError.message : "Unknown error",
        });
      }
    }

    const hasFailures = failedFiles.length > 0;
    const statusCode = hasFailures && results.length === 0 ? 400 : 200;

    const response = {
      success: results.length > 0,
      count: results.length,
      total: files.length,
      files: results,
      failed: hasFailures ? failedFiles : undefined,
      message: hasFailures
        ? `Uploaded ${results.length}/${files.length} files (${failedFiles.length} failed)`
        : `Successfully uploaded ${results.length} file(s) to Culinary module`,
    };

    console.log(
      `[UPLOAD] Completed: ${results.length} successful, ${failedFiles.length} failed`,
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorType =
      error instanceof Error ? error.constructor.name : typeof error;
    const errorStack = error instanceof Error ? error.stack : "No stack trace";

    console.error("[UPLOAD-CULINARY] Upload error:", {
      message: errorMsg,
      type: errorType,
      stack: errorStack,
    });

    // Return 200 OK with error details instead of 500
    res.status(200).json({
      success: false,
      error: "Upload handler error",
      message: errorMsg,
      errorType: errorType,
      stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      results: [],
      failedFiles: [],
    });
  }
};

// Set timeout for large uploads (6 minutes per batch of 10 files)
router.post(
  "/upload-culinary",
  (req, res, next) => {
    req.setTimeout(6 * 60 * 1000);
    res.setTimeout(6 * 60 * 1000);
    next();
  },
  handleUploadCulinary,
);

export default router;
