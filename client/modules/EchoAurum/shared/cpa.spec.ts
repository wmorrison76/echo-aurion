import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { generateTrialBalanceExport, assembleWorkpaperBundle } from "./cpa";
const EVENTS = [
  {
    id: "1",
    ledgerId: "ledger-cpa",
    sequence: 1,
    payload: {
      debitAccount: "1000",
      creditAccount: "2000",
      amount: 500,
      currency: "USD",
      serviceDate: "2024-11-05",
    },
    source: { type: "manual", submittedBy: "controller@luccca.cloud" },
    recordedAt: "2024-11-05T12:00:00Z",
    hash: "hash1",
    previousHash: null,
  },
  {
    id: "2",
    ledgerId: "ledger-cpa",
    sequence: 2,
    payload: {
      debitAccount: "1200",
      creditAccount: "4000",
      amount: 350,
      currency: "USD",
      serviceDate: "2024-11-05",
    },
    source: { type: "manual", submittedBy: "controller@luccca.cloud" },
    recordedAt: "2024-11-05T12:05:00Z",
    hash: "hash2",
    previousHash: "hash1",
  },
] as const;
describe("generateTrialBalanceExport", () => {
  it("produces CSV with debit/credit balances", () => {
    const exportResult = generateTrialBalanceExport([...EVENTS]);
    expect(exportResult.rows).toHaveLength(4);
    expect(exportResult.csv).toContain("Account,Description,Debit,Credit,Net");
    expect(exportResult.csv).toContain("1000,,500.00,0.00,500.00");
    expect(exportResult.csv).toContain("2000,,0.00,500.00,-500.00");
  });
});
describe("assembleWorkpaperBundle", () => {
  it("encodes documents and archive payload", () => {
    const bundle = assembleWorkpaperBundle({
      ledgerId: "ledger-cpa",
      period: "2024-11",
      preparedBy: "cfo@luccca.cloud",
      documents: [
        {
          name: "tie-out.txt",
          contentType: "text/plain",
          content: "Trial balance tie-out",
        },
      ],
    });
    expect(bundle.documents[0].data).toBe(
      Buffer.from("Trial balance tie-out", "utf-8").toString("base64"),
    );
    const decoded = JSON.parse(
      Buffer.from(bundle.archive, "base64").toString("utf-8"),
    );
    expect(decoded.ledgerId).toBe("ledger-cpa");
    expect(decoded.documents).toHaveLength(1);
  });
});
