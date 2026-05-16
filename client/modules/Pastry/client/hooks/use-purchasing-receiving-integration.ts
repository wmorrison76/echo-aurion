/**
 * PurchasingReceiving Integration Hook for Pastry
 * Integrates Pastry's EchoRecipePro with PurchasingReceiving workflow
 * Similar to Culinary's integration
 */

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { maestroEventBus, EVENT_TYPES } from "@/modules/MaestroBQT/event-bus";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  onHand: number;
  location: string;
  costPerUnit: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  deliveryDate: string;
  items: PurchaseOrderItem[];
  totalCost: number;
  status: "draft" | "pending" | "approved" | "ordered" | "received";
}

interface PurchaseOrderItem {
  productName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

interface Receipt {
  id: string;
  purchaseOrderId: string;
  receivedItems: ReceivedItem[];
  receivedAt: string;
  receivedBy: string;
}

interface ReceivedItem {
  productName: string;
  quantity: number;
  unit: string;
  lotNumber?: string;
  expiryDate?: string;
}

export function usePurchasingReceivingIntegration(outletId?: string) {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to PurchasingReceiving
      const response = await fetch(`/api/pastry/purchasing/check-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          ingredients: [], // Will be populated by caller
        }),
      });
      if (!response.ok) throw new Error("Failed to load inventory");
      const data = await response.json();
      setInventory(data.data.inventoryChecks || []);
    } catch (error) {
      console.error("[PastryPurchasingReceiving] Failed to load inventory:", error);
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pastry/purchasing/orders?outletId=${outletId}`);
      if (!response.ok) throw new Error("Failed to load purchase orders");
      const data = await response.json();
      setPurchaseOrders(data.data || []);
    } catch (error) {
      console.error("[PastryPurchasingReceiving] Failed to load purchase orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    // Subscribe to inventory updates from PurchasingReceiving
    const unsubscribeInventory = maestroEventBus.subscribeTo(
      EVENT_TYPES.INVENTORY_UPDATED,
      (data) => {
        if (data.payload?.outletId === outletId) {
          loadInventory();
          toast({
            title: "Inventory Updated",
            description: "Inventory has been updated from receiving",
          });
        }
      }
    );

    // Subscribe to delivery status changes
    const unsubscribeDelivery = maestroEventBus.subscribeTo(
      EVENT_TYPES.DELIVERY_STATUS_CHANGED,
      (data) => {
        if (data.payload?.outletId === outletId) {
          loadPurchaseOrders();
        }
      }
    );

    return () => {
      unsubscribeInventory();
      unsubscribeDelivery();
    };
  }, [outletId, loadInventory, loadPurchaseOrders, toast]);

  const createPurchaseRequest = useCallback(async (items: PurchaseOrderItem[]) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pastry/purchasing/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          items,
          requestedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to create purchase request");
      toast({
        title: "Request Created",
        description: "Your purchase request has been sent for approval",
      });
      return true;
    } catch (error) {
      console.error("[PastryPurchasingReceiving] Failed to create request:", error);
      toast({
        title: "Request Failed",
        description: "Failed to create purchase request",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [outletId, toast]);

  return {
    inventory,
    purchaseOrders,
    isLoading,
    loadInventory,
    loadPurchaseOrders,
    createPurchaseRequest,
  };
}
