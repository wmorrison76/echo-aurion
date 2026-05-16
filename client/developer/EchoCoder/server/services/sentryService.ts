import axios from "axios";

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;

interface SentryError {
  id: string;
  title: string;
  message: string;
  culprit?: string;
  level: string;
  count: number;
  userCount?: number;
  lastSeen?: Date;
  firstSeen?: Date;
  status: string;
  environment?: string;
}

interface SentryEvent {
  id: string;
  message?: string;
  title?: string;
  "event.type"?: string;
  level?: string;
  timestamp?: string;
  stack?: { frames?: Array<{ filename?: string; lineno?: number }> };
}

class SentryService {
  private apiUrl: string = "https://sentry.io/api/0";
  private orgSlug: string = "";
  private projectSlug: string = "";

  constructor() {
    if (SENTRY_DSN) {
      this.parsedsn();
    }
  }

  private parsedsn() {
    try {
      const url = new URL(SENTRY_DSN);
      const pathParts = url.pathname.split("/");
      this.projectSlug = pathParts[pathParts.length - 1];
      this.orgSlug = pathParts[pathParts.length - 2];
      const hostParts = url.hostname.split(".");
      if (hostParts[0] !== "sentry") {
        this.apiUrl = `${url.protocol}//${url.hostname}/api/0`;
      }
    } catch (error) {
      console.error("Failed to parse Sentry DSN:", error);
    }
  }

