/**
 * Phase 14: Whiteboard File Management API
 * Express routes for file operations (upload, delete, share, etc.)
 */

import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import multer from "multer";

const router: Router = express.Router();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

const STORAGE_BUCKET = "whiteboard-files";
const FILE_SIZE_LIMIT = 500 * 1024 * 1024; // 500MB

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMIT,
  },
});

/**
 * POST /api/whiteboard-files/upload
 * Upload file to whiteboard
 */
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const {
        boardId,
        sessionId,
        accessLevel = "private",
        metadata,
      } = req.body;
      const userId = req.user?.id || "unknown";

      // Validate input
      if (!boardId || !sessionId) {
        return res
          .status(400)
          .json({ error: "boardId and sessionId are required" });
      }

      // Calculate file hash
      const fileHash = crypto
        .createHash("sha256")
        .update(req.file.buffer)
        .digest("hex");

      // Check for duplicate files (deduplication)
      const { data: existingFile } = await supabase
        .from("whiteboard_files")
        .select("*")
        .eq("fileHash", fileHash)
        .single();

      if (existingFile) {
        return res.json({
          success: true,
          file: existingFile,
          isDuplicate: true,
        });
      }

      // Generate storage path
      const timestamp = Date.now();
      const sanitized = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `boards/${boardId}/${timestamp}_${sanitized}`;

      // Upload to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: "3600",
        });

      if (uploadError) {
        return res.status(500).json({
          error: `Storage upload failed: ${uploadError.message}`,
        });
      }

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600 * 24 * 365); // 1 year

      // Create metadata record
      const fileRecord = {
        id: uuidv4(),
        boardId,
        sessionId,
        uploadedBy: userId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype || "application/octet-stream",
        fileSize: req.file.size,
        storagePath,
        storageUrl: urlData?.signedUrl || "",
        fileHash,
        accessLevel,
        isScanned: false,
        metadata: metadata ? JSON.parse(metadata) : null,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Insert into database
      const { data: dbData, error: dbError } = await supabase
        .from("whiteboard_files")
        .insert([fileRecord])
        .select()
        .single();

      if (dbError) {
        // Rollback storage upload
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        return res.status(500).json({
          error: `Database insert failed: ${dbError.message}`,
        });
      }

      return res.json({
        success: true,
        file: dbData,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  },
);

/**
 * GET /api/whiteboard-files/:fileId
 * Get file metadata
 */
router.get("/:fileId", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id || "unknown";

    const { data, error } = await supabase
      .from("whiteboard_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check access
    const hasAccess = await checkFileAccess(fileId, userId, data.uploadedBy);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    return res.json({ success: true, file: data });
  } catch (error) {
    console.error("Get file error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get file",
    });
  }
});

/**
 * GET /api/whiteboard-files
 * List files with search and filter
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      boardId,
      sessionId,
      uploadedBy,
      fileType,
      accessLevel,
      searchTerm,
      sortBy = "createdAt",
      sortOrder = "desc",
      limit = 20,
      offset = 0,
    } = req.query;

    let query = supabase
      .from("whiteboard_files")
      .select("*")
      .neq("accessLevel", "deleted");

    if (boardId) query = query.eq("boardId", boardId);
    if (sessionId) query = query.eq("sessionId", sessionId);
    if (uploadedBy) query = query.eq("uploadedBy", uploadedBy);
    if (fileType) query = query.eq("fileType", fileType);
    if (accessLevel) query = query.eq("accessLevel", accessLevel);
    if (searchTerm) query = query.ilike("fileName", `%${searchTerm}%`);

    // Sorting
    const ascending = sortOrder === "asc";
    query = query.order(sortBy as string, { ascending });

    // Pagination
    const pageOffset = parseInt(offset as string) || 0;
    const pageLimit = parseInt(limit as string) || 20;
    query = query.range(pageOffset, pageOffset + pageLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      success: true,
      files: data || [],
      total: count || 0,
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (error) {
    console.error("List files error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list files",
    });
  }
});

/**
 * DELETE /api/whiteboard-files/:fileId
 * Delete file
 */
router.delete("/:fileId", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { soft = true } = req.body;
    const userId = req.user?.id || "unknown";

    const { data: file, error: getError } = await supabase
      .from("whiteboard_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (getError || !file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if user is owner
    if (file.uploadedBy !== userId) {
      return res.status(403).json({ error: "Only file owner can delete" });
    }

    if (soft) {
      // Soft delete
      const { error } = await supabase
        .from("whiteboard_files")
        .update({ accessLevel: "deleted", updatedAt: new Date() })
        .eq("id", fileId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }
    } else {
      // Hard delete
      await supabase.storage.from(STORAGE_BUCKET).remove([file.storagePath]);

      const { error } = await supabase
        .from("whiteboard_files")
        .delete()
        .eq("id", fileId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete file",
    });
  }
});

/**
 * POST /api/whiteboard-files/:fileId/share
 * Share file with users
 */
