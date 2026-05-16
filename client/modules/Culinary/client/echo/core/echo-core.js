/**
 * EchoAi³ Core Engine
 * -------------------
 * Lightweight façade used by Builder.io modules.
 * Handles lifecycle, request routing, and plugin registration.
 */

import { createMemoryStore } from "./echo-memory.js";
import { createSafetyLayer } from "./echo-safety.js";

const DEFAULT_OPTIONS = {
  enableMemory: true,
  enableGuardrails: true,
  uiHooks: true,
  module: "UnknownModule",
  pageState: {},
  builderContext: null,
};

/**
 * Internal singleton instance.
 */
let _echoInstance = null;

/**
 * EchoAi3Core
 * Encapsulates core behavior and provides the public API.
 */
class EchoAi3Core {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.module = this.options.module;
    this.pageState = this.options.pageState || {};
    this.builderContext = this.options.builderContext || null;

    // Subsystems
    this.memory = this.options.enableMemory
      ? createMemoryStore({ module: this.module })
      : null;

    this.safety = this.options.enableGuardrails
      ? createSafetyLayer({ module: this.module })
      : { filter: async (p) => p };

    this.plugins = new Map();
    this.knowledge = new Map();
    this.attachedModules = new Set();
  }

  /**
   * Register a plugin with a unique id.
   */
  registerPlugin(id, plugin) {
    if (!id || !plugin) return;
    this.plugins.set(id, plugin);
  }

  /**
   * Register a knowledge source for a module.
   */
  registerKnowledge(module, key, payload) {
    const existing = this.knowledge.get(module) || {};
    this.knowledge.set(module, { ...existing, [key]: payload });
  }

  getKnowledge(module) {
    return this.knowledge.get(module || this.module) || {};
  }

  /**
   * Attach EchoAi³ to a module; typically called in useEffect.
   */
  attachToModule(moduleName) {
    if (!moduleName) return;
    this.attachedModules.add(moduleName);
    this.module = moduleName;
    if (this.memory) {
      this.memory.setContext({ module: moduleName });
    }
    if (typeof window !== "undefined") {
      window.__ECHO_AI3__ = this; // Handy for debugging
    }
  }

  /**
   * Core conversational method.
   * This is where you'd route through your real LLM backend.
   */
  async ask({ prompt, module, context = {} }) {
    if (!prompt || typeof prompt !== "string") {
      return "EchoAi³: I didn't receive a valid prompt.";
    }

    // 1) Apply safety filter
    const safePrompt = await this.safety.filter(prompt);

    // 2) Combine context
    const activeModule = module || this.module;
    const knowledge = this.getKnowledge(activeModule);
    const fullContext = {
      ...this.pageState,
      ...context,
      knowledge,
      module: activeModule,
    };

    // 3) TODO: Call your real AI backend here.
    // For now we return a deterministic, developer-friendly response.
    const syntheticResponse =
      "EchoAi³ synthetic response for module \"" +
      activeModule +
      "\" with prompt: \"" +
      safePrompt +
      "\".\n\n" +
      "Context keys: " +
      Object.keys(fullContext).join(", ") +
      ".";

    // 4) Store in memory
    if (this.memory) {
      this.memory.appendConversation({
        module: activeModule,
        prompt: safePrompt,
        response: syntheticResponse,
        timestamp: new Date().toISOString(),
      });
    }

    return syntheticResponse;
  }

  /**
   * Forecasting / prediction shortcut.
   */
  async predict(task, options = {}) {
    const activeModule = options.module || this.module;
    const knowledge = this.getKnowledge(activeModule);

    // Here you would delegate to a forecasting engine.
    // We return a structured placeholder that downstream UI can still use.
    return {
      module: activeModule,
      task,
      generatedAt: new Date().toISOString(),
      knowledgeKeys: Object.keys(knowledge),
      note:
        "This is a stub prediction from EchoAi³ core. Wire this to your forecasting backend.",
    };
  }

  /**
   * Inspection / diagnostics across modules.
   */
  async inspect(subject, options = {}) {
    const activeModule = options.module || this.module;
    const knowledge = this.getKnowledge(activeModule);

    return {
      module: activeModule,
      subject,
      issues: [],
      summary:
        "EchoAi³ inspection stub. Use this to plug in health checks, missing configuration checks, or cross-module validation.",
      knowledgeSnapshotPreview: Object.keys(knowledge),
    };
  }
}

/**
 * Get or create the singleton EchoAi³ instance.
 */
export function getEchoInstance(options = {}) {
  if (_echoInstance) return _echoInstance;
  _echoInstance = new EchoAi3Core(options);
  return _echoInstance;
}

/**
 * Reset Echo instance – useful for hot reload or testing.
 */
export function resetEchoInstance() {
  _echoInstance = null;
}

/**
 * Helper export for convenience.
 */
export const EchoAI3 = {
  get instance() {
    if (!_echoInstance) {
      _echoInstance = new EchoAi3Core();
    }
    return _echoInstance;
  },
  attachToModule(moduleName) {
    this.instance.attachToModule(moduleName);
  },
  registerKnowledge(module, key, payload) {
    this.instance.registerKnowledge(module, key, payload);
  },
  async ask(args) {
    return this.instance.ask(args);
  },
  async predict(task, options) {
    return this.instance.predict(task, options);
  },
  async inspect(subject, options) {
    return this.instance.inspect(subject, options);
  },
};

export default EchoAI3;
