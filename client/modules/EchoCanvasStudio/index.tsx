import React, { Suspense } from "react";
import DesktopOnlyGate from "../../components/DesktopOnlyGate";

const Editor = React.lazy(() =>
  import("./client/pages/Editor").catch((err) => {
    console.error("[EchoCanvasStudio] Editor load failed:", err);
    return {
      default: () => (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Canvas Studio could not be loaded.</p>
        </div>
      ),
    };
  }),
);

function EchoCanvasStudioModule() {
  return (
    <DesktopOnlyGate panelName="EchoCanvas Studio">
      <div className="w-full h-full" data-testid="echo-canvas-studio-module">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Loading Canvas Studio...
            </div>
          }
        >
          <Editor />
        </Suspense>
      </div>
    </DesktopOnlyGate>
  );
}
export default EchoCanvasStudioModule;
