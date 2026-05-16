/**
 * Realtime Event Manager
 * Handles broadcasting events to connected clients
 */

interface RealtimeEvent {
  type: string;
  timestamp?: number;
  [key: string]: any;
}

class RealtimeManager {
  private subscribers: Map<string, Set<(event: RealtimeEvent) => void>> =
    new Map();

  /**
   * Send event to all subscribers of a channel
   */
  sendEvent(channel: string, event: RealtimeEvent): void {
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    console.log(`[Realtime] ${channel}:`, eventWithTimestamp.type);

    // Get subscribers for this channel
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(eventWithTimestamp);
        } catch (error) {
          console.error(
            `[Realtime] Error notifying subscriber on ${channel}:`,
            error,
          );
        }
      });
    }
  }

  /**
   * Subscribe to events on a channel
   */
  subscribe(
    channel: string,
    callback: (event: RealtimeEvent) => void,
  ): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }

    this.subscribers.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(channel);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  /**
   * Clear all subscribers for a channel
   */
  clearChannel(channel: string): void {
    this.subscribers.delete(channel);
  }

  /**
   * Clear all subscribers
   */
  clearAll(): void {
    this.subscribers.clear();
  }

  /**
   * Get subscriber count for a channel
   */
  getSubscriberCount(channel: string): number {
    return this.subscribers.get(channel)?.size ?? 0;
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

// For integration with Socket.io or other realtime systems
export function attachRealtimeToSocket(socket: any): void {
  // Subscribe socket to all events
  socket.on("subscribe-channel", (channel: string) => {
    const unsubscribe = realtimeManager.subscribe(channel, (event) => {
      socket.emit(`channel:${channel}`, event);
    });

    socket.on("disconnect", unsubscribe);
  });
}

export default realtimeManager;
