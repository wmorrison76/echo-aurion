import { Router } from "express";
import type {
  StandardizedLineItem,
  Tier1Category,
  Tier2Category,
  Tier3Category,
} from "@shared/api";
import type { Outlet } from "@shared/purchasing";
import type {
  RecipeCatalogApiEntry,
  RecipeCatalogResponse,
} from "@shared/recipes";
import { getSupabaseServiceClient } from "../lib/supabase";
import { logger, sanitizeError } from "../lib/logger";
interface CatalogRow {
  id: string;
  standard_product_id: string;
  standard_product_name: string;
  base_unit: string;
  tier1: string | null;
  tier2: string | null;
  tier3: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  outlet_id: string | null;
  outlet_name: string | null;
  captured_on: string | null;
  purchase_quantity: number | null;
  purchase_unit: string | null;
  total_cost: number | null;
  total_standard_units: number | null;
  cost_per_standard_unit: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}
interface OutletRow {
  id: string;
  name: string;
  short_code: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  timezone: string | null;
  default_gl_group_id: string | null;
  tags: string[] | null;
}
const recipesRouter = Router();
recipesRouter.get("/catalog", async (req, res) => {
  const client = getSupabaseServiceClient();
  const outletFilter =
    typeof req.query.outlet === "string" ? req.query.outlet : undefined;
  try {
    let query = client
      .from("standard_product_latest_costs")
      .select("*")
      .order("standard_product_name", { ascending: true })
      .limit(500);
    if (outletFilter && outletFilter !== "all") {
      if (outletFilter === "__unassigned__") {
        query = query.is("outlet_id", null);
      } else {
        query = query.eq("outlet_id", outletFilter);
      }
    }
    const [
      { data: costRows, error: costError },
      { data: outletRows, error: outletError },
    ] = await Promise.all([
      query,
      client
        .from("outlets")
        .select(
          "id,name,short_code,timezone,contact_email,phone,address,default_gl_group_id,tags",
        )
        .order("name", { ascending: true }),
    ]);
    if (costError) {
      throw costError;
    }
    if (outletError) {
      throw outletError;
    }
    const typedCostRows = (costRows ?? []) as CatalogRow[];
    const typedOutletRows = (outletRows ?? []) as OutletRow[];
    const entries: RecipeCatalogApiEntry[] = typedCostRows.map((row) => ({
      item: mapRowToStandardizedItem(row),
      outletId: row.outlet_id,
      outletName: row.outlet_name,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      capturedAt: row.captured_on,
      invoiceId: row.invoice_id,
      invoiceNumber: row.invoice_number,
      payload: row.raw_payload ?? null,
    }));
    const payload: RecipeCatalogResponse = {
      entries,
      outlets: typedOutletRows.map(mapOutletRow),
    };
    res.json(payload);
  } catch (error) {
    logger.error("[recipes.catalog]", sanitizeError(error));
    res.status(500).json({ error: "Failed to load recipe catalog" });
  }
});
function mapOutletRow(row: OutletRow): Outlet {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code ?? null,
    contactEmail: row.contact_email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    tags: row.tags ?? null,
    defaultGlGroupId: row.default_gl_group_id ?? null,
  };
}
function mapRowToStandardizedItem(row: CatalogRow): StandardizedLineItem {
  const totalStandardUnits = Number(row.total_standard_units ?? 0);
  const costPerStandardUnit = Number(row.cost_per_standard_unit ?? 0);
  const totalCost = Number(row.total_cost ?? 0);
  const purchaseQuantity = Number(row.purchase_quantity ?? 0);
  const standardUnit = (row.base_unit ??
    "oz") as StandardizedLineItem["standardized"]["standardUnit"];
  const purchaseUnit = row.purchase_unit ?? row.base_unit ?? "each";
  let categories:
    | StandardizedLineItem["standardized"]["categories"]
    | undefined;
  if (row.tier1) {
    categories = {
      tier1: row.tier1 as Tier1Category,
      ...(row.tier2 ? { tier2: row.tier2 as Tier2Category } : {}),
      ...(row.tier3 ? { tier3: row.tier3 as Tier3Category } : {}),
    } as StandardizedLineItem["standardized"]["categories"];
  }
  return {
    vendor: row.vendor_name ?? "Unknown Vendor",
    productName: row.standard_product_name,
    standardized: {
      standardizedName: row.standard_product_name,
      standardUnit,
      categories,
    },
    quantityPurchaseUnit: {
      quantity: purchaseQuantity,
      unit: row.purchase_unit ?? row.base_unit,
      totalStandardUnits,
    },
    totalCost,
    costPerStandardUnit,
    date: row.captured_on ?? row.created_at,
    invoiceNumber: row.invoice_number ?? undefined,
  };
}
export { recipesRouter };
