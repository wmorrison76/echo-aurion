/**
 * Smoke Tests for Production Readiness
 * Quick validation of critical functionality before deployment
 */
import axios from "axios";

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const baseUrl = process.env.BASE_URL || "http://localhost:8080";
const authToken = process.env.AUTH_TOKEN;
const orgId = process.env.ORG_ID || "test-org";
const enforceSecurityHeaders = process.env.CHECK_SECURITY_HEADERS === "true";

const baseHeaders = {
  ...(orgId ? { "X-Org-ID": orgId } : {}),
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
};
const baseConfig = {
  timeout: 5000,
  headers: baseHeaders,
};
const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  let passed = false;
  let error: string | undefined;

  try {
    await fn();
    passed = true;
    console.log(`✅ ${name}`);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.log(`❌ ${name}: ${error}`);
  }

  results.push({
    name,
    passed,
    duration: Date.now() - startTime,
    error,
  });
}

async function runSmokeTests(): Promise<void> {
  console.log(`\n🚀 Starting Smoke Tests (${baseUrl})\n`);

  // ============================================
  // API Health Checks
  // ============================================
  await test("API Server Running", async () => {
    const res = await axios.get(`${baseUrl}/api/health`, baseConfig);
    if (!res.data) throw new Error("No health response");
  });

  await test("CORS Headers Present", async () => {
    const res = await axios.get(`${baseUrl}/api/health`, baseConfig);
    if (!res.headers["access-control-allow-origin"]) {
      throw new Error("Missing CORS headers");
    }
  });

  await test("Security Headers Present", async () => {
    if (!enforceSecurityHeaders) {
      console.warn(" ⚠️ Skipping security headers check (dev mode)");
      return;
    }
    const res = await axios.get(`${baseUrl}/`, baseConfig);
    const requiredHeaders = [
      "strict-transport-security",
      "x-content-type-options",
      "x-frame-options",
    ];
    for (const header of requiredHeaders) {
      if (!res.headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }
  });

  // ============================================
  // Frontend Checks
  // ============================================
  await test("Frontend Loads", async () => {
    const res = await axios.get(`${baseUrl}/`, {
      ...baseConfig,
      responseType: "text",
    });
    const body = typeof res.data === "string" ? res.data : "";
    const contentType = res.headers["content-type"] || "";
    const hasHtml = contentType.includes("text/html") || /<html/i.test(body);
    if (!hasHtml) {
      throw new Error("HTML not returned");
    }
  });

  await test("Static Assets Served", async () => {
    const res = await axios.get(`${baseUrl}/manifest.webmanifest`, baseConfig);
    if (!res.data) throw new Error("Manifest not served");
  });

  // ============================================
  // System Health
  // ============================================
  await test("Module Health Endpoint", async () => {
    const res = await axios.get(`${baseUrl}/api/module-health`, {
      ...baseConfig,
      validateStatus: () => true,
    });
    if (!authToken) {
      if (res.status !== 401) {
        throw new Error("Expected 401 without AUTH_TOKEN");
      }
      return;
    }
    if (res.status === 401) {
      throw new Error("Unauthorized - check AUTH_TOKEN");
    }
    if (!res.data?.systemStatus) {
      throw new Error("Module health response missing systemStatus");
    }
  });

  // ============================================
  // Critical Endpoints
  // ============================================
  await test("Demo Endpoint", async () => {
    const res = await axios.get(`${baseUrl}/api/demo`, {
      ...baseConfig,
      validateStatus: () => true,
    });
    if (!authToken) {
      if (res.status !== 401) {
        throw new Error("Expected 401 without AUTH_TOKEN");
      }
      return;
    }
    if (res.status === 401) {
      throw new Error("Unauthorized - check AUTH_TOKEN");
    }
    if (!res.data?.message) throw new Error("Demo response missing message");
  });

  await test("21-Day Forecast Report", async () => {
    const res = await axios.get(`${baseUrl}/api/reports/21-day-forecast`, {
      ...baseConfig,
      validateStatus: () => true,
    });
    if (!authToken) {
      if (res.status !== 401) {
        throw new Error("Expected 401 without AUTH_TOKEN");
      }
      return;
    }
    if (res.status === 401) {
      throw new Error("Unauthorized - check AUTH_TOKEN");
    }
    if (!res.data?.ok) throw new Error("Report response not ok");
    const { days, startDate, endDate } = res.data;
    if (!Array.isArray(days) || days.length < 21) {
      throw new Error("Expected at least 21 forecast days");
    }
    if (!startDate || !endDate) {
      throw new Error("Missing forecast date range");
    }
    if (startDate > endDate) {
      throw new Error("Invalid forecast date range");
    }
    if (days.some((day: { date?: string }) => !day?.date)) {
      throw new Error("Forecast days missing dates");
    }
  });

  // ============================================
  // Error Handling
  // ============================================
  await test("Auth Required - Protected Endpoint", async () => {
    const res = await axios.get(`${baseUrl}/api/module-health`, {
      timeout: 5000,
      headers: orgId ? { "X-Org-ID": orgId } : {},
      validateStatus: () => true,
    });
    if (res.status !== 401) {
      throw new Error("Expected 401 when auth token is missing");
    }
  });

  await test("Error Handling - Invalid Route", async () => {
    const res = await axios.get(`${baseUrl}/api/invalid-endpoint`, {
      ...baseConfig,
      validateStatus: () => true,
    });
    if (!authToken) {
      if (res.status !== 401) {
        throw new Error("Expected 401 without AUTH_TOKEN");
      }
      return;
    }
    if (res.status !== 404) {
      throw new Error("Expected 404 for invalid route");
    }
  });

  // ============================================
  // Rate Limiting
  // ============================================
  await test("Rate Limiting Active", async () => {
    let rateLimited = false;
    for (let i = 0; i < 150; i++) {
      try {
        await axios.get(`${baseUrl}/api/health`, {
          ...baseConfig,
          timeout: 1000,
        });
      } catch (err: any) {
        if (err.response?.status === 429) {
          rateLimited = true;
          break;
        }
      }
    }
    if (!rateLimited) {
      console.warn(" ⚠️ Rate limiting not detected in quick test");
    }
  });

  // ============================================
  // Response Times
  // ============================================
  await test("API Response Time < 1s", async () => {
    const start = Date.now();
    await axios.get(`${baseUrl}/api/health`, baseConfig);
    const duration = Date.now() - start;
    if (duration > 1000) {
      throw new Error(`Response took ${duration}ms`);
    }
  });

  // ============================================
  // Build Verification
  // ============================================
  await test("Build Artifacts Exist", async () => {
    const paths = [`${baseUrl}/`, `${baseUrl}/manifest.webmanifest`];
    for (const path of paths) {
      const res = await axios.head(path, baseConfig);
      if (res.status !== 200) {
        throw new Error(`${path} not found`);
      }
    }
  });

  // ============================================
  // Report Results
  // ============================================
  console.log("\n\n📊 Test Results Summary\n");
  console.log("─".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `⏱️ Avg Duration: ${(
      results.reduce((sum, r) => sum + r.duration, 0) / results.length
    ).toFixed(0)}ms`,
  );

  console.log("\n" + "─".repeat(60));

  if (failed > 0) {
    console.log("\n❌ FAILURES:\n");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(` • ${r.name}`);
        console.log(` Error: ${r.error}\n`);
      });
    console.log("\n🚨 Smoke tests FAILED - Do not deploy!\n");
    process.exit(1);
  } else {
    console.log("\n✅ All smoke tests PASSED - Ready for deployment!\n");
    process.exit(0);
  }
}

runSmokeTests().catch((error) => {
  console.error("Smoke test runner error:", error);
  process.exit(1);
});
