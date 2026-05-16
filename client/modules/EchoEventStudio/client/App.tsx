import React from "react";
import "./global.css";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import Studio from "./pages/Studio";
import StudioBridge from "./pages/StudioBridge";
import Events from "./pages/Events";
import Analytics from "./pages/Analytics";
import SettingsModal, { useSettingsModal } from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Planner from "./pages/Planner";
import StudioWalk from "./pages/StudioWalk";
import Walkthrough from "./pages/Walkthrough";
import MobileCapture from "./pages/MobileCapture";
import DiningRoomDesigner from "./pages/DiningRoomDesigner";
import EchoLayout from "./pages/EchoLayout";
const queryClient = new QueryClient();
function AppRoutes() {
  const { open, setOpen, modal } = useSettingsModal();
  return (
    <>
      {" "}
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {" "}
        <Routes>
          {" "}
          <Route path="/" element={<Navigate to="/layout" replace />} />{" "}
          <Route path="/layout" element={<EchoLayout />} />{" "}
          <Route path="/layout/:sessionId" element={<EchoLayout />} />{" "}
          <Route path="/designer" element={<DiningRoomDesigner />} />{" "}
          <Route path="/studio" element={<Studio />} />{" "}
          <Route path="/studio-bridge" element={<StudioBridge />} />{" "}
          <Route path="/events" element={<Events />} />{" "}
          <Route path="/analytics" element={<Analytics />} />{" "}
          <Route path="/planner" element={<Planner />} />{" "}
          <Route path="/studio-walk" element={<StudioWalk />} />{" "}
          <Route path="/walkthrough" element={<Walkthrough />} />{" "}
          <Route path="/capture" element={<MobileCapture />} />{" "}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL"*" ROUTE */}{" "}
          <Route path="*" element={<NotFound />} />{" "}
        </Routes>{" "}
        <SettingsModal open={open} onOpenChange={setOpen} />{" "}
      </BrowserRouter>{" "}
      {/* Global settings access - you can add a button in your header to trigger setOpen(true) */}{" "}
      {modal}{" "}
    </>
  );
}
const App = () => (
  <QueryClientProvider client={queryClient}>
    {" "}
    <TooltipProvider>
      {" "}
      <Toaster /> <Sonner /> <AppRoutes />{" "}
    </TooltipProvider>{" "}
  </QueryClientProvider>
);
const container = document.getElementById("root")!;
// Reuse existing root across HMR to avoid duplicate createRoot warnings
const existing = (container as any).__root as any | undefined;
const root = existing ?? createRoot(container);
(container as any).__root = root;
root.render(<App />); // Export for header/toolbar usage
export { App };