  async getRecentErrors(limit: number = 10): Promise<SentryError[]> {
    if (!SENTRY_DSN || !SENTRY_AUTH_TOKEN) {
      return this.getMockErrors(limit);
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/organizations/${this.orgSlug}/issues/`,
        {
          headers: {
            Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
          },
          params: {
            limit,
            query: "is:unresolved",
            statsPeriod: "24h",
          },
        },
      );

      return response.data.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        message: issue.message || issue.title,
        culprit: issue.culprit,
        level: issue.level || "error",
        count: issue.count,
        userCount: issue.userCount,
        lastSeen: new Date(issue.lastSeen),
        firstSeen: new Date(issue.firstSeen),
        status: issue.status,
        environment: issue.environment,
      }));
    } catch (error) {
      console.error("Failed to fetch Sentry errors:", error);
      return this.getMockErrors(limit);
    }
  }

  async getErrorDetails(issueId: string): Promise<any> {
    if (!SENTRY_DSN || !SENTRY_AUTH_TOKEN) {
      return this.getMockErrorDetail();
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/organizations/${this.orgSlug}/issues/${issueId}/`,
        {
          headers: {
            Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("Failed to fetch error details:", error);
      return this.getMockErrorDetail();
    }
  }

  async getErrorEvents(
    issueId: string,
    limit: number = 5,
  ): Promise<SentryEvent[]> {
    if (!SENTRY_DSN || !SENTRY_AUTH_TOKEN) {
      return this.getMockEvents(limit);
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/organizations/${this.orgSlug}/issues/${issueId}/events/`,
        {
          headers: {
            Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
          },
          params: { limit },
        },
      );

      return response.data.map((event: any) => ({
        id: event.id,
        message: event.message,
        title: event.title,
        level: event.level,
        timestamp: event.dateCreated,
        stack: event.entries?.find((e: any) => e.type === "exception")?.data
          ?.values[0]?.stacktrace,
      }));
    } catch (error) {
      console.error("Failed to fetch error events:", error);
      return this.getMockEvents(limit);
    }
  }

  async generateInsights(errors: SentryError[]): Promise<string[]> {
    const insights: string[] = [];

    if (errors.length === 0) {
      return ["No recent errors detected"];
    }

    const errorsByLevel = errors.reduce(
      (acc, e) => {
        const level = e.level || "unknown";
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const criticalCount = errorsByLevel["fatal"] || 0;
    const errorCount = errorsByLevel["error"] || 0;
    const warningCount = errorsByLevel["warning"] || 0;

    if (criticalCount > 0) {
      insights.push(
        `🔴 ${criticalCount} critical error(s) detected - immediate action required`,
      );
    }

    if (errorCount > 5) {
      insights.push(
        `⚠️ High error rate: ${errorCount} errors in last 24 hours`,
      );
    }

    const highImpactErrors = errors
      .filter((e) => (e.userCount || 0) > 10)
      .sort((a, b) => (b.userCount || 0) - (a.userCount || 0));

    if (highImpactErrors.length > 0) {
      insights.push(
        `👥 Error "${highImpactErrors[0].title}" affects ${highImpactErrors[0].userCount || 0} users`,
      );
    }

    const recentErrors = errors.filter(
      (e) =>
        e.lastSeen &&
        new Date().getTime() - new Date(e.lastSeen).getTime() < 3600000,
    );

    if (recentErrors.length > 0) {
      insights.push(
        `⏱️ ${recentErrors.length} error(s) occurred in the last hour`,
      );
    }

    const commonPatterns = this.findCommonErrorPatterns(errors);
    if (commonPatterns.length > 0) {
      insights.push(`🔗 Common pattern: ${commonPatterns[0]}`);
    }

    return insights;
  }

  private findCommonErrorPatterns(errors: SentryError[]): string[] {
    const patterns: Record<string, number> = {};

    errors.forEach((error) => {
      const culprit = error.culprit || "unknown";
      const file = culprit.split("/").pop() || culprit;
      patterns[file] = (patterns[file] || 0) + 1;
    });

    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([file, count]) => `${file} (${count} occurrences)`);
  }

  private getMockErrors(limit: number): SentryError[] {
    return [
      {
        id: "1",
        title: "TypeError: Cannot read property of undefined",
        message: "Cannot read property 'map' of undefined",
        culprit: "client/pages/Analytics.tsx",
        level: "error",
        count: 24,
        userCount: 8,
        lastSeen: new Date(Date.now() - 600000),
        firstSeen: new Date(Date.now() - 86400000),
        status: "unresolved",
        environment: "production",
      },
      {
        id: "2",
        title: "ReferenceError: variable not defined",
        message: "getTestingService is not defined",
        culprit: "client/services/testingService.ts",
        level: "error",
        count: 12,
        userCount: 5,
        lastSeen: new Date(Date.now() - 3600000),
        firstSeen: new Date(Date.now() - 172800000),
        status: "unresolved",
        environment: "production",
      },
      {
        id: "3",
        title: "Network timeout in webhook delivery",
        message: "Request timeout after 30s",
        culprit: "server/routes/webhooks.ts",
        level: "warning",
        count: 18,
        userCount: 3,
        lastSeen: new Date(Date.now() - 1800000),
        firstSeen: new Date(Date.now() - 259200000),
        status: "unresolved",
        environment: "production",
      },
    ].slice(0, limit);
  }

  private getMockErrorDetail() {
    return {
      id: "1",
      title: "TypeError: Cannot read property of undefined",
      status: "unresolved",
      count: 24,
      userCount: 8,
      firstSeen: new Date(Date.now() - 86400000),
      lastSeen: new Date(Date.now() - 600000),
      culprit: "client/pages/Analytics.tsx",
      platform: "javascript",
    };
  }

  private getMockEvents(limit: number) {
    return [
      {
        id: "event-1",
        message: "Cannot read property 'map' of undefined",
        title: "TypeError: Cannot read property of undefined",
        level: "error",
        timestamp: new Date().toISOString(),
        stack: {
          frames: [
            {
              filename: "client/pages/Analytics.tsx",
              lineno: 45,
            },
          ],
        },
      },
    ].slice(0, limit);
  }
}

let sentryService: SentryService | null = null;

export function getSentryService(): SentryService {
  if (!sentryService) {
    sentryService = new SentryService();
  }
  return sentryService;
}
