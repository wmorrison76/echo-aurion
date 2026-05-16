import { useEffect, useState } from "react";
import {
  parseCommand,
  validateCommand,
  executeCommand,
  getAllowedActions,
  getBlockedActions,
} from "@/lib/echo-ai-guardrails";
import {
  requireActionContext,
  type ActionContext,
} from "@/lib/echo-ai3/action-context";
import { orchestrateFromNaturalLanguage } from "@/lib/echo-ai3/cognitive";
import { emitTrace } from "@/lib/trace-emitter";
import { traceLedgerClient } from "@/lib/trace-ledger-client";

const DOCK_ENTITY = "echo-ai3-dock";
const DOCK_SOURCE = "dock";

/**
 * Emit a dock-stage trace to server (POST /api/trace) and local store.
 * Fail-closed: context required; traces are org-scoped and actor-scoped.
 */
async function emitDockStage(
  context: ActionContext,
  stage: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
): Promise<void> {
  const entityId = `${stage}-${context.traceId}`;
  const payload = {
    stage,
    traceId: context.traceId,
    sessionId: context.sessionId,
    actor: context.actor,
    orgId: context.orgId,
    ...inputs,
    ...outputs,
  };

  try {
    await emitTrace(
      DOCK_ENTITY,
      entityId,
      DOCK_SOURCE,
      "echo-ai3",
      inputs,
      outputs,
      {
        traceId: context.traceId,
        sourceRef: context.traceId,
        userId: context.actor.userId,
        role: context.actor.role,
        orgId: context.orgId,
      },
    );
  } catch {
    // best-effort server emit
  }

  try {
    traceLedgerClient.append({
      orgId: context.orgId,
      entityType: DOCK_ENTITY,
      entityId,
      sourceRef: context.traceId,
      payload,
    });
  } catch {
    // best-effort local store
  }
}

/**
 * EchoAI Dock Controller
 * Wired path: Dock → Cognitive (mapping) → Guardrails (authority) → TraceLedger.
 * Requires ActionContext at command start; emits NL_INPUT_RECEIVED, COMMAND_MAPPED,
 * COMMAND_VALIDATED/COMMAND_BLOCKED, COMMAND_EXECUTED. No bypass of guardrails.
 */
export default function EchoAiDockController() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [commandLog, setCommandLog] = useState<
    Array<{
      id: string;
      input: string;
      parsed: string;
      allowed: boolean;
      executed: boolean;
    }>
  >([]);

  useEffect(() => {
    (window as any).__echoAiGuardrails = {
      allowedActions: getAllowedActions(),
      blockedActions: getBlockedActions(),
      parseAndExecute: handleEchoAiCommand,
    };
  }, []);

  const handleEchoAiCommand = (userInput: string): { allowed: boolean; message: string } => {
    if (!isEnabled) {
      return { allowed: false, message: "EchoAI dock control is currently disabled" };
    }

    let context: ActionContext;
    try {
      context = requireActionContext();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Missing action context (fail-closed)";
      return { allowed: false, message };
    }

    emitDockStage(context, "NL_INPUT_RECEIVED", { input: userInput }, {});

    const cogResult = orchestrateFromNaturalLanguage(userInput, {
      context,
      emitTrace: true,
    });

    if (cogResult.ok) {
      emitDockStage(context, "COMMAND_MAPPED", { input: userInput }, { mapped: true, reason: cogResult.reason });
    }

    const command = parseCommand(userInput);
    const validation = validateCommand(command);

    if (validation.allowed) {
      emitDockStage(context, "COMMAND_VALIDATED", { input: userInput, action: command.action }, {});
    } else {
      emitDockStage(context, "COMMAND_BLOCKED", { input: userInput, action: command.action }, { reason: validation.reason });
    }

    const logEntry = {
      id: `cmd-${Date.now()}`,
      input: userInput,
      parsed: command.action,
      allowed: validation.allowed,
      executed: false,
    };

    if (validation.allowed) {
      if (!cogResult.ok) {
        executeCommand(command);
      }
      logEntry.executed = true;
      emitDockStage(context, "COMMAND_EXECUTED", { input: userInput, action: command.action }, {});
      setCommandLog((prev) => [logEntry, ...prev].slice(0, 50));
      return {
        allowed: true,
        message: `✓ Executed: ${command.action}`,
      };
    }

    setCommandLog((prev) => [logEntry, ...prev].slice(0, 50));
    return {
      allowed: false,
      message: validation.reason || "Command not allowed",
    };
  };

  useEffect(() => {
    const handleDockAction = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string }>).detail;
      if (detail) {
        setCommandLog((prev) =>
          [
            {
              id: `dock-${Date.now()}`,
              input: `Direct: ${detail.action}`,
              parsed: detail.action,
              allowed: true,
              executed: true,
            },
            ...prev,
          ].slice(0, 50),
        );
      }
    };

    const handleOpenPanel = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail) {
        setCommandLog((prev) =>
          [
            {
              id: `panel-${Date.now()}`,
              input: `Open: ${detail.id}`,
              parsed: `open-${detail.id}`,
              allowed: true,
              executed: true,
            },
            ...prev,
          ].slice(0, 50),
        );
      }
    };

    window.addEventListener("dock-action", handleDockAction);
    window.addEventListener("open-panel", handleOpenPanel);

    return () => {
      window.removeEventListener("dock-action", handleDockAction);
      window.removeEventListener("open-panel", handleOpenPanel);
    };
  }, []);

  return (
    <div style={{ display: "none" }}>
      {/* Wired path: Dock → Cognitive → Guardrails → TraceLedger */}
    </div>
  );
}

export { parseCommand, validateCommand, executeCommand };
