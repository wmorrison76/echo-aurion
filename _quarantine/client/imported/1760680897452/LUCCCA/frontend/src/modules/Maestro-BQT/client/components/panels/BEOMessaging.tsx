/**
 * BEO Messaging Component
 * Direct communication between chefs and BEO agents within the BEO context
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Video,
  AlertTriangle,
  Clock,
  User,
  Zap,
  ChefHat,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';
import { useCommunicationStore } from '../../stores/communicationStore';
import type { Message, Conversation, User as CommunicationUser } from '../../types/communication';

interface BEOMessagingProps {
  beoId: string;
  eventId?: string;
  echoCrmEventId?: string;
  createdByUserId?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onClose?: () => void;
  className?: string;
}

// Quick message templates for BEO discussions
const MESSAGE_TEMPLATES = [
  {
    id: 'clarification',
    title: 'Need Clarification',
    content: 'I need clarification on some details in this BEO. Can we discuss?',
    urgency: 'normal' as const
  },
  {
    id: 'menu_change',
    title: 'Menu Change Request',
    content: 'There\'s been a change request for the menu. Let\'s review the options.',
    urgency: 'high' as const
  },
  {
    id: 'dietary_concern',
    title: 'Dietary Restrictions',
    content: 'I have concerns about the dietary restrictions listed. We need to ensure compliance.',
    urgency: 'high' as const
  },
  {
    id: 'guest_count',
    title: 'Guest Count Update',
    content: 'The guest count has changed. Can you confirm the new numbers?',
    urgency: 'urgent' as const
  },
  {
    id: 'approval_needed',
    title: 'Chef Approval Required',
    content: 'This BEO is ready for final review and approval. Please confirm when convenient.',
    urgency: 'normal' as const
  },
  {
    id: 'urgent_issue',
    title: 'Urgent Issue',
    content: 'We have an urgent issue that needs immediate attention regarding this BEO.',
    urgency: 'urgent' as const
  }
];

export const BEOMessaging: React.FC<BEOMessagingProps> = ({
  beoId,
  eventId,
  echoCrmEventId,
  createdByUserId,
  isMinimized = false,
  onToggleMinimize,
  onClose,
  className
}) => {
  const {
    currentUser,
    users,
    getBEOConversation,
    createBEOConversation,
    sendBEOMessage,
    startCall,
    messages,
    selectConversation,
    selectedConversationId
  } = useCommunicationStore();

  const [messageText, setMessageText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isExpanded, setIsExpanded] = useState(!isMinimized);

  // Find or create BEO conversation
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [agentUser, setAgentUser] = useState<CommunicationUser | null>(null);

  useEffect(() => {
    const initializeConversation = async () => {
      let existingConversation = getBEOConversation(beoId);
      
      if (!existingConversation && createdByUserId && currentUser) {
        // Create new BEO conversation
        try {
          existingConversation = await createBEOConversation(beoId, [currentUser.id, createdByUserId]);
        } catch (error) {
          console.error('Failed to create BEO conversation:', error);
          return;
        }
      }

      if (existingConversation) {
        setConversation(existingConversation);
        
        // Find the agent user
        const agentId = existingConversation.participants.find(p => p !== currentUser?.id);
        if (agentId && users[agentId]) {
          setAgentUser(users[agentId]);
        }
        
        // Select this conversation in the communication store
        selectConversation(existingConversation.id);
      }
    };

    initializeConversation();
  }, [beoId, createdByUserId, currentUser, getBEOConversation, createBEOConversation, users, selectConversation]);

  const conversationMessages = conversation ? messages[conversation.id] || [] : [];

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await sendBEOMessage(beoId, messageText, urgencyLevel);
      setMessageText('');
      setSelectedTemplate('');
    } catch (error) {
      console.error('Failed to send BEO message:', error);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setMessageText(template.content);
      setUrgencyLevel(template.urgency);
      setSelectedTemplate(templateId);
    }
  };

  const handleStartCall = async (callType: 'audio' | 'video') => {
    if (!agentUser) return;

    try {
      await startCall({
        recipientIds: [agentUser.id],
        callType,
        beoId,
        eventId,
        callReason: `Discussing BEO ${beoId}`
      });
    } catch (error) {
      console.error('Failed to start call:', error);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getMessageStatusIcon = (message: Message) => {
    if (message.readAt) {
      return <Clock className="h-3 w-3 text-blue-500" />;
    }
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  if (isMinimized) {
    return (
      <Card className={cn("fixed bottom-4 right-4 w-80 z-50 shadow-lg", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-medium">BEO Chat</span>
              {agentUser && (
                <Badge variant="outline" className="text-xs">
                  {agentUser.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMinimize}
                className="h-6 w-6 p-0"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("h-96 flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span>BEO Communication</span>
            <Badge variant="outline" className="ml-2">
              {beoId}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {echoCrmEventId && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Zap className="h-3 w-3 mr-1" />
                Echo CRM
              </Badge>
            )}
            
            {agentUser && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartCall('audio')}
                  disabled={!agentUser}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartCall('video')}
                  disabled={!agentUser}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </>
            )}

            {onToggleMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMinimize}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
            
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {agentUser && (
          <div className="flex items-center gap-3 mt-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={agentUser.avatar} />
              <AvatarFallback>
                {agentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{agentUser.name}</p>
              <p className="text-xs text-muted-foreground">
                {agentUser.title} • {agentUser.status}
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3">
          {conversationMessages.length === 0 ? (
            <div className="text-center py-4">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Start a conversation about this BEO
              </p>
            </div>
          ) : (
            conversationMessages.map(message => {
              const sender = users[message.senderId];
              const isOwn = message.senderId === currentUser?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2",
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                      message.urgencyLevel === 'urgent' && "ring-1 ring-red-500",
                      message.urgencyLevel === 'high' && "ring-1 ring-orange-500"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {sender?.role === 'chef' && <ChefHat className="h-3 w-3" />}
                      {sender?.role === 'sales_agent' && <User className="h-3 w-3" />}
                      <span className="text-xs font-medium">{sender?.name}</span>
                      {message.urgencyLevel && message.urgencyLevel !== 'normal' && (
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getUrgencyColor(message.urgencyLevel))}
                        >
                          {message.urgencyLevel}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm">{message.content}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                      {isOwn && getMessageStatusIcon(message)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t space-y-3">
        {/* Quick Templates */}
        <div className="flex items-center gap-2">
          <Select value={selectedTemplate} onValueChange={handleUseTemplate}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Quick templates..." />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_TEMPLATES.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <span>{template.title}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getUrgencyColor(template.urgency))}
                    >
                      {template.urgency}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={urgencyLevel} onValueChange={(value: any) => setUrgencyLevel(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message Input */}
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Type your message about this BEO..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="min-h-[60px] max-h-20 resize-none flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || !agentUser}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {urgencyLevel !== 'normal' && (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded text-xs",
            getUrgencyColor(urgencyLevel)
          )}>
            <AlertTriangle className="h-3 w-3" />
            <span>
              This message will be marked as {urgencyLevel} priority
              {urgencyLevel === 'urgent' && ' and will trigger immediate notifications'}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default BEOMessaging;
