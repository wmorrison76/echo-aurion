/**
 * EchoAi³ Resilience Suite
 * ------------------------
 * Lightweight instrumentation helpers so you can plug into real
 * logging / monitoring later.
 */

const events = [];

export function recordEchoEvent(type, payload = {}) {
  const evt = {
    type,
    payload,
    at: new Date().toISOString(),
  };
  events.push(evt);
  if (events.length > 5000) {
    events.splice(0, events.length - 5000);
  }
}

export function getRecentEvents(limit = 100) {
  return events.slice(-limit);
}

/**
 * R&D-specific: Record experiment events for audit trail
 */
export function recordExperimentEvent(experimentId, eventType, details = {}) {
  recordEchoEvent("experiment", {
    experimentId,
    eventType, // started, modified, completed, cancelled
    details,
  });
}

/**
 * R&D-specific: Get experiment history
 */
export function getExperimentHistory(experimentId) {
  return getRecentEvents(500).filter((evt) => evt.payload.experimentId === experimentId);
}

/**
 * R&D-specific: Record AI reasoning for transparency
 */
export function recordAIReasoning(module, reasoning, conclusion) {
  recordEchoEvent("ai-reasoning", {
    module,
    reasoning,
    conclusion,
    confidence: conclusion.confidence || 0,
  });
}

/**
 * Health check: Get event summary
 */
export function getEventSummary(hours = 1) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recent = events.filter((evt) => new Date(evt.at) > since);

  return {
    period: `${hours} hour(s)`,
    totalEvents: recent.length,
    byType: recent.reduce((acc, evt) => {
      acc[evt.type] = (acc[evt.type] || 0) + 1;
      return acc;
    }, {}),
    latestEvent: recent[recent.length - 1] || null,
  };
}
