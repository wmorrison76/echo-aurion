/**
 * Whiteboard → Schedule → Kitchen Integration
 *
 * Connects Whiteboard module to scheduling and kitchen (MaestroBQT) stores
 * Auto-pushes decisions from Whiteboard to KDS (Kitchen Display System)
 */

import React from "react";
import { useWhiteboardKitchenChain } from "@/lib/store-integrations";
import { useSchedulingStore } from "@/stores/shared/schedulingStore";
import {
  maestroEventBus,
  publishEvent,
  EVENT_TYPES,
} from "@/modules/MaestroBQT/event-bus";

/**
 * Hook to integrate Whiteboard with scheduling and kitchen systems
 */
export function useWhiteboardIntegration() {
  const scheduling = useSchedulingStore();
  const { pushDecisionToKDS } = useWhiteboardKitchenChain();

  // Listen for whiteboard decisions and push to schedule/kitchen
  const handleWhiteboardDecision = React.useCallback(
    (decision: {
      type: "schedule_change" | "staffing_change" | "production_change";
      scheduleId?: string;
      shifts?: Array<{
        id: string;
        employeeId: string;
        employeeName: string;
        role: string;
        startTime: string;
        endTime: string;
        date: string;
        outletId: string;
        status: "scheduled" | "confirmed" | "completed" | "cancelled";
        cost?: number;
      }>;
      status?: string;
      changes?: any;
      productionItems?: Array<{
        id: string;
        recipeId: string;
        quantity: number;
        station: string;
        startTime: string;
      }>;
    }) => {
      if (decision.type === "schedule_change" && decision.scheduleId) {
        // Push schedule change to KDS
        pushDecisionToKDS(decision);

        // Also publish to MaestroBQT event bus for kitchen display
        publishEvent(
          EVENT_TYPES.SCHEDULE_CONFLICT_DETECTED,
          {
            scheduleId: decision.scheduleId,
            changes: decision.changes,
            source: "whiteboard",
          },
          "Whiteboard",
        );
      } else if (
        decision.type === "production_change" &&
        decision.productionItems
      ) {
        // Push production changes to kitchen
        decision.productionItems.forEach((item) => {
          publishEvent(
            EVENT_TYPES.PRODUCTION_PLAN_UPDATED,
            {
              recipeId: item.recipeId,
              quantity: item.quantity,
              station: item.station,
              startTime: item.startTime,
              source: "whiteboard",
            },
            "Whiteboard",
          );
        });
      }
    },
    [pushDecisionToKDS],
  );

  // Listen for schedule updates from other modules
  React.useEffect(() => {
    const unsubscribe = maestroEventBus.subscribeTo(
      EVENT_TYPES.SCHEDULE_CONFLICT_DETECTED,
      (data) => {
        // If schedule conflict detected, notify whiteboard users
        console.log("[Whiteboard] Schedule conflict detected:", data);
      },
    );

    return () => unsubscribe();
  }, []);

  return {
    handleWhiteboardDecision,
    scheduling,
  };
}
