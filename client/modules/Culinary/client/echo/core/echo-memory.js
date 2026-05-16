/**
 * EchoAi³ Memory Store
 * --------------------
 * In-memory store with simple namespacing. Can be replaced by
 * a real backend (Supabase, Redis, etc.) without touching callers.
 */

export function createMemoryStore(options = {}) {
  const context = {
    module: options.module || "UnknownModule",
  };

  /** @type {Array<{module:string,prompt:string,response:string,timestamp:string}>} */
  const conversation = [];

  return {
    setContext(next) {
      Object.assign(context, next || {});
    },
    getContext() {
      return { ...context };
    },
    appendConversation(entry) {
      conversation.push({ ...entry });
      // Optionally: trim to last N entries
      if (conversation.length > 2000) {
        conversation.splice(0, conversation.length - 2000);
      }
    },
    getConversation(limit = 50) {
      return conversation.slice(-limit);
    },
    clearConversation() {
      conversation.length = 0;
    },
  };
}
