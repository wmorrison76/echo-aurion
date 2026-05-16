/** * POS webhook placeholders (Toast/Square/Lightspeed) * Map payload → revenues table and trigger forecast refresh */
import { Router } from"express";
import { getSupabase } from"../../lib/supabase"; const router = Router(); /** POST /api/pos/webhook/toast */
router.post("/toast", async (req, res) => { try { const body = req.body; // Example mapping (pseudo): { dept_id, business_date, net_sales } // await upsertRevenue(dept_id, business_date, net_sales); res.json({ ok: true }); } catch (err) { console.error("POST /toast error:", err); res.status(500).json({ error: String(err) }); }
}); /** POST /api/pos/webhook/square */
router.post("/square", async (req, res) => { try { const body = req.body; // Square-specific parsing res.json({ ok: true }); } catch (err) { console.error("POST /square error:", err); res.status(500).json({ error: String(err) }); }
}); /** POST /api/pos/webhook/lightspeed */
router.post("/lightspeed", async (req, res) => { try { const body = req.body; // Lightspeed-specific parsing res.json({ ok: true }); } catch (err) { console.error("POST /lightspeed error:", err); res.status(500).json({ error: String(err) }); }
}); async function upsertRevenue( dept_id: string, business_date: string, amount: number
) { const supabase = getSupabase(); if (!supabase) return; await supabase.from("revenues").upsert({ dept_id, business_date, amount, });
} export default router;
