import type {
  CommissaryTransfer,
  TransferLineItem,
} from "../components/inventory/CommissaryTransferForm";
import type { PurchaseOrder, POItem } from "@shared/purchasing";
import {
  Store,
  id as makeId,
} from "@/modules/PurchasingReceiving/client/lib/store";

type RoutingResult = {
  transferLines: TransferLineItem[];
  purchaseOrders: PurchaseOrder[];
};

export function buildCommissaryFulfillment(
  transfer: CommissaryTransfer,
): RoutingResult {
  const transferLines: TransferLineItem[] = [];
  const poLines: Array<TransferLineItem & { vendorId: string | null }> = [];

  transfer.lines.forEach((line) => {
    const available = Math.max(0, line.sourceAvailability || 0);
    const requested = Math.max(0, line.quantity || 0);
    const transferQty = Math.min(requested, available);
    const vendorQty = Math.max(0, requested - available);

    if (transferQty > 0) {
      transferLines.push({ ...line, quantity: transferQty });
    }

    if (vendorQty > 0) {
      const item = Store.listItems().find(
        (entry) => entry.id === line.productCode,
      );
      const vendorId = item?.purchaseUnits?.[0]?.vendorId ?? null;
      poLines.push({ ...line, quantity: vendorQty, vendorId });
    }
  });

  const poGroups = new Map<string, POItem[]>();
  poLines.forEach((line) => {
    const vendorKey = line.vendorId || "unassigned";
    const key = transfer.poName ? `named:${transfer.poName}` : vendorKey;
    const items = poGroups.get(key) ?? [];
    items.push({
      id: makeId(),
      itemId: line.productCode,
      sku: null,
      productName: line.productName,
      qty: line.quantity,
      unit: line.unitOfMeasure,
      expectedDate: transfer.expectedDeliveryDate ?? null,
      glCodeId: null,
      vendorId: line.vendorId ?? null,
      unitPrice: line.unitCost,
      receivedQty: null,
    });
    poGroups.set(key, items);
  });

  const purchaseOrders: PurchaseOrder[] = [];
  poGroups.forEach((items, key) => {
    const vendorId = items[0]?.vendorId ?? "unassigned";
    const number =
      transfer.poName || `PO-${new Date().toISOString().slice(0, 10)}-${key}`;
    const po: PurchaseOrder = {
      id: makeId(),
      number,
      vendorId,
      outletId: transfer.fromOutlet,
      status: "created",
      createdAt: new Date().toISOString(),
      eta: transfer.expectedDeliveryDate ?? null,
      expectedDate: transfer.expectedDeliveryDate ?? null,
      notes: transfer.reason || null,
      items,
    };
    purchaseOrders.push(po);
  });

  return { transferLines, purchaseOrders };
}
