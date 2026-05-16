import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  readBy: string[];
}

interface Conversation {
  id: string;
  orgId: string;
  type: '1to1' | 'group' | 'shift-channel';
  participants: string[];
  name: string;
  createdAt: Date;
}

// Get conversations for user
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const orgId = req.query.orgId as string;

    if (!userId || !orgId) {
      return res.status(400).json({ error: 'userId and orgId required' });
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('org_id', orgId)
      .contains('participants', [userId]);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    logger.error('Get conversations error', { error });
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const { orgId, type, participants, name } = req.body;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        org_id: orgId,
        type,
        participants,
        name,
        created_at: new Date(),
      })
      .select();

    if (error) throw error;

    res.json(data?.[0]);
  } catch (error) {
    logger.error('Create conversation error', { error });
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Create shift-linked channel (best-in-class: channel per shift from Schedule)
router.post('/channels/shift', async (req: Request, res: Response) => {
  try {
    const { orgId, shiftId, name, participantIds } = req.body;
    if (!orgId || !shiftId) {
      return res.status(400).json({ error: 'orgId and shiftId required' });
    }
    const participants = Array.isArray(participantIds) ? participantIds : [];
    const channelName = name || `Shift ${shiftId}`;
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        org_id: orgId,
        type: 'shift-channel',
        participants,
        name: channelName,
        created_at: new Date(),
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    logger.error('Create shift channel error', { error });
    res.status(500).json({ error: 'Failed to create shift channel' });
  }
});

// Push notification stub: queue mention for inactive user (integration point for FCM/APNs)
router.post('/notify-mention', async (req: Request, res: Response) => {
  try {
    const { userId, conversationId, messageId, mentionedBy, textSnippet } = req.body;
    if (!userId || !messageId || !mentionedBy) {
      return res.status(400).json({ error: 'userId, messageId, mentionedBy required' });
    }
    logger.info('Mention push stub', {
      userId,
      conversationId,
      messageId,
      mentionedBy,
      textSnippet: (textSnippet || '').slice(0, 80),
    });
    res.status(202).json({
      accepted: true,
      message: 'Mention notification queued (push integration point)',
      delivery: 'stub',
    });
  } catch (error) {
    logger.error('Notify mention error', { error });
    res.status(500).json({ error: 'Failed to queue mention notification' });
  }
});

// Get messages in conversation
router.get('/conversations/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    logger.error('Get messages error', { error });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/conversations/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { senderId, senderName, text } = req.body;

    if (!text || !senderId) {
      return res.status(400).json({ error: 'text and senderId required' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_name: senderName,
        text,
        timestamp: new Date(),
        read_by: [senderId],
      })
      .select();

    if (error) throw error;

    res.json(data?.[0]);
  } catch (error) {
    logger.error('Send message error', { error });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/conversations/:conversationId/mark-read', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { messageIds, userId } = req.body;

    const { error } = await supabase
      .from('messages')
      .update({ read_by: [userId] })
      .in('id', messageIds);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    logger.error('Mark read error', { error });
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Add reaction
router.post('/messages/:messageId/reactions', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { emoji, userId } = req.body;

    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        emoji,
        user_id: userId,
        created_at: new Date(),
      })
      .select();

    if (error) throw error;

    res.json(data?.[0]);
  } catch (error) {
    logger.error('Add reaction error', { error });
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Delete message
router.delete('/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.query.userId as string;

    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError) throw fetchError;

    if (message?.sender_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    logger.error('Delete message error', { error });
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
