import { Router, Request } from "express";
import { importRevenueCsv, importEmployeesCsv } from "../../services/importCsv";
const router = Router(); // Note: multer integration requires additional setup
// For now, endpoints accept dept_id via body
router.post("/revenue", async (req, res) => {
  try {
    const { dept_id, filePath } = req.body;
    if (!dept_id || !filePath) {
      return res.status(400).json({ error: "dept_id and filePath required" });
    }
    const r = await importRevenueCsv(dept_id, filePath);
    res.json(r);
  } catch (err: any) {
    console.error("Revenue import error:", err);
    res.status(500).json({ error: err.message });
  }
});
router.post("/employees", async (req, res) => {
  try {
    const { outlet_id, dept_id, filePath } = req.body;
    if (!outlet_id || !dept_id || !filePath) {
      return res
        .status(400)
        .json({ error: "outlet_id, dept_id, and filePath required" });
    }
    const r = await importEmployeesCsv(outlet_id, dept_id, filePath);
    res.json(r);
  } catch (err: any) {
    console.error("Employee import error:", err);
    res.status(500).json({ error: err.message });
  }
});
export default router;
