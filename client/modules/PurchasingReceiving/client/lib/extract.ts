import type {
  InvoiceExtractionResult,
  InvoiceHeader,
  InvoiceLineItemRaw,
  StandardizedLineItem,
} from "@shared/api";
import { toOunces } from "@shared/api";
import { classifyItem } from "../../shared/taxonomy";

import { LearningStore } from "@/lib/learn";
import {
  applyInvoiceVendorNormalization,
  ensureInvoiceHeader,
} from "@/lib/invoice";
import { mapInvoiceLineToGL, type PropertyType } from "@/lib/gl_autotag";

const moneyRegex =
  /\$?\s*(?:[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/g;
const qtyUnitRegex =
  /((?:\d+[\/.\sxX]*\d*)+)\s*(case|cs|cases|lb|lbs|pound|pounds|oz|ounce|ounces|g|gram|grams|kg|kilogram|kilograms|bunch|ea|each|ct|count|doz|dozen|pcs?|pieces|pkg|package|bag|jar|bottle|box|carton|unit|units)?/i;

const unitAliases: Record<string, string> = {
  doj: "doz",
  doz: "doz",
  dozen: "doz",
  pss: "pcs",
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  pkg: "pkg",
  pkgs: "pkg",
  ea: "ea",
  each: "ea",
  ct: "ct",
  cs: "cs",
  case: "cs",
  cases: "cs",
  lb: "lb",
  lbs: "lb",
  oz: "oz",
  ounce: "oz",
  g: "g",
  kg: "kg",
};

function normalizeUnit(rawUnit: string | undefined): string | undefined {
  if (!rawUnit) return undefined;
  const lower = rawUnit.toLowerCase().trim();
  return unitAliases[lower] || lower;
}

function parseMoney(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const num = Number(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(num) ? num : undefined;
}

function detectDocumentType(
  text: string,
): "invoice" | "credit_memo" | "debit_memo" {
  const lower = text.toLowerCase();
  if (
    lower.includes("credit memo") ||
    lower.includes("vendor credit") ||
    /\bcredit\b.*\bmemo\b/i.test(text)
  )
    return "credit_memo";
  if (lower.includes("debit memo") || /\bdebit\b.*\bmemo\b/i.test(text))
    return "debit_memo";
  return "invoice";
}

function toISOIfDate(s?: string | null): string | undefined {
  if (!s) return undefined;
  const t = String(s).trim();
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const dt = new Date(
      Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])),
    );
    return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
  }
  const mdys = t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (mdys) {
    let y = Number(mdys[3]);
    if (y < 100) y += 2000;
    const try1 = new Date(Date.UTC(y, Number(mdys[1]) - 1, Number(mdys[2])));
    if (!Number.isNaN(try1.getTime())) return try1.toISOString();
  }
  const dt = new Date(t);
  return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

