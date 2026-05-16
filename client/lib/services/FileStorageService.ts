/**
 * Phase 14: Enterprise File Storage Service
 * Handles file upload, storage, retrieval, and lifecycle management
 */

import { createClient } from "@supabase/supabase-js";
import {
  WhiteboardFile,
  FileUploadRequest,
  FileUploadResponse,
  WhiteboardFileAccess,
  WhiteboardFileShare,
  FileSearchOptions,
  FileStatistics,
  FileIntegrityCheck,
  StorageQuota,
  FILE_SIZE_LIMITS,
  FILE_RETENTION_POLICIES,
} from "@/modules/Whiteboard/types/FileManagementTypes";
import crypto from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";
const STORAGE_BUCKET = "whiteboard-files";

class FileStorageService {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  private uploadCache = new Map<string, WhiteboardFile>();

  /**
   * Upload file to storage and create metadata record
   */
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    try {
      // Validate file
      const validation = this.validateFile(request.file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Calculate file hash for deduplication
      const fileHash = await this.calculateFileHash(request.file);

      // Check if file already exists (deduplication)
      const existingFile = await this.checkExistingFile(fileHash);
      if (existingFile) {
        return {
          success: true,
          file: existingFile,
        };
      }

      // Generate storage path
      const storagePath = this.generateStoragePath(
        request.boardId,
        request.file.name,
      );

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } =
        await this.supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, request.file, {
            cacheControl: "3600",
            upsert: false,
          });

      if (storageError) {
        return {
          success: false,
          error: `Storage upload failed: ${storageError.message}`,
        };
      }