router.post("/:fileId/share", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { userIds = [], accessType = "view" } = req.body;
    const userId = req.user?.id || "unknown";

    // Verify file owner
    const { data: file, error: getError } = await supabase
      .from("whiteboard_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (getError || !file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.uploadedBy !== userId) {
      return res.status(403).json({ error: "Only file owner can share" });
    }

    // Create share record
    const shareToken = crypto.randomBytes(32).toString("hex");
    const { data: share, error: shareError } = await supabase
      .from("whiteboard_file_shares")
      .insert([
        {
          fileId,
          shareToken,
          createdBy: userId,
          createdAt: new Date(),
        },
      ])
      .select()
      .single();

    if (shareError) {
      return res.status(500).json({ error: shareError.message });
    }

    // Add access records for each user
    const accessRecords = userIds.map((uid: string) => ({
      fileId,
      userId: uid,
      accessType,
      grantedAt: new Date(),
      grantedBy: userId,
    }));

    const { error: accessError } = await supabase
      .from("whiteboard_file_access")
      .insert(accessRecords);

    if (accessError) {
      console.error("Add access error:", accessError);
      // Don't fail entirely, share was created
    }

    return res.json({
      success: true,
      share,
      accessesAdded: userIds.length,
    });
  } catch (error) {
    console.error("Share file error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to share file",
    });
  }
});

/**
 * GET /api/whiteboard-files/:fileId/access
 * Get file access records
 */
router.get("/:fileId/access", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const { data, error } = await supabase
      .from("whiteboard_file_access")
      .select("*")
      .eq("fileId", fileId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, access: data || [] });
  } catch (error) {
    console.error("Get access error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get access",
    });
  }
});

/**
 * PATCH /api/whiteboard-files/:fileId/access
 * Change file access level
 */
router.patch("/:fileId/access", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { accessLevel } = req.body;
    const userId = req.user?.id || "unknown";

    // Verify ownership
    const { data: file, error: getError } = await supabase
      .from("whiteboard_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (getError || !file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.uploadedBy !== userId) {
      return res
        .status(403)
        .json({ error: "Only file owner can change access" });
    }

    const { error } = await supabase
      .from("whiteboard_files")
      .update({ accessLevel, updatedAt: new Date() })
      .eq("id", fileId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Change access error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to change access",
    });
  }
});

/**
 * GET /api/whiteboard-files/quota/:userId
 * Get storage quota for user
 */
router.get("/quota/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("whiteboard_files")
      .select("fileSize")
      .eq("uploadedBy", userId)
      .neq("accessLevel", "deleted");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const usedSpace = (data || []).reduce(
      (sum, file: any) => sum + file.fileSize,
      0,
    );
    const totalQuota = 10 * 1024 * 1024 * 1024; // 10GB

    return res.json({
      success: true,
      quota: {
        userId,
        totalQuota,
        usedSpace,
        remainingSpace: totalQuota - usedSpace,
        fileCount: data?.length || 0,
        percentageUsed: (usedSpace / totalQuota) * 100,
      },
    });
  } catch (error) {
    console.error("Get quota error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get quota",
    });
  }
});

/**
 * GET /api/whiteboard-files/statistics/:boardId
 * Get file statistics for board
 */
router.get("/statistics/:boardId", async (req: Request, res: Response) => {
  try {
    const { boardId } = req.params;

    const { data, error } = await supabase
      .from("whiteboard_files")
      .select("*")
      .eq("boardId", boardId)
      .neq("accessLevel", "deleted")
      .order("createdAt", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const files = data || [];
    const filesByType: Record<string, number> = {};
    const filesByAccessLevel: Record<string, number> = {};
    let totalSize = 0;

    files.forEach((file: any) => {
      filesByType[file.fileType] = (filesByType[file.fileType] || 0) + 1;
      filesByAccessLevel[file.accessLevel] =
        (filesByAccessLevel[file.accessLevel] || 0) + 1;
      totalSize += file.fileSize;
    });

    return res.json({
      success: true,
      statistics: {
        totalFiles: files.length,
        totalSize,
        filesByType,
        filesByAccessLevel,
        averageFileSize: files.length > 0 ? totalSize / files.length : 0,
        recentUploads: files.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to get statistics",
    });
  }
});

/**
 * Helper: Check file access
 */
async function checkFileAccess(
  fileId: string,
  userId: string,
  ownerId: string,
): Promise<boolean> {
  // Owner has access
  if (userId === ownerId) return true;

  // Check if file is public
  const { data: file } = await supabase
    .from("whiteboard_files")
    .select("accessLevel")
    .eq("id", fileId)
    .single();

  if (file?.accessLevel === "public") return true;

  // Check access record
  const { data: access } = await supabase
    .from("whiteboard_file_access")
    .select("*")
    .eq("fileId", fileId)
    .eq("userId", userId)
    .single();

  return !!access;
}

export default router;