export function parseHeader(text: string): InvoiceHeader {
  const getLineVal = (label: RegExp) => {
    const match = text.match(label);
    if (!match?.[1]) return undefined;
    return match[1].trim();
  };

  const sellerName =
    getLineVal(/(?:Vendor|From|Seller|Remit To|Company)[:\s]+([^\n]+)/i) ||
    getLineVal(
      /^([A-Z][A-Za-z0-9\s&\-,.()]*)\n(?:Address|Street|City|Phone|Tel)/im,
    );

  const customerName = getLineVal(
    /(?:Bill To|Billed To|Customer|To|Ship To)[:\s]+([^\n]+)/i,
  );

  const invoiceNumber =
    getLineVal(/Invoice\s*(?:#|No\.?|Number)[:\s]*([^\n]+)/i) ||
    getLineVal(/Inv\.?\s*(?:#|No\.?|Number)?[:\s]*([0-9\-]+)/i);

  const invoiceDate =
    getLineVal(/(?:Invoice Date|Inv Date|Date)[:\s]*([^\n]+)/i) || undefined;
  const dueDate =
    getLineVal(/(?:Due Date|Payment Due|Due)[:\s]*([^\n]+)/i) || undefined;
  const poNumber =
    getLineVal(/(?:PO|P\.O\.?|Purchase Order)[:\s]*([^\n]+)/i) || undefined;

  const subtotal = parseMoney(getLineVal(/Subtotal[:\s]*([$0-9.,\-]+)/i));
  const taxAmount = parseMoney(
    getLineVal(/(?:Tax|VAT)[^\n]*[:\s]*([$0-9.,\-]+)/i),
  );
  const total = parseMoney(getLineVal(/Total[^\n]*[:\s]*([$0-9.,\-]+)/i));

  const header = ensureInvoiceHeader({
    seller: { name: sellerName, company: sellerName },
    customer: { name: customerName },
    invoiceLabelPresent: /\bINVOICE\b/i.test(text),
    invoiceNumber: invoiceNumber
      ? invoiceNumber.replace(/[^\d\-]/g, "").slice(0, 24)
      : undefined,
    invoiceDate: toISOIfDate(invoiceDate),
    dueDate: toISOIfDate(dueDate),
    poNumber,
    subtotal,
    taxes: taxAmount ? [{ label: "Tax", amount: taxAmount }] : undefined,
    total,
  } as InvoiceHeader);

  return header;
}

export function heuristicExtract(text: string): InvoiceLineItemRaw[] {
  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: InvoiceLineItemRaw[] = [];
  let lineNumber = 0;

  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (
      normalized.startsWith("subtotal") ||
      normalized.startsWith("total") ||
      normalized.startsWith("amount due")
    )
      break;
    if (line.length < 3) continue;

    const moneyMatches = Array.from(line.matchAll(moneyRegex));
    const prices = moneyMatches
      .map((m) => ({
        raw: m[0],
        value: Number(m[0].replace(/[^0-9.\-]/g, "")),
        index: m.index || 0,
      }))
      .filter((p) => Number.isFinite(p.value));
    if (!prices.length) continue;

    const lastPrice = prices[prices.length - 1];
    const cost = lastPrice.value;
    if (!Number.isFinite(cost) || cost <= 0) continue;

    const beforePrice = line.slice(0, lastPrice.index).trim();
    const qtyMatch = beforePrice.match(qtyUnitRegex);
    let quantity: number | undefined;
    let unit: string | undefined;

    if (qtyMatch) {
      const rawQty = qtyMatch[1];
      const q = Number(rawQty.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(q) && q > 0) quantity = q;
      unit = normalizeUnit(qtyMatch[2]);
    }

    const nameGuess = beforePrice
      .replace(qtyUnitRegex, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[(\-–—]+|[)\-–—]+$/g, "")
      .trim();
    if (!nameGuess || nameGuess.length < 2) continue;

    lineNumber += 1;
    items.push({
      rawText: line,
      productName: nameGuess,
      quantity,
      unit,
      packSize: null,
      totalCost: cost,
      lineNumber,
      confidence: quantity && unit ? 0.85 : 0.6,
      flags: quantity && unit ? [] : ["qty_or_unit_missing"],
    } as InvoiceLineItemRaw);
  }

  return items;
}

export function standardize(
  raw: InvoiceLineItemRaw,
  vendor: string,
  dateISO: string,
  invoiceNumber?: string,
  propertyType: PropertyType = "resort",
): StandardizedLineItem | null {
  if (!raw.productName) return null;
  const std = classifyItem(raw.productName);

  let totalStandardUnits = 0;
  if (raw.quantity && raw.unit)
    totalStandardUnits = toOunces(raw.quantity, raw.unit);
  if (!totalStandardUnits && raw.quantity) totalStandardUnits = raw.quantity;

  const totalCost = raw.totalCost || 0;
  const costPer = totalStandardUnits ? totalCost / totalStandardUnits : 0;

  const glMapping = mapInvoiceLineToGL(raw.productName, propertyType, vendor);

  return {
    vendor,
    productName: raw.productName,
    standardized: std,
    quantityPurchaseUnit: {
      quantity: raw.quantity || 1,
      unit: raw.unit || std.standardUnit,
      totalStandardUnits,
    },
    totalCost,
    costPerStandardUnit: costPer,
    date: dateISO,
    invoiceNumber,
    glCode: glMapping.code,
    glLabel: glMapping.label,
    glConfidence: glMapping.confidence,
  } as StandardizedLineItem;
}

export function extractInvoiceFromText(
  text: string,
  meta: { filename: string; mimeType: string; pages?: number },
  propertyType: PropertyType = "resort",
): InvoiceExtractionResult {
  const documentType = detectDocumentType(text);
  const header = parseHeader(text);

  const invoiceNumber =
    text.match(
      /(?:Invoice|Inv)\s*(?:#|No\.?|Number)[:\s]*([A-Za-z0-9-]+)/i,
    )?.[1] ||
    header.invoiceNumber ||
    undefined;

  const dateISO = header.invoiceDate || new Date().toISOString();

  let vendor =
    header.seller?.name || header.seller?.company || "Unknown Vendor";
  let rawItems = heuristicExtract(text);

  rawItems = LearningStore.applyToRawItems(rawItems as any[], vendor);

  let standardized = rawItems
    .map((r) => standardize(r, vendor, dateISO, invoiceNumber, propertyType))
    .filter(Boolean) as StandardizedLineItem[];

  const base: InvoiceExtractionResult = {
    meta: {
      filename: meta.filename,
      mimeType: meta.mimeType,
      pages: meta.pages ?? 1,
      processedAt: new Date().toISOString(),
    },
    vendor,
    invoiceNumber,
    date: dateISO,
    documentType,
    rawItems,
    standardized,
    header,
  } as InvoiceExtractionResult;

  const { normalized } = applyInvoiceVendorNormalization(base, { text });
  if (normalized.vendor && normalized.vendor !== vendor) {
    vendor = normalized.vendor;
    standardized = rawItems
      .map((r) =>
        standardize(
          r,
          vendor,
          normalized.date || dateISO,
          normalized.invoiceNumber,
          propertyType,
        ),
      )
      .filter(Boolean) as StandardizedLineItem[];
    normalized.standardized = standardized;
  }

  return normalized;
}
