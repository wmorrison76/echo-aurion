/**
 * Action Executor for EchoAI
 *
 * Handles executing AI-suggested actions like opening modules,
 * dictating recipes, fetching data, etc.
 * Uses osBus for multi-user safe local event emission.
 */

import { osBus } from "@/lib/os-bus";

export type ActionType =
  | "open_panel"
  | "open_module"
  | "show_telemetry"
  | "fetch_recipe"
  | "execute_command"
  | "show_forecast"
  | "show_schedule";

export interface ActionPayload {
  type: ActionType;
  params: Record<string, any>;
  context?: string;
}

/**
 * Parse AI response to extract action if present
 * Example: "Let me open the Culinary module for you"
 * -> { type: "open_module", params: { module: "Culinary" } }
 */
export function parseActionFromAIResponse(
  response: string
): ActionPayload | null {
  const lowerResponse = response.toLowerCase();

  // Open module patterns
  const moduleMatch = response.match(
    /open\s+(?:the\s+)?(\w+)\s+(?:module|panel)/i
  );
  if (moduleMatch) {
    return {
      type: "open_module",
      params: { module: moduleMatch[1] },
      context: response,
    };
  }

  // Search recipe patterns
  const recipeMatch = response.match(
    /(?:find|search|show)?\s*(?:recipe|dish)\s*(?:for|named)?\s*["\']?([^"\']+)["\']?/i
  );
  if (recipeMatch && lowerResponse.includes("recipe")) {
    return {
      type: "fetch_recipe",
      params: { query: recipeMatch[1] },
      context: response,
    };
  }

  // Show telemetry/KPIs
  if (
    lowerResponse.includes("telemetry") ||
    lowerResponse.includes("kpi") ||
    lowerResponse.includes("metrics")
  ) {
    return {
      type: "show_telemetry",
      params: {},
      context: response,
    };
  }

  // Forecast patterns
  if (
    lowerResponse.includes("forecast") ||
    lowerResponse.includes("covers") ||
    lowerResponse.includes("expected")
  ) {
    return {
      type: "show_forecast",
      params: {},
      context: response,
    };
  }

  // Schedule patterns
  if (lowerResponse.includes("schedule") || lowerResponse.includes("staff")) {
    return {
      type: "show_schedule",
      params: {},
      context: response,
    };
  }

  return null;
}

/**
 * Execute an action with proper error handling
 */
export async function executeAction(action: ActionPayload): Promise<boolean> {
  try {
    console.log("[ActionExecutor] Executing:", action.type, action.params);

    switch (action.type) {
      case "open_module": {
        const module = action.params.module as string;
        osBus.emit("ui:open_panel", {
          panelId: module.toLowerCase(),
          source: "echo-ai",
        });
        return true;
      }

      case "open_panel": {
        const panelId = action.params.panelId as string;
        const tabId = action.params.tabId as string | undefined;
        osBus.emit("ui:open_panel", { panelId, tabId, source: "echo-ai" });
        return true;
      }

      case "fetch_recipe": {
        const query = action.params.query as string;
        osBus.emit("culinary:search_recipe", {
          query,
          source: "echo-ai",
        });
        return true;
      }

      case "show_telemetry": {
        osBus.emit("ui:show_telemetry", { source: "echo-ai" });
        return true;
      }

      case "show_forecast": {
        osBus.emit("ui:open_panel", {
          panelId: "forecast",
          source: "echo-ai",
        });
        return true;
      }

      case "show_schedule": {
        osBus.emit("ui:open_panel", {
          panelId: "schedule",
          source: "echo-ai",
        });
        return true;
      }

      case "execute_command": {
        const command = action.params.command as string;
        osBus.emit("echo:execute_command", {
          command,
          source: "echo-ai",
        });
        return true;
      }

      default:
        console.warn("[ActionExecutor] Unknown action type:", action.type);
        return false;
    }
  } catch (err) {
    console.error("[ActionExecutor] Error executing action:", err);
    return false;
  }
}

/**
 * Chain multiple actions together
 */
export async function executeActionChain(
  actions: ActionPayload[]
): Promise<boolean[]> {
  const results: boolean[] = [];

  for (const action of actions) {
    try {
      const result = await executeAction(action);
      results.push(result);

      // Small delay between actions to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (err) {
      console.error("[ActionExecutor] Error in chain:", err);
      results.push(false);
    }
  }

  return results;
}

/**
 * Listen for AI action suggestions and execute them
 */
export function installActionExecutorListener(): void {
  const handleAIAction = (event: CustomEvent<ActionPayload>) => {
    void executeAction(event.detail);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("echo:action", handleAIAction as any);
  }
}
