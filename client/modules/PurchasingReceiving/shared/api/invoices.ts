/** * Invoice API Services * Handles invoice CRUD, search, image management, and preference tracking */ const API_URL ="/api"; import type { Invoice, InvoiceLineItem, InvoiceImage, Vendor, GLCode, GLCodeCategory, InvoiceMetrics,
} from "@/shared/types/invoices"; // ============================================================================
// INVOICE CRUD
// ============================================================================ export async function getInvoices( outletId: string, filters?: { vendorId?: string; glCategory?: GLCodeCategory; status?: string; startDate?: string; endDate?: string; },
): Promise<Invoice[]> { const params = new URLSearchParams(); params.append("outlet_id", outletId); if (filters?.vendorId) params.append("vendor_id", filters.vendorId); if (filters?.glCategory) params.append("gl_category", filters.glCategory); if (filters?.status) params.append("status", filters.status); if (filters?.startDate) params.append("start_date", filters.startDate); if (filters?.endDate) params.append("end_date", filters.endDate); const res = await fetch(`${API_URL}/invoices?${params.toString()}`); if (!res.ok) throw new Error("Failed to fetch invoices"); return res.json();
} export async function getInvoiceById(invoiceId: string): Promise<Invoice> { const res = await fetch(`${API_URL}/invoices/${invoiceId}`); if (!res.ok) throw new Error("Failed to fetch invoice"); return res.json();
} export async function createInvoice( invoice: Omit<Invoice,"id" |"created_at" |"updated_at">,
): Promise<Invoice> { const res = await fetch(`${API_URL}/invoices`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(invoice), }); if (!res.ok) throw new Error("Failed to create invoice"); return res.json();
} export async function updateInvoice( invoiceId: string, updates: Partial<Omit<Invoice,"id" |"created_at" |"updated_at">>,
): Promise<Invoice> { const res = await fetch(`${API_URL}/invoices/${invoiceId}`, { method:"PATCH", headers: {"Content-Type":"application/json" }, body: JSON.stringify(updates), }); if (!res.ok) throw new Error("Failed to update invoice"); return res.json();
} export async function deleteInvoice(invoiceId: string): Promise<void> { const res = await fetch(`${API_URL}/invoices/${invoiceId}`, { method:"DELETE", }); if (!res.ok) throw new Error("Failed to delete invoice");
} // ============================================================================
// INVOICE LINE ITEMS
// ============================================================================ export async function getInvoiceLineItems( invoiceId: string,
): Promise<InvoiceLineItem[]> { const res = await fetch(`${API_URL}/invoices/${invoiceId}/items`); if (!res.ok) throw new Error("Failed to fetch line items"); return res.json();
} export async function addInvoiceLineItem( item: Omit<InvoiceLineItem,"id">,
): Promise<InvoiceLineItem> { const res = await fetch(`${API_URL}/invoices/${item.invoice_id}/items`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(item), }); if (!res.ok) throw new Error("Failed to add line item"); return res.json();
} export async function updateInvoiceLineItem( itemId: string, updates: Partial<Omit<InvoiceLineItem,"id" |"invoice_id">>,
): Promise<InvoiceLineItem> { const res = await fetch(`${API_URL}/invoices/items/${itemId}`, { method:"PATCH", headers: {"Content-Type":"application/json" }, body: JSON.stringify(updates), }); if (!res.ok) throw new Error("Failed to update line item"); return res.json();
} // ============================================================================
// INVOICE IMAGES
// ============================================================================ export async function getInvoiceImages( invoiceId: string,
): Promise<InvoiceImage[]> { const res = await fetch(`${API_URL}/invoices/${invoiceId}/images`); if (!res.ok) throw new Error("Failed to fetch invoice images"); return res.json();
} export async function uploadInvoiceImage( invoiceId: string, file: File, pageNumber?: number, notes?: string,
): Promise<InvoiceImage> { const formData = new FormData(); formData.append("file", file); if (pageNumber !== undefined) formData.append("page_number", String(pageNumber)); if (notes) formData.append("notes", notes); const res = await fetch(`${API_URL}/invoices/${invoiceId}/images`, { method:"POST", body: formData, }); if (!res.ok) throw new Error("Failed to upload invoice image"); return res.json();
} export async function deleteInvoiceImage(imageId: string): Promise<void> { const res = await fetch(`${API_URL}/invoices/images/${imageId}`, { method:"DELETE", }); if (!res.ok) throw new Error("Failed to delete invoice image");
} // ============================================================================
// VENDORS
// ============================================================================ export async function getVendors( organizationId: string, active?: boolean,
): Promise<Vendor[]> { const params = new URLSearchParams({ organization_id: organizationId, ...(active !== undefined && { active: String(active) }), }); const res = await fetch(`${API_URL}/vendors?${params}`); if (!res.ok) throw new Error("Failed to fetch vendors"); return res.json();
} export async function getVendorById(vendorId: string): Promise<Vendor> { const res = await fetch(`${API_URL}/vendors/${vendorId}`); if (!res.ok) throw new Error("Failed to fetch vendor"); return res.json();
} export async function createVendor( vendor: Omit<Vendor,"id" |"created_at" |"updated_at">,
): Promise<Vendor> { const res = await fetch(`${API_URL}/vendors`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(vendor), }); if (!res.ok) throw new Error("Failed to create vendor"); return res.json();
} export async function updateVendor( vendorId: string, updates: Partial<Omit<Vendor,"id" |"created_at" |"updated_at">>,
): Promise<Vendor> { const res = await fetch(`${API_URL}/vendors/${vendorId}`, { method:"PATCH", headers: {"Content-Type":"application/json" }, body: JSON.stringify(updates), }); if (!res.ok) throw new Error("Failed to update vendor"); return res.json();
} // ============================================================================
// GL CODES
// ============================================================================ export async function getGLCodes( organizationId: string, category?: GLCodeCategory,
): Promise<GLCode[]> { const params = new URLSearchParams({ organization_id: organizationId, ...(category && { category }), }); const res = await fetch(`${API_URL}/gl-codes?${params}`); if (!res.ok) throw new Error("Failed to fetch GL codes"); return res.json();
} export async function createGLCode( code: Omit<GLCode,"id" |"created_at" |"updated_at">,
): Promise<GLCode> { const res = await fetch(`${API_URL}/gl-codes`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify(code), }); if (!res.ok) throw new Error("Failed to create GL code"); return res.json();
} // ============================================================================
// INVOICE SEARCH & METRICS
// ============================================================================ export async function searchInvoices( outletId: string, query: string, filters?: { vendorId?: string; glCategory?: GLCodeCategory; },
): Promise<Invoice[]> { const res = await fetch(`${API_URL}/invoices/search`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ outlet_id: outletId, query, vendor_id: filters?.vendorId, gl_category: filters?.glCategory, }), }); if (!res.ok) throw new Error("Failed to search invoices"); return res.json();
} export async function getInvoiceMetrics( outletId: string,
): Promise<InvoiceMetrics> { const res = await fetch(`${API_URL}/invoices/${outletId}/metrics`); if (!res.ok) throw new Error("Failed to fetch invoice metrics"); return res.json();
} // ============================================================================
// RECENT SEARCHES
// ============================================================================ export async function saveRecentSearch( userId: string, outletId: string, search: { vendorId?: string; glCategory?: GLCodeCategory; searchTerm?: string; },
): Promise<void> { const res = await fetch(`${API_URL}/invoices/searches/recent`, { method:"POST", headers: {"Content-Type":"application/json" }, body: JSON.stringify({ user_id: userId, outlet_id: outletId, ...search, }), }); if (!res.ok) throw new Error("Failed to save recent search");
} export async function getRecentSearches( userId: string, outletId: string,
): Promise< Array<{ vendorId?: string; glCategory?: GLCodeCategory; searchTerm?: string; timestamp: string; }>
> { const params = new URLSearchParams({ user_id: userId, outlet_id: outletId, }); const res = await fetch(`${API_URL}/invoices/searches/recent?${params}`); if (!res.ok) throw new Error("Failed to fetch recent searches"); return res.json();
}
