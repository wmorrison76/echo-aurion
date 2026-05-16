/**
 * BEO Real-Time Tracker Service
 * Provides real-time execution tracking via WebSocket for BEO execution
 * 
 * Features:
 * - Real-time status updates
 * - Checklist progress tracking
 * - Timeline event notifications
 * - Issue alerts
 * - Guest count updates
 * - Post-event metrics streaming
 */

import { logger } from "../lib/logger";
import { Server as SocketIOServer } from "socket.io";
import { beoExecutionService } from "./beo-execution";

export interface BEORealtimeUpdate {
  beoId: string;
  type: "status" | "checklist" | "timeline" | "issue" | "guest_count" | "metrics";
  data: any;
  timestamp: string;
  userId?: string;
}

/**
 * BEO Real-Time Tracker
 */
export class BEORealtimeTracker {
  private io: SocketIOServer | null = null;
  private beoSubscriptions: Map<string, Set<string>> = new Map(); // beoId -> Set<socketId>

  /**
   * Initialize with Socket.IO server
   */
  initialize(io: SocketIOServer): void {
    this.io = io;

    io.on("connection", (socket) => {
      logger.info("[BEORealtime] Client connected", { socketId: socket.id });

      // Subscribe to BEO updates
      socket.on("subscribe-beo", async (beoId: string) => {
        if (!beoId) return;

        logger.info("[BEORealtime] Subscribing to BEO", { socketId: socket.id, beoId });

        // Add socket to BEO room
        socket.join(`beo:${beoId}`);

        // Track subscription
        if (!this.beoSubscriptions.has(beoId)) {
          this.beoSubscriptions.set(beoId, new Set());
        }
        this.beoSubscriptions.get(beoId)!.add(socket.id);

        // Send current status immediately
        try {
          const orgId = socket.handshake.query.orgId as string;
          if (orgId) {
            const status = await beoExecutionService.getExecutionStatus(beoId, orgId);
            socket.emit("beo-status", {
              beoId,
              type: "status",
              data: status,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.error("[BEORealtime] Failed to send initial status", { error, beoId });
        }
      });

      // Unsubscribe from BEO updates
      socket.on("unsubscribe-beo", (beoId: string) => {
        if (!beoId) return;

        logger.info("[BEORealtime] Unsubscribing from BEO", { socketId: socket.id, beoId });

        socket.leave(`beo:${beoId}`);
        this.beoSubscriptions.get(beoId)?.delete(socket.id);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        logger.info("[BEORealtime] Client disconnected", { socketId: socket.id });

        // Remove from all subscriptions
        for (const [beoId, sockets] of this.beoSubscriptions.entries()) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.beoSubscriptions.delete(beoId);
          }
        }
      });

      // Handle ping/pong for health checks
      socket.on("ping", () => {
        socket.emit("pong", { timestamp: Date.now() });
      });
    });

    logger.info("[BEORealtime] Initialized");
  }

  /**
   * Broadcast status update for a BEO
   */
  broadcastStatus(beoId: string, status: any): void {
    if (!this.io) {
      logger.warn("[BEORealtime] Socket.IO not initialized");
      return;
    }

    const update: BEORealtimeUpdate = {
      beoId,
      type: "status",
      data: status,
      timestamp: new Date().toISOString(),
    };

    this.io.to(`beo:${beoId}`).emit("beo-status", update);
    logger.debug("[BEORealtime] Status broadcasted", { beoId });
  }

  /**
   * Broadcast checklist update
   */
  broadcastChecklistUpdate(beoId: string, checklistItem: any): void {
    if (!this.io) return;

    const update: BEORealtimeUpdate = {
      beoId,
      type: "checklist",
      data: checklistItem,
      timestamp: new Date().toISOString(),
    };

    this.io.to(`beo:${beoId}`).emit("beo-checklist-update", update);
    logger.debug("[BEORealtime] Checklist update broadcasted", { beoId, itemId: checklistItem.id });
  }

  /**
   * Broadcast timeline event update
   */
  broadcastTimelineUpdate(beoId: string, timelineEvent: any): void {
    if (!this.io) return;

    const update: BEORealtimeUpdate = {
      beoId,
      type: "timeline",
      data: timelineEvent,
      timestamp: new Date().toISOString(),
    };

    this.io.to(`beo:${beoId}`).emit("beo-timeline-update", update);
    logger.debug("[BEORealtime] Timeline update broadcasted", { beoId, eventId: timelineEvent.id });
  }

  /**
   * Broadcast issue alert
   */
  broadcastIssue(beoId: string, issue: any, critical: boolean = false): void {
    if (!this.io) return;

    const update: BEORealtimeUpdate = {
      beoId,
      type: "issue",
      data: { ...issue, critical },
      timestamp: new Date().toISOString(),
    };

    this.io.to(`beo:${beoId}`).emit("beo-issue", update);

    // Also broadcast to admins/managers if critical
    if (critical) {
      this.io.to(`beo:${beoId}:admins`).emit("beo-critical-issue", update);
    }

    logger.warn("[BEORealtime] Issue broadcasted", { beoId, critical, issueId: issue.id });
  }

  /**
   * Broadcast guest count update
   */
  broadcastGuestCount(beoId: string, guestCount: { planned: number; actual: number; guaranteed: number }): void {
    if (!this.io) return;

    const update: BEORealtimeUpdate = {
      beoId,
      type: "guest_count",
      data: guestCount,
      timestamp: new Date().toISOString(),
    };

    this.io.to(`beo:${beoId}`).emit("beo-guest-count", update);
    logger.debug("[BEORealtime] Guest count broadcasted", { beoId, actual: guestCount.actual });
  }

  /**
   * Broadcast post-event metrics
   */
  broadcastMetrics(beoId: string, metrics: any[]): void {
    if (!this.io) return;

    const update: BEORealtimeUpdate = {
      beoId,
      type: "metrics",
      data: metrics,
      timestamp: new Date().toISOString(),
    };

    this.io.to(`beo:${beoId}`).emit("beo-metrics", update);
    logger.debug("[BEORealtime] Metrics broadcasted", { beoId, metricCount: metrics.length });
  }

  /**
   * Get active subscribers for a BEO
   */
  getActiveSubscribers(beoId: string): number {
    return this.beoSubscriptions.get(beoId)?.size || 0;
  }

  /**
   * Get all subscribed BEOs
   */
  getSubscribedBEOs(): string[] {
    return Array.from(this.beoSubscriptions.keys());
  }
}

// Export singleton instance
export const beoRealtimeTracker = new BEORealtimeTracker();
