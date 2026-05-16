import { Router } from "express";
import { supabase } from "../../lib/db";
const router = Router();
router.get("/live", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});
router.get("/ready", async (_req, res) => {
  try {
    const { error } = await supabase.from("audit_logs").select("id").limit(1);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err });
  }
});
export default router;
