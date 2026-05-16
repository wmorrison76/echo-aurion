// @ts-nocheck
import { Router } from "express";
import type { Request, Response } from "express";
import { jsPDF } from "jspdf";
import { beoManagementService } from "../../../../../server/services/beo-management";

type ScenePreset = {
  session: string;
  covers?: number;
  theme?: string;
  flowPreference?: string;
  glCodes?: Array<{ code: string; label: string }>;
  laborRate?: number;
  fuelCostPerUnit?: number;
  requireLidar?: boolean;
  coverageTarget?: number;
  maxHoleRatio?: number;
  EchoStratusRates?: Record<string, number>;
};

export const beoExport = Router();

// In-memory store for Builder presets (keyed by session).
// In production, this should be stored in Supabase (or a template CMS) with versioning + audit.
const builderPresets: Record<string, ScenePreset> = {
  P66_DiningRoom: {
    session: "P66_DiningRoom",
    covers: 120,
    theme: "elegant",
    flowPreference: "perimeter",
    glCodes: [
      { code: "1000", label: "Tables" },
      { code: "1100", label: "Chairs" },
      { code: "1200", label: "Linens" },
      { code: "1300", label: "Centerpieces" },
    ],
    laborRate: 18,
    fuelCostPerUnit: 1.2,
    requireLidar: true,
    coverageTarget: 0.85,
    maxHoleRatio: 0.1,
  },
};

export interface BeoExportPayload {
  eventName?: string;
  date?: string; // yyyy-mm-dd
  session?: string;
  covers?: number;
  notes?: string;
  layoutSummary?: Record<string, unknown>;
  layoutObjects?: Array<{
    type: string;
    seats?: number;
    glCode?: string;
    unitCost?: number;
    costCenter?: string;
    meta?: Record<string, any>;
  }>;
  items?: Array<{
    qty: number;
    name: string;
    glCode?: string;
    unitCost?: number;
  }>;
  includeConsumables?: boolean;
  eventId?: string;
  outletId?: string;
  eventTypeCode?: string;
  departmentId?: string;
}

function summarizeEquipment(objects: BeoExportPayload["layoutObjects"] = []) {
  const rollup = new Map<
    string,
    {
      name: string;
      qty: number;
      glCode?: string;
      unitCost?: number;
      costCenter?: string;
    }
  >();
  for (const obj of objects || []) {
    const key = obj.type || "unknown";
    const current = rollup.get(key);
    const qty = Math.max(1, obj.seats || 1);
    if (!current) {
      rollup.set(key, {
        name: key,
        qty,
        glCode: obj.glCode,
        unitCost: obj.unitCost,
        costCenter: obj.costCenter,
      });
    } else {
      current.qty += qty;
    }
  }
  return Array.from(rollup.values());
}

