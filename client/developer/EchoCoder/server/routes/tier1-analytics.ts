import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";

const router: Router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
);

// All routes require authentication
router.use(validateAuth);

// Get dashboard overview
router.get("/dashboard/overview", asyncHandler(async (req: Request, res: Response) => {
  const { from_date, to_date } = req.query;

  const { data: contentStats } = await supabase
    .from("cms_content")
    .select("status")
    .throwOnError();

  const stats = {
    total_content: contentStats?.length || 0,
    published: contentStats?.filter((c: any) => c.status === "published")
      .length || 0,
    draft: contentStats?.filter((c: any) => c.status === "draft").length || 0,
    review: contentStats?.filter((c: any) => c.status === "review").length || 0,
    archived: contentStats?.filter((c: any) => c.status === "archived")
      .length || 0,
  };

  const { data: topContent } = await supabase
    .from("cms_content_performance")
    .select("content_id, views, likes, comments_count, engagement_score")
    .order("views", { ascending: false })
    .limit(10);

  const { data: recentContent } = await supabase
    .from("cms_content")
    .select("id, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  res.json({
    stats,
    topContent: topContent || [],
    recentContent: recentContent || [],
  });
}));

// Get analytics for specific content
router.get("/content/:contentId", asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;

  const { data, error } = await supabase
    .from("cms_content_performance")
    .select("*")
    .eq("content_id", contentId)
    .single();

  if (error && error.code === "PGRST116") {
    return res.json({ message: "No analytics data for this content" });
  }

  if (error) throw error;

  const { data: content } = await supabase
    .from("cms_content")
    .select("id, title, slug, status, created_at")
    .eq("id", contentId)
    .single();

  res.json({
    ...data,
    content,
  });
}));

// Get trending content
router.get("/trending", asyncHandler(async (req: Request, res: Response) => {
  const { limit = 20 } = req.query;

  const { data, error } = await supabase
    .from("cms_content_performance")
    .select("content_id, views, likes, comments_count, trending_score")
    .order("trending_score", { ascending: false })
    .limit(parseInt(limit as string));

  if (error) throw error;

  // Get content details
  const contentIds = data?.map((d: any) => d.content_id) || [];

  const { data: contentDetails } = await supabase
    .from("cms_content")
    .select("id, title, slug, status")
    .in("id", contentIds);

  const contentMap = new Map(contentDetails?.map((c: any) => [c.id, c]));

  const trending = data?.map((d: any) => ({
    ...d,
    content: contentMap.get(d.content_id),
  })) || [];

  res.json(trending);
}));

// Get analytics for multiple content items
router.post("/bulk", asyncHandler(async (req: Request, res: Response) => {
  const { content_ids } = req.body;

  if (!content_ids || !Array.isArray(content_ids)) {
    return res.status(400).json({
      error: "Missing required field: content_ids (array)",
    });
  }

  const { data, error } = await supabase
    .from("cms_content_performance")
    .select("*")
    .in("content_id", content_ids);

  if (error) throw error;

  // Calculate aggregates
  const aggregates = {
    total_views: data?.reduce((sum: number, d: any) => sum + d.views, 0) || 0,
    total_engagement: data?.reduce((sum: number, d: any) => sum + (d.likes + d.comments_count), 0) || 0,
    average_engagement_score:
      (data?.reduce((sum: number, d: any) => sum + d.engagement_score, 0) || 0) / (data?.length || 1),
  };

  res.json({
    items: data || [],
    aggregates,
  });
}));

// Update analytics (track view, like, comment)
router.post("/event/:contentId", asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { event_type, value = 1 } = req.body;

  if (!event_type) {
    return res.status(400).json({ error: "Missing event_type" });
  }

  const { data: existing } = await supabase
    .from("cms_content_performance")
    .select("*")
    .eq("content_id", contentId)
    .single();

  if (!existing) {
    // Create new analytics record
    await supabase.from("cms_content_performance").insert({
      content_id: contentId,
      views: event_type === "view" ? value : 0,
      likes: event_type === "like" ? value : 0,
      comments_count: event_type === "comment" ? value : 0,
    });
  } else {
    // Update existing
    const updates: Record<string, any> = {
      updated_at: new Date(),
      last_viewed_at:
        event_type === "view" ? new Date() : existing.last_viewed_at,
    };

    if (event_type === "view") {
      updates.views = existing.views + value;
    } else if (event_type === "like") {
      updates.likes = existing.likes + value;
    } else if (event_type === "comment") {
      updates.comments_count = existing.comments_count + value;
    }

    // Calculate engagement score (0-100)
    const totalInteractions =
      (updates.likes || existing.likes) +
      (updates.comments_count || existing.comments_count) * 2;
    updates.engagement_score = Math.min(
      100,
      Math.floor((totalInteractions / 100) * 100)
    );

    await supabase
      .from("cms_content_performance")
      .update(updates)
      .eq("content_id", contentId);
  }

  res.json({ success: true, message: `${event_type} event recorded` });
}));

// Export analytics as CSV
router.get("/export/csv", asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throwAppError("User not authenticated", 401);
  }

  const { data: analytics } = await supabase
    .from("cms_content_performance")
    .select("*")
    .order("trending_score", { ascending: false });

  if (!analytics || analytics.length === 0) {
    return res.json({ message: "No analytics data to export" });
  }

  const csv = [
    [
      "Content ID",
      "Views",
      "Likes",
      "Comments",
      "Engagement Score",
      "Trending Score",
      "Last Viewed",
    ],
    ...analytics.map((row: any) => [
      row.content_id,
      row.views,
      row.likes,
      row.comments_count,
      row.engagement_score,
      row.trending_score,
      row.last_viewed_at || "",
    ]),
  ]
    .map((row) => row.join(","))
    .join("\n");

  // Log export
  await supabase.from("cms_export_logs").insert({
    user_id: userId,
    export_format: "csv",
    file_name: `analytics-${Date.now()}.csv`,
    file_size: csv.length,
    status: "completed",
  });

  res.set("Content-Type", "text/csv");
  res.set(
    "Content-Disposition",
    `attachment; filename="analytics-${Date.now()}.csv"`
  );
  res.send(csv);
}));

export default router;
