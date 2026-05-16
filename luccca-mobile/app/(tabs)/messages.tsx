/**
 * React Native Messages Screen
 * Team messaging with real-time updates and message history
 * Week 11 Implementation
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '@/context/AuthContext';
import * as SecureStore from 'expo-secure-store';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  reactions?: Record<string, number>;
}

interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'channel';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  participants: string[];
  avatar?: string;
}

export default function MessagesScreen() {
  const { state: authState } = useContext(AuthContext);
  const [view, setView] = useState<'conversations' | 'chat'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [userId, setUserId] = useState<string>('');

  // Get user ID from secure store
  useEffect(() => {
    const getUserId = async () => {
      try {
        const id = await SecureStore.getItemAsync('userId');
        if (id) setUserId(id);
      } catch (error) {
        console.error('[MESSAGES] Error getting user ID:', error);
      }
    };
    getUserId();
  }, []);

  // Fetch conversations
  useEffect(() => {
    if (!authState.userToken) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          'https://api.luccca.app/api/messages/conversations',
          {
            headers: {
              Authorization: `Bearer ${authState.userToken}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch conversations');

        const data = await response.json();
        setConversations(data.conversations || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load conversations';
        setError(message);
        console.error('[MESSAGES] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [authState.userToken]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !authState.userToken) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `https://api.luccca.app/api/messages/conversations/${selectedConversation.id}`,
          {
            headers: {
              Authorization: `Bearer ${authState.userToken}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch messages');

        const data = await response.json();
        setMessages(data.messages || []);

        // Mark messages as read
        await fetch(
          `https://api.luccca.app/api/messages/conversations/${selectedConversation.id}/read`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authState.userToken}`,
            },
          }
        );
      } catch (err) {
        console.error('[MESSAGES] Error fetching messages:', err);
      }
    };

    fetchMessages();

    // WebSocket connection for real-time messages
    const wsUrl = `wss://api.luccca.app/ws/messages/${selectedConversation.id}?token=${authState.userToken}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (error) {
        console.error('[MESSAGES] WebSocket parse error:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('[MESSAGES] WebSocket error:', error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedConversation, authState.userToken]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !authState.userToken) return;

    try {
      setSending(true);
      const response = await fetch(
        `https://api.luccca.app/api/messages/conversations/${selectedConversation.id}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authState.userToken}`,
          },
          body: JSON.stringify({
            content: newMessage,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send message');

      const sentMessage = await response.json();
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      Alert.alert('Error', message);
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setView('chat');
  };

  const handleBack = () => {
    setView('conversations');
    setSelectedConversation(null);
    setMessages([]);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleSelectConversation(item)}
    >
      <View style={styles.conversationAvatar}>
        {item.avatar ? (
          <Text style={styles.avatarText}>{item.avatar}</Text>
        ) : (
          <MaterialCommunityIcons name="chat" size={24} color="#ffffff" />
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>{item.name}</Text>
          <Text style={styles.conversationTime}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text
          style={[
            styles.conversationPreview,
            item.unreadCount > 0 && styles.conversationPreviewUnread,
          ]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === userId;

    return (
      <View style={[styles.messageContainer, isOwn && styles.messageContainerOwn]}>
        {!isOwn && (
          <View style={styles.messageSenderAvatar}>
            <Text style={styles.senderAvatarText}>
              {item.senderName[0]?.toUpperCase()}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isOwn && styles.messageBubbleOwn,
          ]}
        >
          {!isOwn && <Text style={styles.senderName}>{item.senderName}</Text>}
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && view === 'conversations') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (view === 'conversations') {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="plus" size={24} color="#1e3a8a" />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chat-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation to begin messaging</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle}>{selectedConversation?.name}</Text>
            <Text style={styles.chatHeaderSubtitle}>
              {selectedConversation?.participants.length} participants
            </Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color="#1e3a8a" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          scrollEnabled={true}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <MaterialCommunityIcons
              name="send"
              size={20}
              color={newMessage.trim() && !sending ? '#ffffff' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerButton: {
    padding: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderColor: '#fecaca',
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#f3f4f6',
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  conversationAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarText: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  conversationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  conversationPreview: {
    fontSize: 13,
    color: '#6b7280',
  },
  conversationPreviewUnread: {
    color: '#111827',
    fontWeight: '500',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    gap: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  messageContainerOwn: {
    justifyContent: 'flex-end',
  },
  messageSenderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  senderAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  messageBubbleOwn: {
    backgroundColor: '#1e3a8a',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    color: '#111827',
  },
  messageTextOwn: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  messageTimeOwn: {
    color: '#d1d5db',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    fontSize: 14,
    color: '#111827',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
});
