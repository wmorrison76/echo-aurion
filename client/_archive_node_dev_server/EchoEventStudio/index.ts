import"dotenv/config";
import express from"express";
import cors from"cors";
import { handleDemo } from"./routes/demo";
import { handleSceneUpload, handleGetScene } from"./routes/walkthrough";
import { handleEchoAiLayout } from"./routes/echoai-layout";
import { handleRealityUpload, handleGetScans, handleGetScan, handleSaveCorrections, handleGetCorrections, handleRealityFuse, handleGetShell, handleFusionStatus,
} from"./routes/reality";
import { beoExport, handleBuilderPreset } from"./routes/beo-export";
import { decorRecognize } from"./routes/decor-recognize";
import { eventStudio } from"./routes/eventstudio";
import { scope } from"./routes/scope";
import { studioSupabase } from"./routes/studio-supabase";
import { cameraBookmarks } from"./routes/camera-bookmarks"; // SSE clients store: { [session]: Set<response> }
const sseClients: Record<string, Set<any>> = {}; export function broadcastStatus(session: string, data: any) { const group = sseClients[session]; if (!group) return; const payload = `data: ${JSON.stringify(data)}\n\n`; for (const res of group) { try { res.write(payload); } catch { // Client disconnected } }
} export function createServer() { const app = express(); // Middleware app.use(cors()); app.use(express.json({ limit:"50mb" })); app.use(express.urlencoded({ extended: true, limit:"50mb" })); // Example API routes app.get("/api/ping", (_req, res) => { const ping = process.env.PING_MESSAGE ??"ping"; res.json({ message: ping }); }); app.get("/api/demo", handleDemo); app.post("/api/scenes/upload", handleSceneUpload); app.get("/api/scenes/:id", handleGetScene); // EchoLayout routes app.post("/api/echoai/layout", handleEchoAiLayout); // EchoReality routes app.post("/api/reality/upload", handleRealityUpload); app.get("/api/reality/scans/:sessionId", handleGetScans); app.get("/api/reality/scan/:scanId", handleGetScan); // EchoReality Fusion routes app.post("/api/reality/fuse", handleRealityFuse); app.get("/api/reality/shell", handleGetShell); app.get("/api/reality/fusion-status/:jobId", handleFusionStatus); // EchoReality Training routes app.post("/api/reality/corrections", handleSaveCorrections); app.get("/api/reality/corrections/:correctionId", handleGetCorrections); // BEO Export routes app.use("/api", beoExport); // Builder.io preset endpoint app.get("/api/builder/preset", handleBuilderPreset); // Decor recognition routes app.use("/api", decorRecognize); // EchoEventStudio routes app.use("/api", eventStudio); // EchoScope KPI routes app.use("/api", scope); // EchoEventStudio Supabase routes (events, bookmarks, annotations) app.use("/api", studioSupabase); // Camera bookmarks routes app.use("/api", cameraBookmarks); // SSE: Real-time fusion status stream app.get("/api/reality/status", (req, res) => { const session = String(req.query.session ||"default"); res.setHeader("Content-Type","text/event-stream"); res.setHeader("Cache-Control","no-cache"); res.setHeader("Connection","keep-alive"); res.flushHeaders?.(); (sseClients[session] ||= new Set()).add(res); req.on("close", () => { sseClients[session]?.delete(res); }); }); return app;
}
