import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from './use-toast';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  richText?: any; // Slate/Prosemirror format
  timestamp: Date;
  parentMessageId?: string;
  isEdited: boolean;
  editedAt?: Date;
  mentions?: string[];
  reactions?: { emoji: string; userId: string }[];
  attachments?: ChatAttachment[];
  threadReplies?: ChatMessage[];
  threadReplyCount?: number;
}

export interface ChatAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedAt: Date;
}

export interface ChatConversation {
  id: string;
  orgId: string;
  type: '1to1' | 'group' | 'channel' | 'beo' | 'alert';
  participants: string[];
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
}

export interface ChatUser {
  id: string;
  name: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  department?: string;
  avatar?: string;
}

export interface BeoAlert {
  id: string;
  eventId: string;
  eventName: string;
  courseNumber: number;
  fireTime: Date;
  details: string;
  createdAt: Date;
}

export const useEchoChat = (userId: string, orgId: string, userName: string) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [callState, setCallState] = useState<{
    active: boolean;
    participantId?: string;
    stream?: MediaStream;
  }>({ active: false });

  const { toast } = useToast();
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pollInterval = useRef<NodeJS.Timeout>();

  const headers = {
    'Content-Type': 'application/json',
    'X-Org-ID': orgId,
  };

  // ============================================================================
  // CONVERSATIONS
  // ============================================================================

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/echo-chat/conversations?userId=${userId}`, { headers });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load conversations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [userId, headers, toast]);

  const createConversation = useCallback(
    async (type: ChatConversation['type'], participants: string[], name?: string) => {
      try {
        const res = await fetch('/api/echo-chat/conversations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            orgId,
            type,
            participants: [...new Set([...participants, userId])],
            name: name || participants.join(', '),
          }),
        });
        const conversation = await res.json();
        setConversations((prev) => [...prev, conversation]);
        setCurrentConversationId(conversation.id);
        return conversation;
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to create conversation', variant: 'destructive' });
      }
    },
    [userId, orgId, headers, toast]
  );

  // Add participant when they come online
  const addParticipantOnline = useCallback(
    async (conversationId: string, newUserId: string, newUserName: string) => {
      try {
        await fetch(`/api/echo-chat/conversations/${conversationId}/participants`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId: newUserId, userName: newUserName }),
        });
        toast({ title: 'Success', description: `${newUserName} joined the chat` });
      } catch (error) {
        console.error('Failed to add participant:', error);
      }
    },
    [headers, toast]
  );

  // ============================================================================
  // MESSAGES
  // ============================================================================

  const fetchMessages = useCallback(
    async (conversationId: string, limit = 50, offset = 0) => {
      if (!conversationId) return;
      try {
        setLoading(true);
        const res = await fetch(
          `/api/echo-chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
          { headers }
        );
        const data = await res.json();
        const normalized = (data.messages || []).map((msg: any) => ({
          ...msg,
          text: msg.text || msg.content || "",
          richText: msg.richText ?? msg.rich_text ?? null,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));
        setMessages(normalized.reverse());
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load messages', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    },
    [headers, toast]
  );

  const sendMessage = useCallback(
    async (text: string, richText?: any, attachments?: ChatAttachment[], parentMessageId?: string) => {
      if (!currentConversationId || !text.trim()) return;

      try {
        const res = await fetch(
          `/api/echo-chat/conversations/${currentConversationId}/messages`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              senderId: userId,
              senderName: userName,
              text: text.trim(),
              richText,
              attachments,
              parentMessageId,
            }),
          }
        );

        if (!res.ok) throw new Error('Failed to send');

        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
      }
    },
    [currentConversationId, userId, userName, headers, toast]
  );

  const editMessage = useCallback(
    async (messageId: string, text: string, richText?: any) => {
      try {
        const res = await fetch(`/api/echo-chat/messages/${messageId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ text, richText, userId }),
        });

        if (!res.ok) throw new Error('Unauthorized');

        const updated = await res.json();
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? updated : msg))
        );
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to edit message', variant: 'destructive' });
      }
    },
    [userId, headers, toast]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await fetch(`/api/echo-chat/messages/${messageId}?userId=${userId}`, {
          method: 'DELETE',
          headers,
        });

        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
      }
    },
    [userId, headers, toast]
  );

  // ============================================================================
  // THREAD REPLIES
  // ============================================================================

  const fetchThreadReplies = useCallback(
    async (messageId: string) => {
      try {
        const res = await fetch(`/api/echo-chat/messages/${messageId}/thread`, { headers });
        const data = await res.json();

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, threadReplies: data.replies || [], threadReplyCount: data.replies?.length || 0 }
              : msg
          )
        );
      } catch (error) {
        console.error('Failed to fetch thread:', error);
      }
    },
    [headers]
  );

  // ============================================================================
  // REACTIONS
  // ============================================================================

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await fetch(`/api/echo-chat/messages/${messageId}/reactions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ emoji, userId }),
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
        toast({ title: 'Error', description: 'Failed to add reaction', variant: 'destructive' });
      }
    },
    [userId, headers, toast]
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await fetch(`/api/echo-chat/messages/${messageId}/reactions/${emoji}?userId=${userId}`, {
          method: 'DELETE',
          headers,
        });

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  reactions: (msg.reactions || []).filter(
                    (r) => !(r.emoji === emoji && r.userId === userId)
                  ),
                }
              : msg
          )
        );
      } catch (error) {
        console.error('Failed to remove reaction:', error);
      }
    },
    [userId, headers, toast]
  );

  // ============================================================================
  // PRESENCE
  // ============================================================================

  const updatePresence = useCallback(
    async (status: 'online' | 'away' | 'busy' | 'offline') => {
      try {
        await fetch('/api/echo-chat/presence/update', {
          method: 'POST',
          headers,
          body: JSON.stringify({ userId, userName, status, orgId }),
        });
      } catch (error) {
        console.error('Failed to update presence:', error);
      }
    },
    [userId, userName, orgId, headers]
  );

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/echo-chat/presence/online', { headers });
      const data = await res.json();
      setOnlineUsers(data.users || []);

      // Auto-add new online users to current conversation
      if (currentConversationId) {
        for (const user of data.users) {
          if (user.id !== userId) {
            await addParticipantOnline(currentConversationId, user.id, user.user_name);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch online users:', error);
    }
  }, [currentConversationId, userId, headers, addParticipantOnline]);

  // ============================================================================
  // SEARCH
  // ============================================================================

  const search = useCallback(
    async (query: string) => {
      if (query.length < 3) {
        setSearchResults([]);
        return;
      }

      try {
        setSearching(true);
        const res = await fetch(`/api/echo-chat/search?q=${encodeURIComponent(query)}&limit=20`, {
          headers,
        });
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (error) {
        toast({ title: 'Error', description: 'Search failed', variant: 'destructive' });
      } finally {
        setSearching(false);
      }
    },
    [headers, toast]
  );

  // ============================================================================
  // VIDEO CALLS
  // ============================================================================

  const startCall = useCallback(
    async (participantId: string) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 1280, height: 720 },
        });

        setCallState({
          active: true,
          participantId,
          stream,
        });

        // Notify other participant
        await sendMessage(`${userName} is calling...`);
      } catch (error) {
        toast({
          title: 'Camera Error',
          description: 'Unable to access camera/microphone',
          variant: 'destructive',
        });
      }
    },
    [userName, sendMessage, toast]
  );

  const endCall = useCallback(() => {
    if (callState.stream) {
      callState.stream.getTracks().forEach((track) => track.stop());
    }
    setCallState({ active: false });
  }, [callState.stream]);

  // ============================================================================
  // TYPING INDICATOR
  // ============================================================================

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

  // ============================================================================
  // INITIALIZATION & POLLING
  // ============================================================================

  useEffect(() => {
    fetchConversations();
    updatePresence('online');

    // Poll for new online users every 10 seconds
    const interval = setInterval(fetchOnlineUsers, 10000);

    return () => clearInterval(interval);
  }, [fetchConversations, updatePresence, fetchOnlineUsers]);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);

      // Poll for new messages every 2 seconds
      pollInterval.current = setInterval(() => {
        fetchMessages(currentConversationId);
      }, 2000);
    }

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [currentConversationId, fetchMessages]);

  // Mark as offline on unmount
  useEffect(() => {
    return () => {
      updatePresence('offline');
    };
  }, [updatePresence]);

  return {
    // State
    conversations,
    currentConversationId,
    messages,
    onlineUsers,
    loading,
    searching,
    searchResults,
    typingUsers,
    callState,

    // Conversation methods
    setCurrentConversationId,
    fetchConversations,
    createConversation,
    addParticipantOnline,

    // Message methods
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    fetchThreadReplies,

    // Reactions
    addReaction,
    removeReaction,

    // Presence
    updatePresence,
    fetchOnlineUsers,

    // Search
    search,

    // Calls
    startCall,
    endCall,

    // Typing
    handleTyping,
  };
};
