/**
 * EchoAI Guardrails - Command validation and execution restrictions
 * Prevents dangerous operations while allowing build/preview operations
 */

export type CommandType =
  | "dock-control"
  | "panel-action"
  | "layout-action"
  | "view-action"
  | "order-query"
  | "order-build"
  | "order-placement"
  | "settings-change"
  | "chat-send"
  | "unknown";

export interface Command {
  type: CommandType;
  action: string;
  params?: Record<string, any>;
  dangerous: boolean;
}

export interface CommandResult {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

/**
 * Parse natural language commands for dock and panel operations
 */
export function parseCommand(input: string): Command {
  const lower = input.toLowerCase().trim();

  // Dock control commands
  if (lower.includes("close") && (lower.includes("all") || lower.includes("panel"))) {
    return {
      type: "dock-control",
      action: "close-all",
      dangerous: false,
    };
  }

  if (lower.includes("stack") && lower.includes("grid")) {
    return {
      type: "layout-action",
      action: "stack-grid",
      dangerous: false,
    };
  }

  if (lower.includes("stack") && (lower.includes("cascade") || lower.includes("cascade"))) {
    return {
      type: "layout-action",
      action: "stack-cascade",
      dangerous: false,
    };
  }

  if (lower.includes("minimize") && lower.includes("dock")) {
    return {
      type: "dock-control",
      action: "minimize-all",
      dangerous: false,
    };
  }

  // Panel opening
  if (lower.includes("open") && lower.includes("whiteboard")) {
    return {
      type: "panel-action",
      action: "open-whiteboard",
      dangerous: false,
    };
  }

  if (lower.includes("open") && (lower.includes("chat") || lower.includes("network"))) {
    return {
      type: "panel-action",
      action: "open-network-chat",
      dangerous: false,
    };
  }

  if (lower.includes("open") && (lower.includes("notes") || lower.includes("sticky"))) {
    return {
      type: "panel-action",
      action: "open-notes",
      dangerous: false,
    };
  }

  // View/Display
  if (lower.includes("show") || lower.includes("display") || lower.includes("view")) {
    return {
      type: "view-action",
      action: "display-content",
      dangerous: false,
    };
  }

  // Order building (allowed)
  if (lower.includes("build") && lower.includes("order")) {
    return {
      type: "order-build",
      action: "build-order",
      dangerous: false,
    };
  }

  if (lower.includes("create") && lower.includes("order")) {
    return {
      type: "order-build",
      action: "create-order",
      dangerous: false,
    };
  }

  // Order placement (DANGEROUS - blocked)
  if (lower.includes("place") && lower.includes("order")) {
    return {
      type: "order-placement",
      action: "place-order",
      dangerous: true,
    };
  }

  if (lower.includes("submit") && lower.includes("order")) {
    return {
      type: "order-placement",
      action: "submit-order",
      dangerous: true,
    };
  }

  if (lower.includes("send") && lower.includes("order")) {
    return {
      type: "order-placement",
      action: "send-order",
      dangerous: true,
    };
  }

  // Chat/messaging
  if (lower.includes("send") && lower.includes("message")) {
    return {
      type: "chat-send",
      action: "send-message",
      dangerous: false,
    };
  }

  // Settings
  if (lower.includes("settings") || lower.includes("preferences")) {
    return {
      type: "settings-change",
      action: "open-settings",
      dangerous: false,
    };
  }

  return {
    type: "unknown",
    action: "unknown",
    dangerous: false,
  };
}

/**
 * Validate command against guardrails
 */
export function validateCommand(command: Command): CommandResult {
  // Block all dangerous operations
  if (command.dangerous) {
    return {
      allowed: false,
      reason: "This action is restricted. EchoAI cannot place orders. You can build orders but cannot submit them.",
      warning: "For safety, order placement must be done manually.",
    };
  }

  // Allow safe commands
  if (
    command.type === "dock-control" ||
    command.type === "panel-action" ||
    command.type === "layout-action" ||
    command.type === "view-action" ||
    command.type === "order-build" ||
    command.type === "chat-send" ||
    command.type === "settings-change"
  ) {
    return {
      allowed: true,
    };
  }

  // Unknown commands require manual confirmation
  return {
    allowed: false,
    reason: "Unknown command type",
    warning: "Please clarify what you'd like to do",
  };
}

/**
 * Execute validated command
 */
export function executeCommand(command: Command, params?: Record<string, any>): void {
  const validation = validateCommand(command);

  if (!validation.allowed) {
    console.warn("[EchoAI Guardrail]", validation.reason);
    return;
  }

  switch (command.type) {
    case "dock-control":
      window.dispatchEvent(
        new CustomEvent("dock-action", { detail: { action: command.action } })
      );
      break;

    case "panel-action": {
      const panelMap: Record<string, string> = {
        "open-whiteboard": "whiteboard",
        "open-network-chat": "network-chat",
        "open-notes": "notes",
      };
      const panelId = panelMap[command.action];
      if (panelId) {
        window.dispatchEvent(
          new CustomEvent("open-panel", { detail: { id: panelId } })
        );
      }
      break;
    }

    case "layout-action":
      window.dispatchEvent(
        new CustomEvent("dock-action", { detail: { action: command.action } })
      );
      break;

    case "settings-change":
      window.dispatchEvent(
        new CustomEvent("open-panel", { detail: { id: "settings" } })
      );
      break;

    case "chat-send":
      window.dispatchEvent(
        new CustomEvent("open-panel", { detail: { id: "network-chat" } })
      );
      break;

    default:
      console.log("[EchoAI] Acknowledged command but no action mapped");
  }
}

/**
 * Get allowed actions for EchoAI
 */
export function getAllowedActions(): string[] {
  return [
    "Close all panels",
    "Stack panels in grid layout",
    "Stack panels in cascade layout",
    "Minimize all panels to dock",
    "Open whiteboard",
    "Open network chat",
    "Open sticky notes",
    "Open settings",
    "Build orders",
    "Create drafts",
    "Send messages",
    "View dashboard",
    "Display content",
  ];
}

/**
 * Get blocked actions for EchoAI
 */
export function getBlockedActions(): string[] {
  return [
    "Place orders", // Place orders - must be manual
    "Submit orders", // Submit for processing
    "Send orders to kitchen", // Dispatch to operations
    "Charge customer", // Payment processing
    "Delete critical data", // Data destruction
    "Modify user accounts", // Account management
    "Change system settings", // Core configuration
    "Access sensitive information", // Security breach prevention
  ];
}
