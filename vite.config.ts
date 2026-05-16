import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";
import fs from "fs";
import path from "path";
import { resolve } from "path";

// Safe Mode Configuration
const SAFE_MODE = process.env.SAFE_MODE === "true";

/**
 * Dev-only API stubs: return 200 + minimal JSON for routes that often 500
 * when the backend is down or not fully wired. Reduces noise so panels can render.
 * Enabled in development by default; set VITE_DEV_STUB_API=0 to use real API when backend is running.
 */
// Stubs disabled - real FastAPI backend on port 8001 handles all /api routes
const DEV_STUB_API = process.env.VITE_DEV_STUB_API === "true";

// Stub response for auth-mock: expects { token: string }
const MOCK_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXYtdXNlciIsImVtYWlsIjoiZGV2QGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.mock";

const API_STUB_PATHS: Record<string, object> = {
  // Health endpoints must respond immediately to avoid "degraded mode" and allow Video room to initialize
  "/api/health": { ok: true, status: "ok" },
  "/api/health/": { ok: true, status: "ok" },
  "/api/module-health": { ok: true, modules: {} },
  "/api/login": { user: null, token: MOCK_JWT },
  "/api/login/": { user: null, token: MOCK_JWT },
  "/api/auth/dev/login": { user: null, token: MOCK_JWT },
  "/api/user-preferences": { preferences: {} },
  "/api/forecast": { forecast: [], period: "" },
  "/api/21-day-forecast": { forecast: [], period: "" },
  "/api/beo": { data: [], total: 0 },
  "/api/reo": { data: [], total: 0 },
  "/api/group": { groups: [] },
  "/api/guests": { guests: [] },
  "/api/sales": { sales: [], summary: {} },
  "/api/menu": { items: [], categories: [] },
  "/api/inventory": { items: [] },
  "/api/labor": { shifts: [], summary: {} },
  "/api/weather": { current: null, forecast: [] },
  "/api/recipes": { recipes: [], total: 0 },
  "/api/outlets": { outlets: [] },
  "/api/events": { events: [] },
  "/api/knowledge/stats": {
    success: true,
    stats: {
      approvedItems: 125,
      masterDictionaryTerms: 450,
      totalVectors: 1250,
      lastUpdated: new Date().toISOString(),
    },
  },
  // Network chat (NetworkChat / EnhancedNetworkChat panel)
  "/api/chat/init": { userId: "dev-user-1" },
  "/api/chat/users": { users: [] },
  "/api/chat/messages": { messages: [] },
  // Dashboard and KPI (minipanels) – same shape as server/routes/dashboard-ops and dashboard-kpi
  "/api/dashboard/labor-cost": { laborPct: 28.5, trend: 1.2, targetPct: 25 },
  "/api/dashboard/ops-metrics": {
    revenue: 4283,
    covers: 142,
    avgCheck: 32.45,
    laborPct: 28.5,
    trendRevenue: 12.5,
    trendCovers: 8.3,
    trendAvgCheck: -2.1,
    trendLaborPct: 1.2,
    targetLaborPct: 25,
  },
  "/api/dashboard/staff-status": {
    staff: [
      { id: "1", name: "Chef John", role: "Head Chef", status: "on-duty", since: new Date(Date.now() - 8 * 3600000).toISOString() },
      { id: "2", name: "Sarah M", role: "Manager", status: "on-duty", since: new Date(Date.now() - 6 * 3600000).toISOString() },
      { id: "3", name: "Mike P", role: "Server", status: "on-duty", since: new Date(Date.now() - 5 * 3600000).toISOString() },
      { id: "4", name: "Lisa R", role: "Pastry Chef", status: "break", since: new Date(Date.now() - 30 * 60000).toISOString() },
      { id: "5", name: "Tom H", role: "Dishwasher", status: "off-duty", since: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
  },
  "/api/dashboard/occupancy": { occupancyPct: 72, trend: -1.5 },
  "/api/dashboard/orders": {
    orders: [
      { id: 1, table: "12", items: 3, status: "pending" },
      { id: 2, table: "8", items: 2, status: "cooking" },
      { id: 3, table: "15", items: 4, status: "pending" },
    ],
  },
  "/api/dashboard/delivery": {
    deliveries: [
      { id: 1, vendor: "Fresh Produce Co", items: 5, time: "15 min" },
      { id: 2, vendor: "Premium Meats", items: 3, time: "45 min" },
    ],
  },
  "/api/dashboard/vip-alerts": {
    alerts: [
      { id: 1, guest: "Johnson VIP Party", time: "Tonight 7pm", party: 8 },
      { id: 2, guest: "Smith Reunion", time: "Tomorrow 6pm", party: 12 },
    ],
  },
  "/api/dashboard/messages": { unreadCount: 5 },
  "/api/dashboard/notifications": {
    alerts: [
      { id: "sys-1", title: "Labor target", message: "Today labor % within target.", type: "low", timestamp: Date.now() - 3600000, module: "schedule" },
      { id: "sys-2", title: "Delivery ETA", message: "Fresh Produce Co arriving in 15 min.", type: "medium", timestamp: Date.now() - 1800000, module: "purchasing-receiving" },
    ],
  },
  "/api/dashboard/schedule-summary": { totalScheduled: 12, withSchedule: 8, today: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()] },
  "/api/dashboard/satisfaction": { score: 4.6, target: 4.5, trend: 0.2, responses: 142 },
  "/api/dashboard/sales-trend": {
    hours: Array.from({ length: 12 }, (_, i) => ({ hour: 8 + i, revenue: 320 + Math.round(80 * Math.sin((i / 12) * Math.PI)), covers: 12 + Math.round(8 * Math.sin((i / 12) * Math.PI)) })),
    totalRevenue: 4283,
    totalCovers: 142,
  },
  "/api/dashboard/goals": { goals: [], synced: false },
  "/api/dashboard/specials": {
    specials: [
      { id: "1", name: "Catch of the Day", price: "Market", description: "Fresh local fish" },
      { id: "2", name: "Soup of the Day", price: "$8", description: "Chef's selection" },
    ],
  },
  "/api/v1/kpi/daily": {
    sales_today: 4283,
    labor_cost_today: 1220,
    labor_pct: 28.5,
    staffing_efficiency: 94,
    covers_today: 142,
    revenue_per_hour: 178,
    trend_7day: { sales: 2.1, labor_pct: 1.2, efficiency: -0.5 },
  },
  "/api/dashboard/quick-search": { results: [] },
  "/api/dashboard/financial/health": {
    grade: "B",
    score: 78,
    revenue: 4283,
    cogs_percentage: 32,
    labor_percentage: 28.5,
    net_margin: 12,
    trend: "stable",
    last_updated: Date.now(),
    risks: [],
  },
  "/api/white-label/config": {
    colors: { primary: "#2563eb", secondary: "#64748b", background: "#ffffff", text: "#1e293b" },
    typography: { fontFamily: "system-ui", headingFont: "system-ui", fontSize: { base: "16px", lg: "18px" }, fontWeight: { normal: 400, bold: 700 } },
    spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px" },
    branding: { appName: "EchoAI Suite", faviconUrl: "/favicon.ico" },
    customCSS: "",
  },
  "/api/calendar/outlets": { outlets: [] },
  "/api/calendar/events": { success: true, data: { items: [], total: 0, has_more: false } },
  "/api/calendar/prospects": { events: [] },
  // Video Conference (RoomManagerPanel) – empty list so "Failed to load rooms" does not show in dev
  "/api/video-conference/rooms": { rooms: [] },
};

function devApiStubPlugin(): Plugin {
  let devRoomCounter = 0;
  return {
    name: "dev-api-stub",
    configureServer(server) {
      if (!DEV_STUB_API) return;
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "POST") return next();
        const url = req.url?.split("?")[0] ?? "";
        // Video Conference: POST create/join so create → join flow works in dev
        if (req.method === "POST") {
          if (url === "/api/video-conference/rooms") {
            const chunks: Buffer[] = [];
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", () => {
              devRoomCounter += 1;
              const id = `dev-room-${devRoomCounter}`;
              let roomName = `New Room ${devRoomCounter}`;
              let meetingStartTime: number | undefined;
              let scheduledDuration: number | undefined;
              let meetingEndTime: number | undefined;
              try {
                const raw = Buffer.concat(chunks).toString("utf8");
                const parsed = raw ? JSON.parse(raw) : {};
                if (parsed.roomName) roomName = String(parsed.roomName).trim() || roomName;
                if (typeof parsed.meetingStartTime === "number") meetingStartTime = parsed.meetingStartTime;
                if (typeof parsed.scheduledDuration === "number" && parsed.scheduledDuration > 0) {
                  scheduledDuration = parsed.scheduledDuration;
                  if (meetingStartTime) meetingEndTime = meetingStartTime + scheduledDuration * 60 * 1000;
                }
              } catch (_) {}
              const body = {
                room: {
                  id,
                  roomName,
                  roomDescription: "",
                  dailyRoomName: id,
                  roomType: "private",
                  privacyLevel: "private",
                  maxParticipants: 100,
                  allowRecording: true,
                  allowScreenShare: true,
                  allowChat: true,
                  meeting_start_time: meetingStartTime ?? null,
                  meeting_end_time: meetingEndTime ?? null,
                  scheduled_duration: scheduledDuration ?? null,
                },
              };
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify(body));
            });
            return;
          }
          if (url === "/api/video-conference/join") {
            const chunks: Buffer[] = [];
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", () => {
              let roomId = "dev-room-1";
              try {
                const raw = Buffer.concat(chunks).toString("utf8");
                const parsed = raw ? JSON.parse(raw) : {};
                if (parsed.roomId) roomId = String(parsed.roomId);
              } catch (_) {}
              const body = {
                success: true,
                token: "dev-meeting-token",
                room: {
                  id: roomId,
                  roomName: "Development Room",
                  dailyRoomName: roomId,
                },
              };
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify(body));
            });
            return;
          }
          if (url === "/api/video-conference/guest-links") {
            const guestToken = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            const body = {
              id: `link-${Date.now()}`,
              room_id: "dev-room-1",
              guest_token: guestToken,
              guestToken,
              created_by: "dev-user",
              max_uses: 10,
              current_uses: 0,
              is_revoked: false,
              require_password: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(body));
            return;
          }
          // External invite by email (cloud) – stub; production wires to SendGrid/SES
          if (url === "/api/video-conference/invite/send-email") {
            const chunks: Buffer[] = [];
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", () => {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            });
            return;
          }
          // External invite by SMS (cloud, mobile) – stub; production wires to Twilio etc.
          if (url === "/api/video-conference/invite/send-sms") {
            const chunks: Buffer[] = [];
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", () => {
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            });
            return;
          }
          // Caption translation (per-user language) – stub; production can use LibreTranslate/Google
          if (url === "/api/video-conference/translate") {
            const chunks: Buffer[] = [];
            req.on("data", (chunk: Buffer) => chunks.push(chunk));
            req.on("end", () => {
              let text = "";
              try {
                const raw = Buffer.concat(chunks).toString("utf8");
                const parsed = raw ? JSON.parse(raw) : {};
                text = typeof parsed.text === "string" ? parsed.text : "";
              } catch (_) {}
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ translatedText: text }));
            });
            return;
          }
        }
        if (req.method === "GET" && url.startsWith("/api/video-conference/guest-links/") && url.endsWith("/validate")) {
          const body = {
            valid: true,
            room: {
              id: "dev-room-1",
              roomName: "Dev Room",
              dailyRoomName: "dev-room-1",
              roomDescription: "",
              allowRecording: true,
              allowScreenShare: true,
              allowChat: true,
            },
          };
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify(body));
          return;
        }
        if (req.method === "GET" && url === "/api/video-conference/rooms") {
          const rooms = [
            {
              id: "dev-room-1",
              roomName: "Dev Room 1",
              roomDescription: "",
              dailyRoomName: "dev-room-1",
              roomType: "private",
              privacyLevel: "private",
              maxParticipants: 100,
              allowRecording: true,
              allowScreenShare: true,
              allowChat: true,
              ownerId: "",
              createdBy: "",
              isActive: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            {
              id: "dev-room-2",
              roomName: "Dev Room 2",
              roomDescription: "",
              dailyRoomName: "dev-room-2",
              roomType: "private",
              privacyLevel: "private",
              maxParticipants: 100,
              allowRecording: true,
              allowScreenShare: true,
              allowChat: true,
              ownerId: "",
              createdBy: "",
              isActive: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ];
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify({ rooms }));
          return;
        }
        const exact = API_STUB_PATHS[url];
        if (exact) {
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify(exact));
          return;
        }
        const prefixStubs: [string, object][] = [
          ["/api/dashboard", { laborPct: 28.5, trend: 1.2, targetPct: 25, revenue: 4283, covers: 142, staff: [], orders: [], deliveries: [], alerts: [] }],
          ["/api/v1/kpi", { sales_today: 4283, labor_cost_today: 1220, labor_pct: 28.5, staffing_efficiency: 94, covers_today: 142, revenue_per_hour: 178, trend_7day: { sales: 2.1, labor_pct: 1.2, efficiency: -0.5 } }],
          ["/api/calendar", { outlets: [], events: [] }],
          ["/api/auth", { user: null, token: MOCK_JWT }],
          ["/api/echo-ai3/forecast", { data: [], forecast: [], period: "" }],
          ["/api/reports", { forecast: [], period: "", data: [] }],
          ["/api/resort", { forecast: [], period: "", data: [] }],
          ["/api/outlets", { outlets: [] }],
          ["/api/events", { events: [] }],
          ["/api/video-conference", { rooms: [], recordings: [] }],
          ["/api/health", { ok: true, status: "ok" }],
          ["/api/module-health", { ok: true, modules: {} }],
          ["/api/login", { user: null, token: MOCK_JWT }],
          ["/api/forecast", { forecast: [], period: "" }],
          ["/api/21-day-forecast", { forecast: [], period: "" }],
          ["/api/beo", { data: [], total: 0 }],
          ["/api/reo", { data: [], total: 0 }],
          ["/api/group", { groups: [] }],
          ["/api/guests", { guests: [] }],
          ["/api/sales", { sales: [], summary: {} }],
          ["/api/menu", { items: [], categories: [] }],
          ["/api/inventory", { items: [] }],
          ["/api/labor", { shifts: [], summary: {} }],
          ["/api/weather", { current: null, forecast: [] }],
          ["/api/recipes", { recipes: [], total: 0 }],
          ["/api/knowledge", { success: true, stats: { approvedItems: 0, masterDictionaryTerms: 0, totalVectors: 0 } }],
          ["/api/echo", { success: true, message: "Echo AI stub" }],
        ];
        for (const [prefix, stub] of prefixStubs) {
          if (url.startsWith(prefix)) {
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify(stub));
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
const projectRoot = resolve(__dirname);
export default defineConfig(({ mode }) => ({
  root: projectRoot,
  base: "/",
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:8001",
        ws: true,
      },
    },
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "./client"),
        path.resolve(__dirname, "./shared"),
        path.resolve(__dirname, "./lib"),
        path.resolve(__dirname, "./client/modules/PurchasingReceiving/data"),
        path.resolve(__dirname, "./node_modules/monaco-editor"),
      ],
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "server/**",
        "**/client/imported/**",
        "**/archive/**",
        "**/_archive/**",
        "**/.archive/**",
      ],
    },
    watch: {
      ignored: [
        "**/archive/**",
        "**/_archive/**",
        "**/.archive/**",
        "**/client/imported/**",
        "**/node_modules/**",
        "**/.git/**",
        // Safe Mode: Ignore nested node_modules in modules (CRITICAL - prevents ENOSPC)
        "**/client/modules/*/node_modules/**",
        "**/client/modules/*/*/node_modules/**",
        // Ignore build artifacts to reduce file watcher load
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/.cache/**",
        // Additional heavy directories to ignore
        "**/server/**",
        "**/mobile-app/**",
      ],
      // Always use polling in container environments with low inotify limits
      usePolling: true,
      interval: 500,
    },
  },

  build: {
    outDir: "dist/spa",
    sourcemap: false,
    rollupOptions: {
      input: ["index.html", "client/modules/Culinary/index.html"],
      output: {
        // Force React into a single shared chunk so panel chunks (Culinary, Pastry, etc.)
        // never bundle their own copy and never trigger "Identifier 'React' has already been declared"
        manualChunks: (id) => {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/monaco-editor")) {
            return "monaco-vendor";
          }
          if (id.includes("node_modules/@babylonjs") || id.includes("node_modules/babylonjs")) {
            return "babylon-vendor";
          }
          if (id.includes("node_modules/three") || id.includes("node_modules/@react-three")) {
            return "three-vendor";
          }
          if (id.includes("node_modules/recharts")) {
            return "recharts-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons-vendor";
          }
        },
      },
    },
  },

  optimizeDeps: {
    // CRITICAL: Limit dep-scan entrypoints to the primary app.
    // Some legacy modules include incomplete imports which can break Vite's dep scan
    // and prevent unrelated panels (like Echo Events) from loading.
    entries: [
      resolve(__dirname, "index.html"),
      resolve(__dirname, "client/modules/Culinary/index.html"),
    ],
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "next-themes",
      "react-router-dom",
      "@tanstack/react-query",
      "sonner",
      "jszip",
      "recharts",
      "date-fns",
      // Pre-bundle deps used by lazy-loaded panel modules to prevent 504 "Outdated Optimize Dep"
      "zustand",
      "zustand/middleware",
      "zod",
      "@radix-ui/react-dialog",
      "@radix-ui/react-accordion",
      "@radix-ui/react-popover",
      "@radix-ui/react-label",
      "@radix-ui/react-context-menu",
      "@supabase/supabase-js",
      "socket.io-client",
    ],
    exclude: [],
    esbuildOptions: {
      // Ensure React is treated correctly during optimization
      jsx: "automatic",
    },
    force: false, // Disable force re-optimization for faster dev startup
  },

  plugins: [
    devApiStubPlugin(),
    moduleImportResolverPlugin(),
    react({
      // Use SWC for faster compilation
      // Ensure React is properly handled
      jsxRuntime: "automatic",
    }),
    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
    }) as Plugin,
  ],

  envPrefix: ["VITE_", "NEXT_PUBLIC_"],

  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "next-themes",
      "react-router-dom",
      "@tanstack/react-query",
      "recharts",
      "date-fns",
      "lodash",
    ],
    alias: {
      /**
       * PRIMARY ALIASES
       */
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@cognition": path.resolve(__dirname, "./cognition"),

      /**
       * DEV / INTERNAL TOOLS (EchoCoder, ZARO, etc.)
       * 🔒 Explicit dev alias prevents accidental prod exposure
       */
      "@dev": path.resolve(__dirname, "./client/developer"),

      /**
       * PURCHASING / RECEIVING
       */
      "@purchasing-data": path.resolve(
        __dirname,
        "./client/modules/PurchasingReceiving/data",
      ),
      "@purchasing-modules": path.resolve(
        __dirname,
        "./client/modules/PurchasingReceiving/data/src/modules",
      ),
      /** PurchasingReceiving client/App and panels use @modules/PurchRec, @modules/Maestro, etc. */
      "@modules": path.resolve(__dirname, "./client/modules"),

      /**
       * Force root node_modules resolution for deps that may exist in nested module node_modules/
       * (Nested installs frequently become incomplete and break Vite dep optimization.)
       * CRITICAL: Force single React instance to prevent "Cannot read properties of null" errors
       */
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime"),
      recharts: path.resolve(__dirname, "./node_modules/recharts"),
      "date-fns": path.resolve(__dirname, "./node_modules/date-fns"),
    },
  },

  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "./tests/setup.ts")],
    // Fail fast: tests should complete in seconds. Override per-test where needed (e.g. integration).
    testTimeout: 10000,
    hookTimeout: 5000,
    exclude: [
      "client/capstone/**",
      "client/**/tests/**",
      "dist/**",
      "**/node_modules/**",
      "luccca-mobile/**",
      "client/modules/PurchasingReceiving/mobile/**",
      // Exclude imported/archived directories (stale test files that don't have matching source)
      "**/imported/**",
      "**/archive/**",
      "**/_archive/**",
      "**/.archive/**",
    ],
    globals: false,
    css: false,
  },
}));

