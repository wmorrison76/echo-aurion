import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  // Prevent Vite from walking up and picking up /app/postcss.config.js (which
  // depends on tailwindcss not installed in this scoped frontend project).
  css: { postcss: { plugins: [] } },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: "wss" },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
});
