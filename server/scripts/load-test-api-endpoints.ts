/**
 * Load Test: API Endpoints
 * 
 * Tests API endpoints with 1000 concurrent users
 */

import { logger } from "../lib/logger";

async function loadTestAPIEndpoints() {
  logger.info("[LoadTest] Starting API endpoints load test");

  const baseUrl = process.env.API_URL || "http://localhost:3001";
  const concurrentUsers = 1000;
  const requestsPerUser = 100;
  const testDuration = 60 * 60 * 1000; // 1 hour

  const results = {
    total: 0,
    success: 0,
    errors: 0,
    durations: [] as number[],
  };

  // Simulate concurrent users
  const users = Array.from({ length: concurrentUsers }, async (_, userId) => {
    for (let i = 0; i < requestsPerUser; i++) {
      const startTime = Date.now();
      try {
        const response = await fetch(`${baseUrl}/health`);
        const duration = Date.now() - startTime;

        results.total++;
        results.durations.push(duration);

        if (response.ok) {
          results.success++;
        } else {
          results.errors++;
        }
      } catch (error) {
        results.errors++;
        logger.error(`[LoadTest] Request failed:`, error);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  await Promise.all(users);

  // Calculate statistics
  const sortedDurations = results.durations.sort((a, b) => a - b);
  const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)];
  const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
  const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];

  logger.info("[LoadTest] Results:", {
    total: results.total,
    success: results.success,
    errors: results.errors,
    successRate: (results.success / results.total * 100).toFixed(2) + "%",
    p50,
    p95,
    p99,
  });
}

if (require.main === module) {
  loadTestAPIEndpoints().catch(console.error);
}
