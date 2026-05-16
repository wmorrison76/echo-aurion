import { describe, expect, it } from "vitest";
import type { OpsEvent } from "../types/ops-gantt";
import { instantiateTemplate } from "./templates";

const baseEvent: OpsEvent = {
  eventId: "e-1",
  beoNumber: "BEO-001",
  eventName: "Corporate Gala",
  clientName: "Acme Co",
  property: "Hotel One",
  space: "Ballroom A",
  eventType: "conference",
  startDateTime: "2026-01-21T18:00:00.000Z",
  endDateTime: "2026-01-21T22:00:00.000Z",
  setupStart: "2026-01-21T16:00:00.000Z",
  strikeEnd: "2026-01-21T23:00:00.000Z",
  guestCountGuaranteed: 200,
  guestCountExpected: 250,
  serviceStyle: "buffet",
  status: "definite",
  financialStatus: "deposit_paid",
  priority: "P1",
  lastBEORevision: 3,
  revisionHistory: [],
  owners: {},
};

describe("instantiateTemplate", () => {
  it("excludes production scope tasks when disabled", () => {
    const out = instantiateTemplate({ event: baseEvent, includeProductionScope: false });
    expect(out.tasks.length).toBeGreaterThan(5);
    expect(out.tasks.every((t) => t.scope === "beo")).toBe(true);
  });

  it("includes production scope tasks when enabled", () => {
    const out = instantiateTemplate({ event: baseEvent, includeProductionScope: true });
    expect(out.tasks.some((t) => t.scope === "production")).toBe(true);
    expect(out.tasks.some((t) => t.scope === "beo")).toBe(true);
  });
});

