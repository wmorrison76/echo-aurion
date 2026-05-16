import React, { Suspense, lazy } from "react";

const CakeDesigner3D = lazy(() => import("./CakeDesigner3D"));

export interface CakeBuilderModuleProps {
  onClose?: () => void;
  initialMode?: "studio" | "intake" | "gallery";
}

export default function CakeBuilderModule({
  onClose,
  initialMode = "studio",
}: CakeBuilderModuleProps) {
  return (
    <div className="w-full h-full overflow-hidden" style={{ background: "#04060d" }}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full" style={{ background: "#04060d" }}>
            <div className="text-center">
              <div className="w-6 h-6 border border-[#c8a97e]/30 border-t-[#c8a97e] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: "rgba(200,169,126,0.5)" }}>Loading 3D Cake Designer</p>
            </div>
          </div>
        }
      >
        <CakeDesigner3D />
      </Suspense>
    </div>
  );
}

export function CakeBuilderTab() {
  return (
    <div className="w-full h-full">
      <CakeBuilderModule />
    </div>
  );
}
