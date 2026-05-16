import { AppLayout } from "@/components/AppLayout";
import { PhysicalInventoryWorkspace } from "@/components/inventory/PhysicalInventoryWorkspace";
export default function InventoryPhysicalCount() {
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-semibold tracking-tight">
            {" "}
            Physical inventory workspace{" "}
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Record shelf-to-sheet counts by area, capture quantities in one
            pass, and post the session for audit.{" "}
          </p>{" "}
        </div>{" "}
        <PhysicalInventoryWorkspace />{" "}
      </div>{" "}
    </AppLayout>
  );
}
