import { Router } from "express";
import { getSupabaseServiceClient } from "../lib/supabase";
export const vendorsRouter = Router();
vendorsRouter.get("/", async (req, res, next) => {
  try {
    const { organization_id, active } = req.query;
    if (
      !organization_id ||
      typeof organization_id !== "string" ||
      !organization_id.trim()
    ) {
      res.status(400).json({ error: "organization_id is required" });
      return;
    }
    const supabase = getSupabaseServiceClient();
    let query = supabase
      .from("vendors")
      .select("*")
      .eq("organization_id", organization_id);
    if (active !== undefined && typeof active === "string") {
      query = query.eq("is_active", active === "true");
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});
vendorsRouter.get("/:vendorId", async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", vendorId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});
vendorsRouter.post("/", async (req, res, next) => {
  try {
    const { organization_id, name, contact_email, contact_phone } = req.body;
    if (!organization_id || !name) {
      res.status(400).json({ error: "organization_id and name are required" });
      return;
    }
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("vendors")
      .insert({
        organization_id,
        name,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});
vendorsRouter.patch("/:vendorId", async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const updates = req.body;
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("vendors")
      .update(updates)
      .eq("id", vendorId)
      .select()
      .single();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});
vendorsRouter.delete("/:vendorId", async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase
      .from("vendors")
      .delete()
      .eq("id", vendorId);
    if (error) throw error;
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});
