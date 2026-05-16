/**
 * Financial domain types
 * GL accounts, transactions, budgets, financial reporting
 */
import {
  StandardEntity,
  Nameable,
  UUID,
  Money,
  ISODate,
  Percentage
} from './base';

/**
 * General Ledger account
 */
export interface GLAccount extends StandardEntity, Nameable {
  // Account identification
  accountNumber: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  accountSubType?: string;

  // Classification
  category: string;
  subcategory?: string;

  // Parent account (for account hierarchy)
  parentAccountId?: UUID;

  // Balance
  normalBalance: 'debit' | 'credit';
  currentBalance: Money;

  // Status
  isActive: boolean;
  isSystemAccount: boolean; // Cannot be deleted

  // Reporting
  financialStatementSection?: string;
  sortOrder?: number;
}

/**
 * Journal entry
 */
export interface JournalEntry extends StandardEntity {
  // Entry details
  entryNumber: string;
  entryDate: ISODate;
  postingDate: ISODate;

  // Type
  entryType: 'standard' | 'adjusting' | 'closing' | 'reversing';
  source: 'manual' | 'automated' | 'import';

  // Reference
  referenceType?: string; // "invoice", "payment", "payroll"
  referenceId?: UUID;

  // Description
  description: string;
  memo?: string;

  // Status
  status: 'draft' | 'posted' | 'reversed';
  postedBy?: UUID;
  postedAt?: ISODate;

  // Reversal
  reversedBy?: UUID;
  reversedAt?: ISODate;
  reversalJournalEntryId?: UUID;

  // Approval
  requiresApproval: boolean;
  approvedBy?: UUID;
  approvedAt?: ISODate;
}

/**
 * Journal entry line (debit or credit)
 */
export interface JournalEntryLine extends StandardEntity {
  journalEntryId: UUID;
  glAccountId: UUID;

  // Amount
  amount: Money;
  type: 'debit' | 'credit';

  // Line details
  lineNumber: number;
  description?: string;

  // Dimensions (for segmented reporting)
  locationId?: UUID;
  departmentId?: UUID;
  projectId?: UUID;
  customDimension1?: string;
  customDimension2?: string;
}

/**
 * Budget
 */
export interface Budget extends StandardEntity, Nameable {
  // Period
  fiscalYear: number;
  budgetPeriod: 'annual' | 'quarterly' | 'monthly';
  startDate: ISODate;
  endDate: ISODate;

  // Scope
  locationId?: UUID;
  departmentId?: UUID;

  // Status
  status: 'draft' | 'submitted' | 'approved' | 'active' | 'closed';

  // Approval
  submittedBy?: UUID;
  submittedAt?: ISODate;
  approvedBy?: UUID;
  approvedAt?: ISODate;

  // Versioning
  version: number;
  previousVersionId?: UUID;
}

/**
 * Budget line item
 */
export interface BudgetLine extends StandardEntity {
  budgetId: UUID;
  glAccountId: UUID;

  // Budgeted amount
  budgetedAmount: Money;

  // Period breakdown (if monthly budget)
  monthlyAmounts?: Money[];

  // Actual vs budget
  actualAmount?: Money;
  variance?: Money;
  variancePercentage?: Percentage;

  // Notes
  notes?: string;
}

/**
 * Financial transaction
 */
export interface Transaction extends StandardEntity {
  // Transaction details
  transactionNumber: string;
  transactionDate: ISODate;
  transactionType: 'sale' | 'refund' | 'payment' | 'receipt' | 'transfer' | 'adjustment';

  // Parties
  customerId?: UUID;
  vendorId?: UUID;

  // Amount
  amount: Money;
  currency: string; // "USD", "EUR", etc.

  // Payment
  paymentMethod?: 'cash' | 'check' | 'credit_card' | 'ach' | 'wire';
  paymentReference?: string;

  // GL impact
  journalEntryId?: UUID;

  // Reconciliation
  isReconciled: boolean;
  reconciledAt?: ISODate;
  reconciledBy?: UUID;

  // Status
  status: 'pending' | 'posted' | 'voided' | 'reversed';
  voidedAt?: ISODate;
  voidReason?: string;
}

/**
 * Bank account
 */
export interface BankAccount extends StandardEntity, Nameable {
  // Bank details
  bankName: string;
  accountNumber: string; // Last 4 digits only
  routingNumber?: string;
  accountType: 'checking' | 'savings' | 'credit_card' | 'line_of_credit';

  // GL link
  glAccountId: UUID;

  // Balance
  currentBalance: Money;
  availableBalance?: Money;

  // Reconciliation
  lastReconciledDate?: ISODate;
  lastReconciledBalance?: Money;

  // Status
  isActive: boolean;
}

/**
 * Bank transaction
 */
export interface BankTransaction extends StandardEntity {
  bankAccountId: UUID;

  // Transaction details
  transactionDate: ISODate;
  description: string;
  amount: Money;
  transactionType: 'debit' | 'credit';

  // Reference
  checkNumber?: string;
  referenceNumber?: string;

  // Categorization
  glAccountId?: UUID;
  categoryId?: UUID;

  // Reconciliation
  isReconciled: boolean;
  reconciledAt?: ISODate;

  // Matching
  matchedTransactionId?: UUID;
  isMatched: boolean;
}

/**
 * Bank reconciliation
 */
export interface BankReconciliation extends StandardEntity {
  bankAccountId: UUID;

  // Period
  periodStart: ISODate;
  periodEnd: ISODate;

  // Balances
  beginningBalance: Money;
  endingBalance: Money;
  statementBalance: Money;

  // Reconciled items
  reconciledDebits: Money;
  reconciledCredits: Money;

  // Unreconciled
  unreconciledItems: number;
  unreconciledAmount: Money;

  // Status
  status: 'in_progress' | 'balanced' | 'unbalanced' | 'completed';
  reconciledBy?: UUID;
  reconciledAt?: ISODate;

  // Variance
  variance: Money;
  varianceReason?: string;
}

/**
 * Financial report definition
 */
export interface FinancialReport extends StandardEntity, Nameable {
  reportType: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'trial_balance' | 'custom';

  // Report structure
  sections: {
    sectionName: string;
    accountIds: UUID[];
    calculation?: string; // "sum", "subtotal", "percentage"
    sortOrder: number;
  }[];

  // Filters
  defaultFilters?: {
    dateRange?: { start: ISODate; end: ISODate };
    locationIds?: UUID[];
    departmentIds?: UUID[];
  };

  // Sharing
  isPublic: boolean;
  sharedWith?: UUID[];

  // Usage
  lastRunAt?: ISODate;
  runCount: number;
}

/**
 * Tax configuration
 */
export interface TaxConfig extends StandardEntity {
  taxName: string;
  taxType: 'sales_tax' | 'vat' | 'service_charge' | 'other';

  // Rate
  taxRate: Percentage;

  // Applicability
  locationIds?: UUID[];
  productCategories?: string[];

  // GL
  taxGLAccountId: UUID;

  // Effective period
  effectiveDate: ISODate;
  expirationDate?: ISODate;
  isActive: boolean;
}
