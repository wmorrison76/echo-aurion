import { lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Package } from "lucide-react";

const OrderingInventoryApp = lazy(() => import("./client/App"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
      <p className="text-sm text-muted-foreground">
        Loading Ordering & Inventory...
      </p>
    </div>
  </div>
);

export default function OrderingInventoryModule() {
  const { user } = useAuth();

  // Role-based access: Purchasing & Receiving only accessible to authorized staff
  const PURCHASING_RECEVING_ROLES = [
    "ADMIN",
    "PURCHASING_MANAGER",
    "RECEIVING_MANAGER",
    "INVENTORY_MANAGER",
    "STOREROOM_MANAGER",
    "COMMISSARY_MANAGER",
    "FINANCE_MANAGER",
    "GENERAL_MANAGER",
  ];

  const hasAccess = () => {
    if (!user) return true;
    const userRole = String(
      (user as any).role || (user as any).userRole || "STAFF",
    ).toUpperCase();
    return (
      PURCHASING_RECEVING_ROLES.includes(userRole) ||
      PURCHASING_RECEVING_ROLES.some((role) => role === "ADMIN")
    );
  };

  if (!hasAccess()) {
    return (
      <div
        className="flex items-center justify-center w-full bg-background"
        style={{
          width: "100%",
          height: "100%",
          minHeight: 400,
          flex: "1 1 auto",
          overflow: "auto",
        }}
      >
        <div className="text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            Ordering & Inventory is only accessible to authorized staff.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col bg-background"
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
        flex: "1 1 auto",
        overflow: "auto",
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <OrderingInventoryApp />
      </Suspense>
    </div>
  );
}
