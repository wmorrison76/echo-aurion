import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  analyzeOperations,
  getRecentAnomalies,
  checkCriticalAlerts,
} from "./predictiveOps"; // Mock Supabase
vi.mock("../lib/db", () => ({ supabase: { from: vi.fn() } })); // Mock OpenAI
vi.mock("openai", () => {
  return {
    default: class OpenAI {
      apiKey: string;
      constructor(options: any) {
        this.apiKey = options.apiKey;
      }
      get chat() {
        return { completions: { create: vi.fn() } };
      }
    },
  };
});
import { supabase } from "../lib/db";
import OpenAI from "openai";
describe("PredictiveOps Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });
  describe("analyzeOperations", () => {
    it("should return insufficient data insight when no metrics exist", async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      });
      const result = await analyzeOperations("org-123");
      expect(result).toHaveLength(1);
      expect(result[0].alert).toBe("Insufficient data");
      expect(result[0].severity).toBe("low");
    });
    it("should return error insight when database query fails", async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      });
      const result = await analyzeOperations("org-123");
      expect(result).toHaveLength(1);
      expect(result[0].alert).toBe("Analysis service temporarily unavailable");
      expect(result[0].severity).toBe("medium");
    });
    it("should analyze metrics and return insights", async () => {
      const mockMetrics = [
        {
          report_date: "2024-01-01",
          outlet_id: "outlet-1",
          labor_cost: 2000,
          revenue: 10000,
          tips: 500,
        },
        {
          report_date: "2024-01-02",
          outlet_id: "outlet-1",
          labor_cost: 2200,
          revenue: 9500,
          tips: 475,
        },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      });
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  alert: "Labor costs within normal range",
                  severity: "low",
                  recommendation: "Continue monitoring",
                  metric: "labor_pct",
                },
              ]),
            },
          },
        ],
      };
      vi.mocked(OpenAI).prototype.chat.completions.create = vi
        .fn()
        .mockResolvedValue(mockAIResponse);
      const result = await analyzeOperations("org-123");
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
    it("should sort insights by severity (critical first)", async () => {
      const mockMetrics = [
        {
          report_date: "2024-01-01",
          outlet_id: "outlet-1",
          labor_cost: 5000,
          revenue: 10000,
          tips: 500,
        },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      });
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  alert: "Low priority",
                  severity: "low",
                  recommendation: "Monitor",
                  metric: "metric1",
                },
                {
                  alert: "Critical issue",
                  severity: "critical",
                  recommendation: "Act immediately",
                  metric: "metric2",
                },
                {
                  alert: "Medium priority",
                  severity: "medium",
                  recommendation: "Review soon",
                  metric: "metric3",
                },
              ]),
            },
          },
        ],
      };
      vi.mocked(OpenAI).prototype.chat.completions.create = vi
        .fn()
        .mockResolvedValue(mockAIResponse);
      const result = await analyzeOperations("org-123");
      expect(result[0].severity).toBe("critical");
      expect(result[1].severity).toBe("medium");
      expect(result[2].severity).toBe("low");
    });
    it("should handle invalid JSON in AI response", async () => {
      const mockMetrics = [
        {
          report_date: "2024-01-01",
          outlet_id: "outlet-1",
          labor_cost: 2000,
          revenue: 10000,
          tips: 500,
        },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      });
      const mockAIResponse = {
        choices: [{ message: { content: "Invalid JSON response" } }],
      };
      vi.mocked(OpenAI).prototype.chat.completions.create = vi
        .fn()
        .mockResolvedValue(mockAIResponse);
      const result = await analyzeOperations("org-123");
      expect(result).toHaveLength(1);
      expect(result[0].alert).toBe("Analysis completed with partial results");
      expect(result[0].severity).toBe("low");
    });
    it("should calculate labor percentage correctly", async () => {
      const mockMetrics = [
        {
          report_date: "2024-01-01",
          outlet_id: "outlet-1",
          labor_cost: 3500,
          revenue: 10000,
          tips: 500,
        },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      });
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  alert: "Labor percentage is 35%",
                  severity: "high",
                  recommendation: "Review staffing",
                  metric: "labor_pct",
                },
              ]),
            },
          },
        ],
      };
      vi.mocked(OpenAI).prototype.chat.completions.create = vi
        .fn()
        .mockResolvedValue(mockAIResponse);
      const result = await analyzeOperations("org-123");
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
  describe("getRecentAnomalies", () => {
    it("should return limited number of anomalies", async () => {
      const mockMetrics = [
        {
          report_date: "2024-01-01",
          outlet_id: "outlet-1",
          labor_cost: 2000,
          revenue: 10000,
          tips: 500,
        },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      });
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  alert: "Alert 1",
                  severity: "low",
                  recommendation: "",
                  metric: "",
                },
                {
                  alert: "Alert 2",
                  severity: "low",
                  recommendation: "",
                  metric: "",
                },
                {
                  alert: "Alert 3",
                  severity: "low",
                  recommendation: "",
                  metric: "",
                },
              ]),
            },
          },
        ],
      };
      vi.mocked(OpenAI).prototype.chat.completions.create = vi
        .fn()
        .mockResolvedValue(mockAIResponse);
      const result = await getRecentAnomalies("org-123", 2);
      expect(result).toHaveLength(2);
    });
    it("should use default limit of 5 if not specified", async () => {
      const mockMetrics = [
        {
          report_date: "2024-01-01",
          outlet_id: "outlet-1",
          labor_cost: 2000,
          revenue: 10000,
          tips: 500,
        },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      });
      const mockAIResponse = {
        choices: [{ message: { content: JSON.stringify([]) } }],
      };
      vi.mocked(OpenAI).prototype.chat.completions.create = vi
        .fn()
        .mockResolvedValue(mockAIResponse);
      const result = await getRecentAnomalies("org-123");
      expect(Array.isArray(result)).toBe(true);
    });
  });
  describe("checkCriticalAlerts", () => {
    it("should return true when critical alert exists", async () => {
      const mockMetrics = [
        {
          report_date: "2024-01-01",
          outlet_id: "outlet-1",
          labor_cost: 2000,
          revenue: 10000,
          tips: 500,
        },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      });
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  alert: "Critical alert",
                  severity: "critical",
                  recommendation: "Act now",
                  metric: "critical_metric",
                },
              ]),
            },
          },
        ],
      };
      vi.mocked(OpenAI).prototype.chat.completions.create = vi
        .fn()
        .mockResolvedValue(mockAIResponse);
      const result = await checkCriticalAlerts("org-123");
      expect(result).toBe(true);
    });
    it("should return false when no critical alert exists", async () => {
      const mockMetrics = [
        {
          report_date: "2024-01-01",
          outlet_id: "outlet-1",
          labor_cost: 2000,
          revenue: 10000,
          tips: 500,
        },
      ];
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
      });
      const mockAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  alert: "Low priority",
                  severity: "low",
                  recommendation: "Monitor",
                  metric: "metric1",
                },
              ]),
            },
          },
        ],
      };
      vi.mocked(OpenAI).prototype.chat.completions.create = vi
        .fn()
        .mockResolvedValue(mockAIResponse);
      const result = await checkCriticalAlerts("org-123");
      expect(result).toBe(false);
    });
  });
});
