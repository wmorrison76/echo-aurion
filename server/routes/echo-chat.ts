import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router = Router();

// ============================================================================
// 1. MESSAGES - Core messaging with threading, reactions, rich content
// ============================================================================

// Get messages for conversation (with pagination)
router.get('/conversations/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const orgId = req.headers['x-org-id'];

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        reactions:chat_reactions(*),
        attachments:chat_attachments(*),
        thread_replies:chat_messages(id,sender_id,sender_name,text,timestamp,is_edited)
      `)
      .eq('conversation_id', conversationId)
      .is('parent_message_id', null) // Only top-level messages
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ messages: data || [], count: data?.length || 0 });
  } catch (error) {
    logger.error('Get messages error', { error });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get thread replies
router.get('/messages/:messageId/thread', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('parent_message_id', messageId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    res.json({ replies: data || [] });
  } catch (error) {
    logger.error('Get thread error', { error });
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// Send message (with threading, rich text, attachments)
router.post('/conversations/:conversationId/messages', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { senderId, senderName, text, richText, attachments, parentMessageId, mentions } = req.body;

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_name: senderName,
        text,
        rich_text: richText,
        parent_message_id: parentMessageId || null,
        mentions,
        timestamp: new Date(),
        is_edited: false,
      })
      .select();

    if (error) throw error;

    // Add attachments
    if (attachments && attachments.length > 0) {
      await supabase.from('chat_attachments').insert(
        attachments.map((att: any) => ({
          message_id: data[0].id,
          ...att,
        }))
      );
    }

    res.json(data[0]);
  } catch (error) {
    logger.error('Send message error', { error });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Edit message
router.put('/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { text, richText, userId } = req.body;

    const { data: existing } = await supabase
      .from('chat_messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (existing?.sender_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .update({
        text,
        rich_text: richText,
        is_edited: true,
        edited_at: new Date(),
      })
      .eq('id', messageId)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    logger.error('Edit message error', { error });
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.query.userId as string;

    const { data: message } = await supabase
      .from('chat_messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (message?.sender_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await supabase.from('chat_messages').delete().eq('id', messageId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete message error', { error });
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ============================================================================
// 2. REACTIONS - Emoji reactions on messages
// ============================================================================

router.post('/messages/:messageId/reactions', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { emoji, userId } = req.body;

    const { data, error } = await supabase
      .from('chat_reactions')
      .insert({
        message_id: messageId,
        emoji,
        user_id: userId,
      })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    logger.error('Add reaction error', { error });
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction
router.delete('/messages/:messageId/reactions/:emoji', async (req: Request, res: Response) => {
  try {
    const { messageId, emoji } = req.params;
    const userId = req.query.userId as string;

    await supabase
      .from('chat_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('emoji', emoji)
      .eq('user_id', userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Remove reaction error', { error });
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// ============================================================================
// 3. FILE SHARING
// ============================================================================

router.post('/messages/:messageId/upload', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { fileName, fileSize, fileType, fileUrl } = req.body;

    const { data, error } = await supabase
      .from('chat_attachments')
      .insert({
        message_id: messageId,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        file_url: fileUrl,
      })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    logger.error('Upload file error', { error });
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// ============================================================================
// 4. PRESENCE - Real-time user status
// ============================================================================

router.post('/presence/update', async (req: Request, res: Response) => {
  try {
    const { userId, userName, status, orgId } = req.body;

    const { data, error } = await supabase
      .from('chat_presence')
      .upsert({
        user_id: userId,
        user_name: userName,
        status, // online, away, busy, offline
        org_id: orgId,
        last_seen: new Date(),
      })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    logger.error('Update presence error', { error });
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

// Get online users in org
router.get('/presence/online', async (req: Request, res: Response) => {
  try {
    const orgId = req.headers['x-org-id'];
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const { data, error } = await supabase
      .from('chat_presence')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'online')
      .gt('last_seen', fiveMinutesAgo.toISOString());

    if (error) throw error;
    res.json({ users: data || [] });
  } catch (error) {
    logger.error('Get online users error', { error });
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// ============================================================================
// 5. SEARCH
// ============================================================================

router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const orgId = req.headers['x-org-id'];
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query || query.length < 3) {
      return res.json({ results: [] });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .ilike('text', `%${query}%`)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ results: data || [], query });
  } catch (error) {
    logger.error('Search error', { error });
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================================================
// 6. CONVERSATIONS
// ============================================================================

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const orgId = req.headers['x-org-id'];

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('org_id', orgId)
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ conversations: data || [] });
  } catch (error) {
    logger.error('Get conversations error', { error });
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const { orgId, type, participants, name, description } = req.body;

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        org_id: orgId,
        type, // 1to1, group, channel, beo, alert
        participants,
        name,
        description,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    logger.error('Create conversation error', { error });
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Add user to conversation (when they come online)
router.post('/conversations/:conversationId/participants', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { userId, userName } = req.body;

    const { data: conv } = await supabase
      .from('chat_conversations')
      .select('participants')
      .eq('id', conversationId)
      .single();

    if (!conv?.participants.includes(userId)) {
      const updated = [...(conv?.participants || []), userId];
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          participants: updated,
          updated_at: new Date(),
        })
        .eq('id', conversationId)
        .select();

      if (error) throw error;
      return res.json(data[0]);
    }

    res.json({ message: 'User already in conversation' });
  } catch (error) {
    logger.error('Add participant error', { error });
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

// ============================================================================
// 7. HOSPITALITY FEATURES
// ============================================================================

// BEO (Banquet Event) auto-thread
router.post('/beo/alert', async (req: Request, res: Response) => {
  try {
    const { eventId, eventName, courseNumber, fireTime, details, orgId } = req.body;

    const { data, error } = await supabase
      .from('chat_beo_alerts')
      .insert({
        event_id: eventId,
        event_name: eventName,
        course_number: courseNumber,
        fire_time: fireTime,
        details,
        org_id: orgId,
        created_at: new Date(),
      })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    logger.error('BEO alert error', { error });
    res.status(500).json({ error: 'Failed to create BEO alert' });
  }
});

// Allergen warning
router.post('/alerts/allergen', async (req: Request, res: Response) => {
  try {
    const { messageId, allergens, orderId, tableNumber, orgId } = req.body;

    const { data, error } = await supabase
      .from('chat_allergen_alerts')
      .insert({
        message_id: messageId,
        allergens,
        order_id: orderId,
        table_number: tableNumber,
        org_id: orgId,
        created_at: new Date(),
      })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    logger.error('Allergen alert error', { error });
    res.status(500).json({ error: 'Failed to create allergen alert' });
  }
});

export default router;
