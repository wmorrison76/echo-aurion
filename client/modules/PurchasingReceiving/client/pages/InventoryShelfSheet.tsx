import { AppLayout } from "@/components/AppLayout";
import { ShelfToSheetPlanner } from "@/components/inventory/ShelfToSheetPlanner";
export default function InventoryShelfSheet() {
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-semibold tracking-tight">
            {" "}
            Shelf-to-sheet layout{" "}
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Review every room, rack, and bin in sequence, export a count sheet,
            and monitor AI variance flags before cycle counts.{" "}
          </p>{" "}
        </div>{" "}
        <ShelfToSheetPlanner />{" "}
      </div>{" "}
    </AppLayout>
  );
}
