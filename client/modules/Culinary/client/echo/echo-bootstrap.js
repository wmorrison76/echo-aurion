/**
 * EchoAi³ Bootstrap for Builder.io
 * --------------------------------
 * This is the main integration surface for your modules.
 *
 * Typical usage inside Builder.io custom JS:
 *
 *   import { bootstrapEcho, EchoAI3 } from "./client/echo/echo-bootstrap.js";
 *
 *   export default async function init(builderContext) {
 *     await bootstrapEcho({
 *       module: builderContext.modelName,
 *       pageState: builderContext.state,
 *       builderContext,
 *       enableMemory: true,
 *       enableGuardrails: true,
 *       uiHooks: true,
 *     });
 *   }
 */

import { getEchoInstance, EchoAI3 as EchoCoreAPI } from "./core/echo-core.js";
import { enableTronExpansions } from "./expansions/tron-expansion.js";
import { enableSandboxRecovery } from "./expansions/sandbox-restore.js";
import { configureSecurity } from "./expansions/security-wiring.js";
import { recordEchoEvent } from "./expansions/resilience-suite.js";

export async function bootstrapEcho(options = {}) {
  const instance = getEchoInstance(options);

  if (options.module) {
    instance.attachToModule(options.module);
  }

  // Configure security if provided
  if (options.security) {
    configureSecurity(options.security);
  }

  // Enable optional expansions
  if (options.enableTron !== false) {
    enableTronExpansions();
  }
  if (options.enableSandbox !== false) {
    enableSandboxRecovery();
  }

  recordEchoEvent("bootstrap", {
    module: options.module || "UnknownModule",
    at: new Date().toISOString(),
  });

  return instance;
}

// Re-export the high-level façade for convenience.
export const EchoAI3 = EchoCoreAPI;

export default {
  bootstrapEcho,
  EchoAI3,
};
