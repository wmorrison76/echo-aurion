/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 6 Day 30
 * Team Messaging Service
 * 
 * Features:
 * - WebSocket for real-time messaging
 * - Message queue (Redis) for distributed systems
 * - Typing indicators
 * - Read receipts
 * - Notifications
 * - Moderation
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../logger';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  readBy: string[];
  attachments?: { id: string; url: string; type: string }[];
  reactions?: { emoji: string; userId: string }[];
}

interface Conversation {
  id: string;
  orgId: string;
  type: '1to1' | 'group' | 'shift-channel';
  participants: string[];
  name: string;
  createdAt: Date;
}

interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
}

export class MessagingService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private typingIndicators: Map<string, TypingIndicator> = new Map();
  private messageQueue: Message[] = [];

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.handshake.auth.userId as string;
      const userName = socket.handshake.auth.userName as string;

      logger.info('User connected to messaging', { userId, socketId: socket.id });

      // Track user connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);

      // Broadcast user online status
      this.io.emit('user-online', { userId, userName });

      // Handle messaging events
      socket.on('send-message', (data) => this.handleSendMessage(socket, userId, data));
      socket.on('typing', (data) => this.handleTyping(socket, userId, userName, data));
      socket.on('stop-typing', (data) => this.handleStopTyping(socket, userId, data));
      socket.on('mark-as-read', (data) => this.handleMarkAsRead(socket, userId, data));
      socket.on('add-reaction', (data) => this.handleAddReaction(socket, userId, data));
      socket.on('disconnect', () => this.handleDisconnect(socket, userId));
    });
  }

  /**
   * Handle incoming message
   */
  private async handleSendMessage(socket: Socket, userId: string, data: any): Promise<void> {
    try {
      const { conversationId, text, attachments } = data;

      // Moderation: Check for inappropriate content
      if (this.containsInappropriateContent(text)) {
        logger.warn('Inappropriate content detected', { userId, conversationId });
        socket.emit('error', { message: 'Your message contains inappropriate content' });
        return;
      }

      const message: Message = {
        id: 'msg-' + Date.now(),
        conversationId,
        senderId: userId,
        senderName: socket.handshake.auth.userName,
        text,
        timestamp: new Date(),
        readBy: [userId],
        attachments,
      };

      // Save to queue for persistence
      this.messageQueue.push(message);

      // TODO: In production, save to database
      // await db.insert('messages').values(message);

      logger.debug('Message sent', {
        conversationId,
        messageId: message.id,
        userId,
      });

      // Broadcast to conversation participants
      this.io.to(conversationId).emit('new-message', message);

      // Send notification to offline users
      // TODO: In production, send push notifications
    } catch (error) {
      logger.error('Send message error', {
        error: error instanceof Error ? error.message : String(error),
      });
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(
    socket: Socket,
    userId: string,
    userName: string,
    data: any
  ): void {
    const { conversationId } = data;
    const typingKey = `${conversationId}-${userId}`;

    this.typingIndicators.set(typingKey, {
      conversationId,
      userId,
      userName,
    });

    // Broadcast typing indicator
    this.io.to(conversationId).emit('user-typing', {
      userId,
      userName,
      conversationId,
    });

    // Clear typing indicator after 3 seconds
    setTimeout(() => {
      this.typingIndicators.delete(typingKey);
      this.io.to(conversationId).emit('user-stopped-typing', { userId, conversationId });
    }, 3000);
  }

  /**
   * Handle stop typing
   */
  private handleStopTyping(socket: Socket, userId: string, data: any): void {
    const { conversationId } = data;
    const typingKey = `${conversationId}-${userId}`;

    this.typingIndicators.delete(typingKey);

    // Broadcast stop typing
    this.io.to(conversationId).emit('user-stopped-typing', {
      userId,
      conversationId,
    });
  }

  /**
   * Handle mark as read
   */
  private async handleMarkAsRead(socket: Socket, userId: string, data: any): Promise<void> {
    try {
      const { messageId, conversationId } = data;

      // TODO: In production, update message readBy
      // await db.update('messages').set({
      //   readBy: [...message.readBy, userId]
      // }).where({ id: messageId });

      // Broadcast read receipt
      this.io.to(conversationId).emit('message-read', {
        messageId,
        userId,
        conversationId,
      });

      logger.debug('Message marked as read', { messageId, userId });
    } catch (error) {
      logger.error('Mark as read error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle reaction
   */
  private async handleAddReaction(socket: Socket, userId: string, data: any): Promise<void> {
    try {
      const { messageId, conversationId, emoji } = data;

      // TODO: In production, save reaction
      // await db.insert('message_reactions').values({
      //   messageId,
      //   userId,
      //   emoji,
      //   createdAt: new Date(),
      // });

      // Broadcast reaction
      this.io.to(conversationId).emit('reaction-added', {
        messageId,
        emoji,
        userId,
        conversationId,
      });

      logger.debug('Reaction added', { messageId, emoji, userId });
    } catch (error) {
      logger.error('Add reaction error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: Socket, userId: string): void {
    const socketIds = this.connectedUsers.get(userId);

    if (socketIds) {
      socketIds.delete(socket.id);

      // If no more connections, mark as offline
      if (socketIds.size === 0) {
        this.connectedUsers.delete(userId);
        this.io.emit('user-offline', { userId });

        logger.info('User disconnected from messaging', { userId });
      }
    }
  }

  /**
   * Check for inappropriate content
   */
  private containsInappropriateContent(text: string): boolean {
    // Simple implementation - in production, use ML-based content moderation
    const bannedWords = ['spam', 'abuse']; // Simplified example
    const lowerText = text.toLowerCase();
    return bannedWords.some((word) => lowerText.includes(word));
  }

  /**
   * Persist pending messages to database
   */
  async persistMessages(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    try {
      const batch = this.messageQueue.splice(0, 100); // Process 100 at a time

      // TODO: In production, batch insert
      // await db.insert('messages').values(batch);

      logger.info('Messages persisted', { count: batch.length });
    } catch (error) {
      logger.error('Message persistence error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get users in conversation
   */
  getUsersInConversation(conversationId: string): string[] {
    const sockets = this.io.sockets.adapter.rooms.get(conversationId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Broadcast to conversation
   */
  broadcastToConversation(conversationId: string, event: string, data: any): void {
    this.io.to(conversationId).emit(event, data);
  }

  /**
   * Send notification to user
   */
  sendNotificationToUser(userId: string, notification: any): void {
    const socketIds = this.connectedUsers.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.io.to(socketId).emit('notification', notification);
      });
    }
  }
}

/**
 * Initialize messaging service
 */
export function initializeMessaging(httpServer: HTTPServer): MessagingService {
  const messagingService = new MessagingService(httpServer);

  // Persist messages every 30 seconds
  setInterval(() => {
    messagingService.persistMessages();
  }, 30000);

  logger.info('Messaging service initialized');

  return messagingService;
}
