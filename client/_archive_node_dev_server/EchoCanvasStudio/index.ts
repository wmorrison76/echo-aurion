import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import { WebSocketServer } from "ws";
import { handleDemo } from "./routes/demo";
import generateImageRouter from "./routes/generate-image";
import proxyImageRouter from "./routes/proxy-image";
import saveDesignRouter from "./routes/save-design";
import shareLinksRouter from "./routes/share-links";
import complianceRouter from "./routes/compliance";
import WebSocketManager from "./lib/websocket-manager";
export function createServer() {
  const app = express(); // Middleware app.use(cors()); app.use(express.json()); app.use(express.urlencoded({ extended: true })); // Example API routes app.get("/api/ping", (_req, res) => { const ping = process.env.PING_MESSAGE ??"ping"; res.json({ message: ping }); }); app.get("/api/demo", handleDemo); app.use("/api", generateImageRouter); app.use("/api", proxyImageRouter); app.use("/api", saveDesignRouter); // Ensure this is correctly registered app.use("/api", shareLinksRouter); app.use("/api", complianceRouter); // Create HTTP server for WebSocket support const httpServer = createHttpServer(app); // Set up WebSocket server const wss = new WebSocketServer({ server: httpServer, path:"/ws" }); const wsManager = new WebSocketManager(wss); wss.on("connection", (ws, req) => { const url = new URL(req.url ||"", `http://${req.headers.host}`); const userId = url.searchParams.get("userId") || `user-${Date.now()}`; wsManager.handleConnection(ws, userId); }); return httpServer;
}
