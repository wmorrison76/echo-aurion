// src/panels/EventStudioPanel.tsx
import * as React from "react";

// CRM styles (keep this so the CRM pages look correct)
import "@/modules/crm/client/global.css";

// CRM pages you want available inside the panel
import Index from "@/modules/crm/client/pages/Index";
// (Optional) Add more CRM pages here if you want in-panel navigation:
// import Contacts from "@/modules/crm/client/pages/Contacts";
// import SalesMeeting from "@/modules/crm/client/pages/SalesMeeting";
// etc.

import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Give the embedded CRM its own Query Client + Router, so it doesn't
// fight with the root app's providers or URL.
const qc = new QueryClient();

export default function EventStudioPanel() {
  return (
    <div className="p-4 w-full h-full overflow-auto">
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/* MemoryRouter keeps this self-contained in the panel */}
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              {/* CRM “Dashboard” inside the panel */}
              <Route path="/" element={<Index />} />

              {/* If you add more pages, declare them here:
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/sales-meeting" element={<SalesMeeting />} />
              */}

              {/* Anything unknown just goes to the in-panel dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}
