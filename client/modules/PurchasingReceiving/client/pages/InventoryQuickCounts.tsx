import { AppLayout } from "@/components/AppLayout";
import { QuickCountPlanner } from "@/components/inventory/QuickCountPlanner";
export default function InventoryQuickCounts() {
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-semibold tracking-tight">
            {" "}
            Quick counts &amp; AI controls{" "}
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Schedule spot checks, enforce cadences per outlet, and apply
            AI-powered par adjustments before service.{" "}
          </p>{" "}
        </div>{" "}
        <QuickCountPlanner />{" "}
      </div>{" "}
    </AppLayout>
  );
}
