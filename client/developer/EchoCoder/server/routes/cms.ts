import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router: Router = express.Router();

// Create Supabase client only if credentials are available
let supabase: ReturnType<typeof createClient> | null = null;

if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

// Middleware to check if Supabase is configured
const ensureSupabase = (req: Request, res: Response, next: Function) => {
  if (!supabase) {
    return res.status(503).json({
      error: "CMS service unavailable. Supabase credentials not configured.",
      hint: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.",
    });
  }
  next();
};

// Apply Supabase check to all routes
router.use(ensureSupabase);

// Get all content types
router.get("/content-types", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("cms_content_types")
      .select("*")
      .order("label", { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single content type with fields
router.get("/content-types/:typeId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("cms_content_types")
      .select("*")
      .eq("id", req.params.typeId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all content (with filtering)
router.get("/content", async (req: Request, res: Response) => {
  try {
    const { type, status, language, search, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from("cms_content")
      .select("*, cms_content_types(label, name)", { count: "exact" });

    if (type) query = query.eq("type_id", type);
    if (status) query = query.eq("status", status);
    if (language) query = query.eq("language", language);
    if (search) query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;
    res.json({ data, total: count, limit: Number(limit), offset: Number(offset) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single content item
router.get("/content/:contentId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("cms_content")
      .select("*, cms_content_types(*, label, name), cms_content_versions(version_number, created_at, created_by)")
      .eq("id", req.params.contentId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new content
router.post("/content", async (req: Request, res: Response) => {
  try {
    const { typeId, title, slug, status = "draft", language = "en", content, metadata, authorId } = req.body;

    const { data, error } = await supabase
      .from("cms_content")
      .insert({
        type_id: typeId,
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
        status,
        language,
        content: content || {},
        metadata: metadata || {},
        author_id: authorId,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update content
router.patch("/content/:contentId", async (req: Request, res: Response) => {
  try {
    const { title, content, metadata, status, reviewerComments, reviewerId } = req.body;
    const { contentId } = req.params;

    const { data, error } = await supabase
      .from("cms_content")
      .update({
        title,
        content: content || undefined,
        metadata: metadata || undefined,
        status,
        reviewer_comments: reviewerComments,
        reviewer_id: reviewerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contentId)
      .select()
      .single();

    if (error) throw error;

    // Log to publishing workflow
    if (status) {
      await supabase.from("cms_publishing_workflow").insert({
        content_id: contentId,
        step: status,
        actor_id: reviewerId,
        notes: reviewerComments,
      });
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete content
router.delete("/content/:contentId", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase
      .from("cms_content")
      .delete()
      .eq("id", req.params.contentId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Publish content (with workflow)
router.post("/content/:contentId/publish", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { publishedBy, scheduledFor } = req.body;

    if (scheduledFor) {
      // Schedule for later
      const { data, error } = await supabase
        .from("cms_scheduled_publishing")
        .insert({
          content_id: contentId,
          scheduled_for: scheduledFor,
          scheduled_by: publishedBy,
        })
        .select()
        .single();

      if (error) throw error;
      res.json({ message: "Content scheduled for publishing", data });
      return;
    }

    // Publish immediately
    const { data, error } = await supabase
      .from("cms_content")
      .update({
        status: "published",
        published_by: publishedBy,
        published_at: new Date().toISOString(),
      })
      .eq("id", contentId)
      .select()
      .single();

    if (error) throw error;

    // Log workflow step
    await supabase.from("cms_publishing_workflow").insert({
      content_id: contentId,
      step: "published",
      actor_id: publishedBy,
    });

    res.json({ message: "Content published", data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit for review
router.post("/content/:contentId/submit-review", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { submittedBy } = req.body;

    const { data, error } = await supabase
      .from("cms_content")
      .update({
        status: "review",
      })
      .eq("id", contentId)
      .select()
      .single();

    if (error) throw error;

    // Log workflow
    await supabase.from("cms_publishing_workflow").insert({
      content_id: contentId,
      step: "in_review",
      actor_id: submittedBy,
    });

    res.json({ message: "Content submitted for review", data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve content
router.post("/content/:contentId/approve", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { approvedBy, comments } = req.body;

    const { data, error } = await supabase
      .from("cms_content")
      .update({
        status: "approved",
        reviewer_id: approvedBy,
        reviewer_comments: comments,
      })
      .eq("id", contentId)
      .select()
      .single();

    if (error) throw error;

    // Log workflow
    await supabase.from("cms_publishing_workflow").insert({
      content_id: contentId,
      step: "approved",
      actor_id: approvedBy,
      notes: comments,
    });

    res.json({ message: "Content approved", data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject content
router.post("/content/:contentId/reject", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { rejectedBy, reason } = req.body;

    const { data, error } = await supabase
      .from("cms_content")
      .update({
        status: "draft",
        reviewer_id: rejectedBy,
        reviewer_comments: `Rejected: ${reason}`,
      })
      .eq("id", contentId)
      .select()
      .single();

    if (error) throw error;

    // Log workflow
    await supabase.from("cms_publishing_workflow").insert({
      content_id: contentId,
      step: "rejected",
      actor_id: rejectedBy,
      notes: reason,
    });

    res.json({ message: "Content rejected", data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get content history
router.get("/content/:contentId/history", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("cms_publishing_workflow")
      .select("*")
      .eq("content_id", req.params.contentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get content versions
router.get("/content/:contentId/versions", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("cms_content_versions")
      .select("*")
      .eq("content_id", req.params.contentId)
      .order("version_number", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rollback to previous version
router.post("/content/:contentId/rollback/:versionNumber", async (req: Request, res: Response) => {
  try {
    const { contentId, versionNumber } = req.params;
    const { rolledBackBy } = req.body;

    const { data: version, error: versionError } = await supabase
      .from("cms_content_versions")
      .select("*")
      .eq("content_id", contentId)
      .eq("version_number", versionNumber)
      .single();

    if (versionError) throw versionError;

    const { data, error } = await supabase
      .from("cms_content")
      .update({
        title: version.title,
        content: version.content,
        metadata: version.metadata,
      })
      .eq("id", contentId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: `Rolled back to version ${versionNumber}`, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to content
router.post("/content/:contentId/comment", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { userId, comment } = req.body;

    const { data, error } = await supabase
      .from("cms_content_comments")
      .insert({
        content_id: contentId,
        user_id: userId,
        comment,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments
router.get("/content/:contentId/comments", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("cms_content_comments")
      .select("*")
      .eq("content_id", req.params.contentId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user roles
router.get("/users/:userId/roles", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("cms_user_roles")
      .select("*")
      .eq("user_id", req.params.userId);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Assign user role
router.post("/users/:userId/roles", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role, contentTypes = [], canPublish = false, canDelete = false } = req.body;

    const { data, error } = await supabase
      .from("cms_user_roles")
      .insert({
        user_id: userId,
        role,
        content_types: contentTypes,
        can_publish: canPublish,
        can_delete: canDelete,
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get content analytics
router.get("/analytics/:contentId", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("cms_analytics")
      .select("*")
      .eq("content_id", req.params.contentId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Increment view count
router.post("/analytics/:contentId/view", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;

    const { data: current } = await supabase
      .from("cms_analytics")
      .select("views")
      .eq("content_id", contentId)
      .single();

    const { data, error } = await supabase
      .from("cms_analytics")
      .update({
        views: (current?.views || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("content_id", contentId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
