import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";
import { authenticateUser } from "../../middleware/auth";
import {
  ingestPropertySummary,
  insertPropertySummaryManual,
  getPropertySummary,
  deletePropertySummary,
  DataPipelineConfig,
  PropertySummaryData,
} from "../../services/dataPipeline";
const router = Router();
const pipelineConfigSchema = z.object({
  org_id: z.string().min(1),
  outlet_id: z.string().min(1),
  pos_system: z.enum(["square", "toast", "lightspeed", "manual"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  labor_cost: z.number().min(0),
  pos_config: z
    .object({
      access_token: z.string().optional(),
      location_id: z.string().optional(),
      api_key: z.string().optional(),
      merchant_id: z.string().optional(),
      base_url: z.string().optional(),
    })
    .optional(),
});
const manualIngestionSchema = z.object({
  org_id: z.string().min(1),
  outlet_id: z.string().min(1),
  report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  labor_cost: z.number().min(0),
  revenue: z.number().min(0),
  tips: z.number().min(0),
});
const querySummarySchema = z.object({
  org_id: z.string().min(1),
  outlet_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}); /** * POST /api/data-pipeline/ingest * Ingest property summary data from POS systems */
router.post(
  "/ingest",
  authenticateUser,
  validateBody(pipelineConfigSchema),
  async (req, res, next) => {
    try {
      const { org_id, outlet_id, pos_system, date, labor_cost, pos_config } =
        req.body;
      const config: DataPipelineConfig = {
        org_id,
        outlet_id,
        pos_system,
        pos_config,
      };
      const result = await ingestPropertySummary(config, date, labor_cost);
      res.json({
        success: result.success,
        records_processed: result.records_processed,
        records_failed: result.records_failed,
        errors: result.errors,
        data: result.data,
      });
    } catch (error) {
      console.error("Error in data pipeline ingestion:", error);
      next(error);
    }
  },
); /** * POST /api/data-pipeline/manual * Manually insert property summary data */
router.post(
  "/manual",
  authenticateUser,
  validateBody(manualIngestionSchema),
  async (req, res, next) => {
    try {
      const data: PropertySummaryData = {
        org_id: req.body.org_id,
        outlet_id: req.body.outlet_id,
        report_date: req.body.report_date,
        labor_cost: req.body.labor_cost,
        revenue: req.body.revenue,
        tips: req.body.tips,
      };
      const result = await insertPropertySummaryManual(data);
      if (result.success) {
        res.status(201).json({ success: true, data: result.data[0] });
      } else {
        res.status(400).json({ success: false, errors: result.errors });
      }
    } catch (error) {
      console.error("Error in manual ingestion:", error);
      next(error);
    }
  },
); /** * GET /api/data-pipeline/summary * Retrieve property summary data * Query params: org_id (required), outlet_id, start_date, end_date */
router.get("/summary", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const outlet_id = req.query.outlet_id as string | undefined;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    if (!org_id) {
      return res
        .status(400)
        .json({ error: "org_id query parameter is required" });
    }
    const data = await getPropertySummary(
      org_id,
      outlet_id,
      startDate,
      endDate,
    );
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Error fetching property summary:", error);
    next(error);
  }
}); /** * DELETE /api/data-pipeline/summary * Delete a property summary record * Query params: org_id, outlet_id, report_date (all required) */
router.delete("/summary", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const outlet_id = req.query.outlet_id as string;
    const reportDate = req.query.report_date as string;
    if (!org_id || !outlet_id || !reportDate) {
      return res.status(400).json({
        error:
          "org_id, outlet_id, and report_date query parameters are required",
      });
    }
    const success = await deletePropertySummary(org_id, outlet_id, reportDate);
    if (success) {
      res.json({ success: true, message: "Property summary record deleted" });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to delete property summary record",
      });
    }
  } catch (error) {
    console.error("Error deleting property summary:", error);
    next(error);
  }
});
export default router;
