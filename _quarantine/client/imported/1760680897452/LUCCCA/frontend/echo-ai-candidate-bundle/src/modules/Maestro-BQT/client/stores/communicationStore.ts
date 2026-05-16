/**
 * Communication Store - Maestro Banquets
 * Handles direct messaging, video conferencing, and notifications between team members
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  User,
  Message,
  Conversation,
  VideoCall,
  Notification,
  PresenceStatus,
  CommunicationState,
  SendMessageRequest,
  StartCallRequest,
  ConversationFilter,
  TypingIndicator,
  BEOCommunicationContext
} from '../types/communication';

interface CommunicationStore extends CommunicationState {
  // User management
  setCurrentUser: (user: User) => void;
  updateUserStatus: (userId: string, status: PresenceStatus['status']) => void;
  loadUsers: () => Promise<void>;
  getUserById: (userId: string) => User | null;
  
  // Conversation management
  loadConversations: (filter?: ConversationFilter) => Promise<void>;
  createConversation: (participants: string[], type?: Conversation['type'], beoId?: string) => Promise<Conversation>;
  selectConversation: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => Promise<void>;
  muteConversation: (conversationId: string, mute: boolean) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  
  // Messaging
  sendMessage: (request: SendMessageRequest) => Promise<Message>;
  loadMessages: (conversationId: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  
  // Typing indicators
  setTyping: (conversationId: string, isTyping: boolean) => void;
  getTypingUsers: (conversationId: string) => TypingIndicator[];
  
  // Video calls
  startCall: (request: StartCallRequest) => Promise<VideoCall>;
  joinCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  toggleVideo: () => void;
  toggleAudio: () => void;
  shareScreen: () => Promise<void>;
  
  // Notifications
  loadNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  
  // BEO Integration
  createBEOConversation: (beoId: string, participants: string[]) => Promise<Conversation>;
  getBEOConversation: (beoId: string) => Conversation | null;
  sendBEOMessage: (beoId: string, content: string, urgencyLevel?: Message['urgencyLevel']) => Promise<Message>;
  getBEOCommunicationContext: (beoId: string) => Promise<BEOCommunicationContext | null>;
  
  // Presence and status
  updatePresence: (status: PresenceStatus['status'], activity?: string) => Promise<void>;
  getOnlineUsers: () => User[];
  
  // Settings
  updateSettings: (settings: Partial<CommunicationState['settings']>) => void;
  
  // WebSocket connection
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  isConnected: () => boolean;
  
  // Utility actions
  clearError: () => void;
  toggleChatPanel: () => void;
  
  // Search
  searchMessages: (query: string, conversationId?: string) => Promise<Message[]>;
  searchConversations: (query: string) => Promise<Conversation[]>;
}

// Sample data generators
const generateSampleUsers = (): User[] => [
  {
    id: 'chef-001',
    name: 'Chef Giovanni',
    email: 'giovanni@maestrobanquets.com',
    role: 'chef',
    department: 'kitchen',
    status: 'online',
    title: 'Executive Chef',
    avatar: '/avatars/chef-giovanni.jpg'
  },
  {
    id: 'sales-001',
    name: 'Sarah Williams',
    email: 'sarah@echocrm.com',
    role: 'sales_agent',
    department: 'sales',
    status: 'online',
    title: 'Senior Sales Agent',
    avatar: '/avatars/sarah-williams.jpg'
  },
  {
    id: 'sales-002',
    name: 'Michael Chen',
    email: 'michael@echocrm.com',
    role: 'sales_agent',
    department: 'sales',
    status: 'away',
    title: 'Sales Agent',
    avatar: '/avatars/michael-chen.jpg'
  },
  {
    id: 'chef-002',
    name: 'Chef Marie',
    email: 'marie@maestrobanquets.com',
    role: 'chef',
    department: 'kitchen',
    status: 'busy',
    title: 'Sous Chef',
    avatar: '/avatars/chef-marie.jpg'
  }
];

const generateSampleConversations = (): Conversation[] => [
  {
    id: 'conv-001',
    participants: ['chef-001', 'sales-001'],
    type: 'beo_discussion',
    title: 'Smith Wedding Reception BEO',
    beoId: 'beo-001',
    eventId: 'ev-001',
    echoCrmEventId: 'echo-crm-001',
    createdAt: '2024-07-24T09:00:00Z',
    lastMessageAt: '2024-07-24T15:30:00Z',
    isArchived: false,
    isMuted: false,
    notifications: true,
    pinnedMessages: []
  },
  {
    id: 'conv-002',
    participants: ['chef-001', 'sales-002'],
    type: 'beo_discussion',
    title: 'Corporate Holiday Party BEO',
    beoId: 'beo-002',
    eventId: 'ev-002',
    echoCrmEventId: 'echo-crm-002',
    createdAt: '2024-07-25T10:00:00Z',
    lastMessageAt: '2024-07-25T16:45:00Z',
    isArchived: false,
    isMuted: false,
    notifications: true,
    pinnedMessages: []
  },
  {
    id: 'conv-003',
    participants: ['chef-001', 'chef-002'],
    type: 'direct',
    title: 'Kitchen Coordination',
    createdAt: '2024-07-24T08:00:00Z',
    lastMessageAt: '2024-07-25T14:20:00Z',
    isArchived: false,
    isMuted: false,
    notifications: true,
    pinnedMessages: []
  }
];

const generateSampleMessages = (): Record<string, Message[]> => ({
  'conv-001': [
    {
      id: 'msg-001',
      conversationId: 'conv-001',
      senderId: 'sales-001',
      recipientId: 'chef-001',
      content: 'Hi Chef Giovanni! I need to discuss some special dietary requirements for the Smith Wedding Reception. The bride has a severe nut allergy.',
      messageType: 'text',
      timestamp: '2024-07-24T09:15:00Z',
      urgencyLevel: 'high',
      metadata: {
        beoId: 'beo-001',
        eventId: 'ev-001'
      },
      reactions: []
    },
    {
      id: 'msg-002',
      conversationId: 'conv-001',
      senderId: 'chef-001',
      recipientId: 'sales-001',
      content: 'Absolutely! I\'ll make sure all dishes are nut-free and we\'ll have separate prep areas. Can you send me the complete allergy list?',
      messageType: 'text',
      timestamp: '2024-07-24T09:18:00Z',
      urgencyLevel: 'normal',
      reactions: [
        {
          id: 'react-001',
          messageId: 'msg-002',
          userId: 'sales-001',
          emoji: '👍',
          timestamp: '2024-07-24T09:19:00Z'
        }
      ]
    },
    {
      id: 'msg-003',
      conversationId: 'conv-001',
      senderId: 'sales-001',
      recipientId: 'chef-001',
      content: 'Perfect! Also, they want to add a vegan option for 15 guests. Can we modify the menu?',
      messageType: 'text',
      timestamp: '2024-07-24T15:30:00Z',
      urgencyLevel: 'normal',
      reactions: []
    }
  ],
  'conv-002': [
    {
      id: 'msg-004',
      conversationId: 'conv-002',
      senderId: 'sales-002',
      recipientId: 'chef-001',
      content: 'Chef, the client wants to increase guest count from 150 to 180. Can we accommodate this?',
      messageType: 'text',
      timestamp: '2024-07-25T16:45:00Z',
      urgencyLevel: 'urgent',
      metadata: {
        beoId: 'beo-002',
        eventId: 'ev-002'
      },
      reactions: []
    }
  ],
  'conv-003': [
    {
      id: 'msg-005',
      conversationId: 'conv-003',
      senderId: 'chef-002',
      recipientId: 'chef-001',
      content: 'Giovanni, prep team is running behind on the appetizers. Should we call in extra staff?',
      messageType: 'text',
      timestamp: '2024-07-25T14:20:00Z',
      urgencyLevel: 'high',
      reactions: []
    }
  ]
});

const generateSampleNotifications = (): Notification[] => [
  {
    id: 'notif-001',
    userId: 'chef-001',
    type: 'message',
    title: 'New message from Sarah Williams',
    content: 'Perfect! Also, they want to add a vegan option...',
    timestamp: '2024-07-24T15:30:00Z',
    priority: 'normal',
    category: 'communication',
    metadata: {
      senderId: 'sales-001',
      conversationId: 'conv-001',
      messageId: 'msg-003'
    }
  },
  {
    id: 'notif-002',
    userId: 'chef-001',
    type: 'message',
    title: 'Urgent: Guest count increase',
    content: 'Chef, the client wants to increase guest count from 150 to 180...',
    timestamp: '2024-07-25T16:45:00Z',
    priority: 'urgent',
    category: 'communication',
    metadata: {
      senderId: 'sales-002',
      conversationId: 'conv-002',
      messageId: 'msg-004'
    }
  }
];

// WebSocket simulation
let wsConnection: WebSocket | null = null;
let wsReconnectTimer: NodeJS.Timeout | null = null;

export const useCommunicationStore = create<CommunicationStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    currentUser: null,
    conversations: {},
    messages: {},
    users: {},
    notifications: [],
    activeCall: null,
    presenceStatus: {},
    
    // UI State
    selectedConversationId: null,
    isCallModalOpen: false,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isChatPanelOpen: false,
    
    // Settings
    settings: {
      soundEnabled: true,
      desktopNotifications: true,
      emailNotifications: true,
      autoReadReceipts: true,
      showOnlineStatus: true,
      callQuality: 'auto'
    },

    // User Management
    setCurrentUser: (user: User) => {
      set({ currentUser: user });
      
      // Update presence status
      get().updatePresence(user.status, 'Using Maestro Banquets');
    },

    updateUserStatus: (userId: string, status: PresenceStatus['status']) => {
      set(state => ({
        users: {
          ...state.users,
          [userId]: {
            ...state.users[userId],
            status
          }
        },
        presenceStatus: {
          ...state.presenceStatus,
          [userId]: {
            ...state.presenceStatus[userId],
            status,
            lastSeen: new Date().toISOString()
          }
        }
      }));
    },

    loadUsers: async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const users = generateSampleUsers();
        const userMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<string, User>);
        
        const presenceMap = users.reduce((acc, user) => {
          acc[user.id] = {
            userId: user.id,
            status: user.status,
            lastSeen: user.lastSeen || new Date().toISOString(),
            deviceType: 'desktop'
          };
          return acc;
        }, {} as Record<string, PresenceStatus>);
        
        set({
          users: userMap,
          presenceStatus: presenceMap
        });
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    },

    getUserById: (userId: string) => {
      return get().users[userId] || null;
    },

    // Conversation Management
    loadConversations: async (filter?: ConversationFilter) => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        let conversations = generateSampleConversations();
        
        // Apply filters
        if (filter?.beoId) {
          conversations = conversations.filter(conv => conv.beoId === filter.beoId);
        }
        if (filter?.type) {
          conversations = conversations.filter(conv => conv.type === filter.type);
        }
        
        const conversationMap = conversations.reduce((acc, conv) => {
          acc[conv.id] = conv;
          return acc;
        }, {} as Record<string, Conversation>);
        
        set({ conversations: conversationMap });
        
        // Load messages for conversations
        const messages = generateSampleMessages();
        set(state => ({
          messages: { ...state.messages, ...messages }
        }));
        
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    },

    createConversation: async (participants: string[], type = 'direct', beoId?: string) => {
      try {
        const conversationId = `conv-${Date.now()}`;
        const conversation: Conversation = {
          id: conversationId,
          participants,
          type,
          beoId,
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          isArchived: false,
          isMuted: false,
          notifications: true,
          pinnedMessages: []
        };
        
        if (type === 'beo_discussion' && beoId) {
          conversation.title = `BEO Discussion - ${beoId}`;
        }
        
        set(state => ({
          conversations: {
            ...state.conversations,
            [conversationId]: conversation
          },
          messages: {
            ...state.messages,
            [conversationId]: []
          }
        }));
        
        return conversation;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        throw error;
      }
    },

    selectConversation: (conversationId: string) => {
      set({ selectedConversationId: conversationId });
      
      // Mark conversation as read
      get().markConversationAsRead(conversationId);
    },

    archiveConversation: async (conversationId: string) => {
      set(state => ({
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...state.conversations[conversationId],
            isArchived: true
          }
        }
      }));
    },

    muteConversation: async (conversationId: string, mute: boolean) => {
      set(state => ({
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...state.conversations[conversationId],
            isMuted: mute
          }
        }
      }));
    },

    pinMessage: async (messageId: string) => {
      // Implementation for pinning messages
    },

    // Messaging
    sendMessage: async (request: SendMessageRequest) => {
      try {
        const currentUser = get().currentUser;
        if (!currentUser) throw new Error('No current user');
        
        // Find or create conversation
        let conversationId = get().selectedConversationId;
        if (!conversationId) {
          const conversation = await get().createConversation([currentUser.id, request.recipientId]);
          conversationId = conversation.id;
          get().selectConversation(conversationId);
        }
        
        const message: Message = {
          id: `msg-${Date.now()}`,
          conversationId,
          senderId: currentUser.id,
          recipientId: request.recipientId,
          content: request.content,
          messageType: request.messageType || 'text',
          timestamp: new Date().toISOString(),
          urgencyLevel: request.urgencyLevel || 'normal',
          reactions: [],
          metadata: {
            beoId: request.beoId,
            eventId: request.eventId
          }
        };
        
        // Add message to state
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId!]: [
              ...(state.messages[conversationId!] || []),
              message
            ]
          },
          conversations: {
            ...state.conversations,
            [conversationId!]: {
              ...state.conversations[conversationId!],
              lastMessageAt: message.timestamp,
              lastMessage: message
            }
          }
        }));
        
        // Send via WebSocket if connected
        if (wsConnection?.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'message',
            data: message,
            timestamp: new Date().toISOString()
          }));
        }
        
        return message;
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },

    loadMessages: async (conversationId: string) => {
      // Messages are loaded with conversations for simplicity
    },

    markMessageAsRead: async (messageId: string) => {
      set(state => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(convId => {
          newMessages[convId] = newMessages[convId].map(msg =>
            msg.id === messageId ? { ...msg, readAt: new Date().toISOString() } : msg
          );
        });
        return { messages: newMessages };
      });
    },

    markConversationAsRead: async (conversationId: string) => {
      const currentTime = new Date().toISOString();
      set(state => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] || []).map(msg => ({
            ...msg,
            readAt: msg.readAt || currentTime
          }))
        }
      }));
    },

    editMessage: async (messageId: string, content: string) => {
      set(state => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(convId => {
          newMessages[convId] = newMessages[convId].map(msg =>
            msg.id === messageId ? { 
              ...msg, 
              content,
              editedAt: new Date().toISOString() 
            } : msg
          );
        });
        return { messages: newMessages };
      });
    },

    deleteMessage: async (messageId: string) => {
      set(state => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(convId => {
          newMessages[convId] = newMessages[convId].map(msg =>
            msg.id === messageId ? { ...msg, isDeleted: true } : msg
          );
        });
        return { messages: newMessages };
      });
    },

    addReaction: async (messageId: string, emoji: string) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;
      
      set(state => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(convId => {
          newMessages[convId] = newMessages[convId].map(msg => {
            if (msg.id === messageId) {
              const reactions = [...(msg.reactions || [])];
              const existingReaction = reactions.find(r => r.userId === currentUser.id && r.emoji === emoji);
              
              if (!existingReaction) {
                reactions.push({
                  id: `react-${Date.now()}`,
                  messageId,
                  userId: currentUser.id,
                  emoji,
                  timestamp: new Date().toISOString()
                });
              }
              
              return { ...msg, reactions };
            }
            return msg;
          });
        });
        return { messages: newMessages };
      });
    },

    removeReaction: async (messageId: string, emoji: string) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;
      
      set(state => {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(convId => {
          newMessages[convId] = newMessages[convId].map(msg => {
            if (msg.id === messageId) {
              const reactions = (msg.reactions || []).filter(
                r => !(r.userId === currentUser.id && r.emoji === emoji)
              );
              return { ...msg, reactions };
            }
            return msg;
          });
        });
        return { messages: newMessages };
      });
    },

    // Typing Indicators
    setTyping: (conversationId: string, isTyping: boolean) => {
      // Send typing indicator via WebSocket
      if (wsConnection?.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
          type: 'typing',
          data: {
            conversationId,
            userId: get().currentUser?.id,
            isTyping,
            timestamp: new Date().toISOString()
          }
        }));
      }
    },

    getTypingUsers: (conversationId: string) => {
      // This would be managed by WebSocket state in a real implementation
      return [];
    },

    // Video Calls
    startCall: async (request: StartCallRequest) => {
      try {
        const currentUser = get().currentUser;
        if (!currentUser) throw new Error('No current user');
        
        const call: VideoCall = {
          id: `call-${Date.now()}`,
          conversationId: get().selectedConversationId || '',
          initiatorId: currentUser.id,
          participantIds: [currentUser.id, ...request.recipientIds],
          status: 'pending',
          callType: request.callType,
          quality: 'hd',
          roomId: `room-${Date.now()}`,
          beoId: request.beoId,
          eventId: request.eventId,
          callReason: request.callReason,
          startedAt: new Date().toISOString()
        };
        
        set({ 
          activeCall: call,
          isCallModalOpen: true 
        });
        
        // Send call invitation via WebSocket
        if (wsConnection?.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'call',
            data: {
              action: 'invite',
              call,
              timestamp: new Date().toISOString()
            }
          }));
        }
        
        return call;
      } catch (error) {
        console.error('Failed to start call:', error);
        throw error;
      }
    },

    joinCall: async (callId: string) => {
      set(state => ({
        activeCall: state.activeCall ? {
          ...state.activeCall,
          status: 'active'
        } : null
      }));
    },

    endCall: async (callId: string) => {
      const call = get().activeCall;
      if (call) {
        const endedCall = {
          ...call,
          status: 'ended' as const,
          endedAt: new Date().toISOString(),
          duration: call.startedAt ? 
            Math.floor((new Date().getTime() - new Date(call.startedAt).getTime()) / 1000) : 0
        };
        
        set({ 
          activeCall: null,
          isCallModalOpen: false 
        });
        
        // Send call end via WebSocket
        if (wsConnection?.readyState === WebSocket.OPEN) {
          wsConnection.send(JSON.stringify({
            type: 'call',
            data: {
              action: 'end',
              call: endedCall,
              timestamp: new Date().toISOString()
            }
          }));
        }
      }
    },

    declineCall: async (callId: string) => {
      set({ 
        activeCall: null,
        isCallModalOpen: false 
      });
    },

    toggleVideo: () => {
      set(state => ({ isVideoEnabled: !state.isVideoEnabled }));
    },

    toggleAudio: () => {
      set(state => ({ isAudioEnabled: !state.isAudioEnabled }));
    },

    shareScreen: async () => {
      // Screen sharing implementation would go here
    },

    // Notifications
    loadNotifications: async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const notifications = generateSampleNotifications();
        set({ notifications });
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    },

    markNotificationAsRead: async (notificationId: string) => {
      set(state => ({
        notifications: state.notifications.map(notif =>
          notif.id === notificationId 
            ? { ...notif, readAt: new Date().toISOString() }
            : notif
        )
      }));
    },

    markAllNotificationsAsRead: async () => {
      const currentTime = new Date().toISOString();
      set(state => ({
        notifications: state.notifications.map(notif => ({
          ...notif,
          readAt: notif.readAt || currentTime
        }))
      }));
    },

    // BEO Integration
    createBEOConversation: async (beoId: string, participants: string[]) => {
      return await get().createConversation(participants, 'beo_discussion', beoId);
    },

    getBEOConversation: (beoId: string) => {
      const conversations = Object.values(get().conversations);
      return conversations.find(conv => conv.beoId === beoId) || null;
    },

    sendBEOMessage: async (beoId: string, content: string, urgencyLevel = 'normal') => {
      const conversation = get().getBEOConversation(beoId);
      if (!conversation) {
        throw new Error('No conversation found for BEO');
      }
      
      const currentUser = get().currentUser;
      if (!currentUser) throw new Error('No current user');
      
      const otherParticipant = conversation.participants.find(p => p !== currentUser.id);
      if (!otherParticipant) throw new Error('No recipient found');
      
      return await get().sendMessage({
        recipientId: otherParticipant,
        content,
        urgencyLevel,
        beoId
      });
    },

    getBEOCommunicationContext: async (beoId: string) => {
      // This would fetch BEO context from the API
      return null;
    },

    // Presence and Status
    updatePresence: async (status: PresenceStatus['status'], activity?: string) => {
      const currentUser = get().currentUser;
      if (!currentUser) return;
      
      set(state => ({
        presenceStatus: {
          ...state.presenceStatus,
          [currentUser.id]: {
            userId: currentUser.id,
            status,
            lastSeen: new Date().toISOString(),
            currentActivity: activity,
            deviceType: 'desktop'
          }
        }
      }));
      
      // Send presence update via WebSocket
      if (wsConnection?.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
          type: 'presence',
          data: {
            userId: currentUser.id,
            status,
            activity,
            timestamp: new Date().toISOString()
          }
        }));
      }
    },

    getOnlineUsers: () => {
      const users = Object.values(get().users);
      return users.filter(user => 
        get().presenceStatus[user.id]?.status === 'online' || 
        user.status === 'online'
      );
    },

    // Settings
    updateSettings: (settings: Partial<CommunicationState['settings']>) => {
      set(state => ({
        settings: { ...state.settings, ...settings }
      }));
    },

    // WebSocket Connection
    connectWebSocket: () => {
      if (wsConnection?.readyState === WebSocket.OPEN) return;
      
      try {
        // In a real implementation, this would connect to your WebSocket server
        // wsConnection = new WebSocket('ws://localhost:3001/ws');
        
        // Simulate connection for demo
        console.log('WebSocket connected (simulated)');
        
        // wsConnection.onopen = () => {
        //   console.log('WebSocket connected');
        // };
        
        // wsConnection.onmessage = (event) => {
        //   const data = JSON.parse(event.data);
        //   // Handle incoming WebSocket messages
        // };
        
        // wsConnection.onclose = () => {
        //   console.log('WebSocket disconnected');
        //   // Attempt reconnection
        //   wsReconnectTimer = setTimeout(() => {
        //     get().connectWebSocket();
        //   }, 5000);
        // };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    },

    disconnectWebSocket: () => {
      if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
      }
      if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
      }
    },

    isConnected: () => {
      return wsConnection?.readyState === WebSocket.OPEN;
    },

    // Utility Actions
    clearError: () => {
      // Clear any error state
    },

    toggleChatPanel: () => {
      set(state => ({ isChatPanelOpen: !state.isChatPanelOpen }));
    },

    // Search
    searchMessages: async (query: string, conversationId?: string) => {
      const messages = get().messages;
      const results: Message[] = [];
      
      const conversationsToSearch = conversationId 
        ? [conversationId]
        : Object.keys(messages);
      
      conversationsToSearch.forEach(convId => {
        const convMessages = messages[convId] || [];
        convMessages.forEach(message => {
          if (message.content.toLowerCase().includes(query.toLowerCase())) {
            results.push(message);
          }
        });
      });
      
      return results.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },

    searchConversations: async (query: string) => {
      const conversations = Object.values(get().conversations);
      return conversations.filter(conv =>
        conv.title?.toLowerCase().includes(query.toLowerCase()) ||
        conv.beoId?.toLowerCase().includes(query.toLowerCase())
      );
    }
  }))
);

// Subscribe to state changes for notifications
useCommunicationStore.subscribe(
  (state) => state.notifications,
  (notifications) => {
    const unreadNotifications = notifications.filter(n => !n.readAt);
    
    if (unreadNotifications.length > 0 && 'Notification' in window) {
      const settings = useCommunicationStore.getState().settings;
      if (settings.desktopNotifications) {
        // Show desktop notifications for unread messages
        unreadNotifications.forEach(notification => {
          if (notification.type === 'message' && notification.priority === 'urgent') {
            new Notification(notification.title, {
              body: notification.content,
              icon: '/logo-192.png',
              tag: notification.id
            });
          }
        });
      }
    }
  }
);

export type { CommunicationStore };
