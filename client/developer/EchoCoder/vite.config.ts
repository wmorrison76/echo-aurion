import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [
        path.resolve(__dirname, "./client"),
        path.resolve(__dirname, "./shared"),
        path.resolve(__dirname, "./lib"),
        path.resolve(__dirname, "./node_modules/monaco-editor"),
      ],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  ssr: {
    external: ["pg", "@types/pg"],
  },
  plugins: [react(), expressPlugin()],
  // SECURITY: Only expose VITE_ and NEXT_PUBLIC_ to client
  // Server-only secrets (ECHO_*, DATABASE_*, API_*) are NEVER exposed to client
  // All AI/sensitive operations must be proxied through /api endpoints
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@cognition": path.resolve(__dirname, "./cognition"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "./tests/setup.ts")],
    exclude: [
      "client/capstone/**",
      "client/**/tests/**",
      "dist/**",
      "node_modules/**",
    ],
    globals: false,
    css: false,
  },
}));

function expressPlugin(): Plugin {
  let app: any = null;
  let loadError: any = null;

  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      try {
        // Lazy load createServer to avoid loading routes at config time
        const { createServer } = await import("./server");
        if (!app) {
          app = await createServer();
        }
      } catch (error) {
        loadError = error;
        console.error("Failed to load Express server:", error);
      }

      // Only proxy API and upload routes through Express; let Vite serve assets/modules
      server.middlewares.use((req, res, next) => {
        if (loadError) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Server failed to load",
              message:
                loadError instanceof Error
                  ? loadError.message
                  : String(loadError),
            }),
          );
          return;
        }

        const url = req.url || "";
        if (url.startsWith("/api") || url.startsWith("/uploads")) {
          return app(req as any, res as any, next as any);
        }
        return next();
      });
    },
  };
}
