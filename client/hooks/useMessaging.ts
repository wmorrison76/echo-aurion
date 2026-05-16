import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from './use-toast';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  readBy: string[];
  reactions?: { emoji: string; userId: string }[];
}

export interface Conversation {
  id: string;
  orgId: string;
  type: '1to1' | 'group' | 'shift-channel';
  participants: string[];
  name: string;
  createdAt: Date;
}

export const useMessaging = (userId: string, orgId: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/messaging/conversations?userId=${userId}&orgId=${orgId}`);
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userId, orgId, toast]);

  // Fetch messages for conversation
  const fetchMessages = useCallback(async (conversationId: string, limit = 50, offset = 0) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/messaging/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
      );
      const data = await res.json();
      setMessages(data.reverse());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!currentConversationId || !text.trim()) return;

      try {
        const res = await fetch(
          `/api/messaging/conversations/${currentConversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: userId,
              senderName: 'User',
              text: text.trim(),
            }),
          }
        );

        if (!res.ok) throw new Error('Failed to send');

        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to send message',
          variant: 'destructive',
        });
      }
    },
    [currentConversationId, userId, toast]
  );

  // Create conversation
  const createConversation = useCallback(
    async (type: '1to1' | 'group' | 'shift-channel', participants: string[], name?: string) => {
      try {
        const res = await fetch('/api/messaging/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orgId,
            type,
            participants,
            name: name || participants.join(', '),
          }),
        });

        if (!res.ok) throw new Error('Failed to create');

        const conversation = await res.json();
        setConversations((prev) => [...prev, conversation]);
        setCurrentConversationId(conversation.id);
        return conversation;
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to create conversation',
          variant: 'destructive',
        });
      }
    },
    [orgId, toast]
  );

  // Mark as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!currentConversationId || messageIds.length === 0) return;

    try {
      await fetch(`/api/messaging/conversations/${currentConversationId}/mark-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds,
          userId,
        }),
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [currentConversationId, userId]);

  // Add reaction
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await fetch(`/api/messaging/messages/${messageId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emoji,
            userId,
          }),
        });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  reactions: [...(msg.reactions || []), { emoji, userId }],
                }
              : msg
          )
        );
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to add reaction',
          variant: 'destructive',
        });
      }
    },
    [userId, toast]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await fetch(`/api/messaging/messages/${messageId}?userId=${userId}`, {
          method: 'DELETE',
        });

        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete message',
          variant: 'destructive',
        });
      }
    },
    [userId, toast]
  );

  // Handle typing indicator
  const handleTyping = useCallback((typingUserId: string, userName: string) => {
    setTypingUsers((prev) => new Set(prev).add(userName));

    const existingTimeout = typingTimeouts.current.get(typingUserId);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeout = setTimeout(() => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userName);
        return newSet;
      });
      typingTimeouts.current.delete(typingUserId);
    }, 3000);

    typingTimeouts.current.set(typingUserId, timeout);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId, fetchMessages]);

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    messages,
    loading,
    typingUsers,
    fetchConversations,
    fetchMessages,
    sendMessage,
    createConversation,
    markAsRead,
    addReaction,
    deleteMessage,
    handleTyping,
  };
};
