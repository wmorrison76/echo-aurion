import { Router } from "express";
import { supabase } from "../../lib/db";
const router = Router();
router.get("/", async (req, res) => {
  try {
    const { org_id, outlet_id, dept_id, limit = "200" } = req.query as any;
    const limitNum = parseInt(limit) || 200;
    if (!org_id) {
      return res.status(400).json({ error: "org_id required" });
    }
    let query = supabase
      .from("audit_logs")
      .select("*")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(limitNum);
    if (outlet_id) {
      query = query.eq("outlet_id", outlet_id);
    }
    if (dept_id) {
      query = query.eq("dept_id", dept_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error("Audit fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
