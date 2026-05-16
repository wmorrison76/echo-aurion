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

// Get all assets
router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const { type, tags, search, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from("cms_assets")
    .select("*", { count: "exact" });

  if (type) {
    query = query.eq("asset_type", type);
  }

  if (tags && typeof tags === "string") {
    const tagArray = tags.split(",");
    for (const tag of tagArray) {
      query = query.contains("tags", [tag]);
    }
  }

  if (search) {
    query = query.or(
      `file_name.ilike.%${search}%,description.ilike.%${search}%,alt_text.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query
    .order("uploaded_at", { ascending: false })
    .range(parseInt(offset as string), parseInt(limit as string) + parseInt(offset as string) - 1);

  if (error) throw error;

  res.json({
    data: data || [],
    total: count || 0,
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  });
}));

// Get asset by ID
router.get("/:assetId", asyncHandler(async (req: Request, res: Response) => {
  const { assetId } = req.params;

  const { data, error } = await supabase
    .from("cms_assets")
    .select("*")
    .eq("id", assetId)
    .single();

  if (error) throw error;

  // Get usage count
  const { data: usage } = await supabase
    .from("cms_asset_usage")
    .select("id", { count: "exact" })
    .eq("asset_id", assetId);

  res.json({
    ...data,
    usage_count: usage?.length || 0,
  });
}));

// Create asset record (after file uploaded to storage)
router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const {
    file_name,
    file_size,
    file_type,
    mime_type,
    storage_path,
    url,
    dimensions,
    alt_text,
    tags = [],
    description,
    asset_type,
    uploaded_by,
  } = req.body;

  if (
    !file_name ||
    !file_size ||
    !mime_type ||
    !storage_path ||
    !url ||
    !asset_type
  ) {
    return res.status(400).json({
      error:
        "Missing required fields: file_name, file_size, mime_type, storage_path, url, asset_type",
    });
  }

  const { data, error } = await supabase
    .from("cms_assets")
    .insert({
      file_name,
      file_size,
      file_type: file_type || mime_type,
      mime_type,
      storage_path,
      url,
      dimensions,
      alt_text,
      tags,
      description,
      asset_type,
      uploaded_by,
    })
    .select();

  if (error) throw error;

  res.json({
    success: true,
    message: "Asset created",
    data: data[0],
  });
}));

// Update asset metadata
router.put("/:assetId", asyncHandler(async (req: Request, res: Response) => {
  const { assetId } = req.params;
  const { alt_text, description, tags } = req.body;

  const { data, error } = await supabase
    .from("cms_assets")
    .update({
      alt_text,
      description,
      tags,
      updated_at: new Date(),
    })
    .eq("id", assetId)
    .select();

  if (error) throw error;

  res.json({
    success: true,
    message: "Asset updated",
    data: data[0],
  });
}));

// Delete asset
router.delete("/:assetId", asyncHandler(async (req: Request, res: Response) => {
  const { assetId } = req.params;

  // Check if asset is in use
  const { data: usage } = await supabase
    .from("cms_asset_usage")
    .select("content_id")
    .eq("asset_id", assetId)
    .limit(1);

  if (usage && usage.length > 0) {
    return res.status(409).json({
      error: "Cannot delete asset - it is currently in use",
      usage_count: usage.length,
    });
  }

  // Delete asset and versions
  await supabase
    .from("cms_asset_versions")
    .delete()
    .eq("asset_id", assetId);

  await supabase.from("cms_assets").delete().eq("id", assetId);

  res.json({
    success: true,
    message: "Asset deleted",
  });
}));

// Track asset usage
router.post("/:assetId/usage", asyncHandler(async (req: Request, res: Response) => {
  const { assetId } = req.params;
  const { content_id, usage_context = "generic" } = req.body;

  if (!content_id) {
    return res.status(400).json({ error: "content_id required" });
  }

  const { data, error } = await supabase
    .from("cms_asset_usage")
    .insert({
      asset_id: assetId,
      content_id,
      usage_context,
    })
    .select();

  if (error) throw error;

  res.json({
    success: true,
    message: "Asset usage tracked",
    data: data[0],
  });
}));

// Get asset usage
router.get("/:assetId/usage", asyncHandler(async (req: Request, res: Response) => {
  const { assetId } = req.params;

  const { data, error } = await supabase
    .from("cms_asset_usage")
    .select(
      `
      *,
      content:content_id(id, title, slug)
    `
    )
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  res.json({
    assetId,
    usageCount: data?.length || 0,
    usages: data || [],
  });
}));

// Get asset statistics
router.get("/stats/summary", asyncHandler(async (req: Request, res: Response) => {
  const { data: allAssets } = await supabase
    .from("cms_assets")
    .select("asset_type, file_size, id");

  const stats = {
    total_assets: allAssets?.length || 0,
    total_size: allAssets?.reduce((sum: number, a: any) => sum + a.file_size, 0) || 0,
    by_type: {} as Record<string, number>,
    most_used: [] as any[],
  };

  // Count by type
  allAssets?.forEach((asset: any) => {
    stats.by_type[asset.asset_type] =
      (stats.by_type[asset.asset_type] || 0) + 1;
  });

  // Get most used assets
  const { data: mostUsed } = await supabase
    .from("cms_assets")
    .select("id, file_name, usage_count")
    .order("usage_count", { ascending: false })
    .limit(10);

  stats.most_used = mostUsed || [];

  res.json(stats);
}));

export default router;
