/**
 * API: POS integration management.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { getOrgId } from "../../lib/org-resolver";
import { getSupabaseServiceClient } from "../../lib/supabase-service-client";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    let supabase: ReturnType<typeof getSupabaseServiceClient> | null = null;
    try {
      supabase = getSupabaseServiceClient();
    } catch {
      return res.json({ success: true, data: [] });
    }
    const { data, error } = await supabase
      .from("pos_integrations")
      .select("id, org_id, outlet_id, pos_type, is_active, last_sync_at, created_at")
      .eq("org_id", orgId);
    if (error) throw error;
    return res.json({ success: true, data: data ?? [] });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
});

const CreateSchema = z.object({
  outletId: z.string().uuid().optional(),
  posType: z.string().min(1),
  apiEndpoint: z.string().url().optional(),
  locationId: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const body = CreateSchema.parse(req.body);
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("pos_integrations")
      .insert({
        org_id: orgId,
        outlet_id: body.outletId ?? null,
        pos_type: body.posType,
        api_endpoint: body.apiEndpoint ?? null,
        location_id: body.locationId ?? null,
        config: body.config ?? {},
        is_active: true,
      })
      .select("id, org_id, outlet_id, pos_type, is_active, created_at")
      .single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error: any) {
    res.status(error?.name === "ZodError" ? 400 : 500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
});

export default router;
