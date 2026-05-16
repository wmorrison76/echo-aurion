/** * Approved Supplier List (ASL) API Service * Manages ASL per organization, region, outlet, and category * Critical for purchasing governance and cost control */ import {
  supabase,
  executeQuery,
  getUserOrganization,
} from "@/lib/supabaseClient";
import type { ApprovedSupplier } from "@/types/purchasing"; /** * Get ASL for organization or specific outlet/region */
export async function getApprovedSuppliers(filters?: {
  outlet_id?: string;
  outlet_group_id?: string;
  category_tier1_id?: string;
  category_tier2_id?: string;
  status?: "active" | "inactive" | "pending_review" | "suspended";
  limit?: number;
  offset?: number;
}) {
  const orgId = await getUserOrganization();
  let query = supabase
    .from("approved_suppliers")
    .select(
      ` *, vendors ( id, name, supplier_type, primary_region, min_order_value, lead_time_days ), product_tier1_categories ( code, name ), product_tier2_categories ( code, name ) `,
    )
    .eq("organization_id", orgId)
    .eq("status", filters?.status || "active")
    .order("priority", { ascending: true });
  if (filters?.outlet_id) {
    query = query.eq("outlet_id", filters.outlet_id);
  }
  if (filters?.outlet_group_id) {
    query = query.eq("outlet_group_id", filters.outlet_group_id);
  }
  if (filters?.category_tier1_id) {
    query = query.eq("category_tier1_id", filters.category_tier1_id);
  }
  if (filters?.category_tier2_id) {
    query = query.eq("category_tier2_id", filters.category_tier2_id);
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
} /** * Get suppliers for specific outlet and category * Used in ordering portal to show available suppliers */
export async function getOutletSuppliers(
  outletId: string,
  categoryTier1Id?: string,
  categoryTier2Id?: string,
) {
  const { data, error } = await supabase.rpc("get_applicable_suppliers", {
    p_outlet_id: outletId,
    p_category_tier1_id: categoryTier1Id || null,
    p_category_tier2_id: categoryTier2Id || null,
  });
  if (error) {
    throw new Error(`Failed to get suppliers: ${error.message}`);
  }
  return data;
} /** * Add supplier to ASL */
export async function addToASL(
  asl: Omit<ApprovedSupplier, "id" | "created_at" | "updated_at">,
) {
  return executeQuery(
    supabase.from("approved_suppliers").insert(asl).select().single(),
  );
} /** * Update ASL entry */
export async function updateASL(
  aslId: string,
  updates: Partial<ApprovedSupplier>,
) {
  return executeQuery(
    supabase
      .from("approved_suppliers")
      .update(updates)
      .eq("id", aslId)
      .select()
      .single(),
  );
} /** * Remove supplier from ASL (soft delete) */
export async function removeFromASL(aslId: string) {
  return executeQuery(
    supabase
      .from("approved_suppliers")
      .update({ status: "inactive" })
      .eq("id", aslId)
      .select()
      .single(),
  );
} /** * Suspend supplier temporarily (non-compliance, service issues) */
export async function suspendSupplierFromASL(aslId: string, reason: string) {
  return executeQuery(
    supabase
      .from("approved_suppliers")
      .update({ status: "suspended", reason_suspended: reason })
      .eq("id", aslId)
      .select()
      .single(),
  );
} /** * Get ASL for a specific region (for regional purchasing) */
export async function getRegionalASL(outletGroupId: string) {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("approved_suppliers")
      .select(
        ` *, vendors ( id, name, supplier_type, primary_region, coverage_regions ), product_tier1_categories ( code, name ) `,
      )
      .eq("organization_id", orgId)
      .eq("outlet_group_id", outletGroupId)
      .eq("status", "active")
      .order("priority", { ascending: true }),
  );
} /** * Get category-specific ASL * Used for compliance and category enforcement */
export async function getCategoryASL(
  categoryTier1Id: string,
  categoryTier2Id?: string,
) {
  const orgId = await getUserOrganization();
  let query = supabase
    .from("approved_suppliers")
    .select(
      ` *, vendors ( id, name, supplier_type, min_order_value, lead_time_days ) `,
    )
    .eq("organization_id", orgId)
    .eq("category_tier1_id", categoryTier1Id)
    .eq("status", "active")
    .order("priority", { ascending: true });
  if (categoryTier2Id) {
    query = query.eq("category_tier2_id", categoryTier2Id);
  }
  return executeQuery(query);
} /** * Bulk add suppliers to ASL * Used for initial setup or category updates */
export async function bulkAddToASL(
  aslEntries: Omit<ApprovedSupplier, "id" | "created_at" | "updated_at">[],
) {
  return executeQuery(
    supabase.from("approved_suppliers").insert(aslEntries).select(),
  );
} /** * Validate if supplier is allowed for outlet + category */
export async function isSupplierApproved(
  supplierId: string,
  outletId: string,
  categoryTier1Id?: string,
): Promise<boolean> {
  const orgId = await getUserOrganization(); // Get outlet details const { data: outlet } = await supabase .from('outlets') .select('outlet_group_id') .eq('id', outletId) .single(); if (!outlet) return false; // Check for outlet-specific approval const { count: outletCount } = await supabase .from('approved_suppliers') .select('id', { count: 'exact' }) .eq('organization_id', orgId) .eq('supplier_id', supplierId) .eq('outlet_id', outletId) .eq('status', 'active'); if (outletCount && outletCount > 0) return true; // Check for group-level approval const { count: groupCount } = await supabase .from('approved_suppliers') .select('id', { count: 'exact' }) .eq('organization_id', orgId) .eq('supplier_id', supplierId) .eq('outlet_group_id', outlet.outlet_group_id) .eq('status', 'active'); if (groupCount && groupCount > 0) return true; // Check for org-wide approval const { count: orgCount } = await supabase .from('approved_suppliers') .select('id', { count: 'exact' }) .eq('organization_id', orgId) .eq('supplier_id', supplierId) .is('outlet_group_id', null) .is('outlet_id', null) .eq('status', 'active'); return orgCount ? orgCount > 0 : false;
} /** * Export ASL as CSV/JSON for reporting or backup */
export async function exportASL(format: "csv" | "json" = "json") {
  const orgId = await getUserOrganization();
  const { data, error } = await supabase
    .from("approved_suppliers")
    .select(
      ` *, vendors ( name, supplier_type, primary_region ), product_tier1_categories ( code, name ), product_tier2_categories ( code, name ) `,
    )
    .eq("organization_id", orgId)
    .eq("status", "active");
  if (error) throw new Error(`Failed to export ASL: ${error.message}`);
  if (format === "json") {
    return data;
  } // Convert to CSV const csv = convertToCSV(data); return csv;
} /** * Helper to convert data to CSV format */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(",");
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (typeof value === "object" && value !== null) {
          return JSON.stringify(value);
        }
        return value || "";
      })
      .join(",");
  });
  return [csvHeaders, ...csvRows].join("\n");
}
export default {
  getApprovedSuppliers,
  getOutletSuppliers,
  addToASL,
  updateASL,
  removeFromASL,
  suspendSupplierFromASL,
  getRegionalASL,
  getCategoryASL,
  bulkAddToASL,
  isSupplierApproved,
  exportASL,
};
