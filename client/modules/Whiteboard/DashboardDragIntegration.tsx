import React, { useEffect, useMemo, useState } from "react";
import type { PanelEmbed } from "./types";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/glass";

interface DashboardDragIntegrationProps {
  sessionId: string;
  onPanelDropped: (panelEmbed: PanelEmbed) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

type DragKind = "panel" | "recipe" | "file";

export const DashboardDragIntegration: React.FC<
  DashboardDragIntegrationProps
> = ({ sessionId, onPanelDropped, canvasRef }) => {
  const [dragOverCanvas, setDragOverCanvas] = useState(false);
  const [dragKind, setDragKind] = useState<DragKind>("panel");

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      setDragOverCanvas(true);
    };

    const handleDragLeave = () => {
      setDragOverCanvas(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragOverCanvas(false);

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      try {
        const data = e.dataTransfer?.getData("application/json");
        if (data) {
          const payload = JSON.parse(data);
          if (payload.type === "dashboard-panel" || payload.panelId) {
            onPanelDropped({
              id: uuidv4(),
              panelId: payload.panelId || payload.id,
              x,
              y,
              width: 400,
              height: 300,
              zoomLevel: 1,
              drillDownLevel: 1,
              timestamp: Date.now(),
              widgetTitle: payload.title,
              widgetType: payload.widgetType,
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse drop data", err);
      }
    };

    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDrop);

    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDrop);
    };
  }, [canvasRef, onPanelDropped]);

  return dragOverCanvas ? (
    <div className="absolute inset-0 z-50 pointer-events-none border-4 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center">
      <div className="bg-background/90 p-4 rounded-xl shadow-xl border border-border flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
        <p className="text-lg font-bold">Drop to embed</p>
        <p className="text-sm text-muted-foreground">
          Release to add to whiteboard
        </p>
      </div>
    </div>
  ) : null;
};

export const EnablePanelDragging = () => {
  useEffect(() => {
    const handlePanelMinimize = (e: CustomEvent) => {
      const panel = e.detail;
      const panelElement = document.querySelector(
        `[data-panel-id="${panel.id}"]`,
      );
      if (!panelElement) return;

      const handler = (dragEvent: DragEvent) => {
        const dt = dragEvent.dataTransfer;
        if (!dt) return;
        dt.effectAllowed = "copy";
        dt.setData(
          "application/json",
          JSON.stringify({
            id: panel.id,
            title: panel.title,
            type: "dashboard-panel",
          }),
        );
      };

      panelElement.addEventListener("dragstart", handler as any);
      panelElement.setAttribute("draggable", "true");
    };

    window.addEventListener("panel-minimized", handlePanelMinimize as any);
    return () => {
      window.removeEventListener("panel-minimized", handlePanelMinimize as any);
    };
  }, []);

  return null;
};

export default DashboardDragIntegration;
