/** * Products API Service * Manages product master catalog, categories, substitutions, and favorites */ import {
  supabase,
  executeQuery,
  getUserOrganization,
} from "@/lib/supabaseClient";
import type {
  Product,
  ProductAlias,
  FavoriteProduct,
} from "@/types/purchasing"; /** * Get product categories (Tier 1) */
export async function getProductCategories() {
  return executeQuery(
    supabase
      .from("product_tier1_categories")
      .select("*")
      .order("name", { ascending: true }),
  );
} /** * Get sub-categories (Tier 2) for a category */
export async function getSubcategories(tier1Id: string) {
  return executeQuery(
    supabase
      .from("product_tier2_categories")
      .select("*")
      .eq("tier1_id", tier1Id)
      .order("name", { ascending: true }),
  );
} /** * Get products by category */
export async function getProductsByCategory(
  tier1Id?: string,
  tier2Id?: string,
  tier3Id?: string,
  filters?: { search?: string; limit?: number; offset?: number },
) {
  const orgId = await getUserOrganization();
  let query = supabase
    .from("products")
    .select(
      ` *, product_tier1_categories ( id, code, name ), product_tier2_categories ( id, code, name ), product_tier3_categories ( id, code, name ) `,
    )
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .eq("active", true)
    .order("name", { ascending: true });
  if (tier1Id) {
    query = query.eq("tier1_id", tier1Id);
  }
  if (tier2Id) {
    query = query.eq("tier2_id", tier2Id);
  }
  if (tier3Id) {
    query = query.eq("tier3_id", tier3Id);
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`,
    );
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
} /** * Get a single product */
export async function getProduct(productId: string): Promise<Product> {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("products")
      .select(
        ` *, product_tier1_categories (*), product_tier2_categories (*), product_tier3_categories (*) `,
      )
      .or(`organization_id.is.null,organization_id.eq.${orgId}`)
      .eq("id", productId)
      .single(),
  );
} /** * Search products */
export async function searchProducts(query: string, limit: number = 20) {
  const orgId = await getUserOrganization();
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name, base_unit, tier1_id, tier2_id")
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .eq("active", true)
    .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  return data;
} /** * Create a new product (org-specific) */
export async function createProduct(
  product: Omit<Product, "id" | "created_at" | "updated_at">,
) {
  const orgId = await getUserOrganization();
  return executeQuery(
    supabase
      .from("products")
      .insert({ ...product, organization_id: orgId })
      .select()
      .single(),
  );
} /** * Update product details */
export async function updateProduct(
  productId: string,
  updates: Partial<Product>,
) {
  return executeQuery(
    supabase
      .from("products")
      .update(updates)
      .eq("id", productId)
      .select()
      .single(),
  );
} /** * Get product aliases (supplier-specific SKU mappings) */
export async function getProductAliases(
  productId: string,
  supplierId?: string,
) {
  let query = supabase
    .from("product_aliases")
    .select("*")
    .eq("product_id", productId)
    .order("priority", { ascending: true });
  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }
  return executeQuery(query);
} /** * Add product alias for supplier */
export async function addProductAlias(
  productId: string,
  supplierId: string,
  alias: Omit<ProductAlias, "id" | "product_id" | "supplier_id" | "created_at">,
) {
  return executeQuery(
    supabase
      .from("product_aliases")
      .insert({ ...alias, product_id: productId, supplier_id: supplierId })
      .select()
      .single(),
  );
} /** * Get product substitutions */
export async function getProductSubstitutions(productId: string) {
  return executeQuery(
    supabase
      .from("product_substitutions")
      .select(
        ` *, substitute_product:substitute_product_id ( id, code, name ) `,
      )
      .eq("primary_product_id", productId)
      .eq("active", true),
  );
} /** * Get favorite products for an outlet */
export async function getOutletFavorites(outletId: string) {
  return executeQuery(
    supabase
      .from("favorite_products")
      .select(
        ` *, products ( id, code, name, base_unit ), vendors ( id, name ) `,
      )
      .eq("outlet_id", outletId)
      .order("usage_count", { ascending: false }),
  );
} /** * Add product to outlet favorites */
export async function addToFavorites(
  outletId: string,
  productId: string,
  supplierId?: string,
  defaultQty?: number,
) {
  return executeQuery(
    supabase
      .from("favorite_products")
      .insert({
        outlet_id: outletId,
        product_id: productId,
        supplier_id: supplierId,
        default_qty: defaultQty,
        usage_count: 0,
      })
      .select()
      .single(),
  );
} /** * Remove from favorites */
export async function removeFromFavorites(
  outletId: string,
  productId: string,
  supplierId?: string,
) {
  let query = supabase
    .from("favorite_products")
    .delete()
    .eq("outlet_id", outletId)
    .eq("product_id", productId);
  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }
  const { error } = await query;
  if (error) throw new Error(`Failed to remove favorite: ${error.message}`);
} /** * Update favorite usage count */
export async function recordFavoriteUsage(favoriteId: string) {
  return executeQuery(
    supabase
      .from("favorite_products")
      .update({
        usage_count: supabase.sql`usage_count + 1`,
        last_ordered_at: new Date().toISOString(),
      })
      .eq("id", favoriteId)
      .select()
      .single(),
  );
} /** * Get all allergens referenced in products */
export async function getAllergens() {
  const { data, error } = await supabase
    .from("products")
    .select("allergens")
    .not("allergens", "is", null);
  if (error) throw new Error(`Failed to get allergens: ${error.message}`); // Flatten and deduplicate allergens const allergenSet = new Set<string>(); data?.forEach((row: any) => { if (Array.isArray(row.allergens)) { row.allergens.forEach((a: string) => allergenSet.add(a)); } }); return Array.from(allergenSet).sort();
} /** * Bulk import products from CSV */
export async function bulkImportProducts(
  products: Omit<Product, "id" | "created_at" | "updated_at">[],
) {
  const orgId = await getUserOrganization();
  const productsWithOrg = products.map((p) => ({
    ...p,
    organization_id: orgId,
  }));
  return executeQuery(
    supabase.from("products").insert(productsWithOrg).select(),
  );
}
export default {
  getProductCategories,
  getSubcategories,
  getProductsByCategory,
  getProduct,
  searchProducts,
  createProduct,
  updateProduct,
  getProductAliases,
  addProductAlias,
  getProductSubstitutions,
  getOutletFavorites,
  addToFavorites,
  removeFromFavorites,
  recordFavoriteUsage,
  getAllergens,
  bulkImportProducts,
};
