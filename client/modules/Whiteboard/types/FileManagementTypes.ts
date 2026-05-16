/** * Phase 14: Enterprise File Management Types * Type definitions for file storage, sharing, and access control */ export type FileAccessLevel =
  "private" | "shared" | "public";
export type FileAccessType = "view" | "download" | "delete" | "edit";
export type FileOperationType =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "SHARE"
  | "UNSHARE"; /** * File metadata stored in database */
export interface WhiteboardFile {
  id: string;
  boardId: string;
  sessionId: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  storageUrl: string;
  fileHash?: string;
  accessLevel: FileAccessLevel;
  isScanned: boolean;
  scanResult?: string;
  metadata?: Record<string, any>;
  uploadedAt: number;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
} /** * File access control record */
export interface WhiteboardFileAccess {
  id: string;
  fileId: string;
  userId: string;
  accessType: FileAccessType;
  grantedAt: number;
  grantedBy?: string;
  createdAt: number;
} /** * File version for audit trail */
export interface WhiteboardFileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  storageUrl: string;
  fileSize: number;
  createdBy: string;
  createdAt: number;
  metadata?: Record<string, any>;
} /** * File audit log entry */
export interface WhiteboardFileAudit {
  id: string;
  fileId: string;
  operationType: FileOperationType;
  userId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
} /** * Shareable file link */
export interface WhiteboardFileShare {
  id: string;
  fileId: string;
  shareToken: string;
  createdBy: string;
  expiresAt?: number;
  accessCount: number;
  maxAccessCount?: number;
  passwordProtected: boolean;
  createdAt: number;
  updatedAt: number;
} /** * File upload request */
export interface FileUploadRequest {
  file: File;
  boardId: string;
  sessionId: string;
  accessLevel?: FileAccessLevel;
  metadata?: Record<string, any>;
} /** * File upload response */
export interface FileUploadResponse {
  success: boolean;
  file?: WhiteboardFile;
  error?: string;
  progress?: number;
} /** * File batch operation */
export interface FileBatchOperation {
  fileIds: string[];
  operation: "delete" | "share" | "unshare" | "changeAccess";
  accessLevel?: FileAccessLevel;
  userIds?: string[];
} /** * File search/filter options */
export interface FileSearchOptions {
  boardId?: string;
  sessionId?: string;
  uploadedBy?: string;
  fileType?: string;
  searchTerm?: string;
  accessLevel?: FileAccessLevel;
  createdAfter?: number;
  createdBefore?: number;
  sortBy?: "name" | "date" | "size";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
} /** * File statistics */
export interface FileStatistics {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  filesByAccessLevel: Record<FileAccessLevel, number>;
  averageFileSize: number;
  recentUploads: WhiteboardFile[];
  mostAccessedFiles: Array<WhiteboardFile & { accessCount: number }>;
} /** * File manager state */
export interface FileManagerState {
  files: WhiteboardFile[];
  selectedFileIds: Set<string>;
  isLoading: boolean;
  error?: string;
  searchOptions: FileSearchOptions;
  pagination: { page: number; pageSize: number; total: number };
  sortBy: "name" | "date" | "size";
  sortOrder: "asc" | "desc";
} /** * File upload progress tracker */
export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "processing" | "complete" | "error";
  error?: string;
  startedAt: number;
  completedAt?: number;
} /** * File deletion request (soft delete for audit) */
export interface FileDeleteRequest {
  fileId: string;
  reason?: string;
  soft?: boolean;
} /** * File sharing configuration */
export interface FileSharingConfig {
  fileId: string;
  shareToken: string;
  expiresAt?: number;
  maxAccessCount?: number;
  passwordProtected?: boolean;
  accessType: FileAccessType;
  allowDownload: boolean;
  allowShare: boolean;
  notifyRecipients: boolean;
  recipientEmails?: string[];
} /** * File integrity check result */
export interface FileIntegrityCheck {
  fileId: string;
  fileHash: string;
  isValid: boolean;
  calculatedHash?: string;
  lastCheckedAt: number;
} /** * File storage quota */
export interface StorageQuota {
  userId: string;
  totalQuota: number;
  usedSpace: number;
  remainingSpace: number;
  fileCount: number;
  percentageUsed: number;
} /** * File notification event */
export interface FileNotificationEvent {
  type: "file-uploaded" | "file-deleted" | "file-shared" | "file-accessed";
  fileId: string;
  fileName: string;
  userId: string;
  timestamp: number;
  metadata?: Record<string, any>;
} /** * File manager context (for React) */
export interface FileManagerContextType {
  state: FileManagerState;
  uploadFile: (request: FileUploadRequest) => Promise<WhiteboardFile>;
  deleteFile: (fileId: string) => Promise<boolean>;
  shareFile: (
    fileId: string,
    userIds: string[],
  ) => Promise<WhiteboardFileShare>;
  unshareFile: (fileId: string, userId?: string) => Promise<boolean>;
  getFile: (fileId: string) => Promise<WhiteboardFile | null>;
  listFiles: (options: FileSearchOptions) => Promise<WhiteboardFile[]>;
  getFileVersions: (fileId: string) => Promise<WhiteboardFileVersion[]>;
  restoreFileVersion: (
    fileId: string,
    versionNumber: number,
  ) => Promise<boolean>;
  getFileAuditLog: (fileId: string) => Promise<WhiteboardFileAudit[]>;
  changeFileAccess: (
    fileId: string,
    accessLevel: FileAccessLevel,
  ) => Promise<boolean>;
  getStorageQuota: () => Promise<StorageQuota>;
} /** * Supported file types for whiteboard */
export const SUPPORTED_FILE_TYPES = {
  DOCUMENTS: [".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".rtf"],
  IMAGES: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
  VIDEOS: [".mp4", ".webm", ".mov", ".avi", ".mkv"],
  AUDIO: [".mp3", ".wav", ".m4a", ".flac", ".aac"],
  ARCHIVES: [".zip", ".rar", ".7z", ".tar", ".gz"],
  DATA: [".json", ".xml", ".csv", ".sql"],
} as const; /** * File size limits (in bytes) */
export const FILE_SIZE_LIMITS = {
  INDIVIDUAL_FILE: 500 * 1024 * 1024, // 500 MB STORAGE_QUOTA: 10 * 1024 * 1024 * 1024, // 10 GB DAILY_UPLOAD: 5 * 1024 * 1024 * 1024, // 5 GB per day
} as const; /** * File retention policies */
export const FILE_RETENTION_POLICIES = {
  TEMPORARY: 30 * 24 * 60 * 60 * 1000, // 30 days STANDARD: 90 * 24 * 60 * 60 * 1000, // 90 days LONG_TERM: 365 * 24 * 60 * 60 * 1000, // 1 year PERMANENT: null, // Never delete
} as const;
