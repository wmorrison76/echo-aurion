/**
 * Change Event Emitter Service
 * Genesis F + H compliance - Emits change events for all meaningful changes
 *
 * No silent changes. Ever.
 */

import type {
  ChangeEvent,
  ChangeEventType,
} from "../types/genesis-integration";
import maestroEventBus, { publishEvent } from "../event-bus";

/**
 * Emit a change event
 */
export function emitChangeEvent(
  event: Omit<ChangeEvent, "id" | "createdAt">,
): void {
  const fullEvent: ChangeEvent = {
    ...event,
    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  // Publish to Maestro event bus
  publishEvent("CHANGE_EVENT", fullEvent, "maestro-bqt-change-emitter", {
    type: fullEvent.type,
    entityType: fullEvent.entityType,
    entityId: fullEvent.entityId,
  });

  // Also emit to OS bus for cross-module communication
  if (typeof window !== "undefined" && (window as any).osBus) {
    (window as any).osBus.emit("change-event", fullEvent);
  }

  console.log(
    `[ChangeEmitter] Emitted ${fullEvent.type} for ${fullEvent.entityType}:${fullEvent.entityId}`,
  );
}

/**
 * Emit BEO_UPDATED event
 */
export function emitBEOUpdated(
  beoId: string,
  affectedBEODs: string[],
  changes: { field: string; oldValue: any; newValue: any }[],
  requiresAck: boolean = false,
): void {
  emitChangeEvent({
    type: "BEO_UPDATED",
    entityType: "beo",
    entityId: beoId,
    affectedBEODs,
    requiresAcknowledgment: requiresAck,
    preview:
      changes.length > 0
        ? {
            oldState: changes.reduce(
              (acc, c) => ({ ...acc, [c.field]: c.oldValue }),
              {},
            ),
            newState: changes.reduce(
              (acc, c) => ({ ...acc, [c.field]: c.newValue }),
              {},
            ),
            impact: changes.map(
              (c) => `Changed ${c.field} from ${c.oldValue} to ${c.newValue}`,
            ),
          }
        : undefined,
  });
}

/**
 * Emit RECIPE_RESCALED event
 */
export function emitRecipeRescaled(
  recipeId: string,
  beoId: string,
  affectedBEODs: string[],
  oldScale: number,
  newScale: number,
  impact: string[],
): void {
  emitChangeEvent({
    type: "RECIPE_RESCALED",
    entityType: "recipe",
    entityId: recipeId,
    affectedBEODs,
    requiresAcknowledgment: true, // Scaling always requires acknowledgment
    preview: {
      oldState: { scale: oldScale },
      newState: { scale: newScale },
      impact,
    },
  });
}

/**
 * Emit TIMELINE_SHIFTED event
 */
export function emitTimelineShifted(
  timelineId: string,
  affectedBEODs: string[],
  shifts: { taskId: string; oldTime: string; newTime: string }[],
): void {
  emitChangeEvent({
    type: "TIMELINE_SHIFTED",
    entityType: "timeline",
    entityId: timelineId,
    affectedBEODs,
    requiresAcknowledgment: shifts.length > 0, // Shifts require acknowledgment if any occurred
    preview:
      shifts.length > 0
        ? {
            oldState: {
              tasks: shifts.map((s) => ({ id: s.taskId, time: s.oldTime })),
            },
            newState: {
              tasks: shifts.map((s) => ({ id: s.taskId, time: s.newTime })),
            },
            impact: shifts.map(
              (s) =>
                `Task ${s.taskId} shifted from ${s.oldTime} to ${s.newTime}`,
            ),
          }
        : undefined,
  });
}

/**
 * Emit ORDER_REGENERATED event
 */
export function emitOrderRegenerated(
  orderId: string,
  affectedBEODs: string[],
  reason: string,
  oldQuantity?: number,
  newQuantity?: number,
): void {
  emitChangeEvent({
    type: "ORDER_REGENERATED",
    entityType: "order",
    entityId: orderId,
    affectedBEODs,
    requiresAcknowledgment: true, // Order regeneration always requires acknowledgment
    preview:
      oldQuantity !== undefined && newQuantity !== undefined
        ? {
            oldState: { quantity: oldQuantity },
            newState: { quantity: newQuantity },
            impact: [
              `Order quantity changed from ${oldQuantity} to ${newQuantity}. Reason: ${reason}`,
            ],
          }
        : {
            oldState: {},
            newState: {},
            impact: [reason],
          },
  });
}

/**
 * Emit RECEIVING_EXCEPTION event
 */
export function emitReceivingException(
  receivingId: string,
  affectedBEODs: string[],
  exception: {
    type: "shortage" | "damage" | "quality" | "wrong_item";
    itemId: string;
    expectedQuantity: number;
    receivedQuantity: number;
    description: string;
  },
  impact: string[],
): void {
  emitChangeEvent({
    type: "RECEIVING_EXCEPTION",
    entityType: "receiving",
    entityId: receivingId,
    affectedBEODs,
    requiresAcknowledgment: true, // Receiving exceptions always require acknowledgment
    preview: {
      oldState: { quantity: exception.expectedQuantity },
      newState: { quantity: exception.receivedQuantity },
      impact: [
        `Receiving exception: ${exception.type}`,
        `Item: ${exception.itemId}`,
        `Expected: ${exception.expectedQuantity}, Received: ${exception.receivedQuantity}`,
        exception.description,
        ...impact,
      ],
    },
  });
}
