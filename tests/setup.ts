import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as dotenv from "dotenv";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env.test if present (used by integration tests gated on DATABASE_URL_TEST).
// dotenv.config is a no-op when the file doesn't exist; safe across all test runs.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
dotenv.config({ path: path.join(REPO_ROOT, ".env.test") });

// Default DATABASE_URL for the test process so service modules importing
// server/database/connection.ts don't throw at module-load time.
// - If DATABASE_URL_TEST is set (from .env.test), route DATABASE_URL to it
//   so service imports of connection.ts route to the test database.
// - Otherwise use a dummy URL — Pool is created but never connected because
//   unit tests don't call query(); integration tests are skipped without
//   DATABASE_URL_TEST via describe.skipIf gates.
// Test-only mutation of process.env. Runs only under vitest, never production.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL_TEST || "postgres://test:test@127.0.0.1:1/test_dummy";
}

afterEach(() => {
  cleanup();
});
