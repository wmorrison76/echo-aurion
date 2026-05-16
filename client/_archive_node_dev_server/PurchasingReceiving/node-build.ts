import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { createServer, setupGlobalErrorHandlers } from "./index";
import * as express from "express";
import { logger } from "./lib/logger";
import { validateSecrets } from "./lib/secrets-validator";
import { initializeSentryEnhanced } from "./lib/sentry-enhanced";
import { setupWebSocketServer } from "./lib/websocket"; // Setup global error handlers before anything else
setupGlobalErrorHandlers(); // Validate critical secrets
validateSecrets(); // Initialize Sentry enhanced error tracking (A.8 - Sentry hardening)
initializeSentryEnhanced(); const app = createServer();
const port = process.env.PORT || 3000; // Determine dist path - handle both development and production environments
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname,"../dist/spa"); // Verify static files exist at startup
import { existsSync } from "fs";
const indexHtmlPath = path.join(distPath,"index.html");
const assetsPath = path.join(distPath,"assets"); if (!existsSync(indexHtmlPath)) { logger.error("CRITICAL: Production build not found!", { expectedPath: indexHtmlPath, distPath, filesInDist: existsSync(distPath), }); logger.error("App will not function without production build. Check Docker build output.", );
} else { logger.info("✓ Production build verified", { distPath, hasAssets: existsSync(assetsPath), });
} // Middleware to log static file requests in production
app.use((req, res, next) => { if (req.path.startsWith("/assets/") || /\.\w+$/.test(req.path)) { logger.debug(`Static file request: ${req.method} ${req.path}`); } next();
}); // Serve static files with proper caching headers
app.use( express.static(distPath, { maxAge:"1y", etag: false, fallthrough: false, // Don't fall through - serve 404 for missing static files setHeaders: (res, filePath) => { // Don't cache HTML files if (filePath.endsWith(".html")) { res.setHeader("Cache-Control","public, max-age=0, must-revalidate"); } // Cache assets forever (they have content hashes) else if (filePath.includes("assets")) { res.setHeader("Cache-Control","public, max-age=31536000, immutable"); } }, onError: (err, req, res) => { logger.warn("Static file serving error", { path: req.path, error: err instanceof Error ? err.message : String(err), }); res.status(404).json({ error:"Not found" }); }, }),
); // Handle React Router - serve index.html for all non-API routes
app.get("*", (req, res) => { // Don't serve index.html for API routes if (req.path.startsWith("/api/") || req.path.startsWith("/health")) { return res.status(404).json({ error:"API endpoint not found" }); } // Skip WebSocket connections if (req.path.startsWith("/api/ws")) { return res.status(404).json({ error:"WebSocket endpoint not found" }); } // Common file extensions that shouldn't be served as index.html const staticExtensions = [".js",".css",".png",".jpg",".jpeg",".gif",".svg",".ico",".woff",".woff2",".ttf",".eot",".map",".json",".webmanifest", ]; // Check if this looks like a file request (has a known static extension) const hasStaticExtension = staticExtensions.some((ext) => req.path.toLowerCase().endsWith(ext), ); if (hasStaticExtension) { // This should have been served by the static middleware // If we're here, the file doesn't exist logger.warn(`Static file not found: ${req.path}`); return res.status(404).send("Not Found"); } // Serve index.html for all other requests (SPA routing) if (!existsSync(indexHtmlPath)) { logger.error("CRITICAL: index.html not found at deployment time", { path: indexHtmlPath, distPath, }); return res.status(500).send("Production build not found. Please redeploy."); } logger.debug(`Serving SPA route: ${req.path} -> index.html`); res.sendFile(indexHtmlPath, (err) => { if (err) { logger.error("Failed to serve index.html", { path: indexHtmlPath, reqPath: req.path, error: err instanceof Error ? err.message : String(err), }); res.status(500).send("Internal Server Error"); } });
}); // Create HTTP server explicitly to support WebSocket
const httpServer = http.createServer(app); // Initialize WebSocket server (B.3 - Real-time updates)
setupWebSocketServer(httpServer);
logger.info("WebSocket server initialized"); // Start HTTP server
httpServer.listen(port, () => { logger.info(`Server running on port ${port}`); logger.debug(`Frontend: http://localhost:${port}`); logger.debug(`API: http://localhost:${port}/api`); logger.debug(`WebSocket: ws://localhost:${port}/api/ws`);
});
