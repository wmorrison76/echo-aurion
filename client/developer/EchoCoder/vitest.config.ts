import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: "jsdom",
    globals: true,
    
    // Setup files
    setupFiles: [path.resolve(__dirname, "./tests/setup.ts")],
    
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    
    // Test file patterns
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    exclude: [
      "node_modules/",
      "dist/",
      ".idea/",
      ".git/",
      ".cache/",
      "client/capstone/**",
      "client/imported/**",
    ],
    
    // Timeout for async tests
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporters
    reporters: ["verbose"],
    outputFile: {
      json: "./coverage/test-results.json",
    },
    
    // Isolate test environments
    isolate: true,
    threads: true,
    maxThreads: 4,
    minThreads: 1,
  },
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@cognition": path.resolve(__dirname, "./cognition"),
    },
  },
});
