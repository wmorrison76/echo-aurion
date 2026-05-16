import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"; /** * EchoEventStudio Module for LUCCCA Framework * * This is the plug-and-play entry point that wraps the EchoEventStudio * application for integration into the LUCCCA framework. * * Usage in host application: * - Place this entire folder in client/modules/EchoEventStudio/ * - Update client/lib/panel-registry.ts with: * * export type PanelKey = * |"echo-event-studio" * // ... other panels * * export const PANEL_REGISTRY = { *"echo-event-studio": () => import("@/modules/EchoEventStudio"), * // ... other modules * } * * export const PANEL_METADATA = { *"echo-event-studio": { * key:"echo-event-studio", * label:"Echo Event Studio", * description:"Professional event layout design...", * icon:"🎨", * defaultWidth: 1400, * defaultHeight: 900, * }, * // ... other panels * } * * - Launch from any component using: * const { openPanel } = usePanel(); * openPanel("echo-event-studio"); */ // Lazy load the main EchoLayout component
const EchoLayout = React.lazy(() => import("@/pages/EchoLayout")); // Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    {" "}
    <div className="text-center">
      {" "}
      <div className="inline-block">
        {" "}
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>{" "}
      </div>{" "}
      <p className="mt-4 text-muted-foreground font-medium">
        {" "}
        Loading Echo Event Studio...{" "}
      </p>{" "}
    </div>{" "}
  </div>
); /** * EchoEventStudioModule * * Default export required by LUCCCA framework. * Wraps the application with necessary providers and layout. */
export default function EchoEventStudioModule(props: any) {
  return (
    <div className="w-full h-full bg-background overflow-hidden">
      {" "}
      {/* Suspense boundary for lazy-loaded EchoLayout component Shows loading fallback while module is loading */}{" "}
      <Suspense fallback={<LoadingFallback />}>
        {" "}
        <Router>
          {" "}
          <Routes>
            {" "}
            {/* Main EchoLayout page */}{" "}
            <Route path="/*" element={<EchoLayout {...props} />} />{" "}
          </Routes>{" "}
        </Router>{" "}
      </Suspense>{" "}
    </div>
  );
} /** * Named exports for advanced usage */
export { EchoLayout };
