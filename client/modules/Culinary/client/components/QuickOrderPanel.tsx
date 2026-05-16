import React, { useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Plus, Minus, Truck, AlertCircle, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IngredientRow } from "@/types/ingredients";
import { getInventoryItem, getCurrentCostPerUnit } from "@/data/inventoryItems";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface OrderLineItem {
  ingredientId: string;
  ingredientName: string;
  supplierId: string;
  supplierName: string;
  sku: string;
  qty: number;
  unit: string;
  packSize: number;
  packUnit: string;
  pricePerPack: number;
  estimatedCost: number;
  leadTimeDays: number;
}

interface QuickOrderPanelProps {
  ingredients: IngredientRow[];
  recipeTitle?: string;
  onOrderCreated?: (items: OrderLineItem[]) => void;
  trigger?: React.ReactNode;
}

export function QuickOrderPanel({
  ingredients,
  recipeTitle,
  onOrderCreated,
  trigger,
}: QuickOrderPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [quantityMultipliers, setQuantityMultipliers] = useState<
    Map<string, number>
  >(new Map());

  // Extract linked ingredients that can be ordered
  const linkedIngredients = useMemo(() => {
    return ingredients
      .filter(
        (ing) =>
          ing.type !== "divider" &&
          ing.inventoryId &&
          ing.item.trim().length > 0,
      )
      .map((ing) => {
        const inventoryItem = getInventoryItem(ing.inventoryId!);
        return {
          ing,
          inventoryItem,
        };
      })
      .filter(
        (item): item is { ing: IngredientRow; inventoryItem: typeof item.inventoryItem } =>
          item.inventoryItem !== undefined,
      );
  }, [ingredients]);

  // Build order line items
  const orderItems = useMemo<OrderLineItem[]>(() => {
    const items: OrderLineItem[] = [];

    for (const { ing, inventoryItem } of linkedIngredients) {
      const multiplier = quantityMultipliers.get(ing.subId) || 1;
      const qty = parseFloat(ing.qty) * multiplier;

      if (isNaN(qty) || qty <= 0 || !inventoryItem.supplierLinks.length)
        continue;

      const primarySupplier = inventoryItem.supplierLinks[0];
      const unitsNeeded = qty;
      const packsNeeded = Math.ceil(
        unitsNeeded / primarySupplier.packSize,
      );
      const estimatedCost = packsNeeded * primarySupplier.pricePerPack;

      items.push({
        ingredientId: inventoryItem.id,
        ingredientName: inventoryItem.canonicalName,
        supplierId: primarySupplier.supplierId,
        supplierName: primarySupplier.supplierName,
        sku: primarySupplier.sku,
        qty: unitsNeeded,
        unit: inventoryItem.primaryUnit,
        packSize: primarySupplier.packSize,
        packUnit: primarySupplier.packUnit,
        pricePerPack: primarySupplier.pricePerPack,
        estimatedCost,
        leadTimeDays: primarySupplier.leadTimeDays,
      });
    }

    return items;
  }, [linkedIngredients, quantityMultipliers]);

  const totalOrderValue = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.estimatedCost, 0),
    [orderItems],
  );

  const maxLeadTime = useMemo(
    () => Math.max(...orderItems.map((item) => item.leadTimeDays), 0),
    [orderItems],
  );

  const handleQuantityChange = useCallback(
    (subId: string, delta: number) => {
      const current = quantityMultipliers.get(subId) || 1;
      const newVal = Math.max(0.5, current + delta);
      const newMap = new Map(quantityMultipliers);
      newMap.set(subId, newVal);
      setQuantityMultipliers(newMap);
    },
    [quantityMultipliers],
  );

  const handleCreateOrder = useCallback(() => {
    if (orderItems.length === 0) {
      toast({
        title: t("common.error", "Error"),
        description: "No items to order. Link ingredients first.",
        variant: "destructive",
      });
      return;
    }

    onOrderCreated?.(orderItems);
    toast({
      title: t("common.success", "Success"),
      description: `Purchase order created for ${orderItems.length} item${orderItems.length !== 1 ? "s" : ""}`,
    });

    setIsOpen(false);
    setQuantityMultipliers(new Map());
  }, [orderItems, onOrderCreated, toast, t]);

  const canOrder = linkedIngredients.length > 0 && orderItems.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={linkedIngredients.length === 0}
          >
            <ShoppingCart className="h-4 w-4" />
            {t("common.order", "Order")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Quick Purchase Order
          </DialogTitle>
          <DialogDescription>
            {recipeTitle && `From: ${recipeTitle}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {linkedIngredients.length === 0 ? (
            <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">No linked ingredients</p>
                    <p className="text-sm text-muted-foreground">
                      Link ingredients to suppliers first to create orders.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Order summary */}
              <Card className="border-[#c8a97e]/25 bg-amber-50/30 dark:border-[#c8a97e]/30/30 dark:bg-neutral-950/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Items to order:
                    </span>
                    <span className="font-semibold">{orderItems.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Estimated cost:
                    </span>
                    <span className="text-lg font-bold text-[#b8976c] dark:text-[#c8a97e]/80">
                      ${totalOrderValue.toFixed(2)}
                    </span>
                  </div>
                  {maxLeadTime > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        Max lead time:
                      </span>
                      <span className="font-semibold">
                        {maxLeadTime} day{maxLeadTime !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              {/* Order line items */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h3 className="text-sm font-semibold">Items</h3>

                <AnimatePresence>
                  {linkedIngredients.map(({ ing, inventoryItem }, index) => {
                    const multiplier = quantityMultipliers.get(ing.subId) || 1;
                    const baseQty = parseFloat(ing.qty);
                    const totalQty = baseQty * multiplier;
                    const orderItem = orderItems.find(
                      (item) => item.ingredientId === inventoryItem.id,
                    );

                    if (!orderItem) return null;

                    const packsNeeded = Math.ceil(
                      totalQty / orderItem.packSize,
                    );

                    return (
                      <motion.div
                        key={ing.subId}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {inventoryItem.canonicalName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  SKU: {orderItem.sku}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {orderItem.supplierName}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-[#b8976c] dark:text-[#c8a97e]/80">
                                ${orderItem.estimatedCost.toFixed(2)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {packsNeeded} pack
                                {packsNeeded !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>
                                Need: {totalQty.toFixed(2)} {orderItem.unit}
                              </p>
                              <p>
                                Pack: {orderItem.packSize} {orderItem.packUnit} @
                                ${orderItem.pricePerPack.toFixed(2)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  handleQuantityChange(ing.subId, -0.5)
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={multiplier.toFixed(1)}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val) && val > 0) {
                                    const newMap = new Map(quantityMultipliers);
                                    newMap.set(ing.subId, val);
                                    setQuantityMultipliers(newMap);
                                  }
                                }}
                                className="h-7 w-12 text-center text-xs"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  handleQuantityChange(ing.subId, 0.5)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <Separator />

              {/* Action buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrder}
                  disabled={!canOrder}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Create Order
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
