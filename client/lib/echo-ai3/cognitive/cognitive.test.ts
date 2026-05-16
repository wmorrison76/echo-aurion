/**
 * EchoAi³ Cognitive Layer — unit tests
 * No server required; uses trace-ledger-client (local/store) and guardrails.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  observeFromTrace,
  toExecutiveSegments,
  toExecutiveNarrative,
  confidenceFromPayload,
  remember,
  recall,
  rememberFromPerception,
} from "./index";
import { orchestrate } from "./orchestration";
import type { TraceLedgerEntry } from "@shared/types/trace-ledger";

describe("cognitive perception", () => {
  it("observeFromTrace returns PerceptionSlice with entries and scope", () => {
    const slice = observeFromTrace("demo-org", { limit: 5 });
    expect(slice).toHaveProperty("entries");
    expect(slice).toHaveProperty("observedAt");
    expect(slice).toHaveProperty("scope");
    expect(Array.isArray(slice.entries)).toBe(true);
    expect(typeof slice.observedAt).toBe("string");
  });

  it("observeFromTrace with entityType filters by type", () => {
    const slice = observeFromTrace("demo-org", { entityType: "panel", limit: 10 });
    expect(slice.scope.entityType).toBe("panel");
  });
});

describe("cognitive narrative", () => {
  it("toExecutiveSegments maps entries to segments", () => {
    const entries: TraceLedgerEntry[] = [
      {
        id: "e1",
        orgId: "org1",
        entityType: "test",
        entityId: "id1",
        sourceRef: null,
        payload: { sourcePanel: "dock", summary: "Test summary" },
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const segments = toExecutiveSegments(entries);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      timestamp: "2026-01-01T00:00:00.000Z",
      source: "dock",
      summary: "Test summary",
      traceId: "e1",
    });
  });

  it("toExecutiveNarrative returns string", () => {
    const segments = [
      { timestamp: "2026-01-01T00:00:00.000Z", source: "a", summary: "b", traceId: "t1" },
    ];
    const out = toExecutiveNarrative(segments, 5);
    expect(typeof out).toBe("string");
    expect(out).toContain("a");
    expect(out).toContain("b");
  });
});

describe("cognitive memory", () => {
  beforeEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem("echo-ai3-cognitive-memory");
    }
  });

  it("confidenceFromPayload uses payload.confidence when present", () => {
    expect(confidenceFromPayload({ confidence: 0.8 }, 0)).toBe(0.8);
  });

  it("confidenceFromPayload derives from evidence count when no confidence", () => {
    const c = confidenceFromPayload({}, 5);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1);
  });

  it("remember and recall store/retrieve by entityType", () => {
    const entry: TraceLedgerEntry = {
      id: "trace-1",
      orgId: "org1",
      entityType: "test",
      entityId: "id1",
      sourceRef: "ref1",
      payload: {},
      createdAt: new Date().toISOString(),
    };
    remember(entry, 0.9);
    const out = recall({ entityType: "test" });
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].traceId).toBe("trace-1");
    expect(out[0].confidence).toBe(0.9);
  });

  it("rememberFromPerception stores entries", () => {
    const entries: TraceLedgerEntry[] = [
      {
        id: "p1",
        orgId: "o1",
        entityType: "p",
        entityId: "i1",
        sourceRef: null,
        payload: {},
        createdAt: new Date().toISOString(),
      },
    ];
    rememberFromPerception(entries);
    const out = recall({ entityType: "p" });
    expect(out.length).toBeGreaterThanOrEqual(1);
  });
});

describe("cognitive orchestration", () => {
  it("orchestrate with open-panel and invalid key returns not ok", () => {
    const result = orchestrate({ action: "open-panel", panelKey: "nonexistent-panel-key-xyz" });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("registry");
  });

  it("orchestrate close-all returns ok (guardrail-safe)", () => {
    const result = orchestrate({ action: "close-all" }, { emitTrace: false });
    expect(result.ok).toBe(true);
    expect(result.reason).toContain("Executed");
  });

  it("orchestrate stack-grid returns ok", () => {
    const result = orchestrate({ action: "stack-grid" }, { emitTrace: false });
    expect(result.ok).toBe(true);
  });
});
