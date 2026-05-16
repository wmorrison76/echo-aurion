import express from "express";
import { getSentryService } from "../services/sentryService";

const router = express.Router();
const sentryService = getSentryService();

router.get("/errors", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const errors = await sentryService.getRecentErrors(Number(limit));

    res.json(errors);
  } catch (error) {
    console.error("Failed to fetch errors:", error);
    res.status(500).json({
      error: "Failed to fetch errors from Sentry",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/errors/:issueId", async (req, res) => {
  try {
    const { issueId } = req.params;
    const errorDetail = await sentryService.getErrorDetails(issueId);

    res.json(errorDetail);
  } catch (error) {
    console.error("Failed to fetch error details:", error);
    res.status(500).json({
      error: "Failed to fetch error details from Sentry",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/errors/:issueId/events", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { limit = 5 } = req.query;
    const events = await sentryService.getErrorEvents(issueId, Number(limit));

    res.json(events);
  } catch (error) {
    console.error("Failed to fetch error events:", error);
    res.status(500).json({
      error: "Failed to fetch error events from Sentry",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/insights", async (req, res) => {
  try {
    const errors = await sentryService.getRecentErrors(20);
    const insights = await sentryService.generateInsights(errors);

    res.json({ insights, errors });
  } catch (error) {
    console.error("Failed to generate insights:", error);
    res.status(500).json({
      error: "Failed to generate insights from Sentry",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/health", async (req, res) => {
  try {
    const errors = await sentryService.getRecentErrors(1);

    res.json({
      status: "ok",
      configured: !!process.env.SENTRY_DSN,
      errorsAvailable: errors.length > 0,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      error: "Health check failed",
    });
  }
});

export default router;
