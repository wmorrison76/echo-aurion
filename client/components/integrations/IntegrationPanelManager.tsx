import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MiniPanelManager, MiniPanelConfig } from "@/lib/mini-panel-storage";
import { MiniPanel } from "@/components/site/MiniPanel";
import LargeIntegrationPanel from "./LargeIntegrationPanel";

interface OpenPanelDetail {
  service: "outlook" | "teams" | "gmail";
  showLargePanel?: boolean;
}

export default function IntegrationPanelManager() {
  const [openPanels, setOpenPanels] = useState<Record<string, MiniPanelConfig>>(
    {},
  );

  useEffect(() => {
    const handleOpenIntegrationPanel = (event: any) => {
      const { service, showLargePanel = true } =
        event.detail as OpenPanelDetail;

      const panelId = `integration-${service}`;
      const serviceNames: Record<string, string> = {
        outlook: "Outlook Mail",
        teams: "Microsoft Teams",
        gmail: "Gmail",
      };

      // Check if already open
      const existingPanel = Object.values(openPanels).find(
        (p) => p.panelId === panelId,
      );

      if (existingPanel) {
        // Already open, just focus it
        const nextZ = MiniPanelManager.bringToFront(existingPanel.id);
        const updated = { ...openPanels };
        updated[existingPanel.id] = {
          ...existingPanel,
          zIndex: nextZ ?? existingPanel.zIndex,
        };
        setOpenPanels(updated);
      } else {
        // Create new draggable mini panel (always use mini panel, no fixed modal)
        const config = MiniPanelManager.createMiniPanel(
          panelId,
          serviceNames[service] || service,
          550,
          600,
        );

        setOpenPanels((prev) => ({
          ...prev,
          [config.id]: config,
        }));
      }
    };

    window.addEventListener(
      "open-integration-panel",
      handleOpenIntegrationPanel as EventListener,
    );

    return () => {
      window.removeEventListener(
        "open-integration-panel",
        handleOpenIntegrationPanel as EventListener,
      );
    };
  }, [openPanels]);

  // Listen for mini panel updates from storage
  useEffect(() => {
    const handleMiniPanelsUpdated = (event: any) => {
      const allPanels = event.detail.panels;
      const integrationPanels = allPanels.filter((p: MiniPanelConfig) =>
        p.panelId.startsWith("integration-"),
      );

      const panelsMap: Record<string, MiniPanelConfig> = {};
      integrationPanels.forEach((p: MiniPanelConfig) => {
        panelsMap[p.id] = p;
      });

      setOpenPanels(panelsMap);
    };

    window.addEventListener(
      "mini-panels-updated",
      handleMiniPanelsUpdated as EventListener,
    );

    return () => {
      window.removeEventListener(
        "mini-panels-updated",
        handleMiniPanelsUpdated as EventListener,
      );
    };
  }, []);

  const handleClosePanel = (panelId: string) => {
    MiniPanelManager.removeMiniPanel(panelId);
    setOpenPanels((prev) => {
      const updated = { ...prev };
      delete updated[panelId];
      return updated;
    });
  };

  const renderPanelContent = (panelConfig: MiniPanelConfig) => {
    const service = panelConfig.panelId.replace("integration-", "") as
      | "outlook"
      | "teams"
      | "gmail";

    if (panelConfig.panelId === "integration-outlook") {
      return (
        <LargeIntegrationPanel
          service="outlook"
          onClose={() => handleClosePanel(panelConfig.id)}
        />
      );
    } else if (panelConfig.panelId === "integration-teams") {
      return (
        <LargeIntegrationPanel
          service="teams"
          onClose={() => handleClosePanel(panelConfig.id)}
        />
      );
    } else if (panelConfig.panelId === "integration-gmail") {
      return (
        <LargeIntegrationPanel
          service="gmail"
          onClose={() => handleClosePanel(panelConfig.id)}
        />
      );
    }
    return null;
  };

  // Render panels using portal to document body (like other floating panels)
  const panelsContent = Object.entries(openPanels).map(([id, config]) => (
    <MiniPanel key={id} config={config} onClose={handleClosePanel}>
      {renderPanelContent(config)}
    </MiniPanel>
  ));

  // Portal renders to document.body, panels handle their own positioning and z-index
  return createPortal(
    <>
      {panelsContent}
    </>,
    document.body
  );
}
