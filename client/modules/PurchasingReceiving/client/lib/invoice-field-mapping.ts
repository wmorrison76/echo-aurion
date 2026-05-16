/** * Invoice field mapping for training * Stores visual selections and field associations */ export interface BoundingBox {
  x: number; // percentage 0-100 y: number; // percentage 0-100 width: number; // percentage 0-100 height: number; // percentage 0-100
}
export interface FieldMapping {
  fieldName: string;
  boundingBox: BoundingBox;
  pageNumber: number;
  extractedValue?: string;
  confidence?: number;
  createdAt: string;
}
export interface InvoiceFieldTemplate {
  fieldName: string;
  label: string;
  category: "header" | "items" | "totals" | "terms" | "custom";
  editable: boolean;
  isCustom?: boolean;
  placeholder?: string;
}
export interface VendorFieldMapping {
  vendorName: string;
  mappings: FieldMapping[];
  lastUpdated: string;
  pageCount: number;
} /** * Standard invoice fields template */
export const STANDARD_INVOICE_FIELDS: InvoiceFieldTemplate[] = [
  // Header fields { fieldName:"vendor", label:"Vendor Name", category:"header", editable: true, }, { fieldName:"vendorContact", label:"Sales Rep / Contact", category:"header", editable: true, }, { fieldName:"invoiceNumber", label:"Invoice Number", category:"header", editable: true, }, { fieldName:"invoiceDate", label:"Invoice Date", category:"header", editable: true, }, { fieldName:"dueDate", label:"Due Date", category:"header", editable: true, }, { fieldName:"poNumber", label:"PO Number", category:"header", editable: true, }, { fieldName:"orderNumber", label:"Order Number / Outlet", category:"header", editable: true, }, { fieldName:"terms", label:"Payment Terms", category:"header", editable: true, }, // Item fields { fieldName:"items", label:"Line Items", category:"items", editable: false, }, { fieldName:"itemQty", label:"Item Quantity", category:"items", editable: true, }, { fieldName:"itemUnit", label:"Unit of Measure", category:"items", editable: true, }, { fieldName:"itemDescription", label:"Description", category:"items", editable: true, }, { fieldName:"itemPrice", label:"Unit Price", category:"items", editable: true, }, { fieldName:"itemTotal", label:"Line Total", category:"items", editable: true, }, // Totals fields { fieldName:"subtotal", label:"Subtotal", category:"totals", editable: true, }, { fieldName:"tax", label:"Tax", category:"totals", editable: true }, { fieldName:"shipping", label:"Shipping", category:"totals", editable: true, }, { fieldName:"total", label:"Total Amount", category:"totals", editable: true, }, // Terms fields { fieldName:"paymentMethod", label:"Payment Method", category:"terms", editable: true, }, { fieldName:"currency", label:"Currency", category:"terms", editable: true, }, { fieldName:"notes", label:"Notes", category:"terms", editable: true },
]; /** * Add custom field to template */
export function addCustomField(
  fieldName: string,
  label: string,
): InvoiceFieldTemplate {
  return {
    fieldName: fieldName.toLowerCase().replace(/\s+/g, "_"),
    label,
    category: "custom",
    editable: true,
    isCustom: true,
    placeholder: `Enter ${label.toLowerCase()}`,
  };
} /** * Calculate overlap between bounding boxes */
export function calculateBoxOverlap(
  box1: BoundingBox,
  box2: BoundingBox,
): number {
  const xOverlap = Math.max(
    0,
    Math.min(box1.x + box1.width, box2.x + box2.width) -
      Math.max(box1.x, box2.x),
  );
  const yOverlap = Math.max(
    0,
    Math.min(box1.y + box1.height, box2.y + box2.height) -
      Math.max(box1.y, box2.y),
  );
  const overlapArea = xOverlap * yOverlap;
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const minArea = Math.min(box1Area, box2Area);
  return minArea > 0 ? overlapArea / minArea : 0;
}
