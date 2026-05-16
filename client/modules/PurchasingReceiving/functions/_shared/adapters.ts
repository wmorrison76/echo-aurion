export type ERP = "r365" | "simphony" | "netsuite";
export type Gateway = "stripe" | "square" | "adyen";
export interface InvoiceHeader {
  id: string;
  org_id: string;
  vendor: string;
  total: number;
  status: string;
}
export interface InvoiceLine {
  id: string;
  invoice_id: string;
  item_code?: string;
  description?: string;
  qty?: number;
  unit_price?: number;
  gl_code?: string;
}
export interface ERPResult {
  status: "success" | "failed";
  erp_id?: string;
  message?: string;
}
export interface PayResult {
  payment_status: "authorized" | "captured" | "failed";
  transaction_id?: string;
  message?: string;
  gateway: Gateway;
}
const NUMBER_PATTERN = /-?\d+(?:[.,]\d+)?/;
const CURRENCY_PATTERN = /-?\$?\s*\d+(?:[.,]\d+)?/;
const UOM_ALIASES: Record<string, string> = {
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  ounces: "oz",
  ounce: "oz",
  ea: "each",
  pk: "pack",
};
export interface NormalizeContext {
  invoice?: { vendor?: string | null; total?: number | null };
  ocrText?: string;
  engine?: string;
  template?: { templateId?: string; vendorName?: string; score?: number };
  confidence?: number;
}
export interface NormalizedLine {
  item_code?: string | null;
  description: string;
  qty?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  gl_code?: string | null;
  uom?: string | null;
  lot_number?: string | null;
  expiration_date?: string | null;
  source?: string | null;
}
export interface NormalizedPayload {
  header: {
    vendor?: string | null;
    total?: number | null;
    invoice_number?: string | null;
    invoice_date?: string | null;
    confidence?: number | null;
    engine?: string | null;
    template?: { id?: string | null; score?: number | null } | null;
  };
  lines: NormalizedLine[];
  metrics: { lineCount: number; totalQuantity: number; subtotal: number };
  source: {
    engine?: string | null;
    templateMatchScore?: number | null;
    rawTextSample?: string | null;
  };
}
function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const match = value.match(NUMBER_PATTERN);
    if (!match) return null;
    const parsed = Number(match[0].replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function toCurrency(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const match = value.match(CURRENCY_PATTERN);
    if (!match) return null;
    const cleaned = match[0].replace(/[^0-9.,-]/g, "").replace(/,/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function sanitizeUom(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return UOM_ALIASES[normalized] ?? normalized;
}
function deriveVendor(raw: any, context: NormalizeContext): string | null {
  const templateVendor = context.template?.vendorName;
  const headerVendor = raw?.header?.vendor ?? raw?.vendor ?? raw?.seller?.name;
  const fallbackVendor = context.invoice?.vendor;
  const vendor = templateVendor || headerVendor || fallbackVendor;
  if (!vendor) return null;
  const cleaned = String(vendor).trim();
  return cleaned.length ? cleaned : null;
}
function deriveInvoiceNumber(raw: any): string | null {
  const candidates = [
    raw?.header?.invoice_number,
    raw?.invoice_number,
    raw?.number,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = String(candidate).match(/\d[\w-]*/);
    if (match) return match[0];
  }
  return null;
}
function deriveInvoiceDate(raw: any): string | null {
  const candidates = [raw?.header?.invoice_date, raw?.invoice_date, raw?.date];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = String(candidate).match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
    if (match) return match[0];
  }
  return null;
}
function normalizeLines(rawLines: any[]): NormalizedLine[] {
  const normalized: NormalizedLine[] = [];
  rawLines.forEach((line, index) => {
    const description = (
      line?.description ??
      line?.name ??
      line?.item_description ??
      ""
    )
      .toString()
      .replace(/\s+/g, "")
      .trim();
    if (!description) {
      return;
    }
    const itemCode = (line?.item_code ??
      line?.code ??
      line?.sku ??
      line?.product_code ??
      null) as string | null;
    const qty = toNumber(
      line?.qty ??
        line?.quantity ??
        line?.qty_ordered ??
        line?.qty_received ??
        null,
    );
    const unitPrice = toCurrency(
      line?.unit_price ?? line?.price ?? line?.unit_cost ?? null,
    );
    const totalPrice = toCurrency(
      line?.total_price ??
        line?.ext_price ??
        line?.extended_price ??
        (qty != null && unitPrice != null ? qty * unitPrice : null),
    );
    const uom = sanitizeUom(line?.uom ?? line?.unit);
    const glCode = line?.gl_code ?? line?.gl ?? line?.account ?? null;
    const lotNumber = line?.lot_number ?? line?.lot ?? null;
    const expirationDate = line?.expiration_date ?? line?.expiry ?? null;
    normalized.push({
      item_code: itemCode ? String(itemCode) : null,
      description,
      qty,
      unit_price: unitPrice,
      total_price: totalPrice,
      gl_code: glCode ? String(glCode) : null,
      uom: uom ? String(uom) : null,
      lot_number: lotNumber ? String(lotNumber) : null,
      expiration_date: expirationDate ? String(expirationDate) : null,
      source: line?.source ? String(line.source) : index.toString(),
    });
  });
  return normalized;
}
export function normalizeOcrPayload(
  raw: any,
  context: NormalizeContext = {},
): NormalizedPayload {
  const parsed = raw ?? {};
  const headerVendor = deriveVendor(parsed, context);
  const headerTotal = toCurrency(
    parsed?.header?.total ?? parsed?.total ?? context.invoice?.total ?? null,
  );
  const invoiceNumber = deriveInvoiceNumber(parsed);
  const invoiceDate = deriveInvoiceDate(parsed);
  const rawLines = Array.isArray(parsed?.lines)
    ? parsed.lines
    : Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed)
        ? parsed
        : [];
  const lines = normalizeLines(rawLines);
  const subtotal = lines.reduce(
    (sum, line) =>
      sum + (line.total_price ?? (line.qty ?? 0) * (line.unit_price ?? 0)),
    0,
  );
  const totalQuantity = lines.reduce((sum, line) => sum + (line.qty ?? 0), 0);
  const resolvedTotal =
    headerTotal ?? (subtotal ? Number(subtotal.toFixed(2)) : null);
  return {
    header: {
      vendor: headerVendor,
      total: resolvedTotal,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      confidence: context.confidence ?? null,
      engine: context.engine ?? null,
      template: context.template?.templateId
        ? {
            id: context.template.templateId ?? null,
            score: context.template.score ?? null,
          }
        : context.template?.score != null
          ? { id: null, score: context.template.score }
          : null,
    },
    lines,
    metrics: {
      lineCount: lines.length,
      totalQuantity: Number(totalQuantity.toFixed(4)),
      subtotal: Number(subtotal.toFixed(2)),
    },
    source: {
      engine: context.engine ?? null,
      templateMatchScore: context.template?.score ?? null,
      rawTextSample: context.ocrText ? context.ocrText.slice(0, 512) : null,
    },
  };
}
export async function exportToERP(
  erp: ERP,
  header: InvoiceHeader,
  lines: InvoiceLine[],
  orgSecrets: Record<string, string | undefined>,
): Promise<ERPResult> {
  switch (erp) {
    case "r365":
      return {
        status: "success",
        erp_id: `R365-${header.id}`,
        message: "Stub export OK",
      };
    case "simphony":
      return {
        status: "success",
        erp_id: `SIM-${header.id}`,
        message: "Stub export OK",
      };
    case "netsuite":
      return {
        status: "success",
        erp_id: `NS-${header.id}`,
        message: "Stub export OK",
      };
    default:
      return { status: "failed", message: "Unsupported ERP" };
  }
}
export async function payWithGateway(
  gateway: Gateway,
  amount: number,
  orgSecrets: Record<string, string | undefined>,
): Promise<PayResult> {
  const transaction_id = `${gateway.toUpperCase()}-${crypto.randomUUID()}`;
  return {
    payment_status: "authorized",
    gateway,
    transaction_id,
    message: "Stub payment OK",
  };
}
