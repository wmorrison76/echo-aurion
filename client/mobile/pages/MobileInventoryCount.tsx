/**
 * Mobile Inventory Count
 * Placeholder: count entry by location; trace + inventory update (stub).
 */

import React from "react";
import { ClipboardList } from "lucide-react";

export default function MobileInventoryCount() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ClipboardList className="h-5 w-5" />
        Inventory Count
      </h2>
      <p className="text-sm text-muted-foreground">
        Count by location; results sync when online and emit trace. (Stub — wire to inventory count API.)
      </p>
    </div>
  );
}
