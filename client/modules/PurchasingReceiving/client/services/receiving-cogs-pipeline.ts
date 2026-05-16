import type {
  InvoiceExtractionResult,
  StandardizedLineItem,
} from "@shared/api";
import { classifyItem } from "@shared/taxonomy";
import { normalizeUnit, toOunces } from "@shared/api";
import { processInvoiceWithAutomation } from "./invoice-automation-integration";

export interface ReceivingPipelineInput {
  file: File;
  organizationId: string;
  outletId: string;
  invoiceId?: string;
  invoiceNumber?: string;
  vendorName?: string;
  date?: string;
}

export interface ReceivingPipelineResult {
  ocrResultId: string;
  extraction: InvoiceExtractionResult;
  automation: Awaited<ReturnType<typeof processInvoiceWithAutomation>>;
  glAllocations: Array<{
    lineItem: StandardizedLineItem;
    glCode?: string;
    glLabel?: string;
    allocationId?: string;
  }>;
  receiptResponse?: unknown;
}

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function toStandardizedLineItem(
  line: {
    description: string;
    quantity?: number | null;
    amount?: number | null;
  },
  vendor: string,
  date: string,
  invoiceNumber?: string,
): StandardizedLineItem {
  const productName = line.description?.trim() || "Unlabeled Item";
  const standardization = classifyItem(productName);
  const quantity =
    typeof line.quantity === "number" && line.quantity > 0 ? line.quantity : 1;
  const normalizedUnit = normalizeUnit(standardization.standardUnit);
  const totalStandardUnits =
    normalizedUnit === "oz" ? toOunces(quantity, normalizedUnit) : quantity;
  const totalCost = typeof line.amount === "number" ? line.amount : 0;
  const costPerStandardUnit =
    totalStandardUnits > 0 ? totalCost / totalStandardUnits : totalCost;

  return {
    vendor,
    productName,
    standardized: standardization,
    quantityPurchaseUnit: {
      quantity,
      unit: normalizedUnit,
      totalStandardUnits,
    },
    totalCost,
    costPerStandardUnit,
    date,
    invoiceNumber,
  };
}

async function fetchChartOfAccounts(orgId: string) {
  const response = await fetch(
    "/api/invoice-gl-integration/chart-of-accounts",
    {
      headers: { "x-org-id": orgId },
    },
  );
  if (!response.ok) return [];
  return response.json();
}

async function suggestGL(
  orgId: string,
  vendorName: string,
  lineItem: StandardizedLineItem,
) {
  const response = await fetch("/api/invoice-gl-integration/suggest-gl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-org-id": orgId,
    },
    body: JSON.stringify({
      vendorName,
      lineItemDescription: lineItem.productName,
      invoiceAmount: lineItem.totalCost,
      organizationId: orgId,
    }),
  });
  if (!response.ok) return null;
  return response.json();
}

async function createGLAllocation(params: {
  organizationId: string;
  invoiceId: string;
  outletId: string;
  glCodeId: string;
  amount: number;
  itemId?: string;
}) {
  const response = await fetch("/api/invoice-gl-integration/allocations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-org-id": params.organizationId,
    },
    body: JSON.stringify({
      organizationId: params.organizationId,
      invoiceId: params.invoiceId,
      outletId: params.outletId,
      glCodeId: params.glCodeId,
      allocationType: "auto_mapped",
      allocatedAmount: params.amount,
      itemId: params.itemId,
    }),
  });
  if (!response.ok) return null;
  return response.json();
}

export async function processReceivingInvoice(
  input: ReceivingPipelineInput,
): Promise<ReceivingPipelineResult> {
  const base64 = await readFileAsBase64(input.file);
  const cleanBase64 = base64.split(",")[1] || base64;

  const ocrResponse = await fetch("/api/ocr/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-org-id": input.organizationId,
    },
    body: JSON.stringify({
      imageBuffer: cleanBase64,
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
    }),
  });
  if (!ocrResponse.ok) {
    throw new Error("OCR processing failed");
  }
  const ocrData = await ocrResponse.json();
  const ocrResultId = String(ocrData.ocrResultId);

  const ocrResult = await fetch(`/api/ocr/results/${ocrResultId}`, {
    headers: { "x-org-id": input.organizationId },
  });
  if (!ocrResult.ok) throw new Error("Unable to load OCR line items");
  const ocrPayload = await ocrResult.json();

  const vendor = input.vendorName || "Unknown Vendor";
  const invoiceDate = input.date || new Date().toISOString();
  const standardizedLines = (ocrPayload.line_items || []).map((line: any) =>
    toStandardizedLineItem(
      {
        description: line.description,
        quantity: line.quantity,
        amount: line.amount,
      },
      vendor,
      invoiceDate,
      input.invoiceNumber,
    ),
  );

  const extraction: InvoiceExtractionResult = {
    meta: {
      filename: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      pages: 1,
      processedAt: new Date().toISOString(),
    },
    vendor,
    invoiceNumber: input.invoiceNumber,
    date: invoiceDate,
    documentType: "invoice",
    rawItems: [],
    standardized: standardizedLines,
  };

  const automation = await processInvoiceWithAutomation(
    extraction,
    input.invoiceId || ocrResultId,
  );

  const chartOfAccounts = await fetchChartOfAccounts(input.organizationId);
  const glCodeMap = new Map<string, { id: string; description?: string }>();
  if (Array.isArray(chartOfAccounts)) {
    chartOfAccounts.forEach((account: any) => {
      if (account?.code && account?.id) {
        glCodeMap.set(account.code, {
          id: account.id,
          description: account.description,
        });
      }
    });
  }

  const glAllocations: ReceivingPipelineResult["glAllocations"] = [];
  for (const entry of automation.lineItems) {
    const suggestion = await suggestGL(
      input.organizationId,
      vendor,
      entry.lineItem,
    );
    const glCode = suggestion?.suggestedGL;
    const glRecord = glCode ? glCodeMap.get(glCode) : null;
    let allocationId: string | undefined;
    if (glRecord && input.invoiceId) {
      const allocation = await createGLAllocation({
        organizationId: input.organizationId,
        invoiceId: input.invoiceId,
        outletId: input.outletId,
        glCodeId: glRecord.id,
        amount: entry.lineItem.totalCost,
        itemId: entry.match?.match?.inventoryItemId,
      });
      allocationId = allocation?.id;
    }

    glAllocations.push({
      lineItem: entry.lineItem,
      glCode,
      glLabel: suggestion?.glAccountName || glRecord?.description,
      allocationId,
    });
  }

  let receiptResponse: unknown;
  const receiptLines = automation.lineItems
    .filter((entry) => entry.match?.match?.inventoryItemId)
    .map((entry) => ({
      product_id: entry.match?.match?.inventoryItemId,
      location_id: input.outletId,
      qty: entry.lineItem.quantityPurchaseUnit.quantity,
      unit_cost: entry.lineItem.costPerStandardUnit,
      source_ref: input.invoiceNumber || input.invoiceId || ocrResultId,
    }));

  if (receiptLines.length) {
    const receiptRes = await fetch("/api/inventory/receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-org-id": input.organizationId,
      },
      body: JSON.stringify({
        lines: receiptLines,
        user_id: input.organizationId,
        notes: `OCR receipt ${input.invoiceNumber || ocrResultId}`,
      }),
    });
    if (receiptRes.ok) {
      receiptResponse = await receiptRes.json();
    }
  }

  return {
    ocrResultId,
    extraction,
    automation,
    glAllocations,
    receiptResponse,
  };
}
