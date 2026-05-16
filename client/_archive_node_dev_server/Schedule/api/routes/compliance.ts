import { Router } from "express";
import {
  analyzeWeek,
  recordAcknowledgement,
} from "../../services/complianceEngine";
const router = Router();
router.get("/analyze", async (req, res) => {
  try {
    const { outlet_id, dept_id, week_start } = req.query as any;
    if (!outlet_id || !dept_id || !week_start) {
      return res
        .status(400)
        .json({ error: "outlet_id, dept_id, and week_start required" });
    }
    const findings = await analyzeWeek({ outlet_id, dept_id, week_start });
    res.json({ findings });
  } catch (err: any) {
    console.error("Compliance analysis error:", err);
    res.status(500).json({ error: err.message });
  }
});
router.post("/ack", async (req, res) => {
  try {
    const { employee_id, outlet_id, dept_id, week_start } = req.body;
    if (!employee_id || !outlet_id || !dept_id || !week_start) {
      return res.status(400).json({
        error: "employee_id, outlet_id, dept_id, and week_start required",
      });
    }
    const r = await recordAcknowledgement({
      employee_id,
      outlet_id,
      dept_id,
      week_start,
    });
    res.json(r);
  } catch (err: any) {
    console.error("Acknowledgement error:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
