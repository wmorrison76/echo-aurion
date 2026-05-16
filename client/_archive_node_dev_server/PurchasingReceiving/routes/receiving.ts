/** * RECEIVING WORKFLOW API ROUTES * Handles delivery schedules, truck tracking, HACCP checks, QA inspection, * item check-in, and discrepancy management for 30+ outlets + 25 restaurants */ import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { logger, logAuditEvent } from "../lib/logger";
import { validateRequest, UUIDSchema, PaginationSchema,
} from "../middleware/validation";
import { paginationMiddleware, applyPaginationRange, buildPaginatedResponse, countTotal,
} from "../middleware/pagination";
import { z } from "zod"; const router = Router(); // ============================================================================
// DELIVERY SCHEDULES
// ============================================================================ // GET: List delivery schedules with filtering
router.get("/delivery-schedules", paginationMiddleware, async (req: Request, res: Response) => { try { const pagination = res.locals.pagination; const { organization_id, vendor_id, status, start_date, end_date } = req.query; let query = supabase .from("delivery_schedules") .select("*, vendors(name)"); if (organization_id) query = query.eq("organization_id", organization_id); if (vendor_id) query = query.eq("vendor_id", vendor_id); if (status) query = query.eq("status", status); if (start_date) query = query.gte("scheduled_date", start_date); if (end_date) query = query.lte("scheduled_date", end_date); const { data, error } = await applyPaginationRange( query.order("scheduled_date", { ascending: true }), pagination ); if (error) throw error; const total = await countTotal( supabase.from("delivery_schedules").select("id", { count:"exact", head: true }) ); res.json(buildPaginatedResponse(data || [], total, pagination.limit, pagination.offset)); } catch (error) { logger.error("Failed to fetch delivery schedules:", error); res.status(500).json({ error: (error as Error).message }); }
}); // POST: Create delivery schedule
router.post("/delivery-schedules", async (req: Request, res: Response) => { try { const { organization_id, vendor_id, scheduled_date, scheduled_time_start, scheduled_time_end, delivery_type, expected_items_count, expected_value, po_numbers, notes, } = req.body; const { data, error } = await supabase .from("delivery_schedules") .insert({ organization_id, vendor_id, scheduled_date, scheduled_time_start, scheduled_time_end, delivery_type, expected_items_count, expected_value, po_numbers, notes, status:"scheduled", }) .select(); if (error) throw error; await logAuditEvent( organization_id,"schedule_created", { schedule_id: data?.[0]?.id }, req ); res.status(201).json(data?.[0]); } catch (error) { logger.error("Failed to create delivery schedule:", error); res.status(500).json({ error: (error as Error).message }); }
}); // ============================================================================
// SHIPMENTS / TRUCK TRACKING
// ============================================================================ // POST: Register truck arrival
router.post("/shipments", async (req: Request, res: Response) => { try { const { organization_id, delivery_schedule_id, vendor_id, truck_number, driver_name, driver_phone, estimated_arrival, } = req.body; const { data, error } = await supabase .from("shipments") .insert({ organization_id, delivery_schedule_id, vendor_id, truck_number, driver_name, driver_phone, estimated_arrival, status:"scheduled", }) .select(); if (error) throw error; // Update delivery schedule status await supabase .from("delivery_schedules") .update({ status:"in_transit" }) .eq("id", delivery_schedule_id); res.status(201).json(data?.[0]); } catch (error) { logger.error("Failed to create shipment:", error); res.status(500).json({ error: (error as Error).message }); }
}); // PATCH: Update truck arrival
router.patch("/shipments/:shipmentId/arrival", async (req: Request, res: Response) => { try { const { shipmentId } = req.params; const { actual_arrival, temperature_current } = req.body; const { data, error } = await supabase .from("shipments") .update({ actual_arrival, temperature_current, status:"arrived", }) .eq("id", shipmentId) .select(); if (error) throw error; await logAuditEvent( data?.[0]?.organization_id,"truck_arrived", { shipment_id: shipmentId }, req ); res.json(data?.[0]); } catch (error) { logger.error("Failed to update shipment arrival:", error); res.status(500).json({ error: (error as Error).message }); }
}); // ============================================================================
// TRUCK INSPECTIONS
// ============================================================================ // POST: Truck inspection
router.post("/truck-inspections", async (req: Request, res: Response) => { try { const { shipment_id, organization_id, inspected_by_user_id, truck_cleanliness_score, no_visible_damage, damage_notes, temp_control_working, interior_temperature, temperature_acceptable, seal_intact, seal_broken_notes, inspection_status, fail_reason, } = req.body; const can_proceed = inspection_status !=="fail"; const { data, error } = await supabase .from("truck_inspections") .insert({ shipment_id, organization_id, inspected_by_user_id, truck_cleanliness_score, no_visible_damage, damage_notes, temp_control_working, interior_temperature, temperature_acceptable, seal_intact, seal_broken_notes, inspection_status, fail_reason, can_proceed_to_unload: can_proceed, }) .select(); if (error) throw error; if (can_proceed) { await supabase.from("shipments").update({ status:"unloading" }).eq("id", shipment_id); } await logAuditEvent(organization_id,"inspection_completed", { shipment_id }, req); res.status(201).json(data?.[0]); } catch (error) { logger.error("Failed to create truck inspection:", error); res.status(500).json({ error: (error as Error).message }); }
}); // ============================================================================
// HACCP CHECKS
// ============================================================================ // POST: HACCP check
router.post("/haccp-checks", async (req: Request, res: Response) => { try { const { shipment_id, organization_id, checked_by_user_id, frozen_product_temp, frozen_acceptable, chilled_product_temp, chilled_acceptable, ambient_temp, ambient_acceptable, exterior_cleanliness, interior_cleanliness, cleanliness_acceptable, delivery_documentation_present, origin_cert_present, allergen_info_present, haccp_status, corrective_action_required, approver_user_id, } = req.body; const { data, error } = await supabase .from("haccp_checks") .insert({ shipment_id, organization_id, checked_by_user_id, check_time: new Date().toISOString().split("T")[1], frozen_product_temp, frozen_acceptable, chilled_product_temp, chilled_acceptable, ambient_temp, ambient_acceptable, exterior_cleanliness, interior_cleanliness, cleanliness_acceptable, delivery_documentation_present, origin_cert_present, allergen_info_present, haccp_status, corrective_action_required, approver_user_id, }) .select(); if (error) throw error; if (haccp_status ==="pass") { await supabase.from("shipments").update({ status:"unloading" }).eq("id", shipment_id); } await logAuditEvent(organization_id,"haccp_passed", { shipment_id }, req); res.status(201).json(data?.[0]); } catch (error) { logger.error("Failed to create HACCP check:", error); res.status(500).json({ error: (error as Error).message }); }
}); // ============================================================================
// ITEM CHECK-IN (Tablet/Handheld)
// ============================================================================ // POST: Check-in item for an outlet
router.post("/receiving-checkins", async (req: Request, res: Response) => { try { const { shipment_id, organization_id, outlet_id, receiving_user_id, line_item_id, product_id, sku, product_name, category, po_quantity, po_unit, received_quantity, expiration_date, received_condition, condition_notes, received_by_vendor_rep, vendor_rep_phone, } = req.body; const short_quantity = (po_quantity || 0) - (received_quantity || 0); const is_short = short_quantity > 0; const { data, error } = await supabase .from("receiving_checkins") .insert({ shipment_id, organization_id, outlet_id, receiving_user_id, line_item_id, product_id, sku, product_name, category, po_quantity, po_unit, received_quantity, short_quantity, expiration_date, received_condition, condition_notes, received_by_vendor_rep, vendor_rep_phone, checkin_status: is_short ?"short" :"received", requires_action: is_short || received_condition !=="good", }) .select(); if (error) throw error; // Create discrepancy if needed if (is_short || received_condition !=="good") { const shipment = await supabase.from("shipments").select("vendor_id").eq("id", shipment_id).single(); await supabase.from("receiving_discrepancies").insert({ checkin_id: data?.[0]?.id, organization_id, outlet_id, shipment_id, vendor_id: shipment.data?.vendor_id, discrepancy_type: is_short ?"short" :"quality_issue", product_id, sku, quantity_affected: short_quantity || 0, resolution_status:"open", }); } await logAuditEvent(organization_id,"item_checkin", { checkin_id: data?.[0]?.id }, req); res.status(201).json(data?.[0]); } catch (error) { logger.error("Failed to check-in item:", error); res.status(500).json({ error: (error as Error).message }); }
}); // GET: Check-ins for an outlet
router.get("/receiving-checkins/:outletId", paginationMiddleware, async (req: Request, res: Response) => { try { const { outletId } = req.params; const pagination = res.locals.pagination; const { shipment_id, status } = req.query; let query = supabase.from("receiving_checkins").select("*"); if (outletId) query = query.eq("outlet_id", outletId); if (shipment_id) query = query.eq("shipment_id", shipment_id); if (status) query = query.eq("checkin_status", status); const { data, error } = await applyPaginationRange( query.order("checkin_date", { ascending: false }), pagination ); if (error) throw error; const total = await countTotal(supabase.from("receiving_checkins").select("id", { count:"exact", head: true })); res.json(buildPaginatedResponse(data || [], total, pagination.limit, pagination.offset)); } catch (error) { logger.error("Failed to fetch check-ins:", error); res.status(500).json({ error: (error as Error).message }); }
}); // ============================================================================
// DISCREPANCIES
// ============================================================================ // GET: Discrepancies with filtering
router.get("/receiving-discrepancies", paginationMiddleware, async (req: Request, res: Response) => { try { const pagination = res.locals.pagination; const { organization_id, vendor_id, resolution_status, discrepancy_type } = req.query; let query = supabase.from("receiving_discrepancies").select("*, vendors(name)"); if (organization_id) query = query.eq("organization_id", organization_id); if (vendor_id) query = query.eq("vendor_id", vendor_id); if (resolution_status) query = query.eq("resolution_status", resolution_status); if (discrepancy_type) query = query.eq("discrepancy_type", discrepancy_type); const { data, error } = await applyPaginationRange( query.order("created_at", { ascending: false }), pagination ); if (error) throw error; const total = await countTotal(supabase.from("receiving_discrepancies").select("id", { count:"exact", head: true })); res.json(buildPaginatedResponse(data || [], total, pagination.limit, pagination.offset)); } catch (error) { logger.error("Failed to fetch discrepancies:", error); res.status(500).json({ error: (error as Error).message }); }
}); // POST: Notify vendor of discrepancy
router.post("/receiving-discrepancies/:discrepancyId/notify-vendor", async (req: Request, res: Response) => { try { const { discrepancyId } = req.params; const { notification_method, vendor_notified_by_user_id } = req.body; const { data, error } = await supabase .from("receiving_discrepancies") .update({ vendor_notified: true, vendor_notified_at: new Date().toISOString(), vendor_notified_by_user_id, notification_method, }) .eq("id", discrepancyId) .select(); if (error) throw error; // TODO: Send actual vendor notification (SMS, Email, Push) await logAuditEvent( data?.[0]?.organization_id,"vendor_notified", { discrepancy_id: discrepancyId }, req ); res.json(data?.[0]); } catch (error) { logger.error("Failed to notify vendor:", error); res.status(500).json({ error: (error as Error).message }); }
}); // ============================================================================
// RECEIVING SUMMARY
// ============================================================================ // GET: Receiving summary for shipment + outlet
router.get("/receiving-summaries/:shipmentId/:outletId", async (req: Request, res: Response) => { try { const { shipmentId, outletId } = req.params; const { data, error } = await supabase .from("receiving_summaries") .select("*") .eq("shipment_id", shipmentId) .eq("outlet_id", outletId) .single(); if (error) throw error; res.json(data); } catch (error) { logger.error("Failed to fetch receiving summary:", error); res.status(500).json({ error: (error as Error).message }); }
}); // POST: Complete check-in for outlet
router.post("/receiving-summaries/:shipmentId/:outletId/complete", async (req: Request, res: Response) => { try { const { shipmentId, outletId } = req.params; const { checkin_completed_by_user_id } = req.body; // Calculate totals from check-ins const { data: checkins } = await supabase .from("receiving_checkins") .select("*") .eq("shipment_id", shipmentId) .eq("outlet_id", outletId); const totals = { total_expected_items: checkins?.reduce((sum, c) => sum + (c.po_quantity || 0), 0) || 0, total_received_items: checkins?.reduce((sum, c) => sum + (c.received_quantity || 0), 0) || 0, total_short_items: checkins?.reduce((sum, c) => sum + (c.short_quantity || 0), 0) || 0, total_damaged_items: checkins?.filter((c) => c.received_condition ==="damaged").length || 0, }; // Upsert summary const { data, error } = await supabase .from("receiving_summaries") .upsert({ shipment_id: shipmentId, outlet_id: outletId, organization_id: (checkins?.[0]?.organization_id ||""), ...totals, checkin_completed: true, checkin_completed_by_user_id, checkin_completed_at: new Date().toISOString(), }) .select(); if (error) throw error; // D3 — auto-create A/P invoice draft on commit. Three-way-match flow: // each shipment → vendor → invoice draft (status='new') with subtotal // computed from received_quantity * items.last_cost. Chef/AP team // reviews and matches against PO; we don't try to fully reconcile here. const apInvoiceId = await autoCreateAPInvoiceFromCheckins({ shipmentId, outletId, checkins: checkins || [], }); await logAuditEvent( (checkins?.[0]?.organization_id ||""),"checkin_completed", { shipment_id: shipmentId, outlet_id: outletId, auto_ap_invoice_id: apInvoiceId }, req ); res.json({ ...data?.[0], auto_ap_invoice_id: apInvoiceId }); } catch (error) { logger.error("Failed to complete check-in:", error); res.status(500).json({ error: (error as Error).message }); }
});

/**
 * D3 — PO line lookup for ItemCheckinForm barcode scan.
 *
 * Replaces the prior TODO that just stored the SKU and showed the
 * manual entry dialog. Now: scan a barcode → server resolves to the
 * matching item.sku for the shipment's vendor, returns the item info
 * (product name, category-ish via gl_code, last_cost, uom) and the
 * matching PO line if discoverable. Chef sees the form pre-populated.
 *
 * GET /api/receiving/po-lookup?shipmentId=X&sku=Y
 */
router.get("/po-lookup", async (req: Request, res: Response) => {
  try {
    const shipmentId = String(req.query.shipmentId || "");
    const sku = String(req.query.sku || "").trim();
    if (!shipmentId || !sku) {
      return res.status(400).json({ error: "shipmentId and sku required" });
    }

    // Resolve shipment → vendor.
    const { data: shipment } = await supabase
      .from("shipments")
      .select("id, vendor_id, delivery_schedule_id")
      .eq("id", shipmentId)
      .single();
    if (!shipment) {
      return res.status(404).json({ found: false, error: "shipment not found" });
    }

    // Look up the item by (vendor_id, sku) — exact match first, then
    // case-insensitive fallback.
    let item: any = null;
    {
      const exact = await supabase
        .from("items")
        .select("*")
        .eq("vendor_id", shipment.vendor_id)
        .eq("sku", sku)
        .maybeSingle();
      if (exact.data) item = exact.data;
    }
    if (!item) {
      const ilike = await supabase
        .from("items")
        .select("*")
        .eq("vendor_id", shipment.vendor_id)
        .ilike("sku", sku)
        .limit(1);
      if (Array.isArray(ilike.data) && ilike.data[0]) item = ilike.data[0];
    }
    if (!item) {
      return res.json({ found: false, sku });
    }

    // Look up the PO line that orders this item via the shipment's
    // delivery_schedule.po_numbers array. Best effort — the PO match is
    // a hint for qty_ordered / unit_price; chef can still adjust.
    let poLine: any = null;
    if (shipment.delivery_schedule_id) {
      const { data: schedule } = await supabase
        .from("delivery_schedules")
        .select("po_numbers")
        .eq("id", shipment.delivery_schedule_id)
        .single();
      const poNumbers: string[] = Array.isArray(schedule?.po_numbers) ? schedule!.po_numbers : [];
      if (poNumbers.length > 0) {
        const { data: pos } = await supabase
          .from("purchase_orders")
          .select("id, number")
          .eq("vendor_id", shipment.vendor_id)
          .in("number", poNumbers);
        const poIds = (pos || []).map((p: any) => p.id);
        if (poIds.length > 0) {
          const { data: lines } = await supabase
            .from("purchase_order_lines")
            .select("po_id, item_id, uom, qty_ordered, unit_price, notes")
            .in("po_id", poIds)
            .eq("item_id", item.id)
            .limit(1);
          if (Array.isArray(lines) && lines[0]) {
            poLine = lines[0];
          }
        }
      }
    }

    res.json({
      found: true,
      sku,
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        uom: item.uom,
        pack_size: item.pack_size,
        last_cost: Number(item.last_cost ?? 0),
        gl_code_id: item.gl_code_id,
        allergens: item.allergens,
      },
      poLine: poLine
        ? {
            po_id: poLine.po_id,
            qty_ordered: Number(poLine.qty_ordered ?? 0),
            unit_price: Number(poLine.unit_price ?? 0),
            uom: poLine.uom,
            notes: poLine.notes,
          }
        : null,
    });
  } catch (error) {
    logger.error("[Receiving] po-lookup failed:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * D3 — Auto-create A/P invoice draft from completed check-ins.
 *
 * Called from /receiving-summaries/:shipmentId/:outletId/complete.
 * Returns the new invoice id on success, null on failure (auto-create
 * is non-blocking; the receiving summary completion is the user-facing
 * contract).
 *
 * Strategy:
 *   1. Resolve vendor from shipment.
 *   2. Compute subtotal = sum(received_quantity * items.last_cost) for
 *      checkins whose sku resolves to a known item; unknown skus get a
 *      0-priced line so the chef sees them in the draft.
 *   3. Insert invoices row + invoice_lines.
 *   4. Status='new' so the AP team picks it up for review/match.
 */
async function autoCreateAPInvoiceFromCheckins(args: {
  shipmentId: string;
  outletId: string;
  checkins: any[];
}): Promise<string | null> {
  try {
    if (args.checkins.length === 0) return null;

    const { data: shipment } = await supabase
      .from("shipments")
      .select("id, vendor_id, delivery_schedule_id")
      .eq("id", args.shipmentId)
      .single();
    if (!shipment || !shipment.vendor_id) return null;

    // Resolve known items by (vendor_id, sku) for cost lookup.
    const skuList = Array.from(
      new Set(args.checkins.map((c) => c.sku).filter(Boolean) as string[]),
    );
    const itemsBySku = new Map<string, any>();
    if (skuList.length > 0) {
      const { data: items } = await supabase
        .from("items")
        .select("id, sku, last_cost, uom")
        .eq("vendor_id", shipment.vendor_id)
        .in("sku", skuList);
      for (const it of items || []) itemsBySku.set(it.sku, it);
    }

    let subtotal = 0;
    const lines = args.checkins.map((c) => {
      const item = c.sku ? itemsBySku.get(c.sku) : null;
      const unitPrice = Number(item?.last_cost ?? 0);
      const qty = Number(c.received_quantity ?? 0);
      const ext = Number((qty * unitPrice).toFixed(4));
      subtotal += ext;
      return {
        item_id: item?.id ?? null,
        raw_description: c.product_name,
        sku: c.sku ?? null,
        uom: c.po_unit ?? item?.uom ?? "ea",
        qty,
        unit_price: unitPrice,
        ext_price: ext,
      };
    });

    // Best-effort PO link — first PO from delivery schedule, if any.
    let poId: string | null = null;
    if (shipment.delivery_schedule_id) {
      const { data: schedule } = await supabase
        .from("delivery_schedules")
        .select("po_numbers")
        .eq("id", shipment.delivery_schedule_id)
        .single();
      const firstPoNum = Array.isArray(schedule?.po_numbers) ? schedule!.po_numbers[0] : null;
      if (firstPoNum) {
        const { data: po } = await supabase
          .from("purchase_orders")
          .select("id")
          .eq("vendor_id", shipment.vendor_id)
          .eq("number", firstPoNum)
          .maybeSingle();
        if (po?.id) poId = po.id;
      }
    }

    const invoiceNumber = `AUTO-${args.shipmentId.slice(0, 8)}-${Date.now().toString(36)}`;
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert({
        vendor_id: shipment.vendor_id,
        number: invoiceNumber,
        invoice_date: new Date().toISOString().slice(0, 10),
        outlet_id: args.outletId,
        po_id: poId,
        subtotal: Number(subtotal.toFixed(4)),
        tax: 0,
        shipping: 0,
        total: Number(subtotal.toFixed(4)),
        currency: "USD",
        status: "new",
        // hash_sha256 must be unique; generate a deterministic key from
        // shipment + completed_at so a re-run won't dupe the row.
        hash_sha256:
          require("crypto").createHash("sha256").update(`${args.shipmentId}:${args.outletId}:auto`).digest("hex"),
      })
      .select("id")
      .single();
    if (invErr || !inv) {
      logger.warn("[Receiving] auto AP invoice insert failed", {
        shipmentId: args.shipmentId,
        error: invErr?.message,
      });
      return null;
    }

    // Insert lines (one per check-in).
    const lineRows = lines.map((l) => ({ ...l, invoice_id: inv.id }));
    await supabase.from("invoice_lines").insert(lineRows);

    logger.info("[Receiving] auto AP invoice created", {
      shipmentId: args.shipmentId,
      outletId: args.outletId,
      invoiceId: inv.id,
      lineCount: lineRows.length,
      subtotal,
    });
    return inv.id;
  } catch (err) {
    logger.warn("[Receiving] auto AP invoice exception", {
      shipmentId: args.shipmentId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export default router;
