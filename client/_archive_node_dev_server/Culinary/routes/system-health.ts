import { Router, Request, Response } from "express";
import {
  runStorageDiagnostics,
  formatDiagnosticsReport,
  logStorageMetrics,
  getMonitoringHistory,
  analyzeGrowthTrends,
} from "../lib/pinecone-storage-diagnostics";
const router = Router();
interface SystemHealthStatus {
  healthy: boolean;
  timestamp: string;
  services: {
    echo: { status: "operational" | "warning" | "error"; message: string };
    openai: {
      status: "operational" | "warning" | "error";
      message: string;
      model?: string;
    };
    pinecone: {
      status: "operational" | "warning" | "error";
      message: string;
      indexName?: string;
    };
  };
} /** * GET /api/health/status * Check system health for Echo, OpenAI, and Pinecone */
router.get("/status", async (_req: Request, res: Response) => {
  const status: SystemHealthStatus = {
    healthy: true,
    timestamp: new Date().toISOString(),
    services: {
      echo: { status: "operational", message: "Echo AI system is ready" },
      openai: { status: "error", message: "Not configured" },
      pinecone: { status: "error", message: "Not configured" },
    },
  }; // Check OpenAI const openaiKey = process.env.OPENAI_API_KEY; if (!openaiKey) { status.services.openai.status ="error"; status.services.openai.message ="OPENAI_API_KEY not configured"; status.healthy = false; } else { try { const response = await fetch("https://api.openai.com/v1/models", { method:"GET", headers: { Authorization: `Bearer ${openaiKey}`, }, }); if (response.ok) { status.services.openai.status ="operational"; status.services.openai.message ="OpenAI API is accessible"; status.services.openai.model ="gpt-4-turbo-preview"; } else if (response.status === 401) { status.services.openai.status ="error"; status.services.openai.message ="OpenAI API key is invalid (401 Unauthorized)"; status.healthy = false; } else { status.services.openai.status ="warning"; status.services.openai.message = `OpenAI API returned status ${response.status}`; } } catch (error: any) { status.services.openai.status ="error"; status.services.openai.message = `OpenAI API error: ${error.message}`; status.healthy = false; } } // Check Pinecone const pineconeKey = process.env.PINECONE_API_KEY; if (!pineconeKey) { status.services.pinecone.status ="error"; status.services.pinecone.message ="PINECONE_API_KEY not configured"; status.healthy = false; } else { try { const response = await fetch("https://api.pinecone.io/indexes", { method:"GET", headers: {"Api-Key": pineconeKey, }, }); if (response.ok) { const data = (await response.json()) as any; const echoIndex = data.indexes?.find( (idx: any) => idx.name ==="echo-knowledge", ); if (echoIndex) { status.services.pinecone.status ="operational"; status.services.pinecone.message ="Pinecone is connected and echo-knowledge index is ready"; status.services.pinecone.indexName ="echo-knowledge"; } else { status.services.pinecone.status ="warning"; status.services.pinecone.message ="Pinecone is connected but echo-knowledge index not found. Will create on first knowledge store."; } } else if (response.status === 401) { status.services.pinecone.status ="error"; status.services.pinecone.message ="Pinecone API key is invalid (401 Unauthorized)"; status.healthy = false; } else { status.services.pinecone.status ="warning"; status.services.pinecone.message = `Pinecone returned status ${response.status}`; } } catch (error: any) { status.services.pinecone.status ="error"; status.services.pinecone.message = `Pinecone error: ${error.message}`; status.healthy = false; } } const httpStatus = status.healthy ? 200 : 503; res.status(httpStatus).json(status);
}); /** * GET /api/health/ready * Quick check if system is ready to start training */
router.get("/ready", async (_req: Request, res: Response) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  const pineconeKey = process.env.PINECONE_API_KEY;
  const ready = {
    training_ready: !!(openaiKey && pineconeKey),
    openai_configured: !!openaiKey,
    pinecone_configured: !!pineconeKey,
    message:
      openaiKey && pineconeKey
        ? "System is ready to start training"
        : "Missing required API keys (OpenAI and/or Pinecone)",
  };
  const httpStatus = ready.training_ready ? 200 : 503;
  res.status(httpStatus).json(ready);
}); /** * POST /api/health/verify * Detailed verification of all systems */
router.post("/verify", async (_req: Request, res: Response) => {
  const verification = {
    timestamp: new Date().toISOString(),
    checks: [] as Array<{
      name: string;
      passed: boolean;
      error?: string;
      details?: Record<string, any>;
    }>,
  }; // Check 1: OpenAI API Key exists const openaiKey = process.env.OPENAI_API_KEY; verification.checks.push({ name:"OpenAI API Key", passed: !!openaiKey, error: openaiKey ? undefined :"OPENAI_API_KEY not configured", }); // Check 2: OpenAI API is accessible if (openaiKey) { try { const response = await fetch("https://api.openai.com/v1/models/gpt-4", { method:"GET", headers: { Authorization: `Bearer ${openaiKey}`, }, }); verification.checks.push({ name:"OpenAI API Connectivity", passed: response.ok, error: response.ok ? undefined : `HTTP ${response.status}`, details: { endpoint:"https://api.openai.com/v1/models/gpt-4", status: response.status, statusText: response.statusText, }, }); } catch (error: any) { verification.checks.push({ name:"OpenAI API Connectivity", passed: false, error: error.message, }); } } // Check 3: Pinecone API Key exists const pineconeKey = process.env.PINECONE_API_KEY; verification.checks.push({ name:"Pinecone API Key", passed: !!pineconeKey, error: pineconeKey ? undefined :"PINECONE_API_KEY not configured", }); // Check 4: Pinecone API is accessible if (pineconeKey) { try { const response = await fetch("https://api.pinecone.io/indexes", { method:"GET", headers: {"Api-Key": pineconeKey, }, }); verification.checks.push({ name:"Pinecone API Connectivity", passed: response.ok, error: response.ok ? undefined : `HTTP ${response.status}`, details: { endpoint:"https://api.pinecone.io/indexes", status: response.status, statusText: response.statusText, }, }); // Check 5: Echo knowledge index exists if (response.ok) { const data = (await response.json()) as any; const echoIndex = data.indexes?.find( (idx: any) => idx.name ==="echo-knowledge", ); verification.checks.push({ name:"Echo Knowledge Index", passed: !!echoIndex, error: echoIndex ? undefined :"echo-knowledge index not found", details: { indexFound: !!echoIndex, indexName: echoIndex?.name ||"N/A", dimension: echoIndex?.dimension ||"N/A", metric: echoIndex?.metric ||"N/A", }, }); } } catch (error: any) { verification.checks.push({ name:"Pinecone API Connectivity", passed: false, error: error.message, }); } } // Check 6: Echo Training Routes verification.checks.push({ name:"Echo Training Routes", passed: true, details: { routes: ["POST /api/echo-training/init-dialogue","POST /api/echo-training/dialogue-turn","POST /api/echo-training/save-learned-knowledge","POST /api/echo-training/auto-capture-openai-knowledge","POST /api/echo-training/complete-dialogue", ], }, }); const allPassed = verification.checks.every((check) => check.passed); const httpStatus = allPassed ? 200 : 503; res.status(httpStatus).json({ ...verification, summary: { allChecks: verification.checks.length, passed: verification.checks.filter((c) => c.passed).length, failed: verification.checks.filter((c) => !c.passed).length, systemReady: allPassed, }, });
}); /** * GET /api/health/pinecone-diagnostics * Run comprehensive Pinecone storage diagnostics */
router.get("/pinecone-diagnostics", async (_req: Request, res: Response) => {
  try {
    const diagnostics = await runStorageDiagnostics();
    const report = formatDiagnosticsReport(diagnostics);
    res.json({ diagnostics, report, timestamp: new Date().toISOString() });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: "Diagnostics failed",
      message: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
}); /** * POST /api/health/log-storage-metrics * Log current storage metrics for monitoring */
router.post("/log-storage-metrics", async (_req: Request, res: Response) => {
  try {
    const log = await logStorageMetrics();
    res.json({ success: true, log, timestamp: new Date().toISOString() });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Failed to log metrics", message: errorMsg });
  }
}); /** * GET /api/health/storage-history * Get recent storage monitoring history */
router.get("/storage-history", async (req: Request, res: Response) => {
  try {
    const hours = parseInt((req.query.hours as string) || "24", 10);
    const history = getMonitoringHistory(hours);
    res.json({
      hours,
      entries: history.length,
      history,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res
      .status(500)
      .json({ error: "Failed to retrieve history", message: errorMsg });
  }
}); /** * GET /api/health/growth-analysis * Analyze storage growth trends */
router.get("/growth-analysis", async (req: Request, res: Response) => {
  try {
    const hours = parseInt((req.query.hours as string) || "24", 10);
    const analysis = analyzeGrowthTrends(hours);
    res.json({ analysis, timestamp: new Date().toISOString() });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res
      .status(500)
      .json({ error: "Failed to analyze growth", message: errorMsg });
  }
});
export const systemHealthRouter = router;
