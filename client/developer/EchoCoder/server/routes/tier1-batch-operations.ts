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

interface BatchOperationRequest {
  operation_type: "edit" | "delete" | "publish" | "unpublish" | "archive";
  content_ids: string[];
  action_data?: Record<string, any>;
}

// Create batch operation
router.post("/operations", asyncHandler(async (req: Request, res: Response) => {
  const { operation_type, content_ids, action_data } =
    req.body as BatchOperationRequest;
  const userId = (req as any).user?.id;

  if (!userId) {
    throwAppError("User not authenticated", 401);
  }

  if (!operation_type || !content_ids) {
    return res.status(400).json({
      error: "Missing required fields: operation_type, content_ids",
    });
  }

  const { data, error } = await supabase
    .from("cms_batch_operations")
    .insert({
      operation_type,
      content_ids,
      action_data: action_data || {},
      user_id: userId,
      status: "pending",
      total_items: content_ids.length,
    })
    .select();

  if (error) throw error;

  // Process batch operation asynchronously
  processBatchOperation(data[0].id, operation_type, content_ids, action_data);

  res.json({ 
    success: true,
    id: data[0].id, 
    status: "pending", 
    message: "Batch operation queued" 
  });
}));

// Get batch operation status
router.get("/operations/:id", asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("cms_batch_operations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  res.json({ success: true, data });
}));

// List batch operations for current user
router.get("/operations", asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throwAppError("User not authenticated", 401);
  }

  const { data, error } = await supabase
    .from("cms_batch_operations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));

// Cancel batch operation
router.post("/operations/:id/cancel", asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("cms_batch_operations")
    .update({ status: "cancelled", completed_at: new Date() })
    .eq("id", id)
    .select();

  if (error) throw error;
  res.json({ success: true, message: "Batch operation cancelled", data: data[0] });
}));

// ===== HELPER FUNCTION =====
async function processBatchOperation(
  batchId: string,
  operationType: string,
  contentIds: string[],
  actionData?: Record<string, any>
) {
  try {
    await supabase
      .from("cms_batch_operations")
      .update({ status: "processing", started_at: new Date() })
      .eq("id", batchId);

    let processed = 0;
    let failed = 0;
    const errors: Record<string, string> = {};

    for (const contentId of contentIds) {
      try {
        switch (operationType) {
          case "edit": {
            await supabase
              .from("cms_content")
              .update(actionData || {})
              .eq("id", contentId);
            processed++;
            break;
          }
          case "delete": {
            await supabase.from("cms_content").delete().eq("id", contentId);
            processed++;
            break;
          }
          case "publish": {
            await supabase
              .from("cms_content")
              .update({ status: "published", published_at: new Date() })
              .eq("id", contentId);
            processed++;
            break;
          }
          case "unpublish": {
            await supabase
              .from("cms_content")
              .update({ status: "draft", published_at: null })
              .eq("id", contentId);
            processed++;
            break;
          }
          case "archive": {
            await supabase
              .from("cms_content")
              .update({ status: "archived" })
              .eq("id", contentId);
            processed++;
            break;
          }
        }
      } catch (itemError: any) {
        failed++;
        errors[contentId] = itemError.message;
      }
    }

    await supabase
      .from("cms_batch_operations")
      .update({
        status: "completed",
        processed_items: processed,
        failed_items: failed,
        completed_at: new Date(),
        error_details: failed > 0 ? errors : null,
      })
      .eq("id", batchId);
  } catch (error: any) {
    await supabase
      .from("cms_batch_operations")
      .update({
        status: "failed",
        error_details: { message: error.message },
        completed_at: new Date(),
      })
      .eq("id", batchId);
  }
}

export default router;