/**
 * ------------------------------------------------------------
 * Module Import Resolver Plugin
 * ------------------------------------------------------------
 * Allows legacy standalone modules to continue using "@/..."
 * without refactoring thousands of imports.
 */
function moduleImportResolverPlugin(): Plugin {
  const hasLocalModuleFile = (moduleBase: string, importPath: string) => {
    const candidate = path.resolve(moduleBase, importPath);
    const variants = [
      `${candidate}.tsx`,
      `${candidate}.ts`,
      path.join(candidate, "index.tsx"),
      path.join(candidate, "index.ts"),
    ];
    return variants.some((file) => fs.existsSync(file));
  };

  return {
    name: "module-import-resolver",

    transform(code, id) {
      const isCulinary2 = id.includes("client/modules/Culinary2");
      const isEchoRecipePro = id.includes("client/modules/EchoRecipePro");
      const isCulinary = id.includes("client/modules/Culinary") && !isCulinary2;
      const isPastry2 = id.includes("client/modules/Pastry2");
      const isPastry = id.includes("client/modules/Pastry") && !isPastry2;
      const isSchedule = id.includes("client/modules/Schedule/client");
      const isPurchasingReceivingData = id.includes(
        "client/modules/PurchasingReceiving/data",
      );
      const isPurchasingReceivingClient = id.includes(
        "client/modules/PurchasingReceiving/client",
      );
      const isEchoEventStudio = id.includes(
        "client/modules/EchoEventStudio/client",
      );
      const isEchoAurum = id.includes("client/modules/EchoAurum/client");
      const isMixologySommelier = id.includes("client/modules/MixologySommelier");

      if (
        !isCulinary &&
        !isCulinary2 &&
        !isEchoRecipePro &&
        !isPastry &&
        !isSchedule &&
        !isPurchasingReceivingData &&
        !isPurchasingReceivingClient &&
        !isEchoEventStudio &&
        !isEchoAurum &&
        !isMixologySommelier
      ) {
        return null;
      }

      let moduleBase: string;

      if (isCulinary) {
        // Account for nested client/ folder in Culinary module
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/Culinary/client",
        );
      } else if (isEchoRecipePro) {
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/EchoRecipePro/client",
        );
      } else if (isCulinary2) {
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/Culinary2/client",
        );
      } else if (isPastry2) {
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/Pastry2/client",
        );
      } else if (isPastry) {
        // Account for nested client/ folder in Pastry module
        moduleBase = path.resolve(__dirname, "./client/modules/Pastry/client");
      } else if (isSchedule) {
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/Schedule/client",
        );
      } else if (isEchoEventStudio) {
        // Account for nested client/ folder in EchoEventStudio module
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/EchoEventStudio/client",
        );
      } else if (isEchoAurum) {
        // Account for nested client/ folder in EchoAurum module
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/EchoAurum/client",
        );
      } else if (isMixologySommelier) {
        // Account for nested client/ folder in MixologySommelier module
        // But handle root-level files (like index.tsx) differently
        if (id.includes("client/modules/MixologySommelier/index.tsx")) {
          // Root entry point - use module root as base
          moduleBase = path.resolve(
            __dirname,
            "./client/modules/MixologySommelier",
          );
        } else {
          // Files inside client/ subdirectory
          moduleBase = path.resolve(
            __dirname,
            "./client/modules/MixologySommelier/client",
          );
        }
      } else if (isPurchasingReceivingClient) {
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/PurchasingReceiving/client",
        );
      } else {
        moduleBase = path.resolve(
          __dirname,
          "./client/modules/PurchasingReceiving/data/client",
        );
      }

      const relativeFile = path.relative(moduleBase, id);
      const depth = (relativeFile.match(/\//g) || []).length;
      const prefix = depth > 0 ? "../".repeat(depth) : "./";

      let transformed = code;
      let changed = false;

      // Replace "@/..." imports
      // BUT exclude only known shared dependencies that exist at the root client/ level
      // Module-specific files like @/lib/taxonomy and @/i18n/config should be transformed to relative paths
      if (code.includes("@/")) {
        transformed = transformed.replace(
          /["']@\/([^"']+)["']/g,
          (_, importPath) => {
            // Exclude truly shared dependencies that exist at root client/ level:
            // - @/i18n (root i18n.tsx file, not module-specific i18n/config.ts)
            // - @/lib/utils (shared utils)
            // - @/lib/os-bus (shared event bus)
            // - @/components/ui/... (shared UI components)
            // Module-specific files (taxonomy, i18n/config, etc.) should be transformed
            const isRootI18n = importPath === "i18n"; // Exact match for root i18n.tsx
            const isLibPath = importPath.startsWith("lib/");
            const isRootLib =
              isLibPath &&
              hasLocalModuleFile(path.resolve(__dirname, "./client"), importPath);
            const isLocalLib =
              isLibPath && !isRootLib && hasLocalModuleFile(moduleBase, importPath);
            const isSharedLib = isLibPath && !isLocalLib;
            const isDataPath = importPath.startsWith("data/");
            const isLocalData = isDataPath && hasLocalModuleFile(moduleBase, importPath);
            const isSharedData = isDataPath && !isLocalData;
            const isHookPath = importPath.startsWith("hooks/");
            const isRootHook =
              isHookPath &&
              hasLocalModuleFile(path.resolve(__dirname, "./client"), importPath);
            const isLocalHook =
              isHookPath && !isRootHook && hasLocalModuleFile(moduleBase, importPath);
            const isSharedHook = isHookPath && !isLocalHook;
            const isStorePath = importPath.startsWith("stores/");
            const isLocalStore =
              isStorePath && hasLocalModuleFile(moduleBase, importPath);
            const isSharedStore = isStorePath && !isLocalStore;
            const isTypePath = importPath.startsWith("types/");
            const isLocalType = isTypePath && hasLocalModuleFile(moduleBase, importPath);
            const isSharedType = isTypePath && !isLocalType;
            const isUiPath = importPath.startsWith("ui/");
            const isLocalUi = isUiPath && hasLocalModuleFile(moduleBase, importPath);
            const isSharedUi = isUiPath && !isLocalUi;
            const isDomainPath = importPath.startsWith("domains/");
            const isLocalDomain =
              isDomainPath && hasLocalModuleFile(moduleBase, importPath);
            const isSharedDomain = isDomainPath && !isLocalDomain;
            const isContextPath = importPath.startsWith("context/");
            // Root-only contexts: always keep @/ for modules without a local copy
            // Some modules (like Culinary) provide their own implementation of these contexts
            const isRootContext = false; // Allow local context resolution by default
            const isLocalContext =
              isContextPath &&
              hasLocalModuleFile(moduleBase, importPath);
            const isSharedContext = isContextPath && !isLocalContext;
            // Plural form: some modules (EchoEventStudio, etc.) use `@/contexts/...`
            const isContextsPath = importPath.startsWith("contexts/");
            const isLocalContexts =
              isContextsPath && hasLocalModuleFile(moduleBase, importPath);
            const isSharedContexts = isContextsPath && !isLocalContexts;
            const isOSBus = importPath === "lib/os-bus"; // Shared event bus
            const isComponentPath = importPath.startsWith("components/");
            const isLocalComponent =
              isComponentPath && hasLocalModuleFile(moduleBase, importPath);
            const isRootComponent =
              isComponentPath &&
              hasLocalModuleFile(path.resolve(__dirname, "./client"), importPath);
            const isSharedComponent = isComponentPath && !isLocalComponent;
            const isSharedUI = importPath.startsWith("components/ui/"); // Shared UI components
            const isSharedAdminStub = importPath.startsWith("components/admin/_stubs/"); // Shared admin stubs
            const isRootModules = importPath.startsWith("modules/"); // Root module imports
            const isPagesPath = importPath.startsWith("pages/"); // Root client pages (e.g. NotFound for Schedule)

            if (isComponentPath && !isLocalComponent && !isRootComponent && isPastry) {
              return `"@/modules/Culinary/client/${importPath}"`;
            }

            if (
              isRootI18n ||
              isRootLib ||
              isSharedLib ||
              isOSBus ||
              isSharedContext ||
              isSharedContexts ||
              isRootComponent ||
              isRootHook ||
              isSharedComponent ||
              isSharedUI ||
              isSharedAdminStub ||
              isSharedData ||
              isSharedHook ||
              isSharedStore ||
              isSharedType ||
              isSharedUi ||
              isSharedDomain ||
              isRootModules ||
              isPagesPath
            ) {
              return `"@/${importPath}"`; // Keep as-is for shared deps
            }
            // Transform module-specific imports to relative paths
            changed = true;
            return `"${prefix}${importPath}"`;
          },
        );
      }

      // Replace "@shared/..." imports
      if (
        (isCulinary || isCulinary2 || isPastry || isPurchasingReceivingData || isMixologySommelier) &&
        code.includes("@shared")
      ) {
        let sharedPrefix: string;

        if (isPurchasingReceivingData) {
          const upLevels = depth + 5;
          sharedPrefix = "../".repeat(upLevels) + "shared/";
        } else if (isCulinary || isCulinary2 || isPastry || isPastry2 || isMixologySommelier) {
          // Account for nested structure: from client/modules/ModuleName/client/...
          // go up to root, then into shared/code/shared/
          const upLevels = depth + 4;
          sharedPrefix = "../".repeat(upLevels) + "shared/code/shared/";
        } else {
          const upLevels = depth + 3;
          sharedPrefix = "../".repeat(upLevels) + "shared/code/shared/";
        }

        transformed = transformed.replace(
          /["']@shared\/([^"']+)["']/g,
          (_, importPath) => {
            changed = true;
            return `"${sharedPrefix}${importPath}"`;
          },
        );
      }

      // Replace "@modules/..." imports (PurchasingReceiving only)
      if (isPurchasingReceivingData && code.includes("@modules")) {
        transformed = transformed.replace(
          /(["'`])@modules\/([^"'`]+)\1/g,
          (_, quote, importPath) => {
            changed = true;
            const upToData = depth + 1;
            const modulesPrefix = "../".repeat(upToData) + "src/modules/";
            return `${quote}${modulesPrefix}${importPath}${quote}`;
          },
        );
      }

      if (changed) {
        return { code: transformed, map: null };
      }

      return null;
    },
  };
}

// Express backend is served separately via `pnpm dev:backend`
// Vite handles frontend only

// Safe Mode Information
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// To prevent ENOSPC errors and improve build stability:
//
// Start dev server in safe mode:
//   SAFE_MODE=true npm run dev
// Or use the convenience script:
//   npm run dev:safe
//
// Safe Mode enables:
// ✓ Enhanced file watcher configuration (awaitWriteFinish)
// ✓ Ignores nested node_modules in modules (critical for ENOSPC prevention)
// ✓ Ignores build artifacts (dist, build, .next, coverage)
// ✓ Validates module structure at startup
//
// See docs/SAFE_MODE_BUILD_GUIDE.md for complete instructions
