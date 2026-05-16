/**
 * Chat Panel - Maestro Banquets Communication System
 * Direct messaging and video conferencing between chefs and BEO agents
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Phone, Video, Search, MoreVertical, Paperclip, Smile,
  X, Mic, MicOff, VideoOff, PhoneOff, Monitor, Archive,
  Pin, Edit3, Trash2, Reply, Users, Clock, AlertCircle,
  Check, CheckCheck, Zap, FileText, Calendar
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { useCommunicationStore } from '../../stores/communicationStore';
import { useBEOStore } from '../../stores/beoStore';
import type { Conversation, Message, User, VideoCall } from '../../types/communication';

interface ChatPanelProps {
  className?: string;
  selectedBeoId?: string;
  defaultRecipientId?: string;
}

const StatusIndicator: React.FC<{ status: User['status'] }> = ({ status }) => {
  const colors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400'
  };

  return (
    <div className={`w-2 h-2 rounded-full ${colors[status]} absolute bottom-0 right-0 border border-white`} />
  );
};

const MessageItem: React.FC<{
  message: Message;
  isOwn: boolean;
  user: User;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}> = ({ message, isOwn, user, onReply, onEdit, onDelete, onReact }) => {
  const [showActions, setShowActions] = useState(false);

  const getUrgencyColor = (level?: string) => {
    switch (level) {
      case 'urgent': return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
      default: return '';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="max-w-xs lg:max-w-md">
          <div className="italic text-muted-foreground text-sm p-2">
            This message was deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        {!isOwn && (
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <StatusIndicator status={user.status} />
          </div>
        )}

        <div className="flex flex-col">
          <div
            className={cn(
              "rounded-lg px-3 py-2 break-words relative",
              isOwn
                ? "bg-primary text-primary-foreground ml-2"
                : "bg-muted mr-2",
              getUrgencyColor(message.urgencyLevel),
              message.urgencyLevel === 'urgent' && "ring-1 ring-red-500 animate-pulse"
            )}
          >
            {message.replyToId && (
              <div className="text-xs opacity-70 mb-1 p-1 bg-black/10 rounded">
                Replying to message...
              </div>
            )}

            {message.messageType === 'beo_reference' && message.metadata?.beoId && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-black/10 rounded">
                <FileText className="h-4 w-4" />
                <span className="text-xs">BEO: {message.metadata.beoId}</span>
              </div>
            )}

            <p className="text-sm">{message.content}</p>

            {message.urgencyLevel && message.urgencyLevel !== 'normal' && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs capitalize">{message.urgencyLevel}</span>
              </div>
            )}

            {message.editedAt && (
              <span className="text-xs opacity-60 ml-1">(edited)</span>
            )}

            {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.reactions.map(reaction => (
                  <span
                    key={reaction.id}
                    className="text-xs px-1 py-0.5 bg-black/10 rounded cursor-pointer hover:bg-black/20"
                    onClick={() => onReact?.(message.id, reaction.emoji)}
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span>{formatTime(message.timestamp)}</span>
            {isOwn && (
              <span className="flex items-center gap-1">
                {message.readAt ? (
                  <CheckCheck className="h-3 w-3 text-blue-500" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Message Actions */}
        {showActions && (
          <div className={`flex items-center gap-1 ${isOwn ? 'mr-2' : 'ml-2'}`}>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => onReact?.(message.id, '👍')}
            >
              <Smile className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={() => onReply?.(message)}
            >
              <Reply className="h-3 w-3" />
            </Button>
            {isOwn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onEdit?.(message)}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(message)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ConversationItem: React.FC<{
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  user: User;
  unreadCount: number;
}> = ({ conversation, isSelected, onClick, user, unreadCount }) => {
  const getConversationTitle = () => {
    if (conversation.title) return conversation.title;
    if (conversation.type === 'beo_discussion') {
      return `BEO Discussion - ${conversation.beoId}`;
    }
    return user.name;
  };

  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) return 'No messages yet';
    const content = conversation.lastMessage.content;
    return content.length > 50 ? `${content.substring(0, 50)}...` : content;
  };

  const getLastMessageTime = () => {
    if (!conversation.lastMessageAt) return '';
    const now = new Date();
    const messageTime = new Date(conversation.lastMessageAt);
    const diffMs = now.getTime() - messageTime.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return messageTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return messageTime.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
        isSelected 
          ? "bg-primary/10 border-primary/20" 
          : "hover:bg-accent border-transparent"
      )}
    >
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <StatusIndicator status={user.status} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{getConversationTitle()}</h3>
            {conversation.type === 'beo_discussion' && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                BEO
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {getLastMessageTime() && (
              <span className="text-xs text-muted-foreground">
                {getLastMessageTime()}
              </span>
            )}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs min-w-[1.25rem] h-5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground truncate mt-1">
          {getLastMessagePreview()}
        </p>
      </div>
    </div>
  );
};

