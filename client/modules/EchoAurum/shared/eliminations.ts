import type { JournalEventEnvelope } from "./ledger";
export interface LedgerBalanceSummary {
  account: string;
  ledger: "usali" | "gaap";
  balance: number;
}
export interface EliminationCandidate {
  account: string;
  usaliBalance: number;
  gaapBalance: number;
  variance: number;
  material: boolean;
}
export interface EliminationNarrative {
  headline: string;
  summary: string;
  actions: string[];
}
function aggregateBalance(events: JournalEventEnvelope[]) {
  const balances = new Map<string, number>();
  for (const event of events) {
    const debit = balances.get(event.payload.debitAccount) ?? 0;
    balances.set(event.payload.debitAccount, debit + event.payload.amount);
    const credit = balances.get(event.payload.creditAccount) ?? 0;
    balances.set(event.payload.creditAccount, credit - event.payload.amount);
  }
  return balances;
}
export function identifyEliminationCandidates(
  usaliEvents: JournalEventEnvelope[],
  gaapEvents: JournalEventEnvelope[],
  materiality = 1000,
): EliminationCandidate[] {
  const usaliBalances = aggregateBalance(usaliEvents);
  const gaapBalances = aggregateBalance(gaapEvents);
  const accounts = new Set([...usaliBalances.keys(), ...gaapBalances.keys()]);
  return [...accounts].map((account) => {
    const usaliBalance = usaliBalances.get(account) ?? 0;
    const gaapBalance = gaapBalances.get(account) ?? 0;
    const variance = usaliBalance - gaapBalance;
    return {
      account,
      usaliBalance,
      gaapBalance,
      variance,
      material: Math.abs(variance) >= materiality,
    };
  });
}
export function buildEliminationNarrative(
  ledgerId: string,
  candidates: EliminationCandidate[],
): EliminationNarrative {
  const material = candidates.filter((candidate) => candidate.material);
  if (material.length === 0) {
    return {
      headline: "Dual-book alignment clean",
      summary: `Ledger ${ledgerId} shows no material differences between USALI and GAAP views.`,
      actions: ["Proceed with consolidation export"],
    };
  }
  const top = material
    .slice()
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 3);
  const summary = top
    .map(
      (candidate) =>
        `Account ${candidate.account}: USALI ${candidate.usaliBalance.toFixed(0)} vs GAAP ${candidate.gaapBalance.toFixed(0)} variance ${candidate.variance.toFixed(0)}`,
    )
    .join(";");
  return {
    headline: `${material.length} elimination${material.length > 1 ? "s" : ""} required before consolidation`,
    summary,
    actions: top.map(
      (candidate) =>
        `Book elimination for account ${candidate.account} to adjust ${candidate.variance.toFixed(0)} before consolidation`,
    ),
  };
}
