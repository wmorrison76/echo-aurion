import React from "react";
import { Suspense } from "react";

const Inventory = React.lazy(
  () => import("@/modules/PurchasingReceiving/client/pages/Inventory")
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
      <p className="text-sm text-muted-foreground">Loading Inventory...</p>
    </div>
  </div>
);

export default function InventoryWrapper() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Inventory />
    </Suspense>
  );
}
