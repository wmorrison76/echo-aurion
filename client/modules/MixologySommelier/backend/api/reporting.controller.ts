import express, { Request, Response } from "express";
import { query, validationResult } from "express-validator";
import ReportingService from "../services/reporting.service";
import { authenticate } from "../middleware/auth";
const router = express.Router();
router.post(
  "/sales/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const { start_date, end_date, format = "json" } = req.body;
      if (!start_date || !end_date) {
        return res
          .status(400)
          .json({ error: "start_date and end_date are required" });
      }
      const report = await ReportingService.generateSalesReport(
        venue_id,
        new Date(start_date),
        new Date(end_date),
      );
      if (format === "csv") {
        const { csv, filename } = ReportingService.generateCSVExport(
          report,
          "sales_report",
        );
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        return res.send(csv);
      }
      res.json({ success: true, ...report });
    } catch (error) {
      console.error("Error generating sales report:", error);
      res.status(500).json({
        error: "Failed to generate report",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.post(
  "/inventory/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const { start_date, end_date, format = "json" } = req.body;
      const report = await ReportingService.generateInventoryReport(
        venue_id,
        new Date(start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        new Date(end_date || Date.now()),
      );
      if (format === "csv") {
        const { csv, filename } = ReportingService.generateCSVExport(
          report,
          "inventory_report",
        );
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        return res.send(csv);
      }
      res.json({ success: true, ...report });
    } catch (error) {
      console.error("Error generating inventory report:", error);
      res.status(500).json({
        error: "Failed to generate report",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.post(
  "/variance/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const { start_date, end_date, format = "json" } = req.body;
      const report = await ReportingService.generateVarianceReport(
        venue_id,
        new Date(start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        new Date(end_date || Date.now()),
      );
      if (format === "csv") {
        const { csv, filename } = ReportingService.generateCSVExport(
          report,
          "variance_report",
        );
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        return res.send(csv);
      }
      res.json({ success: true, ...report });
    } catch (error) {
      console.error("Error generating variance report:", error);
      res.status(500).json({
        error: "Failed to generate report",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.post(
  "/anomalies/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const { start_date, end_date, format = "json" } = req.body;
      const report = await ReportingService.generateAnomalyReport(
        venue_id,
        new Date(start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        new Date(end_date || Date.now()),
      );
      if (format === "csv") {
        const { csv, filename } = ReportingService.generateCSVExport(
          report,
          "anomaly_report",
        );
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        return res.send(csv);
      }
      res.json({ success: true, ...report });
    } catch (error) {
      console.error("Error generating anomaly report:", error);
      res.status(500).json({
        error: "Failed to generate report",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.post(
  "/forecasts/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const { days_ahead = 30, format = "json" } = req.body;
      const report = await ReportingService.generateForecastReport(
        venue_id,
        days_ahead,
      );
      if (format === "csv") {
        const { csv, filename } = ReportingService.generateCSVExport(
          report,
          "forecast_report",
        );
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        return res.send(csv);
      }
      res.json({ success: true, ...report });
    } catch (error) {
      console.error("Error generating forecast report:", error);
      res.status(500).json({
        error: "Failed to generate report",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
router.post(
  "/comprehensive/:venue_id",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { venue_id } = req.params;
      const { start_date, end_date, format = "json" } = req.body;
      const report = await ReportingService.generateComprehensiveReport(
        venue_id,
        new Date(start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        new Date(end_date || Date.now()),
      );
      if (format === "csv") {
        const { csv, filename } = ReportingService.generateCSVExport(
          report,
          "comprehensive_report",
        );
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        return res.send(csv);
      }
      res.json({ success: true, ...report });
    } catch (error) {
      console.error("Error generating comprehensive report:", error);
      res.status(500).json({
        error: "Failed to generate report",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
export default router;
