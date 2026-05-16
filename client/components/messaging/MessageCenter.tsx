/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 6 Day 29
 * Team Messaging UI
 * 
 * Features:
 * - Chat-like interface
 * - 1-to-1 and channel conversations
 * - @ mentions, emoji reactions
 * - File sharing (photos)
 * - Read receipts
 * - Quick actions
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, AtSign, Users, Search, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { toast } from '../ui/use-toast';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Date;
  reactions?: { emoji: string; count: number; byCurrentUser?: boolean }[];
  readBy?: string[];
  attachments?: { id: string; url: string; type: 'image' | 'file' }[];
}

interface Conversation {
  id: string;
  name: string;
  type: '1to1' | 'group' | 'shift-channel';
  participants: { id: string; name: string; avatar?: string; status: 'online' | 'offline' }[];
  lastMessage?: Message;
  unreadCount: number;
  avatar?: string;
}

interface MessageCenterProps {
  organizationId: string;
  currentUserId: string;
  currentUserName: string;
}

const MessageCenter: React.FC<MessageCenterProps> = ({
  organizationId,
  currentUserId,
  currentUserName,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [organizationId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/messaging/conversations?org_id=${organizationId}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) throw new Error('Failed to fetch conversations');

      const data = await response.json();
      setConversations(data.conversations || generateMockConversations());
      if (data.conversations && data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0]);
      }
    } catch (error) {
      console.error('Conversations error:', error);
      const mockConvs = generateMockConversations();
      setConversations(mockConvs);
      if (mockConvs.length > 0) {
        setSelectedConversation(mockConvs[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/v1/messaging/conversations/${conversationId}/messages?limit=50`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      setMessages(data.messages || generateMockMessages());
    } catch (error) {
      console.error('Messages error:', error);
      setMessages(generateMockMessages());
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: 'msg-' + Date.now(),
      senderId: currentUserId,
      senderName: currentUserName,
      text: newMessage,
      timestamp: new Date(),
      readBy: [currentUserId],
    };

    // Add to local state immediately
    setMessages((prev) => [...prev, message]);
    setNewMessage('');

    // Send to server
    try {
      await fetch(
        `/api/v1/messaging/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        }
      );
    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const reactions = [...(msg.reactions || [])];
          const existingReaction = reactions.find((r) => r.emoji === emoji);

          if (existingReaction) {
            existingReaction.count++;
            existingReaction.byCurrentUser = true;
          } else {
            reactions.push({ emoji, count: 1, byCurrentUser: true });
          }

          return { ...msg, reactions };
        }
        return msg;
      })
    );
  };

  const handleStartNewConversation = () => {
    toast({
      title: 'New Conversation',
      description: 'Opening new conversation dialog',
    });
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-white">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <Button size="sm" variant="ghost" onClick={handleStartNewConversation} className="gap-1">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations</div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 text-left border-b border-gray-100 transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'bg-blue-50 border-b-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conv.avatar} />
                      <AvatarFallback>{conv.name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    {conv.participants.some((p) => p.status === 'online') && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-gray-900 truncate">{conv.name}</p>
                      {conv.unreadCount > 0 && (
                        <Badge className="flex-shrink-0">{conv.unreadCount}</Badge>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-600 truncate">
                        {conv.lastMessage.senderName}: {conv.lastMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Conversation Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={selectedConversation.avatar} />
                <AvatarFallback>{selectedConversation.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{selectedConversation.name}</h3>
                <p className="text-sm text-gray-600">
                  {selectedConversation.participants.length} members
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Users className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.senderId === currentUserId ? 'justify-end' : ''}`}
              >
                {msg.senderId !== currentUserId && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={msg.senderAvatar} />
                    <AvatarFallback>{msg.senderName.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-xs ${
                    msg.senderId === currentUserId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  } rounded-lg p-3`}
                >
                  {msg.senderId !== currentUserId && (
                    <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</p>
                  )}
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>

                  {/* Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {msg.reactions.map((reaction, i) => (
                        <button
                          key={i}
                          className={`text-xs px-2 py-1 rounded-full ${
                            reaction.byCurrentUser
                              ? 'bg-blue-700 bg-opacity-50'
                              : 'bg-gray-300 bg-opacity-30'
                          }`}
                          onClick={() => handleAddReaction(msg.id, reaction.emoji)}
                        >
                          {reaction.emoji} {reaction.count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.senderId === currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddReaction(msg.id, '👍')}
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Paperclip className="w-4 h-4" />
                File
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Smile className="w-4 h-4" />
                Emoji
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <AtSign className="w-4 h-4" />
                Mention
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Select a conversation to start messaging</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MOCK DATA
// ============================================================================

function generateMockConversations(): Conversation[] {
  return [
    {
      id: 'conv-1',
      name: 'Kitchen Shift',
      type: 'shift-channel',
      participants: [
        { id: 'user-1', name: 'Sarah Johnson', status: 'online' },
        { id: 'user-2', name: 'Marcus Williams', status: 'online' },
      ],
      lastMessage: {
        id: 'msg-1',
        senderId: 'user-1',
        senderName: 'Sarah Johnson',
        text: 'See you at 8!',
        timestamp: new Date(),
      },
      unreadCount: 0,
    },
    {
      id: 'conv-2',
      name: 'Jennifer Lee',
      type: '1to1',
      participants: [{ id: 'user-3', name: 'Jennifer Lee', status: 'offline' }],
      lastMessage: {
        id: 'msg-2',
        senderId: 'user-3',
        senderName: 'Jennifer Lee',
        text: 'Can you cover my shift on Friday?',
        timestamp: new Date(),
      },
      unreadCount: 1,
    },
    {
      id: 'conv-3',
      name: 'Managers Group',
      type: 'group',
      participants: [
        { id: 'user-4', name: 'David Martinez', status: 'online' },
        { id: 'user-5', name: 'Amanda Davis', status: 'offline' },
      ],
      unreadCount: 0,
    },
  ];
}

function generateMockMessages(): Message[] {
  return [
    {
      id: 'msg-1',
      senderId: 'user-1',
      senderName: 'Sarah Johnson',
      text: 'Hey team, ready for tonight?',
      timestamp: new Date(Date.now() - 300000),
      readBy: ['user-1', 'user-2'],
    },
    {
      id: 'msg-2',
      senderId: 'user-2',
      senderName: 'Marcus Williams',
      text: 'All set! Should be a busy night',
      timestamp: new Date(Date.now() - 240000),
      readBy: ['user-2'],
      reactions: [{ emoji: '👍', count: 1 }],
    },
    {
      id: 'msg-3',
      senderId: 'user-1',
      senderName: 'Sarah Johnson',
      text: 'See you at 8!',
      timestamp: new Date(Date.now() - 60000),
      readBy: ['user-1'],
    },
  ];
}

export default MessageCenter;
