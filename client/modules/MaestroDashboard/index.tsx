/**
 * Maestro Banquets Unified Operations Dashboard
 *
 * Central orchestration component for the entire operational system.
 * Manages event selection, real-time synchronization, and panel layout.
 *
 * Architecture:
 * - Hydrates current event from API
 * - Sets up real-time WebSocket/polling sync
 * - Manages global event bus for inter-panel communication
 * - Applies RBAC rules for role-based visibility
 */
import React, { useEffect } from "react";
import { MaestroProvider } from "@/contexts/MaestroContext";
import { useMaestroStore } from "@/stores/useMaestroStore";
import { useAuth } from "@/contexts/AuthContext";
import { get } from "@/lib/api-client";
import { DashboardLayout } from "./DashboardLayout";
import { BEOListPanel } from "./panels/BEOListPanel";
import { BEODetailPanel } from "./panels/BEODetailPanel";
import type { Event, EventListResponse } from "@shared/types/maestro";
import { useI18n } from "@/i18n";

export default function MaestroDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const {
    events,
    setEvents,
    setEventsLoading,
    setEventsError,
    selectedEventId,
    selectEvent,
    selectedBEOId,
    statusFilter,
    dateRangeStart,
    dateRangeEnd,
    outletFilter,
  } = useMaestroStore();
  const { eventsLoading, eventsError } = useMaestroStore();

  // Load events on mount and when filters change
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);
        const params = new URLSearchParams();
        if (statusFilter) params.append("status", statusFilter);
        if (dateRangeStart) params.append("startDate", dateRangeStart);
        if (dateRangeEnd) params.append("endDate", dateRangeEnd);
        if (outletFilter) params.append("outlet", outletFilter);
        const response = await get<EventListResponse>(
          `/api/maestro/events?${params.toString()}`,
        );
        if (response.success && response.events) {
          setEvents(response.events as Event[]);
          if (!selectedEventId && response.events.length > 0) {
            selectEvent((response.events[0] as any).id);
          }
        } else {
          setEventsError("Failed to load events");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load events";
        setEventsError(errorMsg);
        console.error("[MAESTRO-DASHBOARD] loadEvents error:", err);
      } finally {
        setEventsLoading(false);
      }
    };
    if (user) loadEvents();
  }, [user, statusFilter, dateRangeStart, dateRangeEnd, outletFilter, setEvents, setEventsLoading, setEventsError, selectedEventId, selectEvent]);

  // If not authenticated, show login prompt
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full bg-background p-10" data-testid="maestro-dashboard-login-prompt">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("module.maestro-dashboard.title") || "LUCCCA Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("module.maestro-dashboard.loginPrompt") || "Sign in to view live events and BEOs."}
          </p>
        </div>
      </div>
    );
  }

  // Show BEO detail if one is selected, otherwise show list
  if (selectedBEOId) {
    return (
      <div className="h-full bg-background flex flex-col" data-testid="maestro-beo-detail">
        <BEODetailPanel />
      </div>
    );
  }

  // Default: BEO list view
  return (
    <div className="h-full bg-surface flex flex-col" data-testid="maestro-beo-list">
      <BEOListPanel events={events} loading={eventsLoading} error={eventsError} />
    </div>
  );
}