export async function beoExportHandler(
  req: Request<unknown, unknown, BeoExportPayload>,
  res: Response,
): Promise<void> {
  try {
    const {
      eventName = "Event",
      date = new Date().toISOString().split("T")[0],
      layoutSummary = {},
      layoutObjects = [],
      items = [],
      includeConsumables = true,
      notes = "",
      covers,
      eventId,
      outletId,
      eventTypeCode,
      departmentId,
    } = req.body || {};

    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    const equipmentRollup = summarizeEquipment(layoutObjects);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="BEO_${eventName.replace(/\s+/g, "_")}_${date}.pdf"`,
    );

    const pdf = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 48;
    let y = 48;

    const line = (
      text: string,
      opts?: { size?: number; bold?: boolean; indent?: number },
    ) => {
      const size = opts?.size ?? 10;
      pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.text(text, margin + (opts?.indent ?? 0), y);
      y += size + 6;
    };

    const section = (title: string) => {
      y += 6;
      pdf.setDrawColor(220);
      pdf.setLineWidth(1);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 14;
      line(title, { bold: true, size: 12 });
    };

    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Banquet Event Order", pageWidth / 2, y, { align: "center" });
    y += 22;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("EchoEventStudio", pageWidth / 2, y, { align: "center" });
    y += 26;

    section("Event Summary");
    line(`Event: ${eventName}`, { size: 10 });
    line(`Date: ${date}`, { size: 10 });
    line(`Covers: ${covers ?? "—"}`, { size: 10 });

    if (Object.keys(layoutSummary).length > 0) {
      section("Layout Summary");
      const text = JSON.stringify(layoutSummary, null, 2);
      pdf.setFont("courier", "normal");
      pdf.setFontSize(8);
      const wrapped = pdf.splitTextToSize(text, pageWidth - margin * 2);
      pdf.text(wrapped, margin, y);
      y += wrapped.length * 10 + 6;
      pdf.setFont("helvetica", "normal");
    }

    if (items.length > 0) {
      section("Items");

      const cols = {
        qty: { x: margin, w: 44 },
        item: { x: margin + 44, w: 280 },
        gl: { x: margin + 44 + 280, w: 70 },
        ext: { x: margin + 44 + 280 + 70, w: 90 },
      };

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("Qty", cols.qty.x, y);
      pdf.text("Item", cols.item.x, y);
      pdf.text("GL", cols.gl.x + cols.gl.w / 2, y, { align: "center" });
      pdf.text("Ext", cols.ext.x + cols.ext.w, y, { align: "right" });
      y += 12;
      pdf.setDrawColor(200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 12;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      let totalCost = 0;
      for (const it of items) {
        const ext = (it.unitCost || 0) * (it.qty || 0);
        totalCost += ext;
        pdf.text(String(it.qty ?? ""), cols.qty.x + cols.qty.w, y, {
          align: "right",
        });
        const itemLines = pdf.splitTextToSize(it.name || "—", cols.item.w);
        pdf.text(itemLines, cols.item.x, y);
        pdf.text(it.glCode || "—", cols.gl.x + cols.gl.w / 2, y, {
          align: "center",
        });
        pdf.text(ext ? `$${ext.toFixed(2)}` : "—", cols.ext.x + cols.ext.w, y, {
          align: "right",
        });
        y += Math.max(12, itemLines.length * 10) + 4;
      }

      pdf.setDrawColor(200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 14;
      pdf.setFont("helvetica", "bold");
      pdf.text(`Total: $${totalCost.toFixed(2)}`, pageWidth - margin, y, {
        align: "right",
      });
      y += 14;
    }

    if (includeConsumables && (covers ?? 0) > 0) {
      section("Consumables (Estimate)");
      const c = Math.max(0, covers || 0);
      line(`Napkins: ~${Math.ceil(c * 1.2)}`);
      line(`Plates: ~${Math.ceil(c * 1.1)}`);
      line(`Glasses: ~${Math.ceil(c * 1.5)}`);
      line(`Chafer Fuel Units: ~${Math.max(1, Math.ceil(c / 20))}`);
    }

    if (notes?.trim()) {
      section("Notes");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const wrapped = pdf.splitTextToSize(notes.trim(), pageWidth - margin * 2);
      pdf.text(wrapped, margin, y);
      y += wrapped.length * 12 + 6;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(
      `Generated ${new Date().toISOString()}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 24,
      { align: "center" },
    );

    const out = pdf.output("arraybuffer");

    if (eventId && departmentId && orgId && userId) {
      try {
        const contentData = {
          eventName,
          date,
          covers,
          notes,
          layout: {
            session: req.body?.session,
            summary: layoutSummary,
            objects: layoutObjects,
            equipment: equipmentRollup,
          },
          items,
          includeConsumables,
        };

        const existing = await beoManagementService.getBEOsByEvent(eventId);
        const matching = existing.find(
          (beo) => beo.departmentId === departmentId,
        );

        if (matching?.id) {
          await beoManagementService.updateBEO(matching.id, {
            contentData,
            changeSummary: "EchoLayout export update",
            userId,
          });
        } else {
          await beoManagementService.createBEO({
            orgId,
            eventId,
            outletId,
            eventDate: date,
            eventTypeCode,
            departmentId,
            contentData,
            createdByUserId: userId,
          });
        }
      } catch (beoError) {
        // eslint-disable-next-line no-console
        console.warn("BEO sync failed:", beoError);
      }
    }

    res.status(200).send(Buffer.from(out));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("BEO export error:", err);
    res.status(500).json({ error: "PDF generation failed" });
  }
}

export async function handleBuilderPreset(
  req: Request<unknown, unknown, unknown, { session?: string }>,
  res: Response,
): Promise<void> {
  try {
    const session = String(req.query.session || "default");
    const preset = builderPresets[session] || ({ session } as ScenePreset);
    res.json(preset);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Builder preset error:", err);
    res.status(500).json({ error: "Failed to fetch preset" });
  }
}

beoExport.get("/beo/preset", handleBuilderPreset);
beoExport.post("/beo/export", beoExportHandler);
