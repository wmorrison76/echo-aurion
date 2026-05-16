/** * Enterprise Sticky Notes Type Definitions * Complete type system for the enterprise-grade sticky notes system */ // =====================================================
// CORE NOTE TYPES
// ===================================================== export type NoteStatus ="draft" |"active" |"archived" |"deleted";
export type ContentType ="markdown" |"html" |"richtext";
export type AccessLevel ="view" |"comment" |"edit" |"manage";
export type ReminderType ="due_date" |"reminder" |"repeat";
export type AuditAction = |"created" |"updated" |"shared" |"commented" |"viewed" |"deleted" |"restored" |"archived"; export interface Note { id: string; workspaceId: string; ownerId: string; folderId?: string; title: string; content: string; contentType: ContentType; color: string; templateType?: string; status: NoteStatus; tags: string[]; metadata: Record<string, any>; createdAt: Date; updatedAt: Date; archivedAt?: Date; deletedAt?: Date;
} export interface NoteWithAccess extends Note { accessLevel: AccessLevel; isOwner: boolean; canEdit: boolean; canShare: boolean; canDelete: boolean; canComment: boolean;
} // =====================================================
// SHARING & PERMISSIONS
// ===================================================== export interface NoteShare { id: string; noteId: string; userId?: string; teamId?: string; roleId?: string; accessLevel: AccessLevel; grantedBy: string; grantedAt: Date; expiresAt?: Date;
} export interface ShareRequest { noteId: string; userId?: string; teamId?: string; roleId?: string; accessLevel: AccessLevel; expiresAt?: Date;
} export interface PublicShareLink { id: string; noteId: string; token: string; accessLevel: AccessLevel; createdBy: string; createdAt: Date; expiresAt?: Date; maxViews?: number; currentViews: number; isRevoked: boolean; revokedAt?: Date; revokedBy?: string;
} // =====================================================
// VERSION HISTORY & AUDIT
// ===================================================== export interface NoteVersion { id: string; noteId: string; versionNumber: number; title?: string; content?: string; changedBy: string; changedAt: Date; changeSummary?: string; diff?: Record<string, any>; isMajorVersion: boolean;
} export interface AuditEntry { id: string; noteId: string; userId: string; action: AuditAction; changeData?: Record<string, any>; ipAddress?: string; userAgent?: string; sessionId?: string; createdAt: Date;
} // =====================================================
// COMMENTS & COLLABORATION
// ===================================================== export interface NoteComment { id: string; noteId: string; parentCommentId?: string; authorId: string; authorName?: string; authorAvatar?: string; content: string; mentions: string[]; createdAt: Date; editedAt?: Date; deletedAt?: Date; childComments?: NoteComment[]; replyCount?: number;
} export interface CommentRequest { noteId: string; parentCommentId?: string; content: string; mentions: string[];
} // =====================================================
// REMINDERS & SCHEDULING
// ===================================================== export interface NoteReminder { id: string; noteId: string; userId: string; dueDate: Date; reminderType: ReminderType; notified: boolean; notifiedAt?: Date; acknowledged: boolean; createdAt: Date; updatedAt: Date;
} export interface ReminderRequest { noteId: string; dueDate: Date; reminderType?: ReminderType;
} // =====================================================
// FOLDERS & ORGANIZATION
// ===================================================== export interface NoteFolder { id: string; workspaceId: string; ownerId: string; parentId?: string; name: string; description?: string; color?: string; icon?: string; isShared: boolean; noteCount?: number; childFolderCount?: number; createdAt: Date; updatedAt: Date; deletedAt?: Date;
} // =====================================================
// TAGS & TAXONOMY
// ===================================================== export interface NoteTag { id: string; workspaceId: string; tagName: string; color?: string; usageCount: number; createdAt: Date; updatedAt: Date;
} // =====================================================
// TEMPLATES
// ===================================================== export interface NoteTemplate { id: string; workspaceId: string; ownerId: string; name: string; description?: string; content: string; contentType: ContentType; category?: string; isPublic: boolean; createdAt: Date; updatedAt: Date;
} // =====================================================
// SEARCH & FILTERING
// ===================================================== export interface SearchQuery { text?: string; tags?: string[]; folderId?: string; status?: NoteStatus; createdAfter?: Date; createdBefore?: Date; owner?: string; sharedWith?: string; sortBy?:"updated" |"created" |"title" |"relevance"; sortOrder?:"asc" |"desc"; limit?: number; offset?: number;
} export interface SearchResult { notes: Note[]; total: number; hasMore: boolean; facets: { tags: Array<{ name: string; count: number }>; folders: Array<{ id: string; name: string; count: number }>; status: Array<{ status: NoteStatus; count: number }>; };
} // =====================================================
// BULK OPERATIONS
// ===================================================== export interface BulkOperation { noteIds: string[]; operation:"tag" |"move" |"share" |"delete" |"archive" |"restore"; data?: Record<string, any>;
} export interface BulkOperationResult { success: number; failed: number; errors?: Array<{ noteId: string; error: string }>;
} // =====================================================
// API REQUEST/RESPONSE TYPES
// ===================================================== export interface CreateNoteRequest { title: string; content?: string; contentType?: ContentType; color?: string; folderId?: string; tags?: string[]; templateType?: string;
} export interface UpdateNoteRequest { title?: string; content?: string; color?: string; folderId?: string; tags?: string[]; status?: NoteStatus;
} export interface NoteListResponse { notes: Note[]; total: number; hasMore: boolean;
} export interface NoteDetailResponse { note: NoteWithAccess; sharing: NoteShare[]; versions: NoteVersion[]; comments: NoteComment[]; reminders: NoteReminder[]; auditLog: AuditEntry[];
} // =====================================================
// PAGINATION
// ===================================================== export interface PaginationParams { limit?: number; offset?: number;
} export interface PaginatedResponse<T> { data: T[]; total: number; limit: number; offset: number; hasMore: boolean;
} // =====================================================
// ERROR TYPES
// ===================================================== export interface ApiError { code: string; message: string; details?: Record<string, any>;
} export class NotesApiError extends Error { constructor( public code: string, public statusCode: number, message: string, public details?: Record<string, any>, ) { super(message); this.name ="NotesApiError"; }
} // =====================================================
// STATE MANAGEMENT
// ===================================================== export interface NotesState { notes: Record<string, Note>; selectedNoteId?: string; currentFolder?: string; filters: SearchQuery; isLoading: boolean; error?: ApiError; lastUpdated?: Date;
} export interface NoteEditorState { noteId?: string; title: string; content: string; isDirty: boolean; isSaving: boolean; lastSaved?: Date; autoSaveInterval?: number;
}
