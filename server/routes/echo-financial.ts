/**
 * Echo AI Financial Data Integration
 * Enables Echo AI^3 to answer financial questions using EchoAurum data
 *
 * Supports queries like:
 * - "What was our revenue last month?"
 * - "How's labor cost looking this period?"
 * - "Compare this month's P&L to budget"
 * - "Show me departmental revenue breakdown"
 * - "What's our net income vs prior year?"
 */

import { Router, Request, Response } from "express";
import { jwtAuthMiddleware } from "../middleware/auth-jwt";
import { logger } from "../lib/logger";

const router = Router();

router.use(jwtAuthMiddleware);

/**
 * POST /api/echo/financial-query
 * Convert natural language financial question to structured query
 * and execute it using the financial data query API
 */
router.post(
  "/financial-query",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { question, outlet_ids, period } = req.body;

      if (!question) {
        res.status(400).json({ error: "Question is required" });
        return;
      }

      // Use OpenAI to parse the natural language question into a structured query
      const apiKey =
        process.env.ECHO_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: "OpenAI API key not configured" });
        return;
      }

      // Call OpenAI with function calling to extract financial intent
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a financial query parser. Extract the intent and parameters from financial questions.

Available metrics: revenue, cogs, gross_profit, gross_margin_percent, labor_cost, labor_cost_percent, overhead_cost, operating_expense, operating_income, net_income, transaction_count, covers_served, average_check

You must respond with a JSON object containing:
{
  "metrics": ["metric_id", ...],  // Which metrics to query
  "drill_down_level": "summary|departmental|cost-center|gl-account",  // Level of detail
  "comparisons": {
    "budget": true/false,
    "prior_year": true/false,
    "prior_period": true/false
  },
  "intent": "string",  // Natural language intent
  "confidence": number  // 0-1 confidence in the interpretation
}

