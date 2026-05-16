/** * GL Export API Routes * GET /api/gl/export - Export GL codes as CSV * GET /api/gl/report - Generate P&L report * GET /api/gl/report/json - Export report as JSON */ import { Router } from "express";
import { z } from "zod";
import { buildGLExport } from "../../services/glBridge";
import { createPDFReport, exportReportJSON } from "../../services/pdfReport";
import { requireRole, validateTenant } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
const router = Router();
const exportSchema = z.object({
  org_id: z.string().uuid("Invalid org ID"),
  format: z.enum(["quickbooks", "xero"]).default("quickbooks"),
});
const reportSchema = z.object({
  org_id: z.string().uuid("Invalid org ID"),
}); /** * GET /api/gl/export?org_id=...&format=quickbooks * Export GL codes as CSV file */
router.get(
  "/export",
  requireRole("GM", "ADMIN"),
  validateTenant,
  validateQuery(exportSchema),
  async (req, res, next) => {
    try {
      const { org_id, format } = req.query as any;
      const csv = await buildGLExport(org_id, format);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="gl_export_${format}_${Date.now()}.csv"`,
      );
      res.setHeader("Content-Type", "text/csv");
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
); /** * GET /api/gl/report?org_id=... * Generate P&L report as PDF/text */
router.get(
  "/report",
  requireRole("GM", "ADMIN"),
  validateTenant,
  validateQuery(reportSchema),
  async (req, res, next) => {
    try {
      const { org_id } = req.query as any;
      const report = await createPDFReport(org_id);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="report_${Date.now()}.txt"`,
      );
      res.setHeader("Content-Type", "text/plain");
      res.send(report);
    } catch (err) {
      next(err);
    }
  },
); /** * GET /api/gl/report/json?org_id=... * Export P&L report as JSON (for UI display) */
router.get(
  "/report/json",
  requireRole("GM", "ADMIN"),
  validateTenant,
  validateQuery(reportSchema),
  async (req, res, next) => {
    try {
      const { org_id } = req.query as any;
      const report = await exportReportJSON(org_id);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);
export default router;
