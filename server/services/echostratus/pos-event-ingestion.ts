/**
 * POS Event Ingestion Service for EchoStratus
 * Ingests POS events and routes them to EchoStratus event bus
 */

import { logger } from "../../lib/logger";
import { getEventBridgeService } from "./event-bridge";

export interface POSEvent {
  eventId: string;
  eventType: "transaction" | "payment" | "refund" | "void" | "item_sold";
  timestamp: string;
  organizationId: string;
  outletId: string;
  data: Record<string, any>;
}

export class POSEventIngestionService {
  private eventBridge = getEventBridgeService();

  /**
   * Ingest POS event and route to EchoStratus
   */
  async ingestPOSEvent(event: POSEvent): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate event
      if (!event.eventId || !event.eventType || !event.organizationId) {
        throw new Error("Invalid POS event: missing required fields");
      }

      // Transform POS event to EchoStratus event format
      const stratusEvent = this.transformToStratusEvent(event);

      // Route to EchoStratus event bus (using event ingestion service for proper processing)
      try {
        const { eventIngestionService } = await import("./event-ingestion-service");
        await eventIngestionService.ingestEvent(stratusEvent);
      } catch (error) {
        logger.error("Failed to ingest POS event to EchoStratus", { error });
        // Fallback: try bridgeEventManually if available
        try {
          await (this.eventBridge as any).bridgeEventManually?.("os", stratusEvent.type, stratusEvent);
        } catch (bridgeError) {
          logger.error("Failed to bridge POS event", { error: bridgeError });
        }
      }

      logger.info("POS event ingested successfully", {
        eventId: event.eventId,
        eventType: event.eventType,
        organizationId: event.organizationId,
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to ingest POS event", { error, eventId: event.eventId });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Transform POS event to EchoStratus event format
   */
  private transformToStratusEvent(posEvent: POSEvent): any {
    return {
      id: posEvent.eventId,
      type: `pos.${posEvent.eventType}`,
      timestamp: posEvent.timestamp,
      organizationId: posEvent.organizationId,
      outletId: posEvent.outletId,
      source: "pos",
      data: posEvent.data,
      metadata: {
        originalEventType: posEvent.eventType,
        ingestedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Ingest batch of POS events
   */
  async ingestPOSEventsBatch(events: POSEvent[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ eventId: string; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ eventId: string; error: string }> = [];

    for (const event of events) {
      const result = await this.ingestPOSEvent(event);
      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push({ eventId: event.eventId, error: result.error || "Unknown error" });
      }
    }

    logger.info("POS events batch ingested", { total: events.length, success, failed });

    return { success, failed, errors };
  }
}

let posEventIngestionInstance: POSEventIngestionService | null = null;

export function getPOSEventIngestionService(): POSEventIngestionService {
  if (!posEventIngestionInstance) {
    posEventIngestionInstance = new POSEventIngestionService();
  }
  return posEventIngestionInstance;
}

export default POSEventIngestionService;