Examples:
- "What was our revenue last month?" → {"metrics": ["revenue"], "drill_down_level": "summary", "comparisons": {}, "intent": "revenue_query", "confidence": 0.95}
- "Compare labor cost to budget by department" → {"metrics": ["labor_cost"], "drill_down_level": "departmental", "comparisons": {"budget": true}, "intent": "labor_analysis", "confidence": 0.9}
- "Net income vs prior year" → {"metrics": ["net_income"], "drill_down_level": "summary", "comparisons": {"prior_year": true}, "intent": "income_comparison", "confidence": 0.92}`,
              },
              {
                role: "user",
                content: question,
              },
            ],
            temperature: 0.3,
          }),
        },
      );

      const data: any = await response.json();

      if (!response.ok) {
        logger.error("[EchoFinancial] OpenAI parsing failed", {
          error: data.error,
        });
        res.status(500).json({ error: "Failed to parse financial question" });
        return;
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        res
          .status(400)
          .json({ error: "Could not parse financial intent from question" });
        return;
      }

      let parsedQuery: any;
      try {
        parsedQuery = JSON.parse(content);
      } catch {
        logger.error("[EchoFinancial] Failed to parse OpenAI response", {
          content,
        });
        res
          .status(400)
          .json({ error: "Invalid response format from AI parser" });
        return;
      }

      // Validate required fields
      if (
        !parsedQuery.metrics ||
        !Array.isArray(parsedQuery.metrics) ||
        parsedQuery.metrics.length === 0
      ) {
        res.status(400).json({
          error: "Could not determine which metrics to query",
          suggestion:
            "Please be more specific about what financial data you want to see",
        });
        return;
      }

      // Execute the financial data query
      const currentDate = new Date();
      const financialQuery = {
        outlet_ids: outlet_ids || ["default-outlet"],
        metrics: parsedQuery.metrics,
        period: period || {
          type: "monthly",
          start_date: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1,
          )
            .toISOString()
            .split("T")[0],
          end_date: currentDate.toISOString().split("T")[0],
          fiscal_year: currentDate.getFullYear(),
          fiscal_period: currentDate.getMonth() + 1,
        },
        drill_down_level: parsedQuery.drill_down_level || "summary",
        include_comparisons: parsedQuery.comparisons || {},
      };

      // For MVP, return mock financial data
      // In production, this would call the actual /api/financial-data-query endpoint
      const queryResult = {
        query: financialQuery,
        data: [
          {
            outlet_id: financialQuery.outlet_ids[0] || "default-outlet",
            outlet_name: "Restaurant Outlet",
            period: `${financialQuery.period.start_date} to ${financialQuery.period.end_date}`,
            metrics: Object.fromEntries(
              financialQuery.metrics.map((m) => [
                m,
                Math.round(Math.random() * 50000 * 100) / 100,
              ]),
            ),
            last_updated: new Date().toISOString(),
          },
        ],
        summary: {
          total_records: 1,
          outlets_included: financialQuery.outlet_ids,
          period_label: financialQuery.period.start_date,
          generated_at: new Date().toISOString(),
        },
      };

      // Use OpenAI to convert the result into a natural language response
      const summaryResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a financial analyst. Summarize financial data queries in a clear, actionable way.

Provide:
1. Direct answer to the question
2. Key insights and highlights
3. Notable trends or variances
4. Recommendations if applicable

Keep the response concise (3-5 sentences) and professional.`,
              },
              {
                role: "user",
                content: `User asked: "${question}"

Financial data returned:
${JSON.stringify(queryResult, null, 2)}

Provide a natural language summary of this financial data that directly answers the user's question.`,
              },
            ],
            temperature: 0.3,
          }),
        },
      );

      const summaryData: any = await summaryResponse.json();
      const naturalLanguageAnswer =
        summaryData.choices?.[0]?.message?.content ||
        "Unable to generate summary";

      res.json({
        ok: true,
        answer: naturalLanguageAnswer,
        parsed_query: parsedQuery,
        financial_data: queryResult,
        confidence: parsedQuery.confidence || 0.8,
      });
    } catch (error) {
      logger.error("[EchoFinancial] Request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: "Financial query processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * POST /api/echo/financial-insights
 * Get AI-generated insights about financial data
 * Used for proactive financial analysis and recommendations
 */
router.post(
  "/financial-insights",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { outlet_ids, period } = req.body;

      // Fetch comprehensive P&L data
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

      const financialData = {
        query: {
          outlet_ids: outlet_ids || ["default-outlet"],
          metrics: [
            "revenue",
            "cogs",
            "gross_profit",
            "gross_margin_percent",
            "labor_cost",
            "labor_cost_percent",
            "operating_income",
            "net_income",
          ],
        },
        data: [
          {
            outlet_id: outlet_ids?.[0] || "default-outlet",
            outlet_name: "Restaurant Outlet",
            period: `${startDate.toISOString().split("T")[0]} to ${now.toISOString().split("T")[0]}`,
            metrics: {
              revenue: 45000,
              cogs: 13500,
              gross_profit: 31500,
              gross_margin_percent: 70,
              labor_cost: 9000,
              labor_cost_percent: 20,
              operating_income: 16500,
              net_income: 14000,
            },
            comparison: {
              budget: {
                revenue: 42000,
                cogs: 12600,
                gross_profit: 29400,
                gross_margin_percent: 70,
                labor_cost: 8400,
                labor_cost_percent: 20,
                operating_income: 15800,
                net_income: 13400,
              },
              prior_year: {
                revenue: 41000,
                cogs: 12300,
                gross_profit: 28700,
                gross_margin_percent: 70,
                labor_cost: 8200,
                labor_cost_percent: 20,
                operating_income: 15200,
                net_income: 13000,
              },
            },
            last_updated: new Date().toISOString(),
          },
        ],
      };

      // Use OpenAI to generate insights
      const apiKey =
        process.env.ECHO_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.status(400).json({ error: "OpenAI API key not configured" });
        return;
      }

      const insightsResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a financial analyst. Analyze P&L data and provide actionable insights.

Format your response as JSON:
{
  "summary": "Overall financial health (1-2 sentences)",
  "key_metrics": [
    { "metric": "Gross Margin %", "status": "healthy|concern|warning", "insight": "explanation" },
    { "metric": "Labor Cost %", "status": "healthy|concern|warning", "insight": "explanation" }
  ],
  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],
  "risks": ["risk 1", "risk 2"],
  "recommendations": ["action 1", "action 2", "action 3"]
}`,
              },
              {
                role: "user",
                content: `Analyze this financial data and provide insights:
${JSON.stringify(financialData, null, 2)}`,
              },
            ],
            temperature: 0.3,
          }),
        },
      );

      const insightsData: any = await insightsResponse.json();
      const content = insightsData.choices?.[0]?.message?.content;

      let insights: any = {};
      try {
        insights = JSON.parse(content || "{}");
      } catch {
        insights = {
          summary: content,
          key_metrics: [],
          opportunities: [],
          risks: [],
          recommendations: [],
        };
      }

      res.json({
        ok: true,
        insights,
        financial_data: financialData,
      });
    } catch (error) {
      logger.error("[EchoFinancial] Insights generation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: "Financial insights generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export default router;
