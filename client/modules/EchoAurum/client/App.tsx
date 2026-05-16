import "./global.css";
import React from "react";
import { HashScrollManager } from "@/components/HashScrollManager";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionToastBridge } from "./modules/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useInRouterContext,
  MemoryRouter,
} from "react-router-dom";
import Console from "./pages/Console";
import Dashboard from "./pages/Dashboard";
import GLOperations from "./pages/GLOperations";
import APOperations from "./pages/APOperations";
import Reports from "./pages/Reports";
import FinancialReports from "./pages/FinancialReports";
import Admin from "./pages/Admin";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Purchasing from "./pages/Purchasing";
import AuthenticatedProfile from "./pages/AuthenticatedProfile";
import AuditReconciliation from "./pages/AuditReconciliation";
import AuditControlTesting from "./pages/AuditControlTesting";
import AuditCompliance from "./pages/AuditCompliance";
import AuditFraudMonitoring from "./pages/AuditFraudMonitoring";
import AuditSODViolations from "./pages/AuditSODViolations";
import AuditGLMonitoring from "./pages/AuditGLMonitoring";
import AuditDisclosures from "./pages/AuditDisclosures";
import AuditDashboard from "./modules/aurum/pages/AuditDashboard";
import Features from "./pages/Features";
import Security from "./pages/Security";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
const queryClient = new QueryClient();
function RouterWrapper({ children }: { children: React.ReactNode }) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <>{children}</>;
  }
  return (
    <MemoryRouter
      initialEntries={["/dashboard"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {children}
    </MemoryRouter>
  );
}
const App = () => (
  <ThemeProvider>
    {" "}
    <QueryClientProvider client={queryClient}>
      {" "}
      <TooltipProvider>
        {" "}
        <Toaster /> <Sonner /> <SessionToastBridge />{" "}
        <RouterWrapper>
          {" "}
          <HashScrollManager />{" "}
          <Routes>
            {" "}
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />{" "}
            <Route path="/dashboard" element={<Dashboard />} />{" "}
            <Route path="/console" element={<Console />} />{" "}
            <Route path="/gl" element={<GLOperations />} />{" "}
            <Route path="/ap" element={<APOperations />} />{" "}
            <Route path="/reports" element={<Reports />} />{" "}
            <Route path="/financial-reports" element={<FinancialReports />} />{" "}
            <Route path="/admin" element={<Admin />} />{" "}
            <Route path="/overview" element={<Index />} />{" "}
            <Route path="/purchasing" element={<Purchasing />} />{" "}
            <Route path="/audit" element={<AuditDashboard />} />{" "}
            <Route
              path="/audit/reconciliation"
              element={<AuditReconciliation />}
            />{" "}
            <Route
              path="/audit/control-testing"
              element={<AuditControlTesting />}
            />{" "}
            <Route path="/audit/compliance" element={<AuditCompliance />} />{" "}
            <Route path="/audit/disclosures" element={<AuditDisclosures />} />{" "}
            <Route
              path="/audit/fraud-monitoring"
              element={<AuditFraudMonitoring />}
            />{" "}
            <Route
              path="/audit/sod-violations"
              element={<AuditSODViolations />}
            />{" "}
            <Route
              path="/audit/gl-monitoring"
              element={<AuditGLMonitoring />}
            />{" "}
            <Route path="/features" element={<Features />} />{" "}
            <Route path="/security" element={<Security />} />{" "}
            <Route path="/pricing" element={<Pricing />} />{" "}
            <Route path="/docs" element={<Docs />} />{" "}
            <Route
              path="/App/Auth"
              element={<Navigate to="/dashboard" replace />}
            />{" "}
            <Route
              path="/App/Authenticated"
              element={<AuthenticatedProfile />}
            />{" "}
            <Route path="/profile" element={<AuthenticatedProfile />} />{" "}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL"*" ROUTE */}{" "}
            <Route path="*" element={<NotFound />} />{" "}
          </Routes>{" "}
        </RouterWrapper>{" "}
      </TooltipProvider>{" "}
    </QueryClientProvider>{" "}
  </ThemeProvider>
);
createRoot(document.getElementById("root")!).render(<App />);
