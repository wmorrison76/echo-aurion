import { Router } from "express";
import { getSupabaseServiceClient } from "../lib/supabase";
export const glCodesRouter = Router();
glCodesRouter.get("/", async (req, res, next) => {
  try {
    const { organization_id, category } = req.query;
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
      .from("gl_codes")
      .select("*")
      .eq("organization_id", organization_id);
    if (category && typeof category === "string") {
      query = query.eq("category", category);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});
glCodesRouter.get("/:codeId", async (req, res, next) => {
  try {
    const { codeId } = req.params;
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("gl_codes")
      .select("*")
      .eq("id", codeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "GL code not found" });
      return;
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});
glCodesRouter.post("/", async (req, res, next) => {
  try {
    const { organization_id, code, category, description } = req.body;
    if (!organization_id || !code || !category) {
      res
        .status(400)
        .json({ error: "organization_id, code, and category are required" });
      return;
    }
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("gl_codes")
      .insert({
        organization_id,
        code,
        category,
        description: description || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});
glCodesRouter.patch("/:codeId", async (req, res, next) => {
  try {
    const { codeId } = req.params;
    const updates = req.body;
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase
      .from("gl_codes")
      .update(updates)
      .eq("id", codeId)
      .select()
      .single();
    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "GL code not found" });
      return;
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});
glCodesRouter.delete("/:codeId", async (req, res, next) => {
  try {
    const { codeId } = req.params;
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("gl_codes").delete().eq("id", codeId);
    if (error) throw error;
    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});
