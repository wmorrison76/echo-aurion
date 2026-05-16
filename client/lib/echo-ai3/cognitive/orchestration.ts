/**
 * EchoAi³ Dock/Panel Orchestration
 * Orchestrate dock modules and panels safely via existing registry and panel-controller only.
 * No new authority; no bypass of audit; extends existing architecture only.
 */

import {
  dispatchOpenPanel,
  type DockAction,
} from "@/lib/panel-controller";
import {
  getPanelMetadata,
  isValidPanelKey,
  type PanelKey,
} from "@/lib/panel-registry";
import { parseCommand, validateCommand, executeCommand } from "@/lib/echo-ai-guardrails";
import { traceLedgerClient } from "@/lib/trace-ledger-client";
import type { ActionContext } from "@/lib/echo-ai3/action-context";
import type { OrchestrationRequest, OrchestrationResult } from "./types";

const DEMO_ORG = "demo-org";
const TRACE_ENTITY_ECHO = "echo-ai3-orchestration";

export type OrchestrationOptions = {
  emitTrace?: boolean;
  context?: ActionContext;
};

/**
 * Map orchestration action to dock action (registry + guardrails only).
 */
function toDockAction(action: OrchestrationRequest["action"]): DockAction | null {
  switch (action) {
    case "close-all":
      return "close-all";
    case "stack-grid":
      return "stack-grid";
    case "stack-cascade":
      return "stack-cascade";
    case "minimize-all":
      return "minimize-all";
    default:
      return null;
  }
}

/**
 * Orchestrate a single request: open panel or dock action.
 * Only opens panels that exist in panel registry; only dispatches guardrail-allowed actions.
 */
export function orchestrate(
  request: OrchestrationRequest,
  options?: OrchestrationOptions,
): OrchestrationResult {
  const orgId = options?.context?.orgId ?? DEMO_ORG;
  const traceId = options?.context?.traceId;
  const sourceRef = options?.context ? options.context.traceId : "echo-ai3-orchestration";

  if (request.action === "open-panel") {
    const key = request.panelKey;
    if (!key) {
      return { ok: false, reason: "open-panel requires panelKey" };
    }
    if (!isValidPanelKey(key)) {
      return { ok: false, reason: `Panel key not in registry: ${key}` };
    }
    const meta = getPanelMetadata(key as PanelKey);
    if (!meta) {
      return { ok: false, reason: `Panel metadata not found: ${key}` };
    }
    dispatchOpenPanel(key);
    if (options?.emitTrace && typeof window !== "undefined") {
      try {
        traceLedgerClient.append({
          orgId,
          entityType: TRACE_ENTITY_ECHO,
          entityId: traceId ?? `open-${key}-${Date.now()}`,
          sourceRef: traceId ?? "echo-ai3-orchestration",
          payload: {
            action: "open-panel",
            panelKey: key,
            source: "cognitive-layer",
            ...(options.context && {
              traceId: options.context.traceId,
              sessionId: options.context.sessionId,
              actor: options.context.actor,
            }),
          },
        });
      } catch {
        // trace append best-effort
      }
    }
    return { ok: true, reason: `Opened panel: ${meta.label}` };
  }

  const dockAction = toDockAction(request.action);
  if (!dockAction) {
    return { ok: false, reason: `Unknown action: ${request.action}` };
  }

  const command = parseCommand(
    request.action === "close-all"
      ? "close all panels"
      : request.action === "stack-grid"
        ? "stack panels in grid"
        : request.action === "stack-cascade"
          ? "stack panels in cascade"
          : "minimize all panels to dock",
  );
  const validation = validateCommand(command);
  if (!validation.allowed) {
    return { ok: false, reason: validation.reason ?? "Command not allowed by guardrails" };
  }

  executeCommand(command);
  if (options?.emitTrace && typeof window !== "undefined") {
    try {
      traceLedgerClient.append({
        orgId,
        entityType: TRACE_ENTITY_ECHO,
        entityId: traceId ?? `${request.action}-${Date.now()}`,
        sourceRef: traceId ?? "echo-ai3-orchestration",
        payload: {
          action: request.action,
          source: "cognitive-layer",
          ...(options.context && {
            traceId: options.context.traceId,
            sessionId: options.context.sessionId,
            actor: options.context.actor,
          }),
        },
      });
    } catch {
      // best-effort
    }
  }
  return { ok: true, reason: `Executed: ${request.action}` };
}

/**
 * Resolve natural language to orchestration request and run (guardrail-safe).
 */
export function orchestrateFromNaturalLanguage(
  input: string,
  options?: OrchestrationOptions,
): OrchestrationResult {
  const command = parseCommand(input);
  const validation = validateCommand(command);
  if (!validation.allowed) {
    return { ok: false, reason: validation.reason ?? "Command not allowed" };
  }

  let request: OrchestrationRequest;
  if (command.action === "open-whiteboard") {
    request = { action: "open-panel", panelKey: "whiteboard" };
  } else if (command.action === "open-notes") {
    request = { action: "open-panel", panelKey: "notes" };
  } else if (command.action === "open-network-chat") {
    request = { action: "open-panel", panelKey: "echo-chat" };
  } else if (command.action === "open-settings") {
    request = { action: "open-panel", panelKey: "layout" };
  } else if (command.action === "close-all") {
    request = { action: "close-all" };
  } else if (command.action === "stack-grid") {
    request = { action: "stack-grid" };
  } else if (command.action === "stack-cascade") {
    request = { action: "stack-cascade" };
  } else if (command.action === "minimize-all") {
    request = { action: "minimize-all" };
  } else {
    return { ok: false, reason: "No orchestration mapping for this command" };
  }

  return orchestrate(request, options);
}
