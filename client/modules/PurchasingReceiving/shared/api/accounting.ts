/** * Accounting & Accounts Payable API Services * Handles all AP, payment, GL, and P&L operations */ const API_URL ="/api/accounting"; import type { InvoicePayment, PaymentSchedule, PaymentRun, GLAccount, GLEntry, PandLStatement, FinancialMetrics, VendorAnalysis, VendorPaymentTerms, PaginatedResponse, PaginationMeta,
} from "@/shared/types/accounting"; // ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================ export async function createPayment( payment: Omit<InvoicePayment,"id" |"created_at" |"updated_at">,
): Promise<InvoicePayment> { const res = await fetch(`${API_URL}/payments`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(payment), }); if (!res.ok) throw new Error("Failed to create payment"); return res.json();
} export async function getPaymentsByOrganization( organizationId: string, filters?: { vendorId?: string; status?: string; startDate?: string; endDate?: string; limit?: number; offset?: number; },
): Promise<PaginatedResponse<InvoicePayment>> { const params = new URLSearchParams({ organization_id: organizationId, ...(filters?.vendorId && { vendor_id: filters.vendorId }), ...(filters?.status && { status: filters.status }), ...(filters?.startDate && { start_date: filters.startDate }), ...(filters?.endDate && { end_date: filters.endDate }), ...(filters?.limit && { limit: filters.limit.toString() }), ...(filters?.offset && { offset: filters.offset.toString() }), }); const res = await fetch(`${API_URL}/payments?${params}`); if (!res.ok) throw new Error("Failed to fetch payments"); return res.json();
} export async function getPaymentsByInvoice( invoiceId: string,
): Promise<PaginatedResponse<InvoicePayment>> { const res = await fetch(`${API_URL}/payments?invoice_id=${invoiceId}`); if (!res.ok) throw new Error("Failed to fetch invoice payments"); return res.json();
} export async function updatePayment( paymentId: string, updates: Partial<Omit<InvoicePayment,"id" |"created_at" |"updated_at">>,
): Promise<InvoicePayment> { const res = await fetch(`${API_URL}/payments/${paymentId}`, { method:"PATCH", headers: {"Content-Type":"application/json" }, body: JSON.stringify(updates), }); if (!res.ok) throw new Error("Failed to update payment"); return res.json();
} export async function cancelPayment(paymentId: string): Promise<void> { const res = await fetch(`${API_URL}/payments/${paymentId}`, { method:"PATCH", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ status:"cancelled" }), }); if (!res.ok) throw new Error("Failed to cancel payment");
} // ============================================================================
// PAYMENT SCHEDULING & AUTOMATION
// ============================================================================ export async function createPaymentSchedule( schedule: Omit<PaymentSchedule,"id" |"created_at" |"updated_at">,
): Promise<PaymentSchedule> { const res = await fetch(`${API_URL}/payment-schedules`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(schedule), }); if (!res.ok) throw new Error("Failed to create payment schedule"); return res.json();
} export async function getPaymentSchedules( organizationId: string,
): Promise<PaginatedResponse<PaymentSchedule>> { const res = await fetch( `${API_URL}/payment-schedules?organization_id=${organizationId}`, ); if (!res.ok) throw new Error("Failed to fetch payment schedules"); return res.json();
} export async function suggestPayments( organizationId: string, outletId?: string,
): Promise<InvoicePayment[]> { const res = await fetch(`${API_URL}/payments/suggest-run`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ organization_id: organizationId, outlet_id: outletId, }), }); if (!res.ok) throw new Error("Failed to get payment suggestions"); return res.json();
} export async function runPaymentBatch( organizationId: string, paymentIds: string[],
): Promise<PaymentRun> { const res = await fetch(`${API_URL}/payments/batch`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ organization_id: organizationId, payment_ids: paymentIds, }), }); if (!res.ok) throw new Error("Failed to run payment batch"); return res.json();
} // ============================================================================
// VENDOR PAYMENT TERMS
// ============================================================================ export async function setVendorPaymentTerms( terms: Omit<VendorPaymentTerms,"id" |"created_at" |"updated_at">,
): Promise<VendorPaymentTerms> { const res = await fetch(`${API_URL}/vendor-payment-terms`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(terms), }); if (!res.ok) throw new Error("Failed to set vendor payment terms"); return res.json();
} export async function getVendorPaymentTerms( vendorId: string,
): Promise<VendorPaymentTerms | null> { const res = await fetch(`${API_URL}/vendor-payment-terms/${vendorId}`); if (res.status === 404) return null; if (!res.ok) throw new Error("Failed to fetch vendor payment terms"); return res.json();
} // ============================================================================
// GENERAL LEDGER
// ============================================================================ export async function getGLAccounts( organizationId: string, type?: string,
): Promise<GLAccount[]> { const params = new URLSearchParams({ organization_id: organizationId, ...(type && { type }), }); const res = await fetch(`${API_URL}/gl-accounts?${params}`); if (!res.ok) throw new Error("Failed to fetch GL accounts"); return res.json();
} export async function createGLEntry( entry: Omit<GLEntry,"id" |"created_at">,
): Promise<GLEntry> { const res = await fetch(`${API_URL}/gl-entries`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(entry), }); if (!res.ok) throw new Error("Failed to create GL entry"); return res.json();
} export async function getGLTrialBalance( organizationId: string, asOfDate?: string,
): Promise<any> { const params = new URLSearchParams({ organization_id: organizationId, ...(asOfDate && { as_of_date: asOfDate }), }); const res = await fetch(`${API_URL}/gl-accounts/trial-balance?${params}`); if (!res.ok) throw new Error("Failed to fetch trial balance"); return res.json();
} // ============================================================================
// P&L REPORTING
// ============================================================================ export async function generatePandLStatement( organizationId: string, periodStart: string, periodEnd: string, outletId?: string,
): Promise<PandLStatement> { const params = new URLSearchParams({ organization_id: organizationId, period_start: periodStart, period_end: periodEnd, ...(outletId && { outlet_id: outletId }), }); const res = await fetch(`${API_URL}/reporting/pandl?${params}`); if (!res.ok) throw new Error("Failed to generate P&L statement"); return res.json();
} export async function getFinancialMetrics( organizationId: string, outletId?: string, period?: string,
): Promise<FinancialMetrics> { const params = new URLSearchParams({ organization_id: organizationId, ...(outletId && { outlet_id: outletId }), ...(period && { period }), }); const res = await fetch(`${API_URL}/reporting/metrics?${params}`); if (!res.ok) throw new Error("Failed to fetch financial metrics"); return res.json();
} // ============================================================================
// VENDOR ANALYSIS
// ============================================================================ export async function getVendorAnalysis( vendorId: string, organizationId: string,
): Promise<VendorAnalysis> { const params = new URLSearchParams({ vendor_id: vendorId, organization_id: organizationId, }); const res = await fetch(`${API_URL}/vendors/analysis?${params}`); if (!res.ok) throw new Error("Failed to fetch vendor analysis"); return res.json();
} export async function getTopVendors( organizationId: string, outletId?: string, limit = 10,
): Promise<PaginatedResponse<VendorAnalysis>> { const params = new URLSearchParams({ organization_id: organizationId, limit: String(limit), ...(outletId && { outlet_id: outletId }), }); const res = await fetch(`${API_URL}/vendors/top?${params}`); if (!res.ok) throw new Error("Failed to fetch top vendors"); return res.json();
} // ============================================================================
// DASHBOARD & REAL-TIME DATA
// ============================================================================ export async function getAPDashboard( organizationId: string, outletId?: string,
): Promise<{ due_soon: InvoicePayment[]; overdue: InvoicePayment[]; early_pay_opportunities: InvoicePayment[]; total_payables: number; cash_available: number; early_discount_opportunities: number;
}> { const params = new URLSearchParams({ organization_id: organizationId, ...(outletId && { outlet_id: outletId }), }); const res = await fetch(`${API_URL}/ap/dashboard?${params}`); if (!res.ok) throw new Error("Failed to fetch AP dashboard"); return res.json();
} // Poll for real-time updates (optional WebSocket replacement)
export async function getPaymentStatusUpdates( organizationId: string, since?: string,
): Promise<InvoicePayment[]> { const params = new URLSearchParams({ organization_id: organizationId, ...(since && { since }), }); const res = await fetch(`${API_URL}/payments/updates?${params}`); if (!res.ok) throw new Error("Failed to fetch payment updates"); return res.json();
}
