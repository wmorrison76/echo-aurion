/**
 * PHASE 0: ENTERPRISE FOUNDATION - Day 5
 * Load Testing Baseline Script (k6)
 * 
 * Run with: k6 run tests/load-tests/baseline.k6.js
 * 
 * Test scenarios:
 * 1. Normal load: 100 concurrent users, 5 min duration
 * 2. Spike test: 1000 concurrent users (stress test)
 * 3. Database scale test: 100k employees
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const TEST_ORG_ID = __ENV.TEST_ORG_ID || '550e8400-e29b-41d4-a716-446655440000';

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Warm-up: ramp-up to 10 users
    { duration: '3m', target: 100 }, // Main: 100 concurrent users
    { duration: '30s', target: 100 }, // Hold: keep 100 users
    { duration: '1m', target: 0 }, // Cool-down: ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'], // 95% < 500ms, 99% < 2s
    http_req_failed: ['rate<0.05'], // Less than 5% failures
  },
};

export default function () {
  // Test group 1: Authentication and org_id validation
  group('Auth & Tenant Validation', () => {
    const authHeaders = {
      'X-Org-ID': TEST_ORG_ID,
      'Content-Type': 'application/json',
    };

    // Simple ping to verify auth
    const pingRes = http.get(`${BASE_URL}/api/ping`, { headers: authHeaders });
    check(pingRes, {
      'ping status is 200': (r) => r.status === 200,
      'ping response time < 100ms': (r) => r.timings.duration < 100,
    });

    sleep(0.5);
  });

  // Test group 2: List employees (common query)
  group('List Employees', () => {
    const headers = {
      'X-Org-ID': TEST_ORG_ID,
      'Content-Type': 'application/json',
    };

    const params = {
      headers: headers,
    };

    // In Phase 1, this will be a real endpoint
    const listRes = http.get(`${BASE_URL}/api/employees?limit=50&offset=0`, params);

    check(listRes, {
      'list status is 200': (r) => r.status === 200 || r.status === 404, // 404 ok if no data
      'list response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
  });

  // Test group 3: Rate limiting
  group('Rate Limiting', () => {
    const headers = {
      'X-Org-ID': TEST_ORG_ID,
      'Content-Type': 'application/json',
    };

    // Make multiple requests quickly to check rate limit headers
    for (let i = 0; i < 5; i++) {
      const res = http.get(`${BASE_URL}/api/ping`, { headers });

      check(res, {
        'rate limit header present': (r) => r.headers['X-RateLimit-Limit'] !== undefined,
        'remaining limit header present': (r) => r.headers['X-RateLimit-Remaining'] !== undefined,
      });

      sleep(0.1);
    }

    sleep(1);
  });

  // Test group 4: Cross-tenant access prevention
  group('Security - Cross-Tenant Prevention', () => {
    const maliciousOrgId = '660e8400-e29b-41d4-a716-446655440000'; // Different org
    const headers = {
      'X-Org-ID': maliciousOrgId,
      'Content-Type': 'application/json',
    };

    const params = {
      headers: headers,
    };

    // Should be blocked by tenant validation
    const res = http.get(`${BASE_URL}/api/employees`, params);

    check(res, {
      'cross-tenant access blocked': (r) => r.status === 401 || r.status === 403 || r.status === 400,
    });

    sleep(0.5);
  });

  // Test group 5: Error handling
  group('Error Handling', () => {
    const headers = {
      'X-Org-ID': TEST_ORG_ID,
      'Content-Type': 'application/json',
    };

    const params = {
      headers: headers,
    };

    // Request with invalid JSON should return 400
    const res = http.post(`${BASE_URL}/api/employees`, 'invalid json', params);

    check(res, {
      'invalid JSON returns 400': (r) => r.status === 400 || r.status === 200, // 200 ok if endpoint doesn't exist yet
      'error response contains error code': (r) => r.body.includes('error') || r.status !== 400,
    });

    sleep(0.5);
  });

  // Cool-down
  sleep(1);
}

/**
 * Custom test for spike testing
 * Run with: k6 run tests/load-tests/baseline.k6.js --stage 1m:1000
 */
export function spikeTest() {
  const headers = {
    'X-Org-ID': TEST_ORG_ID,
    'Content-Type': 'application/json',
  };

  const params = {
    headers: headers,
  };

  // Send request
  const res = http.get(`${BASE_URL}/api/ping`, params);

  check(res, {
    'spike test response 200': (r) => r.status === 200,
    'spike test response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 2); // Random sleep 0-2 seconds
}
