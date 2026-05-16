export type UsaliEdition = "11th";
export type UsaliStatement = "income" | "balance";
export type UsaliNaturalSign = "debit" | "credit";
export interface UsaliSegment {
  /** High level USALI department (e.g. Rooms, Food & Beverage) */ department: string;
  /** Schedule reference from the USALI handbook */ schedule: string;
  /** Human readable line item */ lineItem: string;
}
export interface UsaliAccountMapping {
  /** Internal ledger identifier used inside EchoLedger² */ ledgerAccount: string;
  /** Friendly name for analytics and reporting */ ledgerName: string;
  /** Primary financial statement the balance feeds */ statement: UsaliStatement;
  /** Whether balances are expected to be debit or credit in nature */ naturalSign: UsaliNaturalSign;
  /** USALI mapping metadata */ segment: UsaliSegment;
  /** Optional cross reference to legacy COA or ERP codes */ legacyCodes?: string[];
}
const USALI_EDITION: UsaliEdition = "11th";
const BASE_MAPPINGS: readonly UsaliAccountMapping[] = [
  {
    ledgerAccount: "1000",
    ledgerName: "Cash on Hand",
    statement: "balance",
    naturalSign: "debit",
    segment: {
      department: "Reporting",
      schedule: "Balance Sheet",
      lineItem: "Cash and Cash Equivalents",
    },
    legacyCodes: ["1010", "1001"],
  },
  {
    ledgerAccount: "1200",
    ledgerName: "Accounts Receivable",
    statement: "balance",
    naturalSign: "debit",
    segment: {
      department: "Reporting",
      schedule: "Balance Sheet",
      lineItem: "Accounts Receivable",
    },
    legacyCodes: ["1100"],
  },
  {
    ledgerAccount: "2000",
    ledgerName: "Accounts Payable",
    statement: "balance",
    naturalSign: "credit",
    segment: {
      department: "Reporting",
      schedule: "Balance Sheet",
      lineItem: "Accounts Payable",
    },
    legacyCodes: ["2001"],
  },
  {
    ledgerAccount: "4000",
    ledgerName: "Rooms Revenue",
    statement: "income",
    naturalSign: "credit",
    segment: {
      department: "Rooms",
      schedule: "Schedule 2",
      lineItem: "Rooms Revenue",
    },
    legacyCodes: ["4001", "4010"],
  },
  {
    ledgerAccount: "4100",
    ledgerName: "Rooms Allowances",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Rooms",
      schedule: "Schedule 2",
      lineItem: "Allowances",
    },
    legacyCodes: ["4101"],
  },
  {
    ledgerAccount: "4200",
    ledgerName: "Food Revenue",
    statement: "income",
    naturalSign: "credit",
    segment: {
      department: "Food & Beverage",
      schedule: "Schedule 3",
      lineItem: "Food Revenue",
    },
    legacyCodes: ["4201", "4210"],
  },
  {
    ledgerAccount: "4300",
    ledgerName: "Beverage Revenue",
    statement: "income",
    naturalSign: "credit",
    segment: {
      department: "Food & Beverage",
      schedule: "Schedule 4",
      lineItem: "Beverage Revenue",
    },
    legacyCodes: ["4301"],
  },
  {
    ledgerAccount: "5100",
    ledgerName: "Rooms Payroll",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Rooms",
      schedule: "Schedule 2",
      lineItem: "Payroll & Related Expenses",
    },
    legacyCodes: ["5101"],
  },
  {
    ledgerAccount: "5200",
    ledgerName: "Food Cost",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Food & Beverage",
      schedule: "Schedule 3",
      lineItem: "Cost of Food Sales",
    },
    legacyCodes: ["5201"],
  },
  {
    ledgerAccount: "5210",
    ledgerName: "Beverage Cost",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Food & Beverage",
      schedule: "Schedule 4",
      lineItem: "Cost of Beverage Sales",
    },
    legacyCodes: ["5211"],
  },
  {
    ledgerAccount: "6000",
    ledgerName: "Administrative & General",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Undistributed",
      schedule: "Schedule 8",
      lineItem: "Administrative and General",
    },
    legacyCodes: ["6001"],
  },
  {
    ledgerAccount: "6100",
    ledgerName: "Sales & Marketing",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Undistributed",
      schedule: "Schedule 9",
      lineItem: "Sales and Marketing",
    },
    legacyCodes: ["6101"],
  },
  {
    ledgerAccount: "6200",
    ledgerName: "Utilities",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Undistributed",
      schedule: "Schedule 10",
      lineItem: "Property Operation and Maintenance",
    },
    legacyCodes: ["6201"],
  },
  {
    ledgerAccount: "7000",
    ledgerName: "Management Fees",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Fixed Charges",
      schedule: "Schedule 12",
      lineItem: "Management Fees",
    },
    legacyCodes: ["7005"],
  },
  {
    ledgerAccount: "7200",
    ledgerName: "Property Taxes",
    statement: "income",
    naturalSign: "debit",
    segment: {
      department: "Fixed Charges",
      schedule: "Schedule 12",
      lineItem: "Property Taxes",
    },
    legacyCodes: ["7201"],
  },
];
const LOOKUP: ReadonlyMap<string, UsaliAccountMapping> = new Map(
  BASE_MAPPINGS.map((mapping) => [mapping.ledgerAccount, mapping]),
);
export interface LedgerAccountReference {
  account: string;
  alias?: string;
}
export function normalizeAccountCode(account: string) {
  return account.replace(/[^0-9A-Z]/gi, "").toUpperCase();
}
export function getUsaliMapping(account: string) {
  const key = normalizeAccountCode(account);
  return LOOKUP.get(key);
} /** * Convenience helper for mapping an internal ledger account to the USALI model. * * @example * const result = mapLedgerAccount({ account:"4000", alias:"RoomsRev" }); * // result?.segment.lineItem ==="Rooms Revenue" */
export function mapLedgerAccount(reference: LedgerAccountReference) {
  const mapping = getUsaliMapping(reference.account);
  if (!mapping) {
    return null;
  }
  return {
    edition: USALI_EDITION,
    ledgerAccount: mapping.ledgerAccount,
    ledgerName: mapping.ledgerName,
    statement: mapping.statement,
    naturalSign: mapping.naturalSign,
    segment: mapping.segment,
    legacyCodes: mapping.legacyCodes,
    alias: reference.alias,
  };
}
export const usaliMappings = BASE_MAPPINGS;
