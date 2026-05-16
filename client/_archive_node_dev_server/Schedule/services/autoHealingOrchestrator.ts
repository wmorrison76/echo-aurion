/** * Auto-Healing Orchestrator * Monitors API endpoints and automatically applies repairs/mitigations * Supports multiple endpoints: predictiveOps, dataPipeline, advancedAI, echo */ import { supabase } from "../lib/db";
import OpenAI from "openai";
import { getSubmoduleOpenAIClient } from "@/modules/_shared/openai-client";
export interface EndpointHealthCheck {
  endpoint: string;
  healthy: boolean;
  lastChecked: Date;
  responseTime: number;
  errorRate: number;
  statusCode?: number;
  errorMessage?: string;
}
export interface HealingAction {
  endpoint: string;
  action: string;
  status: "pending" | "in_progress" | "success" | "failed";
  timestamp: Date;
  details?: Record<string, any>;
}
const healingHistory: HealingAction[] = [];
const healthChecks: EndpointHealthCheck[] = [];
const maxHistorySize = 1000; /** * Health check for predictiveOps endpoint */
export async function checkPredictiveOpsHealth(
  org_id: string,
): Promise<EndpointHealthCheck> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `/api/predictive-ops?org_id=${encodeURIComponent(org_id)}`,
      { method: "GET", headers: { "Content-Type": "application/json" } },
    );
    const responseTime = Date.now() - startTime;
    const healthy = response.ok && responseTime < 5000;
    const check: EndpointHealthCheck = {
      endpoint: "predictiveOps",
      healthy,
      lastChecked: new Date(),
      responseTime,
      errorRate: response.ok ? 0 : 100,
      statusCode: response.status,
      errorMessage: !response.ok ? `HTTP ${response.status}` : undefined,
    };
    healthChecks.push(check);
    if (healthChecks.length > maxHistorySize) healthChecks.shift();
    return check;
  } catch (error) {
    const check: EndpointHealthCheck = {
      endpoint: "predictiveOps",
      healthy: false,
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 100,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    healthChecks.push(check);
    if (healthChecks.length > maxHistorySize) healthChecks.shift();
    return check;
  }
} /** * Health check for dataPipeline endpoint */
export async function checkDataPipelineHealth(): Promise<EndpointHealthCheck> {
  const startTime = Date.now();
  try {
    const { data, error } = await supabase
      .from("property_summary")
      .select("count")
      .limit(1);
    const responseTime = Date.now() - startTime;
    const healthy = !error && responseTime < 3000;
    const check: EndpointHealthCheck = {
      endpoint: "dataPipeline",
      healthy,
      lastChecked: new Date(),
      responseTime,
      errorRate: error ? 100 : 0,
      errorMessage: error ? error.message : undefined,
    };
    healthChecks.push(check);
    if (healthChecks.length > maxHistorySize) healthChecks.shift();
    return check;
  } catch (error) {
    const check: EndpointHealthCheck = {
      endpoint: "dataPipeline",
      healthy: false,
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 100,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    healthChecks.push(check);
    if (healthChecks.length > maxHistorySize) healthChecks.shift();
    return check;
  }
} /** * Health check for advancedAI endpoint */
export async function checkAdvancedAIHealth(
  org_id: string,
  outlet_id: string,
): Promise<EndpointHealthCheck> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `/api/advanced-ai/labor-anomalies?org_id=${encodeURIComponent(org_id)}&outlet_id=${encodeURIComponent(outlet_id)}`,
      { method: "GET", headers: { "Content-Type": "application/json" } },
    );
    const responseTime = Date.now() - startTime;
    const healthy = response.ok && responseTime < 5000;
    const check: EndpointHealthCheck = {
      endpoint: "advancedAI",
      healthy,
      lastChecked: new Date(),
      responseTime,
      errorRate: response.ok ? 0 : 100,
      statusCode: response.status,
      errorMessage: !response.ok ? `HTTP ${response.status}` : undefined,
    };
    healthChecks.push(check);
    if (healthChecks.length > maxHistorySize) healthChecks.shift();
    return check;
  } catch (error) {
    const check: EndpointHealthCheck = {
      endpoint: "advancedAI",
      healthy: false,
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 100,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    healthChecks.push(check);
    if (healthChecks.length > maxHistorySize) healthChecks.shift();
    return check;
  }
} /** * Health check for Echo endpoint */
export async function checkEchoHealth(): Promise<EndpointHealthCheck> {
  const startTime = Date.now();
  try {
    const response = await fetch("/api/echo-multilingual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "System health check", lang: "en" }),
    });
    const responseTime = Date.now() - startTime;
    const healthy = response.ok && responseTime < 5000;
    const check: EndpointHealthCheck = {
      endpoint: "echo",
      healthy,
      lastChecked: new Date(),
      responseTime,
      errorRate: response.ok ? 0 : 100,
      statusCode: response.status,
      errorMessage: !response.ok ? `HTTP ${response.status}` : undefined,
    };
    healthChecks.push(check);
    if (healthChecks.length > maxHistorySize) healthChecks.shift();
    return check;
  } catch (error) {
    const check: EndpointHealthCheck = {
      endpoint: "echo",
      healthy: false,
      lastChecked: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 100,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    healthChecks.push(check);
    if (healthChecks.length > maxHistorySize) healthChecks.shift();
    return check;
  }
} /** * Apply healing action for unhealthy endpoint */
export async function applyHealingAction(
  endpoint: string,
  check: EndpointHealthCheck,
): Promise<HealingAction> {
  const action: HealingAction = {
    endpoint,
    action: "automatic_healing_initiated",
    status: "pending",
    timestamp: new Date(),
    details: { reason: check.errorMessage, responseTime: check.responseTime },
  };
  try {
    action.status = "in_progress";
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      action.status = "failed";
      action.details!.error = "OpenAI not configured";
      healingHistory.push(action);
      return action;
    }
    const client = getSubmoduleOpenAIClient();
    const healingPrompt = `
An API endpoint has reported health issues. Suggest specific healing actions: Endpoint: ${endpoint}
Error: ${check.errorMessage}
Response Time: ${check.responseTime}ms
Status Code: ${check.statusCode} Suggest:
1. Immediate mitigation actions
2. Root cause diagnosis
3. Long-term fixes
4. Monitoring improvements Return as JSON with: mitigations (array), diagnosis (string), fixes (array), monitoring (string)
`;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI system reliability engineer. Analyze API health issues and suggest concrete healing actions.",
        },
        { role: "user", content: healingPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });
    const content = response.choices[0]?.message?.content || "{}";
    try {
      const suggestions = JSON.parse(content);
      action.details = { ...action.details, ...suggestions };
      action.status = "success";
    } catch (parseError) {
      action.status = "failed";
      action.details!.error = "Failed to parse healing suggestions";
    }
  } catch (error) {
    action.status = "failed";
    action.details!.error =
      error instanceof Error ? error.message : String(error);
  }
  healingHistory.push(action);
  if (healingHistory.length > maxHistorySize) {
    healingHistory.shift();
  }
  return action;
} /** * Run comprehensive health check across all endpoints */
export async function runComprehensiveHealthCheck(
  org_id: string,
  outlet_id: string,
): Promise<{
  timestamp: Date;
  overall_health: "healthy" | "degraded" | "critical";
  checks: EndpointHealthCheck[];
  healingActions: HealingAction[];
}> {
  const checks: EndpointHealthCheck[] = [];
  const healingActions: HealingAction[] = [];
  const checks_results = await Promise.all([
    checkPredictiveOpsHealth(org_id),
    checkDataPipelineHealth(),
    checkAdvancedAIHealth(org_id, outlet_id),
    checkEchoHealth(),
  ]);
  checks.push(...checks_results);
  for (const check of checks_results) {
    if (!check.healthy) {
      const action = await applyHealingAction(check.endpoint, check);
      healingActions.push(action);
    }
  }
  const unhealthyCount = checks.filter((c) => !c.healthy).length;
  let overall_health: "healthy" | "degraded" | "critical";
  if (unhealthyCount === 0) {
    overall_health = "healthy";
  } else if (unhealthyCount === 1) {
    overall_health = "degraded";
  } else {
    overall_health = "critical";
  }
  return { timestamp: new Date(), overall_health, checks, healingActions };
} /** * Get healing history for audit and analysis */
export function getHealingHistory(limit: number = 100): HealingAction[] {
  return healingHistory.slice(-limit);
} /** * Get current health status */
export function getCurrentHealthStatus(): {
  endpoints: EndpointHealthCheck[];
  overallHealth: "healthy" | "degraded" | "critical";
  lastCheck: Date | null;
} {
  const recentChecks = healthChecks.slice(-4);
  const unhealthyCount = recentChecks.filter((c) => !c.healthy).length;
  let overallHealth: "healthy" | "degraded" | "critical" = "healthy";
  if (unhealthyCount === 1) overallHealth = "degraded";
  if (unhealthyCount > 1) overallHealth = "critical";
  return {
    endpoints: recentChecks,
    overallHealth,
    lastCheck: recentChecks.length > 0 ? recentChecks[0].lastChecked : null,
  };
} /** * Clear old health check records */
export function clearOldRecords(olderThanMinutes: number = 60): void {
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60000);
  const initialLength = healthChecks.length;
  for (let i = healthChecks.length - 1; i >= 0; i--) {
    if (healthChecks[i].lastChecked < cutoffTime) {
      healthChecks.splice(i, 1);
    }
  }
  console.log(
    `Cleared ${initialLength - healthChecks.length} old health check records`,
  );
}