      // Get signed URL
      const { data: urlData } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600 * 24 * 365); // 1 year

      // Create metadata record
      const fileRecord: WhiteboardFile = {
        id: crypto.randomUUID(),
        boardId: request.boardId,
        sessionId: request.sessionId,
        uploadedBy: this.getCurrentUserId(),
        fileName: request.file.name,
        fileType: request.file.type || this.inferFileType(request.file.name),
        fileSize: request.file.size,
        storagePath,
        storageUrl: urlData?.signedUrl || "",
        fileHash,
        accessLevel: request.accessLevel || "private",
        isScanned: false,
        metadata: request.metadata,
        uploadedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Insert metadata into database
      const { data: dbData, error: dbError } = await this.supabase
        .from("whiteboard_files")
        .insert([fileRecord])
        .select()
        .single();

      if (dbError) {
        // Rollback storage upload
        await this.supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        return {
          success: false,
          error: `Database insert failed: ${dbError.message}`,
        };
      }

      // Cache the file
      this.uploadCache.set(fileRecord.id, fileRecord);

      return {
        success: true,
        file: fileRecord,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete file from storage and database
   */
  async deleteFile(fileId: string, soft: boolean = true): Promise<boolean> {
    try {
      const file = await this.getFile(fileId);
      if (!file) {
        throw new Error("File not found");
      }

      if (soft) {
        // Soft delete - keep in database for audit
        const { error } = await this.supabase
          .from("whiteboard_files")
          .update({
            accessLevel: "deleted" as any,
            updatedAt: new Date(),
          })
          .eq("id", fileId);

        if (error) throw error;
      } else {
        // Hard delete - remove from storage and database
        await this.supabase.storage
          .from(STORAGE_BUCKET)
          .remove([file.storagePath]);

        const { error } = await this.supabase
          .from("whiteboard_files")
          .delete()
          .eq("id", fileId);

        if (error) throw error;
      }

      this.uploadCache.delete(fileId);
      return true;
    } catch (error) {
      console.error("Delete file error:", error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<WhiteboardFile | null> {
    try {
      // Check cache first
      if (this.uploadCache.has(fileId)) {
        return this.uploadCache.get(fileId) || null;
      }

      const { data, error } = await this.supabase
        .from("whiteboard_files")
        .select("*")
        .eq("id", fileId)
        .single();

      if (error) {
        console.error("Get file error:", error);
        return null;
      }

      // Cache result
      if (data) {
        this.uploadCache.set(fileId, data as WhiteboardFile);
      }

      return (data as WhiteboardFile) || null;
    } catch (error) {
      console.error("Get file error:", error);
      return null;
    }
  }

  /**
   * List files with search and filter options
   */
  async listFiles(options: FileSearchOptions): Promise<WhiteboardFile[]> {
    try {
      let query = this.supabase
        .from("whiteboard_files")
        .select("*")
        .neq("accessLevel", "deleted");

      if (options.boardId) {
        query = query.eq("boardId", options.boardId);
      }

      if (options.sessionId) {
        query = query.eq("sessionId", options.sessionId);
      }

      if (options.uploadedBy) {
        query = query.eq("uploadedBy", options.uploadedBy);
      }

      if (options.fileType) {
        query = query.eq("fileType", options.fileType);
      }

      if (options.accessLevel) {
        query = query.eq("accessLevel", options.accessLevel);
      }

      if (options.createdAfter) {
        query = query.gte("createdAt", new Date(options.createdAfter));
      }

      if (options.createdBefore) {
        query = query.lte("createdAt", new Date(options.createdBefore));
      }

      if (options.searchTerm) {
        query = query.ilike("fileName", `%${options.searchTerm}%`);
      }

      // Sorting
      const sortColumn = options.sortBy || "createdAt";
      const sortOrder = options.sortOrder === "asc" ? true : false;
      query = query.order(sortColumn, { ascending: sortOrder });

      // Pagination
      const offset = options.offset || 0;
      const limit = options.limit || 20;
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error("List files error:", error);
        return [];
      }

      return (data as WhiteboardFile[]) || [];
    } catch (error) {
      console.error("List files error:", error);
      return [];
    }
  }

  /**
   * Share file with users
   */
  async shareFile(
    fileId: string,
    userIds: string[],
  ): Promise<WhiteboardFileShare | null> {
    try {
      const shareToken = crypto.randomBytes(32).toString("hex");

      const { data, error } = await this.supabase
        .from("whiteboard_file_shares")
        .insert([
          {
            fileId,
            shareToken,
            createdBy: this.getCurrentUserId(),
            createdAt: new Date(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add file access for each user
      const accessRecords = userIds.map((userId) => ({
        fileId,
        userId,
        accessType: "view",
        grantedAt: new Date(),
        grantedBy: this.getCurrentUserId(),
      }));

      const { error: accessError } = await this.supabase
        .from("whiteboard_file_access")
        .insert(accessRecords);

      if (accessError) {
        console.error("Add access error:", accessError);
      }

      return (data as WhiteboardFileShare) || null;
    } catch (error) {
      console.error("Share file error:", error);
      return null;
    }
  }

  /**
   * Get file access records
   */
  async getFileAccess(fileId: string): Promise<WhiteboardFileAccess[]> {
    try {
      const { data, error } = await this.supabase
        .from("whiteboard_file_access")
        .select("*")
        .eq("fileId", fileId);

      if (error) throw error;

      return (data as WhiteboardFileAccess[]) || [];
    } catch (error) {
      console.error("Get file access error:", error);
      return [];
    }
  }

  /**
   * Change file access level
   */
  async changeFileAccess(
    fileId: string,
    accessLevel: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("whiteboard_files")
        .update({ accessLevel, updatedAt: new Date() })
        .eq("id", fileId);

      if (error) throw error;

      this.uploadCache.delete(fileId);
      return true;
    } catch (error) {
      console.error("Change access error:", error);
      return false;
    }
  }

  /**
   * Get storage quota for user
   */
  async getStorageQuota(userId?: string): Promise<StorageQuota> {
    try {
      const uid = userId || this.getCurrentUserId();

      const { data, error } = await this.supabase
        .from("whiteboard_files")
        .select("fileSize")
        .eq("uploadedBy", uid)
        .neq("accessLevel", "deleted");

      if (error) throw error;

      const usedSpace = (data as any[]).reduce(
        (sum, file) => sum + file.fileSize,
        0,
      );
      const totalQuota = FILE_SIZE_LIMITS.STORAGE_QUOTA;

      return {
        userId: uid,
        totalQuota,
        usedSpace,
        remainingSpace: totalQuota - usedSpace,
        fileCount: data?.length || 0,
        percentageUsed: (usedSpace / totalQuota) * 100,
      };
    } catch (error) {
      console.error("Get quota error:", error);
      return {
        userId: userId || "",
        totalQuota: FILE_SIZE_LIMITS.STORAGE_QUOTA,
        usedSpace: 0,
        remainingSpace: FILE_SIZE_LIMITS.STORAGE_QUOTA,
        fileCount: 0,
        percentageUsed: 0,
      };
    }
  }

  /**
   * Get file statistics
   */
  async getFileStatistics(boardId: string): Promise<FileStatistics> {
    try {
      const { data, error } = await this.supabase
        .from("whiteboard_files")
        .select("*")
        .eq("boardId", boardId)
        .neq("accessLevel", "deleted")
        .order("createdAt", { ascending: false });

      if (error) throw error;

      const files = (data as WhiteboardFile[]) || [];

      const filesByType: Record<string, number> = {};
      const filesByAccessLevel: Record<string, number> = {};
      let totalSize = 0;

      files.forEach((file) => {
        filesByType[file.fileType] = (filesByType[file.fileType] || 0) + 1;
        filesByAccessLevel[file.accessLevel] =
          (filesByAccessLevel[file.accessLevel] || 0) + 1;
        totalSize += file.fileSize;
      });

      return {
        totalFiles: files.length,
        totalSize,
        filesByType,
        filesByAccessLevel,
        averageFileSize: files.length > 0 ? totalSize / files.length : 0,
        recentUploads: files.slice(0, 5),
        mostAccessedFiles: [],
      };
    } catch (error) {
      console.error("Get statistics error:", error);
      return {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
        filesByAccessLevel: {},
        averageFileSize: 0,
        recentUploads: [],
        mostAccessedFiles: [],
      };
    }
  }

  /**
   * Check file integrity
   */
  async checkFileIntegrity(fileId: string): Promise<FileIntegrityCheck> {
    try {
      const file = await this.getFile(fileId);
      if (!file || !file.fileHash) {
        throw new Error("File not found or hash not available");
      }

      // Download and recalculate hash
      const response = await fetch(file.storageUrl);
      const blob = await response.blob();
      const calculatedHash = await this.calculateFileHash(
        new File([blob], file.fileName),
      );

      return {
        fileId,
        fileHash: file.fileHash,
        isValid: file.fileHash === calculatedHash,
        calculatedHash,
        lastCheckedAt: Date.now(),
      };
    } catch (error) {
      console.error("Check integrity error:", error);
      return {
        fileId,
        fileHash: "",
        isValid: false,
        lastCheckedAt: Date.now(),
      };
    }
  }

  /**
   * Validate file
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > FILE_SIZE_LIMITS.INDIVIDUAL_FILE) {
      return {
        valid: false,
        error: `File size exceeds limit of ${FILE_SIZE_LIMITS.INDIVIDUAL_FILE / (1024 * 1024)}MB`,
      };
    }

    // Add more validations as needed
    return { valid: true };
  }

  /**
   * Calculate file hash
   */
  private async calculateFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const buffer = event.target?.result;
        if (!buffer) {
          reject(new Error("Failed to read file"));
          return;
        }

        const hash = crypto
          .createHash("sha256")
          .update(Buffer.from(buffer as ArrayBuffer))
          .digest("hex");

        resolve(hash);
      };

      reader.onerror = () => reject(new Error("File read error"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Check if file already exists by hash
   */
  private async checkExistingFile(
    fileHash: string,
  ): Promise<WhiteboardFile | null> {
    try {
      const { data, error } = await this.supabase
        .from("whiteboard_files")
        .select("*")
        .eq("fileHash", fileHash)
        .single();

      if (error || !data) return null;

      return (data as WhiteboardFile) || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate storage path
   */
  private generateStoragePath(boardId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `boards/${boardId}/${timestamp}_${sanitized}`;
  }

  /**
   * Infer file type from extension
   */
  private inferFileType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return `application/${ext}` || "application/octet-stream";
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string {
    // This should be implemented based on your auth system
    return "current-user-id";
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.uploadCache.clear();
  }
}

export const fileStorageService = new FileStorageService();
export default FileStorageService;
