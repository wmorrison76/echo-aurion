/**
 * Team Messaging Component
 * Full-featured chat interface with real-time messaging
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { Send, X, Paperclip, Search } from 'lucide-react';

export interface Message {
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

interface TeamMessagingProps {
  channelId: string;
  channelName?: string;
  onClose?: () => void;
  compact?: boolean; // Mini panel mode
  className?: string;
}

export const TeamMessaging: React.FC<TeamMessagingProps> = ({
  channelId,
  channelName = '#general',
  onClose,
  compact = false,
  className = '',
}) => {
  const socket = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Fetch initial messages
  const messagesQuery = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const response = await fetch(`/api/messaging/channels/${channelId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(data.messages);
    },
  });
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Socket events
  useEffect(() => {
    if (!socket) return;
    
    // Join channel
    socket.emit('join-channel', { channelId });
    
    // Listen for message history
    socket.on('message-history', (data) => {
      setMessages(data.messages);
    });
    
    // Listen for new messages
    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      markMessageAsRead(message.id);
    });
    
    // Listen for typing indicators
    socket.on('user-typing', (data) => {
      setTypingUsers(prev => new Set(prev).add(data.userId));
    });
    
    socket.on('user-stopped-typing', (data) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });
    
    // Listen for message edits
    socket.on('message-edited', (data) => {
      setMessages(prev =>
        prev.map(msg => msg.id === data.messageId ? { ...msg, content: data.content } : msg)
      );
    });
    
    // Listen for message deletions
    socket.on('message-deleted', (data) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    });
    
    // Listen for read receipts
    socket.on('message-read', (data) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId
            ? { ...msg, read_by: [...(msg.read_by || []), data.readBy] }
            : msg
        )
      );
    });
    
    return () => {
      socket.off('message-history');
      socket.off('new-message');
      socket.off('user-typing');
      socket.off('user-stopped-typing');
      socket.off('message-edited');
      socket.off('message-deleted');
      socket.off('message-read');
    };
  }, [socket, channelId]);
  
  // Mark message as read
  const markMessageAsRead = useCallback(
    (messageId: string) => {
      socket?.emit('message-read', { messageId, channelId });
    },
    [socket, channelId]
  );
  
  // Handle typing with debounce
  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
      
      socket?.emit('start-typing', { channelId });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('stop-typing', { channelId });
      }, 2000);
    },
    [socket, channelId]
  );
  
  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    
    socket?.emit('send-message', {
      channelId,
      content: newMessage,
      attachments: [],
    });
    
    setNewMessage('');
    socket?.emit('stop-typing', { channelId });
    inputRef.current?.focus();
  }, [socket, channelId, newMessage]);
  
  // Handle enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Filter messages for search
  const filteredMessages = searchQuery
    ? messages.filter(msg =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;
  
  if (compact) {
    // Mini panel version (for toolbar)
    return (
      <Card className={`w-96 h-96 flex flex-col rounded-lg shadow-lg z-50 ${className}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center rounded-t-lg">
          <h2 className="font-bold text-lg">{channelName}</h2>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-blue-700"
            >
              ✕
            </Button>
          )}
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onEdit={() => {}}
              onDelete={() => {}}
              compact
            />
          ))}
          
          {typingUsers.size > 0 && (
            <TypingIndicator users={Array.from(typingUsers)} />
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="border-t p-3 flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            className="flex-1 text-sm"
          />
          <Button onClick={handleSendMessage} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    );
  }
  
  // Full-screen version
  return (
    <div className={`flex flex-col h-full bg-white rounded-lg ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-xl">{channelName}</h2>
          <p className="text-blue-100 text-sm">
            {messages.length} messages
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="text-white hover:bg-blue-700"
          >
            <Search className="w-5 h-5" />
          </Button>
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-blue-700"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
      
      {/* Search */}
      {showSearch && (
        <div className="px-6 py-3 border-b bg-gray-50">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ))
        )}
        
        {typingUsers.size > 0 && (
          <TypingIndicator users={Array.from(typingUsers)} />
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Section */}
      <div className="border-t p-6 bg-gray-50">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-gray-600"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <Input
            ref={inputRef}
            placeholder="Type a message... (Shift+Enter for new line)"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Use @username to mention someone
        </p>
      </div>
    </div>
  );
};

export default TeamMessaging;
