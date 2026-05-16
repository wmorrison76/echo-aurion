/** * Phase 11: Advanced Version Control - Branch & Conflict Types * Defines data structures for board branching and conflict resolution */ import { CanvasState } from "../types";
export type BranchStatus = "active" | "merged" | "archived" | "protected";
export interface BranchMetadata {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  lastModifiedBy?: string;
  lastModifiedAt?: number;
  status: BranchStatus;
  parentBranchId?: string; // For tracking branch lineage isDefault?: boolean; isProtected?: boolean;
}
export interface BranchSnapshot {
  branchId: string;
  snapshotId: string;
  canvasState: CanvasState;
  timestamp: number;
  changes: ChangeEntry[];
}
export interface ChangeEntry {
  id: string;
  type: "element-added" | "element-modified" | "element-deleted";
  elementId: string;
  elementType: string;
  timestamp: number;
  userId: string;
  previousValue?: any;
  newValue?: any;
}
export interface ConflictRegion {
  elementId: string;
  elementType: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  conflictType: "position" | "properties" | "deletion" | "content";
}
export interface MergeConflict {
  conflictId: string;
  sourceElementId: string;
  sourceBranchVersion: any;
  targetBranchVersion: any;
  conflictType: "position" | "properties" | "deletion" | "content";
  region: ConflictRegion;
  isResolved: boolean;
  resolution?: "keep-source" | "keep-target" | "merge" | "custom";
  customResolution?: any;
  severity: "low" | "medium" | "high";
}
export interface MergeContext {
  sourceBranch: BranchMetadata;
  targetBranch: BranchMetadata;
  conflicts: MergeConflict[];
  mergeCommitId?: string;
  mergedAt?: number;
  mergedBy?: string;
}
export interface BranchProtectionRule {
  ruleId: string;
  branchPattern: string; // Glob pattern like"main","release/*" requireReview?: boolean; minReviewCount?: number; requireTests?: boolean; requireStatusChecks?: boolean; allowForcePush?: boolean; dismissStaleReviews?: boolean; createdAt: number; createdBy: string;
}
export interface BranchReview {
  reviewId: string;
  branchId: string;
  createdBy: string;
  createdAt: number;
  status: "pending" | "approved" | "changes-requested" | "rejected";
  comments?: string;
  reviewedBy?: string;
  reviewedAt?: number;
}
export interface BranchDiff {
  added: ChangeEntry[];
  modified: ChangeEntry[];
  deleted: ChangeEntry[];
  summary: {
    totalChanges: number;
    elementsAdded: number;
    elementsModified: number;
    elementsDeleted: number;
  };
}
export interface BranchOperation {
  operationId: string;
  type: "create" | "merge" | "delete" | "rebase" | "squash";
  sourceBranch: string;
  targetBranch?: string;
  timestamp: number;
  performedBy: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  result?: { success: boolean; conflicts?: MergeConflict[]; message?: string };
}
