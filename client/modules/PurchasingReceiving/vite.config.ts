import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server"; // https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({ server: { host:"::", port: 8080, hmr: false, fs: { allow: ["./client","./shared","./src","./node_modules/pdfjs-dist"], deny: [".env",".env.*","*.{crt,pem}","**/.git/**","server/**"], }, }, build: { outDir:"dist/spa", target:"es2020", minify:"terser", sourcemap: false, chunkSizeWarningLimit: 2000, reportCompressedSize: true, rollupOptions: { output: { manualChunks: { react: ["react","react-dom","react-router-dom"], query: ["@tanstack/react-query"], icons: ["lucide-react"], pdfjs: ["pdfjs-dist"], }, }, }, }, optimizeDeps: { include: ["pdfjs-dist","tesseract.js"], }, plugins: [react(), expressPlugin()], resolve: { alias: {"@": path.resolve(__dirname,"./client"),"@shared": path.resolve(__dirname,"./shared"),"@modules": path.resolve(__dirname,"./src/modules"), }, },
})); function expressPlugin(): Plugin { return { name:"express-plugin", apply:"build", // Only apply during build, not in dev async configureServer(server) { // Dev mode: Skip Express, let Vite handle everything return; }, };
}
