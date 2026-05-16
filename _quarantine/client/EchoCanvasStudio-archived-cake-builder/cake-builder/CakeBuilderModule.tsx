import React, { Suspense, lazy } from "react";
import { Card } from "@/components/ui/card";

const CakeStudio = lazy(() => import("./CakeStudio"));

export interface CakeBuilderModuleProps {
  onClose?: () => void;
  initialMode?: "studio" | "intake" | "gallery";
}

export default function CakeBuilderModule({
  onClose,
  initialMode = "studio",
}: CakeBuilderModuleProps) {
  return (
    <div className="w-full h-full overflow-auto">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Card className="p-8 text-center">
              <p className="text-lg font-semibold mb-2">Loading Cake Designer...</p>
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </Card>
          </div>
        }
      >
        <CakeStudio
          onSave={(design, name) => {
            console.log(`Design saved: ${name}`, design);
          }}
        />
      </Suspense>
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-background border shadow-lg hover:bg-muted"
          aria-label="Close cake builder"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// For integration with Editor.tsx as a tab
export function CakeBuilderTab() {
  return (
    <div className="w-full h-full">
      <CakeBuilderModule />
    </div>
  );
}
