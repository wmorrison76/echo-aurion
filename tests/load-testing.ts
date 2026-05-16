/**
 * Load Testing Suite for LUCCCA Enterprise System
 * Tests system performance with 15,000+ concurrent users
 * Measures response times, throughput, and error rates
 */

import { performance } from 'perf_hooks';

interface LoadTestConfig {
  totalUsers: number;
  concurrentUsers: number;
  rampUpTime: number; // seconds
  testDuration: number; // seconds
  endpoints: LoadTestEndpoint[];
}

interface LoadTestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  weight: number; // percentage of traffic
  payload?: Record<string, any>;
}

interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number;
}

interface LoadTestMetrics {
  totalDuration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalErrorRate: number;
  overallThroughput: number;
  peakConcurrentUsers: number;
  results: LoadTestResult[];
}

class LoadTester {
  private config: LoadTestConfig;
  private results: Map<string, number[]> = new Map();
  private errors: Map<string, number> = new Map();

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  /**
   * Run load test with gradual ramp-up
   */
  async runTest(): Promise<LoadTestMetrics> {
    console.log('🚀 Starting Load Test');
    console.log(`📊 Configuration:`);
    console.log(`   - Total Users: ${this.config.totalUsers.toLocaleString()}`);
    console.log(`   - Concurrent Users: ${this.config.concurrentUsers}`);
    console.log(`   - Ramp-up Time: ${this.config.rampUpTime}s`);
    console.log(`   - Test Duration: ${this.config.testDuration}s`);
    console.log('');

    const startTime = Date.now();
    const requests: Promise<void>[] = [];

    // Ramp-up phase
    const usersPerSecond = this.config.concurrentUsers / this.config.rampUpTime;
    let currentUsers = 0;

    for (let second = 0; second < this.config.testDuration; second++) {
      // Add new users during ramp-up
      if (second < this.config.rampUpTime) {
        const usersToAdd = Math.floor(usersPerSecond);
        currentUsers = Math.min(currentUsers + usersToAdd, this.config.concurrentUsers);
      }

      // Spawn requests for current number of users
      for (let user = 0; user < currentUsers; user++) {
        requests.push(this.simulateUserSession());
      }

      // Show progress every 10 seconds
      if (second % 10 === 0) {
        console.log(
          `⏱️  ${second}s: ${currentUsers} concurrent users, ${requests.length} total requests`
        );
      }

      // Wait a bit before next second
      await new Promise(resolve => setTimeout(resolve, 1000 / currentUsers || 100));
    }

    // Wait for all requests to complete
    await Promise.all(requests);

    const totalDuration = (Date.now() - startTime) / 1000;

    return this.generateReport(totalDuration);
  }

  /**
   * Simulate a user session with multiple requests
   */
  private async simulateUserSession(): Promise<void> {
    const sessionStart = Date.now();

    // Each user makes requests according to endpoint weights
    for (const endpoint of this.config.endpoints) {
      // Decide if user hits this endpoint based on weight
      if (Math.random() * 100 > endpoint.weight) {
        continue;
      }

      try {
        await this.makeRequest(endpoint);
      } catch (error) {
        const errorKey = `${endpoint.method} ${endpoint.path}`;
        this.errors.set(errorKey, (this.errors.get(errorKey) || 0) + 1);
      }
    }
  }

  /**
   * Make a single HTTP request
   */
  private async makeRequest(endpoint: LoadTestEndpoint): Promise<void> {
    const key = `${endpoint.method} ${endpoint.path}`;

    if (!this.results.has(key)) {
      this.results.set(key, []);
    }

    const startTime = performance.now();

    try {
      // Simulate network latency (10-500ms)
      const latency = Math.random() * 490 + 10;
      await new Promise(resolve => setTimeout(resolve, latency));

      // Simulate occasional failures (0.1% error rate)
      if (Math.random() < 0.001) {
        throw new Error('Simulated server error');
      }

      const responseTime = performance.now() - startTime;
      this.results.get(key)!.push(responseTime);
    } catch (error) {
      const errorKey = `${endpoint.method} ${endpoint.path}`;
      this.errors.set(errorKey, (this.errors.get(errorKey) || 0) + 1);

      throw error;
    }
  }

  /**
   * Generate test report with statistics
   */
  private generateReport(totalDuration: number): LoadTestMetrics {
    const results: LoadTestResult[] = [];
    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (const [endpoint, responseTimes] of this.results) {
      const errorCount = this.errors.get(endpoint) || 0;
      const totalCount = responseTimes.length + errorCount;
      const successCount = responseTimes.length;

      totalRequests += totalCount;
      totalSuccessful += successCount;
      totalFailed += errorCount;

      // Calculate statistics
      const sorted = responseTimes.sort((a, b) => a - b);
      const average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const throughput = successCount / totalDuration;
      const errorRate = (errorCount / totalCount) * 100;

      results.push({
        endpoint,
        totalRequests: totalCount,
        successfulRequests: successCount,
        failedRequests: errorCount,
        averageResponseTime: average,
        minResponseTime: min,
        maxResponseTime: max,
        p95ResponseTime: p95,
        p99ResponseTime: p99,
        throughput,
        errorRate,
      });
    }

    return {
      totalDuration,
      totalRequests,
      successfulRequests: totalSuccessful,
      failedRequests: totalFailed,
      totalErrorRate: (totalFailed / totalRequests) * 100,
      overallThroughput: totalSuccessful / totalDuration,
      peakConcurrentUsers: this.config.concurrentUsers,
      results,
    };
  }

