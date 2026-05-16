/**
 * Order Export Utilities
 * Handles CSV and PDF export for purchase orders
 */

export interface OrderLineItem {
  ingredientId: string;
  ingredientName: string;
  inventoryId?: string;
  supplierId: string;
  supplierName: string;
  supplierSku?: string;
  quantity: number;
  unit: string;
  packSize?: number;
  packUnit?: string;
  unitCost: number;
  totalCost: number;
  leadTimeDays?: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  vendorName: string;
  vendorEmail?: string;
  vendorPhone?: string;
  organizationName?: string;
  organizationAddress?: string;
  lineItems: OrderLineItem[];
  subtotal: number;
  tax?: number;
  shipping?: number;
  total: number;
  notes?: string;
  poNumber?: string;
  requestedDeliveryDate?: string;
  currency: string;
}

/**
 * Export purchase order to CSV format
 */
export function exportOrderToCSV(order: PurchaseOrder): string {
  const headers = [
    "Item Name",
    "Supplier",
    "SKU",
    "Quantity",
    "Unit",
    "Pack Size",
    "Unit Cost",
    "Total Cost",
    "Lead Time (Days)",
    "Notes",
  ];

  const rows = order.lineItems.map((item) => [
    item.ingredientName,
    item.supplierName,
    item.supplierSku || "",
    item.quantity.toString(),
    item.unit,
    item.packSize ? `${item.packSize}${item.packUnit || ""}` : "",
    `${order.currency} ${item.unitCost.toFixed(2)}`,
    `${order.currency} ${item.totalCost.toFixed(2)}`,
    item.leadTimeDays?.toString() || "",
    item.notes || "",
  ]);

  // Add summary rows
  rows.push([]);
  rows.push(["", "", "", "", "", "Subtotal", "", `${order.currency} ${order.subtotal.toFixed(2)}`]);
  if (order.tax) {
    rows.push(["", "", "", "", "", "Tax", "", `${order.currency} ${order.tax.toFixed(2)}`]);
  }
  if (order.shipping) {
    rows.push(["", "", "", "", "", "Shipping", "", `${order.currency} ${order.shipping.toFixed(2)}`]);
  }
  rows.push(["", "", "", "", "", "Total", "", `${order.currency} ${order.total.toFixed(2)}`]);

  // Convert to CSV
  const csvContent = [
    `PO Number: ${order.poNumber || "N/A"}`,
    `Date: ${order.date}`,
    `Vendor: ${order.vendorName}`,
    order.vendorEmail ? `Email: ${order.vendorEmail}` : "",
    order.vendorPhone ? `Phone: ${order.vendorPhone}` : "",
    order.organizationName ? `Organization: ${order.organizationName}` : "",
    order.organizationAddress ? `Address: ${order.organizationAddress}` : "",
    "",
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ]
    .filter(Boolean)
    .join("\n");

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadOrderAsCSV(order: PurchaseOrder, filename?: string): void {
  const csv = exportOrderToCSV(order);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename || `PO_${order.id}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export purchase order to JSON format
 */
export function exportOrderToJSON(order: PurchaseOrder): string {
  return JSON.stringify(order, null, 2);
}

/**
 * Download JSON file
 */
export function downloadOrderAsJSON(order: PurchaseOrder, filename?: string): void {
  const json = exportOrderToJSON(order);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename || `PO_${order.id}_${new Date().toISOString().split("T")[0]}.json`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate HTML representation of purchase order (for PDF conversion)
 */
export function generateOrderHTML(order: PurchaseOrder): string {
  const tableRows = order.lineItems
    .map(
      (item) =>
        `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.ingredientName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.supplierName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.supplierSku || "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.unit}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${order.currency} ${item.unitCost.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${order.currency} ${item.totalCost.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Order</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .header { margin-bottom: 20px; }
    .details { margin-bottom: 20px; }
    .details p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background-color: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #333; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    .summary { margin-top: 20px; text-align: right; }
    .summary p { margin: 5px 0; }
    .total { font-size: 18px; font-weight: bold; color: #333; }
  </style>
</head>
<body>
  <h1>Purchase Order</h1>
  
  <div class="header">
    <p><strong>PO Number:</strong> ${order.poNumber || "N/A"}</p>
    <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
    <p><strong>Requested Delivery:</strong> ${order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString() : "N/A"}</p>
  </div>

  <div class="details">
    <h3>Vendor Information</h3>
    <p><strong>Vendor:</strong> ${order.vendorName}</p>
    ${order.vendorEmail ? `<p><strong>Email:</strong> ${order.vendorEmail}</p>` : ""}
    ${order.vendorPhone ? `<p><strong>Phone:</strong> ${order.vendorPhone}</p>` : ""}
  </div>

  ${order.organizationName ? `<div class="details"><h3>Organization</h3><p>${order.organizationName}</p>${order.organizationAddress ? `<p>${order.organizationAddress}</p>` : ""}</div>` : ""}

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Supplier</th>
        <th>SKU</th>
        <th style="text-align: right;">Qty</th>
        <th>Unit</th>
        <th style="text-align: right;">Unit Cost</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="summary">
    <p><strong>Subtotal:</strong> ${order.currency} ${order.subtotal.toFixed(2)}</p>
    ${order.tax ? `<p><strong>Tax:</strong> ${order.currency} ${order.tax.toFixed(2)}</p>` : ""}
    ${order.shipping ? `<p><strong>Shipping:</strong> ${order.currency} ${order.shipping.toFixed(2)}</p>` : ""}
    <p class="total"><strong>Total:</strong> ${order.currency} ${order.total.toFixed(2)}</p>
  </div>

  ${order.notes ? `<div class="details"><h3>Notes</h3><p>${order.notes.replace(/\n/g, "<br>")}</p></div>` : ""}
</body>
</html>
  `;
}

/**
 * Copy order details to clipboard
 */
export function copyOrderToClipboard(order: PurchaseOrder): Promise<void> {
  const text = `
Purchase Order
PO Number: ${order.poNumber || "N/A"}
Date: ${order.date}

Vendor: ${order.vendorName}
${order.vendorEmail ? `Email: ${order.vendorEmail}` : ""}
${order.vendorPhone ? `Phone: ${order.vendorPhone}` : ""}

Items:
${order.lineItems
  .map(
    (item) =>
      `- ${item.quantity} ${item.unit} of ${item.ingredientName} from ${item.supplierName} @ ${order.currency} ${item.unitCost.toFixed(2)} = ${order.currency} ${item.totalCost.toFixed(2)}`,
  )
  .join("\n")}

Total: ${order.currency} ${order.total.toFixed(2)}
  `.trim();

  return navigator.clipboard.writeText(text);
}

/**
 * Create a purchase order from recipe ingredients
 */
export function createOrderFromRecipeIngredients(
  recipeTitle: string,
  ingredients: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    supplierId: string;
    supplierName: string;
    supplierSku?: string;
    unitCost: number;
  }>,
  vendorName: string,
  currency: string = "USD",
): PurchaseOrder {
  const now = new Date().toISOString().split("T")[0];
  const lineItems = ingredients.map((item) => ({
    ingredientId: `ing-${item.ingredientName.toLowerCase().replace(/\s+/g, "-")}`,
    ingredientName: item.ingredientName,
    supplierId: item.supplierId,
    supplierName: item.supplierName,
    supplierSku: item.supplierSku,
    quantity: item.quantity,
    unit: item.unit,
    unitCost: item.unitCost,
    totalCost: item.quantity * item.unitCost,
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalCost, 0);

  return {
    id: `po-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: now,
    vendorName,
    poNumber: `PO-${now.replace(/-/g, "")}`,
    lineItems,
    subtotal,
    total: subtotal,
    currency,
  };
}
