import path from "path";
import http from "http";
import { createServer } from "./index";
import { initializeWebSocket } from "./services/websocketService";
import * as express from "express";
async function start() {
  const app = await createServer();
  const port = process.env.PORT || 3000; // Create HTTP server for WebSocket support const httpServer = http.createServer(app); // Initialize WebSocket service try { initializeWebSocket(httpServer); console.log("✓ WebSocket service initialized"); } catch (error) { console.warn("⚠ Failed to initialize WebSocket service:", error instanceof Error ? error.message :"Unknown error"); } // In production, serve the built SPA files const __dirname = import.meta.dirname; const distPath = path.join(__dirname,"../spa"); // Serve static files app.use(express.static(distPath)); // Handle React Router - serve index.html for all non-API routes app.get("*", (req, res) => { // Don't serve index.html for API routes if (req.path.startsWith("/api/") || req.path.startsWith("/health")) { return res.status(404).json({ error:"API endpoint not found" }); } res.sendFile(path.join(distPath,"index.html")); }); httpServer.listen(port, () => { console.log(`🚀 Fusion Starter server running on port ${port}`); console.log(`📱 Frontend: http://localhost:${port}`); console.log(`🔧 API: http://localhost:${port}/api`); console.log(`🔌 WebSocket: ws://localhost:${port}`); }); // Graceful shutdown const gracefulShutdown = () => { console.log("🛑 Shutting down gracefully..."); httpServer.close(() => { console.log("✓ HTTP server closed"); process.exit(0); }); // Force shutdown after 10 seconds setTimeout(() => { console.error("✗ Forced shutdown"); process.exit(1); }, 10000); }; process.on("SIGTERM", gracefulShutdown); process.on("SIGINT", gracefulShutdown);
}
start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
