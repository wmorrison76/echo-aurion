/** * BEO Detail Panel * * Full-screen detail view for a BEO showing: * - BEO header information * - Changelog timeline * - Menu & recipes * - AI-generated orders * - Production schedule * - Inventory status */ import React from "react";
import { useMaestroStore } from "@/stores/useMaestroStore";
import { useBEODetail } from "@/hooks/useBEODetail";
import { Button } from "@/components/ui/button";
import { BEOHeaderSection } from "../components/BEOHeaderSection";
import { BEOMenuRecipesSection } from "../components/BEOMenuRecipesSection";
import { BEOAIOrdersSection } from "../components/BEOAIOrdersSection";
import { BEOProductionScheduleSection } from "../components/BEOProductionScheduleSection";
import { BEOTimelineSection } from "../components/BEOTimelineSection";
import { BEOInventorySection } from "../components/BEOInventorySection";
export function BEODetailPanel() {
  const { selectedBEOId, selectBEO } = useMaestroStore();
  const { data, loading, error } = useBEODetail(selectedBEOId);
  if (!selectedBEOId) {
    return null;
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        {" "}
        <div className="text-sm text-slate-400">
          Loading BEO details...
        </div>{" "}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        {" "}
        <div className="text-sm text-red-400">
          {" "}
          {error || "Failed to load BEO details"}{" "}
        </div>{" "}
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full bg-surface">
      {" "}
      {/* Header with back button */}{" "}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-800">
        {" "}
        <div className="flex-1">
          {" "}
          <h1 className="text-lg font-bold text-white">
            {data.beo.eventName}
          </h1>{" "}
          <p className="text-xs text-slate-400 mt-1">
            {" "}
            BEO #{data.beo.beoNumber}{" "}
          </p>{" "}
        </div>{" "}
        <Button
          variant="ghost"
          onClick={() => selectBEO(null)}
          className="text-slate-300 hover:text-white"
        >
          {" "}
          ← Back{" "}
        </Button>{" "}
      </div>{" "}
      {/* Scrollable content area */}{" "}
      <div className="flex-1 overflow-y-auto">
        {" "}
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
          {" "}
          {/* BEO Header Info */} <BEOHeaderSection beo={data.beo} />{" "}
          {/* Menu & Recipes */} <BEOMenuRecipesSection beoId={selectedBEOId} />{" "}
          {/* AI Orders */}{" "}
          <BEOAIOrdersSection aiOrders={data.aiOrders} beoId={selectedBEOId} />{" "}
          {/* Production Schedule */}{" "}
          <BEOProductionScheduleSection schedule={data.productionSchedule} />{" "}
          {/* Timeline */} <BEOTimelineSection changelog={data.changelog} />{" "}
          {/* Inventory Status */}{" "}
          <BEOInventorySection
            inventory={data.inventory}
            beoId={selectedBEOId}
          />{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
