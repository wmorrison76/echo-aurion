/**
 * EchoStratus WebSocket Broadcaster
 * Broadcasts events to connected clients via WebSocket
 */

import { logger } from "../../utils/logger.js";

export interface WebSocketClient {
  id: string;
  organizationId: string;
  send: (data: string) => void;
  close: () => void;
}

export interface BroadcastEvent {
  type: string;
  organizationId: string;
  data: Record<string, any>;
  timestamp: string;
}

export class WebSocketBroadcaster {
  private clients: Map<string, WebSocketClient[]> = new Map(); // organizationId -> clients

  /**
   * Register a WebSocket client
   */
  registerClient(client: WebSocketClient): void {
    if (!this.clients.has(client.organizationId)) {
      this.clients.set(client.organizationId, []);
    }
    const orgClients = this.clients.get(client.organizationId)!;
    orgClients.push(client);
    
    logger.info("WebSocket client registered", {
      clientId: client.id,
      organizationId: client.organizationId,
      totalClients: orgClients.length,
    });
  }

  /**
   * Unregister a WebSocket client
   */
  unregisterClient(clientId: string, organizationId: string): void {
    const orgClients = this.clients.get(organizationId);
    if (!orgClients) return;

    const index = orgClients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      orgClients.splice(index, 1);
      logger.info("WebSocket client unregistered", {
        clientId,
        organizationId,
        remainingClients: orgClients.length,
      });
    }

    if (orgClients.length === 0) {
      this.clients.delete(organizationId);
    }
  }

  /**
   * Broadcast event to all clients in an organization
   */
  broadcastToOrganization(event: BroadcastEvent): void {
    const clients = this.clients.get(event.organizationId) || [];
    
    if (clients.length === 0) {
      logger.debug("No clients to broadcast to", {
        organizationId: event.organizationId,
        eventType: event.type,
      });
      return;
    }

    const message = JSON.stringify(event);
    let successCount = 0;
    let errorCount = 0;

    for (const client of clients) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        logger.error("Failed to send WebSocket message", {
          error,
          clientId: client.id,
          organizationId: event.organizationId,
        });
        errorCount++;
        // Remove failed client
        this.unregisterClient(client.id, event.organizationId);
      }
    }

    logger.debug("Event broadcasted", {
      organizationId: event.organizationId,
      eventType: event.type,
      successCount,
      errorCount,
      totalClients: clients.length,
    });
  }

  /**
   * Broadcast event to all organizations
   */
  broadcastToAll(event: BroadcastEvent): void {
    for (const organizationId of this.clients.keys()) {
      this.broadcastToOrganization({
        ...event,
        organizationId,
      });
    }
  }

  /**
   * Get client count for an organization
   */
  getClientCount(organizationId: string): number {
    return this.clients.get(organizationId)?.length || 0;
  }

  /**
   * Get total client count
   */
  getTotalClientCount(): number {
    let total = 0;
    for (const clients of this.clients.values()) {
      total += clients.length;
    }
    return total;
  }

  /**
   * Legacy broadcast(tenantId, payload) adapter for event-processor compatibility.
   * Maps to broadcastToOrganization.
   */
  broadcast(organizationId: string, payload: { type: string; tenant_id?: string; payload?: any; timestamp?: string }): void {
    this.broadcastToOrganization({
      type: payload.type,
      organizationId,
      data: payload.payload ?? payload,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    });
  }

  /**
   * Optional HTTP server setup (e.g. /api/stratus/ws upgrade). No-op by default.
   * Call from server index to satisfy initialization; WS upgrade can be added later.
   */
  initialize(_httpServer?: any): void {
    logger.info("[Stratus WebSocket] Broadcaster ready (standalone mode)");
  }

  /**
   * Clean up disconnected clients
   */
  cleanup(): void {
    for (const [organizationId, clients] of this.clients.entries()) {
      const activeClients = clients.filter((client) => {
        try {
          // Try to send a ping to check if client is still connected
          client.send(JSON.stringify({ type: "ping" }));
          return true;
        } catch {
          return false;
        }
      });

      if (activeClients.length !== clients.length) {
        this.clients.set(organizationId, activeClients);
        logger.info("Cleaned up disconnected clients", {
          organizationId,
          removed: clients.length - activeClients.length,
          remaining: activeClients.length,
        });
      }
    }
  }
}

let broadcasterInstance: WebSocketBroadcaster | null = null;

export function getWebSocketBroadcaster(): WebSocketBroadcaster {
  if (!broadcasterInstance) {
    broadcasterInstance = new WebSocketBroadcaster();
    // Cleanup every 5 minutes
    setInterval(() => {
      broadcasterInstance?.cleanup();
    }, 5 * 60 * 1000);
  }
  return broadcasterInstance;
}

// Convenience singleton export (legacy import compatibility)
export const websocketBroadcaster = getWebSocketBroadcaster();

export default WebSocketBroadcaster;
