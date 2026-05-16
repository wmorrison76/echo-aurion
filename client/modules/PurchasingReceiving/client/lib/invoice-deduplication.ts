/** * Deduplication logic for invoices * Combines multiple uploads of the same invoice into a single queue item */ export interface ApprovalQueueItem {
  id: string;
  invoiceNumber: string;
  vendor: string;
  total: number;
  status: "pending" | "approved" | "rejected";
  confidenceScore: number;
  lineItemCount: number;
  issues: string[];
  createdAt: string;
  lineItems?: any[];
  rawItems?: any[];
  imageUrl?: string;
  invoiceDate?: string;
  dueDate?: string;
  poNumber?: string;
  terms?: string;
  vendorContact?: string;
  orderNumber?: string;
  pageCount?: number;
  documentPages?: Array<{
    pageNumber: number;
    imageUrl: string;
    extractedText: string;
    createdAt: string;
  }>;
  deptCode?: string;
  deptName?: string;
  glCode?: string;
} /** * Create a deduplication key for an invoice * Used to identify if multiple uploads are the same invoice */
export function createInvoiceDedupKey(
  invoiceNumber: string,
  vendor: string,
  invoiceDate?: string,
): string {
  // Normalize the key - extract only the numeric part of invoice number const numberMatch = invoiceNumber?.match(/\d+/); const normalizedNumber = numberMatch ? numberMatch[0] : invoiceNumber?.toLowerCase().replace(/[^a-z0-9]/g,"") ||"unknown"; const normalizedVendor = vendor?.toLowerCase().replace(/[^a-z0-9]/g,"") ||"unknown"; const dateKey = invoiceDate ? new Date(invoiceDate).toISOString().split("T")[0] :"unknown"; const key = `${normalizedVendor}_${normalizedNumber}_${dateKey}`; console.log("Created dedup key:", { original: { invoiceNumber, vendor, invoiceDate }, normalized: { normalizedNumber, normalizedVendor, dateKey }, key, }); return key;
} /** * Detect if a new invoice is a duplicate of an existing one */
export function findDuplicateInvoice(
  newInvoice: ApprovalQueueItem,
  existingQueue: ApprovalQueueItem[],
): ApprovalQueueItem | null {
  const newKey = createInvoiceDedupKey(
    newInvoice.invoiceNumber,
    newInvoice.vendor,
    newInvoice.invoiceDate,
  );
  for (const existing of existingQueue) {
    const existingKey = createInvoiceDedupKey(
      existing.invoiceNumber,
      existing.vendor,
      existing.invoiceDate,
    );
    if (newKey === existingKey) {
      return existing;
    }
  }
  return null;
} /** * Merge a duplicate invoice into an existing one * Adds the new page/document to the existing invoice */
export function mergeDuplicateInvoice(
  existingInvoice: ApprovalQueueItem,
  newInvoice: ApprovalQueueItem,
): ApprovalQueueItem {
  // Initialize documentPages if not present if (!existingInvoice.documentPages) { existingInvoice.documentPages = []; } // Add the new page if (newInvoice.imageUrl) { existingInvoice.documentPages.push({ pageNumber: (existingInvoice.documentPages?.length || 0) + 1, imageUrl: newInvoice.imageUrl, extractedText: newInvoice.rawItems?.map((item: any) => item.rawText).join("\n") ||"", createdAt: newInvoice.createdAt, }); } // Update page count existingInvoice.pageCount = existingInvoice.documentPages.length; // Merge line items if they're different (avoid duplicating) if (newInvoice.rawItems && newInvoice.rawItems.length > 0) { const existingDescriptions = new Set( (existingInvoice.rawItems || []).map((item: any) => item.productName), ); const newUniqueItems = newInvoice.rawItems.filter( (item: any) => !existingDescriptions.has(item.productName), ); if (newUniqueItems.length > 0) { existingInvoice.rawItems = [ ...(existingInvoice.rawItems || []), ...newUniqueItems, ]; existingInvoice.lineItemCount = existingInvoice.rawItems.length; } } // Keep the highest confidence score existingInvoice.confidenceScore = Math.max( existingInvoice.confidenceScore, newInvoice.confidenceScore, ); // Update timestamp to newest if (new Date(newInvoice.createdAt) > new Date(existingInvoice.createdAt)) { existingInvoice.createdAt = newInvoice.createdAt; } return existingInvoice;
} /** * Process approval queue and deduplicate * Returns merged queue and a list of merged invoice IDs */
export function deduplicateQueue(queue: ApprovalQueueItem[]): {
  queue: ApprovalQueueItem[];
  mergedInvoices: Map<string, string>;
} {
  const mergedInvoices = new Map<string, string>(); // newId -> existingId const dedupedQueue: ApprovalQueueItem[] = []; for (const invoice of queue) { const duplicate = findDuplicateInvoice(invoice, dedupedQueue); if (duplicate) { // This is a duplicate - merge it mergeDuplicateInvoice(duplicate, invoice); mergedInvoices.set(invoice.id, duplicate.id); } else { // This is new - add to queue dedupedQueue.push({ ...invoice, documentPages: [ { pageNumber: 1, imageUrl: invoice.imageUrl ||"", extractedText: invoice.rawItems?.map((item: any) => item.rawText).join("\n") ||"", createdAt: invoice.createdAt, }, ], pageCount: 1, }); } } return { queue: dedupedQueue, mergedInvoices };
}
