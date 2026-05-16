import { describe, expect, it } from "vitest";
import {
  composeBinder,
  createPbcPortalState,
  hasAccess,
  validateChecklist,
  buildDocuSignBundle,
} from "./cpaBridge";
import type { SnapshotEnvelope } from "./snapshots";
const SNAPSHOT: SnapshotEnvelope = {
  id: "snap-1",
  ledgerId: "ledger",
  asOf: "2024-11-05T00:00:00Z",
  eventCount: 2,
  journalHash: "hash",
  previousSnapshotHash: null,
  balances: [],
  hash: "hash",
};
describe("hasAccess", () => {
  it("permits controllers for their properties", () => {
    expect(
      hasAccess(
        { role: "controller", propertyIds: ["luccca-harbor"] },
        { propertyId: "luccca-harbor", requiredRole: "auditor" },
      ),
    ).toBe(true);
  });
  it("blocks mismatched properties", () => {
    expect(
      hasAccess(
        { role: "admin", propertyIds: ["luccca-harbor"] },
        { propertyId: "luccca-mountain", requiredRole: "viewer" },
      ),
    ).toBe(false);
  });
});
describe("composeBinder", () => {
  it("returns archive payload", () => {
    const binder = composeBinder({
      ledgerId: "ledger",
      period: "2024-Q4",
      sections: [
        {
          id: "tb",
          title: "Trial Balance",
          tickMark: "TB",
          documents: [
            { name: "tb.csv", content: "a,b", contentType: "text/csv" },
          ],
        },
      ],
    });
    expect(binder.archive.length).toBeGreaterThan(0);
  });
});
describe("validateChecklist", () => {
  it("detects outstanding items", () => {
    const result = validateChecklist([
      {
        id: "1",
        description: "Tie out cash",
        completed: true,
        evidenceVersion: "v1",
      },
      { id: "2", description: "Upload payroll", completed: false },
    ]);
    expect(result.completed).toBe(false);
    expect(result.outstanding).toHaveLength(1);
  });
});
describe("buildDocuSignBundle", () => {
  it("produces base64 payload referencing snapshot", () => {
    const bundle = buildDocuSignBundle({
      snapshot: SNAPSHOT,
      recipients: [{ email: "auditor@firm.com", name: "Audit Partner" }],
    });
    expect(bundle.pdf.length).toBeGreaterThan(0);
    expect(bundle.metadata.journalHash).toBe("hash");
  });
});
describe("createPbcPortalState", () => {
  it("wraps requests", () => {
    const state = createPbcPortalState([
      {
        id: "REQ-1",
        description: "Bank statements",
        status: "pending",
        documents: [],
      },
    ]);
    expect(state.requests).toHaveLength(1);
  });
});
