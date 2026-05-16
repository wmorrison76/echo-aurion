export interface ContentType {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  fields?: any[];
}

export interface ContentItem {
  id: string;
  type_id: string;
  title: string;
  slug: string;
  status: "draft" | "review" | "approved" | "published" | "archived";
  language: string;
  content: Record<string, any>;
  metadata?: Record<string, any>;
  author_id?: string;
  reviewer_id?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PublishingWorkflow {
  id: string;
  content_id: string;
  step: string;
  actor_id?: string;
  notes?: string;
  created_at: string;
}

export interface CMSAnalytics {
  id: string;
  content_id: string;
  views: number;
  likes: number;
  comments_count: number;
}

class CMSService {
  private baseUrl = "/api/cms";

  async getContentTypes(): Promise<ContentType[]> {
    const res = await fetch(`${this.baseUrl}/content-types`);
    if (!res.ok) throw new Error("Failed to fetch content types");
    return res.json();
  }

  async getContentType(typeId: string): Promise<ContentType> {
    const res = await fetch(`${this.baseUrl}/content-types/${typeId}`);
    if (!res.ok) throw new Error("Failed to fetch content type");
    return res.json();
  }

  async getContent(filters?: {
    type?: string;
    status?: string;
    language?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ContentItem[]; total: number; limit: number; offset: number }> {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.language) params.append("language", filters.language);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());

    const res = await fetch(`${this.baseUrl}/content?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch content");
    return res.json();
  }

  async getContentItem(contentId: string): Promise<ContentItem> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}`);
    if (!res.ok) throw new Error("Failed to fetch content item");
    return res.json();
  }

  async createContent(data: {
    typeId: string;
    title: string;
    slug?: string;
    language?: string;
    content?: Record<string, any>;
    metadata?: Record<string, any>;
    authorId?: string;
  }): Promise<ContentItem> {
    const res = await fetch(`${this.baseUrl}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create content");
    }
    return res.json();
  }

  async updateContent(
    contentId: string,
    data: {
      title?: string;
      content?: Record<string, any>;
      metadata?: Record<string, any>;
      status?: string;
      reviewerComments?: string;
      reviewerId?: string;
    }
  ): Promise<ContentItem> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to update content");
    }
    return res.json();
  }

  async deleteContent(contentId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete content");
  }

  async submitForReview(contentId: string, submittedBy: string): Promise<ContentItem> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/submit-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submittedBy }),
    });
    if (!res.ok) throw new Error("Failed to submit for review");
    return res.json();
  }

  async approveContent(contentId: string, approvedBy: string, comments?: string): Promise<ContentItem> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedBy, comments }),
    });
    if (!res.ok) throw new Error("Failed to approve content");
    return res.json();
  }

  async rejectContent(contentId: string, rejectedBy: string, reason: string): Promise<ContentItem> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectedBy, reason }),
    });
    if (!res.ok) throw new Error("Failed to reject content");
    return res.json();
  }

  async publishContent(
    contentId: string,
    publishedBy: string,
    scheduledFor?: string
  ): Promise<{ message: string; data: ContentItem }> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publishedBy, scheduledFor }),
    });
    if (!res.ok) throw new Error("Failed to publish content");
    return res.json();
  }

  async getHistory(contentId: string): Promise<PublishingWorkflow[]> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  }

  async getVersions(contentId: string): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/versions`);
    if (!res.ok) throw new Error("Failed to fetch versions");
    return res.json();
  }

  async rollbackToVersion(contentId: string, versionNumber: number, rolledBackBy: string): Promise<ContentItem> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/rollback/${versionNumber}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rolledBackBy }),
    });
    if (!res.ok) throw new Error("Failed to rollback");
    return res.json();
  }

  async addComment(contentId: string, userId: string, comment: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, comment }),
    });
    if (!res.ok) throw new Error("Failed to add comment");
    return res.json();
  }

  async getComments(contentId: string): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/content/${contentId}/comments`);
    if (!res.ok) throw new Error("Failed to fetch comments");
    return res.json();
  }

  async getUserRoles(userId: string): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/users/${userId}/roles`);
    if (!res.ok) throw new Error("Failed to fetch user roles");
    return res.json();
  }

  async assignUserRole(
    userId: string,
    role: string,
    contentTypes?: string[],
    canPublish?: boolean,
    canDelete?: boolean
  ): Promise<any> {
    const res = await fetch(`${this.baseUrl}/users/${userId}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, contentTypes, canPublish, canDelete }),
    });
    if (!res.ok) throw new Error("Failed to assign role");
    return res.json();
  }

  async getAnalytics(contentId: string): Promise<CMSAnalytics> {
    const res = await fetch(`${this.baseUrl}/analytics/${contentId}`);
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  }

  async recordView(contentId: string): Promise<CMSAnalytics> {
    const res = await fetch(`${this.baseUrl}/analytics/${contentId}/view`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to record view");
    return res.json();
  }
}

export const cmsService = new CMSService();
