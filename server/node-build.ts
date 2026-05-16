import path from "path";
import fs from "fs";
import express from "express";
import { createServer } from "./index";

const isDev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || (isDev ? 8080 : 3000);

const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../dist/spa");

async function main() {
  const { app, server } = await createServer();

  // In production, serve the built SPA files
  if (!isDev && fs.existsSync(distPath)) {
    // Assets with hashed filenames - long cache
    app.use(express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      index: false,
    }));

    // Handle React Router - serve index.html for all non-API routes
    app.get(/(.*)/, (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }

      // No-cache for index.html to ensure users get latest version
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      res.sendFile(path.join(distPath, "index.html"));
    });
  } else if (isDev) {
    const vitePort = 8081;
    console.log(
      "[DEV] Running in development mode - client served by Vite on port 8081",
    );
    // If someone hits the backend at / (or another non-API path), send them to the frontend.
    // Express 5 + path-to-regexp v8 reject bare "*"; use regex or app.use catch-all
    app.get(/(.*)/, (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/health")) {
        return next();
      }
      // Backend on a different port → redirect to Vite
      if (port !== vitePort) {
        const url = `http://127.0.0.1:${vitePort}${req.originalUrl || req.path}`;
        return res.redirect(302, url);
      }
      // Backend is on 8080 (only backend running) → show helpful message
      res.status(200).contentType("text/html").send(`
        <!DOCTYPE html>
        <html><head><title>LUCCCA – Start dev server</title></head>
        <body style="font-family:system-ui;max-width:480px;margin:2rem auto;padding:1rem;">
          <h1>Cannot GET /</h1>
          <p>The frontend is served by Vite. Run the full dev server:</p>
          <pre style="background:#1e293b;color:#e2e8f0;padding:1rem;border-radius:8px;">npm run dev</pre>
          <p>Then open <a href="http://127.0.0.1:8080/">http://127.0.0.1:8080/</a> (Vite serves the app on port 8080).</p>
        </body></html>
      `);
    });
  }

  server.listen(port, () => {
    console.log(`🚀 Fusion Starter server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 Received SIGTERM, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("🛑 Received SIGINT, shutting down gracefully");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
