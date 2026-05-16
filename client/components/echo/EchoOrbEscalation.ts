type EscalationPayload = {
  message: string;
  context?: Record<string, any>;
  suggestedFiles?: string[];
};

export function escalateToEchoCoder(payload: EscalationPayload) {
  // 1. Store escalation context (safe, ephemeral)
  sessionStorage.setItem(
    "__echocoder_context__",
    JSON.stringify({
      ...payload,
      timestamp: Date.now(),
    })
  );

  // 2. Request EchoCoder panel open
  window.dispatchEvent(
    new CustomEvent("open-panel", {
      detail: { id: "echocoder" },
    })
  );

  // 3. Notify EchoCoder panel
  window.dispatchEvent(
    new CustomEvent("echocoder:escalate", {
      detail: payload,
    })
  );
}

