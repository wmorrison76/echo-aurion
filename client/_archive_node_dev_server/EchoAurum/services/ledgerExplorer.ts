import { financeLedgerContext } from "./financeData";
import { buildLedgerExplorer } from "../../shared/finance";
export function getLedgerExplorer(ledgerId: string) {
  if (ledgerId !== financeLedgerContext.ledgerId) {
    throw new Error(`Ledger ${ledgerId} not found`);
  }
  return buildLedgerExplorer(financeLedgerContext);
}