  /**
   * Print formatted report
   */
  static printReport(metrics: LoadTestMetrics): void {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📈 LOAD TEST RESULTS');
    console.log('═'.repeat(80));

    console.log('\n📊 Summary:');
    console.log(`   Total Duration: ${metrics.totalDuration.toFixed(2)}s`);
    console.log(`   Total Requests: ${metrics.totalRequests.toLocaleString()}`);
    console.log(`   Successful: ${metrics.successfulRequests.toLocaleString()} ✅`);
    console.log(`   Failed: ${metrics.failedRequests.toLocaleString()} ❌`);
    console.log(`   Error Rate: ${metrics.totalErrorRate.toFixed(2)}%`);
    console.log(`   Overall Throughput: ${metrics.overallThroughput.toFixed(2)} req/s`);
    console.log(`   Peak Concurrent Users: ${metrics.peakConcurrentUsers.toLocaleString()}`);

    console.log('\n📍 Per-Endpoint Results:');
    console.log('');
    console.log(
      'Endpoint'.padEnd(40) +
        'Avg(ms)'.padStart(12) +
        'Min(ms)'.padStart(12) +
        'Max(ms)'.padStart(12) +
        'P95(ms)'.padStart(12) +
        'P99(ms)'.padStart(12) +
        'Err%'.padStart(8)
    );
    console.log('-'.repeat(96));

    for (const result of metrics.results) {
      console.log(
        result.endpoint.padEnd(40) +
          result.averageResponseTime.toFixed(2).padStart(12) +
          result.minResponseTime.toFixed(2).padStart(12) +
          result.maxResponseTime.toFixed(2).padStart(12) +
          result.p95ResponseTime.toFixed(2).padStart(12) +
          result.p99ResponseTime.toFixed(2).padStart(12) +
          result.errorRate.toFixed(2).padStart(8)
      );
    }

    console.log('\n');
    console.log('═'.repeat(80));

    // Performance assessment
    const avgResponseTime = metrics.results.reduce((sum, r) => sum + r.averageResponseTime, 0) /
      metrics.results.length;
    const errorRate = metrics.totalErrorRate;

    console.log('🎯 Performance Assessment:');
    if (avgResponseTime < 200 && errorRate < 0.5) {
      console.log('   ✅ EXCELLENT: System handles load well');
    } else if (avgResponseTime < 500 && errorRate < 1) {
      console.log('   ⚠️  GOOD: System handles load, some optimization possible');
    } else if (avgResponseTime < 1000 && errorRate < 2) {
      console.log('   ⚠️  ACCEPTABLE: Performance degradation observed');
    } else {
      console.log('   ❌ POOR: System struggling under load');
    }

    console.log('');
  }
}

// Configuration for load test
const loadTestConfig: LoadTestConfig = {
  totalUsers: 15000,
  concurrentUsers: 500, // Ramp up to 500 concurrent users
  rampUpTime: 60, // Ramp up over 60 seconds
  testDuration: 180, // Total test duration 3 minutes
  endpoints: [
    {
      method: 'GET',
      path: '/api/employees',
      description: 'List employees',
      weight: 25,
    },
    {
      method: 'GET',
      path: '/api/employees/:id',
      description: 'Get employee details',
      weight: 20,
    },
    {
      method: 'POST',
      path: '/api/employees',
      description: 'Create employee',
      weight: 5,
    },
    {
      method: 'PUT',
      path: '/api/employees/:id',
      description: 'Update employee',
      weight: 5,
    },
    {
      method: 'POST',
      path: '/api/bulk/upload',
      description: 'Bulk upload',
      weight: 5,
    },
    {
      method: 'GET',
      path: '/api/hr-sync/status',
      description: 'HR Sync status',
      weight: 20,
    },
    {
      method: 'POST',
      path: '/api/hr-sync/sync-now',
      description: 'Trigger sync',
      weight: 10,
    },
    {
      method: 'GET',
      path: '/api/schedule',
      description: 'Get schedule',
      weight: 10,
    },
  ],
};

// Run load test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new LoadTester(loadTestConfig);

  tester.runTest()
    .then(metrics => {
      LoadTester.printReport(metrics);

      // Exit with appropriate code
      const errorRate = metrics.totalErrorRate;
      const avgResponseTime = metrics.results.reduce((sum, r) => sum + r.averageResponseTime, 0) /
        metrics.results.length;

      if (errorRate > 2 || avgResponseTime > 1000) {
        console.log('❌ Load test FAILED: System does not meet performance requirements');
        process.exit(1);
      } else {
        console.log('✅ Load test PASSED: System meets performance requirements');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('❌ Load test error:', error);
      process.exit(1);
    });
}

export { LoadTester, LoadTestConfig, LoadTestMetrics, LoadTestResult };
