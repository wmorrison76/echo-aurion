/**
 * PurchasingReceiving → Dashboard Integration
 *
 * Publishes order status events to dashboard mini panels
 */
import { maestroEventBus } from "@/modules/MaestroBQT/event-bus";

/**
 * Hook to publish order status events to dashboard
 */
export function useDashboardOrderIntegration() {
  // Publish event when delivery arrives
  const publishDeliveryArrived = (data: {
    orderId: string;
    poNumber: string;
    vendor: string;
    outletId?: string;
  }) => {
    maestroEventBus.publish({
      type: "order:delivery_arrived",
      source: "PurchasingReceiving",
      payload: data,
      timestamp: Date.now(),
    });
  };

  // Publish event when order checking begins
  const publishOrderChecking = (data: {
    orderId: string;
    poNumber: string;
    vendor: string;
    outletId?: string;
  }) => {
    maestroEventBus.publish({
      type: "order:checking_in",
      source: "PurchasingReceiving",
      payload: data,
      timestamp: Date.now(),
    });
  };

  // Publish event when order is checked in
  const publishOrderCheckedIn = (data: {
    orderId: string;
    poNumber: string;
    vendor: string;
    outletId?: string;
    itemsCount?: number;
  }) => {
    maestroEventBus.publish({
      type: "order:checked_in",
      source: "PurchasingReceiving",
      payload: data,
      timestamp: Date.now(),
    });
  };

  // Publish event when invoice is scanned
  const publishInvoiceScanned = (data: {
    invoiceId: string;
    vendor: string;
    outletId?: string;
    lineItemCount: number;
  }) => {
    maestroEventBus.publish({
      type: "invoice:scanned",
      source: "PurchasingReceiving",
      payload: data,
      timestamp: Date.now(),
    });
  };

  // Publish event when inventory is updated
  const publishInventoryUpdated = (data: {
    outletId: string;
    itemCount: number;
    totalValue: number;
  }) => {
    maestroEventBus.publish({
      type: "inventory:updated",
      source: "PurchasingReceiving",
      payload: data,
      timestamp: Date.now(),
    });
  };

  return {
    publishDeliveryArrived,
    publishOrderChecking,
    publishOrderCheckedIn,
    publishInvoiceScanned,
    publishInventoryUpdated,
  };
}