const VideoCallModal: React.FC<{
  call: VideoCall | null;
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => void;
  onEnd: () => void;
  onDecline: () => void;
}> = ({ call, isOpen, onClose, onJoin, onEnd, onDecline }) => {
  const { isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } = useCommunicationStore();

  if (!isOpen || !call) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Video Call</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {call.status === 'pending' && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Video className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Incoming Call</h3>
              <p className="text-muted-foreground">from Chef Giovanni</p>
              <div className="flex justify-center gap-4 mt-6">
                <Button onClick={onDecline} variant="destructive">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button onClick={onJoin}>
                  <Video className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              </div>
            </div>
          )}

          {call.status === 'active' && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Video call in progress</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {call.beoId && `Discussing BEO: ${call.beoId}`}
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  variant={isVideoEnabled ? "outline" : "secondary"}
                  size="sm"
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={isAudioEnabled ? "outline" : "secondary"}
                  size="sm"
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm">
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={onEnd}>
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


const StartBeoThread: React.FC<{ beoNumber: string }> = ({ beoNumber }) => {
  const evts = useBEOStore(s=> s.events);
  const beoId = `beo-${beoNumber}`;
  const match = evts.find(e=> e.beoId === beoId) || null;
  const { currentUser, createBEOConversation, selectConversation, users } = useCommunicationStore();
  const salesFallback = Object.values(users).find(u=> u.role==='sales_agent');
  const onStart = async ()=>{
    const participants = [currentUser?.id || 'chef-001', (match as any)?.salesRepId || salesFallback?.id || 'sales-001'];
    const conv = await createBEOConversation(beoId, participants as string[]);
    selectConversation(conv.id);
  };
  return (
    <div className="p-3 rounded border bg-background/50 flex items-center justify-between">
      <div className="text-sm">
        Start conversation for BEO {beoNumber}{match? ` — ${match.title}`:''}
      </div>
      <Button size="sm" onClick={onStart}>Message Event Owner</Button>
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  className,
  selectedBeoId,
  defaultRecipientId
}) => {
  const {
    conversations,
    messages,
    users,
    currentUser,
    selectedConversationId,
    activeCall,
    isCallModalOpen,
    loadConversations,
    loadUsers,
    selectConversation,
    sendMessage,
    startCall,
    joinCall,
    endCall,
    declineCall,
    markConversationAsRead,
    addReaction,
    editMessage,
    deleteMessage,
    connectWebSocket,
    setCurrentUser
  } = useCommunicationStore();

  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize store
  useEffect(() => {
    if (!currentUser) {
      // Set a default user (in a real app, this would come from authentication)
      setCurrentUser({
        id: 'chef-001',
        name: 'Chef Giovanni',
        email: 'giovanni@maestrobanquets.com',
        role: 'chef',
        department: 'kitchen',
        status: 'online',
        title: 'Executive Chef'
      });
    }

    loadUsers();
    loadConversations();
    connectWebSocket();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedConversationId]);

  // Filter conversations based on search
  const filteredConversations = Object.values(conversations).filter(conv => {
    if (!searchQuery) return true;
    
    const otherParticipant = conv.participants.find(p => p !== currentUser?.id);
    const user = otherParticipant ? users[otherParticipant] : null;
    
    return (
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.beoId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).sort((a, b) => 
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  const selectedConversation = selectedConversationId ? conversations[selectedConversationId] : null;
  const selectedMessages = selectedConversationId ? messages[selectedConversationId] || [] : [];

  const getOtherParticipant = (conversation: Conversation) => {
    const otherParticipantId = conversation.participants.find(p => p !== currentUser?.id);
    return otherParticipantId ? users[otherParticipantId] : null;
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    const otherParticipant = getOtherParticipant(selectedConversation);
    if (!otherParticipant) return;

    try {
      await sendMessage({
        recipientId: otherParticipant.id,
        content: messageText,
        beoId: selectedConversation.beoId,
        urgencyLevel: 'normal',
        replyToId: replyToMessage?.id
      });

      setMessageText('');
      setReplyToMessage(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleStartCall = async (callType: 'audio' | 'video') => {
    if (!selectedConversation) return;

    const otherParticipant = getOtherParticipant(selectedConversation);
    if (!otherParticipant) return;

    try {
      await startCall({
        recipientIds: [otherParticipant.id],
        callType,
        beoId: selectedConversation.beoId,
        callReason: selectedConversation.beoId ? `Discussing BEO ${selectedConversation.beoId}` : undefined
      });
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const getUnreadCount = (conversationId: string) => {
    const convMessages = messages[conversationId] || [];
    return convMessages.filter(msg => !msg.readAt && msg.senderId !== currentUser?.id).length;
  };

  return (
    <>
      <Card className={cn("flex h-[600px] overflow-auto", className)}>
        {/* Conversations Sidebar */}
        <div className="w-80 border-r flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Messages
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {/* Quick start from BEO number lookup */}
              {/^\d{5,7}$/.test(searchQuery.trim()) && (
                <StartBeoThread beoNumber={searchQuery.trim()} />
              )}

              {filteredConversations.map(conversation => {
                const otherParticipant = getOtherParticipant(conversation);
                if (!otherParticipant) return null;

                return (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    onClick={() => {
                      selectConversation(conversation.id);
                      markConversationAsRead(conversation.id);
                    }}
                    user={otherParticipant}
                    unreadCount={getUnreadCount(conversation.id)}
                  />
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversations found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const otherParticipant = getOtherParticipant(selectedConversation);
                      return otherParticipant ? (
                        <>
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={otherParticipant.avatar} />
                              <AvatarFallback>
                                {otherParticipant.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <StatusIndicator status={otherParticipant.status} />
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {selectedConversation.title || otherParticipant.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {otherParticipant.title} • {otherParticipant.status}
                            </p>
                          </div>
                        </>
                      ) : null;
                    })()}

                    {selectedConversation.beoId && (
                      <Badge variant="outline" className="ml-2">
                        <FileText className="h-3 w-3 mr-1" />
                        BEO: {selectedConversation.beoId}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartCall('audio')}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartCall('video')}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pin className="h-4 w-4 mr-2" />
                          Pin Conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {selectedMessages.map(message => {
                    const sender = users[message.senderId];
                    if (!sender) return null;

                    return (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === currentUser?.id}
                        user={sender}
                        onReply={setReplyToMessage}
                        onEdit={(msg) => {
                          // Handle edit
                        }}
                        onDelete={(msg) => deleteMessage(msg.id)}
                        onReact={(messageId, emoji) => addReaction(messageId, emoji)}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply Preview */}
              {replyToMessage && (
                <div className="px-4 py-2 bg-muted/50 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Reply className="h-4 w-4" />
                      <span className="text-sm">
                        Replying to: {replyToMessage.content.substring(0, 50)}...
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyToMessage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-[44px] max-h-32 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Video Call Modal */}
      <VideoCallModal
        call={activeCall}
        isOpen={isCallModalOpen}
        onClose={() => useCommunicationStore.setState({ isCallModalOpen: false })}
        onJoin={() => activeCall && joinCall(activeCall.id)}
        onEnd={() => activeCall && endCall(activeCall.id)}
        onDecline={() => activeCall && declineCall(activeCall.id)}
      />
    </>
  );
};

export default ChatPanel;
