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

interface ContentRelation {
  source_content_id: string;
  target_content_id: string;
  relation_type:
    | "references"
    | "related"
    | "ingredients"
    | "requires"
    | "depends_on";
  metadata?: Record<string, any>;
}

// Create relation between two content items
router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const {
    source_content_id,
    target_content_id,
    relation_type,
    metadata = {},
  } = req.body as ContentRelation;

  if (!source_content_id || !target_content_id || !relation_type) {
    return res.status(400).json({
      error:
        "Missing required fields: source_content_id, target_content_id, relation_type",
    });
  }

  // Prevent self-relations
  if (source_content_id === target_content_id) {
    return res
      .status(400)
      .json({ error: "Cannot create relation to same content" });
  }

  const { data, error } = await supabase
    .from("cms_content_relations")
    .insert({
      source_content_id,
      target_content_id,
      relation_type,
      metadata,
    })
    .select();

  if (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "This relation already exists" });
    }
    throw error;
  }

  res.json({ success: true, data: data[0] });
}));

// Get all relations for a content item (as source)
router.get("/source/:contentId", asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { type } = req.query;

  let query = supabase
    .from("cms_content_relations")
    .select(
      `
      *,
      target_content:target_content_id(id, title, slug, status)
    `
    )
    .eq("source_content_id", contentId);

  if (type) {
    query = query.eq("relation_type", type);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));

// Get all relations for a content item (as target)
router.get("/target/:contentId", asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { type } = req.query;

  let query = supabase
    .from("cms_content_relations")
    .select(
      `
      *,
      source_content:source_content_id(id, title, slug, status)
    `
    )
    .eq("target_content_id", contentId);

  if (type) {
    query = query.eq("relation_type", type);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));

// Get all relations for a content item (both directions)
router.get("/all/:contentId", asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;

  const { data: outgoing } = await supabase
    .from("cms_content_relations")
    .select(
      `
      *,
      target_content:target_content_id(id, title, slug, status)
    `
    )
    .eq("source_content_id", contentId);

  const { data: incoming } = await supabase
    .from("cms_content_relations")
    .select(
      `
      *,
      source_content:source_content_id(id, title, slug, status)
    `
    )
    .eq("target_content_id", contentId);

  res.json({
    success: true,
    data: {
      outgoing: outgoing || [],
      incoming: incoming || [],
      total: ((outgoing?.length || 0) + (incoming?.length || 0)),
    },
  });
}));

// Delete relation
router.delete("/:relationId", asyncHandler(async (req: Request, res: Response) => {
  const { relationId } = req.params;

  const { error } = await supabase
    .from("cms_content_relations")
    .delete()
    .eq("id", relationId);

  if (error) throw error;
  res.json({ success: true, message: "Relation deleted" });
}));

// Update relation metadata
router.put("/:relationId", asyncHandler(async (req: Request, res: Response) => {
  const { relationId } = req.params;
  const { metadata } = req.body;

  const { data, error } = await supabase
    .from("cms_content_relations")
    .update({
      metadata,
      updated_at: new Date(),
    })
    .eq("id", relationId)
    .select();

  if (error) throw error;
  res.json({ success: true, data: data[0] });
}));

// Build content graph (show all related content)
router.get("/graph/:contentId", asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const depth = parseInt(req.query.depth as string) || 2;

  const nodes = new Map<string, any>();
  const edges = new Map<string, any>();

  async function buildGraph(id: string, currentDepth: number) {
    if (currentDepth > depth || nodes.has(id)) return;

    const { data: content } = await supabase
      .from("cms_content")
      .select("id, title, slug, status")
      .eq("id", id)
      .single();

    if (content) {
      nodes.set(id, content);

      const { data: relations } = await supabase
        .from("cms_content_relations")
        .select("*")
        .or(
          `source_content_id.eq.${id},target_content_id.eq.${id}`
        );

      if (relations) {
        for (const rel of relations) {
          const relId = `${rel.source_content_id}-${rel.target_content_id}-${rel.relation_type}`;
          edges.set(relId, rel);

          const nextId =
            rel.source_content_id === id
              ? rel.target_content_id
              : rel.source_content_id;

          await buildGraph(nextId, currentDepth + 1);
        }
      }
    }
  }

  await buildGraph(contentId, 0);

  res.json({
    success: true,
    data: {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
      totalNodes: nodes.size,
      totalEdges: edges.size,
    },
  });
}));

export default router;
