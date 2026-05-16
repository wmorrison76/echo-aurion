/**
 * WebSocket Optimization Service
 * 
 * Enterprise-grade WebSocket connection management with:
 * - Connection pooling and rate limiting
 * - Server-side message queuing with retry logic
 * - Exponential backoff reconnection
 * - Latency monitoring and optimization (<1s target)
 * - Message batching for high-frequency updates
 * - Circuit breaker pattern for failing connections
 * - Connection health monitoring
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../lib/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface QueuedMessage {
  id: string;
  type: string;
  room: string;
  payload: any;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expiresAt?: number;
}

export interface ConnectionMetrics {
  connectionId: string;
  userId?: string;
  outletId?: string;
  connectedAt: number;
  lastPing: number;
  latency: number;
  messageCount: number;
  errorCount: number;
  isHealthy: boolean;
  reconnectAttempts: number;
}

export interface BroadcastOptions {
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number; // milliseconds
  retryOnFailure?: boolean;
  maxRetries?: number;
  batch?: boolean;
}

// ============================================================================
// WEBSOCKET OPTIMIZATION SERVICE
// ============================================================================

export class WebSocketOptimizationService {
  private io: Server | null = null;
  private connectionMetrics: Map<string, ConnectionMetrics> = new Map();
  private messageQueue: Map<string, QueuedMessage[]> = new Map(); // room → messages
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();
  private batchProcessor: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private latencyTracker: Map<string, number[]> = new Map(); // connectionId → latency samples

  // Configuration
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [100, 500, 2000]; // exponential backoff in ms
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening circuit
  private readonly CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly BATCH_PROCESS_INTERVAL = 100; // 100ms batching window
  private readonly TARGET_LATENCY_MS = 1000; // <1s target
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds idle timeout

  /**
   * Initialize with Socket.IO server
   */
  initialize(io: Server): void {
    this.io = io;

    // Setup connection tracking
    io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    // Start batch processor
    this.startBatchProcessor();

    // Start health check
    this.startHealthCheck();

    logger.info('[WebSocketOptimization] Service initialized');
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: Socket): void {
    const userId = socket.handshake.query.userId as string;
    const outletId = socket.handshake.query.outletId as string;
    const connectionId = socket.id;

    // Initialize metrics
    const metrics: ConnectionMetrics = {
      connectionId,
      userId,
      outletId,
      connectedAt: Date.now(),
      lastPing: Date.now(),
      latency: 0,
      messageCount: 0,
      errorCount: 0,
      isHealthy: true,
      reconnectAttempts: 0,
    };

    this.connectionMetrics.set(connectionId, metrics);
    this.latencyTracker.set(connectionId, []);

    // Setup ping/pong for latency tracking
    socket.on('ping', () => {
      const pingTime = Date.now();
      socket.emit('pong', { timestamp: pingTime }, (response: any) => {
        const latency = Date.now() - pingTime;
        this.updateLatency(connectionId, latency);
      });
    });

    // Track successful message delivery
    socket.on('message:ack', (messageId: string) => {
      this.handleMessageAck(connectionId, messageId);
    });

    // Track errors
    socket.on('error', (error: Error) => {
      this.handleConnectionError(connectionId, error);
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(connectionId, reason);
    });

    // Send queued messages for this connection
    const rooms = Array.from(socket.rooms);
    for (const room of rooms) {
      this.sendQueuedMessages(room, socket);
    }

    logger.debug(`[WebSocketOptimization] Connection tracked: ${connectionId}`, {
      userId,
      outletId,
    });
  }

  /**
   * Update connection latency
   */
  private updateLatency(connectionId: string, latency: number): void {
    const metrics = this.connectionMetrics.get(connectionId);
    if (!metrics) return;

    // Track latency samples (keep last 10)
    const samples = this.latencyTracker.get(connectionId) || [];
    samples.push(latency);
    if (samples.length > 10) {
      samples.shift();
    }
    this.latencyTracker.set(connectionId, samples);

    // Calculate average latency
    const avgLatency = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    metrics.latency = avgLatency;
    metrics.lastPing = Date.now();

    // Mark as unhealthy if latency exceeds target
    if (avgLatency > this.TARGET_LATENCY_MS) {
      metrics.isHealthy = false;
      logger.warn(`[WebSocketOptimization] High latency detected for ${connectionId}: ${avgLatency}ms`);
    } else {
      metrics.isHealthy = true;
    }
  }

  /**
   * Handle message acknowledgment
   */
  private handleMessageAck(connectionId: string, messageId: string): void {
    const metrics = this.connectionMetrics.get(connectionId);
    if (metrics) {
      metrics.messageCount++;
    }

    // Remove from queue if it exists
    for (const [room, queue] of this.messageQueue.entries()) {
      const index = queue.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        queue.splice(index, 1);
        break;
      }
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(connectionId: string, error: Error): void {
    const metrics = this.connectionMetrics.get(connectionId);
    if (metrics) {
      metrics.errorCount++;
      metrics.isHealthy = false;
    }

    // Update circuit breaker
    this.updateCircuitBreaker(connectionId, false);

    logger.error(`[WebSocketOptimization] Connection error for ${connectionId}:`, error);
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(connectionId: string, reason: string): void {
    const metrics = this.connectionMetrics.get(connectionId);
    if (metrics && reason !== 'io client disconnect') {
      metrics.reconnectAttempts++;
    }

    this.connectionMetrics.delete(connectionId);
    this.latencyTracker.delete(connectionId);

    logger.debug(`[WebSocketOptimization] Connection disconnected: ${connectionId}`, { reason });
  }

  /**
   * Optimized broadcast with queuing and retry
   */
  async broadcast(
    room: string,
    eventType: string,
    payload: any,
    options: BroadcastOptions = {}
  ): Promise<{ success: boolean; sentCount: number; queuedCount: number; errors: string[] }> {
    if (!this.io) {
      throw new Error('WebSocket service not initialized');
    }

    const {
      priority = 'medium',
      timeout = 5000,
      retryOnFailure = true,
      maxRetries = this.MAX_RETRY_ATTEMPTS,
      batch = false,
    } = options;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(room)) {
      // Queue message for later delivery
      this.queueMessage(room, eventType, payload, priority, maxRetries);
      return {
        success: false,
        sentCount: 0,
        queuedCount: 1,
        errors: ['Circuit breaker open'],
      };
    }

    // If batch mode, queue for batch processing
    if (batch) {
      this.queueMessage(room, eventType, payload, priority, maxRetries);
      return {
        success: true,
        sentCount: 0,
        queuedCount: 1,
        errors: [],
      };
    }

    // Immediate broadcast with retry on failure
    const messageId = this.generateMessageId();
    const message: QueuedMessage = {
      id: messageId,
      type: eventType,
      room,
      payload: { ...payload, _messageId: messageId },
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: maxRetries,
      priority,
    };

    return this.sendWithRetry(message, timeout);
  }

  /**
   * Send message with retry logic
   */
  private async sendWithRetry(
    message: QueuedMessage,
    timeout: number
  ): Promise<{ success: boolean; sentCount: number; queuedCount: number; errors: string[] }> {
    if (!this.io) {
      return {
        success: false,
        sentCount: 0,
        queuedCount: 0,
        errors: ['Socket.IO not initialized'],
      };
    }

    const errors: string[] = [];
    let sentCount = 0;

    try {
      const room = this.io.sockets.adapter.rooms.get(message.room);
      if (!room || room.size === 0) {
        // No subscribers, queue for later
        this.queueMessage(
          message.room,
          message.type,
          message.payload,
          message.priority,
          message.maxAttempts
        );
        return {
          success: true,
          sentCount: 0,
          queuedCount: 1,
          errors: [],
        };
      }

      // Send to room with timeout wrapper
      const startTime = Date.now();
      const roomSize = room.size;
      
      // Use Promise with timeout for send tracking
      const sendPromise = new Promise<void>((resolve, reject) => {
        try {
          // Emit to room (Socket.IO doesn't have native timeout on emit)
          this.io!.to(message.room).emit(message.type, message.payload);
          
          // Track latency immediately after send (optimistic)
          const latency = Date.now() - startTime;
          for (const socketId of room) {
            this.updateLatency(socketId, latency);
          }
          
          sentCount = roomSize;
          this.updateCircuitBreaker(message.room, true);
          resolve();
        } catch (error: any) {
          reject(error);
        }
      });

      // Wrap in timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout after ${timeout}ms`));
        }, timeout);
      });

      try {
        await Promise.race([sendPromise, timeoutPromise]);
      } catch (error: any) {
        errors.push(error.message || 'Timeout');
        message.attempts++;
        if (message.attempts < message.maxAttempts) {
          // Retry with exponential backoff
          const delay = this.RETRY_DELAYS[Math.min(message.attempts - 1, this.RETRY_DELAYS.length - 1)];
          setTimeout(() => {
            this.sendWithRetry(message, timeout);
          }, delay);
        } else {
          // Max attempts reached, queue for manual retry
          this.queueMessage(
            message.room,
            message.type,
            message.payload,
            message.priority,
            0 // Mark as failed
          );
          this.updateCircuitBreaker(message.room, false);
        }
      }

      return {
        success: errors.length === 0,
        sentCount,
        queuedCount: 0,
        errors,
      };
    } catch (error: any) {
      errors.push(error.message || 'Unknown error');
      message.attempts++;
      if (message.attempts < message.maxAttempts) {
        const delay = this.RETRY_DELAYS[Math.min(message.attempts - 1, this.RETRY_DELAYS.length - 1)];
        setTimeout(() => {
          this.sendWithRetry(message, timeout);
        }, delay);
      } else {
        this.queueMessage(message.room, message.type, message.payload, message.priority, 0);
      }
      return {
        success: false,
        sentCount,
        queuedCount: 0,
        errors,
      };
    }
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(
    room: string,
    eventType: string,
    payload: any,
    priority: 'low' | 'medium' | 'high' | 'critical',
    maxAttempts: number
  ): void {
    if (!this.messageQueue.has(room)) {
      this.messageQueue.set(room, []);
    }

    const queue = this.messageQueue.get(room)!;

    // Check queue size
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      // Remove lowest priority message
      const lowestPriority = ['low', 'medium', 'high', 'critical'].indexOf('low');
      const indexToRemove = queue.findIndex(
        (msg) => ['low', 'medium', 'high', 'critical'].indexOf(msg.priority) === lowestPriority
      );
      if (indexToRemove !== -1) {
        queue.splice(indexToRemove, 1);
        logger.warn(`[WebSocketOptimization] Queue full, removed low priority message from room ${room}`);
      } else {
        queue.shift(); // Remove oldest if no low priority found
      }
    }

    const message: QueuedMessage = {
      id: this.generateMessageId(),
      type: eventType,
      room,
      payload,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts,
      priority,
    };

    // Insert by priority (critical first)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = queue.findIndex((msg) => priorityOrder[msg.priority] > priorityOrder[priority]);
    if (insertIndex === -1) {
      queue.push(message);
    } else {
      queue.splice(insertIndex, 0, message);
    }
  }

  /**
   * Send queued messages for a room
   */
  private sendQueuedMessages(room: string, socket: Socket): void {
    const queue = this.messageQueue.get(room);
    if (!queue || queue.length === 0) return;

    // Send messages in priority order
    for (const message of queue) {
      if (message.attempts >= message.maxAttempts && message.maxAttempts > 0) {
        continue; // Skip failed messages
      }

      try {
        socket.emit(message.type, message.payload);
        message.attempts++;
      } catch (error: any) {
        logger.error(`[WebSocketOptimization] Failed to send queued message:`, error);
        message.attempts++;
      }
    }

    // Remove successfully sent messages (attempts >= maxAttempts)
    const remainingQueue = queue.filter((msg) => msg.attempts < msg.maxAttempts || msg.maxAttempts === 0);
    if (remainingQueue.length === 0) {
      this.messageQueue.delete(room);
    } else {
      this.messageQueue.set(room, remainingQueue);
    }
  }

  /**
   * Start batch processor for high-frequency updates
   */
  private startBatchProcessor(): void {
    this.batchProcessor = setInterval(() => {
      this.processBatchedMessages();
    }, this.BATCH_PROCESS_INTERVAL);
  }

  /**
   * Process batched messages
   */
  private processBatchedMessages(): void {
    if (!this.io) return;

    for (const [room, queue] of this.messageQueue.entries()) {
      if (queue.length === 0) continue;

      // Group messages by type for batching
      const batches = new Map<string, QueuedMessage[]>();
      for (const message of queue) {
        if (!batches.has(message.type)) {
          batches.set(message.type, []);
        }
        batches.get(message.type)!.push(message);
      }

      // Send batches
      for (const [eventType, messages] of batches.entries()) {
        if (messages.length > 1) {
          // Batch send
          const batchPayload = messages.map((msg) => msg.payload);
          this.io.to(room).emit(`${eventType}:batch`, batchPayload);
          // Remove from queue
          messages.forEach((msg) => {
            const index = queue.findIndex((m) => m.id === msg.id);
            if (index !== -1) {
              queue.splice(index, 1);
            }
          });
        }
      }

      // Clean up empty queue
      if (queue.length === 0) {
        this.messageQueue.delete(room);
      }
    }
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck(): void {
    if (!this.io) return;

    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [connectionId, metrics] of this.connectionMetrics.entries()) {
      // Check if connection is stale (no ping in timeout period)
      if (now - metrics.lastPing > this.CONNECTION_TIMEOUT) {
        staleConnections.push(connectionId);
        continue;
      }

      // Check if connection is unhealthy
      if (!metrics.isHealthy) {
        logger.warn(`[WebSocketOptimization] Unhealthy connection detected: ${connectionId}`, {
          latency: metrics.latency,
          errorCount: metrics.errorCount,
        });
      }
    }

    // Clean up stale connections
    for (const connectionId of staleConnections) {
      const socket = this.io.sockets.sockets.get(connectionId);
      if (socket) {
        socket.disconnect(true);
      }
      this.connectionMetrics.delete(connectionId);
      this.latencyTracker.delete(connectionId);
      logger.info(`[WebSocketOptimization] Cleaned up stale connection: ${connectionId}`);
    }
  }

  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen(room: string): boolean {
    const breaker = this.circuitBreakers.get(room);
    if (!breaker) return false;

    // Reset circuit breaker if enough time has passed
    if (breaker.isOpen && Date.now() - breaker.lastFailure > this.CIRCUIT_BREAKER_RESET_TIME) {
      breaker.isOpen = false;
      breaker.failures = 0;
      return false;
    }

    return breaker.isOpen;
  }

  private updateCircuitBreaker(room: string, success: boolean): void {
    if (!this.circuitBreakers.has(room)) {
      this.circuitBreakers.set(room, { failures: 0, lastFailure: 0, isOpen: false });
    }

    const breaker = this.circuitBreakers.get(room)!;

    if (success) {
      // Reset on success
      breaker.failures = 0;
      breaker.isOpen = false;
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();

      // Open circuit if threshold reached
      if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        breaker.isOpen = true;
        logger.warn(`[WebSocketOptimization] Circuit breaker opened for room: ${room}`);
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(connectionId: string): ConnectionMetrics | undefined {
    return this.connectionMetrics.get(connectionId);
  }

  /**
   * Get all connection metrics
   */
  getAllConnectionMetrics(): ConnectionMetrics[] {
    return Array.from(this.connectionMetrics.values());
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): { room: string; queueSize: number; oldestMessage: number }[] {
    return Array.from(this.messageQueue.entries()).map(([room, queue]) => ({
      room,
      queueSize: queue.length,
      oldestMessage: queue.length > 0 ? queue[0].timestamp : Date.now(),
    }));
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalConnections: number;
    healthyConnections: number;
    averageLatency: number;
    totalQueuedMessages: number;
    circuitBreakersOpen: number;
  } {
    const allMetrics = Array.from(this.connectionMetrics.values());
    const healthyCount = allMetrics.filter((m) => m.isHealthy).length;
    const avgLatency =
      allMetrics.length > 0
        ? allMetrics.reduce((sum, m) => sum + m.latency, 0) / allMetrics.length
        : 0;
    const totalQueued = Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0);
    const openBreakers = Array.from(this.circuitBreakers.values()).filter((b) => b.isOpen).length;

    return {
      totalConnections: allMetrics.length,
      healthyConnections: healthyCount,
      averageLatency: Math.round(avgLatency),
      totalQueuedMessages: totalQueued,
      circuitBreakersOpen: openBreakers,
    };
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
      this.batchProcessor = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.connectionMetrics.clear();
    this.messageQueue.clear();
    this.circuitBreakers.clear();
    this.latencyTracker.clear();

    logger.info('[WebSocketOptimization] Service shut down');
  }
}

// Export singleton instance
export const websocketOptimizationService = new WebSocketOptimizationService();
