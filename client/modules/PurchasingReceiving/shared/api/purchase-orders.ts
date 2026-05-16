/** * Purchase Orders API Service * Handles PO creation, approval workflow, group purchasing, 3-way matching */ import {
  supabase,
  executeQuery,
  getUserOrganization,
} from "@/lib/supabaseClient";
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  POApprovalWorkflow,
} from "@/types/purchasing"; /** * Get purchase orders with filters */
export async function getPurchaseOrders(filters?: {
  outlet_id?: string;
  vendor_id?: string;
  status?: string;
  three_way_match_status?: string;
  is_group_po?: boolean;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}) {
  const orgId = await getUserOrganization();
  let query = supabase
    .from("purchase_orders")
    .select(
      ` *, vendors ( id, name, supplier_type ), outlets ( id, name, short_code ), purchase_order_lines (count) `,
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (filters?.outlet_id) {
    query = query.eq("outlet_id", filters.outlet_id);
  }
  if (filters?.vendor_id) {
    query = query.eq("vendor_id", filters.vendor_id);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.three_way_match_status) {
    query = query.eq("three_way_match_status", filters.three_way_match_status);
  }
  if (filters?.is_group_po !== undefined) {
    query = query.eq("is_group_po", filters.is_group_po);
  }
  if (filters?.from_date) {
    query = query.gte("created_at", filters.from_date);
  }
  if (filters?.to_date) {
    query = query.lte("created_at", filters.to_date);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 20) - 1,
    );
  }
  return executeQuery(query);
} /** * Get a single PO with all details */
export async function getPurchaseOrder(poId: string) {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("purchase_orders")
      .select(
        ` *, vendors ( id, name, supplier_type, lead_time_days ), outlets ( id, name, short_code, address, phone, contact_email ), outlet_groups ( id, name, geography_region ), purchase_order_lines ( *, items ( id, name, sku, uom ) ), supplier_contracts ( id, contract_number, start_date, end_date ), po_approval_workflow ( * ) `,
      )
      .eq("organization_id", orgId)
      .eq("id", poId)
      .single(),
  );
} /** * Create a new purchase order */
export async function createPurchaseOrder(
  po: Omit<PurchaseOrder, "id" | "created_at" | "updated_at" | "created_by"> & {
    lines: Array<Omit<PurchaseOrderLine, "id" | "po_id">>;
  },
) {
  const orgId = await getUserOrganization();
  const user = await getAuthenticatedUser(); // Start a transaction-like operation const { data: newPO, error: poError } = await supabase .from('purchase_orders') .insert({ ...po, organization_id: orgId, created_by: user.id, }) .select() .single(); if (poError) throw new Error(`Failed to create PO: ${poError.message}`); // Insert line items const lines = po.lines.map((line) => ({ ...line, po_id: newPO.id, })); const { error: linesError } = await supabase .from('purchase_order_lines') .insert(lines); if (linesError) { // Delete the PO if lines failed await supabase.from('purchase_orders').delete().eq('id', newPO.id); throw new Error(`Failed to add PO lines: ${linesError.message}`); } return getPurchaseOrder(newPO.id);
} /** * Create a group PO (for multiple outlets) */
export async function createGroupPurchaseOrder(
  po: Omit<PurchaseOrder, "id" | "created_at" | "updated_at" | "created_by"> & {
    allocations: Array<{
      outlet_id: string;
      lines: Array<Omit<PurchaseOrderLine, "id" | "po_id">>;
    }>;
  },
) {
  const orgId = await getUserOrganization();
  const user = await getAuthenticatedUser(); // Create master PO const { data: masterPO, error: poError } = await supabase .from('purchase_orders') .insert({ ...po, organization_id: orgId, created_by: user.id, is_group_po: true, consolidation_master: true, }) .select() .single(); if (poError) throw new Error(`Failed to create group PO: ${poError.message}`); // Create allocations const allocations = po.allocations.map((alloc) => ({ parent_po_id: masterPO.id, outlet_id: alloc.outlet_id, })); const { error: allocError } = await supabase .from('purchase_order_allocations') .insert(allocations); if (allocError) throw new Error(`Failed to create allocations: ${allocError.message}`); // Insert line items for master PO const lines = po.allocations.flatMap((alloc) => alloc.lines.map((line) => ({ ...line, po_id: masterPO.id, })) ); const { error: linesError } = await supabase .from('purchase_order_lines') .insert(lines); if (linesError) throw new Error(`Failed to add PO lines: ${linesError.message}`); return getPurchaseOrder(masterPO.id);
} /** * Update PO status (sent, confirmed, delivered, etc.) */
export async function updatePOStatus(
  poId: string,
  newStatus: string,
  sentVia?: "email" | "edi" | "punchout" | "api" | "manual",
) {
  return executeQuery(
    supabase
      .from("purchase_orders")
      .update({
        status: newStatus,
        sent_via: sentVia,
        updated_at: new Date().toISOString(),
      })
      .eq("id", poId)
      .select()
      .single(),
  );
} /** * Submit PO for approval */
export async function submitPOForApproval(poId: string) {
  return executeQuery(
    supabase
      .from("purchase_orders")
      .update({ approval_required: true, status: "created" })
      .eq("id", poId)
      .select()
      .single(),
  );
} /** * Approve PO */
export async function approvePO(poId: string) {
  const user = await getAuthenticatedUser();
  return executeQuery(
    supabase
      .from("purchase_orders")
      .update({
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        status: "confirmed",
      })
      .eq("id", poId)
      .select()
      .single(),
  );
} /** * Get pending approvals */
export async function getPendingApprovals() {
  const orgId = await getUserOrganization();
  const user = await getAuthenticatedUser();
  return executeQuery(
    supabase
      .from("po_approval_workflow")
      .select(
        ` *, purchase_orders ( id, number, total, vendors ( id, name ) ) `,
      )
      .eq("organization_id", orgId)
      .eq("approver_user_id", user.id)
      .eq("approved", false)
      .order("created_at", { ascending: true }),
  );
} /** * Record ASN receipt for PO */
export async function recordASNReceipt(
  poId: string,
  asnNumber: string,
  asnDate: string,
) {
  const user = await getAuthenticatedUser();
  return executeQuery(
    supabase
      .from("purchase_orders")
      .update({
        asn_received: true,
        asn_number: asnNumber,
        asn_received_date: new Date().toISOString(),
      })
      .eq("id", poId)
      .select()
      .single(),
  );
} /** * Record invoice receipt for PO (updates 3-way match) */
export async function recordInvoiceReceipt(poId: string, invoiceId: string) {
  // Update PO await executeQuery( supabase .from('purchase_orders') .update({ invoice_received: true, invoice_id: invoiceId, invoice_received_date: new Date().toISOString(), }) .eq('id', poId) ); // Call function to check 3-way match const { error } = await supabase.rpc('check_three_way_match', { p_po_id: poId, }); if (error) { console.warn('Error checking 3-way match:', error); } return getPurchaseOrder(poId);
} /** * Get POs pending 3-way match completion */
export async function getPendingThreeWayMatch() {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("purchase_orders")
      .select(
        ` id, number, vendor_id, vendors (name), created_at, three_way_match_status, asn_received, invoice_received `,
      )
      .eq("organization_id", orgId)
      .eq("three_way_match_status", "pending")
      .order("created_at", { ascending: true }),
  );
} /** * Get POs with variances (for review) */
export async function getPOsWithVariances() {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("purchase_orders")
      .select(
        ` id, number, vendors (name), three_way_match_status, variance_notes, purchase_order_lines ( id, qty_variance, price_variance, variance_reason ) `,
      )
      .eq("organization_id", orgId)
      .eq("three_way_match_status", "variance_identified")
      .order("created_at", { ascending: true }),
  );
} /** * Helper to get authenticated user */
async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("User not authenticated");
  }
  return user;
}
export default {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  createGroupPurchaseOrder,
  updatePOStatus,
  submitPOForApproval,
  approvePO,
  getPendingApprovals,
  recordASNReceipt,
  recordInvoiceReceipt,
  getPendingThreeWayMatch,
  getPOsWithVariances,
};
