// @ts-nocheck
/**
 * Enterprise Sticky Notes Service
 * Handles all business logic for notes operations, permissions, and collaboration
 */

import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

type AccessLevel = "view" | "comment" | "edit" | "manage";
type AuditAction = "created" | "updated" | "deleted" | "viewed" | "shared" | "commented";

type Note = {
  id: string;
  workspaceId: string;
  ownerId: string;
  folderId?: string | null;
  title: string;
  content: string;
  contentType: string;
  color: string;
  templateType?: string | null;
  status: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  deletedAt?: Date;
};

type NoteWithAccess = Note & {
  accessLevel: AccessLevel;
  isOwner: boolean;
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
  canComment: boolean;
};

type NoteShare = {
  id: string;
  noteId: string;
  userId?: string | null;
  teamId?: string | null;
  roleId?: string | null;
  accessLevel: AccessLevel;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
};

type SearchQuery = {
  text?: string;
  tags?: string[];
  folderId?: string;
  status?: string;
  owner?: string;
  sortBy?: "updated" | "created" | "title";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

type SearchResult = {
  notes: Array<Note | null>;
  total: number;
  hasMore: boolean;
  facets: {
    tags: Array<{ name: string; count: number }>;
    folders: Array<{ name: string; count: number }>;
    status: Array<{ status: string; count: number }>;
  };
};

type CreateNoteRequest = {
  title: string;
  content?: string;
  contentType?: string;
  color?: string;
  folderId?: string;
  tags?: string[];
  templateType?: string;
};

type UpdateNoteRequest = {
  title?: string;
  content?: string;
  contentType?: string;
  color?: string;
  folderId?: string;
  tags?: string[];
  templateType?: string;
  status?: string;
  metadata?: Record<string, any>;
};

type NoteVersion = {
  id: string;
  noteId: string;
  versionNumber: number;
  title?: string;
  content?: string;
  changedBy?: string;
  changedAt: Date;
  changeSummary?: string;
  diff?: Record<string, any>;
  isMajorVersion?: boolean;
};

type AuditEntry = {
  id: string;
  noteId: string;
  userId: string;
  action: AuditAction;
  changeData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: Date;
};

type NoteComment = {
  id: string;
  noteId: string;
  parentCommentId?: string;
  authorId: string;
  content: string;
  mentions: string[];
  createdAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
};

class EnterpriseNotesService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    );
  }

  // ===================================================
  // CRUD OPERATIONS
  // ===================================================

  async createNote(
    userId: string,
    workspaceId: string,
    data: CreateNoteRequest,
  ): Promise<Note> {
    try {
      const noteId = uuidv4();
      const now = new Date().toISOString();

      const { data: note, error } = await this.supabase
        .from("notes")
        .insert({
          id: noteId,
          workspace_id: workspaceId,
          owner_id: userId,
          title: data.title,
          content: data.content || "",
          content_type: data.contentType || "markdown",
          color: data.color || "#fef3c7",
          folder_id: data.folderId,
          tags: data.tags || [],
          template_type: data.templateType,
          status: "active",
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      await this.logAudit(noteId, userId, "created", { title: data.title });

      // Create initial version
      await this.createVersion(
        noteId,
        1,
        data.title,
        data.content || "",
        userId,
        "Initial version",
        true,
      );

      return this.formatNote(note);
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  }

  async updateNote(
    userId: string,
    noteId: string,
    data: UpdateNoteRequest,
  ): Promise<Note> {
    try {
      // Check permission
      await this.checkAccess(userId, noteId, "edit");

      const now = new Date().toISOString();

      const { data: note, error } = await this.supabase
        .from("notes")
        .update({
          ...data,
          updated_at: now,
        })
        .eq("id", noteId)
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      await this.logAudit(noteId, userId, "updated", data);

      // Create version if content changed
      if (data.content !== undefined || data.title !== undefined) {
        const latestVersion = await this.getLatestVersion(noteId);
        const nextVersion = (latestVersion?.versionNumber || 0) + 1;
        await this.createVersion(
          noteId,
          nextVersion,
          data.title,
          data.content,
          userId,
          "Updated",
        );
      }

      return this.formatNote(note);
    } catch (error) {
      console.error("Error updating note:", error);
      throw error;
    }
  }

  async getNote(userId: string, noteId: string): Promise<NoteWithAccess> {
    try {
      const { data: note, error } = await this.supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .is("deleted_at", null)
        .single();

      if (error || !note) throw new Error("Note not found");

      // Check access
      const accessLevel = await this.getAccessLevel(userId, noteId);
      if (!accessLevel) throw new Error("Access denied");

      // Log view
      await this.logAudit(noteId, userId, "viewed");

      return {
        ...this.formatNote(note),
        accessLevel,
        isOwner: note.owner_id === userId,
        canEdit: accessLevel === "edit" || accessLevel === "manage",
        canShare: accessLevel === "manage" || note.owner_id === userId,
        canDelete: note.owner_id === userId,
        canComment: accessLevel !== "view",
      };
    } catch (error) {
      console.error("Error getting note:", error);
      throw error;
    }
  }

  async deleteNote(
    userId: string,
    noteId: string,
    hardDelete = false,
  ): Promise<void> {
    try {
      // Check ownership
      const { data: note, error: fetchError } = await this.supabase
        .from("notes")
        .select("owner_id")
        .eq("id", noteId)
        .single();

      if (fetchError || note?.owner_id !== userId) {
        throw new Error("Only note owner can delete");
      }

      if (hardDelete) {
        // Hard delete
        const { error: deleteError } = await this.supabase
          .from("notes")
          .delete()
          .eq("id", noteId);

        if (deleteError) throw deleteError;
      } else {
        // Soft delete
        const { error: softDeleteError } = await this.supabase
          .from("notes")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", noteId);

        if (softDeleteError) throw softDeleteError;
      }

      // Log audit
      await this.logAudit(noteId, userId, "deleted");
    } catch (error) {
      console.error("Error deleting note:", error);
      throw error;
    }
  }

  // ===================================================
  // SEARCH & FILTERING
  // ===================================================

  async searchNotes(
    userId: string,
    workspaceId: string,
    query: SearchQuery,
  ): Promise<SearchResult> {
    try {
      let q = this.supabase
        .from("notes")
        .select("*, note_sharing!inner(*)", { count: "exact" })
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null);

      // Text search
      if (query.text) {
        q = q.or(`title.ilike.%${query.text}%,content.ilike.%${query.text}%`);
      }

      // Filter by tags
      if (query.tags?.length) {
        q = q.overlaps("tags", query.tags);
      }

      // Filter by folder
      if (query.folderId) {
        q = q.eq("folder_id", query.folderId);
      }

      // Filter by status
      if (query.status) {
        q = q.eq("status", query.status);
      }

      // Filter by owner
      if (query.owner) {
        q = q.eq("owner_id", query.owner);
      }

      // Sorting
      const sortBy = query.sortBy || "updated";
      const sortOrder =
        query.sortOrder === "asc" ? { ascending: true } : { ascending: false };

      if (sortBy === "updated") {
        q = q.order("updated_at", sortOrder);
      } else if (sortBy === "created") {
        q = q.order("created_at", sortOrder);
      } else if (sortBy === "title") {
        q = q.order("title", sortOrder);
      }

      // Pagination
      const limit = query.limit || 20;
      const offset = query.offset || 0;
      q = q.range(offset, offset + limit - 1);

      const { data: notes, count, error } = await q;

      if (error) throw error;

      // Filter by user access
      const accessibleNotes = await Promise.all(
        (notes || []).map(async (note) => {
          const accessLevel = await this.getAccessLevel(userId, note.id);
          return accessLevel ? note : null;
        }),
      );

      const filteredNotes = accessibleNotes.filter((n) => n !== null);

      // Aggregate facets
      const allTags = new Map<string, number>();
      const allStatuses = new Map<string, number>();

      filteredNotes.forEach((note) => {
        if (note.tags) {
          note.tags.forEach((tag: string) => {
            allTags.set(tag, (allTags.get(tag) || 0) + 1);
          });
        }
        allStatuses.set(note.status, (allStatuses.get(note.status) || 0) + 1);
      });

      return {
        notes: filteredNotes.map(this.formatNote),
        total: count || 0,
        hasMore: offset + limit < (count || 0),
        facets: {
          tags: Array.from(allTags.entries()).map(([name, count]) => ({
            name,
            count,
          })),
          folders: [],
          status: Array.from(allStatuses.entries()).map(([status, count]) => ({
            status: status as any,
            count,
          })),
        },
      };
    } catch (error) {
      console.error("Error searching notes:", error);
      throw error;
    }
  }

  // ===================================================
  // SHARING & PERMISSIONS
  // ===================================================

  async shareNote(
    userId: string,
    noteId: string,
    targetUserId: string,
    accessLevel: AccessLevel,
  ): Promise<NoteShare> {
    try {
      // Check ownership
      const { data: note, error: fetchError } = await this.supabase
        .from("notes")
        .select("owner_id")
        .eq("id", noteId)
        .single();

      if (fetchError || note?.owner_id !== userId) {
        throw new Error("Only note owner can share");
      }

      const shareId = uuidv4();

      const { data: share, error } = await this.supabase
        .from("note_sharing")
        .insert({
          id: shareId,
          note_id: noteId,
          user_id: targetUserId,
          access_level: accessLevel,
          granted_by: userId,
          granted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await this.logAudit(noteId, userId, "shared", {
        targetUserId,
        accessLevel,
      });

      return this.formatShare(share);
    } catch (error) {
      console.error("Error sharing note:", error);
      throw error;
    }
  }

  async revokeAccess(
    userId: string,
    noteId: string,
    shareId: string,
  ): Promise<void> {
    try {
      // Check ownership
      const { data: note } = await this.supabase
        .from("notes")
        .select("owner_id")
        .eq("id", noteId)
        .single();

      if (note?.owner_id !== userId) {
        throw new Error("Only note owner can revoke access");
      }

      const { error } = await this.supabase
        .from("note_sharing")
        .delete()
        .eq("id", shareId);

      if (error) throw error;

      // Log audit
      await this.logAudit(noteId, userId, "shared", {
        action: "revoked",
        shareId,
      });
    } catch (error) {
      console.error("Error revoking access:", error);
      throw error;
    }
  }

  async getAccessLevel(
    userId: string,
    noteId: string,
  ): Promise<AccessLevel | null> {
    try {
      const { data: note } = await this.supabase
        .from("notes")
        .select("owner_id")
        .eq("id", noteId)
        .single();

      if (note?.owner_id === userId) {
        return "manage";
      }

      const { data: share } = await this.supabase
        .from("note_sharing")
        .select("access_level")
        .eq("note_id", noteId)
        .eq("user_id", userId)
        .single();

      return share?.access_level || null;
    } catch (error) {
      console.error("Error getting access level:", error);
      return null;
    }
  }

  async checkAccess(
    userId: string,
    noteId: string,
    requiredLevel: AccessLevel,
  ): Promise<void> {
    const accessLevel = await this.getAccessLevel(userId, noteId);

    const levelHierarchy: Record<AccessLevel, number> = {
      view: 1,
      comment: 2,
      edit: 3,
      manage: 4,
    };

    if (
      !accessLevel ||
      levelHierarchy[accessLevel] < levelHierarchy[requiredLevel]
    ) {
      throw new Error("Insufficient permissions");
    }
  }

  // ===================================================
  // VERSION HISTORY
  // ===================================================

  async getVersionHistory(
    userId: string,
    noteId: string,
  ): Promise<NoteVersion[]> {
    try {
      await this.checkAccess(userId, noteId, "view");

      const { data: versions, error } = await this.supabase
        .from("note_versions")
        .select("*")
        .eq("note_id", noteId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      return (versions || []).map(this.formatVersion);
    } catch (error) {
      console.error("Error getting version history:", error);
      throw error;
    }
  }

  async restoreVersion(
    userId: string,
    noteId: string,
    versionNumber: number,
  ): Promise<Note> {
    try {
      await this.checkAccess(userId, noteId, "edit");

      const { data: version, error: versionError } = await this.supabase
        .from("note_versions")
        .select("*")
        .eq("note_id", noteId)
        .eq("version_number", versionNumber)
        .single();

      if (versionError || !version) throw new Error("Version not found");

      // Update note
      return this.updateNote(userId, noteId, {
        title: version.title,
        content: version.content,
      });
    } catch (error) {
      console.error("Error restoring version:", error);
      throw error;
    }
  }

  // ===================================================
  // COMMENTS
  // ===================================================

  async addComment(
    userId: string,
    noteId: string,
    content: string,
    mentions: string[] = [],
  ): Promise<NoteComment> {
    try {
      await this.checkAccess(userId, noteId, "comment");

      const commentId = uuidv4();

      const { data: comment, error } = await this.supabase
        .from("note_comments")
        .insert({
          id: commentId,
          note_id: noteId,
          author_id: userId,
          content,
          mentions,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await this.logAudit(noteId, userId, "commented", { commentId });

      return this.formatComment(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  async getComments(userId: string, noteId: string): Promise<NoteComment[]> {
    try {
      await this.checkAccess(userId, noteId, "view");

      const { data: comments, error } = await this.supabase
        .from("note_comments")
        .select("*")
        .eq("note_id", noteId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (comments || []).map(this.formatComment);
    } catch (error) {
      console.error("Error getting comments:", error);
      throw error;
    }
  }

  // ===================================================
  // AUDIT LOGGING
  // ===================================================

  async logAudit(
    noteId: string,
    userId: string,
    action: AuditAction,
    changeData?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabase.from("note_audit_log").insert({
        id: uuidv4(),
        note_id: noteId,
        user_id: userId,
        action,
        change_data: changeData || {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error logging audit:", error);
      // Don't throw - audit logging shouldn't block main operations
    }
  }

  async getAuditLog(userId: string, noteId: string): Promise<AuditEntry[]> {
    try {
      // Only owner can view audit log
      const { data: note } = await this.supabase
        .from("notes")
        .select("owner_id")
        .eq("id", noteId)
        .single();

      if (note?.owner_id !== userId) {
        throw new Error("Only note owner can view audit log");
      }

      const { data: auditLog, error } = await this.supabase
        .from("note_audit_log")
        .select("*")
        .eq("note_id", noteId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (auditLog || []).map(this.formatAuditEntry);
    } catch (error) {
      console.error("Error getting audit log:", error);
      throw error;
    }
  }

  // ===================================================
  // HELPERS
  // ===================================================

  private formatNote(note: any): Note {
    return {
      id: note.id,
      workspaceId: note.workspace_id,
      ownerId: note.owner_id,
      folderId: note.folder_id,
      title: note.title,
      content: note.content,
      contentType: note.content_type,
      color: note.color,
      templateType: note.template_type,
      status: note.status,
      tags: note.tags || [],
      metadata: note.metadata || {},
      createdAt: new Date(note.created_at),
      updatedAt: new Date(note.updated_at),
      archivedAt: note.archived_at ? new Date(note.archived_at) : undefined,
      deletedAt: note.deleted_at ? new Date(note.deleted_at) : undefined,
    };
  }

  private formatShare(share: any): NoteShare {
    return {
      id: share.id,
      noteId: share.note_id,
      userId: share.user_id,
      teamId: share.team_id,
      roleId: share.role_id,
      accessLevel: share.access_level,
      grantedBy: share.granted_by,
      grantedAt: new Date(share.granted_at),
      expiresAt: share.expires_at ? new Date(share.expires_at) : undefined,
    };
  }

  private formatVersion(version: any): NoteVersion {
    return {
      id: version.id,
      noteId: version.note_id,
      versionNumber: version.version_number,
      title: version.title,
      content: version.content,
      changedBy: version.changed_by,
      changedAt: new Date(version.changed_at),
      changeSummary: version.change_summary,
      diff: version.diff,
      isMajorVersion: version.is_major_version,
    };
  }

  private formatComment(comment: any): NoteComment {
    return {
      id: comment.id,
      noteId: comment.note_id,
      parentCommentId: comment.parent_comment_id,
      authorId: comment.author_id,
      content: comment.content,
      mentions: comment.mentions || [],
      createdAt: new Date(comment.created_at),
      editedAt: comment.edited_at ? new Date(comment.edited_at) : undefined,
      deletedAt: comment.deleted_at ? new Date(comment.deleted_at) : undefined,
    };
  }

  private formatAuditEntry(entry: any): AuditEntry {
    return {
      id: entry.id,
      noteId: entry.note_id,
      userId: entry.user_id,
      action: entry.action,
      changeData: entry.change_data,
      ipAddress: entry.ip_address,
      userAgent: entry.user_agent,
      sessionId: entry.session_id,
      createdAt: new Date(entry.created_at),
    };
  }

  private async getLatestVersion(noteId: string): Promise<NoteVersion | null> {
    const { data: version } = await this.supabase
      .from("note_versions")
      .select("*")
      .eq("note_id", noteId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    return version ? this.formatVersion(version) : null;
  }

  private async createVersion(
    noteId: string,
    versionNumber: number,
    title?: string,
    content?: string,
    changedBy?: string,
    changeSummary?: string,
    isMajor = false,
  ): Promise<void> {
    await this.supabase.from("note_versions").insert({
      id: uuidv4(),
      note_id: noteId,
      version_number: versionNumber,
      title,
      content,
      changed_by: changedBy || "system",
      changed_at: new Date().toISOString(),
      change_summary: changeSummary,
      is_major_version: isMajor,
    });
  }
}

// Singleton instance
let serviceInstance: EnterpriseNotesService;

export function getNotesService(): EnterpriseNotesService {
  if (!serviceInstance) {
    serviceInstance = new EnterpriseNotesService();
  }
  return serviceInstance;
}

export default EnterpriseNotesService;
