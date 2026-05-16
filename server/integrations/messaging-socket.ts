/**
 * Socket.io Messaging Integration
 * Real-time team messaging with presence, typing indicators, and read receipts
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../lib/logger';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

interface SocketUser {
  userId: string;
  orgId: string;
  userName: string;
  channelIds: Set<string>;
}

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  parent_message_id?: string;
  attachments?: Array<{ url: string; type: string; name: string }>;
  mentioned_user_ids?: string[];
  read_by?: string[];
}

/**
 * Initialize Socket.io messaging
 */
export function initializeMessagingSocket(io: SocketServer): void {
  // Store user socket mappings
  const userSockets = new Map<string, SocketUser>();
  const typingUsers = new Map<string, Set<string>>(); // channel -> set of typing users
  
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth.userId;
    const orgId = socket.handshake.auth.orgId;
    const userName = socket.handshake.auth.userName || 'Unknown';
    
    logger.info(`[MESSAGING] User ${userId} connected: ${socket.id}`);
    
    // Store user info
    const socketUser: SocketUser = {
      userId,
      orgId,
      userName,
      channelIds: new Set(),
    };
    userSockets.set(socket.id, socketUser);
    
    // Join org room (for broadcasts)
    socket.join(`org:${orgId}`);
    
    // Notify org that user is online
    io.to(`org:${orgId}`).emit('user-online', {
      userId,
      userName,
      timestamp: new Date(),
    });
    
    /**
     * JOIN CHANNEL
     * User joins a messaging channel
     */
    socket.on('join-channel', async (data) => {
      const { channelId } = data;
      
      try {
        // Verify user is member of channel
        const { data: channel } = await supabase
          .from('channels')
          .select('member_ids')
          .eq('id', channelId)
          .single();
        
        if (!channel || !channel.member_ids?.includes(userId)) {
          socket.emit('error', { message: 'Not a member of this channel' });
          return;
        }
        
        // Add socket to channel room
        socket.join(`channel:${channelId}`);
        socketUser.channelIds.add(channelId);
        
        logger.info(`[MESSAGING] User ${userId} joined channel ${channelId}`);
        
        // Fetch message history
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('channel_id', channelId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(50);
        
        socket.emit('message-history', {
          channelId,
          messages: (messages || []).reverse(),
          totalMessages: messages?.length || 0,
        });
        
        // Notify channel that user joined
        io.to(`channel:${channelId}`).emit('user-joined', {
          userId,
          userName,
          timestamp: new Date(),
        });
        
      } catch (error) {
        logger.error('[MESSAGING] Join channel error:', error);
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });
    
    /**
     * SEND MESSAGE
     * User sends a message to channel
     */
    socket.on('send-message', async (data) => {
      const { channelId, content, parentMessageId, attachments } = data;
      
      if (!content.trim()) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }
      
      try {
        // Extract mentions (@username)
        const mentionRegex = /@(\w+)/g;
        const mentionMatches = content.matchAll(mentionRegex);
        const mentionedUserIds: string[] = [];
        
        for (const match of mentionMatches) {
          // In production, resolve @username to user_id
          const username = match[1];
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('name', username)
            .eq('org_id', orgId)
            .single();
          
          if (user) {
            mentionedUserIds.push(user.id);
          }
        }
        
        // Create message in database
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            org_id: orgId,
            channel_id: channelId,
            user_id: userId,
            content,
            parent_message_id: parentMessageId,
            attachments: attachments || [],
            mentioned_user_ids: mentionedUserIds,
            created_at: new Date(),
          })
          .select()
          .single();
        
        if (error) throw error;
        
        const messageWithUser: Message = {
          ...message,
          user_name: userName,
        };
        
        // Broadcast to channel
        io.to(`channel:${channelId}`).emit('new-message', messageWithUser);
        
        // Send notifications to mentioned users
        for (const mentionedUserId of mentionedUserIds) {
          io.to(`org:${orgId}`).emit('user-mentioned', {
            mentionedUserId,
            messageId: message.id,
            channelId,
            mentionedBy: userName,
            preview: content.substring(0, 50),
          });
        }
        
        logger.info(`[MESSAGING] Message sent in channel ${channelId}`);
        
      } catch (error) {
        logger.error('[MESSAGING] Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    /**
     * TYPING INDICATOR
     * User is typing in channel
     */
    socket.on('start-typing', (data) => {
      const { channelId } = data;
      
      if (!typingUsers.has(channelId)) {
        typingUsers.set(channelId, new Set());
      }
      typingUsers.get(channelId)!.add(userId);
      
      io.to(`channel:${channelId}`).emit('user-typing', {
        userId,
        userName,
        timestamp: new Date(),
      });
    });
    
    socket.on('stop-typing', (data) => {
      const { channelId } = data;
      
      if (typingUsers.has(channelId)) {
        typingUsers.get(channelId)!.delete(userId);
      }
      
      io.to(`channel:${channelId}`).emit('user-stopped-typing', { userId });
    });
    
    /**
     * MESSAGE READ RECEIPT
     * User read a message
     */
    socket.on('message-read', async (data) => {
      const { messageId, channelId } = data;
      
      try {
        // Update read receipt in DB
        await supabase
          .from('message_read_receipts')
          .upsert({
            message_id: messageId,
            user_id: userId,
            read_at: new Date(),
          });
        
        // Notify channel
        io.to(`channel:${channelId}`).emit('message-read', {
          messageId,
          readBy: userId,
          readByName: userName,
          readAt: new Date(),
        });
        
      } catch (error) {
        logger.error('[MESSAGING] Read receipt error:', error);
      }
    });
    
    /**
     * DELETE MESSAGE
     * Soft delete (mark as deleted_at)
     */
    socket.on('delete-message', async (data) => {
      const { messageId, channelId } = data;
      
      try {
        // Get message to verify ownership
        const { data: message } = await supabase
          .from('messages')
          .select('user_id')
          .eq('id', messageId)
          .single();
        
        if (message?.user_id !== userId) {
          socket.emit('error', { message: 'Cannot delete message you did not send' });
          return;
        }
        
        // Soft delete
        await supabase
          .from('messages')
          .update({ deleted_at: new Date() })
          .eq('id', messageId);
        
        // Notify channel
        io.to(`channel:${channelId}`).emit('message-deleted', { messageId });
        
        logger.info(`[MESSAGING] Message ${messageId} deleted`);
        
      } catch (error) {
        logger.error('[MESSAGING] Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });
    
    /**
     * EDIT MESSAGE
     */
    socket.on('edit-message', async (data) => {
      const { messageId, content, channelId } = data;
      
      if (!content.trim()) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }
      
      try {
        // Verify ownership
        const { data: message } = await supabase
          .from('messages')
          .select('user_id')
          .eq('id', messageId)
          .single();
        
        if (message?.user_id !== userId) {
          socket.emit('error', { message: 'Cannot edit message you did not send' });
          return;
        }
        
        // Update message
        const { data: updated } = await supabase
          .from('messages')
          .update({ content, updated_at: new Date() })
          .eq('id', messageId)
          .select()
          .single();
        
        // Notify channel
        io.to(`channel:${channelId}`).emit('message-edited', {
          messageId,
          content,
          updatedAt: updated?.updated_at,
        });
        
      } catch (error) {
        logger.error('[MESSAGING] Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });
    
    /**
     * DISCONNECT
     */
    socket.on('disconnect', () => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      
      // Notify org that user went offline
      io.to(`org:${user.orgId}`).emit('user-offline', {
        userId: user.userId,
        timestamp: new Date(),
      });
      
      // Clean up typing indicators
      for (const [channelId, typingSet] of typingUsers.entries()) {
        if (typingSet.has(user.userId)) {
          typingSet.delete(user.userId);
          io.to(`channel:${channelId}`).emit('user-stopped-typing', {
            userId: user.userId,
          });
        }
      }
      
      userSockets.delete(socket.id);
      logger.info(`[MESSAGING] User ${user.userId} disconnected`);
    });
  });
}

export default initializeMessagingSocket;
