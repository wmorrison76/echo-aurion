/**
 * POS to GL Integration Service
 * Connects POS transactions to EchoAurum GL posting
 */

import { logger } from "../lib/logger";

export interface POSTransaction {
  id: string;
  organizationId: string;
  outletId: string;
  total: number;
  tax: number;
  tip: number;
  transactionDate: Date;
  paymentMethod: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface GLEntry {
  accountCode: string;
  debit?: number;
  credit?: number;
  description: string;
  costCenter?: string;
  department?: string;
}

/**
 * Convert POS transaction to GL entries
 */
export function convertPOSToGLEntries(transaction: POSTransaction): GLEntry[] {
  const entries: GLEntry[] = [];
  
  // Revenue entry (credit)
  entries.push({
    accountCode: "4000", // Revenue account (adjust based on chart of accounts)
    credit: transaction.total - transaction.tax - transaction.tip,
    description: `POS Revenue - ${transaction.paymentMethod}`,
    costCenter: transaction.outletId,
  });
  
  // Tax entry (credit)
  if (transaction.tax > 0) {
    entries.push({
      accountCode: "2400", // Sales Tax Payable
      credit: transaction.tax,
      description: `Sales Tax - ${transaction.paymentMethod}`,
      costCenter: transaction.outletId,
    });
  }
  
  // Tips entry (credit)
  if (transaction.tip > 0) {
    entries.push({
      accountCode: "4100", // Tips Revenue
      credit: transaction.tip,
      description: `Tips - ${transaction.paymentMethod}`,
      costCenter: transaction.outletId,
    });
  }
  
  // Payment method debit (Cash, Credit Card, etc.)
  const paymentAccountCode = getPaymentAccountCode(transaction.paymentMethod);
  entries.push({
    accountCode: paymentAccountCode,
    debit: transaction.total,
    description: `POS Payment - ${transaction.paymentMethod}`,
    costCenter: transaction.outletId,
  });
  
  return entries;
}

/**
 * Get GL account code for payment method
 */
function getPaymentAccountCode(paymentMethod: string): string {
  const method = paymentMethod.toLowerCase();
  
  if (method.includes("cash")) return "1000"; // Cash account
  if (method.includes("credit") || method.includes("card")) return "1100"; // Credit Card Clearing
  if (method.includes("debit")) return "1101"; // Debit Card Clearing
  if (method.includes("check")) return "1001"; // Check account
  if (method.includes("gift")) return "1002"; // Gift Card Clearing
  
  return "1100"; // Default to credit card clearing
}

/**
 * Post POS transaction to GL
 */
export async function postPOSTransactionToGL(
  transaction: POSTransaction
): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  try {
    const entries = convertPOSToGLEntries(transaction);
    
    // Call EchoAurum GL posting API
    const apiUrl = process.env.API_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${apiUrl}/api/aurum/gl/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entries,
        organizationId: transaction.organizationId,
        source: "pos",
        sourceReference: transaction.id,
        transactionDate: transaction.transactionDate.toISOString(),
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GL posting failed: ${error}`);
    }
    
    const result = await response.json();
    logger.info("POS transaction posted to GL", {
      transactionId: transaction.id,
      journalEntryId: result.id,
    });
    
    return {
      success: true,
      journalEntryId: result.id,
    };
  } catch (error) {
    logger.error("Failed to post POS transaction to GL", {
      error,
      transactionId: transaction.id,
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
