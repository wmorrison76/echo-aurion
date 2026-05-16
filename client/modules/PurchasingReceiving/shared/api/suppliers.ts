/** * Suppliers API Service * Handles supplier (vendor) operations including search, filtering, certification tracking */ import {
  supabase,
  executeQuery,
  getUserOrganization,
} from "@/lib/supabaseClient";
import type {
  Supplier,
  SupplierContact,
  SupplierCertification,
} from "@/types/purchasing"; /** * Get all suppliers for the authenticated user's organization */
export async function getSuppliers(filters?: {
  search?: string;
  supplier_type?: string;
  compliance_status?: string;
  risk_level?: string;
  limit?: number;
  offset?: number;
}) {
  const orgId = await getUserOrganization();
  let query = supabase
    .from("vendors")
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,external_ref.ilike.%${filters.search}%`,
    );
  }
  if (filters?.supplier_type) {
    query = query.eq("supplier_type", filters.supplier_type);
  }
  if (filters?.compliance_status) {
    query = query.eq("compliance_status", filters.compliance_status);
  }
  if (filters?.risk_level) {
    query = query.eq("risk_level", filters.risk_level);
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
} /** * Get a single supplier by ID */
export async function getSupplier(supplierId: string): Promise<Supplier> {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("vendors")
      .select("*")
      .eq("id", supplierId)
      .eq("organization_id", orgId)
      .single(),
  );
} /** * Create a new supplier */
export async function createSupplier(
  supplier: Omit<Supplier, "id" | "created_at" | "updated_at">,
) {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("vendors")
      .insert({ ...supplier, organization_id: orgId })
      .select()
      .single(),
  );
} /** * Update a supplier */
export async function updateSupplier(
  supplierId: string,
  updates: Partial<Supplier>,
) {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("vendors")
      .update(updates)
      .eq("id", supplierId)
      .eq("organization_id", orgId)
      .select()
      .single(),
  );
} /** * Get supplier contacts */
export async function getSupplierContacts(supplierId: string) {
  return executeQuery(
    supabase
      .from("supplier_contacts")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("is_primary", { ascending: false }),
  );
} /** * Add supplier contact */
export async function addSupplierContact(
  supplierId: string,
  contact: Omit<SupplierContact, "id" | "created_at" | "updated_at">,
) {
  return executeQuery(
    supabase
      .from("supplier_contacts")
      .insert({ ...contact, supplier_id: supplierId })
      .select()
      .single(),
  );
} /** * Get supplier certifications with expiry status */
export async function getSupplierCertifications(supplierId: string) {
  return executeQuery(
    supabase
      .from("supplier_certifications")
      .select(
        ` *, certification_types ( id, code, name, category, description ) `,
      )
      .eq("supplier_id", supplierId)
      .order("expiry_date", { ascending: true }),
  );
} /** * Get expiring certifications (warning for upcoming expiry) */
export async function getExpiringCertifications(daysWarning: number = 30) {
  const orgId = await getUserOrganization(); // Call the Postgres function const { data, error } = await supabase.rpc('get_expiring_certifications', { p_organization_id: orgId, p_days_warning: daysWarning, }); if (error) throw new Error(handleSupabaseError(error)); return data;
} /** * Get supplier performance metrics */
export async function getSupplierPerformance(
  supplierId: string,
  monthsBack: number = 3,
) {
  const orgId = await getUserOrganization();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  return executeQuery(
    supabase
      .from("supplier_performance_metrics")
      .select("*")
      .eq("organization_id", orgId)
      .eq("supplier_id", supplierId)
      .gte("metric_date", startDate.toISOString().split("T")[0])
      .order("metric_date", { ascending: false }),
  );
} /** * Get supplier score (computed view) */
export async function getSupplierScore(supplierId: string) {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("supplier_scores")
      .select("*")
      .eq("organization_id", orgId)
      .eq("supplier_id", supplierId)
      .single(),
  );
} /** * Search suppliers by partial name or code */
export async function searchSuppliers(query: string) {
  const orgId = await getUserOrganization();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, supplier_type, primary_region, compliance_status")
    .eq("organization_id", orgId)
    .or(`name.ilike.%${query}%,external_ref.ilike.%${query}%`)
    .limit(10);
  if (error) throw new Error(handleSupabaseError(error));
  return data;
} /** * Get suppliers for an outlet (respecting ASL) */
export async function getSuppliersForOutlet(
  outletId: string,
  categoryTier1?: string,
) {
  let query = supabase.rpc("get_applicable_suppliers", {
    p_outlet_id: outletId,
    p_category_tier1_id: categoryTier1 || null,
    p_category_tier2_id: null,
  });
  return executeQuery(query);
} /** * Get supplier compliance status */
export async function getSupplierComplianceStatus(supplierId: string) {
  return executeQuery(
    supabase
      .from("supplier_compliance_status")
      .select("*")
      .eq("supplier_id", supplierId)
      .single(),
  );
} /** * Record supplier performance metrics */
export async function recordSupplierMetrics(
  supplierId: string,
  metrics: {
    orders_received: number;
    on_time_count: number;
    quality_issues_count: number;
    variance_count: number;
    avg_price_variance_percent?: number;
  },
) {
  const orgId = await getUserOrganization();
  const today = new Date().toISOString().split("T")[0];
  return executeQuery(
    supabase
      .from("supplier_performance_metrics")
      .insert({
        organization_id: orgId,
        supplier_id: supplierId,
        metric_date: today,
        ...metrics,
      })
      .select()
      .single(),
  );
} /** * Helper function for handling Supabase errors */
function handleSupabaseError(error: any): string {
  console.error("Supabase error:", error);
  return error?.message || "An unexpected error occurred";
}
export default {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  getSupplierContacts,
  addSupplierContact,
  getSupplierCertifications,
  getExpiringCertifications,
  getSupplierPerformance,
  getSupplierScore,
  searchSuppliers,
  getSuppliersForOutlet,
  getSupplierComplianceStatus,
  recordSupplierMetrics,
};
