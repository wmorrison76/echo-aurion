import { AppLayout } from "@/components/AppLayout";
import { StorageDesigner } from "@/components/inventory/StorageDesigner";
export default function InventoryLayout() {
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-semibold tracking-tight">
            {" "}
            Storage layout &amp; shelf-to-sheet{" "}
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Define rooms, racks, and bins so teams can count shelf-to-sheet and
            AI can audit physical inventory paths.{" "}
          </p>{" "}
        </div>{" "}
        <StorageDesigner />{" "}
      </div>{" "}
    </AppLayout>
  );
}
