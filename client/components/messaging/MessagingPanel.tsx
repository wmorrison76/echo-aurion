import React, { useState, useRef, useEffect } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagingPanelProps {
  userId: string;
  orgId: string;
  userName?: string;
}

export const MessagingPanel: React.FC<MessagingPanelProps> = ({
  userId,
  orgId,
  userName = 'User',
}) => {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    messages,
    typingUsers,
    sendMessage,
    createConversation,
    markAsRead,
    deleteMessage,
  } = useMessaging(userId, orgId);

  const [messageText, setMessageText] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newParticipants, setNewParticipants] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    await sendMessage(messageText);
    setMessageText('');
  };

  const handleCreateConversation = async () => {
    if (!newParticipants.trim()) return;
    const participants = newParticipants.split(',').map((p) => p.trim());
    await createConversation('group', [...participants, userId], participants.join(', '));
    setNewParticipants('');
    setShowNewConversation(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background rounded-lg border">
      {/* Conversations List */}
      <div className="flex flex-col border-b">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold">Messages</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewConversation(!showNewConversation)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showNewConversation && (
          <div className="border-t p-3 space-y-2">
            <Input
              placeholder="Participant emails (comma separated)"
              value={newParticipants}
              onChange={(e) => setNewParticipants(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={handleCreateConversation}
                className="flex-1"
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewConversation(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-32 w-full">
          <div className="space-y-1 p-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                  currentConversationId === conv.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <div className="truncate font-medium">{conv.name}</div>
                <div className="text-xs opacity-70">
                  {conv.participants.length} members
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentConversationId ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        msg.senderId === userId ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-xs rounded-lg p-3',
                          msg.senderId === userId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="text-xs font-semibold mb-1">{msg.senderName}</p>
                        <p className="text-sm break-words">{msg.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {msg.senderId === userId && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="mt-2 text-xs hover:opacity-80"
                          >
                            <Trash2 className="h-3 w-3 inline" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {typingUsers.size > 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    {Array.from(typingUsers).join(', ')} typing...
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
};
