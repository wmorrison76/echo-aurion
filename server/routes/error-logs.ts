import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import { join } from "path";
import type { RequestHandler } from "express";

const router = Router();
const LOG_DIR = join(process.cwd(), "logs", "errors");

// Ensure log directory exists
(async () => {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create logs directory:", err);
  }
})();

interface ErrorLogPayload {
  id: string;
  timestamp: number;
  level: "error" | "warning" | "info";
  category: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  url?: string;
  userAgent?: string;
  context?: Record<string, any>;
}

const handlePostErrorLog: RequestHandler = async (req: Request, res: Response) => {
  try {
    const log = req.body as ErrorLogPayload;

    if (!log.category || !log.message) {
      return res.status(400).json({ error: "Missing required fields: category, message" });
    }

    // Log to console with color coding
    const levelEmoji = {
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    }[log.level];

    console.log(
      `${levelEmoji} [${log.category}] ${log.message}`,
      log.details || log.context || ""
    );

    // Write to daily log file
    const date = new Date(log.timestamp);
    const dateStr = date.toISOString().split("T")[0];
    const logFile = join(LOG_DIR, `${dateStr}.jsonl`);

    const logLine = JSON.stringify({
      id: log.id,
      timestamp: new Date(log.timestamp).toISOString(),
      level: log.level,
      category: log.category,
      message: log.message,
      details: log.details,
      stack: log.stack,
      url: log.url,
      userAgent: log.userAgent,
      context: log.context,
    });

    await fs.appendFile(logFile, logLine + "\n", "utf-8");

    res.json({ success: true, id: log.id });
  } catch (error) {
    console.error("Error logging failed:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to log error",
    });
  }
};

const handleGetErrorLogs: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { category, level, limit = 100, days = 1 } = req.query;

    // Read logs from past N days
    const logs: ErrorLogPayload[] = [];
    const now = new Date();

    for (let i = 0; i < Number(days); i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const logFile = join(LOG_DIR, `${dateStr}.jsonl`);

      try {
        const content = await fs.readFile(logFile, "utf-8");
        const lines = content.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          const log = JSON.parse(line);
          logs.push(log);
        }
      } catch (err) {
        // File might not exist, skip
      }
    }

    // Filter and sort
    let filtered = logs;

    if (category) {
      filtered = filtered.filter((l) => l.category === category);
    }

    if (level) {
      filtered = filtered.filter((l) => l.level === level);
    }

    // Sort by timestamp descending
    filtered = filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    filtered = filtered.slice(0, Number(limit));

    res.json({
      total: logs.length,
      filtered: filtered.length,
      logs: filtered,
    });
  } catch (error) {
    console.error("Failed to retrieve error logs:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to retrieve logs",
    });
  }
};

const handleGetErrorStats: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;

    const logs: ErrorLogPayload[] = [];
    const now = new Date();

    // Read logs from past N days
    for (let i = 0; i < Number(days); i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const logFile = join(LOG_DIR, `${dateStr}.jsonl`);

      try {
        const content = await fs.readFile(logFile, "utf-8");
        const lines = content.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          const log = JSON.parse(line);
          logs.push(log);
        }
      } catch (err) {
        // File might not exist, skip
      }
    }

    // Calculate stats
    const stats = {
      total: logs.length,
      byLevel: {
        error: logs.filter((l) => l.level === "error").length,
        warning: logs.filter((l) => l.level === "warning").length,
        info: logs.filter((l) => l.level === "info").length,
      },
      byCategory: {} as Record<string, number>,
      topErrors: [] as Array<{ category: string; message: string; count: number }>,
    };

    // Count by category
    logs.forEach((log) => {
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    // Get top errors
    const errorMap = new Map<string, number>();
    logs
      .filter((l) => l.level === "error")
      .forEach((log) => {
        const key = `${log.category}:${log.message}`;
        errorMap.set(key, (errorMap.get(key) || 0) + 1);
      });

    stats.topErrors = Array.from(errorMap.entries())
      .map(([key, count]) => {
        const [category, message] = key.split(":", 2);
        return { category, message, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(stats);
  } catch (error) {
    console.error("Failed to calculate error stats:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to calculate stats",
    });
  }
};

router.post("/logs/error", handlePostErrorLog);
router.get("/logs/error", handleGetErrorLogs);
router.get("/logs/error/stats", handleGetErrorStats);

export default router;
